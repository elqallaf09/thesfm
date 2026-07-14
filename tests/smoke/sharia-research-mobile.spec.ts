import { expect, test } from '@playwright/test';

function screeningResult(classification = 'requires_review') {
  const source = {
    id: 'source-1',
    adapterId: 'annual-reports',
    sourceTitle: 'Example Corp 2025 Annual Report',
    publisher: 'Example Corp',
    domain: 'example.com',
    sourceUrl: 'https://example.com/investors/annual-report.pdf?utm_source=one',
    canonicalUrl: 'https://example.com/investors/annual-report.pdf',
    publicationDate: '2026-03-01',
    filingDate: null,
    retrievalDate: '2026-07-10T09:30:00.000Z',
    sourceType: 'annual_report',
    tier: 1,
    reliability: 'official',
    evidenceSnippets: ['Example Corp develops enterprise software for business customers.'],
    companyIdentifier: 'NASDAQ:EXM',
    reportingPeriod: '2025-12-31',
    contentHash: 'same-content',
    mimeType: 'application/pdf',
    extractionStatus: 'success',
    error: null,
    supports: ['business activity', 'financial values'],
  };
  const duplicate = {
    ...source,
    id: 'source-duplicate',
    sourceUrl: 'https://www.example.com/investors/annual-report.pdf?utm_campaign=copy',
    canonicalUrl: 'https://www.example.com/investors/annual-report.pdf#page=3',
    evidenceSnippets: ['Revenue categories'],
  };
  const methodology = {
    id: 'msci-islamic-index-series-assets',
    version: '2025-07',
    name: 'MSCI Islamic Index Series — new security entry screen',
    nameAr: 'منهجية سلسلة مؤشرات MSCI الإسلامية — فحص دخول ورقة مالية جديدة',
    nameFr: 'Série d’indices islamiques MSCI — filtre d’entrée',
    sourceDocument: { title: 'MSCI Islamic Index Series Methodology', publisher: 'MSCI Inc.', url: 'https://www.msci.com/methodology', versionDate: '2025-07-01' },
    businessRules: { prohibitedRevenueThreshold: 0.05, thresholdLabel: '5%', directActivityExclusions: [], supportingKeywords: {}, sourceSection: '2.1' },
    financialRatioRules: [
      { id: 'total-debt-to-assets', name: 'Total debt to total assets', nameAr: 'إجمالي الدين إلى إجمالي الأصول', nameFr: 'Dette totale sur actifs totaux', numeratorFields: ['interest_bearing_debt'], denominatorField: 'total_assets', operator: '<=', threshold: 0.3, thresholdLabel: '30%', unavailableBehavior: 'insufficient_data', sourceSection: '2.2.1' },
      { id: 'cash-interest-securities-to-assets', name: 'Cash and interest-bearing securities to total assets', nameAr: 'النقد والأوراق المالية ذات الفائدة إلى إجمالي الأصول', nameFr: 'Trésorerie et titres portant intérêt sur actifs totaux', numeratorFields: ['cash_and_equivalents', 'interest_bearing_securities'], denominatorField: 'total_assets', operator: '<=', threshold: 0.3, thresholdLabel: '30%', unavailableBehavior: 'insufficient_data', sourceSection: '2.2.1' },
      { id: 'receivables-cash-to-assets', name: 'Accounts receivable and cash to total assets', nameAr: 'الذمم المدينة والنقد إلى إجمالي الأصول', nameFr: 'Créances et trésorerie sur actifs totaux', numeratorFields: ['accounts_receivable', 'cash_and_equivalents'], denominatorField: 'total_assets', operator: '<=', threshold: 0.46, thresholdLabel: '46%', unavailableBehavior: 'insufficient_data', sourceSection: '2.2.1' },
    ],
    denominatorRules: '',
    purificationGuidance: '',
    freshnessMonths: 15,
    notes: [],
  };
  const input = (normalizedField: string, value: number) => ({ id: normalizedField, documentId: source.id, sourceUrl: source.sourceUrl, sourceTitle: source.sourceTitle, sourceTier: 1, reportingPeriod: 'FY', periodEnd: '2025-12-31', filedAt: '2026-03-01', currency: 'USD', value, unit: 'USD', originalField: normalizedField, normalizedField, normalizationFormula: normalizedField });
  return {
    id: '11111111-1111-4111-8111-111111111111',
    security: { canonicalId: 'NASDAQ:EXM', name: 'Example Corp', nameAr: 'شركة المثال', ticker: 'EXM', providerSymbol: 'EXM', exchange: 'NASDAQ', country: 'US', sector: 'Technology', industry: 'Enterprise software', currency: 'USD', aliases: [], previousNames: [], identitySources: [] },
    classification,
    confidence: 76,
    confidenceLabel: 'medium',
    confidenceExplanation: 'Evidence completeness score',
    classificationConfidence: 62,
    classificationConfidenceLabel: 'medium',
    classificationConfidenceExplanation: 'Classification confidence score',
    methodology,
    lastFinancialReportDate: '2025-12-31',
    reasons: [],
    businessScreen: { status: 'review', detectedActivities: [], officialDescriptionFound: true, prohibitedRevenueRatio: null, reasons: ['Separate prohibited-revenue and interest-income amounts were not both disclosed; neither missing value was treated as zero.'] },
    financialRatios: [
      { ruleId: 'total-debt-to-assets', name: 'Total debt to total assets', nameAr: 'إجمالي الدين إلى إجمالي الأصول', nameFr: 'Dette totale sur actifs totaux', numerator: 20, denominator: 100, value: 0.2, threshold: 0.3, formula: 'internal formula', status: 'pass', reportingPeriod: '2025-12-31', currency: 'USD', inputs: [input('interest_bearing_debt', 20), input('total_assets', 100)], warning: null },
      { ruleId: 'cash-interest-securities-to-assets', name: 'Cash and securities', nameAr: 'النقد والأوراق المالية', nameFr: 'Trésorerie et titres', numerator: 15, denominator: 100, value: 0.15, threshold: 0.3, formula: 'internal formula', status: 'pass', reportingPeriod: '2025-12-31', currency: 'USD', inputs: [input('cash_and_equivalents', 10), input('interest_bearing_securities', 5), input('total_assets', 100)], warning: null },
      { ruleId: 'receivables-cash-to-assets', name: 'Receivables and cash', nameAr: 'الذمم المدينة والنقد', nameFr: 'Créances et trésorerie', numerator: 35, denominator: 100, value: 0.35, threshold: 0.46, formula: 'internal formula', status: 'pass', reportingPeriod: '2025-12-31', currency: 'USD', inputs: [input('accounts_receivable', 25), input('cash_and_equivalents', 10), input('total_assets', 100)], warning: null },
    ],
    failedChecks: [],
    unavailableChecks: [],
    conflicts: [],
    sourceCount: 2,
    sourceQualityBreakdown: { tier1: 2, tier2: 0, tier3: 0, tier4: 0 },
    documents: [source, duplicate],
    evidence: [],
    relatedNews: [],
    retrievedAt: '2026-07-10T09:30:00.000Z',
    reportingPeriod: '2025-12-31',
    cacheState: 'live',
    warnings: ['This confidence score measures source reliability and completeness, not religious certainty.'],
  };
}

