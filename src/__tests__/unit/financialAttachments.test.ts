import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_ACCESS_COOKIE } from '@/lib/auth/sessionSecurity';
import { financialAttachmentDisplayUrl, financialAttachmentUrl } from '@/lib/financialAttachments';

const mocks = vi.hoisted(() => ({ inspect: vi.fn(), sign: vi.fn(), from: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/server/authSession', () => ({
  inspectSessionSecurity: mocks.inspect,
  bearerToken: (request: Request) => request.headers.get('authorization')?.replace(/^Bearer /, '') || null,
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.client }));
import { GET } from '@/app/api/receipts/file/route';

const owner = '00000000-0000-4000-8000-000000000101';
const other = '00000000-0000-4000-8000-000000000102';
const path = `${owner}/project-expenses/receipt.jpg`;
const origin = 'https://storage.example.test';
function request(bucket = 'receipts', file = path, auth = true) {
  return new NextRequest(`https://www.the-sfm.com/api/receipts/file?${new URLSearchParams({ bucket, path: file })}`, {
    headers: auth ? { Cookie: `${AUTH_ACCESS_COOKIE}=session-token` } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', origin);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
  mocks.inspect.mockResolvedValue({ status: 'ok', userId: owner, token: 'verified-token', mfaRequirement: 'none' });
  mocks.sign.mockResolvedValue({ data: { signedUrl: `${origin}/storage/v1/object/sign/receipts/${path}?token=short-lived` }, error: null });
  mocks.from.mockReturnValue({ createSignedUrl: mocks.sign });
  mocks.client.mockReturnValue({ storage: { from: mocks.from } });
});

describe('private financial attachment references', () => {
  it('stores stable application URLs and upgrades legacy public URLs', () => {
    const expected = financialAttachmentUrl('receipts', path);
    expect(financialAttachmentDisplayUrl(expected)).toBe(expected);
    expect(financialAttachmentDisplayUrl(`${origin}/storage/v1/object/public/receipts/${path}`)).toBe(expected);
    expect(financialAttachmentDisplayUrl(`${origin}/storage/v1/object/public/income-attachments/${owner}/income.pdf`))
      .toBe(financialAttachmentUrl('income-attachments', `${owner}/income.pdf`));
  });
  it.each(['https://evil.test/file.jpg', 'javascript:alert(1)', 'data:text/html,x', `${origin}/storage/v1/object/public/avatars/${path}`])('rejects unrelated URL %s', value => {
    expect(financialAttachmentDisplayUrl(value)).toBeUndefined();
  });
  it.each([`${owner}/../foreign.jpg`, `${owner}/%2e%2e/x`, `${owner}//x`, `${owner}/x\\y`, '/x', 'not-an-owner/file'])('rejects ambiguous object path %s', file => {
    expect(() => financialAttachmentUrl('receipts', file)).toThrow('INVALID_ATTACHMENT_PATH');
  });
});

describe('authenticated financial file route', () => {
  it('requires authentication before touching storage', async () => {
    expect((await GET(request('receipts', path, false))).status).toBe(401);
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it.each([
    [{ status: 'unauthenticated' }, 401],
    [{ status: 'unavailable' }, 503],
    [{ status: 'ok', userId: owner, mfaRequirement: 'totp' }, 403],
    [{ status: 'ok', userId: owner, mfaRequirement: 'email' }, 403],
  ])('fails closed for session state %j', async (state, status) => {
    mocks.inspect.mockResolvedValue(state);
    const response = await GET(request());
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('rejects another owner even if their exact path is known', async () => {
    expect((await GET(request('receipts', `${other}/receipt.jpg`))).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it.each([['avatars', path], ['receipts', `${owner}/../file`], ['receipts', `${owner}/%2fprivate`]])('rejects unsupported bucket/path', async (bucket, file) => {
    expect((await GET(request(bucket, file))).status).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('signs for 60 seconds using the verified user and disables caching', async () => {
    const response = await GET(request());
    expect(response.status).toBe(307);
    expect(mocks.from).toHaveBeenCalledWith('receipts');
    expect(mocks.sign).toHaveBeenCalledWith(path, 60);
    expect(mocks.client).toHaveBeenCalledWith(origin, 'public-key', expect.objectContaining({
      global: { headers: { Authorization: 'Bearer verified-token' } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }));
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
  it('handles storage denial without exposing provider details', async () => {
    mocks.sign.mockResolvedValue({ error: { message: 'private-provider-detail' }, data: null });
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('private-provider-detail');
  });
  it('does not redirect outside the configured storage origin', async () => {
    mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://evil.test/file' }, error: null });
    expect((await GET(request())).status).toBe(503);
  });
});
