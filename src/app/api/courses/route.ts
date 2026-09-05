// Semester OS — POST /api/courses
// Create a course. Two modes:
//   catalog mode:  { catalogCode, sectionCode }  — from the LUMS picker
//   manual mode:   { code, title, offering }     — fallback when catalog misses
// Manual codes that match a catalog course are rejected (use the picker).

import { NextResponse } from 'next/server';
import { createCourse, ensureInstitution, listInstitutions, listCourses } from '@/lib/db';
import { findCourse, getCatalog } from '@/lib/catalog';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      code, title, offering, instId,
      catalogCode, sectionCode,
    } = body as {
      code?: string; title?: string; offering?: string; instId?: string;
      catalogCode?: string; sectionCode?: string;
    };

    // ---- catalog mode ----
    if (catalogCode) {
      const course = findCourse(catalogCode);
      if (!course) {
        return NextResponse.json({ error: `Course "${catalogCode}" not in the LUMS catalog.` }, { status: 404 });
      }
      if (!sectionCode) {
        return NextResponse.json({ error: 'Pick a section first.' }, { status: 400 });
      }
      const sec = course.sections.find((s) => s.code.toUpperCase() === sectionCode.toUpperCase());
      if (!sec) {
        return NextResponse.json({ error: `Section "${sectionCode}" not found for ${course.code}.` }, { status: 404 });
      }

      const insts = await listInstitutions();
      const inst_id = instId ?? insts[0]?.id ?? (await ensureInstitution()).id;

      const existing = await listCourses(inst_id);
      const dup = existing.find(
        (c) => c.code.toUpperCase() === course.code.toUpperCase() && (c.offering ?? '') === (getCatalog().term)
      );
      if (dup) {
        return NextResponse.json({ error: `${course.code} is already in your courses.` }, { status: 409 });
      }

      const created = await createCourse({
        inst_id,
        code: course.code,
        title: course.title,
        offering: getCatalog().term,
        section_code: sec.code,
      });
      return NextResponse.json({ course: created, section: sec }, { status: 201 });
    }

    // ---- manual mode ----
    if (!code?.trim() || !title?.trim()) {
      return NextResponse.json({ error: 'code and title are required' }, { status: 400 });
    }
    let resolvedInstId = instId;
    if (!resolvedInstId) {
      const insts = await listInstitutions();
      resolvedInstId = insts[0]?.id ?? (await ensureInstitution()).id;
    }
    const existing = await listCourses(resolvedInstId);
    const dup = existing.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (dup) {
      return NextResponse.json(
        { error: `A course with code "${code.trim()}" already exists.` },
        { status: 409 }
      );
    }
    // keep the catalog honest: don't let manual entry shadow a real course
    if (findCourse(code)) {
      return NextResponse.json(
        { error: `"${code}" is in the LUMS catalog. Pick it from the list instead so the schedule fills in automatically.` },
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
