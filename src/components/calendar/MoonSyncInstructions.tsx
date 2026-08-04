"use client";

const MOON_SYNC_COPY: string[] = [
  "Your cycle is irregular, so instead of predicting from your last period, this calendar syncs your fasting rhythm to the moon — anchored to the most recent new moon.",
  "Four phases repeat with the moon: Rise and Radiate are fasting-friendly windows, Bloom and Rest are nourish-only days with no fasting recommended.",
  "Tap any Rise or Radiate day directly to plan a fast — set the type, start time and length.",
  "Use \"Log period start\" whenever your period actually begins — it doesn't move the phase colours, but keeps your cycle history accurate.",
  "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting; if they fall into a window which is not recommended for fasting you can also choose to eat light and avoid grains on these days.",
];

/** Explains the moon-synced phase cycle up front, mirroring WeeklyRhythmInstructions for
 *  Protocol 3 — this track's phases come from the lunar cycle rather than a logged period,
 *  which isn't obvious just from looking at the calendar. */
export function MoonSyncInstructions() {
  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10 px-4 py-4">
      <p className="font-accent text-xs uppercase tracking-wider text-silver">How this cycle works</p>
      <ul className="mt-2 flex flex-col gap-2 font-body text-sm text-ivory">
        {MOON_SYNC_COPY.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="shrink-0 text-silver">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
