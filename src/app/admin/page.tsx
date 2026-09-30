import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdminEmail } from "@/lib/admin/access";
import { graceDaysRemaining } from "@/lib/billing/dunning";
import { reconcile, type ProfileSnapshot, type StripeSnapshot } from "@/lib/billing/reconcile";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * The one place that answers "what is actually going on with my subscribers".
 *
 * It reads under the service role, so the gate above it is doing real work — not-found rather
 * than a redirect for anybody else, since a login page would confirm the route exists.
 *
 * The Stripe comparison runs on every load rather than showing yesterday's reconciliation. The
 * daily job exists to catch things while nobody is looking; this page exists for when somebody
 * is, and at that moment a stale answer is worse than a slow one.
 */

export const dynamic = "force-dynamic";

interface Row {
  user_id: string;
  role: string | null;
  subscription_status: string | null;
  cancellation_reason: string | null;
  canceled_at: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  past_due_since: string | null;
  dunning_frozen_at: string | null;
  dunning_warned_at: string | null;
  users: { email: string | null; created_at: string | null } | null;
}

const CARD = "rounded-2xl border border-ivory/10 bg-obsidian p-5";
const TH = "px-3 py-2 text-left font-accent text-[11px] uppercase tracking-wider text-silver";
const TD = "px-3 py-2 font-body text-sm text-ivory align-top";

