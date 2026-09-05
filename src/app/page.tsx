import Link from 'next/link';
import { IS_DEMO } from '@/lib/db';
import { listCourses } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await listCourses();

  return (
    <div className="space-y-10">
      {IS_DEMO && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Demo mode:</span>{' '}
          data is stored in memory and resets when the server restarts. Add a
          Supabase URL + service key in the Vercel/Next env settings for
          persistent storage.
        </div>
      )}

      {/* Hero */}
      <div className="pt-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Your semester, verified.
        </h1>
        <p className="text-gray-500 mt-2 max-w-xl">
          Upload a course syllabus. Semester OS extracts every deadline, grade
          weight, and policy, checks each one against its source, and shows you
          the result for approval before anything enters your plan.
        </p>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Create a course',
              body: 'Name it and pick the term. Nothing is auto-filled from templates.',
            },
            {
              step: '2',
              title: 'Upload the syllabus',
              body: 'PDF or DOCX. Items are extracted with source anchors, then verified and scored.',
            },
            {
              step: '3',
              title: 'Review and approve',
              body: 'You check each extracted item against its cited source. Only approved items enter your timeline.',
            },
          ].map((c) => (
            <div key={c.step} className="border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-mono text-blue-600 mb-2">Step {c.step}</div>
              <div className="font-semibold">{c.title}</div>
              <p className="text-sm text-gray-500 mt-1">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Jump in
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/courses/new"
            className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="font-semibold">+ Create a course</div>
            <p className="text-sm text-gray-500 mt-1">
              {courses.length === 0
                ? 'No courses yet — start here.'
                : `${courses.length} course${courses.length !== 1 ? 's' : ''} so far.`}
            </p>
          </Link>
          <Link
            href="/today"
            className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="font-semibold">Today&apos;s view</div>
            <p className="text-sm text-gray-500 mt-1">
              Deadlines for the next 7 days and grade budgets across courses.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
