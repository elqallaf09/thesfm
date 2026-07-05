import staticUsSymbols from '@/data/us-symbols.json';
import legacyMarketSymbols from '@/data/market-symbols.json';
import boursaKuwaitSymbols from '@/data/market-symbols/boursa-kuwait.json';
import cryptoSymbols from '@/data/market-symbols/crypto.json';
import dfmListedSymbols from '@/data/market-symbols/dfm-listed.json';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/market/providerConfig';
import { normalizeAssetType, type MarketAssetType } from '@/lib/market/marketService';
import {
  classifyShariahCompliance,
  pickPreferredShariahClassification,
  shariahClassificationFields,
  type ShariahClassification,
  type ShariahScreeningData,
  type ShariahScreeningMethod,
  type ShariahStatus,
} from '@/lib/market/shariah-screening';
import { normalizeTraderSymbolMetadata, TRADER_MARKET_METADATA, type TraderSymbolMetadataDiagnostics } from '@/lib/trader/marketMetadata';
import {
  providerSymbolsForProviderAlias,
  resolveProviderSymbolAlias,
} from '@/lib/market/providerSymbolAliases';
import {
  FmpRateLimitError,
  fmpQueuedFetch,
  getFmpRuntimeStatus,
  markFmpCacheAvailable,
} from '@/lib/trader/providers/fmpRuntime';
import { getOpenbbConfiguredStatus } from '@/lib/trader/providers/openbb';

export type TraderAssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'fund';
export type TraderQuoteProvider = 'fmp' | 'yahoo' | 'openbb' | 'finnhub' | 'twelve_data' | 'eodhd' | 'marketstack';
export type TraderCatalogSource = 'seed' | 'bundled' | 'fmp' | 'supabase';

export type TraderMarketDef = {
  id: string;
  ar: string;
  en: string;
  family: string;
  currency: string;
  symbols: string[];
  tone?: string;
  apiMarket: string;
  source: TraderCatalogSource | 'mixed';
  totalSymbols: number;
};

export type TraderCatalogSymbol = {
  symbol: string;
  providerSymbol: string;
  providerSymbols: Partial<Record<TraderQuoteProvider, string[]>>;
  name: string;
  assetType: TraderAssetType;
  sector?: string;
  industry?: string;
  exchange?: string;
  exchangeCode?: string;
  market?: string;
  country?: string;
  currency?: string;
  aliases: string[];
  marketIds: string[];
  source: TraderCatalogSource;
  metadataDiagnostics: TraderSymbolMetadataDiagnostics;
  shariahStatus: ShariahStatus;
  shariahReason: string | null;
  shariahSource: string | null;
  shariahLastReviewedAt: string | null;
  shariahManualOverride: boolean;
  shariahReviewedBy: string | null;
  shariahScreeningData: ShariahScreeningData;
  shariahMethod: ShariahScreeningMethod;
};

export type ProviderCapability = {
  provider: TraderQuoteProvider;
  configured: boolean;
  healthy: boolean;
  status: 'healthy' | 'rate_limited' | 'not_configured' | 'degraded' | 'provider_error';
  rateLimited: boolean;
  lastSuccessfulFetch: string | null;
  lastError: string | null;
  cacheAvailable: boolean;
  supportsQuotes: boolean;
  supportsTechnicalAnalysis: boolean;
  supportsEarnings: boolean;
  supportsDividends: boolean;
  supportsIpos: boolean;
  supportsEconomicCalendar: boolean;
  reason: string | null;
};

export type CatalogDiagnostics = {
  provider: TraderQuoteProvider | 'bundled' | 'supabase';
  reason: string | null;
  totalSymbolsDiscovered: number;
  totalSymbolsLoaded: number;
  failedSymbols: Array<{ symbol: string; provider: string; reason: string }>;
  unsupportedSymbols: Array<{ symbol: string; provider: string; reason: string }>;
  providerLatencyMs: Record<string, number | null>;
  cacheStatus: 'hit' | 'miss' | 'stale' | 'disabled';
  summary: {
    loadedSymbols: number;
    failedSymbols: number;
    cachedSymbols: number;
    skippedDueToRateLimit: number;
    fmpStatus: string;
    openbbStatus: string;
  };
  sources: Record<string, number>;
  generatedAt: string;
};

export type TraderMarketCatalog = {
  markets: TraderMarketDef[];
  symbols: TraderCatalogSymbol[];
  diagnostics: CatalogDiagnostics;
  capabilityMatrix: Record<TraderQuoteProvider, ProviderCapability>;
};

type SeedMarket = Omit<TraderMarketDef, 'source' | 'totalSymbols'>;
type RawSymbolRecord = Record<string, unknown>;

const CATALOG_CACHE_MS = 12 * 60 * 60 * 1000;
const CATALOG_STALE_MS = 24 * 60 * 60 * 1000;
const FMP_DISCOVERY_TIMEOUT_MS = 12_000;

const SEMICONDUCTOR_SYMBOLS = [
  'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'MCHP',
  'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC', 'COHR', 'UMC', 'GFS', 'WOLF',
] as const;

