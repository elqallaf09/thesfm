import { chooseTvBroadcast, chooseTvDestination, openTvMenu, closeTvMenu } from './helpers/tv-controls';
import { expect, test, type Page } from '@playwright/test';
import { HOME_URL, PRESENTATION_BRIDGE, classifyLink } from '../../apps/markets-tv-mobile/src/navigation';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('sfm-tv-welcome-shown', '1'));
});

// Synthetic geometry/state fixtures only; no production fallback data.
async function fixtures(page: Page, emptyFirstBatch = false) {
  const markets = [
    { id: 'US', group: 'us', labelAr: 'الأسواق الأمريكية', labelEn: 'US markets', labelFr: 'Marchés américains', count: 2000, status: 'directory' },
    { id: 'BOURSA_KUWAIT', group: 'gulf', labelAr: 'بورصة الكويت', labelEn: 'Kuwait', labelFr: 'Koweït', count: 137, status: 'directory' },
  ];
  await page.route('**/api/tv/catalog', route => route.fulfill({ json: { markets } }));
  await page.route('**/api/tv/snapshot?*', route => {
    const params = new URL(route.request().url()).searchParams, batch = Number(params.get('page'));
    const symbols = params.has('symbols') ? JSON.parse(params.get('symbols')!) as string[] : ['QA0', 'QA1', 'QA2'];
    const quotes = symbols.map((symbol, index) => ({ symbol, name: `QA company ${symbol}`, nameAr: `شركة اختبار ${symbol}`,
      price: (emptyFirstBatch && batch === 0) || index === 1 ? null : 10 + index, currency: 'USD', changePercent: index ? -1 : 1,
      source: 'QA fixture', observedAt: new Date(Date.now() - (index === 2 ? 86400000 : 1000)).toISOString(),
      receivedAt: new Date().toISOString(), status: index === 1 ? 'unavailable' : 'available', exchange: params.get('market'), country: null,
    }));
    return route.fulfill({ json: { group: params.get('group'), market: params.get('market'), quotes,
      directoryTotal: emptyFirstBatch ? 24 : 2000, page: batch, total: quotes.length,
      available: quotes.filter(q => q.price !== null).length, generatedAt: new Date().toISOString() } });
  });
  await page.route('**/api/intelligence/latest?*', route => route.fulfill({ status: 404, json: { code: 'NO_ANALYSIS' } }));
}

async function chooseMarket(page: Page, marketId: string) {
  await expect(page.locator('.tv-market-picker')).toBeVisible();
  const mobileMarket = page.locator('.tv-picker-mobile-market select');
  await expect(mobileMarket.locator(`option[value="${marketId}"]`)).toBeAttached();
  if (await mobileMarket.isVisible()) {
    await mobileMarket.selectOption(marketId);
    await expect(mobileMarket).toHaveValue(marketId);
    return;
  }
  const market = page.locator(`[data-tv-focus-key="market-options-${marketId}"]`);
  await expect(market).toBeVisible();
  await market.click();
}

