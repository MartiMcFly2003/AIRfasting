import { deriveTrack } from "@/lib/calendar/track";
import { createClient } from "@/lib/supabase/client";
import { toOnboardingProfile } from "./build-profile";
import type { OnboardingAnswers, YesNo, YesNoNotSure } from "./types";

function toBooleanOrNull(value: YesNoNotSure | YesNo | undefined): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null; // "not_sure" or unanswered
}

/** Upserts the wizard's answers into user_profiles. Reuses toOnboardingProfile()/deriveTrack()
 *  for the derivation itself — this function only adds the DB write on top. */
export async function saveOnboardingProfile(userId: string, answers: OnboardingAnswers): Promise<void> {
  const profile = toOnboardingProfile(answers);
  const track = deriveTrack(profile);

  const supabase = createClient();

  // The email-confirmation sign-up path (the common case once confirmation is enabled on a
  // project) never gets a chance to create the `users` row the way the immediate-session path
  // does in SignUpForm — so ensure it exists here too before writing user_profiles, which has
  // a foreign key to it.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error: userError } = await supabase
    .from("users")
    .upsert({ id: userId, email: user?.email ?? null });
  if (userError) throw userError;

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_profiles").upsert({
    user_id: userId,
    gender: answers.gender ?? null,
    age: answers.age ?? null,
    plan_type: profile.planType,
    track: track === "no_calendar" ? null : track,
    weekly_rhythm: track === "weekly_rhythm" || track === "no_cycle" ? "5-1-1" : null,
    last_period_date: answers.lastPeriodDate ?? null,
    dry_fasting_experience: toBooleanOrNull(answers.triedDryFasting),
    water_fasting_experience: toBooleanOrNull(answers.triedWaterFasting),
    goals: answers.goals ?? null,
    terms_accepted_at: answers.termsAccepted ? now : null,
    terms_version: answers.termsAccepted ? "v1.0" : null,
    health_data_consent_at: answers.healthDataConsent ? now : null,
    health_data_consent_version: answers.healthDataConsent ? "v1.0" : null,
    marketing_opt_in: answers.marketingOptIn ?? false,
    notifications_opt_in: answers.notificationsOptIn ?? false,
  });

  if (error) throw error;

  // user_profiles.last_period_date alone isn't enough — the calendar reads period history
  // from period_logs (it needs the full history, not just the latest date), so onboarding
  // needs to seed that first row too or a fresh menstrual/moon-sync user has an empty
  // history and cycle-phase math breaks immediately.
  if (answers.lastPeriodDate) {
    const { error: periodLogError } = await supabase
      .from("period_logs")
      .upsert(
        { user_id: userId, period_date: answers.lastPeriodDate },
        { onConflict: "user_id,period_date" },
      );
    if (periodLogError) throw periodLogError;
  }
}
