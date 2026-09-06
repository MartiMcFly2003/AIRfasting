/**
 * Turning a wall-clock date and time in someone's zone into a real instant.
 *
 * Plans are stored as a local date plus an optional local time — "the 10th at 18:00" — which is
 * not a moment until you know whose clock it is. Doing this with Intl rather than a date
 * library keeps the codebase's existing no-new-dependency stance (see lib/email/resend.ts).
 */

/** How far the zone's wall clock sits ahead of UTC at a given instant, in milliseconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const at = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Some ICU builds render midnight as hour 24 under hour12:false.
  const wallClockAsUtc = Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    at("hour") % 24,
    at("minute"),
    at("second"),
  );
  return wallClockAsUtc - instant.getTime();
}

/**
 * The instant at which `HH:MM` on `YYYY-MM-DD` occurs in `timeZone`.
 *
 * Null for an unparseable date/time or a zone the runtime doesn't recognise — a caller with no
 * usable zone must skip that user rather than fall back to UTC, which would send reminders at
 * the wrong hour with nothing to show why.
 */
export function zonedWallTimeToInstant(
  isoDate: string,
  time: string,
  timeZone: string,
): Date | null {
  const hhmm = time.slice(0, 5);
  const naive = Date.parse(`${isoDate}T${hhmm}:00Z`);
  if (Number.isNaN(naive)) return null;

  try {
    // First pass uses the offset at the naive guess; the second settles DST changeovers, where
    // the offset at the guess isn't the offset at the answer.
    const firstPass = new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
    return new Date(naive - zoneOffsetMs(firstPass, timeZone));
  } catch {
    return null; // RangeError: unknown time zone
  }
}

/** Shifts a plain YYYY-MM-DD by whole days, staying in wall-clock terms. */
export function shiftIsoDate(isoDate: string, days: number): string | null {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed + days * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/** "18:00" in the given zone, for putting a local time in front of the reader. */
export function formatInZone(instant: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(instant);
  } catch {
    return null;
  }
}

/** "Thursday 10 September", for the same reason. */
export function formatDateInZone(instant: Date, timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(instant);
  } catch {
    return null;
  }
}
