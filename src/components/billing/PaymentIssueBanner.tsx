"use client";

import { useState } from "react";

export interface PaymentIssueBannerProps {
  /** Null while still inside the grace window; set once premium has actually been withdrawn. */
  frozen: boolean;
  /** Whole days of premium left. Only meaningful while not yet frozen. */
  daysRemaining: number | null;
}

/**
 * Shown to anyone whose renewal is failing.
 *
 * It exists because freezing an account removes the "Manage subscription" link along with
 * premium — the one control that could fix the problem. Withdrawing the feature and the way to
 * restore it in the same move would leave somebody with a working card and no way to use it.
 *
 * Deliberately not dismissible: it is the only in-app notice of a problem that ends in losing
 * the subscription, and a dismissal would be remembered by nobody.
 */
export function PaymentIssueBanner({ frozen, daysRemaining }: PaymentIssueBannerProps) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  const heading = frozen ? "Your Premium features are paused" : "Your payment didn't go through";
  const body = frozen
    ? "We weren't able to take payment, so Premium is paused for now. Nothing has been lost — your plans and history are all still here, and updating your payment details brings everything straight back."
    : `We couldn't take this month's payment — usually an expired card or a routine bank check. ${
        daysRemaining && daysRemaining > 0
          ? `Premium stays on for ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"} while you sort it out.`
          : "Premium pauses today unless the payment goes through."
      }`;

  return (
    <div
      role="status"
      className="w-full max-w-xl rounded-2xl border border-coral/40 bg-coral/10 p-4 text-center"
    >
      <p className="font-heading text-base tracking-wide text-ivory">{heading}</p>
      <p className="mt-2 font-body text-sm leading-relaxed text-silver">{body}</p>
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        className="mt-3 rounded-lg border border-ivory/30 px-4 py-2 font-accent text-xs uppercase tracking-wider text-ivory hover:bg-ivory/10 disabled:opacity-40"
      >
        {loading ? "Opening…" : "Update payment details"}
      </button>
    </div>
  );
}
