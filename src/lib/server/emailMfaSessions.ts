// Only the server may record completed email verification. The row is bound
// to the verified Supabase user AND session, never a caller-supplied account.
export async function recordEmailMfaSession(userId: string, sessionId: string, expiresAt: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.DATABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !userId || !sessionId) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${url}/rest/v1/email_mfa_sessions?on_conflict=session_id`, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId, session_id: sessionId, expires_at: new Date(expiresAt * 1000).toISOString() }),
    });
    return response.ok;
  } catch { return false; }
  finally { clearTimeout(timeout); }
}
