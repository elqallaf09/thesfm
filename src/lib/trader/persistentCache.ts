import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

// كاش دائم في Supabase: يعيش عبر جميع نسخ serverless (ذاكرة السيرفر تتصفر
// مع كل نسخة جديدة). فشله لأي سبب لا يكسر التدفق — يتصرف كأن الكاش فارغ.

export async function getPersistentCache<T>(key: string): Promise<T | null> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from('trader_cache')
      .select('payload, expires_at')
      .eq('cache_key', key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function setPersistentCache(key: string, payload: unknown, ttlMs: number): Promise<void> {
  try {
    const admin = createServerSupabaseAdmin();
    if (!admin) return;
    await admin.from('trader_cache').upsert({
      cache_key: key,
      payload,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
}
