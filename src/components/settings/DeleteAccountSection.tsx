"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { ManageSubscriptionLink } from "@/components/billing/ManageSubscriptionLink";
import { RESEARCH_CONSENT_VERSION } from "@/lib/billing/research-donation";
import { createClient } from "@/lib/supabase/client";

const BLOCKING_STATUSES = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

/** Matches AuthPrimitives.tsx / OnboardingPrimitives.tsx's InlineError — small intentional
 *  duplication rather than a cross-domain import, same rationale as those two. */
function InlineError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-accent text-xs text-coral">{children}</p>;
}

type Status = "idle" | "confirming" | "deleting" | "deleted";

export function DeleteAccountSection({ subscriptionStatus }: { subscriptionStatus: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // Starts false and stays false unless they tick it. Consent that arrives pre-ticked is not
  // consent, and this is health data.
  const [donateData, setDonateData] = useState(false);

  const blocked = subscriptionStatus != null && BLOCKING_STATUSES.has(subscriptionStatus);

  async function handleConfirmDelete() {
    setError(null);
    setStatus("deleting");
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donateData, consentVersion: RESEARCH_CONSENT_VERSION }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong — please try again.");
      setStatus("confirming");
      return;
    }

    setStatus("deleted");
    const supabase = createClient();
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  if (blocked) {
    return (
      <div>
        <h2 className="font-heading text-lg tracking-wide text-ivory">Delete account</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-silver">
          You have an active subscription. Cancel it before you can delete your account.
        </p>
        <div className="mt-3">
          <ManageSubscriptionLink />
        </div>
      </div>
    );
  }

  if (status === "deleted") {
    return (
      <div>
        <h2 className="font-heading text-lg tracking-wide text-ivory">Delete account</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-silver">
          Your account has been deleted. Redirecting…
        </p>
      </div>
    );
  }

  if (status === "confirming" || status === "deleting") {
    return (
      <div>
        <h2 className="font-heading text-lg tracking-wide text-ivory">Delete account</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-silver">
          This will permanently remove your fasting history, wellness logs, and account
          information, except where we&apos;re required to retain limited records by law (e.g.,
          billing records). This action cannot be undone. Do you want to proceed?
        </p>
        {/* Asked here rather than anywhere earlier: this is the one moment the answer is
            actually needed, and asking sooner would read as though leaving were being
            bargained with. Refusing changes nothing about what happens next. */}
        <div className="mt-4 rounded-xl border border-ivory/15 p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={donateData}
              onChange={(e) => setDonateData(e.target.checked)}
              disabled={status === "deleting"}
              className="mt-1"
            />
            <span className="font-body text-sm leading-relaxed text-silver">
              <span className="text-ivory">
                Before you go &mdash; may we keep your fasting data for research?
              </span>{" "}
              We&apos;d strip out everything that identifies you: no name, no email, not even the
              dates. What&apos;s left is how long your fasts were and where they fell in your
              cycle, which helps us understand how fasting and the menstrual cycle interact and
              build better guidance for everyone.
            </span>
          </label>
          <p className="mt-2 font-accent text-[11px] leading-relaxed text-silver">
            Entirely optional, and it can&apos;t be traced back to you afterwards &mdash; which
            also means we couldn&apos;t remove it later even if you asked. Your account is
            deleted either way.
          </p>
        </div>

        {error && <InlineError>{error}</InlineError>}
        <div className="mt-3 flex flex-col gap-2">
          <PrimaryButton onClick={handleConfirmDelete} disabled={status === "deleting"}>
            {status === "deleting" ? "Deleting…" : "Confirm Deletion"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setStatus("idle")} disabled={status === "deleting"}>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-lg tracking-wide text-ivory">Delete account</h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-silver">
        Permanently delete your AIRfasting account and all associated data.
      </p>
      <div className="mt-3">
        <SecondaryButton onClick={() => setStatus("confirming")}>Delete my account</SecondaryButton>
      </div>
    </div>
  );
}
