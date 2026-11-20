import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAndroidTvPackage } from './packageHarness';
import type { TvLanguage, TvQuote, TvSettings } from '../../src/lib/markets-tv/types';

const now = '2026-11-20T10:26:00Z';
const observedAt = '2026-11-19T10:55:00Z';
type Density = NonNullable<TvSettings['stripDensity']>;
type Theme = TvSettings['theme'];

// These are layout fixtures, never live quotes. Keep the long labels, prices
// and contract units that previously collided in the strip's compact density.
const fixtures: TvQuote[] = [
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', nameAr: 'مؤشر داو جونز الصناعي', price: 49097.06, currency: null, changePercent: -2.19 },
  { symbol: 'BTC/USDT', name: 'Bitcoin / Tether', nameAr: 'بيتكوين / تيثر', price: 93003.05, currency: 'USDT', changePercent: -3.04 },
  { symbol: 'COMEX:GC1!', name: 'Gold continuous contract', nameAr: 'الذهب — عقد مستمر', price: 3573.30, currency: 'USD', changePercent: -3.04 },
  { symbol: 'NYMEX:NG1!', name: 'Natural gas continuous contract', nameAr: 'الغاز الطبيعي — عقد مستمر', price: 3.381, currency: 'USD', changePercent: -2.60 },
  { symbol: 'GBP/USD', name: 'British pound / US dollar', nameAr: 'الجنيه الإسترليني / الدولار الأمريكي', price: 1.310600, currency: 'USD', changePercent: .11 },
  { symbol: 'LONG', displaySymbol: 'LONGLISTING.PREFERRED-A', name: 'A company with a deliberately long investment name', nameAr: 'شركة ذات اسم استثماري طويل لاختبار وضوح البطاقة', price: .183, currency: 'KWD', changePercent: 0 },
].map(quote => ({ ...quote, source: 'Fixture source', observedAt, receivedAt: now, status: 'stale', exchange: 'QA', country: null }));

async function openStrips(page: Page, language: TvLanguage, theme: Theme, stripDensity: Density, sparse = false) {
  await page.clock.install({ time: new Date(now) });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(settings => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify(settings));
  }, { language, theme, stripDensity, displayMode: 'strips', marketIds: ['QA'], groups: ['world'], autoHideControls: false });
  const quotes = sparse ? fixtures.slice(0, 1) : fixtures;
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets: [{
    id: 'QA', group: 'world', labelAr: 'أسواق الاختبار', labelEn: 'Fixture markets', labelFr: 'Marchés de test',
    count: quotes.length, status: 'selected',
  }] } }));
  await page.route('**/api/tv/snapshot?*', route => route.fulfill({ json: {
    group: 'world', page: 0, pageSize: 12, directoryTotal: quotes.length,
    quotes, available: quotes.length, total: quotes.length, generatedAt: now,
  } }));
  await openAndroidTvPackage(page);
  await expect(page.locator('[data-tv-root]')).toHaveClass(new RegExp(`tv-${theme}`));
  await expect(page.locator('[data-tv-root]')).toHaveClass(new RegExp(`tv-density-${stripDensity}`));
  await expect(page.locator('.tv-market-strip-set[aria-hidden=false] .tv-market-strip-item')).toHaveCount(quotes.length);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
}

async function expectReadableCards(cards: Locator) {
  const failures = await cards.evaluateAll(elements => {
    const issues: string[] = [];
    const selectors = ['.tv-asset-icon', '.tv-strip-symbol', '.tv-strip-price', '.tv-strip-change', '.tv-strip-evidence'];
    const fits = (outer: DOMRect, inner: DOMRect) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1
      && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    const overlaps = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    for (const card of elements) {
      const symbol = card.querySelector('.tv-strip-symbol b')!.textContent;
      const bounds = card.getBoundingClientRect();
      const parts = selectors.map(selector => ({ selector, node: card.querySelector<HTMLElement>(selector)! }));
      for (const { selector, node } of parts) {
        if (!fits(bounds, node.getBoundingClientRect())) issues.push(`${symbol}: ${selector} escapes its card`);
      }
      for (let first = 0; first < parts.length; first++) {
        for (let second = first + 1; second < parts.length; second++) {
          if (overlaps(parts[first].node.getBoundingClientRect(), parts[second].node.getBoundingClientRect())) {
            issues.push(`${symbol}: ${parts[first].selector} overlaps ${parts[second].selector}`);
          }
        }
      }
      // Text ranges catch an overflowing ticker or price even when its grid
      // box remains inside the card. Company-name truncation stays permitted.
      for (const selector of ['.tv-strip-symbol b', '.tv-strip-price', '.tv-strip-change', '.tv-strip-evidence time']) {
        const node = card.querySelector(selector)!;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width > 0 && rect.height > 0 && !fits(bounds, rect)) issues.push(`${symbol}: ${selector} text is clipped`);
        }
      }
      const identity = card.querySelector('.tv-strip-symbol')!.getBoundingClientRect();
      const price = card.querySelector('.tv-strip-price')!.getBoundingClientRect();
      const evidence = card.querySelector('.tv-strip-evidence')!.getBoundingClientRect();
      if (identity.bottom > price.top + 1 || price.bottom > evidence.top + 1) issues.push(`${symbol}: quote rows collide`);
      const origin = card.querySelector('.tv-evidence-origin')!.getBoundingClientRect();
      const time = card.querySelector('time')!.getBoundingClientRect();
      if (origin.bottom > time.top + 1) issues.push(`${symbol}: source and timestamp collide`);
    }
    return issues;
  });
  expect(failures).toEqual([]);
}

