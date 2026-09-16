import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('SFM Market Data Engine trader Phase B', () => {
  it('serves Strongest Signals from SFM-generated evidence, not the legacy signal generator', () => {
    const route = source('src/app/api/market/signals/route.ts');
    expect(route).toContain("generateSfmTraderSignals");
    expect(route).toContain("source: 'sfm-market-data-engine'");
    expect(route).toContain("provider: 'THE SFM'");
    expect(route).not.toContain('generateSignalsForUniverse');
  });

  it('serves watchlist quote and signal fields from THE SFM', () => {
    const route = source('src/app/api/watchlist/route.ts');
    expect(route).toContain('generateSfmTraderSignals');
    expect(route).toContain("'X-SFM-Market-Source': 'THE SFM Market Data Engine'");
    expect(route).not.toContain('fetchTraderQuotesDetailed');
    expect(route).not.toContain("@/lib/trader/marketQuotes");
  });

  it('moves quick drawer quote, technical history and signal loading onto SFM endpoints', () => {
    const drawer = source('src/trader-app/public/assets/drawer-data.js');
    expect(drawer).toContain('/sfm-market/v1/quote/');
    expect(drawer).toContain('/sfm-market/v1/signal/');
    expect(drawer).not.toContain('quote: `/recommendations?');
    expect(drawer).not.toContain('technical: `/market/technical-analysis?');
    expect(drawer).not.toContain('history: `/market/history?');
  });

  it('keeps Yahoo explicitly excluded from trader signal evidence', () => {
    const bridge = source('src/lib/sfm-market/traderSignals.ts');
    expect(bridge).toContain('SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS');
    expect(bridge).toContain("provider: 'THE SFM'");
    expect(bridge).toContain("confidenceComputed: false");
    expect(bridge).toContain("action: 'insufficient_data'");
  });
});
