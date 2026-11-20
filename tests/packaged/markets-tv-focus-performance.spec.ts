import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openAndroidTvPackage, closeTvMenu } from './packageHarness';

const instant = '2026-11-20T08:00:00Z';
const marketIds = Array.from({ length: 10 }, (_, index) => `FOCUS${index}`);

async function openStrips(page: Page, theme: 'light' | 'dark' = 'dark') {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setSystemTime(new Date(instant));
  await page.addInitScript(({ marketIds, theme }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({
      language: 'ar', theme, displayMode: 'strips', groups: ['gulf'], marketIds,
      autoHideControls: false, autoRotate: false,
    }));
  }, { marketIds, theme });
  await page.route('**/api/tv/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/tv/catalog') return route.fulfill({ json: {
      markets: marketIds.map(id => ({ id, group: 'gulf', labelAr: `سوق الاختبار ${id}`,
        labelEn: `Fixture market ${id}`, labelFr: `Marché test ${id}`, count: 12, status: 'directory' })),
    } });
    if (url.pathname === '/api/tv/snapshot') {
      const market = url.searchParams.get('market') || marketIds[0];
      return route.fulfill({ json: { group: 'gulf', market, page: 0, pageSize: 12,
        directoryTotal: 12, total: 12, available: 12, generatedAt: instant,
        quotes: Array.from({ length: 12 }, (_, index) => ({
          symbol: `${market}-${index}`, name: `Fixture company ${index}`, nameAr: `شركة الاختبار ${index}`,
          price: 10 + index, currency: 'KWD', changePercent: 1, source: 'Fixture provider',
          observedAt: instant, receivedAt: instant, status: 'available', exchange: market, country: 'KW',
        })),
      } });
    }
    return route.fulfill({ json: { stories: [], items: [], points: [] } });
  });
  await openAndroidTvPackage(page, { keepMenu: true });
  await expect(page.locator('.tv-market-strip')).toHaveCount(marketIds.length);
  await expect.poll(() => page.locator('.tv-market-strip-item').count()).toBeGreaterThanOrEqual(72);
  await page.evaluate(() => document.fonts.ready);
  await settleFrames(page);
}

