import { describe, expect, it } from 'vitest';
import { summarizeResolutionHistory } from '@/lib/dashboard/resolutionIntelligence';

describe('summarizeResolutionHistory', () => {
  it('separates active and resolved events and detects recurring risk families', () => {
    const summary = summarizeResolutionHistory([
      { event_key: 'risk:low-liquidity:under-1m', created_at: '2026-01-01', resolved_at: '2026-01-03' },
      { event_key: 'risk:low-liquidity:1-3m', created_at: '2026-02-01', resolved_at: null },
      { event_key: 'decision:11111111-1111-4111-8111-111111111111:high_risk:80', created_at: '2026-03-01', resolved_at: '2026-03-02' },
    ]);

    expect(summary.activeCount).toBe(1);
    expect(summary.resolvedCount).toBe(2);
    expect(summary.recurringFamilies).toEqual([
      { family: 'risk:low-liquidity', occurrences: 2, resolved: 1 },
    ]);
    expect(summary.latestResolved).toHaveLength(2);
  });
});
