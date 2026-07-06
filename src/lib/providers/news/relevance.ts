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

const LOCAL_MARKET_IDS = new Set(['kuwait', 'saudi', 'qatar', 'bahrain', 'oman', 'uae', 'gcc']);

const LOCAL_MARKET_RULES: Record<string, {
  names: string[];
  currencies: string[];
  exchanges: string[];
  suffixes: string[];
}> = {
  kuwait: {
    names: ['kuwait', 'boursa', 'kuwait stock exchange'],
    currencies: ['kwd', 'kuwaiti dinar'],
    exchanges: ['bourse', 'xkuw', 'kuwait stock exchange'],
    suffixes: ['.KW'],
  },
  saudi: {
    names: ['saudi', 'saudi arabia', 'riyadh', 'tadawul'],
    currencies: ['sar', 'saudi riyal'],
    exchanges: ['tadawul', 'saudi exchange', 'saudi stock exchange'],
    suffixes: ['.SR', '.SA'],
  },
  qatar: {
    names: ['qatar', 'doha', 'qatar stock exchange'],
    currencies: ['qar', 'qatari riyal'],
    exchanges: ['qse', 'qatar stock exchange'],
    suffixes: ['.QA'],
  },
  bahrain: {
    names: ['bahrain', 'manama', 'bahrain bourse'],
    currencies: ['bhd', 'bahraini dinar'],
    exchanges: ['bhb', 'bahrain bourse'],
    suffixes: ['.BH'],
  },
  oman: {
    names: ['oman', 'muscat', 'muscat securities market'],
    currencies: ['omr', 'omani rial'],
    exchanges: ['msx', 'muscat securities market'],
    suffixes: ['.OM'],
  },
  uae: {
    names: ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'adx', 'dfm'],
    currencies: ['aed', 'united arab emirates dirham'],
    exchanges: ['adx', 'dfm', 'abu dhabi securities exchange'],
    suffixes: ['.AE', '.DU', '.AD'],
  },
};

const LOCAL_MARKET_GROUP = {
  names: ['bourse', 'exchange', 'listed', 'listing', 'listing on', 'shares', 'equities', 'equity', 'dividend', 'earnings', 'net income', 'bank', 'telecom', 'islamic'],
  currencies: ['gulf', 'kwd', 'sar', 'qar', 'bhd', 'omr', 'aed'],
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
  AMD: ['advanced micro devices'],
  KFH: ['kuwait finance house'],
  NBK: ['national bank of kuwait'],
  ZAIN: ['zain'],
  BOUBYAN: ['boubyan'],
  '2222': ['aramco', 'saudi aramco'],
  '1120': ['al rajhi', 'rajhi bank'],
  '1180': ['snb', 'saudi national bank'],
  QNBK: ['qatar national bank'],
  QIBK: ['qatar islamic bank'],
  EMAAR: ['emaar'],
  DIB: ['dewa'],
  AUB: ['ahli united bank'],
};

const US_MARKET_TERMS = [
  'wall street',
  'nasdaq',
  'nyse',
  'dow jones',
  's&p 500',
  'sp 500',
  'russell 2000',
  'us stocks',
  'u.s. stocks',
  'stock market',
  'earnings',
  'revenue',
  'profit',
  'guidance',
  'ipo',
  'dividend',
  'analyst',
  'federal reserve',
  'fed',
  'inflation',
  'cpi',
  'interest rates',
  'treasury yields',
];

const US_UNRELATED_NOISE = [
  'olympics',
  'world cup',
  'premier league',
  'nfl',
  'nba',
  'nba finals',
  'fifa',
  'soccer',
  'football',
  'tennis',
  'basketball',
  'baseball',
  'tennis',
  'tennis',
  'movie',
  'music',
  'film',
  'podcast',
  'celeb',
  'celebrity',
  'season',
  'streaming',
  'concert',
  'lifestyle',
  'travel',
  'fashion',
  'politics',
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
  'yuan',
  'renminbi',
  'dirham',
  'riyal',
  'central bank',
  'bank of england',
  'boe',
  'boj',
  'bank of japan',
  'fed',
  'federal reserve',
  'ecb',
  'rates',
  'interest rates',
  'inflation',
  'cpi',
  'ppi',
  'trade balance',
  'macro',
  'gdp',
  'employment',
  'jobs report',
  'nonfarm payrolls',
  'money supply',
];

