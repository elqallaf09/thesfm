export type ShariaStatus = 'compliant' | 'non_compliant' | 'review_required' | 'unsupported';

export type ShariaReasonCode =
  | 'prohibited_business_activity'
  | 'financial_ratio_threshold'
  | 'interest_bearing_debt_threshold'
  | 'non_permissible_income_threshold'
  | 'insufficient_financial_data'
  | 'classification_expired'
  | 'source_unavailable'
  | 'conflicting_sources'
  | 'not_yet_reviewed'
  | 'other_verified_reason';

export type TraderShariaClassification = {
  status: ShariaStatus;
  label_ar: string;
  reason_code: ShariaReasonCode | null;
  reason_ar: string | null;
  source: string | null;
  standard: string | null;
  reviewed_at: string | null;
  valid_until: string | null;
  data_version?: string | null;
  reviewer_id?: string | null;
};

export const SHARIA_REVIEW_VALIDITY_DAYS = 365;

const STATUS_LABEL_AR: Record<ShariaStatus, string> = {
  compliant: 'متوافق شرعياً',
  non_compliant: 'غير متوافق شرعياً',
  review_required: 'يحتاج مراجعة',
  unsupported: 'غير منطبق',
};

const REVIEW_REASON_AR: Record<ShariaReasonCode, string> = {
  prohibited_business_activity: 'نشاط رئيسي غير متوافق',
  financial_ratio_threshold: 'تجاوز النسب المالية المعتمدة',
  interest_bearing_debt_threshold: 'ارتفاع الديون ذات الفائدة',
  non_permissible_income_threshold: 'تجاوز نسبة الإيرادات غير المتوافقة',
  insufficient_financial_data: 'بيانات غير مكتملة',
  classification_expired: 'التصنيف قديم ويحتاج إلى تحديث',
  source_unavailable: 'المصدر غير متاح',
  conflicting_sources: 'توجد نتائج متعارضة',
  not_yet_reviewed: 'لا يوجد تصنيف موثق',
  other_verified_reason: 'سبب آخر موثق',
};

export function normalizeShariaStatus(value: unknown): ShariaStatus {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['compliant', 'sharia_compliant', 'halal', 'approved'].includes(raw)) return 'compliant';
  if (['non_compliant', 'not_compliant', 'noncompliant', 'haram', 'rejected'].includes(raw)) return 'non_compliant';
  if (['unsupported', 'not_applicable', 'not_applicable_to_asset', 'na', 'n_a'].includes(raw)) return 'unsupported';
  return 'review_required';
}

export function isShariaClassificationExpired(classification: Pick<TraderShariaClassification, 'reviewed_at' | 'valid_until'>, now = new Date()) {
  if (classification.valid_until) {
    const validUntil = new Date(classification.valid_until);
    if (!Number.isNaN(validUntil.getTime()) && validUntil.getTime() < now.getTime()) return true;
  }

  if (classification.reviewed_at) {
    const reviewedAt = new Date(classification.reviewed_at);
    if (!Number.isNaN(reviewedAt.getTime())) {
      const ageMs = now.getTime() - reviewedAt.getTime();
      return ageMs > SHARIA_REVIEW_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
    }
  }

  return false;
}

export function getEffectiveShariaStatus(classification: TraderShariaClassification, now = new Date()): ShariaStatus {
  if (classification.status === 'compliant' && isShariaClassificationExpired(classification, now)) {
    return 'review_required';
  }
  return classification.status;
}

export function buildReviewRequiredShariaClassification(
  reasonCode: ShariaReasonCode = 'not_yet_reviewed',
  overrides: Partial<TraderShariaClassification> = {},
): TraderShariaClassification {
  return {
    status: 'review_required',
    label_ar: STATUS_LABEL_AR.review_required,
    reason_code: reasonCode,
    reason_ar: REVIEW_REASON_AR[reasonCode],
    source: null,
    standard: null,
    reviewed_at: null,
    valid_until: null,
    ...overrides,
  };
}

export function buildUnsupportedShariaClassification(reasonCode: ShariaReasonCode = 'not_yet_reviewed'): TraderShariaClassification {
  return {
    status: 'unsupported',
    label_ar: STATUS_LABEL_AR.unsupported,
    reason_code: reasonCode,
    reason_ar: null,
    source: null,
    standard: null,
    reviewed_at: null,
    valid_until: null,
  };
}

export function normalizeShariaClassification(input: unknown, fallback: TraderShariaClassification): TraderShariaClassification {
  if (!input || typeof input !== 'object') return fallback;
  const record = input as Record<string, unknown>;
  const status = normalizeShariaStatus(record.status);
  const reasonCode = typeof record.reason_code === 'string' && record.reason_code in REVIEW_REASON_AR
    ? record.reason_code as ShariaReasonCode
    : fallback.reason_code;

  return {
    status,
    label_ar: typeof record.label_ar === 'string' && record.label_ar.trim() ? record.label_ar : STATUS_LABEL_AR[status],
    reason_code: reasonCode,
    reason_ar: typeof record.reason_ar === 'string' && record.reason_ar.trim()
      ? record.reason_ar
      : reasonCode ? REVIEW_REASON_AR[reasonCode] : fallback.reason_ar,
    source: typeof record.source === 'string' && record.source.trim() ? record.source : fallback.source,
    standard: typeof record.standard === 'string' && record.standard.trim() ? record.standard : fallback.standard,
    reviewed_at: typeof record.reviewed_at === 'string' && record.reviewed_at.trim() ? record.reviewed_at : fallback.reviewed_at,
    valid_until: typeof record.valid_until === 'string' && record.valid_until.trim() ? record.valid_until : fallback.valid_until,
    data_version: typeof record.data_version === 'string' ? record.data_version : fallback.data_version,
    reviewer_id: typeof record.reviewer_id === 'string' ? record.reviewer_id : fallback.reviewer_id,
  };
}
