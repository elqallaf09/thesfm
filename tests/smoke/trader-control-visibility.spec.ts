import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

// Isolated, shipped embedded UI; deliberately unavailable APIs, no live account.
const root = path.resolve('src/trader-app/public');
let server: Server;
let origin: string;
test.beforeAll(async () => {
  const tokens = (await Promise.all(['tokens.css', 'themes.css'].map(file =>
    readFile(path.resolve('src/styles', file), 'utf8')))).join('\n');
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      response.setHeader('cache-control', 'no-store');
      if (url.pathname === '/host') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}iframe{display:block;border:0;width:100%;height:1600px}</style></head><body><iframe name="trader-controls" title="Trader controls" src="/thesfm-trader-own/app/index.html?route=dashboard"></iframe></body></html>');
        return;
      }
      const file = decodeURIComponent(url.pathname).replace(/^\/thesfm-trader-own\/app\//, '').replace(/^\/+/, '');
      if (file === 'semantic-tokens.css') {
        response.setHeader('content-type', 'text/css'); response.end(tokens); return;
      }
      const resolved = path.resolve(root, file);
      if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid fixture asset path');
      const data = await readFile(resolved);
      const mime: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
      response.setHeader('content-type', mime[path.extname(resolved)] || 'application/octet-stream');
      response.end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture server port');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

async function openTerminal(page: Page) {
  await page.goto(`${origin}/host`, { waitUntil: 'domcontentloaded' });
  await expect(page.frameLocator('iframe').locator('.trader-command-deck')).toBeVisible();
  const frame = page.frame({ name: 'trader-controls' });
  if (!frame) throw new Error('Missing embedded terminal');
  await expect(frame.locator('#ticker-toggle')).toHaveAttribute('aria-pressed', 'false');
  return frame;
}

for (const width of [1440, 390]) {
  for (const language of ['ar', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const motion of ['reduce', 'no-preference'] as const) {
        test(`Trader controls: ${width}px ${language} ${theme} ${motion}`, async ({ page }, testInfo) => {
          const errors: string[] = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.setViewportSize({ width, height: 1000 });
          await page.emulateMedia({ reducedMotion: motion });
          await page.addInitScript(({ language, theme }) => {
            localStorage.setItem('sfm_lang', language);
            localStorage.setItem('the-sfm-theme', theme);
            localStorage.setItem('sfm-density', 'auto');
            // Preserve user toggles across reload, unlike a resetting fixture.
            if (!localStorage.getItem('sfmTraderSettings:v1')) {
              localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ defaultMarket: 'us-stocks', quickTickerVisible: false }));
            }
          }, { language, theme });
          await page.route('**/api/**', route => route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ success: false, status: 'unavailable', items: [], data: [], recommendations: [], followedTrades: [], dataProvider: { configured: false, status: 'disconnected' } }),
          }));
          let frame = await openTerminal(page);
          const initial = await frame.evaluate(() => {
            const skip = document.querySelector('.terminal-skip-link')!;
            const ticker = document.querySelector<HTMLElement>('#ticker-row')!;
            return {
              skipBottom: skip.getBoundingClientRect().bottom,
              tickerHidden: ticker.hidden,
              tickerHeight: ticker.getBoundingClientRect().height,
              links: [...document.querySelectorAll('.command-deck-link')].map(element => ({
                text: element.textContent, width: element.getBoundingClientRect().width,
                height: element.getBoundingClientRect().height,
              })),
            };
          });
          await testInfo.attach('initial-controls', { body: JSON.stringify(initial, null, 2), contentType: 'application/json' });
          await testInfo.attach('dashboard', { body: await page.screenshot(), contentType: 'image/png' });
          expect.soft(initial.skipBottom, 'Unfocused skip link must not cover the title').toBeLessThanOrEqual(0);
          expect.soft(initial.tickerHidden).toBe(true);
          expect.soft(initial.tickerHeight, 'Hidden ticker must not leave an empty mobile strip').toBe(0);
          expect(initial.links).toHaveLength(3);
          for (const link of initial.links) {
            expect.soft(link.height, `Standalone action target: ${link.text}`).toBeGreaterThanOrEqual(44);
            expect.soft(link.width, `Standalone action target: ${link.text}`).toBeGreaterThanOrEqual(44);
          }

          // Actual keyboard traversal: the hidden link must remain usable.
          const skip = frame.locator('.terminal-skip-link');
          await frame.locator('#symbol-input').focus();
          await page.keyboard.press('Shift+Tab');
          await expect(skip).toBeFocused();
          expect(await skip.evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
          await page.keyboard.press('Enter');
          await expect(frame.locator('#terminal-content')).toBeFocused();
          expect.soft(await skip.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);

          // Positive control: do not fix the empty strip by hiding the ticker forever.
          const toggle = frame.locator('#ticker-toggle');
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-pressed', 'true');
          await expect(frame.locator('#ticker-row')).toBeVisible();
          await expect(frame.locator('#ticker-row .ticker-chip').first()).toBeVisible();
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-pressed', 'false');
          expect.soft(await frame.locator('#ticker-row').evaluate(element => element.getBoundingClientRect().height)).toBe(0);
          frame = await openTerminal(page);
          expect.soft(await frame.locator('#ticker-row').evaluate(element => element.getBoundingClientRect().height)).toBe(0);

          // Check the enlarged action still navigates, including with the keyboard.
          const provider = frame.locator('.command-deck-provider .command-deck-link');
          await provider.focus();
          await page.keyboard.press('Enter');
          await expect(frame.locator('.trader-settings-page')).toBeVisible();
          await frame.locator('.topbar-actions [data-route="alerts"]').click();
          await expect(frame.locator('#alert-form')).toBeVisible();
          expect(await frame.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
          await testInfo.attach('alerts-after-navigation', { body: await page.screenshot(), contentType: 'image/png' });
          expect(errors).toEqual([]);
        });
      }
    }
  }
}
