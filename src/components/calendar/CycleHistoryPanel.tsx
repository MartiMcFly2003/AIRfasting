"use client";

import { useState } from "react";
import type { ISODate } from "@/lib/calendar";
import {
  detectRegularity,
  getAverageCycleLength,
  getCycleLengths,
  type RegularityStatus,
} from "@/lib/calendar/cycle-analysis";

export interface CycleHistoryPanelProps {
  periodHistory: ISODate[];
  /** Opens the historic-entry dialog — omit to hide the "Log a past period" affordance. */
  onLogHistoric?: () => void;
}

const STATUS_COPY: Record<RegularityStatus, string> = {
  regular: "Your cycle has been regular for the last 3 months.",
  irregular: "Your cycle has been irregular for the last 3 months.",
  mixed: "Your cycle has shown some variation recently.",
  insufficient_data: "Log a few more periods to see a regularity assessment.",
};

export function CycleHistoryPanel({ periodHistory, onLogHistoric }: CycleHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const cycleLengths = getCycleLengths(periodHistory);
  const regularity = detectRegularity(cycleLengths);
  const averageCycleLength = getAverageCycleLength(periodHistory);

  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 font-accent text-sm text-ivory"
      >
        Cycle history
        <span className="text-silver">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-ivory/10 px-4 py-3">
          <p className="font-body text-sm text-silver">{STATUS_COPY[regularity.status]}</p>
          {averageCycleLength !== null && (
            <p className="mt-1 font-body text-sm text-silver">
              Average cycle length: <span className="text-ivory">{averageCycleLength} days</span>
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-1.5">
            {periodHistory.map((date, i) => {
              const gap = i > 0 ? cycleLengths[i - 1] : null;
              return (
                <li key={date} className="flex justify-between font-body text-sm text-ivory">
                  <span>{date}</span>
                  {gap !== null && <span className="text-silver">{gap}-day cycle</span>}
                </li>
              );
            })}
          </ul>
          {onLogHistoric && (
            <button
              type="button"
              onClick={onLogHistoric}
              className="mt-3 w-full rounded-full border border-ivory/20 px-4 py-2 font-accent text-xs text-ivory transition-colors hover:bg-ivory/10"
            >
              Log a past period
            </button>
          )}
        </div>
      )}
    </div>
  );
}
