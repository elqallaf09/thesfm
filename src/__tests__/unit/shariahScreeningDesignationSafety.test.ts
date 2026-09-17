import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { admin } = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: admin }));
import { GET } from '@/app/api/sharia-stocks/screening/route';

function catalog(shariahStatus: string, manualOverride = false) {
  const row = {
    symbol: 'HLAL', name: 'Wahed FTSE USA Shariah ETF', asset_type: 'etf',
    shariah_status: shariahStatus, shariah_manual_override: manualOverride,
    shariah_last_reviewed_at: '2026-09-17T00:00:00Z',
    shariah_source: 'Reviewed fund evidence', shariah_reason: 'Stored reviewed decision',
    shariah_screening_data: {
      evidenceVersion: 'sfm-evidence-v2', methodologyId: 'SFM_FUND_EVIDENCE_REVIEW',
      methodologyVersion: '1', fundReview: { coverage: 'partial' },
    },
  };
  const query = {
    select: () => query, eq: () => query, in: () => query, order: () => query,
    range: async () => ({ data: [row], error: null }),
  };
  admin.mockReturnValue({ from: () => query });
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe('screening route preserves explicit fund decisions', () => {
  it.each([['non_compliant', false], ['needs_review', true]] as const)(
    'does not replace %s (manual override: %s) with a sponsor designation',
    async (status, manualOverride) => {
      catalog(status, manualOverride);
      const response = await GET();
      expect(response.status).toBe(200);
      const result = await response.json();
      const item = result.items.find((entry: { symbol: string }) => entry.symbol === 'HLAL');
      expect(item.shariahStatus).toBe(status);
      expect(item.fundReview?.coverage).not.toBe('published_designation');
    },
  );

  it('allows a current sponsor designation for a generic fund awaiting review', async () => {
    catalog('needs_review');
    const result = await (await GET()).json();
    const item = result.items.find((entry: { symbol: string }) => entry.symbol === 'HLAL');
    expect(item.shariahStatus).toBe('compliant');
    expect(item.fundReview.independentSfmCertification).toBe(false);
  });
});
