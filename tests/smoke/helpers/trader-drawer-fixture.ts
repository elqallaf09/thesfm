import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

// An isolated same-origin frame, using shipped assets with no private session.
export async function createTraderDrawerFixture() {
  const root = path.resolve('src/trader-app/public');
  const tokens = (await Promise.all(['tokens.css', 'themes.css'].map(file =>
    readFile(path.resolve('src/styles', file), 'utf8')))).join('\n');
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      response.setHeader('cache-control', 'no-store');
      if (url.pathname === '/host') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><style>body{margin:0}iframe{display:block;border:0;width:100%;height:100vh}</style></head><body><iframe name="drawer-fixture" title="Isolated Trader" src="/thesfm-trader-own/app/index.html?route=watchlist"></iframe></body></html>');
        return;
      }
      const file = decodeURIComponent(url.pathname).replace(/^\/thesfm-trader-own\/app\//, '').replace(/^\/+/, '');
      if (file === 'semantic-tokens.css') {
        response.setHeader('content-type', 'text/css'); response.end(tokens); return;
      }
      const resolved = path.resolve(root, file);
      if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid fixture path');
      const data = await readFile(resolved);
      const mime: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
      response.setHeader('content-type', mime[path.extname(resolved)] || 'application/octet-stream');
      response.end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No fixture port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}

export async function openTraderDrawerFixture(page: Page, origin: string, language: string, theme: string, watchlist = ['AAPL']) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ language, theme, watchlist }) => {
    localStorage.setItem('sfm_lang', language);
    localStorage.setItem('the-sfm-theme', theme);
    localStorage.setItem('sfmTraderWatchlist:v3', JSON.stringify(watchlist));
    localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ defaultMarket: 'us-stocks', quickTickerVisible: false }));
  }, { language, theme, watchlist });
  await page.route('**/api/**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: false, status: 'unavailable', items: [], data: [], recommendations: [], followedTrades: [], dataProvider: { configured: false, status: 'disconnected' } }),
  }));
  await page.goto(`${origin}/host`, { waitUntil: 'domcontentloaded' });
  await expect(page.frameLocator('iframe').locator(`[data-symbol-details="${watchlist[0]}"]`).first()).toBeVisible();
  const frame = page.frame({ name: 'drawer-fixture' });
  if (!frame) throw new Error('No Trader frame');
  await expect(frame.locator('html')).toHaveAttribute('data-embedded', 'true');
  await expect(frame.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  await expect(frame.locator('html')).toHaveAttribute('data-theme', theme);
  return frame;
}
