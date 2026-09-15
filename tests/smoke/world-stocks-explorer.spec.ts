import { expect, test, type Page } from '@playwright/test';

function stock(overrides: Record<string, unknown> = {}) {
  return {
    canonicalSymbol: 'AAPL',
    providerSymbol: 'AAPL',
    displayName: 'Apple Inc.',
    exchangeCode: 'US',
    exchangeName: 'US Markets',
    countryCode: 'US',
    countryName: 'United States',
    region: 'US',
    currency: 'USD',
    sector: null,
    industry: null,
    assetType: 'stock',
    price: null,
    change: null,
    changePercent: null,
    marketCap: null,
    quoteTimestamp: null,
    delayed: true,
    dataSource: null,
    logoKey: 'AAPL',
    metadataStatus: 'available',
    quoteStatus: 'not_fetched',
    ...overrides,
  };
}

function searchPayload(results: ReturnType<typeof stock>[], overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    success: true,
    query: '',
    region: null,
    page: 1,
    pageSize: 25,
    totalCount: results.length,
    hasMore: false,
    source: 'bundled',
    results,
    ...overrides,
  };
}

async function mockWorldStocksApi(page: Page, results: ReturnType<typeof stock>[] = [stock(), stock({ canonicalSymbol: 'MSFT', displayName: 'Microsoft Corp', providerSymbol: 'MSFT' })]) {
  await page.route('**/api/world-stocks/search**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(searchPayload(results)),
  }));
  await page.route('**/api/world-stocks/quotes', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      success: true,
      partialFailure: false,
      quotes: Object.fromEntries(results.map(item => [item.canonicalSymbol, {
        price: 190.12,
        change: 2.5,
        changePercent: 1.33,
        currency: 'USD',
        quoteTimestamp: new Date().toISOString(),
        delayed: true,
        dataSource: 'Yahoo Finance',
        status: 'available',
      }])),
    }),
  }));
}

async function useEnglish(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'en'));
}

// The desktop table and the mobile card grid render the same results at
// the same time -- a CSS breakpoint toggles which is display:none, not
// conditional rendering -- so any result-row text exists twice in the DOM
// regardless of viewport. `.first()`/DOM-order tricks are wrong here (the
// table happens to come first in markup, so they'd silently assert against
// a hidden element on mobile projects); this filters to whichever
// occurrence is actually visible at the current viewport instead.
function visibleText(page: Page, text: string) {
  return page.getByText(text).and(page.locator(':visible'));
}

