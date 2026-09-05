// Semester OS shared UI primitives — DESIGN.md motifs live here:
// the verification check line (ScoreBar), neutral kind chips, honest empty states.

import Link from 'next/link';
import type { ReactNode } from 'react';

/** Verification check line: 4px bar whose emerald fill is the score. The product's signature. */
export function ScoreBar({ score, className = '' }: { score: number; className?: string }) {
  const pct = Math.round(Math.min(Math.max(score, 0), 1) * 100);
  const fill =
    score >= 0.7 ? 'bg-emerald-600' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-1 w-16 rounded-full bg-stone-100 overflow-hidden"
        role="img"
        aria-label={`Verification score ${pct}%`}
      >
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`font-mono text-xs ${
          score >= 0.7 ? 'text-emerald-700' : score >= 0.5 ? 'text-amber-700' : 'text-red-700'
        }`}
      >
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

/** Item kind chip: neutral stone. Color is reserved for verification state (DESIGN.md). */
export function KindChip({ kind }: { kind: string }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
      {kind.replace('_', ' ')}
    </span>
  );
}

/** Tier chip: sourced vs synthesized — the honesty signal. */
export function TierChip({ tier }: { tier: 'sourced' | 'synthesized' }) {
  return (
    <span
      className={`text-xs font-mono px-2 py-0.5 rounded-md ${
        tier === 'sourced'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-stone-100 text-stone-600'
      }`}
    >
      {tier}
    </span>
  );
}

/** Empty state that invites the next action instead of apologizing. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-stone-300 rounded-xl py-14 px-6 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center"
      >
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3.2L13 5" />
        </svg>
      </div>
      <p className="font-medium text-stone-900">{title}</p>
      <p className="text-sm text-stone-600 mt-1 max-w-sm mx-auto">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-block mt-5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Card container. Flat (DESIGN.md: shadow is reserved for the sticky approval bar). */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-stone-200 rounded-xl bg-white ${className}`}>{children}</div>;
}

/** Section heading inside cards. */
export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-stone-900">{children}</h2>;
}
