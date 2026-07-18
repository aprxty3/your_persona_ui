import posthog from 'posthog-js';

// PRD Section 3 metric instrumentation — mandatory since M1 (Tech Doc §8).
// HARD RULE: no PII, no essay content — event names + technical properties only.

export type AnalyticsEvent =
  | 'landing_view'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'section_a_completed'
  | 'section_b_completed'
  | 'section_c_started'
  | 'section_c_completed'
  | 'assessment_submitted'
  | 'result_viewed'
  | 'share_clicked'
  | 'claim_banner_viewed'
  | 'register_from_claim'
  | 'pdf_download_clicked'
  | 'quota_exceeded_viewed';

let initialized = false;

export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (initialized || !key || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // sensitive pages (/results) must never auto-capture
    persistence: 'localStorage',
  });
  initialized = true;
}

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!initialized) return; // dev without a key = silent no-op
  posthog.capture(event, properties);
}
