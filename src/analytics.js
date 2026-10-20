/**
 * Analytics (PostHog) — thin, guarded wrapper.
 *
 * The PostHog *project* key (VITE_POSTHOG_KEY, a "phc_..." value) is PUBLIC by
 * design: it can only send events, never read data — unlike the TMDB key, it is
 * safe in client code. If no key is set, every call here is a silent no-op, so
 * the app runs fine without analytics configured (e.g. local dev).
 */
import posthog from "posthog-js";

let enabled = false;

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) return;
  try {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,       // SPA — we send screen views ourselves
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
    enabled = true;
  } catch (e) {
    console.warn("PostHog init failed:", e);
  }
}

export function track(event, props) {
  if (!enabled) return;
  try { posthog.capture(event, props); } catch { /* ignore */ }
}

export function trackScreen(screen) {
  track("screen_viewed", { screen });
}
