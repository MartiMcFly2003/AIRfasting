import { NextResponse } from "next/server";
import { isDueToFreeze, type DunningState } from "@/lib/billing/dunning";
import { buildAccessFrozenEmail } from "@/lib/email/billing-emails";
import { sendEmail } from "@/lib/email/resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Withdraws premium from accounts whose grace period has run out, and tells them.
 *
 * This exists because the freeze is the one step in dunning that no Stripe event announces: the
 * failure, the retries and the final cancellation all arrive as webhooks, but "seven days have
 * passed" happens quietly. Without a job, a frozen customer would only discover it the next
 * time they opened the app, and only then if they noticed what was missing.
 *
 * Daily is enough. The grace is measured in days, so running hourly would buy precision nobody
 * can perceive while sending the same mail at a stranger hour.
 *
 * Safe to run repeatedly: dunning_frozen_at is stamped with the freeze, and isDueToFreeze
 * ignores anybody already carrying one.
 */

interface FreezeRow {
  user_id: string;
  subscription_status: string | null;
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("user_profiles")
    .select("user_id, subscription_status, past_due_since, dunning_frozen_at, users(email)")
    .eq("subscription_status", "past_due")
    .is("dunning_frozen_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let frozen = 0;
  let stillInGrace = 0;
  const failures: string[] = [];

  for (const row of (rows as unknown as FreezeRow[] | null) ?? []) {
    const state: DunningState = {
      subscriptionStatus: row.subscription_status,
      pastDueSince: row.past_due_since,
      frozenAt: row.dunning_frozen_at,
    };

    if (!isDueToFreeze(state, now)) {
      stillInGrace += 1;
      continue;
    }

    // Stamped before the mail goes out, so a send that throws cannot leave the account frozen
    // on the next run and mailed twice — the reverse order risks announcing a freeze that the
    // database never recorded.
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ role: "free", dunning_frozen_at: now.toISOString() })
      .eq("user_id", row.user_id);

    if (updateError) {
      failures.push(`${row.user_id}: ${updateError.message}`);
      continue;
    }
    frozen += 1;

    const email = row.users?.email;
    if (!email) continue;
    try {
      await sendEmail({ to: email, ...buildAccessFrozenEmail(siteUrl, null) });
    } catch (sendError) {
      failures.push(`${row.user_id}: ${(sendError as Error).message}`);
    }
  }

  return NextResponse.json({ frozen, stillInGrace, failures });
}
