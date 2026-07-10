import { describe, expect, it } from 'vitest';
import { buildErrorEnvelope, buildFeatureEnvelope, isValidFeatureDataStatus } from '@/lib/market-state/envelope';
import type { ProviderResolution } from '@/lib/market-state/types';

const resolution: ProviderResolution = {
  selected: 'fmp',
  attempted: [{ provider: 'fmp', outcome: 'success', reason: null }],
  fallbackUsed: false,
  reason: null,
  context: 'trader_terminal',
  timestamp: '2026-07-10T12:00:00.000Z',
  cached: false,
  delayed: false,
};

describe('buildFeatureEnvelope', () => {
  it('produces a JSON-serializable shape matching the task spec fields', () => {
    const envelope = buildFeatureEnvelope({
      feature: 'quotes',
      status: 'partial',
      provider: resolution,
      freshness: { asOf: '2026-07-10T12:00:00.000Z', ageSeconds: 5, isStale: false, isDelayed: false, thresholdSeconds: 60 },
      completeness: { requested: 25, returned: 18, missing: 7, percentage: 72 },
      data: [],
    });
    expect(() => JSON.stringify(envelope)).not.toThrow();
    expect(envelope).toMatchObject({
      feature: 'quotes',
      status: 'partial',
      completeness: { requested: 25, returned: 18, missing: 7, percentage: 72 },
    });
  });

  it('marks success:false for error and unavailable statuses, true otherwise', () => {
    const base = { feature: 'news', provider: resolution, freshness: { asOf: null, ageSeconds: null, isStale: true, isDelayed: false, thresholdSeconds: 0 }, completeness: { requested: 0, returned: 0, missing: 0, percentage: 0 }, data: null };
    expect(buildFeatureEnvelope({ ...base, status: 'error' }).success).toBe(false);
    expect(buildFeatureEnvelope({ ...base, status: 'unavailable' }).success).toBe(false);
    expect(buildFeatureEnvelope({ ...base, status: 'empty' }).success).toBe(true);
    expect(buildFeatureEnvelope({ ...base, status: 'fresh' }).success).toBe(true);
  });
});

describe('buildErrorEnvelope', () => {
  it('never includes raw stack traces or HTML, only a fixed code/messageKey pair', () => {
    const envelope = buildErrorEnvelope('quotes', 'provider_rate_limited', 'provider_rate_limited');
    expect(envelope.success).toBe(false);
    expect(envelope.status).toBe('error');
    expect(envelope.errors).toEqual([{ code: 'provider_rate_limited', messageKey: 'provider_rate_limited' }]);
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toMatch(/<html|<!doctype/i);
    expect(serialized).not.toMatch(/at Object\.|node_modules/); // no stack trace leakage
  });
});

describe('isValidFeatureDataStatus', () => {
  it('accepts every canonical status and rejects arbitrary strings', () => {
    expect(isValidFeatureDataStatus('fresh')).toBe(true);
    expect(isValidFeatureDataStatus('unavailable')).toBe(true);
    expect(isValidFeatureDataStatus('http_429')).toBe(false);
    expect(isValidFeatureDataStatus(undefined)).toBe(false);
  });
});
