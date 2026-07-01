import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';
import { normalizeMarketCurrencyCode, normalizeMarketPrice } from '@/lib/market/marketCurrency';
import { providerSymbolsForAlias } from '@/lib/market/providerSymbolAliases';

// Trader terminal market catalogue. Mirrors the MARKETS list in
// src/trader-app/public/app.js so the API can serve live quotes for the same
// symbols the UI renders. Prices come from Yahoo Finance (no API key required).
// Signals are rule-based technical readings derived from real price history —
// not financial advice and not fabricated data.

export type TraderAssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'fund';
export type TraderSignal = 'buy' | 'sell' | 'wait' | 'watch';
export type TraderDataQuality = 'delayed' | 'partial' | 'unavailable';

type MarketDef = {
  id: string;
  ar: string;
  en: string;
  currency: string;
  symbols: string[];
};

export const TRADER_MARKETS: MarketDef[] = [
  { id: 'us-stocks', ar: 'الأسهم الأمريكية', en: 'US Stocks', currency: 'USD', symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA'] },
  { id: 'forex', ar: 'العملات', en: 'Forex', currency: 'Pair', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD'] },
  { id: 'crypto', ar: 'الأصول الرقمية', en: 'Crypto', currency: 'USD', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD'] },
  { id: 'commodities', ar: 'السلع', en: 'Commodities', currency: 'USD', symbols: ['XAUUSD', 'XAGUSD', 'WTI', 'BRENT'] },
  { id: 'indices', ar: 'المؤشرات', en: 'Indices', currency: 'USD', symbols: ['SPX', 'NDX', 'DJI', 'DXY'] },
  { id: 'etfs', ar: 'الصناديق المتداولة', en: 'ETFs', currency: 'USD', symbols: ['SPY', 'QQQ', 'GLD', 'IWM'] },
  { id: 'gcc', ar: 'أسواق الخليج', en: 'Gulf Markets', currency: 'Mixed', symbols: ['2222.SR', 'EMAAR.AE', 'QNBK.QA', 'KFH.KW'] },
  { id: 'saudi', ar: 'السوق السعودي', en: 'Saudi Market', currency: 'SAR', symbols: ['2222.SR', '1120.SR', '7010.SR'] },
  { id: 'kuwait', ar: 'بورصة الكويت', en: 'Kuwait Market', currency: 'KWD', symbols: ['KFH.KW', 'NBK.KW', 'ZAIN.KW'] },
  { id: 'uae', ar: 'سوق الإمارات', en: 'UAE Market', currency: 'AED', symbols: ['EMAAR.AE', 'FAB.AE', 'ETISALAT.AE'] },
  { id: 'qatar', ar: 'سوق قطر', en: 'Qatar Market', currency: 'QAR', symbols: ['QNBK.QA', 'IQCD.QA', 'QIBK.QA'] },
  { id: 'bahrain', ar: 'سوق البحرين', en: 'Bahrain Market', currency: 'BHD', symbols: ['AUB.BH', 'GFH.BH', 'BATELCO.BH'] },
  { id: 'oman', ar: 'سوق عمان', en: 'Oman Market', currency: 'OMR', symbols: ['BKMB.OM', 'OMINV.OM'] },
  { id: 'europe', ar: 'الأسهم الأوروبية', en: 'European Stocks', currency: 'EUR', symbols: ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA'] },
  { id: 'asia', ar: 'الأسهم الآسيوية', en: 'Asian Stocks', currency: 'Mixed', symbols: ['7203.T', '9988.HK', 'TSM', '005930.KS'] },
  { id: 'technology', ar: 'أسهم التقنية', en: 'Technology', currency: 'USD', symbols: ['AAPL', 'MSFT', 'GOOGL', 'ORCL', 'CRM'] },
  { id: 'ai', ar: 'أسهم الذكاء الاصطناعي', en: 'AI Stocks', currency: 'USD', symbols: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'PLTR'] },
  { id: 'semiconductors', ar: 'أشباه الموصلات', en: 'Semiconductors', currency: 'USD', symbols: ['NVDA', 'AMD', 'TSM', 'AVGO', 'INTC'] },
  { id: 'energy', ar: 'الطاقة', en: 'Energy Stocks', currency: 'Mixed', symbols: ['XOM', 'CVX', '2222.SR', 'OXY'] },
  { id: 'banking', ar: 'البنوك', en: 'Banking Stocks', currency: 'Mixed', symbols: ['JPM', 'BAC', 'NBK.KW', 'QNBK.QA'] },
  { id: 'food', ar: 'الأغذية والاستهلاك', en: 'Food / Consumer', currency: 'USD', symbols: ['KO', 'PEP', 'MCD', 'COST'] },
  { id: 'healthcare', ar: 'الصحة والدواء', en: 'Pharma / Healthcare', currency: 'USD', symbols: ['LLY', 'PFE', 'JNJ', 'MRK'] },
];

type TraderSymbolResolution = {
  requestedSymbol: string;
  canonicalSymbol: string;
  displaySymbol: string;
  name: string;
  primaryYahooSymbol: string;
  yahooSymbols: string[];
};

type TraderCardSymbolConfig = {
  canonicalSymbol: string;
  displaySymbol: string;
  name: string;
  yahooSymbols: string[];
  aliases: string[];
};

const TRADER_CARD_SYMBOLS: TraderCardSymbolConfig[] = [
  {
    canonicalSymbol: 'BTCUSD',
    displaySymbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    yahooSymbols: ['BTC-USD'],
    aliases: ['BTC/USD', 'BTCUSD', 'BTC-USD'],
  },
  {
    canonicalSymbol: 'ETHUSD',
    displaySymbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    yahooSymbols: ['ETH-USD'],
    aliases: ['ETH/USD', 'ETHUSD', 'ETH-USD'],
  },
  {
    canonicalSymbol: 'XAUUSD',
    displaySymbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    yahooSymbols: ['GC=F', 'XAUUSD=X'],
    aliases: ['XAUUSD', 'XAU/USD', 'GC=F', 'GOLD'],
  },
  {
    canonicalSymbol: 'XAGUSD',
    displaySymbol: 'XAGUSD',
    name: 'Silver / US Dollar',
    yahooSymbols: ['SI=F', 'XAGUSD=X'],
    aliases: ['XAGUSD', 'XAG/USD', 'SI=F', 'SILVER'],
  },
  {
    canonicalSymbol: 'NAS100',
    displaySymbol: 'NAS100',
    name: 'Nasdaq 100',
    yahooSymbols: ['^NDX', 'NQ=F'],
    aliases: ['NAS100', '^NDX', 'NQ=F'],
  },
  {
    canonicalSymbol: 'US30',
    displaySymbol: 'US30',
    name: 'Dow Jones Industrial Average',
    yahooSymbols: ['^DJI', 'YM=F'],
    aliases: ['US30', '^DJI', 'YM=F'],
  },
  {
    canonicalSymbol: 'OIL',
    displaySymbol: 'Oil',
    name: 'Crude Oil',
    yahooSymbols: ['CL=F', 'USOIL'],
    aliases: ['OIL', 'USOIL', 'CL=F'],
  },
];

// Display symbol -> Yahoo Finance symbol for cases where the trader symbol
// differs from Yahoo's ticker format. Anything not listed is used as-is.
const YAHOO_SYMBOL: Record<string, string> = {
  // Forex
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X',
  // Crypto
  BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD', SOLUSD: 'SOL-USD', BNBUSD: 'BNB-USD', XRPUSD: 'XRP-USD',
  // Commodities (front-month futures)
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTI: 'CL=F', OIL: 'CL=F', USOIL: 'CL=F', BRENT: 'BZ=F',
  // Indices
  SPX: '^GSPC', NDX: '^NDX', NAS100: '^NDX', DJI: '^DJI', US30: '^DJI', DXY: 'DX-Y.NYB',
};

const YAHOO_FALLBACK_SYMBOLS: Record<string, string[]> = {
  XAUUSD: ['GC=F', 'XAUUSD=X'],
  XAGUSD: ['SI=F', 'XAGUSD=X'],
  NAS100: ['^NDX', 'NQ=F'],
  US30: ['^DJI', 'YM=F'],
  OIL: ['CL=F', 'USOIL'],
  WTI: ['CL=F', 'USOIL'],
  USDJPY: ['USDJPY=X', 'JPY=X'],
};

const CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'USDT']);

function normalizedSymbolKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[/-]/g, '');
}

