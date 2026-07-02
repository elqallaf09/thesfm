import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, requireAdminApiAccess } from '@/lib/server/adminAccess';
import {
  generateSignalsForUniverse,
  persistMarketSignals,
  SIGNAL_REFRESH_UNIVERSE,
} from '@/lib/market/signalService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  return process.env.CRON_SECRET?.trim() || process.env.SIGNAL_REFRESH_SECRET?.trim() || '';
}

function hasCronAccess(request: NextRequest) {
  const expected = cronSecret();
  if (!expected) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const querySecret = request.nextUrl.searchParams.get('secret')?.trim();
  return bearer === expected || headerSecret === expected || querySecret === expected;
}

function normalizeSymbols(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim().toUpperCase()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

export async function POST(request: NextRequest) {
  const cronAllowed = hasCronAccess(request);
  let admin = createServerSupabaseAdmin();

  if (!cronAllowed) {
    const auth = await requireAdminApiAccess(request);
    if (!auth.ok) return json({ ok: false, code: auth.code }, { status: auth.status });
    admin = auth.admin;
  }

  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const symbols = normalizeSymbols(body.symbols);
  const forceFresh = body.force === true || body.refresh === true;
  const universe = symbols.length ? symbols : SIGNAL_REFRESH_UNIVERSE;
  const signals = await generateSignalsForUniverse(universe, {
    forceFresh,
    concurrency: 4,
  });
  const persisted = await persistMarketSignals(admin, signals);

  return json({
    ok: persisted.ok,
    source: 'provider-refresh',
    requested: universe.length,
    generated: signals.length,
    inserted: persisted.inserted,
    notifications: persisted.notifications,
    followedTrades: persisted.followedTrades,
    loaded: signals.filter(signal => signal.dataQuality !== 'unavailable').map(signal => ({ symbol: signal.symbol, provider: signal.provider, reason: 'signal_loaded' })),
    failed: signals.filter(signal => signal.dataQuality === 'unavailable').map(signal => ({ symbol: signal.symbol, provider: signal.provider, reason: signal.warnings?.[0] || 'signal_unavailable' })),
    skipped: [],
    provider: 'provider-refresh',
    reason: signals.length ? null : 'no_signals_generated',
    resultCount: signals.length,
    signals,
  }, { status: persisted.ok ? 200 : 500 });
}

// Vercel Cron يستدعي GET — نفس منطق POST مع صلاحية الكرون فقط
export async function GET(request: NextRequest) {
  if (!hasCronAccess(request)) {
    return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return POST(request);
}
