import { financialAttachmentDisplayUrl, financialAttachmentUrl, isFinancialAttachmentPath } from '@/lib/financialAttachments';
import { businessPermissions, type BusinessRole } from '@/lib/businessOperations';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordIdSchema } from '@/lib/mobile/resourceValidation';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

const maxUploadBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

type AttachmentRow = {
  id: string;
  [key: string]: string | number | null;
};

type AttachmentResource = {
  resource: 'income' | 'expenses';
  table: 'monthly_income_sources' | 'expense_items';
  bucket: 'income-attachments' | 'receipts';
  columns: string;
  urlColumn: 'attachment_url' | 'receipt_image_url';
  nameColumn: 'attachment_name' | 'receipt_file_name';
  typeColumn?: 'attachment_type';
  sizeColumn?: 'attachment_size';
};

const attachmentResources: readonly AttachmentResource[] = [
  { resource: 'income', table: 'monthly_income_sources', bucket: 'income-attachments', columns: 'id,attachment_url,attachment_name,attachment_type,attachment_size', urlColumn: 'attachment_url', nameColumn: 'attachment_name', typeColumn: 'attachment_type', sizeColumn: 'attachment_size' },
  { resource: 'expenses', table: 'expense_items', bucket: 'receipts', columns: 'id,receipt_image_url,receipt_file_name', urlColumn: 'receipt_image_url', nameColumn: 'receipt_file_name' },
];

function attachmentResource(product: string, resource: string) {
  return product === 'finance' ? attachmentResources.find(item => item.resource === resource) ?? null : null;
}

function attachmentResponse(row: AttachmentRow, config: AttachmentResource) {
  return {
    id: row.id,
    url: row[config.urlColumn] ?? null,
    name: row[config.nameColumn] ?? null,
    type: config.typeColumn ? row[config.typeColumn] ?? null : null,
    size: config.sizeColumn ? row[config.sizeColumn] ?? null : null,
  };
}

function safeFileName(value: string) {
  const result = value.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
  return result || 'attachment';
}

function stableStoragePath(value: string | null, bucket: AttachmentResource['bucket']) {
  const stable = financialAttachmentDisplayUrl(value);
  if (!stable) return null;
  const url = new URL(stable, 'https://mobile-attachment.invalid');
  const path = url.searchParams.get('path') || '';
  return url.pathname === '/api/receipts/file' && url.searchParams.get('bucket') === bucket && isFinancialAttachmentPath(path) ? path : null;
}

