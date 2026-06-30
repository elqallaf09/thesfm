import type { MarketAssetType } from '@/lib/market/marketService';
import { formatMarketPrice } from '@/lib/market/marketCurrency';

export type EducationalSummaryLanguage = 'ar' | 'en' | 'fr';

export type EducationalMarketSummaryInput = {
  language: EducationalSummaryLanguage;
  symbol: string;
  assetName?: string | null;
  assetType: MarketAssetType;
  latestPrice?: number | null;
  dailyChange?: number | null;
  dailyChangePercent?: number | null;
  rsi?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  support?: number | null;
  resistance?: number | null;
  hasFundamentals?: boolean;
  marketDataSource?: string | null;
  currency?: string | null;
  exchange?: string | null;
  scenarioAmount?: number | null;
  scenarioCurrency?: string | null;
  estimatedUnits?: number | null;
};

export type EducationalMarketSummary = {
  mode: 'rule_based';
  badge: string;
  intro: string;
  overview: string;
  keyObservations: string[];
  limitations: string[];
  whatToWatch: string[];
  disclaimer: string;
};

const COPY = {
  ar: {
    badge: 'ملخص تعليمي تلقائي',
    intro: 'تم إنشاء هذا الملخص اعتمادًا على البيانات المتاحة في الصفحة.',
    insufficient: 'لا توجد بيانات كافية لتوليد ملخص مفصل لهذا الأصل، لكن يمكنك متابعة السعر والمؤشرات المتاحة في الصفحة.',
    price: (symbol: string, price: string, change: string) => `يعرض ${symbol} آخر سعر متاح عند ${price} مع تغير يومي بنسبة ${change}.`,
    noPrice: (symbol: string) => `البيانات المتاحة عن ${symbol} محدودة حاليًا، لذلك يعتمد الملخص على المؤشرات الظاهرة في الصفحة فقط.`,
    positive: 'الحركة اليومية الحالية إيجابية حسب آخر بيانات متاحة.',
    negative: 'الحركة اليومية الحالية سلبية حسب آخر بيانات متاحة.',
    neutral: 'الحركة اليومية الحالية محدودة أو قريبة من الحياد حسب آخر بيانات متاحة.',
    rsiHigh: (rsi: string) => `مؤشر RSI عند ${rsi} يشير إلى زخم مرتفع وقد يدل تعليميًا على حالة تشبع شرائي محتملة.`,
    rsiLow: (rsi: string) => `مؤشر RSI عند ${rsi} يشير إلى زخم ضعيف وقد يدل تعليميًا على حالة تشبع بيعي محتملة.`,
    rsiMid: (rsi: string) => `مؤشر RSI عند ${rsi} يقع ضمن نطاق متوسط نسبيًا.`,
    sma: (sma20: string, sma50: string) => `المتوسطات المتاحة تعرض SMA 20 عند ${sma20} وSMA 50 عند ${sma50}.`,
    levels: (support: string, resistance: string) => `مستويات المتابعة الظاهرة هي دعم قرب ${support} ومقاومة قرب ${resistance}.`,
    scenario: (amount: string, units: string) => `سيناريو الاستثمار المدخل يعادل تقريبًا ${units} وحدة بناءً على مبلغ ${amount}.`,
    fundamentalsMissing: 'البيانات الأساسية مثل الإيرادات أو مكرر الربحية غير متاحة من مزود البيانات الحالي، لذلك يعتمد الملخص على السعر والمؤشرات الفنية المتوفرة.',
    limited: 'البيانات المتاحة محدودة، لذلك يجب قراءة هذا الملخص كعرض تعليمي عام وليس كتحليل مكتمل.',
    source: (source: string) => `راجع مصدر البيانات وتوقيت التحديث، خصوصًا إذا كانت البيانات مؤجلة أو مخزنة مؤقتًا. المصدر الحالي: ${source}.`,
    watchPrice: 'تابع تغير السعر اليومي مع حجم التذبذب قبل مقارنة الأصل بأصول أخرى.',
    watchIndicators: 'راقب RSI والمتوسطات المتحركة ومستويات الدعم والمقاومة الظاهرة في الصفحة.',
    disclaimer: 'هذا ملخص تعليمي وتحليلي فقط، وليس توصية استثمارية.',
  },
  en: {
    badge: 'Automatic educational summary',
    intro: 'This summary is generated from the data currently available on this page.',
    insufficient: 'Not enough data is available to generate a detailed summary for this asset, but you can still review the price and indicators shown on the page.',
    price: (symbol: string, price: string, change: string) => `${symbol} shows the latest available price at ${price} with a daily change of ${change}.`,
    noPrice: (symbol: string) => `Available data for ${symbol} is limited right now, so this summary relies only on the indicators shown on the page.`,
    positive: 'The current daily move is positive based on the latest available data.',
    negative: 'The current daily move is negative based on the latest available data.',
    neutral: 'The current daily move is limited or close to neutral based on the latest available data.',
    rsiHigh: (rsi: string) => `RSI at ${rsi} suggests elevated momentum and may educationally indicate a possible overbought condition.`,
    rsiLow: (rsi: string) => `RSI at ${rsi} suggests weak momentum and may educationally indicate a possible oversold condition.`,
    rsiMid: (rsi: string) => `RSI at ${rsi} is in a relatively moderate range.`,
    sma: (sma20: string, sma50: string) => `Available moving averages show SMA 20 at ${sma20} and SMA 50 at ${sma50}.`,
    levels: (support: string, resistance: string) => `Visible levels to monitor are support near ${support} and resistance near ${resistance}.`,
    scenario: (amount: string, units: string) => `The entered investment scenario equals roughly ${units} units based on ${amount}.`,
    fundamentalsMissing: 'Fundamental data such as revenue or valuation ratios is not available from the current data provider, so this summary relies on price and available technical indicators.',
    limited: 'Available data is limited, so read this as a general educational view rather than a complete analysis.',
    source: (source: string) => `Review the data source and update timing, especially if data is delayed or cached. Current source: ${source}.`,
    watchPrice: 'Watch the daily price move and volatility before comparing this asset with others.',
    watchIndicators: 'Monitor RSI, moving averages, and the support and resistance levels shown on the page.',
    disclaimer: 'This is an educational analytical summary only, not investment advice.',
  },
  fr: {
    badge: 'Résumé éducatif automatique',
    intro: 'Ce résumé est généré à partir des données actuellement disponibles sur cette page.',
    insufficient: 'Les données disponibles sont insuffisantes pour générer un résumé détaillé de cet actif, mais vous pouvez consulter le prix et les indicateurs affichés sur la page.',
    price: (symbol: string, price: string, change: string) => `${symbol} affiche le dernier prix disponible à ${price}, avec une variation quotidienne de ${change}.`,
    noPrice: (symbol: string) => `Les données disponibles pour ${symbol} sont limitées pour le moment; ce résumé s’appuie donc sur les indicateurs affichés sur la page.`,
    positive: 'Le mouvement quotidien actuel est positif selon les dernières données disponibles.',
    negative: 'Le mouvement quotidien actuel est négatif selon les dernières données disponibles.',
    neutral: 'Le mouvement quotidien actuel est limité ou proche de la neutralité selon les dernières données disponibles.',
    rsiHigh: (rsi: string) => `Un RSI à ${rsi} indique une dynamique élevée et peut signaler, à titre éducatif, une possible situation de surachat.`,
    rsiLow: (rsi: string) => `Un RSI à ${rsi} indique une dynamique faible et peut signaler, à titre éducatif, une possible situation de survente.`,
    rsiMid: (rsi: string) => `Un RSI à ${rsi} se situe dans une zone relativement modérée.`,
    sma: (sma20: string, sma50: string) => `Les moyennes mobiles disponibles affichent une SMA 20 à ${sma20} et une SMA 50 à ${sma50}.`,
    levels: (support: string, resistance: string) => `Les niveaux visibles à surveiller sont un support proche de ${support} et une résistance proche de ${resistance}.`,
    scenario: (amount: string, units: string) => `Le scénario d’investissement saisi représente environ ${units} unités sur la base de ${amount}.`,
    fundamentalsMissing: 'Les données fondamentales comme les revenus ou les ratios de valorisation ne sont pas disponibles auprès du fournisseur actuel; ce résumé s’appuie donc sur le prix et les indicateurs techniques disponibles.',
    limited: 'Les données disponibles sont limitées; lisez donc ce résumé comme une vue éducative générale plutôt qu’une analyse complète.',
    source: (source: string) => `Vérifiez la source des données et l’heure de mise à jour, surtout si les données sont différées ou en cache. Source actuelle : ${source}.`,
    watchPrice: 'Surveillez le mouvement quotidien du prix et la volatilité avant de comparer cet actif à d’autres.',
    watchIndicators: 'Surveillez le RSI, les moyennes mobiles et les niveaux de support et de résistance affichés sur la page.',
    disclaimer: 'Ceci est un résumé éducatif et analytique, et ne constitue pas un conseil financier.',
  },
} as const;