async function settleFrames(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

// Count the synchronous layout-read API used by focus eligibility checks. This
// isolates observer work from machine speed, network timing and INP sampling.
async function measureRefresh(page: Page, testInfo: TestInfo) {
  const result = await page.evaluate(async () => {
    const original = Element.prototype.getClientRects;
    let reads = 0;
    Element.prototype.getClientRects = function () {
      reads++;
      return original.call(this);
    };
    try {
      const times = [...document.querySelectorAll('.tv-strip-evidence time')];
      const targets = document.querySelectorAll('[data-tv-root] button').length;
      // Separate microtasks model several quote response commits arriving
      // before the next frame. Each text replacement is a childList mutation.
      for (let update = 0; update < 8; update++) {
        for (const time of times) time.textContent = `11:00:${String(update).padStart(2, '0')}`;
        await Promise.resolve();
      }
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return { reads, targets, updatedTimes: times.length, batches: 8 };
    } finally {
      Element.prototype.getClientRects = original;
    }
  });
  await testInfo.attach('focus-layout-reads', { body: JSON.stringify(result), contentType: 'application/json' });
  console.log(`${testInfo.title}: ${JSON.stringify(result)}`);
  expect(result.updatedTimes).toBeGreaterThanOrEqual(72);
  return result;
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: quote refreshes behind the menu do not scan focus targets or stop strips`, async ({ page }, testInfo) => {
    await openStrips(page, theme);
    const active = page.locator('[data-tv-focus-key="menu:strips"]');
    await expect(active).toBeFocused();
    const track = page.locator('[data-market="FOCUS0"] .tv-market-strip-track');
    await expect(track).toHaveCSS('animation-play-state', 'running');
    const result = await measureRefresh(page, testInfo);
    expect(result.reads).toBe(0);
    await expect(active).toBeFocused();
    await expect(track).toHaveCSS('animation-play-state', 'running');
  });

  test(`${theme}: refreshing a focused quote uses bounded layout reads`, async ({ page }, testInfo) => {
    await openStrips(page, theme);
    await closeTvMenu(page);
    const quote = page.locator('[data-market="FOCUS0"] .tv-market-strip-item').first();
    await quote.focus();
    await settleFrames(page);
    const result = await measureRefresh(page, testInfo);
    expect(result.reads).toBeLessThanOrEqual(2);
    await expect(quote).toBeFocused();
  });
}

for (const invalidation of ['hidden', 'disabled', 'aria-disabled', 'tabindex', 'inert'] as const) {
  test(`remote focus recovers after the focused quote becomes ${invalidation}`, async ({ page }) => {
    await openStrips(page);
    await closeTvMenu(page);
    const quote = page.locator('[data-market="FOCUS0"] .tv-market-strip-item').first();
    await quote.evaluate(element => { element.id = 'invalidated-quote'; });
    await quote.focus();
    await quote.evaluate((element, kind) => {
      if (kind === 'inert') element.parentElement!.setAttribute('inert', '');
      else element.setAttribute(kind, kind === 'aria-disabled' ? 'true' : kind === 'tabindex' ? '-1' : '');
    }, invalidation);
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(active && active.id !== 'invalidated-quote' && active.closest('[data-tv-root]')
        && !active.matches(':disabled,[aria-disabled="true"],[tabindex="-1"]')
        && !active.closest('[hidden],[inert],[aria-hidden="true"]'));
    })).toBe(true);
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-tv-root]')).toBeVisible();
  });
}

test('a replaced quote restores its stable focus identity', async ({ page }) => {
  await openStrips(page);
  await closeTvMenu(page);
  const quote = page.locator('[data-market="FOCUS0"] .tv-market-strip-item').first();
  await quote.evaluate(element => { (element as HTMLElement).dataset.tvFocusKey = 'fixture-stable-quote'; });
  await quote.focus();
  await quote.evaluate(element => element.replaceWith(element.cloneNode(true)));
  await expect(page.locator('[data-tv-focus-key="fixture-stable-quote"]')).toBeFocused();
});

test('opening and removing an embedded focus scope traps and restores remote focus', async ({ page }) => {
  await openStrips(page);
  await closeTvMenu(page);
  await page.locator('[data-market="FOCUS0"] .tv-market-strip-item').first().focus();
  await page.evaluate(() => {
    const scope = document.createElement('section');
    scope.id = 'fixture-editor';
    scope.setAttribute('data-tv-focus-scope', '');
    scope.style.cssText = 'position:fixed;inset:80px 200px auto;z-index:1200;background:white;padding:20px';
    const button = document.createElement('button');
    button.textContent = 'Fixture editor action';
    button.dataset.tvFocusKey = 'fixture-editor-action';
    scope.append(button);
    document.querySelector('[data-tv-root]')!.append(scope);
  });
  const editor = page.locator('[data-tv-focus-key="fixture-editor-action"]');
  await expect(editor).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(editor).toBeFocused();
  await page.locator('#fixture-editor').evaluate(element => element.remove());
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[data-tv-root]')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.tv-side-menu')).toBeVisible();
});

test('a focused strip remains visible when an earlier row grows', async ({ page }) => {
  await openStrips(page);
  await closeTvMenu(page);
  const quote = page.locator('[data-market="FOCUS0"] .tv-market-strip-item').first();
  await quote.focus();
  await page.locator('.tv-market-strips').evaluate(element => {
    const row = document.createElement('div');
    row.style.height = `${element.clientHeight + 100}px`;
    row.textContent = 'Fixture representing an earlier expanded market row';
    element.prepend(row);
  });
  await expect(quote).toBeFocused();
  await expect.poll(() => quote.evaluate(element => {
    const viewport = element.closest('.tv-market-strips')!.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    return bounds.top >= viewport.top - 1 && bounds.bottom <= viewport.bottom + 1;
  })).toBe(true);
});