const GLOBAL_IMPACT_TERMS = [
  'global',
  'global markets',
  'global economy',
  'cross-border',
  'global impact',
  'shipping',
  'energy',
  'oil',
  'geopolitical',
  'supply chain',
  'compliance',
  'trade agreement',
  'export',
  'import',
  'usd',
];

const CRYPTO_TERMS = [
  'crypto',
  'cryptocurrency',
  'digital asset',
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
};

const COMMODITY_SYMBOL_ALIASES: Record<string, string[]> = {
  XAUUSD: ['gold', 'xau', 'bullion'],
  XAGUSD: ['silver', 'xag'],
  WTI: ['wti', 'oil', 'crude'],
  BRENT: ['brent', 'oil', 'crude'],
};

function normalizeMarket(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (!raw || raw === 'all' || raw === 'global') return 'us-stocks';
  if (['us', 'usa', 'stocks', 'equities', 'us-market', 'american-stocks'].includes(raw)) return 'us-stocks';
  if (['us-stocks', 'us_stocks'].includes(raw)) return 'us-stocks';
  if (['ksa', 'tadawul', 'saudi-arabia', 'saudi', 'ksa-arabia'].includes(raw)) return 'saudi';
  if (['kw', 'kuwait', 'kuwait-stock', 'kuwait-stocks', 'boursa-kuwait'].includes(raw)) return 'kuwait';
  if (['ae', 'uem', 'uae', 'emirates', 'dx', 'du'].includes(raw)) return 'uae';
  if (['qa', 'qatar', 'qse'].includes(raw)) return 'qatar';
  if (['bh', 'bahrain', 'bahrain-bourse'].includes(raw)) return 'bahrain';
  if (['om', 'oman', 'oman-bourse'].includes(raw)) return 'oman';
  if (['gcc', 'gulf', 'gulf-cooperation'].includes(raw)) return 'gcc';
  if (['fx', 'currencies', 'currency'].includes(raw)) return 'forex';
  if (['digital-assets', 'cryptocurrency', 'crypto', 'digital-asset'].includes(raw)) return 'crypto';
  if (['commodity', 'commodities', 'metal', 'metals', 'oil-gold', 'energy'].includes(raw)) return 'commodities';
  return raw;
}

function normalizeCategory(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!raw || raw === 'all' || raw === 'general') return 'all';
  if (['stocks', 'equities', 'equity'].includes(raw)) return 'stock';
  if (['fx', 'currencies', 'currency'].includes(raw)) return 'forex';
  if (['commodity', 'commodities', 'metal', 'metals', 'energy'].includes(raw)) return 'commodity';
  if (['crypto', 'cryptocurrency', 'digital asset', 'digital assets'].includes(raw)) return 'crypto';
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

function localSymbolMarket(symbol: string) {
  const normalized = normalizeNewsSymbol(symbol);
  const found = Object.entries(LOCAL_MARKET_RULES).find(([, rule]) => rule.suffixes.some(suffix => normalized.endsWith(suffix)));
  return found?.[0] ?? null;
}

function inferMarketFromSymbols(symbols: string[]) {
  const detected = symbols.map(localSymbolMarket).filter(Boolean);
  if (!detected.length) return null;
  const uniq = Array.from(new Set(detected));
  if (uniq.length === 1) return uniq[0] as string;
  return null;
}

