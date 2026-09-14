import { describe, expect, it } from 'vitest';
import {
  buildCapabilityMatrixView,
  buildProviderProfiles,
  DRAWER_CAPABILITY_ROWS,
  isMeasuredCapabilityCell,
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
  it('marks a provider degraded when one measured capability succeeds and another measured capability is rate limited', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'fmp', capability: 'quotes', status: 'connected' }),
      cell({ provider: 'fmp', capability: 'earnings', status: 'rate_limited' }),
    ]);
    const fmp = profiles.find(profile => profile.provider === 'fmp');
    expect(fmp?.status).toBe('degraded');
    expect(STATUS_RANK.rate_limited).toBeGreaterThan(STATUS_RANK.connected);
  });

  it('computes successRatePercent from measured cells', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'twelvedata', capability: 'quotes', status: 'connected' }),
      cell({ provider: 'twelvedata', capability: 'forex', status: 'disconnected', healthy: false }),
    ]);
    const twelvedata = profiles.find(profile => profile.provider === 'twelvedata');
    expect(twelvedata?.successRatePercent).toBe(50);
  });

  it('does not count declaration-only degraded capability rows as failed health checks', () => {
    const declarationOnly = cell({
      provider: 'twelvedata',
      capability: 'forex',
      status: 'degraded',
      healthy: false,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorReason: null,
      latencyMs: null,
    });
    expect(isMeasuredCapabilityCell(declarationOnly)).toBe(false);

    const profiles = buildProviderProfiles([
      cell({ provider: 'twelvedata', capability: 'quotes', status: 'connected', latencyMs: 80 }),
      declarationOnly,
    ]);
    const twelvedata = profiles.find(profile => profile.provider === 'twelvedata');
    expect(twelvedata?.successRatePercent).toBe(100);
    expect(twelvedata?.status).toBe('connected');
  });

  it('reports null successRatePercent when a provider has no measured cells', () => {
    const profiles = buildProviderProfiles([
      cell({ provider: 'yahoo', status: 'unknown', healthy: false }),
    ]);
    expect(profiles[0]?.successRatePercent).toBeNull();
    expect(profiles[0]?.status).toBe('unknown');
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
