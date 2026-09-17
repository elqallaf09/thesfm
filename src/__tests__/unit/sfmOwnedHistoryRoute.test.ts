import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { readHistory } = vi.hoisted(() => ({ readHistory: vi.fn() }));
vi.mock('@/lib/sfm-market/ownedHistory', () => ({ readSfmOwnedHistory: readHistory }));
import { GET } from '@/app/api/sfm-market/v1/history/[symbol]/route';

beforeEach(() => {
  readHistory.mockReset();
  readHistory.mockResolvedValue({ configured: true, error: null, points: [], pointCount: 0 });
});

describe('owned-history input boundaries', () => {
  it.each([['', 200], ['?limit=', 200], ['?limit=7', 7], ['?limit=2000', 1000]])(
    'uses the intended bounded limit for %s', async (query, limit) => {
      const response = await GET(new NextRequest(`https://example.test/api/sfm-market/v1/history/AAPL${query}`), { params: Promise.resolve({ symbol: 'AAPL' }) });
      expect(response.status).toBe(200);
      expect(readHistory).toHaveBeenCalledWith('AAPL', { from: null, to: null, limit });
    },
  );

  it('rejects malformed percent input without throwing or querying storage', async () => {
    const response = await GET(new NextRequest('https://example.test/api/sfm-market/v1/history/bad'), { params: Promise.resolve({ symbol: '%E0%A4%A' }) });
    expect(response.status).toBe(400);
    expect(readHistory).not.toHaveBeenCalled();
  });
});
