import { getMostRecentNewMoon } from "./moon";
import { getMenstrualDayInfo, getMenstrualPhaseBlocks } from "./protocol1-menstrual";
import type { ISODate, PhaseBlock, PhaseDayInfo } from "./types";

/** Synodic month rounded to a whole day, so block boundaries land on clean calendar days. */
const MOON_CYCLE_LENGTH = 30;

/**
 * Protocol 2 — Moon-sync track (irregular cycles / perimenopause). Same four-block
 * structure and colours as Protocol 1, but Day 1 is the most recent New Moon rather than
 * a logged period date.
 *
 * Note: the brief's "any body-signal flag → suggest switching to rest days" rule isn't
 * implemented here — it depends on a body-signal data model that doesn't exist yet in the
 * schema, so it's a behavioural/UI concern layered on top of this once that's designed.
 */
export function getMoonSyncDayInfo(date: ISODate): PhaseDayInfo {
  const newMoon = getMostRecentNewMoon(date);
  return getMenstrualDayInfo(date, newMoon, MOON_CYCLE_LENGTH);
}

export function getMoonSyncPhaseBlocks(rangeStart: ISODate, rangeEnd: ISODate): PhaseBlock[] {
  const newMoon = getMostRecentNewMoon(rangeStart);
  return getMenstrualPhaseBlocks(rangeStart, rangeEnd, newMoon, MOON_CYCLE_LENGTH);
}
