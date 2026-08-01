import { daysBetween } from "@/lib/calendar/date-utils";
import type { FastLog } from "@/lib/calendar/fast-plans";

export interface TrialReminderStats {
  totalCompletedFasts: number;
  streakDays: number;
  totalFastingHours: number;
}

/** Consecutive-day streak ending at the most recent logged date (not necessarily today) —
 *  counts back from the latest log, day by day, until a gap is found. */
function computeStreakDays(logs: FastLog[]): number {
  if (logs.length === 0) return 0;
  const uniqueDates = Array.from(new Set(logs.map((l) => l.loggedDate))).sort().reverse();
  let streak = 1;
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    if (daysBetween(uniqueDates[i + 1], uniqueDates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

/** Pure — feeds the trial-reminder email's personalization. */
export function computeTrialReminderStats(logs: FastLog[]): TrialReminderStats {
  return {
    totalCompletedFasts: logs.length,
    streakDays: computeStreakDays(logs),
    totalFastingHours: Math.round(logs.reduce((sum, l) => sum + l.actualMinutes, 0) / 60),
  };
}
