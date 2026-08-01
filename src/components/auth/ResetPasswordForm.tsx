"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/supabase/auth";
import { AuthShell, FIELD_LABEL, InlineError, TEXT_INPUT } from "./AuthPrimitives";

type Status = "exchanging" | "ready" | "invalid" | "submitting";

// Lazy initial state (rather than always starting at "exchanging" and flipping synchronously
// in an effect) so the "nothing at all present" case never calls setState directly from the
// effect body — only the async paths below do, via a callback/timeout.
function getInitialStatus(): Status {
  if (typeof window === "undefined") return "exchanging";
  const hasCode = new URLSearchParams(window.location.search).has("code");
  const hasRecoveryHash = window.location.hash.includes("access_token");
  return hasCode || hasRecoveryHash ? "exchanging" : "invalid";
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Confirmed directly against this project's real recovery links (not assumed from the
  // signup-confirmation flow's PKCE token, which turned out not to generalize): recovery
  // uses the older implicit flow — the redirect carries #access_token=...&refresh_token=...
  // in the URL hash, not a ?code= query param. @supabase/ssr's browser client is built around
  // cookie-based PKCE sessions for SSR and doesn't reliably auto-process that hash the way
  // the plain supabase-js client's detectSessionInUrl does — so this parses it explicitly and
  // calls setSession() directly rather than depending on undocumented automatic behavior.
  // A ?code= param is handled too, defensively, in case that ever changes.
  useEffect(() => {
    if (status !== "exchanging") return;
    const supabase = createClient();

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = new URLSearchParams(window.location.search).get("code");

    const sessionPromise =
      accessToken && refreshToken
        ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : code
          ? supabase.auth.exchangeCodeForSession(code)
          : Promise.resolve({ error: new Error("No recovery token present") });

    sessionPromise.then(({ error: sessionError }) => {
      setStatus(sessionError ? "invalid" : "ready");
    });
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  if (status === "exchanging") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">Set a new password</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">Confirming your link…</p>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">Link expired</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          This password reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="text-ivory underline">
            Request a new one
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-2xl tracking-wide text-ivory">Set a new password</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <label className="block">
          <span className={FIELD_LABEL}>New password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
        <label className="block">
          <span className={FIELD_LABEL}>Confirm password</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
        {error && <InlineError>{error}</InlineError>}
        <PrimaryButton type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Saving…" : "Set new password"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
