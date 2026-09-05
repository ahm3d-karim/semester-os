import { listCourses, getModelItemsForBrief } from '@/lib/db';
import type { ModelItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const courses = await listCourses();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Get items due in the next 7 days
  const upcomingItems: { course: string; courseCode: string; item: ModelItem }[] = [];
  for (const c of courses) {
    const items = await getModelItemsForBrief(c.id, 7);
    for (const item of items) {
      upcomingItems.push({ course: c.title, courseCode: c.code, item });
    }
  }
  upcomingItems.sort((a, b) => (a.item.date ?? '').localeCompare(b.item.date ?? ''));

  // Get grade budgets (only for courses with approved grade components)
  const budgets: { course: string; courseCode: string; total: number; status: string }[] = [];
  for (const c of courses) {
    const items = await getModelItemsForBrief(c.id, 999);
    const components = items.filter((i: ModelItem) => i.kind === 'grade_component' && i.approved);
    if (components.length === 0) continue; // nothing verified yet — skip, don't show 0%
    const total = components.reduce((s: number, c: ModelItem) => s + (c.weight ?? 0), 0);
    budgets.push({ course: c.title, courseCode: c.code, total, status: total === 100 ? 'balanced' : total > 100 ? 'over' : 'under' });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-gray-500 mt-1">{dayOfWeek}, {dateStr}</p>
      </div>

      {/* Upcoming Deadlines */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Upcoming (7 days)</h2>
        {upcomingItems.length > 0 ? (
          <div className="space-y-3">
            {upcomingItems.map(({ course, courseCode, item }) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{courseCode}</span>
                  <span className="font-medium">{item.title}</span>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Session {item.session_no}</div>
                  <div className="text-xs">{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No deadlines this week</p>
        )}
      </div>

      {/* Grade Budgets */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Grade Budgets</h2>
        {budgets.length > 0 ? (
          <div className="space-y-3">
            {budgets.map(({ course, courseCode, total, status }) => (
              <div key={courseCode} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{courseCode}</span>
                  <span className="font-medium">{course}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${status === 'balanced' ? 'text-green-600' : status === 'over' ? 'text-red-600' : 'text-amber-600'}`}>
                    {total}%
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'balanced' ? 'bg-green-100 text-green-700' : status === 'over' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            No grade budgets yet. Approve extracted grade components on a course&apos;s review page and they appear here.
          </p>
        )}
      </div>
    </div>
  );
}
