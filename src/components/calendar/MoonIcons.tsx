import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Thin outline disc — barely-there, matching new moon's near-invisibility. */
export function NewMoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

/** Solid filled disc — full brightness. */
export function FullMoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

/** Ekadashi — abstract sparkle, "notable day," tradition-neutral. Stays legible at small sizes. */
export function EkadashiSparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <path d="M12 2c0 4.2-1 6.3-2.2 7.8S6 12 2 12c4 0 6.8 1.2 7.8 2.2S12 17.8 12 22c0-4.2 1-6.3 2.2-7.8S18 12 22 12c-4 0-6.8-1.2-7.8-2.2S12 6.2 12 2z" />
    </svg>
  );
}
