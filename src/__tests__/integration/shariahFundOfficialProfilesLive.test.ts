import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { reviewFundEvidence } from '@/lib/market/shariahFundReview';

const enabled = process.env.SFM_LIVE_SEC_PROBE === '1';
const emptyCatalog = { from: () => ({ select: () => {
  const query = { eq: () => query, abortSignal: async () => ({ data: [], error: null }) }; return query;
} }) } as unknown as SupabaseClient;

describe.skipIf(!enabled)('live official fund profile evidence without production writes', () => {
  it.each([
    ['QQQ', 'Invesco QQQ', 'NASDAQ'],
    ['VOO', 'Vanguard S&P 500 ETF', 'NYSE Arca'],
    ['VTI', 'Vanguard Total Stock Market ETF', 'NYSE Arca'],
  ] as const)('%s verifies its official sponsor profile but does not invent a holdings verdict', async (symbol, name, exchange) => {
    const result = await reviewFundEvidence({ symbol, name, exchange, country: 'US' }, emptyCatalog, AbortSignal.timeout(45000));
    expect(result.shariah_status).toBe('needs_review');
    expect(result.shariah_screening_data.sources).toHaveLength(1);
    expect(result.shariah_screening_data.fundReview).toMatchObject({
      coverage: 'official_profile',
      reason: 'official_profile_verified_holdings_pending',
    });
    expect(result.shariah_screening_data.sources[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.shariah_screening_data.screeningRules.financial).toEqual([]);
  }, 55000);

  it.each([
    ['GLD', 'SPDR Gold Shares'],
    ['SLV', 'iShares Silver Trust'],
  ] as const)('%s verifies official physical-metal structure while preserving contract review', async (symbol, name) => {
    const result = await reviewFundEvidence({ symbol, name, exchange: 'NYSE Arca', country: 'US' }, emptyCatalog, AbortSignal.timeout(45000));
    expect(result.shariah_status).toBe('needs_review');
    expect(result.shariah_screening_data.sources.length).toBeGreaterThan(0);
    expect(result.shariah_screening_data.fundReview).toMatchObject({
      structuralEvidenceVerified: true,
      reason: 'physical_metal_structure_verified_shariah_contract_review_pending',
    });
    expect(result.shariah_screening_data.screeningRules.financial).toEqual([]);
  }, 55000);
});
