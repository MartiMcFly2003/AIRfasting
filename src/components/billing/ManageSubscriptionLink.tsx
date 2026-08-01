"use client";

import { useState } from "react";

export function ManageSubscriptionLink() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="font-accent text-xs text-silver hover:text-ivory hover:underline disabled:opacity-40"
    >
      {loading ? "Opening…" : "Manage subscription"}
    </button>
  );
}
