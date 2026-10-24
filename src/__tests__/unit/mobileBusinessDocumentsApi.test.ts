import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = 'f90bb241-2df4-4cab-844c-889b6e55d911';
const projectId = '66d4d6d1-55e9-4f4f-9a7a-3e92ec5d7a55';
const documentId = '7cf6ec5f-9c2c-42f5-9e87-345bb04e7c44';
const state = vi.hoisted(() => ({
  access: null as unknown,
  role: 'manager',
  owner: '',
  document: null as Record<string, string> | null,
  storage: [] as string[],
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

beforeEach(() => {
  state.role = 'manager';
  state.owner = userId;
  state.document = { id: documentId, file_name: 'plan.pdf', file_path: `${userId}/projects/${projectId}/plan.pdf` };
  state.storage = [];
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

  it('keeps the endpoint view-only and refuses another product or resource', async () => {
    const { handleMobileAttachment, handleMobileBusinessDocument } = await import('@/lib/server/mobileAttachments');
    expect((await handleMobileBusinessDocument(request('POST'), 'business', 'documents')).status).toBe(405);
    expect((await handleMobileAttachment(request(), 'finance', 'documents')).status).toBe(404);
  });
});
