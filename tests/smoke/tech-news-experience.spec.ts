import { expect, test, type Page } from '@playwright/test';

function newsItem(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const id = typeof overrides.id === 'string' ? overrides.id : 'story-1';
  const defaultHeadline = 'Nvidia unveils next-generation AI accelerator';
  // dedupeNewsItems() also rejects a second item whose *normalized title*
  // repeats, independent of URL/id -- so titleOriginal/summaryOriginal must
  // default to whatever headline/title this call actually overrode, never
  // to the fixed base string, or every item that doesn't explicitly set its
  // own titleOriginal collapses into one "duplicate" of the first.
  const headline = typeof overrides.headline === 'string' ? overrides.headline : defaultHeadline;
  // Same reasoning for summary: a shared, keyword-laden default (e.g. "chip")
  // would make unrelated fixture items falsely match category keyword
  // filters (categoryMatches searches summary text too).
  const summary = typeof overrides.summary === 'string' ? overrides.summary : `${headline}.`;
  return {
    id: 'story-1',
    headline,
    title: headline,
    summary,
    titleOriginal: headline,
    summaryOriginal: summary,
    languageOriginal: 'en',
    companyName: 'NVIDIA',
    ticker: 'NVDA',
    sector: 'semiconductors',
    sectors: ['semiconductors', 'ai'],
    source: 'CNBC',
    datetime: Math.floor(Date.now() / 1000),
    publishedAt: now,
    // Every fixture story must have a distinct URL -- dedupeNewsItems()
    // treats matching URLs as the same story, so a shared default here
    // would silently collapse all fixture items down to one.
    url: `https://example.com/${id}`,
    image: null,
    price: 200.75,
    changePercent: 2.93,
    change: 5.71,
    priceSource: 'Finnhub',
    delayed: true,
    verificationStatus: 'official',
    independentSourceCount: 3,
    supportingSources: [],
    isOfficial: true,
    sourceReliability: 0.95,
    eventType: 'product_launch',
    importanceScore: 90,
    sentiment: 'positive',
    expectedImpact: 'high',
    impactDirection: 'positive',
    impactHorizon: 'short_term',
    impactReason: null,
    whyItMatters: null,
    conflictSummary: null,
    isTranslated: false,
    ...overrides,
  };
}

function mockPayload() {
  // Explicit, strictly decreasing publishedAt per named item: the page
  // sorts "recent first" by default, so relying on each call's wall-clock
  // Date.now() to tie (and therefore preserve insertion order) is flaky --
  // two calls a millisecond apart silently reorder the "top 3" selection.
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
  const items = [
    newsItem({ id: 'lead', headline: 'Nvidia unveils next-generation AI accelerator', ticker: 'NVDA', companyName: 'NVIDIA', verificationStatus: 'official', isOfficial: true, changePercent: 6.5, publishedAt: minutesAgo(1) }),
    newsItem({ id: 'secondary-1', headline: 'Microsoft expands Azure AI infrastructure', title: 'Microsoft expands Azure AI infrastructure', ticker: 'MSFT', companyName: 'Microsoft', source: 'Yahoo', sector: 'cloud', sectors: ['cloud', 'ai'], verificationStatus: 'confirmed', isOfficial: false, independentSourceCount: 2, changePercent: 3.0, publishedAt: minutesAgo(2) }),
    newsItem({ id: 'secondary-2', headline: 'Analysts split on chip sector outlook', title: 'Analysts split on chip sector outlook', ticker: 'AMD', companyName: 'AMD', source: 'Benzinga', sector: 'semiconductors', verificationStatus: 'conflicting', isOfficial: false, independentSourceCount: 2, changePercent: -1.2, publishedAt: minutesAgo(3) }),
    newsItem({
      id: 'unresolved',
      headline: 'Broader technology sector roundup for the week',
      title: 'Broader technology sector roundup for the week',
      ticker: 'TECH',
      companyName: 'Technology market',
      source: 'SeekingAlpha',
      sector: 'software',
      sectors: ['software'],
      price: null,
      changePercent: null,
      change: null,
      verificationStatus: 'unverified',
      isOfficial: false,
      independentSourceCount: 1,
      publishedAt: minutesAgo(4),
    }),
    newsItem({
      id: 'translated',
      headline: 'Apple reports record quarterly earnings',
      title: 'Apple reports record quarterly earnings',
      titleOriginal: 'Apple annonce des résultats trimestriels records',
      summaryOriginal: 'Apple a annoncé des résultats trimestriels records.',
      ticker: 'AAPL',
      companyName: 'Apple',
      source: 'CNBC',
      sector: 'hardware',
      isTranslated: true,
      translatedTo: 'en',
      verificationStatus: 'confirmed',
      independentSourceCount: 2,
      publishedAt: minutesAgo(5),
    }),
  ];
  for (let index = 0; index < 8; index += 1) {
    items.push(newsItem({
      id: `filler-${index}`,
      headline: `Additional technology story number ${index}`,
      title: `Additional technology story number ${index}`,
      ticker: index % 2 === 0 ? 'GOOGL' : 'META',
      companyName: index % 2 === 0 ? 'Alphabet' : 'Meta',
      source: index % 2 === 0 ? 'Yahoo' : 'CNBC',
      sector: 'software',
      verificationStatus: 'single_source',
      isOfficial: false,
      independentSourceCount: 1,
      changePercent: 0.4,
      publishedAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
    }));
  }

  return {
    success: true,
    source: 'Multi-source market news',
    priceSource: 'Finnhub/Yahoo Finance fallback',
    lastUpdated: new Date().toISOString(),
    lastSuccessfulUpdate: new Date().toISOString(),
    language: 'en',
    translationEnabled: true,
    prices: [
      { symbol: 'AAPL', price: 308.91, change: -24.52, changePercent: -7.35, source: 'Yahoo Finance', delayed: true, available: true },
      { symbol: 'MSFT', price: 464.72, change: 13.62, changePercent: 3.02, source: 'Yahoo Finance', delayed: true, available: true },
      { symbol: 'NVDA', price: 200.75, change: 5.71, changePercent: 2.93, source: 'Yahoo Finance', delayed: true, available: true },
    ],
    items,
    providerCoverage: [],
    partialFailure: false,
    liveUpdatesAvailable: true,
    storedFallbackUsed: false,
  };
}

