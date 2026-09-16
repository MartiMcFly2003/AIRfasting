import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOutButton } from "@/components/auth/LogOutButton";
import { ManageSubscriptionLink } from "@/components/billing/ManageSubscriptionLink";
import { CalendarTrackManager } from "@/components/calendar/CalendarTrackManager";
import { MonthNav } from "@/components/calendar/MonthNav";
import { TimeZoneConfirmDialog } from "@/components/calendar/TimeZoneConfirmDialog";
import { TimeZoneTravelDialog } from "@/components/calendar/TimeZoneTravelDialog";
import type { PauseReason } from "@/components/calendar/PauseDialogs";
import { TRACK_PROTOCOL, toISODate, type ISODate, type Track, type YearMonth } from "@/lib/calendar";
import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import { getMoonHighlightsForMonth } from "@/lib/calendar/moon-highlights";
import { createClient } from "@/lib/supabase/server";
import { effectiveTimeZone } from "@/lib/timezone-preference";

// Mock location until onboarding captures the user's real one — Berlin, as a placeholder.
// New Moon/Full Moon barely depend on location (just which local date the UTC moment falls
// on), but Ekadashi's sunrise-anchored calculation genuinely needs real coordinates.
const MOCK_LOCATION = { lat: 52.52, lon: 13.405 };

const VALID_TRACKS = Object.keys(TRACK_PROTOCOL) as Track[];

interface CalendarPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

function parseYearMonth(params: { year?: string; month?: string }, fallback: YearMonth): YearMonth {
  const year = Number(params.year);
  const month = Number(params.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return fallback;
  }
  return { year, month };
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth: YearMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  const viewedMonth = parseYearMonth(params, currentMonth);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/log-in");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "track, last_period_date, cycle_length, paused_reason, role, notifications_prompt_answered_at, timezone, home_timezone, timezone_reverts_on, timezone_confirmed_at, timezone_travel_declined",
    )
    .eq("user_id", user.id)
    .single();

  if (!profile?.track) redirect("/onboarding");

  const track = VALID_TRACKS.includes(profile.track as Track) ? (profile.track as Track) : "menstrual";
  const tier = profile.role === "premium" ? "premium" : "free";
  const initialPeriodDate = profile.last_period_date ?? undefined;
  const initialCycleLength = profile.cycle_length;
  const initialPause = profile.paused_reason ? { reason: profile.paused_reason as PauseReason } : null;

  const [periodLogsResult, noPeriodMonthsResult, fastPlansResult, fastLogsResult, contentResult] = await Promise.all([
    supabase
      .from("period_logs")
      .select("period_date")
      .eq("user_id", user.id)
      .order("period_date", { ascending: true }),
    supabase
      .from("no_period_months")
      .select("month_date")
      .eq("user_id", user.id)
      .order("month_date", { ascending: true }),
    supabase
      .from("fast_plans")
      .select("id, planned_date, fast_type, planned_hours, start_time")
      .eq("user_id", user.id)
      .order("planned_date", { ascending: true }),
    supabase
      .from("fast_logs")
      .select("id, plan_id, logged_date, fast_type, planned_hours, actual_minutes, started_at, ended_at")
      .eq("user_id", user.id),
    supabase.from("content").select("key, value").in("key", [
      "education_duration",
      "prep_day_before",
      "refeed_day_after",
      "food_inhale",
      "food_bloom",
      "food_radiate",
      "food_exhale",
    ]),
  ]);

  const initialPeriodHistory: ISODate[] = (periodLogsResult.data ?? []).map((row) => row.period_date as ISODate);
  const initialNoPeriodMonths: ISODate[] = (noPeriodMonthsResult.data ?? []).map(
    (row) => row.month_date as ISODate,
  );
  const initialFastPlans: FastPlan[] = (fastPlansResult.data ?? []).map((row) => ({
    id: row.id,
    plannedDate: row.planned_date as ISODate,
    fastType: row.fast_type as FastPlan["fastType"],
    plannedHours: row.planned_hours,
    startTime: row.start_time,
  }));
  const initialFastLogs: FastLog[] = (fastLogsResult.data ?? []).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    loggedDate: row.logged_date as ISODate,
    fastType: row.fast_type as FastLog["fastType"],
    plannedHours: row.planned_hours,
    actualMinutes: row.actual_minutes,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));
  const content: Record<string, string> = Object.fromEntries(
    (contentResult.data ?? []).map((row) => [row.key, row.value ?? ""]),
  );

  const isCurrentMonth = viewedMonth.year === currentMonth.year && viewedMonth.month === currentMonth.month;
  const isForecasted =
    viewedMonth.year * 12 + viewedMonth.month > currentMonth.year * 12 + currentMonth.month;

  const monthLabel = new Date(Date.UTC(viewedMonth.year, viewedMonth.month - 1, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  const moonHighlights = await getMoonHighlightsForMonth(viewedMonth, MOCK_LOCATION.lat, MOCK_LOCATION.lon);
  const todayISO = isCurrentMonth ? toISODate(viewedMonth, now.getUTCDate()) : undefined;

  // Two time-zone questions, and at most one of them is worth asking at a time.
  //
  // Confirmation comes first and outranks travel: an account that has never confirmed a zone
  // has nothing meaningful to compare the device against, so "you seem to have moved" would be
  // noise. Everyone existing today lands here once, because a zone we detected for somebody is
  // not a zone they told us.
  const needsTimeZoneConfirmation = profile.timezone_confirmed_at == null;
  const currentZone = effectiveTimeZone(
    {
      timezone: profile.timezone,
      homeTimezone: profile.home_timezone,
      revertsOn: profile.timezone_reverts_on,
    },
    now,
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-6 py-16">
      {needsTimeZoneConfirmation ? (
        <TimeZoneConfirmDialog
          userId={user.id}
          savedTimeZone={profile.timezone}
          needsOptIn={profile.notifications_prompt_answered_at == null}
        />
      ) : (
        currentZone && (
          <TimeZoneTravelDialog
            userId={user.id}
            currentZone={currentZone}
            declinedZone={profile.timezone_travel_declined}
          />
        )
      )}

      <MonthNav
        current={viewedMonth}
        monthLabel={monthLabel}
        isCurrentMonth={isCurrentMonth}
        isForecasted={isForecasted}
      />

      <CalendarTrackManager
        initialTrack={track}
        tier={tier}
        viewedMonth={viewedMonth}
        todayISO={todayISO}
        moonHighlights={moonHighlights}
        monthLabel={monthLabel}
        content={content}
        initialPeriodDate={initialPeriodDate}
        userId={user.id}
        initialPeriodHistory={initialPeriodHistory}
        initialNoPeriodMonths={initialNoPeriodMonths}
        initialFastPlans={initialFastPlans}
        initialFastLogs={initialFastLogs}
        initialCycleLength={initialCycleLength}
        initialPause={initialPause}
      />

      {tier === "premium" && <ManageSubscriptionLink />}
      <Link
        href="/settings"
        className="font-accent text-xs text-silver hover:text-ivory hover:underline"
      >
        Account settings
      </Link>
      <LogOutButton />
    </main>
  );
}
