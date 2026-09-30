"use client";

import { computeFastStats } from "@/lib/calendar/fast-stats";
import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import type { ISODate } from "@/lib/calendar/types";

export interface ProgressPanelProps {
  fastLogs: FastLog[];
  fastPlans: FastPlan[];
  /** Scopes the month figure and decides which plans have come due. */
  todayISO?: ISODate;
}

function Figure({ value, unit, label }: { value: string | number; unit?: string; label: string }) {
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
 * months, telling people about progress the app itself never displayed, which is a strange way
 * round: the software knew and only mentioned it while asking for money.
 *
 * What is celebrated here is keeping to a plan, never going longer or more often. See
 * fast-stats.ts for why that distinction matters in this particular app.
 */
export function ProgressPanel({ fastLogs, fastPlans, todayISO }: ProgressPanelProps) {
  const stats = computeFastStats(fastLogs, fastPlans, todayISO);
  const nothingYet = stats.totalCompletedFasts === 0 && stats.plansDue === 0;

  return (
    <section
      aria-label="Your fasting progress"
      className="w-full max-w-xl rounded-2xl border border-ivory/10 bg-obsidian p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm tracking-wide text-ivory">Your progress</h2>
        {stats.planStreak > 1 && (
          <span className="font-accent text-[10px] uppercase tracking-wider text-gold">
            {stats.planStreak} planned fasts kept in a row
          </span>
        )}
      </div>

      {nothingYet ? (
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          Nothing logged yet. Plan a fast, and once the day comes your totals and how closely
          you kept to your plan appear here.
        </p>
      ) : (
        <>
          {/* Kept-to-plan leads, and is the only figure the badge above ever refers to. Longest
              and average sit in the second row as information: useful when deciding what to
              plan next, never presented as something to beat. */}
          <div className="mt-3 grid grid-cols-3 gap-y-4">
            <Figure
              value={stats.plansDue === 0 ? "—" : `${stats.plansKept}/${stats.plansDue}`}
              label="Kept to plan"
            />
            <Figure value={stats.unplannedFasts} label="Unplanned" />
            <Figure value={stats.totalCompletedFasts} label="Fasts" />
            <Figure value={stats.totalFastingHours} unit="h" label="Total hours" />
            <Figure value={stats.averageFastHours} unit="h" label="Average" />
            <Figure value={stats.longestFastHours} unit="h" label="Longest" />
          </div>
          {/* Preparation is named on purpose: it is what the day-before reminder and the prep
              nudge are for, and it makes the point about more than length. */}
          <p className="mt-4 font-accent text-[10px] leading-relaxed text-silver">
            Keeping to your plan is what counts here &mdash; a fast done as intended, even a
            short one, is worth more than a longer one you didn&apos;t plan or prepare for.
          </p>
        </>
      )}
    </section>
  );
}
