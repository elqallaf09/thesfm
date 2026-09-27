import 'server-only';

import { EUROPE_RSS_FEEDS } from '@/lib/europe/europeRssFeeds';

import { assertSafePublicHttpUrl, sourceDomainFromUrl } from './security';
import {
  FINANCIAL_ASSET_TYPES,
  FinancialNewsProviderErrorCode,
  NEWS_SOURCE_TYPES,
  type FinancialAssetType,
  type FinancialNewsProvider,
  type FinancialNewsProviderRegistry,
  type NewsFetchParams,
  type NewsSourceType,
  type ProviderRegistryIssue,
} from './types';
import { createDfmEfsahNewsProvider } from './providers/dfmEfsah';
import { createFinnhubNewsProvider } from './providers/finnhub';
import { createNewsApiProvider } from './providers/newsapi';
import { createRssNewsProvider, type RssNewsProviderConfig } from './providers/rss';
import { cleanCredential } from './providers/shared';

const MAX_CUSTOM_CONFIG_BYTES = 64 * 1024;
const MAX_CUSTOM_FEEDS = 25;

type RegistryEnvironment = Record<string, string | undefined>;

export type ConfiguredProviderDescriptor = {
  id: string;
  name: string;
  sourceType: NewsSourceType;
  sourceDomain: string | null;
  sourceNetworkId: string | null;
  priority: number;
  reliabilityScore: number;
  officialSource: boolean;
  supportedMarkets: string[];
  enabled: boolean;
  configured: boolean;
  requiredEnvironmentVariable: 'FINNHUB_API_KEY' | 'NEWS_API_KEY or CENTRAL_BANK_NEWS_API_KEY' | null;
};

type EuropeMarketMetadata = {
  marketCodes: string[];
  exchangeCodes: string[];
  countries: string[];
  symbols: string[];
};

const EUROPE_MARKET_METADATA: Record<string, EuropeMarketMetadata> = {
  uk: { marketCodes: ['UK', 'EUROPE'], exchangeCodes: ['LSE'], countries: ['GB'], symbols: ['^FTSE'] },
  germany: { marketCodes: ['DE', 'GERMANY', 'EUROPE'], exchangeCodes: ['XETRA'], countries: ['DE'], symbols: ['^GDAXI'] },
  france: { marketCodes: ['FR', 'FRANCE', 'EUROPE'], exchangeCodes: ['EPA'], countries: ['FR'], symbols: ['^FCHI'] },
  italy: { marketCodes: ['IT', 'ITALY', 'EUROPE'], exchangeCodes: ['BIT'], countries: ['IT'], symbols: ['^FTMIB'] },
  spain: { marketCodes: ['ES', 'SPAIN', 'EUROPE'], exchangeCodes: ['BME'], countries: ['ES'], symbols: ['^IBEX'] },
  netherlands: { marketCodes: ['NL', 'NETHERLANDS', 'EUROPE'], exchangeCodes: ['AMS'], countries: ['NL'], symbols: ['^AEX'] },
  switzerland: { marketCodes: ['CH', 'SWITZERLAND', 'EUROPE'], exchangeCodes: ['SIX'], countries: ['CH'], symbols: ['^SSMI'] },
  europe: { marketCodes: ['EU', 'EUROPE'], exchangeCodes: ['EURONEXT'], countries: ['EU'], symbols: ['^STOXX50E'] },
};

