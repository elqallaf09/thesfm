import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
import { loadStoredIntelligenceSharia, validateStoredIntelligenceSharia } from '@/lib/server/intelligenceShariaEvidence';

const now = Date.parse('2026-09-16T09:00:00Z');
const asset: CanonicalAssetIdentity = { canonicalSymbol: 'BOUBYAN.KW', providerSymbol: 'BOUBYAN.KW', displaySymbol: 'BOUBYAN', name: 'Boubyan Bank', assetType: 'STOCK', exchange: 'Boursa Kuwait', market: 'KW', quoteCurrency: 'KWD', country: 'KW', logoUrl: null };
function row() { return { symbol: 'BOUBYAN', provider_symbol: 'BOUBYAN.KW', asset_type: 'stock', country: 'KW', exchange: 'Boursa Kuwait', shariah_status: 'compliant', shariah_reason: 'Explicit test review with supporting evidence', shariah_source: 'Fixture reviewed source', shariah_last_reviewed_at: '2026-09-15T09:00:00Z', shariah_manual_override: true }; }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe('stored Sharia evidence trust boundary', () => {
  it('accepts the dated explicit manual classification of the exact provider identity', () => {
    expect(validateStoredIntelligenceSharia(row(), asset)?.status).toBe('compliant');
  });
  it('rejects a legacy status with a source label but no verified evidence or manual review', () => {
    expect(validateStoredIntelligenceSharia({ ...row(), shariah_manual_override: false }, asset)).toBeNull();
  });
  it('accepts current evidence-v2 but rejects its expired automatic decision', () => {
    const input = { ...row(), shariah_manual_override: false, shariah_screening_data: { evidenceVersion: 'sfm-evidence-v2' } };
    expect(validateStoredIntelligenceSharia(input, asset)?.status).toBe('compliant');
    expect(validateStoredIntelligenceSharia({ ...input, shariah_last_reviewed_at: '2026-09-01T09:00:00Z' }, asset)).toBeNull();
  });
  it.each(['2026-09-17T09:00:00Z', '2025-01-01T00:00:00Z', 'invalid'])('rejects invalid review chronology: %s', reviewedAt => {
    expect(validateStoredIntelligenceSharia({ ...row(), shariah_last_reviewed_at: reviewedAt }, asset)).toBeNull();
  });
  it('rejects mismatched symbols, asset types and countries', () => {
    expect(validateStoredIntelligenceSharia({ ...row(), provider_symbol: 'BOUBYAN' }, asset)).toBeNull();
    expect(validateStoredIntelligenceSharia({ ...row(), country: 'US' }, asset)).toBeNull();
    expect(validateStoredIntelligenceSharia({ ...row(), asset_type: 'fund' }, asset)).toBeNull();
  });
  it('keeps the abort signal on the query builder before maybeSingle', async () => {
    const order: string[] = [];
    const builder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      abortSignal: vi.fn(function (this: unknown) { order.push('abort'); return this; }),
      maybeSingle: vi.fn(async () => { order.push('single'); return { data: row(), error: null }; }),
    };
    const from = vi.fn(() => builder); mocks.admin.mockReturnValue({ from });
    const data = await loadStoredIntelligenceSharia(asset);
    expect(data?.status).toBe('compliant'); expect(order).toEqual(['abort', 'single']);
    expect(builder.limit).toHaveBeenCalledWith(2); expect(builder.eq).toHaveBeenCalledWith('provider_symbol', 'BOUBYAN.KW');
    expect(from).toHaveBeenCalledTimes(1); expect(from).toHaveBeenCalledWith('market_symbols');
  });
  it('does not promote a published operations opinion or a database error into a screening result', async () => {
    const builder = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: row(), error: { message: 'ambiguous identity' } }) };
    const from = vi.fn(() => builder); mocks.admin.mockReturnValue({ from });
    expect(await loadStoredIntelligenceSharia(asset)).toBeNull(); expect(from).toHaveBeenCalledTimes(1);
  });
  it('returns unavailable when privileged storage is not configured', async () => {
    mocks.admin.mockReturnValue(null); expect(await loadStoredIntelligenceSharia(asset)).toBeNull();
  });
});
