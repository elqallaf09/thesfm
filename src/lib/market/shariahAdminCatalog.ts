import type { SupabaseClient } from '@supabase/supabase-js';
import { SHARIAH_STATUSES, type ShariahStatus } from '@/lib/market/shariah-screening';

/**
 * Counts across the FULL catalog (not just the paginated/searched rows the admin client happens
 * to have loaded) — the admin page previously computed these client-side by reducing over at most
 * 50 loaded rows, which under-counted every status whenever the catalog held more than the page
 * limit. Four cheap head:true count queries, one per status, run in parallel.
 */
export async function computeShariahCounts(admin: SupabaseClient): Promise<Record<ShariahStatus, number>> {
  const counts: Record<ShariahStatus, number> = { compliant: 0, non_compliant: 0, needs_review: 0, unclassified: 0 };
  await Promise.all(SHARIAH_STATUSES.map(async status => {
    const { count, error } = await admin
      .from('market_symbols')
      .select('id', { count: 'exact', head: true })
      .eq('shariah_status', status).eq('is_active', true);
    if (error || count === null) throw new Error('SHARIAH_COUNTS_UNAVAILABLE');
    counts[status] = count ?? 0;
  }));
  return counts;
}