const EXPANDED_MARKET_SYMBOLS: Record<string, readonly string[]> = {
  'us-stocks': [
    'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA', 'GOOGL', 'GOOG', 'BRK.B', 'JPM', 'V', 'MA', 'UNH', 'LLY',
    'WMT', 'HD', 'PG', 'COST', 'ORCL', 'NFLX', 'CRM', 'ADBE', 'CSCO', 'IBM', 'DIS', 'BAC', 'XOM', 'CVX',
  ],
  forex: [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'GBPJPY', 'EURGBP',
    'EURAUD', 'EURCHF', 'AUDJPY', 'CADJPY', 'CHFJPY', 'GBPCHF', 'GBPAUD', 'USDSAR', 'USDKWD', 'USDAED',
  ],
  crypto: [
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'AVAXUSD', 'DOTUSD', 'LTCUSD',
    'BCHUSD', 'LINKUSD', 'MATICUSD', 'TRXUSD', 'UNIUSD', 'ATOMUSD', 'ETCUSD', 'XLMUSD', 'APTUSD', 'ARBUSD',
  ],
  commodities: [
    'XAUUSD', 'XAGUSD', 'WTI', 'BRENT', 'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'HG=F', 'PL=F', 'PA=F', 'NG=F',
  ],
  indices: [
    'US30', 'NAS100', 'SPX500', 'DAX', 'FTSE', 'CAC40', 'NIKKEI', 'HSI', 'DXY', 'STOXX50', 'RUSSELL2000',
    'VIX', 'TASI', 'BKMAIN', 'DFMGI', 'ADXGI', 'QE', 'BAX',
  ],
  etfs: [
    'SPY', 'QQQ', 'VOO', 'DIA', 'IWM', 'GLD', 'SLV', 'VTI', 'VEA', 'VWO', 'AGG', 'BND', 'TLT', 'HYG',
    'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLP', 'XLU', 'VNQ', 'SOXX',
  ],
  saudi: [
    '2222.SR', '1120.SR', '1180.SR', '2010.SR', '7010.SR', '1211.SR', '1010.SR', '1020.SR', '1050.SR',
    '1060.SR', '1080.SR', '2020.SR', '2380.SR', '2280.SR', '4002.SR', '4004.SR', '4013.SR', '4164.SR',
    '4190.SR', '4300.SR', '8010.SR', '8210.SR', '7203.SR', '7020.SR',
  ],
  kuwait: [
    'KFH.KW', 'NBK.KW', 'ZAIN.KW', 'BOUBYAN.KW', 'GBK.KW', 'BURG.KW', 'CBK.KW', 'AGLTY.KW', 'KIB.KW',
    'WARBA.KW', 'MABANEE.KW', 'HUMANSOFT.KW', 'STC.KW', 'ALIMTIAZ.KW', 'GULFBANK.KW', 'NIND.KW',
    'KAMCO.KW', 'MEZZAN.KW', 'JAZEERA.KW', 'ALAFCO.KW',
  ],
  uae: [
    'EMAAR.AE', 'FAB.AE', 'ETISALAT.AE', 'ADCB.AE', 'DIB.AE', 'ENBD.AE', 'ALDAR.AE', 'ADIB.AE', 'DEWA.AE',
    'SALIK.AE', 'ADNOCDIST.AE', 'DFM.AE', 'AIRARABIA.AE', 'EMAAR.DU', 'DIB.DU', 'EMIRATESNBD.DU',
    'EMAARDEV.DU', 'TECOM.DU', 'ADNOCGAS.AD', 'ADNOCDRILL.AD', 'ADNOCAD.AD', 'TAQA.AD', 'MULTIPLY.AD',
  ],
  qatar: [
    'QNBK.QA', 'QIBK.QA', 'IQCD.QA', 'MARK.QA', 'CBQK.QA', 'DHBK.QA', 'ABQK.QA', 'QIIK.QA', 'QISI.QA',
    'ORDS.QA', 'VFQS.QA', 'QEWS.QA', 'MPHC.QA', 'QGTS.QA', 'QAMC.QA', 'BRES.QA', 'ERES.QA', 'UDCD.QA',
    'GWCS.QA', 'MERS.QA',
  ],
  bahrain: [
    'AUB.BH', 'GFH.BH', 'BATELCO.BH', 'NBB.BH', 'BBK.BH', 'ABC.BH', 'BISB.BH', 'SALAM.BH', 'ZAINBH.BH',
    'ALBH.BH', 'SEEF.BH', 'ESTERAD.BH', 'TRAFCO.BH', 'KHCB.BH',
  ],
  oman: [
    'BKMB.OM', 'OMINV.OM', 'NBOB.OM', 'OMAB.OM', 'ORED.OM', 'MSMI.OM', 'RAYS.OM', 'SMNP.OM', 'ALMI.OM',
    'DHOF.OM', 'OQGN.OM', 'NAPI.OM', 'DBIH.OM', 'HBMO.OM', 'MAZOON.OM',
  ],
  europe: [
    'ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L', 'NOVO-B.CO', 'AZN.L', 'HSBA.L', 'ULVR.L', 'SIE.DE',
    'OR.PA', 'TTE.PA', 'AIR.PA', 'SU.PA', 'AI.PA', 'IBE.MC', 'SAN.MC', 'ITX.MC', 'ENEL.MI', 'UCG.MI',
    'ROG.SW', 'NOVN.SW',
  ],
  asia: [
    '7203.T', '9988.HK', 'TSM', '005930.KS', '6758.T', '9984.T', '0700.HK', '1299.HK', '2330.TW', '2317.TW',
    'BABA', 'SONY', 'TM', 'NIO', 'JD', 'BIDU',
  ],
  technology: [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PANW', 'CRWD', 'SHOP', 'INTU',
    'ADP', 'IBM', 'CSCO', ...SEMICONDUCTOR_SYMBOLS,
  ],
  ai: [
    'NVDA', 'MSFT', 'GOOGL', 'GOOG', 'AMD', 'PLTR', 'META', 'AMZN', 'AVGO', 'TSM', 'ASML', 'CRM', 'NOW',
    'SNOW', 'AI', 'PATH', 'SOUN', 'ARM', 'SMCI', 'MU',
  ],
  semiconductors: SEMICONDUCTOR_SYMBOLS,
  energy: [
    'XOM', 'CVX', '2222.SR', 'OXY', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'HAL', 'BKR', 'SHEL.L',
    'TTE.PA', 'ADNOCDIST.AE', 'ADNOCGAS.AD',
  ],
  banking: [
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TD', 'RY', 'HSBA.L', 'SAN.MC', 'UCG.MI', 'NBK.KW',
    'KFH.KW', 'QNBK.QA', 'QIBK.QA', '1120.SR', '1180.SR', 'AUB.BH', 'BKMB.OM',
  ],
  food: [
    'KO', 'PEP', 'MCD', 'COST', 'WMT', 'PG', 'MDLZ', 'SBUX', 'YUM', 'KHC', 'GIS', 'K', 'HSY', 'TSN',
    'ULVR.L', 'NESN.SW',
  ],
  healthcare: [
    'LLY', 'PFE', 'JNJ', 'MRK', 'UNH', 'ABBV', 'ABT', 'TMO', 'DHR', 'BMY', 'AMGN', 'GILD', 'ISRG', 'VRTX',
    'AZN.L', 'NOVN.SW', 'ROG.SW',
  ],
};

export const TRADER_MARKET_SEEDS: SeedMarket[] = [
  { id: 'us-stocks', ar: 'الأسهم الأمريكية', en: 'US Stocks', family: 'Equities', currency: 'USD', symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'TSLA'], tone: 'featured', apiMarket: 'us-stocks' },
  { id: 'forex', ar: 'العملات', en: 'Forex', family: 'FX', currency: 'Pair', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'GBPJPY'], apiMarket: 'forex' },
  { id: 'crypto', ar: 'الأصول الرقمية', en: 'Crypto', family: 'Digital', currency: 'USD', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD'], tone: 'featured', apiMarket: 'crypto' },
  { id: 'commodities', ar: 'السلع', en: 'Commodities', family: 'Macro', currency: 'USD', symbols: ['XAUUSD', 'XAGUSD', 'WTI', 'BRENT'], apiMarket: 'commodities' },
  { id: 'indices', ar: 'المؤشرات', en: 'Indices', family: 'Benchmarks', currency: 'Local', symbols: ['US30', 'NAS100', 'SPX500', 'DAX', 'FTSE', 'CAC40', 'NIKKEI', 'HSI', 'DXY'], apiMarket: 'indices' },
  { id: 'etfs', ar: 'الصناديق المتداولة', en: 'ETFs', family: 'Funds', currency: 'USD', symbols: ['SPY', 'QQQ', 'VOO', 'DIA', 'IWM', 'GLD'], apiMarket: 'etfs' },
  { id: 'saudi', ar: 'السوق السعودي', en: 'Saudi Market', family: 'Tadawul', currency: 'SAR', symbols: ['2222.SR', '1120.SR', '7010.SR', '1180.SR', '2010.SR', '1211.SR', '1010.SR', '1150.SR', '5110.SR', '2280.SR', '7020.SR', '7030.SR', '4190.SR', '2050.SR', '2350.SR', '4013.SR', '8210.SR', '4030.SR'], apiMarket: 'saudi' },
  { id: 'kuwait', ar: 'بورصة الكويت', en: 'Kuwait Market', family: 'Boursa', currency: 'KWD', symbols: ['KFH.KW', 'NBK.KW', 'ZAIN.KW', 'BOUBYAN.KW', 'GBK.KW', 'BURG.KW', 'CBK.KW', 'AGLTY.KW', 'KIB.KW', 'WARBA.KW', 'MABANEE.KW', 'HUMANSOFT.KW', 'STC.KW', 'ALIMTIAZ.KW'], apiMarket: 'kuwait' },
  { id: 'uae', ar: 'سوق الإمارات', en: 'UAE Market', family: 'ADX/DFM', currency: 'AED', symbols: ['EMAAR.AE', 'FAB.AE', 'ETISALAT.AE', 'ADCB.AE', 'DIB.AE', 'ENBD.AE', 'ALDAR.AE', 'ADIB.AE', 'DEWA.AE', 'SALIK.AE', 'ADNOCDIST.AE', 'DFM.AE', 'AIRARABIA.AE'], apiMarket: 'uae' },
  { id: 'qatar', ar: 'سوق قطر', en: 'Qatar Market', family: 'QSE', currency: 'QAR', symbols: ['QNBK.QA', 'IQCD.QA', 'QIBK.QA', 'CBQK.QA', 'MARK.QA', 'QEWS.QA', 'ORDS.QA', 'QGTS.QA', 'QFLS.QA', 'BRES.QA', 'GWCS.QA', 'DUKHAN.QA'], apiMarket: 'qatar' },
  { id: 'bahrain', ar: 'سوق البحرين', en: 'Bahrain Market', family: 'BHB', currency: 'BHD', symbols: ['AUB.BH', 'GFH.BH', 'BATELCO.BH'], apiMarket: 'bahrain' },
  { id: 'oman', ar: 'سوق عمان', en: 'Oman Market', family: 'MSX', currency: 'OMR', symbols: ['BKMB.OM', 'OMINV.OM'], apiMarket: 'oman' },
  { id: 'europe', ar: 'الأسهم الأوروبية', en: 'European Markets', family: 'Global', currency: 'EUR', symbols: ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L'], apiMarket: 'europe' },
  { id: 'asia', ar: 'الأسواق الآسيوية', en: 'Asian Markets', family: 'Global', currency: 'Mixed', symbols: ['7203.T', '9988.HK', 'TSM', '005930.KS'], apiMarket: 'asia' },
  { id: 'technology', ar: 'أسهم التقنية', en: 'Technology', family: 'Sector', currency: 'USD', symbols: ['AAPL', 'MSFT', 'GOOGL', 'ORCL', 'CRM'], apiMarket: 'technology' },
  { id: 'ai', ar: 'أسهم الذكاء الاصطناعي', en: 'AI Stocks', family: 'Sector', currency: 'USD', symbols: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'PLTR'], tone: 'featured', apiMarket: 'ai' },
  { id: 'semiconductors', ar: 'أشباه الموصلات', en: 'Semiconductors', family: 'Sector', currency: 'USD', symbols: ['NVDA', 'AMD', 'TSM', 'AVGO', 'INTC'], apiMarket: 'semiconductors' },
  { id: 'energy', ar: 'الطاقة', en: 'Energy Stocks', family: 'Sector', currency: 'Mixed', symbols: ['XOM', 'CVX', '2222.SR', 'OXY'], apiMarket: 'energy' },
  { id: 'banking', ar: 'البنوك', en: 'Banking Stocks', family: 'Sector', currency: 'Mixed', symbols: ['JPM', 'BAC', 'NBK.KW', 'QNBK.QA'], apiMarket: 'banking' },
  { id: 'food', ar: 'الأغذية والاستهلاك', en: 'Food / Consumer', family: 'Sector', currency: 'USD', symbols: ['KO', 'PEP', 'MCD', 'COST'], apiMarket: 'food' },
  { id: 'healthcare', ar: 'الصحة والدواء', en: 'Pharma / Healthcare', family: 'Sector', currency: 'USD', symbols: ['LLY', 'PFE', 'JNJ', 'MRK'], apiMarket: 'healthcare' },
];

