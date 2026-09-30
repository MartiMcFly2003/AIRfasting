/** Days of premium a customer keeps after their first failed renewal. */
export const DUNNING_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DunningState {
  /** Stripe's subscription status, as mirrored on the profile. */
  subscriptionStatus: string | null;
  /** When the current run of failures began; null when nothing is failing. */
  pastDueSince: string | null;
  /** When premium was withdrawn; null while they still have it. */
  frozenAt: string | null;
}

/** When the grace period runs out, or null if this account isn't in dunning. */
export function graceEndsAt(state: DunningState): Date | null {
  if (!state.pastDueSince) return null;
  const started = Date.parse(state.pastDueSince);
  if (Number.isNaN(started)) return null;
  return new Date(started + DUNNING_GRACE_DAYS * DAY_MS);
}

/** Whole days left before the freeze, floored at 0. Null when not in dunning. */
export function graceDaysRemaining(state: DunningState, now: Date): number | null {
  const ends = graceEndsAt(state);
  if (!ends) return null;
  return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / DAY_MS));
}

/**
 * Whether the account should have premium right now.
 *
 * "past_due" is the interesting case and the reason this is a function rather than a list of
 * statuses: a first decline is very often a bank's fraud heuristic or a temporary hold that
 * clears on the next retry, so cutting access off the same hour punishes a paying customer for
 * their bank's caution. They keep premium for the grace window, and lose it after — while
 * Stripe goes on retrying, because a frozen subscriber can still be recovered.
 *
 * Once frozen, the freeze stands until Stripe reports a successful payment. Time alone never
 * restores access.
 */
export function hasPremiumAccess(state: DunningState, now: Date): boolean {
  if (state.frozenAt) return false;
  if (state.subscriptionStatus === "trialing" || state.subscriptionStatus === "active") return true;
  if (state.subscriptionStatus !== "past_due") return false;

  const ends = graceEndsAt(state);
  // past_due with no recorded start is a row we have not seen fail yet — give it the benefit of
  // the grace rather than freezing on the strength of missing data.
  if (!ends) return true;
  return now.getTime() < ends.getTime();
}

/** True once the grace has run out but nothing has withdrawn access yet — the cron's work list. */
export function isDueToFreeze(state: DunningState, now: Date): boolean {
  if (state.frozenAt) return false;
  if (state.subscriptionStatus !== "past_due") return false;
  const ends = graceEndsAt(state);
  return ends != null && now.getTime() >= ends.getTime();
}

/** Statuses that mean the subscription is genuinely well again. Everything else Stripe can
 *  report — past_due, unpaid, incomplete, paused — is some shade of not-paying. */
const HEALTHY_STATUSES = ["active", "trialing"];

export interface DunningTransition {
  /** What past_due_since should become. */
  pastDueSince: string | null;
  /** What dunning_frozen_at should become. */
  frozenAt: string | null;
  /** Whether this status ends the dunning run, so the caller can clear the rest of it. */
  recovered: boolean;
}

/**
 * How a subscription status change moves the dunning clock.
 *
 * The rule worth stating out loud: only a healthy status ends a run. It is tempting to treat
 * "not past_due" as recovery, but Stripe reports several statuses that are neither failing nor
 * recovered, and clearing the clock on those restarts the grace when the subscription returns
 * to past_due — so a subscription that wobbles between states never reaches its freeze and
 * keeps premium indefinitely. A real account gained three extra weeks that way.
 *
 * past_due starts a clock if none is running. Any other unhealthy status keeps whatever clock
 * exists but never starts one, since it is not itself evidence that a payment has failed.
 */
export function resolveDunningOnStatusChange(
  status: string,
  current: { pastDueSince: string | null; frozenAt: string | null },
  now: Date,
): DunningTransition {
  if (HEALTHY_STATUSES.includes(status)) {
    return { pastDueSince: null, frozenAt: null, recovered: true };
  }

  const started =
    current.pastDueSince ?? (status === "past_due" ? now.toISOString() : null);

  return { pastDueSince: started, frozenAt: current.frozenAt, recovered: false };
}
