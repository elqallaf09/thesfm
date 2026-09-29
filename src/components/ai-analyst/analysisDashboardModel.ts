import type { AnalysisResult, DirectionalBias, FactorResult, IntelligenceEvidence, IntelligenceFactorKey } from '@/domain/intelligence/contracts';

export type DashboardRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';
export type VerifiedChartSnapshot = {
  range: DashboardRange;
  points: Array<{ date: string; close: number }>;
  currency: string | null;
  updatedAt: string | null;
};
export type DashboardTone = 'positive' | 'negative' | 'neutral' | 'warning';
export type ShariaReading = 'compliant' | 'non_compliant' | 'needs_review' | 'unavailable';

export function rangeForHorizon(horizon: AnalysisResult['horizon']): DashboardRange {
  return ({ INTRADAY: '1D', SHORT_TERM: '1W', SWING: '1M', POSITION: '1Y', LONG_TERM: 'ALL' } as const)[horizon];
}

export function factorIsCurrent(factor: FactorResult | undefined): factor is FactorResult {
  return Boolean(factor && factor.availability !== 'UNAVAILABLE' && !['STALE', 'UNAVAILABLE'].includes(factor.freshness.state));
}

export function factorScore(factor: FactorResult | undefined): number | null {
  if (!factorIsCurrent(factor)) return null;
  const score = factor.normalizedScore;
  return typeof score === 'number' && Number.isFinite(score) && score >= -100 && score <= 100 ? score : null;
}

export function directionTone(direction: DirectionalBias): DashboardTone {
  return direction === 'BULLISH' ? 'positive' : direction === 'BEARISH' ? 'negative' : direction === 'MIXED' ? 'warning' : 'neutral';
}

/** Never infer a religious classification from the asset name or a numerical score. */
export function verifiedSharia(factor: FactorResult | undefined): ShariaReading {
  if (!factorIsCurrent(factor)) return 'unavailable';
  const evidence = factor.evidence.find(item => item.labelKey === 'intelligence_evidence_verified_sharia_status');
  if (!evidence?.source || evidence.source === 'unavailable' || !evidence.observedAt || !Number.isFinite(Date.parse(evidence.observedAt))) return 'unavailable';
  return evidence.value === 'compliant' || evidence.value === 'non_compliant' || evidence.value === 'needs_review' ? evidence.value : 'unavailable';
}

export function formatDashboardNumber(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value) : '—';
}

export function formatDashboardPrice(value: number | null | undefined, currency: string | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
  const digits = value < 1 ? 6 : currency === 'KWD' || currency === 'BHD' || currency === 'OMR' ? 3 : 2;
  try {
    if (currency) return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch { /* An unknown currency must not turn a valid quote into a render error. */ }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatDashboardTime(value: string | null, locale: 'ar' | 'en' | 'fr'): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short', numberingSystem: 'latn' }).format(new Date(value));
}

export function safeEvidenceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Headline sentiment is not in this contract; an article must remain unclassified. */
export function dashboardNews(factor: FactorResult | undefined) {
  if (!factorIsCurrent(factor)) return [];
  return factor.evidence.filter(item => item.labelKey === 'intelligence_evidence_latest_news_headline' && typeof item.value === 'string' && item.value.trim()).map(item => {
    const sourceId = item.id.replace(/^news:headline:/, 'news:source:');
    const source = factor.evidence.find(candidate => candidate.id === sourceId && candidate.labelKey === 'intelligence_evidence_news_source_url' && candidate.source === item.source);
    return { id: item.id, headline: String(item.value), source: item.source, observedAt: item.observedAt, url: safeEvidenceUrl(source?.value) };
  }).sort((a, b) => (Date.parse(b.observedAt ?? '') || 0) - (Date.parse(a.observedAt ?? '') || 0)).slice(0, 5);
}

export function dashboardEvidence(result: AnalysisResult, key: IntelligenceFactorKey): IntelligenceEvidence[] {
  const factor = result.factors.find(item => item.factor === key);
  if (!factorIsCurrent(factor)) return [];
  return [...factor.evidence].filter(item => item.value !== null && !/(?:_url$|macro_(?:country|previous)_)/.test(item.labelKey))
    .sort((a, b) => b.significance - a.significance).slice(0, 3);
}

/** This is the selected history period's change, never labelled as a daily quote change. */
export function chartSnapshotStats(snapshot: VerifiedChartSnapshot | null) {
  const points = snapshot?.points.filter(point => Number.isFinite(point.close) && point.close > 0 && Number.isFinite(Date.parse(point.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) ?? [];
  if (points.length < 2) return null;
  const first = points[0].close;
  const last = points[points.length - 1].close;
  const low = points.reduce((value, point) => Math.min(value, point.close), Infinity);
  const high = points.reduce((value, point) => Math.max(value, point.close), -Infinity);
  const span = high - low;
  const sample = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 80)) === 0);
  const path = sample.map((point, index) => `${index ? 'L' : 'M'}${(index / (sample.length - 1) * 220).toFixed(2)},${(span ? 66 - (point.close - low) / span * 58 : 37).toFixed(2)}`).join(' ');
  return { first, last, low, high, change: last - first, changePercent: (last - first) / first * 100, path };
}
