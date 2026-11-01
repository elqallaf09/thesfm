import { beforeEach, describe, expect, it, vi } from 'vitest';
import { financialAttachmentUrl } from '@/lib/financialAttachments';

const userId = 'f90bb241-2df4-4cab-844c-889b6e55d911';
const recordId = '7cf6ec5f-9c2c-42f5-9e87-345bb04e7c44';
const state = vi.hoisted(() => ({
  access: null as unknown,
  record: null as Record<string, unknown> | null,
  owner: '',
  operation: '',
  update: null as Record<string, unknown> | null,
  storage: [] as string[],
  uploaded: null as { path: string; bytes: Uint8Array; options: Record<string, unknown> } | null,
  removed: [] as string[],
  signedUrl: '',
}));

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Cache-Control': 'private, no-store' } });
}

vi.mock('@/lib/server/mobileAccess', () => ({
  mobileAccess: vi.fn(async () => state.access),
  mobileResponse: response,
}));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));

function client() {
  return {
    from: vi.fn(() => {
      const filters: Array<[string, unknown]> = [];
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        update: (values: Record<string, unknown>) => { state.operation = 'update'; state.update = values; return query; },
        maybeSingle: async () => {
          const ownsRecord = state.record && state.owner === userId && filters.some(([key, value]) => key === 'user_id' && value === userId) && filters.some(([key, value]) => key === 'id' && value === recordId);
          if (!ownsRecord) return { data: null, error: null };
          if (state.operation === 'update') state.record = { ...state.record, ...state.update };
          return { data: state.record, error: null };
        },
      };
      return query;
    }),
    storage: {
      from: (bucket: string) => {
        state.storage.push(bucket);
        return {
          createSignedUrl: vi.fn(async () => ({ data: { signedUrl: state.signedUrl }, error: null })),
          upload: async (path: string, bytes: Uint8Array, options: Record<string, unknown>) => {
            state.uploaded = { path, bytes, options };
            return { data: { path }, error: null };
          },
          remove: async (paths: string[]) => { state.removed.push(...paths); return { data: paths, error: null }; },
        };
      },
    },
  };
}

import { handleMobileFinanceAttachment, handleMobileIncomeAttachment } from '@/lib/server/mobileAttachments';

function request(method: string, suffix = '', body?: FormData) {
  return new Request(`https://www.the-sfm.com/api/mobile/finance/records/income/attachment${suffix}`, {
    method,
    headers: { Authorization: 'Bearer verified-token' },
    body,
  });
}

function upload(file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })) {
  const form = new FormData();
  form.set('recordId', recordId);
  form.set('file', file);
  return request('POST', '', form);
}

function expenseRequest(method: string, suffix = '', body?: FormData) {
  return new Request(`https://www.the-sfm.com/api/mobile/finance/records/expenses/attachment${suffix}`, {
    method,
    headers: { Authorization: 'Bearer verified-token' },
    body,
  });
}

function expenseUpload(file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })) {
  const form = new FormData();
  form.set('recordId', recordId);
  form.set('file', file);
  return expenseRequest('POST', '', form);
}

beforeEach(() => {
  state.record = { id: recordId, attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null };
  state.owner = userId;
  state.operation = '';
  state.update = null;
  state.storage = [];
  state.uploaded = null;
  state.removed = [];
  state.signedUrl = `https://storage.example.test/storage/v1/object/sign/income-attachments/${userId}/${recordId}/receipt.pdf?token=short`;
  state.access = { userId, client: client() };
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.test');
});

