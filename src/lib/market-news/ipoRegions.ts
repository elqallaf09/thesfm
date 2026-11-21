// Regional IPO coverage. Each region searches several independent references:
// regional Google News editions (in the region's own languages), a
// publisher-restricted query over specialist financial outlets, and — where the
// registry already has them — first-party exchange/regulator feeds. No article,
// company or listing is ever inferred from this configuration; it only decides
// where to search and which words count as IPO evidence.

export const IPO_TOPIC_IDS = [
  'ipo-us-news',
  'ipo-asia-news',
  'ipo-europe-news',
  'ipo-uk-news',
  'ipo-gulf-news',
  'ipo-arab-news',
] as const;

export type IpoTopicId = typeof IPO_TOPIC_IDS[number];

export type IpoFeedLanguage = 'en' | 'ar' | 'fr' | 'de';

export type IpoEdition = {
  /** Google News country edition (gl). */
  country: string;
  language: IpoFeedLanguage;
};

export type IpoRegionConfig = {
  /** Market code stamped on every story from this region's feeds. */
  marketCodes: string[];
  /** Search window in days. */
  days: number;
  /** Exchanges / venues that scope the search to this region. */
  venues: string[];
  /** Regional Google News editions to query (one feed each). */
  editions: IpoEdition[];
  /** Region-specialist publishers: searched without a venue clause. */
  regionalPublishers: string[];
  /** Global wires: searched only together with the region's venues. */
  globalPublishers: string[];
  /** Registry provider id prefixes reused for first-party coverage. */
  registryProviderPrefixes: string[];
};

// Multilingual IPO vocabulary. Every alternative is an OR clause, so a story
// only needs one of them; the provider/query filters treat them as alternatives.
export const IPO_TERMS = [
  'IPO',
  '"initial public offering"',
  '"public offering"',
  '"direct listing"',
  '"trading debut"',
  '"market debut"',
  '"begins trading"',
  '"files to go public"',
  'flotation',
  '"stock market listing"',
  '"introduction en Bourse"',
  'Börsengang',
  'اكتتاب',
  '"طرح عام"',
  '"طرح أولي"',
  'إدراج',
] as const;

