import { describe, expect, it } from 'vitest';
import {
  buildCapabilityMatrixView,
  buildProviderProfiles,
  DRAWER_CAPABILITY_ROWS,
  STATUS_RANK,
} from '@/lib/market-state/capabilityMatrixView';
import type { ProviderCapabilityCell } from '@/lib/market-state/types';

function cell(overrides: Partial<ProviderCapabilityCell> = {}): ProviderCapabilityCell {
  return {
    provider: 'fmp',
    capability: 'quotes',
    status: 'connected',
    configured: true,
    healthy: true,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorReason: null,
    rateLimitedUntil: null,
    nextRetryAt: null,
    latencyMs: null,
    ...overrides,
  };
}

describe('DRAWER_CAPABILITY_ROWS', () => {
  it('has exactly the 11 rows required by the Provider Details Drawer capability matrix', () => {
    expect(DRAWER_CAPABILITY_ROWS).toHaveLength(11);
    expect(DRAWER_CAPABILITY_ROWS).toEqual([
      'quotes', 'news', 'earnings', 'dividends', 'economic_calendar',
      'profiles', 'technical_data', 'gcc_markets', 'forex', 'crypto', 'shariah_financials',
    ]);
  });
});

describe('buildProviderProfiles', () => {
  it('collapses multiple cells for one provider to its best-ranked (STATUS_RANK-lowest) status', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'fmp', capability: 'quotes', status: 'connected' }),
      cell({ provider: 'fmp', capability: 'earnings', status: 'rate_limited' }),
    ]);
    const fmp = profiles.find(profile => profile.provider === 'fmp');
    expect(fmp?.status).toBe('connected');
    expect(STATUS_RANK.rate_limited).toBeGreaterThan(STATUS_RANK.connected);
  });

  it('computes successRatePercent as the share of connected cells, not just configured ones', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'twelvedata', capability: 'quotes', status: 'connected' }),
      cell({ provider: 'twelvedata', capability: 'forex', status: 'disconnected', healthy: false }),
    ]);
    const twelvedata = profiles.find(profile => profile.provider === 'twelvedata');
    expect(twelvedata?.successRatePercent).toBe(50);
  });

  it('reports null successRatePercent for a provider with zero cells rather than fabricating 0 or 100', () => {
    const profiles = buildProviderProfiles([]);
    expect(profiles).toEqual([]);
  });

  it('sorts profiles alphabetically by provider id', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'yahoo' }),
      cell({ provider: 'eodhd' }),
      cell({ provider: 'fmp' }),
    ]);
    expect(profiles.map(profile => profile.provider)).toEqual(['eodhd', 'fmp', 'yahoo']);
  });
});

describe('buildCapabilityMatrixView', () => {
  it('synthesizes "unsupported" for a provider×capability pair absent from the flat cell array — never blank, never healthy by default', () => {
    const view = buildCapabilityMatrixView(
      [cell({ provider: 'fmp', capability: 'quotes', status: 'connected' })],
      ['fmp'],
      ['quotes', 'news'],
    );
    expect(view[0][0].status).toBe('connected');
    expect(view[1][0].status).toBe('unsupported');
  });

  it('produces a grid shaped rows.length x providers.length', () => {
    const view = buildCapabilityMatrixView([], ['fmp', 'yahoo'], DRAWER_CAPABILITY_ROWS);
    expect(view).toHaveLength(DRAWER_CAPABILITY_ROWS.length);
    expect(view[0]).toHaveLength(2);
  });
});
