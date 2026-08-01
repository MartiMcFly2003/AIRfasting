"use client";

import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { getConsent, setConsent } from "@/lib/analytics/posthog-consent";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "./cookie-consent-events";

type Status = "hidden" | "banner" | "preferences";

function getInitialStatus(): Status {
  if (typeof window === "undefined") return "hidden";
  return getConsent() ? "hidden" : "banner";
}

export function CookieConsentBanner() {
  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [functional, setFunctional] = useState(() => getConsent()?.functional ?? false);
  const [analytics, setAnalytics] = useState(() => getConsent()?.analytics ?? false);

  useEffect(() => {
    function handleOpen() {
      const current = getConsent();
      setFunctional(current?.functional ?? false);
      setAnalytics(current?.analytics ?? false);
      setStatus("preferences");
    }
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpen);
  }, []);

  function acceptAll() {
    setConsent({ functional: true, analytics: true });
    setStatus("hidden");
  }

  function rejectNonEssential() {
    setConsent({ functional: false, analytics: false });
    setStatus("hidden");
  }

  function savePreferences() {
    setConsent({ functional, analytics });
    setStatus("hidden");
  }

  if (status === "hidden") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="w-full max-w-2xl rounded-2xl border border-ivory/10 bg-obsidian p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {status === "banner" && (
          <>
            <p className="font-body text-sm leading-relaxed text-silver">
              We use cookies to run AIRfasting (strictly necessary), remember your preferences
              (functional), and understand how AIRfasting is used so we can improve it
              (analytics). You can accept all, reject non-essential cookies, or manage your
              preferences below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={acceptAll}>Accept All</PrimaryButton>
              <SecondaryButton onClick={rejectNonEssential}>Reject Non-Essential</SecondaryButton>
              <SecondaryButton onClick={() => setStatus("preferences")}>Manage Preferences</SecondaryButton>
            </div>
          </>
        )}

        {status === "preferences" && (
          <>
            <p className="font-heading text-lg tracking-wide text-ivory">Cookie Preferences</p>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked disabled className="mt-1" />
                <span className="font-body text-sm leading-relaxed text-silver">
                  <span className="text-ivory">Strictly Necessary</span> — required for
                  AIRfasting to function, including login and security.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="mt-1"
                />
                <span className="font-body text-sm leading-relaxed text-silver">
                  <span className="text-ivory">Functional</span> — remembers your preferences,
                  like language and planning mode.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1"
                />
                <span className="font-body text-sm leading-relaxed text-silver">
                  <span className="text-ivory">Analytics</span> — helps us understand how
                  AIRfasting is used, via PostHog, so we can improve the product.
                </span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={savePreferences}>Save Preferences</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
