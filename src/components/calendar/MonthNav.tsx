import Link from "next/link";
import type { SVGProps } from "react";
import { addMonths, type YearMonth } from "@/lib/calendar";

function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function monthHref({ year, month }: YearMonth): string {
  return `/calendar?year=${year}&month=${month}`;
}

export interface MonthNavProps {
  current: YearMonth;
  monthLabel: string;
  isCurrentMonth: boolean;
  /** True for months after the current one — their data is projected, not logged. */
  isForecasted: boolean;
}

export function MonthNav({ current, monthLabel, isCurrentMonth, isForecasted }: MonthNavProps) {
  const prev = addMonths(current, -1);
  const next = addMonths(current, 1);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-1 text-center">
      <div className="flex w-full items-center justify-between gap-2">
        <Link
          href={monthHref(prev)}
          aria-label="Previous month"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-silver transition-colors hover:bg-ivory/10 hover:text-ivory"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <h1 className="truncate font-heading text-2xl tracking-wide text-ivory sm:text-4xl">{monthLabel}</h1>
          {isForecasted && (
            <span className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-gold/60 px-2.5 py-1 font-accent text-[10px] uppercase tracking-wider text-gold">
              Forecasted
            </span>
          )}
        </div>
        <Link
          href={monthHref(next)}
          aria-label="Next month"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-silver transition-colors hover:bg-ivory/10 hover:text-ivory"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
      <p className="font-body text-sm text-silver">
        {isForecasted
          ? "Based on your average cycle length — updates when you log a period"
          : "Your cycle’s rhythm this month"}
      </p>
      <div className="h-4">
        {!isCurrentMonth && (
          <Link href="/calendar" className="font-accent text-xs text-gold hover:underline">
            Back to today
          </Link>
        )}
      </div>
    </div>
  );
}
