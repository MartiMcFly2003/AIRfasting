"use client";

import { useMemo, useState } from "react";
import {
  daysInMonth,
  eachDate,
  getWeeklyRhythmSchedule,
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
import { computeRefeedDays, type RefeedDayInfo } from "@/lib/calendar/refeed";
import { useFastPlanCrud } from "@/lib/calendar/use-fast-plan-crud";
import { LogActualHoursDialog, PlanFastDialog, RefeedInfoDialog } from "./FastPlanDialogs";
import { WeeklyRhythmCalendar, WeeklyRhythmLegend } from "./WeeklyRhythmCalendar";
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
}

type DialogState =
  | { step: "none" }
  | { step: "planFast"; dates: ISODate[]; blockLabel: string; existingPlan?: FastPlan; initialFastType?: FastType }
  | { step: "logActual"; plan: FastPlan; existingLog?: FastLog }
  | { step: "refeedInfo"; date: ISODate; info: RefeedDayInfo }
  | { step: "upsell"; message: string };

/**
 * Protocol 3 (weekly_rhythm / no_cycle tracks — menopause, men, no logged cycle). No cycle
 * math here: Rise/Radiate/Rest repeat on a fixed weekly pattern instead of a phase-block
 * cycle. Free tier gets a fixed pattern per rhythm (FIXED_WEEKLY_RHYTHM_PATTERNS); premium
 * can move which weekday is Radiate directly on the calendar, and plan dry/water/duration
 * on it the same way Protocols 1/2 do.
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

  function handleRhythmChange(rhythm: WeeklyRhythm) {
    onSelectionChange({ rhythm, ...FIXED_WEEKLY_RHYTHM_PATTERNS[rhythm] });
  }

  function handleMoveRadiateDay(fromDay: IsoWeekday, toDay: IsoWeekday) {
    onSelectionChange(moveDeepFastingDay(selection, fromDay, toDay));
  }

  function handlePlanRadiateDay(date: ISODate) {
    setDialog({ step: "planFast", dates: [date], blockLabel: "Radiate" });
  }

  function handleEditPlan(plan: FastPlan) {
    setDialog({ step: "planFast", dates: [plan.plannedDate], blockLabel: "Radiate", existingPlan: plan });
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
    setDialog({ step: "planFast", dates: [date], blockLabel: "Radiate", initialFastType: "water" });
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
      <WeeklyRhythmPicker rhythm={selection.rhythm} onChange={handleRhythmChange} />

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
        onMoveRadiateDay={tier === "premium" ? handleMoveRadiateDay : undefined}
        onPlanRadiateDay={tier === "premium" ? handlePlanRadiateDay : undefined}
        onEditPlan={tier === "premium" ? handleEditPlan : handleLockedHistoricalClick}
        onLogActualHours={tier === "premium" ? handleLogActualHours : handleLockedHistoricalClick}
        onLockedInteraction={
          tier === "free"
            ? () => setDialog({ step: "upsell", message: "Customizing your fasting rhythm is a Premium feature." })
            : undefined
        }
        refeedDays={refeedDays}
        onRefeedDayClick={handleRefeedDayClick}
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
