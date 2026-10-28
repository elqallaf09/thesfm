import 'server-only';
import { createHash } from 'node:crypto';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

function cacheKey(apiKey: string) {
  return `market_provider_cooldown:twelve_data:${createHash('sha256').update(apiKey).digest('hex').slice(0, 24)}`;
}
type Cooldown = { version: 1; until: string; reason: 'provider_rate_limited' };

/** The existing private cache is shared by serverless instances; no new schema. */
export async function readTwelveDataCooldown(apiKey = process.env.TWELVE_DATA_API_KEY?.trim() || ''): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin.from('trader_cache').select('payload, expires_at')
      .eq('cache_key', cacheKey(apiKey)).abortSignal(AbortSignal.timeout(300)).maybeSingle();
    if (error || !data) return null;
    const payload = data.payload as Partial<Cooldown> | null;
    const until = typeof payload?.until === 'string' ? Date.parse(payload.until) : NaN;
    return payload?.version === 1 && payload.reason === 'provider_rate_limited'
      && until > Date.now() && Date.parse(data.expires_at) >= until ? until : null;
  } catch { return null; }
}

export async function publishTwelveDataCooldown(untilMs: number, apiKey = process.env.TWELVE_DATA_API_KEY?.trim() || ''): Promise<void> {
  if (!apiKey) return;
  if (!Number.isFinite(untilMs) || untilMs <= Date.now()) return;
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    const until = new Date(untilMs).toISOString();
    const row = { cache_key: cacheKey(apiKey), payload: { version: 1, until, reason: 'provider_rate_limited' },
      expires_at: until, updated_at: new Date().toISOString() };
    // Insert only if absent, then atomically extend an existing row. A shorter
    // concurrent cooldown can never overwrite a longer one, even on first insert.
    const inserted = await admin.from('trader_cache').upsert(row, { onConflict: 'cache_key', ignoreDuplicates: true })
      .abortSignal(AbortSignal.timeout(500));
    if (inserted.error) return;
    await admin.from('trader_cache').update(row).eq('cache_key', cacheKey(apiKey)).lt('expires_at', until)
      .abortSignal(AbortSignal.timeout(500));
  } catch { /* Local cooldown remains in force when persistence is unavailable. */ }
}
