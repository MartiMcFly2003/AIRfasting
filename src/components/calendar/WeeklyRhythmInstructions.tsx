"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import type { WeeklyRhythm } from "@/lib/calendar";

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

const RHYTHM_COPY: Record<WeeklyRhythm, string[]> = {
  "5-1-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "5-1-1 means one deep-fast day each week, followed by a nourish day, with the remaining 5 days gently supporting it.",
    "For any week you'd like to fast, start by choosing which day should be your deep fast: tap it and set the type, start time and length.",
    "The rest of that week fills in on its own — the day right after becomes your nourish day, the other 5 become support days.",
    "It's entirely your choice which weeks you follow this rhythm in — every week, or only the ones you pick.",
    "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting; if one falls on a support or nourish day, you can also choose to eat light and avoid grains that day.",
  ],
  "4-2-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "4-2-1 means two deep-fast days each week, followed by a nourish day, with the remaining 4 days gently supporting them. Your two deep-fast days can be back-to-back or spread across the week, however suits you.",
    "For any week you'd like to fast, tap each of your two deep-fast days in turn and set the type, start time and length for each.",
    "The rest of that week only fills in once both deep-fast days are set — the day right after the later one becomes your nourish day, the other 4 become support days.",
    "It's entirely your choice which weeks you follow this rhythm in — every week, or only the ones you pick.",
    "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting; if one falls on a support or nourish day, you can also choose to eat light and avoid grains that day.",
  ],
};

export interface WeeklyRhythmInstructionsProps {
  rhythm: WeeklyRhythm;
}

/** Explains the weekly rhythm in plain terms — this protocol has no cycle to infer meaning
 *  from the way Protocols 1/2's phase colours do, so the calendar needs to say in words what
 *  it no longer shows in colour until a day is actually planned. Collapsed by default so it
 *  doesn't sit as a wall of text above the calendar on every visit. */
export function WeeklyRhythmInstructions({ rhythm }: WeeklyRhythmInstructionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-accent text-sm text-ivory"
      >
        How does this rhythm and calendar work?
        <ChevronDown className={`h-4 w-4 shrink-0 text-silver transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-ivory/10 px-4 py-3 font-body text-sm text-ivory">
          {RHYTHM_COPY[rhythm].map((line) => (
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
