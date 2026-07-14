import { expect, test, type Page } from '@playwright/test';
import { createReadStream, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';

const publicRoot = path.join(process.cwd(), 'src', 'trader-app', 'public');
const semanticTokensCss = [
  path.join(process.cwd(), 'src', 'styles', 'tokens.css'),
  path.join(process.cwd(), 'src', 'styles', 'themes.css'),
].map(file => readFileSync(file, 'utf8')).join('\n');
let staticServer: Server;
let terminalPath = '';

const provider = {
  configured: true,
  status: 'connected',
  active: 'Polygon',
  provider: 'Polygon',
  lastUpdated: '2026-07-12T09:42:00.000Z',
};

const recommendations = [
  recommendationFixture({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    price: 232,
    previousClose: 228,
    action: 'buy',
    confidence: 94,
    targetPrice: 250,
    stopLoss: 220,
    support: 224,
    resistance: 244,
    volume: 78_400_000,
    marketCap: 3_510_000_000_000,
    history: [221, 223, 222, 226, 228, 227, 230, 232],
  }),
  recommendationFixture({
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Technology',
    price: 141,
    previousClose: 136,
    action: 'buy',
    confidence: 91,
    targetPrice: 155,
    stopLoss: 132,
    support: 135,
    resistance: 149,
    volume: 61_200_000,
    marketCap: 3_430_000_000_000,
    history: [128, 130, 129, 133, 135, 137, 139, 141],
  }),
  recommendationFixture({
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    price: 470,
    previousClose: 466,
    action: 'buy',
    confidence: 86,
    targetPrice: 500,
    stopLoss: 450,
    support: 458,
    resistance: 488,
    volume: 22_800_000,
    marketCap: 3_490_000_000_000,
    history: [448, 451, 455, 457, 462, 465, 468, 470],
  }),
  recommendationFixture({
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    sector: 'Consumer Cyclical',
    price: 250,
    previousClose: 262,
    action: 'sell',
    confidence: 89,
    targetPrice: 215,
    stopLoss: 270,
    support: 228,
    resistance: 266,
    volume: 95_600_000,
    marketCap: 797_000_000_000,
    history: [273, 270, 268, 264, 262, 258, 254, 250],
  }),
  recommendationFixture({
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    price: 208,
    previousClose: 212,
    action: 'sell',
    confidence: 83,
    targetPrice: 190,
    stopLoss: 218,
    support: 198,
    resistance: 216,
    volume: 14_300_000,
    marketCap: 585_000_000_000,
    history: [218, 216, 215, 214, 212, 211, 209, 208],
  }),
  recommendationFixture({
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Communication Services',
    price: 196,
    previousClose: 196,
    action: 'watch',
    confidence: 72,
    targetPrice: 210,
    stopLoss: 187,
    support: 190,
    resistance: 205,
    volume: 18_100_000,
    marketCap: 2_390_000_000_000,
    history: [192, 194, 193, 195, 196, 195, 196, 196],
  }),
];

const newsItems = [
  {
    id: 'news-aapl-1',
    title: 'Apple services growth lifts the technology sector',
    summary: 'Provider coverage highlights resilient services demand and improving margins.',
    source: 'Reuters',
    url: 'https://example.test/news/apple-services',
    publishedAt: '2026-07-12T08:35:00.000Z',
    symbol: 'AAPL',
    symbols: ['AAPL', 'MSFT'],
    sentiment: 'positive',
  },
  {
    id: 'news-tsla-1',
    title: 'EV deliveries trail the latest consensus range',
    summary: 'Delivery expectations moved lower as price competition remained elevated.',
    source: 'Bloomberg',
    url: 'https://example.test/news/ev-deliveries',
    publishedAt: '2026-07-12T07:20:00.000Z',
    symbol: 'TSLA',
    symbols: ['TSLA'],
    sentiment: 'negative',
  },
  {
    id: 'news-macro-1',
    title: 'US futures steady before the opening bell',
    summary: 'Technology strength offsets softer financial shares in pre-market trading.',
    source: 'MarketWire',
    url: 'https://example.test/news/us-futures',
    publishedAt: '2026-07-12T06:40:00.000Z',
    symbols: ['AAPL', 'NVDA', 'JPM'],
    sentiment: 'neutral',
  },
];

test.describe('SFM Trader premium workspace smoke coverage', () => {
  test.beforeAll(async () => {
    staticServer = await createStaticTraderServer();
    const address = staticServer.address();
    if (!address || typeof address === 'string') throw new Error('Static Trader server did not expose a port.');
    terminalPath = `http://127.0.0.1:${address.port}/thesfm-trader-own/app/index.html`;
  });

  test.afterAll(async () => {
    await new Promise<void>(resolve => staticServer.close(() => resolve()));
  });

  test('command deck has terminal hierarchy and stock clicks use a focus-safe drawer', async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const scope = window as Window & { __sfmPrintCalls?: number };
      scope.__sfmPrintCalls = 0;
      window.print = () => { scope.__sfmPrintCalls = (scope.__sfmPrintCalls || 0) + 1; };
    });
    await configureTerminal(page, 'en', 'light');
    await mockTraderApi(page);
    await openDashboard(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const deck = page.locator('.trader-command-deck');
    await expect(deck).toBeVisible();
    await expect(deck.getByRole('heading', { name: 'Market Command Center' })).toBeVisible();

    const concepts: Array<[string, string]> = [
      ['.command-deck-status', 'Market status'],
      ['.command-deck-opportunities', 'Top opportunities'],
      ['.command-deck-risks', 'Top risks'],
      ['.command-deck-ai', 'AI picks'],
      ['.command-deck-watchlist', 'Watchlist'],
      ['.command-deck-sentiment', 'Market sentiment'],
      ['.command-deck-provider', 'Provider summary'],
      ['.command-deck-sessions', 'Market sessions'],
      ['.command-deck-actions', 'Quick actions'],
    ];
    for (const [selector, label] of concepts) {
      const region = deck.locator(selector);
      await expect(region, `${label} command region`).toBeVisible();
      await expect(region.locator('.command-deck-head'), `${label} hierarchy label`).toContainText(label);
      await expect(region).toHaveAttribute('aria-label', label);
      await expect(region.getByRole('heading', { name: label, level: 3 })).toBeVisible();
    }

    const hierarchy = await deck.locator('.command-deck-layout').evaluate(element => ({
      display: getComputedStyle(element).display,
      areas: Array.from(element.querySelectorAll<HTMLElement>(':scope > .command-deck-card'))
        .map(card => getComputedStyle(card).gridArea),
    }));
    expect(hierarchy.display).toBe('grid');
    expect(new Set(hierarchy.areas.filter(area => area && area !== 'auto')).size).toBeGreaterThanOrEqual(9);

    const stock = deck.locator('.command-deck-opportunities [data-symbol-details="AAPL"]');
    await expect(stock).toBeVisible();
    const urlBeforeClick = page.url();
    await stock.focus();
    await stock.click();

    const drawer = page.getByRole('dialog', { name: /AAPL/ });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer.getByRole('tablist', { name: 'Symbol detail sections' })).toBeVisible();
    await expect(drawer.getByRole('tab')).toHaveCount(7);
    await expect(page.locator('#app-shell')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('#app-shell').evaluate(element => (element as HTMLElement).inert)).toBe(true);
    const controlledPanelsExist = await drawer.getByRole('tab').evaluateAll(tabs => tabs.every(tab => {
      const target = tab.getAttribute('aria-controls');
      return Boolean(target && document.getElementById(target));
    }));
    expect(controlledPanelsExist).toBe(true);
    const chartPoint = drawer.locator('.detail-chart-point').first();
    await chartPoint.focus();
    await expect(chartPoint).toBeFocused();
    await expect(chartPoint.locator('+ .detail-chart-value')).toHaveCSS('opacity', '1');
    expect(page.url()).toBe(urlBeforeClick);

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    expect(page.url()).toBe(urlBeforeClick);
    await expect(stock).toBeFocused();
    await expect(page.locator('#app-shell')).not.toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('#app-shell').evaluate(element => (element as HTMLElement).inert)).toBe(false);

    const compare = deck.locator('.command-deck-actions [data-drawer-compare="AAPL"]');
    await compare.click();
    await expect(page.getByRole('dialog', { name: /AAPL/ }).locator('.drawer-compare-tray')).toContainText('AAPL');
    await page.keyboard.press('Escape');

    const exportPdf = deck.locator('.command-deck-actions [data-drawer-export="AAPL"]');
    await exportPdf.click();
    await expect(page.getByRole('dialog', { name: /AAPL/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as Window & { __sfmPrintCalls?: number }).__sfmPrintCalls)).toBe(1);
    await page.keyboard.press('Escape');
    expect(pageErrors).toEqual([]);
  });

  test('analysis, sessions, and heatmap behave as interactive terminal views', async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await configureTerminal(page, 'en', 'light');
    await mockTraderApi(page);
    await openDashboard(page);

    const analysisTab = dashboardTab(page, 'analysis');
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/(?:\?|&)view=analysis(?:&|$)/);
    const analysis = page.locator('.analysis-terminal');
    await expect(analysis).toBeVisible();
    await expect(analysis).toContainText('AAPL');
    for (const metric of ['AI confidence', 'Strategy agreement', 'Signals', 'Trend', 'Risk', 'Support', 'Resistance', 'Momentum', 'Market breadth', 'Opportunity score']) {
      await expect(analysis.locator('.analysis-metric').filter({ hasText: metric }), `${metric} analysis metric`).toBeVisible();
    }
    const analysisDataState = analysis.locator('.analysis-provider-state');
    await expect(analysisDataState.locator('span')).toHaveText('Analysis data status');
    await expect(analysisDataState.locator('strong')).toHaveText('Available');
    await expect(analysisDataState.locator('small')).toHaveText('Market data');

    const sessionsTab = dashboardTab(page, 'sessions');
    await sessionsTab.click();
    await expect(sessionsTab).toHaveAttribute('aria-selected', 'true');
    const timeline = page.locator('.market-session-terminal');
    await expect(timeline).toBeVisible();
    await expect(timeline.locator('.session-axis-tick')).toHaveCount(9);
    expect(await timeline.locator('.session-row').count()).toBeGreaterThan(8);
    expect(await timeline.locator('.session-bar [role="tooltip"]').count()).toBeGreaterThan(8);
    await expect(timeline.locator('[data-session-state="open"]')).not.toHaveCount(0);
    const sessionStates = await timeline.locator('[data-session-state]').evaluateAll(rows => rows.map(row => row.getAttribute('data-session-state')));
    expect(sessionStates.every(state => ['open', 'closed', 'upcoming'].includes(state || ''))).toBe(true);
    const sessionBar = timeline.locator('.session-bar').first();
    await sessionBar.focus();
    await expect(sessionBar.locator('[role="tooltip"]')).toHaveCSS('visibility', 'visible');
    await page.keyboard.press('Escape');
    await expect(sessionBar).toHaveClass(/tooltip-dismissed/);
    await expect(sessionBar.locator('[role="tooltip"]')).toHaveCSS('visibility', 'hidden');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await sessionBar.hover();
    await expect(sessionBar.locator('[role="tooltip"]')).toHaveCSS('visibility', 'visible');
    await page.keyboard.press('Escape');
    await expect(sessionBar).toHaveClass(/tooltip-dismissed/);
    await expect(sessionBar.locator('[role="tooltip"]')).toHaveCSS('visibility', 'hidden');

    const heatmapTab = dashboardTab(page, 'heatmap');
    await heatmapTab.click();
    await expect(heatmapTab).toHaveAttribute('aria-selected', 'true');
    const heatmap = page.locator('.heatmap-workspace');
    await expect(heatmap).toBeVisible();
    await expect(heatmap.locator('[data-heatmap-group="Technology"]')).toBeVisible();
    expect(await heatmap.locator('.heatmap-tile').count()).toBeGreaterThan(5);
    expect(await heatmap.locator('.heatmap-tile.size-lg').count()).toBeGreaterThan(0);
    await expect(heatmap.locator('.heatmap-tile [role="tooltip"]').first()).toBeAttached();
    const lightPositiveTile = heatmap.locator('.heatmap-tile.tone-positive').first();
    const lightTileVisual = await lightPositiveTile.evaluate(tile => {
      const selectors = ['.heatmap-tile-head strong', '.heatmap-tile-head small', '.heatmap-tile-meta em', '.heatmap-tile-meta b', '.heatmap-tile-performance'];
      const performance = tile.querySelector<HTMLElement>('.heatmap-tile-performance');
      const semanticColor = (value: string) => {
        const probe = document.createElement('span');
        probe.style.position = 'fixed';
        probe.style.opacity = '0';
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        backgroundColor: getComputedStyle(tile).backgroundColor,
        backgroundImage: getComputedStyle(tile).backgroundImage,
        semanticSuccess: semanticColor('var(--success)'),
        semanticHeroForeground: semanticColor('var(--hero-foreground)'),
        textColors: selectors.map(selector => getComputedStyle(tile.querySelector(selector) as Element).color),
        performanceBackground: performance ? getComputedStyle(performance).backgroundColor : '',
      };
    });
    expect(lightTileVisual.backgroundImage).toBe('none');
    expect(lightTileVisual.backgroundColor).toBe(lightTileVisual.semanticSuccess);
    expect(lightTileVisual.textColors.every(color => color === lightTileVisual.semanticHeroForeground)).toBe(true);
    expect(lightTileVisual.performanceBackground).toBe('rgba(0, 0, 0, 0)');

    const search = heatmap.locator('input[name="heatmapSearch"]');
    await search.fill('Apple');
    await search.press('Enter');
    await expect(heatmap.locator('.heatmap-tile')).toHaveCount(1);
    await expect(heatmap.locator('.heatmap-tile')).toContainText('AAPL');

    await heatmap.locator('input[name="heatmapSearch"]').fill('');
    await heatmap.locator('input[name="heatmapSearch"]').press('Enter');
    await heatmap.locator('[data-heatmap-tone="negative"]').click();
    expect(await heatmap.locator('.heatmap-tile.negative').count()).toBeGreaterThan(0);
    await expect(heatmap.locator('.heatmap-tile.positive')).toHaveCount(0);

    await heatmap.locator('[data-heatmap-tone="all"]').click();
    await heatmap.locator('[data-heatmap-sector]').selectOption('Technology');
    await expect(heatmap.locator('[data-heatmap-group]')).toHaveCount(1);
    await expect(heatmap.locator('[data-heatmap-group="Technology"]')).toBeVisible();
    await page.locator('[data-language="ar"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-heatmap-sector]')).toHaveValue('Technology');
    await expect(page.locator('[data-heatmap-group="Technology"]')).toBeVisible();
    await page.locator('[data-language="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await heatmap.locator('[data-heatmap-zoom="in"]').click();
    await expect(heatmap).toHaveAttribute('data-zoom-level', '1.1');
    const selectedTile = heatmap.locator('[data-symbol-details="AAPL"]');
    const heatmapUrl = page.url();
    await selectedTile.click();
    await expect(selectedTile).toHaveAttribute('aria-pressed', 'true');
    await expect(selectedTile).toHaveClass(/is-selected/);
    await expect(page.getByRole('dialog', { name: /AAPL/ })).toBeVisible();
    expect(page.url()).toBe(heatmapUrl);
    await page.keyboard.press('Escape');
    expect(pageErrors).toEqual([]);
  });

  test('recommendation and mover cards expose the shared terminal information language', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await configureTerminal(page, 'en', 'dark');
    await mockTraderApi(page);
    await page.goto(`${terminalPath}?route=recommendations&view=data`, { waitUntil: 'domcontentloaded' });

    const recommendationCard = page.locator('.rec-card.trader-stock-card').first();
    await expect(recommendationCard).toBeVisible();
    await expect(recommendationCard.locator('.stock-card-primary')).toContainText('AAPL');
    await expect(recommendationCard.locator('.stock-card-price')).toContainText('232');
    await expect(recommendationCard.locator('.stock-card-chart')).toBeVisible();
    await expect(recommendationCard.locator('.stock-card-chart [aria-live]')).toHaveCount(0);
    for (const label of ['Volume', 'Risk', 'Trend', 'Provider', 'Freshness', 'Watch state']) {
      await expect(recommendationCard.locator('.stock-meta-item').filter({ hasText: label })).toBeVisible();
    }
    await expect(recommendationCard).toContainText('AI confidence');
    await expect(recommendationCard).toContainText('Buy');

    await page.goto(`${terminalPath}?route=dashboard&view=analysis`, { waitUntil: 'domcontentloaded' });
    const moverCard = page.locator('.asset-card.trader-stock-card').first();
    await expect(moverCard).toBeVisible();
    await expect(moverCard.locator('.stock-card-meta')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('market map exposes grouped regions, legend, and the active market', async ({ page }) => {
    await configureTerminal(page, 'en', 'light');
    await mockTraderApi(page);
    await page.goto(`${terminalPath}?route=markets`, { waitUntil: 'domcontentloaded' });

    const map = page.locator('.market-map-workspace');
    await expect(map).toBeVisible();
    await expect(map.getByRole('heading', { name: 'Market map workspace' })).toBeVisible();
    await expect(map.locator('.market-map-legend')).toContainText('Active market');
    await expect(map.locator('.market-map-legend')).toContainText('Featured market');
    await expect(map.locator('.market-map-legend')).toContainText('Market group');

    const expectedRegions = ['gulf', 'global', 'cross-asset', 'sectors'];
    await expect(map.locator('[data-market-map-region]')).toHaveCount(expectedRegions.length);
    for (const region of expectedRegions) {
      const group = map.locator(`[data-market-map-region="${region}"]`);
      await expect(group, `${region} market-map group`).toBeVisible();
      expect(await group.locator('[data-market-map-id]').count()).toBeGreaterThan(0);
    }
    await expect(map.locator('[data-market-map-id="us-stocks"]')).toHaveAttribute('aria-current', 'true');
    await expect(map.locator('[data-market-map-id="us-stocks"]')).toHaveClass(/is-active/);
    expect(await map.locator('.market-map-icon').count()).toBe(await map.locator('[data-market-map-id]').count());
  });

  const responsiveModes = [
    { language: 'en' as const, theme: 'light' as const, direction: 'ltr' },
    { language: 'ar' as const, theme: 'dark' as const, direction: 'rtl' },
  ];
  const responsiveViewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const mode of responsiveModes) {
    for (const viewport of responsiveViewports) {
      test(`${mode.language.toUpperCase()} ${mode.theme} has no document overflow at ${viewport.name}`, async ({ page }) => {
        test.setTimeout(180_000);
        await configureTerminal(page, mode.language, mode.theme);
        await mockTraderApi(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openDashboard(page);
        await expect(page.locator('html')).toHaveAttribute('lang', mode.language);
        await expect(page.locator('html')).toHaveAttribute('dir', mode.direction);
        await expect(page.locator('html')).toHaveAttribute('data-theme', mode.theme);
        await expectNoDocumentOverflow(page, `${mode.language} ${viewport.name} overview`);

        await dashboardTab(page, 'sessions').click();
        await expect(page.locator('.market-session-terminal')).toBeVisible();
        await expectNoDocumentOverflow(page, `${mode.language} ${viewport.name} sessions`);

        await dashboardTab(page, 'heatmap').click();
        await expect(page.locator('.heatmap-workspace')).toBeVisible();
        await expectNoDocumentOverflow(page, `${mode.language} ${viewport.name} heatmap`);

        if (viewport.name === 'mobile') {
          const firstTile = page.locator('.heatmap-tile').first();
          await firstTile.click();
          const drawer = page.getByRole('dialog');
          await expect(drawer).toBeVisible();
          const drawerBounds = await drawer.evaluate(element => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, viewport: window.innerWidth };
          });
          expect(drawerBounds.left, `${mode.language} mobile drawer left edge`).toBeGreaterThanOrEqual(-1);
          expect(drawerBounds.right, `${mode.language} mobile drawer right edge`).toBeLessThanOrEqual(drawerBounds.viewport + 1);
          await expectNoDocumentOverflow(page, `${mode.language} mobile drawer`);
          await page.keyboard.press('Escape');
        }

        await page.goto(`${terminalPath}?route=markets`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.market-map-workspace')).toBeVisible();
        await expectNoDocumentOverflow(page, `${mode.language} ${viewport.name} market map`);

        if (mode.language === 'ar') {
          const labels = await page.locator('.market-map-region-head h3, .market-map-copy strong').evaluateAll(nodes => nodes.map(node => {
            const element = node as HTMLElement;
            return {
              text: element.innerText.trim(),
              visible: element.getClientRects().length > 0,
              clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
            };
          }));
          expect(labels.every(label => label.visible && label.text.length > 0 && !label.clipped), `Arabic labels at ${viewport.name}`).toBe(true);
        }
      });
    }
  }
});

