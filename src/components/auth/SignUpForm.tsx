"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/calendar/DialogPrimitives";
import { createClient } from "@/lib/supabase/client";
import { signUpWithPassword } from "@/lib/supabase/auth";
import { AuthShell, FIELD_LABEL, InlineError, TEXT_INPUT } from "./AuthPrimitives";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [notificationsOptIn, setNotificationsOptIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "check-email">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const { data, error: signUpError } = await signUpWithPassword(email, password, {
      marketingOptIn,
      notificationsOptIn,
    });
    if (signUpError) {
      setError(signUpError.message);
      setStatus("idle");
      return;
    }

    if (!data.session || !data.user) {
      // Email confirmation is required on this project — no session yet, nothing to
      // provision. The users/user_profiles rows get created once they confirm and sign in.
      setStatus("check-email");
      return;
    }

    // Session is active immediately (confirmation disabled) — provision the `users` row now.
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("users")
      .insert({ id: data.user.id, email: data.user.email });
    if (insertError) {
      setError(insertError.message);
      setStatus("idle");
      return;
    }

    router.push("/onboarding");
  }

  if (status === "check-email") {
    return (
      <AuthShell>
        <h2 className="font-heading text-2xl tracking-wide text-ivory">Check your email</h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-silver">
          We&apos;ve sent a confirmation link to {email}. Follow it, then come back and log in.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h2 className="font-heading text-2xl tracking-wide text-ivory">Create your account</h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-silver">
        A few questions after this, then your calendar.
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
        <label className="block">
          <span className={FIELD_LABEL}>Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={TEXT_INPUT}
          />
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-1"
          />
          <span className="font-body text-sm leading-relaxed text-silver">
            Yes, send me marketing emails with wellness tips, product updates, and offers. You
            can unsubscribe at any time.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={notificationsOptIn}
            onChange={(e) => setNotificationsOptIn(e.target.checked)}
            className="mt-1"
          />
          <span className="font-body text-sm leading-relaxed text-silver">
            Yes, send me notifications through the app (e.g. fasting reminders, trial updates).
            You can turn these off anytime in Settings.
          </span>
        </label>
        {error && <InlineError>{error}</InlineError>}
        <PrimaryButton type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Creating account…" : "Sign up"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
