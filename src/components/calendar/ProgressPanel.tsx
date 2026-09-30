"use client";

import { computeFastStats } from "@/lib/calendar/fast-stats";
import type { FastLog } from "@/lib/calendar/fast-plans";
import type { ISODate } from "@/lib/calendar/types";

export interface ProgressPanelProps {
  fastLogs: FastLog[];
  /** Scopes the month figure; everything else is all-time. */
  todayISO?: ISODate;
}

function Figure({ value, unit, label }: { value: number; unit?: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <p className="font-heading text-2xl leading-none text-ivory">
        {value}
        {unit && <span className="ml-0.5 font-accent text-sm text-silver">{unit}</span>}
      </p>
      <p className="mt-1 font-accent text-[10px] uppercase leading-tight tracking-wider text-silver">
        {label}
      </p>
    </div>
  );
}

/**
 * What a subscriber has actually done, shown to them.
 *
 * These figures already existed — they have been personalising the trial-ending email for
 * months, telling people about a streak the app itself never displayed. A calendar shows what
 * is planned; nothing showed what had been achieved, which is the part somebody stays for.
 *
 * Empty state included on purpose: a new subscriber seeing four zeroes learns the panel exists
 * and what it will fill with, where hiding it until the first log would make it a surprise they
 * might never meet.
 */
export function ProgressPanel({ fastLogs, todayISO }: ProgressPanelProps) {
  const stats = computeFastStats(fastLogs, todayISO);
  const nothingYet = stats.totalCompletedFasts === 0;

  return (
    <section
      aria-label="Your fasting progress"
      className="w-full max-w-xl rounded-2xl border border-ivory/10 bg-obsidian p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm tracking-wide text-ivory">Your progress</h2>
        {stats.streakDays > 1 && (
          <span className="font-accent text-[10px] uppercase tracking-wider text-gold">
            {stats.streakDays}-day streak
          </span>
        )}
      </div>

      {nothingYet ? (
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          Nothing logged yet. Once you complete a fast, your totals, your longest fast and your
          streak appear here.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-1">
          <Figure value={stats.totalCompletedFasts} label="Fasts" />
          <Figure value={stats.totalFastingHours} unit="h" label="Total hours" />
          <Figure value={stats.longestFastHours} unit="h" label="Longest" />
          <Figure value={stats.fastsThisMonth} label="This month" />
        </div>
      )}
    </section>
  );
}
