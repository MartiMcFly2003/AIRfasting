"use client";

import Link from "next/link";
import { OPEN_COOKIE_PREFERENCES_EVENT } from "./cookie-consent-events";

const LINK_CLASS = "hover:text-ivory hover:underline";

export function Footer() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-ivory/10 px-6 py-6 font-accent text-xs text-silver">
      <Link href="/terms" className={LINK_CLASS}>
        Terms
      </Link>
      <Link href="/privacy" className={LINK_CLASS}>
        Privacy
      </Link>
      <Link href="/cookie-policy" className={LINK_CLASS}>
        Cookie Policy
      </Link>
      <Link href="/health-disclaimer" className={LINK_CLASS}>
        Health Disclaimer
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT))}
        className={LINK_CLASS}
      >
        Cookie Settings
      </button>
    </footer>
  );
}
