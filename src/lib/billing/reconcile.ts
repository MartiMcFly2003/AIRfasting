import { hasPremiumAccess, type DunningState } from "./dunning";

/** One account as this database sees it. */
export interface ProfileSnapshot {
  userId: string;
  email: string | null;
  role: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  pastDueSince: string | null;
  frozenAt: string | null;
}

/** One subscription as Stripe sees it — the only authority on who is actually paying. */
export interface StripeSnapshot {
  customerId: string;
  subscriptionId: string;
  status: string;
}

export type FindingKind =
  | "premium_without_stripe"
  | "premium_but_stripe_ended"
  | "free_but_stripe_active"
  | "status_drift"
  | "stripe_subscription_unknown_here";

export interface Finding {
  kind: FindingKind;
  /** Whose account, in the terms a human reads. */
  subject: string;
  detail: string;
  /** Whether somebody is getting something they aren't paying for. */
  costsMoney: boolean;
}

const ENDED_STATUSES = ["canceled", "incomplete_expired", "unpaid"];

/**
 * Compares what this database believes against what Stripe knows, and reports every
 * disagreement.
 *
 * It exists because nothing else can answer "is anybody getting Premium without paying for
 * it". Three quite different faults produce that outcome and none of them announce themselves:
 * a webhook that never arrived, a bug in our own status handling, and — until the column grants
 * of 2026-09-30 — a user simply setting role to premium on their own row. All three look
 * exactly like a healthy account from inside the app.
 *
 * Findings are deliberately two-sided. An account paying Stripe while this database calls them
 * free is the more urgent problem of the two: somebody is being charged for something they
 * cannot use, and they will notice.
 */
export function reconcile(
  profiles: ProfileSnapshot[],
  stripeSubscriptions: StripeSnapshot[],
  now: Date,
): Finding[] {
  const byCustomer = new Map(stripeSubscriptions.map((s) => [s.customerId, s]));
  const findings: Finding[] = [];
  const seenCustomers = new Set<string>();

  for (const profile of profiles) {
    const who = profile.email ?? profile.userId;
    const isPremium = profile.role === "premium";
    const stripeSub = profile.stripeCustomerId
      ? byCustomer.get(profile.stripeCustomerId)
      : undefined;
    if (profile.stripeCustomerId) seenCustomers.add(profile.stripeCustomerId);

    // Premium with no Stripe relationship at all. Nothing in the app can produce this: every
    // route to premium goes through checkout, which records a customer id.
    if (isPremium && !profile.stripeCustomerId) {
      findings.push({
        kind: "premium_without_stripe",
        subject: who,
        detail: "Has Premium but no Stripe customer — never went through checkout.",
        costsMoney: true,
      });
      continue;
    }

    if (!stripeSub) {
      if (isPremium) {
        findings.push({
          kind: "premium_but_stripe_ended",
          subject: who,
          detail: `Has Premium but Stripe has no subscription for customer ${profile.stripeCustomerId}.`,
          costsMoney: true,
        });
      }
      continue;
    }

    // What the account *should* look like, given Stripe's status and our own dunning clock.
    const state: DunningState = {
      subscriptionStatus: stripeSub.status,
      pastDueSince: profile.pastDueSince,
      frozenAt: profile.frozenAt,
    };
    const shouldHavePremium = hasPremiumAccess(state, now);

    if (isPremium && !shouldHavePremium && ENDED_STATUSES.includes(stripeSub.status)) {
      findings.push({
        kind: "premium_but_stripe_ended",
        subject: who,
        detail: `Has Premium but Stripe says "${stripeSub.status}".`,
        costsMoney: true,
      });
    } else if (!isPremium && shouldHavePremium) {
      findings.push({
        kind: "free_but_stripe_active",
        subject: who,
        detail: `Stripe says "${stripeSub.status}" and they should have Premium, but the app has them on free — they are paying for something they cannot use.`,
        costsMoney: false,
      });
    }

    if (profile.subscriptionStatus !== stripeSub.status) {
      findings.push({
        kind: "status_drift",
        subject: who,
        detail: `Stored status "${profile.subscriptionStatus}" but Stripe says "${stripeSub.status}" — usually a webhook that never arrived.`,
        costsMoney: false,
      });
    }
  }

  for (const sub of stripeSubscriptions) {
    if (seenCustomers.has(sub.customerId)) continue;
    findings.push({
      kind: "stripe_subscription_unknown_here",
      subject: sub.customerId,
      detail: `Stripe has a "${sub.status}" subscription for a customer this database has never heard of.`,
      costsMoney: false,
    });
  }

  return findings;
}
