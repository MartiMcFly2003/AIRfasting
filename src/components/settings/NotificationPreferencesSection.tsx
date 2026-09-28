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
  initialReminder24h: boolean;
  initialReminder1h: boolean;
}

export function NotificationPreferencesSection({
  userId,
  initialNotificationsOptIn,
  initialMarketingOptIn,
  initialReminder24h,
  initialReminder1h,
}: NotificationPreferencesSectionProps) {
  const [notificationsOptIn, setNotificationsOptIn] = useState(initialNotificationsOptIn);
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [reminder24h, setReminder24h] = useState(initialReminder24h);
  const [reminder1h, setReminder1h] = useState(initialReminder1h);
  // What's actually in the database, so "Save" can stay disabled until something differs and
  // the confirmation can disappear again as soon as it doesn't.
  const [saved, setSaved] = useState({
    notifications: initialNotificationsOptIn,
    marketing: initialMarketingOptIn,
    reminder24h: initialReminder24h,
    reminder1h: initialReminder1h,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    notificationsOptIn !== saved.notifications ||
    marketingOptIn !== saved.marketing ||
    reminder24h !== saved.reminder24h ||
    reminder1h !== saved.reminder1h;

  // Unticking both of the two is the same wish as unticking the parent, and leaving the parent
  // on with nothing under it would mean "send me reminders" while none can be sent.
  function setKind(kind: "24h" | "1h", next: boolean) {
    const both = kind === "24h" ? { a: next, b: reminder1h } : { a: reminder24h, b: next };
    if (kind === "24h") setReminder24h(next);
    else setReminder1h(next);
    if (!both.a && !both.b) setNotificationsOptIn(false);
    else if (next) setNotificationsOptIn(true);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        notifications_opt_in: notificationsOptIn,
        marketing_opt_in: marketingOptIn,
        fast_reminder_24h_opt_in: reminder24h,
        fast_reminder_1h_opt_in: reminder1h,
      })
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved({
      notifications: notificationsOptIn,
      marketing: marketingOptIn,
      reminder24h,
      reminder1h,
    });
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
            <span className="text-ivory">Fasting reminders</span> — emails about the fasts you
            schedule.
          </span>
        </label>

        {/* Indented under the switch they refine, and dimmed rather than removed when reminders
            are off, so the choice stays visible as something you get back by turning them on. */}
        <div
          className={`ml-7 flex flex-col gap-2 border-l border-ivory/10 pl-4 ${
            notificationsOptIn ? "" : "opacity-40"
          }`}
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={reminder24h}
              disabled={!notificationsOptIn}
              onChange={(e) => setKind("24h", e.target.checked)}
              className="mt-1"
            />
            <span className="font-body text-sm leading-relaxed text-silver">
              The day before &mdash; time to eat lighter and hydrate.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={reminder1h}
              disabled={!notificationsOptIn}
              onChange={(e) => setKind("1h", e.target.checked)}
              className="mt-1"
            />
            <span className="font-body text-sm leading-relaxed text-silver">
              An hour before &mdash; your fast is about to start.
            </span>
          </label>
        </div>

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
