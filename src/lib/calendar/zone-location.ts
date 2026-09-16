import { ZONE_ALIASES, ZONE_COORDINATES } from "./timezone-coordinates";

export interface ZoneLocation {
  lat: number;
  lon: number;
}

/**
 * Where to put somebody who has told us their time zone and nothing else.
 *
 * Ekadashi is resolved against sunrise, and sunrise needs coordinates a time zone cannot supply
 * on its own — but the zone narrows it enormously. The error left over is the spread within one
 * zone (tens of minutes of sunrise, and most of an hour only in the geographically largest),
 * against the hours of error that a single hardcoded city produced for anybody outside it.
 *
 * Null rather than a guess when the zone is unknown: the caller decides what to do without a
 * location, and a silent default is what this function exists to replace.
 */
export function locationForTimeZone(timeZone: string | null): ZoneLocation | null {
  if (!timeZone) return null;

  const canonical = ZONE_COORDINATES[timeZone] ? timeZone : ZONE_ALIASES[timeZone];
  const coordinates = canonical ? ZONE_COORDINATES[canonical] : undefined;
  if (!coordinates) return null;

  return { lat: coordinates[0], lon: coordinates[1] };
}
