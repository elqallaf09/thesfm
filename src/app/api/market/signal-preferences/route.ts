import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import {
  DEFAULT_SIGNAL_PREFERENCES,
  normalizeSignalPreferences,
} from '@/lib/market/signalAlerts';

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

function rowFromPreferences(userId: string, value: Record<string, unknown>) {
  const prefs = normalizeSignalPreferences(value);
  return {
    user_id: userId,
    min_confidence: prefs.minConfidence,
    risk_profile: prefs.riskProfile,
    enabled_markets: prefs.enabledMarkets,
    buy_alerts_enabled: prefs.buyAlertsEnabled,
    sell_alerts_enabled: prefs.sellAlertsEnabled,
    wait_alerts_enabled: prefs.waitAlertsEnabled,
    email_alerts_enabled: prefs.emailAlertsEnabled,
    in_app_alerts_enabled: prefs.inAppAlertsEnabled,
    telegram_alerts_enabled: prefs.telegramAlertsEnabled === true,
    push_alerts_enabled: prefs.pushAlertsEnabled === true,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: true, source: 'default', preferences: DEFAULT_SIGNAL_PREFERENCES });

  const { data, error } = await admin
    .from('user_signal_preferences')
    .select('min_confidence,risk_profile,enabled_markets,buy_alerts_enabled,sell_alerts_enabled,wait_alerts_enabled,email_alerts_enabled,in_app_alerts_enabled,telegram_alerts_enabled,push_alerts_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return json({ ok: false, code: error.code || 'LOAD_FAILED', preferences: DEFAULT_SIGNAL_PREFERENCES }, { status: 500 });
  }

  return json({
    ok: true,
    source: data ? 'database' : 'default',
    preferences: data ? normalizeSignalPreferences(data as Record<string, unknown>) : DEFAULT_SIGNAL_PREFERENCES,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const row = rowFromPreferences(user.id, body);
  const { data, error } = await admin
    .from('user_signal_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select('min_confidence,risk_profile,enabled_markets,buy_alerts_enabled,sell_alerts_enabled,wait_alerts_enabled,email_alerts_enabled,in_app_alerts_enabled,telegram_alerts_enabled,push_alerts_enabled')
    .single();

  if (error) return json({ ok: false, code: error.code || 'UPDATE_FAILED' }, { status: 500 });
  return json({ ok: true, preferences: normalizeSignalPreferences(data as Record<string, unknown>) });
}
