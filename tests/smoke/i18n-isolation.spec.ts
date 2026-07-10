import { expect, test, type Page } from '@playwright/test';

type Locale = 'ar' | 'en' | 'fr';
const terminalPath = process.env.TRADER_E2E_PATH || '/thesfm-trader-own/app/index.html';

const localeExpectations: Record<Locale, {
  dir: 'rtl' | 'ltr';
  dashboard: string[];
  settings: string;
  education: string;
  news: string;
  calendar: string;
  forbidden: RegExp[];
}> = {
  ar: {
    dir: 'rtl',
    dashboard: ['آخر الأخبار', 'حالة التحليل الذكي', 'حالة النظام'],
    settings: 'إعدادات النظام',
    education: 'مركز التعليم',
    news: 'أخبار السوق',
    calendar: 'تقويم السوق',
    forbidden: [/Latest news/i, /AI analysis status/i, /System status/i, /Data provider connected/i, /\bRetry\b/i, /Open scanner/i, /News page/i, /Unable to load data/i, /\b(DASHBOARD|MARKETS|WATCHLIST|PORTFOLIO|ALERTS|RECOMMENDATIONS|NEWS|CALENDAR|EDUCATION|SETTINGS)\b/],
  },
  en: {
    dir: 'ltr',
    dashboard: ['Latest news', 'AI analysis status', 'System status'],
    settings: 'System settings',
    education: 'Education center',
    news: 'Market news',
    calendar: 'Market calendar',
    forbidden: [/[؀-ۿ]/],
  },
  fr: {
    dir: 'ltr',
    dashboard: ['Dernières actualités', 'État de l’analyse IA', 'État du système'],
    settings: 'Paramètres du système',
    education: 'Centre de formation',
    news: 'Actualités des marchés',
    calendar: 'Calendrier des marchés',
    forbidden: [/Latest news/i, /AI analysis status/i, /System status/i, /Data provider connected/i, /\bRetry\b/i, /Open scanner/i, /News page/i, /\b(Top gainers|Top losers|DASHBOARD|MARKETS|WATCHLIST|PORTFOLIO|ALERTS|RECOMMENDATIONS|NEWS|CALENDAR|EDUCATION|SETTINGS)\b/, /[؀-ۿ]/],
  },
};

async function openTerminal(page: Page, locale: Locale, route: string) {
  await page.route('**/api/**', async requestRoute => {
    await requestRoute.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, success: false, code: 'PROVIDER_UNAVAILABLE', message: '' }),
    });
  });
  await page.addInitScript((lang: Locale) => {
    localStorage.setItem('sfm_lang', lang);
    localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ lang, language: lang }));
  }, locale);
  await page.goto(`${terminalPath}?route=${encodeURIComponent(route)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#terminal-content')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', localeExpectations[locale].dir);
  await expect(page.locator('body')).toHaveAttribute('dir', localeExpectations[locale].dir);
  await expect(page.locator(`[data-language="${locale}"]`).first()).toHaveAttribute('aria-pressed', 'true');
  await page.waitForFunction(() => !document.querySelector('#terminal-content .loading-panel'), undefined, { timeout: 12_000 });
}

for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`${locale} keeps terminal routes language-isolated`, async ({ page }) => {
    test.setTimeout(90_000);
    const expected = localeExpectations[locale];

    await openTerminal(page, locale, 'dashboard');
    const dashboardText = await page.locator('#terminal-content').innerText();
    for (const label of expected.dashboard) expect(dashboardText).toContain(label);
    for (const forbidden of expected.forbidden) expect(dashboardText).not.toMatch(forbidden);

    const routes = [
      ['market-analysis/stocks', locale === 'ar' ? 'التوصيات والتحليل' : locale === 'fr' ? 'Recommandations et analyse' : 'Recommendations and analysis'],
      ['markets/us-stocks', locale === 'ar' ? 'الأسهم الأمريكية' : locale === 'fr' ? 'Actions américaines' : 'US Stocks'],
      ['news', expected.news],
      ['calendar', expected.calendar],
      ['education', expected.education],
      ['settings', expected.settings],
    ] as const;

    for (const [route, label] of routes) {
      await page.evaluate(({ path, nextRoute }) => {
        history.pushState({}, '', `${path}?route=${encodeURIComponent(nextRoute)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, { path: terminalPath, nextRoute: route });
      await expect(page.locator('#terminal-content')).toContainText(label);
      await expect(page.locator('html')).toHaveAttribute('dir', expected.dir);
      const text = await page.locator('#terminal-content').innerText();
      for (const forbidden of expected.forbidden) expect(text).not.toMatch(forbidden);
    }
  });
}
