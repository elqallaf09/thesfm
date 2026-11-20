import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ search: vi.fn(), stocks: vi.fn(), revision: 0 }));
vi.mock('@/lib/world-stocks/search', () => ({ searchWorldStocks: mocks.search }));
vi.mock('@/lib/world-stocks/providerDirectory', () => ({ providerDirectoryRevision: () => mocks.revision }));
vi.mock('@/lib/server/markets-tv/stockDirectory', () => ({ tvStockAssets: mocks.stocks }));
vi.mock('@/lib/server/markets-tv/instruments', () => ({ tvInstrumentAssets: vi.fn().mockResolvedValue([]) }));

const rows = [
  { providerSymbol: 'SAME', canonicalSymbol: 'SAME', displayName: 'Amsterdam issuer', region: 'TD_XAMS', exchangeCode: 'TD_XAMS', countryCode: 'NL', currency: 'EUR' },
  { providerSymbol: 'SAME', canonicalSymbol: 'SAME', displayName: 'Paris issuer', region: 'TD_XPAR', exchangeCode: 'TD_XPAR', countryCode: 'FR', currency: 'EUR' },
  { providerSymbol: 'SAP', canonicalSymbol: 'SAP', displayName: 'SAP', region: 'TD_XETR', exchangeCode: 'TD_XETR', countryCode: 'DE', currency: 'EUR' },
  { providerSymbol: 'NESN', canonicalSymbol: 'NESN', displayName: 'Nestlé', region: 'TD_XSWX', exchangeCode: 'TD_XSWX', countryCode: 'CH', currency: 'CHF' },
  { providerSymbol: 'AAPL', canonicalSymbol: 'AAPL', displayName: 'Apple', region: 'US', exchangeCode: 'US', countryCode: 'US', currency: 'USD' },
];
function result(status = 'directory', listings = rows) {
  return { results: listings, totalCount: listings.length, source: 'test-fixture', directoryStatus: status, directoryAsOf: '2026-11-20T09:00:00Z',
    markets: listings.map(row => ({ id: row.region, labelAr: row.region, labelEn: row.region, labelFr: row.region, countryCode: row.countryCode, status })) };
}
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.revision = 0; mocks.search.mockResolvedValue(result()); mocks.stocks.mockResolvedValue([]); });
afterEach(() => vi.useRealTimers());

describe('European TV directory', () => {
  it('includes every supported European country without merging non-European markets', async () => {
    const { tvCountryGroup } = await import('@/lib/server/markets-tv/catalog');
    for (const country of ['EE', 'LV', 'LT', 'IS', 'CZ', 'HU', 'RO', 'RU', 'LU', 'MT', 'CY', 'SI', 'SK', 'HR', 'BG', 'UA']) expect(tvCountryGroup(country)).toBe('europe');
    for (const country of ['US', 'KW', 'CN', 'CA', 'AU']) expect(tvCountryGroup(country)).not.toBe('europe');
  });
  it('aggregates actual European exchanges, preserving duplicate tickers on different venues', async () => {
    const { tvDirectory, tvMarkets } = await import('@/lib/server/markets-tv/catalog');
    const directory = await tvDirectory('world', 'europe');
    expect(directory).toMatchObject({ coverage: 'directory', asOf: '2026-11-20T09:00:00Z' });
    expect(directory.assets).toHaveLength(4);
    expect(directory.assets.map(row => `${row.region}:${row.symbol}`)).toEqual(['TD_XAMS:SAME', 'TD_XPAR:SAME', 'TD_XETR:SAP', 'TD_XSWX:NESN']);
    expect(directory.assets.every(row => row.mic && row.providerSymbol && !('price' in row))).toBe(true);
    const markets = await tvMarkets();
    expect(markets.find(row => row.id === 'europe')).toMatchObject({ count: 4, status: 'directory' });
    expect(markets.find(row => row.id === 'TD_XAMS')).toMatchObject({ labelAr: 'يورونكست أمستردام', labelEn: 'Euronext Amsterdam', labelFr: 'Euronext Amsterdam' });
    for (const id of ['TD_XAMS', 'TD_XPAR', 'TD_XETR', 'TD_XSWX']) expect(markets.find(row => row.id === id)).toMatchObject({ count: 1, group: 'europe' });
    expect(mocks.stocks).not.toHaveBeenCalled();
  });

  it('selects each exchange from the same verified directory without another upstream request', async () => {
    const { tvDirectory } = await import('@/lib/server/markets-tv/catalog');
    const directory = await tvDirectory('world', 'TD_XPAR');
    expect(directory.assets).toMatchObject([{ symbol: 'SAME', region: 'TD_XPAR', mic: 'XPAR', currency: 'EUR' }]);
    expect(directory.assets).toHaveLength(1);
    expect(mocks.stocks).not.toHaveBeenCalled();
  });

  it('discloses the configured sample and requests a short retry while the full catalog is pending', async () => {
    mocks.search.mockResolvedValue(result('pending', []));
    const { tvDirectory, tvMarketCatalog } = await import('@/lib/server/markets-tv/catalog');
    const directory = await tvDirectory('world', 'europe');
    expect(directory).toMatchObject({ coverage: 'selected', retryAfterMs: 5000, asOf: null });
    expect(directory.assets.map(row => row.symbol)).toEqual([
      'ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'TTE.PA', 'OR.PA', 'AIR.PA', 'SAN.PA', 'BNP.PA', 'INGA.AS',
      'SIE.DE', 'ALV.DE', 'DTE.DE', 'SAN.MC', 'ITX.MC', 'ENEL.MI', 'ISP.MI', 'NOVO-B.CO', 'NOVN.SW', 'UBSG.SW',
    ]);
    expect(await tvMarketCatalog()).toMatchObject({ coverage: 'partial', retryAfterMs: 5000 });
  });

  it('immediately replaces a provisional response after the background source revision changes', async () => {
    mocks.search.mockResolvedValueOnce(result('pending', [])).mockResolvedValue(result());
    const { tvDirectory } = await import('@/lib/server/markets-tv/catalog');
    expect((await tvDirectory('world', 'europe')).coverage).toBe('selected');
    mocks.revision++;
    expect((await tvDirectory('world', 'europe')).assets).toHaveLength(4);
    expect(mocks.search).toHaveBeenCalledTimes(2);
  });

  it('rechecks pending results after five seconds even before the source revision changes', async () => {
    vi.useFakeTimers();
    mocks.search.mockResolvedValueOnce(result('pending', [])).mockResolvedValue(result());
    const { tvDirectory } = await import('@/lib/server/markets-tv/catalog');
    await tvDirectory('world', 'europe');
    await vi.advanceTimersByTimeAsync(5001);
    expect((await tvDirectory('world', 'europe')).coverage).toBe('directory');
    expect(mocks.search).toHaveBeenCalledTimes(2);
  });

  it('keeps a retained complete source identified as a dated snapshot', async () => {
    mocks.search.mockResolvedValue(result('snapshot'));
    const { tvDirectory } = await import('@/lib/server/markets-tv/catalog');
    expect(await tvDirectory('europe')).toMatchObject({ coverage: 'snapshot', asOf: '2026-11-20T09:00:00Z', assets: expect.any(Array) });
  });
});
