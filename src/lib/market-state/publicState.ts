import type { MarketSystemState, ProviderCapabilityCell } from './types';

function publicCapabilityCell(cell: ProviderCapabilityCell): ProviderCapabilityCell {
  return { ...cell, lastErrorReason: null };
}

/** Removes diagnostic-only details while retaining the facts required by public state UI. */
export function sanitizeMarketSystemStateForPublic(state: MarketSystemState): MarketSystemState {
  // Status callers can receive a minimal, still-initializing snapshot. Keep
  // that response usable instead of converting an otherwise valid health
  // answer into a 503 merely because diagnostic fields have not arrived yet.
  const hasCapabilityMatrix = Array.isArray(state.capabilityMatrix);
  const hasConfiguration = Object.prototype.hasOwnProperty.call(state, 'configuration');

  return {
    ...state,
    ...(hasCapabilityMatrix ? { capabilityMatrix: state.capabilityMatrix.map(publicCapabilityCell) } : {}),
    ...(hasConfiguration ? { configuration: null } : {}),
    // Delivery reasons originate in server aggregation and are useful to administrators, but are
    // not required for a public status explanation. Keep the delivery facts while avoiding a
    // future path accidentally exposing internal failure wording.
    delivery: state.delivery ? { ...state.delivery, reason: null } : undefined,
  };
}
