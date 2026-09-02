// Semester OS — POST /api/approve
// Approve or reject model items

import { NextResponse } from 'next/server';
import { listModelItems } from '@/lib/db';

// In-memory store for approved items (DEMO_MODE)
const approvedItems = new Map<string, Set<string>>(); // courseId -> Set<itemId>

export async function POST(req: Request) {
  try {
    const { courseId, itemId, action } = await req.json();

    if (!courseId || !itemId || !action) {
      return NextResponse.json({ error: 'courseId, itemId, and action required' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    // Get the item to verify it exists
    const items = await listModelItems(courseId);
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Update in-memory store (DEMO_MODE)
    if (process.env.DEMO_MODE === 'true' || !process.env.SUPABASE_URL) {
      const set = approvedItems.get(courseId) ?? new Set<string>();
      if (action === 'approve') {
        set.add(itemId);
      } else {
        set.delete(itemId);
      }
      approvedItems.set(courseId, set);
    }

    // In production: update model_items table
    // await supabase().from('model_items').update({ approved: action === 'approve' }).eq('id', itemId);

    return NextResponse.json({
      success: true,
      item_id: itemId,
      action,
      approved: action === 'approve',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Approve error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
