import { addDays, daysBetween, eachDate } from "./date-utils";
import type { ISODate, PhaseBlock, PhaseBlockName, PhaseDayInfo } from "./types";

const REFERENCE_CYCLE_LENGTH = 28;
/** End-of-block cutoffs (inclusive) on the 28-day reference cycle. Exhale runs to cycleLength. */
const REFERENCE_BOUNDARIES = { inhaleEnd: 10, bloomEnd: 15, radiateEnd: 19 };

interface BlockBoundaries {
  inhaleEnd: number;
  bloomEnd: number;
  radiateEnd: number;
  exhaleEnd: number; // always equals cycleLength
}

/**
 * Scales the reference boundaries by cycleLength / 28, clamping so every block keeps at least
 * one day even for unusually short cycles (defensive — real cycles are ~21-40 days).
 */
export function getBlockBoundaries(cycleLength: number): BlockBoundaries {
  const scale = cycleLength / REFERENCE_CYCLE_LENGTH;
  const rawInhaleEnd = Math.round(REFERENCE_BOUNDARIES.inhaleEnd * scale);
  const rawBloomEnd = Math.round(REFERENCE_BOUNDARIES.bloomEnd * scale);
  const rawRadiateEnd = Math.round(REFERENCE_BOUNDARIES.radiateEnd * scale);

  const inhaleEnd = Math.max(1, Math.min(rawInhaleEnd, cycleLength - 3));
  const bloomEnd = Math.max(inhaleEnd + 1, Math.min(rawBloomEnd, cycleLength - 2));
  const radiateEnd = Math.max(bloomEnd + 1, Math.min(rawRadiateEnd, cycleLength - 1));

  return { inhaleEnd, bloomEnd, radiateEnd, exhaleEnd: cycleLength };
}

export function classifyCycleDay(
  cycleDay: number,
  boundaries: BlockBoundaries,
): { block: PhaseBlockName; fastingPossible: boolean } {
  if (cycleDay <= boundaries.inhaleEnd) return { block: "inhale", fastingPossible: true };
  if (cycleDay <= boundaries.bloomEnd) return { block: "bloom", fastingPossible: false };
  if (cycleDay <= boundaries.radiateEnd) return { block: "radiate", fastingPossible: true };
  return { block: "exhale", fastingPossible: false };
}

/** 1-indexed day within the cycle, wrapping in both directions around `cycleStartDate`. */
export function getCycleDay(
  date: ISODate,
  cycleStartDate: ISODate,
  cycleLength: number,
): number {
  const diff = daysBetween(cycleStartDate, date);
  const wrapped = ((diff % cycleLength) + cycleLength) % cycleLength;
  return wrapped + 1;
}

/**
 * Protocol 1 — Menstrual track. `cycleStartDate` is the user's last logged period date
 * (Day 1). Recalculating after a new period log is just calling this again with the new date.
 */
export function getMenstrualDayInfo(
  date: ISODate,
  cycleStartDate: ISODate,
  cycleLength = REFERENCE_CYCLE_LENGTH,
): PhaseDayInfo {
  const cycleDay = getCycleDay(date, cycleStartDate, cycleLength);
  const { block, fastingPossible } = classifyCycleDay(cycleDay, getBlockBoundaries(cycleLength));
  return { date, block, cycleDay, fastingPossible };
}

/** Coloured bands for the calendar view: consecutive same-block days merged into one entry. */
export function getMenstrualPhaseBlocks(
  rangeStart: ISODate,
  rangeEnd: ISODate,
  cycleStartDate: ISODate,
  cycleLength = REFERENCE_CYCLE_LENGTH,
): PhaseBlock[] {
  const days = eachDate(rangeStart, rangeEnd).map((date) =>
    getMenstrualDayInfo(date, cycleStartDate, cycleLength),
  );

  const blocks: PhaseBlock[] = [];
  for (const day of days) {
    const last = blocks[blocks.length - 1];
    if (last && last.block === day.block && last.endDate === addDays(day.date, -1)) {
      last.endDate = day.date;
    } else {
      blocks.push({
        block: day.block,
        startDate: day.date,
        endDate: day.date,
        fastingPossible: day.fastingPossible,
      });
    }
  }
  return blocks;
}
