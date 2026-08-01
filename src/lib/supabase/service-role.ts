import { createClient } from "@supabase/supabase-js";

/** Bypasses RLS entirely. Only for server-to-server routes with no user session — the Stripe
 *  webhook and the trial-reminder cron job. Never import this into anything reachable from a
 *  browser request context. */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
