import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const screenshotDir = path.join(process.cwd(), '.playwright-mcp', 'trader-full-universe');

type UniverseRow = {
  symbol?: string;
  displaySymbol?: string;
  providerSymbol?: string;
  providerSymbolUsed?: string;
  name?: string;
  companyName?: string;
  selectedMarket?: string | null;
  selectedSector?: string | null;
  exchange?: string;
  exchangeCode?: string;
  market?: string;
  country?: string;
  currency?: string;
  assetType?: string;
  sector?: string;
  industry?: string;
  marketIds?: string[];
};

type UniversePayload = {
  recommendations?: UniverseRow[];
  excludedByMarket?: UniverseRow[];
  marketUniverse?: {
    total?: number;
    universeTotal?: number;
    page?: number;
    pageSize?: number;
    returned?: number;
    symbols?: UniverseRow[];
  };
  symbolDiscovery?: {
    totalMarketSymbols?: number;
    totalFilteredSymbols?: number;
    loadedPageSymbols?: number;
  };
  coverage?: {
    totalDiscovered?: number;
    totalFilteredSymbols?: number;
    loaded?: number;
    availableWithPrice?: number;
    unavailablePrice?: number;
    failed?: number;
  };
};

type SelectionCase = {
  id: string;
  name: string;
  validate: (row: UniverseRow) => boolean;
};

const stockTypes = new Set(['stock', 'equity']);
const forbiddenAssetTypes = new Set(['crypto', 'forex', 'commodity', 'fund', 'index']);

const selections: SelectionCase[] = [
  { id: 'kuwait', name: 'Kuwait Market', validate: row => isStrictMarket(row, 'kuwait', 'KWD', /\.KW$/i, /KUWAIT|BOURSA|KSE|XKUW/i) },
  { id: 'saudi', name: 'Saudi Market', validate: row => isStrictMarket(row, 'saudi', 'SAR', /\.(SR|SA)$/i, /SAUDI|TADAWUL|XSAU/i) },
  { id: 'uae', name: 'UAE Market', validate: row => isStrictMarket(row, 'uae', 'AED', /\.(AE|DU|AD)$/i, /UAE|DUBAI|ABU DHABI|ADX|DFM|XADS|XDFM/i) },
  { id: 'qatar', name: 'Qatar Market', validate: row => isStrictMarket(row, 'qatar', 'QAR', /\.QA$/i, /QATAR|QSE|DSM|DSMD/i) },
  { id: 'bahrain', name: 'Bahrain Market', validate: row => isStrictMarket(row, 'bahrain', 'BHD', /\.BH$/i, /BAHRAIN|BHB|XBAH/i) },
  { id: 'oman', name: 'Oman Market', validate: row => isStrictMarket(row, 'oman', 'OMR', /\.OM$/i, /OMAN|MUSCAT|MSX|XMUS/i) },
  { id: 'us-stocks', name: 'US Stocks', validate: row => isStock(row) && upper(row.currency) === 'USD' && !isForbiddenAsset(row) },
  { id: 'technology', name: 'Technology', validate: row => isStock(row) && !isForbiddenAsset(row) && matchesText(row, /TECH|SOFTWARE|SEMICONDUCTOR|INFORMATION TECHNOLOGY|ELECTRONIC|COMPUTER|INTERNET|CLOUD|CYBER|AI|ARTIFICIAL INTELLIGENCE/i) },
  { id: 'semiconductors', name: 'Semiconductors', validate: row => isStock(row) && !isForbiddenAsset(row) && matchesText(row, /SEMICONDUCTOR|ELECTRONIC COMPONENT|CHIP|INTEGRATED CIRCUIT/i) },
  { id: 'banking', name: 'Banking', validate: row => isStock(row) && !isForbiddenAsset(row) && matchesText(row, /BANK|FINANCIAL|CAPITAL MARKETS|CREDIT|BROKER|ASSET MANAGEMENT|INSURANCE/i) },
  { id: 'energy', name: 'Energy', validate: row => isStock(row) && !isForbiddenAsset(row) && matchesText(row, /ENERGY|OIL|GAS|PETROLEUM|DRILLING|REFIN|PIPELINE|HYDROCARBON/i) },
  { id: 'healthcare', name: 'Healthcare', validate: row => isStock(row) && !isForbiddenAsset(row) && matchesText(row, /HEALTH|PHARMA|BIOTECH|DRUG|MEDICAL|THERAPEUTIC|DIAGNOSTIC|LIFE SCIENCE/i) },
  { id: 'crypto', name: 'Crypto', validate: row => assetType(row) === 'crypto' },
  { id: 'forex', name: 'Forex', validate: row => assetType(row) === 'forex' },
  { id: 'commodities', name: 'Commodities', validate: row => assetType(row) === 'commodity' },
  { id: 'etfs', name: 'ETFs', validate: row => assetType(row) === 'fund' },
];

