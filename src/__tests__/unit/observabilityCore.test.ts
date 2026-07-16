import { describe, expect, it, vi } from 'vitest';
import {
  authoritativePercentile,
  batchEvents,
  boundOfflineQueue,
  containsSecretLikeValue,
  errorSignature,
  isDuplicateError,
  normalizeRoute,
  percentile,
  sanitizeErrorText,
  sanitizeUrl,
  shouldSample,
  validateObservabilityBatch,
  validateObservabilityEvent,
} from '@/lib/observability/core';

function event(overrides: Record<string, unknown> = {}) {
  return {
    type: 'web_vital', name: 'LCP', value: 2310, rating: 'good', route: '/projects/3f57a8c2-c1aa-4fd0-b4bc-193c956b2ed1?account=x',
    timestamp: '2026-07-16T10:00:00.000Z', sessionId: 'abcdef1234567890', authenticated: false,
    locale: 'en', theme: 'dark', viewportClass: 'large', deviceClass: 'desktop', browserFamily: 'Chrome',
    networkClass: '4g', deploymentSha: 'abc123', buildVersion: '0.1.0', environment: 'production', ...overrides,
  };
}

describe('observability event privacy and validation', () => {
  it('accepts a strict Web Vital and normalizes its route', () => {
    expect(validateObservabilityEvent(event())).toMatchObject({ type: 'web_vital', name: 'LCP', route: '/projects/[id]' });
  });

  it('rejects unknown fields, secrets, invalid ratings, and oversized batches', () => {
    expect(validateObservabilityEvent(event({ email: 'person@example.com' }))).toBeNull();
    expect(validateObservabilityEvent(event({ failureClass: 'authorization: Bearer abc.secret' }))).toBeNull();
    expect(validateObservabilityEvent(event({ rating: 'excellent' }))).toBeNull();
    expect(validateObservabilityBatch({ events: Array.from({ length: 21 }, () => event()) })).toBeNull();
  });

  it('recognizes secret-like keys and values', () => {
    expect(containsSecretLikeValue({ access_token: 'hidden' })).toBe(true);
    expect(containsSecretLikeValue('Authorization: Bearer hidden')).toBe(true);
    expect(containsSecretLikeValue({ metric: 'LCP' })).toBe(false);
  });
});

describe('route and error sanitization', () => {
  it.each([
    ['/projects/3f57a8c2-c1aa-4fd0-b4bc-193c956b2ed1?tab=finance', '/projects/[id]'],
    ['/companies/private-company-record?token=hidden', '/companies/[companyId]'],
    ['/ebooks/a-user-supplied-slug', '/ebooks/[slug]'],
    ['/invest/add', '/invest/add'],
    ['/projects/ad-calculator', '/projects/ad-calculator'],
  ])('normalizes %s to %s', (input, expected) => expect(normalizeRoute(input)).toBe(expected));

  it('strips query parameters, record IDs, tokens, and newlines from errors', () => {
    const safe = sanitizeErrorText('Failed https://www.the-sfm.com/projects/3f57a8c2-c1aa-4fd0-b4bc-193c956b2ed1?token=x\nBearer secret');
    expect(safe).toContain('/projects/[id]');
    expect(safe).not.toContain('?token');
    expect(safe).not.toContain('secret');
    expect(sanitizeUrl('https://www.the-sfm.com/reports/123456?private=yes')).toBe('/reports/[id]');
  });

  it('produces stable non-message error fingerprints and deduplicates within a window', () => {
    expect(errorSignature('Request 123 failed')).toBe(errorSignature('Request 456 failed'));
    const seen = new Map<string, number>();
    expect(isDuplicateError(seen, 'err_12345678', 1_000, 500)).toBe(false);
    expect(isDuplicateError(seen, 'err_12345678', 1_200, 500)).toBe(true);
    expect(isDuplicateError(seen, 'err_12345678', 1_600, 500)).toBe(false);
  });
});

describe('sampling, batching, queues, and percentiles', () => {
  it('honors bounded sampling rates deterministically', () => {
    expect(shouldSample(0, () => 0)).toBe(false);
    expect(shouldSample(1, () => 0.999)).toBe(true);
    expect(shouldSample(0.1, () => 0.09)).toBe(true);
    expect(shouldSample(0.1, () => 0.11)).toBe(false);
  });

  it('batches at 20 and bounds offline queues by size and age', () => {
    expect(batchEvents(Array.from({ length: 41 }, (_, index) => index))).toHaveLength(3);
    expect(batchEvents(Array.from({ length: 41 }, (_, index) => index))[0]).toHaveLength(20);
    const entries = Array.from({ length: 50 }, (_, index) => ({ queuedAt: 1_000 + index, index }));
    const bounded = boundOfflineQueue(entries, 1_050, 40, 30);
    expect(bounded).toHaveLength(30);
    expect(bounded[0].index).toBe(20);
  });

  it('calculates percentiles and suppresses authoritative values below the minimum sample count', () => {
    expect(percentile([1, 2, 3, 4], 0.75)).toBe(3.25);
    expect(authoritativePercentile([1, 2, 3], 0.75, 4)).toBeNull();
    expect(authoritativePercentile([1, 2, 3, 4], 0.75, 4)).toBe(3.25);
  });
});
