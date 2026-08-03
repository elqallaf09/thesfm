import { expect, test, type Page } from '@playwright/test';

function stripsPayload(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    lastUpdated: new Date().toISOString(),
    prices: {
      'NBK.KW': { symbol: 'NBK.KW', price: 1.02, change: 0.01, changePercent: 0.99, source: 'Yahoo Finance', delayed: true, available: true },
      '2222.SR': { symbol: '2222.SR', price: 24.82, change: -0.1, changePercent: -0.40, source: 'Yahoo Finance', delayed: true, available: true },
      AAPL: { symbol: 'AAPL', price: 308.91, change: -24.52, changePercent: -7.35, source: 'Yahoo Finance', delayed: true, available: true },
      MSFT: { symbol: 'MSFT', price: 464.72, change: 13.62, changePercent: 3.02, source: 'Yahoo Finance', delayed: true, available: true },
      'GC=F': { symbol: 'GC=F', price: 4123.9, change: 16.8, changePercent: 0.41, source: 'Finnhub', delayed: true, available: true },
      '^GSPC': { symbol: '^GSPC', price: 7489.72, change: 52.1, changePercent: 0.70, source: 'Finnhub', delayed: true, available: true },
      'EURUSD=X': { symbol: 'EURUSD=X', price: 1.1554, change: 0.0025, changePercent: 0.22, source: 'Finnhub', delayed: true, available: true },
      JPM: { symbol: 'JPM', price: null, change: null, changePercent: null, source: 'Finnhub', delayed: true, available: false, unavailableReason: 'price_not_fetched' },
      ...overrides,
    },
  };
}

function newsPayload() {
  return {
    ok: true,
    success: true,
    items: [
      {
        id: 'gm-story-1',
        title: 'Federal Reserve holds interest rates steady amid inflation watch',
        headline: 'Federal Reserve holds interest rates steady amid inflation watch',
        summary: 'The central bank left its benchmark rate unchanged, citing balanced risks to its dual mandate.',
        sourceName: 'Reuters',
        publishedAt: new Date().toISOString(),
        url: 'https://example.com/gm-story-1',
        relatedSymbols: ['AAPL'],
        exchangeCodes: ['NASDAQ'],
        countryCodes: ['US'],
        originalLanguage: 'en',
      },
    ],
    total: 1,
  };
}

async function mockGlobalMarkets(page: Page, strips = stripsPayload(), news = newsPayload()) {
  await page.route('**/api/market-strips**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(strips),
  }));
  await page.route('**/api/market-news**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(news),
  }));
}

async function useEnglish(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'en'));
}

