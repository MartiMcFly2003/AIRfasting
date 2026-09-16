import { NextResponse } from "next/server";
import { buildFastReminderEmail } from "@/lib/email/fast-reminder-email";
import { sendEmail } from "@/lib/email/resend";
import {
  dueRemindersForPlan,
  sentAtColumn,
  type DueReminder,
  type ReminderPlan,
} from "@/lib/reminders/fast-reminder-schedule";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { shiftIsoDate } from "@/lib/zoned-time";

/**
 * Sends the 24-hour and 1-hour reminders for planned fasts.
 *
 * Meant to run every 15 minutes: a reminder is due at a local wall-clock moment, and a fast can
 * start at any minute of any hour. Running less often doesn't break anything — the grace windows
 * in fast-reminder-schedule absorb a missed run, and anything later is dropped rather than sent
 * at the wrong time — it just means reminders drift later than they claim, and at hourly spacing
 * an "in one hour" nudge can land only minutes before the start.
 *
 * Safe to call repeatedly: each send is stamped on the plan before the next is considered, and
 * already-stamped reminders are filtered out.
 */

/** Wide enough that a reminder due anywhere on earth is in range, whatever the offset. */
const SCAN_DAYS = 2;

interface ProfileRow {
  user_id: string;
  timezone: string | null;
  notifications_opt_in: boolean | null;
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

  const today = now.toISOString().slice(0, 10);
  const from = shiftIsoDate(today, -SCAN_DAYS);
  const to = shiftIsoDate(today, SCAN_DAYS);
  if (!from || !to) {
    return NextResponse.json({ error: "Could not build the scan window" }, { status: 500 });
  }

  const { data: planRows, error: plansError } = await supabase
    .from("fast_plans")
    .select(
      "id, user_id, planned_date, start_time, fast_type, planned_hours, reminder_24h_sent_at, reminder_1h_sent_at",
    )
    .gte("planned_date", from)
    .lte("planned_date", to);

  if (plansError) {
    return NextResponse.json({ error: plansError.message }, { status: 500 });
  }
  if (!planRows?.length) {
    return NextResponse.json({ sent: 0, skipped: {}, failures: [] });
  }

  const userIds = [...new Set(planRows.map((row) => row.user_id))];
  const { data: profileRows, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, timezone, notifications_opt_in, users(email)")
    .in("user_id", userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profiles = new Map<string, ProfileRow>(
    (profileRows as unknown as ProfileRow[] | null ?? []).map((row) => [row.user_id, row]),
  );

  // Counted rather than logged per user: this runs unattended and the totals are what tell you
  // whether reminders are silently going nowhere.
  const skipped = { optedOut: 0, noTimeZone: 0, noEmail: 0, noProfile: 0 };
  const failures: string[] = [];
  let sent = 0;

  for (const row of planRows) {
    const profile = profiles.get(row.user_id);
    if (!profile) {
      skipped.noProfile += 1;
      continue;
    }
    if (profile.notifications_opt_in !== true) {
      skipped.optedOut += 1;
      continue;
    }
    if (!profile.timezone) {
      skipped.noTimeZone += 1;
      continue;
    }
    const email = profile.users?.email;
    if (!email) {
      skipped.noEmail += 1;
      continue;
    }

    const plan: ReminderPlan = {
      id: row.id,
      userId: row.user_id,
      plannedDate: row.planned_date,
      startTime: row.start_time,
      fastType: row.fast_type,
      plannedHours: row.planned_hours == null ? null : Number(row.planned_hours),
      reminder24hSentAt: row.reminder_24h_sent_at,
      reminder1hSentAt: row.reminder_1h_sent_at,
    };

    for (const reminder of dueRemindersForPlan(plan, profile.timezone, now)) {
      try {
        await sendOne(supabase, reminder, profile.timezone, email, siteUrl, now);
        sent += 1;
      } catch (err) {
        failures.push(
          `${plan.id} (${reminder.kind}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return NextResponse.json({ sent, skipped, failures });
}

async function sendOne(
  supabase: ReturnType<typeof createServiceRoleClient>,
  reminder: DueReminder,
  timeZone: string,
  email: string,
  siteUrl: string,
  now: Date,
): Promise<void> {
  const { subject, html } = buildFastReminderEmail(reminder, timeZone, siteUrl);
  await sendEmail({ to: email, subject, html });

  // Stamped after the send, so a delivery failure retries on the next run rather than being
  // recorded as sent. The cost is a possible duplicate if the stamp itself fails, which is the
  // better way round for a reminder.
  const { error } = await supabase
    .from("fast_plans")
    .update({ [sentAtColumn(reminder.kind)]: now.toISOString() })
    .eq("id", reminder.plan.id);

  if (error) throw new Error(`sent but could not stamp: ${error.message}`);
}
