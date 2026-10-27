import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/server/markets-tv/instruments', () => ({ tvInstrumentAssets: vi.fn().mockResolvedValue([]), cryptoTvQuotes: vi.fn().mockResolvedValue([]), forexTvQuote: vi.fn() }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn() }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: vi.fn() }));
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import * as catalog from '@/lib/server/markets-tv/catalog';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import { tvQuoteIdentityMatches } from '@/lib/server/markets-tv/quoteLoader';
import { tvSceneAssets } from '@/lib/server/markets-tv/sceneCatalog';
import { providerStockQuote } from '@/lib/world-stocks/providerQuote';
import { cryptoTvQuotes, forexTvQuote } from '@/lib/server/markets-tv/instruments';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); vi.restoreAllMocks(); });
describe('TV canonical market snapshots', () => {
  it('passes the actual asset class for indices, commodities and currency groups', async () => {
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    for (const [group, assetType] of [['global', 'index'], ['commodities', 'commodity']] as const) {
      vi.mocked(getSfmMarketQuote).mockClear();
      await loadTvSnapshot(group);
      expect(vi.mocked(getSfmMarketQuote).mock.calls.every(call => call[1]?.assetType === assetType)).toBe(true);
    }
  });
  it('preserves owned-symbol order and reference evidence while isolating source failures', async () => {
    vi.useFakeTimers(); vi.setSystemTime('2026-09-19T09:00:00Z');
    vi.mocked(getSfmMarketQuote).mockImplementation(async symbol => {
      if (symbol === 'MISSING') throw new Error('upstream unavailable');
      return { symbol, price: 100, currency: 'USD', quality: { state: 'complete' },
        provenance: { upstreamProvider: 'twelve_data', providerSymbol: symbol, observedAt: '2026-09-18T19:59:00Z', receivedAt: '2026-09-19T08:00:00Z',
          observation: { precision: 'instant', marketOpen: false } } } as SfmMarketQuote;
    });
    const snapshot = await loadTvSnapshot('watchlist', ['AAPL', 'MISSING', 'AAPL']);
    expect(snapshot.total).toBe(2); expect(snapshot.available).toBe(1);
    expect(snapshot.quotes.map(q => q.symbol)).toEqual(['AAPL', 'MISSING']);
    expect(snapshot.quotes[0]).toMatchObject({ price: 100, status: 'closed', source: 'twelve_data', observedAt: '2026-09-18T19:59:00Z', receivedAt: '2026-09-19T08:00:00Z' });
    expect(snapshot.quotes[1]).toMatchObject({ price: null, observedAt: null, status: 'unavailable' });
  });
  it('bounds failed-source waits and stops starting requests at the shared deadline', async () => {
    vi.useFakeTimers();
    vi.mocked(getSfmMarketQuote).mockImplementation(() => new Promise(() => {}));
    const work = loadTvSnapshot('watchlist', Array.from({ length: 60 }, (_, i) => `TEST${i}`), { pageSize: 50 });
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(9_000);
    const snapshot = await work;
    expect(snapshot.total).toBe(12); expect(snapshot.available).toBe(0); expect(snapshot.directoryTotal).toBe(50);
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(8);
    expect(snapshot.quotes.every(q => q.price === null && q.issue === 'timeout')).toBe(true);
  });
  it('paginates the entire directory and fetches only the current screen', async () => {
    vi.spyOn(catalog, 'tvDirectoryAssets').mockResolvedValue(Array.from({ length: 1035 }, (_, i) => ({ symbol: `QA${i}`, name: 'Synthetic QA listing' })));
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    const page = await loadTvSnapshot('us', [], { page: 172, pageSize: 6, market: 'US' });
    expect(page.directoryTotal).toBe(1035); expect(page.quotes.map(q => q.symbol)).toEqual(['QA1032','QA1033','QA1034']);
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(3);
    expect(catalog.tvDirectoryAssets).toHaveBeenCalledWith('us', 'US');
  });

  it('resolves chosen stocks anywhere in the market without requesting other listings', async () => {
    vi.spyOn(catalog, 'tvDirectoryAssets').mockResolvedValue(Array.from({ length: 2000 }, (_, i) => ({ symbol: `QA${i}`, name: 'Synthetic QA listing' })));
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    const result = await loadTvSnapshot('us', [], { market: 'US', pageSize: 12, symbols: ['QA1999','QA8','FOREIGN'] });
    expect(result.quotes.map(q => q.symbol)).toEqual(['QA1999','QA8']);
    expect(result.directoryTotal).toBe(2000); expect(result.selectionTotal).toBe(2); expect(result.total).toBe(2);
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getSfmMarketQuote).mock.calls.map(c => c[0])).toEqual(['QA1999','QA8']);
  });
  it('loads one curated scene without opening the worldwide directory or duplicating instruments', async () => {
    const directory = vi.spyOn(catalog, 'tvDirectoryAssets');
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    vi.mocked(cryptoTvQuotes).mockResolvedValue([]);
    const first = loadTvSnapshot('global', [], { scene: 'overview' });
    const second = loadTvSnapshot('global', [], { scene: 'overview' });
    const [snapshot, shared] = await Promise.all([first, second]);
    expect(shared).toBe(snapshot); expect(directory).not.toHaveBeenCalled();
    expect(snapshot.summary).toHaveLength(4); expect(snapshot.quotes).toHaveLength(6);
    expect(snapshot.summary?.map(q => q.symbol)).toEqual(['^GSPC', '^DJI', '^NDX', 'BTC/USDT']);
    expect(snapshot.total).toBe(6); expect(snapshot.selectionTotal).toBe(10); expect(snapshot.directoryTotal).toBeUndefined();
    expect(snapshot.quotes.map(q => q.symbol)).toEqual(['AAPL','MSFT','NVDA','GOOGL','AMZN','META']);
    expect(new Set([...snapshot.summary!, ...snapshot.quotes].map(q => q.symbol)).size).toBe(10);
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(9);
    expect(cryptoTvQuotes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(cryptoTvQuotes).mock.calls[0][0]).toMatchObject([{ symbol: 'BTC/USDT', currency: 'USDT', providerSymbol: 'BTCUSDT' }]);
  });
  it('keeps all six Gulf countries in the bounded viewing selection', () => {
    const selection = tvSceneAssets('gulf');
    const selected = [...selection.summary, ...selection.rows];
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map(asset => asset.country))).toEqual(new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM']));
    expect(selected.every(asset => asset.mic && asset.currency && asset.providerSymbol)).toBe(true);
  });
  it('keeps a market-specific closing observation and its original receive time', async () => {
    vi.useFakeTimers(); vi.setSystemTime('2026-09-19T09:00:00Z');
    vi.spyOn(catalog, 'tvDirectoryAssets').mockResolvedValue([{ symbol: 'NBK.KW', name: 'NBK', region: 'BOURSA_KUWAIT', currency: 'KWD' }]);
    vi.mocked(providerStockQuote).mockResolvedValue({ price: 1.012, change: null, changePercent: 1, currency: 'KWD', quoteTimestamp: '2026-09-17T10:00:00Z',
      receivedAt: '2026-09-19T08:00:00Z', delayed: true, delayType: 'eod', observation: { precision: 'instant', marketOpen: false }, dataSource: 'Twelve Data', status: 'available' });
    const snapshot = await loadTvSnapshot('gulf', [], { market: 'BOURSA_KUWAIT' });
    expect(providerStockQuote).toHaveBeenCalledWith('TD_XKUW', 'NBK', { providerSymbol: 'NBK', mic: 'XKUW', currency: 'KWD' });
    expect(snapshot.quotes[0]).toMatchObject({ price: 1.012, status: 'closed', observedAt: '2026-09-17T10:00:00Z', receivedAt: '2026-09-19T08:00:00Z', exchange: 'BOURSA_KUWAIT' });
  });
  it('preserves the original provider failure when failed quotes have no currency', async () => {
    vi.spyOn(catalog, 'tvDirectoryAssets').mockResolvedValue([{ symbol: 'KFH.KW', name: 'KFH', region: 'BOURSA_KUWAIT', currency: 'KWD' }]);
    vi.mocked(providerStockQuote).mockResolvedValue({ price: null, change: null, changePercent: null, currency: null, quoteTimestamp: null,
      delayed: true, dataSource: null, status: 'unavailable', issue: 'not_configured' });
    const snapshot = await loadTvSnapshot('gulf', [], { market: 'BOURSA_KUWAIT', symbols: ['KFH.KW'] });
    expect(snapshot.quotes[0]).toMatchObject({ price: null, currency: 'KWD', issue: 'not_configured', receivedAt: null });
  });
  it('rejects fallback denomination, exchange, stripped-listing and instrument mismatches', () => {
    const row = { symbol: 'SAP.DE', currency: 'EUR', provenance: { providerSymbol: 'SAP.DE' } } as SfmMarketQuote;
    const asset = { symbol: 'SAP.DE', name: 'SAP', currency: 'EUR' };
    expect(tvQuoteIdentityMatches(asset, row)).toBe(true);
    expect(tvQuoteIdentityMatches(asset, { ...row, currency: 'USD' })).toBe(false);
    expect(tvQuoteIdentityMatches(asset, { ...row, provenance: { ...row.provenance, providerSymbol: 'SAP' } })).toBe(false);
    expect(tvQuoteIdentityMatches({ symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' }, { ...row, symbol: 'AAPL', currency: 'USD', exchange: 'NYSE', provenance: { ...row.provenance, providerSymbol: 'AAPL' } })).toBe(false);
    expect(tvQuoteIdentityMatches({ symbol: 'GC=F', name: 'Gold futures', assetType: 'commodity' }, { ...row, symbol: 'GC=F', currency: 'USD', provenance: { ...row.provenance, providerSymbol: 'XAUUSD' } })).toBe(false);
    const fx = { symbol: 'EUR/USD', name: 'Euro/dollar', assetType: 'forex' as const };
    expect(tvQuoteIdentityMatches(fx, { ...row, symbol: 'EURUSD', currency: 'USD', provenance: { ...row.provenance, providerSymbol: 'OANDA:EUR_USD' } })).toBe(true);
    expect(tvQuoteIdentityMatches(fx, { ...row, symbol: 'EURUSD', currency: 'CHF', provenance: { ...row.provenance, providerSymbol: 'OANDA:EUR_USD' } })).toBe(false);
    expect(tvQuoteIdentityMatches({ symbol: 'BTC/USD', name: 'Bitcoin', assetType: 'crypto' }, { ...row, symbol: 'BTCUSD', currency: 'USD', provenance: { ...row.provenance, providerSymbol: 'BINANCE:BTCUSDT' } })).toBe(false);
  });
  it('batches only the selected crypto assets and keeps forex outside that batch', async () => {
    const directory = vi.spyOn(catalog, 'tvDirectoryAssets');
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    vi.mocked(cryptoTvQuotes).mockResolvedValue([]);
    vi.mocked(forexTvQuote).mockImplementation(async asset => ({ symbol: asset.symbol, name: asset.name, nameAr: asset.name, price: null, currency: asset.currency || null,
      changePercent: null, source: null, observedAt: null, receivedAt: null, exchange: 'FOREX', country: null, status: 'unavailable' }));
    const snapshot = await loadTvSnapshot('commodities', [], { scene: 'assets' });
    expect(directory).not.toHaveBeenCalled();
    expect(cryptoTvQuotes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(cryptoTvQuotes).mock.calls[0][0].map(asset => asset.symbol)).toEqual(['BTC/USDT', 'ETH/USDT', 'SOL/USDT']);
    expect(forexTvQuote).toHaveBeenCalledTimes(3); expect(snapshot.selectionTotal).toBe(10);
  });
});
