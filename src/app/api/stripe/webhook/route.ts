import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          trial_reminder_sent_at: null,
        })
        .eq("user_id", userId);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const hasAccess = ["trialing", "active", "past_due"].includes(subscription.status);
      const update = {
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        role: hasAccess ? "premium" : "free",
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      };
      if (userId) {
        await supabase.from("user_profiles").update(update).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").update(update).eq("stripe_customer_id", subscription.customer as string);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      // stripe_customer_id / stripe_subscription_id / trial_ends_at deliberately kept, not
      // nulled — historical record, and lets a later resubscribe reuse the same customer.
      const update = { role: "free", subscription_status: "canceled" };
      if (userId) {
        await supabase.from("user_profiles").update(update).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").update(update).eq("stripe_customer_id", subscription.customer as string);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
