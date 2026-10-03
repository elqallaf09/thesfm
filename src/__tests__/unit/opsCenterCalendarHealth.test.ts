import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getReport } = vi.hoisted(() => ({ getReport: vi.fn() }));
vi.mock('@/lib/providers/economic-calendar', () => ({ getEconomicCalendarHealthReport: getReport }));
import { getCalendarHealthMeasurement } from '@/lib/admin/opsCenter/calendarHealth';

describe('calendar operational evidence', () => {
  beforeEach(() => { getReport.mockReset(); });

  it('reports absence of a fresh measurement without fabricating maintenance or an outage', async () => {
    getReport.mockResolvedValue(null);
    expect(await getCalendarHealthMeasurement()).toMatchObject({
      status: 'unmeasured', evidence: [{ checkedAt: null, lastSuccessAt: null, scope: 'none' }],
    });
  });

  it('retains the affected provider, real timestamps and safe failure code for a partial calendar', async () => {
    getReport.mockResolvedValue({
      status: 'success', partial: true, stale: false, checkedAt: '2026-10-03T21:00:00Z',
      sources: [
        { provider: 'bls', status: 'success', count: 10, checkedAt: '2026-10-03T21:00:00Z', lastSuccessfulUpdate: '2026-10-03T21:00:00Z', errorCode: null },
        { provider: 'fmp', status: 'stale', count: 4, checkedAt: '2026-10-03T21:00:00Z', lastSuccessfulUpdate: '2026-10-03T19:00:00Z', errorCode: 'http_403' },
      ],
    });
    const measurement = await getCalendarHealthMeasurement();
    expect(measurement.status).toBe('partial');
    expect(measurement.evidence?.[1]).toMatchObject({
      provider: 'fmp', status: 'partial', reason: 'http_403',
      lastSuccessAt: '2026-10-03T19:00:00Z', checkedAt: '2026-10-03T21:00:00Z',
    });
  });

  it('does not place arbitrary upstream payloads or credentials into displayed error codes', async () => {
    getReport.mockResolvedValue({
      status: 'provider_error', sources: [{ provider: 'fmp', status: 'failed', checkedAt: '2026-10-03T21:00:00Z', lastSuccessfulUpdate: null, errorCode: 'https://example.test/?apikey=secret' }],
    });
    const measurement = await getCalendarHealthMeasurement();
    expect(measurement.status).toBe('failed');
    expect(measurement.evidence?.[0].reason).toBeNull();
    expect(JSON.stringify(measurement)).not.toContain('secret');
  });
});
