"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";
import { detectTimeZone, supportedTimeZoneOptions } from "@/lib/user-timezone";
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

const SELECT =
  "mt-2 w-full rounded-lg border border-ivory/20 bg-obsidian px-3 py-2 font-body text-sm text-ivory focus:outline-none [color-scheme:dark]";

export interface TimeZoneConfirmDialogProps {
  userId: string;
  /** The zone already on the account, if any — shown as the answer when detection fails. */
  savedTimeZone: string | null;
  /**
   * Whether this dialog also has to carry the notifications question. True for accounts that
   * never answered it, which is most of them: notifications_opt_in defaults to false, so an
   * unanswered account is indistinguishable from a considered no until they are asked.
   * Accounts that did answer keep their answer — being asked to confirm a time zone is not a
   * reason to reopen a decision somebody already made.
   */
  needsOptIn: boolean;
}

/**
 * Shown once to existing accounts now that fast reminders actually send, replacing the earlier
 * "we're adding reminders" prompt this supersedes.
 *
 * It asks for a time zone rather than quietly detecting one because the detected zone is what
 * reminders will be timed to, and a wrong guess is invisible until a reminder lands at 3am.
 * Confirming also stamps home_timezone: the travel prompt needs somewhere to return to, and
 * this is the moment we can reasonably call "home".
 *
 * As with the prompt it replaces, there is deliberately no dismiss that records nothing — that
 * would just bring the dialog back on the next visit.
 */
export function TimeZoneConfirmDialog({
  userId,
  savedTimeZone,
  needsOptIn,
}: TimeZoneConfirmDialogProps) {
  const router = useRouter();
  // Browser-only, so it stays null through the first render — see useHydrated.
  const hydrated = useHydrated();
  const detected = hydrated ? detectTimeZone() : null;
  const zones = hydrated ? supportedTimeZoneOptions() : [];

  const [choice, setChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Null choice means "whatever we'd propose" — resolved at render so the value can appear once
  // hydration supplies a detected zone, without an effect writing it into state first.
  const zone = choice ?? detected ?? savedTimeZone ?? "";
  const options =
    zone && !zones.some((tz) => tz.value === zone) ? [{ value: zone, label: zone }, ...zones] : zones;

  async function save(optIn: boolean | null) {
    setError(null);
    setSaving(true);

    const now = new Date().toISOString();
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        timezone_confirmed_at: now,
        // A confirmed zone is by definition where they are and where they'll return to, so any
        // trip recorded before now is stale — clearing both keeps the travel prompt honest.
        timezone_reverts_on: null,
        timezone_travel_declined: null,
        ...(zone ? { timezone: zone, home_timezone: zone } : {}),
        ...(optIn == null
          ? {}
          : { notifications_opt_in: optIn, notifications_prompt_answered_at: now }),
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
      <DialogTitle>Reminders for your fasts are here</DialogTitle>
      <DialogBody>
        Reminders for the fasts you schedule are now live &mdash; a nudge the day before and
        again an hour ahead, so a planned fast doesn&apos;t quietly slip by. Please confirm the
        time zone we should use, so they arrive at the right local hour.
      </DialogBody>

      <select
        value={zone}
        onChange={(e) => setChoice(e.target.value)}
        className={SELECT}
        aria-label="Your time zone"
      >
        {!zone && (
          <option value="" className="bg-obsidian text-ivory">
            Select your time zone
          </option>
        )}
        {options.map((tz) => (
          <option key={tz.value} value={tz.value} className="bg-obsidian text-ivory">
            {tz.label}
          </option>
        ))}
      </select>
      <p className="mt-2 font-accent text-xs text-silver">
        Used for your fasting timer, your lunar cycle dates, and reminders. You can change it
        any time in Settings.
      </p>

      {error && <InlineError>{error}</InlineError>}

      {needsOptIn ? (
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={() => save(true)} disabled={saving}>
            {saving ? "Saving…" : "Confirm and send me reminders"}
          </PrimaryButton>
          <SecondaryButton onClick={() => save(false)} disabled={saving}>
            Confirm, but no reminders
          </SecondaryButton>
        </div>
      ) : (
        <div className="mt-5">
          <PrimaryButton onClick={() => save(null)} disabled={saving}>
            {saving ? "Saving…" : "Confirm time zone"}
          </PrimaryButton>
        </div>
      )}
    </DialogShell>
  );
}
