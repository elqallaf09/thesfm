import { NextResponse } from 'next/server';
import { toResilientTickerItem, type ResilientTickerPrice } from '@/lib/market/tickerItems';

export const revalidate = 90;
export const dynamic = 'force-dynamic';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CRYPTO_TICKER_SOURCE = 'CoinGecko';

const CRYPTO_TICKER_ASSETS = [
  { id: 'bitcoin', symbol: 'BTC-USD', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH-USD', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB-USD', name: 'BNB' },
  { id: 'solana', symbol: 'SOL-USD', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP-USD', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA-USD', name: 'Cardano' },
  { id: 'avalanche-2', symbol: 'AVAX-USD', name: 'Avalanche' },
  { id: 'dogecoin', symbol: 'DOGE-USD', name: 'Dogecoin' },
  { id: 'polkadot', symbol: 'DOT-USD', name: 'Polkadot' },
  { id: 'litecoin', symbol: 'LTC-USD', name: 'Litecoin' },
  { id: 'chainlink', symbol: 'LINK-USD', name: 'Chainlink' },
  { id: 'uniswap', symbol: 'UNI-USD', name: 'Uniswap' },
] as const;

type CoinGeckoMarketCoin = {
  id?: unknown;
  image?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
};

function asFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function unavailablePrice(reason: string): ResilientTickerPrice {
  return {
    price: null,
    change: null,
    changePercent: null,
    source: CRYPTO_TICKER_SOURCE,
    delayed: true,
    available: false,
    unavailableReason: reason,
  };
}

function normalizeCryptoTickerQuote(coin: CoinGeckoMarketCoin | undefined): ResilientTickerPrice {
  if (!coin) return unavailablePrice('provider_returned_empty_quote');

  const price = asFiniteNumber(coin.current_price);
  const changePercent = asFiniteNumber(coin.price_change_percentage_24h);
  const available = price !== null && price > 0;

  if (!available) return unavailablePrice('provider_returned_empty_quote');

  return {
    price,
    change: null,
    changePercent,
    source: CRYPTO_TICKER_SOURCE,
    delayed: true,
    available: true,
  };
}

function buildItems(coinsById?: Map<string, CoinGeckoMarketCoin>) {
  return CRYPTO_TICKER_ASSETS.map(asset => {
    const coin = coinsById?.get(asset.id);

    return {
      ...toResilientTickerItem(asset, normalizeCryptoTickerQuote(coin), {
        currency: 'USD',
        fallbackSource: CRYPTO_TICKER_SOURCE,
      }),
      assetType: 'crypto' as const,
      providerSymbol: asset.symbol,
      imageUrl: cleanText(coin?.image) || null,
    };
  });
}

async function fetchCryptoTickerCoins() {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: CRYPTO_TICKER_ASSETS.map(asset => asset.id).join(','),
    order: 'market_cap_desc',
    per_page: String(CRYPTO_TICKER_ASSETS.length),
    page: '1',
    sparkline: 'false',
    price_change_percentage: '24h',
  });

  const response = await fetch(`${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`, {
    next: { revalidate: 90 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  const json = await response.json();
  const coins = Array.isArray(json) ? json as CoinGeckoMarketCoin[] : [];

  return new Map(
    coins
      .map(coin => [cleanText(coin.id), coin] as const)
      .filter(([id]) => id),
  );
}

export async function GET() {
  try {
    const coinsById = await fetchCryptoTickerCoins();
    const items = buildItems(coinsById);

    return NextResponse.json(
      {
        ok: true,
        source: CRYPTO_TICKER_SOURCE,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        available_count: items.filter(item => item.available).length,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=90, stale-while-revalidate=240',
        },
      },
    );
  } catch (error) {
    console.error('[CryptoTicker] Failed to load crypto ticker', {
      message: error instanceof Error ? error.message : String(error),
    });

    const items = buildItems();

    return NextResponse.json(
      {
        ok: true,
        code: 'CRYPTO_TICKER_DEGRADED',
        source: CRYPTO_TICKER_SOURCE,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        available_count: 0,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=30, stale-while-revalidate=180',
        },
      },
    );
  }
}
