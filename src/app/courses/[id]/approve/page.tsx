// Semester OS — Approval diff UI
// Per-item approve/edit/reject with verification scores and source anchors

import { getCourse, listModelItems, getGradeBudget } from '@/lib/db';
import type { ModelItem } from '@/lib/types';
import { ApproveActions } from './ApproveActions';

export const dynamic = 'force-dynamic';

export default async function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return <div className="py-16 text-center text-gray-400">Course not found</div>;

  const items: ModelItem[] = await listModelItems(id);
  const budget = await getGradeBudget(id);

  // Separate by status
  const autoRejected = items.filter((i) => i.verification.auto_rejected);
  const needsReview = items.filter((i) => !i.verification.auto_rejected && !i.approved && i.verification.score < 0.7);
  const autoApproved = items.filter((i) => i.verification.score >= 0.7 && !i.approved);
  const approved = items.filter((i) => i.approved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Items</h1>
          <p className="text-gray-500 mt-1">{course.code} — {course.title}</p>
        </div>
        <a href={`/courses/${id}`} className="text-sm text-blue-600 hover:underline">
          Back to course →
        </a>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total" count={items.length} color="gray" />
        <SummaryCard label="Auto-approved (≥0.7)" count={autoApproved.length} color="green" />
        <SummaryCard label="Needs review (<0.7)" count={needsReview.length} color="amber" />
        <SummaryCard label="Auto-rejected (<0.5)" count={autoRejected.length} color="red" />
      </div>

      {/* Grade budget check */}
      <div className={`border rounded-xl p-4 ${budget.status === 'balanced' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">Grade Budget:</span>
          <span className={`text-lg font-bold ${budget.status === 'balanced' ? 'text-green-600' : 'text-amber-600'}`}>
            {budget.total_weight}%
          </span>
          <span className="text-sm text-gray-500">
            {budget.items_count} components
            {budget.status !== 'balanced' && ` — ${budget.status === 'over' ? 'over by ' + (budget.total_weight - 100) + '%' : 'under by ' + (100 - budget.total_weight) + '%'}`}
          </span>
        </div>
      </div>

      {/* Auto-approved items */}
      {autoApproved.length > 0 && (
        <Section title="Auto-approved (score ≥ 0.7)" color="green" count={autoApproved.length}>
          {autoApproved.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} />
          ))}
        </Section>
      )}

      {/* Needs review */}
      {needsReview.length > 0 && (
        <Section title="Needs your review (score < 0.7)" color="amber" count={needsReview.length}>
          {needsReview.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} showActions />
          ))}
        </Section>
      )}

      {/* Auto-rejected */}
      {autoRejected.length > 0 && (
        <Section title="Auto-rejected (score < 0.5)" color="red" count={autoRejected.length}>
          {autoRejected.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} dimmed />
          ))}
        </Section>
      )}

      {/* Already approved */}
      {approved.length > 0 && (
        <Section title="Previously approved" color="gray" count={approved.length}>
          {approved.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} />
          ))}
        </Section>
      )}

      {/* Bulk actions */}
      {autoApproved.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4">
          <div className="flex gap-3">
            <ApproveActions
              courseId={id}
              itemIds={autoApproved.map((i) => i.id)}
              action="approve"
              label={`Approve all ${autoApproved.length} auto-approved items`}
              variant="primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}

function Section({ title, color, count, children }: {
  title: string; color: string; count: number; children: React.ReactNode;
}) {
  const borders: Record<string, string> = {
    green: 'border-green-200', amber: 'border-amber-200', red: 'border-red-200', gray: 'border-gray-200',
  };
  return (
    <div className={`border ${borders[color]} rounded-xl overflow-hidden`}>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="font-semibold">{title}</span>
        <span className="ml-2 text-sm text-gray-500">({count})</span>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

function ItemRow({ item, courseId, showActions = false, dimmed = false }: {
  item: ModelItem; courseId: string; showActions?: boolean; dimmed?: boolean;
}) {
  const kindColors: Record<string, string> = {
    deadline: 'bg-blue-100 text-blue-700',
    grade_component: 'bg-purple-100 text-purple-700',
    policy: 'bg-gray-100 text-gray-700',
    milestone: 'bg-yellow-100 text-yellow-700',
    note: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className={`p-4 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kindColors[item.kind]}`}>
              {item.kind.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${item.tier === 'sourced' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              {item.tier}
            </span>
            {item.session_no && (
              <span className="text-xs text-gray-400">Session {item.session_no}</span>
            )}
            {item.weight !== null && (
              <span className="text-xs text-purple-600 font-mono">{item.weight}%</span>
            )}
          </div>
          <h3 className="font-medium">{item.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{item.detail}</p>

          {/* Anchors */}
          {item.anchors.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
              <span className="font-medium">Source:</span> &ldquo;{item.anchors[0].source_text}&rdquo;
              {item.anchors[0].section && <span className="ml-2">(§ {item.anchors[0].section})</span>}
              <span className="ml-2">p.{item.anchors[0].page}</span>
            </div>
          )}

          {/* Verification */}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className={`font-mono ${item.verification.score >= 0.7 ? 'text-green-600' : item.verification.score >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
              score: {item.verification.score.toFixed(2)}
            </span>
            {Object.entries(item.verification.checks).map(([k, v]) => {
              if (k === 'llm_judge') return (
                <span key={k} className={v.pass ? 'text-green-600' : 'text-red-600'}>
                  llm: {v.pass ? 'pass' : 'fail'}
                </span>
              );
              return (
                <span key={k} className={v ? 'text-green-600' : 'text-red-600'}>
                  {k.replace(/_/g, ' ')}: {v ? '✓' : '✗'}
                </span>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {showActions && !item.approved && (
          <ApproveActions
            courseId={courseId}
            itemIds={[item.id]}
            action="approve"
            label="Approve"
            variant="small"
          />
        )}
      </div>
    </div>
  );
}
