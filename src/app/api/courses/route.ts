// Semester OS — POST /api/courses
// Create a course (resolves the default institution automatically)

import { NextResponse } from 'next/server';
import { createCourse, ensureInstitution, listInstitutions, listCourses } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, title, offering, instId } = body as {
      code?: string; title?: string; offering?: string; instId?: string;
    };

    if (!code?.trim() || !title?.trim()) {
      return NextResponse.json({ error: 'code and title are required' }, { status: 400 });
    }

    // Resolve institution: explicit id → first existing → auto-seed
    let resolvedInstId = instId;
    if (!resolvedInstId) {
      const insts = await listInstitutions();
      resolvedInstId = insts[0]?.id ?? (await ensureInstitution()).id;
    }

    // Duplicate-code guard
    const existing = await listCourses(resolvedInstId);
    const dup = existing.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (dup) {
      return NextResponse.json(
        { error: `A course with code "${code.trim()}" already exists.` },
        { status: 409 }
      );
    }

    const course = await createCourse({
      inst_id: resolvedInstId,
      code: code.trim(),
      title: title.trim(),
      offering: offering?.trim() || 'Fall 2026',
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Create course error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
