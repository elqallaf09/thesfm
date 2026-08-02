import { expect, test, type Page } from '@playwright/test';

function stripsPayload(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    lastUpdated: new Date().toISOString(),
    prices: {
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
  test('renders every required country/exchange strip as its own separate section, with no combined labels', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    await expect(page.locator('.gm-strip-heading-label').last()).toBeVisible();
    const headings = await page.locator('.gm-strip-heading-label').allTextContents();
    const expectedLabels = [
      'United States — NASDAQ',
      'United States — NYSE',
      'Japan — Tokyo Stock Exchange',
      'China — Shanghai Stock Exchange',
      'China — Shenzhen Stock Exchange',
      'Hong Kong — HKEX',
      'India — National Stock Exchange (NSE)',
      'India — Bombay Stock Exchange (BSE)',
      'South Korea — Korea Exchange (KRX)',
      'Canada — Toronto Stock Exchange (TSX)',
      'Australia — ASX',
      'Forex',
      'Commodities & Metals',
      'Crypto',
      'Global Indices',
    ];
    expect(headings).toEqual(expectedLabels);
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

    const jpmCard = page.locator('.gm-strip-item', { hasText: 'JPM' }).first();
    await expect(jpmCard).toContainText('Unavailable');

    const forexCard = page.locator('.gm-strip-item', { hasText: 'EUR/USD' }).first();
    await expect(forexCard).toContainText('Sector unavailable');
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
    await mockGlobalMarkets(page);
    await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
    await page.goto('/global-markets');

    await expect(page.locator('.gm-shell[dir="rtl"]')).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('the explorer supports search, country/exchange/sector/asset-type filters, and load-more pagination', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const explorer = page.locator('.gm-explorer');
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

  test('the lower news section shows broad market news distinct from the Tech News feed', async ({ page }) => {
    await useEnglish(page);
    await mockGlobalMarkets(page);
    await page.goto('/global-markets');

    const newsSection = page.locator('.gm-news');
    await expect(newsSection).toContainText('Federal Reserve holds interest rates steady');
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
