import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { fmpQueuedFetch, markFmpRateLimited } = vi.hoisted(() => ({ fmpQueuedFetch: vi.fn(), markFmpRateLimited: vi.fn() }));
vi.mock('@/lib/trader/providers/fmpRuntime.server', () => ({ fmpQueuedFetch, markFmpRateLimited }));
import { runDisclosureAudit } from '@/lib/market-data/disclosureAudit.server';

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('FMP_API_KEY', 'fixture-secret'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('bounded live disclosure audit', () => {
  it.each(['house', 'senate'] as const)('reads a bracketed %s window through the shared queue', async chamber => {
    const rows = Array.from({ length: 50 }, (_, id) => ({ id, disclosureDate: '2026-10-08', transactionDate: '2026-10-01' }));
    fmpQueuedFetch.mockImplementation(async (url: URL) => {
      const page = Number(url.searchParams.get('page')), limit = Number(url.searchParams.get('limit'));
      expect(url.pathname).toBe(`/stable/${chamber}-latest`);
      expect(url.toString()).not.toContain('fixture-secret');
      return Response.json(rows.slice(page * limit, (page + 1) * limit));
    });
    expect(await runDisclosureAudit(chamber)).toMatchObject({ status: 'passed', checkedRows: 50, officialFilingDatesVerified: false });
    expect(fmpQueuedFetch.mock.calls.map(([url]) => [url.searchParams.get('page'), url.searchParams.get('limit')])).toEqual([['0', '50'], ['0', '25'], ['1', '25'], ['0', '50']]);
    expect(fmpQueuedFetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal), headers: { accept: 'application/json', apikey: 'fixture-secret' } }));
  });
  it.each([[401, 'unauthorized'], [403, 'not_entitled'], [429, 'rate_limited'], [500, 'provider_error']])('stops at HTTP %s and classifies it as %s', async (status, expected) => {
    fmpQueuedFetch.mockResolvedValue(Response.json({ error: 'fixture-secret' }, { status: Number(status) }));
    await expect(runDisclosureAudit('senate')).rejects.toMatchObject({ status: expected });
    expect(fmpQueuedFetch).toHaveBeenCalledTimes(1);
  });
  it('does not start network requests without a key', async () => {
    vi.stubEnv('FMP_API_KEY', '');
    await expect(runDisclosureAudit('house')).rejects.toMatchObject({ status: 'not_configured' });
    expect(fmpQueuedFetch).not.toHaveBeenCalled();
  });
  it('treats a quota error inside HTTP 200 as a shared cooldown', async () => {
    fmpQueuedFetch.mockResolvedValue(Response.json({ 'Error Message': 'API rate limit reached' }));
    await expect(runDisclosureAudit('house')).rejects.toMatchObject({ status: 'rate_limited' });
    expect(markFmpRateLimited).toHaveBeenCalledWith(null, 'provider_rate_limited');
  });
  it('does not silently drop malformed records', async () => {
    fmpQueuedFetch.mockResolvedValue(Response.json([null]));
    await expect(runDisclosureAudit('house')).rejects.toMatchObject({ status: 'invalid_response' });
  });
});
