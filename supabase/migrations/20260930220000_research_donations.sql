-- People deleting their account can choose to leave their fasting data behind for research.
-- Separate, explicit, opt-in consent, asked once, at the moment of leaving — and refusing must
-- cost them nothing, so the deletion proceeds identically either way.
--
-- "Anonymised" is a legal claim, not a description, so this schema is built to make it true
-- rather than to assert it:
--
--   * No user id, no email, no name, and no way back. donation_id is fresh random per donation,
--     stored nowhere else, and groups one person's fasts only so a researcher can tell one
--     participant's twenty fasts from twenty people's one.
--   * No calendar dates. A fast is recorded by where it fell in the person's cycle and how far
--     into their own history it was — which is what the research question actually needs, and
--     which cannot be matched against "who logged a fast on 14 September".
--   * Age as a band, not a number.
--
-- Dropping the dates is the load-bearing decision. With them, a few dozen users and a calendar
-- make re-identification trivial; without them these rows describe fasting, not people.

create table if not exists public.research_fasts (
  id uuid primary key default gen_random_uuid(),
  /** Groups one donation's fasts. Random, and deliberately recorded nowhere else. */
  donation_id uuid not null,
  donated_at timestamptz not null default now(),
  /** Which consent wording they agreed to, so a later change to the ask stays distinguishable. */
  consent_version text not null,

  age_band text,
  track text,

  fast_type text,
  planned_hours numeric,
  actual_minutes integer,
  kept_to_plan boolean,

  /** Days since the last recorded period before this fast. Null when unknown or no cycle. */
  cycle_day integer,
  /** How far into their own time with AIRfasting this fast was. Relative, never absolute. */
  days_since_signup integer
);

create index if not exists research_fasts_donation_idx on public.research_fasts (donation_id);

alter table public.research_fasts enable row level security;

-- No policies: RLS with none denies everybody and the service role bypasses it. Grants revoked
-- as well, so a carelessly added policy later still cannot reach the browser.
revoke all on public.research_fasts from anon, authenticated;

-- Uptake, on the row that already records the deletion. Says how many agreed, never who.
alter table public.account_deletions add column if not exists donated_data boolean not null default false;
