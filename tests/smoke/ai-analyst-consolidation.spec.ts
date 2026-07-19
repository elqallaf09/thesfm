import { expect, test, type Page } from '@playwright/test';

function accuracyResponse() {
  return {
    ok: true,
    accuracy: {
      scope: 'SHARED',
      truncated: false,
      includedOutcomes: 1,
      report: {
        methodologyVersion: 'calibration-v1',
        minimumDirectionalSample: 20,
        evaluatedCount: 1,
        pendingCount: 2,
        insufficientDataCount: 1,
        invalidatedCount: 0,
        failedCount: 0,
        directional: {
          key: 'ALL', evaluatedCount: 1, correctCount: 1, incorrectCount: 0, neutralCount: 0,
          excludedCount: 3, accuracy: null, meanConfidence: null, descriptiveCalibrationGap: null, sampleSufficient: false,
        },
        byConfidenceBucket: [], byAssetType: [], byHorizon: [], byRecommendation: [],
        mfe: { count: 0, median: null, p25: null, p75: null },
        mae: { count: 0, median: null, p25: null, p75: null },
        calibrationBoundary: 'DESCRIPTIVE_ONLY_NO_LIVE_WEIGHT_CHANGE',
      },
    },
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

async function stubAnalystReads(page: Page) {
  await page.route('**/api/intelligence/recent**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, recent: { items: [] } }),
  }));
  await page.route('**/api/intelligence/accuracy**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(accuracyResponse()),
  }));
  await page.route('**/api/intelligence/latest**', route => route.fulfill({
    status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'NOT_FOUND' } }),
  }));
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('Phase 6.2B AI Analyst consolidation', () => {
  test('redirects legacy entry points while keeping one sidebar intelligence destination', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);

    await page.goto('/market-analysis', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/ai-analyst\/overview(?:\?|$)/);
    await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();

    const sidebar = page.locator('aside.sfm-shared-sidebar');
    if (await sidebar.count()) {
      await expect(sidebar.getByRole('link', { name: 'SFM Smart Analyst' })).toHaveCount(1);
      await expect(sidebar.locator('a[href="/market-analysis"], a[href="/market-agent"]')).toHaveCount(0);
    }

    await page.goto('/market-agent', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/ai-analyst\/agent(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Smart market agent' })).toBeVisible();

    await page.goto('/market-agent?symbol=EURUSD%3DX&assetType=FOREX&timeframe=1D', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/ai-analyst\/agent\?assetType=FOREX&horizon=INTRADAY&symbol=EURUSD%3DX/);
    await expect(page.getByLabel('Symbol')).toHaveValue('EURUSD=X');
    await expect(page.getByLabel('Asset type')).toHaveValue('FOREX');
    await expect(page.getByLabel('Horizon')).toHaveValue('INTRADAY');

    await page.goto('/symbol-details/AAPL', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/ai-analyst\/analyze\/AAPL\?assetType=STOCK&horizon=SWING/);
    await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
  });

  test('keeps the unified status truthful and all non-analysis routes inside the same workspace', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);

    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('intelligence-status-panel')).toHaveCount(1);
    await expect(page.getByTestId('ai-analyst-canonical-result')).toHaveCount(0);

    for (const [route, heading] of [
      ['/ai-analyst/history?view=accuracy', 'Intelligence timeline and history'],
      ['/ai-analyst/compare', 'Analysis comparison'],
      ['/ai-analyst/agent', 'Smart market agent'],
      ['/ai-analyst/opportunities', 'Future opportunities'],
    ] as const) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    await page.goto('/ai-analyst/history?view=accuracy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('ai-analyst-accuracy-summary')
      .getByText('The sample is too small to display a meaningful accuracy percentage.').first()).toBeVisible();
  });

  test('keeps RTL/LTR, dark mode, tabs, and a mobile viewport overflow-safe', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);
    await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('ai-analyst-tabs')).toBeVisible();

    for (const [language, dir] of [['ar', 'rtl'], ['fr', 'ltr'], ['en', 'ltr']] as const) {
      await page.evaluate(nextLanguage => {
        localStorage.setItem('sfm_lang', nextLanguage);
        window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
      }, language);
      await expect.poll(() => page.getByTestId('ai-analyst-workspace').getAttribute('dir')).toBe(dir);
    }

    await page.evaluate(() => {
      localStorage.setItem('the-sfm-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
  });
});
