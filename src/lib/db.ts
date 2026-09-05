// Semester OS — DB-agnostic data layer
// DEMO_MODE=true → in-memory Maps, zero external accounts
// DEMO_MODE=false → Supabase Postgres
//
// v0.1.1: course content is EMPTY by default. Only app infrastructure is
// seeded in demo mode: one institution (LUMS) + its Fall 2026 session
// calendar. All courses/items/briefings are user-created.

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Course, Syllabus, IngestJob, ModelItem, CourseModel,
  GradeEntry, Briefing, Session, Institution, CalendarEvent,
} from './types';

const DEMO = process.env.DEMO_MODE === 'true' || !process.env.SUPABASE_URL;

// Exported so UI can show a demo-mode banner (ephemeral in-memory state)
export const IS_DEMO = DEMO;

// ─── In-memory stores (DEMO_MODE) ───
// Hang the maps off globalThis so Next.js dev HMR / route-module reloads
// don't wipe state between requests. Does NOT survive serverless recycling —
// the UI shows a demo-mode banner for exactly this reason.
interface DemoStores {
  institutions: Map<string, Institution>;
  sessions: Map<string, Session[]>;
  calendarEvents: Map<string, CalendarEvent[]>;
  courses: Map<string, Course>;
  syllabi: Map<string, Syllabus>;
  ingestJobs: Map<string, IngestJob>;
  modelItems: Map<string, ModelItem[]>;
  courseModels: Map<string, CourseModel[]>;
  gradeEntries: Map<string, GradeEntry[]>;
  briefings: Map<string, Briefing[]>;
}

const g = globalThis as unknown as { __semesterOSStores?: DemoStores };

function stores(): DemoStores {
  if (!g.__semesterOSStores) {
    g.__semesterOSStores = {
      institutions: new Map(),
      sessions: new Map(),
      calendarEvents: new Map(),
      courses: new Map(),
      syllabi: new Map(),
      ingestJobs: new Map(),
      modelItems: new Map(),
      courseModels: new Map(),
      gradeEntries: new Map(),
      briefings: new Map(),
    };
  }
  return g.__semesterOSStores;
}

// ─── Infrastructure seed (institution + session calendar only) ───
// NOT course content. Runs once per process; safe to call repeatedly.
export async function ensureInstitution(): Promise<Institution> {
  const s = stores();
  const existing = Array.from(s.institutions.values())[0];
  if (existing) return existing;

  const inst: Institution = {
    id: randomUUID(), code: 'LUMS', name: 'Lahore University of Management Sciences',
    calendar_url: 'https://lums.edu.pk/academic-calendar', created_at: new Date().toISOString(),
  };
  s.institutions.set(inst.id, inst);

  // Fall 2026 session calendar: 16 sessions, weekly, from Sep 1 2026
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
  s.sessions.set(`${inst.id}:${term}`, termSessions);

  return inst;
}

// Resolve "Session N in term T" → date, per institution calendar
export async function resolveSessionDate(instId: string, term: string, sessionNo: number): Promise<string | null> {
  const all = await getSessions(instId, term);
  const s = all.find((x) => x.session_no === sessionNo);
  return s?.date_start ?? null;
}

// ─── Supabase client (lazy) ───
let sb: SupabaseClient | null = null;
function supabase() {
  if (!sb) {
    sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  }
  return sb;
}

// ─── Institutions ───
export async function listInstitutions(): Promise<Institution[]> {
  if (DEMO) return Array.from(stores().institutions.values());
  const { data } = await supabase().from('institutions').select('*');
  return data ?? [];
}

// ─── Sessions ───
export async function getSessions(instId: string, term: string): Promise<Session[]> {
  if (DEMO) return stores().sessions.get(`${instId}:${term}`) ?? [];
  const { data } = await supabase().from('sessions').select('*').eq('inst_id', instId).eq('term', term).order('session_no');
  return data ?? [];
}

// ─── Courses ───
export async function listCourses(instId?: string): Promise<Course[]> {
  if (DEMO) {
    const all = Array.from(stores().courses.values());
    return instId ? all.filter((c) => c.inst_id === instId) : all;
  }
  let q = supabase().from('courses').select('*');
  if (instId) q = q.eq('inst_id', instId);
  const { data } = await q;
  return data ?? [];
}

export async function getCourse(id: string): Promise<Course | null> {
  if (DEMO) return stores().courses.get(id) ?? null;
  const { data } = await supabase().from('courses').select('*').eq('id', id).single();
  return data;
}

