import { listCourses, getModelItemsForBrief } from '@/lib/db';
import type { ModelItem } from '@/lib/types';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Today' };

export default async function TodayPage() {
  const courses = await listCourses();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const upcomingItems: { course: string; courseCode: string; item: ModelItem }[] = [];
  for (const c of courses) {
    const items = await getModelItemsForBrief(c.id, 7);
    for (const item of items) {
      upcomingItems.push({ course: c.title, courseCode: c.code, item });
    }
  }
  upcomingItems.sort((a, b) => (a.item.date ?? '').localeCompare(b.item.date ?? ''));

  const budgets: { course: string; courseCode: string; total: number; status: string }[] = [];
  for (const c of courses) {
    const items = await getModelItemsForBrief(c.id, 999);
    const components = items.filter((i: ModelItem) => i.kind === 'grade_component' && i.approved);
    if (components.length === 0) continue;
    const total = components.reduce((s: number, c: ModelItem) => s + (c.weight ?? 0), 0);
    budgets.push({ course: c.title, courseCode: c.code, total, status: total === 100 ? 'balanced' : total > 100 ? 'over' : 'under' });
  }

  const hasNothing = courses.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-stone-600 mt-1 text-sm">
          {dayOfWeek}, {dateStr}
        </p>
      </div>

      {hasNothing && (
        <EmptyState
          title="Nothing on the radar yet"
          body="Today fills up as courses get syllabi and you approve their items. Create a course to begin."
          action={{ href: '/courses/new', label: 'Create a course' }}
        />
      )}

      {!hasNothing && (
        <>
          {/* Upcoming: date-first ledger rows */}
          <div className="border border-stone-200 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-3">Next 7 days</h2>
            {upcomingItems.length > 0 ? (
              <ol className="space-y-2.5">
                {upcomingItems.map(({ course, courseCode, item }) => (
                  <li key={item.id} className="flex items-baseline gap-4 py-1.5 border-t border-stone-100 first:border-t-0">
                    <span className="font-mono text-sm text-stone-900 w-20 shrink-0">{item.date}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-stone-600 text-sm ml-2">{courseCode}</span>
                    </div>
                    {item.session_no !== null && (
                      <span className="font-mono text-xs text-stone-600 shrink-0">S{item.session_no}</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-stone-600">
                No deadlines in the next 7 days. Approve extracted items to fill this view.
              </p>
            )}
          </div>

          {/* Grade budgets */}
          <div className="border border-stone-200 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-3">Grade budgets</h2>
            {budgets.length > 0 ? (
              <ol className="space-y-2.5">
                {budgets.map(({ course, courseCode, total, status }) => (
                  <li key={courseCode} className="flex items-center justify-between gap-4 py-1.5 border-t border-stone-100 first:border-t-0">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-stone-600">{courseCode}</span>
                      <span className="font-medium ml-2 truncate">{course}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono text-lg font-semibold ${
                          status === 'balanced' ? 'text-emerald-700' : status === 'over' ? 'text-red-700' : 'text-amber-700'
                        }`}
                      >
                        {total}%
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md ${
                          status === 'balanced'
                            ? 'bg-emerald-50 text-emerald-800'
                            : status === 'over'
                              ? 'bg-red-50 text-red-800'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-stone-600">
                No grade budgets yet. Approve extracted grade components on a course&apos;s review page and they show up here.
              </p>
            )}
          </div>

          {upcomingItems.length === 0 && budgets.length === 0 && (
            <p className="text-sm text-stone-600">
              Once items are approved, this page is your single view of the week.{' '}
              <Link href="/courses" className="text-emerald-700 hover:underline">Go to courses</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
