"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";
import { detectTimeZone } from "@/lib/user-timezone";
import {
  DialogBody,
  DialogShell,
  DialogTitle,
  PrimaryButton,
  SecondaryButton,
} from "./DialogPrimitives";

/** Matches AuthPrimitives.tsx / OnboardingPrimitives.tsx's InlineError — small intentional
 *  duplication rather than a cross-domain import, same rationale as those two. */
function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}

export interface NotificationsPromptDialogProps {
  userId: string;
}

/**
 * Shown once to accounts that pre-date the onboarding consent screen, which is the only reason
 * this exists — see 20260906120000_notifications_prompt.sql. Either answer is recorded and
 * stamps notifications_prompt_answered_at, so nobody is asked twice, including the people who
 * say no. There is deliberately no third way out: a dismiss that records nothing would just
 * bring the dialog back on the next visit.
 */
export function NotificationsPromptDialog({ userId }: NotificationsPromptDialogProps) {
  const router = useRouter();
  // Browser-only, so it stays null through the first render — see useHydrated.
  const hydrated = useHydrated();
  const timeZone = hydrated ? detectTimeZone() : null;
  const [answered, setAnswered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(optIn: boolean) {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        notifications_opt_in: optIn,
        notifications_prompt_answered_at: new Date().toISOString(),
        // Only when we actually have one — writing null over a zone they already set in
        // Settings would be worse than leaving it alone.
        ...(timeZone ? { timezone: timeZone } : {}),
      })
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Hide straight away, then let the server component re-read so a later navigation doesn't
    // bring the prompt back before the new value has been picked up.
    setAnswered(true);
    router.refresh();
  }

  if (answered) return null;

  return (
    <DialogShell>
      <DialogTitle>Reminders for your fasts</DialogTitle>
      <DialogBody>
        We&apos;re adding reminders for the fasts you schedule &mdash; a nudge before each one
        begins, so a planned fast doesn&apos;t quietly slip by. Would you like these once
        they&apos;re ready? You can change your mind any time in Settings.
      </DialogBody>
      {timeZone && (
        <p className="mt-2 font-accent text-xs text-silver">
          We&apos;ll time them to {timeZone}. You can change that in Settings.
        </p>
      )}
      {error && <InlineError>{error}</InlineError>}
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={() => answer(true)} disabled={saving}>
          {saving ? "Saving…" : "Yes, remind me"}
        </PrimaryButton>
        <SecondaryButton onClick={() => answer(false)} disabled={saving}>
          No thanks
        </SecondaryButton>
      </div>
    </DialogShell>
  );
}
