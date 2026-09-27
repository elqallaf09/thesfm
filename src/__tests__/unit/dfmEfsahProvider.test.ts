import { describe, expect, it } from 'vitest';

import { parseDfmEfsahPayload } from '@/lib/market-news/providers/dfmEfsah';
import { FinancialNewsProviderError } from '@/lib/market-news/types';

describe('DFM Efsah disclosures provider', () => {
  it('normalizes official DFM disclosure records with their exchange identity', () => {
    const items = parseDfmEfsahPayload({
      root: [{
        id: 'a27fc37e-aff5-42ba-a68b-0ff5f850fc8a',
        publication_date: 'Sep 25, 2026 18:11:55',
        headline: 'Results of BOD Meeting',
        issuer_symbol: 'ORIENT',
        issuer: 'ORIENT - Orient Insurance PJSC',
        resources: [{ description: 'ORIENT BOD 25 09 2026.Pdf' }],
      }],
    }, '2026-09-27T08:00:00.000Z');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'official-dfm-disclosures-a27fc37e-aff5-42ba-a68b-0ff5f850fc8a',
      sourceType: 'official_exchange',
      isOfficial: true,
      exchangeCodes: ['DFM'],
      countries: ['AE'],
      symbols: ['ORIENT'],
      verificationStatus: 'official',
    });
    expect(items[0].canonicalUrl).toBe('https://www.dfm.ae/the-exchange/news-disclosures/disclosures/a27fc37e-aff5-42ba-a68b-0ff5f850fc8a');
    expect(items[0].summary).toContain('Orient Insurance');
  });

  it('rejects payloads that do not include the exchange response collection', () => {
    expect(() => parseDfmEfsahPayload({ root: { id: 'not-an-array' } })).toThrow(FinancialNewsProviderError);
  });
});
