/**
 * Persistent session store for external market providers (e.g. Myfxbook).
 *
 * Problem: Vercel serverless functions lose in-memory state on every cold start.
 * Each cold start triggers a fresh Myfxbook login → Cloudflare blocks server IPs
 * after repeated logins → timeouts and auth failures cascade.
 *
 * Solution: Store the session token in Supabase so it survives across invocations.
 * In-memory cache is still used as L1 (fast), Supabase as L2 (persistent).
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type StoredSession = {
  session_token: string;
  cache_key: string;
  expires_at: string;
};

/**
 * Retrieve a valid session from Supabase.
 * Returns null if not found, expired, or credentials changed.
 */
export async function getStoredProviderSession(
  providerId: string,
  cacheKey: string,
): Promise<string | null> {
  try {
    const client = getServiceClient();
    if (!client) return null;

    const { data, error } = await client
      .from('market_provider_sessions')
      .select('session_token, expires_at, cache_key')
      .eq('id', providerId)
      .maybeSingle<StoredSession>();

    if (error || !data) return null;
    if (data.cache_key !== cacheKey) return null;
    if (new Date(data.expires_at) <= new Date()) return null;

    return data.session_token;
  } catch {
    return null;
  }
}

/**
 * Persist a session token to Supabase.
 */
export async function storeProviderSession(
  providerId: string,
  sessionToken: string,
  cacheKey: string,
  ttlMs: number,
): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) return;

    await client.from('market_provider_sessions').upsert({
      id: providerId,
      session_token: sessionToken,
      cache_key: cacheKey,
      expires_at: new Date(Date.now() + ttlMs).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal: in-memory cache still works for this invocation
  }
}

/**
 * Remove a stored session (call when session is found to be invalid).
 */
export async function clearStoredProviderSession(providerId: string): Promise<void> {
  try {
    const client = getServiceClient();
    if (!client) return;
    await client.from('market_provider_sessions').delete().eq('id', providerId);
  } catch {
    // Non-fatal
  }
}
