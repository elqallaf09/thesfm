export type CryptoMarketCoin = {
  id: string;
  symbol: string;
  marketSymbol: string;
  name: string;
  price: number;
  changePercent24h: number | null;
  volume24h: number | null;
  marketCapRank: number | null;
  image: string | null;
};

export type CryptoMarketPayload = {
  ok: true;
  source: 'CoinGecko';
  updatedAt: string;
  ticker: CryptoMarketCoin[];
  rankings: {
    highestPriced: CryptoMarketCoin[];
    lowestPriced: CryptoMarketCoin[];
    mostTraded: CryptoMarketCoin[];
    leastTraded: CryptoMarketCoin[];
  };
};

type CoinGeckoMarketCoin = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  image?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
  total_volume?: unknown;
  market_cap_rank?: unknown;
};

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const MAJOR_CRYPTO_ASSETS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'the-open-network', symbol: 'TON', name: 'Toncoin' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
] as const;

const NOISY_ASSET_PATTERN = /\b(wrapped|staked|bridged|wormhole|binance-peg|liquid staked|restaked)\b/i;

function asFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function marketSymbolFor(symbol: string) {
  return `${symbol.toUpperCase()}USD`;
}

function isNoisyAsset(coin: { id: string; name: string; symbol: string }) {
  const identity = `${coin.id} ${coin.name} ${coin.symbol}`;
  return NOISY_ASSET_PATTERN.test(identity);
}

function normalizeCoin(
  coin: CoinGeckoMarketCoin,
  override?: { symbol?: string; name?: string },
): CryptoMarketCoin | null {
  const id = cleanText(coin.id);
  const symbol = cleanText(override?.symbol ?? coin.symbol).toUpperCase();
  const name = cleanText(override?.name ?? coin.name);
  const price = asFiniteNumber(coin.current_price);
  const changePercent24h = asFiniteNumber(coin.price_change_percentage_24h);
  const volume24h = asFiniteNumber(coin.total_volume);
  const marketCapRank = asFiniteNumber(coin.market_cap_rank);
  const image = cleanText(coin.image) || null;

  if (!id || !symbol || !name || !/^[A-Z]{2,8}$/.test(symbol) || price === null || price <= 0) return null;
  if (isNoisyAsset({ id, symbol, name })) return null;

  return {
    id,
    symbol,
    marketSymbol: marketSymbolFor(symbol),
    name,
    price,
    changePercent24h,
    volume24h: volume24h !== null && volume24h >= 0 ? volume24h : null,
    marketCapRank: marketCapRank !== null && marketCapRank > 0 ? marketCapRank : null,
    image,
  };
}

function uniqueBySymbol(coins: CryptoMarketCoin[]) {
  const seen = new Set<string>();
  return coins.filter(coin => {
    if (seen.has(coin.symbol)) return false;
    seen.add(coin.symbol);
    return true;
  });
}

async function fetchCoinGeckoMarkets(searchParams: URLSearchParams) {
  const response = await fetch(`${COINGECKO_BASE_URL}/coins/markets?${searchParams.toString()}`, {
    next: { revalidate: 90 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  const json = await response.json();
  return Array.isArray(json) ? json as CoinGeckoMarketCoin[] : [];
}

async function fetchMajorTickerCoins() {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: MAJOR_CRYPTO_ASSETS.map(asset => asset.id).join(','),
    order: 'market_cap_desc',
    per_page: String(MAJOR_CRYPTO_ASSETS.length),
    page: '1',
    sparkline: 'false',
    price_change_percentage: '24h',
  });
  const coins = await fetchCoinGeckoMarkets(params);
  const byId = new Map(coins.map(coin => [cleanText(coin.id), coin]));

  return MAJOR_CRYPTO_ASSETS
    .map(asset => normalizeCoin(byId.get(asset.id) ?? {}, asset))
    .filter((coin): coin is CryptoMarketCoin => Boolean(coin));
}

async function fetchRankableCoins() {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: '120',
    page: '1',
    sparkline: 'false',
    price_change_percentage: '24h',
  });
  const coins = await fetchCoinGeckoMarkets(params);
  return uniqueBySymbol(
    coins
      .map(coin => normalizeCoin(coin))
      .filter((coin): coin is CryptoMarketCoin => Boolean(coin)),
  );
}

function topByPrice(coins: CryptoMarketCoin[]) {
  return [...coins].sort((a, b) => b.price - a.price).slice(0, 6);
}

function lowByPrice(coins: CryptoMarketCoin[]) {
  return [...coins].sort((a, b) => a.price - b.price).slice(0, 6);
}

function byVolume(coins: CryptoMarketCoin[], direction: 'asc' | 'desc') {
  return coins
    .filter(coin => coin.volume24h !== null && coin.volume24h > 0)
    .sort((a, b) => {
      const diff = (a.volume24h ?? 0) - (b.volume24h ?? 0);
      return direction === 'asc' ? diff : -diff;
    })
    .slice(0, 6);
}

export async function fetchCryptoMarketData(): Promise<CryptoMarketPayload> {
  const [ticker, rankableCoins] = await Promise.all([
    fetchMajorTickerCoins(),
    fetchRankableCoins(),
  ]);

  if (ticker.length === 0 && rankableCoins.length === 0) {
    throw new Error('CoinGecko returned no usable crypto market data');
  }

  return {
    ok: true,
    source: 'CoinGecko',
    updatedAt: new Date().toISOString(),
    ticker,
    rankings: {
      highestPriced: topByPrice(rankableCoins),
      lowestPriced: lowByPrice(rankableCoins),
      mostTraded: byVolume(rankableCoins, 'desc'),
      leastTraded: byVolume(rankableCoins, 'asc'),
    },
  };
}
