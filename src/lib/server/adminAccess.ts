import { cookies } from 'next/headers';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
  EMPTY_ADMIN_PERMISSIONS,
  normalizeAdminPermissions,
  SUPER_ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminPermissions,
} from '@/lib/adminPermissions';

export const ADMIN_SESSION_COOKIE = 'sfm_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60;

export type AdminRoleName = 'admin' | 'super_admin';

export type AdminAccess = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRoleName | null;
  roleId: string | null;
  permissions: AdminPermissions;
  email: string | null;
  displayName: string | null;
};

export type AdminRoleRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: AdminRoleName;
  permissions: unknown;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbClient = SupabaseClient<any, 'public', any>;

const NO_ADMIN_ACCESS: AdminAccess = {
  isAdmin: false,
  isSuperAdmin: false,
  role: null,
  roleId: null,
  permissions: { ...EMPTY_ADMIN_PERMISSIONS },
  email: null,
  displayName: null,
};

function superAdminAccess(email: string): AdminAccess {
  return {
    isAdmin: true,
    isSuperAdmin: true,
    role: 'super_admin',
    roleId: null,
    permissions: { ...SUPER_ADMIN_PERMISSIONS },
    email,
    displayName: null,
  };
}

function parseEmailList(value?: string | null) {
  return (value || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

export function superAdminEmails() {
  return parseEmailList(process.env.SUPER_ADMIN_EMAILS);
}

export function isSuperAdminEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return superAdminEmails().includes(normalizedEmail);
}

export function isAdminEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return isSuperAdminEmail(normalizedEmail);
}

export function createServerSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeRoleName(value: unknown): AdminRoleName {
  return value === 'super_admin' ? 'super_admin' : 'admin';
}

export function hasAdminPermission(access: AdminAccess, permission?: AdminPermission | null) {
  if (!access.isAdmin) return false;
  if (access.isSuperAdmin) return true;
  if (!permission) return true;
  return access.permissions[permission] === true;
}

export async function getAdminAccessForUser(
  user: Pick<User, 'id' | 'email'> | null | undefined,
  adminClient: DbClient | null = createServerSupabaseAdmin(),
): Promise<AdminAccess> {
  if (!user?.id) return { ...NO_ADMIN_ACCESS, permissions: { ...EMPTY_ADMIN_PERMISSIONS } };

  const email = user.email?.trim().toLowerCase() || null;
  if (!adminClient) {
    return email && isSuperAdminEmail(email)
      ? superAdminAccess(email)
      : { ...NO_ADMIN_ACCESS, email, permissions: { ...EMPTY_ADMIN_PERMISSIONS } };
  }

  const { data, error } = await adminClient
    .from('admin_roles')
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (error && error.code !== 'PGRST116') {
      console.error('[admin-access] role lookup failed', { code: error.code, message: error.message });
    }
    return { ...NO_ADMIN_ACCESS, email, permissions: { ...EMPTY_ADMIN_PERMISSIONS } };
  }

  if (!data) {
    return email && isSuperAdminEmail(email)
      ? superAdminAccess(email)
      : { ...NO_ADMIN_ACCESS, email, permissions: { ...EMPTY_ADMIN_PERMISSIONS } };
  }

  if ((data as AdminRoleRow).user_id !== user.id || (data as AdminRoleRow).is_active !== true) {
    return { ...NO_ADMIN_ACCESS, email, permissions: { ...EMPTY_ADMIN_PERMISSIONS } };
  }

  const role = normalizeRoleName((data as AdminRoleRow).role);
  const isSuperAdmin = role === 'super_admin';
  return {
    isAdmin: true,
    isSuperAdmin,
    role,
    roleId: String(data.id),
    permissions: isSuperAdmin ? { ...SUPER_ADMIN_PERMISSIONS } : normalizeAdminPermissions(data.permissions),
    email: typeof data.email === 'string' ? data.email : email,
    displayName: typeof data.display_name === 'string' ? data.display_name : null,
  };
}

function bearerTokenFromRequest(request?: Request | null) {
  const header = request?.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

export async function getCurrentUserFromRequest(request?: Request | null): Promise<User | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? '';
  return getUserFromBearerToken(bearerTokenFromRequest(request) || cookieToken);
}

export async function requireAdminApiAccess(
  request: Request,
  permission?: AdminPermission,
): Promise<
  | { ok: true; user: User; access: AdminAccess; admin: DbClient }
  | { ok: false; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'SERVICE_NOT_CONFIGURED'; status: number }
> {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return { ok: false, code: 'UNAUTHORIZED', status: 401 };

  const admin = createServerSupabaseAdmin();
  if (!admin) return { ok: false, code: 'SERVICE_NOT_CONFIGURED', status: 503 };

  const access = await getAdminAccessForUser(user, admin);
  if (!hasAdminPermission(access, permission)) return { ok: false, code: 'FORBIDDEN', status: 403 };
  return { ok: true, user, access, admin };
}

export async function requireSuperAdminApiAccess(
  request: Request,
): Promise<
  | { ok: true; user: User; access: AdminAccess; admin: DbClient }
  | { ok: false; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'SERVICE_NOT_CONFIGURED'; status: number }
> {
  const auth = await requireAdminApiAccess(request);
  if (!auth.ok) return auth;
  if (!auth.access.isSuperAdmin) return { ok: false, code: 'FORBIDDEN', status: 403 };
  return auth;
}

export async function requireAdminPageAccess(nextPath: string, permission?: AdminPermission) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);
  if (!user) return { ok: false as const, reason: 'unauthenticated' as const, redirectTo: `/login?next=${encodeURIComponent(nextPath)}` };

  const admin = createServerSupabaseAdmin();
  if (!admin) return { ok: false as const, reason: 'service_unavailable' as const };

  const access = await getAdminAccessForUser(user, admin);
  if (!hasAdminPermission(access, permission)) return { ok: false as const, reason: 'forbidden' as const, user, access };
  return { ok: true as const, user, access, admin };
}

export async function requireSuperAdminPageAccess(nextPath: string) {
  const auth = await requireAdminPageAccess(nextPath);
  if (!auth.ok) return auth;
  if (!auth.access.isSuperAdmin) return { ok: false as const, reason: 'forbidden' as const, user: auth.user, access: auth.access };
  return auth;
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
