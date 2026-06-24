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
  summary: {
    totalMarketCapUsd: number | null;
    totalVolume24hUsd: number | null;
    bitcoinDominance: number | null;
    marketChange24h: number | null;
    risingCount: number;
    fallingCount: number;
  };
  ticker: CryptoMarketCoin[];
  rankings: {
    gainers: CryptoMarketCoin[];
    losers: CryptoMarketCoin[];
    highestPriced: CryptoMarketCoin[];
    lowestPriced: CryptoMarketCoin[];
    mostTraded: CryptoMarketCoin[];
    leastTraded: CryptoMarketCoin[];
    trending: CryptoMarketCoin[];
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

type CoinGeckoGlobalPayload = {
  data?: {
    total_market_cap?: Record<string, unknown>;
    total_volume?: Record<string, unknown>;
    market_cap_percentage?: Record<string, unknown>;
    market_cap_change_percentage_24h_usd?: unknown;
  };
};

type CoinGeckoTrendingCoin = {
  item?: {
    id?: unknown;
    symbol?: unknown;
    name?: unknown;
    small?: unknown;
    thumb?: unknown;
    market_cap_rank?: unknown;
    data?: {
      price?: unknown;
      total_volume?: unknown;
      price_change_percentage_24h?: Record<string, unknown>;
    };
  };
};

type CoinGeckoTrendingPayload = {
  coins?: CoinGeckoTrendingCoin[];
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

async function fetchCoinGeckoGlobal() {
  const response = await fetch(`${COINGECKO_BASE_URL}/global`, {
    next: { revalidate: 120 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  if (!response.ok) throw new Error(`CoinGecko global ${response.status}`);
  const json = await response.json() as CoinGeckoGlobalPayload;
  return {
    totalMarketCapUsd: asFiniteNumber(json.data?.total_market_cap?.usd),
    totalVolume24hUsd: asFiniteNumber(json.data?.total_volume?.usd),
    bitcoinDominance: asFiniteNumber(json.data?.market_cap_percentage?.btc),
    marketChange24h: asFiniteNumber(json.data?.market_cap_change_percentage_24h_usd),
  };
}

function normalizeTrendingCoin(entry: CoinGeckoTrendingCoin): CryptoMarketCoin | null {
  const item = entry.item;
  if (!item) return null;
  const id = cleanText(item.id);
  const symbol = cleanText(item.symbol).toUpperCase();
  const name = cleanText(item.name);
  const price = asFiniteNumber(item.data?.price);
  const volume24h = asFiniteNumber(item.data?.total_volume);
  const changePercent24h = asFiniteNumber(item.data?.price_change_percentage_24h?.usd);
  const marketCapRank = asFiniteNumber(item.market_cap_rank);
  const image = cleanText(item.small) || cleanText(item.thumb) || null;

  if (!id || !symbol || !name || !/^[A-Z0-9]{2,10}$/.test(symbol) || price === null || price <= 0) return null;
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

async function fetchTrendingCoins() {
  const response = await fetch(`${COINGECKO_BASE_URL}/search/trending`, {
    next: { revalidate: 120 },
    signal: AbortSignal.timeout(10000),
    headers: {
      accept: 'application/json',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });

  if (!response.ok) throw new Error(`CoinGecko trending ${response.status}`);
  const json = await response.json() as CoinGeckoTrendingPayload;
  return uniqueBySymbol((json.coins ?? []).map(normalizeTrendingCoin).filter((coin): coin is CryptoMarketCoin => Boolean(coin))).slice(0, 6);
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

function byChange(coins: CryptoMarketCoin[], direction: 'asc' | 'desc') {
  return coins
    .filter(coin => coin.changePercent24h !== null)
    .sort((a, b) => {
      const diff = (a.changePercent24h ?? 0) - (b.changePercent24h ?? 0);
      return direction === 'asc' ? diff : -diff;
    })
    .slice(0, 6);
}

export async function fetchCryptoMarketData(): Promise<CryptoMarketPayload> {
  const [tickerResult, rankableResult, globalSummary, trendingResult] = await Promise.allSettled([
    fetchMajorTickerCoins(),
    fetchRankableCoins(),
    fetchCoinGeckoGlobal(),
    fetchTrendingCoins(),
  ]);

  const tickerCoins = tickerResult.status === 'fulfilled' ? tickerResult.value : [];
  const rankableCoins = rankableResult.status === 'fulfilled' ? rankableResult.value : [];
  const summary = globalSummary.status === 'fulfilled'
    ? globalSummary.value
    : {
      totalMarketCapUsd: null,
      totalVolume24hUsd: null,
      bitcoinDominance: null,
      marketChange24h: null,
    };
  const trending = trendingResult.status === 'fulfilled' ? trendingResult.value : [];

  if (tickerCoins.length === 0 && rankableCoins.length === 0) {
    throw new Error('CoinGecko returned no usable crypto market data');
  }

  return {
    ok: true,
    source: 'CoinGecko',
    updatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      risingCount: rankableCoins.filter(coin => (coin.changePercent24h ?? 0) > 0).length,
      fallingCount: rankableCoins.filter(coin => (coin.changePercent24h ?? 0) < 0).length,
    },
    ticker: tickerCoins,
    rankings: {
      gainers: byChange(rankableCoins, 'desc'),
      losers: byChange(rankableCoins, 'asc'),
      highestPriced: topByPrice(rankableCoins),
      lowestPriced: lowByPrice(rankableCoins),
      mostTraded: byVolume(rankableCoins, 'desc'),
      leastTraded: byVolume(rankableCoins, 'asc'),
      trending,
    },
  };
}
