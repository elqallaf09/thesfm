import { openAndroidTvPackage, openTvHeaderActions, closeTvHeaderActions } from './packageHarness';
import { expect, test, type Page } from '@playwright/test';
import type { TvLanguage, TvQuote } from '../../src/lib/markets-tv/types';

const now = '2026-11-19T00:00:00Z';
const observedAt = '2026-11-18T10:10:00Z';
async function openStrips(page: Page, language: TvLanguage, priced = 1, directoryTotal = 12) {
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript(language => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language, displayMode: 'strips', marketIds: ['QA'], groups: ['gulf'], autoHideControls: false,
    }));
  }, language);
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{
    id: 'QA', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Boursa Kuwait',
    labelFr: 'Bourse du Koweït', count: directoryTotal, status: 'selected',
  }] } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const batch = Number(new URL(route.request().url()).searchParams.get('page')) || 0;
    const quotes: TvQuote[] = Array.from({ length: 12 }, (_, index) => ({
      symbol: `QA${batch * 12 + index}`, name: 'A company with a longer investment name', nameAr: 'شركة ذات اسم استثماري طويل',
      currency: 'KWD', exchange: 'QA', country: 'KW', price: index < priced ? .284 : null,
      changePercent: index < priced ? .35 : null, source: index < priced ? 'Verified source' : null,
      observedAt: index < priced ? observedAt : null, receivedAt: now, status: index < priced ? 'stale' : 'unavailable',
    }));
    return route.fulfill({ json: { group: 'gulf', page: batch, pageSize: 12,
      directoryTotal, quotes, available: priced, total: 12, generatedAt: now } });
  });
  await openAndroidTvPackage(page);
  await expect(page.locator('.tv-market-strip-item').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const language of ['ar', 'en', 'fr'] as const) {
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    test(`${language} ${width}: quote date and market summary have independent space`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openStrips(page, language);
      const strip = page.locator('[data-market="QA"]');
      await expect(strip.locator('.tv-market-strip-item')).toHaveCount(1);
      await expect(strip.locator('.tv-market-strip-track')).toHaveAttribute('data-marquee', 'false');
      await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'none');
      await expect(strip.locator('.tv-strip-evidence time')).toContainText('2026-11-18');
      await expect(strip.locator('.tv-strip-evidence')).toHaveAttribute('data-status', 'stale');
      const geometry = await strip.evaluate(element => {
        const heading = element.querySelector('.tv-market-strip-heading')!.getBoundingClientRect();
        const window = element.querySelector('.tv-market-strip-window')!.getBoundingClientRect();
        const card = element.querySelector('.tv-market-strip-item')!.getBoundingClientRect();
        const origin = element.querySelector('.tv-evidence-origin')!.getBoundingClientRect();
        const time = element.querySelector('time')!.getBoundingClientRect();
        return {
          separate: heading.right <= window.left + 1 || window.right <= heading.left + 1,
          stacked: origin.bottom <= time.top + 1,
          contained: [origin, time].every(rect => rect.left >= card.left && rect.right <= card.right && rect.bottom <= card.bottom),
        };
      });
      expect(geometry).toEqual({ separate: true, stacked: true, contained: true });
    });
  }
}

test('overflowing quotes loop only while a complete set exceeds the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openStrips(page, 'en', 12);
  const strip = page.locator('[data-market="QA"]');
  await expect(strip.locator('.tv-market-strip-track')).toHaveAttribute('data-marquee', 'true');
  await expect(strip.locator('.tv-market-strip-set')).toHaveCount(2);
  await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'tv-scroll');
  await expect(strip.locator('.tv-market-strip-set[aria-hidden=true]')).toHaveAttribute('inert', '');
  await expect(strip.locator('.tv-market-strip-set[aria-hidden=true] [tabindex="0"]')).toHaveCount(0);
});

test('sparse batches advance without duplicates and wait for remote reading to finish', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openStrips(page, 'en', 1, 24);
  const quote = page.locator('.tv-market-strip-item');
  await expect(quote).toHaveCount(1);
  await quote.focus();
  await page.clock.runFor(7500);
  await expect(quote.locator('.tv-strip-symbol b')).toHaveText('QA0');
  await page.locator('[data-tv-focus-key=menu-toggle]').focus();
  await page.clock.runFor(7500);
  await expect(quote.locator('.tv-strip-symbol b')).toHaveText('QA12');
  await expect(quote).toHaveCount(1);
  await openTvHeaderActions(page);
  await page.getByRole('button', { name: 'Pause strips', exact: true }).click();
  await closeTvHeaderActions(page);
  await page.clock.runFor(15000);
  await expect(quote.locator('.tv-strip-symbol b')).toHaveText('QA12');
});
