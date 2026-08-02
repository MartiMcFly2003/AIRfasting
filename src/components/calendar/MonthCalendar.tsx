"use client";

import { useEffect, useMemo, useState } from "react";
import {
  daysBetween,
  eachDate,
  type ISODate,
  type MoonHighlightType,
  type PhaseBlockName,
  type PhaseDayInfo,
  type Tier,
} from "@/lib/calendar";
import type { FastLog, FastPlan, FastType } from "@/lib/calendar/fast-plans";
import type { FastOccupiedInfo, RefeedDayInfo } from "@/lib/calendar/refeed";
import {
  DryFastIcon,
  PHASE_ICONS,
  PausedMarkerIcon,
  PeriodForecastIcon,
  PeriodStartIcon,
  StopIcon,
  WaterFastIcon,
} from "./PhaseIcons";
import { EkadashiSparkleIcon, FullMoonIcon, NewMoonIcon } from "./MoonIcons";

const MOON_HIGHLIGHT_ICONS: Record<MoonHighlightType, (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  new_moon: NewMoonIcon,
  full_moon: FullMoonIcon,
  ekadashi: EkadashiSparkleIcon,
};

const MOON_HIGHLIGHT_LABELS: Record<MoonHighlightType, string> = {
  new_moon: "New Moon",
  full_moon: "Full Moon",
  ekadashi: "Ekadashi",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BLOCK_STYLES: Record<
  PhaseBlockName,
  { bg: string; todayBg: string; border: string; text: string; solidBg: string; glow: string; label: string }
> = {
  inhale: {
    bg: "bg-phase-inhale/15",
    todayBg: "bg-phase-inhale/45",
    border: "border-phase-inhale",
    text: "text-phase-inhale",
    solidBg: "bg-phase-inhale",
    glow: "shadow-[0_0_10px_var(--color-phase-inhale)]",
    label: "Rise",
  },
  bloom: {
    bg: "bg-phase-bloom/15",
    todayBg: "bg-phase-bloom/45",
    border: "border-phase-bloom",
    text: "text-phase-bloom",
    solidBg: "bg-phase-bloom",
    glow: "shadow-[0_0_10px_var(--color-phase-bloom)]",
    label: "Bloom",
  },
  radiate: {
    bg: "bg-phase-radiate/15",
    todayBg: "bg-phase-radiate/45",
    border: "border-phase-radiate",
    text: "text-phase-radiate",
    solidBg: "bg-phase-radiate",
    glow: "shadow-[0_0_10px_var(--color-phase-radiate)]",
    label: "Radiate",
  },
  exhale: {
    bg: "bg-phase-exhale/15",
    todayBg: "bg-phase-exhale/45",
    border: "border-phase-exhale",
    text: "text-phase-exhale",
    solidBg: "bg-phase-exhale",
    glow: "shadow-[0_0_10px_var(--color-phase-exhale)]",
    label: "Rest",
  },
};

/** User-facing phase labels, shared with the fast-planner dialogs so "Rise"/"Radiate" copy has one source of truth. */
export const PHASE_LABELS: Record<PhaseBlockName, string> = {
  inhale: "Rise",
  bloom: "Bloom",
  radiate: "Radiate",
  exhale: "Rest",
};

export const FAST_MARKER_STYLE: Record<
  FastType,
  { Icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element; ring: string; text: string; dashed: string }
> = {
  water: { Icon: WaterFastIcon, ring: "ring-silver", text: "text-silver", dashed: "border-dashed border-silver" },
  dry: { Icon: DryFastIcon, ring: "ring-gold", text: "text-gold", dashed: "border-dashed border-gold" },
};

export interface MonthCalendarProps {
  year: number;
  /** 1-12 */
  month: number;
  /** One entry per day of the month, in date order. */
  days: PhaseDayInfo[];
  /** Block of the day immediately before the 1st, so a phase starting on day 1 is still detected. */
  previousBlock?: PhaseBlockName;
  /** The date the user actually logged as their period start — distinct from later predicted cycle-day-1s. */
  periodStartDate?: ISODate;
  /** Needed to project future period dates from periodStartDate; only relevant alongside it. */
  cycleLength?: number;
  todayISO?: string;
  /**
   * Called when the user clicks the *next* forecasted period date to confirm it. Only the
   * immediate next occurrence is clickable — later ones can't be confirmed out of order.
   */
  onLogPeriod?: (date: ISODate) => void;
  /** Called when the user clicks the *confirmed* period date, to correct a mistaken entry. */
  onAdjustPeriod?: (currentDate: ISODate) => void;
  /** Informational overlays (New Moon / Full Moon / Ekadashi) — independent of phase or period state. */
  moonHighlights?: Partial<Record<ISODate, MoonHighlightType>>;
  /** Called when a moon-highlight icon is clicked, to show educational info about that day. */
  onMoonHighlightClick?: (date: ISODate, type: MoonHighlightType) => void;
  /** True while fasting is paused — swaps the confirmed-period marker's click target/visual to the unpause flow instead of the normal adjust flow. */
  isPaused?: boolean;
  onUnpauseClick?: () => void;
  /** Earlier logged period dates shown as static, non-interactive markers — used by tracks (moon-sync) with no single "current" period to adjust. */
  additionalPeriodDates?: ISODate[];
  /** Planned fasts (Premium planner) — only fasting-possible days (Rise/Radiate) are directly tappable/draggable to plan. */
  fastPlans?: FastPlan[];
  fastLogs?: FastLog[];
  /** Tap or drag-release directly on fasting-possible days with no existing plan — no separate arming step. */
  onPlanFastRange?: (dates: ISODate[]) => void;
  /** Click on an existing plan whose date is still in the future. */
  onEditPlan?: (plan: FastPlan) => void;
  /** Click on an existing plan whose date is today or in the past. */
  onLogActualHours?: (plan: FastPlan) => void;
  /** Called instead of planning, when a fasting-possible day is tapped directly but `onPlanFastRange`
   *  isn't wired (free tier) — shows a locked/upsell affordance rather than silently vanishing. */
  onLockedPlanClick?: (day: PhaseDayInfo) => void;
  /** Days blocked for refeeding after a 20h+ fast (see src/lib/calendar/refeed.ts). These days
   *  are excluded from direct tap/drag planning entirely — the stop-icon marker rendered on
   *  them is the only entry point back into planning (via the dry→water exception dialog). */
  refeedDays?: Record<ISODate, RefeedDayInfo>;
  /** Click on a refeed day's stop-icon marker, to explain what refeeding means. */
  onRefeedDayClick?: (date: ISODate) => void;
  /** Days still occupied by an earlier fast's tail — started the day before (or earlier) and
   *  runs into this one (see src/lib/calendar/refeed.ts). Excluded from direct tap/drag
   *  planning like refeed days; a date already in refeedDays (the source fast's own end date)
   *  renders as a refeed marker instead, since that dialog already covers this case. */
  occupiedDays?: Record<ISODate, FastOccupiedInfo>;
  /** Click on an occupied-only day's marker, to explain the fast already running through it. */
  onOccupiedDayClick?: (date: ISODate) => void;
  /** The planId of the currently-live tracked fast, if any — its marker renders as a plain
   *  non-interactive indicator (the live timer supersedes manual logging while it's running). */
  activeFastPlanId?: string | null;
  /** Free tier can't create fastPlans at all, so any existing plan marker rendered under free
   *  tier is by definition leftover trial/premium data — dimmed as a reactivation lever
   *  rather than hidden. Ad-hoc logs (no linked plan) are unaffected — those aren't tier-gated. */
  tier: Tier;
}

export function MonthCalendar({
  year,
  month,
  days,
  previousBlock,
  periodStartDate,
  cycleLength,
  todayISO,
  onLogPeriod,
  onAdjustPeriod,
  moonHighlights,
  onMoonHighlightClick,
  isPaused,
  onUnpauseClick,
  additionalPeriodDates,
  fastPlans,
  fastLogs,
  onPlanFastRange,
  onEditPlan,
  onLogActualHours,
  onLockedPlanClick,
  refeedDays,
  onRefeedDayClick,
  occupiedDays,
  onOccupiedDayClick,
  activeFastPlanId,
  tier,
}: MonthCalendarProps) {
  const [dragAnchor, setDragAnchor] = useState<ISODate | null>(null);
  const [dragCurrent, setDragCurrent] = useState<ISODate | null>(null);

  const fastPlanByDate = useMemo(() => {
    const map = new Map<ISODate, FastPlan>();
    for (const plan of fastPlans ?? []) map.set(plan.plannedDate, plan);
    return map;
  }, [fastPlans]);

  const fastLogByPlanId = useMemo(() => {
    const map = new Map<string, FastLog>();
    for (const log of fastLogs ?? []) if (log.planId) map.set(log.planId, log);
    return map;
  }, [fastLogs]);

  // Ad-hoc fasts (no prior plan — e.g. a free-tier live fast) have no plan to key off, so
  // they're rendered by the date they were logged on instead.
  const adHocLogByDate = useMemo(() => {
    const map = new Map<ISODate, FastLog>();
    for (const log of fastLogs ?? []) if (!log.planId) map.set(log.loggedDate, log);
    return map;
  }, [fastLogs]);

  const previewDates = useMemo(() => {
    if (!dragAnchor || !dragCurrent) return new Set<ISODate>();
    const [start, end] =
      daysBetween(dragAnchor, dragCurrent) < 0 ? [dragCurrent, dragAnchor] : [dragAnchor, dragCurrent];
    return new Set(eachDate(start, end));
  }, [dragAnchor, dragCurrent]);

  useEffect(() => {
    if (!dragAnchor) return;
    function handlePointerUp() {
      if (dragAnchor && dragCurrent && onPlanFastRange) {
        const [start, end] =
          daysBetween(dragAnchor, dragCurrent) < 0 ? [dragCurrent, dragAnchor] : [dragAnchor, dragCurrent];
        const range = eachDate(start, end).filter((d) => !fastPlanByDate.has(d));
        if (range.length > 0) onPlanFastRange(range);
      }
      setDragAnchor(null);
      setDragCurrent(null);
    }
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragAnchor, dragCurrent]);

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const jsWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday
  const leadingBlanks = jsWeekday === 0 ? 6 : jsWeekday - 1; // ISO week starts Monday

  const cells: (PhaseDayInfo | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full max-w-xl">
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-accent text-xs uppercase tracking-wider text-silver"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;

          const style = BLOCK_STYLES[day.block];
          const isToday = day.date === todayISO;
          const dayNumber = Number(day.date.slice(8, 10));
          const priorBlock = days[i - leadingBlanks - 1]?.block ?? previousBlock;
          const isBlockStart = priorBlock !== undefined && priorBlock !== day.block;
          const isPeriodStart = day.date === periodStartDate;
          const daysSincePeriodStart = periodStartDate ? daysBetween(periodStartDate, day.date) : 0;
          const isForecastedPeriodStart =
            !isPeriodStart &&
            !!periodStartDate &&
            !!cycleLength &&
            daysSincePeriodStart > 0 &&
            daysSincePeriodStart % cycleLength === 0;
          const isNextForecastedPeriodStart = isForecastedPeriodStart && daysSincePeriodStart === cycleLength;
          const Icon = PHASE_ICONS[day.block];
          const moonHighlight = moonHighlights?.[day.date];
          const MoonIcon = moonHighlight ? MOON_HIGHLIGHT_ICONS[moonHighlight] : null;

          const existingPlan = fastPlanByDate.get(day.date);
          const refeedInfo = !existingPlan ? refeedDays?.[day.date] : undefined;
          // A date already in refeedDays is the source fast's own end date — that dialog
          // already explains the fast's tail precisely, so occupied-only rendering is reserved
          // for dates that aren't also a refeed day (e.g. a fast under the refeed threshold
          // that simply crosses midnight).
          const occupiedInfo = !existingPlan && !refeedInfo ? occupiedDays?.[day.date] : undefined;
          // A day is directly tappable/draggable to plan a fast the moment it's fasting-possible
          // and has no existing plan — no separate "arm this block first" step. Premium users get
          // the real drag-select flow; free-tier users get the upsell on the very first tap, which
          // is more discoverable than the old badge-only entry point, not less. Refeed and
          // occupied days are excluded outright — the stop-icon marker is the only way back in
          // (via the dry→water exception dialog, refeed days only).
          const isPremiumPlannable =
            day.fastingPossible && !existingPlan && !refeedInfo && !occupiedInfo && !!onPlanFastRange;
          const isLockedPlannable =
            day.fastingPossible &&
            !existingPlan &&
            !refeedInfo &&
            !occupiedInfo &&
            !onPlanFastRange &&
            !!onLockedPlanClick;
          const isInteractiveCell = isPremiumPlannable || isLockedPlannable;
          const isPreviewCell = isPremiumPlannable && previewDates.has(day.date);
          const adHocLog = !existingPlan ? adHocLogByDate.get(day.date) : undefined;

          return (
            <div
              key={day.date}
              onPointerDown={
                isPremiumPlannable
                  ? () => {
                      setDragAnchor(day.date);
                      setDragCurrent(day.date);
                    }
                  : isLockedPlannable
                    ? () => onLockedPlanClick?.(day)
                    : undefined
              }
              onPointerEnter={isPremiumPlannable && dragAnchor ? () => setDragCurrent(day.date) : undefined}
              style={isInteractiveCell ? { touchAction: "none" } : undefined}
              className={`relative aspect-square rounded-xl border-t-2 ${isToday ? style.todayBg : style.bg} ${style.border} flex items-center justify-center transition-colors ${
                isInteractiveCell ? "cursor-pointer select-none" : ""
              } ${isPreviewCell ? "outline outline-2 outline-ivory/60" : ""}`}
            >
              {isBlockStart && (
                <span
                  className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-obsidian ring-1 ${style.border}`}
                >
                  <Icon className={`h-4 w-4 ${style.text}`} strokeWidth={2} />
                </span>
              )}
              {MoonIcon && moonHighlight && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {onMoonHighlightClick ? (
                    <button
                      type="button"
                      onClick={() => onMoonHighlightClick(day.date, moonHighlight)}
                      aria-label={`${MOON_HIGHLIGHT_LABELS[moonHighlight]} on ${day.date} — more info`}
                      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <MoonIcon
                        className={`text-gold opacity-35 ${moonHighlight === "ekadashi" ? "h-11 w-11" : "h-9 w-9"}`}
                      />
                    </button>
                  ) : (
                    <MoonIcon
                      className={`text-gold opacity-35 ${moonHighlight === "ekadashi" ? "h-11 w-11" : "h-9 w-9"}`}
                    />
                  )}
                </span>
              )}
              {isPeriodStart &&
                (isPaused && onUnpauseClick ? (
                  <button
                    type="button"
                    onClick={onUnpauseClick}
                    aria-label="Fasting is paused — tap to unpause"
                    className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ring-silver transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
                  >
                    <PausedMarkerIcon className="h-2.5 w-2.5 text-silver" />
                  </button>
                ) : onAdjustPeriod ? (
                  <button
                    type="button"
                    onClick={() => onAdjustPeriod(day.date)}
                    aria-label={`Adjust logged period start (currently ${day.date})`}
                    className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ring-coral transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                  >
                    <PeriodStartIcon className="h-2.5 w-2.5 text-coral" />
                  </button>
                ) : (
                  <span className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-obsidian ring-1 ring-coral">
                    <PeriodStartIcon className="h-2.5 w-2.5 text-coral" />
                  </span>
                ))}
              {!isPeriodStart && additionalPeriodDates?.includes(day.date) && (
                <span className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-obsidian ring-1 ring-coral/50">
                  <PeriodStartIcon className="h-2.5 w-2.5 text-coral/50" />
                </span>
              )}
              {isForecastedPeriodStart && isNextForecastedPeriodStart && onLogPeriod ? (
                <button
                  type="button"
                  onClick={() => onLogPeriod(day.date)}
                  aria-label={`Confirm period start on or before ${day.date}`}
                  className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border border-dashed border-coral bg-obsidian transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  <PeriodForecastIcon className="h-2.5 w-2.5 text-coral" strokeWidth={2} />
                </button>
              ) : (
                isForecastedPeriodStart && (
                  <span className="absolute bottom-1.5 left-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-coral bg-obsidian">
                    <PeriodForecastIcon className="h-2.5 w-2.5 text-coral" strokeWidth={2} />
                  </span>
                )
              )}
              {existingPlan &&
                (() => {
                  const markerStyle = FAST_MARKER_STYLE[existingPlan.fastType];
                  const FastIcon = markerStyle.Icon;
                  const isRealized = fastLogByPlanId.has(existingPlan.id);
                  const isPast = existingPlan.plannedDate <= (todayISO ?? existingPlan.plannedDate);
                  const isLiveTracking = existingPlan.id === activeFastPlanId;
                  const isLockedHistorical = tier === "free";
                  const ringClass = `${isRealized ? `ring-1 ${markerStyle.ring}` : `border ${markerStyle.dashed}`}${
                    isLockedHistorical ? " opacity-45 grayscale-[0.6]" : ""
                  }`;
                  if (isLiveTracking) {
                    return (
                      <span
                        aria-label={`Fasting in progress — ${existingPlan.fastType} fast on ${existingPlan.plannedDate}`}
                        className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] animate-pulse items-center justify-center rounded-full bg-obsidian ${ringClass}`}
                      >
                        <FastIcon className={`h-2.5 w-2.5 ${markerStyle.text}`} />
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        isPast ? onLogActualHours?.(existingPlan) : onEditPlan?.(existingPlan)
                      }
                      aria-label={`${isRealized ? "Logged" : "Planned"} ${existingPlan.fastType} fast on ${existingPlan.plannedDate}`}
                      className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 ${ringClass}`}
                    >
                      <FastIcon className={`h-2.5 w-2.5 ${markerStyle.text}`} />
                    </button>
                  );
                })()}
              {adHocLog &&
                (() => {
                  const markerStyle = FAST_MARKER_STYLE[adHocLog.fastType];
                  const FastIcon = markerStyle.Icon;
                  return (
                    <span
                      aria-label={`Logged ${adHocLog.fastType} fast on ${adHocLog.loggedDate}`}
                      className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-obsidian ring-1 ${markerStyle.ring}`}
                    >
                      <FastIcon className={`h-2.5 w-2.5 ${markerStyle.text}`} />
                    </span>
                  );
                })()}
              {!existingPlan && !adHocLog && refeedInfo && (
                <button
                  type="button"
                  onClick={() => onRefeedDayClick?.(day.date)}
                  aria-label={`Refeed day, following a ${refeedInfo.sourceFastType} fast — tap to learn more`}
                  className="absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ring-coral/60 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  <StopIcon className="h-2.5 w-2.5 text-coral/80" />
                </button>
              )}
              {!existingPlan && !adHocLog && !refeedInfo && occupiedInfo && (
                <button
                  type="button"
                  onClick={() => onOccupiedDayClick?.(day.date)}
                  aria-label={`${occupiedInfo.fastType} fast already running until ${occupiedInfo.endTime} — tap to learn more`}
                  className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ${FAST_MARKER_STYLE[occupiedInfo.fastType].ring} transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ivory`}
                >
                  <StopIcon className={`h-2.5 w-2.5 ${FAST_MARKER_STYLE[occupiedInfo.fastType].text}`} />
                </button>
              )}
              <span className={`font-body text-sm ${isToday ? "font-semibold" : ""} text-ivory`}>
                {dayNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhaseLegend() {
  const entries: { block: PhaseBlockName; fastingPossible: boolean }[] = [
    { block: "inhale", fastingPossible: true },
    { block: "bloom", fastingPossible: false },
    { block: "radiate", fastingPossible: true },
    { block: "exhale", fastingPossible: false },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {entries.map(({ block, fastingPossible }) => {
        const style = BLOCK_STYLES[block];
        const descriptor = fastingPossible ? "fasting possible" : "nourish";
        return (
          <div key={block} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${style.solidBg}`} />
            <span className="font-accent text-sm text-silver">
              {style.label} <span className="text-silver/60">· {descriptor}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
