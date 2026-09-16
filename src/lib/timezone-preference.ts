import { isoDateInZone } from "@/lib/zoned-time";

/**
 * The time-zone columns of user_profiles, in the shape every reader needs them.
 *
 * Kept as a plain interface rather than a row type so the cron (service role), the calendar
 * (server component) and the dialogs (browser) can all agree on the rules without agreeing on
 * how they fetched the row.
 */
export interface TimeZonePreference {
  /** The zone in effect, which during a trip is the one they travelled to. */
  timezone: string | null;
  /** Where they normally are — restored once a temporary switch expires. */
  homeTimezone: string | null;
  /** Date the temporary switch ends, "YYYY-MM-DD". Null means it runs until changed by hand. */
  revertsOn: string | null;
}

/**
 * Which zone to actually use right now.
 *
 * A trip with an end date expires on its own: past that date the answer goes back to
 * home_timezone without anything having rewritten the row. That keeps the rule in one place and
 * makes it idempotent — the cron reading the row at 14:00 and Settings rendering it at 14:01
 * cannot disagree, and a missed job can't leave somebody stranded in a zone they've left.
 *
 * The end date is read in the *travel* zone, since that's the calendar the traveller is living
 * by: a trip ending "on the 20th" ends when the 20th arrives where they are.
 */
export function effectiveTimeZone(pref: TimeZonePreference, now: Date): string | null {
  if (!pref.revertsOn || !pref.homeTimezone || !pref.timezone) return pref.timezone;

  const todayThere = isoDateInZone(now, pref.timezone);
  // An unreadable zone is not a reason to strand someone: fall back to home rather than keep
  // using a value we just failed to interpret.
  if (!todayThere) return pref.homeTimezone;

  return todayThere >= pref.revertsOn ? pref.homeTimezone : pref.timezone;
}

/** True while a temporary switch is still running, for copy that needs to say so. */
export function isTravelling(pref: TimeZonePreference, now: Date): boolean {
  return (
    pref.timezone != null &&
    pref.homeTimezone != null &&
    pref.timezone !== pref.homeTimezone &&
    effectiveTimeZone(pref, now) === pref.timezone
  );
}
