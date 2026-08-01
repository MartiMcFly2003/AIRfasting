"use client";

/**
 * Same card styling as calendar/DialogPrimitives.tsx's DialogShell, but statically positioned
 * rather than a fixed full-viewport overlay — /onboarding is a standalone page with nothing
 * behind the wizard, so there's no backdrop to blur.
 */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-ivory/10 bg-obsidian p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      {children}
    </div>
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mb-5 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === current ? "bg-coral" : "bg-ivory/20"}`} />
      ))}
    </div>
  );
}

export interface ChoiceButtonProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

/** Generalizes FastPlanDialogs.tsx's FastTypeButton idiom for both single- and multi-select. */
export function ChoiceButton({ label, selected, onSelect }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border px-4 py-3 text-left font-accent text-sm transition-colors ${
        selected ? "border-transparent bg-coral text-obsidian" : "border-ivory/20 text-ivory hover:bg-ivory/10"
      }`}
    >
      {label}
    </button>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}