const cases: { language: TvLanguage; theme: Theme; stripDensity: Density; width: number; height: number }[] = [];
for (const stripDensity of ['comfortable', 'balanced', 'compact'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [width, height] of [[1280, 720], [1920, 1080]]) cases.push({ language: 'ar', stripDensity, theme, width, height });
  }
}
cases.push(
  { language: 'en', stripDensity: 'compact', theme: 'light', width: 1280, height: 720 },
  { language: 'fr', stripDensity: 'compact', theme: 'dark', width: 1920, height: 1080 },
);

for (const { language, theme, stripDensity, width, height } of cases) {
  test(`${language} ${theme} ${stripDensity} ${width}: strip identity, prices and provenance do not overlap`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await openStrips(page, language, theme, stripDensity);
    const strip = page.locator('[data-market=QA]');
    const cards = strip.locator('.tv-market-strip-set[aria-hidden=false] .tv-market-strip-item');
    await cards.first().focus();
    await expect(cards.first()).toBeFocused();
    await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'none');
    await expectReadableCards(cards);
    await expect(cards.nth(2).locator('.tv-strip-price')).toContainText('USD / oz');
    await expect(cards.nth(3).locator('.tv-strip-price')).toContainText('USD / MMBtu');
    await expect(cards.first().locator('.tv-strip-evidence time')).toContainText('2026-11-19');
    const summarySeparated = await strip.evaluate(element => {
      const summary = element.querySelector('.tv-market-strip-heading')!.getBoundingClientRect();
      const viewport = element.querySelector('.tv-market-strip-window')!.getBoundingClientRect();
      return summary.right <= viewport.left + 1 || viewport.right <= summary.left + 1;
    });
    expect(summarySeparated).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (language === 'ar' && stripDensity === 'compact') {
      await testInfo.attach(`strip-cards-${theme}-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  });
}

test('remote navigation reveals complete cards and the strip resumes its continuous loop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStrips(page, 'en', 'light', 'compact');
  const strip = page.locator('[data-market=QA]');
  const track = strip.locator('.tv-market-strip-track');
  const cards = strip.locator('.tv-market-strip-set[aria-hidden=false] .tv-market-strip-item');
  await expect(track).toHaveAttribute('data-marquee', 'true');
  await expect(strip.locator('.tv-market-strip-set')).toHaveCount(2);
  await expect(strip.locator('.tv-market-strip-set[aria-hidden=true]')).toHaveAttribute('inert', '');
  await expect(strip.locator('.tv-market-strip-set[aria-hidden=true] [tabindex="0"]')).toHaveCount(0);
  await cards.first().focus();
  for (let index = 0; index < fixtures.length; index++) {
    if (index > 0) await page.keyboard.press('ArrowRight');
    await expect(cards.nth(index)).toBeFocused();
    await expect.poll(() => cards.nth(index).evaluate(card => {
      const viewport = card.closest('.tv-market-strip-window')!.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
    })).toBe(true);
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tv-dialog]')).toBeVisible();
  await expect(page.locator('[data-tv-dialog]')).toContainText(fixtures.at(-1)!.name);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tv-dialog]')).toHaveCount(0);
  await expect(cards.last()).toBeFocused();
  await page.locator('[data-tv-focus-key=menu-toggle]').focus();
  await expect(track).toHaveCSS('animation-name', 'tv-scroll');
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const before = await track.evaluate(element => getComputedStyle(element).transform);
  await expect.poll(() => track.evaluate(element => getComputedStyle(element).transform)).not.toBe(before);
});

test('a sparse RTL strip starts beside its market heading without repeated quotes', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openStrips(page, 'ar', 'light', 'balanced', true);
  const strip = page.locator('[data-market=QA]');
  const cards = strip.locator('.tv-market-strip-item');
  await expect(cards).toHaveCount(1);
  await expect(strip.locator('.tv-market-strip-set')).toHaveCount(1);
  await expect(strip.locator('.tv-market-strip-track')).toHaveAttribute('data-marquee', 'false');
  await expect(strip.locator('.tv-market-strip-track')).toHaveCSS('animation-name', 'none');
  const gap = await cards.first().evaluate(card => card.closest('.tv-market-strip-window')!.getBoundingClientRect().right - card.getBoundingClientRect().right);
  expect(gap).toBeGreaterThanOrEqual(-1);
  expect(gap).toBeLessThanOrEqual(16);
  await expectReadableCards(cards);
});
