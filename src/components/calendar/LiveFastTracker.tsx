"use client";

import { useState } from "react";
import type { ActiveFast } from "@/lib/calendar/use-active-fast";
import type { FastPlan, FastType } from "@/lib/calendar/fast-plans";
import { formatTimeLabel, StartFastDialog } from "./FastPlanDialogs";
import { DryFastIcon, WaterFastIcon } from "./PhaseIcons";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export interface LiveFastTrackerProps {
  activeFast: ActiveFast | null;
  elapsedMs: number;
  todaysPlan?: FastPlan;
  /** Contextual copy on typical fast durations — informational only, shown to every tier. */
  durationTip?: string;
  onStart: (fastType: FastType, planId: string | null) => void;
  onStop: () => void;
}

export function LiveFastTracker({
  activeFast,
  elapsedMs,
  todaysPlan,
  durationTip,
  onStart,
  onStop,
}: LiveFastTrackerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (activeFast) {
    const Icon = activeFast.fastType === "water" ? WaterFastIcon : DryFastIcon;
    return (
      <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-gold" />
          <span className="font-body text-sm text-ivory">
            Fasting in progress · <span className="tabular-nums">{formatElapsed(elapsedMs)}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 rounded-full bg-gold px-4 py-1.5 font-accent text-xs font-medium text-obsidian transition-opacity hover:opacity-90"
        >
          Stop
        </button>
      </div>
    );
  }

  // A day with a plan already specifies its fast type/start time, so starting it needs no
  // picker — one tap begins tracking against that plan directly.
  if (todaysPlan) {
    const Icon = todaysPlan.fastType === "water" ? WaterFastIcon : DryFastIcon;
    return (
      <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-ivory/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-ivory" />
          <span className="font-body text-sm text-ivory">
            {todaysPlan.startTime
              ? `You have a fast planned, starting today at ${formatTimeLabel(todaysPlan.startTime)}`
              : "You have a fast planned for today"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onStart(todaysPlan.fastType, todaysPlan.id)}
          className="shrink-0 rounded-full bg-ivory px-4 py-1.5 font-accent text-xs font-medium text-obsidian transition-opacity hover:opacity-90"
        >
          Start fast
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full max-w-xl rounded-xl border border-ivory/20 px-4 py-3 text-center font-accent text-sm text-ivory transition-colors hover:bg-ivory/10"
      >
        Start a fast
      </button>

      {dialogOpen && (
        <StartFastDialog
          durationTip={durationTip}
          onConfirm={(fastType) => {
            onStart(fastType, null);
            setDialogOpen(false);
          }}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
