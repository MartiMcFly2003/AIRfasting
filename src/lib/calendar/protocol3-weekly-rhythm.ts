import { isoWeekday } from "./date-utils";
import type { ISODate, IsoWeekday, WeeklyDayLabel, WeeklyRhythm } from "./types";

const RHYTHM_REQUIREMENTS: Record<WeeklyRhythm, { fasting: number; deepFasting: number }> = {
  "5-1-1": { fasting: 5, deepFasting: 1 },
  "4-2-1": { fasting: 4, deepFasting: 2 },
};

export interface WeeklyRhythmSelection {
  rhythm: WeeklyRhythm;
  /** Regular fasting-possible days, ISO weekday numbering (1 = Monday ... 7 = Sunday). */
  fastingDays: IsoWeekday[];
  /** The deeper-fasting day(s) within the week — disjoint from fastingDays. */
  deepFastingDays: IsoWeekday[];
}

/**
 * Builds a Mon-Sun schedule from the user's chosen days: validates the counts match the
 * rhythm (5-1-1 or 4-2-1), then auto-places the rest/nourish day immediately after the
 * latest deep-fasting (Radiate) day in the Mon-Sun week (wrapping Sunday -> Monday) — rest
 * always follows the deep fast specifically, not just whichever chosen day falls latest.
 */
export function getWeeklyRhythmSchedule(
  selection: WeeklyRhythmSelection,
): Record<IsoWeekday, WeeklyDayLabel> {
  const requirement = RHYTHM_REQUIREMENTS[selection.rhythm];
  const overlap = selection.fastingDays.filter((d) => selection.deepFastingDays.includes(d));
  if (overlap.length > 0) {
    throw new Error(`A day can't be both fasting and deep-fasting: ${overlap.join(", ")}`);
  }
  if (selection.fastingDays.length !== requirement.fasting) {
    throw new Error(
      `${selection.rhythm} requires exactly ${requirement.fasting} fasting day(s), got ${selection.fastingDays.length}`,
    );
  }
  if (selection.deepFastingDays.length !== requirement.deepFasting) {
    throw new Error(
      `${selection.rhythm} requires exactly ${requirement.deepFasting} deep-fasting day(s), got ${selection.deepFastingDays.length}`,
    );
  }

  const schedule = { 1: "unplanned", 2: "unplanned", 3: "unplanned", 4: "unplanned", 5: "unplanned", 6: "unplanned", 7: "unplanned" } as Record<IsoWeekday, WeeklyDayLabel>;
  for (const day of selection.fastingDays) schedule[day] = "fasting";
  for (const day of selection.deepFastingDays) schedule[day] = "deep_fasting";

  const lastDeepFastingDay = Math.max(...selection.deepFastingDays) as IsoWeekday;
  const restDay = ((lastDeepFastingDay % 7) + 1) as IsoWeekday;
  schedule[restDay] = "rest";

  return schedule;
}

export function getWeeklyRhythmDayLabel(
  date: ISODate,
  schedule: Record<IsoWeekday, WeeklyDayLabel>,
): WeeklyDayLabel {
  return schedule[isoWeekday(date)];
}

/** Fixed free-tier weekday assignments — not user-editable. Matches the product spec exactly:
 *  5-1-1 is Mon-Fri Rise / Sat Radiate / Sun Rest (auto-placed); 4-2-1 is Mon-Thu Rise /
 *  Fri-Sat Radiate / Sun Rest (auto-placed after the LAST Radiate day). Both rhythms are
 *  available to free users — it's the per-weekday customization that's premium-only. */
export const FIXED_WEEKLY_RHYTHM_PATTERNS: Record<
  WeeklyRhythm,
  Pick<WeeklyRhythmSelection, "fastingDays" | "deepFastingDays">
> = {
  "5-1-1": { fastingDays: [1, 2, 3, 4, 5], deepFastingDays: [6] },
  "4-2-1": { fastingDays: [1, 2, 3, 4], deepFastingDays: [5, 6] },
};

const ALL_ISO_WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Premium's "move the Radiate icon" interaction: reassigns which weekday is Radiate/deep-
 * fasting, then re-derives fasting/rest from scratch so the schedule is always internally
 * consistent (rest is always exactly the day after the new latest Radiate day). A naive
 * from/to swap of the existing fastingDays array can leave the auto-placed rest day
 * colliding with a remaining fasting day — recomputing avoids that class of bug entirely.
 *
 * No-ops (returns `selection` unchanged) on invalid moves: dropping onto another Radiate
 * day, dropping onto itself, or a resulting arrangement whose auto-placed rest day would
 * still collide with a remaining Radiate day (a pre-existing edge case in the wraparound
 * rest-day rule — defensively guarded here rather than fixed, out of scope for this pass).
 */
export function moveDeepFastingDay(
  selection: WeeklyRhythmSelection,
  fromDay: IsoWeekday,
  toDay: IsoWeekday,
): WeeklyRhythmSelection {
  if (fromDay === toDay) return selection;
  if (!selection.deepFastingDays.includes(fromDay)) return selection;
  if (selection.deepFastingDays.includes(toDay)) return selection;

  const deepFastingDays = selection.deepFastingDays.map((d) => (d === fromDay ? toDay : d));
  const restDay = ((Math.max(...deepFastingDays) % 7) + 1) as IsoWeekday;
  if (deepFastingDays.includes(restDay)) return selection;

  const fastingDays = ALL_ISO_WEEKDAYS.filter((d) => !deepFastingDays.includes(d) && d !== restDay);
  return { ...selection, fastingDays, deepFastingDays };
}
