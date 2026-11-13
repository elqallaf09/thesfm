import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { historyImportFixture } from '../../__tests__/fixtures/portfolioRiskHistory';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), context: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./service.server', () => ({ authorizeRiskRequest: mocks.auth }));
vi.mock('./history.server', () => ({ loadHistoryPositionContext: mocks.context }));
import { MAX_HISTORY_IMPORT_BYTES, previewHistoryImport } from './importPreview.server';
import { POST } from '../../app/api/portfolio/risk/history/preview/route';

const payload = () => JSON.stringify(historyImportFixture().candidate);
const request = (body = payload(), headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Request('https://app.example/api/portfolio/risk/history/preview?userId=owner-b', { method: 'POST', headers, body });
beforeEach(() => {
  vi.resetAllMocks();
  const { fixture } = historyImportFixture();
  vi.spyOn(Date, 'now').mockReturnValue(fixture.now);
  mocks.auth.mockResolvedValue({ ok: true, userId: 'owner-a' });
  mocks.context.mockResolvedValue({ ok: true, expectedPositions: fixture.expectedPositions, currency: 'KWD' });
});
afterEach(() => vi.restoreAllMocks());

describe('authenticated read-only historical import preview', () => {
  it.each([401, 403, 404, 429, 503])('does not read an upload or financial records on auth status %s', async status => {
    mocks.auth.mockResolvedValue({ ok: false, code: 'ACCESS_DENIED', status, retryAfter: 11 });
    const req = request('not JSON');
    expect(await previewHistoryImport(req)).toEqual({ ok: false, code: 'ACCESS_DENIED', status, retryAfter: 11 });
    expect(req.bodyUsed).toBe(false); expect(mocks.context).not.toHaveBeenCalled();
  });
  it('scopes positions to the authenticated owner, ignores query authority and fingerprints exact bytes', async () => {
    const body = payload();
    expect(await previewHistoryImport(request(body))).toMatchObject({ ok: true, preview: {
      status: 'requires_independent_review', sha256: createHash('sha256').update(body).digest('hex'),
    } });
    expect(mocks.context).toHaveBeenCalledExactlyOnceWith('owner-a');
  });
  it('preserves account and completeness failures without inventing positions', async () => {
    mocks.context.mockResolvedValue({ ok: false, code: 'CANONICAL_INVESTMENTS_NOT_READY', status: 503 });
    expect(await previewHistoryImport(request())).toMatchObject({ ok: false, status: 503 });
  });
  it('rejects invalid JSON and media types before reading canonical records', async () => {
    for (const req of [request('{'), request(payload(), { 'content-type': 'text/plain' })]) {
      expect(await previewHistoryImport(req)).toMatchObject({ ok: false, status: 400 });
    }
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it('bounds both declared and actual streamed length, including lying clients', async () => {
    expect(await previewHistoryImport(request('{}', {
      'content-type': 'application/json', 'content-length': String(MAX_HISTORY_IMPORT_BYTES + 1),
    }))).toMatchObject({ ok: false, status: 413 });
    expect(await previewHistoryImport(request(' '.repeat(MAX_HISTORY_IMPORT_BYTES + 1), {
      'content-type': 'application/json', 'content-length': '1',
    }))).toMatchObject({ ok: false, status: 413 });
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it('returns safe failures for thrown storage errors and no arbitrary provider text', async () => {
    mocks.context.mockRejectedValue(new Error('secret-token'));
    expect(await previewHistoryImport(request())).toEqual({ ok: false, status: 503, code: 'HISTORY_DATA_UNAVAILABLE' });
  });
  it('rejects payload ownership and forged approval rather than publishing it', async () => {
    const candidate = { ...historyImportFixture().candidate, ownerId: 'owner-b' };
    expect(await previewHistoryImport(request(JSON.stringify(candidate)))).toMatchObject({ ok: false, status: 422 });
  });
  it('uses private HTTP responses and preserves rate-limit headers', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    const body = await response.json();
    expect(body.preview.status).toBe('requires_independent_review');
    expect(body.preview.metrics).toBeUndefined();
    mocks.auth.mockResolvedValue({ ok: false, status: 429, code: 'RATE_LIMITED', retryAfter: 9 });
    expect((await POST(request())).headers.get('retry-after')).toBe('9');
  });
});
