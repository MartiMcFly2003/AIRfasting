import posthog from "posthog-js";

const COOKIE_NAME = "air_cookie_consent";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface CookieConsent {
  functional: boolean;
  analytics: boolean;
  v: 1;
}

let posthogInitialized = false;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getConsent(): CookieConsent | null {
  const raw = readCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.functional === "boolean" && typeof parsed.analytics === "boolean") {
      return parsed as CookieConsent;
    }
  } catch {
    // Malformed cookie — treat as no decision yet.
  }
  return null;
}

export function setConsent(consent: Omit<CookieConsent, "v">): void {
  const value: CookieConsent = { ...consent, v: 1 };
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;

  if (value.analytics) {
    initPostHogIfConsented();
    // Already initialized from a prior visit but previously opted out this session — flip it
    // back on rather than requiring a reload.
    if (posthogInitialized) posthog.opt_in_capturing();
  } else if (posthogInitialized) {
    // posthog-js has no teardown once init() has run, so this pass uses its own opt-out flag —
    // every capture() call (including the pageview one below) becomes a no-op immediately,
    // without needing a reload, which is what "Reject Non-Essential" needs to actually do.
    posthog.opt_out_capturing();
  }
}

/** Strictly necessary cookies (auth session, etc.) are never gated by this — only PostHog
 *  analytics, which is the one category this app can actually turn on/off at runtime. */
export function initPostHogIfConsented(): void {
  if (posthogInitialized) return;
  const consent = getConsent();
  if (!consent?.analytics) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: "2025-05-24",
  });
  posthogInitialized = true;
}

export function capturePageviewIfConsented(url: string): void {
  if (!posthogInitialized) return;
  posthog.capture("$pageview", { $current_url: url });
}
