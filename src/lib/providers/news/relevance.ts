import { normalizeTitle } from '../shared';
import type { MarketNewsArticle } from './types';

export type MarketNewsRelevanceBucket =
  | 'us-stocks'
  | 'local-market'
  | 'forex'
  | 'crypto'
  | 'commodities'
  | 'general';

export type MarketNewsRelevanceContext = {
  market: string;
  category: string;
  symbols: string[];
};

export type MarketNewsRelevanceResult = {
  article: MarketNewsArticle & {
    relevanceScore: number;
    relevanceReasons: string[];
    relevanceBucket: MarketNewsRelevanceBucket;
  };
  score: number;
  reasons: string[];
  relevant: boolean;
  bucket: MarketNewsRelevanceBucket;
};

export type MarketNewsRelevanceFilterResult = {
  articles: MarketNewsRelevanceResult['article'][];
  diagnostics: {
    enabled: boolean;
    bucket: MarketNewsRelevanceBucket;
    market: string;
    category: string;
    symbols: string[];
    minimumScore: number;
    totalBeforeRelevance: number;
    totalAfterRelevance: number;
    hiddenUnrelated: number;
  };
};

const LOCAL_MARKET_IDS = new Set(['kuwait', 'saudi', 'qatar', 'bahrain', 'oman', 'uae']);

const LOCAL_MARKETS: Record<string, {
  names: string[];
  currencies: string[];
  exchanges: string[];
  suffixes: string[];
}> = {
  kuwait: {
    names: ['kuwait', 'boursa kuwait', 'kuwait stock exchange'],
    currencies: ['kwd', 'kuwaiti dinar'],
    exchanges: ['boursa', 'xkuw', 'kse'],
    suffixes: ['.KW'],
  },
  saudi: {
    names: ['saudi', 'saudi arabia', 'riyadh'],
    currencies: ['sar', 'saudi riyal'],
    exchanges: ['tadawul', 'xsaU', 'saudi exchange'],
    suffixes: ['.SR', '.SA'],
  },
  qatar: {
    names: ['qatar', 'doha'],
    currencies: ['qar', 'qatari riyal'],
    exchanges: ['qse', 'qatar stock exchange', 'dsmd', 'dsm'],
    suffixes: ['.QA'],
  },
  bahrain: {
    names: ['bahrain', 'manama'],
    currencies: ['bhd', 'bahraini dinar'],
    exchanges: ['bhb', 'bahrain bourse', 'xbah'],
    suffixes: ['.BH'],
  },
  oman: {
    names: ['oman', 'muscat'],
    currencies: ['omr', 'omani rial'],
    exchanges: ['msx', 'muscat stock exchange', 'muscat securities market'],
    suffixes: ['.OM'],
  },
  uae: {
    names: ['uae', 'united arab emirates', 'dubai', 'abu dhabi'],
    currencies: ['aed', 'uae dirham'],
    exchanges: ['adx', 'dfm', 'dubai financial market', 'abu dhabi securities exchange'],
    suffixes: ['.AE', '.DU', '.AD'],
  },
};

const COMPANY_ALIASES: Record<string, string[]> = {
  AAPL: ['apple'],
  MSFT: ['microsoft'],
  NVDA: ['nvidia'],
  AMZN: ['amazon'],
  META: ['meta platforms', 'facebook parent'],
  TSLA: ['tesla'],
  GOOGL: ['alphabet', 'google'],
  GOOG: ['alphabet', 'google'],
  NFLX: ['netflix'],
  AMD: ['advanced micro devices', 'amd'],
  INTC: ['intel'],
  JPM: ['jpmorgan', 'jp morgan', 'jpmorgan chase'],
  BAC: ['bank of america'],
  V: ['visa'],
  MA: ['mastercard'],
  DIS: ['disney', 'walt disney'],
  KO: ['coca cola', 'coca-cola'],
  PEP: ['pepsico', 'pepsi'],
  MCD: ['mcdonald'],
  WMT: ['walmart'],
  COST: ['costco'],
  XOM: ['exxon', 'exxon mobil', 'exxonmobil'],
  CVX: ['chevron'],
  KFH: ['kuwait finance house', 'kfh'],
  NBK: ['national bank of kuwait', 'nbk'],
  ZAIN: ['zain'],
  BOUBYAN: ['boubyan'],
  '2222': ['aramco', 'saudi aramco'],
  '1120': ['al rajhi', 'rajhi bank'],
  '1180': ['saudi national bank', 'snb'],
  QNBK: ['qnb', 'qatar national bank'],
  QIBK: ['qatar islamic bank'],
  EMAAR: ['emaar'],
  DIB: ['dubai islamic bank'],
  DEWA: ['dewa'],
  AUB: ['ahli united bank'],
  BKMB: ['bank muscat'],
};

