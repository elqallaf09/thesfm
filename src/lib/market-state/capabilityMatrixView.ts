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
 * A provider is globally connected only when every measured capability is connected. A single
 * successful endpoint must not conceal failures in the provider's other capabilities.
 */
export function summarizeProviderStatus(cells: ProviderCapabilityCell[]): ProviderConnectionStatus {
  if (cells.length === 0) return 'unknown';
  // Unmeasured cells ("unknown"/"unsupported") carry no reachability signal:
  // they must not demote a provider whose measured capabilities are healthy,
  // otherwise a fully-healthy system reads "degraded" (the exact
  // contradictory combination marketStateGlobalConsistency guards against).
  const measured = cells.filter(cell => cell.status !== 'unknown' && cell.status !== 'unsupported');
  if (measured.length === 0) {
    return cells.some(cell => cell.status === 'unknown') ? 'unknown' : 'unsupported';
  }
  const statuses = new Set(measured.map(cell => cell.status));
  if (statuses.size === 1) return measured[0].status;
  if (statuses.has('connected')) return 'degraded';
  if (statuses.has('rate_limited')) return 'rate_limited';
  if (statuses.has('degraded')) return 'degraded';
  if (statuses.has('disconnected')) return 'disconnected';
  if (statuses.has('misconfigured')) return 'misconfigured';
  if (statuses.has('disabled')) return 'disabled';
  if (statuses.has('unknown')) return 'unknown';
  return 'unsupported';
}

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
    const healthyCount = providerCells.filter(cell => cell.status === 'connected').length;
    const latestOf = (values: Array<string | null>) => values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;

    profiles.push({
      provider,
      role: deriveProviderRole(provider, 'general'),
      status: summarizeProviderStatus(providerCells),
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
