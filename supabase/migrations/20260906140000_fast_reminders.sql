-- Stamps for the two reminders a planned fast gets, so a cron that runs hourly (and may run
-- more than once in an hour, or be replayed) can't send the same one twice. Same idiom as
-- user_profiles.trial_reminder_sent_at.
--
-- Two columns rather than a reminders table: there are exactly two per plan, they're written
-- once, and they're never queried independently of the plan itself.

alter table public.fast_plans add column if not exists reminder_24h_sent_at timestamptz;
alter table public.fast_plans add column if not exists reminder_1h_sent_at timestamptz;

-- The cron scans a few days either side of today across every user, which is the only query in
-- the app that reads fast_plans without a user_id filter.
create index if not exists fast_plans_planned_date_idx on public.fast_plans (planned_date);

-- No RLS policy changes — the sender runs under the service role, and the existing
-- "auth.uid() = user_id" policies already cover the new columns for everyone else.
