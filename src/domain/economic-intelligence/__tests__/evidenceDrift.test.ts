import { describe, expect, it } from 'vitest';
import { compareHistoricalEvidence } from '../evidenceDrift';
import type { EconomicIntelligenceReadiness } from '../readiness';
import type { EvidenceProvenance } from '../evidenceProvenance';
import type { EvidenceSnapshotTrace } from '../evidenceSnapshotTrace';

const readiness: EconomicIntelligenceReadiness = {
  overallScore: 80,
  level: 'high',
  finance: { score: 90, ready: true, issues: [] },
  trader: { score: 70, ready: true, issues: [] },
  business: { score: 60, ready: false, issues: [] },
  freshness: {
    finance: { asOf: '2026-09-14T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false, available: true },
    trader: { asOf: '2026-09-14T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false, available: true },
    business: { asOf: '2026-09-14T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false, available: true },
  },
  nextActions: [],
  confirmations: [],
  invalidatedConfirmations: [],
};

const provenance: EvidenceProvenance = {
  generatedAt: '2026-09-14T12:00:00.000Z',
  entries: [
    { workspace: 'finance', source: 'debts', recordCount: 2, asOf: '2026-09-14T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false, readinessScore: 90 },
    { workspace: 'trader', source: 'market_watchlist', recordCount: 1, asOf: '2026-09-14T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false, readinessScore: 70 },
  ],
};

const snapshot: EvidenceSnapshotTrace = {
  version: 1,
  capturedAt: '2026-08-01T12:00:00.000Z',
  priority: null,
  readiness: { overall: 55, finance: 60, trader: 70, business: 20 },
  provenance: [
    { workspace: 'finance', source: 'debts', recordCount: 1, asOf: '2026-07-01T00:00:00.000Z', ageDays: 31, stale: true, veryStale: false },
    { workspace: 'trader', source: 'market_watchlist', recordCount: 1, asOf: '2026-08-01T00:00:00.000Z', ageDays: 0, stale: false, veryStale: false },
  ],
};

describe('compareHistoricalEvidence', () => {
  it('describes drift without causal claims', () => {
    const drift = compareHistoricalEvidence(snapshot, readiness, provenance);
    expect(drift.available).toBe(true);
    expect(drift.causalClaim).toBe(false);
    expect(drift.readiness.find(item => item.workspace === 'overall')).toMatchObject({ historical: 55, current: 80, delta: 25, direction: 'improved' });
    expect(drift.sources.find(item => item.source === 'debts')).toMatchObject({ recordCountDelta: 1, direction: 'improved' });
    expect(drift.sources.find(item => item.source === 'market_watchlist')).toMatchObject({ recordCountDelta: 0, direction: 'unchanged' });
  });

  it('reports historical drift as unavailable when the old record has no snapshot', () => {
    const drift = compareHistoricalEvidence(null, readiness, provenance);
    expect(drift.available).toBe(false);
    expect(drift.readiness).toEqual([]);
    expect(drift.sources).toEqual([]);
    expect(drift.causalClaim).toBe(false);
  });
});
