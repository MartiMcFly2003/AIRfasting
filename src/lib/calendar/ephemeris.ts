import SwissEph from "swisseph-wasm";

// Swiss Ephemeris WASM instance is expensive to initialize (~ms) but cheap to reuse — kept as
// a module-level singleton so repeated calls within the same server process share it.
let ephemerisPromise: Promise<SwissEph> | null = null;

function getEphemeris(): Promise<SwissEph> {
  if (!ephemerisPromise) {
    ephemerisPromise = (async () => {
      const swe = new SwissEph();
      await swe.initSwissEph();
      return swe;
    })();
  }
  return ephemerisPromise;
}

/**
 * Full tithi number (1-30) at the given moment: 1-15 is Shukla Paksha (waxing, ending at
 * Purnima/15 = full moon), 16-30 is Krishna Paksha (waning, ending at Amavasya/30 = new moon).
 * Computed as the Moon-Sun ecliptic longitude difference, per standard Panchang convention.
 */
export async function getTithiNumberAt(date: Date): Promise<number> {
  const swe = await getEphemeris();
  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600,
  );
  const sun = swe.calc_ut(jd, swe.SE_SUN, swe.SEFLG_SWIEPH)[0];
  const moon = swe.calc_ut(jd, swe.SE_MOON, swe.SEFLG_SWIEPH)[0];
  const diff = (((moon - sun) % 360) + 360) % 360;
  return Math.floor(diff / 12) + 1;
}
