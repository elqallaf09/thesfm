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
  interestBearingDebtRatio: 0.33333,
  cashAndInterestBearingSecuritiesRatio: 0.33333,
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

function cleanText(value: unknown) {
  return String(value ?? '').trim();
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
  const data = normalizeScreeningData(input.shariahScreeningData);
  const verifiedAutomatic = data.evidenceVersion === 'sfm-evidence-v2';
  const reviewed = Date.parse(input.shariahLastReviewedAt ?? '');
  const current = Number.isFinite(reviewed) && reviewed <= Date.now() && Date.now() - reviewed < 7 * 86_400_000;
  const trusted = (manual && hasText(source) && hasText(input.shariahReason) && Number.isFinite(reviewed) && reviewed <= Date.now()) || (verifiedAutomatic && current && hasText(source));
  if (!trusted && status === 'compliant') return null;
  if (!trusted && status !== 'unclassified') return null;

  const method: ShariahScreeningMethod = manual
    ? 'manual_review'
    : verifiedAutomatic ? 'automatic_screening' : source && /provider|api|idealratings|zoya|musaffa|islamicly|s&p|ftse|dow jones/i.test(source)
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

  if (assetType === 'etf' || assetType === 'fund') return needsReview('ETF/fund requires holdings-level screening before compliance can be determined.', data);
  if (assetType === 'crypto') return unclassified('Crypto assets require a specific configured Shariah rule or trusted source before classification.', data);
  if (assetType === 'forex') return unclassified('Forex asset pairs are not classified here because Shariah treatment depends on the trading method and contract structure.', data);
  if (assetType === 'index') return unclassified('Index constituent-level Shariah screening data is not available.', data);
  if (assetType === 'gold' || assetType === 'commodity') {
    return unclassified('Commodity or metal compliance depends on the asset, contract, settlement, and trading method; no trusted classification is available.', data);
  }

  return [input.name, data.sector, data.industry, data.businessDescription].some(hasText)
    ? needsReview('No current source-verified screening decision is available. Descriptions and unsourced ratios are not a classification.', data)
    : unclassified('No business activity or financial screening data is available.', data);
}

export function pickPreferredShariahClassification(
  current: ShariahClassification,
  next: ShariahClassification,
): ShariahClassification {
  if (current.shariahManualOverride) return current;
  if (next.shariahManualOverride) return next;
  const currentV2 = current.shariahScreeningData.evidenceVersion === 'sfm-evidence-v2';
  const nextV2 = next.shariahScreeningData.evidenceVersion === 'sfm-evidence-v2';
  if (nextV2 && (!currentV2 || Date.parse(next.shariahLastReviewedAt ?? '') > Date.parse(current.shariahLastReviewedAt ?? ''))) return next;
  if (currentV2) return current;
  if (current.shariahMethod === 'external_provider' && next.shariahMethod !== 'external_provider') return current;
  if (next.shariahMethod === 'external_provider' && current.shariahMethod !== 'external_provider') return next;
  if (current.shariahStatus === 'unclassified' && next.shariahStatus !== 'unclassified') return next;
  if (current.shariahStatus === 'needs_review' && next.shariahStatus === 'non_compliant') return next;
  if (current.shariahStatus === 'needs_review' && next.shariahStatus === 'compliant') return next;
  return current;
}

const SHARIAH_REASON_AR: Record<string, string> = {
  'No current source-verified screening decision is available. Descriptions and unsourced ratios are not a classification.': 'لا يوجد قرار فحص حديث موثق بالمصادر. الوصف والنسب بلا مصادر لا يمثلان تصنيفًا شرعيًا.',
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