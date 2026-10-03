import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OperationsCenterState, OpsAction, OpsHealthEvidence, RootCauseIssue } from '@/lib/admin/opsCenter/types';
import { ActionCenterList } from '@/app/sfm-admin-control/market-diagnostics/components/ActionCenterList';
import { DiagnosticIssueSections } from '@/app/sfm-admin-control/market-diagnostics/components/DiagnosticIssueSections';
import { ErrorCenterTable } from '@/app/sfm-admin-control/market-diagnostics/components/ErrorCenterTable';
import { FeatureHealthGrid } from '@/app/sfm-admin-control/market-diagnostics/components/FeatureHealthGrid';
import { HealthScoreCard } from '@/app/sfm-admin-control/market-diagnostics/components/HealthScoreCard';

beforeEach(() => { vi.stubGlobal('React', React); });
afterEach(() => { vi.unstubAllGlobals(); });

const checkTime = '2026-10-03T21:00:00.000Z';
const successTime = '2026-10-03T20:00:00.000Z';

function overview(overrides: Partial<OperationsCenterState['overview']> = {}): OperationsCenterState['overview'] {
  return {
    overall: 'unmeasured', healthScorePercent: null, criticalIssueCount: 0, warningCount: 0,
    healthyServiceCount: 0, lastSyncAt: null, processUptimeSeconds: 0,
    measuredServiceCount: 0, eligibleServiceCount: 15, measurementCoveragePercent: 0,
    measurementGapCount: 15, ...overrides,
  };
}

function evidence(overrides: Partial<OpsHealthEvidence> = {}): OpsHealthEvidence {
  return {
    source: 'runtime observation', scope: 'runtime', capability: 'quotes', provider: 'sample-provider',
    status: 'partial', checkedAt: checkTime, lastSuccessAt: successTime,
    reasonKey: null, reason: 'request_timeout', ...overrides,
  };
}

function issue(overrides: Partial<RootCauseIssue> = {}): RootCauseIssue {
  return {
    id: 'incident', kind: 'incident', problemKey: 'current_service_failure', problemParams: {},
    severity: 'critical', rootCauseKey: 'recorded_failure', rootCauseParams: {},
    affectedFeature: 'ai_services', affectedProvider: null, firstOccurrence: null, lastOccurrence: checkTime,
    suggestedFixKey: 'retry_check', retryAvailable: true, expectedImpactKey: 'service_impact', ...overrides,
  };
}

