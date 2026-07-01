import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  classifyTradePerformance,
  summarizeTrades,
  type TradePerformanceRecord,
} from '@/lib/trader/tradePerformance';

function baseTrade(overrides: Partial<TradePerformanceRecord>): TradePerformanceRecord {
  return {
    symbol: 'AAPL',
    assetName: 'Apple Inc.',
    assetLogo: null,
    market: 'US',
    action: 'buy',
    entryPrice: 100,
    currentPrice: 100,
    targetPrice: 110,
    stopLoss: 95,
    confidence: 80,
    riskLevel: 'medium',
    timeframe: '1-3 weeks',
    status: 'open',
    openedAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    provider: 'Yahoo Finance',
    sourceSignalId: null,
    sourceType: 'manual',
    notes: null,
    priceUpdated: true,
    profitLossPercent: null,
    currency: 'USD',
    ...overrides,
  };
}

describe('trade performance tracking', () => {
  it('marks a buy trade won when current price reaches target', () => {
    const trade = classifyTradePerformance(baseTrade({ currentPrice: 111 }));

    expect(trade.status).toBe('won');
    expect(trade.profitLossPercent).toBe(11);
  });

  it('marks a buy trade lost when current price reaches stop loss', () => {
    const trade = classifyTradePerformance(baseTrade({ currentPrice: 94 }));

    expect(trade.status).toBe('lost');
    expect(trade.profitLossPercent).toBe(-6);
  });

  it('uses downside target and invalidation price for sell trades', () => {
    const won = classifyTradePerformance(baseTrade({
      symbol: 'TSLA',
      action: 'sell',
      currentPrice: 88,
      targetPrice: 90,
      stopLoss: 108,
    }));
    const lost = classifyTradePerformance(baseTrade({
      symbol: 'NVDA',
      action: 'sell',
      currentPrice: 109,
      targetPrice: 90,
      stopLoss: 108,
    }));

    expect(won.status).toBe('won');
    expect(lost.status).toBe('lost');
  });

  it('keeps a trade watching when provider price is missing', () => {
    const trade = classifyTradePerformance(baseTrade({
      symbol: 'XAUUSD',
      currentPrice: null,
    }));

    expect(trade.status).toBe('watching');
    expect(trade.priceMessage).toBe('بيانات السعر غير متاحة حالياً');
    expect(trade.priceUpdated).toBe(false);
  });

  it('summarizes won, lost, open, waiting, and watching records', () => {
    const records = [
      classifyTradePerformance(baseTrade({ symbol: 'AAPL', currentPrice: 111 })),
      classifyTradePerformance(baseTrade({ symbol: 'TSLA', currentPrice: 94 })),
      classifyTradePerformance(baseTrade({ symbol: 'NVDA', currentPrice: 103 })),
      classifyTradePerformance(baseTrade({ symbol: 'BTC-USD', action: 'wait', status: 'waiting' })),
      classifyTradePerformance(baseTrade({ symbol: 'KFH.KW', action: 'watch', status: 'watching', currentPrice: null })),
    ];

    expect(summarizeTrades(records)).toMatchObject({
      total: 5,
      won: 1,
      lost: 1,
      open: 1,
      waiting: 1,
      watching: 1,
      successRate: 50,
    });
  });

  it('creates an RLS-protected followed trades table', () => {
    const sql = readFileSync('supabase/migrations/119_create_trader_followed_trades.sql', 'utf8').toLowerCase();

    expect(sql).toContain('create table if not exists public.trader_followed_trades');
    expect(sql).toContain('alter table public.trader_followed_trades enable row level security');
    expect(sql).toContain('(select auth.uid()) = user_id');
    expect(sql).toContain("status in ('open', 'won', 'lost', 'waiting', 'watching', 'expired')");
  });
});
