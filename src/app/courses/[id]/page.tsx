import { getCourse, listModelItems, getGradeBudget } from '@/lib/db';
import type { ModelItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) return <div className="py-16 text-center text-gray-400">Course not found</div>;

  const items: ModelItem[] = await listModelItems(id);
  const budget = await getGradeBudget(id);

  const deadlines = items.filter((i) => i.kind === 'deadline' && i.approved).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const grades = items.filter((i) => i.kind === 'grade_component' && i.approved);
  const policies = items.filter((i) => i.kind === 'policy' && i.approved);
  const milestones = items.filter((i) => i.kind === 'milestone' && i.approved);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{course.code}</span>
          <h1 className="text-2xl font-bold">{course.title}</h1>
        </div>
        <p className="text-gray-500">{course.offering}</p>
      </div>

      {/* Grade Budget */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Grade Budget</h2>
        <div className="flex items-center gap-4 mb-4">
          <span className={`text-2xl font-bold ${budget.status === 'balanced' ? 'text-green-600' : budget.status === 'over' ? 'text-red-600' : 'text-amber-600'}`}>
            {budget.total_weight}%
          </span>
          <span className="text-sm text-gray-500">of {budget.items_count} components graded</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${budget.status === 'balanced' ? 'bg-green-100 text-green-700' : budget.status === 'over' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            {budget.status}
          </span>
        </div>
        <div className="space-y-2">
          {budget.components.map((comp) => (
            <div key={comp.item_id} className="flex items-center justify-between text-sm">
              <span>{comp.title}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-gray-600">{comp.weight}%</span>
                {comp.scored !== null && (
                  <span className="font-mono text-blue-600">{comp.scored}/{comp.weight}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {deadlines.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Timeline</h2>
          <div className="space-y-3">
            {deadlines.map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-mono text-gray-500">S{item.session_no}</div>
                  <div className="text-xs text-gray-400">{item.date}</div>
                </div>
                <div className="flex-1 border-l-2 border-blue-200 pl-4 pb-2">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.detail}</div>
                  {item.weight && <div className="text-xs text-blue-600 mt-1">{item.weight}%</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policies */}
      {policies.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Policies</h2>
          <div className="space-y-3">
            {policies.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="font-medium">{item.title}</div>
                <div className="text-gray-600 mt-1">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Milestones</h2>
          <div className="space-y-2">
            {milestones.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">S{item.session_no}</span>
                <span>{item.title}</span>
                <span className="text-gray-400">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-300 rounded-xl">
          <p>No syllabus data yet</p>
          <p className="text-sm mt-2">Upload a syllabus to populate this course</p>
        </div>
      )}
    </div>
  );
}
