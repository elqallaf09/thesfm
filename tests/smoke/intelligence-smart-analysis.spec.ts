import { expect, test, type Page } from '@playwright/test';
import { enterGuest, factor, intelligenceResult, stubApis } from './fixtures/intelligence-analysis';

async function openAnalysis(page: Page, state: 'partial' | 'insufficient' | 'stale') {
  await stubApis(page, state);
  await enterGuest(page);
  const response = await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await page.getByRole('button', { name: 'Run research and analysis', exact: true }).click();
  const panel = page.getByTestId('ai-analyst-canonical-result').locator(':scope > section[aria-labelledby]');
  await expect(panel).toBeVisible({ timeout: 45_000 });
  return panel;
}

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);

test.describe('Phase 6.1 intelligence panel', () => {
  test('renders source-backed current price and target range with evidence', async ({ page }) => {
    const panel = await openAnalysis(page, 'partial');
    const metrics = panel.getByTestId('analyst-summary-metrics');
    const status = page.getByTestId('intelligence-status-panel');
    await expect(metrics.getByText('Analysis confidence')).toBeVisible();
    await expect(metrics.getByText('64%')).toBeVisible();
    await expect(panel.getByTestId('analyst-current-price')).toHaveText('$150.00');
    await expect(status.getByRole('listitem').filter({ hasText: 'This analysis is partial' })).toBeVisible();
    const disclosure = page.getByTestId('analyst-evidence-detail');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await panel.getByRole('button', { name: 'View full analysis', exact: true }).click();
    await expect(disclosure).toHaveAttribute('open', '');
    const ledger = disclosure.locator(':scope > section[aria-labelledby]');
    await ledger.locator(':scope > details > summary').click();
    await expect(ledger.getByText('Current price', { exact: true })).toBeVisible();
    await expect(ledger.getByText('150 USD', { exact: true })).toBeVisible();
    await expect(ledger.getByText('Target range', { exact: true })).toBeVisible();
    await expect(ledger.getByText('RECENT_OHLC_RANGE', { exact: true })).toBeVisible();
    await expect(ledger.getByText('verified-e2e-provider', { exact: true }).first()).toBeVisible();
  });

  test('renders a styled price chart without an opaque hit layer or duplicate result cards', async ({ page }) => {
    await openAnalysis(page, 'partial');
    const chart = page.getByTestId('ai-analyst-verified-chart');
    await expect(chart.locator('svg[role="img"]')).toBeVisible();
    await expect(chart.locator('.price-chart-line-path')).toHaveAttribute('fill', 'none');
    await expect(chart.locator('.price-chart-hit-zone')).toHaveCSS('fill', 'rgba(0, 0, 0, 0)');
    await expect(page.getByTestId('ai-analyst-canonical-result')).toHaveCount(1);
    await expect(page.getByTestId('sfm-investment-check')).not.toContainText('SFM Score:');
    await expect(page.getByTestId('sfm-intelligence-source')).not.toHaveAttribute('open', '');
    for (const language of ['ar', 'en', 'fr']) {
      await page.evaluate(lang => { localStorage.setItem('sfm_lang', lang); window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang } })); }, language);
      await expect(chart.locator('svg[role="img"]')).toHaveAttribute('direction', 'ltr');
      for (const theme of ['dark', 'light']) {
        await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme);
        await expect(chart.locator('.price-chart-hit-zone')).toHaveCSS('fill', 'rgba(0, 0, 0, 0)');
        await expect(chart.locator('.price-chart-line-path')).toHaveCSS('fill', 'none');
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
  });

  test('shows monthly macro observations once with readable sources in all languages and mobile widths', async ({ page }) => {
    await stubApis(page, 'partial');
    const reading = intelligenceResult('partial');
    const evidence = [
      { id: 'macro:current', labelKey: 'intelligence_evidence_macro_observation_cpi_yoy', value: 3.421376, observedAt: '2026-06-30', source: 'BLS' },
      { id: 'macro:previous', labelKey: 'intelligence_evidence_macro_previous_cpi_yoy', value: 3.2, observedAt: '2026-05-31', source: 'BLS' },
      { id: 'macro:country', labelKey: 'intelligence_evidence_macro_country_cpi_yoy', value: 'US', observedAt: '2026-06-30', source: 'BLS' },
      { id: 'macro:source:CPI_YOY', labelKey: 'intelligence_evidence_macro_source_url', value: 'https://data.bls.gov/timeseries/CUUR0000SA0', source: 'BLS' },
    ];
    const result = { ...reading, factors: [...reading.factors, { ...factor('SENTIMENT', null), factor: 'MACRO', availability: 'PARTIAL', source: 'BLS', evidence }] };
    await page.route('**/api/intelligence/analyze', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result }) }));
    await enterGuest(page);
    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING');
    await page.getByRole('button', { name: 'Run research and analysis', exact: true }).click();
    await page.getByRole('button', { name: 'View full analysis', exact: true }).click();
    for (const locale of ['en', 'ar', 'fr']) {
      await page.evaluate(lang => { localStorage.setItem('sfm_lang', lang); window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang } })); }, locale);
      const macro = page.getByTestId('macro-observations');
      await expect(macro).toContainText(locale === 'ar' ? 'شهري' : locale === 'fr' ? 'Mensuel' : 'Monthly');
      await expect(macro).toHaveCount(1);
      await expect(macro).toContainText('2026-06');
      await expect(macro).not.toContainText('3.421376');
      if (await macro.locator('details').getAttribute('open') === null) await macro.locator('summary').click();
      await expect(macro.locator('a')).toHaveCount(1);
      await expect(macro.locator('a')).toHaveAttribute('href', 'https://data.bls.gov/timeseries/CUUR0000SA0');
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
        await expect(macro.locator('strong')).toBeVisible();
      }
    }
  });

  test('renders insufficient-data and stale states truthfully', async ({ page }) => {
    let panel = await openAnalysis(page, 'insufficient');
    let status = page.getByTestId('intelligence-status-panel');
    await expect(panel.getByTestId('analyst-summary-metrics').getByText('Insufficient data', { exact: true })).toBeVisible();
    await expect(status.getByText('Available evidence is insufficient', { exact: false })).toBeVisible();
    await expect(status.getByText('The data provider is unavailable', { exact: false })).toBeVisible();
    await expect(panel.getByTestId('analyst-current-price')).toHaveText('Unavailable');

    await page.unrouteAll({ behavior: 'wait' });
    await stubApis(page, 'stale');
    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Run research and analysis', exact: true }).click();
    panel = page.getByTestId('ai-analyst-canonical-result').locator(':scope > section[aria-labelledby]');
    status = page.getByTestId('intelligence-status-panel');
    await expect(panel).toBeVisible({ timeout: 45_000 });
    await expect(status.getByText('Price observations exceed this horizon’s freshness limit.', { exact: false })).toBeVisible();
    await expect(panel.getByTestId('analyst-summary-metrics').getByText('34%')).toBeVisible();
    await expect(panel.getByText('Stale data', { exact: true })).toBeVisible();
  });

  test('keeps RTL/LTR, theme, keyboard disclosure, and mobile width behavior intact', async ({ page }) => {
    const panel = await openAnalysis(page, 'partial');
    const timeline = page.getByTestId('intelligence-timeline');
    await expect(timeline).toHaveCount(0);
    await page.getByRole('button', { name: /Show this asset/i }).click();
    await expect(timeline).toBeVisible();
    const disclosure = page.getByTestId('analyst-evidence-detail');
    await disclosure.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');

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
      { width: 1920, height: 1080 }, { width: 1440, height: 900 },
      { width: 1366, height: 768 }, { width: 1280, height: 720 },
      { width: 1024, height: 768 }, { width: 768, height: 1024 },
      { width: 430, height: 932 }, { width: 390, height: 844 },
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

  test('generates a missing reading only after explicit intent and gives guests a sign-in refresh action', async ({ page }) => {
    await stubApis(page, 'partial');
    await enterGuest(page);
    let analyzeRequests = 0;
    await page.unroute('**/api/intelligence/analyze');
    await page.route('**/api/intelligence/analyze', route => {
      analyzeRequests += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result: intelligenceResult('partial'), correlationId: 'e2e-correlation' }) });
    });
    await page.goto('/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING', { waitUntil: 'domcontentloaded' });
    const run = page.getByRole('button', { name: 'Run research and analysis', exact: true });
    await expect(run).toBeEnabled();
    expect(analyzeRequests).toBe(0);
    await run.click();
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
    await expect(readings.nth(0).getByText('No directional recommendation to evaluate', { exact: true })).toBeVisible();
    await expect(readings.nth(1).getByText('Evaluated · Direction correct', { exact: true })).toBeVisible();
    await expect(readings.nth(0).getByText('+8 points', { exact: true })).toBeVisible();
    const currentArticle = timeline.locator('article').first();
    await currentArticle.locator('summary').click();
    await expect(currentArticle.getByText('Some factor observations exceed their freshness limit.', { exact: false })).toHaveCount(1);
    await expect(currentArticle.getByText('+10 points', { exact: true })).toBeVisible();
    await expect(currentArticle.getByText('Evaluation window', { exact: true })).toHaveCount(0);
    await expect(currentArticle.getByText('STALE_FACTOR_DATA', { exact: false })).toHaveCount(0);
    await readings.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(readings.nth(1)).toBeFocused();
    await readings.nth(0).click();
    await expect(readings.nth(0)).toHaveAttribute('aria-selected', 'true');
    await readings.nth(1).click();
    await expect(readings.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(readings.nth(1)).toHaveAttribute('aria-selected', 'true');
    const compare = timeline.getByRole('button', { name: 'Compare selected readings' });
    await expect(compare).toBeEnabled();
    await compare.click();
    await expect(timeline.getByText('Selected reading comparison', { exact: true })).toBeVisible();
    await expect(timeline.getByText('Technical signals strengthened', { exact: true }).first()).toBeVisible();
  });
});
