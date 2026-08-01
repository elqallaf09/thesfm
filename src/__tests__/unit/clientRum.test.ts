import { describe, expect, it } from 'vitest';
import {
  browserFamily,
  createRumMetricEvent,
  deviceClass,
  isSampledRumSession,
  normalizeRumSampleRate,
  observabilityEnvironment,
  reportClientRumMetric,
  subscribeClientRumMetric,
  viewportClass,
  type ClientRumContext,
} from '@/lib/observability/clientRum';

const context: ClientRumContext = {
  authenticated: true,
  browserFamily: 'Chrome',
  buildVersion: '1.0.0',
  deploymentSha: 'abc123',
  deviceClass: 'desktop',
  environment: 'preview',
  locale: 'ar',
  networkClass: '4g',
  route: '/projects/private-project-id?token=never-store-this',
  sessionId: 'session_1234',
  theme: 'dark',
  viewportClass: 'large',
};

describe('client RUM metadata', () => {
  it('creates a schema-compatible Core Web Vital event without navigation payloads', () => {
    const event = createRumMetricEvent({
      id: 'v4-123',
      label: 'web-vital',
      name: 'INP',
      rating: 'good',
      value: 92,
    }, context, new Date('2026-07-31T20:00:00.000Z'));

    expect(event).toMatchObject({
      type: 'web_vital',
      name: 'INP',
      value: 92,
      rating: 'good',
      correlationId: 'v4-123',
      timestamp: '2026-07-31T20:00:00.000Z',
    });
    expect(event).not.toHaveProperty('url');
  });

  it('classifies Next hydration and route metrics separately', () => {
    expect(createRumMetricEvent({ id: 'h', label: 'custom', name: 'Next.js-hydration', value: 10 }, context).type)
      .toBe('hydration');
    expect(createRumMetricEvent({ id: 'r', label: 'custom', name: 'Next.js-route-change-to-render', value: 12 }, context).type)
      .toBe('route_transition');
    const clientError = createRumMetricEvent({
      id: 'err_12345678',
      label: 'custom',
      name: 'window-error',
      type: 'client_error',
      value: 1,
    }, context);
    expect(clientError.type).toBe('client_error');
    expect(clientError.errorSignature).toBe('err_12345678');
    expect(clientError.navigationKind).toBeUndefined();
  });

  it('delivers custom metrics only while a reporter is subscribed', () => {
    const metrics: string[] = [];
    const unsubscribe = subscribeClientRumMetric(metric => metrics.push(metric.name));
    reportClientRumMetric({ id: 'one', label: 'custom', name: 'Trader-ready', value: 12 });
    unsubscribe();
    reportClientRumMetric({ id: 'two', label: 'custom', name: 'ignored', value: 1 });
    expect(metrics).toEqual(['Trader-ready']);
  });

  it('normalizes device, browser, environment, and sample controls deterministically', () => {
    expect(browserFamily('Mozilla/5.0 Edg/150.0 Chrome/150.0')).toBe('Edge');
    expect(browserFamily('Mozilla/5.0 Version/18.0 Safari/605.1.15')).toBe('Safari');
    expect(viewportClass(390)).toBe('small');
    expect(viewportClass(800)).toBe('medium');
    expect(deviceClass(1440)).toBe('desktop');
    expect(observabilityEnvironment('www.the-sfm.com')).toBe('production');
    expect(observabilityEnvironment('feature-1.vercel.app')).toBe('preview');
    expect(normalizeRumSampleRate('2')).toBe(1);
    expect(normalizeRumSampleRate('-1')).toBe(0);
    expect(isSampledRumSession('stable-session', 1)).toBe(true);
    expect(isSampledRumSession('stable-session', 0)).toBe(false);
  });
});
