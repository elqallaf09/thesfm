import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { observedQuoteProviderNames } from '@/lib/trader/providerAvailability';

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('observedQuoteProviderNames', () => {
  it('includes only catalog providers with measured quote support and a healthy connection', () => {
    const capabilityMatrix = {
      fmp: { configured: true, supportsQuotes: true, healthy: false, status: 'unknown' },
      yahoo: { configured: true, supportsQuotes: true, healthy: false, status: 'degraded' },
      finnhub: { configured: false, supportsQuotes: true, healthy: true, status: 'healthy' },
      twelvedata: { configured: true, supportsQuotes: true, healthy: true, status: 'connected' },
      // A status declaration without quote support must not become evidence.
      marketstack: { configured: true, healthy: true, status: 'healthy' },
      // "available" is not a measured connection result for this helper.
      eodhd: { configured: true, supportsQuotes: true, healthy: true, status: 'available' },
    };

    expect(observedQuoteProviderNames(capabilityMatrix)).toEqual([
      'Finnhub',
      'Twelve Data',
    ]);
  });

  it('accepts providers that successfully served a current quote even when their catalog state is unmeasured', () => {
    const capabilityMatrix = {
      yahoo: { configured: true, supportsQuotes: true, healthy: false, status: 'unknown' },
      fmp: { configured: true, supportsQuotes: true, healthy: false, status: 'degraded' },
    };

    expect(observedQuoteProviderNames(capabilityMatrix, [
      'yahoo',
      'finnhub',
      null,
      undefined,
      '',
    ])).toEqual([
      'Yahoo Finance',
      'Finnhub',
    ]);
  });

  it('never reports a provider known not to support quotes, even after a supplied current-load id', () => {
    const capabilityMatrix = {
      rss: { configured: true, supportsQuotes: false, healthy: true, status: 'healthy' },
      newsapi: { configured: true, supportsQuotes: false, healthy: false, status: 'unknown' },
      yahoo: { configured: true, supportsQuotes: true, healthy: false, status: 'unknown' },
    };

    expect(observedQuoteProviderNames(capabilityMatrix, ['rss', 'newsapi', 'yahoo'])).toEqual([
      'Yahoo Finance',
    ]);
  });

  it('keeps public market and recommendation responses wired to observed availability', () => {
    const importPattern = /import\s*\{\s*observedQuoteProviderNames\s*\}\s*from\s*['"]@\/lib\/trader\/providerAvailability['"]/;

    for (const route of [
      'src/app/api/markets/route.ts',
      'src/app/api/recommendations/route.ts',
    ]) {
      const routeSource = source(route);
      expect(routeSource).toMatch(importPattern);
      expect(routeSource).toMatch(/\bobservedQuoteProviderNames\s*\(/);
    }
  });
});