function dashboardTab(page: Page, view: string) {
  return page.locator(`[data-workspace-scope="dashboard"][data-workspace-tab="${view}"]`);
}

async function openDashboard(page: Page) {
  await page.goto(`${terminalPath}?route=dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-workspace-tablist="dashboard"]')).toBeVisible();
  await expect(page.locator('.command-deck-opportunities [data-symbol-details="AAPL"]')).toBeVisible();
}

async function configureTerminal(page: Page, language: 'ar' | 'en', theme: 'light' | 'dark') {
  await page.addInitScript(({ language: nextLanguage, theme: nextTheme }) => {
    localStorage.setItem('sfm_lang', nextLanguage);
    localStorage.setItem('the-sfm-theme', nextTheme);
    localStorage.setItem('sfmTraderTheme', nextTheme);
    localStorage.setItem('sfmTraderWatchlist:v3', JSON.stringify(['AAPL', 'MSFT']));
    localStorage.setItem('sfmTraderSettings:v1', JSON.stringify({
      lang: nextLanguage,
      language: nextLanguage,
      theme: nextTheme,
      defaultMarket: 'us-stocks',
      risk: 'balanced',
      quickTickerVisible: true,
    }));
  }, { language, theme });
}

async function mockTraderApi(page: Page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.toLowerCase();
    let body: Record<string, unknown>;

    if (pathname.endsWith('/recommendations')) {
      body = { success: true, status: 'available', recommendations, dataProvider: provider };
    } else if (pathname.endsWith('/market/signals')) {
      body = {
        success: true,
        status: 'available',
        signals: [],
        history: [
          { symbol: 'AAPL', oldAction: 'watch', newAction: 'buy', newConfidence: 94, createdAt: '2026-07-12T09:30:00.000Z' },
          { symbol: 'TSLA', oldAction: 'watch', newAction: 'sell', newConfidence: 89, createdAt: '2026-07-12T09:35:00.000Z' },
        ],
        dataProvider: provider,
      };
    } else if (pathname.endsWith('/market/signal-alerts')) {
      body = {
        success: true,
        status: 'available',
        notifications: [
          { id: 'risk-tsla', symbol: 'TSLA', title: 'Downside momentum', message: 'TSLA crossed below short-term support.', event: 'signal_change' },
          { id: 'risk-jpm', symbol: 'JPM', title: 'Financial-sector risk', message: 'Breadth weakened across large-cap banks.', event: 'risk_alert' },
        ],
        dataProvider: provider,
      };
    } else if (pathname.endsWith('/market-news')) {
      body = { success: true, status: 'available', items: newsItems, dataProvider: provider };
    } else if (pathname.endsWith('/trader/provider-status')) {
      body = {
        success: true,
        status: 'available',
        normalizedStatus: { status: 'available' },
        dataProvider: provider,
        summary: { loadedSymbols: recommendations.length, failedSymbols: 0, cachedSymbols: 0 },
        diagnostics: { status: 'healthy', latencyMs: 86, lastUpdated: provider.lastUpdated },
      };
    } else if (pathname.endsWith('/markets')) {
      body = {
        success: true,
        status: 'available',
        groups: [
          { id: 'us-stocks', totalSymbols: 5_200 },
          { id: 'kuwait', totalSymbols: 162 },
          { id: 'saudi', totalSymbols: 318 },
        ],
        markets: ['us-stocks', 'kuwait', 'saudi'],
        dataProvider: provider,
      };
    } else if (pathname.endsWith('/market/history')) {
      const symbol = (url.searchParams.get('symbol') || 'AAPL').toUpperCase();
      const asset = recommendations.find(item => item.symbol === symbol) || recommendations[0];
      body = { success: true, status: 'available', symbol, history: asset.history, candles: asset.candles, dataProvider: provider };
    } else if (pathname.endsWith('/followed-trades')) {
      body = { success: true, status: 'available', followedTrades: [], dataProvider: provider };
    } else {
      body = { success: true, status: 'available', items: [], data: [], results: [], dataProvider: provider };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(body),
    });
  });
}

async function expectNoDocumentOverflow(page: Page, context: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentWidth, `${context}: document width`).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.bodyWidth, `${context}: body width`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

function recommendationFixture(input: {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previousClose: number;
  action: 'buy' | 'sell' | 'watch';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  support: number;
  resistance: number;
  volume: number;
  marketCap: number;
  history: number[];
}) {
  const changePercent = Number((((input.price - input.previousClose) / input.previousClose) * 100).toFixed(4));
  const candles = input.history.map((close, index) => ({
    date: new Date(Date.UTC(2026, 6, 3 + index)).toISOString(),
    open: close - (input.action === 'sell' ? -1 : 1),
    high: close + 2,
    low: close - 2,
    close,
    volume: Math.round(input.volume * (0.78 + index * 0.025)),
  }));
  return {
    ...input,
    displaySymbol: input.symbol,
    assetType: 'stock',
    exchange: input.symbol === 'JPM' ? 'NYSE' : 'NASDAQ',
    market: 'US',
    country: 'US',
    currency: 'USD',
    currentPrice: input.price,
    changePercent,
    available: true,
    tradeable: true,
    technicalAvailable: true,
    signalAvailable: true,
    finalRecommendationStatus: input.action,
    signal: input.action,
    recommendation: input.action,
    aiConfidence: input.confidence,
    dataQuality: 'live',
    risk: 'medium',
    trend: input.action === 'buy' ? 'Bullish' : input.action === 'sell' ? 'Bearish' : 'Sideways',
    momentum: input.action === 'buy' ? 'Strong positive' : input.action === 'sell' ? 'Weakening' : 'Balanced',
    marketBreadth: input.action === 'buy' ? 'Advancing' : input.action === 'sell' ? 'Declining' : 'Mixed',
    opportunityScore: input.confidence,
    provider: provider.active,
    lastUpdated: provider.lastUpdated,
    strategyCount: 5,
    strategyAgreement: {
      agreementPct: input.confidence - 4,
      buyPct: input.action === 'buy' ? 80 : 10,
      sellPct: input.action === 'sell' ? 78 : 8,
      watchPct: input.action === 'watch' ? 70 : 12,
      label: 'Multi-strategy consensus',
    },
    signals: [
      { label: 'EMA alignment', value: input.action },
      { label: 'RSI regime', value: input.action === 'watch' ? 'neutral' : input.action },
      { label: 'Volume confirmation', value: 'confirmed' },
    ],
    rsi: input.action === 'buy' ? 61 : input.action === 'sell' ? 39 : 50,
    ema20: input.price * 0.98,
    ema50: input.price * 0.95,
    ema200: input.price * 0.88,
    sma20: input.price * 0.985,
    sma50: input.price * 0.955,
    macd: input.action === 'buy' ? 2.4 : input.action === 'sell' ? -1.8 : 0.1,
    macdSignal: input.action === 'buy' ? 1.6 : input.action === 'sell' ? -1.1 : 0.1,
    atr: Math.max(1, input.price * 0.025),
    newsSentimentSummary: {
      status: 'available',
      articleCount: 3,
      summary: input.action === 'buy' ? 'Constructive provider sentiment' : input.action === 'sell' ? 'Cautious provider sentiment' : 'Balanced provider sentiment',
    },
    history: candles,
    candles,
  };
}

function createStaticTraderServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/semantic-tokens.css' || url.pathname.endsWith('/semantic-tokens.css')) {
      response.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' });
      response.end(semanticTokensCss);
      return;
    }
    const resolved = staticPathFor(url.pathname);
    if (!resolved) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const extension = path.extname(resolved).toLowerCase();
    response.writeHead(200, { 'content-type': mimeType(extension), 'cache-control': 'no-store' });
    createReadStream(resolved).on('error', () => response.end('Not found')).pipe(response);
  });
  return new Promise<Server>(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function staticPathFor(urlPath: string) {
  let filePath = decodeURIComponent(urlPath);
  if (filePath.startsWith('/thesfm-trader-own/app/')) filePath = filePath.slice('/thesfm-trader-own/app/'.length);
  else filePath = filePath.replace(/^\/+/, '');
  if (!filePath || filePath.endsWith('/')) filePath = `${filePath}index.html`;
  const resolved = path.resolve(publicRoot, filePath);
  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  return resolved;
}

function mimeType(extension: string) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }[extension] || 'application/octet-stream';
}
