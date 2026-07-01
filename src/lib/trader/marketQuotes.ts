import { fetchYahooNormalizedQuote, type YahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';

// Trader terminal market catalogue. Mirrors the MARKETS list in
// src/trader-app/public/app.js so the API can serve live quotes for the same
// symbols the UI renders. Prices come from Yahoo Finance (no API key required).

export type TraderAssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'fund';

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

// Display symbol -> Yahoo Finance symbol for cases where the trader symbol
// differs from Yahoo's ticker format. Anything not listed is used as-is.
const YAHOO_SYMBOL: Record<string, string> = {
  // Forex
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X', USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X',
  // Crypto
  BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD', SOLUSD: 'SOL-USD', BNBUSD: 'BNB-USD', XRPUSD: 'XRP-USD',
  // Commodities (front-month futures)
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTI: 'CL=F', BRENT: 'BZ=F',
  // Indices
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', DXY: 'DX-Y.NYB',
};

const CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'USDT']);

function classifyAssetType(symbol: string): TraderAssetType {
  const s = symbol.toUpperCase();
  const base = s.replace(/[.\-=].*$/, '');
  if (CRYPTO_BASES.has(base.replace(/USDT?$/, '')) && /USD/.test(s)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT)$/.test(s)) return 'commodity';
  if (/^(SPX|NDX|DJI|DXY)$/.test(s)) return 'index';
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
  if (/^[A-Z]{6}$/.test(s)) return s.slice(3);
  return 'USD';
}

export type TraderQuote = {
  symbol: string;
  name: string;
  assetType: TraderAssetType;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  source: 'Yahoo Finance';
  delayed: true;
  available: boolean;
  unavailableReason?: string;
  updatedAt: string | null;
};

function toQuote(display: string, normalized: YahooNormalizedQuote): TraderQuote {
  return {
    symbol: display,
    name: normalized.available ? normalized.name : display,
    assetType: classifyAssetType(display),
    price: normalized.price,
    change: normalized.change,
    changePercent: normalized.changePercent,
    currency: normalized.currency ?? defaultCurrency(display),
    source: 'Yahoo Finance',
    delayed: true,
    available: normalized.available,
    unavailableReason: normalized.available ? undefined : normalized.unavailableReason,
    updatedAt: normalized.marketTime,
  };
}

async function fetchOne(display: string, forceFresh?: boolean): Promise<TraderQuote> {
  const yahoo = YAHOO_SYMBOL[display.toUpperCase()];
  const candidates = yahoo ? [yahoo, display] : [display];
  const normalized = await fetchYahooNormalizedQuote({
    requestedSymbol: display,
    symbols: Array.from(new Set(candidates.filter(Boolean))),
    name: display,
    forceFresh,
    debugContext: { route: 'trader/marketQuotes' },
  }).catch(() => null);

  if (!normalized) {
    return {
      symbol: display,
      name: display,
      assetType: classifyAssetType(display),
      price: null,
      change: null,
      changePercent: null,
      currency: defaultCurrency(display),
      source: 'Yahoo Finance',
      delayed: true,
      available: false,
      unavailableReason: 'provider_request_failed',
      updatedAt: null,
    };
  }
  return toQuote(display, normalized);
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
      const index = cursor++;
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
