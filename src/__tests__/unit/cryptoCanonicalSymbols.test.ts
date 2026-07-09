import { describe, expect, it } from 'vitest';
import {
  cryptoQuoteRejectionReason,
  resolveCanonicalCryptoSymbol,
} from '@/lib/market/canonicalSymbols';
import { normalizeMarketSymbol } from '@/lib/market/normalizeSymbol';

describe('canonical crypto symbols', () => {
  it('resolves APT/USD to Aptos instead of the APT stock ticker', () => {
    const apt = resolveCanonicalCryptoSymbol('APT/USD', { assetClass: 'crypto' });

    expect(apt).toMatchObject({
      canonicalSymbol: 'APT/USD',
      displaySymbol: 'APT/USD',
      name: 'Aptos',
      providerSymbols: {
        yahoo: 'APT-USD',
        finnhub: 'BINANCE:APTUSDT',
      },
    });
  });

  it('resolves BCH/USD to Bitcoin Cash instead of Banco de Chile', () => {
    const bch = resolveCanonicalCryptoSymbol('BCH/USD', { assetClass: 'crypto' });

    expect(bch).toMatchObject({
      canonicalSymbol: 'BCH/USD',
      displaySymbol: 'BCH/USD',
      name: 'Bitcoin Cash',
      providerSymbols: {
        yahoo: 'BCH-USD',
        finnhub: 'BINANCE:BCHUSDT',
      },
    });
  });

  it('normalizes BTC aliases into one canonical asset', () => {
    const aliases = ['BTC', 'BTCUSD', 'BTC-USD', 'BTC/USD'];
    const canonicalSymbols = aliases.map(alias => resolveCanonicalCryptoSymbol(alias, { assetClass: 'crypto', allowInferred: true })?.canonicalSymbol);

    expect(new Set(canonicalSymbols)).toEqual(new Set(['BTC/USD']));
  });

  it('normalizes ADAUSD to ADA/USD and Yahoo ADA-USD', () => {
    expect(normalizeMarketSymbol('ADAUSD', 'crypto')).toMatchObject({
      displaySymbol: 'ADA/USD',
      providerSymbol: 'ADA-USD',
      assetType: 'crypto',
    });
  });

  it('rejects stock company names for crypto assets', () => {
    expect(cryptoQuoteRejectionReason({
      requestedSymbol: 'APT/USD',
      canonicalSymbol: 'APT/USD',
      assetClass: 'crypto',
      provider: 'yahoo',
      providerSymbol: 'APT',
      responseSymbol: 'APT',
      responseName: 'Alpha Pro Tech, Ltd.',
      responseAssetType: 'EQUITY',
      responsePrice: 5,
    })).toContain('asset_type_collision');

    expect(cryptoQuoteRejectionReason({
      requestedSymbol: 'BCH/USD',
      canonicalSymbol: 'BCH/USD',
      assetClass: 'crypto',
      provider: 'yahoo',
      providerSymbol: 'BCH',
      responseSymbol: 'BCH',
      responseName: 'Banco de Chile',
      responseAssetType: 'EQUITY',
      responsePrice: 20,
    })).toContain('asset_type_collision');
  });

  it('accepts valid crypto provider pairs', () => {
    expect(cryptoQuoteRejectionReason({
      requestedSymbol: 'APT/USD',
      canonicalSymbol: 'APT/USD',
      assetClass: 'crypto',
      provider: 'yahoo',
      providerSymbol: 'APT-USD',
      responseSymbol: 'APT-USD',
      responseName: 'Aptos USD',
      responseAssetType: 'CRYPTOCURRENCY',
      responsePrice: 4.25,
    })).toBeNull();
  });
});