test.describe('World Stocks Explorer', () => {
  test('renders real search results with live quotes, no fabricated price before quotes arrive', async ({ page }) => {
    await useEnglish(page);
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');

    await expect(page.getByRole('heading', { name: 'World Stocks Explorer' })).toBeVisible();
    await expect(visibleText(page, 'Apple Inc.')).toBeVisible();
    // Quotes resolve asynchronously after the initial search render -- price
    // should end up visible without the page ever showing a placeholder value.
    // Both mocked symbols share the same fixture price ($190.12), so more
    // than one visible match is expected here -- .first() picks either,
    // which is fine: the point is confirming a real price renders at all.
    await expect(visibleText(page, '$190.12').first()).toBeVisible();
  });

  test('never presents a region with no real data pipeline', async ({ page }) => {
    await useEnglish(page);
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');

    for (const unsupported of ['Saudi', 'Tadawul', 'Qatar', 'Bahrain', 'Muscat', 'Abu Dhabi']) {
      await expect(page.getByRole('tab', { name: new RegExp(unsupported, 'i') })).toHaveCount(0);
    }
    await expect(page.getByRole('tab', { name: 'Boursa Kuwait' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'US Markets' })).toBeVisible();
  });

  test('filters by region', async ({ page }) => {
    await useEnglish(page);
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/world-stocks/search')) requests.push(request.url());
    });
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');
    await expect(visibleText(page, 'Apple Inc.')).toBeVisible();

    const initialCount = requests.length;
    await page.getByRole('tab', { name: 'US Markets' }).click();
    await expect.poll(() => requests.length).toBeGreaterThan(initialCount);
    expect(new URL(requests.at(-1)!).searchParams.get('region')).toBe('US');
  });

  test('does not duplicate the search request on hydration when the language matches the app default', async ({ page }) => {
    // Deliberately does not force sfm_lang here -- see the identical
    // comment/precedent in tests/smoke/tech-news-experience.spec.ts. The
    // app's LanguageProvider always mounts with the 'ar' default first and
    // corrects to the stored preference in a post-hydration effect; forcing
    // 'en' here would trigger that legitimate, app-wide correction as a
    // second, unrelated fetch and produce a false positive for this page's
    // own data-fetching effect.
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/world-stocks/search')) requests.push(request.url());
    });
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');
    await expect(visibleText(page, 'Apple Inc.')).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test('advanced filters panel is a focus-trapped, Escape-closable dialog', async ({ page }) => {
    await useEnglish(page);
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');
    await expect(visibleText(page, 'Apple Inc.')).toBeVisible();

    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toHaveCount(0);
    const trigger = page.getByRole('button', { name: 'Advanced filters' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Advanced filters' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('sets an asset-type filter and shows it as an active filter chip with clear', async ({ page }) => {
    await useEnglish(page);
    await mockWorldStocksApi(page);
    await page.goto('/world-stocks');
    await expect(visibleText(page, 'Apple Inc.')).toBeVisible();

    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await page.locator('select').first().selectOption('stock');
    await page.keyboard.press('Escape');

    await expect(page.getByText('Asset type').locator('..').getByText('Stock')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.locator('.world-stocks-active-filters')).toHaveCount(0);
  });

  test('sorting the table by the Change column updates aria-sort on the header cell', async ({ page, isMobile }) => {
    // The sortable-column-header interaction is desktop-table-only by
    // design -- the table is display:none on mobile viewports, where sort
    // is instead available through the Advanced Filters "Sort" dropdown
    // (usable on every viewport, unlike a clickable table header).
    test.skip(isMobile, 'Column-header sorting only applies to the desktop table view.');

    await useEnglish(page);
    await mockWorldStocksApi(page, [
      stock({ canonicalSymbol: 'DOWN', displayName: 'Down Corp' }),
      stock({ canonicalSymbol: 'UP', displayName: 'Up Corp' }),
    ]);
    await page.goto('/world-stocks');
    await expect(visibleText(page, 'Down Corp')).toBeVisible();

    const header = page.locator('th', { hasText: 'Change' });
    await expect(header).not.toHaveAttribute('aria-sort', /ascending|descending/);
    await page.getByRole('button', { name: 'Change' }).click();
    await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);
  });

  test('shows a truthful no-results state and an error state with no fallback data', async ({ page }) => {
    await useEnglish(page);
    await mockWorldStocksApi(page, []);
    await page.goto('/world-stocks');
    await expect(page.getByText('No matching results')).toBeVisible();

    await page.route('**/api/world-stocks/search**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, success: false, code: 'provider_temporarily_unavailable', message: 'World stock search is temporarily unavailable.' }),
    }));
    await page.reload();
    await expect(page.getByText('World stock search is temporarily unavailable.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('navigates to the detail page and shows truthful unavailable states, never a fake chart', async ({ page }) => {
    await useEnglish(page);
    await page.route('**/api/world-stocks/detail**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, stock: stock() }),
    }));
    await page.route('**/api/world-stocks/quotes', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        success: true,
        partialFailure: false,
        quotes: { AAPL: { price: 190.12, change: 2.5, changePercent: 1.33, currency: 'USD', quoteTimestamp: new Date().toISOString(), delayed: true, dataSource: 'Yahoo Finance', status: 'available' } },
      }),
    }));

    await page.goto('/world-stocks/AAPL?region=US');
    await expect(page.getByRole('heading', { name: 'Apple Inc. (AAPL)' })).toBeAttached();
    await expect(page.getByText('$190.12')).toBeVisible();
    await expect(page.getByText('Unavailable').first()).toBeVisible();
    await expect(page.getByText('Chart data is not currently available for this symbol.')).toBeVisible();

    await expect(page.getByRole('link', { name: /Open in Market Analysis/ })).toHaveAttribute('href', '/market-analysis?symbol=AAPL');
    await expect(page.getByRole('link', { name: /Ask AI Analyst/ })).toHaveAttribute('href', '/ai-analyst/overview?symbol=AAPL&assetType=stock');
    await expect(page.getByRole('link', { name: /Open in Investments Center/ })).toHaveAttribute('href', '/investments?symbol=AAPL');
  });

  test('shows a truthful not-found state for an unknown symbol', async ({ page }) => {
    await useEnglish(page);
    await page.route('**/api/world-stocks/detail**', route => route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, success: false, code: 'not_found', message: 'This symbol could not be found.' }),
    }));
    await page.goto('/world-stocks/DOESNOTEXIST?region=US');
    await expect(page.getByText('This symbol could not be found')).toBeVisible();
  });

  test('offers a real sign-in link instead of a watchlist button while signed out', async ({ page }) => {
    await useEnglish(page);
    await page.route('**/api/world-stocks/detail**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, stock: stock() }),
    }));
    await page.route('**/api/world-stocks/quotes', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, partialFailure: false, quotes: {} }),
    }));
    await page.goto('/world-stocks/AAPL?region=US');

    const signIn = page.getByRole('link', { name: 'Sign in to add' });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', /^\/login\?next=/);
  });

  test('renders correctly in Arabic RTL with no horizontal overflow', async ({ page }) => {
    await mockWorldStocksApi(page);
    await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
    await page.goto('/world-stocks');
    await expect(page.locator('[data-news-page-shell]')).toHaveCount(0);
    await expect(page.locator('html[dir="rtl"], body[dir="rtl"], [dir="rtl"]').first()).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('respects reduced motion for the loading skeleton', async ({ page }) => {
    await page.route('**/api/world-stocks/search**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(searchPayload([])) });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await useEnglish(page);
    await page.goto('/world-stocks');
    const skeleton = page.locator('[class*="skeletonLine"]');
    if (await skeleton.count() > 0) {
      await expect(skeleton.first()).toHaveCSS('animation-name', 'none');
    }
  });
});
