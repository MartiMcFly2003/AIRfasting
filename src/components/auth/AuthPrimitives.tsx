"use client";

/**
 * Same card styling as onboarding/OnboardingPrimitives.tsx's OnboardingShell — a small
 * intentional duplication rather than a cross-domain import, matching how OnboardingShell
 * itself duplicated DialogShell's classes instead of importing it.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-ivory/10 bg-obsidian p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      {children}
    </div>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}

export const FIELD_LABEL = "font-accent text-xs uppercase tracking-wider text-silver";
export const TEXT_INPUT =
  "mt-1 w-full rounded-lg border border-ivory/20 bg-transparent px-3 py-2 font-body text-sm text-ivory focus:outline-none [color-scheme:dark]";
