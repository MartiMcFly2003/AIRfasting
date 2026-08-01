import { yearMonthOf, type YearMonth } from "./date-utils";
import type { ISODate } from "./types";

export type FastType = "dry" | "water";

export interface FastPlan {
  id: string;
  plannedDate: ISODate;
  fastType: FastType;
  /** null = no duration target set. */
  plannedHours: number | null;
}

export interface FastLog {
  id: string;
  /** Null for an ad-hoc/free-tier fast that was never planned ahead of time. */
  planId: string | null;
  /** Calendar date this log applies to. For plan-linked logs this matches the plan's
   *  plannedDate; for ad-hoc logs it's the date the live fast was stopped on — needed since
   *  an ad-hoc log has no plan to derive a date from. */
  loggedDate: ISODate;
  fastType: FastType;
  /** Snapshot of the plan's target at log time; null for ad-hoc fasts (no target). */
  plannedHours: number | null;
  actualMinutes: number;
}

export function getPlansForMonth(plans: FastPlan[], month: YearMonth): FastPlan[] {
  return plans.filter((plan) => {
    const planMonth = yearMonthOf(plan.plannedDate);
    return planMonth.year === month.year && planMonth.month === month.month;
  });
}

export interface FastPlanSummary {
  waterCount: number;
  dryCount: number;
  avgWaterHours: number | null;
  avgDryHours: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, n) => sum + n, 0) / values.length) * 10) / 10;
}

export function summarizePlannedFasts(plans: FastPlan[]): FastPlanSummary {
  const water = plans.filter((p) => p.fastType === "water");
  const dry = plans.filter((p) => p.fastType === "dry");
  return {
    waterCount: water.length,
    dryCount: dry.length,
    avgWaterHours: average(water.map((p) => p.plannedHours).filter((h): h is number => h !== null)),
    avgDryHours: average(dry.map((p) => p.plannedHours).filter((h): h is number => h !== null)),
  };
}

export function getLogForPlan(logs: FastLog[], planId: string): FastLog | undefined {
  return logs.find((log) => log.planId === planId);
}

export interface MonthlyFastAnalysis {
  month: YearMonth;
  plannedCount: number;
  loggedCount: number;
  plannedHoursTotal: number;
  actualHoursTotal: number;
  /** null when plannedCount is 0. */
  completionRate: number | null;
}

/** One entry per month that has at least one plan, newest first. */
export function summarizeRealizedVsPlanned(plans: FastPlan[], logs: FastLog[]): MonthlyFastAnalysis[] {
  const months = new Map<string, YearMonth>();
  for (const plan of plans) {
    const month = yearMonthOf(plan.plannedDate);
    months.set(`${month.year}-${month.month}`, month);
  }

  const rows = Array.from(months.values()).map((month) => {
    const monthPlans = getPlansForMonth(plans, month);
    const monthLogs = monthPlans
      .map((plan) => getLogForPlan(logs, plan.id))
      .filter((log): log is FastLog => log !== undefined);

    return {
      month,
      plannedCount: monthPlans.length,
      loggedCount: monthLogs.length,
      plannedHoursTotal: monthPlans.reduce((sum, p) => sum + (p.plannedHours ?? 0), 0),
      actualHoursTotal: Math.round((monthLogs.reduce((sum, l) => sum + l.actualMinutes, 0) / 60) * 10) / 10,
      completionRate: monthPlans.length > 0 ? monthLogs.length / monthPlans.length : null,
    };
  });

  return rows.sort((a, b) => b.month.year * 12 + b.month.month - (a.month.year * 12 + a.month.month));
}