async function mockSuccessfulResearch(page: import('@playwright/test').Page) {
  const result = screeningResult();
  await page.route('**/api/sharia-research/methodologies', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, methodologies: [result.methodology], sources: [{ id: 'annual-reports', label: 'Official annual reports', enabled: true, tier: 1, requirement: null }] }),
  }));
  await page.route('**/api/sharia-research/history', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
  await page.route('**/api/sharia-research/search', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'completed', result }) }));
}

test.describe('Arabic Sharia screening and documented research page', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('keeps stocks and news visible and embeds research without horizontal overflow', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/sharia-stocks');
    const main = page.locator('[data-news-page-shell][dir="rtl"] main');
    await expect(main).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('sharia-stock-results')).toBeVisible();
    await expect(page.getByTestId('sharia-news-section')).toBeVisible();
    await expect(page.getByTestId('sharia-deep-research-entry')).toBeVisible();
    await page.screenshot({ path: 'artifacts/sharia-integrated-overview-mobile-ar.png', fullPage: true });
    await page.getByRole('button', { name: 'البحث الموثق', exact: true }).click();
    await expect(page.getByTestId('sharia-deep-research-tool')).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);
    await page.screenshot({ path: 'artifacts/sharia-integrated-mobile-ar.png', fullPage: true });
  });

  test('handles an HTML API failure safely and retries the same NVDA search', async ({ page }) => {
    test.setTimeout(90_000);
    let attempts = 0;
    await page.route('**/api/sharia-research/search', async route => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 500, contentType: 'text/html', body: '<!DOCTYPE html><title>private server error</title>' });
        return;
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, ok: true, jobId: 'job-test', status: 'queued', progress: 5, currentStep: 'identifying_security' }),
      });
    });
    await page.route('**/api/sharia-research/jobs/job-test', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ok: true,
        job: { id: 'job-test', status: 'running', progress: 25, currentStep: 'searching_official_sources', candidates: [], partialErrors: [], resultId: null, error: null, expiresAt: '2099-01-01T00:00:00.000Z' },
      }),
    }));

    await page.goto('/sharia-stocks?tab=research');
    await page.getByRole('textbox', { name: 'اسم الشركة أو رمز السهم أو رقم ISIN' }).fill('NVDA');
    await page.getByRole('button', { name: 'تحليل السهم' }).click();
    await expect(page.getByText('تعذر الاتصال بخدمة البحث. يرجى المحاولة مرة أخرى.')).toBeVisible();
    await expect(page.getByText(/Unexpected token|<!DOCTYPE/)).toHaveCount(0);
    await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
    await expect(page.getByText('جارٍ إعداد التحليل الشرعي')).toBeVisible();
    expect(attempts).toBe(2);
  });

  test('honors a market-selected company search and turns a terminal job into a retryable error', async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route('**/api/sharia-research/search', async route => {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'failed', jobId: 'failed-job', progress: 100, currentStep: 'preparing_result' }),
      });
    });

    await page.goto('/sharia-stocks?tab=research');
    await page.getByRole('textbox', { name: 'اسم الشركة أو رمز السهم أو رقم ISIN' }).fill('Emirates NBD');
    await page.getByRole('combobox', { name: 'السوق' }).selectOption('DFM');
    await page.getByRole('button', { name: 'تحليل السهم' }).click();

    await expect(page.getByText('تعذر إكمال التحليل بالبيانات المسترجعة. لم تُفترض أي قيم مفقودة.')).toBeVisible();
    await expect(page.getByText('جارٍ إعداد التحليل الشرعي')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ query: 'Emirates NBD', market: 'DFM' });
  });

  test('renders a compact result, accessible report tabs and disclosures, deduplicated sources, and print/PDF output', async ({ page, browserName }) => {
    test.setTimeout(60_000);
    await mockSuccessfulResearch(page);
    await page.goto('/sharia-stocks?tab=research');
    await page.getByRole('textbox', { name: 'اسم الشركة أو رمز السهم أو رقم ISIN' }).fill('EXM');
    await page.getByRole('button', { name: 'تحليل السهم' }).click();

    const report = page.locator('[data-compliance-report]');
    await expect(report).toBeVisible();
    await expect(page.getByRole('heading', { name: 'يتطلب مراجعة شرعية', exact: true }).first()).toBeVisible();
    const reportTabs = report.getByRole('combobox');
    await expect(reportTabs).toHaveCount(1);
    await expect(reportTabs).toHaveAccessibleName(/\S/);
    await expect(reportTabs).toHaveValue('result');
    await expect(report.locator('[role="tab"]')).toHaveCount(7);
    await expect(report.locator('#compliance-report-tab-result')).toHaveAttribute('aria-selected', 'true');
    await expect(report.locator('#compliance-report-panel-result')).toBeVisible();
    await expect(report.locator('#compliance-report-panel-financial-ratios')).toHaveCount(0);

    await reportTabs.selectOption('financial-ratios');
    await expect(report.locator('#compliance-report-tab-financial-ratios')).toHaveAttribute('aria-selected', 'true');
    await expect(report.locator('#compliance-report-panel-financial-ratios')).toBeVisible();
    await expect(page).toHaveURL(/(?:\?|&)reportTab=financial-ratios(?:&|$)/);
    await expect(page.getByText('≤ 30%', { exact: true }).first()).toBeVisible();
    const calculationsDisclosure = report.locator('[data-accordion="screening-calculations"] > button');
    await expect(calculationsDisclosure).toHaveAttribute('aria-expanded', 'false');

    const stickyPosition = await page.locator('section[aria-label="اسم الشركة أو رمز السهم أو رقم ISIN"]').evaluate(element => getComputedStyle(element).position);
    expect(stickyPosition).toBe('sticky');
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);

    await page.getByRole('button', { name: 'توسيع الكل' }).click();
    await expect(calculationsDisclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/interest_bearing_debt|total_assets|internal formula/)).toHaveCount(0);

    await reportTabs.selectOption('sources');
    const sourcesPanel = report.locator('#compliance-report-panel-sources');
    await expect(sourcesPanel).toBeVisible();
    await expect(sourcesPanel.locator('article')).toHaveCount(1);
    await expect(sourcesPanel.getByRole('heading', { name: 'Example Corp', exact: true, level: 4 })).toHaveCount(1);
    const sourceDisclosure = sourcesPanel.locator('details');
    await expect(sourceDisclosure).not.toHaveAttribute('open', '');
    await sourceDisclosure.locator('summary').click();
    await expect(sourceDisclosure).toHaveAttribute('open', '');
    await expect(page.getByText(/https:\/\/example\.com\/investors/)).toHaveCount(0);

    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: 'نسخ رابط التقرير' }).click();
      const reportLink = await page.evaluate(() => navigator.clipboard.readText());
      expect(reportLink).toContain('tab=research');
      expect(reportLink).toContain('result=11111111-1111-4111-8111-111111111111');
    }
    await page.getByRole('button', { name: 'حفظ في قائمة المتابعة' }).click();
    await expect(page.getByRole('button', { name: 'تم الحفظ في قائمة المتابعة' })).toBeDisabled();
    const savedWatchlist = await page.evaluate(() => JSON.parse(localStorage.getItem('sfm_market_watchlist') || '[]'));
    expect(savedWatchlist.some((item: { symbol?: string }) => item.symbol === 'EXM')).toBe(true);

    await page.evaluate(() => {
      const scope = window as Window & { __printReportPanels?: Array<{ id: string; display: string }> };
      window.print = () => {
        scope.__printReportPanels = Array.from(document.querySelectorAll<HTMLElement>('[id^="compliance-report-panel-"]')).map(panel => ({
          id: panel.id,
          display: getComputedStyle(panel).display,
        }));
      };
    });
    await page.getByRole('button', { name: 'طباعة التقرير', includeHidden: true }).evaluate(button => (button as HTMLButtonElement).click());
    await expect.poll(() => page.evaluate(() => (window as Window & { __printReportPanels?: unknown[] }).__printReportPanels?.length ?? 0)).toBe(7);
    const printPanels = await page.evaluate(() => (window as Window & { __printReportPanels?: Array<{ id: string; display: string }> }).__printReportPanels ?? []);
    expect(printPanels.filter(panel => panel.display === 'none')).toEqual([]);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'تنزيل تقرير PDF' })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'تنزيل تقرير PDF' }).click();
    const popup = await popupPromise;
    await expect(popup.getByRole('heading', { name: 'تقرير التوافق الشرعي للسهم' })).toBeVisible();
    await expect(popup.getByText('Example Corp', { exact: true })).toBeVisible();
    await popup.close();
  });

  test('keeps readable gutters, typography, touch targets, and dark mode from 360px to desktop', async ({ page }) => {
    test.setTimeout(90_000);
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
    await mockSuccessfulResearch(page);
    await page.goto('/sharia-stocks?tab=research');
    await page.getByRole('textbox', { name: 'اسم الشركة أو رمز السهم أو رقم ISIN' }).fill('EXM');
    await page.getByRole('button', { name: 'تحليل السهم' }).click();
    await expect(page.locator('[data-compliance-report]')).toBeVisible();
    const reportTabs = page.locator('[data-compliance-report]').getByRole('combobox');
    await reportTabs.selectOption('financial-ratios');
    await expect(page.locator('[data-ratio-status]').first()).toBeVisible();

    for (const viewport of [
      { width: 360, height: 800, name: 'android-360' },
      { width: 390, height: 844, name: 'iphone-390' },
      { width: 768, height: 1024, name: 'tablet-768' },
      { width: 1440, height: 900, name: 'desktop-1440' },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const metrics = await page.evaluate(() => {
        const report = document.querySelector<HTMLElement>('[data-compliance-report]')!;
        const ratioText = document.querySelector<HTMLElement>('[data-ratio-status] p')!;
        const action = document.querySelector<HTMLElement>('[data-compliance-report] button')!;
        const rect = report.getBoundingClientRect();
        return {
          viewport: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          leftGutter: rect.left,
          rightGutter: innerWidth - rect.right,
          textSize: Number.parseFloat(getComputedStyle(ratioText).fontSize),
          touchHeight: action.getBoundingClientRect().height,
        };
      });
      expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport + 1);
      expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewport + 1);
      expect(metrics.leftGutter).toBeGreaterThanOrEqual(15);
      expect(metrics.rightGutter).toBeGreaterThanOrEqual(15);
      expect(metrics.textSize).toBeGreaterThanOrEqual(14);
      expect(metrics.touchHeight).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `artifacts/sharia-report-${viewport.name}-light-ar.png`, fullPage: true });
    }

    await page.evaluate(() => {
      localStorage.setItem('the-sfm-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const darkColors = await page.locator('[data-compliance-report]').evaluate(element => {
      const card = element.querySelector<HTMLElement>('section')!;
      const style = getComputedStyle(card);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(darkColors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(darkColors.background).not.toBe(darkColors.color);
    await page.screenshot({ path: 'artifacts/sharia-report-iphone-390-dark-ar.png', fullPage: true });
    expect({ consoleErrors, badResponses }).toEqual({ consoleErrors: [], badResponses: [] });
  });

  test('loads an owned report link once without fetching unrelated hub data', async ({ page }) => {
    const result = screeningResult();
    let resultLoads = 0;
    const unrelatedRequests: string[] = [];
    await page.route('**/api/sharia-research/methodologies', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, methodologies: [result.methodology], sources: [] }) }));
    await page.route('**/api/sharia-research/history', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
    await page.route('**/api/sharia-research/results/11111111-1111-4111-8111-111111111111', route => {
      resultLoads += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
    });
    page.on('request', request => {
      if (/\/api\/(market\/tickers\/shariah|sharia-stocks\/(screening|news))/.test(request.url())) unrelatedRequests.push(request.url());
    });

    await page.goto('/sharia-stocks?tab=research&result=11111111-1111-4111-8111-111111111111');
    await expect(page.locator('[data-compliance-report]')).toBeVisible();
    expect(resultLoads).toBe(1);
    expect(unrelatedRequests).toEqual([]);
  });

  for (const language of ['en', 'fr'] as const) {
    test(`uses ${language.toUpperCase()} LTR copy without Arabic UI leakage`, async ({ page }) => {
      await page.addInitScript(lang => localStorage.setItem('sfm_lang', lang), language);
      await mockSuccessfulResearch(page);
      await page.goto('/sharia-stocks?tab=research');
      const expectedLabel = language === 'fr' ? 'Société, symbole ou ISIN' : 'Company, ticker, or ISIN';
      await page.getByRole('textbox', { name: expectedLabel }).fill('EXM');
      await page.getByRole('button', { name: language === 'fr' ? 'Analyser l’action' : 'Analyze stock' }).click();
      await expect(page.locator('[data-testid="sharia-deep-research-tool"]')).toHaveAttribute('dir', 'ltr');
      await expect(page.getByText(language === 'fr' ? 'Examen charia requis' : 'Requires Shariah review').first()).toBeVisible();
      await expect(page.getByRole('button', { name: language === 'fr' ? 'Tout développer' : 'Expand all' })).toBeVisible();
    });
  }
});
