import { describe, expect, it } from 'vitest';
import { buildEvidenceSnapshotTrace, parseEvidenceSnapshotTrace } from '../evidenceSnapshotTrace';

const readiness = {
  overallScore: 74,
  level: 'medium' as const,
  finance: { score: 80, ready: true, issues: [] },
  trader: { score: 67, ready: true, issues: [] },
  business: { score: 75, ready: true, issues: [] },
  freshness: {
    finance: { asOf: '2026-09-13T10:00:00.000Z', ageDays: 1, stale: false, veryStale: false, available: true },
    trader: { asOf: '2026-09-14T05:00:00.000Z', ageDays: 0, stale: false, veryStale: false, available: true },
    business: { asOf: null, ageDays: null, stale: true, veryStale: true, available: true },
  },
  nextActions: [], confirmations: [], invalidatedConfirmations: [],
};

const provenance = {
  generatedAt: '2026-09-14T05:00:00.000Z',
  entries: [
    { workspace: 'finance' as const, source: 'monthly_income_sources' as const, recordCount: 2, asOf: '2026-09-13T10:00:00.000Z', ageDays: 1, stale: false, veryStale: false, readinessScore: 80 },
    { workspace: 'trader' as const, source: 'market_watchlist' as const, recordCount: 4, asOf: '2026-09-14T05:00:00.000Z', ageDays: 0, stale: false, veryStale: false, readinessScore: 67 },
  ],
};

describe('evidence snapshot trace', () => {
  it('stores only privacy-safe evidence metadata for historical explanation', () => {
    const snapshot = buildEvidenceSnapshotTrace({
      code: 'market_attention_vs_low_liquidity', severity: 'warning', actionUrl: '/dashboard', explainUrl: '/economic-intelligence',
      sources: ['finance', 'trader'], fingerprint: 'market_attention_vs_low_liquidity:warning:stable',
    }, readiness, provenance, new Date('2026-09-14T05:30:00.000Z'));

    expect(snapshot.version).toBe(1);
    expect(snapshot.priority?.sources).toEqual(['finance', 'trader']);
    expect(snapshot.provenance[0]).toEqual(expect.objectContaining({ source: 'monthly_income_sources', recordCount: 2 }));
    expect(JSON.stringify(snapshot)).not.toContain('monthlyIncome');
    expect(JSON.stringify(snapshot)).not.toContain('monthlySurplus');
    expect(JSON.stringify(snapshot)).not.toContain('providerSecret');
  });

  it('treats old history without a stored snapshot as unavailable', () => {
    expect(parseEvidenceSnapshotTrace(undefined)).toBeNull();
    expect(parseEvidenceSnapshotTrace({ version: 0 })).toBeNull();
  });
});
