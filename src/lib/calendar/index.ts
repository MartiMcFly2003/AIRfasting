export * from "./types";
export * from "./track";
export {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  eachDate,
  isoWeekday,
  toISODate,
  yearMonthOf,
} from "./date-utils";
export type { YearMonth } from "./date-utils";
export {
  getMenstrualDayInfo,
  getMenstrualPhaseBlocks,
  getBlockBoundaries,
  classifyCycleDay,
  getCycleDay,
} from "./protocol1-menstrual";
export { getMoonSyncDayInfo, getMoonSyncPhaseBlocks } from "./protocol2-moon-sync";
export { getMostRecentNewMoon, SYNODIC_MONTH_DAYS } from "./moon";
export { getWeeklyDayLabel, deepFastingWeekdaysInWeek } from "./protocol3-weekly-rhythm";

import { getMenstrualDayInfo, getMenstrualPhaseBlocks } from "./protocol1-menstrual";
import { getMoonSyncDayInfo, getMoonSyncPhaseBlocks } from "./protocol2-moon-sync";
import type { ISODate, PhaseBlock, PhaseDayInfo, Track } from "./types";

/**
 * Which phase-block protocol each track uses. "gentle_starter" (cycle status = "not sure")
 * uses Protocol 2 — a body-agnostic lunar rhythm rather than guessing at a menstrual cycle
 * we have no data for (product decision, 2026-07-12).
 */
export const TRACK_PROTOCOL: Record<Track, "protocol1" | "protocol2" | "protocol3"> = {
  menstrual: "protocol1",
  moon_sync: "protocol2",
  moon_sync_bridging: "protocol2",
  gentle_starter: "protocol2",
  weekly_rhythm: "protocol3",
  no_cycle: "protocol3",
};

type BandedTrack = Exclude<Track, "weekly_rhythm" | "no_cycle">;

interface MenstrualCycleParams {
  cycleStartDate: ISODate;
  cycleLength: number;
}

/**
 * Unified accessor for the two colour-band protocols (1 & 2). Weekly rhythm (Protocol 3)
 * isn't covered here — it has no bands; its day labels come from getWeeklyDayLabel instead,
 * derived directly from that week's fast plans.
 */
export function getPhaseDayInfo(
  date: ISODate,
  track: BandedTrack,
  menstrualCycle?: MenstrualCycleParams,
): PhaseDayInfo {
  if (track === "menstrual") {
    if (!menstrualCycle) {
      throw new Error("menstrual track requires cycleStartDate and cycleLength");
    }
    return getMenstrualDayInfo(date, menstrualCycle.cycleStartDate, menstrualCycle.cycleLength);
  }
  return getMoonSyncDayInfo(date);
}

export function getPhaseBlocksForRange(
  rangeStart: ISODate,
  rangeEnd: ISODate,
  track: BandedTrack,
  menstrualCycle?: MenstrualCycleParams,
): PhaseBlock[] {
  if (track === "menstrual") {
    if (!menstrualCycle) {
      throw new Error("menstrual track requires cycleStartDate and cycleLength");
    }
    return getMenstrualPhaseBlocks(
      rangeStart,
      rangeEnd,
      menstrualCycle.cycleStartDate,
      menstrualCycle.cycleLength,
    );
  }
  return getMoonSyncPhaseBlocks(rangeStart, rangeEnd);
}
