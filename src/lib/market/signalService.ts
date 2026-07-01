import type { SupabaseClient } from '@supabase/supabase-js';
import { proxyAnalyze } from '@/lib/market/marketDataProvider';
import { normalizeAssetType, type MarketAssetType } from '@/lib/market/marketService';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import {
  generateMarketSignal,
  signalFromMarketAnalysis,
  unavailableMarketSignal,
  type MarketSignal,
  type MarketSignalAction,
  type MarketSignalDataQuality,
  type MarketSignalRiskLevel,
} from '@/lib/market/signalEngine';
import {
  buildSignalNotificationsForPreferences,
  DEFAULT_SIGNAL_PREFERENCES,
  normalizeSignalPreferences,
  type UserSignalPreferences,
} from '@/lib/market/signalAlerts';
import { autoTrackSignalTrades } from '@/lib/trader/tradePerformance';

type DbClient = SupabaseClient<any, 'public', any>;

type SignalRow = {
  id?: string;
  symbol?: string;
  asset_name?: string;
  asset_type?: string;
  market?: string;
  currency?: string;
  action?: MarketSignalAction;
  action_label_ar?: MarketSignal['actionLabelAr'];
  confidence?: number;
  risk_level?: MarketSignalRiskLevel;
  current_price?: number | null;
  target_price?: number | null;
  stop_loss?: number | null;
  timeframe?: string;
  reasons?: unknown;
  warnings?: unknown;
  provider?: string;
  data_quality?: MarketSignalDataQuality;
  score_breakdown?: unknown;
  technical_summary?: unknown;
  created_at?: string;
  expires_at?: string;
};

export type SignalListFilters = {
  market?: string | null;
  action?: MarketSignalAction | 'all' | null;
  minConfidence?: number | null;
  symbols?: string[];
  limit?: number;
};

export const SIGNAL_REFRESH_UNIVERSE = [
  'AAPL',
  'TSLA',
  'NVDA',
  'BTC-USD',
  'ETH-USD',
  'EURUSD',
  'XAUUSD',
  'KFH.KW',
  'BOUBYAN.KW',
  'MSFT',
  'GOOGL',
  'SPY',
  'QQQ',
  '2222.SR',
  'QNBK.QA',
  'EMAAR.AE',
];

const SIGNAL_CACHE_TTL_MS = 4 * 60 * 1000;
const signalCache = new Map<string, { expiresAt: number; signal: MarketSignal }>();

function cacheKey(symbol: string, assetType?: string | null) {
  return `${symbol.trim().toUpperCase()}:${assetType || ''}`;
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function inferAssetType(symbol: string): MarketAssetType {
  const normalized = normalizeSymbol(symbol);
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE)(-?USD|USD)?$/.test(normalized) || /-USD$/.test(normalized)) return 'crypto';
  if (/^[A-Z]{6}$/.test(normalized) || normalized.endsWith('=X')) return 'forex';
  if (/^(XAUUSD|XAGUSD|GOLD|GC=F|SI=F|CL=F|BZ=F|WTI|BRENT)$/.test(normalized)) return normalized === 'XAUUSD' || normalized === 'GOLD' || normalized === 'GC=F' ? 'gold' : 'commodity';
  if (normalized.startsWith('^')) return 'index';
  if (/^(SPY|QQQ|GLD|SLV|IWM|VOO|VTI)$/.test(normalized)) return 'etf';
  return 'stock';
}

function displaySymbolForRequest(rawSymbol: string, resolvedSymbol?: string | null) {
  const normalized = normalizeSymbol(rawSymbol);
  if (/-USD$/.test(normalized)) return normalized;
  if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE)USD$/.test(normalized)) return `${normalized.replace(/USD$/, '')}-USD`;
  if (normalized === 'GC=F' || normalized === 'GOLD') return 'XAUUSD';
  return normalizeSymbol(resolvedSymbol || normalized);
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function actionLabelAr(action: MarketSignalAction): MarketSignal['actionLabelAr'] {
  if (action === 'buy') return 'إشارة شراء الآن';
  if (action === 'sell') return 'إشارة بيع الآن';
  if (action === 'watch') return 'تحت المراقبة';
  return 'انتظار';
}

