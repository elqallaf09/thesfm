export type MarketExchangeId =
  | 'BOURSA_KUWAIT'
  | 'TADAWUL'
  | 'DFM'
  | 'NASDAQ_DUBAI'
  | 'ADX'
  | 'QSE'
  | 'BAHRAIN_BOURSE'
  | 'MUSCAT'
  | 'US';

export type MarketExchangeCoverage = 'bundled_official' | 'dynamic_official' | 'requires_sync';

export type MarketExchangeOption = {
  id: MarketExchangeId;
  labelAr: string;
  labelEn: string;
  country: string;
  currency: string;
  coverage: MarketExchangeCoverage;
  sourceUrl: string;
  aliases: string[];
};

export const MARKET_EXCHANGE_OPTIONS: MarketExchangeOption[] = [
  {
    id: 'BOURSA_KUWAIT',
    labelAr: 'بورصة الكويت',
    labelEn: 'Boursa Kuwait',
    country: 'KW',
    currency: 'KWD',
    coverage: 'bundled_official',
    sourceUrl: 'https://www.boursakuwait.com.kw/en/securities/prices-and-screens/market-watch',
    aliases: ['BOURSA_KUWAIT', 'KSE', 'KW', 'KUWAIT', 'BOURSA KUWAIT', 'بورصة الكويت'],
  },
  {
    id: 'TADAWUL',
    labelAr: 'السوق المالية السعودية',
    labelEn: 'Saudi Exchange / Tadawul',
    country: 'SA',
    currency: 'SAR',
    coverage: 'requires_sync',
    sourceUrl: 'https://www.saudiexchange.sa/wps/portal/saudiexchange/trading/participants-directory/issuer-directory',
    aliases: ['TADAWUL', 'SAUDI', 'SAUDI_EXCHANGE', 'SA', 'SR', 'السوق السعودية', 'تداول'],
  },
  {
    id: 'DFM',
    labelAr: 'سوق دبي المالي',
    labelEn: 'Dubai Financial Market',
    country: 'AE',
    currency: 'AED',
    coverage: 'bundled_official',
    sourceUrl: 'https://www.dfm.ae/the-exchange/market-information/listed-securities',
    aliases: ['DFM', 'DUBAI', 'DUBAI FINANCIAL MARKET', 'DU', 'سوق دبي المالي'],
  },
  {
    id: 'NASDAQ_DUBAI',
    labelAr: 'ناسداك دبي',
    labelEn: 'Nasdaq Dubai',
    country: 'AE',
    currency: 'USD',
    coverage: 'bundled_official',
    sourceUrl: 'https://www.nasdaqdubai.com/products/securities',
    aliases: ['NASDAQ_DUBAI', 'NASDAQ DUBAI', 'NDX', 'ناسداك دبي'],
  },
  {
    id: 'ADX',
    labelAr: 'سوق أبوظبي للأوراق المالية',
    labelEn: 'Abu Dhabi Securities Exchange',
    country: 'AE',
    currency: 'AED',
    coverage: 'requires_sync',
    sourceUrl: 'https://www.adx.ae/english/Pages/securities/securities.aspx',
    aliases: ['ADX', 'ABU DHABI', 'ABU DHABI SECURITIES EXCHANGE', 'AD', 'سوق أبوظبي'],
  },
  {
    id: 'QSE',
    labelAr: 'بورصة قطر',
    labelEn: 'Qatar Stock Exchange',
    country: 'QA',
    currency: 'QAR',
    coverage: 'requires_sync',
    sourceUrl: 'https://www.qe.com.qa/listed-companies',
    aliases: ['QSE', 'QATAR', 'QE', 'QA', 'بورصة قطر'],
  },
  {
    id: 'BAHRAIN_BOURSE',
    labelAr: 'بورصة البحرين',
    labelEn: 'Bahrain Bourse',
    country: 'BH',
    currency: 'BHD',
    coverage: 'requires_sync',
    sourceUrl: 'https://www.bahrainbourse.com/listed-companies',
    aliases: ['BAHRAIN_BOURSE', 'BAHRAIN', 'BHB', 'BH', 'بورصة البحرين'],
  },
  {
    id: 'MUSCAT',
    labelAr: 'بورصة مسقط',
    labelEn: 'Muscat Stock Exchange',
    country: 'OM',
    currency: 'OMR',
    coverage: 'requires_sync',
    sourceUrl: 'https://www.msx.om/companies',
    aliases: ['MUSCAT', 'MSX', 'OMAN', 'OM', 'بورصة مسقط'],
  },
  {
    id: 'US',
    labelAr: 'الأسواق الأمريكية',
    labelEn: 'US Markets',
    country: 'US',
    currency: 'USD',
    coverage: 'dynamic_official',
    sourceUrl: 'https://www.nasdaqtrader.com/trader.aspx?id=symboldirdefs',
    aliases: ['US', 'USA', 'NASDAQ', 'NYSE', 'AMEX', 'NYSE ARCA', 'الأسواق الأمريكية'],
  },
];

const OPTION_BY_ID = new Map(MARKET_EXCHANGE_OPTIONS.map(option => [option.id, option]));

export function getMarketExchangeOption(exchange: unknown) {
  const normalized = normalizeMarketExchange(exchange);
  return normalized ? OPTION_BY_ID.get(normalized) ?? null : null;
}

export function normalizeMarketExchange(exchange: unknown): MarketExchangeId | null {
  const value = String(exchange ?? '').trim();
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[.\s-]+/g, '_');
  for (const option of MARKET_EXCHANGE_OPTIONS) {
    if (option.id === normalized) return option.id;
    if (option.aliases.some(alias => alias.toUpperCase().replace(/[.\s-]+/g, '_') === normalized)) return option.id;
  }
  return null;
}

export function marketExchangeAliases(exchange: unknown) {
  const option = getMarketExchangeOption(exchange);
  if (!option) return [];
  return Array.from(new Set([
    option.id,
    option.labelAr,
    option.labelEn,
    option.country,
    ...option.aliases,
  ].filter(Boolean)));
}

export function marketExchangeLabel(exchange: unknown, locale: 'ar' | 'en' = 'en') {
  const option = getMarketExchangeOption(exchange);
  if (!option) return String(exchange ?? '').trim();
  return locale === 'ar' ? option.labelAr : option.labelEn;
}

export function exchangeRequiresSymbolSync(exchange: unknown) {
  return getMarketExchangeOption(exchange)?.coverage === 'requires_sync';
}
