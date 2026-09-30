import { daysBetween } from "@/lib/calendar/date-utils";
import type { FastLog } from "@/lib/calendar/fast-plans";
import type { ISODate } from "@/lib/calendar/types";

export interface FastStats {
  totalCompletedFasts: number;
  streakDays: number;
  totalFastingHours: number;
  /** The longest single fast, in hours. 0 when nothing has been logged. */
  longestFastHours: number;
  /** Fasts logged in the same calendar month as the reference date. */
  fastsThisMonth: number;
}

/**
 * Consecutive-day streak ending at the most recent logged date (not necessarily today) —
 * counts back from the latest log, day by day, until a gap is found.
 */
function computeStreakDays(logs: FastLog[]): number {
  if (logs.length === 0) return 0;
  const uniqueDates = Array.from(new Set(logs.map((l) => l.loggedDate)))
    .sort()
    .reverse();
  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    if (daysBetween(uniqueDates[i + 1], uniqueDates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * What somebody has actually done, from their logged fasts.
 *
 * Pure, and deliberately not owned by either of its callers: it began as personalisation for
 * the trial-ending email and is now also what the progress panel shows a subscriber about
 * themselves. The same numbers in both places is the point — an email claiming a four-day
 * streak the app doesn't show would be worse than sending nothing.
 *
 * `today` only scopes the month count; every other figure is all-time.
 */
export function computeFastStats(logs: FastLog[], today?: ISODate): FastStats {
  const month = today?.slice(0, 7);
  return {
    totalCompletedFasts: logs.length,
    streakDays: computeStreakDays(logs),
    totalFastingHours: Math.round(logs.reduce((sum, l) => sum + l.actualMinutes, 0) / 60),
    longestFastHours:
      logs.length === 0
        ? 0
        : Math.round(Math.max(...logs.map((l) => l.actualMinutes)) / 60),
    fastsThisMonth: month ? logs.filter((l) => l.loggedDate.startsWith(month)).length : 0,
  };
}
