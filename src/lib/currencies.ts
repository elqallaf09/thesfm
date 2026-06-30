export type CurrencyLocale = 'ar' | 'en' | 'fr';

export interface Currency {
  code: string;
  symbol: string;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
  nameFr: string;
  decimals: number;
  country: string;
}

export const DEFAULT_CURRENCY = 'KWD';

const CURATED_CURRENCIES: Currency[] = [
  { code: 'KWD', symbol: 'د.ك', symbolAr: 'د.ك', symbolEn: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar', nameFr: 'Dinar koweïtien', decimals: 3, country: 'Kuwait' },
  { code: 'USD', symbol: '$', symbolAr: '$', symbolEn: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', nameFr: 'Dollar américain', decimals: 2, country: 'United States' },
  { code: 'EUR', symbol: '€', symbolAr: '€', symbolEn: '€', nameAr: 'يورو', nameEn: 'Euro', nameFr: 'Euro', decimals: 2, country: 'European Union' },
  { code: 'GBP', symbol: '£', symbolAr: '£', symbolEn: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound', nameFr: 'Livre sterling', decimals: 2, country: 'United Kingdom' },
  { code: 'SAR', symbol: 'ر.س', symbolAr: 'ر.س', symbolEn: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', nameFr: 'Riyal saoudien', decimals: 2, country: 'Saudi Arabia' },
  { code: 'AED', symbol: 'د.إ', symbolAr: 'د.إ', symbolEn: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', nameFr: 'Dirham émirati', decimals: 2, country: 'United Arab Emirates' },
  { code: 'QAR', symbol: 'ر.ق', symbolAr: 'ر.ق', symbolEn: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal', nameFr: 'Riyal qatari', decimals: 2, country: 'Qatar' },
  { code: 'BHD', symbol: 'د.ب', symbolAr: 'د.ب', symbolEn: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar', nameFr: 'Dinar bahreïni', decimals: 3, country: 'Bahrain' },
  { code: 'OMR', symbol: 'ر.ع', symbolAr: 'ر.ع', symbolEn: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial', nameFr: 'Rial omanais', decimals: 3, country: 'Oman' },
  { code: 'JPY', symbol: '¥', symbolAr: '¥', symbolEn: '¥', nameAr: 'ين ياباني', nameEn: 'Japanese Yen', nameFr: 'Yen japonais', decimals: 0, country: 'Japan' },
  { code: 'CNY', symbol: '¥', symbolAr: '¥', symbolEn: '¥', nameAr: 'يوان صيني', nameEn: 'Chinese Yuan', nameFr: 'Yuan chinois', decimals: 2, country: 'China' },
  { code: 'INR', symbol: '₹', symbolAr: '₹', symbolEn: '₹', nameAr: 'روبية هندية', nameEn: 'Indian Rupee', nameFr: 'Roupie indienne', decimals: 2, country: 'India' },
  { code: 'TRY', symbol: '₺', symbolAr: '₺', symbolEn: '₺', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira', nameFr: 'Livre turque', decimals: 2, country: 'Turkey' },
  { code: 'EGP', symbol: 'E£', symbolAr: 'ج.م', symbolEn: 'E£', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', nameFr: 'Livre égyptienne', decimals: 2, country: 'Egypt' },
  { code: 'CAD', symbol: 'C$', symbolAr: 'C$', symbolEn: 'C$', nameAr: 'دولار كندي', nameEn: 'Canadian Dollar', nameFr: 'Dollar canadien', decimals: 2, country: 'Canada' },
  { code: 'AUD', symbol: 'A$', symbolAr: 'A$', symbolEn: 'A$', nameAr: 'دولار أسترالي', nameEn: 'Australian Dollar', nameFr: 'Dollar australien', decimals: 2, country: 'Australia' },
  { code: 'CHF', symbol: 'CHF', symbolAr: 'CHF', symbolEn: 'CHF', nameAr: 'فرنك سويسري', nameEn: 'Swiss Franc', nameFr: 'Franc suisse', decimals: 2, country: 'Switzerland' },
  { code: 'SEK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'kr', nameAr: 'كرونة سويدية', nameEn: 'Swedish Krona', nameFr: 'Couronne suédoise', decimals: 2, country: 'Sweden' },
  { code: 'NOK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'kr', nameAr: 'كرونة نرويجية', nameEn: 'Norwegian Krone', nameFr: 'Couronne norvégienne', decimals: 2, country: 'Norway' },
  { code: 'DKK', symbol: 'kr', symbolAr: 'kr', symbolEn: 'kr', nameAr: 'كرونة دنماركية', nameEn: 'Danish Krone', nameFr: 'Couronne danoise', decimals: 2, country: 'Denmark' },
  { code: 'SGD', symbol: 'S$', symbolAr: 'S$', symbolEn: 'S$', nameAr: 'دولار سنغافوري', nameEn: 'Singapore Dollar', nameFr: 'Dollar de Singapour', decimals: 2, country: 'Singapore' },
  { code: 'HKD', symbol: 'HK$', symbolAr: 'HK$', symbolEn: 'HK$', nameAr: 'دولار هونغ كونغ', nameEn: 'Hong Kong Dollar', nameFr: 'Dollar de Hong Kong', decimals: 2, country: 'Hong Kong' },
  { code: 'MYR', symbol: 'RM', symbolAr: 'RM', symbolEn: 'RM', nameAr: 'رينغيت ماليزي', nameEn: 'Malaysian Ringgit', nameFr: 'Ringgit malaisien', decimals: 2, country: 'Malaysia' },
  { code: 'IDR', symbol: 'Rp', symbolAr: 'Rp', symbolEn: 'Rp', nameAr: 'روبية إندونيسية', nameEn: 'Indonesian Rupiah', nameFr: 'Roupie indonésienne', decimals: 2, country: 'Indonesia' },
  { code: 'THB', symbol: '฿', symbolAr: '฿', symbolEn: '฿', nameAr: 'بات تايلندي', nameEn: 'Thai Baht', nameFr: 'Baht thaïlandais', decimals: 2, country: 'Thailand' },
  { code: 'PHP', symbol: '₱', symbolAr: '₱', symbolEn: '₱', nameAr: 'بيزو فلبيني', nameEn: 'Philippine Peso', nameFr: 'Peso philippin', decimals: 2, country: 'Philippines' },
  { code: 'PKR', symbol: '₨', symbolAr: '₨', symbolEn: 'Rs', nameAr: 'روبية باكستانية', nameEn: 'Pakistani Rupee', nameFr: 'Roupie pakistanaise', decimals: 2, country: 'Pakistan' },
  { code: 'ZAR', symbol: 'R', symbolAr: 'R', symbolEn: 'R', nameAr: 'راند جنوب أفريقي', nameEn: 'South African Rand', nameFr: 'Rand sud-africain', decimals: 2, country: 'South Africa' },
  { code: 'BRL', symbol: 'R$', symbolAr: 'R$', symbolEn: 'R$', nameAr: 'ريال برازيلي', nameEn: 'Brazilian Real', nameFr: 'Réal brésilien', decimals: 2, country: 'Brazil' },
  { code: 'MXN', symbol: 'Mex$', symbolAr: 'Mex$', symbolEn: 'Mex$', nameAr: 'بيزو مكسيكي', nameEn: 'Mexican Peso', nameFr: 'Peso mexicain', decimals: 2, country: 'Mexico' },
  { code: 'KRW', symbol: '₩', symbolAr: '₩', symbolEn: '₩', nameAr: 'وون كوري جنوبي', nameEn: 'South Korean Won', nameFr: 'Won sud-coréen', decimals: 0, country: 'South Korea' },
  { code: 'JOD', symbol: 'د.أ', symbolAr: 'د.أ', symbolEn: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar', nameFr: 'Dinar jordanien', decimals: 3, country: 'Jordan' },
];

const FALLBACK_WORLD_CURRENCIES = [
  'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD',
  'CAD','CDF','CHF','CLP','CNY','COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD',
  'GNF','GTQ','GYD','HKD','HNL','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD',
  'KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK',
  'NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SOS','SRD',
  'SSP','STN','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XOF',
  'XPF','YER','ZAR','ZMW','ZWL',
];

function supportedCurrencyCodes() {
  const intlWithValues = Intl as typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };
  return intlWithValues.supportedValuesOf?.('currency') ?? FALLBACK_WORLD_CURRENCIES;
}

function currencyName(code: string, locale: CurrencyLocale) {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function currencySymbol(code: string, locale: CurrencyLocale) {
  try {
    const parts = new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

function currencyDecimals(code: string) {
  if (code === 'KWD' || code === 'BHD' || code === 'OMR' || code === 'JOD' || code === 'TND' || code === 'LYD') return 3;
  if (code === 'JPY' || code === 'KRW' || code === 'VND' || code === 'CLP' || code === 'PYG') return 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function createCurrency(code: string): Currency {
  const symbol = currencySymbol(code, 'en');
  return {
    code,
    symbol,
    symbolAr: currencySymbol(code, 'ar'),
    symbolEn: symbol,
    nameAr: currencyName(code, 'ar'),
    nameEn: currencyName(code, 'en'),
    nameFr: currencyName(code, 'fr'),
    decimals: currencyDecimals(code) ?? 2,
    country: '',
  };
}

export const CURRENCIES: Currency[] = supportedCurrencyCodes()
  .map(code => CURATED_CURRENCIES.find(item => item.code === code) ?? createCurrency(code));

export function getCurrency(code: string = DEFAULT_CURRENCY): Currency {
  const normalized = code.toUpperCase();
  return CURRENCIES.find(c => c.code === normalized) ?? createCurrency(normalized);
}

export function getCurrencyOptions(locale: CurrencyLocale = 'ar'): Currency[] {
  return [...CURRENCIES].sort((a, b) => {
    if (a.code === DEFAULT_CURRENCY) return -1;
    if (b.code === DEFAULT_CURRENCY) return 1;
    const nameA = locale === 'ar' ? a.nameAr : locale === 'fr' ? a.nameFr : a.nameEn;
    const nameB = locale === 'ar' ? b.nameAr : locale === 'fr' ? b.nameFr : b.nameEn;
    return nameA.localeCompare(nameB, locale);
  });
}

export function currencyDisplayName(currency: Currency, locale: CurrencyLocale) {
  return locale === 'ar' ? currency.nameAr : locale === 'fr' ? currency.nameFr : currency.nameEn;
}

export function currencyDisplaySymbol(currency: Currency, locale: CurrencyLocale) {
  return locale === 'ar' ? currency.symbolAr : currency.symbolEn;
}
