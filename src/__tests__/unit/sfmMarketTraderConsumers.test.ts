import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

const tsconfig = source('tsconfig.json');
const facade = source('src/lib/trader/marketQuotesFacade.ts');
const adapter = source('src/lib/trader/sfmMarketQuotes.ts');
const history = source('src/lib/sfm-market/history.ts');
const engine = source('src/lib/sfm-market/engine.ts');
const recommendations = source('src/app/api/recommendations/route.ts');
const watchlist = source('src/app/api/watchlist/route.ts');

describe('SFM Market Data Engine product consumers', () => {
  it('routes product imports through the SFM facade while preserving the legacy provider module as an implementation detail', () => {
    expect(tsconfig).toContain('"@/lib/trader/marketQuotes": ["./src/lib/trader/marketQuotesFacade.ts"]');
    expect(facade).toContain("from './sfmMarketQuotes'");
    expect(facade).toContain('return fetchSfmTraderQuotesDetailed(symbols, options)');
    expect(recommendations).toContain("from '@/lib/trader/marketQuotes'");
    expect(watchlist).toContain("from '@/lib/trader/marketQuotes'");
  });

  it('uses SFM quote and history boundaries instead of Yahoo enrichment for migrated consumers', () => {
    expect(adapter).toContain('getSfmMarketQuote');
    expect(adapter).toContain('getSfmMarketHistory');
    expect(adapter).not.toContain('fetchYahoo');
    expect(history).toContain('SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS');
    expect(engine).toContain("SFM_MARKET_BLOCKED_TRANSITIONAL_PROVIDERS = ['yahoo']");
  });

  it('keeps analysis owned by SFM while retaining upstream provenance', () => {
    expect(adapter).toContain('analyticalSource: SFM_MARKET_ENGINE_NAME');
    expect(adapter).toContain('upstreamSource: upstreamName');
    expect(adapter).toContain('sfmProvenance: quote.provenance');
    expect(adapter).toContain('source: SFM_MARKET_ENGINE_NAME');
  });

  it('does not expose confidence, targets or risk when the evidence checklist is insufficient', () => {
    expect(adapter).toContain('const sufficient = recommendation.dataSufficiency.sufficient');
    expect(adapter).toContain('confidence: sufficient ? recommendation.confidence : null');
    expect(adapter).toContain('aiConfidence: sufficient ? recommendation.confidence : null');
    expect(adapter).toContain('targetPrice: sufficient ? recommendation.targetPrice : null');
    expect(adapter).toContain('stopLoss: sufficient ? recommendation.stopLoss : null');
    expect(adapter).toContain("finalRecommendation: sufficient ? recommendation.finalRecommendation : 'Insufficient data'");
  });
});
