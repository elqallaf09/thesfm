import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import {
  computeInvestmentCutoverReadiness,
  type CanonicalInvestmentReadinessRow,
  type InvestmentMigrationCheckReadinessRow,
  type LegacyInvestmentReadinessRow,
} from './canonicalReadiness';

type CountedScan = {
  data: unknown[] | null;
  count: number | null;
};

function assertCompleteScan(label: string, scan: CountedScan) {
  const loaded = scan.data?.length ?? 0;
  if (typeof scan.count !== 'number' || scan.count !== loaded) {
    throw new Error(`INVESTMENT_READINESS_SCAN_INCOMPLETE:${label}`);
  }
}

export async function loadInvestmentCutoverReadiness(userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('INVESTMENT_READINESS_SERVER_NOT_CONFIGURED');

  const [legacy, canonical, checks] = await Promise.all([
    admin
      .from('investment_items')
      .select('id,updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5000),
    admin
      .from('investment_positions')
      .select('id,legacy_investment_item_id,migration_state', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5000),
    admin
      .from('investment_position_migration_checks')
      .select('position_id,source_row_id,source_row_updated_at,verification_state', { count: 'exact' })
      .eq('user_id', userId)
      .limit(5000),
  ]);

  const firstError = legacy.error ?? canonical.error ?? checks.error;
  if (firstError) throw firstError;

  assertCompleteScan('legacy', legacy);
  assertCompleteScan('canonical', canonical);
  assertCompleteScan('checks', checks);

  return computeInvestmentCutoverReadiness({
    legacy: (legacy.data ?? []) as LegacyInvestmentReadinessRow[],
    canonical: (canonical.data ?? []) as CanonicalInvestmentReadinessRow[],
    checks: (checks.data ?? []) as InvestmentMigrationCheckReadinessRow[],
  });
}
