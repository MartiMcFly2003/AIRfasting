"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CancelLink, PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { computeProfessionalGuidedGate } from "@/lib/calendar/track";
import { saveOnboardingProfile } from "@/lib/onboarding/save-profile";
import { consumeSignupOptIns } from "@/lib/onboarding/signup-optins";
import type { OnboardingAnswers } from "@/lib/onboarding/types";
import { InlineError, OnboardingShell, ProgressDots } from "./OnboardingPrimitives";
import {
  ConsentScreen,
  CycleStatusScreen,
  FastingExperienceScreen,
  GoalsScreen,
  IdentityScreen,
  SafetyGateScreen,
} from "./OnboardingScreens";

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
      return a.termsAccepted === true && a.healthDataConsent === true;
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
        (!showsPregnancyQuestion || a.pregnancyOrTryingToConceive != null)
      );
    }
    case "goals":
      return true; // optional — doesn't feed deriveTrack or any gating this pass
  }
}

export interface OnboardingWizardProps {
  userId: string;
}

function getInitialAnswers(): OnboardingAnswers {
  if (typeof window === "undefined") return {};
  const { marketingOptIn, notificationsOptIn } = consumeSignupOptIns();
  return { marketingOptIn, notificationsOptIn };
}

export function OnboardingWizard({ userId }: OnboardingWizardProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<OnboardingAnswers>(getInitialAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const screens = visibleScreens(answers);
  const currentScreen = screens[stepIndex];

  function patch(next: Partial<OnboardingAnswers>) {
    setAnswers((prev) => ({ ...prev, ...next }));
  }

  async function handleNext() {
    if (!canProceed(currentScreen, answers)) return;

    if (currentScreen === "safety") {
      const gated = computeProfessionalGuidedGate({
        edHistory: answers.edHistory!,
        bingeEating: answers.bingeEating!,
      });
      if (gated) {
        router.push("/protocol-0");
        return;
      }
      // Pregnancy and actively trying to conceive are a hard contraindication for fasting,
      // not just a "start light" caution — same no-calendar treatment as the ED/binge gate.
      if (answers.pregnancyOrTryingToConceive === "yes") {
        router.push("/protocol-0?reason=pregnancy");
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

  return (
    <OnboardingShell>
      <ProgressDots total={screens.length} current={stepIndex} />

      {currentScreen === "consent" && <ConsentScreen answers={answers} onChange={patch} />}
      {currentScreen === "identity" && <IdentityScreen answers={answers} onChange={patch} />}
      {currentScreen === "cycle" && <CycleStatusScreen answers={answers} onChange={patch} />}
      {currentScreen === "fasting" && <FastingExperienceScreen answers={answers} onChange={patch} />}
      {currentScreen === "safety" && <SafetyGateScreen answers={answers} onChange={patch} />}
      {currentScreen === "goals" && <GoalsScreen answers={answers} onChange={patch} />}

      {saveError && <InlineError>{saveError}</InlineError>}

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton onClick={handleNext} disabled={!canProceed(currentScreen, answers) || saving}>
          {saving ? "Saving…" : currentScreen === "goals" ? "See my calendar" : "Next"}
        </PrimaryButton>
        {stepIndex > 0 ? (
          <SecondaryButton onClick={handleBack}>Back</SecondaryButton>
        ) : (
          <CancelLink onClick={() => router.push("/")}>Cancel</CancelLink>
        )}
      </div>
    </OnboardingShell>
  );
}
