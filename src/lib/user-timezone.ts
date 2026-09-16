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

export interface TimeZoneOption {
  value: string;
  /** "Europe/Madrid (GMT+02:00)" — the offset is what people actually recognise. */
  label: string;
}

/** Built once per session: ~400 zones x an Intl format each is cheap, but not per keystroke. */
let optionsCache: TimeZoneOption[] | null = null;

/** The current offset for one zone, e.g. "GMT+02:00". Null when the zone won't format. */
function zoneOffsetLabel(zone: string, now: Date): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(now);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * The Settings/onboarding picker list, each zone labelled with its current UTC offset.
 *
 * A bare IANA list is hard to scan — "Europe/Madrid" and "Europe/Warsaw" look equally plausible
 * to somebody who only knows they are two hours ahead of London — so the offset rides along.
 * Sorted by offset, then name, so the zones near yours sit together instead of being scattered
 * through an alphabetical list.
 */
export function supportedTimeZoneOptions(): TimeZoneOption[] {
  if (optionsCache) return optionsCache;

  const now = new Date();
  const zones = supportedTimeZones();
  const decorated = zones.map((zone) => {
    const offset = zoneOffsetLabel(zone, now);
    // Minutes east of UTC, purely for ordering — "GMT+05:30" and "GMT-08:00" both parse here,
    // and a zone we can't read sorts to the end rather than breaking the list.
    const match = offset?.match(/GMT([+-])(\d{2}):(\d{2})/);
    const rank = match
      ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
      : Number.MAX_SAFE_INTEGER;
    return { value: zone, label: offset ? `${zone} (${offset})` : zone, rank };
  });

  decorated.sort((a, b) => a.rank - b.rank || a.value.localeCompare(b.value));
  optionsCache = decorated.map(({ value, label }) => ({ value, label }));
  return optionsCache;
}
