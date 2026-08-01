"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { FastType } from "./fast-plans";

const STORAGE_KEY = "air:activeFast:v1";

/**
 * The in-progress live fast — persisted to localStorage so a refresh or closed tab doesn't
 * lose it. Deliberately the only piece of calendar state with real persistence this pass;
 * everything else (periodHistory, fastPlans, etc.) still resets on refresh.
 */
export interface ActiveFast {
  /** ISO 8601 timestamp, includes time (unlike ISODate used elsewhere). */
  startedAt: string;
  fastType: FastType;
  /** Set when this live fast is tracking against an existing plan; null for an ad-hoc fast. */
  planId: string | null;
}

// Module-level store (single localStorage key, so a simple singleton is enough — no need for
// a per-instance store). Read via useSyncExternalStore rather than useState+useEffect so the
// client/server snapshot mismatch is handled by React itself instead of a setState-in-effect,
// which both avoids a hydration mismatch and an extra render pass.
let cachedSnapshot: ActiveFast | null | undefined;
const listeners = new Set<() => void>();

function readFromStorage(): ActiveFast | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveFast) : null;
  } catch {
    return null;
  }
}

function getSnapshot(): ActiveFast | null {
  if (cachedSnapshot === undefined) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): ActiveFast | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeSnapshot(next: ActiveFast | null) {
  cachedSnapshot = next;
  if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  else window.localStorage.removeItem(STORAGE_KEY);
  for (const listener of listeners) listener();
}

export interface UseActiveFastResult {
  activeFast: ActiveFast | null;
  start: (fastType: FastType, planId: string | null) => void;
  /** Clears the active fast and returns what was active, so the caller can build a FastLog. */
  stop: () => ActiveFast | null;
  elapsedMs: number;
}

export function useActiveFast(): UseActiveFastResult {
  const activeFast = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeFast) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeFast]);

  const start = useCallback((fastType: FastType, planId: string | null) => {
    writeSnapshot({ startedAt: new Date().toISOString(), fastType, planId });
  }, []);

  const stop = useCallback(() => {
    const current = getSnapshot();
    writeSnapshot(null);
    return current;
  }, []);

  const elapsedMs = activeFast ? now - new Date(activeFast.startedAt).getTime() : 0;
  return { activeFast, start, stop, elapsedMs };
}
