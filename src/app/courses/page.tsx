import { listCourses } from '@/lib/db';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Courses' };

export default async function CoursesPage() {
  const courses = await listCourses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-stone-600 mt-1 text-sm">
            {courses.length === 0
              ? 'Nothing here yet.'
              : `${courses.length} course${courses.length !== 1 ? 's' : ''} this term.`}
          </p>
        </div>
        <Link
          href="/courses/new"
          className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Create course
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="Your courses list is empty"
          body="Create a course for each class you're taking. Upload its syllabus and the deadlines, grade weights, and policies appear here, checked against the source."
          action={{ href: '/courses/new', label: 'Create your first course' }}
        />
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="block border border-stone-200 rounded-xl p-5 hover:border-emerald-600 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-emerald-700">{c.code}</span>
                    <span className="font-semibold truncate">{c.title}</span>
                  </div>
                  <p className="text-sm text-stone-600 mt-0.5">{c.offering}</p>
                </div>
                <span className="text-xs font-mono text-stone-600 shrink-0">{c.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
