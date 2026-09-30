-- Every ending looked the same. The webhook wrote subscription_status = 'canceled' whether
-- somebody chose to leave or their card stopped working, so the two most different outcomes a
-- subscription can have were indistinguishable a minute later — and the question you actually
-- want answered, "how many did we lose because payment failed", had no answer at all.
--
-- Recorded rather than inferred: past_due_since is cleared when a run ends, so the evidence
-- that a cancellation followed a failure is gone by the time anybody asks.

-- 'payment_failed' | 'customer_requested' | 'payment_disputed' | 'unknown'
alter table public.user_profiles add column if not exists cancellation_reason text;
alter table public.user_profiles add column if not exists canceled_at timestamptz;

-- Backfill what can be known. Stripe holds the truth for older cancellations, but this is not
-- reconstructible from anything here: past_due_since did not exist before 2026-09-28, so the
-- six accounts that cancelled in September are honestly unknown rather than guessed at.
update public.user_profiles
set cancellation_reason = 'unknown'
where subscription_status = 'canceled' and cancellation_reason is null;

-- No RLS policy changes needed, and deliberately no column grant either — these are billing
-- state, written only under the service role. See 20260930140000_lock_billing_columns.sql.
