"use client";

import { useMemo, useState } from "react";
import {
  daysInMonth,
  eachDate,
  getWeeklyDayLabel,
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
import { WeeklyRhythmCalendar, WeeklyRhythmLegend } from "./WeeklyRhythmCalendar";
import { WeeklyRhythmInstructions } from "./WeeklyRhythmInstructions";
import { MoonHighlightDialog } from "./MoonHighlightDialog";
import { PremiumUpsellDialog } from "./PremiumUpsellDialog";

export interface WeeklyRhythmCalendarViewProps {
  viewedMonth: YearMonth;
  todayISO?: ISODate;
  moonHighlights: Partial<Record<ISODate, MoonHighlightType>>;
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
    }
  | { step: "logActual"; plan: FastPlan; existingLog?: FastLog }
  | { step: "refeedInfo"; date: ISODate; info: RefeedDayInfo }
  | { step: "occupiedInfo"; date: ISODate; info: FastOccupiedInfo }
  | { step: "upsell"; message: string };

/**
 * Protocol 3 (weekly_rhythm / no_cycle tracks — menopause, men, no logged cycle). No cycle
 * here at all, so — unlike Protocols 1/2 — days carry no colour or phase icon until the
 * person actually plans something. Each week's deep-fast day(s), nourish day and support days
 * are derived purely from that week's actual fast plans (getWeeklyDayLabel) — there's no
 * separate "rhythm" setting to keep in sync. Tapping any day in an undecided week defines it as
 * that week's deep-fast day; once a week has exactly one, the "+ Add a 2nd deep-fast day"
 * action lets a more experienced faster add a second. Free tier sees the same plain grid but
 * can't plan against it.
 */
export function WeeklyRhythmCalendarView({
  viewedMonth,
  todayISO,
  moonHighlights,
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
  const [armed2ndDay, setArmed2ndDay] = useState(false);
  const { confirmPlan, removePlan, confirmLog, removeLog } = useFastPlanCrud({
    userId,
    fastPlans,
    fastLogs,
    onFastPlansChange,
    onFastLogsChange,
    onError: onSyncError,
  });

  const days = eachDate(toISODate(viewedMonth, 1), toISODate(viewedMonth, daysInMonth(viewedMonth)));

  const refeedDays = useMemo(() => computeRefeedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);
  const occupiedDays = useMemo(() => computeFastOccupiedDays(fastPlans, fastLogs), [fastPlans, fastLogs]);

  function blockLabelFor(date: ISODate): string {
    const label = getWeeklyDayLabel(date, fastPlans);
    if (label === "deep_fasting") return "deep-fast";
    if (label === "rest") return "nourish";
    if (label === "fasting") return "support";
    return "";
  }

  function handleToggleArmed2ndDay() {
    if (tier !== "premium") {
      setDialog({ step: "upsell", message: "Customizing your fasting rhythm is a Premium feature." });
      return;
    }
    setArmed2ndDay((v) => !v);
  }

  function handleDefineDeepFastDay(date: ISODate) {
    setArmed2ndDay(false);
    setDialog({ step: "planFast", dates: [date], blockLabel: "deep-fast" });
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

  function handleDeletePlanFromLog() {
    if (dialog.step !== "logActual") return;
    removePlan(dialog.plan.id);
    setDialog({ step: "none" });
  }

  return (
    <>
      <WeeklyRhythmInstructions />

      <WeeklyRhythmCalendar
        year={viewedMonth.year}
        month={viewedMonth.month}
        days={days}
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
        armedForSecondDeepFastDay={armed2ndDay}
        refeedDays={refeedDays}
        onRefeedDayClick={handleRefeedDayClick}
        occupiedDays={occupiedDays}
        onOccupiedDayClick={handleOccupiedDayClick}
        activeFastPlanId={activeFastPlanId}
        tier={tier}
      />

      <WeeklyRhythmLegend />

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleToggleArmed2ndDay}
          className={`rounded-full px-4 py-1.5 font-accent text-sm transition-colors ${
            armed2ndDay ? "bg-coral text-obsidian" : "border border-ivory/20 text-ivory hover:bg-ivory/10"
          }`}
        >
          {armed2ndDay ? "Cancel" : "+ Add a 2nd deep-fast day"}
        </button>
        {armed2ndDay && (
          <p className="max-w-xs text-center font-body text-xs text-silver">
            Two deep-fast days a week is more intensive — recommended only for experienced
            fasters. Tap a day in a week that already has one deep-fast day defined.
          </p>
        )}
      </div>

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
          onDeletePlan={handleDeletePlanFromLog}
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
