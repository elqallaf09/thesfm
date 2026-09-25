import { describe, expect, it } from 'vitest';
import type { AnalysisRequest, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { buildVerifiedChatMarketSnapshot } from '@/lib/ai-analyst/marketChatGrounding';

const request: AnalysisRequest = {
  userId: 'user-1',
  asset: { symbol: 'NBK.KW', assetType: 'STOCK' },
  horizon: 'SWING',
  locale: 'ar',
  requestedModules: ['TECHNICAL', 'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK', 'SHARIA'],
  providerPreferences: null,
  source: 'INTERNAL',
  correlationId: '00000000-0000-4000-8000-000000000001',
  forceRefresh: false,
};

function snapshot(): VerifiedIntelligenceSnapshot {
  const base = Date.parse('2026-07-01T00:00:00Z');
  const candles = Array.from({ length: 60 }, (_, index) => {
    const close = 0.75 + index * 0.002;
    return {
      at: new Date(base + index * 86_400_000).toISOString(),
      open: close - 0.001,
      high: close + 0.004,
      low: close - 0.004,
      close,
      volume: 1_000_000 + index * 10_000,
    };
  });
  return {
    asset: {
      canonicalSymbol: 'NBK.KW', providerSymbol: 'NBK.KW', displaySymbol: 'NBK.KW',
      name: 'National Bank of Kuwait', assetType: 'STOCK', exchange: 'Boursa Kuwait',
      market: 'KW', quoteCurrency: 'KWD', country: 'KW', logoUrl: null,
    },
    provider: 'yahoo',
    receivedAt: '2026-09-19T11:00:00.000Z',
    dataAsOf: candles.at(-1)!.at,
    dataStatus: 'DELAYED',
    fallbackUsed: true,
    operationalReliability: 0.8,
    reportedRiskLevel: null,
    quote: { price: candles.at(-1)!.close, change: -0.014, changePercent: -1.61, volume: null },
    levels: { support: null, resistance: null },
    candles,
    fundamentals: { trailingPE: 14.2, eps: 0.061 },
    fundamentalsSource: 'verified-fundamentals',
    sharia: {
      status: 'needs_review',
      reason: 'Point-in-time screen requires review.',
      source: 'SFM point-in-time screen',
      reviewedAt: '2026-09-19T00:24:06.532Z',
    },
    warnings: [],
    providerAttempts: [],
  };
}

describe('verified chat market grounding', () => {
  it('fills evidence-backed gaps from candles and deterministic factors without inventing values', () => {
    const result = buildVerifiedChatMarketSnapshot(snapshot(), request, Date.parse('2026-09-19T11:00:00Z'));
    expect(result.volume).toBeGreaterThan(0);
    expect(result.volumeBasis).toBe('LATEST_CANDLE');
    expect(result.support).toBeGreaterThan(0);
    expect(result.resistance).toBeGreaterThan(result.support!);
    expect(result.levelsMethod).toBe('RECENT_40_CANDLE_RANGE');
    expect(result.annualizedVolatilityPercent).not.toBeNull();
    expect(result.riskLevel).not.toBeNull();
    expect(result.riskMethod).toBe('ANNUALIZED_VOLATILITY');
    expect(result.rsi14).not.toBeNull();
    expect(result.fundamentals).toMatchObject({ peRatio: 14.2, eps: 0.061 });
    expect(result.shariaStatus).toBe('needs_review');
    expect(result.shariaSource).toBe('SFM point-in-time screen');
  });
});
