-- Fast reminders were all-or-nothing, which makes the only honest unsubscribe link an
-- all-or-nothing one. The two reminders serve quite different purposes, though: the day-before
-- one is about preparing (eat lighter, hydrate), the hour-before one is a starting pistol.
-- Somebody who finds one of them useful and the other an interruption had no way to say so, and
-- the only button available to them turned off the half they wanted too.
--
-- Two flags under the existing notifications_opt_in master switch rather than replacing it:
-- notifications_opt_in stays the single question onboarding and the confirmation prompt ask,
-- and these refine it for anyone who goes looking in Settings. Both default to true, so the
-- behaviour for everybody who has already opted in is exactly what it was.

alter table public.user_profiles
  add column if not exists fast_reminder_24h_opt_in boolean not null default true;
alter table public.user_profiles
  add column if not exists fast_reminder_1h_opt_in boolean not null default true;

-- No RLS policy changes — the existing "auth.uid() = user_id" policies on user_profiles
-- already cover new columns, and the sender reads them under the service role.
