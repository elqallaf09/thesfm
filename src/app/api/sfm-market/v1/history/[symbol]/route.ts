import { NextRequest, NextResponse } from 'next/server';
import { readSfmOwnedHistory } from '@/lib/sfm-market/ownedHistory';
import { SFM_MARKET_ENGINE_NAME, SFM_MARKET_ENGINE_VERSION } from '@/lib/sfm-market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ symbol: string }> };

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60',
      'X-SFM-Market-Engine': SFM_MARKET_ENGINE_VERSION,
      ...(init?.headers ?? {}),
    },
  });
}

function validIsoInput(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  let decodedSymbol: string;
  try { decodedSymbol = decodeURIComponent(symbol ?? '').trim().toUpperCase(); }
  catch { decodedSymbol = ''; }
  if (!/^[A-Z0-9.^=:/-]{1,24}$/.test(decodedSymbol)) {
    return json({ ok: false, engine: SFM_MARKET_ENGINE_NAME, code: 'INVALID_SYMBOL', message: 'A valid symbol is required.' }, { status: 400 });
  }

  const rawFrom = request.nextUrl.searchParams.get('from');
  const rawTo = request.nextUrl.searchParams.get('to');
  const from = validIsoInput(rawFrom);
  const to = validIsoInput(rawTo);
  if ((rawFrom && !from) || (rawTo && !to)) {
    return json({ ok: false, engine: SFM_MARKET_ENGINE_NAME, code: 'INVALID_DATE_RANGE', message: 'from/to must be valid ISO dates.' }, { status: 400 });
  }
  if (from && to && from > to) {
    return json({ ok: false, engine: SFM_MARKET_ENGINE_NAME, code: 'INVALID_DATE_RANGE', message: 'from must be before to.' }, { status: 400 });
  }

  const limitInput = request.nextUrl.searchParams.get('limit');
  const rawLimit = limitInput?.trim() ? Number(limitInput) : 200;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.trunc(rawLimit))) : 200;
  const result = await readSfmOwnedHistory(decodedSymbol, { from, to, limit });
  if (!result.configured) {
    return json({ ok: false, engine: SFM_MARKET_ENGINE_NAME, engineVersion: SFM_MARKET_ENGINE_VERSION, code: 'HISTORY_STORE_NOT_CONFIGURED', ...result }, { status: 503 });
  }
  if (result.error) {
    return json({ ok: false, engine: SFM_MARKET_ENGINE_NAME, engineVersion: SFM_MARKET_ENGINE_VERSION, code: 'HISTORY_STORE_ERROR', ...result }, { status: 503 });
  }

  return json({
    ok: true,
    engine: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    history: result,
  });
}
