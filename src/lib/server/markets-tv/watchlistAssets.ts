import 'server-only';
import { resolveCanonicalCryptoSymbol } from '@/lib/market/canonicalSymbols';
import type { TvAsset } from './catalog';

/** Owned lists historically carry symbols only. Recognize an explicit USDT
 * pair only when its base is in our local crypto registry; bare tickers and
 * unknown bases keep their existing path. The saved symbol stays unchanged. */
export function tvWatchlistAssets(symbols: string[]): TvAsset[] {
  return [...new Set(symbols)].slice(0, 50).map<TvAsset>(symbol => {
    const asset: TvAsset = { symbol, name: symbol };
    const pair = symbol.match(/^([A-Z0-9]{2,12})(?:\/)?USDT$/);
    if (!pair) return asset;
    const known = resolveCanonicalCryptoSymbol(pair[1]);
    if (known?.baseSymbol !== pair[1]) return asset;
    return { ...asset, assetType: 'crypto', region: 'BINANCE', currency: 'USDT',
      baseCurrency: pair[1], providerSymbol: `${pair[1]}USDT` };
  });
}
