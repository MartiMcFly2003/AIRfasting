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

const RHYTHM_COPY: string[] = [
  "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
  "Each week, choose one day as your deep-fast day. The day right after it becomes your nourish day, and the remaining days gently support it.",
  "For any week you'd like to fast, tap any day to define that week's deep-fast day — set the type, start time and length.",
  "It's entirely your choice which weeks you follow this rhythm in — every week, or only the ones you pick.",
  "With more experience, you can add a 2nd deep-fast day to a week using the \"+ Add a 2nd deep-fast day\" button below the calendar — recommended only once you're comfortable with the rhythm.",
  "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting; if one falls on a support or nourish day, you can also choose to eat light and avoid grains that day.",
];

/** Explains the weekly rhythm in plain terms — this protocol has no cycle to infer meaning
 *  from the way Protocols 1/2's phase colours do, so the calendar needs to say in words what
 *  it no longer shows in colour until a day is actually planned. Collapsed by default so it
 *  doesn't sit as a wall of text above the calendar on every visit. */
export function WeeklyRhythmInstructions() {
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
          {RHYTHM_COPY.map((line) => (
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
