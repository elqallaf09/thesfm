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
 * A capability row only counts as a health measurement when it contains an actual runtime signal.
 * The catalog intentionally declares some supported capabilities as `degraded` before any live
 * endpoint has been checked. Counting those declaration-only rows as failed health checks produced
 * misleading values such as 10%, 11% and 17% in Operations Center.
 */
export function isMeasuredCapabilityCell(cell: ProviderCapabilityCell): boolean {
  if (cell.status === 'unknown' || cell.status === 'unsupported') return false;
  if (cell.status !== 'degraded') return true;
  return cell.lastSuccessAt !== null
    || cell.lastErrorAt !== null
    || cell.lastErrorReason !== null
    || cell.latencyMs !== null
    || cell.rateLimitedUntil !== null
    || cell.nextRetryAt !== null;
}

/**
 * A provider is globally connected only when every measured capability is connected. A single
 * successful endpoint must not conceal failures in the provider's other measured capabilities.
 * Declaration-only capability rows are excluded because they say what a provider can support,
 * not whether a request has actually succeeded or failed.
 */
export function summarizeProviderStatus(cells: ProviderCapabilityCell[]): ProviderConnectionStatus {
  if (cells.length === 0) return 'unknown';
  const measured = cells.filter(isMeasuredCapabilityCell);
  if (measured.length === 0) {
    if (cells.some(cell => cell.status === 'unknown' || cell.status === 'degraded')) return 'unknown';
    return 'unsupported';
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
 * network calls. `successRatePercent` is the share of measured checks that are connected; rows
 * that merely declare provider capabilities are not treated as failed requests.
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
    const measuredCells = providerCells.filter(isMeasuredCapabilityCell);
    const healthyCount = measuredCells.filter(cell => cell.status === 'connected').length;
    const latestOf = (values: Array<string | null>) => values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;

    profiles.push({
      provider,
      role: deriveProviderRole(provider, 'general'),
      status: summarizeProviderStatus(providerCells),
      configured: providerCells.some(cell => cell.configured),
      latencyMs: measuredCells.find(cell => cell.latencyMs !== null)?.latencyMs ?? null,
      successRatePercent: measuredCells.length > 0 ? Math.round((healthyCount / measuredCells.length) * 100) : null,
      lastSuccessAt: latestOf(measuredCells.map(cell => cell.lastSuccessAt)),
      lastErrorAt: latestOf(measuredCells.map(cell => cell.lastErrorAt)),
      rateLimitedUntil: latestOf(measuredCells.map(cell => cell.rateLimitedUntil)),
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