function rawSymbolKey(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

function symbolMatches(value: unknown, candidates: string[]) {
  const raw = rawSymbolKey(value);
  const normalized = normalizedSymbolKey(value);
  return candidates.some(candidate => rawSymbolKey(candidate) === raw || normalizedSymbolKey(candidate) === normalized);
}

function uniqueSymbols(symbols: Array<string | null | undefined>) {
  return Array.from(new Set(symbols.map(symbol => String(symbol ?? '').trim()).filter(Boolean)));
}

function resolveTraderCardSymbol(input: string): TraderSymbolResolution {
  const requestedSymbol = rawSymbolKey(input);
  const configured = TRADER_CARD_SYMBOLS.find(config => symbolMatches(requestedSymbol, [config.displaySymbol, config.canonicalSymbol, ...config.aliases, ...config.yahooSymbols]));
  if (configured) {
    return {
      requestedSymbol,
      canonicalSymbol: configured.canonicalSymbol,
      displaySymbol: configured.displaySymbol,
      name: configured.name,
      primaryYahooSymbol: configured.yahooSymbols[0] ?? configured.canonicalSymbol,
      yahooSymbols: uniqueSymbols(configured.yahooSymbols),
    };
  }

  const providerAliases = providerSymbolsForAlias(requestedSymbol);
  const yahooFallbacks = YAHOO_FALLBACK_SYMBOLS[requestedSymbol] ?? [];
  const directYahoo = YAHOO_SYMBOL[requestedSymbol] ?? requestedSymbol;
  const yahooSymbols = uniqueSymbols([
    ...yahooFallbacks,
    ...providerAliases,
    directYahoo,
    requestedSymbol,
  ]);

  return {
    requestedSymbol,
    canonicalSymbol: requestedSymbol,
    displaySymbol: requestedSymbol,
    name: requestedSymbol,
    primaryYahooSymbol: yahooSymbols[0] ?? requestedSymbol,
    yahooSymbols,
  };
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Trim floating-point noise while preserving forex/crypto precision.
function round(value: number | null): number | null {
  return value === null ? null : Number(value.toFixed(6));
}

function classifyAssetType(symbol: string): TraderAssetType {
  const s = symbol.toUpperCase();
  const compact = normalizedSymbolKey(s);
  const base = s.replace(/[.\-=].*$/, '').replace('/', '');
  if (CRYPTO_BASES.has(base.replace(/USDT?$/, '')) && /USD/.test(s)) return 'crypto';
  if (CRYPTO_BASES.has(compact.replace(/USDT?$/, '').replace(/USD$/, '')) && /USD/.test(compact)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|OIL|USOIL|CL=F|SI=F|GC=F)$/.test(s) || /^(XAUUSD|XAGUSD|OIL|USOIL)$/.test(compact)) return 'commodity';
  if (/^(SPX|NDX|DJI|DXY|NAS100|US30|\^NDX|\^DJI|NQ=F|YM=F)$/.test(s)) return 'index';
  if (/^(SPY|QQQ|GLD|IWM)$/.test(s)) return 'fund';
  if (/^[A-Z]{6}$/.test(base) && !s.includes('.')) return 'forex';
  return 'stock';
}

function defaultCurrency(symbol: string): string | null {
  const s = symbol.toUpperCase();
  if (/\.KW$/.test(s)) return 'KWD';
  if (/\.SR$|\.SA$/.test(s)) return 'SAR';
  if (/\.AE$/.test(s)) return 'AED';
  if (/\.QA$/.test(s)) return 'QAR';
  if (/\.OM$/.test(s)) return 'OMR';
  if (/\.BH$/.test(s)) return 'BHD';
  if (/\.T$/.test(s)) return 'JPY';
  if (/\.HK$/.test(s)) return 'HKD';
  if (/\.DE$|\.AS$|\.PA$/.test(s)) return 'EUR';
  if (/\.SW$/.test(s)) return 'CHF';
  if (/\.KS$/.test(s)) return 'KRW';
  const compact = normalizedSymbolKey(s);
  if (/^[A-Z]{6}$/.test(compact)) return compact.slice(3);
  return 'USD';
}

// ── Technical indicators (computed from real close prices) ──────────────────

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Annualized volatility (%) from daily returns.
function annualizedVolatility(closes: number[]): number | null {
  if (closes.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// Transparent rule-based signal: trend (price vs SMA20/SMA50, SMA cross) plus
// RSI momentum. Score > 0 leans bullish, < 0 bearish; |score| drives confidence.
function deriveSignal(args: {
  price: number | null;
  closes: number[];
  sma20: number | null;
  sma50: number | null;
  rsiValue: number | null;
  changePercent: number | null;
  partial: boolean;
}): { signal: TraderSignal; confidence: number | null } {
  const { price, closes, sma20, sma50, rsiValue, changePercent, partial } = args;
  if (price === null || closes.length < 2) return { signal: 'watch', confidence: null };

  let score = 0;
  let weight = 0;
  const firstClose = closes[0];
  const recentBase = closes[Math.max(0, closes.length - 6)];
  const trendPercent = firstClose > 0 ? ((price - firstClose) / firstClose) * 100 : 0;
  const recentMomentum = recentBase > 0 ? ((price - recentBase) / recentBase) * 100 : changePercent;

  if (Number.isFinite(trendPercent)) {
    weight += 1;
    if (trendPercent >= 2) score += 1;
    else if (trendPercent <= -2) score -= 1;
  }
  if (recentMomentum !== null && Number.isFinite(recentMomentum)) {
    weight += 1;
    if (recentMomentum >= 0.4) score += 1;
    else if (recentMomentum <= -0.4) score -= 1;
  }
  if (sma20 !== null) { score += price > sma20 ? 1 : -1; weight += 1; }
  if (sma50 !== null) { score += price > sma50 ? 1 : -1; weight += 1; }
  if (sma20 !== null && sma50 !== null) { score += sma20 > sma50 ? 1 : -1; weight += 1; }
  if (rsiValue !== null) {
    weight += 1;
    if (rsiValue >= 70) score -= 1;
    else if (rsiValue <= 30) score += 1;
    else if (rsiValue >= 55) score += 0.5;
    else if (rsiValue <= 45) score -= 0.5;
  }
  if (weight === 0) return { signal: 'watch', confidence: null };

  let signal: TraderSignal = 'wait';
  if (score >= 2) signal = 'buy';
  else if (score <= -2) signal = 'sell';
  else if (score > 0 || score < 0) signal = 'watch';

  const strength = Math.min(1, Math.abs(score) / weight);
  const rawConfidence = signal === 'wait' ? 42 : Math.round(45 + strength * 45);
  const confidenceCap = partial ? 62 : closes.length < 20 ? 70 : 88;
  return { signal, confidence: Math.max(35, Math.min(confidenceCap, rawConfidence)) };
}

function riskFromVolatility(volatility: number | null, assetType: TraderAssetType): 'low' | 'medium' | 'high' {
  if (volatility === null) return assetType === 'crypto' ? 'high' : 'medium';
  if (volatility >= 45) return 'high';
  if (volatility >= 22) return 'medium';
  return 'low';
}

export type TraderQuote = {
  symbol: string;
  requestedSymbol: string;
  canonicalSymbol: string;
  displaySymbol: string;
  providerSymbol: string | null;
  providerSymbolUsed: string | null;
  fallbackUsed: boolean;
  name: string;
  assetType: TraderAssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  currency: string | null;
  signal: TraderSignal;
  signalAvailable: boolean;
  confidence: number | null;
  riskLevel: 'low' | 'medium' | 'high';
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  sparkline: number[];
  history: Array<{ close: number }>;
  chartAvailable: boolean;
  dataQuality: TraderDataQuality;
  provider: 'Yahoo Finance';
  providerStatus: {
    yahooFinance: {
      provider: 'Yahoo Finance';
      status: 'available' | 'partial' | 'unavailable';
      symbol: string | null;
      fallbackUsed: boolean;
    };
  };
  source: 'Yahoo Finance';
  delayed: true;
  available: boolean;
  unavailableReason?: string;
  lastUpdated: string | null;
  updatedAt: string | null;
};

type YahooChartResult = {
  price: number | null;
  previousClose: number | null;
  currency: string | null;
  closes: number[];
  marketTime: string | null;
};

async function fetchChart(yahooSymbol: string, forceFresh?: boolean): Promise<YahooChartResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=3mo&interval=1d`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...(forceFresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json', 'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)' },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const body = await response.json().catch(() => null) as { chart?: { result?: Array<Record<string, any>> } } | null;
  const result = body?.chart?.result?.[0];
  if (!result) return null;

  const meta = (result.meta ?? {}) as Record<string, any>;
  const closesRaw = result.indicators?.quote?.[0]?.close;
  const closes = Array.isArray(closesRaw)
    ? closesRaw.map(numberOrNull).filter((value): value is number => value !== null && value > 0)
    : [];
  const price = numberOrNull(meta.regularMarketPrice) ?? (closes.length ? closes[closes.length - 1] : null);
  const previousClose = numberOrNull(meta.chartPreviousClose)
    ?? numberOrNull(meta.previousClose)
    ?? (closes.length >= 2 ? closes[closes.length - 2] : null);
  const marketTime = numberOrNull(meta.regularMarketTime);

  return {
    price,
    previousClose,
    currency: typeof meta.currency === 'string' ? meta.currency : null,
    closes,
    marketTime: marketTime ? new Date(marketTime * 1000).toISOString() : null,
  };
}

function providerStatusFor(status: 'available' | 'partial' | 'unavailable', symbol: string | null, fallbackUsed: boolean): TraderQuote['providerStatus'] {
  return {
    yahooFinance: {
      provider: 'Yahoo Finance',
      status,
      symbol,
      fallbackUsed,
    },
  };
}

function unavailableQuote(resolution: TraderSymbolResolution, reason: string): TraderQuote {
  return {
    symbol: resolution.displaySymbol,
    requestedSymbol: resolution.requestedSymbol,
    canonicalSymbol: resolution.canonicalSymbol,
    displaySymbol: resolution.displaySymbol,
    providerSymbol: null,
    providerSymbolUsed: null,
    fallbackUsed: false,
    name: resolution.name,
    assetType: classifyAssetType(resolution.canonicalSymbol),
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    currency: defaultCurrency(resolution.canonicalSymbol),
    signal: 'watch',
    signalAvailable: false,
    confidence: null,
    riskLevel: 'medium',
    rsi: null,
    sma20: null,
    sma50: null,
    sparkline: [],
    history: [],
    chartAvailable: false,
    dataQuality: 'unavailable',
    provider: 'Yahoo Finance',
    providerStatus: providerStatusFor('unavailable', null, false),
    source: 'Yahoo Finance',
    delayed: true,
    available: false,
    unavailableReason: reason,
    lastUpdated: null,
    updatedAt: null,
  };
}

async function fetchOne(display: string, forceFresh?: boolean): Promise<TraderQuote> {
  const resolution = resolveTraderCardSymbol(display);
  const assetType = classifyAssetType(resolution.canonicalSymbol);
  const yahooSymbols = resolution.yahooSymbols;
  const primaryYahoo = resolution.primaryYahooSymbol;

  let chart: YahooChartResult | null = null;
  let yahoo = primaryYahoo;
  for (const candidate of yahooSymbols) {
    const attempt = await fetchChart(candidate, forceFresh);
    if (attempt && attempt.price !== null) {
      chart = attempt;
      yahoo = candidate;
      break;
    }
    chart ??= attempt;
  }

  // Fallback: quote endpoint gives a price but no history (no computed signal).
  if (!chart || chart.price === null) {
    const normalized = await fetchYahooNormalizedQuote({
      requestedSymbol: resolution.displaySymbol,
      symbols: yahooSymbols,
      name: resolution.name,
      forceFresh,
      debugContext: { route: 'trader/marketQuotes', mode: 'quote_fallback' },
    }).catch(() => null);

    if (!normalized || !normalized.available || normalized.price === null) {
      return unavailableQuote(resolution, normalized?.unavailableReason ?? 'provider_returned_empty_quote');
    }
    const symbolUsed = normalized.symbolUsed ?? yahoo;
    const fallbackUsed = symbolUsed !== primaryYahoo;
    const norm = normalizeMarketPrice({ price: normalized.price, currency: normalized.currency, providerCurrency: normalized.currency, symbol: resolution.canonicalSymbol, market: resolution.canonicalSymbol });
    const divisor = norm.priceUnit === 'fils' ? 1000 : norm.priceUnit === 'pence' ? 100 : 1;
      return {
        symbol: resolution.displaySymbol,
        requestedSymbol: resolution.requestedSymbol,
        canonicalSymbol: resolution.canonicalSymbol,
        displaySymbol: resolution.displaySymbol,
        providerSymbol: symbolUsed,
        providerSymbolUsed: symbolUsed,
        fallbackUsed,
        name: normalized.name || resolution.name,
      assetType,
      price: round(norm.price),
      change: round(normalized.change !== null ? normalized.change / divisor : null),
      changePercent: round(normalized.changePercent),
      previousClose: null,
      currency: norm.currency ?? normalizeMarketCurrencyCode(normalized.currency) ?? defaultCurrency(resolution.canonicalSymbol),
      signal: 'watch',
      signalAvailable: true,
      confidence: null,
      riskLevel: riskFromVolatility(null, assetType),
      rsi: null,
      sma20: null,
      sma50: null,
      sparkline: [],
      history: [],
      chartAvailable: false,
      dataQuality: 'partial',
      provider: 'Yahoo Finance',
      providerStatus: providerStatusFor('partial', symbolUsed, fallbackUsed),
      source: 'Yahoo Finance',
      delayed: true,
      available: true,
      unavailableReason: 'chart_history_unavailable',
      lastUpdated: normalized.marketTime,
      updatedAt: normalized.marketTime,
    };
  }

  // Normalize price unit (Kuwait fils, London pence, …) and apply the same
  // divisor to the whole close series so indicators stay consistent.
  const norm = normalizeMarketPrice({ price: chart.price, currency: chart.currency, providerCurrency: chart.currency, symbol: resolution.canonicalSymbol, market: resolution.canonicalSymbol });
  const divisor = norm.priceUnit === 'fils' ? 1000 : norm.priceUnit === 'pence' ? 100 : 1;
  const price = norm.price;
  const closes = chart.closes.map(value => value / divisor).filter(value => Number.isFinite(value) && value > 0);
  const previousClose = chart.previousClose !== null ? chart.previousClose / divisor : null;
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;
  const currency = norm.currency ?? normalizeMarketCurrencyCode(chart.currency) ?? defaultCurrency(resolution.canonicalSymbol);
  const chartAvailable = closes.length >= 2;
  const dataQuality: TraderDataQuality = chartAvailable ? 'delayed' : 'partial';

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsiValue = rsi(closes, 14);
  const { signal, confidence } = deriveSignal({ price, closes, sma20, sma50, rsiValue, changePercent, partial: dataQuality === 'partial' });
  const riskLevel = riskFromVolatility(annualizedVolatility(closes), assetType);
  const fallbackUsed = yahoo !== primaryYahoo;
  const sparkline = closes.slice(-40).map(value => round(value)).filter((value): value is number => value !== null);

  return {
    symbol: resolution.displaySymbol,
    requestedSymbol: resolution.requestedSymbol,
    canonicalSymbol: resolution.canonicalSymbol,
    displaySymbol: resolution.displaySymbol,
    providerSymbol: yahoo,
    providerSymbolUsed: yahoo,
    fallbackUsed,
    name: resolution.name,
    assetType,
    price: round(price),
    change: round(change),
    changePercent: round(changePercent),
    previousClose: round(previousClose),
    currency,
    signal,
    signalAvailable: price !== null,
    confidence,
    riskLevel,
    rsi: rsiValue !== null ? Number(rsiValue.toFixed(1)) : null,
    sma20: sma20 !== null ? Number(sma20.toFixed(4)) : null,
    sma50: sma50 !== null ? Number(sma50.toFixed(4)) : null,
    sparkline,
    history: sparkline.map(close => ({ close })),
    chartAvailable,
    dataQuality,
    provider: 'Yahoo Finance',
    providerStatus: providerStatusFor(dataQuality === 'delayed' ? 'available' : 'partial', yahoo, fallbackUsed),
    source: 'Yahoo Finance',
    delayed: true,
    available: price !== null,
    unavailableReason: chartAvailable ? undefined : 'chart_history_unavailable',
    lastUpdated: chart.marketTime,
    updatedAt: chart.marketTime,
  };
}

// Fetch quotes for a list of symbols with a bounded concurrency so we do not
// fan out dozens of simultaneous requests to Yahoo.
export async function fetchTraderQuotes(symbols: string[], options?: { forceFresh?: boolean; concurrency?: number }): Promise<TraderQuote[]> {
  const unique = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 6, unique.length || 1));
  const results: TraderQuote[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchOne(unique[index], options?.forceFresh);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export function resolveTraderMarket(marketId: string | null | undefined): MarketDef {
  const raw = String(marketId ?? '').trim().toLowerCase();
  const alias = raw === 'us' || raw === 'stocks' || raw === '' ? 'us-stocks' : raw;
  return TRADER_MARKETS.find(m => m.id === alias) ?? TRADER_MARKETS[0];
}

export const CONNECTED_PROVIDER = {
  active: 'Yahoo Finance',
  requested: 'yahoo',
  provider: 'Yahoo Finance',
  configured: true,
  status: 'connected' as const,
};