const SEED_SYMBOL_NAMES: Record<string, string> = {
  US30: 'Dow Jones Industrial Average',
  NAS100: 'Nasdaq 100',
  SPX500: 'S&P 500',
  DAX: 'DAX Index',
  FTSE: 'FTSE 100',
  CAC40: 'CAC 40',
  NIKKEI: 'Nikkei 225',
  HSI: 'Hang Seng Index',
  DXY: 'US Dollar Index',
  WTI: 'WTI Crude Oil',
  BRENT: 'Brent Crude Oil',
};

const STATIC_SOURCE_RECORDS: Array<{ records: RawSymbolRecord[]; source: 'bundled' | 'seed' }> = [
  { records: staticUsSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: legacyMarketSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: boursaKuwaitSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: cryptoSymbols as RawSymbolRecord[], source: 'bundled' },
  { records: dfmListedSymbols as RawSymbolRecord[], source: 'bundled' },
];

const MARKET_ID_SET = new Set(TRADER_MARKET_SEEDS.map(market => market.id));
const catalogCache = new Map<string, { expiresAt: number; staleUntil: number; value: TraderMarketCatalog }>();

function upper(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function nullableText(value: unknown) {
  return text(value) || null;
}

function booleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function screeningDataOrNull(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as ShariahScreeningData
    : null;
}

function catalogShariahClassification(symbol: TraderCatalogSymbol): ShariahClassification {
  return {
    shariahStatus: symbol.shariahStatus,
    shariahReason: symbol.shariahReason,
    shariahSource: symbol.shariahSource,
    shariahLastReviewedAt: symbol.shariahLastReviewedAt,
    shariahManualOverride: symbol.shariahManualOverride,
    shariahReviewedBy: symbol.shariahReviewedBy,
    shariahScreeningData: symbol.shariahScreeningData,
    shariahMethod: symbol.shariahMethod,
  };
}

function uniq(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = text(value);
    const key = item.toUpperCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function seedSymbolsForMarket(market: Pick<SeedMarket | TraderMarketDef, 'id' | 'symbols'>) {
  return uniq([...(market.symbols ?? []), ...(EXPANDED_MARKET_SYMBOLS[market.id] ?? [])]);
}

function seedAssetTypeForMarket(marketId: string): TraderAssetType | undefined {
  if (marketId === 'crypto') return 'crypto';
  if (marketId === 'forex') return 'forex';
  if (marketId === 'commodities') return 'commodity';
  if (marketId === 'indices') return 'index';
  if (marketId === 'etfs') return 'fund';
  return undefined;
}

const SECTOR_MARKET_IDS = new Set(
  TRADER_MARKET_SEEDS
    .filter(market => market.family.toLowerCase() === 'sector')
    .map(market => market.id),
);

const SECTOR_CLASSIFICATION_PATTERNS: Record<string, RegExp[]> = {
  semiconductors: [
    /\bSEMICONDUCTORS?\b/,
    /\bSEMICONDUCTOR EQUIPMENT\b/,
    /\bSEMICONDUCTOR MATERIALS?\b/,
    /\bSEMICONDUCTOR DEVICES?\b/,
    /\bELECTRONIC COMPONENTS?\b/,
    /\bINTEGRATED CIRCUITS?\b/,
    /\bCHIP(?:S|MAKER|MAKERS)?\b/,
  ],
  technology: [
    /\bTECHNOLOGY\b/,
    /\bINFORMATION TECHNOLOGY\b/,
    /\bSOFTWARE\b/,
    /\bCLOUD\b/,
    /\bCYBERSECURITY\b/,
    /\bSEMICONDUCTORS?\b/,
    /\bELECTRONIC COMPONENTS?\b/,
  ],
  ai: [
    /\bARTIFICIAL INTELLIGENCE\b/,
    /\bMACHINE LEARNING\b/,
    /\bDATA ANALYTICS?\b/,
    /\bGENERATIVE AI\b/,
  ],
  energy: [
    /\bENERGY\b/,
    /\bOIL\b/,
    /\bGAS\b/,
    /\bPETROLEUM\b/,
    /\bREFINING\b/,
  ],
  banking: [
    /\bBANKS?\b/,
    /\bBANKING\b/,
    /\bFINANCIAL SERVICES?\b/,
    /\bCAPITAL MARKETS?\b/,
  ],
  food: [
    /\bFOOD\b/,
    /\bBEVERAGES?\b/,
    /\bCONSUMER STAPLES?\b/,
    /\bRESTAURANTS?\b/,
  ],
  healthcare: [
    /\bHEALTH\s?CARE\b/,
    /\bPHARMA(?:CEUTICALS?)?\b/,
    /\bBIOTECH(?:NOLOGY)?\b/,
    /\bMEDICAL\b/,
  ],
};

function withMarketMetadata<T extends SeedMarket | TraderMarketDef>(market: T): T {
  const metadata = TRADER_MARKET_METADATA[market.id];
  if (!metadata) return market;
  return {
    ...market,
    ar: metadata.labelAr,
    en: metadata.labelEn,
    currency: metadata.currency,
  };
}

function defaultCurrency(symbol: string): string | undefined {
  if (/\.KW$/.test(symbol)) return 'KWD';
  if (/\.SR$|\.SA$/.test(symbol)) return 'SAR';
  if (/\.AE$|\.DU$|\.AD$/.test(symbol)) return 'AED';
  if (/\.QA$/.test(symbol)) return 'QAR';
  if (/\.OM$/.test(symbol)) return 'OMR';
  if (/\.BH$/.test(symbol)) return 'BHD';
  if (/\.L$/.test(symbol)) return 'GBP';
  if (/\.CO$/.test(symbol)) return 'DKK';
  if (/\.SW$/.test(symbol)) return 'CHF';
  if (/\.T$|^NIKKEI$/.test(symbol)) return 'JPY';
  if (/\.TW$/.test(symbol)) return 'TWD';
  if (/\.KS$/.test(symbol)) return 'KRW';
  if (/\.HK$|^HSI$/.test(symbol)) return 'HKD';
  if (/\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|^DAX$|^CAC40$/.test(symbol)) return 'EUR';
  if (/^[A-Z]{6}$/.test(symbol)) return symbol.slice(3);
  return 'USD';
}

function traderAssetType(value: unknown, symbol: string): TraderAssetType {
  const normalized = normalizeAssetType(value);
  if (normalized === 'etf') return 'fund';
  if (normalized === 'gold' || normalized === 'commodity') return 'commodity';
  if (normalized === 'crypto' || normalized === 'forex' || normalized === 'index') return normalized;
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|AVAX|DOT|LTC|BCH|LINK)(?:USD|-USD)?$/.test(symbol)) return 'crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(symbol)) return 'commodity';
  if (/^(US30|NAS100|SPX500|DAX|FTSE|CAC40|NIKKEI|HSI|DXY|\^)/.test(symbol)) return 'index';
  return 'stock';
}

