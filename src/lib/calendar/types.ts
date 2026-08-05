/** ISO calendar date, e.g. "2026-07-10". No time component — phase blocks are day-granular. */
export type ISODate = string;

export type Track =
  | "menstrual"
  | "moon_sync"
  | "moon_sync_bridging"
  | "weekly_rhythm"
  | "no_cycle"
  | "gentle_starter";

/** Protocol 1 (menstrual) and Protocol 2 (moon-sync) share this four-block structure. */
export type PhaseBlockName = "inhale" | "bloom" | "radiate" | "exhale";

export interface PhaseDayInfo {
  date: ISODate;
  block: PhaseBlockName;
  /** 1-indexed day within the reference cycle (wraps at cycleLength). */
  cycleDay: number;
  fastingPossible: boolean;
}

/** A contiguous run of days sharing the same block — the coloured band shown on the calendar. */
export interface PhaseBlock {
  block: PhaseBlockName;
  startDate: ISODate;
  endDate: ISODate;
  fastingPossible: boolean;
}

/** Protocol 3 (weekly rhythm) day types. Distinct from PhaseBlockName — no colour bands, per-day only. */
export type WeeklyDayLabel = "fasting" | "deep_fasting" | "rest" | "unplanned";

/** ISO weekday numbering: 1 = Monday ... 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Informational lunar-calendar overlays — independent of phase-block or period state. */
export type MoonHighlightType = "new_moon" | "full_moon" | "ekadashi";

/** MOCK subscription tier — no real Stripe billing exists yet. Same spirit as `Track`: a
 *  temporary stand-in until real billing/auth exist. */
export type Tier = "free" | "premium";
