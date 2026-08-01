"use client";

import { useState } from "react";
import type { YearMonth } from "@/lib/calendar";
import {
  summarizePlannedFasts,
  summarizeRealizedVsPlanned,
  type FastLog,
  type FastPlan,
} from "@/lib/calendar/fast-plans";

function monthLabelOf({ year, month }: YearMonth): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface FastPlanSummaryPanelProps {
  /** Pre-filtered to the viewed month by the caller (e.g. getPlansForMonth). */
  plans: FastPlan[];
  monthLabel: string;
}

export function FastPlanSummaryPanel({ plans, monthLabel }: FastPlanSummaryPanelProps) {
  const [open, setOpen] = useState(false);
  const summary = summarizePlannedFasts(plans);

  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 font-accent text-sm text-ivory"
      >
        Fasting plan — {monthLabel}
        <span className="text-silver">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-ivory/10 px-4 py-3 font-body text-sm text-ivory">
          <div className="flex justify-between">
            <span>Water fasts planned</span>
            <span className="text-silver">
              {summary.waterCount} · avg {summary.avgWaterHours != null ? `${summary.avgWaterHours}h` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Dry fasts planned</span>
            <span className="text-silver">
              {summary.dryCount} · avg {summary.avgDryHours != null ? `${summary.avgDryHours}h` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export interface FastAnalysisPanelProps {
  /** Full history, not month-filtered — the panel breaks it down by month itself. */
  plans: FastPlan[];
  logs: FastLog[];
}

export function FastAnalysisPanel({ plans, logs }: FastAnalysisPanelProps) {
  const [open, setOpen] = useState(false);
  const rows = summarizeRealizedVsPlanned(plans, logs);

  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 font-accent text-sm text-ivory"
      >
        Fasting analysis
        <span className="text-silver">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-ivory/10 px-4 py-3">
          {rows.length === 0 ? (
            <p className="font-body text-sm text-silver">Plan a fast to see how it compares once it&apos;s logged.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li key={`${row.month.year}-${row.month.month}`} className="font-body text-sm text-ivory">
                  <div className="flex justify-between">
                    <span>{monthLabelOf(row.month)}</span>
                    <span className="text-silver">
                      {row.loggedCount} of {row.plannedCount} logged
                      {row.completionRate != null ? ` (${Math.round(row.completionRate * 100)}%)` : ""}
                    </span>
                  </div>
                  <div className="text-silver">
                    {row.plannedHoursTotal}h planned / {row.actualHoursTotal}h realized
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