function suffix(symbol: string) {
  return symbol.match(/\.([A-Z]{1,3})$/)?.[1] ?? '';
}

function marketIdsForRecord(record: {
  symbol: string;
  assetType: TraderAssetType;
  exchange?: string;
  market?: string;
  country?: string;
  name?: string;
  sector?: string;
  industry?: string;
}) {
  const ids = new Set<string>();
  const symbol = record.symbol;
  const suff = suffix(symbol);
  const exchange = upper(record.exchange);
  const country = upper(record.country);
  const market = upper(record.market);
  const classification = `${upper(record.sector)} ${upper(record.industry)}`.trim();
  const haystack = `${symbol} ${exchange} ${market} ${country} ${upper(record.name)} ${classification}`;
  const venueHaystack = `${symbol} ${exchange} ${market} ${country}`;

  if (record.assetType === 'fund') ids.add('etfs');
  if (record.assetType === 'crypto') ids.add('crypto');
  if (record.assetType === 'forex') ids.add('forex');
  if (record.assetType === 'commodity') ids.add('commodities');
  if (record.assetType === 'index') ids.add('indices');
  if (record.assetType === 'stock' && (country === 'US' || /NASDAQ|NYSE|AMEX|CBOE/.test(exchange) || !suff)) ids.add('us-stocks');

  if (suff === 'KW' || /KUWAIT|BOURSA/.test(venueHaystack)) ids.add('kuwait');
  if (suff === 'SR' || suff === 'SA' || /SAUDI|TADAWUL/.test(venueHaystack)) ids.add('saudi');
  if (suff === 'AE' || suff === 'DU' || suff === 'AD' || /DUBAI|ABU DHABI|UAE|UNITED ARAB/.test(venueHaystack)) ids.add('uae');
  if (suff === 'QA' || /QATAR/.test(venueHaystack)) ids.add('qatar');
  if (suff === 'BH' || /BAHRAIN/.test(venueHaystack)) ids.add('bahrain');
  if (suff === 'OM' || /OMAN|MUSCAT/.test(venueHaystack)) ids.add('oman');

  if (/\.L$|\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|\.SW$|\.CO$|EUROPE|LONDON|XETRA|EURONEXT|PARIS|MILAN|MADRID|AMSTERDAM|SWISS|GERMANY|FRANCE|UNITED KINGDOM|ITALY|SPAIN|NETHERLANDS|DENMARK/.test(haystack)) ids.add('europe');
  if (/\.T$|\.HK$|\.KS$|\.TW$|ASIA|TOKYO|HONG KONG|KOREA|JAPAN|TAIWAN|SHANGHAI|SHENZHEN/.test(haystack)) ids.add('asia');

  for (const market of TRADER_MARKET_SEEDS) {
    if (seedSymbolsForMarket(market).map(upper).includes(symbol)) ids.add(market.id);
  }

  if (classification) {
    for (const [marketId, patterns] of Object.entries(SECTOR_CLASSIFICATION_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(classification))) ids.add(marketId);
    }
  }

  return Array.from(ids).filter(id => MARKET_ID_SET.has(id));
}

function providerSymbolsFor(symbol: string, assetType: TraderAssetType, providerSymbol?: string) {
  const normalizedAssetType: MarketAssetType = assetType === 'fund' ? 'etf' : assetType === 'commodity' ? 'commodity' : assetType;
  const alias = resolveProviderSymbolAlias(symbol, normalizedAssetType);
  const fmpAlias = providerSymbolsForProviderAlias(symbol, 'fmp', normalizedAssetType);
  const yahooAlias = providerSymbolsForProviderAlias(symbol, 'yahoo', normalizedAssetType);
  const finnhubAlias = providerSymbolsForProviderAlias(symbol, 'finnhub', normalizedAssetType);
  const base = providerSymbol || alias?.displaySymbol || symbol;
  const compactCrypto = symbol.replace(/[/-]/g, '').replace(/USD$/, '');

  return {
    fmp: uniq([...(fmpAlias.length ? fmpAlias : []), providerSymbol, base, assetType === 'crypto' ? `${compactCrypto}USD` : null]),
    yahoo: uniq([...(yahooAlias.length ? yahooAlias : []), providerSymbol, base, assetType === 'crypto' ? `${compactCrypto}-USD` : null]),
    openbb: uniq([providerSymbol, base]),
    finnhub: uniq([...(finnhubAlias.length ? finnhubAlias : []), providerSymbol, base]),
    twelve_data: uniq([providerSymbol, base]),
    eodhd: uniq([providerSymbol, base]),
    marketstack: uniq([providerSymbol, base]),
  };
}

function symbolFromRecord(record: RawSymbolRecord, fallback?: string) {
  return upper(record.display_symbol ?? record.displaySymbol ?? record.symbol ?? record.ticker ?? fallback);
}

function normalizeRecord(record: RawSymbolRecord, source: TraderCatalogSource, fallbackMarketIds: string[] = []): TraderCatalogSymbol | null {
  const symbol = symbolFromRecord(record);
  if (!symbol) return null;
  const providerSymbol = upper(record.provider_symbol ?? record.providerSymbol ?? record.symbol ?? symbol) || symbol;
  const assetType = traderAssetType(record.asset_type ?? record.assetType ?? record.type, symbol);
  const metadata = normalizeTraderSymbolMetadata({
    symbol,
    provider: source,
    providerSymbol,
    assetType,
    catalog: record,
  });
  const name = text(metadata.companyName ?? record.company_name_en ?? record.name ?? record.companyName ?? record.company_name_ar ?? SEED_SYMBOL_NAMES[symbol] ?? symbol);
  const exchange = text(metadata.exchange ?? record.exchange ?? record.exchangeShortName ?? record.market);
  const exchangeCode = text(metadata.exchangeCode ?? record.exchange_code ?? record.exchangeCode);
  const market = text(metadata.market ?? record.market);
  const country = text(metadata.country ?? record.country);
  const currency = upper(metadata.currency ?? record.currency) || defaultCurrency(symbol);
  const sector = text(record.sector);
  const industry = text(record.industry);
  const marketIds = uniq([...fallbackMarketIds, ...marketIdsForRecord({ symbol, assetType, exchange, market, country, name, sector, industry })]);
  const shariah = classifyShariahCompliance({
    symbol,
    name,
    assetType,
    exchange,
    country,
    sector,
    industry,
    businessDescription: text(record.description ?? record.businessDescription),
    shariahStatus: nullableText(record.shariah_status ?? record.shariahStatus),
    shariahReason: nullableText(record.shariah_reason ?? record.shariahReason),
    shariahSource: nullableText(record.shariah_source ?? record.shariahSource),
    shariahLastReviewedAt: nullableText(record.shariah_last_reviewed_at ?? record.shariahLastReviewedAt),
    shariahManualOverride: booleanOrNull(record.shariah_manual_override ?? record.shariahManualOverride),
    shariahReviewedBy: nullableText(record.shariah_reviewed_by ?? record.shariahReviewedBy),
    shariahScreeningData: screeningDataOrNull(record.shariah_screening_data ?? record.shariahScreeningData),
  });

  return {
    symbol,
    providerSymbol,
    providerSymbols: providerSymbolsFor(symbol, assetType, providerSymbol),
    name,
    assetType,
    sector: sector || undefined,
    industry: industry || undefined,
    exchange: exchange || undefined,
    exchangeCode: exchangeCode || undefined,
    market: market || undefined,
    country: country || undefined,
    currency,
    aliases: uniq([symbol, providerSymbol, name, exchange, exchangeCode, market, ...(Array.isArray(record.aliases) ? record.aliases : [])]),
    marketIds,
    source,
    metadataDiagnostics: metadata.diagnostics,
    ...shariahClassificationFields(shariah),
  };
}

