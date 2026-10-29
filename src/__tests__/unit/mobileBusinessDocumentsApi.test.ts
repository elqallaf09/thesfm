import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = 'f90bb241-2df4-4cab-844c-889b6e55d911';
const projectId = '66d4d6d1-55e9-4f4f-9a7a-3e92ec5d7a55';
const documentId = '7cf6ec5f-9c2c-42f5-9e87-345bb04e7c44';
const state = vi.hoisted(() => ({
  access: null as unknown,
  role: 'manager',
  owner: '',
  document: null as Record<string, string> | null,
  limited: false,
  storage: [] as string[],
  signedUrl: '',
  uploaded: null as { path: string; bytes: Uint8Array; options: Record<string, unknown> } | null,
  removed: [] as string[],
  inserted: null as Record<string, unknown> | null,
  insertFails: false,
}));

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Cache-Control': 'private, no-store' } });
}

vi.mock('@/lib/server/mobileAccess', () => ({
  mobileAccess: vi.fn(async () => state.access),
  mobileResponse: response,
}));
vi.mock('@/lib/server/rateLimiter', () => ({
  rateLimitRequest: () => state.limited ? response({ ok: false, code: 'RATE_LIMITED' }, 429) : null,
}));

function client() {
  return {
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = [];
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        maybeSingle: async () => {
          if (table === 'business_user_roles') return { data: { role: state.role }, error: null };
          const ownsDocument = table === 'project_documents' && state.document && state.owner === userId
            && filters.some(([key, value]) => key === 'user_id' && value === userId)
            && filters.some(([key, value]) => key === 'id' && value === documentId);
          return { data: ownsDocument ? state.document : null, error: null };
        },
      };
      return query;
    }),
    storage: {
      from: (bucket: string) => {
        state.storage.push(bucket);
        return { createSignedUrl: vi.fn(async () => ({ data: { signedUrl: state.signedUrl }, error: null })) };
      },
    },
  };
}

function request(method = 'GET', suffix = `?recordId=${documentId}`) {
  return new Request(`https://www.the-sfm.com/api/mobile/business/records/documents/attachment${suffix}`, {
    method,
    headers: { Authorization: 'Bearer verified-token' },
  });
}

function uploadRequest(file = new File(['plan'], 'plan.pdf', { type: 'application/pdf' }), values: Record<string, string> = {}) {
  const form = new FormData();
  form.set('projectId', projectId); form.set('title', 'Funding plan'); form.set('category', 'business_plan'); form.set('notes', 'Owner supplied evidence'); form.set('file', file);
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return new Request('https://www.the-sfm.com/api/mobile/business/records/documents/attachment', { method: 'POST', headers: { Authorization: 'Bearer verified-token' }, body: form });
}

function uploadClient(projectOwned = true) {
  return {
    from: vi.fn((table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        insert: (values: Record<string, unknown>) => { state.inserted = values; return query; },
        maybeSingle: async () => {
          if (table === 'business_user_roles') return { data: { role: state.role }, error: null };
          if (table === 'projects') return { data: projectOwned ? { id: projectId } : null, error: null };
          if (table === 'project_documents') return state.insertFails ? { data: null, error: { message: 'write failed' } } : { data: state.inserted ? { id: state.inserted.id, project_id: projectId, title: state.inserted.title, category: state.inserted.category, file_name: state.inserted.file_name } : null, error: null };
          return { data: null, error: null };
        },
      };
      return query;
    }),
    storage: {
      from: (bucket: string) => {
        state.storage.push(bucket);
        return {
          createSignedUrl: vi.fn(async () => ({ data: { signedUrl: state.signedUrl }, error: null })),
          upload: async (path: string, bytes: Uint8Array, options: Record<string, unknown>) => { state.uploaded = { path, bytes, options }; return { data: { path }, error: null }; },
          remove: async (paths: string[]) => { state.removed.push(...paths); return { data: paths, error: null }; },
        };
      },
    },
  };
}

beforeEach(() => {
  state.role = 'manager';
  state.owner = userId;
  state.document = { id: documentId, file_name: 'plan.pdf', file_path: `${userId}/projects/${projectId}/plan.pdf` };
  state.limited = false;
  state.storage = [];
  state.uploaded = null;
  state.removed = [];
  state.inserted = null;
  state.insertFails = false;
  state.signedUrl = `https://storage.example.test/storage/v1/object/sign/project-documents/${userId}/projects/${projectId}/plan.pdf?token=short`;
  state.access = { userId, client: client() };
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.test');
});

