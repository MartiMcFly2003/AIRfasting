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
    .select("subscription_status")
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
  const { error } = await serviceRole.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
