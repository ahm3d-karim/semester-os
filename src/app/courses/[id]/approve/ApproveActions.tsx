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
        await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, itemId, action }),
        });
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
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        action === 'approve'
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
      }`}
    >
      {loading ? '...' : action === 'approve' ? '✓ Approve' : '✗ Reject'}
    </button>
  );
}
