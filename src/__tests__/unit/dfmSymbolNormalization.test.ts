import { describe, expect, it, vi } from 'vitest';
import { applyDfmListingCorrections, normalizeDfmRows } from '../../../scripts/lib/dfm-symbols.mjs';
import bundled from '@/data/market-symbols/dfm-listed.json';
import { listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { clearTraderMarketCatalogCache, getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

const SYNCED_AT = '2026-11-19T14:00:00.000Z';
const row = (SecuritySymbol: string, overrides: Record<string, unknown> = {}) => ({
  SecuritySymbol, Exchange: 'NASDAQ Dubai', SecurityType: 'Equities', Currency: null,
  Active: true, ShowOnList: true, FullName: SecuritySymbol, ...overrides,
});

describe('official DFM directory corrections', () => {
  it('uses the two Depa listings’ AED trading currency even when the CMS is blank or wrong', () => {
    const records = normalizeDfmRows([row('DEPA'), row('DEPACLA', { Currency: 'USD' }), row('REIT')], SYNCED_AT);
    expect(records.find(record => record.symbol === 'DEPA')).toMatchObject({ currency: 'AED', is_active: true });
    expect(records.find(record => record.symbol === 'DEPACLA')).toMatchObject({ currency: 'AED', is_active: true });
    expect(records.find(record => record.symbol === 'REIT')).toMatchObject({ currency: 'USD', is_active: true });
  });

  it('never assumes USD for a new Nasdaq listing with no known trading currency', () => {
    const records = normalizeDfmRows([row('NEWLISTING'), row('VERIFIED', { Currency: 'EUR' })], SYNCED_AT);
    expect(records.some(record => record.symbol === 'NEWLISTING')).toBe(false);
    expect(records.find(record => record.symbol === 'VERIFIED')).toMatchObject({ currency: 'EUR' });
  });

  it('retires the delisted fund and the misclassified sukuk despite active CMS flags', () => {
    const records = normalizeDfmRows([
      row('QBTC', { SecurityType: 'Funds' }), row('INDO21235USD', { SecurityType: 'Funds' }),
      row('ABTC', { SecurityType: 'Funds' }), row('NEWDEBT', { SecurityType: 'Sukuk Trust Certificates', Currency: 'USD' }),
    ], SYNCED_AT);
    expect(records.find(record => record.symbol === 'QBTC')).toMatchObject({ asset_type: 'etf', is_active: false });
    expect(records.find(record => record.symbol === 'INDO21235USD')).toMatchObject({ asset_type: 'bond', sector: 'Sukuk', is_active: false });
    expect(records.find(record => record.symbol === 'ABTC')).toMatchObject({ asset_type: 'etf', is_active: true });
    expect(records.some(record => record.symbol === 'NEWDEBT')).toBe(false);
  });

  it('retains explicit inactive identities for a future upsert after the CMS omits them', () => {
    const records = normalizeDfmRows([], SYNCED_AT);
    expect(records.map(record => [record.exchange, record.symbol, record.is_active])).toEqual([
      ['DFM', 'GULFNAV', false], ['NASDAQ_DUBAI', 'INDO21235USD', false], ['NASDAQ_DUBAI', 'QBTC', false],
    ]);
  });

  it('updates the renamed DFM listing without deleting the historical ticker or duplicating the current one', () => {
    const old = row('GULFNAV', { Exchange: 'DFM', FullName: 'Gulf Navigation Holding PJSC' });
    const fromOldCms = normalizeDfmRows([old], SYNCED_AT);
    expect(fromOldCms.find(record => record.symbol === 'GULFNAV')).toMatchObject({ is_active: false, provider_symbol: 'GULFNAV.DU' });
    expect(fromOldCms.find(record => record.symbol === 'ETIHADENERGY')).toMatchObject({ is_active: true, provider_symbol: 'ETIHADENERGY.DU', name: 'Etihad Energy Holding PJSC' });
    const current = normalizeDfmRows([old, row('ETIHADENERGY', { Exchange: 'DFM' })], SYNCED_AT);
    expect(current.filter(record => record.symbol === 'ETIHADENERGY')).toHaveLength(1);
  });

  it('does not reactivate an explicitly inactive current ticker using an active historical alias', () => {
    const records = normalizeDfmRows([
      row('GULFNAV', { Exchange: 'DFM' }), row('ETIHADENERGY', { Exchange: 'DFM', Active: false }),
    ], SYNCED_AT);
    expect(records.find(record => record.symbol === 'ETIHADENERGY')?.is_active).toBe(false);
  });

  it('scopes corrections to the exact exchange and does not mutate its input', () => {
    const input = [{ exchange: 'OTHER', symbol: 'DEPA', currency: 'USD', is_active: true }];
    const result = applyDfmListingCorrections(input, SYNCED_AT);
    expect(result.find(record => record.exchange === 'OTHER')).toEqual(input[0]);
    expect(input).toEqual([{ exchange: 'OTHER', symbol: 'DEPA', currency: 'USD', is_active: true }]);
  });

  it('ships seven active Nasdaq listings and the current DFM ticker in the searchable catalog', () => {
    const nasdaq = listBundledMarketSymbols({ exchange: 'NASDAQ_DUBAI' });
    expect(nasdaq.map(record => record.symbol).sort()).toEqual(['ABTC', 'DEPA', 'DEPACLA', 'ENBDREIT', 'HIK', 'NDAQ', 'REIT']);
    expect(nasdaq.filter(record => record.symbol.startsWith('DEPA')).every(record => record.currency === 'AED')).toBe(true);
    const dfm = listBundledMarketSymbols({ exchange: 'DFM' });
    expect(dfm.some(record => record.symbol === 'ETIHADENERGY')).toBe(true);
    expect(dfm.some(record => record.symbol === 'GULFNAV')).toBe(false);
    expect(bundled.find(record => record.symbol === 'GULFNAV')?.is_active).toBe(false);
  });

  it('excludes inactive historical identities from Trader while retaining current listings', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      const catalog = await getTraderMarketCatalog({ forceFresh: true, includeFmpDiscovery: false });
      expect(catalog.symbols.some(record => ['GULFNAV', 'QBTC', 'INDO21235USD'].includes(record.symbol))).toBe(false);
      expect(catalog.symbols.find(record => record.providerSymbol === 'ETIHADENERGY.DU')).toMatchObject({
        symbol: 'ETIHADENERGY', currency: 'AED', assetType: 'stock',
      });
      for (const symbol of ['DEPA', 'DEPACLA']) {
        expect(catalog.symbols.find(record => record.symbol === symbol)).toMatchObject({ currency: 'AED', assetType: 'stock' });
      }
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      clearTraderMarketCatalogCache();
      vi.unstubAllGlobals();
    }
  });
});
