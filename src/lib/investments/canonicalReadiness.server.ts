import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import {
  computeInvestmentCutoverReadiness,
  type CanonicalInvestmentReadinessRow,
  type InvestmentMigrationCheckReadinessRow,
  type LegacyInvestmentReadinessRow,
} from './canonicalReadiness';

export async function loadInvestmentCutoverReadiness(userId: string) {
  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('INVESTMENT_READINESS_SERVER_NOT_CONFIGURED');

  const [legacy, canonical, checks] = await Promise.all([
    admin
      .from('investment_items')
      .select('id,updated_at')
      .eq('user_id', userId)
      .limit(5000),
    admin
      .from('investment_positions')
      .select('id,legacy_investment_item_id,migration_state')
      .eq('user_id', userId)
      .limit(5000),
    admin
      .from('investment_position_migration_checks')
      .select('position_id,source_row_id,source_row_updated_at,verification_state')
      .eq('user_id', userId)
      .limit(5000),
  ]);

  const firstError = legacy.error ?? canonical.error ?? checks.error;
  if (firstError) throw firstError;

  return computeInvestmentCutoverReadiness({
    legacy: (legacy.data ?? []) as LegacyInvestmentReadinessRow[],
    canonical: (canonical.data ?? []) as CanonicalInvestmentReadinessRow[],
    checks: (checks.data ?? []) as InvestmentMigrationCheckReadinessRow[],
  });
}
