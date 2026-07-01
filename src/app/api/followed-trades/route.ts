import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { getTraderAccess } from '@/lib/server/traderAccess';
import {
  buildTradePerformancePayload,
  manualInputToRecord,
  recordToDbInsert,
} from '@/lib/trader/tradePerformance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'private, no-store' };

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function currentTraderUserId() {
  const access = await getTraderAccess();
  if (!access.allowed || !isUuid(access.userId)) return null;
  return access.userId ?? null;
}

export async function GET(request: NextRequest) {
  const admin = createServerSupabaseAdmin();
  const userId = await currentTraderUserId();
  const forceFresh = request.nextUrl.searchParams.get('refresh') === '1' || request.nextUrl.searchParams.get('refresh') === 'true';
  const payload = await buildTradePerformancePayload({ admin, userId, forceFresh });

  return json({
    ...payload,
    authenticated: Boolean(userId),
    persistence: admin && userId ? 'supabase' : 'local-only',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const record = manualInputToRecord(body);
  if (!record) return json({ ok: false, code: 'INVALID_TRADE_RECORD' }, { status: 400 });

  const admin = createServerSupabaseAdmin();
  const userId = await currentTraderUserId();
  if (!admin || !userId) {
    return json({
      ok: false,
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'لم يتم حفظ الصفقة في قاعدة البيانات. سيتم حفظها محلياً في المتصفح.',
      trade: record,
    }, { status: 202 });
  }

  const existing = await admin
    .from('trader_followed_trades')
    .select('id')
    .eq('user_id', userId)
    .eq('symbol', record.symbol)
    .eq('action', record.action)
    .eq('source_type', record.sourceType)
    .in('status', ['open', 'waiting', 'watching'])
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    const { data, error } = await admin
      .from('trader_followed_trades')
      .update(recordToDbInsert(record, userId))
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (error) return json({ ok: false, code: error.code, message: error.message, trade: record }, { status: 500 });
    return json({ ok: true, id: data.id, trade: record, updated: true });
  }

  const { data, error } = await admin
    .from('trader_followed_trades')
    .insert(recordToDbInsert(record, userId))
    .select('id')
    .single();

  if (error) return json({ ok: false, code: error.code, message: error.message, trade: record }, { status: 500 });

  if (record.sourceType === 'recommendation_card') {
    await admin.from('trader_recommendation_history').insert({
      user_id: userId,
      symbol: record.symbol,
      market_id: record.market,
      action: record.action,
      confidence: record.confidence,
      current_price: record.entryPrice,
      target_price: record.targetPrice,
      stop_loss: record.stopLoss,
      provider: record.provider,
      payload: record.payload || {},
    });
  }

  return json({ ok: true, id: data.id, trade: record });
}
