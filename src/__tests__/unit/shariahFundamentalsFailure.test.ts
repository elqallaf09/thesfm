import { describe, expect, it, vi } from 'vitest';
const { directory } = vi.hoisted(() => ({ directory: vi.fn() }));
vi.mock('@/lib/sharia-research/secData', () => ({ loadSecCompanyDirectory: directory, loadSecCompanyFacts: vi.fn(), loadSecSubmissions: vi.fn(), secFilingDocumentUrl: vi.fn() }));
import { enrichShariahScreeningData } from '@/lib/market/shariahFundamentals';
describe('fresh extraction never launders absent or old values', () => {
  it('does not copy old ratios on provider failure', async () => {
    directory.mockRejectedValueOnce(new Error('network failed'));
    const result = await enrichShariahScreeningData({ symbol: 'TEST', country: 'US', existing: { interestBearingDebtRatio: 0, nonPermissibleRevenueRatio: 0, interestIncomeRatio: 0 } });
    expect(result.complete).toBe(false);
    expect(result.financialValues).toEqual([]);
    expect(result.data.interestBearingDebtRatio).toBeUndefined();
    expect(result.errors).toEqual(['official_provider_fetch_failed']);
  });
  it('does not remap Kuwait tickers onto a US ticker with the same spelling', async () => {
    directory.mockClear();
    const result = await enrichShariahScreeningData({ symbol: 'KFH', country: 'KW', exchange: 'BOURSA_KUWAIT' });
    expect(directory).not.toHaveBeenCalled();
    expect(result.errors).toContain('official_market_filing_adapter_unavailable');
    expect(result.complete).toBe(false);
  });
});
