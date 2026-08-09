import { computeProfessionalGuidedGate, type OnboardingProfile } from "@/lib/calendar/track";
import type { OnboardingAnswers } from "./types";

/**
 * Maps wizard answers to the OnboardingProfile contract deriveTrack() expects — the only
 * place OnboardingProfile gets constructed. Pure function, called once when the wizard
 * completes.
 */
export function toOnboardingProfile(answers: OnboardingAnswers): OnboardingProfile {
  const professionalGuided =
    !answers.coachSupportConfirmed &&
    computeProfessionalGuidedGate({
      edHistory: answers.edHistory ?? "prefer_not_to_say",
      bingeEating: answers.bingeEating ?? "prefer_not_to_say",
    });

  return {
    planType: professionalGuided ? "professional_guided" : "standard",
    gender: answers.gender ?? "prefer_not_to_say",
    cycleStatus: answers.cycleStatus,
    lastPeriodDate: answers.lastPeriodDate ?? null,
    monthsSinceLastPeriod: answers.monthsSinceLastPeriod ?? null,
  };
}
