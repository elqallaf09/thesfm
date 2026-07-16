import { expect, test, type Page } from '@playwright/test';
import { adminAuthStatePath } from './auth-state';

const adminAuthConfigured = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

const emptyPayload = {
  ok: true, hasData: false, configured: true, environment: 'production', rangeHours: 24, sampleCount: 0,
  generatedAt: '2026-07-16T10:00:00Z', lastEventAt: null, vitals: [], routes: [], errors: [], apis: [], providers: [], deployments: [],
  distributions: { browsers: [], devices: [], networks: [] }, alerts: [],
  deploymentComparison: [],
};

const populatedPayload = {
  ...emptyPayload, hasData: true, sampleCount: 240, lastEventAt: '2026-07-16T09:58:00Z',
  vitals: [
    { name: 'LCP', samples: 60, p75: 2200, good: 50, needsImprovement: 8, poor: 2 },
    { name: 'INP', samples: 60, p75: 180, good: 54, needsImprovement: 5, poor: 1 },
    { name: 'CLS', samples: 60, p75: 0.08, good: 55, needsImprovement: 4, poor: 1 },
    { name: 'FCP', samples: 30, p75: 1400, good: 24, needsImprovement: 5, poor: 1 },
    { name: 'TTFB', samples: 30, p75: 600, good: 24, needsImprovement: 5, poor: 1 },
  ],
  routes: [{ route: '/dashboard', samples: 30, p50: 180, p75: 260, p95: 500, failureRate: 0, fallbackRate: 0, cacheHitRate: 0, lastSeen: '2026-07-16T09:58:00Z', transitionP75: 260, hydrationProxyP75: 120, errors: 0 }],
  errors: [],
  apis: [{ route: '/api/market/metals', samples: 50, p50: 200, p75: 300, p95: 700, failureRate: 0.02, fallbackRate: 0, cacheHitRate: 0.6, lastSeen: '2026-07-16T09:58:00Z' }],
  providers: [{ provider: 'metals_live', samples: 50, p50: 240, p75: 380, p95: 900, failureRate: 0.3, fallbackRate: 0.32, cacheHitRate: 0.1, lastSeen: '2026-07-16T09:58:00Z' }],
  deployments: [{ deploymentSha: 'abc1234567890', samples: 240, p50: 180, p75: 260, p95: 700, failureRate: 0.01, fallbackRate: 0.08, cacheHitRate: 0.4, lastSeen: '2026-07-16T09:58:00Z' }],
  distributions: { browsers: [{ name: 'Chrome', samples: 180 }], devices: [{ name: 'desktop', samples: 140 }], networks: [{ name: '4g', samples: 160 }] },
  alerts: [{ alert_key: 'provider_failure_rate', severity: 'warning', metric_name: 'Provider failure rate', observed_value: 0.3, threshold_value: 0.2, sample_count: 50, last_seen_at: '2026-07-16T09:58:00Z' }],
};

async function mockDashboard(page: Page, payload: typeof emptyPayload | typeof populatedPayload) {
  await page.route('**/api/admin/observability?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
}

test('observability dashboard denies anonymous access', async ({ page }) => {
  const response = await page.goto('/sfm-admin-control/observability', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).toHaveURL(/\/login\?next=.*sfm-admin-control.*observability/);
});

test.describe('authenticated observability dashboard', () => {
  test.use({ storageState: adminAuthStatePath });

  test.beforeEach(() => {
    test.skip(!adminAuthConfigured, 'Admin E2E credentials are required for permission-gated dashboard coverage.');
  });

  test('renders empty state in Arabic, English, and French across themes', async ({ page }, testInfo) => {
    await mockDashboard(page, emptyPayload);
    const cases = [
      { lang: 'ar', theme: 'light', title: 'مراقبة الإنتاج', dir: 'rtl' },
      { lang: 'en', theme: 'dark', title: 'Production observability', dir: 'ltr' },
      { lang: 'fr', theme: 'light', title: 'Observabilité de production', dir: 'ltr' },
    ] as const;
    for (const item of cases) {
      await page.addInitScript(({ lang, theme }) => { localStorage.setItem('sfm_lang', lang); localStorage.setItem('the-sfm-theme', theme); }, item);
      await page.goto('/sfm-admin-control/observability', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: item.title })).toBeVisible();
      await expect(page.locator('main').filter({ has: page.getByRole('heading', { level: 1, name: item.title }) })).toHaveAttribute('dir', item.dir);
      await expect(page.getByText(/No sufficient data|لم تصل بيانات|Aucune donnée suffisante/)).toBeVisible();
      const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(4);
      await testInfo.attach(`observability-empty-${item.lang}-${item.theme}`, { body: await page.locator('main[data-sfm-shell="dashboard"]').screenshot(), contentType: 'image/png' });
    }
  });

  test('renders populated and provider-degradation states accessibly', async ({ page }, testInfo) => {
    await mockDashboard(page, populatedPayload);
    await page.addInitScript(() => { localStorage.setItem('sfm_lang', 'en'); localStorage.setItem('the-sfm-theme', 'dark'); });
    await page.goto('/sfm-admin-control/observability', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Web Vitals' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Providers' })).toBeVisible();
    await expect(page.getByText('metals_live')).toBeVisible();
    await expect(page.getByText('Provider failure rate')).toBeVisible();
    await expect(page.getByText('warning')).toBeVisible();
    await expect(page.getByText('This dashboard never exposes account identities, financial values, or raw URLs.')).toBeVisible();
    await testInfo.attach('observability-provider-degradation', { body: await page.locator('main[data-sfm-shell="dashboard"]').screenshot(), contentType: 'image/png' });
  });

  test('reports an offline refresh without losing the current page', async ({ page, context }, testInfo) => {
    await mockDashboard(page, emptyPayload);
    await page.addInitScript(() => localStorage.setItem('sfm_lang', 'en'));
    await page.goto('/sfm-admin-control/observability', { waitUntil: 'networkidle' });
    await page.unroute('**/api/admin/observability?**');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByRole('status')).toContainText('could not be refreshed');
    await expect(page).toHaveURL(/\/sfm-admin-control\/observability/);
    await testInfo.attach('observability-offline', { body: await page.locator('main[data-sfm-shell="dashboard"]').screenshot(), contentType: 'image/png' });
    await context.setOffline(false);
  });
});
