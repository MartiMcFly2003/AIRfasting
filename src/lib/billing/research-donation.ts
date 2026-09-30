/** The wording people agreed to. Bump when the ask changes, so old donations stay attributable
 *  to the words that were actually on screen. */
export const RESEARCH_CONSENT_VERSION = "research-v1";

export interface DonationSource {
  age: number | null;
  track: string | null;
  signedUpAt: string | null;
  logs: {
    loggedDate: string;
    fastType: string | null;
    plannedHours: number | null;
    actualMinutes: number;
    planId: string | null;
  }[];
  plans: { id: string; plannedDate: string; plannedHours: number | null }[];
  periodDates: string[];
}

export interface ResearchFastRow {
  donation_id: string;
  consent_version: string;
  age_band: string | null;
  track: string | null;
  fast_type: string | null;
  planned_hours: number | null;
  actual_minutes: number;
  kept_to_plan: boolean | null;
  cycle_day: number | null;
  days_since_signup: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromISO: string, toISO: string): number | null {
  const a = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / DAY_MS);
}

/** Bands rather than a number: an age of 43 alongside a track and a fast length narrows a small
 *  population uncomfortably fast, and no research question here needs the year. */
function ageBand(age: number | null): string | null {
  if (age == null || !Number.isFinite(age)) return null;
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}

/**
 * Turns one person's history into rows that describe fasting rather than a person.
 *
 * Every calendar date is resolved into a relative position before it is stored — how far into
 * their cycle the fast fell, how far into their own history. That is both what makes the data
 * genuinely anonymous and what makes it useful: "day 19 of the cycle, 18 hours, completed as
 * planned" is the research question, and "14 September" was never part of it.
 *
 * Pure, so the shape of what leaves the database is testable without a database.
 */
export function buildDonation(source: DonationSource, donationId: string): ResearchFastRow[] {
  const band = ageBand(source.age);
  const periods = [...source.periodDates].sort();

  return source.logs.map((log) => {
    const plan = log.planId
      ? source.plans.find((p) => p.id === log.planId)
      : source.plans.find((p) => p.plannedDate === log.loggedDate);

    const keptToPlan = plan
      ? plan.plannedHours == null
        ? true
        : log.actualMinutes >= Number(plan.plannedHours) * 60
      : null;

    // The most recent period on or before the fast; anything later belongs to a cycle that had
    // not started yet.
    const priorPeriod = [...periods].reverse().find((d) => d <= log.loggedDate);
    const cycleDay = priorPeriod ? daysBetween(priorPeriod, log.loggedDate) : null;

    return {
      donation_id: donationId,
      consent_version: RESEARCH_CONSENT_VERSION,
      age_band: band,
      track: source.track,
      fast_type: log.fastType,
      planned_hours: plan?.plannedHours ?? log.plannedHours ?? null,
      actual_minutes: log.actualMinutes,
      kept_to_plan: keptToPlan,
      cycle_day: cycleDay,
      days_since_signup: source.signedUpAt
        ? daysBetween(source.signedUpAt, log.loggedDate)
        : null,
    };
  });
}