function localeFor(language: EducationalSummaryLanguage) {
  if (language === 'en') return 'en-US';
  if (language === 'fr') return 'fr-FR';
  return 'ar-KW-u-nu-latn';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(value: number, language: EducationalSummaryLanguage, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits }).format(value);
}

function formatNativeMoney(input: EducationalMarketSummaryInput, value: number) {
  return formatMarketPrice({
    price: value,
    currency: input.currency,
    exchange: input.exchange,
    symbol: input.symbol,
    locale: input.language,
    priceIsNormalized: true,
  });
}

function formatPercent(value: number, language: EducationalSummaryLanguage) {
  return `${value >= 0 ? '+' : ''}${formatNumber(value, language, 2)}%`;
}

export function generateEducationalMarketSummary(input: EducationalMarketSummaryInput): EducationalMarketSummary {
  const language = input.language;
  const copy = COPY[language];
  const symbol = input.symbol || input.assetName || '';
  const hasPrice = isFiniteNumber(input.latestPrice) && input.latestPrice > 0;
  const hasChange = isFiniteNumber(input.dailyChangePercent);
  const hasRsi = isFiniteNumber(input.rsi);
  const hasSma = isFiniteNumber(input.sma20) && isFiniteNumber(input.sma50);
  const hasLevels = isFiniteNumber(input.support) && isFiniteNumber(input.resistance);
  const hasScenario = isFiniteNumber(input.scenarioAmount) && input.scenarioAmount > 0 && isFiniteNumber(input.estimatedUnits);
  const hasAnyData = hasPrice || hasChange || hasRsi || hasSma || hasLevels || hasScenario || Boolean(input.hasFundamentals);

  if (!hasAnyData) {
    return {
      mode: 'rule_based',
      badge: copy.badge,
      intro: copy.intro,
      overview: copy.insufficient,
      keyObservations: [],
      limitations: [copy.limited],
      whatToWatch: [copy.watchPrice, copy.watchIndicators],
      disclaimer: copy.disclaimer,
    };
  }

  const overview = hasPrice
    ? copy.price(symbol, formatNativeMoney(input, input.latestPrice as number), hasChange ? formatPercent(input.dailyChangePercent as number, language) : formatPercent(0, language))
    : copy.noPrice(symbol);

  const keyObservations: string[] = [];
  if (hasChange) {
    const change = input.dailyChangePercent as number;
    keyObservations.push(change > 0 ? copy.positive : change < 0 ? copy.negative : copy.neutral);
  }
  if (hasRsi) {
    const rsi = input.rsi as number;
    const rsiText = formatNumber(rsi, language, 1);
    keyObservations.push(rsi > 70 ? copy.rsiHigh(rsiText) : rsi < 30 ? copy.rsiLow(rsiText) : copy.rsiMid(rsiText));
  }
  if (hasSma) {
    keyObservations.push(copy.sma(
      formatNativeMoney(input, input.sma20 as number),
      formatNativeMoney(input, input.sma50 as number),
    ));
  }
  if (hasLevels) {
    keyObservations.push(copy.levels(
      formatNativeMoney(input, input.support as number),
      formatNativeMoney(input, input.resistance as number),
    ));
  }
  if (hasScenario) {
    keyObservations.push(copy.scenario(
      formatMarketPrice({ price: input.scenarioAmount as number, currency: input.scenarioCurrency ?? input.currency, locale: language }),
      formatNumber(input.estimatedUnits as number, language, 4),
    ));
  }

  const limitations = [
    ...(!input.hasFundamentals ? [copy.fundamentalsMissing] : []),
    copy.limited,
    ...(input.marketDataSource ? [copy.source(input.marketDataSource)] : []),
  ];

  return {
    mode: 'rule_based',
    badge: copy.badge,
    intro: copy.intro,
    overview,
    keyObservations: keyObservations.length > 0 ? keyObservations.slice(0, 4) : [copy.limited],
    limitations: limitations.slice(0, 3),
    whatToWatch: [copy.watchPrice, copy.watchIndicators],
    disclaimer: copy.disclaimer,
  };
}
