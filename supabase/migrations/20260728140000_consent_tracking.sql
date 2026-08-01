-- Consent tracking for the legal-framework pass: explicit Terms/Privacy acceptance and
-- explicit Art. 9 GDPR health-data consent, both captured on the new onboarding consent screen
-- and written together in saveOnboardingProfile's existing user_profiles upsert.
-- notifications_opt_in is new; marketing_opt_in already existed (initial_schema.sql) but was
-- never wired up until this pass's sign-up form.

alter table public.user_profiles add column terms_accepted_at timestamptz;
alter table public.user_profiles add column terms_version text;
alter table public.user_profiles add column health_data_consent_at timestamptz;
alter table public.user_profiles add column health_data_consent_version text;
alter table public.user_profiles add column notifications_opt_in boolean not null default false;

-- No RLS policy changes — the existing "auth.uid() = user_id" insert/update policies on
-- user_profiles already cover these new columns.
