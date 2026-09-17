import 'server-only';

import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { loadInvestmentCutoverReadiness } from './canonicalReadiness.server';
import {
  toCanonicalInvestmentPosition,
  type CanonicalInvestmentPositionRow,
} from './canonicalPosition';

const CANONICAL_POSITION_SELECT = [
  'id',
  'asset_type',
  'canonical_asset_identifier',
  'symbol',
  'display_name',
  'country_code',
  'exchange_code',
  'sector_or_category',
  'quantity',
  'ownership_percentage',
  'unit_type',
  'purchase_date',
  'purchase_unit_price',
  'purchase_currency',
  'total_cost',
  'fees',
  'current_unit_price',
  'current_total_value',
  'valuation_currency',
  'user_base_currency',
  'converted_value_in_base_currency',
  'valuation_method',
  'valuation_source',
  'source_quality',
  'valuation_confidence',
  'valued_at',
  'fx_rate_to_base_currency',
  'fx_source',
  'fx_valued_at',
  'unrealized_gain_loss',
  'realized_gain_loss',
  'return_percentage',
  'income_or_distributions',
  'total_return',
  'purchase_platform_name',
  'purchase_platform_type',
  'asset_logo_url',
  'asset_image_url',
  'notes',
  'migration_state',
  'imported_at',
  'created_at',
  'updated_at',
].join(',');

export class InvestmentCanonicalNotReadyError extends Error {
  readonly code = 'INVESTMENT_CANONICAL_NOT_READY';

  constructor(
    readonly readiness: Awaited<ReturnType<typeof loadInvestmentCutoverReadiness>>,
  ) {
    super('Investment canonical read model is not ready for cutover.');
    this.name = 'InvestmentCanonicalNotReadyError';
  }
}

export async function loadCanonicalInvestmentPositions(userId: string) {
  const readiness = await loadInvestmentCutoverReadiness(userId);
  if (!readiness.readyForReadCutover) {
    throw new InvestmentCanonicalNotReadyError(readiness);
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) throw new Error('INVESTMENT_CANONICAL_SERVER_NOT_CONFIGURED');

  const { data, error } = await admin
    .from('investment_positions')
    .select(CANONICAL_POSITION_SELECT)
    .eq('user_id', userId)
    .eq('migration_state', 'VERIFIED')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(5000);

  if (error) throw error;

  const rows = (data ?? []) as unknown as CanonicalInvestmentPositionRow[];
  return {
    readiness,
    positions: rows.map(toCanonicalInvestmentPosition),
  };
}