test('TV preferences remember stock choices, order, per-market speed, density and language after reload', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('tv-qa-initialized')) return;
    localStorage.setItem('tv-qa-initialized', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', marketIds: ['US', 'BOURSA_KUWAIT'] }));
    localStorage.setItem('sfm-markets-tv-instruments-v1', JSON.stringify({ US: ['QA0'] }));
  });
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=customize]').click();
  await chooseMarket(page, 'BOURSA_KUWAIT');
  await page.getByRole('button', { name: 'تقديم السوق: بورصة الكويت' }).click();
  await chooseMarket(page, 'US');
  await page.getByRole('group', { name: 'سرعة حركة الأشرطة: الأسواق الأمريكية', exact: true }).getByRole('button', { name: 'سريعة', exact: true }).click();
  await page.locator('[data-tv-focus-key=markets-done]').click();
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market', 'BOURSA_KUWAIT');
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').click();
  await page.locator('#tv-settings-tab-display').click();
  await page.getByRole('button', { name: 'مضغوط', exact: true }).click();
  await page.locator('#tv-settings-tab-appearance').click();
  await page.locator('.tv-language-options').getByRole('button', { name: 'Français', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await closeTvMenu(page);
  await expect(page.locator('[data-tv-root]')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('[data-tv-root]')).toHaveClass(/tv-density-compact/);
  await expect(page.locator('.tv-market-strip').first()).toHaveAttribute('data-market', 'BOURSA_KUWAIT');
  await expect(page.locator('[data-market="US"] .tv-market-strip-set').first().locator('button')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sfm-markets-tv-settings-v1')!).marketSpeeds.US)).toBe(80);
});

test('phone app entry shows the whole verified news feed in a separate moving strip', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 780 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await fixtures(page);
  await page.addInitScript(() => {
    Object.assign(window, { __sfmTvIosLaunch: 'qa', ReactNativeWebView: {
      postMessage: (message: string) => { document.documentElement.dataset.phoneMessage = message; },
    } });
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar', marketIds: ['US'] }));
  });
  const stamp = new Date().toISOString();
  const stories = Array.from({ length: 27 }, (_, i) => ({
    id: String(i), ticker: 'QA' + i, title: 'خبر الشركة ' + i, url: 'https://example.com/story/' + i,
    source: 'وكالة الاختبار', publishedAt: stamp, price: 0.25, priceVerified: true,
  }));
  await page.route('**/api/market/special-news?topic=stocks-under-1**', route => {
    const ticker = new URL(route.request().url()).searchParams.get('part') === 'ticker';
    return route.fulfill({ json: { success: true, topic: 'stocks-under-1',
      items: ticker ? [] : [...stories, { ...stories[0], id: 'excluded', url: 'https://example.com/excluded', price: 1 }],
      tickerItems: [{ symbol: 'QA0', price: 0.25, currency: 'USD', source: 'QA', available: true, asOf: stamp }],
    } });
  });
  await page.goto(new URL(HOME_URL).pathname);
  await page.addScriptTag({ content: PRESENTATION_BRIDGE });
  await expect(page.locator('html')).toHaveAttribute('data-phone-message', /sfm-tv-presentation/);
  await chooseTvDestination(page, 'strips');
  const market = page.locator('.tv-market-strip-track').first();
  await expect(market).toHaveAttribute('data-marquee', 'true');
  const offset = () => market.evaluate(el => el.firstElementChild!.getBoundingClientRect().x);
  const start = await offset();
  await expect.poll(async () => Math.abs((await offset()) - start)).toBeGreaterThan(25);
  await chooseTvBroadcast(page, 'underDollarNews');
  const wire = page.locator('.tv-under-dollar-headlines'), loop = wire.locator('.tv-headline-loop').first();
  await expect(wire).toBeInViewport({ ratio: 1 });
  await expect(loop.locator('a')).toHaveCount(27);
  await expect(loop.locator('a').last()).toContainText('QA26');
  await expect(page.locator('.tv-quote-marquee')).toContainText('QA0');
  const x = await loop.evaluate(el => el.getBoundingClientRect().x);
  await expect.poll(() => loop.evaluate(el => el.getBoundingClientRect().x)).toBeGreaterThan(x + 20);
  await expect(wire.locator('a[href$="/excluded"]')).toHaveCount(0);
  const link = loop.locator('a').first();
  expect(classifyLink((await link.getAttribute('href'))!)).toBe('external');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(loop).toHaveCSS('animation-name', 'none');
  await expect(wire.locator('[aria-hidden=true]')).toBeHidden();
  await page.context().route('https://example.com/story/0', r => r.fulfill({ body: 'QA publisher' }));
  const [publisher] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await expect(publisher).toHaveURL(stories[0].url);
});

