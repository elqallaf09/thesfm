import { beforeEach, expect, it, vi } from 'vitest';
const { fetchSource, pages, values } = vi.hoisted(() => ({ fetchSource: vi.fn(), pages: vi.fn(), values: vi.fn() }));
vi.mock('@/lib/sharia-research/secureFetch', () => ({ secureFetch: fetchSource }));
vi.mock('@/lib/sharia-research/pdfFinancialEvidence', () => ({
  extractSelectedPdfPages: pages,
  financialValuesFromPdfPages: values,
  pdfEvidenceDocument: () => ({ extractedText: 'Boubyan Bank' }),
}));
import { enrichShariahScreeningData } from '@/lib/market/shariahFundamentals';
import { filingFailureCode } from '@/lib/sharia-research/filingFailureCode';
beforeEach(() => { vi.resetAllMocks(); });
it('retains a safe unsupported-layout diagnostic instead of hiding a successfully fetched report', async () => {
  fetchSource.mockImplementation(async (url: string) => ({ finalUrl: url, body: new Uint8Array(), retrievedAt: '2026-09-18T00:00:00Z' }));
  pages.mockResolvedValue([]); values.mockReturnValue([]);
  const result = await enrichShariahScreeningData({ symbol: 'BOUBYAN', name: 'Boubyan Bank', country: 'KW', exchange: 'XKUW' });
  expect(result.errors).toEqual(['official_regional_document_unavailable', 'official_regional_statement_layout_unsupported']);
  expect(result.complete).toBe(false);
  expect(fetchSource.mock.calls[0][1]).toMatchObject({ retries: 0, signal: expect.any(AbortSignal) });
});
it.each([
  [new DOMException('private transport info', 'TimeoutError'), 'official_provider_timed_out'],
  [Object.assign(new Error('private transport info'), { status: 429 }), 'official_provider_rate_limited'],
  [new Error('regional_document_issuer_mismatch'), 'official_regional_issuer_mismatch'],
  [new Error('pdf_conflicting_statement_values'), 'official_document_conflicting_values'],
  [new Error('private transport info'), 'official_provider_fetch_failed'],
])('maps failures to stable codes without raw diagnostics', (error, expected) => {
  expect(filingFailureCode(error)).toBe(expected);
});
it('continues from a failed discovery page to the reviewed filing and retains its HTTP failure', async () => {
  fetchSource.mockRejectedValueOnce(new DOMException('directory deadline', 'TimeoutError'));
  fetchSource.mockRejectedValueOnce(Object.assign(new Error('private upstream response'), { status: 429 }));
  const result = await enrichShariahScreeningData({ symbol: 'BOUBYAN', name: 'Boubyan Bank', country: 'KW', exchange: 'XKUW' });
  expect(fetchSource).toHaveBeenCalledTimes(2);
  expect(result.errors).toContain('official_provider_rate_limited');
  expect(JSON.stringify(result)).not.toContain('private upstream response');
  expect(pages).not.toHaveBeenCalled();
});
