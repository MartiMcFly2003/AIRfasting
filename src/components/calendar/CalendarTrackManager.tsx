"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TRACK_PROTOCOL,
  FIXED_WEEKLY_RHYTHM_PATTERNS,
  addDays,
  type ISODate,
  type MoonHighlightType,
  type Tier,
  type Track,
  type WeeklyRhythmSelection,
  type YearMonth,
} from "@/lib/calendar";
import {
  detectLatePeriod,
  detectRegularity,
  getAverageOfLastNCycles,
  getCycleLengths,
} from "@/lib/calendar/cycle-analysis";
import { getPlansForMonth, type FastLog, type FastPlan } from "@/lib/calendar/fast-plans";
import { insertFastLog } from "@/lib/calendar/persistence/fast-logs";
import { syncNoPeriodMonths } from "@/lib/calendar/persistence/no-period-months";
import { syncPeriodHistory } from "@/lib/calendar/persistence/period-logs";
import {
  saveCycleLength,
  savePauseState,
  saveTrack,
  saveWeeklyRhythmSelection,
} from "@/lib/calendar/persistence/profile-fields";
import { useActiveFast } from "@/lib/calendar/use-active-fast";
import { CalendarView } from "./CalendarView";
import { CycleHistoryPanel } from "./CycleHistoryPanel";
import { FastAnalysisPanel, FastPlanSummaryPanel } from "./FastPlanningPanels";
import { LiveFastTracker } from "./LiveFastTracker";
import { ChangeRhythmDialog, type FastingRhythmOption } from "./ChangeRhythmDialog";
import { MoonSyncCalendarView } from "./MoonSyncCalendarView";
import { IrregularPeriodDialog, PauseStatusStrip, UnpauseDialog, type PauseReason } from "./PauseDialogs";
import { DateEntryDialog, MonthEntryDialog } from "./PeriodLogDialogs";
import { PrepRefeedBanner } from "./PrepRefeedBanner";
import { RegularDetectedBanner } from "./RegularDetectedBanner";
import { WeeklyRhythmCalendarView } from "./WeeklyRhythmCalendarView";

// Mock data until onboarding/auth exist — a menstrual track with one period logged, matching
// the previous single-date mock so existing behavior is unchanged until more are logged.
const MOCK_PERIOD_HISTORY: ISODate[] = ["2026-07-01"];
const MOCK_CYCLE_LENGTH = 28;

// One already-past plan (with a matching log) seeded in the Rise block, so the analysis panel
// has real data on first load. The Radiate block is left unplanned so the arm-and-plan flow is
// testable fresh.
const MOCK_FAST_PLANS: FastPlan[] = [
  { id: "mock-plan-1", plannedDate: "2026-07-03", fastType: "water", plannedHours: 16, startTime: "18:00" },
];
const MOCK_FAST_LOGS: FastLog[] = [
  {
    id: "mock-log-1",
    planId: "mock-plan-1",
    loggedDate: "2026-07-03",
    fastType: "water",
    plannedHours: 16,
    actualMinutes: 870,
    startedAt: null,
    endedAt: null,
  },
];

const MOCK_WEEKLY_RHYTHM_SELECTION: WeeklyRhythmSelection = {
  rhythm: "5-1-1",
  ...FIXED_WEEKLY_RHYTHM_PATTERNS["5-1-1"],
};

function todayAsISODate(): ISODate {
  return new Date().toISOString().slice(0, 10);
}

interface PauseState {
  reason: PauseReason;
}

export interface CalendarTrackManagerProps {
  initialTrack: Track;
  tier: Tier;
  viewedMonth: YearMonth;
  todayISO?: ISODate;
  moonHighlights: Partial<Record<ISODate, MoonHighlightType>>;
  monthLabel: string;
  /** Admin-editable guidance copy keyed by content-table row (education_duration, prep_day_before,
   *  refeed_day_after, food_inhale/bloom/radiate/exhale). Missing keys degrade to no tip shown. */
  content: Record<string, string>;
  /** Real onboarding answer, when present — falls back to the mock seed otherwise. */
  initialPeriodDate?: ISODate;
  /** Signed-in user id, or null when unauthenticated (the URL-param preview path). Every
   *  mutation below only persists to Supabase when this is set. */
  userId: string | null;
  initialPeriodHistory?: ISODate[];
  /** First-of-month ISODates explicitly marked "no period". */
  initialNoPeriodMonths?: ISODate[];
  initialFastPlans?: FastPlan[];
  initialFastLogs?: FastLog[];
  initialCycleLength?: number;
  initialPause?: PauseState | null;
  initialWeeklyRhythmSelection?: WeeklyRhythmSelection;
}

