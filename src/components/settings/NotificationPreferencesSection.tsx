"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { createClient } from "@/lib/supabase/client";

/** Matches AuthPrimitives.tsx / OnboardingPrimitives.tsx's InlineError — small intentional
 *  duplication rather than a cross-domain import, same rationale as those two. */
function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}

export interface NotificationPreferencesSectionProps {
  userId: string;
  initialNotificationsOptIn: boolean;
  initialMarketingOptIn: boolean;
}

export function NotificationPreferencesSection({
  userId,
  initialNotificationsOptIn,
  initialMarketingOptIn,
}: NotificationPreferencesSectionProps) {
  const [notificationsOptIn, setNotificationsOptIn] = useState(initialNotificationsOptIn);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  // What's actually in the database, so "Save" can stay disabled until something differs and
  // the confirmation can disappear again as soon as it doesn't.
  const [saved, setSaved] = useState({
    notifications: initialNotificationsOptIn,
    marketing: initialMarketingOptIn,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    notificationsOptIn !== saved.notifications || marketingOptIn !== saved.marketing;

  async function handleSave() {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        notifications_opt_in: notificationsOptIn,
        marketing_opt_in: marketingOptIn,
      })
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved({ notifications: notificationsOptIn, marketing: marketingOptIn });
  }

  return (
    <div>
      <h2 className="font-heading text-lg tracking-wide text-ivory">Notifications</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-silver">
        Choose what AIRfasting sends you. You can change this at any time.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={notificationsOptIn}
            onChange={(e) => setNotificationsOptIn(e.target.checked)}
            className="mt-1"
          />
          <span className="font-body text-sm leading-relaxed text-silver">
            <span className="text-ivory">In-app notifications</span> — fasting reminders for
            your scheduled fasts, plus trial updates.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-1"
          />
          <span className="font-body text-sm leading-relaxed text-silver">
            <span className="text-ivory">Marketing emails</span> — wellness tips, product
            updates, and offers.
          </span>
        </label>
      </div>
      {error && <InlineError>{error}</InlineError>}
      <div className="mt-3">
        <PrimaryButton onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save preferences"}
        </PrimaryButton>
      </div>
      {!dirty && !saving && (
        <p className="mt-2 font-accent text-xs text-silver">Your preferences are saved.</p>
      )}
    </div>
  );
}
