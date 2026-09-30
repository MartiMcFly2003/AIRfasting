-- Row-level security said "you may update your own profile" and stopped there. It never said
-- *which columns*, and role / subscription_status / stripe_* all live in that same row — so any
-- signed-in person could set themselves to premium with one call against the public anon key,
-- which ships in the page by design. No exploit needed; it is a documented API call.
--
-- RLS answers "whose row is this". Column privileges answer "which parts of it may you change",
-- and the second question was never asked. They compose: a write must satisfy both.
--
-- The split below is simply what the browser actually writes today — onboarding, the time-zone
-- dialogs, notification preferences and the calendar's own fields — against everything only
-- Stripe's webhook and the crons have any business touching. Those run under the service role,
-- which bypasses both RLS and these grants, so the sender, the freeze job and the webhook are
-- unaffected.
--
-- To undo: grant update on public.user_profiles to authenticated;

revoke insert, update on public.user_profiles from anon, authenticated;

-- Columns the app legitimately writes from the browser. user_id is included because an upsert
-- names it in the conflict update; RLS still forbids pointing a row at somebody else, since an
-- UPDATE policy with no WITH CHECK applies its USING clause to the new row as well.
grant insert (
  user_id,
  gender,
  age,
  plan_type,
  track,
  cycle_length,
  paused_reason,
  last_period_date,
  dry_fasting_experience,
  water_fasting_experience,
  goals,
  terms_accepted_at,
  terms_version,
  health_data_consent_at,
  health_data_consent_version,
  marketing_opt_in,
  notifications_opt_in,
  notifications_prompt_answered_at,
  fast_reminder_24h_opt_in,
  fast_reminder_1h_opt_in,
  timezone,
  home_timezone,
  timezone_confirmed_at,
  timezone_reverts_on,
  timezone_travel_declined
) on public.user_profiles to authenticated;

grant update (
  user_id,
  gender,
  age,
  plan_type,
  track,
  cycle_length,
  paused_reason,
  last_period_date,
  dry_fasting_experience,
  water_fasting_experience,
  goals,
  terms_accepted_at,
  terms_version,
  health_data_consent_at,
  health_data_consent_version,
  marketing_opt_in,
  notifications_opt_in,
  notifications_prompt_answered_at,
  fast_reminder_24h_opt_in,
  fast_reminder_1h_opt_in,
  timezone,
  home_timezone,
  timezone_confirmed_at,
  timezone_reverts_on,
  timezone_travel_declined
) on public.user_profiles to authenticated;

-- Deliberately absent, and therefore writable only by the service role:
--   role, subscription_status, trial_ends_at, trial_reminder_sent_at,
--   stripe_customer_id, stripe_subscription_id,
--   past_due_since, dunning_frozen_at, dunning_last_invoice, dunning_warned_at
-- Also absent because nothing writes them at all today — menopause_mode, weekly_rhythm,
-- weekly_rhythm_deep_fasting_days, faith_preferences. If a feature starts writing one from the
-- browser it will fail loudly here, which is the right way round: a new column is locked until
-- somebody decides it should not be.
