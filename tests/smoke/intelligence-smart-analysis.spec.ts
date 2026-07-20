import { expect, test, type Page } from '@playwright/test';

const now = '2026-07-19T08:00:00.000Z';

function marketAnalysis() {
  return {
    ok: true,
    success: true,
    provider: 'verified-e2e-provider',
    dataStatus: 'live',
    symbol: 'AAPL',
    providerSymbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    country: 'US',
    market: 'US',
    lastUpdated: now,
    latestPrice: 150,
    changePercent: 0.67,
    quote: { price: 150, change: 1, changePercent: 0.67, currency: 'USD', timestamp: now },
    fundamentals: { trailingPE: 26, trailingEps: 6.2, revenueGrowth: 0.12 },
    fundamentalsAvailable: true,
    fundamentalsSource: 'verified-e2e-provider',
    trend: 'neutral',
    riskLevel: 'medium',
    indicators: { rsi: 54, sma20: 148, sma50: 145, volatility: 22 },
    levels: { support: 145, resistance: 155 },
    history: Array.from({ length: 80 }, (_, index) => ({
      date: new Date(Date.parse(now) - (79 - index) * 86_400_000).toISOString(),
      open: 101 + index * 0.6,
      high: 103 + index * 0.6,
      low: 100 + index * 0.6,
      close: 102 + index * 0.6,
      volume: 1_000_000 + index * 10_000,
    })),
    summary: 'Verified fixture data for UI contract coverage.',
    source: 'verified-e2e-provider',
    fallback: false,
    cached: false,
    warnings: [],
  };
}

function factor(
  key: 'TECHNICAL' | 'MOMENTUM' | 'RISK' | 'SENTIMENT',
  score: number | null,
  availability: 'AVAILABLE' | 'UNAVAILABLE' = 'AVAILABLE',
) {
  const directionalBias = score === null ? 'UNAVAILABLE' : score > 12 ? 'BULLISH' : score < -12 ? 'BEARISH' : 'NEUTRAL';
  return {
    factor: key,
    availability,
    normalizedScore: score,
    directionalBias,
    strength: score === null ? 0 : Math.abs(score),
    required: key !== 'SENTIMENT',
    freshness: { state: availability === 'AVAILABLE' ? 'FRESH' : 'UNAVAILABLE', observedAt: availability === 'AVAILABLE' ? now : null, ageSeconds: availability === 'AVAILABLE' ? 30 : null, thresholdSeconds: 900 },
    evidence: score === null ? [] : [{
      id: `${key.toLowerCase()}:fixture`,
      factor: key,
      kind: 'CALCULATION',
      labelKey: key === 'TECHNICAL' ? 'intelligence_evidence_rsi14' : 'intelligence_evidence_change_5_period',
      value: key === 'TECHNICAL' ? 54 : 2.4,
      unit: key === 'TECHNICAL' ? null : '%',
      observedAt: now,
      source: 'verified-e2e-provider',
      provider: 'verified-e2e-provider',
      direction: directionalBias,
      significance: 70,
    }],
    source: availability === 'AVAILABLE' ? 'verified-e2e-provider' : 'unavailable',
    provider: availability === 'AVAILABLE' ? 'verified-e2e-provider' : 'unavailable',
    operationalReliability: availability === 'AVAILABLE' ? 1 : 0,
    warnings: availability === 'AVAILABLE' ? [] : [{ code: 'SENTIMENT_PROVIDER_NOT_AVAILABLE', severity: 'INFO', factor: key, detailKey: 'intelligence_warning_factor_unavailable' }],
    failureReason: availability === 'AVAILABLE' ? null : 'SENTIMENT_PROVIDER_NOT_AVAILABLE',
  };
}

