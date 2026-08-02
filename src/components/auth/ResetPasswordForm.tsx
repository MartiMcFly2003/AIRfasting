"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { updatePassword, verifyPasswordResetCode } from "@/lib/supabase/auth";
import { AuthShell, FIELD_LABEL, InlineError, TEXT_INPUT } from "./AuthPrimitives";

// "code"/"verifying" render the code+password form; "ready"/"saving" render the password-only
// retry form (code already consumed). Kept as distinct pairs rather than a shared "submitting"
// flag so each form's own render branch stays simple, with no impossible status comparisons.
type Status = "code" | "verifying" | "ready" | "saving" | "missing-email";

// Gmail (and most email security scanners) pre-visit links inside incoming emails to check
// them for safety, which silently consumes Supabase's single-use recovery link before the user
// ever clicks it themselves — confirmed directly against this project's real production traffic,
// not a hypothetical. A 6-digit code typed in manually sidesteps that entirely, since nothing
// can "pre-click" a code. This replaces the old hash/?code= link-based exchange completely.
function getInitialStatus(): Status {
  if (typeof window === "undefined") return "code";
  const hasEmail = new URLSearchParams(window.location.search).has("email");
  return hasEmail ? "code" : "missing-email";
}

function getEmailFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [email] = useState(getEmailFromUrl);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("verifying");

    const { error: verifyError } = await verifyPasswordResetCode(email, code);
    if (verifyError) {
      setError(verifyError.message);
      setStatus("code");
      return;
    }

    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      // The code is already consumed at this point — resubmitting the full form would fail on
      // a second verifyOtp call with the same code, so drop into the password-only retry state.
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  async function handleReadySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setStatus("saving");
    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  if (status === "missing-email") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">We&apos;re not sure whose code this is</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          We couldn&apos;t find which account this code is for.{" "}
          <Link href="/forgot-password" className="text-ivory underline">
            Request a new one
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  if (status === "ready" || status === "saving") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">Set a new password</h2>
        <form onSubmit={handleReadySubmit} className="mt-4 flex flex-col gap-4">
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
          <PrimaryButton type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Set new password"}
          </PrimaryButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-2xl tracking-wide text-ivory">Enter your code</h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-silver">
        We sent a 6-digit code to {email}. Enter it below along with your new password.
      </p>
      <form onSubmit={handleCodeSubmit} className="mt-4 flex flex-col gap-4">
        <label className="block">
          <span className={FIELD_LABEL}>Code</span>
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
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
        <PrimaryButton type="submit" disabled={status === "verifying"}>
          {status === "verifying" ? "Resetting…" : "Reset password"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
