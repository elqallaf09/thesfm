import { expect, test, type Page } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

type Locale = 'ar' | 'en' | 'fr';
const configuredTerminalPath = process.env.TRADER_E2E_PATH;
const publicRoot = path.join(process.cwd(), 'src', 'trader-app', 'public');
let staticServer: Server | undefined;
let terminalPath = '';

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
    dashboard: ['آخر الأخبار', 'حالة تحليل الذكاء الاصطناعي', 'حالة النظام'],
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
  }, locale);
  await page.goto(`${terminalPath}?route=${encodeURIComponent(route)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#terminal-content')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', localeExpectations[locale].dir);
  await expect(page.locator('body')).toHaveAttribute('dir', localeExpectations[locale].dir);
  await expect(page.locator('[data-language], #terminal-language-switcher')).toHaveCount(0);
  await page.waitForFunction(() => !document.querySelector('#terminal-content .loading-panel'), undefined, { timeout: 12_000 });
}

test.beforeAll(async () => {
  if (configuredTerminalPath) {
    terminalPath = configuredTerminalPath;
    return;
  }

  staticServer = await createStaticTraderServer();
  const address = staticServer.address();
  if (!address || typeof address === 'string') throw new Error('Static Trader server did not expose a port.');
  terminalPath = `http://127.0.0.1:${address.port}/thesfm-trader-own/app/index.html`;
});

test.afterAll(async () => {
  const server = staticServer;
  if (!server) return;
  await new Promise<void>(resolve => server.close(() => resolve()));
});

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

function createStaticTraderServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const resolved = staticPathFor(url.pathname);
    if (!resolved) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const extension = path.extname(resolved).toLowerCase();
    response.writeHead(200, { 'content-type': mimeType(extension), 'cache-control': 'no-store' });
    createReadStream(resolved).on('error', () => response.end('Not found')).pipe(response);
  });
  return new Promise<Server>(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function staticPathFor(urlPath: string) {
  let filePath = decodeURIComponent(urlPath);
  if (filePath.startsWith('/thesfm-trader-own/app/')) filePath = filePath.slice('/thesfm-trader-own/app/'.length);
  else filePath = filePath.replace(/^\/+/, '');
  if (!filePath || filePath.endsWith('/')) filePath = `${filePath}index.html`;
  const resolved = path.resolve(publicRoot, filePath);
  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  return resolved;
}

function mimeType(extension: string) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }[extension] || 'application/octet-stream';
}
