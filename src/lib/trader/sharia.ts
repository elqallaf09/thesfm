import {
  normalizeShariahStatus,
  type ShariahStatus,
} from '@/lib/market/shariah-screening';

export type ShariaStatus = ShariahStatus;
export type TraderShariaStatus = ShariahStatus;

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
  | 'asset_type_unclassified'
  | 'other_verified_reason';

export type TraderShariaClassification = {
  status: TraderShariaStatus;
  label_ar?: string;
  reason_code: ShariaReasonCode | string | null;
  reason_ar: string | null;
  source: string | null;
  standard: string | null;
  reviewed_at: string | null;
  valid_until?: string | null;
  data_version?: string | null;
  reviewer_id?: string | null;
};

export const SHARIA_REVIEW_VALIDITY_DAYS = 365;

const STATUS_LABEL_AR: Record<TraderShariaStatus, string> = {
  compliant: 'مطابق للشريعة',
  non_compliant: 'غير مطابق للشريعة',
  needs_review: 'يحتاج مراجعة',
  unclassified: 'غير مصنّف',
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
  asset_type_unclassified: 'لا توجد بيانات تصنيف موثوقة كافية لهذا النوع من الأصول',
  other_verified_reason: 'سبب آخر موثق',
};

export function normalizeShariaStatus(value: unknown): TraderShariaStatus {
  return normalizeShariahStatus(value, 'unclassified') ?? 'unclassified';
}

export function isShariaClassificationExpired(
  classification: Pick<TraderShariaClassification, 'reviewed_at' | 'valid_until'>,
  now = new Date(),
) {
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

export function getEffectiveShariaStatus(
  classification: TraderShariaClassification | null | undefined,
  now = new Date(),
): TraderShariaStatus {
  const normalized = normalizeShariaClassification(classification, buildReviewRequiredShariaClassification());
  if (normalized.status === 'unclassified' || normalized.status === 'needs_review') return normalized.status;
  if (!normalized.reviewed_at) return 'needs_review';
  return isShariaClassificationExpired(normalized, now) ? 'needs_review' : normalized.status;
}

export function buildReviewRequiredShariaClassification(
  reasonCode: ShariaReasonCode = 'not_yet_reviewed',
  overrides: Partial<TraderShariaClassification> = {},
): TraderShariaClassification {
  return {
    status: 'needs_review',
    label_ar: STATUS_LABEL_AR.needs_review,
    reason_code: reasonCode,
    reason_ar: REVIEW_REASON_AR[reasonCode] ?? REVIEW_REASON_AR.not_yet_reviewed,
    source: null,
    standard: null,
    reviewed_at: null,
    valid_until: null,
    ...overrides,
  };
}

export function buildUnsupportedShariaClassification(reasonCode: ShariaReasonCode = 'asset_type_unclassified'): TraderShariaClassification {
  return {
    status: 'unclassified',
    label_ar: STATUS_LABEL_AR.unclassified,
    reason_code: reasonCode,
    reason_ar: REVIEW_REASON_AR[reasonCode] ?? REVIEW_REASON_AR.asset_type_unclassified,
    source: null,
    standard: null,
    reviewed_at: null,
    valid_until: null,
  };
}

export function normalizeShariaClassification(
  input: unknown,
  fallback: TraderShariaClassification = buildReviewRequiredShariaClassification(),
): TraderShariaClassification {
  if (!input || typeof input !== 'object') return fallback;
  const record = input as Record<string, unknown>;
  const status = normalizeShariaStatus(record.status);
  const reasonCode = typeof record.reason_code === 'string'
    ? record.reason_code
    : fallback.reason_code;

  return {
    status,
    label_ar: typeof record.label_ar === 'string' && record.label_ar.trim() ? record.label_ar : STATUS_LABEL_AR[status],
    reason_code: reasonCode,
    reason_ar: typeof record.reason_ar === 'string' && record.reason_ar.trim()
      ? record.reason_ar
      : reasonCode && reasonCode in REVIEW_REASON_AR
        ? REVIEW_REASON_AR[reasonCode as ShariaReasonCode]
        : fallback.reason_ar,
    source: typeof record.source === 'string' && record.source.trim() ? record.source : fallback.source,
    standard: typeof record.standard === 'string' && record.standard.trim() ? record.standard : fallback.standard,
    reviewed_at: typeof record.reviewed_at === 'string' && record.reviewed_at.trim() ? record.reviewed_at : fallback.reviewed_at,
    valid_until: typeof record.valid_until === 'string' && record.valid_until.trim() ? record.valid_until : fallback.valid_until,
    data_version: typeof record.data_version === 'string' ? record.data_version : fallback.data_version,
    reviewer_id: typeof record.reviewer_id === 'string' ? record.reviewer_id : fallback.reviewer_id,
  };
}
