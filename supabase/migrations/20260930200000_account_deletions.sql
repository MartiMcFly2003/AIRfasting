-- Deleting an account destroys every trace of it: auth.admin.deleteUser cascades through
-- public.users into user_profiles, plans and logs, leaving nothing behind. That is correct —
-- erasure should erase — but it also means the strongest churn signal there is, stronger than
-- cancelling, was completely invisible.
--
-- This records that a deletion happened, and nothing about who. No email, no user id, no track,
-- no goals: a counter, not a dataset. It survives erasure because there is nothing in it to
-- erase.
--
-- The honest caveat, written down so nobody widens this later without thinking: at this scale
-- these rows are not truly anonymous to the person reading them. With a few dozen users, "an
-- account that signed up 54 days ago was deleted today" identifies somebody to anyone holding
-- the list it disappeared from. That is tolerable for four non-sensitive facts kept for
-- legitimate analytics. It would stop being tolerable the moment anybody adds track, goals, or
-- anything else derived from health data — so do not.

create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  /** Whether they ever reached checkout — the difference between losing a customer and losing a visitor. */
  had_subscribed boolean not null default false,
  /** How long they stayed, which is the whole question. Null if unknowable. */
  days_since_signup integer,
  /** Whether they ever completed a single fast. Deleting without having used it once says
      something different from deleting after months. */
  ever_logged_a_fast boolean not null default false
);

alter table public.account_deletions enable row level security;

-- Deliberately no policies at all: RLS with none denies everybody, and the service role bypasses
-- it. Only the delete route writes here and only the admin page reads it. Grants revoked too,
-- so a future policy added carelessly still cannot expose the table to the browser.
revoke all on public.account_deletions from anon, authenticated;
