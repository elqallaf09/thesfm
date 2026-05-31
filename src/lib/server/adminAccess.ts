import { createClient, type User } from '@supabase/supabase-js';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export const ADMIN_EMAIL = 'elqallaf09@gmail.com';
export const ADMIN_SESSION_COOKIE = 'sfm_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

export function isAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export function createServerSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adminAccessSecret() {
  return process.env.ADMIN_ACCESS_CODE?.trim() || '';
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  const secret = adminAccessSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAccessCodeConfigured() {
  return Boolean(adminAccessSecret());
}

export function isValidAdminAccessCode(code?: string | null) {
  const expected = adminAccessSecret();
  if (!expected || typeof code !== 'string') return false;
  return safeEqual(code.trim(), expected);
}

export function createAdminSessionToken(user: User) {
  if (!user.id || !isAdminEmail(user.email)) return null;
  const payload = base64UrlEncode(JSON.stringify({
    userId: user.id,
    email: user.email?.trim().toLowerCase(),
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    nonce: randomUUID(),
  }));
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function verifyAdminSessionToken(token: string | undefined, user: User | null) {
  if (!token || !user?.id || !isAdminEmail(user.email)) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expectedSignature = sign(payload);
  if (!expectedSignature || !safeEqual(signature, expectedSignature)) return false;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as { userId?: string; email?: string; exp?: number };
    return (
      session.userId === user.id &&
      session.email === user.email?.trim().toLowerCase() &&
      typeof session.exp === 'number' &&
      session.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export async function getUserFromBearerToken(token?: string | null): Promise<User | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
