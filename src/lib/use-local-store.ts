'use client';

// localStorage as a React external store (SSR-safe, no setState-in-effect).
// Re-renders on: same-tab writes (custom event) + cross-tab writes (storage event).

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'sos-local-storage';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export function writeLocal(key: string, value: string): void {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event(EVENT));
}

/** Raw value of a localStorage key, reactive. null during SSR / when unset. */
export function useLocalRaw(key: string): string | null {
  const getSnapshot = useCallback(() => localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
