import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

// Contract fixtures only: never used by a production route/provider/cache.
const root = path.join(process.cwd(), 'src/trader-app/public');
const prefix = '/thesfm-trader-own/app/';
const semanticCss = ['tokens.css', 'themes.css'].map(file => readFileSync(path.join(process.cwd(), 'src/styles', file), 'utf8')).join('\n');
let server: Server;
let origin: string;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    response.setHeader('cache-control', 'no-store');
    if (url.pathname === '/host') {
      response.setHeader('content-type', 'text/html');
      response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe id="trader" title="Trader test host" style="width:100%;height:100vh;border:0" src="${prefix}index.html?route=watchlist"></iframe></body></html>`);
      return;
    }
    // No production authentication bypass: this server is isolated test infrastructure.
    const relative = decodeURIComponent(url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname.slice(1));
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(404).end(); return; }
    try {
      const ext = path.extname(file);
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
      response.setHeader('content-type', mime[ext] || 'application/octet-stream');
      let content: string | Buffer = relative === 'semantic-tokens.css' ? semanticCss : readFileSync(file);
      if (ext === '.html') content = content.toString().replaceAll('src="/', `src="${prefix}`).replaceAll('href="/', `href="${prefix}`);
      response.end(content);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });

function fixture(symbol: string, phase: string, stale = false) {
  const currency = symbol.endsWith('.SR') ? 'SAR' : symbol.endsWith('.KW') ? 'KWD' : 'USD';
  const price = symbol.endsWith('.SR') ? 27.5 : symbol.endsWith('.KW') ? 0.825 : 501.25;
  const analysis = phase === 'analysis' && !stale;
  const stamp = new Date(Date.now() - (stale ? 24 * 3600000 : 0)).toISOString();
  return { symbol, requestedSymbol: symbol, canonicalSymbol: symbol, name: `QA ${symbol}`, currency,
    price, currentPrice: price, available: true, provider: 'fmp', source: 'QA provider fixture',
    changePercent: 2, dataQuality: 'complete', dataQualityStatus: { status: 'complete' },
    technicalAvailable: analysis, signalAvailable: analysis, finalRecommendation: analysis ? 'Buy' : 'Insufficient data',
    confidence: analysis ? 75 : null, aiConfidence: analysis ? 75 : null, finalScore: analysis ? 80 : null,
    targetPrice: analysis ? price * 1.1 : null, stopLoss: analysis ? price * 0.96 : null,
    support: price * 0.97, resistance: price * 1.12, atr: price * 0.02, rsi: 60,
    ema20: price * 0.99, ema50: price * 0.98, macd: 2, macdSignal: 1, riskLevel: 'medium',
    newsSentimentSummary: { status: 'available', articleCount: 2 }, dataSufficiency: { sufficient: analysis },
    engine: { version: 1, quoteStatus: stale ? 'stale' : 'available', analysisStatus: stale ? 'stale' : analysis ? 'available' : 'pending', asOf: stamp, fetchedAt: stamp, reason: null },
  };
}

async function prepare(page: Page, symbols = ['MSFT'], lang = 'en', theme = 'light') {
  await page.addInitScript(({ symbols, lang, theme }) => {
    // Preserve add/remove and cache behavior when a test deliberately reloads.
    if (!localStorage.getItem('sfmTraderWatchlist:v3')) localStorage.setItem('sfmTraderWatchlist:v3', JSON.stringify(symbols));
    localStorage.setItem('sfm_lang', lang);
    localStorage.setItem('the-sfm-theme', theme);
    localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ defaultMarket: 'kuwait', quickTickerVisible: false }));
  }, { symbols, lang, theme });
  await page.route(/^https:\/\//, route => route.abort()); // Deterministic, no provider credentials or live paid calls.
}

async function mockApi(page: Page, handler?: (route: Route, url: URL) => Promise<void>) {
  const calls: string[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    calls.push(url.pathname + url.search);
    if (url.pathname === '/api/watchlist') {
      if (handler) return handler(route, url);
      const phase = url.searchParams.get('phase') || 'quotes';
      const rows = (url.searchParams.get('symbols') || '').split(',').filter(Boolean).map(id => fixture(id, phase));
      await route.fulfill({ json: { ok: true, engineVersion: 1, phase, rows } });
    } else {
      // The general market feed intentionally NEVER contains MSFT.
      await route.fulfill({ json: { success: true, status: 'available', recommendations: [],
        dataProvider: { configured: true, status: 'connected', active: 'FMP', provider: 'FMP' } } });
    }
  });
  return calls;
}

