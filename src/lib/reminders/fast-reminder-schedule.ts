import { shiftIsoDate, zonedWallTimeToInstant } from "@/lib/zoned-time";

export type ReminderKind = "24h" | "1h";

export interface ReminderPlan {
  id: string;
  userId: string;
  plannedDate: string;
  /** "HH:MM:SS" — optional, since fast_plans.start_time was added after the table existed. */
  startTime: string | null;
  fastType: string;
  plannedHours: number | null;
  reminder24hSentAt: string | null;
  reminder1hSentAt: string | null;
}

export interface DueReminder {
  plan: ReminderPlan;
  kind: ReminderKind;
  dueAt: Date;
  /** Null when the plan carries no start time, so copy can avoid naming an hour it's guessing. */
  fastStartsAt: Date | null;
}

const HOUR_MS = 60 * 60 * 1000;

/** Where a plan has no start time, the day-before nudge still goes out — at a civil evening
 *  hour, when preparing for tomorrow is actually actionable. */
const EVENING_NUDGE_LOCAL = "18:00";

/**
 * How late a reminder may be sent if a run is missed. Generous for the day-before one, which is
 * still useful hours later, and tight for the hour-before, which stops being a warning the
 * moment the fast has started. Past this a reminder is dropped rather than sent wrong — the row
 * is left unstamped and simply falls out of the query window.
 */
const GRACE_MS: Record<ReminderKind, number> = {
  "24h": 3 * HOUR_MS,
  "1h": 90 * 60 * 1000,
};

/**
 * Which reminders for one plan are due right now.
 *
 * A plan with a start time gets both: 24 hours and 1 hour ahead of it. A plan without one gets
 * only the day-before nudge — "an hour before" is meaningless when nobody said when it begins,
 * and guessing would land mail at an hour the reader never chose.
 */
export function dueRemindersForPlan(
  plan: ReminderPlan,
  timeZone: string,
  now: Date,
): DueReminder[] {
  const candidates: { kind: ReminderKind; dueAt: Date; fastStartsAt: Date | null }[] = [];

  const startsAt = plan.startTime
    ? zonedWallTimeToInstant(plan.plannedDate, plan.startTime, timeZone)
    : null;

  if (startsAt) {
    candidates.push({
      kind: "24h",
      dueAt: new Date(startsAt.getTime() - 24 * HOUR_MS),
      fastStartsAt: startsAt,
    });
    candidates.push({
      kind: "1h",
      dueAt: new Date(startsAt.getTime() - HOUR_MS),
      fastStartsAt: startsAt,
    });
  } else {
    const dayBefore = shiftIsoDate(plan.plannedDate, -1);
    const dueAt = dayBefore
      ? zonedWallTimeToInstant(dayBefore, EVENING_NUDGE_LOCAL, timeZone)
      : null;
    if (dueAt) candidates.push({ kind: "24h", dueAt, fastStartsAt: null });
  }

  return candidates
    .filter((candidate) => {
      const alreadySent =
        candidate.kind === "24h" ? plan.reminder24hSentAt : plan.reminder1hSentAt;
      if (alreadySent) return false;

      const lateBy = now.getTime() - candidate.dueAt.getTime();
      return lateBy >= 0 && lateBy <= GRACE_MS[candidate.kind];
    })
    .map((candidate) => ({ plan, ...candidate }));
}

/** Column stamped once a reminder of this kind has gone out. */
export function sentAtColumn(kind: ReminderKind): "reminder_24h_sent_at" | "reminder_1h_sent_at" {
  return kind === "24h" ? "reminder_24h_sent_at" : "reminder_1h_sent_at";
}
