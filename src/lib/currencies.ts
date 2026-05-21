export interface Currency {
  code: string;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
  nameFr: string;
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  // الخليج
  { code: 'KWD', symbolAr: 'د.ك', symbolEn: 'KD',  nameAr: 'دينار كويتي',      nameEn: 'Kuwaiti Dinar',     nameFr: 'Dinar koweïtien',      decimals: 3 },
  { code: 'SAR', symbolAr: 'ر.س', symbolEn: 'SR',  nameAr: 'ريال سعودي',       nameEn: 'Saudi Riyal',       nameFr: 'Riyal saoudien',       decimals: 2 },
  { code: 'AED', symbolAr: 'د.إ', symbolEn: 'AED', nameAr: 'درهم إماراتي',     nameEn: 'UAE Dirham',        nameFr: 'Dirham émirati',       decimals: 2 },
  { code: 'QAR', symbolAr: 'ر.ق', symbolEn: 'QR',  nameAr: 'ريال قطري',        nameEn: 'Qatari Riyal',      nameFr: 'Riyal qatari',         decimals: 2 },
  { code: 'BHD', symbolAr: 'د.ب', symbolEn: 'BD',  nameAr: 'دينار بحريني',     nameEn: 'Bahraini Dinar',    nameFr: 'Dinar bahreïni',       decimals: 3 },
  { code: 'OMR', symbolAr: 'ر.ع', symbolEn: 'OMR', nameAr: 'ريال عُماني',      nameEn: 'Omani Rial',        nameFr: 'Rial omanais',         decimals: 3 },
  // العالم العربي
  { code: 'EGP', symbolAr: 'ج.م', symbolEn: 'EGP', nameAr: 'جنيه مصري',       nameEn: 'Egyptian Pound',    nameFr: 'Livre égyptienne',     decimals: 2 },
  { code: 'JOD', symbolAr: 'د.أ', symbolEn: 'JD',  nameAr: 'دينار أردني',      nameEn: 'Jordanian Dinar',   nameFr: 'Dinar jordanien',      decimals: 3 },
  { code: 'LBP', symbolAr: 'ل.ل', symbolEn: 'LBP', nameAr: 'ليرة لبنانية',    nameEn: 'Lebanese Pound',    nameFr: 'Livre libanaise',      decimals: 0 },
  { code: 'MAD', symbolAr: 'د.م', symbolEn: 'MAD', nameAr: 'درهم مغربي',       nameEn: 'Moroccan Dirham',   nameFr: 'Dirham marocain',      decimals: 2 },
  { code: 'TND', symbolAr: 'د.ت', symbolEn: 'TND', nameAr: 'دينار تونسي',      nameEn: 'Tunisian Dinar',    nameFr: 'Dinar tunisien',       decimals: 3 },
  { code: 'DZD', symbolAr: 'د.ج', symbolEn: 'DZD', nameAr: 'دينار جزائري',     nameEn: 'Algerian Dinar',    nameFr: 'Dinar algérien',       decimals: 2 },
  { code: 'IQD', symbolAr: 'د.ع', symbolEn: 'IQD', nameAr: 'دينار عراقي',      nameEn: 'Iraqi Dinar',       nameFr: 'Dinar irakien',        decimals: 0 },
  { code: 'SYP', symbolAr: 'ل.س', symbolEn: 'SYP', nameAr: 'ليرة سورية',       nameEn: 'Syrian Pound',      nameFr: 'Livre syrienne',       decimals: 0 },
  { code: 'YER', symbolAr: 'ر.ي', symbolEn: 'YER', nameAr: 'ريال يمني',        nameEn: 'Yemeni Rial',       nameFr: 'Riyal yéménite',       decimals: 0 },
  { code: 'SDG', symbolAr: 'ج.س', symbolEn: 'SDG', nameAr: 'جنيه سوداني',      nameEn: 'Sudanese Pound',    nameFr: 'Livre soudanaise',     decimals: 2 },
  { code: 'LYD', symbolAr: 'د.ل', symbolEn: 'LYD', nameAr: 'دينار ليبي',       nameEn: 'Libyan Dinar',      nameFr: 'Dinar libyen',         decimals: 3 },
  // عالمية رئيسية
  { code: 'USD', symbolAr: '$',   symbolEn: '$',   nameAr: 'دولار أمريكي',     nameEn: 'US Dollar',         nameFr: 'Dollar américain',     decimals: 2 },
  { code: 'EUR', symbolAr: '€',   symbolEn: '€',   nameAr: 'يورو',             nameEn: 'Euro',              nameFr: 'Euro',                 decimals: 2 },
  { code: 'GBP', symbolAr: '£',   symbolEn: '£',   nameAr: 'جنيه إسترليني',   nameEn: 'British Pound',     nameFr: 'Livre sterling',       decimals: 2 },
  { code: 'CHF', symbolAr: 'Fr',  symbolEn: 'CHF', nameAr: 'فرنك سويسري',      nameEn: 'Swiss Franc',       nameFr: 'Franc suisse',         decimals: 2 },
  { code: 'JPY', symbolAr: '¥',   symbolEn: '¥',   nameAr: 'ين ياباني',        nameEn: 'Japanese Yen',      nameFr: 'Yen japonais',         decimals: 0 },
  { code: 'CNY', symbolAr: '¥',   symbolEn: '¥',   nameAr: 'يوان صيني',        nameEn: 'Chinese Yuan',      nameFr: 'Yuan chinois',         decimals: 2 },
  { code: 'INR', symbolAr: '₹',   symbolEn: '₹',   nameAr: 'روبية هندية',      nameEn: 'Indian Rupee',      nameFr: 'Roupie indienne',      decimals: 2 },
  { code: 'TRY', symbolAr: '₺',   symbolEn: '₺',   nameAr: 'ليرة تركية',       nameEn: 'Turkish Lira',      nameFr: 'Livre turque',         decimals: 2 },
  { code: 'PKR', symbolAr: '₨',   symbolEn: 'Rs',  nameAr: 'روبية باكستانية',  nameEn: 'Pakistani Rupee',   nameFr: 'Roupie pakistanaise',  decimals: 2 },
  { code: 'CAD', symbolAr: 'C$',  symbolEn: 'C$',  nameAr: 'دولار كندي',       nameEn: 'Canadian Dollar',   nameFr: 'Dollar canadien',      decimals: 2 },
  { code: 'AUD', symbolAr: 'A$',  symbolEn: 'A$',  nameAr: 'دولار أسترالي',    nameEn: 'Australian Dollar', nameFr: 'Dollar australien',    decimals: 2 },
];

