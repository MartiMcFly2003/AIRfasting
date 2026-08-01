import { NextResponse } from "next/server";
import { computeTrialReminderStats } from "@/lib/billing/trial-reminder-stats";
import type { FastLog } from "@/lib/calendar/fast-plans";
import { buildTrialReminderEmail } from "@/lib/email/trial-reminder-email";
import { sendEmail } from "@/lib/email/resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const REMINDER_WINDOW_DAYS = 7;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 3600 * 1000);

  // A window rather than an exact day-match, so a late or briefly-down cron run still catches
  // everyone due — trial_reminder_sent_at guards against sending the same reminder twice.
  const { data: dueUsers, error: queryError } = await supabase
    .from("user_profiles")
    .select("user_id, trial_ends_at, users(email)")
    .eq("subscription_status", "trialing")
    .gt("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", windowEnd.toISOString())
    .is("trial_reminder_sent_at", null);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  let sent = 0;
  const failures: string[] = [];

  for (const row of dueUsers ?? []) {
    const email = (row as unknown as { users: { email: string | null } | null }).users?.email;
    if (!email || !row.trial_ends_at) continue;

    try {
      const { data: logsData } = await supabase
        .from("fast_logs")
        .select("id, plan_id, logged_date, fast_type, planned_hours, actual_minutes")
        .eq("user_id", row.user_id);

      const logs: FastLog[] = (logsData ?? []).map((r) => ({
        id: r.id,
        planId: r.plan_id,
        loggedDate: r.logged_date,
        fastType: r.fast_type,
        plannedHours: r.planned_hours,
        actualMinutes: r.actual_minutes,
      }));

      const stats = computeTrialReminderStats(logs);
      const daysRemaining = Math.max(
        1,
        Math.round((new Date(row.trial_ends_at).getTime() - now.getTime()) / (24 * 3600 * 1000)),
      );
      // No name field exists anywhere in onboarding/auth today — degrades to "Hi there,"
      // rather than fabricating one. See buildTrialReminderEmail's doc comment.
      const { subject, html } = buildTrialReminderEmail(stats, daysRemaining, siteUrl, null);

      await sendEmail({ to: email, subject, html });

      await supabase
        .from("user_profiles")
        .update({ trial_reminder_sent_at: now.toISOString() })
        .eq("user_id", row.user_id);

      sent += 1;
    } catch (err) {
      failures.push(`${row.user_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ sent, failures });
}
