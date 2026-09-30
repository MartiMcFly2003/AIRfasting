import { NextResponse } from "next/server";
import { reconcile, type ProfileSnapshot, type StripeSnapshot } from "@/lib/billing/reconcile";
import { buildReconcileEmail } from "@/lib/email/reconcile-email";
import { sendEmail } from "@/lib/email/resend";
import { stripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Daily check that this database still agrees with Stripe about who is paying.
 *
 * Read-only on purpose. It would be easy to have this repair what it finds, and wrong: every
 * mismatch is a symptom of something — a webhook that never arrived, a bug in our status
 * handling, an account that granted itself Premium — and silently correcting the symptom
 * destroys the evidence of the cause. It reports; a person decides.
 *
 * Mails only when something disagrees, so an empty inbox means a healthy one.
 */

interface ProfileRow {
  user_id: string;
  role: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  past_due_since: string | null;
  dunning_frozen_at: string | null;
  users: { email: string | null } | null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("user_profiles")
    .select(
      "user_id, role, subscription_status, stripe_customer_id, stripe_subscription_id, past_due_since, dunning_frozen_at, users(email)",
    );

  if (error) {
    console.error("billing-reconcile: could not read profiles", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profiles: ProfileSnapshot[] = ((rows as unknown as ProfileRow[] | null) ?? []).map(
    (row) => ({
      userId: row.user_id,
      email: row.users?.email ?? null,
      role: row.role,
      subscriptionStatus: row.subscription_status,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      pastDueSince: row.past_due_since,
      frozenAt: row.dunning_frozen_at,
    }),
  );

  // Every subscription Stripe knows about, not just the ones we have ids for — a subscription
  // this database has never recorded is itself a finding, and asking per-customer could never
  // surface one.
  let stripeSubscriptions: StripeSnapshot[];
  try {
    const all = await stripe.subscriptions
      .list({ status: "all", limit: 100 })
      .autoPagingToArray({ limit: 1000 });
    stripeSubscriptions = all.map((sub) => ({
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscriptionId: sub.id,
      status: sub.status,
    }));
  } catch (stripeError) {
    const message = (stripeError as Error).message;
    console.error("billing-reconcile: could not read Stripe", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const findings = reconcile(profiles, stripeSubscriptions, now);

  if (findings.length === 0) {
    return NextResponse.json({ checked: profiles.length, findings: [] });
  }

  // Logged as well as mailed: if the mail path is the thing that's broken, the log is the only
  // place this shows up — which is exactly how a month of silent failures happened before.
  console.error(
    `billing-reconcile: ${findings.length} mismatch(es) across ${profiles.length} profiles`,
    findings,
  );

  // Same variable as the admin gate, which may list more than one address.
  const recipients = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  let notified = false;
  if (recipients.length > 0) {
    try {
      await sendEmail({ to: recipients, ...buildReconcileEmail(findings, profiles.length) });
      notified = true;
    } catch (sendError) {
      console.error("billing-reconcile: report failed to send", (sendError as Error).message);
    }
  } else {
    console.error("billing-reconcile: ADMIN_EMAIL is not set, so nobody was told by email");
  }

  return NextResponse.json({ checked: profiles.length, notified, findings });
}
