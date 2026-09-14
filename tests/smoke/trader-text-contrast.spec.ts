import { expect, test, type Frame } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

// Exercise the actual embedded terminal and its shared theme CSS. All API
// responses are intentionally empty/unavailable: no live account or prices.
const publicRoot = path.join(process.cwd(), 'src/trader-app/public');
let server: Server;
let origin: string;

test.beforeAll(async () => {
  const tokens = (await Promise.all(['tokens.css', 'themes.css'].map(file =>
    readFile(path.join(process.cwd(), 'src/styles', file), 'utf8')))).join('\n');
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      response.setHeader('cache-control', 'no-store');
      if (url.pathname === '/contrast-host') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html><head><title>Isolated Trader contrast test</title><style>body{margin:0}iframe{display:block;border:0;width:100%;height:1300px}</style></head><body><iframe name="trader-contrast-frame" title="Trader" src="/thesfm-trader-own/app/index.html?route=trade-performance"></iframe></body></html>');
        return;
      }
      const file = decodeURIComponent(url.pathname).replace(/^\/thesfm-trader-own\/app\//, '').replace(/^\/+/, '');
      if (file === 'semantic-tokens.css') {
        response.setHeader('content-type', 'text/css; charset=utf-8');
        response.end(tokens);
        return;
      }
      const resolved = path.resolve(publicRoot, file);
      if (!resolved.startsWith(`${publicRoot}${path.sep}`)) {
        response.writeHead(404).end();
        return;
      }
      const data = await readFile(resolved);
      const mime: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
      response.setHeader('content-type', mime[path.extname(resolved)] || 'application/octet-stream');
      response.end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing contrast test server port');
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

for (const width of [2048, 1440, 390]) {
  for (const language of ['ar', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`Trader readable text: ${width}px ${language} ${theme}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(({ language, theme }) => {
          localStorage.setItem('sfm_lang', language);
          localStorage.setItem('the-sfm-theme', theme);
          localStorage.setItem('sfm-density', 'auto');
          localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({ defaultMarket: 'us-stocks', quickTickerVisible: false }));
        }, { language, theme });
        await page.route('**/api/**', route => route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, status: 'unavailable', items: [], data: [], recommendations: [], followedTrades: [], dataProvider: { configured: false, status: 'disconnected' } }),
        }));
        await page.goto(`${origin}/contrast-host`, { waitUntil: 'domcontentloaded' });
        const terminal = page.frame({ name: 'trader-contrast-frame' });
        if (!terminal) throw new Error('Embedded terminal was not created');
        await expect(terminal.locator('.trade-performance-page .page-hero')).toBeVisible();
        await expect(terminal.locator('html')).toHaveAttribute('data-embedded', 'true');
        await expect(terminal.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(terminal.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        const result = await measureReadability(terminal);
        await testInfo.attach('computed-contrast', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
        // Save before assertions too, so a genuine regression has visual proof.
        await testInfo.attach('trade-performance', { body: await page.screenshot(), contentType: 'image/png' });
        assertReadable(result);
        const search = terminal.locator('#symbol-input');
        await search.focus();
        await terminal.evaluate(next => {
          const bridge = (window as Window & { SFMTraderTheme: { apply: (preference: string, resolved: string) => void } }).SFMTraderTheme;
          bridge.apply(next, next);
        }, theme === 'light' ? 'dark' : 'light');
        await expect(search).toBeFocused();
        assertReadable(await measureReadability(terminal));
        expect(errors).toEqual([]);
      });
    }
  }
}

async function measureReadability(frame: Frame) {
  return frame.evaluate(() => {
    const parse = (color: string): number[] => {
      const numbers = color.match(/[\d.]+/g)?.map(Number) || [];
      if (numbers.length < 3) throw new Error(`Unexpected computed color: ${color}`);
      return numbers;
    };
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const ratio = (a: number[], b: number[]) => {
      const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const hero = document.querySelector('.trade-performance-page .page-hero')!;
    const stops = (getComputedStyle(hero).backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse);
    if (stops.length < 2) throw new Error('Expected the production hero gradient');
    // Check across the gradient, not against only the dark end of the banner.
    const backgrounds = stops.flatMap((stop, index) => {
      const next = stops[Math.min(index + 1, stops.length - 1)];
      return Array.from({ length: 65 }, (_, step) => stop.slice(0, 3).map((v, channel) => v + (next[channel] - v) * step / 64));
    });
    const heroText = [...hero.querySelectorAll('h2, p, .eyebrow')].map(element => {
      const style = getComputedStyle(element);
      const color = parse(style.color);
      const alpha = (color[3] ?? 1) * Number(style.opacity);
      return { role: element.tagName, color: style.color, fontSize: parseFloat(style.fontSize), contrast: Math.min(...backgrounds.map(bg => ratio(color.slice(0, 3).map((v, i) => v * alpha + bg[i] * (1 - alpha)), bg))) };
    });
    const labels = [...document.querySelectorAll<HTMLElement>('.topbar-stats .sb-cell > span, .topbar-stats .sb-cell > em')]
      .filter(element => element.getClientRects().length > 0)
      .map(element => {
        const style = getComputedStyle(element);
        const background = getComputedStyle(element.parentElement!).backgroundColor;
        return { color: style.color, fontSize: parseFloat(style.fontSize), contrast: ratio(parse(style.color), parse(background)), weight: Number(style.fontWeight) };
      });
    return { theme: document.documentElement.dataset.theme, heroText, labels, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
}

function assertReadable(result: Awaited<ReturnType<typeof measureReadability>>) {
  expect(result.heroText).toHaveLength(3);
  for (const text of result.heroText) expect(text.contrast, `${result.theme} hero ${text.role}: ${text.color}`).toBeGreaterThanOrEqual(4.5);
  expect(result.labels.length).toBeGreaterThan(0);
  for (const label of result.labels) {
    expect(label.contrast, `${result.theme} topbar label`).toBeGreaterThanOrEqual(4.5);
    expect(label.fontSize, 'Topbar metadata must remain readable in compact density').toBeGreaterThanOrEqual(13);
    expect(label.weight).toBeGreaterThanOrEqual(500);
  }
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1);
}
