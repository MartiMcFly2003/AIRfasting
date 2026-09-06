-- Existing accounts never got a fair chance to answer the notifications question. The sign-up
-- checkbox carrying it was overlapped by the cookie banner on shorter viewports, and the answer
-- was dropped in transit regardless (it rode in sessionStorage across the email-confirmation
-- round trip). Everyone therefore sits at notifications_opt_in = false whatever they actually
-- wanted, and false is indistinguishable from a considered no.
--
-- Null here means "hasn't been asked yet", which is every row that exists today, so they get
-- the in-app prompt once. saveOnboardingProfile stamps it for anyone coming through the new
-- consent screen, since those people have already answered deliberately.

alter table public.user_profiles add column notifications_prompt_answered_at timestamptz;

-- No RLS policy changes — the existing "auth.uid() = user_id" insert/update policies on
-- user_profiles already cover the new column, same as 20260728140000_consent_tracking.sql.
