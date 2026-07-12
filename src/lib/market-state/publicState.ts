import type { MarketSystemState, ProviderCapabilityCell } from './types';

function publicCapabilityCell(cell: ProviderCapabilityCell): ProviderCapabilityCell {
  return { ...cell, lastErrorReason: null };
}

/** Removes diagnostic-only details while retaining the facts required by public state UI. */
export function sanitizeMarketSystemStateForPublic(state: MarketSystemState): MarketSystemState {
  return {
    ...state,
    capabilityMatrix: state.capabilityMatrix.map(publicCapabilityCell),
    configuration: null,
  };
}