async function mockTechNews(page: Page, payload = mockPayload()) {
  await page.route('**/api/tech-news**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }));
}

// The page defaults to Arabic (ar) when no language preference is set (see
// LanguageProvider.tsx). Every test below that asserts on English copy calls
// this first; the dedicated RTL test and the hydration-request-count test
// deliberately do not (see their own comments for why).
async function useEnglish(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sfm_lang', 'en'));
}

test.describe('Tech Market News redesigned experience', () => {
  test('renders every visible story in one feed after the search and filter controls without duplicates', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    const search = page.locator('.tech-news-search input');
    const categories = page.getByRole('tablist', { name: 'News categories' });
    const advancedFilters = page.getByRole('button', { name: /Advanced filters/ });
    const feed = page.getByTestId('tech-news-unified-feed');
    await expect(search).toBeVisible();
    await expect(categories).toBeVisible();
    await expect(advancedFilters).toBeVisible();
    await expect(feed).toBeVisible();
    await expect(page.locator('.tech-news-card')).toHaveCount(12);
    await expect(feed.locator('.tech-news-card')).toHaveCount(12);
    await expect(page.getByText('Showing 12 of 13')).toBeVisible();
    await expect(feed.locator('.tech-news-card-lead')).toHaveCount(1);
    await expect(feed.locator('.tech-news-card-secondary')).toHaveCount(2);

    const order = await page.evaluate(() => {
      const searchNode = document.querySelector('.tech-news-quick-filters');
      const filtersNode = document.querySelector('.tech-news-advanced-filters-trigger');
      const feedNode = document.querySelector('[data-testid="tech-news-unified-feed"]');
      if (!searchNode || !filtersNode || !feedNode) return [];
      return [
        Boolean(searchNode.compareDocumentPosition(filtersNode) & Node.DOCUMENT_POSITION_FOLLOWING),
        Boolean(filtersNode.compareDocumentPosition(feedNode) & Node.DOCUMENT_POSITION_FOLLOWING),
      ];
    });
    expect(order).toEqual([true, true]);

    const ids = await feed.locator('[data-news-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-news-id')));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('promotes the first filtered result to lead and keeps the next two as secondary stories', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    await page.locator('.tech-news-search input').fill('Apple');
    const feed = page.getByTestId('tech-news-unified-feed');
    await expect(feed.locator('.tech-news-card-lead h2')).toHaveText('Apple reports record quarterly earnings');
    await expect(feed.locator('.tech-news-card-secondary')).toHaveCount(0);
    await expect(feed.locator('[data-news-id]')).toHaveCount(1);
  });

  test('never fabricates a ticker or price for an unresolved symbol, and shows the real price for a resolved one', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    const unresolvedCard = page.locator('.tech-news-card', { hasText: 'Broader technology sector roundup' });
    await expect(unresolvedCard.locator('.tech-news-symbol-chip')).toHaveCount(0);
    await expect(unresolvedCard.locator('.tech-news-stock-context')).toHaveCount(0);

    const resolvedCard = page.locator('.tech-news-card-lead');
    await expect(resolvedCard.locator('.tech-news-symbol-chip')).toHaveText('NVDA');
    await expect(resolvedCard.locator('.tech-news-stock-context')).toBeVisible();
  });

  test('renders a truthful branded fallback instead of a blank image block when a story has no photo', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    const leadMedia = page.locator('.tech-news-card-lead .tech-news-media-fallback');
    await expect(leadMedia).toBeVisible();
    await expect(leadMedia.locator('.tech-news-media-fallback-initials')).toHaveText('CN');
    await expect(page.locator('.tech-news-card-lead .tech-news-card-media.has-image')).toHaveCount(0);
  });

  test('shows the correct evidence state per verification status', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    const officialCard = page.locator('.tech-news-evidence-card', { has: page.locator('.tech-news-card-lead') });
    await expect(officialCard.locator('.tech-news-evidence.official')).toBeVisible();

    const conflictingCard = page.locator('.tech-news-evidence-card', { hasText: 'Analysts split on chip sector outlook' });
    await expect(conflictingCard.locator('.tech-news-evidence.conflicting')).toBeVisible();
  });

  test('toggles between translated and original text without losing content', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    // Locate by the ticker chip (stable) rather than the headline text --
    // the headline itself is what changes when the toggle is clicked, so
    // filtering on it would stop matching its own card after the click.
    const translatedCard = page.locator('.tech-news-card', { has: page.locator('.tech-news-symbol-chip', { hasText: 'AAPL' }) });
    await expect(translatedCard.locator('h2')).toHaveText('Apple reports record quarterly earnings');
    const toggle = translatedCard.getByRole('button', { name: 'Show original' });
    await toggle.click();
    await expect(translatedCard.locator('h2')).toHaveText('Apple annonce des résultats trimestriels records');
    await expect(translatedCard.getByRole('button', { name: 'Show translation' })).toBeVisible();
  });

  test('filters by category, shows active filter chips, and clears them', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    await page.getByRole('tab', { name: /Semiconductors/ }).click();
    await expect(page.locator('.tech-news-card', { hasText: 'Nvidia unveils next-generation AI accelerator' }).first()).toBeVisible();
    await expect(page.locator('.tech-news-card', { hasText: 'Microsoft expands Azure AI infrastructure' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Advanced filters' }).click();
    await page.locator('.tech-news-select-control', { has: page.locator('span', { hasText: 'Source' }) }).locator('select').selectOption('Yahoo');
    await page.keyboard.press('Escape');

    await expect(page.locator('.tech-news-active-filters button', { hasText: 'Yahoo' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await expect(page.locator('.tech-news-active-filters')).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('advanced filters panel is a focus-trapped, Escape-closable dialog that is not a permanent block', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    await expect(page.getByRole('dialog', { name: 'Advanced filters' })).toHaveCount(0);
    const trigger = page.getByRole('button', { name: 'Advanced filters' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Advanced filters' });
    await expect(dialog).toBeVisible();
    // Focus moves inside the dialog on open (AppModal focuses its first
    // focusable element, the close button) -- assert generically rather
    // than assuming which control that is.
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('load more preserves the exact filtered count and eventually shows a truthful all-loaded state', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');

    const loadMore = page.getByRole('button', { name: 'Load more' });
    await expect(loadMore).toBeVisible();
    await expect(page.getByTestId('tech-news-unified-feed').locator('[data-news-id]')).toHaveCount(12);
    await loadMore.click();
    await expect(page.getByTestId('tech-news-unified-feed').locator('[data-news-id]')).toHaveCount(13);
    await expect(page.getByText('All available news are shown')).toBeVisible();
  });

  test('aligns the desktop side panel with the lead and moves all side content below the complete feed on mobile', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/tech-news');

    await expect(page.getByTestId('tech-news-unified-feed')).toBeVisible();
    await expect(page.locator('.tech-news-side-panel')).toBeVisible();
    // Compare the natural grid positions rather than viewport coordinates:
    // the side panel is sticky, so its bounding box may already be pinned below
    // the global header when a browser restores scroll during navigation.
    const desktopTops = await page.evaluate(() => {
      const feedNode = document.querySelector<HTMLElement>('[data-testid="tech-news-unified-feed"]');
      const sideNode = document.querySelector<HTMLElement>('.tech-news-side-panel');
      return [feedNode?.offsetTop ?? null, sideNode?.offsetTop ?? null];
    });
    expect(desktopTops[0]).not.toBeNull();
    expect(desktopTops[1]).not.toBeNull();
    expect(Math.abs((desktopTops[0] ?? 0) - (desktopTops[1] ?? 0))).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileOrder = await page.evaluate(() => {
      const searchNode = document.querySelector('.tech-news-quick-filters');
      const filtersNode = document.querySelector('.tech-news-advanced-filters-trigger');
      const feedNode = document.querySelector('[data-testid="tech-news-unified-feed"]');
      const loadMoreNode = document.querySelector('.tech-news-load-more-wrap');
      const sideNode = document.querySelector('.tech-news-side-panel');
      if (!searchNode || !filtersNode || !feedNode || !loadMoreNode || !sideNode) return [];
      return [searchNode, filtersNode, feedNode, loadMoreNode, sideNode].map((node, index, nodes) => (
        index === nodes.length - 1 || Boolean(node.compareDocumentPosition(nodes[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)
      ));
    });
    expect(mobileOrder).toEqual([true, true, true, true, true]);
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('shows a truthful empty state and provider-error state with retry', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page, { ...mockPayload(), items: [] });
    await page.goto('/tech-news');
    await expect(page.getByText('No technology news right now')).toBeVisible();

    await page.route('**/api/tech-news**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, reason: 'provider_temporarily_unavailable' }),
    }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('renders correctly in Arabic RTL with no horizontal overflow', async ({ page }) => {
    await mockTechNews(page);
    await page.addInitScript(() => localStorage.setItem('sfm_lang', 'ar'));
    await page.goto('/tech-news');

    await expect(page.locator('[data-news-page-shell][dir="rtl"]')).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test('does not duplicate the source disclaimer', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');
    await expect(page.getByText('News is aggregated from external financial sources. Always review the original source.')).toHaveCount(1);
  });

  test('does not refetch on hydration when the language matches the app default', async ({ page }) => {
    // Deliberately does not force sfm_lang here: the app's LanguageProvider
    // (src/components/LanguageProvider.tsx) always mounts with the 'ar'
    // default first and corrects to the stored preference in a post-hydration
    // effect, by design (see its comment on deferUntilStreamSettled) -- so a
    // request-count assertion is only meaningful when the stored language
    // already matches that default, i.e. no correction/second fetch is
    // triggered. That correction is a deliberate, app-wide mechanism, not
    // something this page's own data-fetching effect should be blamed for.
    await mockTechNews(page);
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/tech-news')) requests.push(request.url());
    });
    await page.goto('/tech-news');
    await expect(page.getByTestId('tech-news-unified-feed')).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test('respects reduced motion by pausing the ticker animation', async ({ page }) => {
    await mockTechNews(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tech-news');
    const track = page.locator('.tech-ticker-track').first();
    await expect(track).toHaveCSS('animation-name', 'none');
  });

  test('never renders the Global Markets Hub country/exchange strips -- that experience lives only on /global-markets', async ({ page }) => {
    await useEnglish(page);
    await mockTechNews(page);
    await page.goto('/tech-news');
    await expect(page.locator('.tech-news-featured')).toBeVisible();

    await expect(page.locator('.gm-strip')).toHaveCount(0);
    await expect(page.locator('.gm-strip-heading-label')).toHaveCount(0);
    for (const label of ['China — Shanghai Stock Exchange', 'Japan — Tokyo Stock Exchange', 'Forex', 'Global Indices']) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
  });
});
