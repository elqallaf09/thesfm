'use client';

/**
 * Defers a first-paint client state correction until the page's SSR HTML
 * stream has settled: `document.readyState` has left "loading" AND no
 * pending Suspense-segment reveal markers (`<template id="B:*">`, emitted by
 * React's streaming runtime and removed by its own reveal step) remain.
 *
 * Why this matters: a state commit whose consumers live inside a route
 * segment that is still streaming (dehydrated) forces React to abandon
 * hydrating that segment and client-render it instead. The server-streamed
 * markup for that segment can then arrive and be left orphaned in the DOM
 * alongside the client-rendered replacement — two mounted trees differing
 * only in the corrected value. This is how `[data-testid="ai-analyst-workspace"]`
 * and `.notif-page` could each resolve to two elements (one per pre/post
 * locale-correction render): both consume `dir` from `LanguageProvider`,
 * whose stored-locale correction previously committed unconditionally in a
 * plain `useEffect`, as soon as the component mounted, regardless of
 * whether the route it landed in was still streaming.
 *
 * Scope: this guards only `LanguageProvider` (the workspace/authenticated
 * locale provider used by `AdaptiveLanguageProvider` for every non-public
 * route). It deliberately does not touch `PublicLanguageProvider`, `useAuth`,
 * `useCurrency`, `useDensity`, or `use-mobile` — an earlier attempt at
 * deferring all six first-paint provider syncs app-wide (see PR #51) landed
 * on every route including the public landing page, which measurably
 * regressed that page's Lighthouse score (`/` never mounts `LanguageProvider`
 * at all, since it's a public-shell route rendered by `PublicLanguageProvider`
 * instead) — so this file adds zero overhead there. In the common case
 * (the stream is already settled by the time the effect runs, which is true
 * for the overwhelming majority of page loads) this resolves synchronously
 * with no polling at all.
 */

const PENDING_SEGMENT_SELECTOR = 'template[id^="B:"]';
const POLL_INTERVAL_MS = 50;
const MAX_WAIT_AFTER_READY_MS = 1_000;

function isStreamSettled(): boolean {
  return document.readyState !== 'loading' && document.querySelector(PENDING_SEGMENT_SELECTOR) === null;
}

/**
 * Runs `commit` immediately if the stream has already settled (the common
 * case), otherwise polls at a coarse interval until it does (or until
 * `MAX_WAIT_AFTER_READY_MS` has elapsed since the stream closed, in case a
 * segment's reveal marker never clears — e.g. a server-side error on that
 * segment). Returns a cancel function for unmount cleanup.
 */
export function deferUntilStreamSettled(commit: () => void): () => void {
  if (typeof document === 'undefined') {
    commit();
    return () => {};
  }
  if (isStreamSettled()) {
    commit();
    return () => {};
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let readyAt: number | null = document.readyState !== 'loading' ? performance.now() : null;

  const attempt = () => {
    if (cancelled) return;
    if (readyAt === null && document.readyState !== 'loading') readyAt = performance.now();
    const expired = readyAt !== null && performance.now() - readyAt >= MAX_WAIT_AFTER_READY_MS;
    if (isStreamSettled() || expired) {
      commit();
      return;
    }
    timer = setTimeout(attempt, POLL_INTERVAL_MS);
  };

  if (document.readyState !== 'loading') attempt();
  else document.addEventListener('DOMContentLoaded', attempt, { once: true });

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener('DOMContentLoaded', attempt);
  };
}
