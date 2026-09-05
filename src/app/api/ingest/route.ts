// Semester OS — POST /api/ingest
// Upload a syllabus, run parse → extract → verify, persist verified items.

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/ingest/pipeline';
import { createCourse, getCourse, ensureInstitution, getSessions, saveModelItems, createIngestJob } from '@/lib/db';
import type { LLMOverride } from '@/lib/llm';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string | null;
    const courseCode = formData.get('courseCode') as string | null;
    const courseTitle = formData.get('courseTitle') as string | null;
    const llmKey = formData.get('llmApiKey') as string | null;
    const llmBaseUrl = formData.get('llmBaseUrl') as string | null;
    const llmModel = formData.get('llmModel') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'docx') {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    // Resolve or create the target course
    let targetCourseId = courseId;
    if (!targetCourseId && courseCode && courseTitle) {
      const inst = await ensureInstitution();
      const course = await createCourse({
        inst_id: inst.id,
        code: courseCode,
        title: courseTitle,
        offering: 'Fall 2026',
      });
      targetCourseId = course.id;
    }

    if (!targetCourseId) {
      return NextResponse.json({ error: 'courseId or (courseCode + courseTitle) required' }, { status: 400 });
    }

    // BYOK: browser-supplied key (demo mode) takes precedence; env var is fallback
    const llm: LLMOverride = {};
    if (llmKey) llm.apiKey = llmKey;
    if (llmBaseUrl) llm.baseUrl = llmBaseUrl;
    if (llmModel) llm.model = llmModel;

    // Create ingest job
    const job = await createIngestJob(randomUUID(), 'parse');

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run pipeline
    const result = await runPipeline(buffer, file.name, targetCourseId, 1, job.id, undefined, llm);

    // Resolve "Session N" → real dates from the institution calendar so items
    // land on the timeline / Today view (v0.1 left these null forever).
    const course = await getCourse(targetCourseId);
    if (course) {
      const sessions = await getSessions(course.inst_id, course.offering ?? 'Fall 2026');
      const byNo = new Map(sessions.map((s) => [s.session_no, s.date_start]));
      for (const item of result.verified.items) {
        if (item.session_no !== null && !item.date) {
          item.date = byNo.get(item.session_no) ?? null;
        }
      }
    }

    // Persist verified items so they appear on the course page and approval gate
    await saveModelItems(targetCourseId, result.verified.items);

    return NextResponse.json({
      job_id: job.id,
      course_id: targetCourseId,
      status: 'verify_complete',
      items: result.verified.items,
      summary: result.verified.summary,
      sections_found: result.parsed.section_headings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Ingest error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
