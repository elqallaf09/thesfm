import { describe, expect, it } from 'vitest';
import {
  mapLegacyMarketAgentRoute,
  mapLegacyMarketAnalysisRoute,
  mapLegacySymbolDetailsRoute,
  normalizeAiAnalystAssetType,
  normalizeAiAnalystHorizon,
  normalizeAiAnalystSymbol,
} from '@/lib/ai-analyst/legacyRoutes';

describe('AI Analyst legacy route compatibility', () => {
  it('maps the bare Market Analysis route to the single unified overview', () => {
    expect(mapLegacyMarketAnalysisRoute({ search: '' })).toBe('/ai-analyst/overview');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=overview' })).toBe('/ai-analyst/overview');
  });

  it('maps an explicit legacy analysis target to the canonical asset route', () => {
    expect(mapLegacyMarketAnalysisRoute({
      search: '?tab=analysis&symbol=aapl&assetType=stocks&range=1M&autoRun=1',
    })).toBe('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1');
    expect(mapLegacyMarketAnalysisRoute({ search: '?symbol=BTC-USD&assetType=CRYPTO&horizon=SHORT_TERM' }))
      .toBe('/ai-analyst/analyze/BTC-USD?assetType=CRYPTO&horizon=SHORT_TERM');
  });

  it('retains working legacy tools and hash destinations through the explicit compatibility view', () => {
    expect(mapLegacyMarketAnalysisRoute({ search: '?symbol=AAPL', hash: '#watchlist' }))
      .toBe('/ai-analyst/overview?legacy=market&tab=watchlist&symbol=AAPL&assetType=STOCK&horizon=SWING');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=tools&next=https%3A%2F%2Fevil.example' }))
      .toBe('/ai-analyst/overview?legacy=market&tab=traderTools');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=alerts' }))
      .toBe('/ai-analyst/overview?legacy=market&tab=alerts');
  });

  it('maps the legacy agent and root symbol alias without retaining arbitrary query values', () => {
    expect(mapLegacyMarketAgentRoute({ search: '' })).toBe('/ai-analyst/agent');
    expect(mapLegacyMarketAgentRoute({ search: '?symbol=EURUSD%3DX&assetType=FOREX&timeframe=1D&next=%2Fadmin' }))
      .toBe('/ai-analyst/agent?assetType=FOREX&horizon=INTRADAY&symbol=EURUSD%3DX');
    expect(mapLegacySymbolDetailsRoute('msft')).toBe('/ai-analyst/analyze/MSFT?assetType=STOCK&horizon=SWING');
  });

  it('fails closed for malformed assets and keeps canonical enums bounded', () => {
    expect(normalizeAiAnalystSymbol('AAPL<script>')).toBeNull();
    expect(normalizeAiAnalystSymbol('../secrets')).toBeNull();
    expect(mapLegacySymbolDetailsRoute('../secrets')).toBe('/ai-analyst/overview');
    expect(normalizeAiAnalystAssetType('not-real')).toBe('STOCK');
    expect(normalizeAiAnalystHorizon('not-real')).toBe('SWING');
  });
});