export function CalendarTrackManager({
  initialTrack,
  tier,
  viewedMonth,
  todayISO,
  moonHighlights,
  monthLabel,
  content,
  initialPeriodDate,
  userId,
  initialPeriodHistory,
  initialNoPeriodMonths,
  initialFastPlans,
  initialFastLogs,
  initialCycleLength,
  initialPause,
  initialWeeklyRhythmSelection,
}: CalendarTrackManagerProps) {
  const router = useRouter();
  const [track, setTrack] = useState<Track>(initialTrack);
  // `initialPeriodHistory` can be an empty array (not just absent) if `last_period_date` was
  // written to user_profiles but the matching period_logs row never landed — e.g. a partial
  // failure between the two separate writes in saveOnboardingProfile. `??` alone doesn't catch
  // that (`[]` isn't nullish), which crashed downstream date math expecting at least one entry.
  const [periodHistory, setPeriodHistory] = useState<ISODate[]>(
    initialPeriodHistory && initialPeriodHistory.length > 0
      ? initialPeriodHistory
      : initialPeriodDate
        ? [initialPeriodDate]
        : MOCK_PERIOD_HISTORY,
  );
  const [noPeriodMonths, setNoPeriodMonths] = useState<ISODate[]>(initialNoPeriodMonths ?? []);
  const [cycleLength, setCycleLength] = useState(initialCycleLength ?? MOCK_CYCLE_LENGTH);
  const [pause, setPause] = useState<PauseState | null>(initialPause ?? null);
  const [fastPlans, setFastPlans] = useState<FastPlan[]>(initialFastPlans ?? MOCK_FAST_PLANS);
  const [fastLogs, setFastLogs] = useState<FastLog[]>(initialFastLogs ?? MOCK_FAST_LOGS);
  const [weeklyRhythmSelection, setWeeklyRhythmSelection] = useState<WeeklyRhythmSelection>(
    initialWeeklyRhythmSelection ?? MOCK_WEEKLY_RHYTHM_SELECTION,
  );
  const [regularBannerDismissed, setRegularBannerDismissed] = useState(false);
  const [irregularDialogDismissed, setIrregularDialogDismissed] = useState(false);
  const [showUnpauseDialog, setShowUnpauseDialog] = useState(false);
  const [showLogHistoricDialog, setShowLogHistoricDialog] = useState(false);
  const [showLogNoPeriodDialog, setShowLogNoPeriodDialog] = useState(false);
  const [showChangeRhythmDialog, setShowChangeRhythmDialog] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Dismissing the prep/refeed nudge only silences it for the current day — it naturally
  // reappears once todayISO advances, with no extra persistence needed.
  const [nudgeDismissedDate, setNudgeDismissedDate] = useState<ISODate | null>(null);
  const { activeFast, start: startFast, stop: stopFast, elapsedMs } = useActiveFast();

  function reportSyncError(e: unknown) {
    console.error(e);
    setSyncError(e instanceof Error ? e.message : "Something went wrong saving your change.");
  }

  function changeTrack(next: Track) {
    setTrack(next);
    const params = new URLSearchParams(window.location.search);
    params.set("track", next);
    router.replace(`/calendar?${params.toString()}`);
    if (userId) void saveTrack(userId, next).catch(reportSyncError);
  }

  function handlePeriodHistoryChange(nextUnsorted: ISODate[]) {
    // Every write funnels through here, so sorting/deduping once centrally keeps periodHistory's
    // ascending-oldest-to-newest invariant intact regardless of caller — including a historic
    // entry inserted out of order via handleConfirmHistoricPeriod below. ISO date strings
    // ("YYYY-MM-DD") sort correctly with a plain string sort.
    const next = [...new Set(nextUnsorted)].sort();
    if (userId) void syncPeriodHistory(userId, periodHistory, next).catch(reportSyncError);
    setPeriodHistory(next);
    // New data invalidates any earlier dismissal — a fresh log can change the regularity
    // assessment, so both prompts get another chance to evaluate the new state.
    setRegularBannerDismissed(false);
    setIrregularDialogDismissed(false);
  }

  function handleConfirmHistoricPeriod(date: ISODate) {
    handlePeriodHistoryChange([...periodHistory, date]);
    setShowLogHistoricDialog(false);
  }

  function handleDeletePeriod(date: ISODate) {
    handlePeriodHistoryChange(periodHistory.filter((d) => d !== date));
  }

  function handleNoPeriodMonthsChange(nextUnsorted: ISODate[]) {
    const next = [...new Set(nextUnsorted)].sort();
    if (userId) void syncNoPeriodMonths(userId, noPeriodMonths, next).catch(reportSyncError);
    setNoPeriodMonths(next);
  }

  function isMonthTaken(month: string): boolean {
    return periodHistory.some((date) => date.startsWith(month));
  }

  function handleConfirmNoPeriodMonth(month: string) {
    handleNoPeriodMonthsChange([...noPeriodMonths, `${month}-01`]);
    setShowLogNoPeriodDialog(false);
  }

  function handleDeleteNoPeriodMonth(monthDate: ISODate) {
    handleNoPeriodMonthsChange(noPeriodMonths.filter((m) => m !== monthDate));
  }

  function handleCycleLengthChange(next: number) {
    setCycleLength(next);
    if (userId) void saveCycleLength(userId, next).catch(reportSyncError);
  }

  function handleWeeklyRhythmSelectionChange(next: WeeklyRhythmSelection) {
    setWeeklyRhythmSelection(next);
    if (userId) void saveWeeklyRhythmSelection(userId, next).catch(reportSyncError);
  }

  const protocol = TRACK_PROTOCOL[track];
  const periodStartDate = periodHistory[periodHistory.length - 1] as ISODate | undefined;
  const cycleLengths = getCycleLengths(periodHistory);
  const regularity = detectRegularity(cycleLengths);
  // Cycling women's forecast is always the average of the last 3 registered (non-zero) cycles
  // once that many exist — supersedes cycleLength (the raw, manually-adjustable state) rather
  // than requiring a dialog choice each time. Before 3 real cycles are on record, cycleLength
  // (onboarding's self-reported value, or the deviation dialog's earlier picks) is still the
  // only data available, so it remains the fallback.
  const forecastedCycleLength = getAverageOfLastNCycles(periodHistory, 3) ?? cycleLength;
  const isLate = periodStartDate
    ? detectLatePeriod(periodStartDate, forecastedCycleLength, todayAsISODate())
    : false;

  const showRegularBanner = protocol === "protocol2" && regularity.status === "regular" && !regularBannerDismissed;

  const showIrregularDialog =
    protocol === "protocol1" &&
    pause === null &&
    !irregularDialogDismissed &&
    (regularity.status === "irregular" || isLate);

  const todaysPlan = todayISO ? fastPlans.find((p) => p.plannedDate === todayISO) : undefined;

  // The live-tracked fast isn't necessarily against todaysPlan (e.g. still running past
  // midnight from a plan made for yesterday), so its target has to be looked up by planId
  // independently rather than reusing todaysPlan.
  const activeFastPlan = activeFast?.planId ? fastPlans.find((p) => p.id === activeFast.planId) : undefined;
  const activeFastTargetHours = activeFastPlan?.plannedHours ?? undefined;

  // Purely informational — unrelated to the RefeedInfoDialog/computeRefeedDays blocking
  // mechanism, which only ever fires for 20h+ fasts. This nudge fires after any fast at all.
  let showPrepNudge = false;
  let showRefeedNudge = false;
  if (todayISO && tier === "premium" && nudgeDismissedDate !== todayISO) {
    const tomorrow = addDays(todayISO, 1);
    const yesterday = addDays(todayISO, -1);
    showRefeedNudge =
      fastPlans.some((p) => p.plannedDate === yesterday) || fastLogs.some((l) => l.loggedDate === yesterday);
    showPrepNudge = !showRefeedNudge && fastPlans.some((p) => p.plannedDate === tomorrow);
  }
  const prepRefeedTip = showRefeedNudge ? content["refeed_day_after"] : content["prep_day_before"];

  function handleStopFast() {
    const finished = stopFast();
    if (!finished) return;
    const plan = finished.planId ? fastPlans.find((p) => p.id === finished.planId) : undefined;
    const endedAt = new Date();
    const actualMinutes = Math.max(1, Math.round((endedAt.getTime() - new Date(finished.startedAt).getTime()) / 60000));
    const newLog: FastLog = {
      id: crypto.randomUUID(),
      planId: finished.planId,
      loggedDate: todayISO ?? todayAsISODate(),
      fastType: finished.fastType,
      plannedHours: plan?.plannedHours ?? null,
      actualMinutes,
      // Real start/end timestamps, not just a duration — lets computeRefeedDays block
      // subsequent days from an actual long fast, whether or not it was pre-planned.
      startedAt: finished.startedAt,
      endedAt: endedAt.toISOString(),
    };
    setFastLogs([...fastLogs, newLog]);
    if (userId) void insertFastLog(userId, newLog).catch(reportSyncError);
  }

  function handleAcceptRegular() {
    changeTrack("menstrual");
    setRegularBannerDismissed(true);
  }

  function handlePauseChoice(reason: PauseReason) {
    setPause({ reason });
    setIrregularDialogDismissed(true);
    if (userId) void savePauseState(userId, { reason }).catch(reportSyncError);
  }

  function handleChooseRhythm(next: FastingRhythmOption) {
    changeTrack(next);
    // A deliberate manual switch supersedes an automatic pause the same way the dedicated
    // unpause flows already do — otherwise a stale "Fasting paused" strip could linger on a
    // track its detection logic no longer even runs against.
    setPause(null);
    setIrregularDialogDismissed(false);
    setShowChangeRhythmDialog(false);
    if (userId) void savePauseState(userId, null).catch(reportSyncError);
  }

  function handleSwitchToMoonSyncFromIrregular() {
    changeTrack("moon_sync");
    setPause(null);
    setIrregularDialogDismissed(true);
    if (userId) void savePauseState(userId, null).catch(reportSyncError);
  }

  function handleUnpauseRegular() {
    setPause(null);
    setIrregularDialogDismissed(false);
    changeTrack("menstrual");
    setShowUnpauseDialog(false);
    if (userId) void savePauseState(userId, null).catch(reportSyncError);
  }

  function handleUnpausePerimenopause() {
    setPause(null);
    setIrregularDialogDismissed(false);
    changeTrack("moon_sync");
    setShowUnpauseDialog(false);
    if (userId) void savePauseState(userId, null).catch(reportSyncError);
  }

  return (
    <>
      {syncError && (
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-ivory">
          <span>Couldn&apos;t save your last change — {syncError}</span>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="shrink-0 font-accent text-xs text-silver hover:text-ivory"
          >
            Dismiss
          </button>
        </div>
      )}

      {showRegularBanner && (
        <RegularDetectedBanner
          averageCycleLength={regularity.averageCycleLength!}
          onAccept={handleAcceptRegular}
          onDismiss={() => setRegularBannerDismissed(true)}
        />
      )}

      {pause && <PauseStatusStrip reason={pause.reason} />}

      {(showPrepNudge || showRefeedNudge) && prepRefeedTip && (
        <PrepRefeedBanner
          kind={showRefeedNudge ? "refeed" : "prep"}
          message={prepRefeedTip}
          onDismiss={() => setNudgeDismissedDate(todayISO ?? null)}
        />
      )}

      <LiveFastTracker
        activeFast={activeFast}
        elapsedMs={elapsedMs}
        activeFastTargetHours={activeFastTargetHours}
        todaysPlan={todaysPlan}
        durationTip={content["education_duration"]}
        onStart={startFast}
        onStop={handleStopFast}
      />

      {protocol === "protocol1" && (
        <CalendarView
          viewedMonth={viewedMonth}
          todayISO={todayISO}
          moonHighlights={moonHighlights}
          periodHistory={periodHistory}
          cycleLength={forecastedCycleLength}
          onPeriodHistoryChange={handlePeriodHistoryChange}
          onCycleLengthChange={handleCycleLengthChange}
          isPaused={pause !== null}
          onUnpauseClick={() => setShowUnpauseDialog(true)}
          fastPlans={fastPlans}
          fastLogs={fastLogs}
          onFastPlansChange={setFastPlans}
          onFastLogsChange={setFastLogs}
          tier={tier}
          activeFastPlanId={activeFast?.planId ?? null}
          userId={userId}
          onSyncError={reportSyncError}
          content={content}
        />
      )}
      {protocol === "protocol2" && (
        <MoonSyncCalendarView
          viewedMonth={viewedMonth}
          todayISO={todayISO}
          moonHighlights={moonHighlights}
          periodHistory={periodHistory}
          onPeriodHistoryChange={handlePeriodHistoryChange}
          isPaused={pause !== null}
          onUnpauseClick={() => setShowUnpauseDialog(true)}
          fastPlans={fastPlans}
          fastLogs={fastLogs}
          onFastPlansChange={setFastPlans}
          onFastLogsChange={setFastLogs}
          tier={tier}
          activeFastPlanId={activeFast?.planId ?? null}
          userId={userId}
          onSyncError={reportSyncError}
          content={content}
        />
      )}
      {protocol === "protocol3" && (
        <WeeklyRhythmCalendarView
          viewedMonth={viewedMonth}
          todayISO={todayISO}
          moonHighlights={moonHighlights}
          selection={weeklyRhythmSelection}
          onSelectionChange={handleWeeklyRhythmSelectionChange}
          tier={tier}
          fastPlans={fastPlans}
          fastLogs={fastLogs}
          onFastPlansChange={setFastPlans}
          onFastLogsChange={setFastLogs}
          activeFastPlanId={activeFast?.planId ?? null}
          userId={userId}
          onSyncError={reportSyncError}
          content={content}
        />
      )}

      {(protocol === "protocol1" || protocol === "protocol2") && (
        <CycleHistoryPanel
          periodHistory={periodHistory}
          noPeriodMonths={noPeriodMonths}
          onLogHistoric={() => setShowLogHistoricDialog(true)}
          onLogNoPeriod={() => setShowLogNoPeriodDialog(true)}
          onDeletePeriod={handleDeletePeriod}
          onDeleteNoPeriod={handleDeleteNoPeriodMonth}
        />
      )}

      <button
        type="button"
        onClick={() => setShowChangeRhythmDialog(true)}
        className="font-accent text-xs text-silver hover:text-ivory hover:underline"
      >
        Change fasting rhythm
      </button>

      <FastPlanSummaryPanel plans={getPlansForMonth(fastPlans, viewedMonth)} monthLabel={monthLabel} />
      <FastAnalysisPanel plans={fastPlans} logs={fastLogs} />

      {showIrregularDialog && (
        <IrregularPeriodDialog
          onChoosePause={handlePauseChoice}
          onChooseSwitchToMoonSync={handleSwitchToMoonSyncFromIrregular}
          onCancel={() => setIrregularDialogDismissed(true)}
        />
      )}

      {showUnpauseDialog && (
        <UnpauseDialog
          onChooseRegular={handleUnpauseRegular}
          onChoosePerimenopause={handleUnpausePerimenopause}
          onCancel={() => setShowUnpauseDialog(false)}
        />
      )}

      {showLogHistoricDialog && (
        <DateEntryDialog
          title="Log a past period"
          description="Add a period start date you missed logging earlier this year."
          initialDate={todayAsISODate()}
          min={`${new Date().getUTCFullYear()}-01-01`}
          max={todayAsISODate()}
          confirmLabel="Add to history"
          onConfirm={handleConfirmHistoricPeriod}
          onCancel={() => setShowLogHistoricDialog(false)}
        />
      )}

      {showLogNoPeriodDialog && (
        <MonthEntryDialog
          title="No period this month"
          description="Record a month where you didn't get a period — useful for irregular or perimenopausal cycles."
          initialMonth={todayAsISODate().slice(0, 7)}
          min={`${new Date().getUTCFullYear()}-01`}
          max={todayAsISODate().slice(0, 7)}
          confirmLabel="Mark as no period"
          onConfirm={handleConfirmNoPeriodMonth}
          onCancel={() => setShowLogNoPeriodDialog(false)}
          isMonthTaken={isMonthTaken}
        />
      )}

      {showChangeRhythmDialog && (
        <ChangeRhythmDialog
          currentTrack={track}
          onChoose={handleChooseRhythm}
          onCancel={() => setShowChangeRhythmDialog(false)}
        />
      )}
    </>
  );
}
