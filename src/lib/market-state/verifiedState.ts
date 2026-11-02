import { getMarketSystemState } from './aggregateMarketState';
import type { MarketSystemState } from './types';

// A cold aggregate refresh regularly takes 10-12 seconds in production. Keep
// polling the shared snapshot for that bounded window instead of starting a
// duplicate provider probe after five seconds while the lease holder is still
// working.
const SHARED_REFRESH_POLL_DELAYS_MS = [
  250,
  500,
  1_000,
  1_500,
  1_750,
  2_500,
  2_500,
  2_000,
] as const;

function isEmptyMarketState(state: MarketSystemState) {
  return state.capabilityMatrix.length === 0 && Object.keys(state.providers).length === 0;
}

function wait(delayMs: number) {
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, delayMs);
    timer.unref?.();
  });
}

/**
 * Resolve the brief cold-start gap without racing the instance that already
 * owns the shared refresh lease. Only force a second live aggregation when no
 * shared refresh is in progress or the bounded wait still has no snapshot.
 */
export async function getVerifiedMarketSystemState(): Promise<{
  state: MarketSystemState;
  activeProbe: boolean;
  waitedForRefresh: boolean;
}> {
  let state = await getMarketSystemState();
  let waitedForRefresh = false;

  if (isEmptyMarketState(state) && state.delivery?.reason === 'aggregate_refresh_in_progress') {
    waitedForRefresh = true;
    for (const delayMs of SHARED_REFRESH_POLL_DELAYS_MS) {
      await wait(delayMs);
      state = await getMarketSystemState();
      if (!isEmptyMarketState(state)) {
        return { state, activeProbe: false, waitedForRefresh };
      }
      if (state.delivery?.reason !== 'aggregate_refresh_in_progress') break;
    }
  }

  if (isEmptyMarketState(state)) {
    state = await getMarketSystemState({ forceFresh: true });
    return { state, activeProbe: true, waitedForRefresh };
  }

  return { state, activeProbe: false, waitedForRefresh };
}
