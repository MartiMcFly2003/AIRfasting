import { fromUtcMs, toUtcMs } from "./date-utils";
import type { ISODate } from "./types";

/** Average synodic month (new moon to new moon), in days. */
export const SYNODIC_MONTH_DAYS = 29.530588853;

/** A known reference new moon (2000-01-06 18:14 UTC), used to project all others via the synodic period. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

const MS_PER_DAY = 86_400_000;

/**
 * Most recent new moon at or before `date`, truncated to a calendar date (UTC).
 * Accurate to within a day for this app's purposes — not a substitute for a precision
 * ephemeris, but sufficient for anchoring Protocol 2's block cycle.
 */
export function getMostRecentNewMoon(date: ISODate): ISODate {
  const dateMs = toUtcMs(date) + MS_PER_DAY - 1; // include all of `date` itself
  const daysSinceReference = (dateMs - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
  const cyclesSinceReference = Math.floor(daysSinceReference / SYNODIC_MONTH_DAYS);
  const newMoonMs = REFERENCE_NEW_MOON_MS + cyclesSinceReference * SYNODIC_MONTH_DAYS * MS_PER_DAY;
  return fromUtcMs(newMoonMs);
}
