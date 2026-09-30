import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import type { ISODate } from "@/lib/calendar/types";

export interface FastStats {
  totalCompletedFasts: number;
  totalFastingHours: number;
  /** Fasts logged in the same calendar month as the reference date. */
  fastsThisMonth: number;
  /** Planned fasts whose day has passed — the ones that could have been kept. */
  plansDue: number;
  /** Of those, the ones actually carried out. */
  plansKept: number;
  /** Consecutive most-recent due plans kept, counting back until one was missed. */
  planStreak: number;
  /** The longest single fast, in hours — shown as information, never as an achievement. */
  longestFastHours: number;
  /** Mean logged fast length in hours, to one decimal. */
  averageFastHours: number;
}

/**
 * Whether a planned fast was carried out.
 *
 * Reaching the planned hours counts, and so does exceeding them — the measure is "did you do
 * what you set out to do", not "how close to the number did you land". A plan with no stated
 * duration is kept by logging it at all, since there was nothing to fall short of.
 */
function planWasKept(plan: FastPlan, logs: FastLog[]): boolean {
  const log = logs.find((l) => l.planId === plan.id || l.loggedDate === plan.plannedDate);
  if (!log) return false;
  if (plan.plannedHours == null) return true;
  return log.actualMinutes >= Number(plan.plannedHours) * 60;
}

/**
 * What somebody has done, measured against what they intended.
 *
 * Longest and average are here because they are worth knowing — somebody deciding what to
 * plan next is better off knowing they average 17 hours than guessing. What matters is that
 * they are reported and never celebrated: the badge is for keeping to a plan, and nothing in
 * this app congratulates anyone for going longer.
 *
 * There is deliberately no consecutive-days streak. It rewards fasting every single day, which
 * argues against the rest and refeed days the protocols are built on — and an app that gates
 * onboarding for eating-disorder history should not hand out a prize for never stopping.
 *
 * Adherence is the honest measure and the kinder one. Keeping to a 14-hour plan counts exactly
 * as much as keeping to a 24-hour one, and a rest day costs nothing.
 *
 * Pure. `today` scopes the month figure and decides which plans have come due; everything else
 * is all-time.
 */
export function computeFastStats(
  logs: FastLog[],
  plans: FastPlan[] = [],
  today?: ISODate,
): FastStats {
  const month = today?.slice(0, 7);

  // Only plans whose day has arrived can have been kept or missed; tomorrow's is neither.
  const due = today ? plans.filter((p) => p.plannedDate <= today) : [];
  const kept = due.filter((plan) => planWasKept(plan, logs));

  const byMostRecent = [...due].sort((a, b) => b.plannedDate.localeCompare(a.plannedDate));
  let planStreak = 0;
  for (const plan of byMostRecent) {
    if (!planWasKept(plan, logs)) break;
    planStreak += 1;
  }

  return {
    totalCompletedFasts: logs.length,
    totalFastingHours: Math.round(logs.reduce((sum, l) => sum + l.actualMinutes, 0) / 60),
    fastsThisMonth: month ? logs.filter((l) => l.loggedDate.startsWith(month)).length : 0,
    plansDue: due.length,
    plansKept: kept.length,
    planStreak,
    longestFastHours:
      logs.length === 0 ? 0 : Math.round(Math.max(...logs.map((l) => l.actualMinutes)) / 60),
    averageFastHours:
      logs.length === 0
        ? 0
        : Math.round((logs.reduce((sum, l) => sum + l.actualMinutes, 0) / logs.length / 60) * 10) /
          10,
  };
}
