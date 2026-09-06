"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { createClient } from "@/lib/supabase/client";
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
}

export function TimeZoneSection({ userId, initialTimeZone }: TimeZoneSectionProps) {
  // Both the device's zone and the full IANA list are browser-only, so they stay empty through
  // the first render and fill in once hydrated — otherwise the server renders one thing and
  // the browser another.
  const hydrated = useHydrated();
  const detected = hydrated ? detectTimeZone() : null;
  const zones = hydrated ? supportedTimeZones() : [];

  const [choice, setChoice] = useState(initialTimeZone ?? "");
  const [saved, setSaved] = useState(initialTimeZone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = choice !== saved;
  // A zone we hold but the browser doesn't list (or the list being unavailable) still has to
  // appear, or saving would silently drop it.
  const options = choice && !zones.includes(choice) ? [choice, ...zones] : zones;

  async function handleSave() {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ timezone: choice || null })
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(choice);
  }

  return (
    <div>
      <h2 className="font-heading text-lg tracking-wide text-ivory">Time zone</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-silver">
        Used to time reminders about your scheduled fasts. Change it if you&apos;re travelling
        and want them to follow local time.
      </p>

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

      <div className="mt-3">
        <PrimaryButton onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save time zone"}
        </PrimaryButton>
      </div>

      {!dirty && !saving && (
        <p className="mt-2 font-accent text-xs text-silver">
          {saved ? `Reminders will follow ${saved}.` : "No time zone saved yet."}
        </p>
      )}
    </div>
  );
}
