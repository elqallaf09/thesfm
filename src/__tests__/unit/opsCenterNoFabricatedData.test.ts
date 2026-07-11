import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const read = (relativePath: string) => readFileSync(join(projectRoot, relativePath), 'utf8');

const symbolCoverage = read('src/lib/admin/opsCenter/symbolCoverage.ts');
const aggregate = read('src/lib/admin/opsCenter/aggregateOperationsCenter.ts');
const performanceTab = read('src/app/sfm-admin-control/market-diagnostics/tabs/PerformanceTab.tsx');
const aiTab = read('src/app/sfm-admin-control/market-diagnostics/tabs/AiTab.tsx');
const backgroundJobsTab = read('src/app/sfm-admin-control/market-diagnostics/tabs/BackgroundJobsTab.tsx');
const errorCenterTable = read('src/app/sfm-admin-control/market-diagnostics/components/ErrorCenterTable.tsx');
const symbolCoverageCard = read('src/app/sfm-admin-control/market-diagnostics/components/SymbolCoverageCard.tsx');
const notInstrumentedNote = read('src/app/sfm-admin-control/market-diagnostics/components/NotInstrumentedNote.tsx');
const rootCauseAccordion = read('src/app/sfm-admin-control/market-diagnostics/components/RootCauseAccordion.tsx');
const healthScoreCard = read('src/app/sfm-admin-control/market-diagnostics/components/HealthScoreCard.tsx');
const featureHealthGrid = read('src/app/sfm-admin-control/market-diagnostics/components/FeatureHealthGrid.tsx');
const jobSourceCard = read('src/app/sfm-admin-control/market-diagnostics/components/JobSourceCard.tsx');

/**
 * The user's explicit decision for this task: never fabricate metrics, simulated health states,
 * placeholder counts, fake background jobs, or estimated health scores. Every concept confirmed to
 * have no real backing data must go through notInstrumented()/NotInstrumentedNote instead.
 */
describe('Operations Center never fabricates data for unmeasured concepts', () => {
  it('marks every confirmed-unmeasurable symbol-coverage field as not-instrumented, never a bare number', () => {
    for (const field of ['fullySupported', 'technicalAvailable', 'newsAvailable', 'recommendationsAvailable', 'unsupported']) {
      expect(symbolCoverage, `${field} must be built via notInstrumented(...)`).toMatch(new RegExp(`${field}:\\s*notInstrumented\\(`));
    }
  });

  it('marks generic background-job-queue, API route timing, cache hit rate, most-expensive-functions, and background-queue-depth as not-instrumented in the aggregator', () => {
    for (const field of ['genericQueue', 'apiRouteTiming', 'cacheHitRate', 'mostExpensiveFunctions', 'backgroundQueueDepth']) {
      expect(aggregate, `${field} must be built via notInstrumented(...)`).toMatch(new RegExp(`${field}:\\s*notInstrumented\\(`));
    }
  });

  it('marks the AI health score as not-instrumented — only real usage/quota counts are shown', () => {
    expect(aggregate).toMatch(/healthScore:\s*notInstrumented\(/);
    expect(aiTab).toContain('aiUsage.healthScore');
    expect(aiTab).not.toMatch(/aiUsage\.healthScore\.value/);
  });

  it('every NotInstrumented-consuming component renders the shared NotInstrumentedNote rather than inventing its own placeholder text', () => {
    for (const [name, source] of [
      ['PerformanceTab', performanceTab],
      ['AiTab', aiTab],
      ['BackgroundJobsTab', backgroundJobsTab],
      ['SymbolCoverageCard', symbolCoverageCard],
      ['ErrorCenterTable', errorCenterTable],
    ] as const) {
      expect(source, `${name} must render NotInstrumentedNote`).toContain('NotInstrumentedNote');
    }
  });

  it('NotInstrumentedNote always renders the exact localized not-instrumented label plus reason, required infra, and scope', () => {
    expect(notInstrumentedNote).toContain("t('ops_center_not_instrumented')");
    expect(notInstrumentedNote).toContain('t(value.reasonKey)');
    expect(notInstrumentedNote).toContain('t(value.requiredInfraKey)');
    expect(notInstrumentedNote).toContain('SCOPE_LABEL_KEY[value.scope]');
  });

  it('the Errors tab explicitly lists Database/Frontend/Notifications as not-instrumented rather than fabricating entries for them', () => {
    expect(errorCenterTable).toContain('notInstrumentedCategories');
    expect(errorCenterTable).toContain('database:');
    expect(errorCenterTable).toContain('frontend:');
    expect(errorCenterTable).toContain('notifications:');
  });

  it('the health score is computed via a documented arithmetic formula over real counts, never a hardcoded/random number', () => {
    expect(aggregate).not.toContain('Math.random');
    expect(aggregate).toMatch(/function computeHealthScore/);
  });
});

describe('Operations Center status badges always pair an icon with a label — never color alone', () => {
  it('every status-bearing component renders an Icon element', () => {
    for (const source of [healthScoreCard, featureHealthGrid, jobSourceCard, rootCauseAccordion, notInstrumentedNote]) {
      expect(source).toMatch(/Icon size=\{\d+\}/);
    }
  });
});
