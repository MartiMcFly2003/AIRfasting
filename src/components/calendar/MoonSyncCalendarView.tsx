"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  daysInMonth,
  getPhaseDayInfo,
  toISODate,
  type ISODate,
  type MoonHighlightType,
  type Tier,
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
import { MonthCalendar, PhaseLegend, PHASE_LABELS } from "./MonthCalendar";
import { MoonHighlightDialog } from "./MoonHighlightDialog";
import { DateEntryDialog } from "./PeriodLogDialogs";
import { PremiumUpsellDialog } from "./PremiumUpsellDialog";

export interface MoonSyncCalendarViewProps {
  viewedMonth: YearMonth;
  todayISO?: ISODate;
  moonHighlights: Partial<Record<ISODate, MoonHighlightType>>;
  /** Owned by CalendarTrackManager so it survives a track switch and feeds regularity detection. */
  periodHistory: ISODate[];
  onPeriodHistoryChange: (history: ISODate[]) => void;
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

function todayAsISODate(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

type DialogState =
  | { step: "none" }
  | { step: "log" }
  | { step: "adjust" }
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

/**
 * Protocol 2 (moon-sync / moon-sync-bridging / gentle-starter tracks). Same four-block
 * structure and colours as Protocol 1, anchored to the most recent New Moon instead of a
 * logged period. Unlike Protocol 1, periods here can't be forecasted (that's exactly why
 * this track exists), so logging is a plain "log period start" action rather than
 * confirming a predicted date, and there's no deviation dialog.
 */
export function MoonSyncCalendarView({
  viewedMonth,
  todayISO,
  moonHighlights,
  periodHistory,
  onPeriodHistoryChange,
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
}: MoonSyncCalendarViewProps) {
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

  const periodStartDate = periodHistory[periodHistory.length - 1] as ISODate | undefined;
  const additionalPeriodDates = periodHistory.slice(0, -1);

  const days = Array.from({ length: daysInMonth(viewedMonth) }, (_, i) =>
    getPhaseDayInfo(toISODate(viewedMonth, i + 1), "moon_sync"),
  );

  const dayBeforeMonth = addDays(toISODate(viewedMonth, 1), -1);
  const previousBlock = getPhaseDayInfo(dayBeforeMonth, "moon_sync").block;

  const refeedDays = useMemo(() => computeRefeedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);
  const occupiedDays = useMemo(() => computeFastOccupiedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);

  function handleConfirmLog(date: ISODate) {
    onPeriodHistoryChange([...periodHistory, date]);
    setDialog({ step: "none" });
  }

  function handleConfirmAdjust(date: ISODate) {
    onPeriodHistoryChange([...periodHistory.slice(0, -1), date]);
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

  function handleConfirmLogHours(actualMinutes: number) {
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
        todayISO={todayISO}
        onAdjustPeriod={periodStartDate ? () => setDialog({ step: "adjust" }) : undefined}
        moonHighlights={moonHighlights}
        onMoonHighlightClick={(date, type) => setMoonInfo({ date, type })}
        isPaused={isPaused}
        onUnpauseClick={onUnpauseClick}
        additionalPeriodDates={additionalPeriodDates}
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

      <button
        type="button"
        onClick={() => setDialog({ step: "log" })}
        className="rounded-full border border-ivory/20 px-4 py-2 font-accent text-sm text-ivory transition-colors hover:bg-ivory/10"
      >
        Log period start
      </button>

      <PhaseLegend />

      {dialog.step === "log" && (
        <DateEntryDialog
          title="Log period start"
          description="Record the first day of your period. Irregular cycles can't be forecasted, so pick any date up to today."
          initialDate={todayAsISODate()}
          min={periodStartDate ? addDays(periodStartDate, 1) : undefined}
          max={todayAsISODate()}
          confirmLabel="Confirm period start"
          onConfirm={handleConfirmLog}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {dialog.step === "adjust" && periodStartDate && (
        <DateEntryDialog
          title="Adjust period start"
          description="Clicked the wrong day? Correct the logged date below."
          initialDate={periodStartDate}
          max={todayAsISODate()}
          confirmLabel="Save correction"
          onConfirm={handleConfirmAdjust}
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
          onConfirm={handleConfirmLogHours}
          onRemove={dialog.existingLog ? handleRemoveLog : undefined}
          onCancel={() => setDialog({ step: "none" })}
        />
      )}

      {moonInfo && (
        <MoonHighlightDialog date={moonInfo.date} type={moonInfo.type} onClose={() => setMoonInfo(null)} />
      )}

      {dialog.step === "upsell" && (
        <PremiumUpsellDialog message={dialog.message} onClose={() => setDialog({ step: "none" })} />
      )}
    </>
  );
}
