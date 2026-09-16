"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { createClient } from "@/lib/supabase/client";
import { effectiveTimeZone, isTravelling } from "@/lib/timezone-preference";
import { useHydrated } from "@/lib/use-hydrated";
import { detectTimeZone, supportedTimeZones } from "@/lib/user-timezone";

/** Matches AuthPrimitives.tsx / OnboardingPrimitives.tsx's InlineError — small intentional
 *  duplication rather than a cross-domain import, same rationale as those two. */
function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}

const SELECT =
  "mt-2 w-full rounded-lg border border-ivory/20 bg-transparent px-3 py-2 font-body text-sm text-ivory focus:outline-none [color-scheme:dark]";

export interface TimeZoneSectionProps {
  userId: string;
  initialTimeZone: string | null;
  initialHomeTimeZone: string | null;
  initialRevertsOn: string | null;
}

function formatDay(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) return isoDate;
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TimeZoneSection({
  userId,
  initialTimeZone,
  initialHomeTimeZone,
  initialRevertsOn,
}: TimeZoneSectionProps) {
  // Both the device's zone and the full IANA list are browser-only, so they stay empty through
  // the first render and fill in once hydrated — otherwise the server renders one thing and
  // the browser another.
  const hydrated = useHydrated();
  const detected = hydrated ? detectTimeZone() : null;
  const zones = hydrated ? supportedTimeZones() : [];

  const [timezone, setTimezone] = useState(initialTimeZone);
  const [homeTimezone, setHomeTimezone] = useState(initialHomeTimeZone);
  const [revertsOn, setRevertsOn] = useState(initialRevertsOn);

  const preference = { timezone, homeTimezone, revertsOn };
  const now = new Date();
  const current = effectiveTimeZone(preference, now);
  const [choice, setChoice] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A trip only counts while it is still running — one whose end date has passed has already
  // been resolved away by effectiveTimeZone, and calling that "travelling" would be a lie.
  const travelling = isTravelling(preference, now) && revertsOn != null;

  const dirty = choice !== (current ?? "");
  // A zone we hold but the browser doesn't list (or the list being unavailable) still has to
  // appear, or saving would silently drop it.
  const options = choice && !zones.includes(choice) ? [choice, ...zones] : zones;

  async function persist(patch: {
    timezone: string | null;
    home_timezone: string | null;
    timezone_reverts_on: string | null;
  }) {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        ...patch,
        // Any pending "you seem to have moved" answer is about a comparison that no longer
        // holds once the zone is set by hand.
        timezone_travel_declined: null,
        timezone_confirmed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setTimezone(patch.timezone);
    setHomeTimezone(patch.home_timezone);
    setRevertsOn(patch.timezone_reverts_on);
    return true;
  }

  // Choosing a zone here means "this is where I am", not "I'm on a trip" — so it ends any trip
  // and moves home with it. Coming back early is the separate button below, which is the one
  // case where the two need to differ.
  async function handleSave() {
    const next = choice || null;
    await persist({ timezone: next, home_timezone: next, timezone_reverts_on: null });
  }

  async function handleReturnHome() {
    if (!homeTimezone) return;
    const ok = await persist({
      timezone: homeTimezone,
      home_timezone: homeTimezone,
      timezone_reverts_on: null,
    });
    if (ok) setChoice(homeTimezone);
  }

  return (
    <div>
      <h2 className="font-heading text-lg tracking-wide text-ivory">Time zone</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-silver">
        Used for your fasting timer and to send reminders about your scheduled fasts at the
        right local hour.
      </p>

      <p className="mt-3 font-body text-sm text-ivory">
        {current ? `Currently ${current}.` : "No time zone saved yet."}
      </p>
      {travelling && homeTimezone && revertsOn && (
        <p className="mt-1 font-accent text-xs text-silver">
          Travelling &mdash; switching back to {homeTimezone} on {formatDay(revertsOn)}.
        </p>
      )}

      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className={SELECT}
        aria-label="Time zone"
      >
        <option value="">Not set</option>
        {options.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>

      {detected && detected !== choice && (
        <div className="mt-2">
          <SecondaryButton onClick={() => setChoice(detected)}>
            Use my current time zone ({detected})
          </SecondaryButton>
        </div>
      )}

      {error && <InlineError>{error}</InlineError>}

      <div className="mt-3 flex flex-col gap-2">
        <PrimaryButton onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save time zone"}
        </PrimaryButton>
        {travelling && homeTimezone && (
          <SecondaryButton onClick={handleReturnHome} disabled={saving}>
            Back to {homeTimezone} now
          </SecondaryButton>
        )}
      </div>

      {!dirty && !saving && (
        <p className="mt-2 font-accent text-xs text-silver">
          {current ? `Reminders will follow ${current}.` : "No time zone saved yet."}
        </p>
      )}
    </div>
  );
}
