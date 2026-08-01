-- Stripe billing: subscription status + reminder-email idempotency on user_profiles.
-- stripe_customer_id / stripe_subscription_id / trial_ends_at already exist (initial_schema.sql)
-- but have never been read or written by app code until this pass.

alter table public.user_profiles add column subscription_status text;
-- Mirrors Stripe Subscription.status verbatim: 'trialing' | 'active' | 'past_due' |
-- 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' | null (null = never
-- started a subscription). This is the cron job's eligibility field. `role` stays the single
-- source of truth for app-facing tier gating (calendar/page.tsx) precisely so a future App
-- Store Server Notifications handler can write role/subscription_status the same way a Stripe
-- webhook does, without gating logic anywhere assuming a Stripe-specific status string.

alter table public.user_profiles add column trial_reminder_sent_at timestamptz;
-- Stamped by the daily cron job once the 7-day-out email has gone out for the *current*
-- trial. Reset to null by the checkout.session.completed webhook handler on trial start, so a
-- user who cancels and later starts a second trial gets a reminder for that trial too.

-- No RLS policy changes. The webhook and cron routes use a service-role client
-- (src/lib/supabase/service-role.ts) that bypasses RLS entirely, rather than adding a policy
-- that trusts some service-role claim — this is the standard Supabase pattern for
-- server-to-server writes across arbitrary users' rows, and avoids ever loosening the existing
-- "auth.uid() = user_id" policies that protect every other write path in this app.
