-- Reminders about a scheduled fast are only useful if they land at the right local hour, and
-- nothing so far records which hour that is for a given person. Captured from the browser
-- (IANA name, e.g. "Europe/Madrid") when they answer the notifications prompt or finish
-- onboarding, and changeable in Settings for anyone who travels.
--
-- Nullable with no default: an account whose browser couldn't tell us is better left null than
-- silently assumed to be in some default zone, which would send reminders at the wrong time
-- without anyone knowing why.
--
-- Note this is not the same thing as the lat/lon the calendar still hardcodes for its
-- sunrise-anchored Ekadashi maths — a time zone can't stand in for coordinates.

alter table public.user_profiles add column timezone text;

-- No RLS policy changes — the existing "auth.uid() = user_id" insert/update policies on
-- user_profiles already cover the new column.
