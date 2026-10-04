import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type OperationalHealthCacheEntry = {
  cache_key: string;
  payload: unknown;
  updated_at: string;
  expires_at: string;
};

/** Best-effort metadata persistence with database-enforced timestamp ordering.
 * A delayed serverless callback must not overwrite a newer observation from another instance.
 * Inserting first with conflict-ignore also covers two callers racing on a previously empty key. */
export async function persistMonotonicOperationalRecords(
  admin: SupabaseClient,
  entries: OperationalHealthCacheEntry[],
): Promise<void> {
  if (!entries.length) return;
  const signal = AbortSignal.timeout(1_200);
  try {
    const inserted = await admin.from('trader_cache')
      .upsert(entries, { onConflict: 'cache_key', ignoreDuplicates: true }).abortSignal(signal);
    if (inserted.error) return;
    await Promise.all(entries.map(entry => admin.from('trader_cache')
      .update({ payload: entry.payload, updated_at: entry.updated_at, expires_at: entry.expires_at })
      .eq('cache_key', entry.cache_key).lte('updated_at', entry.updated_at).abortSignal(signal)));
  } catch {
    // Neither a telemetry-store failure nor its timeout may alter the user operation.
  }
}
