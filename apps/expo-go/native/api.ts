import Constants from 'expo-constants';
import { assertSessionVersion, beginSessionChange, clearSession, persistSession, sessionVersion, storedSession, type Session } from './sessionStore';
import { authChanged } from './navigation';
export type { Session } from './sessionStore';
import { businessAccess, type Product, type Resource, type Row } from './catalog';
import { recordPayload, recordQuery } from './records';
import { assertNativeSessionSecurity, NativeMfaRequired } from './sessionGate';

export class PendingNativeMfa extends Error {
  readonly expiresAt = Date.now() + 10 * 60_000;
  challenge?: string;
  finished = false;
  constructor(readonly kind: 'totp' | 'email', readonly session: Session, readonly version: number) { super('MFA_REQUIRED'); }
}

const extra = Constants.expoConfig?.extra ?? {};
export const product = (extra.sfmProduct || 'finance') as Product;
export const site = String(extra.apiBaseUrl || 'https://www.the-sfm.com').replace(/\/$/, '');
const url = String(extra.supabaseUrl || '').replace(/\/$/, '');
const key = String(extra.supabaseAnonKey || '');
export const sessionKey = `sfm-${product}-session`;
const refreshing = new Map<string, { version: number; job: Promise<Session> }>();
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(endpoint, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found'].includes(body?.error_code ?? body?.code) || body?.error === 'invalid_grant') throw new Error('SESSION_EXPIRED');
      if (response.status === 403) throw new Error('لا تملك صلاحية لهذه العملية');
      if (response.status === 429) throw new Error('محاولات كثيرة. انتظر قليلاً وأعد المحاولة');
      if (body?.code === '23505') throw new Error('هذا السجل موجود مسبقاً');
      if (body?.code === '42501') throw new Error('لا تملك صلاحية لهذه العملية');
      throw new Error('تعذرت العملية. تحقق من البيانات والاتصال ثم أعد المحاولة');
    }
    return body as T;
  } finally { clearTimeout(timeout); }
}
function sessionFrom(body: Record<string, unknown>): Session {
  if (typeof body?.access_token !== 'string' || !body.access_token || typeof body.refresh_token !== 'string' || !body.refresh_token || typeof body.expires_in !== 'number' || !Number.isFinite(body.expires_in) || body.expires_in <= 0) throw new Error('SESSION_EXPIRED');
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + body.expires_in * 1000 };
}
export async function refreshSession(active: Session, storageKey = sessionKey): Promise<Session> {
  const version = sessionVersion(storageKey);
  const pending = refreshing.get(storageKey);
  if (pending?.version === version) return pending.job;
  const job = (async () => {
    const saved = await storedSession(storageKey, version);
    if (saved.accessToken !== active.accessToken || saved.refreshToken !== active.refreshToken) throw new Error('SESSION_CHANGED');
    if (saved.expiresAt > Date.now() + 60000) return saved;
    const body = await fetchJson<Record<string, unknown>>(`${url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: saved.refreshToken }) });
    assertSessionVersion(storageKey, version);
    const next = sessionFrom(body);
    await persistSession(storageKey, next, version);
    return next;
  })();
  refreshing.set(storageKey, { version, job });
  try { return await job; } finally { if (refreshing.get(storageKey)?.job === job) refreshing.delete(storageKey); }
}
export async function activeSession() {
  const version = sessionVersion(sessionKey);
  const saved = await storedSession(sessionKey, version);
  try { return await refreshSession(saved); }
  catch (reason) {
    if (reason instanceof Error && reason.message === 'SESSION_EXPIRED' && version === sessionVersion(sessionKey)) await clearSession(sessionKey, version);
    throw reason;
  }
}
export async function signIn(email: string, password: string) {
  if (!url || !key) throw new Error('إعدادات الاتصال غير متاحة');
  const version = beginSessionChange(sessionKey);
  const body = await fetchJson<Record<string, unknown>>(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
  const next = sessionFrom(body);
  try { await assertNativeSessionSecurity(site, next.accessToken); }
  catch (reason) {
    assertSessionVersion(sessionKey, version);
    if (reason instanceof NativeMfaRequired) throw new PendingNativeMfa(reason.kind, next, version);
    throw reason;
  }
  await persistSession(sessionKey, next, version);
  authChanged();
  return next;
}
function checkChallenge(pending: PendingNativeMfa) {
  assertSessionVersion(sessionKey, pending.version);
  if (pending.finished || pending.expiresAt <= Date.now()) throw new Error('CHALLENGE_EXPIRED');
}
export async function sendNativeEmailCode(pending: PendingNativeMfa) {
  checkChallenge(pending);
  if (pending.kind !== 'email') throw new Error('INVALID_CHALLENGE');
  const body = await fetchJson<{ challenge?: string }>(`${site}/api/auth/mfa/mobile-email`, {
    method: 'POST', redirect: 'error', cache: 'no-store',
    headers: { Authorization: `Bearer ${pending.session.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start' }),
  });
  checkChallenge(pending);
  if (!body?.challenge) throw new Error('AUTH_UNAVAILABLE');
  pending.challenge = body.challenge;
}
export async function verifyNativeMfa(pending: PendingNativeMfa, code: string) {
  checkChallenge(pending);
  if (!/^\d{6}$/.test(code)) throw new Error('أدخل رمز التحقق المكوّن من 6 أرقام');
  const headers = { apikey: key, Authorization: `Bearer ${pending.session.accessToken}`, 'Content-Type': 'application/json' };
  let body: Record<string, unknown>;
  if (pending.kind === 'totp') {
    const account = await fetchJson<{ factors?: { id: string; factor_type: string; status: string }[] }>(`${url}/auth/v1/user`, { headers, cache: 'no-store', redirect: 'error' });
    const factor = account.factors?.find(item => item.factor_type === 'totp' && item.status === 'verified');
    if (!factor) throw new Error('AUTH_UNAVAILABLE');
    checkChallenge(pending);
    const endpoint = `${url}/auth/v1/factors/${encodeURIComponent(factor.id)}`;
    const challenge = await fetchJson<{ id: string }>(`${endpoint}/challenge`, { method: 'POST', headers, body: '{}', redirect: 'error' });
    checkChallenge(pending);
    if (!challenge?.id) throw new Error('AUTH_UNAVAILABLE');
    body = await fetchJson(`${endpoint}/verify`, { method: 'POST', headers, body: JSON.stringify({ challenge_id: challenge.id, code }), redirect: 'error' });
  } else {
    if (!pending.challenge) throw new Error('أرسل رمز التحقق أولاً');
    body = await fetchJson(`${site}/api/auth/mfa/mobile-email`, {
      method: 'POST', headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' }, redirect: 'error', cache: 'no-store',
      body: JSON.stringify({ action: 'verify', challenge: pending.challenge, code }),
    });
  }
  checkChallenge(pending);
  const next = sessionFrom(body);
  await assertNativeSessionSecurity(site, next.accessToken);
  checkChallenge(pending);
  await persistSession(sessionKey, next, pending.version);
  pending.finished = true;
  authChanged();
  return next;
}
export function cancelNativeMfa(pending: PendingNativeMfa) {
  if (pending.finished) return;
  pending.finished = true;
  // Queue deletion behind a SecureStore write already in flight. Incrementing
  // the generation alone would leave that late write on disk after cancel.
  if (sessionVersion(sessionKey) === pending.version) void clearSession(sessionKey, pending.version).catch(() => undefined);
  // Cancel only this uncommitted login; never revoke another saved account.
  void fetchJson(`${url}/auth/v1/logout?scope=local`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${pending.session.accessToken}` }, redirect: 'error' }).catch(() => undefined);
}
export async function signOut(scope: 'local' | 'global' = 'local') {
  const version = sessionVersion(sessionKey);
  let session: Session | undefined;
  try { session = await storedSession(sessionKey, version); } catch (reason) { if (reason instanceof Error && reason.message === 'SESSION_CHANGED') throw reason; }
  // Local data disappears even when the device is offline. Report whether
  // server revocation succeeded instead of claiming all devices were revoked.
  await clearSession(sessionKey, version);
  if (!session) return false;
  try {
    await fetchJson(`${url}/auth/v1/logout?scope=${scope}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${session.accessToken}` } });
    return true;
  } catch { return false; }
}
async function authenticated<T>(endpoint: string, options: RequestInit, version: number) {
  assertSessionVersion(sessionKey, version);
  const session = await activeSession();
  assertSessionVersion(sessionKey, version);
  const headers = new Headers(options.headers);
  headers.set('apikey', key); headers.set('Authorization', `Bearer ${session.accessToken}`); headers.set('Content-Type', 'application/json');
  try {
    await assertNativeSessionSecurity(site, session.accessToken);
    assertSessionVersion(sessionKey, version);
    const body = await fetchJson<T>(endpoint, { ...options, headers, cache: 'no-store', redirect: 'error' });
    assertSessionVersion(sessionKey, version);
    return body;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'SESSION_EXPIRED' && version === sessionVersion(sessionKey)) await clearSession(sessionKey, version);
    throw reason;
  }
}
export async function request<T>(path: string, options: RequestInit = {}, version = sessionVersion(sessionKey)) {
  if (!/^\/(?:auth|rest)\/v1\//.test(path) || path.includes('..') || path.includes('#')) throw new Error('INVALID_PATH');
  return authenticated<T>(`${url}${path}`, options, version);
}
export function accountSummary<T>() {
  if (product === 'investor') throw new Error('INVALID_PRODUCT');
  return authenticated<{ ok: boolean; summary: T }>(`${site}/api/mobile/${product}/summary`, {}, sessionVersion(sessionKey));
}
export function user(version = sessionVersion(sessionKey)) { return request<{ id: string; email?: string; created_at?: string }>('/auth/v1/user', {}, version); }
export async function roleFor(userId: string, version = sessionVersion(sessionKey)) {
  const rows = await request<Row[]>(`/rest/v1/business_user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`, {}, version);
  return String(rows[0]?.role ?? 'manager');
}
export async function accessFor(resource: Resource, userId: string, version = sessionVersion(sessionKey)) {
  if (!resource.products.includes(product)) throw new Error('هذا القسم غير متاح لهذا التطبيق');
  if (product === 'business' && resource.path !== '/projects') return businessAccess(await roleFor(userId, version), resource.path);
  return { view: true, write: !resource.readOnly, remove: !resource.readOnly };
}
export async function loadRecords(resource: Resource, offset = 0) {
  const version = sessionVersion(sessionKey); const account = await user(version);
  const access = await accessFor(resource, account.id, version);
  if (!access.view) throw new Error('لا تملك صلاحية عرض هذا القسم');
  return { rows: await request<Row[]>(recordQuery(resource, account.id, undefined, offset), {}, version), access };
}
export async function saveRecord(resource: Resource, form: Record<string, string>, original: Row = {}) {
  const version = sessionVersion(sessionKey); const account = await user(version); const access = await accessFor(resource, account.id, version);
  if (!access.write || resource.readOnly) throw new Error('لا تملك صلاحية تعديل هذا القسم');
  const payload = recordPayload(resource, form, original);
  const path = original.id ? recordQuery(resource, account.id, original.id) : `/rest/v1/${resource.table}`;
  const rows = await request<Row[]>(path, { method: original.id ? 'PATCH' : 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, user_id: account.id }) }, version);
  if (!rows?.length) throw new Error('لم يتم حفظ السجل. أعد تحميل الصفحة');
  return rows[0];
}
export async function deleteRecord(resource: Resource, id: string) {
  const version = sessionVersion(sessionKey); const account = await user(version); const access = await accessFor(resource, account.id, version);
  if (!access.remove || resource.readOnly) throw new Error('لا تملك صلاحية حذف السجل');
  const rows = await request<Row[]>(recordQuery(resource, account.id, id), { method: 'DELETE', headers: { Prefer: 'return=representation' } }, version);
  if (!rows?.length) throw new Error('لم يتم حذف السجل. أعد تحميل الصفحة');
}
export function message(error: unknown) {
  if (error instanceof Error && ['SESSION_EXPIRED', 'SESSION_CHANGED'].includes(error.message)) return 'سجّل الدخول إلى حسابك للمتابعة';
  if (error instanceof Error && error.message === 'MFA_REQUIRED') return 'يتطلب حسابك التحقق الإضافي. أعد تسجيل الدخول وأدخل رمز التحقق.';
  if (error instanceof Error && error.message === 'CHALLENGE_EXPIRED') return 'انتهت مهلة التحقق. أعد تسجيل الدخول.';
  if (error instanceof Error && error.message === 'AUTH_UNAVAILABLE') return 'تعذر التحقق من أمان الجلسة. أعد المحاولة لاحقاً.';
  return error instanceof Error && error.name !== 'AbortError' ? error.message : 'تعذر الاتصال. أعد المحاولة';
}
