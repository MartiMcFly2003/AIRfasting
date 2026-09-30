import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  buildDonation,
  RESEARCH_CONSENT_VERSION,
  type DonationSource,
} from "@/lib/billing/research-donation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Subscription statuses that mean a live Stripe subscription object still exists and needs to
// be cancelled first — matches the set mirrored verbatim from Stripe by the webhook handler
// (see billing.sql). null means no subscription was ever started.
const BLOCKING_STATUSES = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

type Supabase = ReturnType<typeof createServiceRoleClient>;

/**
 * Copies the person's fasting history out as anonymous rows, if they agreed to it.
 *
 * Returns whether anything was kept. Never throws: a donation is a favour they are doing us,
 * and a failure here must not delay or endanger the erasure they actually asked for.
 */
async function donate(service: Supabase, userId: string, signedUpAt: string | null) {
  try {
    const [profileRes, logsRes, plansRes, periodsRes] = await Promise.all([
      service.from("user_profiles").select("age, track").eq("user_id", userId).maybeSingle(),
      service
        .from("fast_logs")
        .select("logged_date, fast_type, planned_hours, actual_minutes, plan_id")
        .eq("user_id", userId),
      service.from("fast_plans").select("id, planned_date, planned_hours").eq("user_id", userId),
      service.from("period_logs").select("period_date").eq("user_id", userId),
    ]);

    const source: DonationSource = {
      age: profileRes.data?.age ?? null,
      track: profileRes.data?.track ?? null,
      signedUpAt,
      logs: (logsRes.data ?? []).map((l) => ({
        loggedDate: l.logged_date as string,
        fastType: l.fast_type,
        plannedHours: l.planned_hours,
        actualMinutes: l.actual_minutes,
        planId: l.plan_id,
      })),
      plans: (plansRes.data ?? []).map((p) => ({
        id: p.id,
        plannedDate: p.planned_date as string,
        plannedHours: p.planned_hours,
      })),
      periodDates: (periodsRes.data ?? []).map((p) => p.period_date as string),
    };

    // Nothing logged means nothing to learn from — no row, rather than an empty donation.
    if (source.logs.length === 0) return false;

    const rows = buildDonation(source, randomUUID());
    const { error } = await service.from("research_fasts").insert(rows);
    if (error) {
      console.error("research donation insert failed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("research donation failed", error);
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Opt-in only, and absent means no. A body that fails to parse is treated as a refusal
  // rather than an error, because the deletion is the request and the donation is the extra.
  let donateData = false;
  try {
    const body = await request.json();
    donateData = body?.donateData === true && body?.consentVersion === RESEARCH_CONSENT_VERSION;
  } catch {
    donateData = false;
  }

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

  // Everything below happens before the delete, because the delete takes it all with it.
  // Failures are logged and ignored: erasure is a right and does not wait on our bookkeeping.
  let donated = false;
  try {
    const [{ data: account }, { count: logCount }] = await Promise.all([
      serviceRole.from("users").select("created_at").eq("id", user.id).maybeSingle(),
      serviceRole
        .from("fast_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (donateData) {
      donated = await donate(serviceRole, user.id, account?.created_at ?? null);
    }

    const signedUp = account?.created_at ? Date.parse(account.created_at) : NaN;
    await serviceRole.from("account_deletions").insert({
      had_subscribed: profile?.stripe_customer_id != null,
      days_since_signup: Number.isNaN(signedUp)
        ? null
        : Math.floor((Date.now() - signedUp) / (24 * 60 * 60 * 1000)),
      ever_logged_a_fast: (logCount ?? 0) > 0,
      donated_data: donated,
    });
  } catch (error) {
    console.error("account_deletions record failed", error);
  }

  const { error } = await serviceRole.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, donated });
}
