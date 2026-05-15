/**
 * Sentry initialization for the frontend.
 *
 * Disabled by default — Sentry is a no-op when REACT_APP_SENTRY_DSN isn't set,
 * which keeps local dev quiet and avoids burning quota on hot reloads.
 *
 * Production setup:
 *   1. Create a free Sentry account → https://sentry.io
 *   2. Create a "React" project, copy the DSN
 *   3. Add to Vercel env vars:
 *      REACT_APP_SENTRY_DSN=https://...@...ingest.sentry.io/...
 *   4. (Optional) REACT_APP_SENTRY_ENVIRONMENT=production
 *
 * Free tier: 5k errors / 10k performance events per month.
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  if (!dsn) return; // no DSN → no-op

  Sentry.init({
    dsn,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'production',
    // Sample 10% of transactions for performance monitoring — enough to spot
    // slowdowns without filling the free-tier quota.
    tracesSampleRate: 0.1,
    // Be explicit: do NOT auto-attach cookies, request headers, or user IPs.
    // Default is already false in @sentry/react, but flipping it on by
    // accident in the future would dump session tokens straight to Sentry.
    sendDefaultPii: false,
    // Redact anything that looks like a JWT or bearer token from event
    // payloads before they leave the browser. Catches stray
    // `console.error(authToken, err)` slip-ups and Authorization headers
    // that get serialized into breadcrumbs.
    beforeSend: redactSecretsFromEvent,
    beforeBreadcrumb: redactSecretsFromBreadcrumb,
    // Filter noisy errors that aren't actionable. Add to this list as
    // false-positives appear.
    ignoreErrors: [
      // Network errors from ad blockers / extensions hitting blocked URLs
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      // ResizeObserver loop chatter — harmless, browsers fire it spuriously
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  });
}

// JWTs follow `header.payload.signature` with base64url segments — match
// liberally so we catch Supabase tokens (eyJ...) and any other JWT shape.
const JWT_REGEX = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
// `sb_publishable_...` and `sb_secret_...` Supabase API key formats.
const SUPABASE_KEY_REGEX = /sb_[a-z]+_[A-Za-z0-9_-]{20,}/g;

function redactString(str) {
  if (typeof str !== 'string') return str;
  return str.replace(JWT_REGEX, '<redacted-jwt>').replace(SUPABASE_KEY_REGEX, '<redacted-key>');
}

function redactSecretsFromEvent(event) {
  try {
    const json = JSON.stringify(event);
    return JSON.parse(redactString(json));
  } catch {
    return event; // Some events contain circular refs; ship them rather than drop.
  }
}

function redactSecretsFromBreadcrumb(crumb) {
  if (crumb?.message) crumb.message = redactString(crumb.message);
  if (crumb?.data) {
    for (const k of Object.keys(crumb.data)) {
      crumb.data[k] = redactString(crumb.data[k]);
    }
  }
  return crumb;
}