describe('Operations Center presentation of measured health', () => {
  it('does not present a numeric health score when no eligible service was measured', () => {
    const html = renderToStaticMarkup(<HealthScoreCard overview={overview()} />).replace(/<style[\s\S]*?<\/style>/g, '');
    expect(html).toContain('ops_center_score_unavailable');
    expect(html).toContain('ops_center_health_unmeasured');
    expect(html).toContain('<bdi dir="ltr">0 / 15</bdi>');
    expect(html).not.toContain('100%');
  });

  it('shows the measured score and its coverage as separate values', () => {
    const html = renderToStaticMarkup(<HealthScoreCard overview={overview({
      overall: 'degraded', healthScorePercent: 91, measuredServiceCount: 11,
      measurementCoveragePercent: 73, measurementGapCount: 4,
    })} />);
    expect(html).toContain('<bdi dir="ltr">91%</bdi>');
    expect(html).toContain('<bdi dir="ltr">73%</bdi>');
    expect(html).toContain('<bdi dir="ltr">11 / 15</bdi>');
    expect(html).toContain('ops_center_score_method');
  });

  it('keeps partial reasons, sources and success times visible and makes every remaining check accessible', () => {
    const html = renderToStaticMarkup(<FeatureHealthGrid rows={[{
      feature: 'market_data', status: 'partial', detailKey: 'feature_is_partial', evidence: [
        evidence({ status: 'healthy', capability: 'profiles', source: 'healthy fallback', reason: null }),
        evidence({ capability: 'historical_prices' }),
        evidence({ capability: 'forex', status: 'unmeasured', reason: null, lastSuccessAt: null }),
        evidence({ capability: 'quotes', status: 'failed', reason: 'upstream_unavailable' }),
      ],
    }]} />);
    const initiallyVisible = html.split('<details')[0];
    expect(initiallyVisible).toContain('feature_is_partial');
    expect(initiallyVisible).toContain('request_timeout');
    expect(initiallyVisible).toContain('upstream_unavailable');
    expect(initiallyVisible).toContain('sample-provider');
    expect(initiallyVisible).toContain(`dateTime="${successTime}"`);
    expect(initiallyVisible).toContain('ops_center_evidence_reason_unknown');
    expect(initiallyVisible).not.toContain('title=');
    expect(html).toContain('ops_center_evidence_more');
    expect(html).toContain('healthy fallback');
    expect(html).toContain('ops_center_feature_health_unmeasured');
  });

  it('separates missing observations from active incidents in the diagnostic list', () => {
    const html = renderToStaticMarkup(<DiagnosticIssueSections issues={[
      issue({ id: 'gap', kind: 'measurement_gap', severity: 'info', problemKey: 'missing_observation' }),
      issue(),
    ]} />);
    const gapHeading = html.indexOf('ops_center_measurement_gaps</h3>');
    const separator = gapHeading === -1 ? html.indexOf('ops_center_measurement_gaps ') : gapHeading;
    expect(separator).toBeGreaterThan(html.indexOf('current_service_failure'));
    expect(html.indexOf('missing_observation')).toBeGreaterThan(separator);
    expect(html).toContain('ops_center_measurement_gaps_description');
  });

  it('does not count measurement gaps as current errors or claim zero errors for an unmonitored category', () => {
    const byCategory: OperationsCenterState['errorCenter']['byCategory'] = {
      provider: [], api: [], shariah: [], email: [], database: [], notifications: [], storage: [],
      ai: [
        { id: 'failed', category: 'ai', kind: 'incident', severity: 'critical', occurredAt: checkTime, retryAvailable: true, logKey: 'ai_failed', recommendationKey: 'retry' },
        { id: 'gap', category: 'ai', kind: 'measurement_gap', severity: 'info', occurredAt: null, retryAvailable: true, logKey: 'vision_unmeasured', recommendationKey: 'check' },
      ],
    };
    const html = renderToStaticMarkup(<ErrorCenterTable byCategory={byCategory} notInstrumentedCategories={['storage']} />);
    const aiCard = html.match(/<article[^>]*><strong>ops_center_error_category_ai<\/strong>([\s\S]*?)<\/article>/)?.[1];
    const storageCard = html.match(/<article[^>]*><strong>ops_center_error_category_storage<\/strong>([\s\S]*?)<\/article>/)?.[1];
    expect(aiCard).toContain('<bdi dir="ltr">1</bdi> ops_center_error_total');
    expect(aiCard).toContain('<bdi dir="ltr">1</bdi> ops_center_measurement_gaps');
    expect(storageCard).toContain('ops_center_feature_health_uninstrumented');
    expect(storageCard).not.toContain('ops_center_error_total');
  });
});

describe('Operations Center action feedback', () => {
  const actions: OpsAction[] = [
    { id: 'providers', labelKey: 'retry_providers', kind: 'retry_market_providers', available: true },
    { id: 'recommendations', labelKey: 'recalculate', kind: 'recalculate_recommendations', available: false, disabledReasonKey: 'computed_on_request' },
  ];

  it('exposes the disabled reason as readable text and announces a pending action', () => {
    const html = renderToStaticMarkup(<ActionCenterList actions={actions} onAction={() => {}} actionState={{ pendingActionId: 'providers', result: null }} />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<p role="status">ops_center_action_running</p>');
    expect(html).toContain('<p id="ops-action-reason-recommendations">computed_on_request</p>');
    expect(html).toContain('aria-describedby="ops-action-reason-recommendations"');
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
  });

  it.each([true, false])('shows a dated result with accessible feedback when ok=%s', ok => {
    const html = renderToStaticMarkup(<ActionCenterList actions={actions} onAction={() => {}} actionState={{
      pendingActionId: null, result: { actionId: 'providers', ok, messageKey: ok ? 'provider_check_finished' : 'provider_check_failed', completedAt: checkTime },
    }} />);
    expect(html).toContain(`role="${ok ? 'status' : 'alert'}"`);
    expect(html).toContain(ok ? 'provider_check_finished' : 'provider_check_failed');
    expect(html).toContain(`dateTime="${checkTime}"`);
  });
});
