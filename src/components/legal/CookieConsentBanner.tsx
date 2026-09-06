"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/calendar/DialogPrimitives";
import { getConsent, setConsent } from "@/lib/analytics/posthog-consent";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "./cookie-consent-events";

type Status = "hidden" | "banner" | "preferences";

const neverResubscribe = () => () => {};

/** False during SSR and on the client's first render, true from then on. Consent lives in a
 *  cookie the server can't read, so gating on this keeps the two passes agreeing during
 *  hydration instead of the server rendering nothing while the client renders the banner. */
function useHydrated(): boolean {
  return useSyncExternalStore(neverResubscribe, () => true, () => false);
}

export function CookieConsentBanner() {
  const hydrated = useHydrated();
  // Set once the visitor acts, overriding whatever the cookie would otherwise imply.
  const [chosen, setChosen] = useState<Status | null>(null);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  const status: Status = chosen ?? (hydrated && !getConsent() ? "banner" : "hidden");

  function openPreferences() {
    const current = getConsent();
    setFunctional(current?.functional ?? false);
    setAnalytics(current?.analytics ?? false);
    setChosen("preferences");
  }

  useEffect(() => {
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences);
  });

  // The banner floats above the page, so hold open a matching gap at the bottom of the
  // document while it's up. Without this it simply sits on top of whatever occupies that
  // strip — on a laptop-height window that was the sign-up form's notifications opt-in and
  // its submit button, both unclickable. Re-measured on resize since the text rewraps.
  const bannerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) {
      document.body.style.paddingBottom = "";
      return;
    }
    const syncGap = () => {
      document.body.style.paddingBottom = `${el.offsetHeight}px`;
    };
    syncGap();
    const observer = new ResizeObserver(syncGap);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [status]);

  function acceptAll() {
    setConsent({ functional: true, analytics: true });
    setChosen("hidden");
  }

  function rejectNonEssential() {
    setConsent({ functional: false, analytics: false });
    setChosen("hidden");
  }

  function savePreferences() {
    setConsent({ functional, analytics });
    setChosen("hidden");
  }

  if (status === "hidden") return null;

  return (
    <div ref={bannerRef} className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
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
              <SecondaryButton onClick={openPreferences}>Manage Preferences</SecondaryButton>
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
