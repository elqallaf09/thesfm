import { mkdirSync, writeFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { reviewFundEvidence } from '@/lib/market/shariahFundReview';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { enrichShariahScreeningData } from '@/lib/market/shariahFundamentals';

const enabled = process.env.SFM_LIVE_SEC_PROBE === '1';
function proof(symbol: string, result: unknown) {
  mkdirSync('artifacts/shariah', { recursive: true });
  writeFileSync(`artifacts/shariah/extended-${symbol}.json`, JSON.stringify(result, null, 2));
}
// Real public manager documents. The empty underlying database below is an
// isolated fixture, not a claim that all holdings have been screened.
const emptyCatalog = { from: () => ({ select: () => {
  const query = { eq: () => query, abortSignal: async () => ({ data: [], error: null }) }; return query;
} }) } as unknown as SupabaseClient;
describe.skipIf(!enabled)('live extended evidence without production writes', () => {
  it.each(['SPY','IWM'])('%s retrieves dated official holdings and never invents a fund rating', async symbol => {
    const result = await reviewFundEvidence({ symbol, name: symbol, exchange: 'NYSE Arca', country: 'US' }, emptyCatalog, AbortSignal.timeout(45000));
    proof(symbol, result);
    expect(result.shariah_status).toBe('needs_review');
    expect(result.shariah_screening_data.screeningRules.financial).toEqual([]);
    expect(result.shariah_screening_data.fundReview.holdingCount).toBeGreaterThan(100);
    expect(result.shariah_screening_data.sources[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
    console.log('EXTENDED_SOURCE_PROOF', JSON.stringify({ symbol, ...result.shariah_screening_data.fundReview, sources: result.shariah_screening_data.sources }));
  }, 55000);
  it('NBK extracts issuer-bound Kuwait report values without calling the US directory', async () => {
    const result = await enrichShariahScreeningData({ symbol: 'NBK', providerSymbol: 'NBK.KW', name: 'National Bank of Kuwait',
      exchange: 'Boursa Kuwait', country: 'KW', signal: AbortSignal.timeout(45000) });
    proof('NBK', { errors: result.errors, values: result.financialValues, sources: result.documents.map(doc => ({ url: doc.sourceUrl, period: doc.reportingPeriod })) });
    expect(result.documents.length, result.errors.join(',')).toBeGreaterThan(0);
    const assets = result.financialValues.find(value => value.normalizedField === 'total_assets');
    expect(assets?.value).toBeGreaterThan(0);
    expect(assets && validFinancialValue(assets)).toBe(true);
    expect(result.documents.every(document => !/spo|sustainab/i.test(document.sourceUrl))).toBe(true);
    expect(result.financialValues.every(value => value.currency === 'KWD')).toBe(true);
    console.log('EXTENDED_SOURCE_PROOF', JSON.stringify({ symbol: 'NBK', errors: result.errors,
      fields: result.financialValues.map(value => ({ field: value.normalizedField, period: value.periodEnd, currency: value.currency, value: value.value })) }));
  }, 55000);
  it('IFA retrieves its official Kuwait filing and yields source-backed annual balance evidence', async () => {
    const result = await enrichShariahScreeningData({ symbol: 'IFA', providerSymbol: 'IFA.KW', name: 'International Financial Advisors Holding',
      exchange: 'Boursa Kuwait', country: 'KW', signal: AbortSignal.timeout(60000) });
    proof('IFA', { errors: result.errors, values: result.financialValues, sources: result.documents.map(doc => ({ url: doc.sourceUrl, period: doc.reportingPeriod })) });
    expect(result.documents.length, result.errors.join(',')).toBeGreaterThan(0);
    expect(result.errors).not.toContain('official_regional_document_unavailable');
    const assets = result.financialValues.find(value => value.normalizedField === 'total_assets');
    const cash = result.financialValues.find(value => value.normalizedField === 'cash_and_equivalents');
    const liabilityBound = result.financialValues.find(value => value.normalizedField === 'interest_bearing_debt');
    expect(assets).toMatchObject({ value: 161146865, currency: 'KWD', periodEnd: '2025-12-31' });
    expect(cash).toMatchObject({ value: 4242133, currency: 'KWD', periodEnd: '2025-12-31' });
    expect(liabilityBound).toMatchObject({ value: 28665529, currency: 'KWD', periodEnd: '2025-12-31', validation: expect.objectContaining({ bound: 'upper' }) });
    expect([assets, cash, liabilityBound].every(value => value && validFinancialValue(value))).toBe(true);
    expect(result.financialValues.some(value => ['total_income','interest_income','prohibited_revenue'].includes(value.normalizedField))).toBe(false);
    console.log('EXTENDED_SOURCE_PROOF', JSON.stringify({ symbol: 'IFA', errors: result.errors,
      sources: result.documents.map(doc => ({ url: doc.sourceUrl, period: doc.reportingPeriod })),
      fields: result.financialValues.map(value => ({ field: value.normalizedField, period: value.periodEnd, currency: value.currency, value: value.value, bound: value.validation?.bound })) }));
  }, 70000);
});