test('new listings news shows a labelled US stock strip when verified new-listing prices are unavailable', async ({ page }) => {
  await fixtures(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar' })));
  await page.route('**/api/market/special-news?topic=new-stocks**', route => {
    const ticker = new URL(route.request().url()).searchParams.get('part') === 'ticker';
    return route.fulfill({ json: ticker
      ? { success: true, topic: 'new-stocks', tickerItems: [], quoteStatus: 'rights-unverified' }
      : { success: true, topic: 'new-stocks', items: [{
          id: 'news-1', title: 'أخبار طرح جديد', source: 'QA news', url: 'https://example.com/new-issue',
          publishedAt: new Date().toISOString(),
        }], lastSuccessfulUpdate: new Date().toISOString() } });
  });
  await page.goto('/tv');
  await closeTvMenu(page);
  await chooseTvBroadcast(page, 'newStocksNews');
  const strip = page.locator('.tv-quote-marquee');
  await expect(strip).toBeVisible();
  await expect(strip.locator('.tv-marquee-caption')).toHaveText('أسعار السوق الأمريكي · ليست إدراجات جديدة');
  await expect(strip.locator('.tv-marquee-set').first()).toContainText('QA0');
  await expect(page.locator('.tv-channel-ticker-status')).toHaveCount(0);
  await expect(strip.locator('.tv-marquee-track')).toHaveCSS('animation-play-state', 'running');
});

test('new listings strip falls back to clearly labelled indices if US directory has no valid prices', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'ar' })));
  await page.route('**/api/market/special-news?topic=new-stocks**', route => {
    const ticker = new URL(route.request().url()).searchParams.get('part') === 'ticker';
    return route.fulfill({ json: ticker
      ? { success: true, topic: 'new-stocks', tickerItems: [], quoteStatus: 'rights-unverified' }
      : { success: true, topic: 'new-stocks', items: [], lastSuccessfulUpdate: new Date().toISOString() } });
  });
  await page.route('**/api/tv/snapshot?*', route => {
    const group = new URL(route.request().url()).searchParams.get('group');
    if (group !== 'us' && group !== 'global') return route.fallback();
    return route.fulfill({ json: { group, summary: [], quotes: group === 'us' ? [] : [{
      symbol: 'SP500', name: 'Market benchmark', nameAr: 'مؤشر السوق', price: 5000,
      currency: 'USD', source: 'QA index provider', observedAt: new Date().toISOString(),
      changePercent: 1, exchange: null, country: 'US', status: 'available',
    }] } });
  });
  await page.goto('/tv');
  await closeTvMenu(page);
  await chooseTvBroadcast(page, 'newStocksNews');
  const strip = page.locator('.tv-quote-marquee');
  await expect(strip.locator('.tv-marquee-caption')).toHaveText('مؤشرات السوق العالمية · ليست إدراجات جديدة');
  await expect(strip.locator('.tv-marquee-set').first()).toContainText('SP500');
  await expect(page.locator('.tv-channel-ticker-status')).toHaveCount(0);
});

test('new listings news prefers verified newly-listed quotes over market-wide fallback', async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en' })));
  const fetched: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/tv/snapshot?group=us&market=US&pageSize=12')) fetched.push(request.url()); });
  await page.route('**/api/market/special-news?topic=new-stocks**', route => {
    const ticker = new URL(route.request().url()).searchParams.get('part') === 'ticker';
    return route.fulfill({ json: ticker
      ? { success: true, topic: 'new-stocks', tickerItems: [{
          symbol: 'LISTED', name: 'Verified new issuer', price: 14.50, changePercent: 1.2,
          currency: 'USD', source: 'QA licensed quote', available: true, asOf: new Date().toISOString(),
        }] }
      : { success: true, topic: 'new-stocks', items: [{
          id: 'news-1', title: 'Verified issuer', source: 'QA news', url: 'https://example.com/verified',
          publishedAt: new Date().toISOString(),
        }], lastSuccessfulUpdate: new Date().toISOString() } });
  });
  await page.goto('/tv');
  await closeTvMenu(page);
  await chooseTvBroadcast(page, 'newStocksNews');
  const strip = page.locator('.tv-quote-marquee');
  await expect(strip.locator('.tv-marquee-set').first()).toContainText('LISTED');
  await expect(strip.locator('.tv-marquee-caption')).toHaveCount(0);
  expect(fetched).toHaveLength(0);
});

test('portrait market strips move through one whole quote set per cycle', async ({ page }) => {
  await fixtures(page);
  await page.setViewportSize({ width: 430, height: 820 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  const track = page.locator('[data-market="US"] .tv-market-strip-track');
  await expect(track).toHaveAttribute('data-marquee', 'true');
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const width = await track.locator('.tv-market-strip-set').first().evaluate(el => el.getBoundingClientRect().width);
  const distance = await track.evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause();
    animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    return Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  });
  expect(Math.abs(distance - width / 2)).toBeLessThan(2);
});

