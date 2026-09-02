// Semester OS -- POST/GET /api/brief
// Generate and list briefings for courses

import { NextResponse } from 'next/server';
import {
  listCourses,
  listModelItems,
  listGradeEntries,
  getGradeBudget,
  storeBriefing,
  listBriefings,
} from '@/lib/db';
import {
  generateWeeklyBrief,
  generateT5Warning,
  generateBudgetDelta,
} from '@/lib/brief';
import { getNextSession } from '@/lib/session-engine';

// POST /api/brief -- Generate a weekly briefing for a course
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseId, kind } = body as { courseId?: string; kind?: string };

    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 });
    }

    // Get course info
    const courses = await listCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const briefingKind = kind || 'weekly';
    let content = '';

    if (briefingKind === 'weekly') {
      const items = await listModelItems(courseId);
      const approvedItems = items.filter((i) => i.approved);
      const budget = await getGradeBudget(courseId);
      const policies = approvedItems.filter((i) => i.kind === 'policy');

      // Find items due in next 7 days
      const now = new Date();
      const cutoff = new Date(now.getTime() + 7 * 86_400_000);
      const upcomingItems = approvedItems.filter((i) => {
        if (!i.date) return false;
        const d = new Date(i.date);
        return d >= now && d <= cutoff;
      });

      // Find current session number (approximate)
      const nowStr = now.toISOString().split('T')[0];
      const nextSess = getNextSession([], nowStr);
      const currentWeek = nextSess ? Math.max(1, nextSess.session_no - 1) : 1;

      content = generateWeeklyBrief(
        course.code,
        course.title,
        course.offering ?? 'Unknown',
        currentWeek,
        upcomingItems,
        budget,
        policies,
        nextSess
      );
    } else if (briefingKind === 'warning') {
      const { itemId, daysLeft } = body as { itemId?: string; daysLeft?: number };
      if (!itemId || daysLeft === undefined) {
        return NextResponse.json({ error: 'itemId and daysLeft required for warning' }, { status: 400 });
      }
      const items = await listModelItems(courseId);
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      content = generateT5Warning(course.code, item, daysLeft);
    } else if (briefingKind === 'budget_delta') {
      const { componentId, score, maxScore } = body as {
        componentId?: string;
        score?: number;
        maxScore?: number;
      };
      if (!componentId || score === undefined || maxScore === undefined) {
        return NextResponse.json(
          { error: 'componentId, score, and maxScore required for budget_delta' },
          { status: 400 }
        );
      }
      const items = await listModelItems(courseId);
      const comp = items.find((i) => i.id === componentId);
      const budget = await getGradeBudget(courseId);
      content = generateBudgetDelta(course.code, comp?.title ?? 'Unknown', score, maxScore, budget);
    } else {
      return NextResponse.json({ error: `Unknown briefing kind: ${briefingKind}` }, { status: 400 });
    }

    // Store the briefing
    const briefing = await storeBriefing({
      user_id: 'demo-user',
      course_id: courseId,
      kind: briefingKind,
      content,
      delivered_via: 'in_app',
    });

    return NextResponse.json({ briefing });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Brief error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/brief?courseId=xxx -- List recent briefings for a course
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId query param required' }, { status: 400 });
    }

    const briefings = await listBriefings(courseId);
    return NextResponse.json({ briefings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('List briefings error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
