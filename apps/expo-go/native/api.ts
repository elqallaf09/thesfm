import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { businessAccess, type Product, type Resource, type Row } from './catalog';
import { recordPayload, recordQuery } from './records';

export type Session = { accessToken: string; refreshToken: string; expiresAt: number };
const extra = Constants.expoConfig?.extra ?? {};
export const product = (extra.sfmProduct || 'finance') as Product;
export const site = String(extra.apiBaseUrl || 'https://www.the-sfm.com').replace(/\/$/, '');
const url = String(extra.supabaseUrl || '').replace(/\/$/, '');
const key = String(extra.supabaseAnonKey || '');
export const sessionKey = `sfm-${product}-session`;
const refreshing = new Map<string, Promise<Session>>();
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(endpoint, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found'].includes(body?.error_code) || body?.error === 'invalid_grant') throw new Error('SESSION_EXPIRED');
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
  if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string' || typeof body.expires_in !== 'number') throw new Error('SESSION_EXPIRED');
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + body.expires_in * 1000 };
}
export async function refreshSession(active: Session, storageKey = sessionKey): Promise<Session> {
  if (active.expiresAt > Date.now() + 60000) return active;
  const pending = refreshing.get(storageKey);
  if (pending) return pending;
  const job = (async () => {
    const latest = await SecureStore.getItemAsync(storageKey);
    if (latest) { const saved = JSON.parse(latest) as Session; if (saved.accessToken !== active.accessToken && saved.expiresAt > Date.now() + 60000) return saved; }
    const body = await fetchJson<Record<string, unknown>>(`${url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: active.refreshToken }) });
    const next = sessionFrom(body);
    await SecureStore.setItemAsync(storageKey, JSON.stringify(next));
    return next;
  })();
  refreshing.set(storageKey, job);
  try { return await job; } finally { refreshing.delete(storageKey); }
}
export async function activeSession() {
  const saved = await SecureStore.getItemAsync(sessionKey);
  if (!saved) throw new Error('SESSION_EXPIRED');
  return refreshSession(JSON.parse(saved) as Session);
}
export async function signIn(email: string, password: string) {
  if (!url || !key) throw new Error('إعدادات الاتصال غير متاحة');
  const body = await fetchJson<Record<string, unknown>>(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
  const next = sessionFrom(body); await SecureStore.setItemAsync(sessionKey, JSON.stringify(next)); return next;
}
export async function request<T>(path: string, options: RequestInit = {}) {
  const session = await activeSession();
  return fetchJson<T>(`${url}${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json', ...options.headers } });
}
export function user() { return request<{ id: string; email?: string; created_at?: string }>('/auth/v1/user'); }
export async function roleFor(userId: string) {
  const rows = await request<Row[]>(`/rest/v1/business_user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`);
  return String(rows[0]?.role ?? 'manager');
}
export async function accessFor(resource: Resource, userId: string) {
  if (!resource.products.includes(product)) throw new Error('هذا القسم غير متاح لهذا التطبيق');
  if (product === 'business' && resource.path !== '/projects') return businessAccess(await roleFor(userId), resource.path);
  return { view: true, write: !resource.readOnly, remove: !resource.readOnly };
}
export async function loadRecords(resource: Resource, offset = 0) {
  const account = await user();
  const access = await accessFor(resource, account.id);
  if (!access.view) throw new Error('لا تملك صلاحية عرض هذا القسم');
  return { rows: await request<Row[]>(recordQuery(resource, account.id, undefined, offset)), access };
}
export async function saveRecord(resource: Resource, form: Record<string, string>, original: Row = {}) {
  const account = await user(); const access = await accessFor(resource, account.id);
  if (!access.write || resource.readOnly) throw new Error('لا تملك صلاحية تعديل هذا القسم');
  const payload = recordPayload(resource, form, original);
  const path = original.id ? recordQuery(resource, account.id, original.id) : `/rest/v1/${resource.table}`;
  const rows = await request<Row[]>(path, { method: original.id ? 'PATCH' : 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, user_id: account.id }) });
  if (!rows?.length) throw new Error('لم يتم حفظ السجل. أعد تحميل الصفحة');
  return rows[0];
}
export async function deleteRecord(resource: Resource, id: string) {
  const account = await user(); const access = await accessFor(resource, account.id);
  if (!access.remove || resource.readOnly) throw new Error('لا تملك صلاحية حذف السجل');
  const rows = await request<Row[]>(recordQuery(resource, account.id, id), { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  if (!rows?.length) throw new Error('لم يتم حذف السجل. أعد تحميل الصفحة');
}
export function message(error: unknown) { return error instanceof Error && error.message === 'SESSION_EXPIRED' ? 'سجّل الدخول إلى حسابك للمتابعة' : error instanceof Error && error.name !== 'AbortError' ? error.message : 'تعذر الاتصال. أعد المحاولة'; }
