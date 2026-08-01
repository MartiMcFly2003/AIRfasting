"use client";

export interface RegularDetectedBannerProps {
  averageCycleLength: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function RegularDetectedBanner({ averageCycleLength, onAccept, onDismiss }: RegularDetectedBannerProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="font-body text-sm text-ivory">
        Your cycle has been regular (~{averageCycleLength} days) for the last 3 months. Switch to the
        period-based calendar?
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-full bg-gold px-4 py-1.5 font-accent text-xs font-medium text-obsidian transition-opacity hover:opacity-90"
        >
          Switch (recommended)
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-ivory/20 px-4 py-1.5 font-accent text-xs text-ivory transition-colors hover:bg-ivory/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
