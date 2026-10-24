import type { MobileResource } from '@/lib/mobile/resourceContract';
import { MOBILE_CONTRACT_VERSION, resourceFor } from '@/lib/mobile/resourceContract';
import { decodeMobileCursor, encodeMobileCursor, recordIdSchema, recordInputSchema } from '@/lib/mobile/resourceValidation';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { businessPermissions, type BusinessRole } from '@/lib/businessOperations';

const TABLES: Record<string, string> = {
  income: 'monthly_income_sources', expenses: 'expense_items', savings: 'savings_items', goals: 'financial_goals',
  debts: 'debts', holdings: 'investment_items', watchlist: 'market_watchlist', alerts: 'market_price_alerts',
  projects: 'projects', customers: 'business_customers', suppliers: 'business_suppliers', sales: 'business_sales',
  invoices: 'business_invoices', employees: 'business_employees', 'operating-expenses': 'business_operating_expenses',
  tasks: 'project_tasks', documents: 'project_documents',
};
const valuationColumns = 'native_currency,native_market_value,user_currency,converted_market_value,valuation_last_updated_at';
function selection(resource: MobileResource) {
  return [
    'id',
    'created_at',
    ...resource.fields.map(field => field.key),
    ...(resource.id === 'holdings' ? valuationColumns.split(',') : []),
    // Attachment values are output-only. Generic record mutations must never
    // accept a client-supplied attachment URL.
    ...(resource.id === 'income' ? ['attachment_url', 'attachment_name', 'attachment_type', 'attachment_size'] : []),
    ...(resource.id === 'expenses' ? ['receipt_image_url', 'receipt_file_name'] : []),
  ].join(',');
}

export async function handleMobileRecords(request: Request, product: string, resourceId: string) {
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const resource = resourceFor(product, resourceId);
  if (!resource) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const table = TABLES[resource.id];
  if (!table) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const { client, userId } = access;
  const limited = rateLimitRequest(request, { max: 90, windowMs: 60_000, prefix: `mobile-records:${userId}` });
  if (limited) { limited.headers.set('Cache-Control', 'private, no-store'); return limited; }

  // Mirror the web's business role boundary, but fail closed on lookup errors.
  if (product === 'business') {
    const role = await client.from('business_user_roles').select('role').eq('user_id', userId).maybeSingle();
    if (role.error) return mobileResponse({ ok: false, code: 'ACCESS_UNAVAILABLE' }, 503);
    const value = role.data?.role ?? 'manager';
    if (!['manager', 'accountant', 'employee'].includes(value)) return mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403);
    const permissions = businessPermissions(value as BusinessRole);
    const allowed = request.method === 'GET' ? permissions.canViewBusinessModules
      : request.method === 'DELETE' ? permissions.canDeleteBusinessModules
        : resource.id === 'employees' ? permissions.canWriteEmployees : permissions.canWriteBusinessModules;
    if (!allowed) return mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const limitValue = url.searchParams.get('limit') ?? '50';
    if (!/^\d+$/.test(limitValue) || Number(limitValue) < 1 || Number(limitValue) > 100) return mobileResponse({ ok: false, code: 'INVALID_LIMIT' }, 400);
    const limit = Number(limitValue);
    let cursor: ReturnType<typeof decodeMobileCursor>;
    try { cursor = decodeMobileCursor(url.searchParams.get('cursor')); }
    catch { return mobileResponse({ ok: false, code: 'INVALID_CURSOR' }, 400); }
    let query = client.from(table).select(selection(resource)).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
    if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const result = await query;
    if (result.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
    const rows = (result.data ?? []) as unknown as Array<{ id: string; created_at: string }>;
    const records = rows.slice(0, limit);
    return mobileResponse({ ok: true, version: MOBILE_CONTRACT_VERSION, records, nextCursor: rows.length > limit ? encodeMobileCursor(records[records.length - 1]) : null });
  }
  if (resource.readOnly) return mobileResponse({ ok: false, code: 'READ_ONLY' }, 405);
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return mobileResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  // Bound bodies before parsing, including requests that omit Content-Length.
  const raw = await request.text();
  if (raw.length > 16_384) return mobileResponse({ ok: false, code: 'BODY_TOO_LARGE' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return mobileResponse({ ok: false, code: 'INVALID_REQUEST' }, 400); }
  const object = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const id = recordIdSchema.safeParse(object.id);
  if (request.method !== 'POST' && !id.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
  if (request.method === 'DELETE') {
    if (Object.keys(object).some(key => key !== 'id')) return mobileResponse({ ok: false, code: 'INVALID_REQUEST' }, 400);
    const result = await client.from(table).delete().eq('user_id', userId).eq('id', id.data!).select('id').maybeSingle();
    if (result.error) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
    return result.data ? mobileResponse({ ok: true, id: result.data.id }) : mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  }
  const input = { ...object };
  if (request.method === 'PATCH') delete input.id;
  const parsed = recordInputSchema(resource, request.method === 'PATCH').safeParse(input);
  if (!parsed.success) return mobileResponse({ ok: false, code: 'INVALID_RECORD' }, 400);
  const values = parsed.data;
  // The authenticated owner is always supplied by the server, never by input.
  const query = request.method === 'PATCH'
    ? client.from(table).update(values).eq('user_id', userId).eq('id', id.data!)
    : resource.id === 'watchlist'
      ? client.from(table).upsert({ ...values, user_id: userId }, { onConflict: 'user_id,symbol,asset_type' })
      : client.from(table).insert({ ...values, user_id: userId });
  const result = await query.select(selection(resource)).maybeSingle();
  if (result.error) return mobileResponse({ ok: false, code: result.error.code === '23505' ? 'DUPLICATE_RECORD' : 'SAVE_UNAVAILABLE' }, result.error.code === '23505' ? 409 : 503);
  return result.data ? mobileResponse({ ok: true, record: result.data }, request.method === 'POST' ? 201 : 200) : mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
}
