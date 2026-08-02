-- Lets a user explicitly record "no period this month" — a distinct fact from simply not
-- having logged anything, useful for irregular/perimenopausal cycles where a skipped month is
-- itself meaningful data. Kept as its own table (mirroring period_logs) rather than overloading
-- period_logs.period_date with a sentinel value, since a no-period entry is month-granular
-- (first-of-month convention) and has no calendar-day meaning.

create table public.no_period_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  month_date date not null, -- first day of the month, e.g. '2026-06-01'
  created_at timestamptz not null default now(),
  unique (user_id, month_date)
);

alter table public.no_period_months enable row level security;

create policy "Users can view own no-period months" on public.no_period_months
  for select using (auth.uid() = user_id);

create policy "Users can insert own no-period months" on public.no_period_months
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own no-period months" on public.no_period_months
  for delete using (auth.uid() = user_id);

-- No update policy — same diff-based delete + insert pattern as period_logs, never a row update.
