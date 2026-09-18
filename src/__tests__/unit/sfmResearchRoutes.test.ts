import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ quote: vi.fn(), history: vi.fn() }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: mocks.quote }));
vi.mock('@/lib/sfm-market/history', () => ({ getSfmMarketHistory: mocks.history }));
import { GET as technical } from '@/app/api/sfm-market/v1/trader/technical/[symbol]/route';
import { fetchSfmTraderQuotesDetailed } from '@/lib/trader/sfmMarketQuotes';
import { GET as signal } from '@/app/api/sfm-market/v1/trader/signal/[symbol]/route';

const history = Array.from({ length: 260 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 8, 17) - (259 - index) * 86400000).toISOString().slice(0, 10),
  close: 100 + index * 0.1 + Math.sin(index), open: 100 + index * 0.1,
  high: 103 + index * 0.1, low: 97 + index * 0.1, volume: 10000 + index,
}));
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-18T21:00:00Z'));
  mocks.history.mockResolvedValue({ ok: true, candles: history, provider: 'twelve_data', attempts: [] });
});
afterEach(() => { vi.restoreAllMocks(); });
describe('research route integration', () => {
  it.each(['closed quote', 'failed quote'])('keeps technical indicators, agreement and risk on %s', async mode => {
    mocks.quote.mockResolvedValue(mode === 'failed quote' ? null : {
      symbol: 'AAPL', assetType: 'stock', price: 126, quality: { state: 'complete' },
      provenance: { upstreamProvider: 'twelve_data', providerSymbol: 'AAPL', delayType: 'eod', cached: false,
        observedAt: '2026-09-17T20:00:00Z', observation: { precision: 'instant', marketOpen: false }, attemptCount: 1 },
    });
    const context = { params: Promise.resolve({ symbol: 'AAPL' }) };
    const result = await (await technical(new NextRequest('http://localhost/api/sfm-market/v1/trader/technical/AAPL'), context)).json();
    expect(result.technicalAvailable).toBe(true); expect(result.samples).toBe(260);
    expect(result.currentPrice).toBeNull(); expect(result.indicators.rsi).not.toBeNull();
    expect(result.research.confidence).toBeGreaterThan(0); expect(result.research.risk.annualizedVolatilityPercent).toBeGreaterThan(0);
    const payload = await (await signal(new NextRequest('http://localhost/api/sfm-market/v1/trader/signal/AAPL'), context)).json();
    expect(payload.signal.signalAvailable).toBe(false); expect(payload.signal.targetPrice).toBeNull();
    expect(payload.signal.confidence).toBeNull(); expect(payload.signal.research.available).toBe(true);
    expect(payload.signal.research.strategyAgreement.strategyCount).toBeGreaterThan(2);
  });
  it('reports the historical provider as partial coverage when the quote is absent', async () => {
    mocks.quote.mockResolvedValue(null);
    const payload = await fetchSfmTraderQuotesDetailed(['AAPL']);
    expect(payload.provider).toBe('twelve_data'); expect(payload.cacheStatus).toBe('partial');
    expect(payload.quotes[0]).toMatchObject({ lastKnownPrice: expect.any(Number), upstreamSource: 'Twelve Data', priceReference: { observedAt: '2026-09-17', precision: 'date' } });
  });
  it('does not manufacture research when both quote and history fail', async () => {
    mocks.quote.mockResolvedValue(null); mocks.history.mockResolvedValue({ ok: false, candles: [], reason: 'NO_MARKET_DATA' });
    const result = await (await technical(new NextRequest('http://localhost/api/sfm-market/v1/trader/technical/UNKNOWN'), { params: Promise.resolve({ symbol: 'UNKNOWN' }) })).json();
    expect(result.technicalAvailable).toBe(false); expect(result.samples).toBe(0);
    expect(result.research.confidence).toBeNull(); expect(result.research.risk.level).toBeNull();
  });
});
