// Semester OS — POST /api/ingest
// Upload a syllabus, start the ingestion pipeline

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/ingest/pipeline';
import { createCourse, listCourses, createIngestJob } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string | null;
    const courseCode = formData.get('courseCode') as string | null;
    const courseTitle = formData.get('courseTitle') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'pdf' && ext !== 'docx') {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    // Get or create course
    let targetCourseId = courseId;
    if (!targetCourseId && courseCode && courseTitle) {
      const inst = (await listCourses())[0];
      const course = await createCourse({
        inst_id: inst?.inst_id ?? '',
        code: courseCode,
        title: courseTitle,
        offering: 'Fall 2026',
      });
      targetCourseId = course.id;
    }

    if (!targetCourseId) {
      return NextResponse.json({ error: 'courseId or (courseCode + courseTitle) required' }, { status: 400 });
    }

    // Create ingest job
    const job = await createIngestJob('', 'parse');

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run pipeline
    const result = await runPipeline(buffer, file.name, targetCourseId, 1, job.id);

    // Store verified items in the DB (or in-memory for DEMO_MODE)
    const { listModelItems } = await import('@/lib/db');
    // In DEMO_MODE, items are stored via the pipeline; in prod, we'd write to DB here
    // For now, the result is returned directly

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
