import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchWorldStockQuotes } from '@/lib/world-stocks/quotes';
import { isSupportedWorldStockRegion } from '@/lib/world-stocks/regions';
import type { WorldStockQuotesResponse } from '@/lib/world-stocks/types';

export const dynamic = 'force-dynamic';

// Matches the max page size in /api/world-stocks/search -- this endpoint is
// only ever meant to quote the current visible page, never a bulk list.
const MAX_SYMBOLS = 30;

const symbolRequestSchema = z.object({
  canonicalSymbol: z.string().trim().min(1).max(24),
  providerSymbol: z.string().trim().min(1).max(24),
  exchangeCode: z.string().trim().min(1).max(32),
  assetType: z.enum(['stock', 'etf']),
  currency: z.string().trim().max(8).nullable().optional(),
});

const bodySchema = z.object({
  symbols: z.array(symbolRequestSchema).min(1).max(MAX_SYMBOLS),
});

export async function POST(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'world-stocks-quotes' });
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    const response: WorldStockQuotesResponse = { ok: false, success: false, code: 'invalid_request', message: 'Malformed JSON body.' };
    return NextResponse.json(response, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const response: WorldStockQuotesResponse = { ok: false, success: false, code: 'invalid_request', message: 'Invalid quote request.' };
    return NextResponse.json(response, { status: 400 });
  }

  const invalidExchange = parsed.data.symbols.find(entry => !isSupportedWorldStockRegion(entry.exchangeCode));
  if (invalidExchange) {
    const response: WorldStockQuotesResponse = { ok: false, success: false, code: 'invalid_request', message: 'Unsupported exchange in quote request.' };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const { quotes, partialFailure } = await fetchWorldStockQuotes(parsed.data.symbols.map(entry => ({
      canonicalSymbol: entry.canonicalSymbol.toUpperCase(),
      providerSymbol: entry.providerSymbol.toUpperCase(),
      exchangeCode: entry.exchangeCode,
      assetType: entry.assetType,
      currency: entry.currency ?? null,
    })));

    const response: WorldStockQuotesResponse = { ok: true, success: true, quotes, partialFailure };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[WorldStocks] quotes failed', { message: error instanceof Error ? error.message : String(error) });
    const response: WorldStockQuotesResponse = { ok: false, success: false, code: 'provider_temporarily_unavailable', message: 'Quotes are temporarily unavailable.' };
    return NextResponse.json(response, { status: 503 });
  }
}
