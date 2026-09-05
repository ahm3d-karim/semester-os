import { getCourse, listModelItems, getGradeBudget } from '@/lib/db';
import type { ModelItem } from '@/lib/types';
import Link from 'next/link';
import { EmptyState, ScoreBar, KindChip, TierChip } from '@/components/ui';
import { ApproveActions } from './ApproveActions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Review items' };

export default async function ApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) {
    return (
      <EmptyState
        title="Course not found"
        body="This course may have been removed, or the link is wrong."
        action={{ href: '/courses', label: 'Back to courses' }}
      />
    );
  }

  const items: ModelItem[] = await listModelItems(id);
  const budget = await getGradeBudget(id);

  const approved = items.filter((i) => i.approved);
  const autoRejected = items.filter((i) => i.verification.auto_rejected);
  const needsReview = items.filter((i) => !i.verification.auto_rejected && !i.approved && i.verification.score < 0.7);
  const autoApproved = items.filter((i) => i.verification.score >= 0.7 && !i.approved);

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <BackHeader courseId={id} />
        <EmptyState
          title="Nothing to review yet"
          body="Upload the syllabus on the course page. Extracted items land here with their evidence, and nothing enters your plan until you approve it."
          action={{ href: `/courses/${id}`, label: 'Go to course page' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <BackHeader courseId={id} />

      {/* Ledger summary strip: numbers in mono, dividers not cards */}
      <div className="border border-stone-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-stone-200 sm:grid sm:grid-cols-4">
        <LedgerCell label="Extracted" value={items.length} />
        <LedgerCell label="Approved" value={approved.length} tone="emerald" />
        <LedgerCell label="Needs your decision" value={needsReview.length} tone={needsReview.length > 0 ? 'amber' : undefined} />
        <LedgerCell label="Auto-rejected" value={autoRejected.length} tone={autoRejected.length > 0 ? 'red' : undefined} />
      </div>

      {/* Grade budget strip */}
      <div
        className={`border rounded-xl px-4 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 ${
          budget.status === 'balanced' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <span className="font-medium text-sm">Grade budget</span>
        <span className={`font-mono text-lg font-semibold ${budget.status === 'balanced' ? 'text-emerald-800' : 'text-amber-800'}`}>
          {budget.total_weight}%
        </span>
        <span className="text-sm text-stone-600">
          {budget.status === 'balanced'
            ? 'across all components. Weights sum to 100.'
            : budget.status === 'over'
              ? `allocated, over by ${budget.total_weight - 100}. Check for duplicates or extracted extras.`
              : `allocated, under by ${100 - budget.total_weight}. Some graded work may not be extracted yet.`}
        </span>
      </div>

      {/* Needs your decision: the action surface comes first */}
      {needsReview.length > 0 && (
        <Section title="Needs your decision" count={needsReview.length}>
          {needsReview.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} showActions />
          ))}
        </Section>
      )}

      {/* Auto-approved */}
      {autoApproved.length > 0 && (
        <Section title="Passed automatic checks" count={autoApproved.length}>
          {autoApproved.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} />
          ))}
        </Section>
      )}

      {/* Auto-rejected */}
      {autoRejected.length > 0 && (
        <Section title="Auto-rejected, kept for the record" count={autoRejected.length} dimmed>
          {autoRejected.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} dimmed />
          ))}
        </Section>
      )}

      {/* Already approved */}
      {approved.length > 0 && (
        <Section title="In your plan" count={approved.length}>
          {approved.map((item) => (
            <ItemRow key={item.id} item={item} courseId={id} />
          ))}
        </Section>
      )}

      {/* Sticky bulk bar: the page's one elevation (DESIGN.md) */}
      {autoApproved.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-200 shadow-sm">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-stone-600">
              {autoApproved.length} item{autoApproved.length !== 1 ? 's' : ''} passed all automatic checks (score 70 or higher).
            </p>
            <ApproveActions
              courseId={id}
              itemIds={autoApproved.map((i) => i.id)}
              action="approve"
              label={`Approve all ${autoApproved.length}`}
              variant="primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BackHeader({ courseId }: { courseId: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review extracted items</h1>
        <p className="text-stone-600 mt-1 text-sm">
          <Link href={`/courses/${courseId}`} className="text-emerald-700 hover:underline">
            Back to course
          </Link>
        </p>
      </div>
    </div>
  );
}

function LedgerCell({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-700' : 'text-stone-900';
  return (
    <div className="px-4 py-3">
      <div className={`font-mono text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-stone-600 mt-0.5">{label}</div>
    </div>
  );
}

function Section({
  title, count, children, dimmed = false,
}: {
  title: string; count: number; children: React.ReactNode; dimmed?: boolean;
}) {
  return (
    <div className={`border border-stone-200 rounded-xl overflow-hidden ${dimmed ? 'opacity-60' : ''}`}>
      <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="font-mono text-xs text-stone-600">{count}</span>
      </div>
      <div className="divide-y divide-stone-200">{children}</div>
    </div>
  );
}

function ItemRow({
  item, courseId, showActions = false, dimmed = false,
}: {
  item: ModelItem; courseId: string; showActions?: boolean; dimmed?: boolean;
}) {
  const anchor = item.anchors[0];
  const v = item.verification;

  return (
    <div className={`p-4 ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <KindChip kind={item.kind} />
            <TierChip tier={item.tier} />
            {item.session_no !== null && (
              <span className="font-mono text-xs text-stone-600">Session {item.session_no}</span>
            )}
            {item.date && <span className="font-mono text-xs text-stone-600">{item.date}</span>}
            {item.weight !== null && <span className="font-mono text-xs text-stone-900 font-semibold">{item.weight}%</span>}
          </div>

          <h3 className="font-medium text-stone-900">{item.title}</h3>
          <p className="text-sm text-stone-600 mt-0.5">{item.detail}</p>

          {/* The evidence: the quote this item came from */}
          {anchor && (
            <blockquote className="mt-2.5 border-l-2 border-emerald-600 pl-3 py-1 bg-stone-50 rounded-r-lg">
              <p className="text-xs text-stone-600 italic">
                &ldquo;{anchor.source_text}&rdquo;
              </p>
              <p className="text-[11px] font-mono text-stone-600 mt-0.5">
                {anchor.section ? `${anchor.section}, ` : ''}page {anchor.page}
              </p>
            </blockquote>
          )}

          {/* Verification: check line + check facts */}
          <div className="mt-2.5 flex items-center gap-3 flex-wrap">
            <ScoreBar score={v.score} />
            <span className="font-mono text-[11px] text-stone-600">
              anchor {v.checks.anchor_exists ? 'pass' : 'fail'}
              {' · '}number {v.checks.number_match ? 'pass' : 'fail'}
              {' · '}judge {v.checks.llm_judge.pass ? 'pass' : 'fail'}
            </span>
          </div>
          {item.approved && v.checks.llm_judge.reason && (
            <p className="text-[11px] text-stone-600 mt-1">Judge: {v.checks.llm_judge.reason}</p>
          )}
        </div>

        {showActions && !item.approved && (
          <div className="shrink-0 flex flex-col gap-1.5">
            <ApproveActions courseId={courseId} itemIds={[item.id]} action="approve" label="Approve" variant="small" />
            <ApproveActions courseId={courseId} itemIds={[item.id]} action="reject" label="Reject" variant="small" />
          </div>
        )}
      </div>
    </div>
  );
}
