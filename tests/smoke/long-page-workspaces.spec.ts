import { expect, test, type Page } from '@playwright/test';
import { createReadStream } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

const publicRoot = path.join(process.cwd(), 'src', 'trader-app', 'public');
const qaEnabled = process.env.SFM_LOCAL_TRADER_QA === '1';
let staticServer: Server;
let terminalPath = '';

async function configureTerminal(page: Page, language: 'ar' | 'en' | 'fr', theme: 'light' | 'dark') {
  await page.addInitScript(({ language: nextLanguage, theme: nextTheme }) => {
    localStorage.setItem('sfm_lang', nextLanguage);
    localStorage.setItem('the-sfm-theme', nextTheme);
    localStorage.setItem('sfmTraderTheme', nextTheme);
    localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ lang: nextLanguage, language: nextLanguage, theme: nextTheme }));
  }, { language, theme });
}

test.describe('long-page workspaces', () => {
  test.beforeAll(async () => {
    staticServer = await createStaticTraderServer();
    const address = staticServer.address();
    if (!address || typeof address === 'string') throw new Error('Static Trader server did not expose a port.');
    terminalPath = `http://127.0.0.1:${address.port}/thesfm-trader-own/app/index.html`;
  });

  test.afterAll(async () => {
    await new Promise<void>(resolve => staticServer.close(() => resolve()));
  });

  test('calendar tabs deep-link, use browser history, isolate failures, and lazy-load once', async ({ page }) => {
    test.setTimeout(60_000);
    const requests: string[] = [];
    await configureTerminal(page, 'en', 'light');
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const normalizedRequest = `${url.pathname}${url.search}`.toLowerCase();
      requests.push(normalizedRequest);
      const isEarnings = url.pathname.toLowerCase().endsWith('/trader/calendar/earnings');
      if (isEarnings) await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({
        status: isEarnings ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify(isEarnings
          ? { success: false, status: 'error', message: 'Earnings source unavailable' }
          : {
              success: true,
              status: 'available',
              items: [],
              data: [],
              dataProvider: { configured: true, status: 'connected', provider: 'test' },
            }),
      });
    });

    await page.goto(`${terminalPath}?route=calendar`, { waitUntil: 'domcontentloaded' });
    const tabList = page.getByRole('tablist', { name: /market calendar workspace/i });
    await expect(tabList).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Overview/ })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => requests.filter(url => url.includes('/trader/provider-status')).length).toBe(1);
    expect(requests.some(url => url.includes('/trader/calendar/earnings'))).toBe(false);

    const earnings = page.getByRole('tab', { name: /^Earnings/ });
    await earnings.click();
    await expect(page).toHaveURL(/(?:\?|&)view=earnings(?:&|$)/);
    await expect(earnings).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => requests.filter(url => url.includes('/trader/calendar/earnings')).length).toBe(1);
    const earningsPanelId = await earnings.getAttribute('aria-controls');
    const earningsPanel = page.locator(`#${earningsPanelId}`);
    await expect(earningsPanel).toHaveAttribute('role', 'tabpanel');
    await expect(earningsPanel).toContainText('Unable to load data');

    const dividends = page.getByRole('tab', { name: /^Dividends/ });
    await dividends.click();
    await expect.poll(() => requests.filter(url => url.includes('/trader/calendar/dividends')).length).toBe(1);
    await expect(dividends).toHaveAttribute('aria-selected', 'true');
    const dividendsPanelId = await dividends.getAttribute('aria-controls');
    const dividendsPanel = page.locator(`#${dividendsPanelId}`);
    await expect(dividendsPanel).toHaveAttribute('role', 'tabpanel');
    await expect(dividendsPanel).not.toContainText('Unable to load data');
    await expect(page.locator(`#${earningsPanelId}`)).toHaveCount(0);

    const issues = page.getByRole('tab', { name: /^Issues/ });
    await issues.click();
    const issueDetails = page.locator('[data-workspace-panel="issues"] details');
    await expect(issueDetails).toHaveCount(1);
    await expect(issueDetails.locator('summary')).toContainText('Earnings');
    await dividends.click();
    await expect.poll(() => requests.filter(url => url.includes('/trader/calendar/dividends')).length).toBe(1);

    await earnings.click();
    await expect.poll(() => requests.filter(url => url.includes('/trader/calendar/earnings')).length).toBe(1);
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/(?:\?|&)view=dividends(?:&|$)/);
    await expect(page.locator('[data-workspace-scope="calendar"][data-workspace-tab="dividends"]')).toHaveAttribute('aria-selected', 'true');
    await page.evaluate(() => window.history.forward());
    await expect(page).toHaveURL(/(?:\?|&)view=earnings(?:&|$)/);
    await expect(page.locator('[data-workspace-scope="calendar"][data-workspace-tab="earnings"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('production wrapper bridges workspace deep links and history to the host URL', async ({ page }) => {
    test.skip(!qaEnabled, 'Set SFM_LOCAL_TRADER_QA=1 for the authenticated production wrapper.');
    test.setTimeout(60_000);
    await configureTerminal(page, 'en', 'light');
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'available',
        items: [],
        data: [],
        dataProvider: { configured: true, status: 'connected', provider: 'test' },
      }),
    }));

    await page.goto('/thesfm-trader-own/calendar?view=earnings', { waitUntil: 'domcontentloaded' });
    const iframeElement = page.locator('iframe[title="SFM Smart Analyzer"]');
    const terminal = page.frameLocator('iframe[title="SFM Smart Analyzer"]');
    await expect(iframeElement).toHaveAttribute('src', '/thesfm-trader-own/app/index.html?route=calendar');

    const earnings = terminal.locator('[data-workspace-scope="calendar"][data-workspace-tab="earnings"]');
    const dividends = terminal.locator('[data-workspace-scope="calendar"][data-workspace-tab="dividends"]');
    await expect(earnings).toHaveAttribute('aria-selected', 'true');
    await terminal.locator('html').evaluate(element => { element.dataset.hostHistorySentinel = 'mounted'; });

    await dividends.click();
    await expect(page).toHaveURL(/\/thesfm-trader-own\/calendar\?view=dividends$/);
    await expect(dividends).toHaveAttribute('aria-selected', 'true');
    await expect(terminal.locator('html')).toHaveAttribute('data-host-history-sentinel', 'mounted');

    await page.goBack();
    await expect(page).toHaveURL(/\/thesfm-trader-own\/calendar\?view=earnings$/);
    await expect(earnings).toHaveAttribute('aria-selected', 'true');
  });

  test('cross-route navigation hydrates the destination once and reuses its cache', async ({ page }) => {
    test.setTimeout(60_000);
    const requests: string[] = [];
    await configureTerminal(page, 'en', 'light');
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      requests.push(`${url.pathname}${url.search}`.toLowerCase());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'available',
          items: [],
          data: [],
          recommendations: [],
          signals: [],
          trades: [],
          markets: [],
          dataProvider: { configured: true, status: 'connected', provider: 'test' },
        }),
      });
    });

    await page.goto(`${terminalPath}?route=calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-workspace-tablist="calendar"]')).toBeVisible();
    await expect.poll(() => countRequests(requests, '/api/trader/provider-status')).toBe(1);
    expect(countRequests(requests, '/api/recommendations', 'market=')).toBe(0);

    const dashboardLink = page.locator('[data-route="dashboard"][href$="/dashboard"]:visible').first();
    await dashboardLink.click();
    await expect(page.locator('[data-workspace-tablist="dashboard"]')).toBeVisible();
    await expect.poll(() => countRequests(requests, '/api/recommendations', 'market=')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/recommendations', 'symbols=')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/market/signals')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/market/signal-alerts')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/markets')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/market-news')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/followed-trades')).toBe(1);
    expect(countRequests(requests, '/api/trader/provider-status')).toBe(1);

    const hydratedCounts = [...requests];
    await page.goBack();
    await expect(page.locator('[data-workspace-tablist="calendar"]')).toBeVisible();
    await dashboardLink.click();
    await expect(page.locator('[data-workspace-tablist="dashboard"]')).toBeVisible();
    await expect.poll(() => requests.length).toBe(hydratedCounts.length);
    expect(requests).toEqual(hydratedCounts);

    await page.locator('[data-workspace-scope="dashboard"][data-workspace-tab="analysis"]').click();
    await expect(page).toHaveURL(/(?:\?|&)view=analysis(?:&|$)/);
    await page.locator('[data-route="calendar"]').first().evaluate((link: HTMLElement) => link.click());
    await expect(page.locator('[data-workspace-tablist="calendar"]')).toBeVisible();
    await page.locator('[data-market-selector-toggle]').click();
    await page.locator('[data-select-market="forex"]').click();
    expect(countRequests(requests, '/api/recommendations', 'market=forex')).toBe(0);

    await page.goBack();
    await expect(page.locator('[data-workspace-tablist="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-workspace-scope="dashboard"][data-workspace-tab="analysis"]')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => countRequests(requests, '/api/recommendations', 'market=forex')).toBe(1);
    await expect.poll(() => countRequests(requests, '/api/market-news', 'market=forex')).toBe(1);
  });

  test('an invalidated slow market response cannot overwrite the current market', async ({ page }) => {
    test.setTimeout(60_000);
    let releaseInitialMarket: () => void = () => {};
    const initialMarketGate = new Promise<void>(resolve => { releaseInitialMarket = resolve; });
    let initialMarketStarted = false;
    let initialMarketFinished = false;
    const requests: string[] = [];
    await configureTerminal(page, 'en', 'light');
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const normalizedRequest = `${url.pathname}${url.search}`.toLowerCase();
      requests.push(normalizedRequest);

      let recommendations: Array<Record<string, unknown>> = [];
      if (url.pathname.toLowerCase().endsWith('/recommendations') && url.searchParams.get('market') === 'us-stocks') {
        initialMarketStarted = true;
        await initialMarketGate;
        recommendations = [recommendationFixture('AAPL', 'Old market result', 'stock', 'USD')];
        initialMarketFinished = true;
      } else if (url.pathname.toLowerCase().endsWith('/recommendations') && url.searchParams.get('market') === 'forex') {
        recommendations = [recommendationFixture('EURUSD', 'Current market result', 'forex', 'USD')];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'available',
          recommendations,
          signals: [],
          items: [],
          data: [],
          markets: [],
          trades: [],
          dataProvider: { configured: true, status: 'connected', provider: 'test' },
        }),
      });
    });

    await page.goto(`${terminalPath}?route=dashboard`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => initialMarketStarted).toBe(true);
    await page.locator('[data-market-selector-toggle]').click();
    await page.locator('[data-select-market="forex"]').click();
    await expect.poll(() => countRequests(requests, '/api/recommendations', 'market=forex')).toBe(1);

    releaseInitialMarket();
    await expect.poll(() => initialMarketFinished).toBe(true);
    await expect(page.locator('[data-workspace-tablist="dashboard"]')).toBeVisible();
    await page.locator('[data-workspace-scope="dashboard"][data-workspace-tab="recommendations"]').click();
    const recommendationPanel = page.locator('[data-workspace-panel="recommendations"]');
    await expect(recommendationPanel).toContainText('EURUSD');
    await expect(recommendationPanel).not.toContainText('AAPL');
  });

  test('tabs support RTL keyboard order, dark mode, readable labels, and no page overflow', async ({ page }) => {
    await configureTerminal(page, 'ar', 'dark');
    await page.route('**/api/**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, status: 'unavailable', message: '' }),
    }));

    await page.goto(`${terminalPath}?route=calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const tabs = page.locator('[data-workspace-tablist="calendar"] [role="tab"]');
    await expect(tabs).toHaveCount(7);
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.last()).toBeFocused();

    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      labels: Array.from(document.querySelectorAll<HTMLElement>('[data-workspace-tablist="calendar"] [role="tab"]')).map(tab => ({
        text: tab.innerText.trim(),
        height: tab.getBoundingClientRect().height,
        visible: tab.getClientRects().length > 0,
      })),
    }));
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.labels.every(label => label.visible && label.text.length > 0 && label.height >= 36)).toBe(true);
  });

  test('French uses LTR with readable, unclipped workspace labels', async ({ page }) => {
    await configureTerminal(page, 'fr', 'light');
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'available',
        items: [],
        data: [],
        dataProvider: { configured: true, status: 'connected', provider: 'test' },
      }),
    }));

    await page.goto(`${terminalPath}?route=calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('tab', { name: /^Vue d[’']ensemble/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Résultats/ })).toBeVisible();

    const layout = await workspaceLayout(page, 'calendar');
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.labels.every(label => label.visible && label.text.length > 0 && !label.clipped)).toBe(true);
  });

  test('mobile projects and the fallback mobile viewport keep tabs scrollable without page overflow', async ({ page }, testInfo) => {
    const projectViewport = page.viewportSize();
    const usesMobileProject = testInfo.project.name.startsWith('mobile-');
    if (usesMobileProject) {
      expect(projectViewport).not.toBeNull();
      expect(projectViewport!.width).toBeLessThanOrEqual(430);
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
    }

    await configureTerminal(page, 'ar', 'dark');
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'available',
        items: [],
        data: [],
        dataProvider: { configured: true, status: 'connected', provider: 'test' },
      }),
    }));

    await page.goto(`${terminalPath}?route=calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const layout = await workspaceLayout(page, 'calendar');
    expect(layout.viewport).toBeLessThanOrEqual(430);
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.tabList.scrollable).toBe(true);
    expect(['auto', 'scroll']).toContain(layout.tabList.overflowX);
    expect(layout.labels.every(label => label.visible && label.text.length > 0 && !label.clipped)).toBe(true);
  });
});

