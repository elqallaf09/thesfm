import type { MarketAssetType } from '@/lib/market/marketService';

export const SHARIAH_STATUSES = ['compliant', 'non_compliant', 'needs_review', 'unclassified'] as const;

export type ShariahStatus = typeof SHARIAH_STATUSES[number];

export type ShariahScreeningMethod =
  | 'manual_review'
  | 'external_provider'
  | 'automatic_screening'
  | 'unclassified';

export type ShariahScreeningData = Record<string, unknown> & {
  sector?: string | null;
  industry?: string | null;
  businessDescription?: string | null;
  nonPermissibleRevenueRatio?: number | null;
  interestBearingDebtRatio?: number | null;
  cashAndInterestBearingSecuritiesRatio?: number | null;
  interestIncomeRatio?: number | null;
  holdings?: Array<{
    symbol?: string | null;
    weight?: number | null;
    shariahStatus?: ShariahStatus | string | null;
  }> | null;
  constituents?: Array<{
    symbol?: string | null;
    weight?: number | null;
    shariahStatus?: ShariahStatus | string | null;
  }> | null;
};

export type ShariahClassification = {
  shariahStatus: ShariahStatus;
  shariahReason: string | null;
  shariahSource: string | null;
  shariahLastReviewedAt: string | null;
  shariahManualOverride: boolean;
  shariahReviewedBy: string | null;
  shariahScreeningData: ShariahScreeningData;
  shariahMethod: ShariahScreeningMethod;
};

export type ShariahScreeningInput = {
  symbol?: string | null;
  name?: string | null;
  assetType?: MarketAssetType | 'fund' | string | null;
  exchange?: string | null;
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  businessDescription?: string | null;
  shariahStatus?: ShariahStatus | string | null;
  shariahReason?: string | null;
  shariahSource?: string | null;
  shariahLastReviewedAt?: string | null;
  shariahManualOverride?: boolean | null;
  shariahReviewedBy?: string | null;
  shariahScreeningData?: ShariahScreeningData | null;
};

export const SHARIAH_SCREENING_THRESHOLDS = {
  nonPermissibleRevenueRatio: 0.05,
  interestBearingDebtRatio: 0.33,
  cashAndInterestBearingSecuritiesRatio: 0.33,
  interestIncomeRatio: 0.05,
  fundMinimumScreenedWeight: 0.9,
  fundMaximumNonCompliantWeight: 0.05,
} as const;

export const SHARIAH_STATUS_LABELS: Record<ShariahStatus, { ar: string; en: string; compactEn: string; icon: string }> = {
  compliant: { ar: 'مطابق للشريعة', en: 'Shariah-compliant', compactEn: 'Shariah-compliant', icon: '✅' },
  non_compliant: { ar: 'غير مطابق للشريعة', en: 'Not Shariah-compliant', compactEn: 'Not compliant', icon: '❌' },
  needs_review: { ar: 'يحتاج مراجعة', en: 'Needs review', compactEn: 'Needs review', icon: '⚠️' },
  unclassified: { ar: 'غير مصنّف', en: 'Unclassified', compactEn: 'Unclassified', icon: '—' },
};

const STOCK_FINANCIAL_FIELDS = [
  'nonPermissibleRevenueRatio',
  'interestBearingDebtRatio',
  'cashAndInterestBearingSecuritiesRatio',
  'interestIncomeRatio',
] as const;

const PROHIBITED_ACTIVITY_PATTERNS = [
  /\b(alcohol|brewery|breweries|distiller|distillery|wine|liquor)\b/i,
  /\b(tobacco|cigarette|cigar|nicotine|vape)\b/i,
  /\b(casino|gambling|gaming|lottery|betting|wagering)\b/i,
  /\b(pork|swine)\b/i,
  /\b(adult entertainment|pornography)\b/i,
  /\b(weapon|weapons|arms manufacturer|defense contractor|military weapons)\b/i,
  /\b(conventional bank|commercial bank|investment bank|mortgage lender|consumer finance|payday lender)\b/i,
  /\b(insurance|reinsurance|life insurance|property casualty)\b/i,
];

