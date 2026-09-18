import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
import { loadResearchIntelligenceSharia } from '@/lib/server/intelligenceResearchSharia';

const asset: CanonicalAssetIdentity = { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null };
afterEach(() => { vi.clearAllMocks(); });
describe('private Sharia research ownership', () => {
  it('never opens privileged storage for public analyses', async () => {
    expect(await loadResearchIntelligenceSharia(asset, null)).toBeNull();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('scopes complete non-invalidated reports to the authenticated owner and exact security', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), maybeSingle: vi.fn()
      .mockResolvedValueOnce({ data: { id: 'verified-security', provider_symbol: 'AAPL', exchange: 'NASDAQ', country: 'US' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null }) };
    mocks.admin.mockReturnValue({ from: vi.fn(() => query) });
    expect(await loadResearchIntelligenceSharia(asset, 'authenticated-owner')).toBeNull();
    expect(query.eq).toHaveBeenCalledWith('user_id', 'authenticated-owner');
    expect(query.eq).toHaveBeenCalledWith('security_id', 'verified-security');
    expect(query.eq).toHaveBeenCalledWith('persistence_status', 'complete');
    expect(query.is).toHaveBeenCalledWith('invalidated_at', null);
  });
});
