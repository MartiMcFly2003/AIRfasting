import type { DueReminder } from "@/lib/reminders/fast-reminder-schedule";
import { formatDateInZone, formatInZone } from "@/lib/zoned-time";

function fastLabel(fastType: string): string {
  if (fastType === "dry") return "dry fast";
  if (fastType === "water") return "water fast";
  return "fast";
}

function durationClause(plannedHours: number | null): string {
  if (plannedHours == null) return "";
  const hours = Number(plannedHours);
  if (!Number.isFinite(hours) || hours <= 0) return "";
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return ` You've planned ${rounded} hour${hours === 1 ? "" : "s"}.`;
}

/**
 * Copy for the two reminders a planned fast gets. Pure — no I/O, and the caller supplies
 * siteUrl rather than this module assuming a domain, matching buildTrialReminderEmail.
 *
 * Times are rendered in the reader's own zone, and simply left out when the plan carries no
 * start time, rather than naming an hour nobody chose.
 */
export function buildFastReminderEmail(
  reminder: DueReminder,
  timeZone: string,
  siteUrl: string,
): { subject: string; html: string } {
  const label = fastLabel(reminder.plan.fastType);
  const duration = durationClause(reminder.plan.plannedHours);
  const calendarLink = `${siteUrl}/calendar`;
  const settingsLink = `${siteUrl}/settings`;

  const startTime = reminder.fastStartsAt ? formatInZone(reminder.fastStartsAt, timeZone) : null;
  const startDate = reminder.fastStartsAt
    ? formatDateInZone(reminder.fastStartsAt, timeZone)
    : null;

  const subject =
    reminder.kind === "24h"
      ? `Your ${label} starts tomorrow`
      : `Your ${label} starts in an hour`;

  const opening =
    reminder.kind === "24h"
      ? startTime && startDate
        ? `Your ${label} is scheduled for ${startDate} at ${startTime}, a day from now.`
        : `You have a ${label} scheduled for tomorrow.`
      : startTime
        ? `Your ${label} starts at ${startTime}, about an hour from now.`
        : `Your ${label} starts in about an hour.`;

  const nudge =
    reminder.kind === "24h"
      ? "Today is a good day to prepare — ease off heavy food and keep your water up, so tomorrow starts from a settled place."
      : "A last glass of water and a calm start make the first hours easier.";

  const html = `
    <p>Hi there,</p>
    <p>${opening}${duration}</p>
    <p>${nudge}</p>
    <p><a href="${calendarLink}">Open your calendar</a></p>
    <p>Don't want these? You can turn reminders off in your <a href="${settingsLink}">settings</a>.</p>
    <p>Your AIRfasting team</p>
  `.trim();

  return { subject, html };
}