const US_MARKET_TERMS = [
  'wall street',
  'nasdaq',
  'nyse',
  'dow jones',
  'dow industrials',
  's&p 500',
  'sp 500',
  'russell 2000',
  'u.s. stocks',
  'us stocks',
  'american stocks',
  'united states stocks',
  'stock market',
  'stocks',
  'shares',
  'equities',
  'earnings',
  'revenue',
  'profit',
  'guidance',
  'ipo',
  'dividend',
  'analyst rating',
  'price target',
  'federal reserve',
  'fed',
  'jerome powell',
  'inflation',
  'cpi',
  'ppi',
  'jobs report',
  'nonfarm payrolls',
  'treasury yields',
  'sector',
  'technology stocks',
  'semiconductor',
  'bank stocks',
  'energy stocks',
  'healthcare stocks',
  'consumer stocks',
];

const LOCAL_MARKET_TERMS = [
  'stock exchange',
  'bourse',
  'market index',
  'listed',
  'listing',
  'shares',
  'stock',
  'equities',
  'earnings',
  'profit',
  'net income',
  'dividend',
  'rights issue',
  'ipo',
  'bank',
  'telecom',
  'real estate',
  'insurer',
  'company',
];

const FOREX_TERMS = [
  'forex',
  'foreign exchange',
  'currency',
  'currencies',
  'dollar',
  'euro',
  'yen',
  'sterling',
  'pound',
  'franc',
  'aussie',
  'loonie',
  'yuan',
  'renminbi',
  'dirham',
  'riyal',
  'central bank',
  'federal reserve',
  'fed',
  'ecb',
  'bank of england',
  'boe',
  'boj',
  'bank of japan',
  'snb',
  'rba',
  'rbi',
  'rate decision',
  'interest rates',
  'inflation',
  'cpi',
  'ppi',
  'gdp',
  'jobs report',
  'nonfarm payrolls',
  'trade balance',
  'pmi',
  'macro',
];

const CRYPTO_TERMS = [
  'crypto',
  'cryptocurrency',
  'digital asset',
  'digital assets',
  'bitcoin',
  'ether',
  'ethereum',
  'solana',
  'binance',
  'xrp',
  'cardano',
  'dogecoin',
  'stablecoin',
  'blockchain',
  'defi',
  'token',
  'tokens',
  'coinbase',
  'bitfinex',
  'binance',
  'bitcoin etf',
  'spot bitcoin',
  'spot ether',
];

const COMMODITY_TERMS = [
  'commodity',
  'commodities',
  'oil',
  'crude',
  'brent',
  'wti',
  'opec',
  'gold',
  'silver',
  'copper',
  'natural gas',
  'gasoline',
  'diesel',
  'precious metals',
  'bullion',
  'xau',
  'xag',
  'futures',
];

const CURRENCY_CODES = [
  'usd',
  'eur',
  'jpy',
  'gbp',
  'chf',
  'aud',
  'cad',
  'nzd',
  'cny',
  'sek',
  'nok',
  'mxn',
  'zar',
  'sar',
  'aed',
  'qar',
  'kwd',
  'bhd',
  'omr',
];

