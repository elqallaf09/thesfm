import { describe, expect, it } from 'vitest';
import { computeInvestmentCutoverReadiness } from '@/lib/investments/canonicalReadiness';

const legacy = (id: string, updatedAt = '2026-09-16T12:00:00.000Z') => ({ id, updated_at: updatedAt });
const canonical = (id: string, legacyId = id, state = 'VERIFIED') => ({
  id,
  legacy_investment_item_id: legacyId,
  migration_state: state,
});
const check = (id: string, sourceId = id, sourceUpdatedAt = '2026-09-16T12:00:00.000Z', state = 'VERIFIED') => ({
  position_id: id,
  source_row_id: sourceId,
  source_row_updated_at: sourceUpdatedAt,
  verification_state: state,
});

describe('investment canonical cutover readiness', () => {
  it('allows a read cutover only when coverage, verification and source timestamps match', () => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [legacy('a'), legacy('b')],
      canonical: [canonical('a'), canonical('b')],
      checks: [check('a'), check('b')],
    });

    expect(result).toEqual({
      readyForReadCutover: true,
      reasons: [],
      legacyCount: 2,
      canonicalCount: 2,
      verifiedCount: 2,
      pendingVerificationCount: 0,
      missingCanonicalCount: 0,
      orphanCanonicalCount: 0,
      sourceDriftCount: 0,
    });
  });

  it('blocks when a legacy row has no canonical position', () => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [legacy('a'), legacy('b')],
      canonical: [canonical('a')],
      checks: [check('a')],
    });

    expect(result.readyForReadCutover).toBe(false);
    expect(result.missingCanonicalCount).toBe(1);
    expect(result.reasons).toContain('CANONICAL_ROWS_MISSING');
  });

  it('blocks unverified imports even when row counts match', () => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [legacy('a')],
      canonical: [canonical('a', 'a', 'PENDING_VERIFICATION')],
      checks: [check('a', 'a', '2026-09-16T12:00:00.000Z', 'PENDING')],
    });

    expect(result.readyForReadCutover).toBe(false);
    expect(result.pendingVerificationCount).toBe(1);
    expect(result.reasons).toContain('IMPORTS_PENDING_VERIFICATION');
  });

  it('does not borrow another source row verification for the same position', () => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [legacy('a'), legacy('b')],
      canonical: [canonical('a'), canonical('b')],
      checks: [check('a', 'b'), check('b')],
    });
    expect(result.readyForReadCutover).toBe(false);
    expect(result.pendingVerificationCount).toBe(1);
    expect(result.reasons).toContain('IMPORTS_PENDING_VERIFICATION');
  });

  it.each([null, 'invalid', '2026-09-16T11:00:00.000Z'])('rejects an unknown or earlier source timestamp %s', updatedAt => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [{ id: 'a', updated_at: updatedAt }],
      canonical: [canonical('a')],
      checks: [check('a')],
    });
    expect(result.readyForReadCutover).toBe(false);
    expect(result.sourceDriftCount).toBe(1);
  });

  it('preserves Postgres microseconds while normalizing equivalent timezone offsets', () => {
    const input = {
      legacy: [legacy('a', '2026-09-16T12:00:00.123456Z')],
      canonical: [canonical('a')],
      checks: [check('a', 'a', '2026-09-16T15:00:00.123456+03:00')],
    };
    expect(computeInvestmentCutoverReadiness(input).readyForReadCutover).toBe(true);
    expect(computeInvestmentCutoverReadiness({ ...input, checks: [check('a', 'a', '2026-09-16T12:00:00.123457Z')] }).sourceDriftCount).toBe(1);
  });

  it('blocks when the legacy source changed after the recorded import timestamp', () => {
    const result = computeInvestmentCutoverReadiness({
      legacy: [legacy('a', '2026-09-16T13:00:00.000Z')],
      canonical: [canonical('a')],
      checks: [check('a', 'a', '2026-09-16T12:00:00.000Z')],
    });

    expect(result.readyForReadCutover).toBe(false);
    expect(result.sourceDriftCount).toBe(1);
    expect(result.reasons).toContain('LEGACY_SOURCE_DRIFT');
  });

  it('blocks orphan canonical rows without exposing row identifiers in the result', () => {
    const positionId = '__private-position-id__';
    const sourceRowId = '__private-source-row-id__';
    const result = computeInvestmentCutoverReadiness({
      legacy: [],
      canonical: [canonical(positionId, sourceRowId)],
      checks: [check(positionId, sourceRowId)],
    });
    const payload = JSON.stringify(result);

    expect(result.readyForReadCutover).toBe(false);
    expect(result.orphanCanonicalCount).toBe(1);
    expect(result.reasons).toContain('CANONICAL_ROWS_ORPHANED');
    expect(payload).not.toContain(positionId);
    expect(payload).not.toContain(sourceRowId);
  });
});
