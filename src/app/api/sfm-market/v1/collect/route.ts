import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { collectSfmMarketObservations, SFM_MARKET_COLLECTOR_DEFAULT_UNIVERSE } from '@/lib/sfm-market/collector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ADMIN_API_POLICY_EXCEPTION: cron-or-admin-sfm-market-collector

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function cronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.SFM_MARKET_COLLECTOR_SECRET?.trim() || '';
}

function hasCronAccess(request: NextRequest) {
  const expected = cronSecret();
  if (!expected) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return bearer === expected || headerSecret === expected;
}

function normalizeSymbols(value: unknown) {
  const rows = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return Array.from(new Set(rows.map(String).map(item => item.trim().toUpperCase()).filter(Boolean))).slice(0, 100);
}

async function run(request: NextRequest, body: Record<string, unknown> = {}) {
  const cronAllowed = hasCronAccess(request);
  if (!cronAllowed) {
    const auth = await requireAdminApiAccess(request);
    if (!auth.ok) return json({ ok: false, code: auth.code }, { status: auth.status });
  }

  const requested = normalizeSymbols(body.symbols);
  const symbols = requested.length ? requested : SFM_MARKET_COLLECTOR_DEFAULT_UNIVERSE;
  const result = await collectSfmMarketObservations(symbols, {
    forceFresh: body.forceFresh !== false,
    concurrency: Number.isFinite(Number(body.concurrency)) ? Number(body.concurrency) : 3,
  });

  return json({
    ok: true,
    engine: 'THE SFM Market Data Engine',
    collector: 'SFM Market Collector v1',
    ...result,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  return run(request, body);
}

export async function GET(request: NextRequest) {
  if (!hasCronAccess(request)) return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  return run(request);
}