function day(value: string | null): string {
  return value ? String(value).slice(0, 10) : "—";
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  const colour = tone === "bad" ? "text-coral" : tone === "warn" ? "text-gold" : "text-ivory";
  return (
    <div className={CARD}>
      <p className="font-accent text-[11px] uppercase tracking-wider text-silver">{label}</p>
      <p className={`mt-1 font-heading text-3xl ${colour}`}>{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not a redirect: anybody who is not the owner should not learn that this page exists.
  if (!isAdminEmail(user?.email)) notFound();

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("user_profiles")
    .select(
      "user_id, role, subscription_status, cancellation_reason, canceled_at, trial_ends_at, stripe_customer_id, stripe_subscription_id, past_due_since, dunning_frozen_at, dunning_warned_at, users(email, created_at)",
    );

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <p className="font-body text-sm text-coral">Could not read profiles: {error.message}</p>
      </main>
    );
  }

  const rows = (data as unknown as Row[] | null) ?? [];
  const now = new Date();

  // A Stripe outage should cost the page its comparison, not its contents.
  let stripeSubs: StripeSnapshot[] | null = null;
  let stripeError: string | null = null;
  try {
    const all = await stripe.subscriptions
      .list({ status: "all", limit: 100 })
      .autoPagingToArray({ limit: 1000 });
    stripeSubs = all.map((sub) => ({
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      subscriptionId: sub.id,
      status: sub.status,
    }));
  } catch (caught) {
    stripeError = (caught as Error).message;
  }

  const profiles: ProfileSnapshot[] = rows.map((row) => ({
    userId: row.user_id,
    email: row.users?.email ?? null,
    role: row.role,
    subscriptionStatus: row.subscription_status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    pastDueSince: row.past_due_since,
    frozenAt: row.dunning_frozen_at,
  }));

  const findings = stripeSubs ? reconcile(profiles, stripeSubs, now) : [];
  const costly = findings.filter((f) => f.costsMoney);

  const premium = rows.filter((r) => r.role === "premium");
  const paying = rows.filter((r) => r.subscription_status === "active");
  const trialing = rows.filter((r) => r.subscription_status === "trialing");
  const dunning = rows.filter((r) => r.subscription_status === "past_due");
  const cancelled = rows
    .filter((r) => r.subscription_status === "canceled")
    .sort((a, b) => String(b.canceled_at ?? "").localeCompare(String(a.canceled_at ?? "")));

  const lostToPayment = cancelled.filter((r) => r.cancellation_reason === "payment_failed");

  return (
    <main className="flex flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="font-heading text-2xl tracking-wide text-ivory">Subscribers</h1>
        <Link href="/calendar" className="font-accent text-xs text-silver hover:text-ivory hover:underline">
          Back to calendar
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Accounts" value={rows.length} />
        <Stat label="Premium" value={premium.length} />
        <Stat label="Paying" value={paying.length} />
        <Stat label="In trial" value={trialing.length} />
        <Stat label="Payment failing" value={dunning.length} tone={dunning.length ? "warn" : undefined} />
        <Stat label="Unpaid Premium" value={costly.length} tone={costly.length ? "bad" : undefined} />
      </section>

      <section>
        <h2 className="font-heading text-lg tracking-wide text-ivory">Against Stripe, right now</h2>
        {stripeError ? (
          <p className="mt-2 font-body text-sm text-coral">
            Couldn&apos;t reach Stripe, so nothing below is verified: {stripeError}
          </p>
        ) : findings.length === 0 ? (
          <p className="mt-2 font-body text-sm text-silver">
            Every account matches Stripe. Nobody has Premium without paying for it.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {findings.map((f, i) => (
              <li
                key={i}
                className={`rounded-xl border p-3 font-body text-sm ${
                  f.costsMoney ? "border-coral/40 bg-coral/10 text-ivory" : "border-ivory/10 text-silver"
                }`}
              >
                <span className="text-ivory">{f.subject}</span> — {f.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      {dunning.length > 0 && (
        <section>
          <h2 className="font-heading text-lg tracking-wide text-ivory">Payment failing</h2>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-ivory/10">
            <table className="w-full min-w-[42rem] border-collapse">
              <thead className="bg-ivory/5">
                <tr>
                  <th className={TH}>Who</th>
                  <th className={TH}>Failing since</th>
                  <th className={TH}>Grace left</th>
                  <th className={TH}>Warned</th>
                  <th className={TH}>Frozen</th>
                  <th className={TH}>Access</th>
                </tr>
              </thead>
              <tbody>
                {dunning.map((r) => {
                  const left = graceDaysRemaining(
                    {
                      subscriptionStatus: r.subscription_status,
                      pastDueSince: r.past_due_since,
                      frozenAt: r.dunning_frozen_at,
                    },
                    now,
                  );
                  return (
                    <tr key={r.user_id} className="border-t border-ivory/10">
                      <td className={TD}>{r.users?.email ?? r.user_id}</td>
                      <td className={TD}>{day(r.past_due_since)}</td>
                      <td className={TD}>{r.dunning_frozen_at ? "—" : `${left ?? "?"} days`}</td>
                      <td className={TD}>{r.dunning_warned_at ? day(r.dunning_warned_at) : "not yet"}</td>
                      <td className={TD}>{r.dunning_frozen_at ? day(r.dunning_frozen_at) : "not yet"}</td>
                      <td className={TD}>{r.role === "premium" ? "Premium" : "paused"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-heading text-lg tracking-wide text-ivory">
          Cancellations{" "}
          <span className="font-accent text-xs text-silver">
            — {lostToPayment.length} of {cancelled.length} lost to failed payment
          </span>
        </h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-ivory/10">
          <table className="w-full min-w-[36rem] border-collapse">
            <thead className="bg-ivory/5">
              <tr>
                <th className={TH}>Who</th>
                <th className={TH}>Ended</th>
                <th className={TH}>Why</th>
                <th className={TH}>Trial ended</th>
              </tr>
            </thead>
            <tbody>
              {cancelled.map((r) => (
                <tr key={r.user_id} className="border-t border-ivory/10">
                  <td className={TD}>{r.users?.email ?? r.user_id}</td>
                  <td className={TD}>{day(r.canceled_at)}</td>
                  <td className={TD}>
                    {r.cancellation_reason === "payment_failed" ? (
                      <span className="text-coral">payment failed</span>
                    ) : r.cancellation_reason === "customer_requested" ? (
                      "they chose to"
                    ) : r.cancellation_reason === "payment_disputed" ? (
                      <span className="text-coral">disputed</span>
                    ) : (
                      <span className="text-silver">unknown — predates this record</span>
                    )}
                  </td>
                  <td className={TD}>{day(r.trial_ends_at)}</td>
                </tr>
              ))}
              {cancelled.length === 0 && (
                <tr>
                  <td className={TD} colSpan={4}>
                    Nobody has cancelled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
