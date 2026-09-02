// Semester OS -- Grade Budget (pure computation)
// Computes the grade budget from approved grade_component items and grade entries

import type { ModelItem, GradeEntry, GradeBudget, GradeBudgetComponent, BudgetStatus } from '@/lib/types';

/**
 * Compute grade budget from model items and grade entries.
 * This is a pure function -- no DB calls.
 */
export function computeBudget(
  items: ModelItem[],
  grades: GradeEntry[]
): GradeBudget {
  const components = items.filter(
    (i) => i.kind === 'grade_component' && i.approved
  );

  const totalWeight = components.reduce((s, c) => s + (c.weight ?? 0), 0);

  const budgetComponents: GradeBudgetComponent[] = components.map((c) => {
    const g = grades.find((x) => x.component_id === c.id);
    return {
      item_id: c.id,
      title: c.title,
      weight: c.weight ?? 0,
      scored: g?.score ?? null,
      running_pct: g
        ? (g.score / (g.max_score || 100)) * 100
        : null,
    };
  });

  let status: BudgetStatus = 'balanced';
  if (totalWeight > 100) status = 'over';
  else if (totalWeight < 100) status = 'under';

  return {
    total_weight: totalWeight,
    items_count: components.length,
    status,
    components: budgetComponents,
  };
}