const OFFICIAL_RSS_PROVIDERS: RssNewsProviderConfig[] = [
  {
    id: 'official-sec-press-releases',
    name: 'U.S. Securities and Exchange Commission',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    sourceType: 'regulator',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'sec.gov',
    supportedMarkets: ['US'],
    marketCodes: ['US'],
    exchangeCodes: ['NYSE', 'NASDAQ', 'NYSEAMERICAN'],
    countries: ['US'],
    assetTypes: ['equity', 'etf', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
  },
  {
    id: 'official-federal-reserve-press',
    name: 'Federal Reserve Board',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    sourceType: 'central_bank',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'federalreserve.gov',
    supportedMarkets: ['US', 'GLOBAL'],
    marketCodes: ['US', 'GLOBAL'],
    countries: ['US'],
    currencies: ['USD'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
  },
  {
    id: 'official-federal-reserve-monetary-policy',
    name: 'Federal Reserve Monetary Policy',
    url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    sourceType: 'central_bank',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'federalreserve.gov',
    supportedMarkets: ['US', 'GLOBAL'],
    marketCodes: ['US', 'GLOBAL'],
    countries: ['US'],
    currencies: ['USD'],
    originalLanguage: 'en',
    revalidateSeconds: 120,
  },
  {
    id: 'official-ecb-press-releases',
    name: 'European Central Bank',
    url: 'https://www.ecb.europa.eu/rss/press.html',
    sourceType: 'central_bank',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'ecb.europa.eu',
    supportedMarkets: ['EU', 'EUROPE', 'GLOBAL'],
    marketCodes: ['EU', 'EUROPE', 'GLOBAL'],
    countries: ['EU'],
    currencies: ['EUR'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
  },
];

const CORE_MARKET_RSS_PROVIDERS: RssNewsProviderConfig[] = [
  {
    id: 'rss-yahoo-us-market',
    name: 'Yahoo Finance U.S. Market RSS',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EDJI,%5EIXIC&region=US&lang=en-US',
    sourceType: 'market_data_provider',
    priority: 3,
    reliabilityScore: 0.73,
    officialSource: false,
    sourceNetworkId: 'yahoo.com',
    supportedMarkets: ['US'],
    marketCodes: ['US'],
    exchangeCodes: ['NYSE', 'NASDAQ'],
    countries: ['US'],
    symbols: ['^GSPC', '^DJI', '^IXIC'],
    assetTypes: ['index'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-google-global-markets',
    name: 'Google News Global Markets RSS',
    url: 'https://news.google.com/rss/search?q=global%20financial%20markets%20stocks%20bonds%20currencies&hl=en-US&gl=US&ceid=US:en',
    sourceType: 'public_rss',
    priority: 4,
    reliabilityScore: 0.65,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: ['GLOBAL'],
    marketCodes: ['GLOBAL'],
    originalLanguage: 'en',
  },
];

const GULF_RSS_PROVIDERS: RssNewsProviderConfig[] = [
  {
    id: 'official-boursa-kuwait-disclosures',
    name: 'Boursa Kuwait — Company Disclosures',
    // Boursa Kuwait documents this as its Arabic company-disclosures RSS feed.
    // It is a first-party disclosure channel, so it must not depend on a
    // regional publisher mentioning Kuwait in the headline.
    url: 'https://rss.boursakuwait.com.kw/A/rss/FeedFull.aspx?T=4',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'boursakuwait.com.kw',
    supportedMarkets: ['GULF', 'KW', 'KUWAIT'],
    marketCodes: ['GULF', 'KW', 'KUWAIT'],
    exchangeCodes: ['Boursa Kuwait'],
    countries: ['KW'],
    assetTypes: ['equity', 'fund'],
    originalLanguage: 'ar',
    revalidateSeconds: 180,
    preserveArticleHash: true,
  },
  {
    id: 'official-boursa-kuwait-announcements',
    name: 'Boursa Kuwait — Issuer Announcements',
    // First-party issuer announcements complement the disclosures feed and
    // cover timely exchange notices that do not use the disclosure type.
    url: 'https://rss.boursakuwait.com.kw/A/rss/feedboursa.aspx',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'boursakuwait.com.kw',
    supportedMarkets: ['GULF', 'KW', 'KUWAIT'],
    marketCodes: ['GULF', 'KW', 'KUWAIT'],
    exchangeCodes: ['Boursa Kuwait'],
    countries: ['KW'],
    assetTypes: ['equity', 'fund'],
    originalLanguage: 'ar',
    revalidateSeconds: 180,
    preserveArticleHash: true,
  },
  {
    id: 'official-msx-company-disclosures',
    name: 'Muscat Stock Exchange — Company Disclosures',
    // MSX publishes its issuer announcements in a first-party RSS feed.
    url: 'https://www.msx.om/rss.aspx?t=Company',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'msx.om',
    supportedMarkets: ['GULF', 'OM', 'OMAN', 'oman'],
    marketCodes: ['GULF', 'OM', 'OMAN'],
    exchangeCodes: ['MSX'],
    countries: ['OM'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
  },
  {
    id: 'official-msx-circulars',
    name: 'Muscat Stock Exchange — Circulars',
    // Circulars cover exchange notices and material market decisions.
    url: 'https://www.msx.om/rss.aspx?t=Circulars',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.99,
    officialSource: true,
    sourceNetworkId: 'msx.om',
    supportedMarkets: ['GULF', 'OM', 'OMAN', 'oman'],
    marketCodes: ['GULF', 'OM', 'OMAN'],
    exchangeCodes: ['MSX'],
    countries: ['OM'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
  },
  {
    id: 'official-saudi-exchange-announcements',
    name: 'Saudi Exchange — Issuer Announcements',
    // Saudi Exchange does not expose a stable server-readable RSS endpoint.
    // This feed is constrained to its first-party domain, and the parser only
    // labels an item official when the item's publisher remains that domain.
    url: 'https://news.google.com/rss/search?q=site%3Asaudiexchange.sa%20%28announcement%20OR%20disclosure%20OR%20financial%20results%29&hl=en&gl=SA&ceid=SA%3Aen',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.96,
    officialSource: true,
    officialSourceDomains: ['saudiexchange.sa'],
    sourceNetworkId: 'saudiexchange.sa',
    supportedMarkets: ['GULF', 'SA', 'SAUDI', 'saudi'],
    marketCodes: ['GULF', 'SA', 'SAUDI'],
    exchangeCodes: ['Tadawul'],
    countries: ['SA'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 300,
  },
  {
    id: 'official-qatar-exchange-announcements',
    name: 'Qatar Stock Exchange — Disclosures',
    // QSE's official disclosure records are indexed from its first-party
    // domain; source-domain validation prevents a non-QSE result being shown
    // as an official exchange notice.
    url: 'https://news.google.com/rss/search?q=site%3Aqe.com.qa%20%28disclosure%20OR%20announcement%20OR%20financial%20results%29&hl=en&gl=QA&ceid=QA%3Aen',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.94,
    officialSource: true,
    officialSourceDomains: ['qe.com.qa'],
    sourceNetworkId: 'qe.com.qa',
    supportedMarkets: ['GULF', 'QA', 'QATAR', 'qatar'],
    marketCodes: ['GULF', 'QA', 'QATAR'],
    exchangeCodes: ['QSE'],
    countries: ['QA'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 300,
  },
  {
    id: 'official-bahrain-bourse-announcements',
    name: 'Bahrain Bourse — Announcements',
    url: 'https://news.google.com/rss/search?q=site%3Abahrainbourse.com%20%28disclosure%20OR%20announcement%20OR%20financial%20results%29&hl=en&gl=BH&ceid=BH%3Aen',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.94,
    officialSource: true,
    officialSourceDomains: ['bahrainbourse.com'],
    sourceNetworkId: 'bahrainbourse.com',
    supportedMarkets: ['GULF', 'BH', 'BAHRAIN', 'bahrain'],
    marketCodes: ['GULF', 'BH', 'BAHRAIN'],
    exchangeCodes: ['Bahrain Bourse'],
    countries: ['BH'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    revalidateSeconds: 300,
  },
  {
    id: 'official-adx-announcements',
    name: 'Abu Dhabi Securities Exchange — Announcements',
    url: 'https://news.google.com/rss/search?q=site%3Aadx.ae%20%28disclosure%20OR%20announcement%20OR%20financial%20results%29&hl=en&gl=AE&ceid=AE%3Aen',
    sourceType: 'official_exchange',
    priority: 1,
    reliabilityScore: 0.93,
    officialSource: true,
    officialSourceDomains: ['adx.ae'],
    sourceNetworkId: 'adx.ae',
    supportedMarkets: ['GULF', 'ADX', 'AE', 'UAE', 'uae-adx'],
    marketCodes: ['GULF', 'ADX', 'AE', 'UAE'],
    exchangeCodes: ['ADX'],
    countries: ['AE'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    eventType: 'exchange_announcement',
    revalidateSeconds: 300,
  },
  {
    id: 'rss-adx-market-news-fallback',
    name: 'ADX Market News',
    // A reputable-news fallback keeps the ADX panel useful if the exchange's
    // own public results have not published a recent notice.
    url: 'https://news.google.com/rss/search?q=%28ADX%20OR%20%22Abu%20Dhabi%20Securities%20Exchange%22%29%20%28announcement%20OR%20disclosure%20OR%20financial%20results%29&hl=en&gl=AE&ceid=AE%3Aen',
    sourceType: 'regional_market_publication',
    priority: 3,
    reliabilityScore: 0.76,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: ['GULF', 'ADX', 'AE', 'UAE', 'uae-adx'],
    marketCodes: ['GULF', 'ADX', 'AE', 'UAE'],
    exchangeCodes: ['ADX'],
    countries: ['AE'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    eventType: 'exchange_announcement',
    revalidateSeconds: 300,
  },
  {
    id: 'rss-qatar-exchange-market-news-fallback',
    name: 'Qatar Stock Exchange Market News',
    url: 'https://news.google.com/rss/search?q=%22Qatar%20Stock%20Exchange%22%20%28announcement%20OR%20disclosure%20OR%20financial%20results%29&hl=en&gl=QA&ceid=QA%3Aen',
    sourceType: 'regional_market_publication',
    priority: 3,
    reliabilityScore: 0.76,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: ['GULF', 'QA', 'QATAR', 'qatar'],
    marketCodes: ['GULF', 'QA', 'QATAR'],
    exchangeCodes: ['QSE'],
    countries: ['QA'],
    assetTypes: ['equity', 'fund', 'bond'],
    originalLanguage: 'en',
    eventType: 'exchange_announcement',
    revalidateSeconds: 300,
  },
  {
    id: 'rss-arab-news-economy',
    name: 'Arab News Business & Economy',
    url: 'https://www.arabnews.com/cat/4/rss.xml',
    sourceType: 'regional_market_publication',
    priority: 3,
    reliabilityScore: 0.76,
    officialSource: false,
    sourceNetworkId: 'arabnews.com',
    supportedMarkets: ['GULF', 'SA', 'SAUDI'],
    // This is a regional section, not a Saudi-exchange disclosure feed.
    // Story-level entity resolution must establish market attribution.
    assetTypes: ['equity', 'fund', 'bond', 'commodity'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-asharq-alawsat-economy',
    name: 'Asharq Al-Awsat Economy',
    url: 'https://aawsat.com/feed/economy',
    sourceType: 'regional_market_publication',
    priority: 3,
    reliabilityScore: 0.76,
    officialSource: false,
    sourceNetworkId: 'aawsat.com',
    supportedMarkets: ['GULF', 'SA', 'KW', 'OM', 'BH', 'DFM', 'ADX', 'QA'],
    assetTypes: ['equity', 'fund', 'bond', 'commodity', 'currency'],
    originalLanguage: 'ar',
  },
  {
    id: 'rss-gulf-today-business',
    name: 'Gulf Today Business',
    url: 'https://www.gulftoday.ae/rssFeed/52/',
    sourceType: 'regional_market_publication',
    priority: 4,
    reliabilityScore: 0.7,
    officialSource: false,
    sourceNetworkId: 'gulftoday.ae',
    supportedMarkets: ['GULF', 'DFM', 'ADX', 'AE'],
    assetTypes: ['equity', 'fund', 'bond', 'commodity'],
    originalLanguage: 'en',
  },
];

const CRYPTO_RSS_PROVIDERS: RssNewsProviderConfig[] = [
  {
    id: 'rss-coindesk-crypto',
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    sourceType: 'financial_publication',
    priority: 3,
    reliabilityScore: 0.79,
    officialSource: false,
    sourceNetworkId: 'coindesk.com',
    supportedMarkets: ['CRYPTO'],
    marketCodes: ['CRYPTO'],
    assetTypes: ['crypto'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-cointelegraph-crypto',
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    sourceType: 'industry_publication',
    priority: 4,
    reliabilityScore: 0.68,
    officialSource: false,
    sourceNetworkId: 'cointelegraph.com',
    supportedMarkets: ['CRYPTO'],
    marketCodes: ['CRYPTO'],
    assetTypes: ['crypto'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-decrypt-crypto',
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    sourceType: 'industry_publication',
    priority: 4,
    reliabilityScore: 0.72,
    officialSource: false,
    sourceNetworkId: 'decrypt.co',
    supportedMarkets: ['CRYPTO'],
    marketCodes: ['CRYPTO'],
    assetTypes: ['crypto'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-the-block-crypto',
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    sourceType: 'industry_publication',
    priority: 3,
    reliabilityScore: 0.78,
    officialSource: false,
    sourceNetworkId: 'theblock.co',
    supportedMarkets: ['CRYPTO'],
    marketCodes: ['CRYPTO'],
    assetTypes: ['crypto'],
    originalLanguage: 'en',
  },
  {
    id: 'rss-google-crypto',
    name: 'Google News Crypto RSS',
    url: 'https://news.google.com/rss/search?q=(bitcoin%20OR%20ethereum%20OR%20crypto%20OR%20cryptocurrency%20OR%20blockchain%20OR%20bitcoin%20ETF)%20(source%3Areuters.com%20OR%20source%3Acnbc.com%20OR%20source%3Ayahoo.com%20OR%20source%3Ainvesting.com%20OR%20source%3Acoindesk.com%20OR%20source%3Acointelegraph.com)&hl=en-US&gl=US&ceid=US:en',
    sourceType: 'public_rss',
    priority: 4,
    reliabilityScore: 0.65,
    officialSource: false,
    sourceNetworkId: 'news.google.com',
    supportedMarkets: ['CRYPTO'],
    marketCodes: ['CRYPTO'],
    assetTypes: ['crypto'],
    originalLanguage: 'en',
  },
];

function europeRssProviders(): RssNewsProviderConfig[] {
  return EUROPE_RSS_FEEDS.map(feed => {
    const metadata = EUROPE_MARKET_METADATA[feed.market] ?? {
      marketCodes: [String(feed.market).toUpperCase(), 'EUROPE'],
      exchangeCodes: [],
      countries: [],
      symbols: [],
    };
    const yahoo = feed.source.toLowerCase().includes('yahoo');
    return {
      id: `rss-${yahoo ? 'yahoo' : 'google'}-europe-${feed.market}`,
      name: `${feed.source} — ${feed.market}`,
      url: feed.url,
      sourceType: yahoo ? 'market_data_provider' : 'public_rss',
      priority: yahoo ? 3 : 4,
      reliabilityScore: yahoo ? 0.73 : 0.65,
      officialSource: false,
      sourceNetworkId: yahoo ? 'yahoo.com' : 'news.google.com',
      supportedMarkets: metadata.marketCodes,
      marketCodes: metadata.marketCodes,
      exchangeCodes: metadata.exchangeCodes,
      countries: metadata.countries,
      symbols: metadata.symbols,
      assetTypes: ['equity', 'index'],
      originalLanguage: 'en',
    };
  });
}

function stringArray(value: unknown, maximum = 30) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap(item => typeof item === 'string' ? [item.trim()] : []).filter(Boolean))].slice(0, maximum);
}

function customId(value: unknown) {
  const id = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  return id ? `custom-rss-${id}` : null;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function customRssProviders(raw: string | undefined, allowedHostsRaw: string | undefined) {
  const configs: RssNewsProviderConfig[] = [];
  const issues: ProviderRegistryIssue[] = [];
  if (!raw?.trim()) return { configs, issues };
  const allowedHosts = new Set(String(allowedHostsRaw ?? '')
    .split(',')
    .map(value => value.trim().toLowerCase().replace(/\.$/, ''))
    .filter(value => /^[a-z0-9.-]+$/.test(value) && value.includes('.'))
    .slice(0, 100));
  if (Buffer.byteLength(raw, 'utf8') > MAX_CUSTOM_CONFIG_BYTES) {
    return {
      configs,
      issues: [{ providerId: null, code: FinancialNewsProviderErrorCode.INVALID_REQUEST }],
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return {
      configs,
      issues: [{ providerId: null, code: FinancialNewsProviderErrorCode.INVALID_REQUEST }],
    };
  }
  if (!Array.isArray(payload)) {
    return {
      configs,
      issues: [{ providerId: null, code: FinancialNewsProviderErrorCode.INVALID_REQUEST }],
    };
  }

  for (const item of payload.slice(0, MAX_CUSTOM_FEEDS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      issues.push({ providerId: null, code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = customId(record.id ?? record.sourceId);
    const name = String(record.name ?? record.sourceName ?? '').trim().slice(0, 160);
    const sourceTypeValue = String(record.sourceType ?? 'public_rss') as NewsSourceType;
    const urlValue = String(record.url ?? '').trim();
    if (!id || !name || !NEWS_SOURCE_TYPES.includes(sourceTypeValue)) {
      issues.push({ providerId: id, code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
      continue;
    }

    let url: URL;
    try {
      url = assertSafePublicHttpUrl(urlValue, id);
      if (url.protocol !== 'https:' || (url.port && url.port !== '443')) {
        throw new Error('custom-feeds-require-https-default-port');
      }
      if (!allowedHosts.has(url.hostname.toLowerCase().replace(/\.$/, ''))) {
        throw new Error('custom-feed-host-not-allowlisted');
      }
    } catch {
      issues.push({ providerId: id, code: FinancialNewsProviderErrorCode.UNSAFE_URL });
      continue;
    }

    const socialSignal = sourceTypeValue === 'social_signal';
    const assetTypes = stringArray(record.assetTypes)
      .filter((value): value is FinancialAssetType => FINANCIAL_ASSET_TYPES.includes(value as FinancialAssetType));
    configs.push({
      id,
      name,
      url: url.toString(),
      sourceType: sourceTypeValue,
      priority: socialSignal ? 5 : Math.trunc(numberInRange(record.priority, 4, 1, 5)),
      reliabilityScore: socialSignal
        ? Math.min(0.35, numberInRange(record.reliabilityScore, 0.3, 0, 1))
        : numberInRange(record.reliabilityScore, 0.6, 0, 1),
      officialSource: socialSignal ? false : record.officialSource === true || record.isOfficial === true,
      sourceNetworkId: String(record.sourceNetworkId ?? record.sourceNetwork ?? sourceDomainFromUrl(url) ?? '').trim().slice(0, 160) || null,
      supportedMarkets: stringArray(record.supportedMarkets).length > 0 ? stringArray(record.supportedMarkets) : ['GLOBAL'],
      marketCodes: stringArray(record.marketCodes),
      exchangeCodes: stringArray(record.exchangeCodes),
      countries: stringArray(record.countries),
      sectors: stringArray(record.sectors),
      industries: stringArray(record.industries),
      symbols: stringArray(record.symbols),
      companyNames: stringArray(record.companyNames),
      assetTypes,
      currencies: stringArray(record.currencies),
      originalLanguage: String(record.originalLanguage ?? record.language ?? 'unknown').trim().slice(0, 32) || 'unknown',
      enabled: record.enabled !== false,
      revalidateSeconds: Math.trunc(numberInRange(record.revalidateSeconds, 300, 60, 3_600)),
      timeoutMs: Math.trunc(numberInRange(record.timeoutMs, 8_000, 1_000, 15_000)),
      maxBytes: Math.trunc(numberInRange(record.maxBytes, 2 * 1024 * 1024, 64 * 1024, 5 * 1024 * 1024)),
    });
  }
  return { configs, issues };
}

function intersects(requested: string[] | undefined, supported: string[]) {
  if (!requested?.length || supported.includes('GLOBAL')) return true;
  const normalized = new Set(supported.map(value => value.toLowerCase()));
  return requested.some(value => normalized.has(value.toLowerCase()));
}

function matchesParams(provider: FinancialNewsProvider, params: Partial<NewsFetchParams>) {
  if (!provider.enabled) return false;
  if (params.officialOnly && !provider.officialSource) return false;
  if (params.sourceTypes?.length && !params.sourceTypes.includes(provider.sourceType)) return false;
  const hasMarketScope = Boolean(
    params.marketCodes?.length
    || params.exchangeCodes?.length
    || params.countries?.length
    || params.symbols?.length
    || params.assetTypes?.length,
  );
  if (!hasMarketScope) {
    const defaults = new Set(provider.supportedMarkets.map(value => value.toUpperCase()));
    // A general search uses the global/U.S. baseline plus official sources.
    // Regional and crypto feed families are selected only by scoped searches,
    // avoiding a fan-out to every configured source on each generic request.
    if (!provider.officialSource && !defaults.has('GLOBAL') && !defaults.has('US')) return false;
  }
  return intersects(params.marketCodes, provider.supportedMarkets);
}

function descriptor(provider: FinancialNewsProvider, requiredEnvironmentVariable: ConfiguredProviderDescriptor['requiredEnvironmentVariable'] = null): ConfiguredProviderDescriptor {
  return {
    id: provider.id,
    name: provider.name,
    sourceType: provider.sourceType,
    sourceDomain: provider.sourceDomain,
    sourceNetworkId: provider.sourceNetworkId,
    priority: provider.priority,
    reliabilityScore: provider.reliabilityScore,
    officialSource: provider.officialSource,
    supportedMarkets: [...provider.supportedMarkets],
    enabled: provider.enabled,
    configured: true,
    requiredEnvironmentVariable,
  };
}

export function buildFinancialNewsProviderRegistry(
  params: Partial<NewsFetchParams> = {},
  environment: RegistryEnvironment = process.env,
): FinancialNewsProviderRegistry {
  const configurationIssues: ProviderRegistryIssue[] = [];
  const custom = customRssProviders(
    environment.FINANCIAL_NEWS_RSS_FEEDS_JSON,
    environment.FINANCIAL_NEWS_RSS_ALLOWED_HOSTS,
  );
  configurationIssues.push(...custom.issues);

  const rssConfigs = [
    ...OFFICIAL_RSS_PROVIDERS,
    ...CORE_MARKET_RSS_PROVIDERS,
    ...GULF_RSS_PROVIDERS,
    ...CRYPTO_RSS_PROVIDERS,
    ...europeRssProviders(),
    ...custom.configs,
  ];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const providers: FinancialNewsProvider[] = [];

  for (const config of rssConfigs) {
    let canonicalFeedUrl: string;
    try {
      canonicalFeedUrl = assertSafePublicHttpUrl(config.url, config.id).toString();
    } catch {
      configurationIssues.push({ providerId: config.id, code: FinancialNewsProviderErrorCode.UNSAFE_URL });
      continue;
    }
    if (seenIds.has(config.id) || seenUrls.has(canonicalFeedUrl)) {
      configurationIssues.push({ providerId: config.id, code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
      continue;
    }
    seenIds.add(config.id);
    seenUrls.add(canonicalFeedUrl);
    try {
      const provider = createRssNewsProvider(config);
      if (matchesParams(provider, params)) providers.push(provider);
    } catch {
      configurationIssues.push({ providerId: config.id, code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
    }
  }

  // DFM exposes a public JSON disclosure endpoint rather than RSS. Register it
  // alongside the feed providers so Gulf screens always use the exchange's
  // first-party notices where that interface is available.
  try {
    const provider = createDfmEfsahNewsProvider();
    if (seenIds.has(provider.id)) {
      configurationIssues.push({ providerId: provider.id, code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
    } else {
      seenIds.add(provider.id);
      if (matchesParams(provider, params)) providers.push(provider);
    }
  } catch {
    configurationIssues.push({ providerId: 'official-dfm-disclosures', code: FinancialNewsProviderErrorCode.INVALID_REQUEST });
  }

  const finnhubKey = cleanCredential(environment.FINNHUB_API_KEY);
  if (finnhubKey) {
    const provider = createFinnhubNewsProvider(finnhubKey);
    if (matchesParams(provider, params)) providers.push(provider);
  } else {
    configurationIssues.push({ providerId: 'finnhub', code: FinancialNewsProviderErrorCode.NOT_CONFIGURED });
  }

  const newsApiKey = cleanCredential(environment.NEWS_API_KEY)
    ?? cleanCredential(environment.CENTRAL_BANK_NEWS_API_KEY);
  if (newsApiKey) {
    const provider = createNewsApiProvider(newsApiKey);
    if (matchesParams(provider, params)) providers.push(provider);
  } else {
    configurationIssues.push({ providerId: 'newsapi', code: FinancialNewsProviderErrorCode.NOT_CONFIGURED });
  }

  return {
    providers,
    sources: providers.map(provider => ({
      sourceId: provider.sourceId,
      sourceName: provider.sourceName,
      sourceType: provider.sourceType,
      sourceDomain: provider.sourceDomain,
      sourceNetworkId: provider.sourceNetworkId,
      sourceNetwork: provider.sourceNetwork,
      reliabilityScore: provider.reliabilityScore,
      priority: provider.priority,
      officialSource: provider.officialSource,
      supportedMarkets: [...provider.supportedMarkets],
      lastSuccessfulFetch: provider.lastSuccessfulFetch,
      lastFailedFetch: provider.lastFailedFetch,
      averageLatency: provider.averageLatency,
      healthStatus: provider.healthStatus,
      failureCount: provider.failureCount,
      enabled: provider.enabled,
      rateLimitState: provider.rateLimitState,
      disabledUntil: provider.disabledUntil,
    })),
    configurationIssues,
  };
}

export function createFinancialNewsProviders(params: Partial<NewsFetchParams> = {}): FinancialNewsProvider[] {
  return buildFinancialNewsProviderRegistry(params).providers;
}

export function getConfiguredProviderDescriptors(params: Partial<NewsFetchParams> = {}): ConfiguredProviderDescriptor[] {
  const registry = buildFinancialNewsProviderRegistry(params);
  const descriptors = registry.providers.map(provider => descriptor(
    provider,
    provider.id === 'finnhub' ? 'FINNHUB_API_KEY' : provider.id === 'newsapi' ? 'NEWS_API_KEY or CENTRAL_BANK_NEWS_API_KEY' : null,
  ));
  const ids = new Set(descriptors.map(item => item.id));
  if (!ids.has('finnhub')) {
    descriptors.push({
      id: 'finnhub',
      name: 'Finnhub',
      sourceType: 'market_data_provider',
      sourceDomain: 'finnhub.io',
      sourceNetworkId: 'finnhub.io',
      priority: 3,
      reliabilityScore: 0.8,
      officialSource: false,
      supportedMarkets: ['GLOBAL'],
      enabled: false,
      configured: false,
      requiredEnvironmentVariable: 'FINNHUB_API_KEY',
    });
  }
  if (!ids.has('newsapi')) {
    descriptors.push({
      id: 'newsapi',
      name: 'NewsAPI',
      sourceType: 'market_data_provider',
      sourceDomain: 'newsapi.org',
      sourceNetworkId: 'newsapi.org',
      priority: 3,
      reliabilityScore: 0.76,
      officialSource: false,
      supportedMarkets: ['GLOBAL'],
      enabled: false,
      configured: false,
      requiredEnvironmentVariable: 'NEWS_API_KEY or CENTRAL_BANK_NEWS_API_KEY',
    });
  }
  return descriptors.sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
}
