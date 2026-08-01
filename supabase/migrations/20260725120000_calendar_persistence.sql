-- Calendar data persistence: period history, fasting planner CRUD, pause state, and
-- weekly-rhythm customization. Everything here is additive — fast_plans/fast_logs are
-- still empty (schema-only from the previous migration), so no data migration is needed.

-- ── period_logs (new) ───────────────────────────────────────────────────────
-- Replaces the app's periodHistory: ISODate[] array with real rows.
create table public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, period_date)
);

alter table public.period_logs enable row level security;

create policy "Users can view own period logs" on public.period_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own period logs" on public.period_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own period logs" on public.period_logs
  for delete using (auth.uid() = user_id);
-- No update policy — "adjust last entry" and "undo" are both modeled by the app as a
-- delete + insert against the diffed history, not a row update.

-- ── fast_plans / fast_logs: missing delete policies ─────────────────────────
-- Created schema-only in the previous migration, before the app deleted anything.
create policy "Users can delete own fast plans" on public.fast_plans
  for delete using (auth.uid() = user_id);

create policy "Users can delete own fast logs" on public.fast_logs
  for delete using (auth.uid() = user_id);

-- ── fast_logs: add logged_date ───────────────────────────────────────────────
-- The app's FastLog.loggedDate has no DB equivalent today — started_at/ended_at exist but
-- aren't populated for manually-logged (non-live-tracked) entries. logged_date mirrors the
-- app's model directly; the app always supplies it.
alter table public.fast_logs add column logged_date date;

-- ── fast_logs: fix plan_id cascade behavior ──────────────────────────────────
-- The DB currently orphans a log (`set null`) when its plan is deleted, but the app's actual
-- UX always deletes the log along with its plan. No rows exist yet, so this is a plain swap.
-- Looks up the FK's real name dynamically rather than assuming it, since auto-generated
-- constraint names aren't always exactly `<table>_<column>_fkey`.
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.fast_logs'::regclass
    and contype = 'f'
    and confrelid = 'public.fast_plans'::regclass;

  if fk_name is not null then
    execute format('alter table public.fast_logs drop constraint %I', fk_name);
  end if;

  alter table public.fast_logs add constraint fast_logs_plan_id_fkey
    foreign key (plan_id) references public.fast_plans (id) on delete cascade;
end $$;

-- ── user_profiles: pause state + weekly-rhythm customization ────────────────
-- Both currently local-only state in CalendarTrackManager.tsx.
alter table public.user_profiles add column paused_reason text; -- 'unsure' | 'other' | null; presence = "is paused", matches the app's model exactly
alter table public.user_profiles add column weekly_rhythm_fasting_days smallint[]; -- ISO weekday ints (1=Mon..7=Sun); null = use FIXED_WEEKLY_RHYTHM_PATTERNS default
alter table public.user_profiles add column weekly_rhythm_deep_fasting_days smallint[];
