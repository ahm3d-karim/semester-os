// Semester OS — DB-agnostic data layer
// DEMO_MODE=true → in-memory Maps, zero external accounts
// DEMO_MODE=false → Supabase Postgres

import { randomUUID } from 'node:crypto';
import type {
  Course, Syllabus, IngestJob, ModelItem, CourseModel,
  GradeEntry, Briefing, Session, Institution, CalendarEvent,
} from './types';

const DEMO = process.env.DEMO_MODE === 'true' || !process.env.SUPABASE_URL;

// ─── In-memory stores (DEMO_MODE) ───
const institutions = new Map<string, Institution>();
const sessions = new Map<string, Session[]>();
const calendarEvents = new Map<string, CalendarEvent[]>();
const courses = new Map<string, Course>();
const syllabi = new Map<string, Syllabus>();
const ingestJobs = new Map<string, IngestJob>();
const modelItems = new Map<string, ModelItem[]>();
const courseModels = new Map<string, CourseModel[]>();
const gradeEntries = new Map<string, GradeEntry[]>();
const briefings = new Map<string, Briefing[]>();

// ─── Seed demo data ───
if (DEMO && institutions.size === 0) {
  // Institution
  const inst: Institution = {
    id: randomUUID(), code: 'LUMS', name: 'Lahore University of Management Sciences',
    calendar_url: 'https://lums.edu.pk/academic-calendar', created_at: new Date().toISOString(),
  };
  institutions.set(inst.id, inst);

  // Sessions: Fall 2026 (weeks 1-16)
  const term = 'Fall 2026';
  const termSessions: Session[] = [];
  const startDate = new Date('2026-09-01'); // approximate
  for (let i = 1; i <= 16; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (i - 1) * 7);
    termSessions.push({
      id: randomUUID(), inst_id: inst.id, term, session_no: i,
      date_start: d.toISOString().split('T')[0],
      date_end: new Date(d.getTime() + 6 * 86400000).toISOString().split('T')[0],
    });
  }
  sessions.set(`${inst.id}:${term}`, termSessions);

  // Course
  const course: Course = {
    id: randomUUID(), inst_id: inst.id, code: 'FINN 372',
    title: 'Actuarial Sciences & Insurance', offering: term,
    status: 'active', created_at: new Date().toISOString(),
  };
  courses.set(course.id, course);

  // Demo model items
  const items: ModelItem[] = [
    {
      id: randomUUID(), course_id: course.id, model_version: 1,
      kind: 'deadline', title: 'Assignment 1', detail: 'Insurance fundamentals problem set',
      session_no: 4, date: '2026-09-22', session_range: null, weight: 10,
      tier: 'sourced', anchors: [{ source_text: 'Assignment 1 due Session 4', page: 1, section: 'Schedule', char_offset: null }],
      verification: { score: 0.9, checks: { anchor_exists: true, number_match: true, session_date_consistent: true, llm_judge: { pass: true, reason: 'Directly from syllabus' } }, auto_rejected: false },
      approved: true, approved_at: new Date().toISOString(), approval_note: null, created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(), course_id: course.id, model_version: 1,
      kind: 'grade_component', title: 'Midterm Exam', detail: 'Covers sessions 1-8',
      session_no: 9, date: '2026-10-27', session_range: null, weight: 30,
      tier: 'sourced', anchors: [{ source_text: 'Midterm 30%', page: 1, section: 'Grading', char_offset: null }],
      verification: { score: 0.85, checks: { anchor_exists: true, number_match: true, session_date_consistent: true, llm_judge: { pass: true, reason: 'Grade weight matches' } }, auto_rejected: false },
      approved: true, approved_at: new Date().toISOString(), approval_note: null, created_at: new Date().toISOString(),
    },
    {
      id: randomUUID(), course_id: course.id, model_version: 1,
      kind: 'policy', title: 'Attendance Policy', detail: 'Attendance is mandatory. More than 3 unexcused absences will result in a grade penalty.',
      session_no: null, date: null, session_range: null, weight: null,
      tier: 'sourced', anchors: [{ source_text: 'Attendance is mandatory', page: 1, section: 'Policies', char_offset: null }],
      verification: { score: 0.8, checks: { anchor_exists: true, number_match: true, session_date_consistent: true, llm_judge: { pass: true, reason: 'Direct quote' } }, auto_rejected: false },
      approved: true, approved_at: new Date().toISOString(), approval_note: null, created_at: new Date().toISOString(),
    },
  ];
  modelItems.set(course.id, items);
}

// ─── Supabase client (lazy) ───
let sb: any = null;
function supabase() {
  if (!sb) {
    const { createClient } = require('@supabase/supabase-js');
    sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  }
  return sb;
}

// ─── Institutions ───
export async function listInstitutions(): Promise<Institution[]> {
  if (DEMO) return Array.from(institutions.values());
  const { data } = await supabase().from('institutions').select('*');
  return data ?? [];
}

// ─── Sessions ───
export async function getSessions(instId: string, term: string): Promise<Session[]> {
  if (DEMO) return sessions.get(`${instId}:${term}`) ?? [];
  const { data } = await supabase().from('sessions').select('*').eq('inst_id', instId).eq('term', term).order('session_no');
  return data ?? [];
}

export async function resolveSessionDate(instId: string, term: string, sessionNo: number): Promise<string | null> {
  const all = await getSessions(instId, term);
  const s = all.find((x) => x.session_no === sessionNo);
  return s?.date_start ?? null;
}

