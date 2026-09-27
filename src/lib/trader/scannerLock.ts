import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export type ScanLockPayload = {
  runId: string;
  lockedAt: string;
};

export type AcquireLockResult =
  | { acquired: true }
  | { acquired: false; existing: ScanLockPayload };

export async function acquireScanLock(
  cacheKey: string,
  runId: string,
  ttlMs: number,
): Promise<AcquireLockResult> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { acquired: true };

  const now = Date.now();
  const payload: ScanLockPayload = { runId, lockedAt: new Date(now).toISOString() };
  const expiresAt = new Date(now + ttlMs).toISOString();

  const insert = await admin.from('trader_cache').insert({
    cache_key: cacheKey,
    payload,
    expires_at: expiresAt,
    updated_at: new Date(now).toISOString(),
  });
  if (!insert.error) return { acquired: true };

  const existingRow = await admin
    .from('trader_cache')
    .select('payload, expires_at, updated_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  const existingPayload = (existingRow.data?.payload as ScanLockPayload | undefined) ?? null;
  const isStale = existingRow.data ? new Date(existingRow.data.expires_at).getTime() < now : false;

  if (isStale && existingRow.data) {
    // Claim an expired row only if it still has the expiry value we observed.
    // Without this compare-and-set guard, two serverless instances can both read
    // the same stale lock, both update it, and both proceed as lock owners.
    const stolen = await admin
      .from('trader_cache')
      .update({ payload, expires_at: expiresAt, updated_at: new Date(now).toISOString() })
      .eq('cache_key', cacheKey)
      .eq('expires_at', existingRow.data.expires_at)
      .select('cache_key');
    if (!stolen.error && stolen.data?.length === 1) return { acquired: true };
  }

  return {
    acquired: false,
    existing: existingPayload ?? { runId: 'unknown', lockedAt: new Date(0).toISOString() },
  };
}

export async function releaseScanLock(cacheKey: string, runId: string): Promise<void> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return;

  const existing = await admin
    .from('trader_cache')
    .select('payload, updated_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  const existingPayload = existing.data?.payload as ScanLockPayload | undefined;
  if (existingPayload?.runId === runId && existing.data?.updated_at) {
    // Do not delete a lease another instance acquired after the owner read it.
    await admin
      .from('trader_cache')
      .delete()
      .eq('cache_key', cacheKey)
      .eq('updated_at', existing.data.updated_at);
  }
}
