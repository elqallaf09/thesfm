import { describe, expect, it } from 'vitest';
import { deriveProviderRole, priorityListFor, resolveProviderForCapability } from '@/lib/market-state/providerResolver';
import type { ProviderConnectionStatus } from '@/lib/market-state/types';

describe('priorityListFor', () => {
  it('declares Twelve Data first and Yahoo strictly last for general-context quotes (mirrors marketDataProviders.ts, test-enforced there)', () => {
    const list = priorityListFor('quotes', 'general');
    expect(list[0]).toBe('twelvedata');
    expect(list[list.length - 1]).toBe('yahoo');
  });

  it('declares FMP first for trader_terminal-context quotes (mirrors marketQuotes.ts DEFAULT_QUOTE_PROVIDER_PRIORITY)', () => {
    const list = priorityListFor('quotes', 'trader_terminal');
    expect(list[0]).toBe('fmp');
  });

  it('falls back to the general list when no context-specific list is declared', () => {
    const list = priorityListFor('earnings', 'trader_terminal');
    expect(list).toEqual(priorityListFor('earnings', 'general'));
  });
});

describe('resolveProviderForCapability', () => {
  function statusMap(map: Record<string, ProviderConnectionStatus>) {
    return (provider: string) => map[provider] ?? 'unknown';
  }

  it('selects the first eligible provider and records earlier failed attempts (primary fails, secondary succeeds)', () => {
    const resolution = resolveProviderForCapability('quotes', 'general', statusMap({
      twelvedata: 'disconnected',
      finnhub: 'connected',
    }));
    expect(resolution.selected).toBe('finnhub');
    expect(resolution.fallbackUsed).toBe(true);
    expect(resolution.attempted[0]).toMatchObject({ provider: 'twelvedata', outcome: 'failed' });
    expect(resolution.attempted[1]).toMatchObject({ provider: 'finnhub', outcome: 'success' });
  });

  it('accepts a degraded provider rather than skipping it entirely', () => {
    const resolution = resolveProviderForCapability('quotes', 'general', statusMap({ twelvedata: 'degraded' }));
    expect(resolution.selected).toBe('twelvedata');
  });

  it('reports no selection and a clear reason when every provider fails', () => {
    const resolution = resolveProviderForCapability('quotes', 'general', () => 'disconnected');
    expect(resolution.selected).toBeNull();
    expect(resolution.reason).toBe('ALL_PROVIDERS_UNAVAILABLE');
    expect(resolution.attempted.every(item => item.outcome === 'failed')).toBe(true);
  });

  it('does not mark fallbackUsed when the first-priority provider succeeds immediately', () => {
    const resolution = resolveProviderForCapability('quotes', 'general', statusMap({ twelvedata: 'connected' }));
    expect(resolution.fallbackUsed).toBe(false);
    expect(resolution.attempted).toHaveLength(1);
  });
});

describe('deriveProviderRole', () => {
  it('gives FMP the primary role under trader_terminal context (index 0 in nearly every trader_terminal capability list)', () => {
    expect(deriveProviderRole('fmp', 'trader_terminal')).toBe('primary');
  });

  it('gives Twelve Data the primary role under general context (index 0 for quotes/historical/profiles/logos/forex/crypto/gcc_markets)', () => {
    expect(deriveProviderRole('twelvedata', 'general')).toBe('primary');
  });

  it('gives Yahoo a fallback role under general context (it is strictly last everywhere it appears)', () => {
    expect(deriveProviderRole('yahoo', 'general')).toBe('fallback');
  });

  it('gives RSS the news_only role — its one declared capability is news, so calling it "secondary" would be misleading', () => {
    expect(deriveProviderRole('rss', 'general')).toBe('news_only');
  });

  it('gives NewsAPI the news_only role for the same reason as RSS', () => {
    expect(deriveProviderRole('newsapi', 'general')).toBe('news_only');
  });

  it('never returns a role other than the 6 declared ProviderRole values for any known provider', () => {
    const roles = ['primary', 'secondary', 'fallback', 'discovery_only', 'news_only', 'metadata_only'];
    const providers: Array<Parameters<typeof deriveProviderRole>[0]> = ['fmp', 'twelvedata', 'eodhd', 'finnhub', 'marketstack', 'yahoo', 'tradingeconomics', 'newsapi', 'rss'];
    for (const provider of providers) {
      expect(roles).toContain(deriveProviderRole(provider, 'general'));
      expect(roles).toContain(deriveProviderRole(provider, 'trader_terminal'));
    }
  });
});
