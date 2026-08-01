import type { ISODate, IsoWeekday } from "./types";

const MS_PER_DAY = 86_400_000;

/** Parses an ISO date string to a UTC-midnight timestamp, sidestepping local-timezone/DST drift. */
export function toUtcMs(date: ISODate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function fromUtcMs(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive if `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** 1 = Monday ... 7 = Sunday (ISO 8601), unlike JS Date's 0 = Sunday. */
export function isoWeekday(date: ISODate): IsoWeekday {
  const jsDay = new Date(toUtcMs(date)).getUTCDay(); // 0 = Sunday ... 6 = Saturday
  return (jsDay === 0 ? 7 : jsDay) as IsoWeekday;
}

/** Every ISO date from `start` to `end`, inclusive. */
export function eachDate(start: ISODate, end: ISODate): ISODate[] {
  const total = daysBetween(start, end);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDays(start, i));
}

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

/** Adds `delta` months to a { year, month }, rolling over/under into adjacent years. */
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroIndexed = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroIndexed / 12), month: (((zeroIndexed % 12) + 12) % 12) + 1 };
}

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toISODate({ year, month }: YearMonth, day: number): ISODate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Inverse of `toISODate` — the { year, month } a date falls in. */
export function yearMonthOf(date: ISODate): YearMonth {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}
