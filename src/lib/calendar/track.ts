import type { Track } from "./types";

export interface OnboardingProfile {
  planType: "standard" | "professional_guided";
  gender: "woman" | "man" | "self_describe" | "prefer_not_to_say";
  cycleStatus?: "regular" | "irregular" | "no_periods" | "not_sure";
  lastPeriodDate?: string | null;
  monthsSinceLastPeriod?: number | null;
  /** Premium "menopause mode" toggle in account settings overrides the onboarding answers. */
  menopauseIndicated?: boolean;
}

/** Q29/Q29b safety-gate outcome — computed separately, upstream of track derivation. */
export function isProfessionalGuided(profile: OnboardingProfile): boolean {
  return profile.planType === "professional_guided";
}

export interface SafetyGateAnswers {
  edHistory: "current" | "past_working_through" | "past_recovered" | "no" | "prefer_not_to_say";
  bingeEating: "often" | "sometimes" | "rarely_never" | "prefer_not_to_say";
}

/**
 * Q29/Q29b onboarding safety gate: ED history "currently" or "still working through it", OR
 * binge-eating "often". Feeds `OnboardingProfile.planType` upstream of `deriveTrack` — doesn't
 * touch `isProfessionalGuided`/`deriveTrack`, which stay reading the already-known planType.
 */
export function computeProfessionalGuidedGate(answers: SafetyGateAnswers): boolean {
  return (
    answers.edHistory === "current" ||
    answers.edHistory === "past_working_through" ||
    answers.bingeEating === "often"
  );
}

/**
 * Backend-only track derivation — never shown to the user. Mirrors the brief's
 * pseudocode exactly; see AIR_ClaudeCode_Brief.md "Track derivation".
 */
export function deriveTrack(profile: OnboardingProfile): Track | "no_calendar" {
  if (isProfessionalGuided(profile)) return "no_calendar";
  if (profile.gender === "man") return "no_cycle";
  if (profile.menopauseIndicated) return "weekly_rhythm";
  if (profile.cycleStatus === "not_sure") return "gentle_starter";
  if (profile.cycleStatus === "regular" && profile.lastPeriodDate) return "menstrual";
  if (profile.cycleStatus === "irregular") return "moon_sync";
  if (profile.cycleStatus === "no_periods") {
    const months = profile.monthsSinceLastPeriod ?? 0;
    return months >= 3 ? "weekly_rhythm" : "moon_sync_bridging";
  }
  // Regular cycle but no period date on file yet — fall back to the conservative default
  // rather than generating a menstrual calendar with no Day 1 to anchor it.
  return "gentle_starter";
}