function mergeSymbol(target: TraderCatalogSymbol, next: TraderCatalogSymbol) {
  target.marketIds = uniq([...target.marketIds, ...next.marketIds]);
  target.aliases = uniq([...target.aliases, ...next.aliases]);
  const preferNextMetadata = next.source === 'supabase' || target.source === 'seed' || target.source === 'fmp';
  if (preferNextMetadata && next.exchange) target.exchange = next.exchange;
  else target.exchange ||= next.exchange;
  if (preferNextMetadata && next.exchangeCode) target.exchangeCode = next.exchangeCode;
  else target.exchangeCode ||= next.exchangeCode;
  if (preferNextMetadata && next.market) target.market = next.market;
  else target.market ||= next.market;
  if (preferNextMetadata && next.country) target.country = next.country;
  else target.country ||= next.country;
  if (preferNextMetadata && next.currency) target.currency = next.currency;
  else target.currency ||= next.currency;
  if (preferNextMetadata && next.assetType) target.assetType = next.assetType;
  if (preferNextMetadata && next.sector) target.sector = next.sector;
  else target.sector ||= next.sector;
  if (preferNextMetadata && next.industry) target.industry = next.industry;
  else target.industry ||= next.industry;
  target.name = (preferNextMetadata || target.name === target.symbol) && next.name !== next.symbol ? next.name : target.name;
  target.providerSymbol = preferNextMetadata && next.providerSymbol ? next.providerSymbol : target.providerSymbol || next.providerSymbol;
  if (preferNextMetadata || !target.metadataDiagnostics.finalExchange) target.metadataDiagnostics = next.metadataDiagnostics;
  const shariah = pickPreferredShariahClassification(catalogShariahClassification(target), catalogShariahClassification(next));
  Object.assign(target, shariahClassificationFields(shariah));
  for (const provider of ['fmp', 'yahoo', 'openbb', 'finnhub', 'twelve_data', 'eodhd', 'marketstack'] as TraderQuoteProvider[]) {
    target.providerSymbols[provider] = uniq([...(target.providerSymbols[provider] ?? []), ...(next.providerSymbols[provider] ?? [])]);
  }
  if (target.source !== next.source) {
    target.source = next.source === 'supabase'
      ? 'supabase'
      : target.source === 'supabase'
        ? 'supabase'
        : target.source === 'bundled' || next.source === 'bundled'
          ? 'bundled'
          : target.source === 'fmp' || next.source === 'fmp'
            ? 'fmp'
            : 'seed';
  }
}

function catalogRecordKey(record: TraderCatalogSymbol) {
  return [
    upper(record.providerSymbol || record.symbol),
    upper(record.exchange),
    upper(record.currency),
  ].join('|');
}

function addRecord(map: Map<string, TraderCatalogSymbol>, record: TraderCatalogSymbol | null) {
  if (!record) return;
  const key = catalogRecordKey(record);
  const existing = map.get(key);
  if (existing) mergeSymbol(existing, record);
  else map.set(key, record);
}

function seedRecords() {
  const records: TraderCatalogSymbol[] = [];
  for (const market of TRADER_MARKET_SEEDS) {
    for (const symbol of seedSymbolsForMarket(market)) {
      records.push(normalizeRecord({
        symbol,
        providerSymbol: symbol,
        name: SEED_SYMBOL_NAMES[upper(symbol)] ?? symbol,
        assetType: seedAssetTypeForMarket(market.id),
        currency: market.currency === 'Mixed' || market.currency === 'Local' || market.currency === 'Pair' ? defaultCurrency(upper(symbol)) : market.currency,
      }, 'seed', [market.id])!);
    }
  }
  return records.filter(Boolean);
}

function sanitizeFmpDiscoveryReason(error: unknown) {
  if (error instanceof FmpRateLimitError) return 'provider_rate_limited';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/rate_limited|http_429|429/.test(message)) return 'provider_rate_limited';
  if (/not_configured/.test(message)) return 'fmp_not_configured';
  if (/timeout|aborted|network/i.test(message)) return 'provider_temporarily_unavailable';
  return 'fmp_discovery_failed';
}

function fmpDiscoveryEndpoints(marketId?: string | null) {
  const normalized = String(marketId ?? '').trim().toLowerCase();
  const all = [
    { endpoint: 'stock-list', assetType: undefined },
    { endpoint: 'etf-list', assetType: 'etf' },
    { endpoint: 'indexes-list', assetType: 'index' },
    { endpoint: 'batch-forex-quotes', assetType: 'forex' },
    { endpoint: 'batch-crypto-quotes', assetType: 'crypto' },
    { endpoint: 'batch-commodity-quotes', assetType: 'commodity' },
  ] as const;

  if (normalized === 'etfs') return all.filter(item => item.endpoint === 'etf-list');
  if (normalized === 'indices') return all.filter(item => item.endpoint === 'indexes-list');
  if (normalized === 'forex') return all.filter(item => item.endpoint === 'batch-forex-quotes');
  if (normalized === 'crypto') return all.filter(item => item.endpoint === 'batch-crypto-quotes');
  if (normalized === 'commodities') return all.filter(item => item.endpoint === 'batch-commodity-quotes');
  if (normalized) return all.filter(item => item.endpoint === 'stock-list');
  return [];
}

function getSupabaseCatalogClient() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchSupabaseCatalogSymbols() {
  const supabase = getSupabaseCatalogClient();
  if (!supabase) {
    return {
      records: [] as TraderCatalogSymbol[],
      latencyMs: null as number | null,
      failed: [] as CatalogDiagnostics['failedSymbols'],
      reason: 'supabase_not_configured',
    };
  }

  const startedAt = Date.now();
  const selectors = [
    'symbol,provider_symbol,name,asset_type,exchange,exchange_code,market,display_symbol,company_name_ar,company_name_en,country,currency,source,is_active,metadata,sector,industry,description,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data',
    'symbol,provider_symbol,name,asset_type,exchange,market,display_symbol,company_name_ar,company_name_en,country,currency,source,is_active,sector,industry,description,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data',
    'symbol,provider_symbol,name,asset_type,exchange,country,currency,source,is_active',
  ];

  for (const selector of selectors) {
    const { data, error } = await supabase
      .from('market_symbols')
      .select(selector)
      .eq('is_active', true)
      .limit(5000);
    if (error) continue;
    const rows = Array.isArray(data) ? data as unknown as RawSymbolRecord[] : [];
    return {
      records: rows.map(row => normalizeRecord(row, 'supabase')).filter((row): row is TraderCatalogSymbol => Boolean(row)),
      latencyMs: Date.now() - startedAt,
      failed: [] as CatalogDiagnostics['failedSymbols'],
      reason: null as string | null,
    };
  }

  return {
    records: [] as TraderCatalogSymbol[],
    latencyMs: Date.now() - startedAt,
    failed: [{ symbol: 'market_symbols', provider: 'supabase', reason: 'supabase_market_symbols_query_failed' }],
    reason: 'supabase_market_symbols_query_failed',
  };
}

