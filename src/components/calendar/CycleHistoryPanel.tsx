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
  /** First-of-month ISODates explicitly marked "no period" — distinct from simply not having
   *  logged anything that month. */
  noPeriodMonths?: ISODate[];
  /** Opens the historic-entry dialog — omit to hide the "Log a past period" affordance. */
  onLogHistoric?: () => void;
  /** Opens the no-period-month dialog — omit to hide the "No period this month" affordance. */
  onLogNoPeriod?: () => void;
}

const STATUS_COPY: Record<RegularityStatus, string> = {
  regular: "Your cycle has been regular for the last 3 months.",
  irregular: "Your cycle has been irregular for the last 3 months.",
  mixed: "Your cycle has shown some variation recently.",
  insufficient_data: "Log a few more periods to see a regularity assessment.",
};

function formatMonthLabel(monthDate: ISODate): string {
  return new Date(`${monthDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type HistoryRow =
  | { key: string; kind: "period"; date: ISODate; gap: number | null }
  | { key: string; kind: "no_period"; monthDate: ISODate };

export function CycleHistoryPanel({
  periodHistory,
  noPeriodMonths = [],
  onLogHistoric,
  onLogNoPeriod,
}: CycleHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  // Regularity/average are deliberately based on periodHistory alone — a "no period" month is
  // informational, not a data point with a day-count to average, so it doesn't perturb either.
  const cycleLengths = getCycleLengths(periodHistory);
  const regularity = detectRegularity(cycleLengths);
  const averageCycleLength = getAverageCycleLength(periodHistory);

  const rows: HistoryRow[] = [
    ...periodHistory.map(
      (date, i): HistoryRow => ({
        key: `p-${date}`,
        kind: "period",
        date,
        gap: i > 0 ? cycleLengths[i - 1] : null,
      }),
    ),
    ...noPeriodMonths.map((monthDate): HistoryRow => ({ key: `np-${monthDate}`, kind: "no_period", monthDate })),
  ].sort((a, b) => {
    const aKey = a.kind === "period" ? a.date : a.monthDate;
    const bKey = b.kind === "period" ? b.date : b.monthDate;
    return aKey.localeCompare(bKey);
  });

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
            {rows.map((row) =>
              row.kind === "period" ? (
                <li key={row.key} className="flex justify-between font-body text-sm text-ivory">
                  <span>{row.date}</span>
                  {row.gap !== null && <span className="text-silver">{row.gap}-day cycle</span>}
                </li>
              ) : (
                <li key={row.key} className="flex justify-between font-body text-sm text-ivory/60">
                  <span>{formatMonthLabel(row.monthDate)}</span>
                  <span className="text-silver">No period</span>
                </li>
              ),
            )}
          </ul>
          {(onLogHistoric || onLogNoPeriod) && (
            <div className="mt-3 flex flex-col gap-2">
              {onLogHistoric && (
                <button
                  type="button"
                  onClick={onLogHistoric}
                  className="w-full rounded-full border border-ivory/20 px-4 py-2 font-accent text-xs text-ivory transition-colors hover:bg-ivory/10"
                >
                  Log a past period
                </button>
              )}
              {onLogNoPeriod && (
                <button
                  type="button"
                  onClick={onLogNoPeriod}
                  className="w-full rounded-full border border-ivory/20 px-4 py-2 font-accent text-xs text-ivory transition-colors hover:bg-ivory/10"
                >
                  No period this month
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
