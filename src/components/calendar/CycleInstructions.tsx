"use client";

import { useState } from "react";
import type { SVGProps } from "react";

function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const CYCLE_COPY: string[] = [
  "This calendar predicts your cycle from the first day of your last period and your average cycle length — four phases repeat each cycle: Rise, Bloom, Radiate and Rest.",
  "Rise and Radiate are fasting-friendly windows, Bloom and Rest are nourish-only days with no fasting recommended. You can see exactly which day each phase starts by the small rising-sun icon (Rise) or radiating-sun icon (Radiate) in the corner of that day.",
  "Tap any Rise (yellow) or Radiate (coral) day directly to plan a fast — set the type, start time and length.",
  "Future months are forecasted from your average cycle length. When your next predicted period arrives, tap it to confirm the actual date — or pick an earlier one if it started sooner.",
  "If a period lands on a different day than predicted, you'll be asked whether to treat it as a one-off or update your average cycle length going forward.",
  "Want to fast on a Bloom or Rest day anyway? \"Plan a fast outside my rhythm\" below the calendar lets you pick any date and time.",
  "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting; if they fall into a window which is not recommended for fasting you can also choose to eat light and avoid grains on these days.",
];

/** Explains the period-predicted phase cycle, mirroring MoonSyncInstructions (Protocol 2) and
 *  WeeklyRhythmInstructions (Protocol 3) — Protocol 1 previously had no instruction panel at
 *  all, unlike the other two tracks. Collapsed by default so it doesn't sit as a wall of text
 *  above the calendar on every visit. */
export function CycleInstructions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-accent text-sm text-ivory"
      >
        How does this cycle and calendar work?
        <ChevronDown className={`h-4 w-4 shrink-0 text-silver transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-ivory/10 px-4 py-3 font-body text-sm text-ivory">
          {CYCLE_COPY.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="shrink-0 text-silver">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