describe('mobile finance attachment boundary', () => {
  it('rejects MFA or anonymous requests before opening an income row or Storage', async () => {
    state.access = { response: response({ ok: false, code: 'MFA_REQUIRED' }, 403) };
    const result = await handleMobileIncomeAttachment(upload(), 'finance', 'income');
    expect(result.status).toBe(403);
    expect(state.storage).toHaveLength(0);
  });

  it('uploads only to the verified owner prefix and persists a stable private URL', async () => {
    const result = await handleMobileIncomeAttachment(upload(), 'finance', 'income');
    expect(result.status).toBe(201);
    expect(state.uploaded?.path).toMatch(new RegExp(`^${userId}/${recordId}/`));
    expect(state.uploaded?.options).toEqual(expect.objectContaining({ contentType: 'application/pdf', upsert: false }));
    expect(state.update?.attachment_url).toMatch(/^\/api\/receipts\/file\?/);
    expect((await result.json()).attachment.url).toBe(state.update?.attachment_url);
  });

  it.each([
    new File(['not an image'], 'receipt.txt', { type: 'text/plain' }),
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }),
  ])('refuses invalid files before contacting Storage', async file => {
    const result = await handleMobileIncomeAttachment(upload(file), 'finance', 'income');
    expect([413, 415]).toContain(result.status);
    expect(state.storage).toHaveLength(0);
  });

  it('does not disclose a foreign record through upload, unlink, or signing', async () => {
    state.owner = '0319c577-3dfa-4f6e-ac66-10e183046962';
    expect((await handleMobileIncomeAttachment(upload(), 'finance', 'income')).status).toBe(404);
    expect((await handleMobileIncomeAttachment(request('DELETE', `?recordId=${recordId}`), 'finance', 'income')).status).toBe(404);
    expect((await handleMobileIncomeAttachment(request('GET', `?recordId=${recordId}`), 'finance', 'income')).status).toBe(404);
    expect(state.storage).toHaveLength(0);
  });

  it('returns a short-lived signed URL only for a known owner-scoped private attachment', async () => {
    state.record = { ...state.record, attachment_url: financialAttachmentUrl('income-attachments', `${userId}/${recordId}/receipt.pdf`) };
    const result = await handleMobileIncomeAttachment(request('GET', `?recordId=${recordId}`), 'finance', 'income');
    expect(result.status).toBe(200);
    expect((await result.json()).attachment.url).toBe(state.signedUrl);
  });

  it('unlinks metadata without deleting a storage object', async () => {
    state.record = { ...state.record, attachment_url: financialAttachmentUrl('income-attachments', `${userId}/${recordId}/receipt.pdf`) };
    const result = await handleMobileIncomeAttachment(request('DELETE', `?recordId=${recordId}`), 'finance', 'income');
    expect(result.status).toBe(200);
    expect(state.update).toEqual({ attachment_url: null, attachment_name: null, attachment_type: null, attachment_size: null });
    expect(state.removed).toEqual([]);
  });

  it('keeps expense receipts owner-scoped in the existing private receipts bucket', async () => {
    state.record = { id: recordId, receipt_image_url: null, receipt_file_name: null };
    state.signedUrl = `https://storage.example.test/storage/v1/object/sign/receipts/${userId}/${recordId}/receipt.pdf?token=short`;
    const result = await handleMobileFinanceAttachment(expenseUpload(), 'finance', 'expenses');
    expect(result.status).toBe(201);
    expect(state.storage).toContain('receipts');
    expect(state.uploaded?.path).toMatch(new RegExp(`^${userId}/${recordId}/`));
    expect(state.update).toEqual(expect.objectContaining({ receipt_image_url: expect.stringMatching(/^\/api\/receipts\/file\?/), receipt_file_name: 'receipt.pdf' }));

    const signed = await handleMobileFinanceAttachment(expenseRequest('GET', `?recordId=${recordId}`), 'finance', 'expenses');
    expect(signed.status).toBe(200);
    expect((await signed.json()).attachment.url).toBe(state.signedUrl);

    const detached = await handleMobileFinanceAttachment(expenseRequest('DELETE', `?recordId=${recordId}`), 'finance', 'expenses');
    expect(detached.status).toBe(200);
    expect(state.update).toEqual({ receipt_image_url: null, receipt_file_name: null });
    expect(state.removed).toEqual([]);
  });
});
