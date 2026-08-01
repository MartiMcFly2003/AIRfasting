import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const origin = new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { supabase_user_id: user.id },
    },
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : (user.email ?? undefined),
    success_url: `${origin}/calendar?checkout=success`,
    cancel_url: `${origin}/start-trial?checkout=cancelled`,
    // Deliberately no payment_method_types — leaving it unset lets Stripe use "automatic
    // payment methods," which reads whatever's enabled in the Dashboard (incl. PayPal).
    // Explicitly setting payment_method_types: ["card"] would silently suppress PayPal.
  });

  return NextResponse.json({ url: session.url });
}
