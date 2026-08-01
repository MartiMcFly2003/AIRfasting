import * as SunCalc from "suncalc";
import { addDays, daysInMonth, eachDate, toISODate, type YearMonth } from "./date-utils";
import { getTithiNumberAt } from "./ephemeris";
import type { ISODate, MoonHighlightType } from "./types";

const NEW_MOON_TITHI = 30; // Amavasya
const FULL_MOON_TITHI = 15; // Purnima
const EKADASHI_TITHIS = [11, 26]; // 11th of each paksha (Shukla, Krishna)

interface TithiSample {
  date: ISODate;
  tithiNumber: number;
}

async function sampleTithiSequence(
  rangeStart: ISODate,
  rangeEnd: ISODate,
  lat: number,
  lon: number,
): Promise<TithiSample[]> {
  // Padded so a highlight landing right at the range edge still has a neighbour to compare
  // against for Vridhi (spans two sunrises) / Kshaya (touches no sunrise) resolution.
  const dates = eachDate(addDays(rangeStart, -2), addDays(rangeEnd, 2));

  const samples: TithiSample[] = [];
  for (const date of dates) {
    const noon = new Date(`${date}T12:00:00Z`);
    const sunrise = SunCalc.getTimes(noon, lat, lon).sunrise;
    if (!sunrise || Number.isNaN(sunrise.getTime())) continue;
    samples.push({ date, tithiNumber: await getTithiNumberAt(sunrise) });
  }
  return samples;
}

/**
 * Resolves observance dates for a target tithi within a sunrise-sampled sequence, per
 * traditional Panchang convention (validated against drikpanchang.com across 15 real
 * cases spanning multiple locations — 14/15 exact match; the one miss was a documented
 * edge case where two independent Swiss-Ephemeris-based calculations agreed with each
 * other and diverged from drikpanchang, suggesting a convention we don't have visibility
 * into rather than a fixable bug):
 *
 * - Simple: tithi touches exactly one sunrise -> that day.
 * - Vridhi: tithi spans two consecutive sunrises -> the *later* day.
 * - Kshaya: tithi touches no sunrise at all (skipped over between two sunrises) -> the day
 *   whose sunrise carries the *prior* tithi (the day the target tithi begins).
 */
function resolveTithiDates(samples: TithiSample[], targetTithi: number): ISODate[] {
  const priorTithi = targetTithi === 1 ? 30 : targetTithi - 1;
  const nextTithi = targetTithi === 30 ? 1 : targetTithi + 1;
  const results: ISODate[] = [];

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].tithiNumber !== targetTithi) continue;
    if (i > 0 && samples[i - 1].tithiNumber === targetTithi) continue; // already counted below
    const isVridhi = i + 1 < samples.length && samples[i + 1].tithiNumber === targetTithi;
    results.push(isVridhi ? samples[i + 1].date : samples[i].date);
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const skippedOver = samples[i].tithiNumber === priorTithi && samples[i + 1].tithiNumber === nextTithi;
    if (skippedOver) results.push(samples[i].date);
  }

  return results;
}

/** Computes New Moon, Full Moon, and Ekadashi highlights for every day in [rangeStart, rangeEnd]. */
export async function getMoonHighlightsForRange(
  rangeStart: ISODate,
  rangeEnd: ISODate,
  lat: number,
  lon: number,
): Promise<Partial<Record<ISODate, MoonHighlightType>>> {
  const samples = await sampleTithiSequence(rangeStart, rangeEnd, lat, lon);
  const inRange = (date: ISODate) => date >= rangeStart && date <= rangeEnd;

  const highlights: Partial<Record<ISODate, MoonHighlightType>> = {};
  const assign = (dates: ISODate[], type: MoonHighlightType) => {
    for (const date of dates) if (inRange(date)) highlights[date] = type;
  };

  assign(resolveTithiDates(samples, NEW_MOON_TITHI), "new_moon");
  assign(resolveTithiDates(samples, FULL_MOON_TITHI), "full_moon");
  for (const tithi of EKADASHI_TITHIS) assign(resolveTithiDates(samples, tithi), "ekadashi");

  return highlights;
}

export async function getMoonHighlightsForMonth(
  yearMonth: YearMonth,
  lat: number,
  lon: number,
): Promise<Partial<Record<ISODate, MoonHighlightType>>> {
  const start = toISODate(yearMonth, 1);
  const end = toISODate(yearMonth, daysInMonth(yearMonth));
  return getMoonHighlightsForRange(start, end, lat, lon);
}