const CRYPTO_SYMBOL_ALIASES: Record<string, string[]> = {
  BTC: ['bitcoin', 'btc'],
  ETH: ['ethereum', 'ether', 'eth'],
  SOL: ['solana', 'sol'],
  BNB: ['bnb', 'binance coin'],
  XRP: ['xrp', 'ripple'],
  ADA: ['cardano', 'ada'],
  DOGE: ['dogecoin', 'doge'],
};

const COMMODITY_SYMBOL_ALIASES: Record<string, string[]> = {
  XAUUSD: ['gold', 'xau', 'bullion'],
  XAGUSD: ['silver', 'xag'],
  WTI: ['wti', 'oil', 'crude'],
  BRENT: ['brent', 'oil', 'crude'],
  'GC=F': ['gold', 'gold futures'],
  'SI=F': ['silver', 'silver futures'],
  'CL=F': ['wti', 'oil futures', 'crude futures'],
  'BZ=F': ['brent', 'oil futures', 'crude futures'],
};

function normalizeMarket(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (!raw || raw === 'all' || raw === 'global') return 'us-stocks';
  if (['us', 'usa', 'stocks', 'equities', 'us-market', 'american-stocks'].includes(raw)) return 'us-stocks';
  if (['ksa', 'tadawul', 'saudi-arabia'].includes(raw)) return 'saudi';
  if (['kw', 'boursa-kuwait'].includes(raw)) return 'kuwait';
  if (['ae', 'emirates', 'adx', 'dfm'].includes(raw)) return 'uae';
  if (['qa', 'qse'].includes(raw)) return 'qatar';
  if (['bh', 'bhb'].includes(raw)) return 'bahrain';
  if (['om', 'msx'].includes(raw)) return 'oman';
  if (['fx', 'currencies', 'currency'].includes(raw)) return 'forex';
  if (['digital-assets', 'cryptocurrencies'].includes(raw)) return 'crypto';
  if (['commodity', 'metals', 'oil-gold'].includes(raw)) return 'commodities';
  return raw;
}

function normalizeCategory(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!raw || raw === 'all' || raw === 'general') return 'all';
  if (['stocks', 'equities', 'equity'].includes(raw)) return 'stock';
  if (['fx', 'currencies', 'currency pairs'].includes(raw)) return 'forex';
  if (['commodity', 'commodities', 'metal', 'metals'].includes(raw)) return 'commodity';
  if (['crypto', 'cryptocurrency', 'digital asset', 'digital assets'].includes(raw)) return 'crypto';
  if (['index', 'indices', 'indexes', 'benchmarks'].includes(raw)) return 'index';
  if (['etf', 'etfs', 'fund', 'funds'].includes(raw)) return 'fund';
  if (['tech', 'technology stocks'].includes(raw)) return 'technology';
  if (['semiconductor', 'semiconductor stocks'].includes(raw)) return 'semiconductors';
  return raw;
}

export function normalizeNewsSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9._:\-=^]/g, '').slice(0, 32);
}

export function parseNewsSymbols(value: unknown) {
  return String(value ?? '')
    .split(/[,;\s]+/)
    .map(normalizeNewsSymbol)
    .filter(Boolean)
    .slice(0, 100);
}

function inferCategoryFromSymbol(symbol: string) {
  const normalized = normalizeNewsSymbol(symbol);
  const root = symbolRoot(normalized);
  if (root && CRYPTO_SYMBOL_ALIASES[root]) return 'crypto';
  if (COMMODITY_SYMBOL_ALIASES[normalized] || /^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(normalized)) return 'commodity';
  if (/^[A-Z]{6}$/.test(normalized.replace(/[.\-=].*$/, ''))) return 'forex';
  return '';
}

function inferCategoryFromSymbols(symbols: string[]) {
  for (const symbol of symbols) {
    const category = inferCategoryFromSymbol(symbol);
    if (category) return category;
  }
  return 'all';
}

