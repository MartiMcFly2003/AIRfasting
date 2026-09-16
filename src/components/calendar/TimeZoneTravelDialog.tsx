"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";
import { detectTimeZone } from "@/lib/user-timezone";
import { isoDateInZone } from "@/lib/zoned-time";
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

const DATE_INPUT =
  "mt-2 w-full rounded-lg border border-ivory/20 bg-transparent px-3 py-2 font-body text-sm text-ivory focus:outline-none [color-scheme:dark]";

export interface TimeZoneTravelDialogProps {
  userId: string;
  /** The zone reminders are currently timed to. */
  currentZone: string;
  /** A zone they already declined to switch to, so the same trip isn't queried twice. */
  declinedZone: string | null;
}

/**
 * Offered when the device reports a different zone than the account is set to — the ordinary
 * case being a trip.
 *
 * The switch is deliberately not automatic. A phone that picks up a new zone during a layover
 * would otherwise silently re-time every planned fast, and somebody fasting to a schedule they
 * set at home has a real interest in it not moving without them saying so.
 *
 * Declining is recorded (timezone_travel_declined) so the question isn't asked again on every
 * page load for the rest of the trip; a later move to a third zone asks afresh.
 */
export function TimeZoneTravelDialog({
  userId,
  currentZone,
  declinedZone,
}: TimeZoneTravelDialogProps) {
  const router = useRouter();
  // The comparison this dialog exists for can only be made in the browser, so it is made here
  // rather than on the server: the server has no idea where the reader is sitting.
  const hydrated = useHydrated();
  const detectedZone = hydrated ? detectTimeZone() : null;
  const [mode, setMode] = useState<"ask" | "until">("ask");
  const [until, setUntil] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Earliest sensible end date is tomorrow where they now are: a trip ending today is a trip
  // that already ended, and the revert resolves against the travel zone's calendar.
  const todayThere = detectedZone ? isoDateInZone(new Date(), detectedZone) : null;
  const minUntil = todayThere
    ? new Date(Date.parse(`${todayThere}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
    : undefined;

  async function apply(patch: Record<string, string | null>) {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update(patch)
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  // Nothing to ask when the device agrees with the account, can't say where it is, or is
  // reporting the very zone they already turned down.
  if (done || !detectedZone || detectedZone === currentZone || detectedZone === declinedZone) {
    return null;
  }

  return (
    <DialogShell>
      <DialogTitle>Have you changed time zone?</DialogTitle>
      <DialogBody>
        It looks like you&apos;re no longer in {currentZone} &mdash; this device says{" "}
        {detectedZone}. Would you like your fasting timer and reminders to follow local time?
      </DialogBody>

      {error && <InlineError>{error}</InlineError>}

      {mode === "ask" ? (
        <div className="mt-5 flex flex-col gap-2">
          <PrimaryButton onClick={() => setMode("until")} disabled={saving}>
            Yes, until a date I choose
          </PrimaryButton>
          <SecondaryButton
            onClick={() =>
              apply({
                timezone: detectedZone,
                timezone_reverts_on: null,
                timezone_travel_declined: null,
              })
            }
            disabled={saving}
          >
            {saving ? "Saving…" : "Yes, until I change it back myself"}
          </SecondaryButton>
          <SecondaryButton
            onClick={() => apply({ timezone_travel_declined: detectedZone })}
            disabled={saving}
          >
            No, keep {currentZone}
          </SecondaryButton>
        </div>
      ) : (
        <div className="mt-5">
          <p className="font-accent text-xs uppercase tracking-wider text-silver">
            Switch back to {currentZone} on
          </p>
          <input
            type="date"
            value={until}
            min={minUntil}
            onChange={(e) => setUntil(e.target.value)}
            className={DATE_INPUT}
            aria-label={`Date to switch back to ${currentZone}`}
          />
          <p className="mt-2 font-accent text-xs text-silver">
            We&apos;ll switch back to {currentZone} on that date without you having to do
            anything. You can change this any time in Settings.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <PrimaryButton
              onClick={() =>
                apply({
                  timezone: detectedZone,
                  timezone_reverts_on: until,
                  timezone_travel_declined: null,
                })
              }
              disabled={saving || !until}
            >
              {saving ? "Saving…" : `Use ${detectedZone} until then`}
            </PrimaryButton>
            <SecondaryButton onClick={() => setMode("ask")} disabled={saving}>
              Back
            </SecondaryButton>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