// ─── Courses ───
export async function listCourses(instId?: string): Promise<Course[]> {
  if (DEMO) {
    const all = Array.from(courses.values());
    return instId ? all.filter((c) => c.inst_id === instId) : all;
  }
  let q = supabase().from('courses').select('*');
  if (instId) q = q.eq('inst_id', instId);
  const { data } = await q;
  return data ?? [];
}

export async function getCourse(id: string): Promise<Course | null> {
  if (DEMO) return courses.get(id) ?? null;
  const { data } = await supabase().from('courses').select('*').eq('id', id).single();
  return data;
}

export async function createCourse(input: { inst_id: string; code: string; title: string; offering: string }): Promise<Course> {
  if (DEMO) {
    const c: Course = { id: randomUUID(), ...input, status: 'active', created_at: new Date().toISOString() };
    courses.set(c.id, c);
    return c;
  }
  const { data } = await supabase().from('courses').insert(input).select().single();
  return data;
}

// ─── Model Items ───
export async function listModelItems(courseId: string, version?: number): Promise<ModelItem[]> {
  if (DEMO) {
    const items = modelItems.get(courseId) ?? [];
    return version ? items.filter((i) => i.model_version === version) : items;
  }
  let q = supabase().from('model_items').select('*').eq('course_id', courseId);
  if (version) q = q.eq('model_version', version);
  const { data } = await q;
  return data ?? [];
}

export async function getModelItemsForBrief(courseId: string, upcomingDays: number): Promise<ModelItem[]> {
  const all = await listModelItems(courseId);
  const now = new Date();
  const cutoff = new Date(now.getTime() + upcomingDays * 86400000);
  return all.filter((item) => {
    if (!item.approved || !item.date) return false;
    const d = new Date(item.date);
    return d >= now && d <= cutoff;
  });
}

// ─── Grade Budget ───
export async function getGradeBudget(courseId: string) {
  const items = await listModelItems(courseId);
  const components = items.filter((i) => i.kind === 'grade_component' && i.approved);
  const grades = gradeEntries.get(courseId) ?? [];
  const totalWeight = components.reduce((s, c) => s + (c.weight ?? 0), 0);

  const budgetComponents = components.map((c) => {
    const g = grades.find((x) => x.component_id === c.id);
    return {
      item_id: c.id, title: c.title, weight: c.weight ?? 0,
      scored: g?.score ?? null,
      running_pct: g ? (g.score / (g.max_score || 100)) * 100 : null,
    };
  });

  return {
    total_weight: totalWeight,
    items_count: components.length,
    status: totalWeight === 100 ? 'balanced' as const : totalWeight > 100 ? 'over' as const : 'under' as const,
    components: budgetComponents,
  };
}

// ─── Grade Entries ───
export async function listGradeEntries(courseId: string): Promise<GradeEntry[]> {
  if (DEMO) return gradeEntries.get(courseId) ?? [];
  const { data } = await supabase().from('grade_entries').select('*').eq('course_id', courseId);
  return data ?? [];
}

export async function addGradeEntry(input: { course_id: string; component_id: string; score: number; max_score?: number }): Promise<GradeEntry> {
  if (DEMO) {
    const e: GradeEntry = {
      id: randomUUID(), course_id: input.course_id, component_id: input.component_id,
      score: input.score, max_score: input.max_score ?? 100, added_at: new Date().toISOString(),
    };
    const list = gradeEntries.get(input.course_id) ?? [];
    list.push(e);
    gradeEntries.set(input.course_id, list);
    return e;
  }
  const { data } = await supabase().from('grade_entries').insert(input).select().single();
  return data;
}

// ─── Briefings ───
export async function listBriefings(courseId: string): Promise<Briefing[]> {
  if (DEMO) return briefings.get(courseId) ?? [];
  const { data } = await supabase().from('briefings').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function storeBriefing(input: { user_id: string; course_id?: string; kind: string; content: string; delivered_via?: string }): Promise<Briefing> {
  if (DEMO) {
    const b: Briefing = {
      id: randomUUID(), user_id: input.user_id, course_id: input.course_id ?? null,
      kind: input.kind as any, content: input.content, delivered_via: (input.delivered_via as any) ?? null,
      delivered_at: new Date().toISOString(), created_at: new Date().toISOString(),
    };
    const list = briefings.get(input.course_id ?? '') ?? [];
    list.push(b);
    briefings.set(input.course_id ?? '', list);
    return b;
  }
  const { data } = await supabase().from('briefings').insert(input).select().single();
  return data;
}

// ─── Ingest Jobs ───
export async function createIngestJob(syllabusId: string, stage: string): Promise<IngestJob> {
  if (DEMO) {
    const j: IngestJob = {
      id: randomUUID(), syllabus_id: syllabusId, stage: stage as any,
      status: 'pending', log_json: {}, error: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    ingestJobs.set(j.id, j);
    return j;
  }
  const { data } = await supabase().from('ingest_jobs').insert({ syllabus_id: syllabusId, stage }).select().single();
  return data;
}

export async function getIngestJob(id: string): Promise<IngestJob | null> {
  if (DEMO) return ingestJobs.get(id) ?? null;
  const { data } = await supabase().from('ingest_jobs').select('*').eq('id', id).single();
  return data;
}
