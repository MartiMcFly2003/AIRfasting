"use client";

import {
  addDays,
  getWeeklyRhythmDayLabel,
  isoWeekday,
  type ISODate,
  type IsoWeekday,
  type MoonHighlightType,
  type Tier,
  type WeeklyDayLabel,
} from "@/lib/calendar";
import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import type { FastOccupiedInfo, RefeedDayInfo } from "@/lib/calendar/refeed";
import { FAST_MARKER_STYLE } from "./MonthCalendar";
import { EkadashiSparkleIcon, FullMoonIcon, NewMoonIcon } from "./MoonIcons";
import { StopIcon } from "./PhaseIcons";

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

/** No menstrual/lunar phase behind this protocol, so these reuse the app's general accent
 *  tokens (coral/silver/yellow) rather than the cycle-phase colours — deliberately a different
 *  palette from Protocols 1/2's Rise/Bloom/Radiate/Rest. Coral and yellow are used instead of
 *  coral and gold specifically because gold sits too close to coral in hue to read as a
 *  distinct colour at a glance — yellow gives real separation. Opacity is noticeably higher
 *  than Protocols 1/2's phase washes too, since a single quiet tint read as barely-there. */
const DAY_STYLES: Record<
  WeeklyDayLabel,
  { bg: string; todayBg: string; border: string; text: string; solidBg: string; glow: string; label: string }
> = {
  fasting: {
    bg: "bg-yellow/30",
    todayBg: "bg-yellow/55",
    border: "border-yellow",
    text: "text-yellow",
    solidBg: "bg-yellow",
    glow: "shadow-[0_0_10px_var(--color-yellow)]",
    label: "Support",
  },
  deep_fasting: {
    bg: "bg-coral/30",
    todayBg: "bg-coral/55",
    border: "border-coral",
    text: "text-coral",
    solidBg: "bg-coral",
    glow: "shadow-[0_0_10px_var(--color-coral)]",
    label: "Deep fast",
  },
  rest: {
    bg: "bg-silver/25",
    todayBg: "bg-silver/50",
    border: "border-silver",
    text: "text-silver",
    solidBg: "bg-silver",
    glow: "shadow-[0_0_10px_var(--color-silver)]",
    label: "Nourish",
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

/** Plain style used for every day of a week that hasn't had its deep-fast day defined yet —
 *  matches DAY_STYLES.unplanned regardless of what the underlying schedule would label the
 *  day, since nothing should read as "decided" until the person actually plans something. */
const PLAIN_STYLE = DAY_STYLES.unplanned;

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
  /** Click on any day in a week whose deep-fast day hasn't been defined yet, premium only —
   *  undefined on free tier. Confirming reassigns the weekly pattern to that weekday. */
  onDefineDeepFastDay?: (date: ISODate) => void;
  /** Click on a non-deep-fast day within an already-defined week, premium only — plans a
   *  regular (shorter) fast there without touching the pattern. */
  onPlanSupportFast?: (date: ISODate) => void;
  onEditPlan?: (plan: FastPlan) => void;
  onLogActualHours?: (plan: FastPlan) => void;
  /** Free tier — shown instead of defining/planning when the gated callbacks above are absent. */
  onLockedInteraction?: () => void;
  /** Days blocked for refeeding after a 20h+ fast (see src/lib/calendar/refeed.ts). */
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
  onDefineDeepFastDay,
  onPlanSupportFast,
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

  const deepFastWeekdays: IsoWeekday[] = schedule
    ? ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).filter((d) => schedule[d] === "deep_fasting")
    : [];

  /** A week only reads as "decided" once its own deep-fast day actually has a plan — the
   *  underlying weekly pattern can already point at a weekday, but that alone shouldn't paint
   *  a week nobody has committed to yet. */
  function isWeekCommitted(date: ISODate): boolean {
    if (!schedule || deepFastWeekdays.length === 0) return false;
    const monday = addDays(date, -(isoWeekday(date) - 1));
    return deepFastWeekdays.some((weekday) => fastPlanByDate.has(addDays(monday, weekday - 1)));
  }

  function handleCellBodyClick(date: ISODate, dayLabel: WeeklyDayLabel, existingPlan: FastPlan | undefined) {
    if (existingPlan || refeedDays?.[date] || occupiedDays?.[date]) return;
    // An unfilled deep-fast slot is always open to defining, regardless of whether the week is
    // otherwise decided — this matters for 4-2-1, where the first tap fills one of the two
    // deep-fast days and the second slot (already schedule-designated, just not planned yet)
    // needs to stay reachable rather than getting stuck once the week reads as "committed".
    if (dayLabel === "deep_fasting") {
      if (onDefineDeepFastDay) onDefineDeepFastDay(date);
      else onLockedInteraction?.();
      return;
    }
    const committed = isWeekCommitted(date);
    if (!committed) {
      // Nothing chosen yet anywhere in the week — any day can become the deep-fast day.
      if (onDefineDeepFastDay) onDefineDeepFastDay(date);
      else onLockedInteraction?.();
      return;
    }
    // Once at least one deep-fast day is decided, only support days are further plannable —
    // the nourish day is deliberately not a fasting day at all.
    if (dayLabel !== "fasting") return;
    if (onPlanSupportFast) onPlanSupportFast(date);
    else onLockedInteraction?.();
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
          const committed = isWeekCommitted(date);
          const existingPlan = fastPlanByDate.get(date);
          // A deep-fast slot only reads as "decided" once it has its own plan (matters for
          // 4-2-1's second slot, which can otherwise sit unplanned in an already-committed
          // week) — every other label just follows the week's overall committed state.
          const isDecided = dayLabel === "deep_fasting" ? !!existingPlan : committed;
          const style = isDecided ? DAY_STYLES[dayLabel] : PLAIN_STYLE;
          const isToday = date === todayISO;
          const dayNumber = Number(date.slice(8, 10));
          const moonHighlight = moonHighlights?.[date];
          const MoonIcon = moonHighlight ? MOON_HIGHLIGHT_ICONS[moonHighlight] : null;

          return (
            <div
              key={date}
              onClick={() => handleCellBodyClick(date, dayLabel, existingPlan)}
              className={`relative aspect-square cursor-pointer rounded-xl border-t-2 ${isToday ? style.todayBg : style.bg} ${style.border} flex items-center justify-center transition-colors`}
            >
              {isDecided && (
                <span
                  className={`absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-accent text-[8px] uppercase tracking-wider ${style.text}`}
                >
                  {style.label}
                </span>
              )}
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
    { label: "deep_fasting", descriptor: "your chosen deep-fast day" },
    { label: "rest", descriptor: "nourish, no fasting" },
    { label: "fasting", descriptor: "gentle support days" },
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
