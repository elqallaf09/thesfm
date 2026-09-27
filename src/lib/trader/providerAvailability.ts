import { traderProviderDisplayName } from './marketMetadata';

export type QuoteProviderCapabilityLike = {
  supportsQuotes?: boolean;
  healthy?: boolean;
  status?: string;
};

function measuredQuoteSuccess(capability: QuoteProviderCapabilityLike) {
  return capability.supportsQuotes === true
    && capability.healthy === true
    && (capability.status === 'healthy' || capability.status === 'connected');
}

/**
 * Human-readable providers that have evidence they can currently serve quotes.
 * Configuration is deliberately excluded: a credential permits an attempt but
 * cannot make the provider appear available before a measured success.
 */
export function observedQuoteProviderNames(
  capabilityMatrix: Record<string, QuoteProviderCapabilityLike> | undefined,
  successfulProviderIds: Iterable<string | null | undefined> = [],
) {
  const providers = new Set<string>();

  for (const [provider, capability] of Object.entries(capabilityMatrix ?? {})) {
    if (measuredQuoteSuccess(capability)) providers.add(provider);
  }

  // A provider that returned a valid quote during this request is direct
  // evidence even when the catalog's static capability snapshot is unprobed.
  for (const rawProvider of successfulProviderIds) {
    const provider = String(rawProvider ?? '').trim();
    if (!provider || capabilityMatrix?.[provider]?.supportsQuotes === false) continue;
    providers.add(provider);
  }

  return Array.from(providers)
    .map(traderProviderDisplayName)
    .filter((provider): provider is string => Boolean(provider));
}
