"use client";

export interface PrepRefeedBannerProps {
  kind: "prep" | "refeed";
  message: string;
  onDismiss: () => void;
}

/** Purely informational nudge shown the day before a planned fast, or the day after any fast
 *  (planned or logged) regardless of duration — distinct from RefeedInfoDialog, which only
 *  blocks new planning after a 20h+ fast. */
export function PrepRefeedBanner({ kind, message, onDismiss }: PrepRefeedBannerProps) {
  // Refeed reuses the coral accent RefeedInfoDialog/FastContinuationDialog markers already use
  // for the same concept elsewhere; prep is a lighter, forward-looking gold nudge.
  const accent = kind === "refeed" ? "border-coral/30 bg-coral/10" : "border-gold/30 bg-gold/10";
  return (
    <div
      className={`flex w-full max-w-xl flex-col items-center gap-3 rounded-xl border px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left ${accent}`}
    >
      <p className="font-body text-sm text-ivory">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-full border border-ivory/20 px-4 py-1.5 font-accent text-xs text-ivory transition-colors hover:bg-ivory/10"
      >
        Dismiss
      </button>
    </div>
  );
}
