import { normalizeAssetSearchText } from '@/lib/market/assetAliases';

// Search names only: prices and provider identifiers still come from the canonical catalog.
const ARABIC_NAMES: Record<string, string[]> = {
  AAPL: ['أبل', 'آبل', 'ابل', 'أيبِل'],
  MSFT: ['مايكروسوفت', 'ميكروسوفت'],
  TSLA: ['تسلا', 'تيسلا'],
  NVDA: ['إنفيديا', 'انفيديا', 'نفيديا', 'إنفيديا كوربوريشن'],
  GOOGL: ['جوجل', 'غوغل', 'قوقل', 'ألفابت', 'الفابت'],
  AMZN: ['أمازون', 'امازون'],
  META: ['ميتا', 'فيسبوك', 'فيس بوك'],
  INTC: ['إنتل', 'انتل'],
  AMD: ['إيه إم دي', 'اي ام دي'],
  BA: ['بوينغ', 'بوينج'],
  F: ['فورد'],
  V: ['فيزا'],
  C: ['سيتي جروب', 'سيتي غروب'],
  XAUUSD: ['ذهب', 'الذهب', 'الذهب بالدولار', 'ذهب دولار'],
  XAGUSD: ['فضة', 'الفضة', 'الفضة بالدولار', 'فضة دولار'],
  BTCUSD: ['بيتكوين', 'بتكوين', 'بت كوين', 'بيت كوين'],
  ETHUSD: ['إيثريوم', 'ايثريوم', 'إيثيريوم', 'اثيريوم', 'إيثر'],
  SOLUSD: ['سولانا'],
  XRPUSD: ['ريبل'],
  ADAUSD: ['كاردانو'],
  DOGEUSD: ['دوجكوين', 'دوج كوين'],
  LTCUSD: ['لايتكوين', 'لايت كوين'],
  EURUSD: ['يورو دولار', 'اليورو مقابل الدولار', 'يورو مقابل دولار', 'اليورو بالدولار'],
  GBPUSD: ['جنيه دولار', 'الجنيه الإسترليني مقابل الدولار', 'استرليني دولار', 'باوند دولار'],
  USDJPY: ['دولار ين', 'الدولار مقابل الين', 'دولار مقابل ين'],
  BRENT: ['برنت', 'نفط برنت', 'خام برنت'],
  WTI: ['خام غرب تكساس', 'نفط غرب تكساس'],
};

export function localizedMarketAliases(symbol: string) {
  return ARABIC_NAMES[symbol.toUpperCase().replace(/[/\s-]/g, '')] ?? [];
}

export function normalizeMarketName(value: unknown) {
  return normalizeAssetSearchText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/^(?:(?:سهم|اسهم|شركه|عمله|معدن|سعر)\s+)+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
