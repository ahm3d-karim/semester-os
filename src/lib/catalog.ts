// Semester OS — LUMS course catalog (registrar data, term-bound)
//
// Load order (first wins):
//   1. LUMS_CATALOG_B64 env var (gzip+base64 of the JSON — used in production
//      so the raw registrar file never enters the public repo)
//   2. data/lums-fall-2026.json on disk (local dev)
//   3. empty catalog — the app degrades to manual course entry
//
// Source of truth: LUMS Office of the Registrar PDFs (user-provided).
// The data file itself is gitignored.

import { gunzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

export interface CatalogSection {
  code: string;
  session: string;
  days_raw: string;
  days: number[]; // 0=Mon .. 6=Sun
  start: string;  // '12:30'
  end: string;    // '13:45'
  instructor: string;
  building: string;
  room: string;
}

export interface CatalogCourse {
  code: string;
  title: string;
  credit_hours: number | null;
  sections: CatalogSection[];
  cross_listed: string[];
}

export interface ExamPattern {
  pattern: string;
  date: string;
  time: string; // '0800-1100'
}

export interface CombinedExam {
  course: string;
  section_range: string | null;
  date: string;
  time: string;
}

export interface Catalog {
  term: string;
  institution: string;
  session_dates: string;
  generated_at: string;
  courses: CatalogCourse[];
  exam_patterns: ExamPattern[];
  combined_exams: CombinedExam[];
}

export const EMPTY_CATALOG: Catalog = {
  term: 'Fall 2026',
  institution: 'LUMS',
  session_dates: '2026-08-27 to 2026-12-08',
  generated_at: '',
  courses: [],
  exam_patterns: [],
  combined_exams: [],
};

let cache: Catalog | null = null;

export function getCatalog(): Catalog {
  if (cache) return cache;

  const b64 = process.env.LUMS_CATALOG_B64;
  if (b64) {
    try {
      const json = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
      cache = JSON.parse(json) as Catalog;
      return cache;
    } catch (e) {
      console.error('LUMS_CATALOG_B64 failed to decode:', e instanceof Error ? e.message : e);
    }
  }

  try {
    const file = path.join(process.cwd(), 'data', 'lums-fall-2026.json');
    if (fs.existsSync(file)) {
      cache = JSON.parse(fs.readFileSync(file, 'utf8')) as Catalog;
      return cache;
    }
  } catch (e) {
    console.error('catalog file read failed:', e instanceof Error ? e.message : e);
  }

  return EMPTY_CATALOG;
}

/** Case-insensitive course lookup; resolves cross-listed aliases to the parent record. */
export function findCourse(code: string): CatalogCourse | null {
  const cat = getCatalog();
  const norm = code.trim().toUpperCase();
  const direct = cat.courses.find((c) => c.code.toUpperCase() === norm);
  if (direct) return direct;
  // alias: some parent course cross-lists this code
  const parent = cat.courses.find((c) =>
    c.cross_listed.some((x) => x.toUpperCase() === norm)
  );
  if (parent) {
    return {
      ...parent,
      code: norm,
      cross_listed: [parent.code, ...parent.cross_listed.filter((x) => x.toUpperCase() !== norm)],
    };
  }
  return null;
}

/** Final exam lookup: combined-exam pin first, then the class meeting pattern. */
export function findFinalExam(course: CatalogCourse): { date: string; time: string; source: 'combined' | 'pattern' } | null {
  const cat = getCatalog();

  const combined = cat.combined_exams.find(
    (c) => c.course.toUpperCase() === course.code.toUpperCase()
  );
  if (combined) {
    return { date: combined.date, time: combined.time, source: 'combined' };
  }

  for (const sec of course.sections) {
    // registrar patterns use the first 2-3 day letters + exact times
    const pat = cat.exam_patterns.find(
      (p) =>
        p.pattern.startsWith(sec.days_raw.slice(0, 1)) ||
        p.pattern.startsWith(sec.days_raw)
    );
    if (pat) {
      return { date: pat.date, time: pat.time, source: 'pattern' };
    }
  }
  return null;
}

/** Weekly meetings expanded per day-of-week for timetable rendering. */
export interface MeetingBlock {
  day: number;
  start: string;
  end: string;
  courseCode: string;
  section: string;
  room: string;
  building: string;
  instructor: string;
}

export function expandMeetings(courses: { code: string; sectionCode: string }[]): {
  blocks: MeetingBlock[];
  clashes: { a: MeetingBlock; b: MeetingBlock }[];
} {
  const cat = getCatalog();
  const blocks: MeetingBlock[] = [];

  for (const sel of courses) {
    const course = findCourse(sel.code) ?? {
      code: sel.code,
      title: '',
      credit_hours: null,
      sections: [],
      cross_listed: [],
    };
    for (const sec of course.sections) {
      if (sec.code.toUpperCase() !== sel.sectionCode.toUpperCase()) continue;
      for (const day of sec.days) {
        blocks.push({
          day,
          start: sec.start,
          end: sec.end,
          courseCode: course.code,
          section: sec.code,
          room: sec.room,
          building: sec.building,
          instructor: sec.instructor,
        });
      }
    }
  }

  // clash detection: same day, overlapping times
  const clashes: { a: MeetingBlock; b: MeetingBlock }[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.day !== b.day) continue;
      if (a.start < b.end && b.start < a.end) {
        clashes.push({ a, b });
      }
    }
  }
  return { blocks, clashes };
}
