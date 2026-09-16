export type LegacyInvestmentReadinessRow = {
  id: string;
  updated_at: string | null;
};

export type CanonicalInvestmentReadinessRow = {
  id: string;
  legacy_investment_item_id: string | null;
  migration_state: string | null;
};

export type InvestmentMigrationCheckReadinessRow = {
  position_id: string;
  source_row_id: string;
  source_row_updated_at: string | null;
  verification_state: string | null;
};

export type InvestmentCutoverReadinessReason =
  | 'CANONICAL_ROWS_MISSING'
  | 'CANONICAL_ROWS_ORPHANED'
  | 'IMPORTS_PENDING_VERIFICATION'
  | 'LEGACY_SOURCE_DRIFT';

export type InvestmentCutoverReadiness = {
  readyForReadCutover: boolean;
  reasons: InvestmentCutoverReadinessReason[];
  legacyCount: number;
  canonicalCount: number;
  verifiedCount: number;
  pendingVerificationCount: number;
  missingCanonicalCount: number;
  orphanCanonicalCount: number;
  sourceDriftCount: number;
};

function time(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeInvestmentCutoverReadiness(input: {
  legacy: LegacyInvestmentReadinessRow[];
  canonical: CanonicalInvestmentReadinessRow[];
  checks: InvestmentMigrationCheckReadinessRow[];
}): InvestmentCutoverReadiness {
  const legacyIds = new Set(input.legacy.map(row => row.id));
  const canonicalByLegacyId = new Map(
    input.canonical
      .filter(row => Boolean(row.legacy_investment_item_id))
      .map(row => [row.legacy_investment_item_id as string, row] as const),
  );
  const canonicalIds = new Set(input.canonical.map(row => row.id));
  const checkByPosition = new Map(input.checks.map(row => [row.position_id, row] as const));

  const missingCanonicalCount = input.legacy.filter(row => !canonicalByLegacyId.has(row.id)).length;
  const orphanCanonicalCount = input.canonical.filter(row => {
    const legacyId = row.legacy_investment_item_id;
    return !legacyId || !legacyIds.has(legacyId);
  }).length;

  const verifiedCount = input.canonical.filter(row => {
    const check = checkByPosition.get(row.id);
    return row.migration_state === 'VERIFIED' && check?.verification_state === 'VERIFIED';
  }).length;
  const pendingVerificationCount = Math.max(0, input.canonical.length - verifiedCount);

  const legacyById = new Map(input.legacy.map(row => [row.id, row] as const));
  const sourceDriftCount = input.checks.filter(check => {
    if (!canonicalIds.has(check.position_id)) return false;
    const legacy = legacyById.get(check.source_row_id);
    if (!legacy) return false;
    const current = time(legacy.updated_at);
    const imported = time(check.source_row_updated_at);
    if (current === null) return false;
    return imported === null || current > imported;
  }).length;

  const reasons: InvestmentCutoverReadinessReason[] = [];
  if (missingCanonicalCount > 0) reasons.push('CANONICAL_ROWS_MISSING');
  if (orphanCanonicalCount > 0) reasons.push('CANONICAL_ROWS_ORPHANED');
  if (pendingVerificationCount > 0) reasons.push('IMPORTS_PENDING_VERIFICATION');
  if (sourceDriftCount > 0) reasons.push('LEGACY_SOURCE_DRIFT');

  return {
    readyForReadCutover: reasons.length === 0,
    reasons,
    legacyCount: input.legacy.length,
    canonicalCount: input.canonical.length,
    verifiedCount,
    pendingVerificationCount,
    missingCanonicalCount,
    orphanCanonicalCount,
    sourceDriftCount,
  };
}
