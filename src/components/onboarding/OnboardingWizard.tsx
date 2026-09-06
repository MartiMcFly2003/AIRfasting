"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CancelLink, PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { computeProfessionalGuidedGate } from "@/lib/calendar/track";
import { saveOnboardingProfile } from "@/lib/onboarding/save-profile";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { InlineError, OnboardingShell, ProgressDots } from "./OnboardingPrimitives";
import {
  ConsentScreen,
  CycleStatusScreen,
  FastingExperienceScreen,
  GoalsScreen,
  IdentityScreen,
  SafetyGateScreen,
  SafetyOverrideScreen,
} from "./OnboardingScreens";

type GateReason = "ed_binge" | "trying_to_conceive";

const GATE_COPY: Record<GateReason, { body: string; buttonLabels: string[] }> = {
  ed_binge: {
    body: "Thank you for being honest with us. Based on what you shared, we'd rather start with a real conversation than a calendar. AIRfasting works best alongside proper support when food and fasting have felt complicated before. We advise you to get in touch with a fasting or nutritional coach first, to get support and additional direction during your individual journey.",
    buttonLabels: [
      "I'm currently receiving and/or recently received coach support to help guide my fasting",
    ],
  },
  trying_to_conceive: {
    body: "Thank you for letting us know you're trying to conceive. Fasting can still be part of your routine for many people in this phase, but we'd recommend looping in a fasting or nutritional coach to help make sure your plan is optimally supporting you right now.",
    buttonLabels: [
      "I'm currently receiving and/or recently received coach support to help guide my fasting",
      "I haven't been in contact yet but show me my plan that I can discuss it with a coach",
    ],
  },
};

type ScreenId = "consent" | "identity" | "cycle" | "fasting" | "safety" | "goals";

/** Screen 2 (cycle status) only shows for "Woman" or "self-describe" — matches the brief exactly. */
function visibleScreens(answers: OnboardingAnswers): ScreenId[] {
  const showsCycle = answers.gender === "woman" || answers.gender === "self_describe";
  return showsCycle
    ? ["consent", "identity", "cycle", "fasting", "safety", "goals"]
    : ["consent", "identity", "fasting", "safety", "goals"];
}

function canProceed(screen: ScreenId, a: OnboardingAnswers): boolean {
  switch (screen) {
    case "consent":
      return (
        a.termsAccepted === true &&
        a.healthDataConsent === true &&
        a.notificationsOptIn != null &&
        a.marketingOptIn != null
      );
    case "identity":
      return a.gender != null && a.age != null && a.age >= 18;
    case "cycle":
      if (a.cycleStatus == null) return false;
      if (a.cycleStatus === "regular" || a.cycleStatus === "irregular") return a.lastPeriodDate != null;
      if (a.cycleStatus === "no_periods") return a.monthsSinceLastPeriod != null;
      return true; // not_sure — no follow-up needed
    case "fasting":
      return a.triedDryFasting != null && a.triedWaterFasting != null;
    case "safety": {
      const showsPregnancyQuestion = a.gender === "woman" || a.gender === "self_describe";
      return (
        a.edHistory != null &&
        a.bingeEating != null &&
        a.healthConditions != null &&
        a.healthConditions.length > 0 &&
        (!showsPregnancyQuestion || (a.pregnant != null && a.tryingToConceive != null))
      );
    }
    case "goals":
      return true; // optional — doesn't feed deriveTrack or any gating this pass
  }
}

export interface OnboardingWizardProps {
  userId: string;
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const router = useRouter();
  // Reminders for fasts the user schedules themselves are part of the service being signed
  // up for, so they start on. Marketing starts empty on purpose — a pre-selected answer isn't
  // a valid opt-in, so it has to be actively chosen.
  const [answers, setAnswers] = useState<OnboardingAnswers>({ notificationsOptIn: true });
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gateReason, setGateReason] = useState<GateReason | null>(null);
  const [consentGapNudge, setConsentGapNudge] = useState(0);

  const screens = visibleScreens(answers);
  const currentScreen = screens[stepIndex];

  function patch(next: Partial<OnboardingAnswers>) {
    setAnswers((prev) => ({ ...prev, ...next }));
  }

  async function handleNext() {
    if (!canProceed(currentScreen, answers)) {
      // The consent screen points at what's still unanswered rather than leaving a dead button
      // with no explanation of why it won't move.
      if (currentScreen === "consent") setConsentGapNudge((n) => n + 1);
      return;
    }

    if (currentScreen === "safety") {
      const gated = computeProfessionalGuidedGate({
        edHistory: answers.edHistory!,
        bingeEating: answers.bingeEating!,
      });
      if (gated) {
        setGateReason("ed_binge");
        return;
      }
      // Pregnancy is a genuine medical contraindication for fasting — a hard stop with no
      // override, unlike every other case on this screen.
      if (answers.pregnant === "yes") {
        router.push("/protocol-0?reason=pregnancy");
        return;
      }
      // Trying to conceive isn't a contraindication the way pregnancy is — it's a softer nudge
      // toward coach support, so it gets the same self-attestation treatment as the ED/binge gate.
      if (answers.tryingToConceive === "yes") {
        setGateReason("trying_to_conceive");
        return;
      }
    }

    if (currentScreen === "goals") {
      setSaveError(null);
      setSaving(true);
      try {
        await saveOnboardingProfile(userId, answers);
        router.push("/start-trial");
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Something went wrong — please try again.");
        setSaving(false);
      }
      return;
    }

    setStepIndex((i) => i + 1);
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleProceedPastGate() {
    // Only the ED/binge gate is tied to the profile's professional_guided flag — trying-to-conceive
    // never touched track derivation in the first place, so there's nothing to bypass there.
    if (gateReason === "ed_binge") patch({ coachSupportConfirmed: true });
    setGateReason(null);
    setStepIndex((i) => i + 1);
  }

  return (
    <OnboardingShell>
      <ProgressDots total={screens.length} current={stepIndex} />

      {gateReason ? (
        <SafetyOverrideScreen
          body={GATE_COPY[gateReason].body}
          buttons={GATE_COPY[gateReason].buttonLabels.map((label) => ({
            label,
            onClick: handleProceedPastGate,
          }))}
        />
      ) : (
        <>
          {currentScreen === "consent" && (
            <ConsentScreen answers={answers} onChange={patch} gapNudge={consentGapNudge} />
          )}
          {currentScreen === "identity" && <IdentityScreen answers={answers} onChange={patch} />}
          {currentScreen === "cycle" && <CycleStatusScreen answers={answers} onChange={patch} />}
          {currentScreen === "fasting" && <FastingExperienceScreen answers={answers} onChange={patch} />}
          {currentScreen === "safety" && <SafetyGateScreen answers={answers} onChange={patch} />}
          {currentScreen === "goals" && <GoalsScreen answers={answers} onChange={patch} />}

          {saveError && <InlineError>{saveError}</InlineError>}

          <div className="mt-5 flex flex-col gap-2">
            <PrimaryButton
              onClick={handleNext}
              disabled={saving || (currentScreen !== "consent" && !canProceed(currentScreen, answers))}
            >
              {saving ? "Saving…" : currentScreen === "goals" ? "See my calendar" : "Next"}
            </PrimaryButton>
            {stepIndex > 0 ? (
              <SecondaryButton onClick={handleBack}>Back</SecondaryButton>
            ) : (
              <CancelLink onClick={() => router.push("/")}>Cancel</CancelLink>
            )}
          </div>
        </>
      )}
    </OnboardingShell>
  );
}
