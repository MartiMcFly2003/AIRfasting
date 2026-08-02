"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  daysBetween,
  daysInMonth,
  getPhaseDayInfo,
  toISODate,
  type ISODate,
  type MoonHighlightType,
  type Tier,
  type YearMonth,
} from "@/lib/calendar";
import { getAverageOfLastNCycles } from "@/lib/calendar/cycle-analysis";
import type { FastLog, FastPlan, FastType } from "@/lib/calendar/fast-plans";
import {
  computeFastOccupiedDays,
  computeRefeedDays,
  type FastOccupiedInfo,
  type RefeedDayInfo,
} from "@/lib/calendar/refeed";
import { useFastPlanCrud } from "@/lib/calendar/use-fast-plan-crud";
import { FastContinuationDialog, LogActualHoursDialog, PlanFastDialog, RefeedInfoDialog } from "./FastPlanDialogs";
import { MonthCalendar, PhaseLegend, PHASE_LABELS } from "./MonthCalendar";
import { MoonHighlightDialog } from "./MoonHighlightDialog";
import { CycleDeviationDialog, DateEntryDialog } from "./PeriodLogDialogs";
import { PremiumUpsellDialog } from "./PremiumUpsellDialog";

function todayAsISODate(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

export interface CalendarViewProps {
  viewedMonth: YearMonth;
  todayISO?: ISODate;
  /** Computed server-side (needs the Swiss Ephemeris WASM module) and passed down. */
  moonHighlights: Partial<Record<ISODate, MoonHighlightType>>;
  /** Owned by CalendarTrackManager so it survives a track switch and feeds regularity detection. */
  periodHistory: ISODate[];
  cycleLength: number;
  onPeriodHistoryChange: (history: ISODate[]) => void;
  onCycleLengthChange: (length: number) => void;
  isPaused: boolean;
  onUnpauseClick: () => void;
  /** Premium fasting planner — owned by CalendarTrackManager so it survives a track switch. */
  fastPlans: FastPlan[];
  fastLogs: FastLog[];
  onFastPlansChange: (plans: FastPlan[]) => void;
  onFastLogsChange: (logs: FastLog[]) => void;
  tier: Tier;
  /** The planId of the currently-live tracked fast, if any. */
  activeFastPlanId: string | null;
  userId: string | null;
  onSyncError: (message: string) => void;
}

type DialogState =
  | { step: "none" }
  | { step: "log"; clickedDate: ISODate }
  | { step: "adjust"; currentDate: ISODate }
  | { step: "deviation"; newDate: ISODate; newCycleLength: number }
  | {
      step: "planFast";
      dates: ISODate[];
      blockLabel: string;
      existingPlan?: FastPlan;
      initialFastType?: FastType;
      minStartTime?: string;
    }
  | { step: "logActual"; plan: FastPlan; existingLog?: FastLog }
  | { step: "refeedInfo"; date: ISODate; info: RefeedDayInfo }
  | { step: "occupiedInfo"; date: ISODate; info: FastOccupiedInfo }
  | { step: "upsell"; message: string };

export function CalendarView({
  viewedMonth,
  todayISO,
  moonHighlights,
  periodHistory,
  cycleLength,
  onPeriodHistoryChange,
  onCycleLengthChange,
  isPaused,
  onUnpauseClick,
  fastPlans,
  fastLogs,
  onFastPlansChange,
  onFastLogsChange,
  tier,
  activeFastPlanId,
  userId,
  onSyncError,
}: CalendarViewProps) {
  const periodStartDate = periodHistory[periodHistory.length - 1];
  const { confirmPlan, removePlan, confirmLog, removeLog } = useFastPlanCrud({
    userId,
    fastPlans,
    fastLogs,
    onFastPlansChange,
    onFastLogsChange,
    onError: onSyncError,
  });
  const [dialog, setDialog] = useState<DialogState>({ step: "none" });
  // Snapshot of period/cycle state from immediately before the current period was logged —
  // lets "Undo logging of period" put the forecasted (dashed) marker back where it was.
  // Corrections via the adjust flow deliberately don't touch this, so undo always reverts
  // to the pre-log state regardless of how many times it's since been corrected.
  const [preLogState, setPreLogState] = useState<{ periodHistory: ISODate[]; cycleLength: number } | null>(
    null,
  );
  const [moonInfo, setMoonInfo] = useState<{ date: ISODate; type: MoonHighlightType } | null>(null);

  const menstrualCycle = { cycleStartDate: periodStartDate, cycleLength };

  const days = Array.from({ length: daysInMonth(viewedMonth) }, (_, i) =>
    getPhaseDayInfo(toISODate(viewedMonth, i + 1), "menstrual", menstrualCycle),
  );

  const dayBeforeMonth = addDays(toISODate(viewedMonth, 1), -1);
  const previousBlock = getPhaseDayInfo(dayBeforeMonth, "menstrual", menstrualCycle).block;

  const refeedDays = useMemo(() => computeRefeedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);
  const occupiedDays = useMemo(() => computeFastOccupiedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);

  function handleLogPeriod(clickedDate: ISODate) {
    setDialog({ step: "log", clickedDate });
  }

  function handleAdjustPeriod(currentDate: ISODate) {
    setDialog({ step: "adjust", currentDate });
  }

  function handleConfirmDate(chosenDate: ISODate) {
    const actualLength = daysBetween(periodStartDate, chosenDate);
    // Defensive guard mirroring the dialog's own min constraint — the new period start
    // must fall strictly after the previous one, never on or before it.
    if (actualLength <= 0) return;

    if (actualLength === cycleLength) {
      setPreLogState({ periodHistory, cycleLength });
      onPeriodHistoryChange([...periodHistory, chosenDate]);
      setDialog({ step: "none" });
    } else {
      setDialog({ step: "deviation", newDate: chosenDate, newCycleLength: actualLength });
    }
  }

  function handleConfirmAdjust(newDate: ISODate) {
    // Correcting a mis-click on the same logged period — not a new cycle data point, so
    // this doesn't compare against the usual cycle length or touch it.
    onPeriodHistoryChange([...periodHistory.slice(0, -1), newDate]);
    setDialog({ step: "none" });
  }

  function handleDeviationChoice(choice: "usual" | "new" | "average") {
    if (dialog.step !== "deviation") return;
    setPreLogState({ periodHistory, cycleLength });
    onPeriodHistoryChange([...periodHistory, dialog.newDate]);
    if (choice === "new") {
      onCycleLengthChange(dialog.newCycleLength);
    } else if (choice === "average") {
      const average = getAverageOfLastNCycles(periodHistory, 3);
      if (average !== null) onCycleLengthChange(average);
    }
    setDialog({ step: "none" });
  }

  function handleMoonHighlightClick(date: ISODate, type: MoonHighlightType) {
    setMoonInfo({ date, type });
  }

  function handleUndoLog() {
    if (preLogState) {
      onPeriodHistoryChange(preLogState.periodHistory);
      onCycleLengthChange(preLogState.cycleLength);
      setPreLogState(null);
    }
    setDialog({ step: "none" });
  }

  function handlePlanFastRange(dates: ISODate[]) {
    const block = days.find((d) => d.date === dates[0])?.block;
    setDialog({ step: "planFast", dates, blockLabel: block ? PHASE_LABELS[block] : "" });
  }

  function handleEditPlan(plan: FastPlan) {
    const block = days.find((d) => d.date === plan.plannedDate)?.block;
    setDialog({
      step: "planFast",
      dates: [plan.plannedDate],
      blockLabel: block ? PHASE_LABELS[block] : "",
      existingPlan: plan,
    });
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
    const block = days.find((d) => d.date === date)?.block;
    setDialog({
      step: "planFast",
      dates: [date],
      blockLabel: block ? PHASE_LABELS[block] : "",
      initialFastType: "water",
      // Only meaningful on the source dry fast's own end date — its earlier hours are still
      // that fast's tail, so the new water fast can't start before it actually finished.
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
      <MonthCalendar
        year={viewedMonth.year}
        month={viewedMonth.month}
        days={days}
        previousBlock={previousBlock}
        periodStartDate={periodStartDate}
        cycleLength={cycleLength}
        todayISO={todayISO}
        onLogPeriod={handleLogPeriod}
        onAdjustPeriod={handleAdjustPeriod}
        moonHighlights={moonHighlights}
        onMoonHighlightClick={handleMoonHighlightClick}
        isPaused={isPaused}
        onUnpauseClick={onUnpauseClick}
        fastPlans={fastPlans}
        fastLogs={fastLogs}
        onPlanFastRange={tier === "premium" ? handlePlanFastRange : undefined}
        onEditPlan={tier === "premium" ? handleEditPlan : handleLockedHistoricalClick}
        onLogActualHours={tier === "premium" ? handleLogActualHours : handleLockedHistoricalClick}
        onLockedPlanClick={
          tier === "free"
            ? () => setDialog({ step: "upsell", message: "Planning fasting days ahead is a Premium feature." })
            : undefined
        }
        refeedDays={refeedDays}
        onRefeedDayClick={handleRefeedDayClick}
        occupiedDays={occupiedDays}
        onOccupiedDayClick={handleOccupiedDayClick}
        activeFastPlanId={activeFastPlanId}
        tier={tier}
      />

      <PhaseLegend />

      {dialog.step === "log" && (
        <DateEntryDialog
          title="Log your period"
          description="Confirm the first day of your period. You can use today's predicted date or pick an earlier one if it actually started sooner."
          initialDate={dialog.clickedDate}
          min={addDays(periodStartDate, 1)}
          max={dialog.clickedDate}
          confirmLabel="Confirm period start"
          onConfirm={handleConfirmDate}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "adjust" && (
        <DateEntryDialog
          title="Adjust period start"
          description="Clicked the wrong day? Correct the logged date below, or undo the log entirely."
          initialDate={dialog.currentDate}
          max={todayAsISODate()}
          confirmLabel="Save correction"
          onConfirm={handleConfirmAdjust}
          onCancel={() => setDialog({ step: "none" })}
          onUndo={preLogState ? handleUndoLog : undefined}
        />
      )}

      {dialog.step === "deviation" && (
        <CycleDeviationDialog
          usualCycleLength={cycleLength}
          newCycleLength={dialog.newCycleLength}
          averageCycleLength={getAverageOfLastNCycles(periodHistory, 3)}
          onChoose={handleDeviationChoice}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "planFast" && (
        <PlanFastDialog
          dates={dialog.dates}
          blockLabel={dialog.blockLabel}
          existingPlan={dialog.existingPlan}
          initialFastType={dialog.initialFastType}
          minStartTime={dialog.minStartTime}
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

      {moonInfo && (
        <MoonHighlightDialog
          date={moonInfo.date}
          type={moonInfo.type}
          onClose={() => setMoonInfo(null)}
        />
      )}

      {dialog.step === "upsell" && (
        <PremiumUpsellDialog message={dialog.message} onClose={() => setDialog({ step: "none" })} />
      )}
    </>
  );
}
