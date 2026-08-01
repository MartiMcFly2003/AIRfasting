import type { TrialReminderStats } from "@/lib/billing/trial-reminder-stats";

// Keep in sync with the Stripe Price manually — no dynamic lookup here, this is static copy.
const MONTHLY_PRICE_LABEL = "€11/month";

function buildProgressLine(stats: TrialReminderStats): string {
  if (stats.totalCompletedFasts === 0) {
    return "You haven't logged a fast yet — this is a good week to plan one, so you can see what Premium actually tracks for you.";
  }
  const fasts = `${stats.totalCompletedFasts} fast${stats.totalCompletedFasts === 1 ? "" : "s"}`;
  const streak = `${stats.streakDays}-day streak`;
  const hours = `${stats.totalFastingHours} fasting hour${stats.totalFastingHours === 1 ? "" : "s"}`;
  return `So far you've completed ${fasts}, maintained a ${streak}, and logged ${hours}.`;
}

/** Personalized trial-ending copy — deliberately never generic "your trial is ending" text.
 *  Ties the loss to something concrete the user will actually miss. Pure — no I/O; the caller
 *  supplies siteUrl rather than this module assuming a domain that may not be live yet.
 *
 *  `name` is optional — nothing in onboarding/auth collects a real name today, so this
 *  degrades to a generic greeting rather than fabricating one. */
export function buildTrialReminderEmail(
  stats: TrialReminderStats,
  daysRemaining: number,
  siteUrl: string,
  name: string | null,
): { subject: string; html: string } {
  const subject = `Your AIRfasting Premium trial ends in ${daysRemaining} days`;
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const manageLink = `${siteUrl}/calendar`;

  const html = `
    <p>${greeting}</p>
    <p>Your 30-day free trial ends in ${daysRemaining} days.</p>
    <p>You're building a healthy fasting routine. Keep your personalized fasting schedule, reminders, progress history, and Premium insights without interruption.</p>
    <p>${buildProgressLine(stats)}</p>
    <p>After your trial ends, your subscription will automatically continue on Premium for ${MONTHLY_PRICE_LABEL}.</p>
    <p>If you'd like to continue, you don't need to do anything.</p>
    <p>Prefer to switch to the free plan instead? You can cancel anytime before your renewal date by <a href="${manageLink}">managing your subscription</a>.</p>
    <p>Your AIRfasting team</p>
  `.trim();

  return { subject, html };
}
