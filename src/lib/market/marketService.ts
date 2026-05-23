export type MarketAssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity' | 'gold';
export type MarketTrend = 'bullish' | 'neutral' | 'bearish';
export type MarketRiskLevel = 'low' | 'medium' | 'high';

export type MarketHistoryPoint = {
  date: string;
  close: number;
};

export type MarketAnalysis = {
  success: true;
  symbol: string;
  providerSymbol?: string;
  name: string;
  assetType: MarketAssetType;
  latestPrice: number;
  changePercent: number;
  trend: MarketTrend;
  riskLevel: MarketRiskLevel;
  indicators: {
    rsi: number;
    sma20: number;
    sma50: number;
    volatility: number;
  };
  levels: {
    support: number;
    resistance: number;
  };
  history: MarketHistoryPoint[];
  summary: string;
  source?: string;
  fallback?: boolean;
  fallbackReason?: string;
};

export type MarketError = {
  success: false;
  error: string;
};

export type MarketResult = MarketAnalysis | MarketError;

export type MarketSearchItem = {
  symbol: string;
  name: string;
  assetType: MarketAssetType;
};

const SUPPORTED_ASSET_TYPES: MarketAssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity', 'gold'];

const MOCK_MARKET_DATA: MarketAnalysis[] = [
  mock('AAPL', 'Apple Inc.', 'stock', 192.44, 1.18, 'bullish', 'medium', 61, 188.2, 181.7, 12.5, 184.5, 198.4, [174, 178, 176, 181, 185, 183, 188, 190, 192]),
  mock('MSFT', 'Microsoft', 'stock', 428.73, 0.64, 'bullish', 'low', 57, 421.1, 410.8, 10.8, 414.3, 436.8, [398, 404, 409, 413, 419, 416, 423, 426, 429]),
  mock('TSLA', 'Tesla', 'stock', 174.92, -2.42, 'bearish', 'high', 39, 183.4, 190.2, 28.4, 168.1, 188.8, [205, 198, 192, 189, 184, 179, 181, 177, 175]),
  mock('NVDA', 'NVIDIA', 'stock', 138.21, 2.86, 'bullish', 'medium', 68, 131.4, 124.8, 19.6, 128.9, 142.6, [112, 117, 121, 124, 129, 132, 130, 135, 138]),
  mock('SPY', 'SPDR S&P 500 ETF', 'etf', 531.2, 0.42, 'bullish', 'low', 55, 525.8, 514.3, 8.7, 518.5, 536.7, [501, 506, 512, 518, 521, 524, 526, 529, 531]),
  mock('BTC', 'Bitcoin', 'crypto', 67240, 3.12, 'bullish', 'high', 64, 64180, 61520, 38.2, 62800, 69100, [58500, 60200, 59600, 62100, 63800, 63100, 65200, 66100, 67240]),
  mock('ETH', 'Ethereum', 'crypto', 3420, 1.74, 'neutral', 'high', 54, 3360, 3255, 34.1, 3190, 3565, [3010, 3090, 3180, 3260, 3340, 3310, 3390, 3445, 3420]),
  mock('EURUSD', 'Euro / US Dollar', 'forex', 1.084, -0.14, 'neutral', 'medium', 47, 1.087, 1.081, 7.4, 1.076, 1.094, [1.071, 1.078, 1.082, 1.086, 1.088, 1.083, 1.085, 1.086, 1.084]),
  mock('XAU', 'Gold Spot', 'gold', 2368.4, -0.28, 'neutral', 'low', 49, 2374.2, 2348.7, 11.9, 2325.5, 2410.8, [2295, 2318, 2330, 2350, 2382, 2374, 2390, 2372, 2368]),
  mock('OIL', 'Crude Oil', 'commodity', 79.36, 1.05, 'neutral', 'medium', 52, 78.8, 80.1, 24.7, 75.9, 82.4, [74, 76, 77, 78, 80, 79, 77, 78, 79]),
];

function mock(
  symbol: string,
  name: string,
  assetType: MarketAssetType,
  latestPrice: number,
  changePercent: number,
  trend: MarketTrend,
  riskLevel: MarketRiskLevel,
  rsi: number,
  sma20: number,
  sma50: number,
  volatility: number,
  support: number,
  resistance: number,
  closes: number[],
): MarketAnalysis {
  return {
    success: true,
    symbol,
    name,
    assetType,
    latestPrice,
    changePercent,
    trend,
    riskLevel,
    indicators: { rsi, sma20, sma50, volatility },
    levels: { support, resistance },
    history: closes.map((close, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, close })),
    summary: 'Educational market summary only.',
  };
}

export function validateSymbol(symbol: unknown) {
  const normalized = String(symbol ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,12}$/.test(normalized)) return null;
  return normalized;
}

export function normalizeAssetType(assetType: unknown): MarketAssetType {
  const normalized = String(assetType ?? '').trim().toLowerCase();
  if (normalized === 'stocks') return 'stock';
  if (normalized === 'commodities') return 'commodity';
  if (SUPPORTED_ASSET_TYPES.includes(normalized as MarketAssetType)) return normalized as MarketAssetType;
  return 'stock';
}

export function getMockMarketUniverse() {
  return MOCK_MARKET_DATA;
}

export function getFallbackMockData(symbol: string, assetType: MarketAssetType): MarketAnalysis {
  const base = MOCK_MARKET_DATA.find(item => item.assetType === assetType) ?? MOCK_MARKET_DATA[0];
  return {
    ...base,
    symbol,
    name: `${symbol} Mock Asset`,
    assetType,
    summary: 'Educational market summary only.',
  };
}

export async function fetchMarketAnalysis(input: { symbol: unknown; assetType?: unknown }): Promise<MarketResult> {
  const symbol = validateSymbol(input.symbol);
  if (!symbol) return { success: false, error: 'Invalid symbol' };

  const assetType = normalizeAssetType(input.assetType);
  const exact = MOCK_MARKET_DATA.find(item => item.symbol === symbol);
  if (exact) return exact;

  return getFallbackMockData(symbol, assetType);
}

export async function searchMarketAssets(input: { query?: unknown; assetType?: unknown }) {
  const query = String(input.query ?? '').trim().toLowerCase();
  const assetType = input.assetType ? normalizeAssetType(input.assetType) : null;
  return MOCK_MARKET_DATA
    .filter(item => !assetType || item.assetType === assetType)
    .filter(item => !query || item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query))
    .map<MarketSearchItem>(({ symbol, name, assetType }) => ({ symbol, name, assetType }));
}

export async function compareMarketAssets(symbols: unknown, assetType?: unknown) {
  const list = String(symbols ?? '')
    .split(',')
    .map(validateSymbol)
    .filter((symbol): symbol is string => Boolean(symbol))
    .slice(0, 6);

  const normalizedType = normalizeAssetType(assetType);
  return Promise.all(list.map(symbol => fetchMarketAnalysis({ symbol, assetType: normalizedType })));
}