export function buildMarketNewsRelevanceContext(input: {
  market?: string | null;
  category?: string | null;
  symbol?: string | null;
  symbols?: string[] | string | null;
}) {
  const symbolList = Array.isArray(input.symbols) ? input.symbols : parseNewsSymbols(input.symbols);
  const symbol = normalizeNewsSymbol(input.symbol);
  const symbols = Array.from(new Set([symbol, ...symbolList].map(normalizeNewsSymbol).filter(Boolean)));
  const rawMarket = String(input.market ?? '').trim().toLowerCase();
  const hasExplicitMarket = Boolean(rawMarket && !['all', 'global', 'general'].includes(rawMarket));
  const category = normalizeCategory(input.category);
  const inferredMarket = inferMarketFromSymbols(symbols);
  return {
    market: hasExplicitMarket ? normalizeMarket(input.market) : (inferredMarket || normalizeMarket(input.market)),
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

function localMarketTerms(context: MarketNewsRelevanceContext) {
  const markets = context.market === 'gcc'
    ? Object.keys(LOCAL_MARKET_RULES)
    : [context.market].filter(Boolean);

  return markets.map(id => ({
    id,
    rule: LOCAL_MARKET_RULES[id],
  })).filter((item): item is { id: string; rule: typeof LOCAL_MARKET_RULES[keyof typeof LOCAL_MARKET_RULES] } =>
    Boolean(item.rule)
  );
}

function localRuleTerms(rules: typeof LOCAL_MARKET_RULES[string][]) {
  return rules.flatMap(rule => [...rule.names, ...rule.currencies, ...rule.exchanges]);
}

function localSymbolMatch(article: MarketNewsArticle, context: MarketNewsRelevanceContext) {
  const articleSymbols = Array.from(relatedSet(article));
  return {
    count: articleSymbols.filter(symbol => {
      if (context.market === 'gcc') return localSymbolMarket(symbol) != null;
      return localSymbolMarket(symbol) === context.market;
    }).length,
  };
}

function hasGlobalImpact(text: string) {
  return hasAnyPhrase(text, GLOBAL_IMPACT_TERMS);
}

function scoreUsStocks(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string, rawText: string) {
  const symbols = symbolScore(article, context);
  const usTermCount = countPhrases(text, US_MARKET_TERMS);
  const noiseCount = countPhrases(text, US_UNRELATED_NOISE);
  const cryptoSignal = hasAnyPhrase(text, CRYPTO_TERMS);
  const forexSignal = hasAnyPhrase(text, FOREX_TERMS);
  const commoditySignal = hasAnyPhrase(text, COMMODITY_TERMS);
  const hasFinancialContext = symbols.score > 0 || usTermCount >= 1 || hasAnyPhrase(text, ['earnings', 'revenue', 'guidance', 'federal reserve', 'rates']);
  const score = symbols.score
    + (usTermCount * 2)
    + (hasFinancialContext ? 4 : 0)
    + (hasGlobalImpact(text) ? 3 : 0)
    - (noiseCount >= 2 ? 4 : 0);
  const offTopicSports = noiseCount >= 1 && symbols.score === 0 && usTermCount === 0;
  const topicOnly = score < 5 && (cryptoSignal || forexSignal || commoditySignal);
  return {
    score,
    reasons: [...symbols.reasons, ...(usTermCount > 0 ? ['us_market_or_company_signal'] : []), ...(hasGlobalImpact(text) ? ['global_market_impact'] : [])],
    relevant: hasFinancialContext && !offTopicSports && !topicOnly,
  };
}

function scoreLocalMarket(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const rules = localMarketTerms(context).map(item => item.rule);
  const localTermCount = countPhrases(text, localRuleTerms(rules));
  const localSymbol = localSymbolMatch(article, context).count;
  const globalImpact = hasGlobalImpact(text);
  const wrongMarketSignal = context.market !== 'gcc'
    ? (() => {
      const others = Object.entries(LOCAL_MARKET_RULES)
        .filter(([key]) => key !== context.market)
        .flatMap(([, rule]) => [...rule.names, ...rule.currencies, ...rule.exchanges]);
      return hasAnyPhrase(text, others);
    })()
    : false;

  const score = symbols.score + (localTermCount * 3) + (localSymbol * 7) + (globalImpact ? 4 : 0);
  const hasLocalContext = localTermCount >= 1 || localSymbol >= 1;
  const hasGccWideContext = context.market === 'gcc' && (localTermCount >= 1 || localSymbol >= 1);
  const allowedWhenGlobal = globalImpact && (symbols.score > 0 || localTermCount > 0 || localSymbol > 0);
  const relevant = (hasLocalContext || allowedWhenGlobal || hasGccWideContext) && !wrongMarketSignal && score >= 8;
  return {
    score,
    reasons: [
      ...symbols.reasons,
      ...(localTermCount > 0 ? ['local_market_term'] : []),
      ...(localSymbol > 0 ? ['local_symbol_signal'] : []),
      ...(globalImpact ? ['global_market_impact'] : []),
    ],
    relevant,
  };
}

function scoreForex(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string, rawText: string) {
  const symbols = symbolScore(article, context);
  const forexTermCount = countPhrases(text, [...FOREX_TERMS, ...CURRENCY_CODES]);
  const pairSignal = context.symbols.some(symbol => {
    const normalized = normalizeNewsSymbol(symbol).replace(/[.\-=].*$/, '');
    return /^[A-Z]{6}$/.test(normalized) && (tickerInText(rawText, normalized) || hasPhrase(text, `${normalized.slice(0, 3)} ${normalized.slice(3)}`));
  });
  const commodityNoise = hasAnyPhrase(text, COMMODITY_TERMS);
  const usStockNoise = hasAnyPhrase(text, US_MARKET_TERMS);
  const cryptoNoise = hasAnyPhrase(text, CRYPTO_TERMS);
  const hasRateFocus = hasAnyPhrase(text, ['rates', 'interest rates', 'inflation', 'central bank', 'federal reserve', 'ecb', 'boe']);
  const score = symbols.score
    + (forexTermCount * 2)
    + (pairSignal ? 10 : 0)
    + (hasRateFocus ? 4 : 0);
  return {
    score,
    reasons: [
      ...symbols.reasons,
      ...(forexTermCount > 0 ? ['forex_currency_signal'] : []),
      ...(pairSignal ? ['forex_pair'] : []),
      ...(hasRateFocus ? ['macro_rate_focus'] : []),
    ],
    relevant: (pairSignal || forexTermCount >= 2 || hasRateFocus || symbols.score > 0) && !(commodityNoise && !hasRateFocus && !pairSignal),
  };
}

function scoreCrypto(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const termCount = countPhrases(text, CRYPTO_TERMS);
  const stockNoise = hasAnyPhrase(text, US_MARKET_TERMS.concat(FOREX_TERMS));
  const score = symbols.score + (termCount * 2) + (hasAnyPhrase(text, ['spot', 'futures', 'chain', 'wallet', 'on-chain', 'exchange']) ? 3 : 0);
  return {
    score,
    reasons: [...symbols.reasons, ...(termCount > 0 ? ['crypto_topic'] : [])],
    relevant: (symbols.score > 0 || termCount > 0) && !stockNoise,
  };
}

function scoreCommodities(article: MarketNewsArticle, context: MarketNewsRelevanceContext, text: string) {
  const symbols = symbolScore(article, context);
  const termCount = countPhrases(text, COMMODITY_TERMS);
  const score = symbols.score + (termCount * 2) + (hasAnyPhrase(text, ['energy', 'oil', 'gold', 'silver']) ? 3 : 0);
  const nonCommodityNoise = hasAnyPhrase(text, CRYPTO_TERMS.concat(FOREX_TERMS));
  return {
    score,
    reasons: [...symbols.reasons, ...(termCount > 0 ? ['commodity_topic'] : [])],
    relevant: (symbols.score > 0 || termCount > 0) && !nonCommodityNoise,
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
            ? scoreUsStocks(article, context, text, rawText)
            : { ...symbolScore(article, context), score: symbolScore(article, context).score, reasons: ['general_bucket'], relevant: true };

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
  const minimumScore = bucket === 'local-market'
    ? 8
    : bucket === 'us-stocks'
      ? 5
      : bucket === 'general'
        ? 0
        : 6;

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
