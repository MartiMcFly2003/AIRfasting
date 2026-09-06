"use client";

import { useSyncExternalStore } from "react";

const neverResubscribe = () => () => {};

/**
 * False during SSR and on the client's first render, true from then on.
 *
 * Gate anything that reads browser-only state — cookies, the device's time zone — on this.
 * Reading it during the first render makes the client's output disagree with the server's,
 * which fails hydration and costs the whole server-rendered page.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverResubscribe, () => true, () => false);
}
