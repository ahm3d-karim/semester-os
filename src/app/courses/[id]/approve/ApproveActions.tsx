'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApproveActionsProps {
  courseId: string;
  itemIds: string[];
  action: 'approve' | 'reject';
  label: string;
  variant: 'primary' | 'small';
}

export function ApproveActions({ courseId, itemIds, action, label, variant }: ApproveActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction() {
    setLoading(true);
    try {
      for (const itemId of itemIds) {
        const res = await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, itemId, action }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error('Approve failed:', data.error ?? res.status);
        }
      }
      router.refresh();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setLoading(false);
    }
  }

  if (variant === 'primary') {
    return (
      <button
        onClick={handleAction}
        disabled={loading}
        className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
      >
        {loading ? 'Saving...' : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`text-xs px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        action === 'approve'
          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
      }`}
    >
      {loading ? '...' : label}
    </button>
  );
}
