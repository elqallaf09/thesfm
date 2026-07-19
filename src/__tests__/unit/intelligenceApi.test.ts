import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  analyzeIntelligenceInputSchema,
  intelligenceTimelineQuerySchema,
  latestIntelligenceQuerySchema,
} from '@/domain/intelligence/schemas';
import { intelligenceErrorResponse, readBoundedJson } from '@/lib/intelligence/api';

describe('intelligence API boundary', () => {
  it('accepts only the canonical, allow-listed analysis input', () => {
    const parsed = analyzeIntelligenceInputSchema.parse({
      asset: { symbol: 'AAPL', assetType: 'STOCK' },
      horizon: 'SWING',
      locale: 'en',
      requestedModules: ['TECHNICAL', 'RISK'],
      source: 'SMART_MARKET_ANALYSIS',
      forceRefresh: false,
    });
    expect(parsed.asset.symbol).toBe('AAPL');
    expect(() => analyzeIntelligenceInputSchema.parse({
      ...parsed,
      userId: 'attacker-controlled-user',
    })).toThrow();
    expect(() => analyzeIntelligenceInputSchema.parse({
      ...parsed,
      providerPreferences: ['https://attacker.invalid/provider'],
    })).toThrow();
  });

  it('rejects unsafe and unsupported symbols before provider resolution', () => {
    expect(() => analyzeIntelligenceInputSchema.parse({
      asset: { symbol: 'https://attacker.invalid', assetType: 'STOCK' },
    })).toThrow();
    expect(() => analyzeIntelligenceInputSchema.parse({
      asset: { symbol: 'AAPL', assetType: 'OPTION' },
    })).toThrow();
  });

  it('validates the read endpoint without accepting extra query fields', () => {
    expect(latestIntelligenceQuerySchema.parse({ symbol: 'BTC-USD', assetType: 'CRYPTO' }))
      .toMatchObject({ horizon: 'SWING', locale: 'ar' });
    expect(() => latestIntelligenceQuerySchema.parse({
      symbol: 'BTC-USD',
      assetType: 'CRYPTO',
      userId: 'cross-user-id',
    })).toThrow();
  });

  it('bounds timeline reads and requires an intentional, two-analysis comparison', () => {
    const firstAnalysisId = '11111111-1111-4111-8111-111111111111';
    const secondAnalysisId = '22222222-2222-4222-8222-222222222222';
    const parsed = intelligenceTimelineQuerySchema.parse({
      symbol: 'AAPL',
      assetType: 'STOCK',
      horizon: 'SWING',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T00:00:00.000Z',
      limit: '20',
      analysisId: firstAnalysisId,
      compareAnalysisId: secondAnalysisId,
    });

    expect(parsed.limit).toBe(20);
    expect(() => intelligenceTimelineQuerySchema.parse({
      symbol: 'AAPL',
      assetType: 'STOCK',
      analysisId: firstAnalysisId,
    })).toThrow();
    expect(() => intelligenceTimelineQuerySchema.parse({
      symbol: 'AAPL',
      assetType: 'STOCK',
      limit: 51,
    })).toThrow();
    expect(() => intelligenceTimelineQuerySchema.parse({
      symbol: 'AAPL',
      assetType: 'STOCK',
      userId: 'cross-user-id',
    })).toThrow();
  });

  it('enforces the request body byte limit even without content-length', async () => {
    const request = new NextRequest('http://localhost/api/intelligence/analyze', {
      method: 'POST',
      body: JSON.stringify({ value: 'x'.repeat(128) }),
      headers: { 'content-type': 'application/json' },
    });
    await expect(readBoundedJson(request, 32)).rejects.toBeInstanceOf(RangeError);
  });

  it('returns a structured safe error with correlation and no raw exception text', async () => {
    const response = intelligenceErrorResponse({
      code: 'PROVIDER_UNAVAILABLE',
      correlationId: 'correlation-safe-error',
      retryable: true,
    });
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-correlation-id')).toBe('correlation-safe-error');
    expect(body).toEqual({
      ok: false,
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        messageKey: 'intelligence_error_provider_unavailable',
        retryable: true,
      },
      correlationId: 'correlation-safe-error',
    });
    expect(JSON.stringify(body)).not.toContain('apiKey');
  });
});
