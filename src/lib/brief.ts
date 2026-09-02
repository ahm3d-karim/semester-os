// Semester OS -- Brief Agent
// Generates formatted briefings from approved model items

import type { ModelItem, GradeEntry, BriefingKind } from '@/lib/types';
import type { GradeBudget } from '@/lib/types';

/**
 * Generate a weekly brief text from approved items due in the next 7 days.
 * Follows the template in docs/contract/brief-templates.md.
 */
export function generateWeeklyBrief(
  courseCode: string,
  courseTitle: string,
  term: string,
  sessionNo: number,
  items: ModelItem[],
  budget: GradeBudget | null,
  policies: ModelItem[],
  nextSession: { session_no: number; date_start: string } | null
): string {
  const lines: string[] = [];

  lines.push(`WEEKLY BRIEF -- ${term} Week ${sessionNo}`);
  lines.push('='.repeat(50));
  lines.push('');

  // Course header
  lines.push(`${courseCode} ${courseTitle}`);
  lines.push('');

  // Items due this week
  if (items.length === 0) {
    lines.push('  No deadlines this week.');
    if (budget && budget.components.some((c) => c.scored === null)) {
      const ungraded = budget.components
        .filter((c) => c.scored === null)
        .map((c) => c.title)
        .join(', ');
      lines.push(`  Review pending: ${ungraded}`);
    }
  } else {
    for (const item of items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))) {
      const weightStr = item.weight !== null ? `Weight: ${item.weight}%` : '';
      const statusStr = item.kind === 'grade_component' ? ' | Status: not yet graded' : '';
      lines.push(`  ${item.date ?? 'TBD'}  Session ${item.session_no ?? '-'}  ${item.title} (${item.kind.replace('_', ' ')})`);
      lines.push(`  ${item.detail.split('\n')[0]}`);
      if (weightStr || statusStr) {
        lines.push(`  ${weightStr}${statusStr}`);
      }
      lines.push('');
    }
  }

  lines.push('='.repeat(50));
  lines.push('GRADE BUDGET');

  if (budget) {
    if (budget.components.some((c) => c.scored !== null)) {
      const scoredSum = budget.components.reduce(
        (s, c) => s + (c.scored !== null ? c.scored : 0),
        0
      );
      const runningPct = budget.total_weight > 0
        ? (scoredSum / budget.total_weight) * 100
        : 0;
      lines.push(`  ${courseCode}: ${scoredSum.toFixed(1)}/${budget.total_weight} (${runningPct.toFixed(1)}%) -- ${budget.status}`);
    } else {
      lines.push(`  ${courseCode}: not yet graded`);
    }
  } else {
    lines.push(`  ${courseCode}: no grade components found`);
  }

  lines.push('');
  lines.push('='.repeat(50));
  lines.push('POLICIES TO REMEMBER');

  if (policies.length > 0) {
    for (const p of policies) {
      lines.push(`  - ${p.title}: ${p.detail.split('.')[0]}.`);
    }
  } else {
    lines.push('  No policies extracted.');
  }

  lines.push('');
  lines.push('='.repeat(50));

  if (nextSession) {
    lines.push(`Next session: ${nextSession.session_no} -- ${nextSession.date_start}`);
  } else {
    lines.push('No upcoming sessions.');
  }

  return lines.join('\n');
}

/**
 * Generate a T-5 warning for an item due soon.
 */
export function generateT5Warning(
  courseCode: string,
  item: ModelItem,
  daysLeft: number
): string {
  const lines: string[] = [];
  const urgency = daysLeft <= 1 ? '!!' : daysLeft <= 3 ? '!' : '';

  lines.push(`${urgency} ${daysLeft} DAYS LEFT`);
  lines.push('='.repeat(50));
  lines.push(`${courseCode} -- ${item.title}`);
  lines.push(`Due: ${item.date ?? 'TBD'} (Session ${item.session_no ?? '-'})`);

  // First two lines of detail
  const detailLines = item.detail.split('\n').slice(0, 2);
  for (const dl of detailLines) {
    lines.push(dl);
  }

  if (item.weight !== null) {
    lines.push(`Weight: ${item.weight}%`);
  }

  // If deadline has passed
  if (daysLeft <= 0) {
    lines.push('');
    lines.push('This deadline has passed. Have you submitted? Log your grade when available.');
  }

  return lines.join('\n');
}

/**
 * Generate a budget delta message when a grade is logged.
 */
export function generateBudgetDelta(
  courseCode: string,
  componentTitle: string,
  score: number,
  maxScore: number,
  budget: GradeBudget
): string {
  const lines: string[] = [];

  lines.push(`GRADE UPDATE -- ${courseCode}`);
  lines.push('='.repeat(50));
  lines.push(`${componentTitle}: ${score}/${maxScore} (entered now)`);

  // Running total
  const scoredSum = budget.components.reduce(
    (s, c) => s + (c.scored !== null ? c.scored : 0),
    0
  );
  const runningPct = budget.total_weight > 0
    ? (scoredSum / budget.total_weight) * 100
    : 0;

  lines.push(`Running total: ${scoredSum.toFixed(1)}/${budget.total_weight} = ${runningPct.toFixed(1)}%`);

  const ungraded = budget.components.filter((c) => c.scored === null);
  const ungradedWeight = ungraded.reduce((s, c) => s + c.weight, 0);
  lines.push(`Remaining: ${ungradedWeight}% across ${ungraded.length} component${ungraded.length !== 1 ? 's' : ''}`);

  lines.push('');

  // Advice
  if (runningPct < 60) {
    lines.push('Below passing range. Consider scheduling review.');
  } else if (runningPct >= 90) {
    lines.push('Strong position. Keep it up.');
  }

  // Budget status warnings
  if (budget.status === 'over') {
    lines.push('');
    lines.push(`Grade weights sum to ${budget.total_weight}%. Check syllabus -- components may be miscounted.`);
  } else if (budget.status === 'under') {
    lines.push('');
    lines.push(`Grade weights sum to ${budget.total_weight}%. ${100 - budget.total_weight}% of your grade is unaccounted for.`);
  }

  return lines.join('\n');
}
