import { describe, expect, it } from 'vitest';
import {
  mapLegacyAiAnalystSectionRoute,
  mapLegacyMarketAgentRoute,
  mapLegacyMarketAnalysisRoute,
  mapLegacySymbolDetailsRoute,
  normalizeAiAnalystAssetType,
  normalizeAiAnalystHorizon,
  normalizeAiAnalystSymbol,
} from '@/lib/ai-analyst/legacyRoutes';

describe('AI Analyst legacy route compatibility', () => {
  it('maps the bare Market Analysis route to canonical Market Leadership', () => {
    expect(mapLegacyMarketAnalysisRoute({ search: '' })).toBe('/ai-analyst/market-leadership');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=overview' })).toBe('/ai-analyst/market-leadership');
  });

  it('maps an explicit legacy analysis target to the canonical asset route', () => {
    expect(mapLegacyMarketAnalysisRoute({
      search: '?tab=analysis&symbol=aapl&assetType=stocks&range=1M&autoRun=1',
    })).toBe('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1');
    expect(mapLegacyMarketAnalysisRoute({ search: '?symbol=BTC-USD&assetType=CRYPTO&horizon=SHORT_TERM' }))
      .toBe('/ai-analyst/analyze/BTC-USD?assetType=CRYPTO&horizon=SHORT_TERM');
    expect(mapLegacyMarketAnalysisRoute({ search: '?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1' }))
      .toBe('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1');
  });

  it('preserves safe opaque query context and a non-routing fragment through canonicalization', () => {
    expect(mapLegacyMarketAnalysisRoute({
      search: '?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest',
      hash: '#details',
    })).toBe('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest#details');

    expect(mapLegacyMarketAnalysisRoute({
      search: '?symbol=AAPL&assetType=STOCK&horizon=SWING&filters=keep&next=https%3A%2F%2Fevil.example&return=https%3A%2F%2Fevil.example',
    })).toBe('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&filters=keep');
  });

  it('routes completed legacy tools directly and reserves compatibility only for trader tools', () => {
    expect(mapLegacyMarketAnalysisRoute({ search: '?symbol=AAPL', hash: '#watchlist' }))
      .toBe('/ai-analyst/watchlist?symbol=AAPL');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=tools&next=https%3A%2F%2Fevil.example' }))
      .toBe('/ai-analyst/overview?legacy=market&tab=traderTools');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=alerts' }))
      .toBe('/ai-analyst/alerts');
  });

  it('maps completed legacy tab aliases to grouped canonical child routes', () => {
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=calendar&locale=ar' }))
      .toBe('/ai-analyst/calendar?locale=ar');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=sessions&market=GCC', hash: '#details' }))
      .toBe('/ai-analyst/markets/sessions?market=GCC#details');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=news&provider=finnhub' }))
      .toBe('/ai-analyst/news?provider=finnhub');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=compare&symbols=AAPL%2CMSFT' }))
      .toBe('/ai-analyst/compare?symbols=AAPL%2CMSFT');
    expect(mapLegacyMarketAnalysisRoute({ search: '?tab=technical-analysis' }))
      .toBe('/ai-analyst/analyze');
  });

  it('maps direct watchlist and alert aliases without losing safe query context or fragments', () => {
    expect(mapLegacyAiAnalystSectionRoute('watchlist', {
      search: '?sort=newest&return=%2Fai-analyst%2Fwatchlist%3Fsort%3Dnewest&next=https%3A%2F%2Fevil.example',
      hash: '#positions',
    })).toBe('/ai-analyst/watchlist?sort=newest&return=%2Fai-analyst%2Fwatchlist%3Fsort%3Dnewest#positions');

    expect(mapLegacyAiAnalystSectionRoute('alerts', {
      search: '?symbol=AAPL&assetType=STOCK&nested=%7B%22channel%22%3A%22email%22%7D',
      hash: '#access_token=secret',
    })).toBe('/ai-analyst/alerts?symbol=AAPL&assetType=STOCK&nested=%7B%22channel%22%3A%22email%22%7D');
  });

  it('preserves safe agent context and root symbol query parameters without relaying redirect controls', () => {
    expect(mapLegacyMarketAgentRoute({ search: '' })).toBe('/ai-analyst/agent');
    expect(mapLegacyMarketAgentRoute({ search: '?assetType=crypto&range=1W&autoRun=1' }))
      .toBe('/ai-analyst/agent?assetType=CRYPTO&horizon=SHORT_TERM&autoRun=1');
    expect(mapLegacyMarketAgentRoute({ search: '?symbol=EURUSD%3DX&assetType=FOREX&timeframe=1D&next=%2Fadmin' }))
      .toBe('/ai-analyst/agent?assetType=FOREX&horizon=INTRADAY&symbol=EURUSD%3DX');
    expect(mapLegacyMarketAgentRoute({ search: '?filters=top-movers', hash: '#watchlist' }))
      .toBe('/ai-analyst/agent?filters=top-movers#watchlist');
    expect(mapLegacySymbolDetailsRoute('msft', { search: '?filters=top-movers&return=%2Fwatchlist', hash: '#details' }))
      .toBe('/ai-analyst/analyze/MSFT?assetType=STOCK&horizon=SWING&filters=top-movers&return=%2Fwatchlist#details');
  });

  it('fails closed for malformed assets and keeps canonical enums bounded', () => {
    expect(normalizeAiAnalystSymbol('AAPL<script>')).toBeNull();
    expect(normalizeAiAnalystSymbol('../secrets')).toBeNull();
    expect(mapLegacySymbolDetailsRoute('../secrets')).toBe('/ai-analyst/overview');
    expect(normalizeAiAnalystAssetType('not-real')).toBe('STOCK');
    expect(normalizeAiAnalystHorizon('not-real')).toBe('SWING');
  });
});
