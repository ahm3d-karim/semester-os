'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogCourse } from '@/lib/catalog';

const DAY_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function prettyDays(days: number[]): string {
  return days.map((d) => DAY_LABEL[d]).join(' ');
}

function prettyTime(start: string, end: string): string {
  const to12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')}${ap}`;
  };
  return `${to12(start)}-${to12(end)}`;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogCourse | null>(null);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allCourses, setAllCourses] = useState<CatalogCourse[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load catalog once on first focus (keeps the page server-light)
  async function loadCatalog() {
    if (loaded || allCourses) return;
    try {
      const res = await fetch('/api/catalog');
      if (!res.ok) {
        setCatalogUnavailable(true);
        return;
      }
      const data = await res.json();
      const courses: CatalogCourse[] = data.courses ?? [];
      if (courses.length === 0) {
        setCatalogUnavailable(true);
        return;
      }
      setAllCourses(courses);
    } catch {
      setCatalogUnavailable(true);
    } finally {
      setLoaded(true);
    }
  }

  const results = useMemo(() => {
    if (!allCourses) return [];
    const q = query.trim().toLowerCase();
    if (!q) return allCourses.slice(0, 12);
    return allCourses
      .filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.cross_listed.some((x) => x.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [allCourses, query]);

  const [manualCode, setManualCode] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualOffering, setManualOffering] = useState('Fall 2026');

  async function addCatalogCourse(course: CatalogCourse, sectionCode: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogCode: course.code, sectionCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to add course.');
        return;
      }
      router.push(`/courses/${data.course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  async function addManualCourse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!manualCode.trim() || !manualTitle.trim()) {
      setError('Course code and title are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: manualCode.trim(),
          title: manualTitle.trim(),
          offering: manualOffering.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create course.');
        return;
      }
      router.push(`/courses/${data.course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a course</h1>
        <p className="text-stone-600 mt-1 text-sm">
          Pick from the LUMS Fall 2026 catalog and its schedule fills in
          automatically: days, times, room, instructor, and your final exam slot.
        </p>
      </div>

      {!catalogUnavailable && !showManual && (
        <div className="space-y-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={loadCatalog}
            placeholder="Search by code or title, e.g. FINN or actuarial"
            className="w-full max-w-xl border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:border-emerald-600"
            autoComplete="off"
          />

          {allCourses === null && !catalogUnavailable && (
            <p className="text-sm text-stone-600">Start typing to load the catalog.</p>
          )}

          {allCourses && (
            <div className="max-w-xl space-y-2">
              {results.map((c) => (
                <div key={c.code} className="border border-stone-200 rounded-xl">
                  <button
                    onClick={() => setSelected(selected?.code === c.code ? null : c)}
                    className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors rounded-xl"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm text-emerald-700">{c.code}</span>
                      <span className="font-medium text-sm truncate">{c.title}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {c.sections.length} section{c.sections.length !== 1 ? 's' : ''}
                      {c.credit_hours !== null ? ` · ${c.credit_hours} credit hrs` : ''}
                      {c.cross_listed.length > 0 ? ` · also listed as ${c.cross_listed.join(', ')}` : ''}
                    </p>
                  </button>
                  {selected?.code === c.code && (
                    <div className="border-t border-stone-200 divide-y divide-stone-100">
                      {c.sections.map((s) => (
                        <button
                          key={s.code}
                          disabled={submitting}
                          onClick={() => addCatalogCourse(c, s.code)}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors text-sm disabled:opacity-50"
                        >
                          <span className="font-mono text-xs text-stone-900">{s.code}</span>
                          <span className="text-stone-600 ml-3">{prettyDays(s.days)} {prettyTime(s.start, s.end)}</span>
                          <span className="text-stone-600 ml-3">{s.building} {s.room}</span>
                          <span className="text-stone-600 ml-3 text-xs">{s.instructor}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-sm text-stone-600">
                  No match for &ldquo;{query}&rdquo;. If the course is new or missing, add it manually below.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(catalogUnavailable || showManual) && (
        <form onSubmit={addManualCourse} className="border border-stone-200 rounded-xl p-5 space-y-4 max-w-lg">
          <div>
            <h2 className="text-base font-semibold">Add manually</h2>
            <p className="text-sm text-stone-600 mt-1">
              {catalogUnavailable
                ? 'The course catalog is not loaded on this deployment, so schedules cannot fill in automatically. Your syllabus upload still works.'
                : 'For courses missing from the catalog.'}
            </p>
          </div>
          <div>
            <label htmlFor="mcode" className="block text-sm font-medium mb-1">Course code</label>
            <input id="mcode" type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. ECON 210" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600" />
          </div>
          <div>
            <label htmlFor="mtitle" className="block text-sm font-medium mb-1">Title</label>
            <input id="mtitle" type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
              placeholder="e.g. Intermediate Microeconomics" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600" />
          </div>
          <div>
            <label htmlFor="moff" className="block text-sm font-medium mb-1">Term</label>
            <input id="moff" type="text" value={manualOffering} onChange={(e) => setManualOffering(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600" />
          </div>
          <button type="submit" disabled={submitting}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {submitting ? 'Adding...' : 'Add course'}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