const CONVENTIONAL_BANK_SYMBOLS = new Set([
  'JPM',
  'BAC',
  'C',
  'WFC',
  'GS',
  'MS',
  'USB',
  'PNC',
  'TFC',
  'BK',
  'STT',
  'COF',
  'AXP',
]);

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function upper(value: unknown) {
  return cleanText(value).toUpperCase();
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanFromDb(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function hasText(value: unknown) {
  return cleanText(value).length > 0;
}

function normalizeAssetKind(assetType: unknown): MarketAssetType | 'fund' {
  const raw = String(assetType ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (raw === 'fund' || raw === 'mutual_fund') return 'fund';
  if (raw === 'etf') return 'etf';
  if (raw === 'crypto' || raw === 'forex' || raw === 'commodity' || raw === 'gold' || raw === 'index' || raw === 'stock') return raw;
  return 'stock';
}

function normalizeScreeningData(data: unknown): ShariahScreeningData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data as ShariahScreeningData;
}

function screeningDataForInput(input: ShariahScreeningInput): ShariahScreeningData {
  const data = normalizeScreeningData(input.shariahScreeningData);
  return {
    ...data,
    sector: cleanText(data.sector ?? input.sector) || null,
    industry: cleanText(data.industry ?? input.industry) || null,
    businessDescription: cleanText(data.businessDescription ?? input.businessDescription) || null,
  };
}

function defaultReason(status: ShariahStatus, assetType: MarketAssetType | 'fund') {
  if (status === 'compliant') return 'Classified as Shariah-compliant by a manual review or trusted provider.';
  if (status === 'non_compliant') return 'Classified as not Shariah-compliant by a manual review, trusted provider, or available screening data.';
  if (assetType === 'etf' || assetType === 'fund') return 'ETF/fund requires holdings-level screening before compliance can be determined.';
  if (status === 'needs_review') return 'Available data is incomplete and requires Shariah review.';
  return 'No verified Shariah screening data is available.';
}

function statusFromTrustedInput(input: ShariahScreeningInput) {
  const status = normalizeShariahStatus(input.shariahStatus, null);
  if (!status) return null;
  const manual = booleanFromDb(input.shariahManualOverride);
  const source = cleanText(input.shariahSource);
  const trusted = manual || hasText(source) || hasText(input.shariahReason) || hasText(input.shariahLastReviewedAt);
  if (!trusted && status === 'compliant') return null;
  if (!trusted && status !== 'unclassified') return null;

  const method: ShariahScreeningMethod = manual
    ? 'manual_review'
    : source && /provider|api|idealratings|zoya|musaffa|islamicly|s&p|ftse|dow jones/i.test(source)
      ? 'external_provider'
      : status === 'unclassified'
        ? 'unclassified'
        : 'manual_review';

  return {
    shariahStatus: status,
    shariahReason: cleanText(input.shariahReason) || defaultReason(status, normalizeAssetKind(input.assetType)),
    shariahSource: source || (method === 'unclassified' ? null : 'Stored Shariah classification'),
    shariahLastReviewedAt: cleanText(input.shariahLastReviewedAt) || null,
    shariahManualOverride: manual,
    shariahReviewedBy: cleanText(input.shariahReviewedBy) || null,
    shariahScreeningData: normalizeScreeningData(input.shariahScreeningData),
    shariahMethod: method,
  } satisfies ShariahClassification;
}

function unclassified(reason: string, data: ShariahScreeningData = {}): ShariahClassification {
  return {
    shariahStatus: 'unclassified',
    shariahReason: reason,
    shariahSource: null,
    shariahLastReviewedAt: null,
    shariahManualOverride: false,
    shariahReviewedBy: null,
    shariahScreeningData: data,
    shariahMethod: 'unclassified',
  };
}

function needsReview(reason: string, data: ShariahScreeningData = {}): ShariahClassification {
  return {
    shariahStatus: 'needs_review',
    shariahReason: reason,
    shariahSource: 'Internal automatic screening',
    shariahLastReviewedAt: null,
    shariahManualOverride: false,
    shariahReviewedBy: null,
    shariahScreeningData: data,
    shariahMethod: 'automatic_screening',
  };
}

function nonCompliant(reason: string, data: ShariahScreeningData = {}): ShariahClassification {
  return {
    shariahStatus: 'non_compliant',
    shariahReason: reason,
    shariahSource: 'Internal automatic screening',
    shariahLastReviewedAt: null,
    shariahManualOverride: false,
    shariahReviewedBy: null,
    shariahScreeningData: data,
    shariahMethod: 'automatic_screening',
  };
}

function compliant(reason: string, data: ShariahScreeningData = {}): ShariahClassification {
  return {
    shariahStatus: 'compliant',
    shariahReason: reason,
    shariahSource: 'Internal automatic screening',
    shariahLastReviewedAt: null,
    shariahManualOverride: false,
    shariahReviewedBy: null,
    shariahScreeningData: data,
    shariahMethod: 'automatic_screening',
  };
}

function isExplicitlyProhibitedActivity(input: ShariahScreeningInput, data: ShariahScreeningData) {
  const symbol = upper(input.symbol).replace(/\..*$/, '');
  if (CONVENTIONAL_BANK_SYMBOLS.has(symbol)) return true;

  const country = upper(input.country);
  const haystack = [input.name, data.sector, data.industry, data.businessDescription].map(cleanText).join(' ');

  if (/bank/i.test(haystack) && /^(US|USA|UNITED STATES|CANADA|GB|UK|UNITED KINGDOM|EU|EUROPE)/.test(country || 'US')) {
    return true;
  }

  return PROHIBITED_ACTIVITY_PATTERNS.some(pattern => pattern.test(haystack));
}

function availableStockFinancialData(data: ShariahScreeningData) {
  return STOCK_FINANCIAL_FIELDS.map(field => numberOrNull(data[field]));
}

function classifyStock(input: ShariahScreeningInput, data: ShariahScreeningData) {
  const symbol = upper(input.symbol);
  const name = cleanText(input.name);
  const hasDescriptiveName = Boolean(name && upper(name) !== symbol && !/^[A-Z0-9.^=:/-]{1,12}$/.test(name));
  const hasBusinessContext = hasDescriptiveName || [data.sector, data.industry, data.businessDescription].map(cleanText).some(Boolean);
  if (!hasBusinessContext) return unclassified('No business activity or financial screening data is available.', data);

  if (isExplicitlyProhibitedActivity(input, data)) {
    return nonCompliant('Business activity appears to be in a prohibited or conventional financial sector based on available data.', data);
  }

  const [nonPermissibleRevenue, debt, cashAndSecurities, interestIncome] = availableStockFinancialData(data);
  if ([nonPermissibleRevenue, debt, cashAndSecurities, interestIncome].some(value => value === null)) {
    return needsReview('Business activity data is available, but financial ratios are missing or incomplete.', data);
  }

  if (nonPermissibleRevenue! > SHARIAH_SCREENING_THRESHOLDS.nonPermissibleRevenueRatio) {
    return nonCompliant('Non-permissible revenue ratio exceeds the configured Shariah screening threshold.', data);
  }
  if (debt! > SHARIAH_SCREENING_THRESHOLDS.interestBearingDebtRatio) {
    return nonCompliant('Interest-bearing debt ratio exceeds the configured Shariah screening threshold.', data);
  }
  if (cashAndSecurities! > SHARIAH_SCREENING_THRESHOLDS.cashAndInterestBearingSecuritiesRatio) {
    return nonCompliant('Cash and interest-bearing securities ratio exceeds the configured Shariah screening threshold.', data);
  }
  if (interestIncome! > SHARIAH_SCREENING_THRESHOLDS.interestIncomeRatio) {
    return nonCompliant('Interest income ratio exceeds the configured Shariah screening threshold.', data);
  }

  return compliant('Business activity and all configured financial ratios passed the internal screening thresholds.', data);
}

function weightedStatus(items: NonNullable<ShariahScreeningData['holdings']>) {
  let totalWeight = 0;
  let screenedWeight = 0;
  let nonCompliantWeight = 0;
  let needsReviewWeight = 0;

  for (const item of items) {
    const weight = Math.max(0, numberOrNull(item.weight) ?? 0);
    const status = normalizeShariahStatus(item.shariahStatus, 'unclassified');
    totalWeight += weight;
    if (status !== 'unclassified') screenedWeight += weight;
    if (status === 'non_compliant') nonCompliantWeight += weight;
    if (status === 'needs_review') needsReviewWeight += weight;
  }

  return {
    totalWeight,
    screenedWeight,
    nonCompliantWeight,
    needsReviewWeight,
    coverage: totalWeight > 0 ? screenedWeight / totalWeight : 0,
  };
}

function classifyFund(data: ShariahScreeningData) {
  const holdings = Array.isArray(data.holdings) ? data.holdings : null;
  if (!holdings?.length) {
    return needsReview('ETF/fund requires holdings-level screening before compliance can be determined.', data);
  }

  const weights = weightedStatus(holdings);
  if (weights.coverage < SHARIAH_SCREENING_THRESHOLDS.fundMinimumScreenedWeight || weights.needsReviewWeight > 0) {
    return needsReview('ETF/fund holdings screening is incomplete or includes holdings needing review.', {
      ...data,
      weightedScreening: weights,
    });
  }

  if (weights.nonCompliantWeight > SHARIAH_SCREENING_THRESHOLDS.fundMaximumNonCompliantWeight) {
    return nonCompliant('Weighted non-compliant holdings exceed the configured fund screening threshold.', {
      ...data,
      weightedScreening: weights,
    });
  }

  return compliant('Holdings-level screening coverage passed the configured fund thresholds.', {
    ...data,
    weightedScreening: weights,
  });
}

function classifyIndex(data: ShariahScreeningData) {
  const constituents = Array.isArray(data.constituents) ? data.constituents : null;
  if (!constituents?.length) {
    return unclassified('Index constituent-level Shariah screening data is not available.', data);
  }
  return needsReview('Index constituent-level data is available and requires a dedicated weighted screening review.', data);
}

export function normalizeShariahStatus(value: unknown, fallback: ShariahStatus | null = 'unclassified'): ShariahStatus | null {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['compliant', 'shariah_compliant', 'sharia_compliant', 'halal', 'approved', 'pass', 'passed'].includes(raw)) return 'compliant';
  if (['non_compliant', 'not_compliant', 'noncompliant', 'not_shariah_compliant', 'haram', 'rejected', 'fail', 'failed'].includes(raw)) return 'non_compliant';
  if (['needs_review', 'need_review', 'review', 'review_required', 'requires_review', 'possible', 'partial', 'insufficient', 'pending_review'].includes(raw)) return 'needs_review';
  if (['unclassified', 'unknown', 'unsupported', 'not_applicable', 'not_applicable_to_asset', 'na', 'n_a', ''].includes(raw)) return fallback;
  return fallback;
}

export function normalizeShariaStatus(value: unknown, fallback: ShariahStatus | null = 'unclassified') {
  return normalizeShariahStatus(value, fallback);
}

export function getExternalShariahProviderConfig() {
  const provider = cleanText(process.env.SHARIAH_SCREENING_PROVIDER);
  const apiKey = cleanText(process.env.SHARIAH_SCREENING_API_KEY);
  const baseUrl = cleanText(process.env.SHARIAH_SCREENING_BASE_URL);
  return {
    provider: provider || null,
    apiKey: apiKey || null,
    baseUrl: baseUrl || null,
    configured: Boolean(provider && apiKey && baseUrl),
  };
}

export function classifyShariahCompliance(input: ShariahScreeningInput): ShariahClassification {
  const trusted = statusFromTrustedInput(input);
  if (trusted) return trusted;

  const assetType = normalizeAssetKind(input.assetType);
  const data = screeningDataForInput(input);

  if (assetType === 'etf' || assetType === 'fund') return classifyFund(data);
  if (assetType === 'crypto') return unclassified('Crypto assets require a specific configured Shariah rule or trusted source before classification.', data);
  if (assetType === 'forex') return unclassified('Forex asset pairs are not classified here because Shariah treatment depends on the trading method and contract structure.', data);
  if (assetType === 'index') return classifyIndex(data);
  if (assetType === 'gold' || assetType === 'commodity') {
    return unclassified('Commodity or metal compliance depends on the asset, contract, settlement, and trading method; no trusted classification is available.', data);
  }

  return classifyStock(input, data);
}

export function pickPreferredShariahClassification(
  current: ShariahClassification,
  next: ShariahClassification,
): ShariahClassification {
  if (current.shariahManualOverride) return current;
  if (next.shariahManualOverride) return next;
  if (current.shariahMethod === 'external_provider' && next.shariahMethod !== 'external_provider') return current;
  if (next.shariahMethod === 'external_provider' && current.shariahMethod !== 'external_provider') return next;
  if (current.shariahStatus === 'unclassified' && next.shariahStatus !== 'unclassified') return next;
  if (current.shariahStatus === 'needs_review' && next.shariahStatus === 'non_compliant') return next;
  if (current.shariahStatus === 'needs_review' && next.shariahStatus === 'compliant') return next;
  return current;
}

const SHARIAH_REASON_AR: Record<string, string> = {
  'Classified as Shariah-compliant by a manual review or trusted provider.': 'مصنّف كمطابق للشريعة بناءً على مراجعة يدوية أو مزود موثوق.',
  'Classified as not Shariah-compliant by a manual review, trusted provider, or available screening data.': 'مصنّف كغير مطابق للشريعة بناءً على مراجعة يدوية أو مزود موثوق أو بيانات فحص متاحة.',
  'ETF/fund requires holdings-level screening before compliance can be determined.': 'الصندوق يتطلب فحصاً على مستوى مكوّناته قبل تحديد التوافق.',
  'Available data is incomplete and requires Shariah review.': 'البيانات المتاحة غير مكتملة وتحتاج مراجعة شرعية.',
  'No verified Shariah screening data is available.': 'لا توجد بيانات فحص شرعي موثقة.',
  'No business activity or financial screening data is available.': 'لا تتوفر بيانات عن النشاط التجاري أو النسب المالية للفحص.',
  'Business activity appears to be in a prohibited or conventional financial sector based on available data.': 'النشاط التجاري يبدو ضمن قطاع محظور أو مالي تقليدي وفق البيانات المتاحة.',
  'Business activity data is available, but financial ratios are missing or incomplete.': 'بيانات النشاط التجاري متاحة، لكن النسب المالية ناقصة أو غير مكتملة.',
  'Non-permissible revenue ratio exceeds the configured Shariah screening threshold.': 'نسبة الإيرادات غير المتوافقة تتجاوز حد الفحص الشرعي المعتمد.',
  'Interest-bearing debt ratio exceeds the configured Shariah screening threshold.': 'نسبة الديون ذات الفائدة تتجاوز حد الفحص الشرعي المعتمد.',
  'Cash and interest-bearing securities ratio exceeds the configured Shariah screening threshold.': 'نسبة النقد والأوراق المالية ذات الفائدة تتجاوز حد الفحص الشرعي المعتمد.',
  'Interest income ratio exceeds the configured Shariah screening threshold.': 'نسبة الدخل من الفوائد تتجاوز حد الفحص الشرعي المعتمد.',
  'Business activity and all configured financial ratios passed the internal screening thresholds.': 'اجتاز النشاط التجاري وجميع النسب المالية المعتمدة عتبات الفحص الداخلي.',
  'ETF/fund holdings screening is incomplete or includes holdings needing review.': 'فحص مكوّنات الصندوق غير مكتمل أو يتضمن مكوّنات تحتاج مراجعة.',
  'Weighted non-compliant holdings exceed the configured fund screening threshold.': 'المكوّنات غير المتوافقة (بأوزانها) تتجاوز حد فحص الصناديق المعتمد.',
  'Holdings-level screening coverage passed the configured fund thresholds.': 'اجتاز فحص مكوّنات الصندوق العتبات المعتمدة.',
  'Index constituent-level Shariah screening data is not available.': 'بيانات الفحص الشرعي لمكوّنات المؤشر غير متاحة.',
  'Index constituent-level data is available and requires a dedicated weighted screening review.': 'بيانات مكوّنات المؤشر متاحة وتتطلب مراجعة فحص موزونة مخصصة.',
  'Crypto assets require a specific configured Shariah rule or trusted source before classification.': 'الأصول الرقمية تتطلب قاعدة شرعية معتمدة أو مصدراً موثوقاً قبل التصنيف.',
  'Forex asset pairs are not classified here because Shariah treatment depends on the trading method and contract structure.': 'أزواج العملات لا تُصنّف هنا لأن الحكم الشرعي يعتمد على طريقة التداول وهيكل العقد.',
  'Commodity or metal compliance depends on the asset, contract, settlement, and trading method; no trusted classification is available.': 'توافق السلع والمعادن يعتمد على الأصل والعقد والتسوية وطريقة التداول؛ ولا يتوفر تصنيف موثوق.',
};

export function shariahReasonArabic(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return SHARIAH_REASON_AR[reason] ?? null;
}

export function shariahClassificationFields(classification: ShariahClassification) {
  return {
    shariahStatus: classification.shariahStatus,
    shariahReason: classification.shariahReason,
    shariahReasonAr: shariahReasonArabic(classification.shariahReason),
    shariahSource: classification.shariahSource,
    shariahLastReviewedAt: classification.shariahLastReviewedAt,
    shariahManualOverride: classification.shariahManualOverride,
    shariahReviewedBy: classification.shariahReviewedBy,
    shariahScreeningData: classification.shariahScreeningData,
    shariahMethod: classification.shariahMethod,
  };
}

export function shariahDbFields(classification: ShariahClassification) {
  return {
    shariah_status: classification.shariahStatus,
    shariah_reason: classification.shariahReason,
    shariah_source: classification.shariahSource,
    shariah_last_reviewed_at: classification.shariahLastReviewedAt,
    shariah_manual_override: classification.shariahManualOverride,
    shariah_reviewed_by: classification.shariahReviewedBy,
    shariah_screening_data: classification.shariahScreeningData,
  };
}