async function workspaceLayout(page: Page, scope: string) {
  return page.evaluate(nextScope => {
    const tabList = document.querySelector<HTMLElement>(`[data-workspace-tablist="${nextScope}"]`);
    const labels = Array.from(tabList?.querySelectorAll<HTMLElement>('[role="tab"]') || []);
    return {
      viewport: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      tabList: {
        scrollable: Boolean(tabList && tabList.scrollWidth > tabList.clientWidth + 1),
        overflowX: tabList ? getComputedStyle(tabList).overflowX : '',
      },
      labels: labels.map(tab => ({
        text: tab.innerText.trim(),
        visible: tab.getClientRects().length > 0,
        clipped: tab.scrollWidth > tab.clientWidth + 1 || tab.scrollHeight > tab.clientHeight + 1,
      })),
    };
  }, scope);
}

function countRequests(requests: string[], pathname: string, searchFragment = '') {
  return requests.filter(request => {
    const url = new URL(request, 'http://127.0.0.1');
    return url.pathname === pathname && (!searchFragment || url.search.includes(searchFragment));
  }).length;
}

function recommendationFixture(symbol: string, name: string, assetType: string, currency: string) {
  return {
    symbol,
    name,
    assetType,
    market: assetType,
    currency,
    price: 100,
    currentPrice: 100,
    changePercent: 1,
    signal: 'buy',
    confidence: 88,
    targetPrice: 110,
    stopLoss: 95,
    available: true,
  };
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
