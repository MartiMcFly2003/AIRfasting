"use client";

import type { WeeklyRhythm } from "@/lib/calendar";

const RHYTHM_COPY: Record<WeeklyRhythm, string[]> = {
  "5-1-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "5-1-1 means one deep-fast day each week, followed by a nourish day, with the remaining 5 days gently supporting it.",
    "For any week you'd like to fast, start by choosing which day should be your deep fast: tap it and set the type, start time and length.",
    "The rest of that week fills in on its own — the day right after becomes your nourish day, the other 5 become support days.",
    "It's entirely your choice which weeks you follow this rhythm in — every week, or only the ones you pick.",
    "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting, if you'd like guidance on which day to choose.",
  ],
  "4-2-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "4-2-1 means two deep-fast days each week, followed by a nourish day, with the remaining 4 days gently supporting them. Your two deep-fast days can be back-to-back or spread across the week, however suits you.",
    "For any week you'd like to fast, tap each of your two deep-fast days in turn and set the type, start time and length for each.",
    "The rest of that week fills in on its own — the day right after your later deep-fast day becomes your nourish day, the other 4 become support days.",
    "It's entirely your choice which weeks you follow this rhythm in — every week, or only the ones you pick.",
    "Look out for the small moon marker on some days — new moon, full moon and Ekadashi are traditionally considered favourable for fasting, if you'd like guidance on which days to choose.",
  ],
};

export interface WeeklyRhythmInstructionsProps {
  rhythm: WeeklyRhythm;
}

/** Explains the weekly rhythm in plain terms, up front — this protocol has no cycle to infer
 *  meaning from the way Protocols 1/2's phase colours do, so the calendar needs to say in
 *  words what it no longer shows in colour until a day is actually planned. */
export function WeeklyRhythmInstructions({ rhythm }: WeeklyRhythmInstructionsProps) {
  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10 px-4 py-4">
      <p className="font-accent text-xs uppercase tracking-wider text-silver">How this rhythm works</p>
      <ul className="mt-2 flex flex-col gap-2 font-body text-sm text-ivory">
        {RHYTHM_COPY[rhythm].map((line) => (
          <li key={line} className="flex gap-2">
            <span className="shrink-0 text-silver">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
