import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn() }));

import { tvQuoteIdentityMatches } from '@/lib/server/markets-tv/quoteLoader';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

const asset: TvAsset = { symbol: 'SAME', name: 'Synthetic QA listing', region: 'TD_XPAR',
  mic: 'XPAR', country: 'FR', currency: 'EUR', assetType: 'stock' };
const quote = (changes: Partial<SfmMarketQuote> = {}): SfmMarketQuote => ({
  symbol: 'SAME', assetType: 'stock', price: 10, country: 'FR', currency: 'EUR', exchange: 'XPAR',
  provenance: { providerSymbol: 'SAME', upstreamProvider: 'fmp' }, ...changes,
} as SfmMarketQuote);

describe('TV exchange directory quote identity', () => {
  it('accepts the exact MIC and rejects other venues sharing the symbol and currency', () => {
    expect(tvQuoteIdentityMatches(asset, quote())).toBe(true);
    expect(tvQuoteIdentityMatches(asset, quote({ exchange: 'TD_XPAR' }))).toBe(true);
    for (const exchange of ['XAMS', 'TD_XAMS', 'XETR', 'EURONEXT', null]) {
      expect(tvQuoteIdentityMatches(asset, quote({ exchange }))).toBe(false);
    }
  });

  it('requires matching symbol, denomination, country and equity type', () => {
    expect(tvQuoteIdentityMatches(asset, quote({ currency: 'USD' }))).toBe(false);
    expect(tvQuoteIdentityMatches(asset, quote({ country: 'NL' }))).toBe(false);
    expect(tvQuoteIdentityMatches(asset, quote({ assetType: 'index' }))).toBe(false);
    expect(tvQuoteIdentityMatches(asset, quote({ symbol: 'OTHER' }))).toBe(false);
    const row = quote();
    for (const providerSymbol of ['OTHER', 'SAME:XAMS', 'SAME.US']) {
      expect(tvQuoteIdentityMatches(asset, { ...row, provenance: { ...row.provenance, providerSymbol } })).toBe(false);
    }
    expect(tvQuoteIdentityMatches(asset, { ...row, provenance: { ...row.provenance, providerSymbol: 'SAME:XPAR' } })).toBe(true);
  });

  it('rejects inconsistent directory venue metadata', () => {
    expect(tvQuoteIdentityMatches({ ...asset, mic: 'XAMS' }, quote())).toBe(false);
    expect(tvQuoteIdentityMatches({ ...asset, exchange: 'TD_XAMS' }, quote())).toBe(false);
    expect(tvQuoteIdentityMatches({ ...asset, region: undefined, exchange: 'TD_XPAR' }, quote())).toBe(true);
  });

  it('keeps London pence distinct from pounds without a silent price conversion', () => {
    const pence: TvAsset = { ...asset, region: 'TD_XLON', mic: 'XLON', country: 'GB', currency: 'GBp' };
    const row = quote({ exchange: 'XLON', country: 'GB', currency: 'GBp', price: 125 });
    expect(tvQuoteIdentityMatches(pence, row)).toBe(true);
    expect(tvQuoteIdentityMatches(pence, { ...row, currency: 'GBP' })).toBe(false);
    expect(tvQuoteIdentityMatches({ ...pence, currency: 'GBP' }, row)).toBe(false);
  });

  it('keeps exact configured European symbols without accepting stripped or conflicting listings', () => {
    for (const [symbol, region, currency, exchange] of [['ASML.AS', 'TD_XAMS', 'EUR', 'EURONEXT'], ['SAP.DE', 'TD_XETR', 'EUR', 'XETR'], ['NESN.SW', 'TD_XSWX', 'CHF', 'SIX']]) {
      const selected: TvAsset = { symbol, name: symbol, region, currency, assetType: 'stock' };
      const row = quote({ symbol, currency, country: null, exchange: null });
      row.provenance = { ...row.provenance, providerSymbol: symbol };
      expect(tvQuoteIdentityMatches(selected, row)).toBe(true);
      expect(tvQuoteIdentityMatches(selected, { ...row, exchange })).toBe(true);
      expect(tvQuoteIdentityMatches(selected, { ...row, exchange: 'XPAR' })).toBe(false);
      expect(tvQuoteIdentityMatches(selected, { ...row, provenance: { ...row.provenance, providerSymbol: symbol.split('.')[0] } })).toBe(false);
    }
  });

  it('does not misclassify a configured four-letter exchange name as a foreign MIC', () => {
    const selected: TvAsset = { symbol: '0700.HK', name: 'Tencent', region: 'TD_XHKG', currency: 'HKD', assetType: 'stock' };
    const row = quote({ symbol: selected.symbol, currency: 'HKD', country: 'HK', exchange: 'HKEX' });
    row.provenance = { ...row.provenance, providerSymbol: selected.symbol };
    expect(tvQuoteIdentityMatches(selected, row)).toBe(true);
  });
});
