import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ directory: vi.fn(), resolve: vi.fn() }));
vi.mock('@/lib/server/markets-tv/catalog', () => ({ tvDirectoryAssets: mocks.directory }));
vi.mock('@/lib/server/markets-tv/quoteLoader', () => ({ resolveTvQuotes: mocks.resolve }));
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.directory.mockResolvedValue([
    { symbol: 'SAME', name: 'Paris company', region: 'TD_XPAR', currency: 'EUR' },
    { symbol: 'SAME', name: 'Amsterdam company', region: 'TD_XAMS', currency: 'EUR' },
    ...Array.from({ length: 20 }, (_, i) => ({ symbol: `QA${i}`, name: `Issuer ${i}`, region: 'TD_XETR', currency: 'EUR' })),
  ]);
  mocks.resolve.mockImplementation(async (assets: TvAsset[]) => assets.map(asset => ({ symbol: asset.symbol, name: asset.name,
    nameAr: asset.name, exchange: asset.region, currency: asset.currency, price: null, status: 'unavailable',
    changePercent: null, source: null, observedAt: null, receivedAt: null, country: null })));
});

describe('European quote selection', () => {
  it('quotes only requested page listings and keeps identical symbols distinct', async () => {
    const snapshot = await loadTvSnapshot('world', [], { market: 'europe', pageSize: 6, listingKeys: ['TD_XAMS:SAME', 'TD_XPAR:SAME', 'TD_XETR:QA19'] });
    expect(snapshot.directoryTotal).toBe(22);
    expect(snapshot.selectionTotal).toBe(3);
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(mocks.resolve.mock.calls[0][0].map((row: TvAsset) => row.region)).toEqual(['TD_XAMS', 'TD_XPAR', 'TD_XETR']);
    expect(snapshot.quotes.map(row => row.listingKey)).toEqual(['TD_XAMS:SAME', 'TD_XPAR:SAME', 'TD_XETR:QA19']);
    expect(snapshot.quotes.every(row => row.price === null)).toBe(true);
  });

  it('cannot use a listing key to escape the selected exchange directory', async () => {
    mocks.directory.mockResolvedValue([{ symbol: 'SAME', name: 'Paris company', region: 'TD_XPAR' }]);
    const snapshot = await loadTvSnapshot('world', [], { market: 'TD_XPAR', listingKeys: ['TD_XAMS:SAME'] });
    expect(snapshot.selectionTotal).toBe(0);
    expect(mocks.resolve).toHaveBeenCalledWith([], 'world');
  });

  it('keeps legacy unambiguous symbol selection but does not guess a duplicate symbol venue', async () => {
    const snapshot = await loadTvSnapshot('world', [], { market: 'europe', symbols: ['SAME', 'QA19'] });
    expect(snapshot.quotes.map(row => row.symbol)).toEqual(['QA19']);
    expect(snapshot.quotes[0].listingKey).toBe('TD_XETR:QA19');
  });

  it('only sends the visible page to quote providers', async () => {
    const snapshot = await loadTvSnapshot('world', [], { market: 'europe', page: 3, pageSize: 6 });
    expect(snapshot.quotes).toHaveLength(4);
    expect(mocks.resolve.mock.calls[0][0].map((row: TvAsset) => row.symbol)).toEqual(['QA16', 'QA17', 'QA18', 'QA19']);
  });
});
