import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Subscription statuses that mean a live Stripe subscription object still exists and needs to
// be cancelled first — matches the set mirrored verbatim from Stripe by the webhook handler
// (see billing.sql). null means no subscription was ever started.
const BLOCKING_STATUSES = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_status, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  // Re-checked server-side rather than trusting the client's gate — this is the one place in
  // the app that permanently destroys data, so the check has to hold even if the UI is bypassed.
  if (profile?.subscription_status && BLOCKING_STATUSES.has(profile.subscription_status)) {
    return NextResponse.json(
      { error: "Cancel your active subscription before deleting your account." },
      { status: 409 },
    );
  }

  const serviceRole = createServiceRoleClient();

  // Recorded before the delete, because the delete takes everything with it. Four facts, none
  // of which identify anybody — see 20260930200000_account_deletions.sql for why it must stay
  // that way. Failure here is logged and ignored: erasure is a right, and it does not wait on
  // our bookkeeping.
  try {
    const [{ data: account }, { count: logCount }] = await Promise.all([
      serviceRole.from("users").select("created_at").eq("id", user.id).maybeSingle(),
      serviceRole
        .from("fast_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const signedUp = account?.created_at ? Date.parse(account.created_at) : NaN;
    await serviceRole.from("account_deletions").insert({
      had_subscribed: profile?.stripe_customer_id != null,
      days_since_signup: Number.isNaN(signedUp)
        ? null
        : Math.floor((Date.now() - signedUp) / (24 * 60 * 60 * 1000)),
      ever_logged_a_fast: (logCount ?? 0) > 0,
    });
  } catch (error) {
    console.error("account_deletions record failed", error);
  }

  const { error } = await serviceRole.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