test('TV density preserves source evidence, batch coverage and responsive layout', async ({ page }) => {
  await fixtures(page);
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  const row = page.locator('[data-market="US"]');
  await expect(row.locator('.tv-strip-coverage')).toContainText('2 / 3');
  await expect(row.locator('.tv-market-strip-heading small')).toContainText('2,000');
  const heights: number[] = [];
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const density of ['مريح', 'متوازن', 'مضغوط']) {
    await openTvMenu(page);
    await page.locator('[data-tv-focus-key=settings]').click();
    await page.locator('#tv-settings-tab-display').click();
    await page.getByRole('button', { name: density, exact: true }).click();
    await page.keyboard.press('Escape');
    heights.push((await row.boundingBox())!.height);
    await expect(row.locator('.tv-strip-evidence').first()).toContainText('QA fixture');
    await expect(row.locator('.tv-strip-symbol').first()).toContainText('شركة اختبار');
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      const captions = row.locator('.tv-market-strip-set').first().locator('.tv-strip-symbol > span, .tv-strip-price > span, .tv-strip-change, .tv-strip-evidence');
      expect(await captions.evaluateAll(elements => Math.min(...elements.map(element => parseFloat(getComputedStyle(element).fontSize))))).toBeGreaterThanOrEqual(12);
      const overflow = await row.locator('.tv-market-strip-set').first().locator('.tv-market-strip-item').evaluateAll(cards => cards.flatMap(card => {
        const bounds = card.getBoundingClientRect();
        return [...card.children].filter(child => { const rect = child.getBoundingClientRect(); return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1; }).map(child => child.className);
      }));
      expect(overflow).toEqual([]);
    }
  }
  expect(heights[0]).toBeGreaterThan(heights[1]); expect(heights[1]).toBeGreaterThan(heights[2]);
  await expect(row.locator('.tv-market-strip-set').first().locator('button')).toHaveCount(2);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }, { width: 3840, height: 2160 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height + 2);
  }
  await row.locator('.tv-market-strip-set').first().locator('button').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(row.locator('.tv-market-strip-set').first().locator('button').first()).toBeFocused();
});

test('priced-only mode advances an empty batch and the labelled menu stays reachable', async ({ page }) => {
  test.setTimeout(60000);
  await fixtures(page, true);
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', marketIds: ['US'], pricedOnly: true, autoHideControls: true })));
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  await expect(page.locator('.tv-market-strip-empty')).toContainText('continuing to the next batch');
  await expect(page.locator('.tv-market-strip-set').first().locator('button')).toHaveCount(2, { timeout: 18000 });
  await expect(page.locator('.tv-strip-coverage')).toContainText('2 / 3');
  await page.locator('.tv-market-strip-heading').focus();
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-tv-focus-key=menu-toggle]')).toBeVisible();
  await openTvMenu(page);
  await page.locator('[data-tv-focus-key=settings]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('a rate-limited strip hides unpriced instruments and pauses automatic batch scanning', async ({ page }) => {
  await fixtures(page);
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language: 'en', marketIds: ['US'] })));
  const pages: string[] = [];
  await page.route('**/api/tv/snapshot?*', route => {
    const batch = new URL(route.request().url()).searchParams.get('page') || '0';
    pages.push(batch);
    return route.fulfill({ json: { group: 'us', market: 'US', page: Number(batch), directoryTotal: 24, available: 0, total: 12,
      retryAt: new Date(Date.now() + 300_000).toISOString(), generatedAt: new Date().toISOString(),
      quotes: Array.from({ length: 12 }, (_, index) => ({ symbol: `QA${index}`, name: `Unavailable fixture ${index}`, nameAr: `أداة اختبار ${index}`,
        price: null, currency: 'USD', changePercent: null, source: null, observedAt: null, status: 'unavailable', issue: 'rate_limited', exchange: 'US', country: 'US' })) } });
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/tv/strips');
  await closeTvMenu(page);
  const strip = page.locator('[data-market="US"]');
  await expect(strip.locator('.tv-market-strip-item')).toHaveCount(0);
  await expect(strip).toHaveAttribute('data-source-cooling', 'true');
  await expect(strip.locator('.tv-strip-price,.tv-strip-change')).toHaveCount(0);
  await expect(strip.locator('.tv-market-strip-empty')).toContainText('Source request limit reached');
  await expect(strip.locator('.tv-market-strip-track')).toHaveCount(0);
  await page.clock.fastForward(9000);
  expect(pages.every(value => value === '0')).toBe(true);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 3840, height: 2160 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 2);
  }
  await expect(strip.locator('.tv-market-strip-empty')).not.toContainText('continuing to the next batch');
  await page.clock.fastForward(9000);
  expect(pages.every(value => value === '0')).toBe(true);
});
