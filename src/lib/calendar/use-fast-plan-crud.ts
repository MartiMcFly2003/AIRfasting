"use client";

import type { FastLog, FastPlan, FastType } from "./fast-plans";
import { deleteFastLog, insertFastLog, updateFastLog } from "./persistence/fast-logs";
import { deleteFastPlan, insertFastPlans, updateFastPlan } from "./persistence/fast-plans";
import type { ISODate } from "./types";

export interface UseFastPlanCrudArgs {
  userId: string | null;
  fastPlans: FastPlan[];
  fastLogs: FastLog[];
  onFastPlansChange: (plans: FastPlan[]) => void;
  onFastLogsChange: (logs: FastLog[]) => void;
  onError: (message: string) => void;
}

export interface UseFastPlanCrudResult {
  confirmPlan: (args: {
    dates: ISODate[];
    existingPlan?: FastPlan;
    fastType: FastType;
    plannedHours: number | null;
  }) => void;
  removePlan: (planId: string) => void;
  confirmLog: (args: { plan: FastPlan; existingLog?: FastLog; actualMinutes: number }) => void;
  removeLog: (logId: string) => void;
}

/** Shared plan/log CRUD for CalendarView, MoonSyncCalendarView, and WeeklyRhythmCalendarView —
 *  previously an identical four-handler block duplicated verbatim across all three. Each
 *  function updates local state optimistically (unchanged from the original per-view logic)
 *  and, when userId is set, fires the matching persistence call in the background. */
export function useFastPlanCrud({
  userId,
  fastPlans,
  fastLogs,
  onFastPlansChange,
  onFastLogsChange,
  onError,
}: UseFastPlanCrudArgs): UseFastPlanCrudResult {
  function reportError(e: unknown) {
    onError(e instanceof Error ? e.message : "Something went wrong saving your change.");
  }

  function confirmPlan({
    dates,
    existingPlan,
    fastType,
    plannedHours,
  }: {
    dates: ISODate[];
    existingPlan?: FastPlan;
    fastType: FastType;
    plannedHours: number | null;
  }) {
    if (existingPlan) {
      const planId = existingPlan.id;
      const updated: FastPlan = { ...existingPlan, fastType, plannedHours };
      onFastPlansChange(fastPlans.map((p) => (p.id === planId ? updated : p)));
      if (userId) void updateFastPlan(userId, updated).catch(reportError);
    } else {
      const newPlans: FastPlan[] = dates.map((date) => ({
        id: crypto.randomUUID(),
        plannedDate: date,
        fastType,
        plannedHours,
      }));
      onFastPlansChange([...fastPlans, ...newPlans]);
      if (userId) void insertFastPlans(userId, newPlans).catch(reportError);
    }
  }

  function removePlan(planId: string) {
    onFastPlansChange(fastPlans.filter((p) => p.id !== planId));
    onFastLogsChange(fastLogs.filter((l) => l.planId !== planId));
    if (userId) void deleteFastPlan(userId, planId).catch(reportError);
  }

  function confirmLog({
    plan,
    existingLog,
    actualMinutes,
  }: {
    plan: FastPlan;
    existingLog?: FastLog;
    actualMinutes: number;
  }) {
    if (existingLog) {
      const logId = existingLog.id;
      const updated: FastLog = { ...existingLog, actualMinutes };
      onFastLogsChange(fastLogs.map((l) => (l.id === logId ? updated : l)));
      if (userId) void updateFastLog(userId, updated).catch(reportError);
    } else {
      const newLog: FastLog = {
        id: crypto.randomUUID(),
        planId: plan.id,
        loggedDate: plan.plannedDate,
        fastType: plan.fastType,
        plannedHours: plan.plannedHours,
        actualMinutes,
      };
      onFastLogsChange([...fastLogs, newLog]);
      if (userId) void insertFastLog(userId, newLog).catch(reportError);
    }
  }

  function removeLog(logId: string) {
    onFastLogsChange(fastLogs.filter((l) => l.id !== logId));
    if (userId) void deleteFastLog(userId, logId).catch(reportError);
  }

  return { confirmPlan, removePlan, confirmLog, removeLog };
}
