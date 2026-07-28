/**
 * Streaming-safe scheduling for first-paint client state commits.
 *
 * While the server HTML stream is still in flight, any state update whose
 * consumers live inside a pending Suspense segment forces React to abandon
 * that segment's hydration and client-render it (React marks the boundary
 * with `retrySuspenseComponentWithoutHydrating` — transitions included).
 * The server-rendered segment that arrives afterwards is then orphaned in
 * the DOM, which is exactly how two `<main data-testid="ai-analyst-workspace">`
 * trees (one per locale direction) could exist simultaneously.
 *
 * A stream is considered settled once the HTML stream has closed and no
 * pending segment reveal markers (`<template id="B:*">`, emitted by React's
 * streaming runtime and removed by its batched reveal step) remain. The
 * stream-closed signal is `readyState !== 'loading'` (DOMContentLoaded): the
 * streaming parser holds the document in `loading` until the response ends,
 * while slow images or beacons can delay the later `load` event indefinitely
 * and must not be allowed to freeze first-paint commits.
 *
 * Once the stream is closed no further segments can arrive, so a reveal
 * marker that outlives the batched reveal step (which runs within ~300ms of
 * the final inline completion script) belongs to a segment the server never
 * finished. Committing past it is safe — there is nothing left to orphan —
 * which is why the marker wait is bounded rather than indefinite.
 */

type CancelStreamSettledCommit = () => void;

const PENDING_SEGMENT_MARKER_SELECTOR = 'template[id^="B:"]';
const SETTLE_POLL_INTERVAL_MS = 50;
const STALE_MARKER_GRACE_MS = 1_000;

function isStreamClosed(): boolean {
  return document.readyState !== 'loading';
}

export function isStreamSettled(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    isStreamClosed()
    && document.querySelector(PENDING_SEGMENT_MARKER_SELECTOR) === null
  );
}

/**
 * Runs `commit` immediately when the stream has already settled, otherwise
 * defers it until it does. Returns a cancel function for unmount cleanup.
 */
export function commitWhenStreamSettled(commit: () => void): CancelStreamSettledCommit {
  if (typeof document === 'undefined') return () => {};
  if (isStreamSettled()) {
    commit();
    return () => {};
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closedAt: number | null = isStreamClosed() ? performance.now() : null;

  const tick = () => {
    if (cancelled) return;
    if (closedAt === null && isStreamClosed()) closedAt = performance.now();
    const markersExpired = closedAt !== null
      && performance.now() - closedAt >= STALE_MARKER_GRACE_MS;
    if (isStreamSettled() || markersExpired) {
      commit();
      return;
    }
    timer = setTimeout(tick, SETTLE_POLL_INTERVAL_MS);
  };
  const onStreamClosed = () => {
    if (closedAt === null) closedAt = performance.now();
    tick();
  };

  if (isStreamClosed()) tick();
  else document.addEventListener('DOMContentLoaded', onStreamClosed, { once: true });

  return () => {
    cancelled = true;
    if (timer !== null) clearTimeout(timer);
    document.removeEventListener('DOMContentLoaded', onStreamClosed);
  };
}