export const IPO_REGIONS: Record<IpoTopicId, IpoRegionConfig> = {
  'ipo-us-news': {
    marketCodes: ['US'],
    days: 30,
    venues: ['Nasdaq', 'NYSE', '"Wall Street"', 'SEC', 'ناسداك', '"السوق الأمريكية"'],
    editions: [
      { country: 'US', language: 'en' },
      { country: 'US', language: 'ar' },
    ],
    regionalPublishers: ['cnbc.com', 'marketwatch.com', 'nasdaq.com', 'renaissancecapital.com', 'iposcoop.com', 'barrons.com'],
    globalPublishers: ['reuters.com', 'bloomberg.com', 'apnews.com'],
    registryProviderPrefixes: ['official-sec-'],
  },
  'ipo-asia-news': {
    marketCodes: ['ASIA'],
    days: 30,
    venues: [
      '"Hong Kong"', 'HKEX', 'Shanghai', 'Shenzhen', '"STAR Market"', 'Tokyo', '"Japan Exchange"',
      '"National Stock Exchange"', 'NSE', 'BSE', 'SGX', 'Singapore', 'KOSPI', 'KOSDAQ', 'Korea',
      'Taiwan', 'Indonesia', 'Malaysia', '"Bursa Malaysia"', 'Thailand', 'Vietnam',
      'هونغ كونغ', 'شنغهاي', 'طوكيو', 'الهند', 'آسيا',
    ],
    editions: [
      { country: 'HK', language: 'en' },
      { country: 'SG', language: 'en' },
      { country: 'IN', language: 'en' },
      { country: 'US', language: 'ar' },
    ],
    regionalPublishers: ['scmp.com', 'asia.nikkei.com', 'economictimes.indiatimes.com', 'moneycontrol.com', 'livemint.com', 'caixinglobal.com', 'theedgesingapore.com'],
    globalPublishers: ['reuters.com', 'bloomberg.com', 'cnbc.com'],
    registryProviderPrefixes: [],
  },
  'ipo-europe-news': {
    marketCodes: ['EUROPE'],
    days: 30,
    venues: [
      'Euronext', 'Frankfurt', 'Xetra', '"Deutsche Börse"', 'Paris', 'Amsterdam', 'Milan', 'Madrid',
      '"SIX Swiss"', 'Zurich', 'Stockholm', 'Copenhagen', 'Oslo', 'Warsaw', 'Europe', 'European',
      'Bourse', 'Börse', 'أوروبا', 'الأوروبية', 'فرانكفورت', 'باريس',
    ],
    editions: [
      { country: 'IE', language: 'en' },
      { country: 'FR', language: 'fr' },
      { country: 'DE', language: 'de' },
      { country: 'US', language: 'ar' },
    ],
    regionalPublishers: ['euronext.com', 'handelsblatt.com', 'lesechos.fr', 'boerse-frankfurt.de', 'ipo-insights.com', 'boursorama.com'],
    globalPublishers: ['reuters.com', 'ft.com', 'bloomberg.com'],
    registryProviderPrefixes: ['official-ecb-'],
  },
  'ipo-uk-news': {
    marketCodes: ['UK'],
    days: 30,
    venues: ['"London Stock Exchange"', 'LSE', 'AIM', 'London', 'FTSE', 'UK', 'Britain', 'British', 'لندن', 'بريطانيا', 'البريطانية'],
    editions: [
      { country: 'GB', language: 'en' },
      { country: 'US', language: 'ar' },
    ],
    regionalPublishers: ['cityam.com', 'proactiveinvestors.co.uk', 'londonstockexchange.com', 'thisismoney.co.uk', 'sharesmagazine.co.uk'],
    globalPublishers: ['reuters.com', 'ft.com', 'theguardian.com', 'bloomberg.com'],
    registryProviderPrefixes: [],
  },
  'ipo-gulf-news': {
    marketCodes: ['GULF'],
    days: 45,
    venues: [
      'Tadawul', '"Saudi Exchange"', 'Nomu', 'ADX', '"Abu Dhabi"', 'DFM', 'Dubai', '"Boursa Kuwait"',
      'Kuwait', '"Qatar Stock Exchange"', 'Qatar', '"Bahrain Bourse"', 'Bahrain', '"Muscat Stock Exchange"', 'Oman',
      'تداول', '"السوق السعودية"', 'نمو', 'أبوظبي', 'دبي', '"بورصة الكويت"', 'الكويت', '"بورصة قطر"', 'قطر',
      '"بورصة البحرين"', 'البحرين', '"بورصة مسقط"', 'عمان', 'الخليج', 'الخليجية',
    ],
    editions: [
      { country: 'SA', language: 'ar' },
      { country: 'AE', language: 'en' },
      { country: 'KW', language: 'ar' },
      { country: 'AE', language: 'ar' },
    ],
    regionalPublishers: ['argaam.com', 'aleqt.com', 'alqabas.com', 'asharqbusiness.com', 'thenationalnews.com', 'gulfnews.com'],
    globalPublishers: ['reuters.com', 'zawya.com', 'arabnews.com', 'bloomberg.com'],
    registryProviderPrefixes: [
      'official-boursa-kuwait-', 'official-msx-', 'official-saudi-exchange-', 'official-qatar-exchange-',
      'official-bahrain-bourse-', 'official-adx-',
    ],
  },
  'ipo-arab-news': {
    marketCodes: ['ARAB'],
    days: 45,
    venues: [
      'EGX', '"Egyptian Exchange"', 'Egypt', 'Casablanca', 'Morocco', '"Amman Stock Exchange"', 'Jordan',
      'Tunisia', 'Tunis', 'Iraq', 'Lebanon', 'Algeria',
      '"البورصة المصرية"', 'مصر', '"بورصة الدار البيضاء"', 'المغرب', '"بورصة عمان"', 'الأردن',
      '"بورصة تونس"', 'تونس', 'العراق', 'لبنان', 'الجزائر', '"Bourse de Casablanca"', '"Bourse de Tunis"',
    ],
    editions: [
      { country: 'EG', language: 'ar' },
      { country: 'MA', language: 'fr' },
      { country: 'JO', language: 'ar' },
      { country: 'EG', language: 'en' },
    ],
    regionalPublishers: ['enterprise.press', 'alborsaanews.com', 'almalnews.com', 'hespress.com', 'medias24.com', 'mubasher.info'],
    globalPublishers: ['reuters.com', 'zawya.com', 'cnbcarabia.com', 'asharqbusiness.com'],
    registryProviderPrefixes: [],
  },
};