async function fetchFmpEndpoint(endpoint: string, apiKey: string) {
  const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
  url.searchParams.set('apikey', apiKey);
  const startedAt = Date.now();
  const response = await fmpQueuedFetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FMP_DISCOVERY_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    if (response.status === 429) throw new FmpRateLimitError();
    throw new Error(`fmp_discovery_http_${response.status}`);
  }
  markFmpCacheAvailable(`symbols:${endpoint}`);
  return {
    data: Array.isArray(payload) ? payload as RawSymbolRecord[] : [],
    latencyMs: Date.now() - startedAt,
  };
}

async function discoverFmpSymbols(options: { marketId?: string | null } = {}) {
  const apiKey = cleanEnv(process.env.FMP_API_KEY);
  if (!apiKey) {
    return {
      records: [] as TraderCatalogSymbol[],
      latencyMs: null as number | null,
      failed: [] as CatalogDiagnostics['failedSymbols'],
      reason: 'fmp_not_configured',
      rateLimited: false,
    };
  }

  const endpoints = fmpDiscoveryEndpoints(options.marketId);
  if (endpoints.length === 0) {
    return {
      records: [] as TraderCatalogSymbol[],
      latencyMs: null as number | null,
      failed: [] as CatalogDiagnostics['failedSymbols'],
      reason: 'fmp_discovery_skipped',
      rateLimited: false,
    };
  }
  const records: TraderCatalogSymbol[] = [];
  const failed: CatalogDiagnostics['failedSymbols'] = [];
  let latencyMs = 0;
  let rateLimited = false;

  for (const { endpoint, assetType } of endpoints) {
    try {
      const result = await fetchFmpEndpoint(endpoint, apiKey);
      latencyMs += result.latencyMs;
      result.data.forEach(item => {
        const normalized = normalizeRecord({
          ...item,
          assetType: assetType ?? item.type,
        }, 'fmp');
        if (normalized) records.push(normalized);
      });
    } catch (error) {
      const reason = sanitizeFmpDiscoveryReason(error);
      failed.push({ symbol: endpoint, provider: 'fmp', reason });
      if (reason === 'provider_rate_limited') {
        rateLimited = true;
        break;
      }
    }
  }

  return {
    records,
    latencyMs: latencyMs || null,
    failed,
    reason: rateLimited ? 'provider_rate_limited' : failed.length === endpoints.length ? 'fmp_discovery_failed' : null,
    rateLimited,
  };
}

function capabilityMatrix(cacheAvailable = false) {
  const fmpConfigured = Boolean(cleanEnv(process.env.FMP_API_KEY));
  const finnhubConfigured = Boolean(cleanEnv(process.env.FINNHUB_API_KEY));
  const twelveDataConfigured = Boolean(cleanEnv(process.env.TWELVE_DATA_API_KEY));
  const eodhdConfigured = Boolean(cleanEnv(process.env.EODHD_API_KEY));
  const marketstackConfigured = Boolean(cleanEnv(process.env.MARKETSTACK_API_KEY));
  const fmpStatus = getFmpRuntimeStatus(fmpConfigured, cacheAvailable);
  const openbbStatus = getOpenbbConfiguredStatus();
  const configuredCapability = (provider: TraderQuoteProvider, configured: boolean, supports: Partial<ProviderCapability> = {}): ProviderCapability => ({
    provider,
    configured,
    healthy: configured,
    status: configured ? 'healthy' : 'not_configured',
    rateLimited: false,
    lastSuccessfulFetch: null,
    lastError: configured ? null : `${provider}_not_configured`,
    cacheAvailable: false,
    supportsQuotes: true,
    supportsTechnicalAnalysis: true,
    supportsEarnings: false,
    supportsDividends: false,
    supportsIpos: false,
    supportsEconomicCalendar: false,
    reason: configured ? null : `${provider}_not_configured`,
    ...supports,
  });
  return {
    twelve_data: configuredCapability('twelve_data', twelveDataConfigured, {
      supportsTechnicalAnalysis: true,
    }),
    finnhub: configuredCapability('finnhub', finnhubConfigured, {
      supportsTechnicalAnalysis: true,
      supportsEarnings: true,
      supportsDividends: true,
      supportsEconomicCalendar: true,
    }),
    eodhd: configuredCapability('eodhd', eodhdConfigured, {
      supportsTechnicalAnalysis: true,
      supportsDividends: true,
    }),
    marketstack: configuredCapability('marketstack', marketstackConfigured, {
      supportsTechnicalAnalysis: false,
    }),
    fmp: {
      provider: 'fmp',
      configured: fmpConfigured,
      healthy: fmpStatus.healthy,
      status: fmpStatus.status,
      rateLimited: fmpStatus.rateLimited,
      lastSuccessfulFetch: fmpStatus.lastSuccessfulFetch,
      lastError: fmpStatus.lastError,
      cacheAvailable: fmpStatus.cacheAvailable,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: true,
      supportsDividends: true,
      supportsIpos: true,
      supportsEconomicCalendar: true,
      reason: fmpConfigured ? fmpStatus.lastError : 'fmp_not_configured',
    },
    yahoo: {
      provider: 'yahoo',
      configured: true,
      healthy: true,
      status: 'healthy',
      rateLimited: false,
      lastSuccessfulFetch: null,
      lastError: null,
      cacheAvailable,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: false,
      supportsDividends: false,
      supportsIpos: false,
      supportsEconomicCalendar: false,
      reason: null,
    },
    openbb: {
      provider: 'openbb',
      configured: openbbStatus.configured,
      healthy: openbbStatus.healthy,
      status: openbbStatus.status,
      rateLimited: false,
      lastSuccessfulFetch: openbbStatus.lastSuccessfulFetch,
      lastError: openbbStatus.lastError,
      cacheAvailable: openbbStatus.cacheAvailable,
      supportsQuotes: true,
      supportsTechnicalAnalysis: true,
      supportsEarnings: false,
      supportsDividends: false,
      supportsIpos: false,
      supportsEconomicCalendar: false,
      reason: openbbStatus.configured ? openbbStatus.lastError : 'openbb_not_configured',
    },
  } satisfies Record<TraderQuoteProvider, ProviderCapability>;
}

function buildMarkets(symbols: TraderCatalogSymbol[]): TraderMarketDef[] {
  return TRADER_MARKET_SEEDS.map(seed => {
    const expandedSeedSymbols = seedSymbolsForMarket(seed);
    const seedOrder = new Map(expandedSeedSymbols.map((symbol, index) => [upper(symbol), index]));
    const marketSymbols = symbols
      .filter(symbol => symbol.marketIds.includes(seed.id))
      .sort((a, b) => {
        const ai = seedOrder.get(a.symbol) ?? Number.MAX_SAFE_INTEGER;
        const bi = seedOrder.get(b.symbol) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi || a.symbol.localeCompare(b.symbol);
      })
      .map(symbol => symbol.symbol);
    const sources = new Set(symbols.filter(symbol => symbol.marketIds.includes(seed.id)).map(symbol => symbol.source));
    const metadataSeed = withMarketMetadata(seed);
    return {
      ...metadataSeed,
      symbols: marketSymbols,
      source: sources.size > 1 ? 'mixed' : (Array.from(sources)[0] ?? 'seed') as TraderMarketDef['source'],
      totalSymbols: marketSymbols.length,
    };
  });
}

function catalogCacheKey(options: { includeFmpDiscovery?: boolean; marketId?: string | null }) {
  return [
    options.includeFmpDiscovery ? 'fmp' : 'bundled',
    String(options.marketId ?? '').trim().toLowerCase() || 'all',
  ].join(':');
}