test.describe('Trader full symbol universe coverage', () => {
  test.setTimeout(600_000);

  test('market cards and selected pages expose the full provider universe', async ({ page }, testInfo) => {
    await mkdir(screenshotDir, { recursive: true });
    const report = [];

    await page.goto('/thesfm-trader-own/app/index.html?route=markets', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-market-card]').first()).toBeVisible({ timeout: 40_000 });

    for (const selection of selections) {
      const card = page.locator(`[data-market-card="${selection.id}"]`).first();
      await expect(card, `${selection.name} card should exist`).toBeVisible();

      const previewSymbols = await previewSymbolsForCard(card);
      expect(previewSymbols.length, `${selection.name} preview should stay compact`).toBeGreaterThan(0);
      expect(previewSymbols.length, `${selection.name} preview should not become the full list`).toBeLessThanOrEqual(10);
      await expect(card, `${selection.name} card count label`).toContainText(/Showing \d+ of \d+ symbols/);
      await expect(card, `${selection.name} card action`).toContainText('View all symbols');

      const cardScreenshot = path.join(screenshotDir, `${slug(selection.name)}-card.png`);
      await card.screenshot({ path: cardScreenshot });

      const responsePromise = waitForUniverseResponse(page, selection.id);
      await page.goto(`/thesfm-trader-own/app/index.html?route=${encodeURIComponent(`markets/${selection.id}`)}`, { waitUntil: 'domcontentloaded' });
      const response = await responsePromise;
      expect(response.status(), `${selection.name} API response`).toBeLessThan(500);
      const payload = await response.json() as UniversePayload;

      const panel = page.locator(`[data-selected-market="${selection.id}"]`);
      await expect(panel, `${selection.name} selected page`).toBeVisible({ timeout: 60_000 });
      await expect(panel.locator('[data-market-universe-search] input')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="exchange"]')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="currency"]')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="sector"]')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="industry"]')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="assetType"]')).toBeVisible();
      await expect(panel.locator('[data-market-universe-filter="availability"]')).toBeVisible();

      await expect.poll(async () => tableRowCount(panel), {
        message: `${selection.name} selected page should render page rows`,
        timeout: 60_000,
      }).toBeGreaterThan(0);

      const pageSymbols = await visibleUniverseSymbols(panel);
      const metadataRows = payload.marketUniverse?.symbols ?? [];
      const recommendationRows = payload.recommendations ?? [];
      const validationRows = uniqueRows([...metadataRows, ...recommendationRows]);
      const invalidRows = validationRows.filter(row => !selection.validate(row));
      expect(invalidRows.map(symbolId), `${selection.name} invalid symbols`).toEqual([]);

      const pageScreenshot = path.join(screenshotDir, `${slug(selection.name)}-page.png`);
      await page.screenshot({ path: pageScreenshot, fullPage: true });

      report.push({
        selectedMarketOrCategory: selection.name,
        totalSymbolsAvailable: payload.marketUniverse?.total ?? payload.symbolDiscovery?.totalFilteredSymbols ?? 0,
        previewSymbolsShown: previewSymbols,
        fullPageSymbolsLoaded: pageSymbols.length,
        apiPageSymbolsLoaded: metadataRows.length,
        invalidSymbolsExcluded: payload.excludedByMarket?.length ?? 0,
        invalidSymbolsFound: invalidRows.map(symbolId),
        coverage: payload.coverage ?? null,
        screenshots: {
          card: cardScreenshot,
          page: pageScreenshot,
        },
      });

      await page.goto('/thesfm-trader-own/app/index.html?route=markets', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
    }

    const reportPath = path.join(screenshotDir, 'report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    await testInfo.attach('trader-full-universe-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
  });
});

async function waitForUniverseResponse(page: Page, marketId: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api/recommendations'
      && url.searchParams.get('market') === marketId
      && url.searchParams.get('discover') === '1';
  }, { timeout: 120_000 });
}

async function previewSymbolsForCard(card: Locator) {
  return card.locator('.tile-tags .badge:not(.market-more) .ltr')
    .evaluateAll(nodes => nodes.map(node => text(node.textContent)).filter(Boolean));
}

async function tableRowCount(panel: Locator) {
  return panel.locator('.market-universe-table tbody [data-universe-symbol]').count();
}

async function visibleUniverseSymbols(panel: Locator) {
  return panel.locator('.market-universe-table tbody [data-universe-symbol]')
    .evaluateAll(nodes => Array.from(new Set(nodes.map(node => text(node.getAttribute('data-universe-symbol'))).filter(Boolean))));
}

function uniqueRows(rows: UniverseRow[]) {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = [upper(row.providerSymbol ?? row.providerSymbolUsed ?? row.symbol), upper(row.exchange ?? row.exchangeCode), upper(row.currency)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isStrictMarket(row: UniverseRow, marketId: string, currency: string, suffix: RegExp, venue: RegExp) {
  return isStock(row)
    && upper(row.currency) === currency
    && (
      row.selectedMarket === marketId
      || (row.marketIds ?? []).includes(marketId)
      || suffix.test(symbolId(row))
      || venue.test([row.exchange, row.exchangeCode, row.market, row.country].map(upper).join(' '))
    );
}

function isStock(row: UniverseRow) {
  return stockTypes.has(assetType(row));
}

function isForbiddenAsset(row: UniverseRow) {
  return forbiddenAssetTypes.has(assetType(row));
}

function matchesText(row: UniverseRow, pattern: RegExp) {
  if (row.selectedSector && selections.some(selection => selection.id === row.selectedSector)) return true;
  if ((row.marketIds ?? []).some(id => selections.some(selection => selection.id === id))) return true;
  return pattern.test([
    row.symbol,
    row.displaySymbol,
    row.providerSymbol,
    row.name,
    row.companyName,
    row.sector,
    row.industry,
    row.market,
  ].map(upper).join(' '));
}

function symbolId(row: UniverseRow) {
  return text(row.displaySymbol || row.symbol || row.providerSymbol || row.providerSymbolUsed);
}

function assetType(row: UniverseRow) {
  return upper(row.assetType).toLowerCase();
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function upper(value: unknown) {
  return text(value).toUpperCase();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
