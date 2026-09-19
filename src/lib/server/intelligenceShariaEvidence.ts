import 'server-only';

import type { CanonicalAssetIdentity, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { classifyShariahCompliance, type ShariahScreeningInput } from '@/lib/market/shariah-screening';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { publicCatalogItem } from '@/lib/sharia-research/publicCatalog';

const MAX_REVIEW_AGE_MS = 180 * 86_400_000;
const COLUMNS = 'symbol,provider_symbol,exchange,country,asset_type,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_screening_data';

type StoredRow = {
  symbol?: string | null;
  provider_symbol?: string | null;
  exchange?: string | null;
  country?: string | null;
  asset_type?: string | null;
  shariah_status?: string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
  shariah_manual_override?: boolean | null;
  shariah_screening_data?: ShariahScreeningInput['shariahScreeningData'];
};

function countryCode(value: string | null | undefined) {
  const raw = String(value ?? '').trim().toUpperCase();
  const aliases: Record<string, string> = { KUWAIT: 'KW', USA: 'US', 'UNITED STATES': 'US', 'SAUDI ARABIA': 'SA', UAE: 'AE', 'UNITED ARAB EMIRATES': 'AE', QATAR: 'QA', BAHRAIN: 'BH', OMAN: 'OM' };
  return aliases[raw] ?? raw;
}

export function validateStoredIntelligenceSharia(
  row: StoredRow | null | undefined,
  asset: CanonicalAssetIdentity,
  now = Date.now(),
): VerifiedIntelligenceSnapshot['sharia'] | null {
  if (!row || !['STOCK', 'FUND'].includes(asset.assetType)) return null;
  if (asset.assetType === 'STOCK' ? row.asset_type !== 'stock' : !['etf', 'fund'].includes(row.asset_type ?? '')) return null;
  const expected = asset.providerSymbol.trim().toUpperCase();
  const actual = String(row.provider_symbol ?? '').trim().toUpperCase();
  // Provider identity is mandatory; a root ticker on its own can belong to a different exchange.
  if (!expected || actual !== expected) return null;
  const country = countryCode(asset.country);
  if (country && countryCode(row.country) !== country) return null;
  const reviewed = Date.parse(row.shariah_last_reviewed_at ?? '');
  if (!Number.isFinite(reviewed) || reviewed > now || now - reviewed > MAX_REVIEW_AGE_MS) return null;
  if (asset.assetType === 'FUND') {
    const decision = publicCatalogItem({ ...row, symbol: row.symbol ?? asset.canonicalSymbol, asset_type: 'etf' }, new Date(now));
    if (!decision.screeningSource || !decision.lastScreenedAt || decision.shariahStatus === 'unclassified') return null;
    return { status: decision.shariahStatus, source: decision.screeningSource, reviewedAt: decision.lastScreenedAt, reason: decision.reason.en };
  }
  const decision = classifyShariahCompliance({
    symbol: row.symbol,
    assetType: 'stock',
    exchange: row.exchange,
    country: row.country,
    shariahStatus: row.shariah_status,
    shariahReason: row.shariah_reason,
    shariahSource: row.shariah_source,
    shariahLastReviewedAt: row.shariah_last_reviewed_at,
    shariahManualOverride: row.shariah_manual_override,
    shariahScreeningData: row.shariah_screening_data,
  });
  if (decision.shariahStatus === 'unclassified' || !decision.shariahSource || !decision.shariahLastReviewedAt) return null;
  return {
    status: decision.shariahStatus,
    reason: decision.shariahReason,
    source: decision.shariahSource,
    reviewedAt: decision.shariahLastReviewedAt,
  };
}

export async function loadStoredIntelligenceSharia(asset: CanonicalAssetIdentity): Promise<VerifiedIntelligenceSnapshot['sharia'] | null> {
  if (!['STOCK', 'FUND'].includes(asset.assetType) || !asset.providerSymbol.trim()) return null;
  const admin = createServerSupabaseAdmin();
  if (!admin) return null;
  try {
    // Limit to two, not one: maybeSingle must reject ambiguous identities instead of picking arbitrarily.
    const result = await admin.from('market_symbols').select(COLUMNS)
      .eq('provider_symbol', asset.providerSymbol)
      .limit(2)
      .abortSignal(AbortSignal.timeout(2500))
      .maybeSingle();
    if (result.error) return null;
    return validateStoredIntelligenceSharia(result.data as StoredRow | null, asset);
  } catch {
    return null;
  }
  // Published issuer-operations opinions are intentionally not promoted into SFM screening decisions.
}
