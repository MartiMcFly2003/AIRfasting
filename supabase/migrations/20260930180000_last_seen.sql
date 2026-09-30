-- Nothing recorded that somebody had opened the app. Every timestamp here describes a thing
-- they created — a fast planned, a period logged — so a person who visits weekly, looks at
-- their calendar and closes it is indistinguishable from one who never came back. That made
-- "are our free users still using this?" unanswerable, for anybody, at any point.
--
-- Written on calendar loads only, and at most hourly per person: the question is whether they
-- still turn up, which a timestamp to the hour answers as well as one to the second would,
-- without a database write on every navigation.
--
-- Note there is deliberately no column grant for this — see 20260930140000_lock_billing_columns.
-- New columns are not writable from the browser by default, and a last-seen a user could set
-- themselves would be worth nothing. The service role writes it.

alter table public.user_profiles add column if not exists last_seen_at timestamptz;

-- Backfill is impossible and would be a lie: no record of past visits exists. Everyone starts
-- null, meaning "not seen since we started looking" rather than "never seen".