export async function getTraderMarketCatalog(options: { forceFresh?: boolean; includeFmpDiscovery?: boolean; marketId?: string | null } = {}): Promise<TraderMarketCatalog> {
  const now = Date.now();
  const key = catalogCacheKey(options);
  const cached = catalogCache.get(key);
  if (!options.forceFresh && cached && cached.expiresAt > now) {
    return {
      ...cached.value,
      diagnostics: {
        ...cached.value.diagnostics,
        cacheStatus: 'hit',
      },
    };
  }

  const bySymbol = new Map<string, TraderCatalogSymbol>();
  seedRecords().forEach(record => addRecord(bySymbol, record));
  for (const group of STATIC_SOURCE_RECORDS) {
    group.records.forEach(record => addRecord(bySymbol, normalizeRecord(record, group.source)));
  }

  const supabase = await fetchSupabaseCatalogSymbols();
  supabase.records.forEach(record => addRecord(bySymbol, record));

  const fmp = options.includeFmpDiscovery
    ? await discoverFmpSymbols({ marketId: options.marketId })
    : {
        records: [] as TraderCatalogSymbol[],
        latencyMs: null as number | null,
        failed: [] as CatalogDiagnostics['failedSymbols'],
        reason: 'fmp_discovery_skipped',
        rateLimited: false,
      };

  if (fmp.rateLimited && cached && cached.staleUntil > now) {
    return {
      ...cached.value,
      diagnostics: {
        ...cached.value.diagnostics,
        reason: 'provider_rate_limited',
        failedSymbols: fmp.failed,
        cacheStatus: 'stale',
        summary: {
          ...cached.value.diagnostics.summary,
          cachedSymbols: cached.value.symbols.length,
          failedSymbols: fmp.failed.length,
          skippedDueToRateLimit: getFmpRuntimeStatus(Boolean(cleanEnv(process.env.FMP_API_KEY)), true).skippedDueToRateLimit,
          fmpStatus: 'rate_limited',
          openbbStatus: getOpenbbConfiguredStatus().status,
        },
      },
    };
  }

  fmp.records.forEach(record => addRecord(bySymbol, record));

  const allSymbols = Array.from(bySymbol.values())
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
  const symbols = allSymbols.filter(symbol => symbol.marketIds.length > 0);
  const markets = buildMarkets(symbols);
  const sources = symbols.reduce<Record<string, number>>((acc, symbol) => {
    acc[symbol.source] = (acc[symbol.source] ?? 0) + 1;
    return acc;
  }, {});
  const fmpRuntime = getFmpRuntimeStatus(Boolean(cleanEnv(process.env.FMP_API_KEY)), Boolean(cached));
  const diagnostics: CatalogDiagnostics = {
    provider: supabase.records.length ? 'supabase' : cleanEnv(process.env.FMP_API_KEY) ? 'fmp' : 'bundled',
    reason: fmp.reason ?? supabase.reason,
    totalSymbolsDiscovered: allSymbols.length,
    totalSymbolsLoaded: symbols.length,
    failedSymbols: [...supabase.failed, ...fmp.failed],
    unsupportedSymbols: allSymbols
      .filter(symbol => symbol.marketIds.length === 0)
      .map(symbol => ({ symbol: symbol.symbol, provider: symbol.source, reason: 'no_supported_market_mapping' })),
    providerLatencyMs: {
      supabase: supabase.latencyMs,
      fmp: fmp.latencyMs,
    },
    cacheStatus: options.includeFmpDiscovery ? 'miss' : 'disabled',
    summary: {
      loadedSymbols: symbols.length,
      failedSymbols: supabase.failed.length + fmp.failed.length,
      cachedSymbols: cached?.value.symbols.length ?? 0,
      skippedDueToRateLimit: fmpRuntime.skippedDueToRateLimit,
      fmpStatus: fmpRuntime.status,
      openbbStatus: getOpenbbConfiguredStatus().status,
    },
    sources,
    generatedAt: new Date().toISOString(),
  };
  const value: TraderMarketCatalog = {
    markets,
    symbols,
    diagnostics,
    capabilityMatrix: capabilityMatrix(Boolean(cached)),
  };
  catalogCache.set(key, { expiresAt: now + CATALOG_CACHE_MS, staleUntil: now + CATALOG_STALE_MS, value });
  return value;
}

export type TraderUniverseCategory = TraderAssetType | 'all';

export type TraderSymbolUniverseEntry = {
  symbol: string;
  displaySymbol: string;
  name: string;
  companyName: string;
  selectedMarket: string | null;
  selectedSector: string | null;
  exchange?: string;
  market?: string;
  country?: string;
  currency?: string;
  assetType: TraderAssetType;
  providerSymbol: string;
  source: TraderCatalogSource;
  sector?: string;
  industry?: string;
  marketIds: string[];
};

export type TraderSymbolUniverseResult = {
  selectedMarket: string | null;
  selectedSector: string | null;
  category: TraderUniverseCategory;
  total: number;
  symbols: string[];
  entries: TraderSymbolUniverseEntry[];
  symbolMeta: TraderCatalogSymbol[];
  source: TraderMarketDef['source'] | 'catalog';
};

export type TraderSymbolUniverseQuery = {
  market?: string | null;
  sector?: string | null;
  category?: string | null;
  catalog?: TraderMarketCatalog;
  forceFresh?: boolean;
  includeFmpDiscovery?: boolean;
};

export type FullSymbolUniverseQuery = TraderSymbolUniverseQuery & {
  exchange?: string | null;
  currency?: string | null;
  sectorName?: string | null;
  industry?: string | null;
  assetType?: string | null;
};

const CATEGORY_ALIASES: Record<string, TraderUniverseCategory> = {
  all: 'all',
  'all-assets': 'all',
  stock: 'stock',
  stocks: 'stock',
  equity: 'stock',
  equities: 'stock',
  crypto: 'crypto',
  cryptocurrency: 'crypto',
  forex: 'forex',
  fx: 'forex',
  commodity: 'commodity',
  commodities: 'commodity',
  metals: 'commodity',
  index: 'index',
  indices: 'index',
  fund: 'fund',
  funds: 'fund',
  etf: 'fund',
  etfs: 'fund',
};

function normalizeUniverseCategory(value: string | null | undefined): TraderUniverseCategory {
  const raw = String(value ?? 'all').trim().toLowerCase().replace(/[_\s]+/g, '-');
  return CATEGORY_ALIASES[raw] ?? 'all';
}

function normalizeUniverseFilter(value: string | null | undefined) {
  const raw = text(value);
  if (!raw || ['all', 'any', '*'].includes(raw.toLowerCase())) return '';
  return raw.toUpperCase();
}

function normalizeUniverseMarketId(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'all' || raw === 'global') return null;
  if (['us', 'usa', 'stocks', 'equities', 'equity', 'us stocks', 'us-stocks'].includes(raw)) return 'us-stocks';
  if (['etf', 'etfs', 'fund', 'funds'].includes(raw)) return 'etfs';
  if (['fx', 'forex', 'currency', 'currencies'].includes(raw)) return 'forex';
  if (['crypto', 'cryptocurrency', 'digital assets', 'digital-assets'].includes(raw)) return 'crypto';
  if (/semiconductor|electronic component/.test(raw)) return 'semiconductors';
  const normalized = raw.replace(/[_/]+/g, '-').replace(/\s+/g, '-');
  const byId = TRADER_MARKET_SEEDS.find(market => market.id === normalized || market.apiMarket === normalized);
  if (byId) return byId.id;
  const byLabel = TRADER_MARKET_SEEDS.find(market => (
    market.en.toLowerCase() === raw
    || market.family.toLowerCase() === raw
    || market.en.toLowerCase().replace(/[_/]+/g, '-').replace(/\s+/g, '-') === normalized
  ));
  return byLabel?.id ?? null;
}

function primaryMarketForSymbol(symbol: TraderCatalogSymbol, selectedMarket: string | null) {
  if (selectedMarket && symbol.marketIds.includes(selectedMarket)) return selectedMarket;
  return symbol.marketIds.find(id => !SECTOR_MARKET_IDS.has(id))
    ?? symbol.marketIds.find(id => !SECTOR_MARKET_IDS.has(id))
    ?? null;
}

function primarySectorForSymbol(symbol: TraderCatalogSymbol, selectedSector: string | null) {
  if (selectedSector && symbol.marketIds.includes(selectedSector)) return selectedSector;
  return symbol.marketIds.find(id => SECTOR_MARKET_IDS.has(id)) ?? null;
}

