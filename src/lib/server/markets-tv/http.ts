import 'server-only';
import { tvPackagedOrigin } from '@/lib/markets-tv/cors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { inspectSessionSecurity, bearerToken } from '@/lib/server/authSession';
export function tvJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
export function tvDeviceOrigin(request: Request) { return sameOrigin(request) || tvPackagedOrigin(request); }
export async function tvAccount(request: Request) {
  const jar = await cookies();
  const token = bearerToken(request) || jar.get(AUTH_ACCESS_COOKIE)?.value;
  if (!token) return null;
  const result = await inspectSessionSecurity(token, jar.get(EMAIL_MFA_PROOF_COOKIE)?.value);
  return result.status === 'ok' && result.mfaRequirement === 'none' ? result : null;
}
export async function tvBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return null;
  if (Number(request.headers.get('content-length')) > 8192) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } catch { return null; } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  try { const value: unknown = JSON.parse(text); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; }
}
