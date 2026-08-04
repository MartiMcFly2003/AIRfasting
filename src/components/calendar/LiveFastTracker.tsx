"use client";

import { useState } from "react";
import type { ActiveFast } from "@/lib/calendar/use-active-fast";
import type { FastPlan, FastType } from "@/lib/calendar/fast-plans";
import { formatTimeLabel, StartFastDialog } from "./FastPlanDialogs";
import { DryFastIcon, WaterFastIcon } from "./PhaseIcons";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Reference lap for an ad-hoc fast with no planned target — a full day, so the ring still
 *  reads as "how far through" rather than implying a goal that was never set. */
const UNTARGETED_REFERENCE_HOURS = 24;

/** Hours:minutes only — a fast runs over hours, not seconds, so second-level precision is
 *  just noise on the display (see useActiveFast's matching 60s update interval). */
function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export interface LiveFastTrackerProps {
  activeFast: ActiveFast | null;
  elapsedMs: number;
  /** Planned hours for the active fast, when it's tracking against a plan — sets what the
   *  progress ring fills toward. Undefined for an ad-hoc fast (falls back to a 24h reference). */
  activeFastTargetHours?: number;
  todaysPlan?: FastPlan;
  /** Contextual copy on typical fast durations — informational only, shown to every tier. */
  durationTip?: string;
  onStart: (fastType: FastType, planId: string | null) => void;
  onStop: () => void;
}

export function LiveFastTracker({
  activeFast,
  elapsedMs,
  activeFastTargetHours,
  todaysPlan,
  durationTip,
  onStart,
  onStop,
}: LiveFastTrackerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (activeFast) {
    const Icon = activeFast.fastType === "water" ? WaterFastIcon : DryFastIcon;
    const targetHours = activeFastTargetHours ?? UNTARGETED_REFERENCE_HOURS;
    const fraction = Math.min(1, elapsedMs / (targetHours * 3_600_000));
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-5">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
            <circle cx="48" cy="48" r={RING_RADIUS} fill="none" strokeWidth={6} className="stroke-ivory/10" />
            <circle
              cx="48"
              cy="48"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
              className="stroke-gold transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Icon className="h-4 w-4 text-gold" />
            <span className="font-body text-base tabular-nums text-ivory">{formatElapsed(elapsedMs)}</span>
            {activeFastTargetHours && (
              <span className="font-accent text-[10px] uppercase tracking-wider text-silver">
                of {activeFastTargetHours}h
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="font-body text-sm text-ivory">Fasting in progress</span>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="rounded-full bg-gold px-5 py-1.5 font-accent text-xs font-medium text-obsidian transition-opacity hover:opacity-90"
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