function inferMarketFromSymbols(symbols: string[]) {
  for (const symbol of symbols) {
    const localMarket = localSymbolMarket(symbol);
    if (localMarket) return localMarket;
  }
  return null;
}

export function buildMarketNewsRelevanceContext(input: {
  market?: string | null;
  category?: string | null;
  symbol?: string | null;
  symbols?: string[] | string | null;
}): MarketNewsRelevanceContext {
  const symbolList = Array.isArray(input.symbols) ? input.symbols : parseNewsSymbols(input.symbols);
  const symbol = normalizeNewsSymbol(input.symbol);
  const symbols = Array.from(new Set([symbol, ...symbolList].map(normalizeNewsSymbol).filter(Boolean)));
  const rawMarket = String(input.market ?? '').trim().toLowerCase();
  const hasExplicitMarket = Boolean(rawMarket && !['all', 'global', 'general'].includes(rawMarket));
  const category = normalizeCategory(input.category);
  return {
    market: hasExplicitMarket ? normalizeMarket(input.market) : inferMarketFromSymbols(symbols) ?? normalizeMarket(input.market),
    category: category === 'all' ? inferCategoryFromSymbols(symbols) : category,
    symbols,
  };
}

function bucketForContext(context: MarketNewsRelevanceContext): MarketNewsRelevanceBucket {
  if (context.category === 'crypto' || context.market === 'crypto') return 'crypto';
  if (context.category === 'forex' || context.market === 'forex') return 'forex';
  if (context.category === 'commodity' || context.market === 'commodities') return 'commodities';
  if (LOCAL_MARKET_IDS.has(context.market)) return 'local-market';
  if (context.market === 'us-stocks' || ['stock', 'technology', 'semiconductors'].includes(context.category)) return 'us-stocks';
  return 'general';
}

function articleText(article: MarketNewsArticle) {
  return normalizeTitle([
    article.headline,
    article.summary ?? '',
    article.source,
    article.category ?? '',
    article.relatedSymbols.join(' '),
  ].join(' '));
}

function rawArticleText(article: MarketNewsArticle) {
  return [
    article.headline,
    article.summary ?? '',
    article.source,
    article.category ?? '',
    article.relatedSymbols.join(' '),
  ].join(' ');
}

function hasPhrase(text: string, phrase: string) {
  return text.includes(normalizeTitle(phrase));
}

function countPhrases(text: string, phrases: string[]) {
  return phrases.reduce((count, phrase) => count + (hasPhrase(text, phrase) ? 1 : 0), 0);
}

function hasAnyPhrase(text: string, phrases: string[]) {
  return countPhrases(text, phrases) > 0;
}

function relatedSet(article: MarketNewsArticle) {
  return new Set(article.relatedSymbols.map(normalizeNewsSymbol).filter(Boolean));
}

function symbolRoot(symbol: string) {
  return normalizeNewsSymbol(symbol).replace(/[:.\-=^].*$/, '').replace(/USD(T)?$/, '');
}

function tickerInText(rawText: string, symbol: string) {
  const normalized = normalizeNewsSymbol(symbol);
  if (!normalized) return false;
  const candidates = [normalized];
  const root = symbolRoot(normalized);
  if (root.length >= 3) candidates.push(root);
  return candidates.some(candidate => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, 'i').test(rawText);
  });
}

function symbolAliases(symbol: string) {
  const normalized = normalizeNewsSymbol(symbol);
  const root = symbolRoot(normalized);
  const aliases = new Set<string>();
  if (root.length >= 3) aliases.add(root);
  for (const item of COMPANY_ALIASES[root] ?? []) aliases.add(item);
  for (const item of CRYPTO_SYMBOL_ALIASES[root] ?? []) aliases.add(item);
  for (const item of COMMODITY_SYMBOL_ALIASES[normalized] ?? []) aliases.add(item);
  return Array.from(aliases);
}

