"use client";

import { useMemo, useState } from "react";
import {
  daysInMonth,
  eachDate,
  getWeeklyRhythmDayLabel,
  getWeeklyRhythmSchedule,
  isoWeekday,
  moveDeepFastingDay,
  FIXED_WEEKLY_RHYTHM_PATTERNS,
  toISODate,
  type ISODate,
  type IsoWeekday,
  type MoonHighlightType,
  type Tier,
  type WeeklyRhythm,
  type WeeklyRhythmSelection,
  type YearMonth,
} from "@/lib/calendar";
import type { FastLog, FastPlan, FastType } from "@/lib/calendar/fast-plans";
import {
  computeFastOccupiedDays,
  computeRefeedDays,
  type FastOccupiedInfo,
  type RefeedDayInfo,
} from "@/lib/calendar/refeed";
import { useFastPlanCrud } from "@/lib/calendar/use-fast-plan-crud";
import { FastContinuationDialog, LogActualHoursDialog, PlanFastDialog, RefeedInfoDialog } from "./FastPlanDialogs";
import { WeeklyRhythmCalendar, WeeklyRhythmLegend } from "./WeeklyRhythmCalendar";
import { WeeklyRhythmInstructions } from "./WeeklyRhythmInstructions";
import { WeeklyRhythmPicker } from "./WeeklyRhythmPicker";
import { MoonHighlightDialog } from "./MoonHighlightDialog";
import { PremiumUpsellDialog } from "./PremiumUpsellDialog";

export interface WeeklyRhythmCalendarViewProps {
  viewedMonth: YearMonth;
  todayISO?: ISODate;
  moonHighlights: Partial<Record<ISODate, MoonHighlightType>>;
  /** Owned by CalendarTrackManager so it survives a track switch. */
  selection: WeeklyRhythmSelection;
  onSelectionChange: (next: WeeklyRhythmSelection) => void;
  tier: Tier;
  fastPlans: FastPlan[];
  fastLogs: FastLog[];
  onFastPlansChange: (plans: FastPlan[]) => void;
  onFastLogsChange: (logs: FastLog[]) => void;
  activeFastPlanId: string | null;
  userId: string | null;
  onSyncError: (message: string) => void;
  /** Admin-editable guidance copy — see CalendarTrackManagerProps for the full key list. Only
   *  the duration-education tip applies here — the per-phase food tip Protocols 1/2 show is
   *  skipped, since this track has no hormonal phase for that copy to describe. */
  content: Record<string, string>;
}

type DialogState =
  | { step: "none" }
  | {
      step: "planFast";
      dates: ISODate[];
      blockLabel: string;
      existingPlan?: FastPlan;
      initialFastType?: FastType;
      minStartTime?: string;
      /** True when confirming this plan should also reassign the weekly pattern's deep-fast
       *  weekday to the clicked date, rather than just planning a fast on an already-decided day. */
      isDefiningDeepFast?: boolean;
    }
  | { step: "logActual"; plan: FastPlan; existingLog?: FastLog }
  | { step: "refeedInfo"; date: ISODate; info: RefeedDayInfo }
  | { step: "occupiedInfo"; date: ISODate; info: FastOccupiedInfo }
  | { step: "upsell"; message: string };

/** Nearest weekday in `candidates` to `target` (circular, wrapping Sun -> Mon). Only matters
 *  for 4-2-1's two deep-fasting weekdays — picks which of the two gets reassigned when the
 *  person defines a new deep-fast day elsewhere in the week. */
function closestWeekday(candidates: IsoWeekday[], target: IsoWeekday): IsoWeekday {
  return candidates.reduce((best, day) => {
    const distBest = Math.min(Math.abs(best - target), 7 - Math.abs(best - target));
    const distDay = Math.min(Math.abs(day - target), 7 - Math.abs(day - target));
    return distDay < distBest ? day : best;
  });
}

