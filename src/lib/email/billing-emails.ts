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
    <p><strong>If you don't update your payment details, your Premium plan will be cancelled automatically.</strong> Your account moves to the free plan and your data stays with you, but your Premium features won't come back without starting a new subscription.</p>
    ${signOff()}`,
    };
  }

  // The remaining days are stated as a deadline, not as breathing room. An earlier draft led
  // with "your features stay on for 7 days, so there's no rush" — accurate, and an invitation
  // to put it off until there is no time left.
  const deadline =
    daysRemaining <= 0
      ? "If we can't take payment today, your Premium features pause — your data stays exactly where it is, and updating your details brings everything back."
      : `If we still can't take payment, your Premium features pause in ${daysRemaining} day${
          daysRemaining === 1 ? "" : "s"
        }. Nothing is deleted, but your plans, reminders and history stop until it's sorted.`;

  return {
    subject: "Your AIRfasting payment didn't go through",
    html: `
    <p>${greet(name)}</p>
    <p>We couldn't take this month's ${MONTHLY_PRICE_LABEL} payment for AIRfasting Premium. Usually that's an expired card or a routine bank check — and it takes a minute to put right.</p>
    <p><strong>Please update your payment details now.</strong></p>
    <p><a href="${billingLink(siteUrl)}">Keep Premium &mdash; update my payment method</a></p>
    <p>${deadline}</p>
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
    <p><strong>If you don't update your payment details, your Premium plan will be cancelled automatically.</strong> You'd keep your data and the free plan, but getting Premium back would mean starting a new subscription.</p>
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

/**
 * The day before premium is withdrawn — the one email in this sequence that can prevent the
 * thing it describes, so it leads with the deadline and the fix rather than the history.
 */
export function buildFreezeTomorrowEmail(
  siteUrl: string,
  name: string | null,
): { subject: string; html: string } {
  return {
    subject: "Tomorrow your AIRfasting Premium will pause",
    html: `
    <p>${greet(name)}</p>
    <p><strong>Tomorrow your Premium features will pause</strong>, because we still haven't been able to take payment. An expired card is the usual reason, and it takes a minute to fix.</p>
    <p><a href="${billingLink(siteUrl)}">Keep Premium &mdash; update my payment method</a></p>
    <p>Do it before tomorrow and nothing changes: your plans, reminders and history carry on as they are, and you won't notice anything at all.</p>
    <p>If the payment doesn't go through, Premium pauses &mdash; but nothing is deleted, and updating your details brings it all straight back.</p>
    ${signOff()}`,
  };
}
