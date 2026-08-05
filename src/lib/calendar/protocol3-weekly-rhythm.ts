import { addDays, isoWeekday } from "./date-utils";
import type { FastPlan } from "./fast-plans";
import type { ISODate, IsoWeekday, WeeklyDayLabel } from "./types";

function mondayOf(date: ISODate): ISODate {
  return addDays(date, -(isoWeekday(date) - 1));
}

/** ISO weekdays (1-7) within `date`'s own Mon-Sun week that already have a fast plan on them —
 *  that week's deep-fast day(s), purely derived from actual plans rather than any stored
 *  pattern. Each week is independent: someone can plan just one deep-fast day some weeks and
 *  two in others, with no separate "rhythm" setting to keep in sync. */
export function deepFastingWeekdaysInWeek(date: ISODate, fastPlans: FastPlan[]): IsoWeekday[] {
  const monday = mondayOf(date);
  const plannedDates = new Set(fastPlans.map((p) => p.plannedDate));
  const weekdays: IsoWeekday[] = [];
  for (let w = 1; w <= 7; w++) {
    if (plannedDates.has(addDays(monday, w - 1))) weekdays.push(w as IsoWeekday);
  }
  return weekdays;
}

/**
 * A day's label within its own week, derived purely from that week's actual fast plans — no
 * stored weekly pattern to keep in sync. Zero deep-fast plans: everything "unplanned". One:
 * that day is the deep-fast day, the day right after it is "rest" (nourish), the other 5 are
 * "fasting" (support). Two: both are deep-fasting, the day after the LATER one is "rest", the
 * other 4 are "fasting". The rest day always follows the latest deep-fasting weekday in the
 * week, wrapping Sunday -> Monday.
 */
export function getWeeklyDayLabel(date: ISODate, fastPlans: FastPlan[]): WeeklyDayLabel {
  const deepFastingWeekdays = deepFastingWeekdaysInWeek(date, fastPlans);
  if (deepFastingWeekdays.length === 0) return "unplanned";

  const today = isoWeekday(date);
  if (deepFastingWeekdays.includes(today)) return "deep_fasting";

  const lastDeepFastingDay = Math.max(...deepFastingWeekdays) as IsoWeekday;
  const restDay = ((lastDeepFastingDay % 7) + 1) as IsoWeekday;
  if (today === restDay) return "rest";

  return "fasting";
}
