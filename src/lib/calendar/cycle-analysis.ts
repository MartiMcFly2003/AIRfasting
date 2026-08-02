import { daysBetween } from "./date-utils";
import type { ISODate } from "./types";

/** Consecutive gaps (in days) between logged period dates, oldest pair first. */
export function getCycleLengths(periodHistory: ISODate[]): number[] {
  const lengths: number[] = [];
  for (let i = 1; i < periodHistory.length; i++) {
    lengths.push(daysBetween(periodHistory[i - 1], periodHistory[i]));
  }
  return lengths;
}

export type RegularityStatus = "regular" | "irregular" | "insufficient_data" | "mixed";

export interface RegularityResult {
  status: RegularityStatus;
  averageCycleLength: number | null;
}

const REGULAR_BAND_DAYS = 3;
const IRREGULAR_RANGE_DAYS = 10;

/** Regularity of the last 3 cycles: regular if all within +/-3 days of their average, irregular if the range exceeds 10 days. */
export function detectRegularity(cycleLengths: number[]): RegularityResult {
  const lastThree = cycleLengths.slice(-3);
  if (lastThree.length < 3) {
    return { status: "insufficient_data", averageCycleLength: null };
  }

  const average = lastThree.reduce((sum, n) => sum + n, 0) / lastThree.length;
  const averageCycleLength = Math.round(average);
  const withinBand = lastThree.every((n) => Math.abs(n - average) <= REGULAR_BAND_DAYS);
  if (withinBand) {
    return { status: "regular", averageCycleLength };
  }

  const range = Math.max(...lastThree) - Math.min(...lastThree);
  if (range > IRREGULAR_RANGE_DAYS) {
    return { status: "irregular", averageCycleLength };
  }

  return { status: "mixed", averageCycleLength };
}

const LATE_PERIOD_THRESHOLD_DAYS = 10;

/** True once `today` is more than 10 days past the forecasted next period (lastPeriodDate + cycleLength). */
export function detectLatePeriod(lastPeriodDate: ISODate, cycleLength: number, today: ISODate): boolean {
  return daysBetween(lastPeriodDate, today) - cycleLength > LATE_PERIOD_THRESHOLD_DAYS;
}

/** Average of the last `n` cycle gaps, or null when fewer than `n` gaps exist yet. */
export function getAverageOfLastNCycles(periodHistory: ISODate[], n = 3): number | null {
  const lengths = getCycleLengths(periodHistory);
  if (lengths.length < n) return null;
  const lastN = lengths.slice(-n);
  return Math.round(lastN.reduce((sum, x) => sum + x, 0) / n);
}

/** Average of every logged cycle gap (all-time, not a recent window) — null until at least two periods are logged. */
export function getAverageCycleLength(periodHistory: ISODate[]): number | null {
  const lengths = getCycleLengths(periodHistory);
  if (lengths.length === 0) return null;
  return Math.round(lengths.reduce((sum, n) => sum + n, 0) / lengths.length);
}
