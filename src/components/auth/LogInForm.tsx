"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { signInWithPassword } from "@/lib/supabase/auth";
import { AuthShell, FIELD_LABEL, InlineError, TEXT_INPUT } from "./AuthPrimitives";

export function LogInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signInWithPassword(email, password);
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-2xl tracking-wide text-ivory">Welcome back</h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-silver">Log in to see your calendar.</p>
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
        <label className="block">
          <span className={FIELD_LABEL}>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
        {error && <InlineError>{error}</InlineError>}
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </PrimaryButton>
      </form>
      <Link
        href="/forgot-password"
        className="mt-4 block text-center font-accent text-xs text-silver hover:text-ivory hover:underline"
      >
        Forgot password?
      </Link>
    </AuthShell>
  );
}