export function dbRowToMarketSignal(row: SignalRow): MarketSignal {
  const action = row.action === 'buy' || row.action === 'sell' || row.action === 'wait' || row.action === 'watch'
    ? row.action
    : 'watch';
  return {
    symbol: normalizeSymbol(row.symbol),
    assetName: String(row.asset_name || row.symbol || ''),
    assetType: String(row.asset_type || 'stock'),
    market: String(row.market || 'US'),
    currency: String(row.currency || 'USD'),
    action,
    actionLabelAr: row.action_label_ar || actionLabelAr(action),
    confidence: Number.isFinite(Number(row.confidence)) ? Math.min(95, Math.max(0, Number(row.confidence))) : 0,
    riskLevel: row.risk_level === 'low' || row.risk_level === 'medium' || row.risk_level === 'high' ? row.risk_level : 'medium',
    currentPrice: Number.isFinite(Number(row.current_price)) ? Number(row.current_price) : null,
    targetPrice: Number.isFinite(Number(row.target_price)) ? Number(row.target_price) : null,
    stopLoss: Number.isFinite(Number(row.stop_loss)) ? Number(row.stop_loss) : null,
    timeframe: String(row.timeframe || '1-3 أسابيع'),
    reasons: safeArray(row.reasons),
    warnings: safeArray(row.warnings),
    provider: String(row.provider || 'Yahoo Finance'),
    dataQuality: row.data_quality === 'live' || row.data_quality === 'delayed' || row.data_quality === 'partial' || row.data_quality === 'unavailable'
      ? row.data_quality
      : 'partial',
    lastUpdated: row.created_at || new Date().toISOString(),
    scoreBreakdown: row.score_breakdown && typeof row.score_breakdown === 'object'
      ? row.score_breakdown as MarketSignal['scoreBreakdown']
      : {
        technicalScore: 0,
        momentumScore: 0,
        newsScore: 0,
        fundamentalsScore: 0,
        riskAdjustment: 0,
        dataQualityPenalty: -20,
        totalScore: 0,
      },
    technicalSummary: row.technical_summary && typeof row.technical_summary === 'object'
      ? row.technical_summary as MarketSignal['technicalSummary']
      : {
        trendDirection: 'unknown',
        rsi: null,
        macd: null,
        macdSignal: null,
        macdHistogram: null,
        sma20: null,
        sma50: null,
        sma200: null,
        support: null,
        resistance: null,
        volatility: null,
        volumeTrend: 'unknown',
      },
    disclaimerAr: 'هذه إشارات تحليلية تعليمية مبنية على البيانات المتاحة، ولا تُعد نصيحة مالية أو توصية ملزمة بالشراء أو البيع. القرار النهائي مسؤولية المستخدم.',
    disclaimerEn: 'These are educational analytical signals based on available data and are not financial advice.',
  };
}

