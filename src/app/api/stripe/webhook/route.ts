import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  graceDaysRemaining,
  hasPremiumAccess,
  resolveDunningOnStatusChange,
  type DunningState,
} from "@/lib/billing/dunning";
import {
  buildPaymentFailedEmail,
  buildPaymentRecoveredEmail,
  buildSubscriptionEndedEmail,
} from "@/lib/email/billing-emails";
import { sendEmail } from "@/lib/email/resend";
import { stripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Supabase = ReturnType<typeof createServiceRoleClient>;

interface DunningProfile {
  user_id: string;
  subscription_status: string | null;
  past_due_since: string | null;
  dunning_frozen_at: string | null;
  dunning_last_invoice: string | null;
  users: { email: string | null } | null;
}

/** The dunning columns plus the address to write to, for one Stripe customer. */
async function loadProfile(supabase: Supabase, customerId: string): Promise<DunningProfile | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "user_id, subscription_status, past_due_since, dunning_frozen_at, dunning_last_invoice, users(email)",
    )
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as unknown as DunningProfile | null) ?? null;
}

/** Never let a mail failure fail the webhook: Stripe would retry the whole event, and the
 *  database write it carried is the part that must not be replayed half-applied. */
async function tryEmail(
  to: string | null | undefined,
  mail: { subject: string; html: string },
): Promise<void> {
  if (!to) return;
  try {
    await sendEmail({ to, ...mail });
  } catch (error) {
    console.error("Dunning email failed to send:", error);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;
      const userId = session.metadata?.supabase_user_id ?? session.client_reference_id;
      if (!userId) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await supabase
        .from("user_profiles")
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          role: "premium",
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          trial_reminder_sent_at: null,
          // A new subscription starts clean, including for somebody returning after an earlier
          // one failed its way to cancellation.
          past_due_since: null,
          dunning_frozen_at: null,
          dunning_last_invoice: null,
        })
        .eq("user_id", userId);
      break;
    }

    /**
     * Every failed charge — the first attempt and each retry alike, because somebody whose
     * payment is failing should never have to guess where they stand.
     *
     * Stripe redelivers events on its own schedule and a redelivery is indistinguishable from a
     * genuine retry, so the invoice id is recorded and re-checked: one failed payment must not
     * produce several warnings.
     */
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string | null;
      if (!customerId) break;

      const profile = await loadProfile(supabase, customerId);
      if (!profile) break;
      if (invoice.id && profile.dunning_last_invoice === invoice.id) break;

      // The grace runs from the first failure of this run, not from this invoice — otherwise
      // every retry would push the deadline back and the freeze would never arrive.
      const pastDueSince = profile.past_due_since ?? now.toISOString();
      const state: DunningState = {
        subscriptionStatus: "past_due",
        pastDueSince,
        frozenAt: profile.dunning_frozen_at,
      };

      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "past_due",
          past_due_since: pastDueSince,
          dunning_last_invoice: invoice.id ?? null,
          role: hasPremiumAccess(state, now) ? "premium" : "free",
        })
        .eq("user_id", profile.user_id);

      await tryEmail(
        profile.users?.email,
        buildPaymentFailedEmail(
          siteUrl,
          null,
          graceDaysRemaining(state, now) ?? 0,
          profile.dunning_frozen_at != null,
        ),
      );
      break;
    }

    /** A payment landing is the only thing that ends dunning — elapsed time never does. */
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string | null;
      if (!customerId) break;

      const profile = await loadProfile(supabase, customerId);
      // Only meaningful for an account that was actually failing. The ordinary monthly renewal
      // of a healthy subscription has nothing to announce.
      if (!profile?.past_due_since) break;

      await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          role: "premium",
          past_due_since: null,
          dunning_frozen_at: null,
          dunning_last_invoice: null,
        })
        .eq("user_id", profile.user_id);

      await tryEmail(profile.users?.email, buildPaymentRecoveredEmail(null));
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const profile = await loadProfile(supabase, customerId);

      const { pastDueSince, frozenAt, recovered } = resolveDunningOnStatusChange(
        subscription.status,
        {
          pastDueSince: profile?.past_due_since ?? null,
          frozenAt: profile?.dunning_frozen_at ?? null,
        },
        now,
      );

      const state: DunningState = {
        subscriptionStatus: subscription.status,
        pastDueSince,
        frozenAt,
      };

      const update = {
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        role: hasPremiumAccess(state, now) ? "premium" : "free",
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        past_due_since: pastDueSince,
        // Recovery clears the freeze. invoice.payment_succeeded usually gets there first, but a
        // bare status change must not leave it set either. Anything short of recovery leaves
        // the freeze exactly as it is.
        ...(recovered ? { dunning_frozen_at: null, dunning_last_invoice: null } : {}),
      };

      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from("user_profiles").update(update).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").update(update).eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const profile = await loadProfile(supabase, customerId);

      // stripe_customer_id / stripe_subscription_id / trial_ends_at deliberately kept, not
      // nulled — historical record, and lets a later resubscribe reuse the same customer.
      const update = {
        role: "free",
        subscription_status: "canceled",
        past_due_since: null,
        dunning_frozen_at: null,
        dunning_last_invoice: null,
      };
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabase.from("user_profiles").update(update).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").update(update).eq("stripe_customer_id", customerId);
      }

      // Only for subscriptions that died of failed payment. Somebody who chose to cancel has
      // already been through the cancellation flow and does not need a second notice.
      if (profile?.past_due_since) {
        await tryEmail(profile.users?.email, buildSubscriptionEndedEmail(siteUrl, null));
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
