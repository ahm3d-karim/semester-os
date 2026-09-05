'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCoursePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [offering, setOffering] = useState('Fall 2026');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !title.trim()) {
      setError('Course code and title are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), title: title.trim(), offering: offering.trim() }),
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
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a course</h1>
        <p className="text-stone-600 mt-1 text-sm">
          It starts empty. The course fills up when you upload its syllabus.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-stone-200 rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-1">
            Course code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. ECON 210"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
          />
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Intermediate Microeconomics"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
          />
        </div>
        <div>
          <label htmlFor="offering" className="block text-sm font-medium mb-1">
            Term
          </label>
          <input
            id="offering"
            type="text"
            value={offering}
            onChange={(e) => setOffering(e.target.value)}
            placeholder="Fall 2026"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-600"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {submitting ? 'Creating...' : 'Create course'}
        </button>
      </form>
    </div>
  );
}
