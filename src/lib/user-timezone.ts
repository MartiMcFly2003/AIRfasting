/**
 * The device's IANA time zone, e.g. "Europe/Madrid".
 *
 * Browser-only: on the server this reports wherever the server happens to run, which is never
 * what we want, so callers must gate it behind useHydrated() rather than reading it in a first
 * render. Null when the environment won't say — stored as null rather than guessed, since a
 * wrong zone sends reminders at the wrong hour with nothing to show why.
 */
export function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Every IANA zone the browser knows, for the Settings picker. Read through a narrowed type
 * rather than the lib definition: supportedValuesOf is recent enough that it can be missing at
 * runtime even where TypeScript believes it exists, and an empty list degrades to "keep what
 * you have, or take the detected one" rather than throwing.
 */
export function supportedTimeZones(): string[] {
  try {
    const intl = Intl as { supportedValuesOf?: (key: string) => string[] };
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}
