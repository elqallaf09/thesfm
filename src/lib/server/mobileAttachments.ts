import { financialAttachmentDisplayUrl, financialAttachmentUrl, isFinancialAttachmentPath } from '@/lib/financialAttachments';
import { recordIdSchema } from '@/lib/mobile/resourceValidation';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

const incomeBucket = 'income-attachments';
const maxUploadBytes = 10 * 1024 * 1024;
const attachmentColumns = 'id,attachment_url,attachment_name,attachment_type,attachment_size';
const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

type IncomeAttachment = {
  id: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

function attachmentResponse(row: IncomeAttachment) {
  return { id: row.id, url: row.attachment_url, name: row.attachment_name, type: row.attachment_type, size: row.attachment_size };
}

function safeFileName(value: string) {
  const result = value.normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
  return result || 'attachment';
}

function stableStoragePath(value: string | null) {
  const stable = financialAttachmentDisplayUrl(value);
  if (!stable) return null;
  const url = new URL(stable, 'https://mobile-attachment.invalid');
  const path = url.searchParams.get('path') || '';
  return url.pathname === '/api/receipts/file' && url.searchParams.get('bucket') === incomeBucket && isFinancialAttachmentPath(path) ? path : null;
}

function validSignedUrl(value: string, origin: string) {
  try {
    const url = new URL(value);
    return url.origin === new URL(origin).origin && url.pathname.startsWith(`/storage/v1/object/sign/${incomeBucket}/`) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Attachment URLs are deliberately not part of the generic record input. This
 * endpoint validates the real income row, current MFA state and storage owner
 * prefix on every upload, unlink and short-lived download request.
 */
export async function handleMobileIncomeAttachment(request: Request, product: string, resource: string) {
  if (product !== 'finance' || resource !== 'income') return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const limited = rateLimitRequest(request, { max: 20, windowMs: 60_000, prefix: `mobile-income-attachment:${access.userId}` });
  if (limited) { limited.headers.set('Cache-Control', 'private, no-store'); return limited; }
  const recordId = recordIdSchema.safeParse(new URL(request.url).searchParams.get('recordId'));

  if (request.method === 'GET') {
    if (!recordId.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
    const record = await access.client.from('monthly_income_sources').select(attachmentColumns).eq('user_id', access.userId).eq('id', recordId.data).maybeSingle();
    if (record.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
    const row = record.data as IncomeAttachment | null;
    const path = row && stableStoragePath(row.attachment_url);
    if (!row || !path || path.split('/')[0] !== access.userId) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
    const signed = await access.client.storage.from(incomeBucket).createSignedUrl(path, 60);
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = signed.data?.signedUrl && origin ? validSignedUrl(signed.data.signedUrl, origin) : null;
    if (signed.error || !url) return mobileResponse({ ok: false, code: 'ATTACHMENT_UNAVAILABLE' }, 404);
    return mobileResponse({ ok: true, attachment: { ...attachmentResponse(row), url } });
  }

  if (request.method === 'DELETE') {
    if (!recordId.success) return mobileResponse({ ok: false, code: 'INVALID_ID' }, 400);
    const saved = await access.client.from('monthly_income_sources')
      .update({ attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null })
      .eq('user_id', access.userId).eq('id', recordId.data).select(attachmentColumns).maybeSingle();
    if (saved.error) return mobileResponse({ ok: false, code: 'SAVE_UNAVAILABLE' }, 503);
    if (!saved.data) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
    // Match the existing web semantics: unlinking is reversible at the record
    // level and does not silently perform a destructive storage deletion.
    return mobileResponse({ ok: true, attachment: attachmentResponse(saved.data as IncomeAttachment) });
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

  const existing = await access.client.from('monthly_income_sources').select('id').eq('user_id', access.userId).eq('id', formRecordId.data).maybeSingle();
  if (existing.error) return mobileResponse({ ok: false, code: 'LOAD_UNAVAILABLE' }, 503);
  if (!existing.data) return mobileResponse({ ok: false, code: 'NOT_FOUND' }, 404);
  const path = `${access.userId}/${formRecordId.data}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.arrayBuffer()); } catch { return mobileResponse({ ok: false, code: 'INVALID_UPLOAD' }, 400); }
  const uploaded = await access.client.storage.from(incomeBucket).upload(path, bytes, { cacheControl: '3600', contentType: file.type, upsert: false });
  if (uploaded.error) return mobileResponse({ ok: false, code: 'UPLOAD_UNAVAILABLE' }, 503);
  const values = {
    attachment_url: financialAttachmentUrl(incomeBucket, path), attachment_name: safeFileName(file.name), attachment_type: file.type, attachment_size: file.size,
  };
  const saved = await access.client.from('monthly_income_sources').update(values)
    .eq('user_id', access.userId).eq('id', formRecordId.data).select(attachmentColumns).maybeSingle();
  if (saved.error || !saved.data) {
    await access.client.storage.from(incomeBucket).remove([path]).catch(() => {});
    return mobileResponse({ ok: false, code: saved.error ? 'SAVE_UNAVAILABLE' : 'NOT_FOUND' }, saved.error ? 503 : 404);
  }
  return mobileResponse({ ok: true, attachment: attachmentResponse(saved.data as IncomeAttachment) }, 201);
}
