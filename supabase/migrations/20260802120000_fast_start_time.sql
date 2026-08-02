-- Adds start-time selection to fast planning so a plan's real end date/time can be computed
-- (start + duration), which in turn drives refeed-window blocking for 20h+ fasts and the
-- extended-dry-fast health disclaimer (see src/lib/calendar/refeed.ts).

alter table public.fast_plans add column start_time time;
-- No backfill: fast_plans is early-stage in production, existing rows (if any) are simply
-- treated as legacy/incomplete by the app (no end-time/refeed computation for them) rather
-- than fabricating a start time.

-- fast_logs.started_at/ended_at already exist (initial_schema.sql) but were never written by
-- app code. This pass starts populating them for live-tracked fasts so refeed windows can be
-- computed from actual fasting behavior, not just advance plans. No new column needed here.

-- No RLS policy changes — existing auth.uid() = user_id policies on both tables already cover
-- the new/newly-populated columns.
