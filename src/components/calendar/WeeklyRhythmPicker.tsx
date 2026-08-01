"use client";

import type { WeeklyRhythm } from "@/lib/calendar";

export interface WeeklyRhythmPickerProps {
  rhythm: WeeklyRhythm;
  onChange: (rhythm: WeeklyRhythm) => void;
}

/**
 * Picks between 5-1-1 and 4-2-1. Which weekdays land in which category is no longer chosen
 * here — free tier gets a fixed pattern per rhythm (FIXED_WEEKLY_RHYTHM_PATTERNS), and
 * premium reassigns individual days by interacting with the phase icons directly on the
 * calendar grid (WeeklyRhythmCalendar's armed-Radiate-icon flow).
 */
export function WeeklyRhythmPicker({ rhythm, onChange }: WeeklyRhythmPickerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {(["5-1-1", "4-2-1"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-1.5 font-accent text-sm transition-colors ${
            rhythm === option
              ? "bg-gold text-obsidian"
              : "border border-ivory/20 text-ivory hover:bg-ivory/10"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
