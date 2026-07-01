import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  generateMarketSignal,
  MARKET_SIGNAL_DISCLAIMER_AR,
  unavailableMarketSignal,
  type MarketSignal,
  type MarketSignalInputPoint,
} from '@/lib/market/signalEngine';
import {
  buildSignalNotificationsForPreferences,
  DEFAULT_SIGNAL_PREFERENCES,
} from '@/lib/market/signalAlerts';

function candles(count: number, start = 100, step = 0.35): MarketSignalInputPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const close = start + index * step + Math.sin(index / 7) * 0.4;
    return {
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      open: close - 0.18,
      high: close + 0.6,
      low: close - 0.55,
      close,
      volume: 1_000_000 + index * 7_500,
    };
  });
}

function bullishSignal() {
  const history = candles(220);
  return generateMarketSignal({
    symbol: 'AAPL',
    assetName: 'Apple Inc.',
    assetType: 'stock',
    market: 'US',
    currency: 'USD',
    currentPrice: history.at(-1)?.close,
    dailyChangePercent: 1.8,
    sevenDayChangePercent: 4.8,
    thirtyDayChangePercent: 12.4,
    history,
    fundamentals: {
      valuation: 'fair',
      earningsTrend: 'positive',
      dividend: 0.52,
      sector: 'Technology',
      riskLevel: 'low',
    },
    newsSentiment: {
      sentiment: 'positive',
      positiveCount: 6,
      negativeCount: 1,
      highImpact: false,
      providerStatus: 'available',
    },
    provider: 'Yahoo Finance',
    dataQuality: 'live',
    lastUpdated: '2026-07-01T10:00:00.000Z',
  });
}

describe('market signal engine', () => {
  it('generates a rule-based buy signal with target, stop loss, confidence, and reasons when data is sufficient', () => {
    const signal = bullishSignal();

    expect(signal.action).toBe('buy');
    expect(signal.actionLabelAr).toBe('إشارة شراء الآن');
    expect(signal.confidence).toBeGreaterThanOrEqual(70);
    expect(signal.confidence).toBeLessThan(100);
    expect(signal.targetPrice).toBeGreaterThan(signal.currentPrice ?? 0);
    expect(signal.stopLoss).toBeLessThan(signal.currentPrice ?? Number.POSITIVE_INFINITY);
    expect(signal.scoreBreakdown.totalScore).toBeGreaterThanOrEqual(70);
    expect(signal.reasons.join(' ')).toContain('النتيجة المركبة');
    expect(signal.warnings).toContain(MARKET_SIGNAL_DISCLAIMER_AR);
  });

  it('caps confidence and avoids buy/sell when data is partial', () => {
    const history = candles(12);
    const signal = generateMarketSignal({
      symbol: 'TSLA',
      assetName: 'Tesla Inc.',
      assetType: 'stock',
      market: 'US',
      currency: 'USD',
      currentPrice: history.at(-1)?.close,
      dailyChangePercent: 3.5,
      sevenDayChangePercent: 9,
      history,
      newsSentiment: { sentiment: 'positive', positiveCount: 3, negativeCount: 0, providerStatus: 'partial' },
      provider: 'Yahoo Finance',
      dataQuality: 'partial',
    });

    expect(['wait', 'watch']).toContain(signal.action);
    expect(signal.confidence).toBeLessThanOrEqual(65);
    expect(signal.dataQuality).toBe('partial');
    expect(signal.warnings.join(' ')).toContain('جودة البيانات جزئية');
  });

  it('does not fabricate a trade signal when provider data is missing', () => {
    const signal = unavailableMarketSignal({
      symbol: 'BOUBYAN.KW',
      assetName: 'Boubyan Bank',
      assetType: 'stock',
      market: 'Kuwait',
      currency: 'KWD',
      provider: 'Yahoo Finance',
      reason: 'provider returned no quote',
    });

    expect(signal.action).toBe('watch');
    expect(signal.actionLabelAr).toBe('تحت المراقبة');
    expect(signal.currentPrice).toBeNull();
    expect(signal.targetPrice).toBeNull();
    expect(signal.stopLoss).toBeNull();
    expect(signal.dataQuality).toBe('unavailable');
    expect(signal.reasons[0]).toContain('البيانات غير كافية');
  });

  it('creates compliant notifications when a wait signal changes to buy', () => {
    const signal = bullishSignal();
    const previous: MarketSignal = {
      ...signal,
      action: 'wait',
      actionLabelAr: 'انتظار',
      confidence: 54,
    };

    const notifications = buildSignalNotificationsForPreferences(
      signal,
      DEFAULT_SIGNAL_PREFERENCES,
      previous,
      ['in-app'],
    );

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some(item => item.message.includes('تغيرت التوصية'))).toBe(true);
    expect(notifications.map(item => item.message).join(' ')).toContain('ليست نصيحة مالية');
    expect(notifications.map(item => item.message).join(' ')).not.toContain('اشتر فوراً');
  });

  it('creates RLS-protected Supabase tables for signals, preferences, notifications, and history', () => {
    const sql = readFileSync('supabase/migrations/118_create_market_signals_alerts.sql', 'utf8').toLowerCase();

    expect(sql).toContain('create table if not exists public.market_signals');
    expect(sql).toContain('create table if not exists public.user_signal_preferences');
    expect(sql).toContain('create table if not exists public.signal_notifications');
    expect(sql).toContain('create table if not exists public.signal_history');
    expect(sql).toContain('alter table public.market_signals enable row level security');
    expect(sql).toContain('to authenticated');
    expect(sql).toContain('(select auth.uid()) = user_id');
  });
});