function universeEntry(symbol: TraderCatalogSymbol, selectedMarket: string | null, selectedSector: string | null): TraderSymbolUniverseEntry {
  return {
    symbol: symbol.symbol,
    displaySymbol: symbol.symbol,
    name: symbol.name,
    companyName: symbol.name,
    selectedMarket: primaryMarketForSymbol(symbol, selectedMarket),
    selectedSector: primarySectorForSymbol(symbol, selectedSector),
    exchange: symbol.exchange,
    market: symbol.market,
    country: symbol.country,
    currency: symbol.currency,
    assetType: symbol.assetType,
    providerSymbol: symbol.providerSymbol,
    source: symbol.source,
    sector: symbol.sector,
    industry: symbol.industry,
    marketIds: symbol.marketIds,
  };
}

function sortUniverseSymbols(symbols: TraderCatalogSymbol[], selectedMarket: string | null, selectedSector: string | null) {
  const preferredIds = uniq([selectedMarket, selectedSector]);
  const order = new Map<string, number>();
  for (const marketId of preferredIds) {
    const seed = TRADER_MARKET_SEEDS.find(market => market.id === marketId);
    if (!seed) continue;
    seedSymbolsForMarket(seed).forEach((symbol, index) => {
      const key = upper(symbol);
      if (!order.has(key)) order.set(key, order.size + index);
    });
  }
  return [...symbols].sort((a, b) => {
    const ai = order.get(a.symbol) ?? order.get(a.providerSymbol) ?? Number.MAX_SAFE_INTEGER;
    const bi = order.get(b.symbol) ?? order.get(b.providerSymbol) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi || a.symbol.localeCompare(b.symbol);
  });
}

const UNIVERSE_SOURCE_RANK: Record<TraderCatalogSource, number> = {
  supabase: 4,
  bundled: 3,
  fmp: 2,
  seed: 1,
};

function fullUniverseDedupeKey(symbol: TraderCatalogSymbol) {
  return [
    upper(symbol.providerSymbol || symbol.symbol),
    upper(symbol.exchange),
    upper(symbol.currency),
  ].join('|');
}

function dedupeFullUniverseSymbols(symbols: TraderCatalogSymbol[]) {
  const byProviderExchangeCurrency = new Map<string, TraderCatalogSymbol>();
  const nonSeedByProviderCurrency = new Set(
    symbols
      .filter(symbol => symbol.source !== 'seed')
      .map(symbol => [upper(symbol.providerSymbol || symbol.symbol), upper(symbol.currency)].join('|')),
  );
  for (const symbol of symbols) {
    const providerCurrencyKey = [upper(symbol.providerSymbol || symbol.symbol), upper(symbol.currency)].join('|');
    if (symbol.source === 'seed' && !symbol.exchange && nonSeedByProviderCurrency.has(providerCurrencyKey)) continue;
    const key = fullUniverseDedupeKey(symbol);
    const current = byProviderExchangeCurrency.get(key);
    if (!current || (UNIVERSE_SOURCE_RANK[symbol.source] ?? 0) > (UNIVERSE_SOURCE_RANK[current.source] ?? 0)) {
      byProviderExchangeCurrency.set(key, symbol);
    }
  }
  return Array.from(byProviderExchangeCurrency.values());
}

function fullUniverseFilterRows(symbols: TraderCatalogSymbol[], query: FullSymbolUniverseQuery) {
  const exchange = normalizeUniverseFilter(query.exchange);
  const currency = normalizeUniverseFilter(query.currency);
  const sectorName = normalizeUniverseFilter(query.sectorName);
  const industry = normalizeUniverseFilter(query.industry);
  const assetType = normalizeUniverseCategory(query.assetType);

  return symbols.filter(symbol => {
    if (exchange && ![symbol.exchange, symbol.exchangeCode, symbol.market].some(value => upper(value).includes(exchange))) return false;
    if (currency && upper(symbol.currency) !== currency) return false;
    if (sectorName && !upper(symbol.sector).includes(sectorName)) return false;
    if (industry && !upper(symbol.industry).includes(industry)) return false;
    if (assetType !== 'all' && symbol.assetType !== assetType) return false;
    return true;
  });
}

export async function getSymbolsForMarketOrSector(query: TraderSymbolUniverseQuery = {}): Promise<TraderSymbolUniverseResult> {
  const requestedMarket = normalizeUniverseMarketId(query.market);
  const requestedSector = normalizeUniverseMarketId(query.sector);
  const selectedSector = requestedSector ?? (requestedMarket && SECTOR_MARKET_IDS.has(requestedMarket) ? requestedMarket : null);
  const selectedMarket = requestedMarket && !SECTOR_MARKET_IDS.has(requestedMarket) ? requestedMarket : null;
  const category = normalizeUniverseCategory(query.category);
  const catalog = query.catalog ?? await getTraderMarketCatalog({
    forceFresh: query.forceFresh,
    includeFmpDiscovery: query.includeFmpDiscovery,
    marketId: selectedMarket ?? selectedSector ?? requestedMarket,
  });

  let rows = catalog.symbols;
  if (selectedMarket) {
    rows = rows.filter(symbol => symbol.marketIds.includes(selectedMarket));
  } else if (requestedMarket && !selectedSector) {
    rows = rows.filter(symbol => symbol.marketIds.includes(requestedMarket));
  }

  if (selectedSector) {
    rows = rows.filter(symbol => symbol.marketIds.includes(selectedSector));
  }

  if (category !== 'all') {
    rows = rows.filter(symbol => symbol.assetType === category);
  }

  const symbolMeta = sortUniverseSymbols(rows, selectedMarket, selectedSector);
  const entries = symbolMeta.map(symbol => universeEntry(symbol, selectedMarket, selectedSector));
  const sourceMarket = catalog.markets.find(market => market.id === selectedMarket || market.id === selectedSector || market.id === requestedMarket);

  return {
    selectedMarket,
    selectedSector,
    category,
    total: symbolMeta.length,
    symbols: symbolMeta.map(symbol => symbol.symbol),
    entries,
    symbolMeta,
    source: sourceMarket?.source ?? 'catalog',
  };
}

export async function getFullSymbolUniverse(query: FullSymbolUniverseQuery = {}): Promise<TraderSymbolUniverseResult> {
  const category = query.assetType && normalizeUniverseCategory(query.assetType) !== 'all'
    ? query.assetType
    : query.category;
  const base = await getSymbolsForMarketOrSector({
    ...query,
    category,
  });
  const rows = sortUniverseSymbols(
    dedupeFullUniverseSymbols(fullUniverseFilterRows(base.symbolMeta, query)),
    base.selectedMarket,
    base.selectedSector,
  );

  return {
    ...base,
    total: rows.length,
    symbols: rows.map(symbol => symbol.symbol),
    entries: rows.map(symbol => universeEntry(symbol, base.selectedMarket, base.selectedSector)),
    symbolMeta: rows,
  };
}

export function getStaticTraderMarket(marketId: string | null | undefined): TraderMarketDef {
  const raw = String(marketId ?? '').trim().toLowerCase();
  const alias = raw === 'us' || raw === 'stocks' || raw === '' ? 'us-stocks' : raw;
  const seed = TRADER_MARKET_SEEDS.find(market => market.id === alias) ?? TRADER_MARKET_SEEDS[0]!;
  const metadataSeed = withMarketMetadata(seed);
  return {
    ...metadataSeed,
    symbols: seedSymbolsForMarket(metadataSeed),
    source: 'seed',
    totalSymbols: seedSymbolsForMarket(metadataSeed).length,
  };
}

export async function resolveTraderMarketFromCatalog(marketId: string | null | undefined, options: { forceFresh?: boolean; includeFmpDiscovery?: boolean } = {}) {
  const catalog = await getTraderMarketCatalog({ ...options, marketId });
  const fallback = getStaticTraderMarket(marketId);
  const market = catalog.markets.find(item => item.id === fallback.id) ?? fallback;
  const symbolMeta = catalog.symbols.filter(symbol => symbol.marketIds.includes(market.id));
  return { market, symbolMeta, catalog };
}

export function providerCapabilityMatrix() {
  return capabilityMatrix();
}
