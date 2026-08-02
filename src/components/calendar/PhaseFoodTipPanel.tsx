"use client";

import type { PhaseBlockName } from "@/lib/calendar";
import { PHASE_LABELS } from "./MonthCalendar";

export interface PhaseFoodTipPanelProps {
  block: PhaseBlockName;
  tip: string;
}

/** Small daily food tip matching today's phase block — free tier included, unlike the
 *  Premium-gated prep/refeed nudge. */
export function PhaseFoodTipPanel({ block, tip }: PhaseFoodTipPanelProps) {
  if (!tip) return null;
  return (
    <div className="w-full max-w-xl rounded-xl border border-ivory/10 px-4 py-3">
      <p className="font-accent text-xs uppercase tracking-wider text-silver">{PHASE_LABELS[block]} · today</p>
      <p className="mt-1 font-body text-sm text-ivory">{tip}</p>
    </div>
  );
}
