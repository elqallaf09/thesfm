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
    // Delivery reasons originate in server aggregation and are useful to administrators, but are
    // not required for a public status explanation. Keep the delivery facts while avoiding a
    // future path accidentally exposing internal failure wording.
    delivery: state.delivery ? { ...state.delivery, reason: null } : undefined,
  };
}