export const DEFAULT_CURRENCY = 'KWD';

export function getCurrency(code: string): Currency {
  const normalized = code.toUpperCase();
  return CURRENCIES.find(c => c.code === normalized) ?? createCurrency(normalized);
}

type CurrencyLocale = 'ar' | 'en' | 'fr';

const FALLBACK_WORLD_CURRENCIES = [
  'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD',
  'CAD','CDF','CHF','CLP','CNY','COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD',
  'GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD',
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
    const parts = new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
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
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function createCurrency(code: string): Currency {
  return {
    code,
    symbolAr: currencySymbol(code, 'ar'),
    symbolEn: currencySymbol(code, 'en'),
    nameAr: currencyName(code, 'ar'),
    nameEn: currencyName(code, 'en'),
    nameFr: currencyName(code, 'fr'),
    decimals: currencyDecimals(code) ?? 2,
  };
}

export function getCurrencyOptions(locale: CurrencyLocale = 'ar'): Currency[] {
  const current = new Map(CURRENCIES.map(currency => [currency.code, currency]));
  return supportedCurrencyCodes()
    .map(code => current.get(code) ?? createCurrency(code))
    .sort((a, b) => {
      const nameA = locale === 'ar' ? a.nameAr : locale === 'fr' ? a.nameFr : a.nameEn;
      const nameB = locale === 'ar' ? b.nameAr : locale === 'fr' ? b.nameFr : b.nameEn;
      return nameA.localeCompare(nameB, locale);
    });
}