function intelligenceResult(state: 'partial' | 'insufficient' | 'stale' = 'partial') {
  const factors = state === 'insufficient'
    ? [factor('TECHNICAL', null, 'UNAVAILABLE'), factor('MOMENTUM', null, 'UNAVAILABLE'), factor('RISK', null, 'UNAVAILABLE')]
    : [factor('TECHNICAL', 22), factor('MOMENTUM', 18), factor('RISK', -24), factor('SENTIMENT', null, 'UNAVAILABLE')];
  const insufficient = state === 'insufficient';
  const stale = state === 'stale';
  return {
    analysisId: `00000000-0000-4000-8000-00000000000${state === 'partial' ? 1 : state === 'stale' ? 2 : 3}`,
    correlationId: 'e2e-correlation',
    status: insufficient ? 'INSUFFICIENT_DATA' : 'PARTIAL',
    scope: 'SHARED',
    requestSource: 'SMART_MARKET_ANALYSIS',
    asset: { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null },
    generatedAt: now,
    dataAsOf: now,
    expiresAt: '2026-07-19T08:15:00.000Z',
    freshness: { state: stale ? 'STALE' : insufficient ? 'UNAVAILABLE' : 'FRESH', observedAt: insufficient ? null : now, ageSeconds: insufficient ? null : stale ? 3600 : 30, thresholdSeconds: 900 },
    recommendation: insufficient ? 'INSUFFICIENT_DATA' : 'WAIT',
    confidence: insufficient ? 0 : stale ? 34 : 64,
    confidenceQuality: insufficient ? 'INSUFFICIENT_EVIDENCE' : stale ? 'LIMITED_EVIDENCE' : 'MODERATE_EVIDENCE',
    confidenceCalculation: { methodologyVersion: 'deterministic-confidence-v1', weightingVersion: 'asset-horizon-weights-v1', appliedWeights: { TECHNICAL: 0.4, MOMENTUM: 0.3, RISK: 0.3 }, components: { coverage: insufficient ? 0 : 75, freshness: stale ? 20 : 100, consistency: 80, operationalReliability: 100, signalClarity: 40 }, penalties: stale ? [{ code: 'STALE_DATA', points: 24 }] : [], minimumEvidenceMet: !insufficient, availableDirectionalFactors: insufficient ? 0 : 3 },
    risk: insufficient ? 'UNAVAILABLE' : 'MEDIUM',
    horizon: 'SWING',
    marketPrice: insufficient
      ? { available: false, value: null, currency: 'USD', method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' }
      : { available: true, value: 150, currency: 'USD', observedAt: now, source: 'verified-e2e-provider', dataStatus: 'LIVE' },
    entryContext: { available: false, value: null, currency: 'USD', method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' },
    targets: insufficient
      ? { available: false, lower: null, upper: null, currency: 'USD', source: null, dataAsOf: null, method: null, reasonCode: 'INSUFFICIENT_MARKET_DATA' }
      : { available: true, lower: 145, upper: 155, currency: 'USD', source: 'verified-e2e-provider', dataAsOf: now, method: 'RECENT_OHLC_RANGE' },
    stopLossContext: { available: false, value: null, currency: 'USD', method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' },
    factors,
    evidence: factors.flatMap(item => item.evidence),
    warnings: stale ? [{ code: 'LIVE_REFRESH_FAILED_STALE_RESULT', severity: 'CRITICAL', factor: null, detailKey: 'intelligence_warning_live_refresh_failed' }] : [],
    limitations: factors.filter(item => item.availability === 'UNAVAILABLE').map(item => item.failureReason),
    providerProvenance: { selectedProvider: insufficient ? null : 'verified-e2e-provider', attempts: [], fallbackUsed: stale, dataKinds: insufficient ? [] : ['QUOTE', 'HISTORICAL_PRICES'] },
    engineVersion: '6.1.0',
    rulesVersion: 'recommendation-policy-v1',
    weightingVersion: 'asset-horizon-weights-v1',
    dataCompleteness: { requestedFactors: factors.length, availableFactors: factors.filter(item => item.availability === 'AVAILABLE').length, partialFactors: 0, unavailableFactors: factors.filter(item => item.availability === 'UNAVAILABLE').length, requiredFactors: ['TECHNICAL', 'MOMENTUM', 'RISK'], missingRequiredFactors: insufficient ? ['TECHNICAL', 'MOMENTUM', 'RISK'] : [], weightedCoverage: insufficient ? 0 : 0.75, percentage: insufficient ? 0 : 75 },
    staleData: stale,
    conflictStatus: 'NONE',
    explanation: { supportingFactors: insufficient ? [] : ['TECHNICAL', 'MOMENTUM'], opposingFactors: insufficient ? [] : ['RISK'], limitationCodes: [], riskCodes: [], recommendationReasonCode: insufficient ? 'MINIMUM_EVIDENCE_NOT_MET' : 'SCORE_WITHIN_WAIT_BAND', confidenceReasonCodes: stale ? ['STALE_DATA'] : [], invalidationConditions: [{ code: 'DATA_STALENESS', factor: null, detailKey: 'intelligence_invalidation_data_stale' }, { code: 'RISK_ESCALATION', factor: 'RISK', detailKey: 'intelligence_invalidation_risk_escalation' }] },
    recommendationDecision: { policyVersion: 'recommendation-policy-v1', compositeScore: insufficient ? 0 : 12, buyThreshold: 28, sellThreshold: -28, minimumDirectionalConfidence: 55, reasonCode: insufficient ? 'MINIMUM_EVIDENCE_NOT_MET' : 'SCORE_WITHIN_WAIT_BAND', materialFactorKeys: insufficient ? [] : ['TECHNICAL', 'MOMENTUM', 'RISK'] },
    previousAnalysis: null,
    persistenceStatus: 'PERSISTED',
  };
}

function timelineItem(id: string, generatedAt: string, recommendation: 'BUY' | 'WAIT', confidence: number, options?: { outcome?: 'PENDING' | 'EVALUATED'; previous?: boolean }) {
  const current = id.endsWith('1');
  const outcome = options?.outcome === 'EVALUATED' ? {
    id: '20000000-0000-4000-8000-000000000001',
    analysisId: id,
    scope: 'SHARED',
    asset: { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD' },
    horizon: 'SWING',
    originalRecommendation: recommendation,
    originalConfidence: confidence,
    originalConfidenceQuality: 'MODERATE_EVIDENCE',
    originalEngineVersion: '6.1.0',
    originalRulesVersion: 'recommendation-policy-v1',
    originalWeightingVersion: 'asset-horizon-weights-v1',
    confidenceBucket: '60_79',
    evaluationStatus: 'EVALUATED',
    evaluationWindow: { methodologyVersion: 'outcome-evaluation-v1', horizon: 'SWING', referenceAt: generatedAt, referenceSource: 'GENERATED_AT', startAt: generatedAt, endAt: '2026-07-18T08:00:00.000Z', eligibleAt: '2026-07-18T08:00:00.000Z', entryToleranceSeconds: 259200, finalToleranceSeconds: 864000, interval: '1d' },
    entryReferencePrice: 145,
    entryReferenceAt: generatedAt,
    entryCurrency: 'USD',
    finalReferencePrice: 151,
    finalReferenceAt: '2026-07-18T08:00:00.000Z',
    finalCurrency: 'USD',
    maximumFavorableExcursion: 5.2,
    maximumAdverseExcursion: -1.1,
    directionalReturn: 4.14,
    benchmarkReturn: null,
    outcome: 'CORRECT',
    evaluationDataSource: 'verified-e2e-history',
    priceDataAsOf: '2026-07-18T08:00:00.000Z',
    priceDataReceivedAt: '2026-07-18T08:05:00.000Z',
    providerProvenance: { selectedProvider: 'verified-e2e-history', attempts: [], adjustedPrices: 'VERIFIED' },
    warnings: [],
    methodologyVersion: 'outcome-evaluation-v1',
    methodologySnapshot: {},
    evaluatedAt: '2026-07-18T08:06:00.000Z',
    createdAt: '2026-07-18T08:06:00.000Z',
  } : options?.outcome === 'PENDING' ? {
    id: '20000000-0000-4000-8000-000000000002',
    analysisId: id,
    scope: 'SHARED',
    asset: { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD' },
    horizon: 'SWING',
    originalRecommendation: recommendation,
    originalConfidence: confidence,
    originalConfidenceQuality: 'MODERATE_EVIDENCE',
    originalEngineVersion: '6.1.0',
    originalRulesVersion: 'recommendation-policy-v1',
    originalWeightingVersion: 'asset-horizon-weights-v1',
    confidenceBucket: '60_79',
    evaluationStatus: 'PENDING',
    evaluationWindow: { methodologyVersion: 'outcome-evaluation-v1', horizon: 'SWING', referenceAt: generatedAt, referenceSource: 'GENERATED_AT', startAt: generatedAt, endAt: '2026-08-18T08:00:00.000Z', eligibleAt: '2026-08-18T08:00:00.000Z', entryToleranceSeconds: 259200, finalToleranceSeconds: 864000, interval: '1d' },
    entryReferencePrice: null,
    entryReferenceAt: null,
    entryCurrency: 'USD',
    finalReferencePrice: null,
    finalReferenceAt: null,
    finalCurrency: 'USD',
    maximumFavorableExcursion: null,
    maximumAdverseExcursion: null,
    directionalReturn: null,
    benchmarkReturn: null,
    outcome: 'NOT_APPLICABLE',
    evaluationDataSource: null,
    priceDataAsOf: null,
    priceDataReceivedAt: null,
    providerProvenance: { selectedProvider: null, attempts: [], adjustedPrices: 'UNKNOWN' },
    warnings: [],
    methodologyVersion: 'outcome-evaluation-v1',
    methodologySnapshot: {},
    evaluatedAt: null,
    createdAt: generatedAt,
  } : null;

  return {
    analysisId: id,
    asset: { canonicalSymbol: 'AAPL', displaySymbol: 'AAPL', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD' },
    generatedAt,
    dataAsOf: generatedAt,
    recommendation,
    confidence,
    risk: current ? 'MEDIUM' : 'LOW',
    freshness: current ? 'FRESH' : 'DELAYED',
    warnings: [],
    provider: { selectedProvider: 'verified-e2e-provider', attempts: [], fallbackUsed: false, dataKinds: ['QUOTE'] },
    versions: { engineVersion: '6.1.0', rulesVersion: 'recommendation-policy-v1', weightingVersion: 'asset-horizon-weights-v1' },
    drift: {
      methodologyVersion: 'confidence-drift-v1',
      previousAnalysisId: options?.previous ? '00000000-0000-4000-8000-000000000000' : null,
      confidenceDelta: options?.previous ? 8 : null,
      recommendationTransition: { from: options?.previous ? 'BUY' : null, to: recommendation },
      riskTransition: { from: options?.previous ? 'LOW' : null, to: current ? 'MEDIUM' : 'LOW' },
      factorDeltas: [{ factor: 'TECHNICAL', previousScore: options?.previous ? 12 : null, currentScore: current ? 22 : 18, scoreDelta: options?.previous ? 10 : null, previousAvailability: 'AVAILABLE', currentAvailability: 'AVAILABLE' }],
      coverageDelta: options?.previous ? 12 : null,
      freshnessTransition: { from: options?.previous ? 'DELAYED' : null, to: current ? 'FRESH' : 'DELAYED' },
      conflictTransition: { from: options?.previous ? 'NONE' : null, to: 'NONE' },
      providerChanged: false,
      methodologyChanged: false,
      reasonCodes: options?.previous ? ['TECHNICAL_STRENGTHENED', 'RECOMMENDATION_CHANGED'] : ['NO_PREVIOUS_ANALYSIS'],
      primaryReasonCode: options?.previous ? 'TECHNICAL_STRENGTHENED' : 'NO_PREVIOUS_ANALYSIS',
    },
    outcome,
  };
}

function timelineResponse(includeComparison = false) {
  const previous = timelineItem('00000000-0000-4000-8000-000000000000', '2026-06-15T08:00:00.000Z', 'BUY', 56, { outcome: 'EVALUATED' });
  const current = timelineItem('00000000-0000-4000-8000-000000000001', now, 'WAIT', 64, { outcome: 'PENDING', previous: true });
  return {
    ok: true,
    timeline: {
      items: [current, previous],
      nextCursor: null,
      ...(includeComparison ? {
        comparison: {
          left: previous,
          right: current,
          drift: current.drift,
        },
      } : {}),
    },
    correlationId: 'e2e-timeline-correlation',
  };
}

async function enterGuest(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sfm_lang', 'en');
    localStorage.setItem('the-sfm-theme', 'light');
  });
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').first().click();
  await page.waitForURL(/\/dashboard(?:\?|$)/);
}

async function stubApis(page: Page, state: 'partial' | 'insufficient' | 'stale') {
  await page.route('**/api/market/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, success: false, code: 'PROVIDER_UNAVAILABLE', items: [], results: [], data: [] }),
  }));
  await page.route('**/api/market/analyze**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(marketAnalysis()) }));
  await page.route('**/api/market/ai-insight', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'AI_PROVIDER_UNAVAILABLE' }) }));
  await page.route('**/api/intelligence/latest**', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'NOT_FOUND' } }) }));
  await page.route('**/api/intelligence/analyze', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: intelligenceResult(state), correlationId: 'e2e-correlation' }) }));
  await page.route('**/api/intelligence/timeline**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(timelineResponse(new URL(route.request().url()).searchParams.has('compareAnalysisId'))),
  }));
}

