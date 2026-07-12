import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractPdfText } from '@/lib/sharia-research/contentExtraction';
import { companyInvestorRelationsAdapter } from '@/lib/sharia-research/sourceAdapters/companyInvestorRelations';
import { clearSecureFetchStateForTests, secureFetch, UnsafeUrlError, assertSafePublicUrl } from '@/lib/sharia-research/secureFetch';
import { normalizeQuery } from '@/lib/sharia-research/normalizeQuery';

afterEach(() => {
  vi.restoreAllMocks();
  clearSecureFetchStateForTests();
});

describe('server-side source retrieval protections', () => {
  it.each([
    'http://127.0.0.1/admin',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1/private',
    'http://[::1]/',
    'file:///etc/passwd',
    'http://service.internal/path',
  ])('blocks SSRF target %s', async url => {
    await expect(assertSafePublicUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('returns unavailable when no verified company website or discovery provider exists', async () => {
    const result = await companyInvestorRelationsAdapter.research({
      query: normalizeQuery('TEST'),
      security: { canonicalId: 'NASDAQ:TEST', name: 'Test Corp', ticker: 'TEST', providerSymbol: 'TEST', exchange: 'NASDAQ', aliases: [], previousNames: [], identitySources: [] },
      retrievedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(result.status).toBe('unavailable');
    expect(result.documents).toEqual([]);
  });

  it('fails closed when a PDF cannot be parsed', async () => {
    await expect(extractPdfText(new Uint8Array([1, 2, 3, 4]))).rejects.toBeTruthy();
  });
});
