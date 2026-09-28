-- A failed renewal had no consequences and no announcement. The webhook granted premium for
-- "past_due" outright, so a card that stopped working bought indefinite free access, and
-- nothing in the app ever told the customer their payment had failed — whether they heard
-- anything at all depended on Stripe's own dunning emails being switched on.
--
-- The policy these columns support: keep access for 7 days after the first failure, because a
-- good share of declines are a bank's fraud heuristic or a temporary hold and clear on the next
-- retry; freeze after that while Stripe keeps retrying; downgrade when Stripe finally gives up.
-- Email at every step.

-- When the current run of failures began. Null whenever the subscription is healthy, so it
-- doubles as "is this account in dunning at all", and it restarts if they recover and fail
-- again later. The grace window is measured from here, not from the latest failed invoice —
-- otherwise every retry would extend the grace and it would never end.
alter table public.user_profiles add column if not exists past_due_since timestamptz;

-- When premium was actually withdrawn. Separate from past_due_since because the freeze is what
-- the customer experiences and what the email announces, and because a cron that has already
-- frozen somebody must not freeze (and re-announce) them again on its next run.
alter table public.user_profiles add column if not exists dunning_frozen_at timestamptz;

-- The last invoice we emailed about. Stripe redelivers webhooks on its own schedule and a
-- redelivery is indistinguishable from a real retry; without this, one failed payment can send
-- the same warning several times.
alter table public.user_profiles add column if not exists dunning_last_invoice text;

-- The freeze cron scans by status, which is otherwise an unindexed full scan of every account.
create index if not exists user_profiles_subscription_status_idx
  on public.user_profiles (subscription_status);

-- Backfill: the accounts already sitting in past_due have been there for days with no record of
-- when it started. Dating them from their trial end is the closest honest answer — that is the
-- invoice that failed — and it means they are already past grace and get frozen (and told) on
-- the first run rather than silently receiving a fresh 7 days.
update public.user_profiles
set past_due_since = trial_ends_at
where subscription_status = 'past_due' and past_due_since is null and trial_ends_at is not null;

-- No RLS policy changes — the existing "auth.uid() = user_id" policies already cover new
-- columns, and only the service role writes these.
