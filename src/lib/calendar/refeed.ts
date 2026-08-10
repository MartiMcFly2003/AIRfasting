import { eachDate, fromUtcMs, toUtcMs } from "./date-utils";
import type { FastLog, FastPlan, FastType } from "./fast-plans";
import type { ISODate } from "./types";

/** Fasts at or above this length need a recovery/refeed period before another fast starts.
 *  Anything shorter (an overnight fast, say) is assumed to already coincide with normal sleep
 *  and clears on its own without a dedicated refeed window. */
export const REFEED_THRESHOLD_HOURS = 20;
/** Below this length, the refeed window is the same length as the fast itself. At or above it,
 *  the body needs proportionally longer to recover, so the window doubles. */
export const DOUBLE_REFEED_THRESHOLD_HOURS = 72;
/** Dry fasts at or above this length require the in-app health disclaimer before saving. */
export const DRY_DISCLAIMER_THRESHOLD_HOURS = 24;

const MS_PER_HOUR = 3_600_000;

function parseStartTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
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
  return { endDate: fromUtcMs(endMs), endTime: formatTime(endMs) };
}

interface FastWindow {
  startMs: number;
  endMs: number;
  fastType: FastType;
  /** Null for an ad-hoc live-tracked fast with no linked plan. */
  planId: string | null;
}

/** Priority for deriving a log's window: genuine start/end timestamps (live-tracked fasts)
 *  first, then the linked plan's start time + the log's actual duration (more accurate than
 *  the plan's target, since it reflects what really happened). Manually-logged fasts against a
 *  plan with no startTime have no anchor and are skipped. */
function logWindow(log: FastLog, plans: FastPlan[]): FastWindow | null {
  if (log.startedAt && log.endedAt) {
    return { startMs: Date.parse(log.startedAt), endMs: Date.parse(log.endedAt), fastType: log.fastType, planId: log.planId };
  }
  const plan = log.planId ? plans.find((p) => p.id === log.planId) : undefined;
  if (plan && plan.startTime) {
    const { startMs } = computeFastWindow(plan.plannedDate, plan.startTime, 0);
    return { startMs, endMs: startMs + log.actualMinutes * 60_000, fastType: log.fastType, planId: log.planId };
  }
  return null;
}

function planWindow(plan: FastPlan): FastWindow | null {
  if (!plan.startTime || plan.plannedHours === null) return null;
  const { startMs, endMs } = computeFastWindow(plan.plannedDate, plan.startTime, plan.plannedHours);
  return { startMs, endMs, fastType: plan.fastType, planId: plan.id };
}

/** Every plan/log with enough info to compute a real start/end instant — planned or actual,
 *  the shared basis for both computeFastOccupiedDays and computeRefeedDays below. */
function collectWindows(plans: FastPlan[], logs: FastLog[]): FastWindow[] {
  const windows: FastWindow[] = [];
  for (const plan of plans) {
    const window = planWindow(plan);
    if (window) windows.push(window);
  }
  for (const log of logs) {
    const window = logWindow(log, plans);
    if (window) windows.push(window);
  }
  return windows;
}

export interface FastOccupiedInfo {
  fastType: FastType;
  /** The date the fast's own marker is rendered on. */
  startDate: ISODate;
  endDate: ISODate;
  endTime: string;
  /** Null for an ad-hoc live-tracked fast with no linked plan — nothing to offer an "adjust" CTA for. */
  planId: string | null;
}

/** Every date a fast is still running through, *other than* its own start date (which already
 *  has its own marker) — i.e. the tail of any fast that crosses a calendar-day boundary,
 *  regardless of duration or the refeed threshold. A day in this map can't be tapped to start a
 *  new fast: something is already defined to still be running (or to have ended) on it. */
export function computeFastOccupiedDays(plans: FastPlan[], logs: FastLog[]): Record<ISODate, FastOccupiedInfo> {
  const result: Record<ISODate, FastOccupiedInfo> = {};
  const chosenEndMs: Record<ISODate, number> = {};

  for (const window of collectWindows(plans, logs)) {
    const startDate = fromUtcMs(window.startMs);
    const endDate = fromUtcMs(window.endMs);
    if (endDate === startDate) continue;

    for (const date of eachDate(startDate, endDate)) {
      if (date === startDate) continue;
      if (chosenEndMs[date] === undefined || window.endMs > chosenEndMs[date]) {
        chosenEndMs[date] = window.endMs;
        result[date] = { fastType: window.fastType, startDate, endDate, endTime: formatTime(window.endMs), planId: window.planId };
      }
    }
  }

  return result;
}

export interface RefeedDayInfo {
  /** The fast that produced this refeed window — determines whether the dry→water
   *  exception applies (only when this is "dry"). */
  sourceFastType: FastType;
  /** Last date still within the window, for display in the info dialog. */
  refeedUntil: ISODate;
  /** The exact date/time the source fast actually ended. When a date in this map equals
   *  sourceFastEndDate, part of that calendar day is still the fast's own tail (see
   *  computeFastOccupiedDays) — the info dialog uses this to say so precisely, and the
   *  dry→water exception uses sourceFastEndTime as the earliest allowed start time that day. */
  sourceFastEndDate: ISODate;
  sourceFastEndTime: string;
  planId: string | null;
}

/** Unions refeed windows from every plan/log with enough info to compute one, keyed by every
 *  ISODate the window touches (day-granular: a date is included if the window overlaps it at
 *  all). Where windows overlap on a date, the later-ending window wins, so `refeedUntil` always
 *  reflects the furthest-out date the user is actually still blocked through. */
export function computeRefeedDays(plans: FastPlan[], logs: FastLog[]): Record<ISODate, RefeedDayInfo> {
  const result: Record<ISODate, RefeedDayInfo> = {};
  const chosenEndMs: Record<ISODate, number> = {};

  for (const window of collectWindows(plans, logs)) {
    const durationHours = (window.endMs - window.startMs) / MS_PER_HOUR;
    if (durationHours < REFEED_THRESHOLD_HOURS) continue;

    const refeedMultiplier = durationHours >= DOUBLE_REFEED_THRESHOLD_HOURS ? 2 : 1;
    const refeedEndMs = window.endMs + durationHours * refeedMultiplier * MS_PER_HOUR;
    const refeedUntil = fromUtcMs(refeedEndMs);
    for (const date of eachDate(fromUtcMs(window.endMs), refeedUntil)) {
      if (chosenEndMs[date] === undefined || refeedEndMs > chosenEndMs[date]) {
        chosenEndMs[date] = refeedEndMs;
        result[date] = {
          sourceFastType: window.fastType,
          refeedUntil,
          sourceFastEndDate: fromUtcMs(window.endMs),
          sourceFastEndTime: formatTime(window.endMs),
          planId: window.planId,
        };
      }
    }
  }

  return result;
}
