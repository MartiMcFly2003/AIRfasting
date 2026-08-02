"use client";

import { useState } from "react";
import {
  getWeeklyRhythmDayLabel,
  isoWeekday,
  type ISODate,
  type IsoWeekday,
  type MoonHighlightType,
  type PhaseBlockName,
  type Tier,
  type WeeklyDayLabel,
} from "@/lib/calendar";
import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import type { FastOccupiedInfo, RefeedDayInfo } from "@/lib/calendar/refeed";
import { FAST_MARKER_STYLE } from "./MonthCalendar";
import { EkadashiSparkleIcon, FullMoonIcon, NewMoonIcon } from "./MoonIcons";
import { PHASE_ICONS, StopIcon } from "./PhaseIcons";

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

/** No "Bloom" in Protocol 3 — only Rise/Radiate/Rest. */
const LABEL_TO_PHASE_ICON: Record<Exclude<WeeklyDayLabel, "unplanned">, PhaseBlockName> = {
  fasting: "inhale",
  deep_fasting: "radiate",
  rest: "exhale",
};

const DAY_STYLES: Record<
  WeeklyDayLabel,
  { bg: string; todayBg: string; border: string; text: string; solidBg: string; glow: string; label: string }
> = {
  fasting: {
    bg: "bg-phase-inhale/15",
    todayBg: "bg-phase-inhale/45",
    border: "border-phase-inhale",
    text: "text-phase-inhale",
    solidBg: "bg-phase-inhale",
    glow: "shadow-[0_0_10px_var(--color-phase-inhale)]",
    label: "Rise",
  },
  deep_fasting: {
    bg: "bg-phase-radiate/15",
    todayBg: "bg-phase-radiate/45",
    border: "border-phase-radiate",
    text: "text-phase-radiate",
    solidBg: "bg-phase-radiate",
    glow: "shadow-[0_0_10px_var(--color-phase-radiate)]",
    label: "Radiate",
  },
  rest: {
    bg: "bg-phase-exhale/15",
    todayBg: "bg-phase-exhale/45",
    border: "border-phase-exhale",
    text: "text-phase-exhale",
    solidBg: "bg-phase-exhale",
    glow: "shadow-[0_0_10px_var(--color-phase-exhale)]",
    label: "Rest",
  },
  unplanned: {
    bg: "bg-ivory/5",
    todayBg: "bg-ivory/20",
    border: "border-ivory/10",
    text: "text-ivory/60",
    solidBg: "bg-ivory/40",
    glow: "shadow-[0_0_10px_theme(colors.ivory/40%)]",
    label: "Unplanned",
  },
};

export interface WeeklyRhythmCalendarProps {
  year: number;
  /** 1-12 */
  month: number;
  days: ISODate[];
  schedule: Record<IsoWeekday, WeeklyDayLabel> | null;
  todayISO?: string;
  moonHighlights?: Partial<Record<ISODate, MoonHighlightType>>;
  onMoonHighlightClick?: (date: ISODate, type: MoonHighlightType) => void;
  fastPlans?: FastPlan[];
  fastLogs?: FastLog[];
  /** Committed icon-move, premium only — undefined on free tier. */
  onMoveRadiateDay?: (fromDay: IsoWeekday, toDay: IsoWeekday) => void;
  /** Click on a Radiate day with no existing plan, premium only — undefined on free tier. */
  onPlanRadiateDay?: (date: ISODate) => void;
  onEditPlan?: (plan: FastPlan) => void;
  onLogActualHours?: (plan: FastPlan) => void;
  /** Free tier — shown instead of arming/planning when the gated callbacks above are absent. */
  onLockedInteraction?: () => void;
  /** Days blocked for refeeding after a 20h+ fast (see src/lib/calendar/refeed.ts). Excluded
   *  from onPlanRadiateDay entirely — the stop-icon marker is the only way back into planning
   *  (via the dry→water exception). */
  refeedDays?: Record<ISODate, RefeedDayInfo>;
  onRefeedDayClick?: (date: ISODate) => void;
  /** Days still occupied by an earlier fast's tail — a date already in refeedDays (the source
   *  fast's own end date) renders as a refeed marker instead. */
  occupiedDays?: Record<ISODate, FastOccupiedInfo>;
  onOccupiedDayClick?: (date: ISODate) => void;
  activeFastPlanId?: string | null;
  /** Free tier can't create fastPlans at all, so any existing plan marker rendered under free
   *  tier is by definition leftover trial/premium data — dimmed as a reactivation lever. */
  tier: Tier;
}