for (const lang of ['ar', 'en', 'fr']) {
  test(`saved symbols load inside the actual iframe in ${lang}, independently of the selected market`, async ({ page }, info) => {
    const errors: string[] = [], assets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/watchlist-(engine|view)\.js/.test(request.url())) assets.push(new URL(request.url()).pathname); });
    await prepare(page, ['MSFT', '2222.SR', 'KFH.KW'], lang, lang === 'fr' ? 'dark' : 'light');
    const calls = await mockApi(page);
    await page.goto(`${origin}/host`);
    const frame = page.frameLocator('#trader');
    await expect(frame.locator('html')).toHaveAttribute('lang', lang);
    await expect(frame.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    for (const [id, currency] of [['MSFT', 'USD'], ['2222.SR', 'SAR'], ['KFH.KW', 'KWD']]) {
      const row = frame.locator(`[data-watchlist-symbol="${id}"]`);
      await expect(row).toContainText(currency);
      await expect(row.locator('time')).toHaveAttribute('datetime', /T/);
      await expect(row).toContainText('QA provider fixture');
      await expect(row.locator('td').nth(4)).toHaveText('75%');
      await expect(row.locator('td').nth(8)).toHaveText('80%');
    }
    const stats = frame.locator('#topbar-stats');
    await expect(stats).toContainText('SFM Watchlist Engine');
    await expect(stats.locator('.sb-cell').nth(1).locator('strong')).toHaveText('3');
    await expect(stats.locator('.sb-cell').nth(2).locator('strong')).toHaveText('3');
    await expect(stats.locator('.sb-cell').first().locator('strong')).toHaveText({ ar: 'البيانات متاحة', en: 'Data available', fr: 'Données disponibles' }[lang]!);
    expect(calls.some(url => url.startsWith('/api/watchlist?') && url.includes('MSFT'))).toBe(true);
    expect(calls.some(url => url.includes('/recommendations?market='))).toBe(false);
    expect(assets.sort()).toEqual([`${prefix}watchlist-engine.js`, `${prefix}watchlist-view.js`]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`watchlist-${lang}.png`), fullPage: true, scale: 'css' });
  });
}

test('price appears before slow analysis; add/remove fetches exact membership and restores it after reload', async ({ page }) => {
  let release!: () => void;
  const analysisGate = new Promise<void>(resolve => { release = resolve; });
  await prepare(page);
  const calls = await mockApi(page, async (route, url) => {
    const phase = url.searchParams.get('phase') || 'quotes';
    if (phase === 'analysis') await analysisGate;
    const rows = (url.searchParams.get('symbols') || '').split(',').map(id => fixture(id, phase));
    await route.fulfill({ json: { ok: true, engineVersion: 1, phase, rows } });
  });
  try {
    await page.goto(`${origin}/host`);
    const frame = page.frameLocator('#trader');
    const msft = frame.locator('[data-watchlist-symbol="MSFT"]');
    await expect(msft).toContainText('501.25 USD');
    await expect(msft).toContainText('Loading analysis');
    await expect(msft.locator('td').nth(4)).not.toContainText('%');
    release();
    await expect(msft.locator('td').nth(4)).toHaveText('75%');
    await frame.locator('[data-quick-add="2222.SR"]').click();
    await expect(frame.locator('[data-watchlist-symbol="2222.SR"]')).toContainText('SAR');
    await frame.locator('[data-remove-watch="MSFT"]').click();
    await expect(msft).toHaveCount(0);
    expect(calls.some(url => url.includes('symbols=2222.SR'))).toBe(true);
    await page.reload();
    await expect(frame.locator('[data-watchlist-symbol="2222.SR"]')).toContainText('SAR');
    await expect(msft).toHaveCount(0);
  } finally { release(); }
});

test('outage retains the source price, strips stale confidence and preserves refresh keyboard focus', async ({ page }) => {
  let failed = false;
  await prepare(page);
  await mockApi(page, async (route, url) => {
    if (failed) { await route.fulfill({ status: 503, json: { ok: false } }); return; }
    const phase = url.searchParams.get('phase') || 'quotes';
    await route.fulfill({ json: { ok: true, engineVersion: 1, phase, rows: [fixture('MSFT', phase)] } });
  });
  await page.goto(`${origin}/host`);
  const frame = page.frameLocator('#trader'), row = frame.locator('[data-watchlist-symbol="MSFT"]');
  await expect(row.locator('td').nth(4)).toHaveText('75%');
  const stamp = await row.locator('time').getAttribute('datetime');
  failed = true;
  const refresh = frame.locator('[data-watchlist-refresh]');
  await refresh.focus(); await refresh.press('Enter');
  await expect(row).toHaveAttribute('data-watchlist-status', 'last_known');
  await expect(row).toContainText('501.25 USD');
  await expect(row.locator('time')).toHaveAttribute('datetime', stamp!);
  await expect(row.locator('td').nth(4)).not.toContainText('%');
  await expect(row.locator('td').nth(5)).not.toContainText('USD');
  await expect(frame.locator('#topbar-stats .sb-cell').first()).toContainText('Last available data');
  await expect(frame.locator('#topbar-stats .sb-cell').nth(2).locator('strong')).toHaveText('0');
  await expect(refresh).toBeFocused();
  await page.reload();
  await expect(row).toContainText('501.25 USD');
  await expect(row).toHaveAttribute('data-watchlist-status', 'last_known');
});

test('partial and old quotes remain explicit; the empty watchlist requests no quotes', async ({ page }) => {
  await prepare(page, ['MSFT', 'MISSING']);
  const calls = await mockApi(page, async route => {
    await route.fulfill({ json: { ok: true, engineVersion: 1, phase: 'quotes', rows: [fixture('MSFT', 'quotes', true)] } });
  });
  await page.goto(`${origin}/host`);
  const frame = page.frameLocator('#trader');
  await expect(frame.locator('[data-watchlist-symbol="MSFT"]')).toHaveAttribute('data-watchlist-status', 'stale');
  await expect(frame.locator('[data-watchlist-symbol="MISSING"]')).toHaveAttribute('data-watchlist-status', 'unavailable');
  expect(calls.some(url => url.includes('phase=analysis'))).toBe(false);
  await frame.locator('[data-remove-watch="MISSING"]').click();
  await frame.locator('[data-remove-watch="MSFT"]').click();
  calls.length = 0;
  await page.reload();
  await expect(frame.locator('[data-watchlist-symbol]')).toHaveCount(0);
  await expect(frame.locator('#terminal-content')).toContainText('Watchlist is empty');
  expect(calls.filter(url => url.startsWith('/api/watchlist'))).toEqual([]);
});
