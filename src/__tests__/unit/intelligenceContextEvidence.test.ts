import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisRequest, CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
import type { MarketNewsArticle } from '@/lib/providers/news/types';

const mocks = vi.hoisted(() => ({ news: vi.fn(), macro: vi.fn(), sharia: vi.fn(), myfxbook: vi.fn() }));
vi.mock('@/lib/providers/news', () => ({ getMarketNews: mocks.news }));
vi.mock('@/lib/providers/economic-calendar', () => ({ getEconomicCalendar: mocks.macro }));
vi.mock('@/lib/server/intelligenceShariaEvidence', () => ({ loadStoredIntelligenceSharia: mocks.sharia }));
vi.mock('@/lib/market/providers/myfxbook', () => ({ getMyfxbookSentiment: mocks.myfxbook, resolveMyfxbookSymbol: (symbol: string) => symbol === 'EURUSD' ? { ok: true, symbol } : { ok: false } }));
import { contextArticleMatches, contextIso, contextNumber, loadIntelligenceContextEvidence } from '@/providers/intelligence/contextEvidence';

const now = Date.parse('2026-09-16T09:00:00Z');
const asset: CanonicalAssetIdentity = { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null };
const request: AnalysisRequest = { userId: null, asset: { symbol: 'AAPL', assetType: 'STOCK' }, horizon: 'SWING', locale: 'en', requestedModules: ['SENTIMENT'], providerPreferences: null, source: 'INTERNAL', correlationId: 'context-regression-test', forceRefresh: false };
const success = (data: unknown[]) => ({ status: 'success', data, provider: 'finnhub', stale: false, cached: false, lastSuccessfulUpdate: new Date(now).toISOString(), messageCode: null });
function article(overrides: Partial<MarketNewsArticle> = {}): MarketNewsArticle {
  return { id: 'fixture-one', headline: 'Apple Inc. releases results', summary: null, source: 'Fixture Publisher', sourceUrl: 'https://example.com/story', imageUrl: null, publishedAt: '2026-09-16T08:00:00Z', category: null, relatedSymbols: ['AAPL'], sentiment: null, sentimentSource: null, provider: 'finnhub', ...overrides };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks();
  for (const key of ['MARKET_SENTIMENT_PROVIDER', 'MARKET_SENTIMENT_API_KEY', 'FINNHUB_API_KEY', 'ALPHA_VANTAGE_API_KEY', 'MYFXBOOK_EMAIL', 'MYFXBOOK_PASSWORD']) vi.stubEnv(key, '');
  mocks.news.mockResolvedValue(success([])); mocks.macro.mockResolvedValue(success([])); mocks.sharia.mockResolvedValue(null);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('context evidence boundaries', () => {
  it.each([[null], [undefined], [''], [' '], [false], [[]], [{}]])('does not turn missing or malformed input into zero: %s', value => { expect(contextNumber(value)).toBeNull(); });
  it('retains genuine zero and normalizes dates without inventing observation times', () => {
    expect(contextNumber(0)).toBe(0); expect(contextNumber('0')).toBe(0);
    expect(contextIso('20260916T080000')).toBe('2026-09-16T08:00:00.000Z');
    expect(contextIso('2026-09-16 08:00:00')).toBe('2026-09-16T08:00:00.000Z');
    expect(contextIso(null)).toBeNull(); expect(contextIso('2026-02-30')).toBeNull();
  });
  it('does not query unrequested modules', async () => {
    await loadIntelligenceContextEvidence(request, asset);
    expect(mocks.news).not.toHaveBeenCalled(); expect(mocks.macro).not.toHaveBeenCalled(); expect(mocks.sharia).not.toHaveBeenCalled();
  });
  it('does not strip a Kuwait ticker and send it to a US sentiment endpoint', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'fixture-key'); vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'fixture-key');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const data = await loadIntelligenceContextEvidence(request, { ...asset, providerSymbol: 'BOUBYAN.KW', canonicalSymbol: 'BOUBYAN.KW', displaySymbol: 'BOUBYAN', country: 'KW' });
    expect(fetch).not.toHaveBeenCalled(); expect(data.sentiment).toBeNull();
  });
  it('keeps source chronology and discards missing/future/out-of-window observations', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'fixture-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ reddit: [
      { atTime: '2026-09-16T08:00:00Z', positiveMention: 12, negativeMention: 4 },
      { atTime: '2026-09-15T08:00:00Z', positiveMention: 3, negativeMention: 1 },
      { atTime: '2026-09-17T08:00:00Z', positiveMention: 1000, negativeMention: 0 },
      { atTime: '2026-09-01T08:00:00Z', positiveMention: 1000, negativeMention: 0 },
      { atTime: null, positiveMention: 1000, negativeMention: 0 },
    ] }))));
    const data = await loadIntelligenceContextEvidence(request, asset);
    expect(data.sentiment?.observedAt).toBe('2026-09-16T08:00:00.000Z'); expect(data.sentiment?.sampleSize).toBe(20); expect(data.sentiment?.positivePercent).toBe(75);
  });
  it('does not turn a tiny Alpha Vantage score into 100% bullishness', async () => {
    vi.stubEnv('MARKET_SENTIMENT_PROVIDER', 'alphavantage'); vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'fixture-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ feed: [{ url: 'https://example.com/a', time_published: '20260916T080000', ticker_sentiment: [{ ticker: 'AAPL', ticker_sentiment_score: '0.01' }] }] }))));
    const data = await loadIntelligenceContextEvidence(request, asset);
    expect(data.sentiment?.positivePercent).toBeCloseTo(50.5); expect(data.sentiment?.negativePercent).toBeCloseTo(49.5); expect(data.sentiment?.sampleSize).toBe(1);
  });
  it('keeps an observed neutral Alpha Vantage reading rather than reporting no data', async () => {
    vi.stubEnv('MARKET_SENTIMENT_PROVIDER', 'alphavantage'); vi.stubEnv('ALPHA_VANTAGE_API_KEY', 'fixture-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ feed: [{ url: 'https://example.com/zero', time_published: '20260916T080000', ticker_sentiment: [{ ticker: 'AAPL', ticker_sentiment_score: '0' }] }] }))));
    const data = await loadIntelligenceContextEvidence(request, asset); expect(data.sentiment?.positivePercent).toBe(50);
  });
  it('isolates a rejected provider request without fabricating a replacement', async () => {
    vi.stubEnv('FINNHUB_API_KEY', 'fixture-key'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    const data = await loadIntelligenceContextEvidence(request, asset); expect(data.sentiment).toBeNull(); expect(data.sharia?.status).toBe('unclassified');
  });
  it('does not match a root symbol from another exchange', () => {
    expect(contextArticleMatches(article({ headline: 'Other issuer story', relatedSymbols: ['AAPL.L'] }), asset)).toBe(false);
    expect(contextArticleMatches(article({ headline: 'Company update', relatedSymbols: ['AAPL'] }), asset)).toBe(true);
  });
  it('filters both asset news and fallback news, preserving a source URL', async () => {
    mocks.news.mockResolvedValueOnce(success([article({ headline: 'Microsoft earnings', relatedSymbols: ['MSFT'] })])).mockResolvedValueOnce(success([article()]));
    const data = await loadIntelligenceContextEvidence({ ...request, requestedModules: ['NEWS'] }, asset);
    expect(mocks.news).toHaveBeenCalledTimes(2); expect(data.news.articles).toHaveLength(1); expect(data.news.articles[0].sourceUrl).toBe('https://example.com/story');
  });
  it('rejects future news and unsafe source URLs', async () => {
    mocks.news.mockResolvedValue(success([article({ sourceUrl: 'javascript:alert(1)' }), article({ publishedAt: '2026-09-17T00:00:00Z' })]));
    const data = await loadIntelligenceContextEvidence({ ...request, requestedModules: ['NEWS'] }, asset); expect(data.news.articles).toHaveLength(0);
  });
  it('does not select a different country merely because its currency matches', async () => {
    const event = { id: 'fixture', title: 'Economic release', country: 'US', currency: 'KWD', dateTimeUtc: '2026-09-16T08:00:00Z', impact: 'high', actual: 1, forecast: 2, previous: 3, provider: 'finnhub' };
    mocks.macro.mockResolvedValue(success([event, { ...event, id: 'kw', country: 'KW' }]));
    const data = await loadIntelligenceContextEvidence({ ...request, requestedModules: ['MACRO'] }, { ...asset, providerSymbol: 'BOUBYAN.KW', country: 'KW', quoteCurrency: 'KWD' });
    expect(data.macro.events).toHaveLength(1); expect(data.macro.events[0].country).toBe('KW');
  });
  it('bounds enrichment latency without losing an independently successful Sharia read', async () => {
    mocks.news.mockImplementation(() => new Promise(() => {}));
    mocks.sharia.mockResolvedValue({ status: 'needs_review', source: 'Verified fixture', reviewedAt: new Date(now).toISOString(), reason: 'Fixture only' });
    const pending = loadIntelligenceContextEvidence({ ...request, requestedModules: ['NEWS', 'SHARIA'] }, asset);
    await vi.advanceTimersByTimeAsync(9001);
    const data = await pending; expect(data.news.failureCode).toBe('NEWS_PROVIDER_FAILED_OR_TIMEOUT'); expect(data.sharia?.status).toBe('needs_review');
  });
});
