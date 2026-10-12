import 'server-only';
import { canonicalDataProvider, MARKET_DATA_PROVIDERS, MARKET_DATASETS, PRIORITY_MARKET_SCOPES, type MarketDataset } from './catalog';
import { entitlementFor, readMarketDataEntitlements } from './entitlements.server';
import { marketDataScope } from './scope';

export type DataRecordInput = {
  dataset: MarketDataset;
  provider?: string | null;
  exchange?: string | null;
  country?: string | null;
  market?: string | null;
  observedAt?: string | null;
  retrievedAt?: string | null;
  reportedDelay?: string | null;
  cached?: boolean;
  cacheAgeSeconds?: number | null;
};

/** Additive provenance. It records evidence; it does not silently change access. */
export function createMarketDataRecord(input: DataRecordInput) {
  const providerId = canonicalDataProvider(input.provider);
  const scope = marketDataScope(input.exchange, input.country);
  const { entry, state } = entitlementFor({ providerId, dataset: input.dataset, ...scope });
  return {
    version: 1,
    dataset: input.dataset,
    providerId,
    scope: { ...scope, market: input.market || null },
    entitlementId: entry?.id ?? null,
    planStatus: state,
    commercialDisplay: entry?.commercialDisplay ?? 'unverified',
    redistribution: entry?.redistribution ?? 'unverified',
    coverage: 'unverified',
    delay: {
      reported: input.reportedDelay || 'unknown',
      contractual: entry?.delayType ?? 'unknown',
      minutes: entry?.delayMinutes ?? null,
      observedAt: input.observedAt ?? null,
      retrievedAt: input.retrievedAt ?? null,
      cached: typeof input.cached === 'boolean' ? input.cached : null,
      cacheAgeSeconds: typeof input.cacheAgeSeconds === 'number' && Number.isFinite(input.cacheAgeSeconds) && input.cacheAgeSeconds >= 0 ? input.cacheAgeSeconds : null,
    },
  } as const;
}

export type MarketDataRecord = ReturnType<typeof createMarketDataRecord>;

export function marketDataRegistrySnapshot() {
  const entitlements = readMarketDataEntitlements();
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    datasets: MARKET_DATASETS,
    providers: MARKET_DATA_PROVIDERS,
    priorityMarkets: PRIORITY_MARKET_SCOPES.map(scope => ({ ...scope, symbolCompleteness: 'unverified', quoteAccess: 'unverified', commercialDisplay: 'unverified' })),
    entitlementConfiguration: entitlements.state,
    // Only the admin route receives plan names and internal evidence references.
    entitlements: entitlements.entries.map(entry => ({ ...entry, status: entitlementFor({ providerId: entry.providerId, dataset: entry.dataset, exchange: entry.scope.exchange, country: entry.scope.country }).state })),
    rules: {
      credentialsAreNotEntitlements: true,
      directoryCoverageIsNotQuoteCoverage: true,
      integrationLicenseIsNotDataLicense: true,
      sampleIsNotFullExchangeCoverage: true,
      reportedDelayIsNotContractualDelay: true,
    },
  };
}
