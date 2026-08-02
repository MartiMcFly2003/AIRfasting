import type { SVGProps } from "react";
import type { PhaseBlockName } from "@/lib/calendar";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Rising sun over the horizon — Inhale: gathering energy. */
function InhaleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <polyline points="8 6 12 2 16 6" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
      <line x1="1" y1="18" x2="23" y2="18" />
    </svg>
  );
}

/** Four-petal blossom — Bloom: turning inward. */
function BloomIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <circle cx="12" cy="16" r="3.2" />
      <circle cx="8" cy="12" r="3.2" />
      <circle cx="16" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Full sun — Radiate: peak energy. */
function RadiateIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="1.5" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22.5" y2="12" />
      <line x1="4.6" y1="4.6" x2="6.3" y2="6.3" />
      <line x1="17.7" y1="17.7" x2="19.4" y2="19.4" />
      <line x1="4.6" y1="19.4" x2="6.3" y2="17.7" />
      <line x1="17.7" y1="6.3" x2="19.4" y2="4.6" />
    </svg>
  );
}

/** Crescent moon — Exhale: rest, cool down. */
function ExhaleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export const PHASE_ICONS: Record<PhaseBlockName, (props: IconProps) => React.JSX.Element> = {
  inhale: InhaleIcon,
  bloom: BloomIcon,
  radiate: RadiateIcon,
  exhale: ExhaleIcon,
};

/**
 * Filled droplet — marks the exact date the user logged their period start. Solid rather
 * than outlined (like the phase icons) so it reads as a confirmed data point, not a phase
 * indicator — distinct from later mathematical cycle-day-1 recurrences, which are only
 * predictions until a period is actually logged there.
 */
export function PeriodStartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M12 2.5c3.6 4.6 6.5 8.9 6.5 12.3a6.5 6.5 0 1 1-13 0c0-3.4 2.9-7.7 6.5-12.3z" />
    </svg>
  );
}

/**
 * Outline droplet — same shape as PeriodStartIcon but hollow, marking a *predicted* future
 * period start (derived from the logged period date + average cycle length), not a
 * confirmed one. Pair with a dashed badge ring, not a solid one.
 */
export function PeriodForecastIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5c3.6 4.6 6.5 8.9 6.5 12.3a6.5 6.5 0 1 1-13 0c0-3.4 2.9-7.7 6.5-12.3z" />
    </svg>
  );
}

/** Two vertical bars — marks the confirmed-period spot while fasting is paused, replacing PeriodStartIcon so the marker reads as "tap to unpause" rather than "tap to adjust." */
export function PausedMarkerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

/** Droplet with a waterline — marks a planned water-fast day. The waterline keeps it reading distinctly from PeriodStartIcon/PeriodForecastIcon's plain droplet even at a glance. */
export function WaterFastIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5c3.6 4.6 6.5 8.9 6.5 12.3a6.5 6.5 0 1 1-13 0c0-3.4 2.9-7.7 6.5-12.3z" />
      <path d="M7.3 15.5c1.6.9 3.4 1.2 4.7.6" strokeWidth={1.4} />
    </svg>
  );
}

/** Three ascending wavy lines — breath/wind, marks a planned dry-fast day. */
export function DryFastIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9c3-2 5 2 8 0s5 2 8 0" />
      <path d="M3 14c3-2 5 2 8 0s5 2 8 0" />
      <path d="M3 19c3-2 5 2 8 0s5 2 8 0" />
    </svg>
  );
}

/** Solid octagon — marks a refeed day following a 20h+ fast. Filled like PausedMarkerIcon
 *  (a state you can't act around) rather than outlined like WaterFastIcon/DryFastIcon (a
 *  choice you made), since a refeed day isn't something the user planned. */
export function StopIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M8.3 2.5h7.4l5.3 5.3v7.4l-5.3 5.3H8.3L3 15.2V7.8z" />
    </svg>
  );
}

/** Simple clock face — used only inside the fast-planning dialogs next to an hours value, never on the small day-cell marker (illegible at that size). */
export function FastClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}
