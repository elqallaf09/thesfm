import { describe, expect, it } from 'vitest';
import type { FactorResult, IntelligenceEvidence } from '@/domain/intelligence/contracts';
import { chartSnapshotStats, dashboardNews, factorScore, formatDashboardNumber, formatDashboardPrice, formatDashboardTime, rangeForHorizon, safeEvidenceUrl, verifiedSharia } from '@/components/ai-analyst/analysisDashboardModel';
import { DASHBOARD_COPY, DASHBOARD_ENUMS, DASHBOARD_EVIDENCE_LABELS } from '@/components/ai-analyst/analysisDashboardCopy';

const observedAt = '2026-09-29T05:00:00Z';
function evidence(overrides: Partial<IntelligenceEvidence> = {}): IntelligenceEvidence {
  return { id: 'fixture', factor: 'SHARIA', kind: 'OBSERVATION', labelKey: 'intelligence_evidence_verified_sharia_status', value: 'compliant', unit: null, observedAt, source: 'verified-test-source', provider: 'verified-test-source', direction: 'NEUTRAL', significance: 50, ...overrides };
}
function factor(overrides: Partial<FactorResult> = {}): FactorResult {
  return { factor: 'SHARIA', availability: 'AVAILABLE', normalizedScore: 0, directionalBias: 'NEUTRAL', strength: 0, required: false, freshness: { state: 'FRESH', observedAt, ageSeconds: 0, thresholdSeconds: 900 }, evidence: [evidence()], source: 'verified-test-source', provider: 'verified-test-source', operationalReliability: 1, warnings: [], failureReason: null, ...overrides };
}

describe('approved analyst dashboard evidence model', () => {
  it('never supplies replacement prices or scores for unavailable data', () => {
    for (const value of [null, undefined, NaN, Infinity, 0, -1]) expect(formatDashboardPrice(value, 'USD')).toBe('—');
    expect(formatDashboardNumber(null)).toBe('—');
    expect(factorScore(undefined)).toBeNull();
    expect(factorScore(factor({ availability: 'UNAVAILABLE', normalizedScore: 28 }))).toBeNull();
    expect(factorScore(factor({ normalizedScore: NaN }))).toBeNull();
    expect(factorScore(factor({ normalizedScore: 101 }))).toBeNull();
    expect(factorScore(factor({ normalizedScore: 0 }))).toBe(0);
  });

  it('keeps source currency and precision, including Kuwaiti dinar', () => {
    expect(formatDashboardPrice(150, 'USD')).toBe('$150.00');
    expect(formatDashboardPrice(1.234, 'KWD')).toMatch(/KWD\s1\.234/);
    expect(formatDashboardPrice(0.012345, 'USD')).toBe('$0.012345');
    expect(formatDashboardPrice(150, null)).toBe('150.00');
    expect(formatDashboardPrice(150, 'invalid')).toBe('150.00');
  });

  it('only presents sourced, dated, current Sharia classifications', () => {
    expect(verifiedSharia(undefined)).toBe('unavailable');
    expect(verifiedSharia(factor())).toBe('compliant');
    expect(verifiedSharia(factor({ evidence: [evidence({ value: 'non_compliant' })] }))).toBe('non_compliant');
    expect(verifiedSharia(factor({ evidence: [evidence({ value: 'needs_review' })] }))).toBe('needs_review');
    for (const item of [evidence({ source: '' }), evidence({ source: 'unavailable' }), evidence({ observedAt: null }), evidence({ observedAt: 'invalid' }), evidence({ value: 'unclassified' })]) expect(verifiedSharia(factor({ evidence: [item] }))).toBe('unavailable');
    expect(verifiedSharia(factor({ freshness: { state: 'STALE', observedAt, ageSeconds: 1000, thresholdSeconds: 900 } }))).toBe('unavailable');
    expect(verifiedSharia(factor({ availability: 'UNAVAILABLE' }))).toBe('unavailable');
  });

  it('rejects unsafe source links and never assigns aggregate sentiment to headlines', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:password@example.com', '/relative']) expect(safeEvidenceUrl(url)).toBeNull();
    expect(safeEvidenceUrl('https://example.com/article')).toBe('https://example.com/article');
    const reading = factor({ factor: 'NEWS', normalizedScore: -35, evidence: [
      evidence({ id: 'news:headline:0', factor: 'NEWS', labelKey: 'intelligence_evidence_latest_news_headline', value: 'Source headline' }),
      evidence({ id: 'news:source:0', factor: 'NEWS', labelKey: 'intelligence_evidence_news_source_url', value: 'https://example.com/article' }),
    ] });
    const rows = dashboardNews(reading);
    expect(rows).toHaveLength(1);
    expect(rows[0].url).toBe('https://example.com/article');
    expect(rows[0]).not.toHaveProperty('sentiment');
    expect(rows[0]).not.toHaveProperty('impact');
    expect(dashboardNews({ ...reading, availability: 'UNAVAILABLE' })).toEqual([]);
    expect(dashboardNews({ ...reading, evidence: [reading.evidence[0], { ...reading.evidence[1], source: 'different-source' }] })[0].url).toBeNull();
  });

  it('derives period statistics from ordered valid observations without mutating input', () => {
    const snapshot = { range: '1W' as const, currency: 'USD', updatedAt: observedAt, points: [{ date: '2026-09-29', close: 90 }, { date: '2026-09-28', close: 100 }, { date: 'bad-date', close: 1000 }] };
    const stats = chartSnapshotStats(snapshot);
    expect(stats).toMatchObject({ first: 100, last: 90, low: 90, high: 100, change: -10, changePercent: -10 });
    expect(snapshot.points[0].close).toBe(90);
    expect(chartSnapshotStats(null)).toBeNull();
    expect(chartSnapshotStats({ ...snapshot, points: [snapshot.points[0]] })).toBeNull();
    const flat = chartSnapshotStats({ ...snapshot, points: [{ date: '2026-09-28', close: 100 }, { date: '2026-09-29', close: 100 }] });
    expect(flat?.changePercent).toBe(0);
    expect(flat?.path).not.toMatch(/NaN|Infinity/);
  });

  it('uses supported history ranges and Latin digits across locales', () => {
    expect(['INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM'].map(value => rangeForHorizon(value as Parameters<typeof rangeForHorizon>[0]))).toEqual(['1D', '1W', '1M', '1Y', 'ALL']);
    expect(formatDashboardTime(null, 'ar')).toBe('—');
    expect(formatDashboardTime('invalid', 'en')).toBe('—');
    expect(formatDashboardTime(observedAt, 'ar')).not.toMatch(/[٠-٩]/);
  });

  it('keeps Arabic, English and French copy and evidence labels aligned', () => {
    for (const locale of ['en', 'fr'] as const) {
      expect(Object.keys(DASHBOARD_COPY[locale]).sort()).toEqual(Object.keys(DASHBOARD_COPY.ar).sort());
      expect(Object.keys(DASHBOARD_EVIDENCE_LABELS[locale]).sort()).toEqual(Object.keys(DASHBOARD_EVIDENCE_LABELS.ar).sort());
      for (const key of ['direction', 'recommendation', 'risk', 'factors'] as const) expect(Object.keys(DASHBOARD_ENUMS[locale][key]).sort()).toEqual(Object.keys(DASHBOARD_ENUMS.ar[key]).sort());
    }
  });
});
