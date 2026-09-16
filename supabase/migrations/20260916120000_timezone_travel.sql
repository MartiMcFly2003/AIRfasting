-- Time zone stops being a single value once travel is in the picture. 20260906130000 captured
-- one zone per account, silently frozen at whatever the browser reported the moment they
-- answered; somebody who flies keeps being reminded on the wall clock they left behind.
--
-- Four columns rather than one, because "which zone" and "which zone do I go back to" are
-- genuinely different questions:
--
--   timezone                 the zone in effect now — what reminders and the fasting timer use
--   home_timezone            where they normally are, restored when a temporary switch expires
--   timezone_reverts_on      the date that temporary switch ends; null means "until I say so"
--   timezone_confirmed_at    when they last explicitly confirmed a zone, as opposed to us
--                            having detected one for them
--
-- The revert is resolved on read (see lib/timezone-preference.ts) rather than by a scheduled
-- job: there is nothing to send at the moment a trip ends, so a job would exist purely to
-- rewrite a row that every reader can work out for itself.

alter table public.user_profiles add column if not exists home_timezone text;
alter table public.user_profiles add column if not exists timezone_reverts_on date;
alter table public.user_profiles add column if not exists timezone_confirmed_at timestamptz;

-- The zone a traveller was offered and turned down. Without it the "looks like you've moved"
-- prompt reappears on every page load for as long as they stay put, which is the whole trip.
-- Cleared once the detected zone changes again, so a later move still asks.
alter table public.user_profiles add column if not exists timezone_travel_declined text;

-- Existing rows: anyone who already has a zone was never asked to confirm it, so they are left
-- unconfirmed on purpose and meet the confirmation prompt on their next visit. home_timezone is
-- seeded from it so a trip declared before that confirmation still has somewhere to return to.
update public.user_profiles set home_timezone = timezone where timezone is not null and home_timezone is null;

-- No RLS policy changes — the existing "auth.uid() = user_id" policies on user_profiles already
-- cover new columns, same as 20260906130000_user_timezone.sql.