function symbolScore(article: MarketNewsArticle, context: MarketNewsRelevanceContext) {
  const related = relatedSet(article);
  const text = articleText(article);
  const rawText = rawArticleText(article);
  let score = 0;
  const reasons: string[] = [];

  for (const symbol of context.symbols) {
    const normalized = normalizeNewsSymbol(symbol);
    const root = symbolRoot(normalized);
    const relatedMatch = related.has(normalized) || (root.length >= 3 && related.has(root));
    if (relatedMatch) {
      score += 10;
      reasons.push(`related_symbol:${normalized}`);
      continue;
    }
    if (tickerInText(rawText, normalized)) {
      score += 7;
      reasons.push(`ticker_text:${normalized}`);
      continue;
    }
    const aliasMatch = symbolAliases(normalized).some(alias => hasPhrase(text, alias));
    if (aliasMatch) {
      score += 6;
      reasons.push(`company_or_asset_alias:${normalized}`);
    }
  }

  return { score, reasons };
}

function localSymbolMarket(symbol: string) {
  const normalized = normalizeNewsSymbol(symbol);
  const found = Object.entries(LOCAL_MARKETS).find(([, rule]) => rule.suffixes.some(suffix => normalized.endsWith(suffix)));
  return found?.[0] ?? null;
}

function hasLocalSymbolForMarket(article: MarketNewsArticle, context: MarketNewsRelevanceContext) {
  const articleSymbols = Array.from(relatedSet(article));
  return articleSymbols.some(symbol => localSymbolMarket(symbol) === context.market);
}

function localMarketScore(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const rule = LOCAL_MARKETS[context.market];
  if (!rule) return { score: 0, reasons: [] as string[], localSignal: false, wrongLocalSignal: false };

  const localTerms = [...rule.names, ...rule.currencies, ...rule.exchanges];
  const localTermCount = countPhrases(text, localTerms);
  const localSymbol = hasLocalSymbolForMarket(article, context);
  const marketTerm = hasAnyPhrase(text, LOCAL_MARKET_TERMS);
  const wrongLocalSignal = Object.entries(LOCAL_MARKETS)
    .filter(([key]) => key !== context.market)
    .some(([, other]) => hasAnyPhrase(text, [...other.names, ...other.currencies, ...other.exchanges]));
  const score = (localTermCount > 0 ? 5 + localTermCount : 0) + (localSymbol ? 10 : 0) + (marketTerm ? 4 : 0);
  const reasons = [
    ...(localTermCount > 0 ? [`local_market:${context.market}`] : []),
    ...(localSymbol ? [`local_symbol:${context.market}`] : []),
    ...(marketTerm ? ['local_market_or_company_term'] : []),
  ];
  return { score, reasons, localSignal: localTermCount > 0 || localSymbol, wrongLocalSignal };
}

function scoreUsStocks(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const usTermCount = countPhrases(text, US_MARKET_TERMS);
  const cryptoSignal = hasAnyPhrase(text, CRYPTO_TERMS);
  const forexSignal = hasAnyPhrase(text, FOREX_TERMS);
  const commoditySignal = hasAnyPhrase(text, COMMODITY_TERMS);
  const localSignal = Object.values(LOCAL_MARKETS).some(rule => hasAnyPhrase(text, [...rule.names, ...rule.currencies, ...rule.exchanges]));
  const score = symbols.score + (usTermCount > 0 ? 4 + usTermCount : 0);
  const reasons = [...symbols.reasons, ...(usTermCount > 0 ? ['us_market_or_company_macro'] : [])];
  const topicOnly =
    score < 5
    && (cryptoSignal || forexSignal || commoditySignal || localSignal);
  return { score, reasons, relevant: score >= 4 && !topicOnly };
}

function scoreLocalMarket(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const local = localMarketScore(article, context, text);
  const score = symbols.score + local.score;
  const reasons = [...symbols.reasons, ...local.reasons];
  return {
    score,
    reasons,
    relevant: score >= 8 && local.localSignal && !local.wrongLocalSignal,
  };
}

