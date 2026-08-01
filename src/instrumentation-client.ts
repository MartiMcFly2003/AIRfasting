import { capturePageviewIfConsented, initPostHogIfConsented } from "@/lib/analytics/posthog-consent";

initPostHogIfConsented();

export function onRouterTransitionStart(url: string) {
  capturePageviewIfConsented(url);
}
