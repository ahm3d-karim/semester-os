// Semester OS — GET /api/catalog
// Serves the LUMS course catalog for the picker (course list + sections).
// 404s (with a flag) when the catalog env/data is absent, so the UI can fall
// back to manual entry honestly.

import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';

export async function GET() {
  const cat = getCatalog();
  if (cat.courses.length === 0) {
    return NextResponse.json(
      { available: false, reason: 'Catalog data not deployed (set LUMS_CATALOG_B64 or ship data/lums-fall-2026.json).', courses: [] },
      { status: 404 }
    );
  }
  return NextResponse.json({
    available: true,
    term: cat.term,
    count: cat.courses.length,
    courses: cat.courses,
  });
}
