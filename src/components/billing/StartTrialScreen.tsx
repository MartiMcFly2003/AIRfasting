"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CancelLink, PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { InlineError, OnboardingShell } from "@/components/onboarding/OnboardingPrimitives";

export function StartTrialScreen() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartTrial() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/billing/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong — please try again.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setStarting(false);
    }
  }

  return (
    <OnboardingShell>
      <h1 className="font-heading text-2xl tracking-wide text-ivory">Try Premium free for 30 days</h1>
      <p className="mt-3 font-body text-sm leading-relaxed text-silver">
        Plan fasting days ahead, customize your weekly rhythm, and track your progress over time. Credit or
        debit card required to start — cancel anytime before the trial ends and you won&apos;t be charged.
      </p>

      {error && <InlineError>{error}</InlineError>}

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={handleStartTrial} disabled={starting}>
          {starting ? "Starting…" : "Start free trial"}
        </PrimaryButton>
        <CancelLink onClick={() => router.push("/calendar")}>Skip for now</CancelLink>
      </div>
    </OnboardingShell>
  );
}
