import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  admin: vi.fn(), readiness: vi.fn(), from: vi.fn(), select: vi.fn(),
  eq: vi.fn(), order: vi.fn(), limit: vi.fn(), position: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/investments/canonicalReadiness.server', () => ({ loadInvestmentCutoverReadiness: mocks.readiness }));
vi.mock('@/lib/investments/canonicalPosition', () => ({ toCanonicalInvestmentPosition: mocks.position }));
import { loadCanonicalInvestmentPositions } from '@/lib/investments/canonicalPositions.server';

beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, eq: mocks.eq, order: mocks.order, limit: mocks.limit };
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.order.mockReturnValue(chain);
  mocks.readiness.mockResolvedValue({ readyForReadCutover: true, verifiedCount: 2 });
  mocks.limit.mockResolvedValue({ data: [{ id: 'position-a' }, { id: 'position-b' }], error: null, count: 2 });
  mocks.position.mockImplementation((row: unknown) => row);
});

describe('canonical position read completeness', () => {
  it('requests an exact owner-scoped verified count and maps only a complete read', async () => {
    const result = await loadCanonicalInvestmentPositions('verified-owner');
    expect(mocks.readiness).toHaveBeenCalledExactlyOnceWith('verified-owner');
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('investment_positions');
    expect(mocks.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(mocks.eq.mock.calls).toEqual([['user_id', 'verified-owner'], ['migration_state', 'VERIFIED']]);
    expect(result.positions).toHaveLength(2);
    expect(mocks.position).toHaveBeenCalledTimes(2);
  });
  it.each([null, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])('rejects missing or invalid counts: %s', async count => {
    mocks.limit.mockResolvedValue({ data: [{ id: 'position-a' }, { id: 'position-b' }], error: null, count });
    await expect(loadCanonicalInvestmentPositions('verified-owner')).rejects.toThrow('INVESTMENT_CANONICAL_SCAN_INCOMPLETE');
    expect(mocks.position).not.toHaveBeenCalled();
  });
  it('rejects truncation below the requested 5,000-row limit', async () => {
    mocks.limit.mockResolvedValue({ data: [{ id: 'position-a' }], error: null, count: 2 });
    await expect(loadCanonicalInvestmentPositions('verified-owner')).rejects.toThrow('INVESTMENT_CANONICAL_SCAN_INCOMPLETE');
    expect(mocks.position).not.toHaveBeenCalled();
  });
  it('rejects position-count drift since the readiness scan', async () => {
    mocks.limit.mockResolvedValue({ data: [{ id: 'position-a' }], error: null, count: 1 });
    await expect(loadCanonicalInvestmentPositions('verified-owner')).rejects.toThrow('INVESTMENT_CANONICAL_SCAN_INCOMPLETE');
    expect(mocks.position).not.toHaveBeenCalled();
  });
  it('preserves a genuinely complete empty portfolio', async () => {
    mocks.readiness.mockResolvedValue({ readyForReadCutover: true, verifiedCount: 0 });
    mocks.limit.mockResolvedValue({ data: [], error: null, count: 0 });
    expect((await loadCanonicalInvestmentPositions('verified-owner')).positions).toEqual([]);
  });
  it('does not query values before verification is complete', async () => {
    mocks.readiness.mockResolvedValue({ readyForReadCutover: false, verifiedCount: 0 });
    await expect(loadCanonicalInvestmentPositions('verified-owner')).rejects.toThrow('not ready for cutover');
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('does not turn a storage error into an empty portfolio', async () => {
    mocks.limit.mockResolvedValue({ data: null, count: null, error: new Error('fixture storage failure') });
    await expect(loadCanonicalInvestmentPositions('verified-owner')).rejects.toThrow('fixture storage failure');
    expect(mocks.position).not.toHaveBeenCalled();
  });
});