test.describe('Global Markets Hub', () => {
  test('renders a stable staged-loading shell before market and news data resolve', async ({ page }, testInfo) => {
    await useEnglish(page);
    let releaseRequests!: () => void;
    const requestGate = new Promise<void>(resolve => { releaseRequests = resolve; });
    await page.route('**/api/market-strips**', async route => {
      await requestGate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stripsPayload()) });
    });
    await page.route('**/api/market-news**', async route => {
      await requestGate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newsPayload()) });
    });

    await page.goto('/global-markets');
    try {
      await expect(page.locator('.gm-strips-skeleton-row').first()).toBeVisible();
      await expect(page.locator('.gm-news-skeleton')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('global-markets-staged-loading.png'), fullPage: true });
    } finally {
      releaseRequests();
    }
    await expect(page.locator('.gm-strip-heading-label').last()).toBeVisible();
    await expect(page.locator('.gm-news-list')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('global-markets-editorial-news.png'), fullPage: true });
  });

  test('renders exactly the four persisted primary strips instead of stacking the full catalog', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    await expect(page.locator('.gm-strip-heading-label').last()).toBeVisible();
    const headings = await page.locator('.gm-strip-heading-label').allTextContents();
    const expectedLabels = ['Kuwait — Boursa Kuwait', 'Saudi Arabia — Tadawul', 'United States — NASDAQ', 'Forex'];
    expect(headings).toEqual(expectedLabels);
    expect(headings).toHaveLength(4);
    expect(new Set(headings).size).toBe(headings.length);
  });

  test('shows logo, symbol, price, change, and a real sector for a resolved equity item', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const aaplCard = page.locator('.gm-strip-item', { hasText: 'AAPL' }).first();
    await expect(aaplCard).toBeVisible();
    await expect(aaplCard.locator('.gm-strip-item-logo')).toBeVisible();
    await expect(aaplCard).toContainText('308.91');
    await expect(aaplCard).toContainText('Technology');
  });

  test('never fabricates a price or sector for an unresolved or non-equity instrument', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const unresolvedCard = page.locator('.gm-strip-item', { hasText: 'KFH.KW' }).first();
    await expect(unresolvedCard).toContainText('Unavailable');

    const forexCard = page.locator('.gm-strip-item', { hasText: 'EUR/USD' }).first();
    await expect(forexCard).toContainText('Forex');
  });

  test('renders each ticker track with continuous animation by default', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const track = page.locator('.market-ticker-track').first();
    await expect(track).toBeVisible();
    const animationName = await track.evaluate(element => getComputedStyle(element).animationName);
    expect(animationName).not.toBe('none');
  });

  test('normalizes visibly different strips to the same rendered pixels per second', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');
    const tracks = page.locator('.gm-strip .market-ticker-track');
    await expect(tracks.first()).toHaveAttribute('data-loop-distance', /\d/);
    const velocities = await tracks.evaluateAll(elements => elements.slice(0, 3).map(element => {
      const primary = element.querySelector<HTMLElement>('[data-ticker-set="primary"]');
      const durationText = getComputedStyle(element).animationDuration;
      const duration = Number.parseFloat(durationText) * (durationText.endsWith('ms') ? 0.001 : 1);
      return (primary?.getBoundingClientRect().width ?? 0) / duration;
    }));
    expect(velocities.length).toBeGreaterThan(1);
    for (const velocity of velocities) expect(Math.abs(velocity - velocities[0])).toBeLessThan(0.2);
  });

  test('pauses ticker animation on hover', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const strip = page.locator('.market-ticker-strip').first();
    await strip.hover();
    await expect(strip.locator('.market-ticker-track').first()).toHaveCSS('animation-play-state', 'paused');
  });

  test('pauses ticker animation on keyboard focus via the strip control buttons', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const strip = page.locator('.market-ticker-strip').first();
    const controlButton = page.locator('.gm-strip-body').first().getByRole('button').first();
    await controlButton.focus();
    await expect(strip.locator('.market-ticker-track').first()).toHaveCSS('animation-play-state', 'paused');
  });

  test('respects reduced motion by disabling ticker animation entirely', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/global-markets');

    const track = page.locator('.market-ticker-track').first();
    await expect(track).toHaveCSS('animation-name', 'none');
  });

  test('renders correctly in Arabic RTL with no page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockGlobalMarkets(page);
    await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
    await page.goto('/global-markets');

    await expect(page.locator('.gm-shell[dir="rtl"]')).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('opens an accessible mobile picker, enforces 4/4, reorders, and persists after reload', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    await expect(page.locator('.gm-selection')).toContainText('4 / 4');
    await page.getByRole('button', { name: 'Customize markets' }).click();
    const dialog = page.getByRole('dialog', { name: 'Customize markets' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Selected markets: 4 / 4');

    const before = await dialog.locator('.gm-picker-order li').allTextContents();
    await dialog.getByRole('button', { name: /Move down: Kuwait/ }).click();
    const after = await dialog.locator('.gm-picker-order li').allTextContents();
    expect(after[0]).not.toBe(before[0]);
    await dialog.getByRole('button', { name: /Save markets/ }).click();
    await page.reload();
    await expect(page.locator('.gm-strip-heading-label').first()).toContainText('Saudi Arabia');
    await expect(page.locator('.gm-strip')).toHaveCount(4);
  });

  test('keeps compact strips within mobile dimensions and renders six initial news rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await useEnglish(page);
    const news = newsPayload();
    news.items = Array.from({ length: 12 }, (_, index) => ({
      ...news.items[0],
      id: `story-${index}`,
      title: `Verified market story ${index}`,
      headline: `Verified market story ${index}`,
      url: `https://example.com/verified-market-story-${index}`,
    }));
    news.total = news.items.length;
    await mockGlobalMarkets(page, stripsPayload(), news);
    await page.goto('/global-markets');

    const box = await page.locator('.gm-strip-item').first().boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(128);
    expect(box?.width).toBeLessThanOrEqual(150);
    expect(box?.height).toBeGreaterThanOrEqual(64);
    expect(box?.height).toBeLessThanOrEqual(76);
    await expect(page.locator('.gm-news-list li')).toHaveCount(6);
    const newsLoadMore = page.locator('.gm-news-load');
    await expect(newsLoadMore).toBeVisible();
    await expect(newsLoadMore).toBeEnabled();
    await newsLoadMore.evaluate(button => (button as HTMLButtonElement).click());
    await expect(page.locator('.gm-news-list li')).toHaveCount(12);
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('the explorer supports search, country/exchange/sector/asset-type filters, and load-more pagination', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const explorer = page.locator('.gm-explorer');
    await explorer.getByRole('button', { name: 'Browse all assets' }).click();
    await expect(explorer.getByPlaceholder(/Search by stock/i)).toBeVisible();
    await expect(explorer.getByLabel('Country')).toBeVisible();
    await expect(explorer.getByLabel('Exchange')).toBeVisible();
    await expect(explorer.getByLabel('Sector')).toBeVisible();
    await expect(explorer.getByLabel('Asset type')).toBeVisible();

    const initialCards = await explorer.locator('.gm-strip-item').count();
    expect(initialCards).toBeGreaterThan(0);

    await explorer.getByPlaceholder(/Search by stock/i).fill('AAPL');
    await expect(explorer.locator('.gm-strip-item')).toHaveCount(1);
    await expect(explorer.locator('.gm-strip-item')).toContainText('AAPL');
  });

  test('explorer Load More exposes a busy state and blocks duplicate rapid appends', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');
    const explorer = page.locator('.gm-explorer');
    await explorer.getByRole('button', { name: 'Browse all assets' }).click();
    await expect(explorer.locator('.gm-strip-item')).toHaveCount(12);
    const loadMore = explorer.getByRole('button', { name: /Load more/ });
    await loadMore.evaluate(button => {
      const loadButton = button as HTMLButtonElement;
      loadButton.click();
      loadButton.click();
    });
    const expectedCount = await page.evaluate(() => (matchMedia('(max-width: 767px)').matches ? 18 : 24));
    await expect(explorer.locator('.gm-strip-item')).toHaveCount(expectedCount);
    await page.waitForFunction(() => performance.getEntriesByName('gm-explorer-append', 'measure').length > 0);
    const measure = await page.evaluate(() => performance.getEntriesByName('gm-explorer-append', 'measure').at(-1)?.duration ?? null);
    expect(measure).not.toBeNull();
  });

  test('the lower news section shows broad market news distinct from the Tech News feed', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const newsSection = page.locator('.gm-news');
    await expect(newsSection).toContainText('Federal Reserve holds interest rates steady');
  });

  test('manual news customization is selection-driven and targets verified markets and companies', async ({ page }, testInfo) => {
    await useEnglish(page);
    const newsRequests: string[] = [];
    await mockGlobalMarkets(page);
    page.on('request', request => {
      if (request.url().includes('/api/market-news')) newsRequests.push(request.url());
    });
    await page.goto('/global-markets');

    await page.getByRole('button', { name: 'Manual customization' }).click();
    const filters = page.locator('.gm-news-filter-panel');
    await expect(filters).toBeVisible();
    await expect(filters.locator(':scope > input')).toHaveCount(0);
    await expect(filters.locator('input[type="search"]')).toHaveCount(4);

    const country = filters.locator('.gm-news-select', { hasText: 'Countries' });
    await country.locator('summary').click();
    await country.getByRole('checkbox', { name: 'Kuwait' }).check({ force: true });
    await country.evaluate(element => { (element as HTMLDetailsElement).open = false; });

    const company = filters.locator('.gm-news-select', { hasText: 'Companies & symbols' });
    await company.locator('summary').click();
    await company.locator('input[type="search"]').fill('Apple');
    await company.getByRole('checkbox', { name: /Apple · AAPL/ }).check({ force: true });
    await company.evaluate(element => { (element as HTMLDetailsElement).open = false; });

    await expect(filters.locator('.gm-news-filter-tokens')).toContainText('Kuwait');
    await expect(filters.locator('.gm-news-filter-tokens')).toContainText('AAPL');
    await page.screenshot({ path: testInfo.outputPath('global-markets-selection-filters.png'), fullPage: true });
    await filters.getByRole('button', { name: /Apply filters/ }).click();

    await expect.poll(() => newsRequests.at(-1) ?? '').toContain('countries=KW');
    expect(newsRequests.at(-1)).toContain('symbols=AAPL');
  });

  test('makes exactly one request each to market-strips and market-news, with no duplicate after hydration', async ({ page }) => {
    await mockGlobalMarkets(page);
    const stripsRequests: string[] = [];
    const newsRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/market-strips')) stripsRequests.push(request.url());
      if (request.url().includes('/api/market-news')) newsRequests.push(request.url());
    });
    await page.goto('/global-markets');
    await expect(page.locator('.gm-strip-heading-label').first()).toBeVisible();
    expect(stripsRequests).toHaveLength(1);
    expect(newsRequests).toHaveLength(1);
    expect(stripsRequests[0]).toContain('ids=kuwait_boursa%2Csaudi_tadawul%2Cus_nasdaq%2Cforex');
    expect(newsRequests[0]).toContain('marketIds=kuwait_boursa%2Csaudi_tadawul%2Cus_nasdaq%2Cforex');
  });

  test('navigation exposes Global Markets Hub, Tech Market News, and AI Analyst as three separate entries', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop sidebar rail coverage runs in the desktop project; mobile nav is a drawer tested separately.');
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    await expect(page.getByRole('link', { name: 'Global Markets Hub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tech Market News' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'SFM AI Analyst' })).toBeVisible();
  });
});
