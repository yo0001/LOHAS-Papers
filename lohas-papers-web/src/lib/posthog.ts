import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
  initialized = true;
}

export function identifyUser(userId: string, email?: string) {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.identify(userId, email ? { email } : undefined);
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function resetUser() {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.reset();
}

export { posthog };
