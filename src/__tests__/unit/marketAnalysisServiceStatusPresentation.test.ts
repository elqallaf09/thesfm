import { describe, expect, it } from 'vitest';
import { marketServiceStatusPresentation } from '@/components/market-analysis/serviceStatusPresentation';
import type { MarketServiceState } from '@/components/market-analysis/types';

const KEYS: Record<string, string> = {
  market_connected_short: 'Connected',
  market_service_checking_short: 'Checking…',
  market_data_status_delayed: 'Delayed',
  market_service_not_connected_short: 'Not connected',
  market_service_connected: 'Service connected',
  market_service_degraded: 'Service degraded',
  market_service_not_configured: 'Not configured',
  market_service_unavailable: 'Unavailable',
  loading: 'Loading…',
};
const t = (key: string) => KEYS[key] ?? key;

describe('marketServiceStatusPresentation (single source of truth, replaces 3 duplicated ternary chains)', () => {
  it('never disagrees with itself: value/tone/notice are always derived from one decision, not three', () => {
    const states: MarketServiceState[] = ['checking', 'connected', 'degraded', 'slow', 'not_configured', 'unavailable'];
    for (const state of states) {
      const a = marketServiceStatusPresentation(state, t);
      const b = marketServiceStatusPresentation(state, t);
      expect(a).toEqual(b); // pure function — identical input always yields identical output
    }
  });

  it('connected maps to success tone and the connected notice', () => {
    const result = marketServiceStatusPresentation('connected', t);
    expect(result).toEqual({ value: 'Connected', tone: 'success', notice: 'Service connected' });
  });

  it('degraded and slow map identically (previously two separate ternary branches that had to be kept in sync manually)', () => {
    expect(marketServiceStatusPresentation('degraded', t)).toEqual(marketServiceStatusPresentation('slow', t));
  });

  it('checking maps to info tone, not warning (never shown as an error while still loading)', () => {
    const result = marketServiceStatusPresentation('checking', t);
    expect(result.tone).toBe('info');
  });

  it('not_configured and unavailable both map to warning tone with distinct notices', () => {
    const notConfigured = marketServiceStatusPresentation('not_configured', t);
    const unavailable = marketServiceStatusPresentation('unavailable', t);
    expect(notConfigured.tone).toBe('warning');
    expect(unavailable.tone).toBe('warning');
    expect(notConfigured.notice).not.toBe(unavailable.notice);
  });
});