function validSignedUrl(value: string, origin: string, bucket: string) {
  try {
    const url = new URL(value);
    return url.origin === new URL(origin).origin && url.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`) ? url.toString() : null;
  } catch {
    return null;
  }
}

function projectDocumentPath(value: unknown, userId: string) {
  if (typeof value !== 'string') return null;
  const parts = value.split('/');
  const projectId = recordIdSchema.safeParse(parts[2]);
  if (parts.length !== 4 || parts[0] !== userId || parts[1] !== 'projects' || !projectId.success || !parts[3] || parts.some(part => !part || part === '.' || part === '..')) return null;
  return value;
}

async function businessDocumentPermission(client: SupabaseClient, userId: string) {
  const role = await client.from('business_user_roles').select('role').eq('user_id', userId).maybeSingle();
  if (role.error) return { response: mobileResponse({ ok: false, code: 'ACCESS_UNAVAILABLE' }, 503) };
  const value = role.data?.role ?? 'manager';
  if (!['manager', 'accountant', 'employee'].includes(value) || !businessPermissions(value as BusinessRole).canViewBusinessModules) {
    return { response: mobileResponse({ ok: false, code: 'FORBIDDEN' }, 403) };
  }
  return { role: value as BusinessRole };
}

/** Private project documents are view-only on mobile until their complete web
 * editing workflow has native parity. The server owns role, row and path
 * checks; clients see only a short-lived signed URL. */
export async function handleMobileBusinessDocument(request: Request, product: string, resource: string) {
  if (product !== 'business' || resource !== 'documents') return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const permission = await businessDocumentPermission(access.client, access.userId);
  if (permission.response) return permission.response;
  if (request.method !== 'GET') return mobileResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const documentId = recordIdSchema.safeParse(new URL(request.url).searchParams.get('recordId'));
  if (!documentId.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
  const document = await access.client.from('project_documents').select('id,file_path,file_name')
    .eq('user_id', access.userId).eq('id', documentId.data).maybeSingle();
  if (document.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
  const path = projectDocumentPath(document.data?.file_path, access.userId);
  if (!document.data || !path) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
  const signed = await access.client.storage.from('project-documents').createSignedUrl(path, 60);
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const signedUrl = signed.data?.signedUrl && origin ? validSignedUrl(signed.data.signedUrl, origin, 'project-documents') : null;
  if (signed.error || !signedUrl) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
  return mobileResponse({ ok: true, attachment: { id: document.data.id, name: document.data.file_name ?? null, url: signedUrl } });
}

/**
 * Attachment URLs are deliberately not part of the generic record input. This
 * endpoint validates the real finance row, current MFA state and storage owner
 * prefix on every upload, unlink and short-lived download request.
 */
export async function handleMobileFinanceAttachment(request: Request, product: string, resource: string) {
  const config = attachmentResource(product, resource);
  if (!config) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const limited = rateLimitRequest(request, { max: 20, windowMs: 60_000, prefix: `mobile-${config.resource}-attachment:${access.userId}` });
  if (limited) { limited.headers.set('Cache-Control', 'private, no-store'); return limited; }
  const recordId = recordIdSchema.safeParse(new URL(request.url).searchParams.get('recordId'));

  if (request.method === 'GET') {
    if (!recordId.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
    const record = await access.client.from(config.table).select(config.columns).eq('user_id', access.userId).eq('id', recordId.data).maybeSingle();
    if (record.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
    const row = record.data as AttachmentRow | null;
    const url = row?.[config.urlColumn];
    const path = typeof url === 'string' ? stableStoragePath(url, config.bucket) : null;
    if (!row || !path || path.split('/')[0] !== access.userId) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
    const signed = await access.client.storage.from(config.bucket).createSignedUrl(path, 60);
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const signedUrl = signed.data?.signedUrl && origin ? validSignedUrl(signed.data.signedUrl, origin, config.bucket) : null;
    if (signed.error || !signedUrl) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
    return mobileResponse({ ok: true, attachment: { ...attachmentResponse(row, config), url: signedUrl } });
  }

  if (request.method === 'DELETE') {
    if (!recordId.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
    const values: Record<string, null> = { [config.urlColumn]: null, [config.nameColumn]: null };
    if (config.typeColumn) values[config.typeColumn] = null;
    if (config.sizeColumn) values[config.sizeColumn] = null;
    const saved = await access.client.from(config.table).update(values)
      .eq('user_id', access.userId).eq('id', recordId.data).select(config.columns).maybeSingle();
    if (saved.error) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
    if (!saved.data) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
    // Match the existing web semantics: unlinking is reversible at the record
    // level and does not silently perform a destructive storage deletion.
    return mobileResponse({ ok: true, attachment: attachmentResponse(saved.data as unknown as AttachmentRow, config) });
  }

  if (request.method !== 'POST') return mobileResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxUploadBytes + 64 * 1024) return mobileResponse({ ok: false, code: 'FILE_TOO_LARGE' }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return mobileResponse({ ok: false, code: 'INVALID_UPLOAD' }, 400); }
  const formRecordId = recordIdSchema.safeParse(form.get('recordId'));
  const file = form.get('file');
  if (!formRecordId.success || typeof File === 'undefined' || !(file instanceof File)) return mobileResponse({ ok: false, code: 'INVALID_UPLOAD' }, 400);
  if (!allowedMimeTypes.has(file.type)) return mobileResponse({ ok: false, code: 'UNSUPPORTED_FILE' }, 415);
  if (file.size < 1 || file.size > maxUploadBytes) return mobileResponse({ ok: false, code: 'FILE_TOO_LARGE' }, 413);

  const existing = await access.client.from(config.table).select('id').eq('user_id', access.userId).eq('id', formRecordId.data).maybeSingle();
  if (existing.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
  if (!existing.data) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const path = `${access.userId}/${formRecordId.data}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.arrayBuffer()); } catch { return mobileResponse({ ok: false, code: 'INVALID_UPLOAD' }, 400); }
  const uploaded = await access.client.storage.from(config.bucket).upload(path, bytes, { cacheControl: '3600', contentType: file.type, upsert: false });
  if (uploaded.error) return mobileResponse({ ok: false, code: 'UPLOAD_UNAVAILABLE' }, 503);
  const values: Record<string, string | number> = {
    [config.urlColumn]: financialAttachmentUrl(config.bucket, path), [config.nameColumn]: safeFileName(file.name),
  };
  if (config.typeColumn) values[config.typeColumn] = file.type;
  if (config.sizeColumn) values[config.sizeColumn] = file.size;
  const saved = await access.client.from(config.table).update(values)
    .eq('user_id', access.userId).eq('id', formRecordId.data).select(config.columns).maybeSingle();
  if (saved.error || !saved.data) {
    await access.client.storage.from(config.bucket).remove([path]).catch(() => {});
    return mobileResponse({ ok: false, code: saved.error ? 'SAVE_UNAVAILABLE' : 'NOT_FOUND' }, saved.error ? 503 : 404);
  }
  return mobileResponse({ ok: true, attachment: attachmentResponse(saved.data as unknown as AttachmentRow, config) }, 201);
}

// Retained for existing integrations and tests that target the income route.
export const handleMobileIncomeAttachment = handleMobileFinanceAttachment;

export async function handleMobileAttachment(request: Request, product: string, resource: string) {
  if (product === 'business' && resource === 'documents') return handleMobileBusinessDocument(request, product, resource);
  return handleMobileFinanceAttachment(request, product, resource);
}
