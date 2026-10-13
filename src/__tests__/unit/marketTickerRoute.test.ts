import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/market-ticker/route';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('market ticker route', () => {
  it('requests Gulf indices instead of similarly named listed companies', async () => {
    const requestedSymbols: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const symbol = decodeURIComponent(url.match(/\/chart\/([^?]+)/)?.[1] ?? '');
      requestedSymbols.push(symbol);
      return Response.json({
        chart: {
          result: [{ meta: { regularMarketPrice: 10_000, previousClose: 9_900 } }],
          error: null,
        },
      });
    }));

    const response = await GET(new NextRequest('http://localhost/api/market-ticker?category=gulf', {
      headers: { 'x-forwarded-for': 'market-ticker-route-test' },
    }));

    expect(response.status).toBe(200);
    expect(requestedSymbols).toEqual(expect.arrayContaining(['DFMGI.AE', '^GNRI.QA']));
    expect(requestedSymbols).not.toEqual(expect.arrayContaining(['DFM.AE', 'QNBK.QA']));
    await expect(response.json()).resolves.toMatchObject({ live: true });
  });
});
