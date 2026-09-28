import { DUNNING_GRACE_DAYS } from "@/lib/billing/dunning";

/** Keep in sync with the Stripe Price manually — static copy, same as trial-reminder-email.ts. */
const MONTHLY_PRICE_LABEL = "€11/month";

function greet(name: string | null): string {
  return name ? `Hi ${name},` : "Hi there,";
}

/** Everything links here rather than to a Stripe portal URL: portal sessions are short-lived
 *  and single-use, so one baked into an email is usually dead by the time it's opened. The
 *  billing panel on this page opens a fresh one. */
function billingLink(siteUrl: string): string {
  return `${siteUrl}/settings`;
}

function signOff(): string {
  return `<p>Your AIRfasting team</p>`;
}

/**
 * Sent on every failed charge, including each retry — the customer should never be guessing
 * where they stand. The copy changes with the stage: while in grace it says what they still
 * have and by when; once frozen it says what has stopped and how to get it back.
 */
export function buildPaymentFailedEmail(
  siteUrl: string,
  name: string | null,
  daysRemaining: number,
  frozen: boolean,
): { subject: string; html: string } {
  if (frozen) {
    return {
      subject: "We still can't take payment for your AIRfasting Premium",
      html: `
    <p>${greet(name)}</p>
    <p>We tried your payment method again and it was declined, so your Premium features are still paused.</p>
    <p>Your plans, logged fasts and history are all safe — nothing has been deleted. Updating your payment details restores everything straight away.</p>
    <p><a href="${billingLink(siteUrl)}">Keep Premium &mdash; update my payment method</a></p>
    <p>We'll keep trying for a few more weeks. If payment still hasn't gone through by then, your account moves to the free plan and you'll keep your data.</p>
    ${signOff()}`,
    };
  }

  const window =
    daysRemaining <= 0
      ? "today"
      : `for the next ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;

  return {
    subject: "Your AIRfasting payment didn't go through",
    html: `
    <p>${greet(name)}</p>
    <p>We couldn't take this month's ${MONTHLY_PRICE_LABEL} payment for AIRfasting Premium. This usually means a card has expired, or a bank declined the charge — often nothing more than a routine security check.</p>
    <p><strong>Your Premium features stay on ${window}</strong>, so there's no rush and nothing is interrupted while you sort it out.</p>
    <p><a href="${billingLink(siteUrl)}">Keep Premium &mdash; update my payment method</a></p>
    <p>If the payment goes through before then, you'll never notice the difference. If it doesn't, Premium pauses after ${DUNNING_GRACE_DAYS} days — your data stays exactly where it is, and updating your details brings everything back.</p>
    ${signOff()}`,
  };
}

/** Sent the moment premium is withdrawn, so the freeze is never something they discover. */
export function buildAccessFrozenEmail(
  siteUrl: string,
  name: string | null,
): { subject: string; html: string } {
  return {
    subject: "Your AIRfasting Premium is paused",
    html: `
    <p>${greet(name)}</p>
    <p>We weren't able to take payment over the past ${DUNNING_GRACE_DAYS} days, so your Premium features are now paused.</p>
    <p>Nothing has been lost. Your fasting plans, your logged history and your cycle data are all still here, exactly as you left them.</p>
    <p><a href="${billingLink(siteUrl)}">Keep Premium &mdash; update my payment method</a></p>
    <p>That's all it takes; Premium comes straight back.</p>
    <p>We'll keep trying your payment method for the next few weeks. If it still doesn't go through, your account simply moves to the free plan.</p>
    ${signOff()}`,
  };
}

/** Sent when Stripe gives up and the subscription ends — the last word, and a calm one. */
export function buildSubscriptionEndedEmail(
  siteUrl: string,
  name: string | null,
): { subject: string; html: string } {
  return {
    subject: "Your AIRfasting Premium has ended",
    html: `
    <p>${greet(name)}</p>
    <p>We weren't able to take payment, so your Premium subscription has now ended and your account has moved to the free plan.</p>
    <p>Your data is still yours — plans, history and cycle records are all intact, and the free plan keeps working.</p>
    <p>If you'd like it back, you can <a href="${billingLink(siteUrl)}">restart Premium</a> at ${MONTHLY_PRICE_LABEL} whenever suits you.</p>
    <p>Thank you for fasting with us.</p>
    ${signOff()}`,
  };
}

/** Sent when a payment finally lands, so the story has an ending rather than just stopping. */
export function buildPaymentRecoveredEmail(
  name: string | null,
): { subject: string; html: string } {
  return {
    subject: "You're all set — AIRfasting Premium is back",
    html: `
    <p>${greet(name)}</p>
    <p>Your payment went through and your Premium features are active again. Nothing else to do.</p>
    ${signOff()}`,
  };
}
