import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAiAnalystFeatureEnabled } from '@/lib/ai-analyst/features';
import { intelligenceCacheScopeKey } from '@/lib/intelligence/cache';
import {
  INTELLIGENCE_EXPERIENCE_STATES,
  intelligencePresentation,
  intelligenceStateFromError,
} from '@/lib/intelligence/presentation';
import { calculateFreshness, expirationFrom } from '@/lib/intelligence/freshness';

const asset = { canonicalSymbol: 'AAPL', assetType: 'STOCK' as const, market: 'US' };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('intelligence production readiness contracts', () => {
  it('maps each explicit product state to safe Arabic and English content', () => {
    for (const state of INTELLIGENCE_EXPERIENCE_STATES) {
      const arabic = intelligencePresentation(state, 'ar');
      const english = intelligencePresentation(state, 'en');
      expect(arabic.code).toBe(state);
      expect(arabic.title).not.toHaveLength(0);
      expect(arabic.description).not.toHaveLength(0);
      expect(english.action).not.toHaveLength(0);
    }
    expect(intelligenceStateFromError({ status: 401 })).toBe('unauthenticated');
    expect(intelligenceStateFromError({ code: 'APPLICATION_RATE_LIMITED' })).toBe('application_rate_limited');
    expect(intelligenceStateFromError({ code: 'DATABASE_ERROR' })).toBe('database_error');
    expect(intelligenceStateFromError({ code: 'PROVIDER_UNAVAILABLE' })).toBe('provider_unavailable');
  });

  it('scopes cache keys by private owner, normalized market, type, and horizon', () => {
    const owner = intelligenceCacheScopeKey({ asset, horizon: 'SWING', scope: 'PRIVATE', userId: 'user-a' });
    const otherOwner = intelligenceCacheScopeKey({ asset, horizon: 'SWING', scope: 'PRIVATE', userId: 'user-b' });
    const shared = intelligenceCacheScopeKey({ asset, horizon: 'SWING', scope: 'SHARED', userId: null });
    const changedMarket = intelligenceCacheScopeKey({ asset: { ...asset, market: 'KW' }, horizon: 'SWING', scope: 'PRIVATE', userId: 'user-a' });

    expect(owner).toBe('v1:private:USER-A:AAPL:STOCK:US:SWING');
    expect(owner).not.toBe(otherOwner);
    expect(owner).not.toBe(shared);
    expect(owner).not.toBe(changedMarket);
  });

  it('keeps freshness and expiry boundaries deterministic', () => {
    const generatedAt = '2026-07-20T10:00:00.000Z';
    expect(calculateFreshness({ observedAt: generatedAt, thresholdSeconds: 900, providerState: 'LIVE', now: Date.parse(generatedAt) + 900_000 }).state).toBe('FRESH');
    expect(calculateFreshness({ observedAt: generatedAt, thresholdSeconds: 900, providerState: 'LIVE', now: Date.parse(generatedAt) + 901_000 }).state).toBe('DELAYED');
    expect(expirationFrom(generatedAt, 900)).toBe('2026-07-20T10:15:00.000Z');
  });

  it('never enables unfinished analyst surfaces in production', () => {
    vi.stubEnv('NEXT_PUBLIC_AI_ANALYST_INTERNAL_SURFACES', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isAiAnalystFeatureEnabled('marketMap')).toBe(false);
    expect(isAiAnalystFeatureEnabled('futureTools')).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(isAiAnalystFeatureEnabled('marketMap')).toBe(true);
  });
});
