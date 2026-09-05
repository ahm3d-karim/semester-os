import Link from 'next/link';
import { IS_DEMO, listCourses } from '@/lib/db';
import { EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await listCourses();

  return (
    <div className="space-y-10">
      {IS_DEMO && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Demo mode:</span> data lives in memory
          and resets when the server restarts. Add a Supabase URL and service
          key in your hosting settings for permanent storage.
        </div>
      )}

      {/* Hero: one statement, one action */}
      <div className="pt-8 pb-2 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          Your semester, verified.
        </h1>
        <p className="text-stone-600 mt-3 text-lg leading-relaxed">
          Upload a syllabus. Every deadline, grade weight, and policy is
          extracted, checked against the document, and shown to you with its
          evidence. Only what you approve enters your plan.
        </p>
      </div>

      {/* The three-step flow, as the product actually works */}
      <div className="border-t border-stone-200 pt-8">
        <ol className="grid sm:grid-cols-3 gap-6">
          <li>
            <div className="font-mono text-sm text-emerald-700 mb-2">01</div>
            <h2 className="font-semibold">Create a course</h2>
            <p className="text-sm text-stone-600 mt-1">
              Name and term. It starts empty on purpose.
            </p>
          </li>
          <li>
            <div className="font-mono text-sm text-emerald-700 mb-2">02</div>
            <h2 className="font-semibold">Upload the syllabus</h2>
            <p className="text-sm text-stone-600 mt-1">
              PDF or DOCX. Extraction shows its work: every item carries the
              quote it came from.
            </p>
          </li>
          <li>
            <div className="font-mono text-sm text-emerald-700 mb-2">03</div>
            <h2 className="font-semibold">You approve</h2>
            <p className="text-sm text-stone-600 mt-1">
              Check each item against its source quote. Approved items build
              your timeline and weekly digest.
            </p>
          </li>
        </ol>
      </div>

      {/* Actions: content-driven, not a template CTA row */}
      <div className="space-y-3">
        {courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            body="Your courses list starts empty. Create the first one, upload its syllabus, and the plan builds itself from what the document actually says."
            action={{ href: '/courses/new', label: 'Create your first course' }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/courses"
              className="border border-stone-200 rounded-xl p-5 hover:border-emerald-600 hover:bg-stone-50 transition-colors"
            >
              <div className="font-semibold">Your courses</div>
              <p className="text-sm text-stone-600 mt-1">
                {courses.length} course{courses.length !== 1 ? 's' : ''} this
                term.
              </p>
            </Link>
            <Link
              href="/today"
              className="border border-stone-200 rounded-xl p-5 hover:border-emerald-600 hover:bg-stone-50 transition-colors"
            >
              <div className="font-semibold">Today</div>
              <p className="text-sm text-stone-600 mt-1">
                Deadlines for the next 7 days across all courses.
              </p>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
