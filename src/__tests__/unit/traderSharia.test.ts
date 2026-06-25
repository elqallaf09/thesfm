import { describe, expect, it } from 'vitest';
import {
  buildReviewRequiredShariaClassification,
  buildUnsupportedShariaClassification,
  getEffectiveShariaStatus,
  normalizeShariaClassification,
  normalizeShariaStatus,
} from '@/lib/trader/sharia';

describe('trader Sharia classification helpers', () => {
  it('never treats missing or unknown classifications as compliant', () => {
    expect(normalizeShariaStatus(undefined)).toBe('review_required');
    expect(normalizeShariaStatus('')).toBe('review_required');
    expect(normalizeShariaStatus('unknown')).toBe('review_required');
  });

  it('preserves unsupported instruments separately from stock review states', () => {
    const classification = buildUnsupportedShariaClassification();
    expect(classification.status).toBe('unsupported');
    expect(getEffectiveShariaStatus(classification)).toBe('unsupported');
  });

  it('downgrades expired compliant classifications to review required for display', () => {
    const expired = normalizeShariaClassification({
      status: 'compliant',
      source: 'Verified source',
      reviewed_at: '2024-01-01T00:00:00.000Z',
    }, buildReviewRequiredShariaClassification());

    expect(expired.status).toBe('compliant');
    expect(getEffectiveShariaStatus(expired, new Date('2026-06-25T00:00:00.000Z'))).toBe('review_required');
  });

  it('keeps verified non-compliant reason codes when supplied', () => {
    const classification = normalizeShariaClassification({
      status: 'non_compliant',
      reason_code: 'interest_bearing_debt_threshold',
      reason_ar: 'ارتفاع الديون ذات الفائدة',
      source: 'Verified source',
      reviewed_at: '2026-06-01T00:00:00.000Z',
    }, buildReviewRequiredShariaClassification());

    expect(classification.status).toBe('non_compliant');
    expect(classification.reason_code).toBe('interest_bearing_debt_threshold');
    expect(classification.reason_ar).toContain('الفائدة');
  });
});
