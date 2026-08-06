import type { ISODate } from "@/lib/calendar";

export type Gender = "woman" | "man" | "self_describe" | "prefer_not_to_say";
export type CycleStatus = "regular" | "irregular" | "no_periods" | "not_sure";
export type YesNoNotSure = "yes" | "no" | "not_sure";
export type YesNo = "yes" | "no";
export type EdHistory = "current" | "past_working_through" | "past_recovered" | "no" | "prefer_not_to_say";
export type BingeEating = "often" | "sometimes" | "rarely_never" | "prefer_not_to_say";
export type HealthCondition =
  | "diabetes"
  | "heart_condition"
  | "kidney_disease"
  | "breastfeeding"
  | "medication"
  | "other"
  | "none";
export type Goal =
  | "weight_loss"
  | "hormonal_balance"
  | "cycle_awareness"
  | "spiritual_practice"
  | "general_wellness"
  | "energy"
  | "other";

/**
 * Full wizard answer state — a superset of OnboardingProfile (track.ts): carries fields
 * deriveTrack never sees (age, fasting history, raw Q29/Q29b answers, goals). build-profile.ts
 * maps this down to the OnboardingProfile contract once the wizard completes.
 */
export interface OnboardingAnswers {
  gender?: Gender;
  age?: number;
  cycleStatus?: CycleStatus;
  lastPeriodDate?: ISODate | null;
  monthsSinceLastPeriod?: number | null;
  triedDryFasting?: YesNoNotSure;
  triedWaterFasting?: YesNo;
  edHistory?: EdHistory;
  bingeEating?: BingeEating;
  healthConditions?: HealthCondition[];
  /** Hard-blocks calendar generation (like the ED/binge gate) — pregnancy and actively trying
   *  to conceive are contraindications for fasting, not just a "start light" caution. */
  pregnancyOrTryingToConceive?: YesNo;
  goals?: Goal[];
  termsAccepted?: boolean;
  healthDataConsent?: boolean;
  marketingOptIn?: boolean;
  notificationsOptIn?: boolean;
}
