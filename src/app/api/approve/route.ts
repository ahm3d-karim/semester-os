// Semester OS — POST /api/approve
// Approve or reject model items (single source of truth: model_items.approved)

import { NextResponse } from 'next/server';
import { setApproval } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { courseId, itemId, action } = await req.json();

    if (!courseId || !itemId || !action) {
      return NextResponse.json({ error: 'courseId, itemId, and action required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    try {
      await setApproval(courseId, itemId, action === 'approve');
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes('not found')) {
        return NextResponse.json({ error: m }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true, itemId, action });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Approve error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
