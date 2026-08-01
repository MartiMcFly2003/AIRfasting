-- Initial schema: users, user_profiles, fast_plans, fast_logs, content.
-- Mirrors AIR_ClaudeCode_Brief.md's "Database schema (Supabase)" section.
-- This pass only wires the app to `users`/`user_profiles` (auth + onboarding persistence);
-- fast_plans/fast_logs/content are created now so a future pass migrating calendar-interaction
-- data off local state doesn't need a second migration round.

-- ── users ──────────────────────────────────────────────────────────────────
-- Public mirror of auth.users identity, referenced by every other table.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own row" on public.users
  for select using (auth.uid() = id);

create policy "Users can insert own row" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own row" on public.users
  for update using (auth.uid() = id);

-- ── user_profiles ────────────────────────────────────────────────────────
create table public.user_profiles (
  user_id uuid primary key references public.users (id) on delete cascade,
  gender text,
  age integer,
  role text not null default 'free', -- 'free' | 'premium' | 'professional_guided'
  plan_type text not null default 'standard', -- 'standard' | 'professional_guided'
  track text, -- 'menstrual' | 'moon_sync' | 'moon_sync_bridging' | 'weekly_rhythm' | 'no_cycle' | 'gentle_starter'
  weekly_rhythm text, -- '5-1-1' | '4-2-1' (Protocol 3 only)
  cycle_length integer not null default 28,
  last_period_date date,
  menopause_mode boolean not null default false,
  dry_fasting_experience boolean,
  water_fasting_experience boolean,
  goals text[],
  faith_preferences jsonb, -- placeholder, null for now
  marketing_opt_in boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = user_id);

-- ── fast_plans ───────────────────────────────────────────────────────────
-- Schema only this pass — not yet read/written by the app (Premium planner still local state).
create table public.fast_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  planned_date date not null,
  fast_type text not null, -- 'dry' | 'water'
  planned_hours numeric, -- null if no duration set
  created_at timestamptz not null default now()
);

alter table public.fast_plans enable row level security;

create policy "Users can view own fast plans" on public.fast_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own fast plans" on public.fast_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own fast plans" on public.fast_plans
  for update using (auth.uid() = user_id);

-- ── fast_logs ────────────────────────────────────────────────────────────
-- Schema only this pass — not yet read/written by the app (tracker still local state).
create table public.fast_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_id uuid references public.fast_plans (id) on delete set null, -- null if unplanned
  started_at timestamptz,
  ended_at timestamptz,
  fast_type text not null,
  planned_hours numeric,
  actual_minutes integer,
  extended boolean not null default false, -- true if user extended via +1h button
  created_at timestamptz not null default now()
);

alter table public.fast_logs enable row level security;

create policy "Users can view own fast logs" on public.fast_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own fast logs" on public.fast_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own fast logs" on public.fast_logs
  for update using (auth.uid() = user_id);

-- ── content ──────────────────────────────────────────────────────────────
-- Admin-editable copy (education/prep/refeed/food-guidance text). Readable by any
-- authenticated user; writable only via the service role (no insert/update/delete policy).
create table public.content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;

create policy "Authenticated users can read content" on public.content
  for select using (auth.role() = 'authenticated');