describe('mobile business project-document boundary', () => {
  it('rejects anonymous or MFA-gated calls before consulting roles, rows, or Storage', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.access = { response: response({ ok: false, code: 'MFA_REQUIRED' }, 403) };
    const result = await handleMobileBusinessDocument(request(), 'business', 'documents');
    expect(result.status).toBe(403);
    expect(state.storage).toEqual([]);
  });

  it('issues a 60-second signed URL only for an allowed role and matching owned document row', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    const result = await handleMobileBusinessDocument(request(), 'business', 'documents');
    expect(result.status).toBe(200);
    expect((await result.json()).attachment).toEqual({ id: documentId, name: 'plan.pdf', url: state.signedUrl });
    expect(state.storage).toEqual(['project-documents']);
  });

  it('does not sign documents for an employee, a foreign row, or a malformed storage path', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.role = 'employee';
    expect((await handleMobileBusinessDocument(request(), 'business', 'documents')).status).toBe(403);
    expect(state.storage).toEqual([]);

    state.role = 'accountant';
    state.owner = '0319c577-3dfa-4f6e-ac66-10e183046962';
    expect((await handleMobileBusinessDocument(request(), 'business', 'documents')).status).toBe(404);
    expect(state.storage).toEqual([]);

    state.owner = userId;
    state.document = { ...state.document!, file_path: `${userId}/other/${projectId}/plan.pdf` };
    expect((await handleMobileBusinessDocument(request(), 'business', 'documents')).status).toBe(404);
    expect(state.storage).toEqual([]);
  });

  it('rate-limits signed-link issuance before role, row, or Storage access', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.limited = true;
    const result = await handleMobileBusinessDocument(request(), 'business', 'documents');
    expect(result.status).toBe(429);
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(state.storage).toEqual([]);
  });

  it('uploads a new private document only after verifying the writer role and owned project', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.access = { userId, client: uploadClient() };
    const result = await handleMobileBusinessDocument(uploadRequest(), 'business', 'documents');
    expect(result.status).toBe(201);
    expect(state.uploaded?.path).toMatch(new RegExp(`^${userId}/projects/${projectId}/`));
    expect(state.uploaded?.options).toEqual(expect.objectContaining({ contentType: 'application/pdf', upsert: false }));
    expect(state.inserted).toEqual(expect.objectContaining({ user_id: userId, project_id: projectId, title: 'Funding plan', category: 'business_plan', file_url: null, file_name: 'plan.pdf' }));
    expect(state.removed).toEqual([]);
  });

  it('refuses an employee, a foreign project, or an unsupported file before Storage upload', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.role = 'employee'; state.access = { userId, client: uploadClient() };
    expect((await handleMobileBusinessDocument(uploadRequest(), 'business', 'documents')).status).toBe(403);
    expect(state.storage).toEqual([]);

    state.role = 'manager'; state.access = { userId, client: uploadClient(false) };
    expect((await handleMobileBusinessDocument(uploadRequest(), 'business', 'documents')).status).toBe(404);
    expect(state.storage).toEqual([]);

    state.access = { userId, client: uploadClient() };
    expect((await handleMobileBusinessDocument(uploadRequest(new File(['text'], 'plan.txt', { type: 'text/plain' })), 'business', 'documents')).status).toBe(415);
    expect(state.storage).toEqual([]);
  });

  it('removes only the newly uploaded object when its database row cannot be saved', async () => {
    const { handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    state.insertFails = true; state.access = { userId, client: uploadClient() };
    const result = await handleMobileBusinessDocument(uploadRequest(), 'business', 'documents');
    expect(result.status).toBe(503);
    expect(state.uploaded?.path).toMatch(new RegExp(`^${userId}/projects/${projectId}/`));
    expect(state.removed).toEqual([state.uploaded?.path]);
  });

  it('refuses destructive document deletion and another product or resource', async () => {
    const { handleMobileAttachment, handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    expect((await handleMobileBusinessDocument(request('DELETE'), 'business', 'documents')).status).toBe(405);
    expect((await handleMobileAttachment(request(), 'finance', 'documents')).status).toBe(404);
  });
});