// Google matches venue words anywhere in an article body, so a dominant story
// from one market (a record US IPO, say) leaks into every regional search. A
// regional IPO page therefore also needs the region named in the headline or
// summary (publisher names do not count: regional outlets cover US IPOs
// too). US coverage is the default market
// for IPO news and needs no extra evidence.
const IPO_REGION_EVIDENCE: Partial<Record<IpoTopicId, readonly string[]>> = {
  'ipo-asia-news': [
    'Hong Kong', 'HKEX', 'Shanghai', 'Shenzhen', 'STAR Market', 'Beijing', 'China', 'Chinese', 'Tokyo', 'Japan',
    'Japanese', 'TSE', 'India', 'Indian', 'NSE', 'BSE', 'SEBI', 'Mumbai', 'Dalal Street', 'Singapore', 'SGX', 'Korea',
    'Korean', 'KOSPI', 'KOSDAQ', 'KRX', 'Taiwan', 'TWSE', 'Indonesia', 'Malaysia', 'Bursa Malaysia', 'Thailand',
    'Vietnam', 'Philippines', 'Asia', 'Asian',
    'yuan', 'renminbi', 'yen', 'rupee', 'rupees', 'crore', 'Sensex', 'Nifty', 'Hang Seng', 'Nikkei 225',
    'هونغ كونغ', 'الصين', 'الصينية', 'شنغهاي', 'اليابان', 'اليابانية', 'طوكيو', 'الهند', 'الهندية', 'سنغافورة',
    'كوريا', 'الكورية', 'آسيا', 'الآسيوية',
  ],
  'ipo-europe-news': [
    'Euronext', 'Frankfurt', 'Xetra', 'Deutsche Börse', 'Germany', 'German', 'Deutschland', 'Paris', 'France', 'French',
    'Amsterdam', 'Dutch', 'Netherlands', 'Milan', 'Italy', 'Italian', 'Madrid', 'Spain', 'Spanish', 'Swiss',
    'Switzerland', 'SIX Swiss', 'Zurich', 'Stockholm', 'Sweden', 'Swedish', 'Nasdaq Nordic', 'Copenhagen', 'Denmark', 'Oslo',
    'Norway', 'Helsinki', 'Finland', 'Warsaw', 'Poland', 'Vienna', 'Austria', 'Brussels', 'Belgium', 'Lisbon',
    'Dublin', 'Europe', 'European', 'Stoxx',
    'DAX', 'CAC 40', 'Bourse de Paris', 'Frankfurter Börse',
    'أوروبا', 'الأوروبية', 'ألمانيا', 'الألمانية', 'فرنسا', 'الفرنسية', 'فرانكفورت', 'باريس', 'أمستردام', 'سويسرا',
  ],
  'ipo-uk-news': [
    'London', 'LSE', 'London Stock Exchange', 'AIM-listed', 'AIM market', 'FTSE', 'UK', 'U.K.', 'Britain', 'British', 'England',
    'Scotland', 'plc', 'intention to float',
    'sterling', 'pence',
    'لندن', 'بريطانيا', 'البريطانية', 'البريطاني',
  ],
  'ipo-gulf-news': [
    'Tadawul', 'Saudi', 'Nomu', 'ADX', 'Abu Dhabi', 'DFM', 'Dubai', 'UAE', 'Emirati', 'Kuwait', 'Kuwaiti', 'Boursa',
    'Qatar', 'Qatari', 'QSE', 'Bahrain', 'Muscat', 'Oman', 'Omani', 'MSX', 'Gulf', 'GCC', 'Riyadh',
    'riyal', 'riyals', 'dirham', 'dirhams', 'AED', 'Kuwaiti dinar', 'Bahraini dinar', 'TASI',
    'تداول السعودية', 'السوق المالية السعودية', 'السعودية', 'السعودي', 'سوق نمو', 'نمو الموازية', 'أبوظبي', 'أبو ظبي', 'دبي', 'الإمارات', 'الإماراتية', 'الكويت',
    'الكويتية', 'قطر', 'القطرية', 'البحرين', 'البحرينية', 'مسقط', 'عمان', 'العمانية', 'الخليج', 'الخليجية', 'الرياض',
    'السوق الرئيسية', 'السوق الموازية', 'تاسي', 'هيئة السوق المالية', 'هيئة الأوراق المالية',
    'ريال', 'ريالا', 'ريالات', 'درهم', 'دراهم', 'دينار كويتي', 'دينار بحريني',
  ],
  'ipo-arab-news': [
    'Egypt', 'Egyptian', 'EGX', 'Cairo', 'Morocco', 'Moroccan', 'Casablanca', 'Maroc', 'marocaine', 'Jordan',
    'Jordanian', 'Amman', 'Tunisia', 'Tunisie', 'Tunis', 'Iraq', 'Lebanon', 'Beirut', 'Algeria', 'Algérie', 'Libya',
    'Egyptian pound', 'EGP', 'MAD', 'Jordanian dinar',
    'مصر', 'المصرية', 'المصري', 'القاهرة', 'المغرب', 'المغربية', 'الدار البيضاء', 'الأردن', 'الأردنية', 'عمان',
    'تونس', 'التونسية', 'العراق', 'العراقية', 'لبنان', 'اللبنانية', 'الجزائر', 'الجزائرية', 'ليبيا', 'سوريا',
    'فلسطين', 'جنيه', 'جنيها', 'جنيهات', 'الرقابة المالية', 'دينار أردني',
  ],
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word match in any script. Arabic terms also accept a single attached
// conjunction/preposition prefix (و، ب، ل، ف) as in «وتداول» or «بالسعودية».
const IPO_REGION_PATTERNS = Object.fromEntries(Object.entries(IPO_REGION_EVIDENCE).map(([topic, terms]) => [
  topic,
  new RegExp(`(?<![\\p{L}\\p{N}])[وبلف]?(?:${[...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'iu'),
])) as Partial<Record<IpoTopicId, RegExp>>;

export function hasIpoRegionEvidence(topic: IpoTopicId, text: string) {
  const pattern = IPO_REGION_PATTERNS[topic];
  return !pattern || pattern.test(text);
}

export function isIpoTopic(value: string): value is IpoTopicId {
  return (IPO_TOPIC_IDS as readonly string[]).includes(value);
}

export function ipoTopicQuery() {
  return IPO_TERMS.join(' OR ');
}

const ARABIC_SCRIPT = /[؀-ۿ]/u;

// Google News caps query length, so each feed only carries the vocabulary of
// its own script. The full multilingual list still drives local filtering.
function termsFor(language: IpoFeedLanguage | 'latin', values: readonly string[]) {
  if (language === 'ar') return values.filter(value => ARABIC_SCRIPT.test(value) || value === 'IPO');
  return values.filter(value => !ARABIC_SCRIPT.test(value));
}

function googleNewsUrl(query: string, edition: IpoEdition) {
  const hl = edition.language === 'en' ? `en-${edition.country}` : edition.language;
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({ q: query, hl, gl: edition.country, ceid: `${edition.country}:${edition.language}` }).toString();
  return url.toString();
}

function anyOf(values: readonly string[]) {
  return `(${values.join(' OR ')})`;
}

/** Regional edition search: IPO vocabulary AND the region's venues, in the edition's script. */
export function ipoEditionFeedUrl(topic: IpoTopicId, edition: IpoEdition) {
  const region = IPO_REGIONS[topic];
  const terms = termsFor(edition.language, IPO_TERMS);
  const venues = termsFor(edition.language, region.venues);
  return googleNewsUrl(`${anyOf(terms)} ${anyOf(venues)} when:${region.days}d`, edition);
}

/** Region-specialist publishers: IPO vocabulary from those outlets only. */
export function ipoRegionalPublisherFeedUrl(topic: IpoTopicId) {
  const region = IPO_REGIONS[topic];
  const sites = region.regionalPublishers.map(site => `site:${site}`);
  return googleNewsUrl(`${anyOf(IPO_TERMS)} ${anyOf(sites)} when:${region.days}d`, region.editions[0]);
}

/** Global wires: IPO vocabulary AND the region's venues, from those outlets only. */
export function ipoGlobalPublisherFeedUrl(topic: IpoTopicId) {
  const region = IPO_REGIONS[topic];
  const sites = region.globalPublishers.map(site => `site:${site}`);
  const edition: IpoEdition = { country: region.editions.find(item => item.language === 'en')?.country ?? 'US', language: 'en' };
  return googleNewsUrl(
    `${anyOf(termsFor('latin', IPO_TERMS))} ${anyOf(termsFor('latin', region.venues))} ${anyOf(sites)} when:${region.days}d`,
    edition,
  );
}

/** Every publisher this region consults, for display as the page's references. */
export function ipoReferenceDomains(topic: IpoTopicId) {
  const region = IPO_REGIONS[topic];
  return [...new Set([...region.regionalPublishers, ...region.globalPublishers])];
}
