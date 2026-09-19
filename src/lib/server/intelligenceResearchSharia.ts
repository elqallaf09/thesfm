import 'server-only';
import type { CanonicalAssetIdentity, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { createServerSupabaseAdmin } from './adminAccess';
import { catalogPatchForResearch } from '@/lib/sharia-research/catalogSync';
import { SFM_FTSE_POINT_IN_TIME } from '@/lib/sharia-research/methodologies';
import type { ShariaScreeningResult } from '@/lib/sharia-research/types';
import { validateStoredIntelligenceSharia } from './intelligenceShariaEvidence';

/** Only the authenticated owner's completed, current research can enrich a private analysis. */
export async function loadResearchIntelligenceSharia(asset: CanonicalAssetIdentity, userId: string | null): Promise<VerifiedIntelligenceSnapshot['sharia'] | null> {
  if (!userId || asset.assetType !== 'STOCK') return null;
  const admin = createServerSupabaseAdmin();
  if (!admin) return null;
  try {
    const identity = await admin.from('sharia_security_identities').select('id,provider_symbol,country,exchange')
      .eq('provider_symbol', asset.providerSymbol).limit(2).abortSignal(AbortSignal.timeout(2000)).maybeSingle();
    if (identity.error || !identity.data) return null;
    const response = await admin.from('sharia_screening_results').select('result_payload,research_timestamp')
      .eq('user_id', userId).eq('security_id', identity.data.id)
      .eq('methodology_id', SFM_FTSE_POINT_IN_TIME.id).eq('methodology_version', SFM_FTSE_POINT_IN_TIME.version)
      .eq('persistence_status', 'complete').is('invalidated_at', null)
      .gte('research_timestamp', new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order('research_timestamp', { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(2000)).maybeSingle();
    if (response.error || !response.data?.result_payload) return null;
    const result = response.data.result_payload as ShariaScreeningResult;
    if (result.security.providerSymbol !== asset.providerSymbol || result.security.exchange !== identity.data.exchange) return null;
    return validateStoredIntelligenceSharia({
      ...catalogPatchForResearch(result), symbol: result.security.ticker, provider_symbol: result.security.providerSymbol,
      asset_type: 'stock', country: result.security.country, exchange: result.security.exchange,
    }, asset);
  } catch { return null; }
}
