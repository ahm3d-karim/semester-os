import { listCourses } from '@/lib/db';
import type { Course } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const courses: Course[] = await listCourses();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-gray-500 mt-1">{courses.length} active course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <a
          href="/courses/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Course
        </a>
      </div>

      <div className="grid gap-4">
        {courses.map((c) => (
          <a
            key={c.id}
            href={`/courses/${c.id}`}
            className="block border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                  <span className="font-semibold">{c.title}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{c.offering}</p>
              </div>
              <span className="text-xs text-gray-400">{c.status}</span>
            </div>
          </a>
        ))}
        {courses.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No courses yet</p>
            <p className="text-sm mt-2">Upload a syllabus to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