export function marketSignalToDbRow(signal: MarketSignal) {
  return {
    symbol: signal.symbol,
    asset_name: signal.assetName,
    asset_type: signal.assetType,
    market: signal.market,
    currency: signal.currency,
    action: signal.action,
    action_label_ar: signal.actionLabelAr,
    confidence: signal.confidence,
    risk_level: signal.riskLevel,
    current_price: signal.currentPrice,
    target_price: signal.targetPrice,
    stop_loss: signal.stopLoss,
    timeframe: signal.timeframe,
    reasons: signal.reasons,
    warnings: signal.warnings,
    provider: signal.provider,
    data_quality: signal.dataQuality,
    score_breakdown: signal.scoreBreakdown,
    technical_summary: signal.technicalSummary,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

export async function generateSignalForSymbol(rawSymbol: string, assetTypeInput?: string | null, options?: { forceFresh?: boolean }): Promise<MarketSignal> {
  const requestedSymbol = normalizeSymbol(rawSymbol);
  if (!requestedSymbol) return unavailableMarketSignal({ symbol: '', reason: 'رمز غير صالح.' });
  const requestedAssetType = normalizeAssetType(assetTypeInput || inferAssetType(requestedSymbol));
  const key = cacheKey(requestedSymbol, requestedAssetType);
  const cached = signalCache.get(key);
  if (!options?.forceFresh && cached && cached.expiresAt > Date.now()) return cached.signal;

  const resolved = await resolveMarketSymbol(requestedSymbol, requestedAssetType).catch(() => null);
  if (!resolved?.ok) {
    const unavailable = unavailableMarketSignal({
      symbol: requestedSymbol,
      assetType: requestedAssetType,
      provider: 'Yahoo Finance',
      reason: 'البيانات غير كافية أو الرمز غير مدعوم من المزود.',
    });
    signalCache.set(key, { signal: unavailable, expiresAt: Date.now() + SIGNAL_CACHE_TTL_MS });
    return unavailable;
  }

  const displaySymbol = displaySymbolForRequest(requestedSymbol, resolved.asset.symbol);
  const result = await proxyAnalyze(resolved.asset.providerSymbol, resolved.asset.assetType, {
    displaySymbol,
    name: resolved.asset.name,
    exchange: resolved.asset.exchange,
    country: resolved.asset.country,
    currency: resolved.asset.currency,
  });

  const signal = result.success
    ? signalFromMarketAnalysis({
      ...result,
      symbol: displaySymbol,
      name: result.name || resolved.asset.name || displaySymbol,
      assetType: result.assetType || resolved.asset.assetType,
      exchange: result.exchange || resolved.asset.exchange,
      country: result.country || resolved.asset.country,
      currency: result.currency || resolved.asset.currency,
    })
    : unavailableMarketSignal({
      symbol: displaySymbol,
      assetName: resolved.asset.name,
      assetType: resolved.asset.assetType,
      market: resolved.asset.exchange || resolved.asset.country,
      currency: resolved.asset.currency,
      provider: result.provider || 'Yahoo Finance',
      reason: result.error || 'البيانات غير كافية من المزود.',
    });

  signalCache.set(key, { signal, expiresAt: Date.now() + SIGNAL_CACHE_TTL_MS });
  return signal;
}

export async function generateSignalsForUniverse(symbols: string[], options?: { forceFresh?: boolean; concurrency?: number }) {
  const unique = Array.from(new Set(symbols.map(normalizeSymbol).filter(Boolean))).slice(0, 60);
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 4, unique.length || 1));
  const output: MarketSignal[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await generateSignalForSymbol(unique[index], null, { forceFresh: options?.forceFresh }).catch(() => unavailableMarketSignal({
        symbol: unique[index],
        reason: 'تعذر جلب البيانات من المزود.',
      }));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return output.filter(Boolean);
}

export async function getLatestSignalsFromDb(admin: DbClient | null, filters: SignalListFilters = {}) {
  if (!admin) return { ok: false as const, code: 'SERVICE_NOT_CONFIGURED', signals: [] as MarketSignal[] };
  let query = admin
    .from('market_signals')
    .select('id,symbol,asset_name,asset_type,market,currency,action,action_label_ar,confidence,risk_level,current_price,target_price,stop_loss,timeframe,reasons,warnings,provider,data_quality,score_breakdown,technical_summary,created_at,expires_at')
    .order('created_at', { ascending: false })
    .limit(Math.max(50, Math.min(500, (filters.limit ?? 30) * 8)));

  if (filters.action && filters.action !== 'all') query = query.eq('action', filters.action);
  if (filters.market) query = query.ilike('market', `%${filters.market}%`);
  if (Number.isFinite(Number(filters.minConfidence))) query = query.gte('confidence', Number(filters.minConfidence));
  if (filters.symbols?.length) query = query.in('symbol', filters.symbols.map(normalizeSymbol));

  const { data, error } = await query;
  if (error) return { ok: false as const, code: error.code, message: error.message, signals: [] as MarketSignal[] };

  const seen = new Set<string>();
  const signals = (data ?? [])
    .map(row => dbRowToMarketSignal(row as SignalRow))
    .filter(signal => {
      if (seen.has(signal.symbol)) return false;
      seen.add(signal.symbol);
      return true;
    })
    .slice(0, filters.limit ?? 30);
  return { ok: true as const, signals };
}

export async function getLatestSignalFromDb(admin: DbClient | null, symbol: string) {
  if (!admin) return { ok: false as const, signal: null as MarketSignal | null, code: 'SERVICE_NOT_CONFIGURED' };
  const { data, error } = await admin
    .from('market_signals')
    .select('id,symbol,asset_name,asset_type,market,currency,action,action_label_ar,confidence,risk_level,current_price,target_price,stop_loss,timeframe,reasons,warnings,provider,data_quality,score_breakdown,technical_summary,created_at,expires_at')
    .eq('symbol', normalizeSymbol(symbol))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false as const, signal: null, code: error.code, message: error.message };
  return { ok: true as const, signal: data ? dbRowToMarketSignal(data as SignalRow) : null };
}

