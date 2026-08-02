import { eachDate, fromUtcMs, toUtcMs } from "./date-utils";
import type { FastLog, FastPlan, FastType } from "./fast-plans";
import type { ISODate } from "./types";

/** Fasts at or above this length need a recovery/refeed period before another fast starts. */
export const REFEED_THRESHOLD_HOURS = 20;
/** Dry fasts at or above this length require the in-app health disclaimer before saving. */
export const DRY_DISCLAIMER_THRESHOLD_HOURS = 24;

const MS_PER_HOUR = 3_600_000;

function parseStartTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Absolute start/end instants for a fast with a known start time and duration. */
export function computeFastWindow(
  plannedDate: ISODate,
  startTime: string,
  hours: number,
): { startMs: number; endMs: number } {
  const startMs = toUtcMs(plannedDate) + parseStartTime(startTime) * 60_000;
  return { startMs, endMs: startMs + hours * MS_PER_HOUR };
}

/** For the PlanFastDialog "Ends: <date> at <time>" preview. */
export function computeFastEnd(
  plannedDate: ISODate,
  startTime: string,
  hours: number,
): { endDate: ISODate; endTime: string } {
  const { endMs } = computeFastWindow(plannedDate, startTime, hours);
  return { endDate: fromUtcMs(endMs), endTime: new Date(endMs).toISOString().slice(11, 16) };
}

export interface RefeedDayInfo {
  /** The fast that produced this refeed window — determines whether the dry→water
   *  exception applies (only when this is "dry"). */
  sourceFastType: FastType;
  /** Last date still within the window, for display in the info dialog. */
  refeedUntil: ISODate;
}

interface RefeedWindow {
  /** Refeed starts the instant the fast ends — no gap. */
  startMs: number;
  endMs: number;
  fastType: FastType;
}

function refeedWindowFromFastEnd(fastEndMs: number, durationHours: number, fastType: FastType): RefeedWindow {
  return { startMs: fastEndMs, endMs: fastEndMs + durationHours * 2 * MS_PER_HOUR, fastType };
}

function planRefeedWindow(plan: FastPlan): RefeedWindow | null {
  if (!plan.startTime || plan.plannedHours === null || plan.plannedHours < REFEED_THRESHOLD_HOURS) return null;
  const { endMs } = computeFastWindow(plan.plannedDate, plan.startTime, plan.plannedHours);
  return refeedWindowFromFastEnd(endMs, plan.plannedHours, plan.fastType);
}

/** Priority for deriving a log's window: genuine start/end timestamps (live-tracked fasts)
 *  first, then the linked plan's start time + the log's actual duration (more accurate than
 *  the plan's target, since it reflects what really happened). Manually-logged fasts against a
 *  plan with no startTime have no anchor and are skipped — same "legacy, skip" treatment as
 *  planRefeedWindow gives an incomplete plan. */
function logRefeedWindow(log: FastLog, plans: FastPlan[]): RefeedWindow | null {
  if (log.startedAt && log.endedAt) {
    const startMs = Date.parse(log.startedAt);
    const endMs = Date.parse(log.endedAt);
    const durationHours = (endMs - startMs) / MS_PER_HOUR;
    if (durationHours < REFEED_THRESHOLD_HOURS) return null;
    return refeedWindowFromFastEnd(endMs, durationHours, log.fastType);
  }

  const durationHours = log.actualMinutes / 60;
  if (durationHours < REFEED_THRESHOLD_HOURS) return null;

  const plan = log.planId ? plans.find((p) => p.id === log.planId) : undefined;
  if (plan && plan.startTime) {
    const { startMs } = computeFastWindow(plan.plannedDate, plan.startTime, 0);
    return refeedWindowFromFastEnd(startMs + log.actualMinutes * 60_000, durationHours, log.fastType);
  }

  return null;
}

/** Unions refeed windows from every plan/log with enough info to compute one, keyed by every
 *  ISODate the window touches (day-granular: a date is included if the window overlaps it at
 *  all). Where windows overlap on a date, the later-ending window wins, so `refeedUntil` always
 *  reflects the furthest-out date the user is actually still blocked through. */
export function computeRefeedDays(plans: FastPlan[], logs: FastLog[]): Record<ISODate, RefeedDayInfo> {
  const windows: RefeedWindow[] = [];
  for (const plan of plans) {
    const window = planRefeedWindow(plan);
    if (window) windows.push(window);
  }
  for (const log of logs) {
    const window = logRefeedWindow(log, plans);
    if (window) windows.push(window);
  }

  const result: Record<ISODate, RefeedDayInfo> = {};
  const chosenEndMs: Record<ISODate, number> = {};

  for (const window of windows) {
    const refeedUntil = fromUtcMs(window.endMs);
    for (const date of eachDate(fromUtcMs(window.startMs), refeedUntil)) {
      if (chosenEndMs[date] === undefined || window.endMs > chosenEndMs[date]) {
        chosenEndMs[date] = window.endMs;
        result[date] = { sourceFastType: window.fastType, refeedUntil };
      }
    }
  }

  return result;
}
