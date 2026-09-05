import { getCourse, listModelItems, getGradeBudget } from '@/lib/db';
import type { ModelItem } from '@/lib/types';
import Link from 'next/link';
import { EmptyState, ScoreBar, KindChip, TierChip } from '@/components/ui';
import { findCourse, findFinalExam } from '@/lib/catalog';
import { UploadSyllabus } from './UploadSyllabus';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function to12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const deadlines = items
    .filter((i) => i.kind === 'deadline' && i.approved && i.date)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const grades = items.filter((i) => i.kind === 'grade_component' && i.approved);
  const policies = items.filter((i) => i.kind === 'policy' && i.approved);
  const pending = items.filter((i) => !i.approved && !i.verification.auto_rejected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-emerald-700">{course.code}</span>
            <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          </div>
          <p className="text-stone-600 text-sm mt-0.5">{course.offering}</p>
        </div>
        <Link
          href={`/courses/${course.id}/approve`}
          className="border border-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-stone-500 transition-colors"
        >
          Review items{pending.length > 0 ? ` (${pending.length})` : ''}
        </Link>
      </div>

      {/* Section schedule + final exam (registrar catalog, auto-filled) */}
      {course.section_code && (() => {
        const cat = findCourse(course.code);
        if (!cat) return null;
        const sec = cat.sections.find((s) => s.code === course.section_code);
        if (!sec) return null;
        const exam = findFinalExam(cat);
        return (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-xs text-emerald-800">{sec.code}</span>
            <span className="text-sm text-stone-800">
              {sec.days.map((d) => DAY_SHORT[d]).join(' ')} {to12(sec.start)}-{to12(sec.end)}
            </span>
            <span className="text-sm text-stone-600">{sec.building} {sec.room}</span>
            <span className="text-sm text-stone-600">{sec.instructor}</span>
            {exam && (
              <span className="text-sm text-stone-800">
                Final: <span className="font-mono text-xs">{exam.date}</span> {exam.time.slice(0, 2)}:{exam.time.slice(2, 4)}
                {exam.source === 'combined' ? ' (combined)' : ''}
              </span>
            )}
            <span className="text-xs text-emerald-800 ml-auto">from the LUMS schedule</span>
          </div>
        );
      })()}

      {/* Upload */}
      <UploadSyllabus courseId={course.id} />

      {items.length === 0 ? (
        <EmptyState
          title="No syllabus data yet"
          body="Upload the syllabus above. Extracted items appear once checked, and you approve what enters the plan."
        />
      ) : (
        <>
          {/* Grade budget */}
          <div className="border border-stone-200 rounded-xl p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
              <h2 className="text-base font-semibold">Grade budget</h2>
              <span
                className={`font-mono text-xl font-semibold ${
                  budget.status === 'balanced' ? 'text-emerald-700' : budget.status === 'over' ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {budget.total_weight}%
              </span>
              <span className="text-sm text-stone-600">
                {budget.status === 'balanced'
                  ? 'weights sum to 100'
                  : budget.status === 'over'
                    ? `over by ${budget.total_weight - 100}`
                    : `under by ${100 - budget.total_weight}`}
              </span>
            </div>
            {budget.components.length > 0 ? (
              <div className="space-y-1.5">
                {budget.components.map((comp) => (
                  <div key={comp.item_id} className="flex items-center justify-between text-sm py-1 border-t border-stone-100 first:border-t-0">
                    <span>{comp.title}</span>
                    <div className="flex items-center gap-4">
                      {comp.scored !== null && (
                        <span className="font-mono text-emerald-700 text-xs">{comp.scored} scored</span>
                      )}
                      <span className="font-mono text-stone-600">{comp.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-600">No grade components approved yet. Approve them on the review page.</p>
            )}
            {grades.length === 0 && budget.components.length === 0 && (
              <p className="text-xs text-stone-600 mt-2">Add your scores as coursework comes back to track the budget.</p>
            )}
          </div>

          {/* Timeline: verified items only */}
          {deadlines.length > 0 && (
            <div className="border border-stone-200 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-4">Timeline</h2>
              <ol className="space-y-4">
                {deadlines.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    <div className="text-right shrink-0 w-20">
                      <div className="font-mono text-sm text-stone-900">S{item.session_no}</div>
                      <div className="font-mono text-xs text-stone-600">{item.date}</div>
                    </div>
                    <div className="flex-1 border-l-2 border-emerald-600/30 pl-4 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.title}</span>
                        {item.weight !== null && <span className="font-mono text-xs text-stone-600">{item.weight}%</span>}
                      </div>
                      <p className="text-sm text-stone-600">{item.detail}</p>
                      <ScoreBar score={item.verification.score} className="mt-1.5" />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Policies */}
          {policies.length > 0 && (
            <div className="border border-stone-200 rounded-xl p-5">
              <h2 className="text-base font-semibold mb-3">Policies</h2>
              <div className="space-y-3">
                {policies.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="font-medium">{item.title}</div>
                    <p className="text-stone-600 mt-0.5">{item.detail}</p>
                    <ScoreBar score={item.verification.score} className="mt-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting for your decision */}
          {pending.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-amber-900">
                    {pending.length} item{pending.length !== 1 ? 's' : ''} waiting for your decision
                  </h2>
                  <p className="text-sm text-amber-800 mt-0.5">
                    They are not in your timeline yet.
                  </p>
                </div>
                <Link
                  href={`/courses/${course.id}/approve`}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                >
                  Review now
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