function scoreForex(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string, rawText: string) {
  const symbols = symbolScore(article, context);
  const termCount = countPhrases(text, [...FOREX_TERMS, ...CURRENCY_CODES]);
  const pairSignal = context.symbols.some(symbol => {
    const normalized = normalizeNewsSymbol(symbol).replace(/[.\-=].*$/, '');
    return /^[A-Z]{6}$/.test(normalized) && (tickerInText(rawText, normalized) || hasPhrase(text, `${normalized.slice(0, 3)} ${normalized.slice(3)}`));
  });
  const score = symbols.score + (termCount > 0 ? 5 + termCount : 0) + (pairSignal ? 8 : 0);
  const stockOnly = hasAnyPhrase(text, US_MARKET_TERMS) && termCount === 0 && symbols.score === 0 && !pairSignal;
  return {
    score,
    reasons: [
      ...symbols.reasons,
      ...(termCount > 0 ? ['currency_central_bank_macro'] : []),
      ...(pairSignal ? ['forex_pair'] : []),
    ],
    relevant: score >= 5 && !stockOnly,
  };
}

function scoreCrypto(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const termCount = countPhrases(text, CRYPTO_TERMS);
  const score = symbols.score + (termCount > 0 ? 6 + termCount : 0);
  return {
    score,
    reasons: [...symbols.reasons, ...(termCount > 0 ? ['crypto_topic'] : [])],
    relevant: score >= 6 && (termCount > 0 || symbols.score > 0),
  };
}

function scoreCommodities(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const termCount = countPhrases(text, COMMODITY_TERMS);
  const score = symbols.score + (termCount > 0 ? 6 + termCount : 0);
  return {
    score,
    reasons: [...symbols.reasons, ...(termCount > 0 ? ['commodity_topic'] : [])],
    relevant: score >= 6 && (termCount > 0 || symbols.score > 0),
  };
}

export function scoreMarketNewsRelevance(
  article: MarketNewsArticle,
  context: MarketNewsRelevanceContext,
): MarketNewsRelevanceResult {
  const bucket = bucketForContext(context);
  const text = articleText(article);
  const rawText = rawArticleText(article);
  const scored = bucket === 'crypto'
    ? scoreCrypto(article, context, text)
    : bucket === 'forex'
      ? scoreForex(article, context, text, rawText)
      : bucket === 'commodities'
        ? scoreCommodities(article, context, text)
        : bucket === 'local-market'
          ? scoreLocalMarket(article, context, text)
          : bucket === 'us-stocks'
            ? scoreUsStocks(article, context, text)
            : { ...symbolScore(article, context), relevant: true };

  const reasons = scored.reasons.length ? scored.reasons : ['no_relevance_match'];
  return {
    article: {
      ...article,
      relevanceScore: scored.score,
      relevanceReasons: reasons,
      relevanceBucket: bucket,
    },
    score: scored.score,
    reasons,
    relevant: scored.relevant,
    bucket,
  };
}

export function filterMarketNewsByRelevance(
  articles: MarketNewsArticle[],
  context: MarketNewsRelevanceContext,
): MarketNewsRelevanceFilterResult {
  const bucket = bucketForContext(context);
  const scored = articles.map(article => scoreMarketNewsRelevance(article, context));
  const minimumScore = bucket === 'local-market' ? 8 : bucket === 'us-stocks' ? 4 : bucket === 'general' ? 0 : 6;
  const relevant = scored
    .filter(item => item.relevant && item.score >= minimumScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    })
    .map(item => item.article);

  return {
    articles: relevant,
    diagnostics: {
      enabled: bucket !== 'general' || context.symbols.length > 0,
      bucket,
      market: context.market,
      category: context.category,
      symbols: context.symbols,
      minimumScore,
      totalBeforeRelevance: articles.length,
      totalAfterRelevance: relevant.length,
      hiddenUnrelated: articles.length - relevant.length,
    },
  };
}
