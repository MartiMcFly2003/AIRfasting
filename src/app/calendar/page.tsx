import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOutButton } from "@/components/auth/LogOutButton";
import { ManageSubscriptionLink } from "@/components/billing/ManageSubscriptionLink";
import { CalendarTrackManager } from "@/components/calendar/CalendarTrackManager";
import { MonthNav } from "@/components/calendar/MonthNav";
import type { PauseReason } from "@/components/calendar/PauseDialogs";
import {
  FIXED_WEEKLY_RHYTHM_PATTERNS,
  TRACK_PROTOCOL,
  toISODate,
  type ISODate,
  type Track,
  type WeeklyRhythm,
  type WeeklyRhythmSelection,
  type YearMonth,
} from "@/lib/calendar";
import type { FastLog, FastPlan } from "@/lib/calendar/fast-plans";
import { getMoonHighlightsForMonth } from "@/lib/calendar/moon-highlights";
import { createClient } from "@/lib/supabase/server";

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
      "track, last_period_date, cycle_length, paused_reason, weekly_rhythm, weekly_rhythm_fasting_days, weekly_rhythm_deep_fasting_days, role",
    )
    .eq("user_id", user.id)
    .single();

  if (!profile?.track) redirect("/onboarding");

  const track = VALID_TRACKS.includes(profile.track as Track) ? (profile.track as Track) : "menstrual";
  const tier = profile.role === "premium" ? "premium" : "free";
  const initialPeriodDate = profile.last_period_date ?? undefined;
  const initialCycleLength = profile.cycle_length;
  const initialPause = profile.paused_reason ? { reason: profile.paused_reason as PauseReason } : null;

  const weeklyRhythm = (profile.weekly_rhythm as WeeklyRhythm | null) ?? "5-1-1";
  const initialWeeklyRhythmSelection: WeeklyRhythmSelection = {
    rhythm: weeklyRhythm,
    fastingDays: profile.weekly_rhythm_fasting_days ?? FIXED_WEEKLY_RHYTHM_PATTERNS[weeklyRhythm].fastingDays,
    deepFastingDays:
      profile.weekly_rhythm_deep_fasting_days ?? FIXED_WEEKLY_RHYTHM_PATTERNS[weeklyRhythm].deepFastingDays,
  };

  const [periodLogsResult, fastPlansResult, fastLogsResult] = await Promise.all([
    supabase
      .from("period_logs")
      .select("period_date")
      .eq("user_id", user.id)
      .order("period_date", { ascending: true }),
    supabase
      .from("fast_plans")
      .select("id, planned_date, fast_type, planned_hours")
      .eq("user_id", user.id)
      .order("planned_date", { ascending: true }),
    supabase
      .from("fast_logs")
      .select("id, plan_id, logged_date, fast_type, planned_hours, actual_minutes")
      .eq("user_id", user.id),
  ]);

  const initialPeriodHistory: ISODate[] = (periodLogsResult.data ?? []).map((row) => row.period_date as ISODate);
  const initialFastPlans: FastPlan[] = (fastPlansResult.data ?? []).map((row) => ({
    id: row.id,
    plannedDate: row.planned_date as ISODate,
    fastType: row.fast_type as FastPlan["fastType"],
    plannedHours: row.planned_hours,
  }));
  const initialFastLogs: FastLog[] = (fastLogsResult.data ?? []).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    loggedDate: row.logged_date as ISODate,
    fastType: row.fast_type as FastLog["fastType"],
    plannedHours: row.planned_hours,
    actualMinutes: row.actual_minutes,
  }));

  const isCurrentMonth = viewedMonth.year === currentMonth.year && viewedMonth.month === currentMonth.month;
  const isForecasted =
    viewedMonth.year * 12 + viewedMonth.month > currentMonth.year * 12 + currentMonth.month;

  const monthLabel = new Date(Date.UTC(viewedMonth.year, viewedMonth.month - 1, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  const moonHighlights = await getMoonHighlightsForMonth(viewedMonth, MOCK_LOCATION.lat, MOCK_LOCATION.lon);
  const todayISO = isCurrentMonth ? toISODate(viewedMonth, now.getUTCDate()) : undefined;

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-6 py-16">
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
        initialPeriodDate={initialPeriodDate}
        userId={user.id}
        initialPeriodHistory={initialPeriodHistory}
        initialFastPlans={initialFastPlans}
        initialFastLogs={initialFastLogs}
        initialCycleLength={initialCycleLength}
        initialPause={initialPause}
        initialWeeklyRhythmSelection={initialWeeklyRhythmSelection}
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
