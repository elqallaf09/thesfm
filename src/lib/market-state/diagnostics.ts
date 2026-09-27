import type { ProviderConnectionStatus } from './types';

/**
 * Public, display-safe explanation for a provider state. This deliberately derives its copy
 * from the normalized status rather than forwarding upstream errors, which may be technical,
 * volatile, or unsafe to expose to a market-facing user.
 */
export type ProviderDiagnostic = {
  reasonKey: string;
  actionKey: string;
  retryable: boolean;
};

const PROVIDER_DIAGNOSTICS: Record<ProviderConnectionStatus, ProviderDiagnostic | null> = {
  connected: null,
  degraded: {
    reasonKey: 'market_provider_reason_degraded',
    actionKey: 'market_provider_action_degraded',
    retryable: true,
  },
  rate_limited: {
    reasonKey: 'market_provider_reason_rate_limited',
    actionKey: 'market_provider_action_rate_limited',
    retryable: false,
  },
  disconnected: {
    reasonKey: 'market_provider_reason_disconnected',
    actionKey: 'market_provider_action_disconnected',
    retryable: true,
  },
  misconfigured: {
    reasonKey: 'market_provider_reason_misconfigured',
    actionKey: 'market_provider_action_misconfigured',
    retryable: false,
  },
  disabled: {
    reasonKey: 'market_provider_reason_disabled',
    actionKey: 'market_provider_action_disabled',
    retryable: false,
  },
  unknown: {
    reasonKey: 'market_provider_reason_unknown',
    actionKey: 'market_provider_action_unknown',
    retryable: true,
  },
  unsupported: {
    reasonKey: 'market_provider_reason_unsupported',
    actionKey: 'market_provider_action_unsupported',
    retryable: false,
  },
};

export function getProviderDiagnostic(status: ProviderConnectionStatus): ProviderDiagnostic | null {
  return PROVIDER_DIAGNOSTICS[status];
}
