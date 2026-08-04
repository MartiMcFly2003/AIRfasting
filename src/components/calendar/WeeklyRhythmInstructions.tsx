"use client";

import type { WeeklyRhythm } from "@/lib/calendar";

const RHYTHM_COPY: Record<WeeklyRhythm, string[]> = {
  "5-1-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "Tap any day below to plan your deep fast: choose the type, start time and length that suit you. That day becomes your deep-fast day for the week.",
    "The day right after fills in automatically as a nourish day — food, not fasting.",
    "The remaining 5 days become support days: gentle, lower-carb eating. A short overnight fast is fine on these; save the longer fast for your deep-fast day.",
  ],
  "4-2-1": [
    "There's no menstrual or lunar cycle behind this rhythm — you set it yourself, one week at a time.",
    "Tap any day below to plan your first deep fast: choose the type, start time and length that suit you. That sets your deep-fasting stretch for the week.",
    "The day right after that stretch fills in automatically as a nourish day — food, not fasting.",
    "The remaining 4 days become support days: gentle, lower-carb eating. A short overnight fast is fine on these; save the longer fasts for your deep-fasting days.",
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
