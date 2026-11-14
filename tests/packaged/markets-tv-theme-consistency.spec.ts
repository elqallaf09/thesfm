import { expect, test, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';

// Deterministic browser fixtures only; product builds contain no sample prices.
const items = Array.from({ length: 6 }, (_, i) => ({ symbol: `THEME${i}`, name: `Theme check ${i}`, nameAr: `Theme check ${i}`, currency: 'KWD', region: 'KW' }));
const paletteKeys = ['bg', 'panel', 'panel2', 'text', 'muted', 'accent', 'up', 'down', 'up-surface', 'down-surface', 'news-background', 'news-text', 'news-muted'] as const;

async function open(page: Page, theme: string, accent: string) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(({ theme, accent }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', theme, accent, displayMode: 'viewing', scene: 'overview', autoRotate: false }));
  }, { theme, accent });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { code: 'QA_UNAVAILABLE' } }));
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{ id: 'KW', group: 'gulf', labelAr: 'Kuwait', labelEn: 'Kuwait', labelFr: 'Koweït', count: 6, status: 'directory' }] } }));
  await page.route('**/api/tv/instruments?*', route => route.fulfill({ json: { items, total: 6, directoryTotal: 6, page: 0, pageSize: 6 } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const now = new Date().toISOString();
    const quotes = items.map((item, i) => ({ ...item, price: 1.234 + i, changePercent: i % 2 ? -1.2 : 2.1, source: 'Theme QA', observedAt: now, receivedAt: now, status: 'delayed', delayType: 'delayed', exchange: 'KW', country: 'KW', changeBasis: 'session' }));
    return route.fulfill({ json: { quotes, summary: quotes, group: 'global', total: 6, available: 6, generatedAt: now } });
  });
  await page.route('**/api/tv/news?*', route => route.fulfill({ json: { stories: [{ id: 'theme-news', title: 'A complete financial news headline for contrast verification', source: 'Theme QA', publishedAt: new Date().toISOString(), url: 'https://example.com/news' }] } }));
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-hall-row')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
}

async function palette(page: Page) {
  return page.locator('[data-tv-root]').evaluate((root, keys) => {
    const probe = document.createElement('span'); root.append(probe);
    const colors = Object.fromEntries(keys.map(key => {
      probe.style.color = `var(--tv-${key})`;
      return [key, getComputedStyle(probe).color];
    }));
    probe.remove();
    const style = getComputedStyle(root);
    return { colors, background: style.backgroundColor, scheme: style.colorScheme, focus: style.getPropertyValue('--focus-ring').trim(), input: style.getPropertyValue('--input-background').trim() };
  }, [...paletteKeys]);
}

function contrast(a: string, b: string) {
  const luminance = (value: string) => {
    const components = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return components.reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  };
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

for (const theme of ['light', 'dark']) for (const accent of ['champagne', 'blue', 'green', 'purple']) {
  test(`TV ${theme}/${accent} colors remain coherent across modes, scenes and dialogs`, async ({ page }) => {
    await open(page, theme, accent);
    const baseline = await palette(page);
    expect(baseline.scheme).toBe(theme);
    expect(baseline.background).toBe(baseline.colors.bg);
    for (const foreground of ['text', 'muted', 'accent', 'up', 'down']) for (const background of ['bg', 'panel', 'panel2']) {
      expect(contrast(baseline.colors[foreground], baseline.colors[background]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const trend of ['up', 'down']) expect(contrast(baseline.colors[trend], baseline.colors[`${trend}-surface`])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(baseline.colors['news-text'], baseline.colors['news-background'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(baseline.colors['news-muted'], baseline.colors['news-background'])).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator('.tv-headline-band')).toHaveCSS('background-color', baseline.colors['news-background']);
    await expect(page.locator('.tv-headline-story')).toHaveCSS('color', baseline.colors['news-text']);

    await page.locator('.tv-mode-browse').click();
    await expect(page.locator('.tv-all-stocks')).toBeVisible();
    expect(await palette(page)).toEqual(baseline);
    const input = page.getByRole('searchbox');
    await expect(input).toHaveCSS('color', baseline.colors.text);
    await expect(input).toHaveCSS('background-color', baseline.colors.panel);
    await input.focus();
    await expect(input).toHaveCSS('outline-color', baseline.colors.accent);
    const disabled = page.locator('[data-tv-focus-key=stocks-previous]');
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveCSS('opacity', '1');
    await expect(disabled).toHaveCSS('color', baseline.colors.muted);
    await expect(disabled).toHaveCSS('background-color', baseline.colors.panel2);

    await page.locator('.tv-mode-strips').click();
    await expect(page.locator('.tv-strips-only')).toBeVisible();
    expect(await palette(page)).toEqual(baseline);
    await expect(page.locator('.tv-market-strip').first()).toHaveCSS('background-color', baseline.colors.panel);

    await page.locator('.tv-mode-viewing').click();
    await expect(page.locator('.tv-scene-tabs')).toBeVisible();
    for (const index of [1, 2, 3, 4, 5, 6, 7]) {
      await page.locator('.tv-scene-tabs button').nth(index).click();
      expect(await palette(page)).toEqual(baseline);
      if (index === 1) {
        await page.locator('[data-tv-focus-key=scene-heatmap]').click();
        for (const trend of ['up', 'down']) {
          const tile = page.locator(`.tv-scene-heatmap > button[data-trend=${trend}]`).first();
          await expect(tile).toHaveCSS('background-color', baseline.colors[`${trend}-surface`]);
          await expect(tile.locator('.tv-scene-change')).toHaveCSS('color', baseline.colors[trend]);
        }
        await page.locator('[data-tv-focus-key=scene-list]').click();
      }
    }
    await page.locator('[data-tv-focus-key=settings]').click();
    await expect(page.locator('.tv-dialog')).toBeVisible();
    expect(await palette(page)).toEqual(baseline);
    await expect(page.locator('.tv-dialog')).toHaveCSS('background-color', baseline.colors.bg);
    const selected = page.locator(`.tv-accent-options [data-accent=${accent}]`);
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(selected).toHaveCSS('color', baseline.colors.accent);
    await selected.focus();
    await expect(selected).toHaveCSS('outline-color', baseline.colors.accent);
    await page.keyboard.press('Escape');
  });
}