export async function createCourse(input: { inst_id: string; code: string; title: string; offering: string; section_code?: string | null }): Promise<Course> {
  if (DEMO) {
    const c: Course = { id: randomUUID(), section_code: input.section_code ?? null, ...input, status: 'active', created_at: new Date().toISOString() };
    stores().courses.set(c.id, c);
    return c;
  }
  const { data } = await supabase().from('courses').insert(input).select().single();
  return data;
}

// ─── Model Items ───
export async function listModelItems(courseId: string, version?: number): Promise<ModelItem[]> {
  if (DEMO) {
    const items = stores().modelItems.get(courseId) ?? [];
    return version ? items.filter((i) => i.model_version === version) : items;
  }
  let q = supabase().from('model_items').select('*').eq('course_id', courseId);
  if (version) q = q.eq('model_version', version);
  const { data } = await q;
  return data ?? [];
}

// Persist extracted (already-verified) items for a course
export async function saveModelItems(courseId: string, items: ModelItem[]): Promise<void> {
  if (DEMO) {
    stores().modelItems.set(courseId, items);
    return;
  }
  if (items.length === 0) return;
  const { error } = await supabase().from('model_items').upsert(items, { onConflict: 'id' });
  if (error) throw new Error(`saveModelItems: ${error.message}`);
}

// Approval gate: flip one item's approved flag (the single source of truth)
export async function setApproval(courseId: string, itemId: string, approved: boolean, note: string | null = null): Promise<void> {
  if (DEMO) {
    const items = stores().modelItems.get(courseId) ?? [];
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error('Item not found');
    item.approved = approved;
    item.approved_at = approved ? new Date().toISOString() : null;
    item.approval_note = note;
    return;
  }
  const { error } = await supabase()
    .from('model_items')
    .update({ approved, approved_at: approved ? new Date().toISOString() : null, approval_note: note })
    .eq('id', itemId);
  if (error) throw new Error(`setApproval: ${error.message}`);
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
  const grades = DEMO ? (stores().gradeEntries.get(courseId) ?? []) : (await listGradeEntries(courseId));
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
  if (DEMO) return stores().gradeEntries.get(courseId) ?? [];
  const { data } = await supabase().from('grade_entries').select('*').eq('course_id', courseId);
  return data ?? [];
}

export async function addGradeEntry(input: { course_id: string; component_id: string; score: number; max_score?: number }): Promise<GradeEntry> {
  if (DEMO) {
    const e: GradeEntry = {
      id: randomUUID(), course_id: input.course_id, component_id: input.component_id,
      score: input.score, max_score: input.max_score ?? 100, added_at: new Date().toISOString(),
    };
    const list = stores().gradeEntries.get(input.course_id) ?? [];
    list.push(e);
    stores().gradeEntries.set(input.course_id, list);
    return e;
  }
  const { data } = await supabase().from('grade_entries').insert(input).select().single();
  return data;
}

// ─── Briefings ───
export async function listBriefings(courseId: string): Promise<Briefing[]> {
  if (DEMO) return stores().briefings.get(courseId) ?? [];
  const { data } = await supabase().from('briefings').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
  return data ?? [];
}

export async function storeBriefing(input: { user_id: string; course_id?: string; kind: string; content: string; delivered_via?: string }): Promise<Briefing> {
  if (DEMO) {
    const b: Briefing = {
      id: randomUUID(), user_id: input.user_id, course_id: input.course_id ?? null,
      kind: input.kind as Briefing['kind'], content: input.content, delivered_via: (input.delivered_via as Briefing['delivered_via']) ?? null,
      delivered_at: new Date().toISOString(), created_at: new Date().toISOString(),
    };
    const list = stores().briefings.get(input.course_id ?? '') ?? [];
    list.push(b);
    stores().briefings.set(input.course_id ?? '', list);
    return b;
  }
  const { data } = await supabase().from('briefings').insert(input).select().single();
  return data;
}

// ─── Ingest Jobs ───
export async function createIngestJob(syllabusId: string, stage: string): Promise<IngestJob> {
  if (DEMO) {
    const j: IngestJob = {
      id: randomUUID(), syllabus_id: syllabusId, stage: stage as IngestJob['stage'],
      status: 'pending', log_json: {}, error: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    stores().ingestJobs.set(j.id, j);
    return j;
  }
  const { data } = await supabase().from('ingest_jobs').insert({ syllabus_id: syllabusId, stage }).select().single();
  return data;
}

export async function getIngestJob(id: string): Promise<IngestJob | null> {
  if (DEMO) return stores().ingestJobs.get(id) ?? null;
  const { data } = await supabase().from('ingest_jobs').select('*').eq('id', id).single();
  return data;
}
