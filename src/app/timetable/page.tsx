import Link from 'next/link';
import { listCourses } from '@/lib/db';
import { expandMeetings, findCourse, findFinalExam, EMPTY_CATALOG } from '@/lib/catalog';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Timetable' };

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function to12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default async function TimetablePage() {
  const courses = await listCourses();

  // sectioned courses -> catalog data
  const selections = courses
    .filter((c) => c.section_code)
    .map((c) => ({ code: c.code, sectionCode: c.section_code as string }));

  const { blocks, clashes } = selections.length > 0 ? expandMeetings(selections) : { blocks: [], clashes: [] };

  // course exam slots
  const exams = courses
    .filter((c) => c.section_code)
    .map((c) => {
      const catCourse = findCourse(c.code);
      if (!catCourse) return null;
      const exam = findFinalExam(catCourse);
      return exam ? { code: c.code, title: c.title, ...exam } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const hasCatalog = selections.some((s) => findCourse(s.code));
  const sectioned = courses.filter((c) => c.section_code);
  const manual = courses.filter((c) => !c.section_code);

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Timetable</h1>
        <EmptyState
          title="Your week is empty"
          body="Add courses with sections from the LUMS catalog and the timetable draws itself, with rooms and clash warnings. Nothing to configure."
          action={{ href: '/courses/new', label: 'Add your first course' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timetable</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Built from your chosen sections. {clashes.length > 0 ? `${clashes.length} clash${clashes.length !== 1 ? 'es' : ''} flagged.` : 'No clashes.'}
        </p>
      </div>

      {/* Clash warnings */}
      {clashes.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
          <p className="font-medium text-sm text-amber-900">
            {clashes.length} section clash{clashes.length !== 1 ? 'es' : ''}: overlapping times
          </p>
          {clashes.slice(0, 5).map(({ a, b }, i) => (
            <p key={i} className="text-sm text-amber-800">
              {a.courseCode} ({DAY_SHORT[a.day]} {to12(a.start)}) overlaps {b.courseCode} ({DAY_SHORT[b.day]} {to12(b.start)})
            </p>
          ))}
        </div>
      )}

      {/* Week grid: day columns, meetings as stacked blocks */}
      {blocks.length > 0 ? (
        <div className="border border-stone-200 rounded-xl overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px]">
            {DAY_NAMES.map((d, di) => {
              const dayBlocks = blocks
                .filter((b) => b.day === di)
                .sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
              return (
                <div key={d} className={`min-h-[160px] ${di > 0 ? 'border-l border-stone-200' : ''}`}>
                  <div className="px-2 py-2 bg-stone-50 border-b border-stone-200 text-center">
                    <span className="text-xs font-semibold text-stone-700">{d.slice(0, 3)}</span>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    {dayBlocks.map((b, i) => {
                      const clash = clashes.some(
                        (c) => (c.a === b && c.b.day === b.day) || (c.b === b && c.a.day === b.day)
                      );
                      return (
                        <div
                          key={i}
                          className={`rounded-md px-2 py-1.5 text-xs ${
                            clash ? 'bg-amber-100 border border-amber-300' : 'bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          <div className="font-mono text-[10px] text-stone-600">
                            {to12(b.start)}
                          </div>
                          <div className="font-semibold text-stone-900 leading-tight">{b.courseCode}</div>
                          <div className="text-[10px] text-stone-600">{b.room}</div>
                        </div>
                      );
                    })}
                    {dayBlocks.length === 0 && (
                      <div className="h-16"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-stone-200 rounded-xl p-5">
          <p className="text-sm text-stone-600">
            {sectioned.length === 0 && manual.length > 0
              ? 'Your courses were added manually, so no weekly schedule is known. They still show on their course pages.'
              : 'No sections chosen yet.'}
          </p>
        </div>
      )}

      {/* Final exams, registrar-sourced */}
      {exams.length > 0 && (
        <div className="border border-stone-200 rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1">Final exams</h2>
          <p className="text-xs text-stone-600 mb-3">
            From the registrar&apos;s official Fall 2026 exam matrix. Pinned
            combined-exam slots are marked; the rest follow your section&apos;s
            meeting pattern.
          </p>
          <ol className="space-y-2">
            {exams.map((e) => (
              <li key={e.code} className="flex items-baseline gap-4 py-1.5 border-t border-stone-100 first:border-t-0">
                <span className="font-mono text-sm text-stone-900 w-24 shrink-0">{e.date}</span>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-emerald-700">{e.code}</span>
                  <span className="text-sm text-stone-600 ml-2 truncate">{e.title}</span>
                </div>
                <span className="font-mono text-xs text-stone-600 shrink-0">
                  {e.time.slice(0, 2)}:{e.time.slice(2, 4)}-{e.time.slice(5, 7)}:{e.time.slice(7, 9)}
                  {e.source === 'combined' ? ' (combined)' : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Courses without sections */}
      {manual.length > 0 && (
        <div className="border border-stone-200 rounded-xl p-5">
          <h2 className="text-base font-semibold mb-2">Added manually (no section)</h2>
          <ul className="space-y-1.5">
            {manual.map((c) => (
              <li key={c.id} className="text-sm">
                <Link href={`/courses/${c.id}`} className="text-emerald-700 hover:underline">
                  <span className="font-mono text-xs">{c.code}</span> {c.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-600 mt-2">
            If one of these is in the LUMS catalog, remove it and re-add it from the picker to get its schedule.
          </p>
        </div>
      )}
    </div>
  );
}