export function WeeklyRhythmCalendar({
  year,
  month,
  days,
  schedule,
  todayISO,
  moonHighlights,
  onMoonHighlightClick,
  fastPlans,
  fastLogs,
  onMoveRadiateDay,
  onPlanRadiateDay,
  onEditPlan,
  onLogActualHours,
  onLockedInteraction,
  refeedDays,
  onRefeedDayClick,
  occupiedDays,
  onOccupiedDayClick,
  activeFastPlanId,
  tier,
}: WeeklyRhythmCalendarProps) {
  const [armedRadiateDay, setArmedRadiateDay] = useState<IsoWeekday | null>(null);

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const jsWeekday = firstOfMonth.getUTCDay();
  const leadingBlanks = jsWeekday === 0 ? 6 : jsWeekday - 1;

  const cells: (ISODate | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const fastPlanByDate = new Map<ISODate, FastPlan>();
  for (const plan of fastPlans ?? []) fastPlanByDate.set(plan.plannedDate, plan);
  const fastLogByPlanId = new Map<string, FastLog>();
  for (const log of fastLogs ?? []) if (log.planId) fastLogByPlanId.set(log.planId, log);
  const adHocLogByDate = new Map<ISODate, FastLog>();
  for (const log of fastLogs ?? []) if (!log.planId) adHocLogByDate.set(log.loggedDate, log);

  function handleRadiateBadgeClick(weekday: IsoWeekday) {
    if (!onMoveRadiateDay) {
      onLockedInteraction?.();
      return;
    }
    setArmedRadiateDay((current) => (current === weekday ? null : weekday));
  }

  function handleCellBodyClick(date: ISODate, dayLabel: WeeklyDayLabel, existingPlan: FastPlan | undefined) {
    if (armedRadiateDay !== null) {
      if (onMoveRadiateDay) onMoveRadiateDay(armedRadiateDay, isoWeekday(date));
      setArmedRadiateDay(null);
      return;
    }
    if (dayLabel !== "deep_fasting" || existingPlan || refeedDays?.[date] || occupiedDays?.[date]) return;
    if (onPlanRadiateDay) {
      onPlanRadiateDay(date);
    } else {
      onLockedInteraction?.();
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center font-accent text-xs uppercase tracking-wider text-silver">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;

          const dayLabel: WeeklyDayLabel = schedule ? getWeeklyRhythmDayLabel(date, schedule) : "unplanned";
          const style = DAY_STYLES[dayLabel];
          const isToday = date === todayISO;
          const dayNumber = Number(date.slice(8, 10));
          const moonHighlight = moonHighlights?.[date];
          const MoonIcon = moonHighlight ? MOON_HIGHLIGHT_ICONS[moonHighlight] : null;
          const Icon = dayLabel !== "unplanned" ? PHASE_ICONS[LABEL_TO_PHASE_ICON[dayLabel]] : null;
          const weekday = isoWeekday(date);
          const isArmedBadge = dayLabel === "deep_fasting" && armedRadiateDay === weekday;
          const existingPlan = fastPlanByDate.get(date);
          const isDropTarget = armedRadiateDay !== null;

          return (
            <div
              key={date}
              onClick={() => handleCellBodyClick(date, dayLabel, existingPlan)}
              className={`relative aspect-square rounded-xl border-t-2 ${isToday ? style.todayBg : style.bg} ${style.border} flex items-center justify-center transition-colors ${
                isDropTarget ? "cursor-pointer outline outline-2 outline-ivory/30" : ""
              }`}
            >
              {Icon &&
                (dayLabel === "deep_fasting" ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRadiateBadgeClick(weekday);
                    }}
                    aria-pressed={isArmedBadge}
                    aria-label={`${isArmedBadge ? "Stop moving" : "Move"} the Radiate day${!onMoveRadiateDay ? " — Premium feature" : ""}`}
                    className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ivory ${
                      isArmedBadge ? style.solidBg : `bg-obsidian ring-1 ${style.border} ${onMoveRadiateDay ? "" : "opacity-60"}`
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isArmedBadge ? "text-obsidian" : style.text}`} strokeWidth={2} />
                  </button>
                ) : (
                  <span
                    className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-obsidian ring-1 ${style.border}`}
                  >
                    <Icon className={`h-4 w-4 ${style.text}`} strokeWidth={2} />
                  </span>
                ))}
              {MoonIcon && moonHighlight && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {onMoonHighlightClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoonHighlightClick(date, moonHighlight);
                      }}
                      aria-label={`${MOON_HIGHLIGHT_LABELS[moonHighlight]} on ${date} — more info`}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPast) onLogActualHours?.(existingPlan);
                        else onEditPlan?.(existingPlan);
                      }}
                      aria-label={`${isRealized ? "Logged" : "Planned"} ${existingPlan.fastType} fast on ${existingPlan.plannedDate}`}
                      className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 ${ringClass}`}
                    >
                      <FastIcon className={`h-2.5 w-2.5 ${markerStyle.text}`} />
                    </button>
                  );
                })()}
              {!existingPlan &&
                adHocLogByDate.has(date) &&
                (() => {
                  const log = adHocLogByDate.get(date)!;
                  const markerStyle = FAST_MARKER_STYLE[log.fastType];
                  const FastIcon = markerStyle.Icon;
                  return (
                    <span
                      aria-label={`Logged ${log.fastType} fast on ${log.loggedDate}`}
                      className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-obsidian ring-1 ${markerStyle.ring}`}
                    >
                      <FastIcon className={`h-2.5 w-2.5 ${markerStyle.text}`} />
                    </span>
                  );
                })()}
              {!existingPlan && !adHocLogByDate.has(date) && refeedDays?.[date] && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefeedDayClick?.(date);
                  }}
                  aria-label={`Refeed day, following a ${refeedDays[date].sourceFastType} fast — tap to learn more`}
                  className="absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ring-coral/60 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  <StopIcon className="h-2.5 w-2.5 text-coral/80" />
                </button>
              )}
              {!existingPlan && !adHocLogByDate.has(date) && !refeedDays?.[date] && occupiedDays?.[date] && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOccupiedDayClick?.(date);
                  }}
                  aria-label={`${occupiedDays[date].fastType} fast already running until ${occupiedDays[date].endTime} — tap to learn more`}
                  className={`absolute bottom-1.5 right-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-obsidian ring-1 ${FAST_MARKER_STYLE[occupiedDays[date].fastType].ring} transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ivory`}
                >
                  <StopIcon className={`h-2.5 w-2.5 ${FAST_MARKER_STYLE[occupiedDays[date].fastType].text}`} />
                </button>
              )}
              {isToday ? (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${style.solidBg} font-body text-sm font-semibold text-obsidian ring-2 ring-ivory/50 ${style.glow}`}
                >
                  {dayNumber}
                </span>
              ) : (
                <span className="font-body text-sm text-ivory">{dayNumber}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeeklyRhythmLegend() {
  const entries: { label: WeeklyDayLabel; descriptor: string }[] = [
    { label: "fasting", descriptor: "fasting support days" },
    { label: "deep_fasting", descriptor: "deep fasting possible" },
    { label: "rest", descriptor: "nourish" },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {entries.map(({ label, descriptor }) => {
        const style = DAY_STYLES[label];
        return (
          <div key={label} className="flex items-center gap-2">
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
