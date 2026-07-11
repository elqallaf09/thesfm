import { deriveProviderRole } from './providerResolver';
import type {
  CapabilityMatrix,
  MarketCapabilityKey,
  MarketProviderId,
  ProviderCapabilityCell,
  ProviderConnectionStatus,
  ProviderProfile,
} from './types';

/** Single ranking used whenever multiple cells must collapse to one "worst" status for a provider. */
export const STATUS_RANK: Record<ProviderConnectionStatus, number> = {
  connected: 0,
  degraded: 1,
  rate_limited: 2,
  disabled: 3,
  misconfigured: 4,
  disconnected: 5,
  unknown: 6,
  unsupported: 7,
};

/**
 * Per-provider summary derived purely from the already-fetched flat capabilityMatrix — no new
 * network calls. Feeds the drawer's ProviderCard list.
 */
export function buildProviderProfiles(cells: CapabilityMatrix): ProviderProfile[] {
  const byProvider = new Map<MarketProviderId, ProviderCapabilityCell[]>();
  for (const cell of cells) {
    const list = byProvider.get(cell.provider) ?? [];
    list.push(cell);
    byProvider.set(cell.provider, list);
  }

  const profiles: ProviderProfile[] = [];
  for (const [provider, providerCells] of byProvider) {
    const best = providerCells.reduce((a, b) => (STATUS_RANK[a.status] <= STATUS_RANK[b.status] ? a : b));
    const healthyCount = providerCells.filter(cell => cell.status === 'connected').length;
    const latestOf = (values: Array<string | null>) => values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;

    profiles.push({
      provider,
      role: deriveProviderRole(provider, 'general'),
      status: best.status,
      configured: providerCells.some(cell => cell.configured),
      latencyMs: providerCells.find(cell => cell.latencyMs !== null)?.latencyMs ?? null,
      successRatePercent: providerCells.length > 0 ? Math.round((healthyCount / providerCells.length) * 100) : null,
      lastSuccessAt: latestOf(providerCells.map(cell => cell.lastSuccessAt)),
      lastErrorAt: latestOf(providerCells.map(cell => cell.lastErrorAt)),
      rateLimitedUntil: latestOf(providerCells.map(cell => cell.rateLimitedUntil)),
    });
  }
  return profiles.sort((a, b) => a.provider.localeCompare(b.provider));
}

/** The exact 11 rows required by the Provider Details Drawer capability matrix. */
export const DRAWER_CAPABILITY_ROWS: MarketCapabilityKey[] = [
  'quotes',
  'news',
  'earnings',
  'dividends',
  'economic_calendar',
  'profiles',
  'technical_data',
  'gcc_markets',
  'forex',
  'crypto',
  'shariah_financials',
];

export type MatrixCell = {
  provider: MarketProviderId;
  capability: MarketCapabilityKey;
  status: ProviderConnectionStatus;
};

/**
 * Builds the drawer's capability × provider grid. A pair absent from the flat array is filled in
 * as 'unsupported' (the provider structurally never serves that capability) — never left blank
 * and never silently treated as healthy.
 */
export function buildCapabilityMatrixView(
  cells: CapabilityMatrix,
  providers: MarketProviderId[],
  rows: MarketCapabilityKey[] = DRAWER_CAPABILITY_ROWS,
): MatrixCell[][] {
  return rows.map(capability => providers.map(provider => {
    const cell = cells.find(item => item.capability === capability && item.provider === provider);
    return { provider, capability, status: cell?.status ?? 'unsupported' };
  }));
}
