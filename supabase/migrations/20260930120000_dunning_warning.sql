-- The freeze was announced only once it had already happened. Somebody whose card expired
-- quietly six days ago gets one email saying their Premium has stopped — when a day's notice
-- would have let them fix it and never notice the interruption at all.
--
-- Stamped rather than recomputed so a cron that runs twice, or is replayed, cannot send the
-- same warning again. Cleared alongside the other dunning columns whenever a run ends, so a
-- customer who fails, recovers and later fails again is warned on each occasion rather than
-- being silently skipped the second time.

alter table public.user_profiles add column if not exists dunning_warned_at timestamptz;

-- No RLS policy changes — the existing "auth.uid() = user_id" policies already cover new
-- columns, and only the service role writes this one.