/**
 * Protocol 3 (weekly_rhythm / no_cycle tracks — menopause, men, no logged cycle). No cycle
 * here at all, so — unlike Protocols 1/2 — days carry no colour or phase icon until the
 * person actually plans something: tapping any day in an undecided week opens the plan
 * dialog and, on confirm, both saves that fast and reassigns the weekly pattern so that
 * weekday becomes the deep-fast day (the following day auto-fills as nourish, the rest as
 * support days). Free tier sees the same fixed pattern as before but can't plan against it.
 */
export function WeeklyRhythmCalendarView({
  viewedMonth,
  todayISO,
  moonHighlights,
  selection,
  onSelectionChange,
  tier,
  fastPlans,
  fastLogs,
  onFastPlansChange,
  onFastLogsChange,
  activeFastPlanId,
  userId,
  onSyncError,
  content,
}: WeeklyRhythmCalendarViewProps) {
  const [moonInfo, setMoonInfo] = useState<{ date: ISODate; type: MoonHighlightType } | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ step: "none" });
  const { confirmPlan, removePlan, confirmLog, removeLog } = useFastPlanCrud({
    userId,
    fastPlans,
    fastLogs,
    onFastPlansChange,
    onFastLogsChange,
    onError: onSyncError,
  });

  const schedule = getWeeklyRhythmSchedule(selection);
  const days = eachDate(toISODate(viewedMonth, 1), toISODate(viewedMonth, daysInMonth(viewedMonth)));

  const refeedDays = useMemo(() => computeRefeedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);
  const occupiedDays = useMemo(() => computeFastOccupiedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);

  function blockLabelFor(date: ISODate): string {
    const label = getWeeklyRhythmDayLabel(date, schedule);
    if (label === "deep_fasting") return "deep-fast";
    if (label === "rest") return "nourish";
    if (label === "fasting") return "support";
    return "";
  }

  function handleRhythmChange(rhythm: WeeklyRhythm) {
    onSelectionChange({ rhythm, ...FIXED_WEEKLY_RHYTHM_PATTERNS[rhythm] });
  }

  function handleDefineDeepFastDay(date: ISODate) {
    setDialog({ step: "planFast", dates: [date], blockLabel: "deep-fast", isDefiningDeepFast: true });
  }

  function handlePlanSupportFast(date: ISODate) {
    setDialog({ step: "planFast", dates: [date], blockLabel: "support" });
  }

  function handleEditPlan(plan: FastPlan) {
    setDialog({ step: "planFast", dates: [plan.plannedDate], blockLabel: blockLabelFor(plan.plannedDate), existingPlan: plan });
  }

  function handleLogActualHours(plan: FastPlan) {
    setDialog({ step: "logActual", plan, existingLog: fastLogs.find((l) => l.planId === plan.id) });
  }

  function handleLockedHistoricalClick(plan: FastPlan) {
    setDialog({
      step: "upsell",
      message: `This ${plan.fastType} fast is from your premium trial — resubscribe to keep tracking ahead.`,
    });
  }

  function handleRefeedDayClick(date: ISODate) {
    const info = refeedDays[date];
    if (info) setDialog({ step: "refeedInfo", date, info });
  }

  function handlePlanWaterFastException(date: ISODate) {
    const info = refeedDays[date];
    setDialog({
      step: "planFast",
      dates: [date],
      blockLabel: blockLabelFor(date),
      initialFastType: "water",
      minStartTime: info && info.sourceFastEndDate === date ? info.sourceFastEndTime : undefined,
    });
  }

  function handleOccupiedDayClick(date: ISODate) {
    const info = occupiedDays[date];
    if (info) setDialog({ step: "occupiedInfo", date, info });
  }

  function handleAdjustOriginalFast(planId: string) {
    const plan = fastPlans.find((p) => p.id === planId);
    if (plan) handleEditPlan(plan);
  }

  function handleConfirmPlan(fastType: FastType, plannedHours: number, startTime: string) {
    if (dialog.step !== "planFast") return;
    confirmPlan({ dates: dialog.dates, existingPlan: dialog.existingPlan, fastType, plannedHours, startTime });
    if (dialog.isDefiningDeepFast) {
      const toDay = isoWeekday(dialog.dates[0]);
      const fromDay = closestWeekday(selection.deepFastingDays, toDay);
      onSelectionChange(moveDeepFastingDay(selection, fromDay, toDay));
    }
    setDialog({ step: "none" });
  }

  function handleRemovePlan() {
    if (dialog.step !== "planFast" || !dialog.existingPlan) return;
    removePlan(dialog.existingPlan.id);
    setDialog({ step: "none" });
  }

  function handleConfirmLog(actualMinutes: number) {
    if (dialog.step !== "logActual") return;
    confirmLog({ plan: dialog.plan, existingLog: dialog.existingLog, actualMinutes });
    setDialog({ step: "none" });
  }

  function handleRemoveLog() {
    if (dialog.step !== "logActual" || !dialog.existingLog) return;
    removeLog(dialog.existingLog.id);
    setDialog({ step: "none" });
  }

  return (
    <>
      <WeeklyRhythmPicker rhythm={selection.rhythm} onChange={handleRhythmChange} />

      <WeeklyRhythmInstructions rhythm={selection.rhythm} />

      {selection.rhythm === "4-2-1" && (
        <div className="w-full max-w-xl rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center font-body text-sm text-ivory">
          4-2-1 is a more intensive rhythm (two deep-fasting days) — recommended only for experienced fasters.
        </div>
      )}

      <WeeklyRhythmCalendar
        year={viewedMonth.year}
        month={viewedMonth.month}
        days={days}
        schedule={schedule}
        todayISO={todayISO}
        moonHighlights={moonHighlights}
        onMoonHighlightClick={(date, type) => setMoonInfo({ date, type })}
        fastPlans={fastPlans}
        fastLogs={fastLogs}
        onDefineDeepFastDay={tier === "premium" ? handleDefineDeepFastDay : undefined}
        onPlanSupportFast={tier === "premium" ? handlePlanSupportFast : undefined}
        onEditPlan={tier === "premium" ? handleEditPlan : handleLockedHistoricalClick}
        onLogActualHours={tier === "premium" ? handleLogActualHours : handleLockedHistoricalClick}
        onLockedInteraction={
          tier === "free"
            ? () => setDialog({ step: "upsell", message: "Customizing your fasting rhythm is a Premium feature." })
            : undefined
        }
        refeedDays={refeedDays}
        onRefeedDayClick={handleRefeedDayClick}
        occupiedDays={occupiedDays}
        onOccupiedDayClick={handleOccupiedDayClick}
        activeFastPlanId={activeFastPlanId}
        tier={tier}
      />

      <WeeklyRhythmLegend />

      {dialog.step === "planFast" && (
        <PlanFastDialog
          dates={dialog.dates}
          blockLabel={dialog.blockLabel}
          existingPlan={dialog.existingPlan}
          initialFastType={dialog.initialFastType}
          minStartTime={dialog.minStartTime}
          durationTip={content["education_duration"]}
          onConfirm={handleConfirmPlan}
          onRemove={dialog.existingPlan ? handleRemovePlan : undefined}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "refeedInfo" && (
        <RefeedInfoDialog
          date={dialog.date}
          info={dialog.info}
          onPlanWaterFastException={
            dialog.info.sourceFastType === "dry" && tier === "premium"
              ? () => handlePlanWaterFastException(dialog.date)
              : undefined
          }
          onClose={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "occupiedInfo" && (
        <FastContinuationDialog
          date={dialog.date}
          info={dialog.info}
          onAdjustOriginalFast={
            tier === "premium" && dialog.info.planId
              ? () => handleAdjustOriginalFast(dialog.info.planId!)
              : undefined
          }
          onClose={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "logActual" && (
        <LogActualHoursDialog
          plan={dialog.plan}
          existingLog={dialog.existingLog}
          onConfirm={handleConfirmLog}
          onRemove={dialog.existingLog ? handleRemoveLog : undefined}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "upsell" && (
        <PremiumUpsellDialog message={dialog.message} onClose={() => setDialog({ step: "none" })} />
      )}

      {moonInfo && (
        <MoonHighlightDialog
          date={moonInfo.date}
          type={moonInfo.type}
          onClose={() => setMoonInfo(null)}
        />
      )}
    </>
  );
}
