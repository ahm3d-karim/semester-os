// Semester OS -- Session Engine
// Pure functions for querying sessions, resolving dates, and finding upcoming sessions

import type { Session } from '@/lib/types';

/**
 * Find the session that contains a given date (by date_start <= date <= date_end).
 */
export function findSessionForDate(sessions: Session[], dateStr: string): Session | undefined {
  return sessions.find(
    (s) => s.date_start <= dateStr && s.date_end >= dateStr
  );
}

/**
 * Resolve a session number to its start date.
 */
export function resolveSessionDate(
  sessions: Session[],
  sessionNo: number
): string | null {
  const s = sessions.find((x) => x.session_no === sessionNo);
  return s?.date_start ?? null;
}

/**
 * Get the next session after a given date.
 * Returns the first session whose date_start is strictly after fromDate.
 */
export function getNextSession(
  sessions: Session[],
  fromDate: string
): { session_no: number; date_start: string } | null {
  const future = sessions
    .filter((s) => s.date_start > fromDate)
    .sort((a, b) => a.session_no - b.session_no);
  const next = future[0];
  if (!next) return null;
  return { session_no: next.session_no, date_start: next.date_start };
}

/**
 * Get all sessions whose date_start falls within 7 days after fromDate (inclusive).
 */
export function getWeekSessions(
  sessions: Session[],
  fromDate: string
): Session[] {
  const startMs = new Date(fromDate).getTime();
  const endMs = startMs + 7 * 86_400_000;
  return sessions
    .filter((s) => {
      const d = new Date(s.date_start).getTime();
      return d >= startMs && d <= endMs;
    })
    .sort((a, b) => a.session_no - b.session_no);
}

/**
 * Get all sessions sorted by session number.
 */
export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => a.session_no - b.session_no);
}
