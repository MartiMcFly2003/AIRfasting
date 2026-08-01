"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { requestPasswordReset } from "@/lib/supabase/auth";
import { AuthShell, FIELD_LABEL, InlineError, TEXT_INPUT } from "./AuthPrimitives";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "check-email">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const { error: resetError } = await requestPasswordReset(
      email,
      `${window.location.origin}/reset-password`,
    );
    if (resetError) {
      setError(resetError.message);
      setStatus("idle");
      return;
    }

    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">Check your email</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-2xl tracking-wide text-ivory">Reset your password</h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-silver">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <label className="block">
          <span className={FIELD_LABEL}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
        {error && <InlineError>{error}</InlineError>}
        <PrimaryButton type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send reset link"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