async function openAnalysis(page: Page, state: 'partial' | 'insufficient' | 'stale') {
  await stubApis(page, state);
  await enterGuest(page);
  const response = await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const panel = page.locator('section[aria-labelledby="intelligence-ledger-title"]');
  await expect(panel).toBeVisible({ timeout: 45_000 });
  return panel;
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);

test.describe('Phase 6.1 intelligence panel', () => {
  test('renders source-backed current price and target range with evidence', async ({ page }) => {
    const panel = await openAnalysis(page, 'partial');
    const status = page.getByTestId('intelligence-status-panel');
    await expect(panel.getByText('Analysis confidence')).toBeVisible();
    await expect(panel.getByText('64%')).toBeVisible();
    await expect(status.getByRole('listitem').filter({ hasText: 'This analysis is partial' })).toBeVisible();
    await panel.locator('summary').click();
    await expect(panel.getByText('Current price', { exact: true })).toBeVisible();
    await expect(panel.getByText('150 USD', { exact: true })).toBeVisible();
    await expect(panel.getByText('Target range', { exact: true })).toBeVisible();
    await expect(panel.getByText('RECENT_OHLC_RANGE', { exact: true })).toBeVisible();
    await expect(panel.getByText('verified-e2e-provider', { exact: true }).first()).toBeVisible();
  });

  test('renders insufficient-data and stale states truthfully', async ({ page }) => {
    let panel = await openAnalysis(page, 'insufficient');
    let status = page.getByTestId('intelligence-status-panel');
    await expect(panel.getByText('Insufficient data', { exact: true })).toBeVisible();
    await expect(status.getByText('Available evidence is insufficient', { exact: false })).toBeVisible();
    await expect(status.getByText('The data provider is unavailable', { exact: false })).toBeVisible();

    await page.unrouteAll({ behavior: 'wait' });
    await stubApis(page, 'stale');
    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1', { waitUntil: 'domcontentloaded' });
    panel = page.locator('section[aria-labelledby="intelligence-ledger-title"]');
    status = page.getByTestId('intelligence-status-panel');
    await expect(panel).toBeVisible({ timeout: 45_000 });
    await expect(status.getByText('This is an explicitly stale result', { exact: false })).toBeVisible();
    await expect(panel.getByText('34%')).toBeVisible();
  });

  test('keeps RTL/LTR, theme, keyboard disclosure, and mobile width behavior intact', async ({ page }) => {
    const panel = await openAnalysis(page, 'partial');
    const timeline = page.getByTestId('intelligence-timeline');
    await expect(timeline).toHaveCount(0);
    await page.getByRole('button', { name: /Show this asset/i }).click();
    await expect(timeline).toBeVisible();
    await panel.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(panel.locator('details')).toHaveAttribute('open', '');

    for (const [language, direction] of [['ar', 'rtl'], ['fr', 'ltr'], ['en', 'ltr']] as const) {
      await page.evaluate(nextLanguage => {
        localStorage.setItem('sfm_lang', nextLanguage);
        window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
      }, language);
      await expect.poll(() => panel.getAttribute('dir')).toBe(direction);
      await expect.poll(() => timeline.getAttribute('dir')).toBe(direction);
    }

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate(nextTheme => {
        localStorage.setItem('the-sfm-theme', nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      }, theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
  });

  test('uses the desktop sidebar layout track without clipping at every supported viewport', async ({ page }) => {
    const panel = await openAnalysis(page, 'partial');
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(panel).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);

      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect() ?? null;
        const sidebar = rect('aside.sfm-shared-sidebar');
        const heading = rect('#ai-analyst-title');
        const action = rect('[data-testid="ai-analyst-workspace"] button');
        const result = rect('[data-testid="ai-analyst-canonical-result"]');
        const overlaps = (a: DOMRect | null, b: DOMRect | null) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        return { sidebar, heading, action, result, headingOverlaps: overlaps(sidebar, heading), actionOverlaps: overlaps(sidebar, action), resultOverlaps: overlaps(sidebar, result) };
      });
      expect(geometry.heading).not.toBeNull();
      expect(geometry.action).not.toBeNull();
      expect(geometry.result).not.toBeNull();
      if (geometry.sidebar && geometry.sidebar.width > 0) {
        expect(geometry.headingOverlaps).toBe(false);
        expect(geometry.actionOverlaps).toBe(false);
        expect(geometry.resultOverlaps).toBe(false);
      }
    }
  });

  test('generates a missing reading from the normal request path and gives guests a sign-in refresh action', async ({ page }) => {
    await stubApis(page, 'partial');
    await enterGuest(page);
    let analyzeRequests = 0;
    await page.unroute('**/api/intelligence/analyze');
    await page.route('**/api/intelligence/analyze', route => {
      analyzeRequests += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: intelligenceResult('partial'), correlationId: 'e2e-correlation' }) });
    });
    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('ai-analyst-canonical-result')).toBeVisible();
    expect(analyzeRequests).toBe(1);
    await expect(page.getByRole('link', { name: 'Sign in to refresh analysis' })).toHaveAttribute('href', /\/login\?next=/);
  });

  test('renders the historical timeline, pending/evaluated outcomes, and a deterministic comparison', async ({ page }) => {
    await openAnalysis(page, 'partial');
    await page.getByRole('button', { name: /Show this asset/i }).click();
    const timeline = page.getByTestId('intelligence-timeline');
    await expect(timeline).toBeVisible();
    const readings = timeline.getByRole('option');
    await expect(readings).toHaveCount(2);
    await expect(readings.nth(0).getByText('Awaiting evaluation', { exact: true })).toBeVisible();
    await expect(readings.nth(1).getByText('Evaluated · Direction correct', { exact: true })).toBeVisible();
    await readings.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(readings.nth(1)).toBeFocused();
    await readings.nth(0).click();
    await readings.nth(1).click();
    await timeline.getByRole('button', { name: 'Compare selected readings' }).click();
    await expect(timeline.getByText('Selected reading comparison', { exact: true })).toBeVisible();
    await expect(timeline.getByText('Technical signals strengthened', { exact: true }).first()).toBeVisible();
  });
});
