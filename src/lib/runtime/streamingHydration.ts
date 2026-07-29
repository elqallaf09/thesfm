/**
 * Streaming-safe scheduling for first-paint client state commits.
 *
 * A state update whose consumers live inside a still-dehydrated Suspense
 * segment forces React to abandon that segment's hydration and client-render
 * it instead (`retrySuspenseComponentWithoutHydrating` — `startTransition`
 * alone does not reliably prevent this under a slow/streaming response). The
 * server-rendered segment that arrives afterwards is then orphaned in the
 * DOM — this is how two `<main data-testid="ai-analyst-workspace">` trees
 * (one per locale direction) could exist simultaneously.
 *
 * All six first-paint provider syncs in this app (locale x2, auth, currency,
 * density, mobile-viewport) need this: the workspace route's Suspense
 * boundary bails on whichever one of them happens to commit first while it's
 * still dehydrated, so gating only a subset (tried: locale + auth only)
 * leaves the others as weak links and does not eliminate the race — it
 * still reproduced at the same rate as no guard at all.
 *
 * Gating all six independently (six separate DOMContentLoaded listeners and
 * polling loops, each firing its own startTransition once settled) is what
 * caused the Lighthouse TBT regression this file exists to avoid: six
 * separate correction commits landing in quick succession is more
 * re-render work than one. `whenStreamSettled` below is a single shared
 * subscription — one listener, one poll loop, one batch of callbacks fired
 * together — so all six corrections land in the same tick instead of six.
 *
 * A stream is considered settled once the HTML stream has closed and no
 * pending segment reveal markers (`<template id="B:*">`, emitted by React's
 * streaming runtime and removed by its batched reveal step) remain. The
 * stream-closed signal is `readyState !== 'loading'` (DOMContentLoaded), not
 * `load`, since a slow image or beacon can delay `load` indefinitely.
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

function isStreamSettled(): boolean {
  return isStreamClosed() && document.querySelector(PENDING_SEGMENT_MARKER_SELECTOR) === null;
}

type SharedSettleState = {
  settled: boolean;
  callbacks: Set<() => void>;
  timer: ReturnType<typeof setTimeout> | null;
  closedAt: number | null;
};

let shared: SharedSettleState | null = null;

function startSharedWatch(state: SharedSettleState) {
  const fire = () => {
    state.settled = true;
    const callbacks = [...state.callbacks];
    state.callbacks.clear();
    // A single tick running every pending callback lets React batch all of
    // them into one re-render pass instead of one per provider.
    for (const callback of callbacks) callback();
  };

  const tick = () => {
    if (state.closedAt === null && isStreamClosed()) state.closedAt = performance.now();
    const markersExpired = state.closedAt !== null && performance.now() - state.closedAt >= STALE_MARKER_GRACE_MS;
    if (isStreamSettled() || markersExpired) {
      fire();
      return;
    }
    state.timer = setTimeout(tick, SETTLE_POLL_INTERVAL_MS);
  };
  const onStreamClosed = () => {
    if (state.closedAt === null) state.closedAt = performance.now();
    tick();
  };

  if (isStreamClosed()) tick();
  else document.addEventListener('DOMContentLoaded', onStreamClosed, { once: true });
}

/**
 * Runs `commit` immediately when the stream has already settled, otherwise
 * queues it to run alongside every other pending `commitWhenStreamSettled`
 * caller in a single batch once it does. Returns a cancel function for
 * unmount cleanup.
 */
export function commitWhenStreamSettled(commit: () => void): CancelStreamSettledCommit {
  if (typeof document === 'undefined') return () => {};
  if (isStreamSettled()) {
    commit();
    return () => {};
  }

  if (shared === null || shared.settled) {
    shared = { settled: false, callbacks: new Set(), timer: null, closedAt: isStreamClosed() ? performance.now() : null };
    startSharedWatch(shared);
  }
  const state = shared;
  state.callbacks.add(commit);

  return () => {
    state.callbacks.delete(commit);
  };
}