async function loadPreferences(admin: DbClient): Promise<Array<{ userId: string; preferences: UserSignalPreferences }>> {
  const { data, error } = await admin
    .from('user_signal_preferences')
    .select('user_id,min_confidence,risk_profile,enabled_markets,buy_alerts_enabled,sell_alerts_enabled,wait_alerts_enabled,email_alerts_enabled,in_app_alerts_enabled,telegram_alerts_enabled,push_alerts_enabled');
  if (error || !data) return [];
  return data.map(row => ({
    userId: String((row as Record<string, unknown>).user_id),
    preferences: normalizeSignalPreferences(row as Record<string, unknown>),
  }));
}

async function insertSignalNotifications(admin: DbClient, signal: MarketSignal, previous?: MarketSignal | null) {
  const preferenceRows = await loadPreferences(admin);
  const rows = preferenceRows.flatMap(({ userId, preferences }) => {
    const drafts = buildSignalNotificationsForPreferences(signal, preferences || DEFAULT_SIGNAL_PREFERENCES, previous, ['in-app', 'email', 'telegram', 'push']);
    return drafts.map(draft => ({
      user_id: userId,
      signal_id: null,
      symbol: signal.symbol,
      action: signal.action,
      event: draft.event,
      title: draft.title,
      message: draft.message,
      channel: draft.channel,
      status: draft.channel === 'in-app' ? 'created' : 'queued',
      sent_at: draft.channel === 'in-app' ? new Date().toISOString() : null,
    }));
  });
  if (!rows.length) return { inserted: 0 };
  const { error } = await admin.from('signal_notifications').insert(rows);
  if (error) return { inserted: 0, error };
  return { inserted: rows.length };
}

export async function persistMarketSignals(admin: DbClient | null, signals: MarketSignal[]) {
  if (!admin) return { ok: false as const, code: 'SERVICE_NOT_CONFIGURED', inserted: 0, notifications: 0, followedTrades: 0 };
  let inserted = 0;
  let notifications = 0;
  let followedTrades = 0;
  for (const signal of signals) {
    const previousResult = await getLatestSignalFromDb(admin, signal.symbol);
    const previous = previousResult.signal;
    const { data, error } = await admin
      .from('market_signals')
      .insert(marketSignalToDbRow(signal))
      .select('id')
      .single();
    if (error) continue;
    inserted += 1;

    if (previous && (previous.action !== signal.action || previous.confidence !== signal.confidence)) {
      await admin.from('signal_history').insert({
        symbol: signal.symbol,
        old_action: previous.action,
        new_action: signal.action,
        old_confidence: previous.confidence,
        new_confidence: signal.confidence,
        reason: signal.reasons[0] || 'signal_refresh',
      });
    }

    const notificationResult = await insertSignalNotifications(admin, signal, previous);
    notifications += notificationResult.inserted;
    const tracked = await autoTrackSignalTrades(admin, signal, data?.id || null);
    followedTrades += tracked.inserted;

    if (data?.id) {
      await admin
        .from('signal_notifications')
        .update({ signal_id: data.id })
        .eq('symbol', signal.symbol)
        .is('signal_id', null);
    }
  }
  return { ok: true as const, inserted, notifications, followedTrades };
}

export function filterSignals(signals: MarketSignal[], filters: SignalListFilters = {}) {
  return signals
    .filter(signal => !filters.action || filters.action === 'all' || signal.action === filters.action)
    .filter(signal => !filters.market || signal.market.toLowerCase().includes(filters.market.toLowerCase()))
    .filter(signal => !Number.isFinite(Number(filters.minConfidence)) || signal.confidence >= Number(filters.minConfidence))
    .slice(0, filters.limit ?? 30);
}
