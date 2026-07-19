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
  await page.route('**/api/markets**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      envelope: { status: 'fresh', freshness: { asOf: '2026-07-19T10:00:00.000Z', isStale: false } },
      pagination: { total: 1 },
      groups: [{ id: 'us-equities', en: 'US equities', ar: 'أسهم الولايات المتحدة', totalSymbols: 1 }],
      markets: [{ displaySymbol: 'AAPL', displayName: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', source: 'catalog' }],
    }),
  }));
  await page.route('**/api/market-news**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      lastUpdated: '2026-07-19T10:00:00.000Z',
      items: [{ id: 'filing', title: 'Source-backed filing', sourceName: 'Exchange', publishedAt: '2026-07-19T09:00:00.000Z', originalUrl: 'https://example.com/filing', isOfficial: true }],
    }),
  }));
  await page.route('**/api/economic-calendar**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [], updated_at: '2026-07-19T10:00:00.000Z', source: 'unavailable' }),
  }));
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('Phase 6.3 AI Analyst market-intelligence consolidation', () => {
  test('redirects legacy entry points while keeping one sidebar intelligence destination', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);

    await page.goto('/market-analysis', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/ai-analyst\/market-leadership(?:\?|$)/);
    await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();

    const sidebar = page.locator('aside.sfm-shared-sidebar');
    if (await sidebar.count()) {
      await expect(sidebar.getByRole('link', { name: 'SFM AI Analyst' })).toHaveCount(1);
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

    await page.goto('/symbol-details/AAPL?filters=top-movers&return=%2Fwatchlist%3Fsort%3Dnewest#details', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}`
      === '/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&filters=top-movers&return=%2Fwatchlist%3Fsort%3Dnewest#details');
    await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
  });

  test('keeps public market surfaces truthful and gates personal capabilities without hiding the workspace', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);

    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('intelligence-status-panel')).toHaveCount(1);
    await expect(page.getByTestId('ai-analyst-canonical-result')).toHaveCount(0);

    for (const [route, marker] of [
      ['/ai-analyst/market-leadership', 'market-leadership'],
      ['/ai-analyst/markets', 'market-explorer'],
      ['/ai-analyst/markets/sessions', 'market-sessions'],
      ['/ai-analyst/markets?view=map', 'market-map'],
      ['/ai-analyst/news', 'market-news'],
      ['/ai-analyst/calendar', 'economic-calendar'],
      ['/ai-analyst/education', 'education'],
    ] as const) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
      await expect(page.locator(`[data-ai-analyst-surface="${marker}"]`)).toBeVisible();
    }

    for (const [route, heading] of [
      ['/ai-analyst/compare', 'Analysis comparison'],
      ['/ai-analyst/agent', 'Smart market agent'],
      ['/ai-analyst/opportunities', 'Future opportunities'],
    ] as const) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }

    for (const surface of ['history', 'watchlist', 'portfolio', 'alerts', 'recommendations', 'tradePerformance', 'settings']) {
      const route = surface === 'history'
        ? '/ai-analyst/history?view=accuracy'
        : `/ai-analyst/${surface === 'tradePerformance' ? 'trade-performance' : surface}`;
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
      await expect(page.getByTestId(`ai-analyst-${surface}-locked`)).toBeVisible();
    }
  });

  test('keeps one canonical AI Analyst entry across desktop and mobile navigation in every locale', async ({ page, isMobile }) => {
    await stubAnalystReads(page);
    await enterGuest(page);
    await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });

    for (const [locale, label] of [
      ['ar', 'إس إف إم المحلل الذكي'],
      ['en', 'SFM AI Analyst'],
      ['fr', 'Analyste IA SFM'],
    ] as const) {
      await page.evaluate(nextLanguage => {
        localStorage.setItem('sfm_lang', nextLanguage);
        window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
      }, locale);

      if (isMobile) await page.locator('.sfm-global-menu-button').click();
      const navigation = isMobile
        ? page.locator('#sfm-mobile-menu')
        : page.locator('aside.sfm-shared-sidebar');
      await expect(navigation).toBeVisible();
      const analystLink = navigation.getByRole('link', { name: label });
      await expect(analystLink).toHaveCount(1);
      await expect(analystLink).toHaveAttribute('href', '/ai-analyst/overview');
      await expect(navigation.locator('a[href="/thesfm-trader-own"]')).toHaveCount(0);

      await analystLink.click();
      await page.waitForURL(/\/ai-analyst\/overview(?:\?|$)/);
    }
  });

  test('uses grouped desktop navigation and an accessible mobile navigation drawer', async ({ page }) => {
    await stubAnalystReads(page);
    await enterGuest(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });

    const desktopNavigation = page.getByTestId('ai-analyst-tabs');
    await expect(desktopNavigation).toBeVisible();
    for (const group of ['Analysis', 'Markets', 'Monitoring', 'Knowledge', 'Configuration']) {
      await expect(desktopNavigation.getByRole('heading', { name: group })).toBeVisible();
    }
    await expect(desktopNavigation.getByRole('link', { name: 'Market leadership' })).toHaveAttribute('href', '/ai-analyst/market-leadership');
    await expect(desktopNavigation.getByRole('link', { name: 'Market sessions and map' })).toHaveAttribute('href', '/ai-analyst/markets/sessions');
    await expect(desktopNavigation.getByRole('link', { name: 'AI Analyst settings' })).toHaveAttribute('href', '/ai-analyst/settings');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(desktopNavigation).toBeHidden();
    const openNavigation = page.getByRole('button', { name: 'Open AI Analyst sections' });
    await expect(openNavigation).toHaveAttribute('aria-expanded', 'false');
    await openNavigation.click();
    await expect(openNavigation).toHaveAttribute('aria-expanded', 'true');

    const mobileNavigation = page.getByTestId('ai-analyst-mobile-navigation');
    await expect(mobileNavigation).toBeVisible();
    await expect(mobileNavigation.locator('details')).toHaveCount(5);
    await expect(mobileNavigation.getByRole('link', { name: 'Future opportunities' })).toHaveAttribute('href', '/ai-analyst/opportunities');
    await page.keyboard.press('Escape');
    await expect(mobileNavigation).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.setItem('sfm_lang', 'fr');
      window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: 'fr' } }));
    });
    await expect(page.getByRole('heading', { name: 'Analyste IA SFM', level: 1 })).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem('sfm_lang', 'ar');
      window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: 'ar' } }));
    });
    await expect(page.getByTestId('ai-analyst-workspace')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'إس إف إم المحلل الذكي', level: 1 })).toBeVisible();
  });

  test('keeps RTL/LTR, dark mode, and a mobile viewport overflow-safe', async ({ page, isMobile }) => {
    await stubAnalystReads(page);
    await enterGuest(page);
    await page.goto('/ai-analyst/overview', { waitUntil: 'domcontentloaded' });
    if (isMobile) {
      await expect(page.getByRole('button', { name: 'Open AI Analyst sections' })).toBeVisible();
    } else {
      await expect(page.getByTestId('ai-analyst-tabs')).toBeVisible();
    }

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
