import { expect, test, type Locator } from '@playwright/test';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const qaEnabled = process.env.SFM_LOCAL_TRADER_QA === '1';
const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'src', 'trader-app', 'public');
const screenshotDir = path.join(process.cwd(), '.playwright-mcp', 'trader-full-universe');
const realApiBase = process.env.TRADER_REAL_API_BASE_URL || 'http://127.0.0.1:3015';

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
  fundType?: string;
  fundStructure?: string;
  shariahStatus?: string;
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
const knownTechnologySymbols = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PANW', 'CRWD', 'SHOP',
  'INTU', 'ADP', 'IBM', 'CSCO', 'NET', 'UBER', 'PLTR', 'DELL', 'META', 'AMZN',
  'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
  'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
  'COHR', 'UMC', 'GFS', 'WOLF',
]);
const knownSemiconductorSymbols = new Set([
  'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
  'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
  'COHR', 'UMC', 'GFS', 'WOLF',
]);
const knownBankingSymbols = new Set([
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TD', 'RY', 'HSBA.L', 'SAN.MC', 'UCG.MI',
  'NBK.KW', 'KFH.KW', 'QNBK.QA', 'QIBK.QA', '1120.SR', '1180.SR', 'AUB.BH', 'BKMB.OM',
]);
const knownEnergySymbols = new Set([
  'XOM', 'CVX', '2222.SR', 'OXY', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'HAL', 'BKR',
  'SHEL.L', 'TTE.PA', 'ADNOCDIST.AE', 'ADNOCGAS.AD',
]);
const knownHealthcareSymbols = new Set([
  'LLY', 'PFE', 'JNJ', 'MRK', 'UNH', 'ABBV', 'ABT', 'TMO', 'DHR', 'BMY', 'AMGN', 'GILD',
  'ISRG', 'VRTX', 'AZN.L', 'NOVN.SW', 'ROG.SW',
]);

const selections: SelectionCase[] = [
  { id: 'kuwait', name: 'Kuwait Market', validate: row => isStrictMarket(row, 'kuwait', 'KWD', /\.KW$/i, /KUWAIT|BOURSA|KSE|XKUW/i) },
  { id: 'saudi', name: 'Saudi Market', validate: row => isStrictMarket(row, 'saudi', 'SAR', /\.(SR|SA)$/i, /SAUDI|TADAWUL|XSAU/i) },
  { id: 'uae', name: 'UAE Market', validate: row => isStrictMarket(row, 'uae', 'AED', /\.(AE|DU|AD)$/i, /UAE|DUBAI|ABU DHABI|ADX|DFM|XADS|XDFM/i) },
  { id: 'qatar', name: 'Qatar Market', validate: row => isStrictMarket(row, 'qatar', 'QAR', /\.QA$/i, /QATAR|QSE|DSM|DSMD/i) },
  { id: 'bahrain', name: 'Bahrain Market', validate: row => isStrictMarket(row, 'bahrain', 'BHD', /\.BH$/i, /BAHRAIN|BHB|XBAH/i) },
  { id: 'oman', name: 'Oman Market', validate: row => isStrictMarket(row, 'oman', 'OMR', /\.OM$/i, /OMAN|MUSCAT|MSX|XMUS/i) },
  { id: 'us-stocks', name: 'US Stocks', validate: row => isStock(row) && upper(row.currency) === 'USD' && !isForbiddenAsset(row) },
  { id: 'technology', name: 'Technology', validate: row => isStock(row) && !isForbiddenAsset(row) && (knownTechnologySymbols.has(symbolId(row)) || matchesText(row, /TECH|SOFTWARE|SEMICONDUCTOR|INFORMATION TECHNOLOGY|ELECTRONIC|COMPUTER|INTERNET|CLOUD|CYBER|AI|ARTIFICIAL INTELLIGENCE/i)) },
  { id: 'semiconductors', name: 'Semiconductors', validate: row => isStock(row) && !isForbiddenAsset(row) && (knownSemiconductorSymbols.has(symbolId(row)) || matchesText(row, /SEMICONDUCTOR|ELECTRONIC COMPONENT|CHIP|INTEGRATED CIRCUIT/i)) },
  { id: 'banking', name: 'Banking', validate: row => isStock(row) && !isForbiddenAsset(row) && (knownBankingSymbols.has(symbolId(row)) || matchesText(row, /BANK|FINANCIAL|CAPITAL MARKETS|CREDIT|BROKER|ASSET MANAGEMENT|INSURANCE/i)) },
  { id: 'energy', name: 'Energy', validate: row => isStock(row) && !isForbiddenAsset(row) && (knownEnergySymbols.has(symbolId(row)) || matchesText(row, /ENERGY|OIL|GAS|PETROLEUM|DRILLING|REFIN|PIPELINE|HYDROCARBON/i)) },
  { id: 'healthcare', name: 'Healthcare', validate: row => isStock(row) && !isForbiddenAsset(row) && (knownHealthcareSymbols.has(symbolId(row)) || matchesText(row, /HEALTH|PHARMA|BIOTECH|DRUG|MEDICAL|THERAPEUTIC|DIAGNOSTIC|LIFE SCIENCE/i)) },
  { id: 'crypto', name: 'Crypto', validate: row => assetType(row) === 'crypto' },
  { id: 'forex', name: 'Forex', validate: row => assetType(row) === 'forex' },
  { id: 'commodities', name: 'Commodities', validate: row => assetType(row) === 'commodity' },
  { id: 'etfs', name: 'Funds & ETFs', validate: row => assetType(row) === 'fund' },
];

test.describe('Trader full symbol universe coverage', () => {
  test.setTimeout(600_000);
  test.skip(!qaEnabled, 'Set SFM_LOCAL_TRADER_QA=1 and TRADER_REAL_API_BASE_URL for local full-universe validation.');

  test('market cards and selected pages expose the full provider universe', async ({ page }, testInfo) => {
    await mkdir(screenshotDir, { recursive: true });
    const server = await createStaticProxyServer();
    const port = (server.address() as { port: number }).port;
    const report = [];
    let routedMarketId = '';
    let routedPayload: UniversePayload | null = null;

    try {
      await page.route('**/api/recommendations**', async route => {
        const url = new URL(route.request().url());
        if (routedPayload && url.searchParams.get('market') === routedMarketId && url.searchParams.get('discover') === '1') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify(routedPayload),
          });
          return;
        }
        await route.continue();
      });

      await page.goto(`http://127.0.0.1:${port}/thesfm-trader-own/app/index.html?route=markets`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      for (const selection of selections) {
        await expect(page.locator('[data-market-card]').first()).toBeVisible({ timeout: 40_000 });
        const card = page.locator(`[data-market-card="${selection.id}"]`).first();
        await expect(card, `${selection.name} card should exist`).toBeVisible();

        const previewSymbols = await previewSymbolsForCard(card);
        expect(previewSymbols.length, `${selection.name} preview should stay compact`).toBeGreaterThan(0);
        expect(previewSymbols.length, `${selection.name} preview should not become the full list`).toBeLessThanOrEqual(10);
        await expect(card, `${selection.name} card count label`).toContainText(/Showing \d+ of \d+ symbols/);
        await expect(card, `${selection.name} card action`).toContainText(selection.id === 'etfs' ? 'View all funds' : 'View all symbols');

        const cardScreenshot = path.join(screenshotDir, `${slug(selection.name)}-card.png`);
        await card.screenshot({ path: cardScreenshot });

        const payload = await fetchUniversePayload(selection.id);
        routedMarketId = selection.id;
        routedPayload = payload;
        await page.goto(`http://127.0.0.1:${port}/thesfm-trader-own/app/index.html?route=${encodeURIComponent(`markets/${selection.id}`)}`, { waitUntil: 'domcontentloaded' });

        const panel = page.locator(`[data-selected-market="${selection.id}"]`);
        await expect(panel, `${selection.name} selected page`).toBeVisible({ timeout: 60_000 });
        await expect(panel.locator('[data-market-universe-search] input')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="exchange"]')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="currency"]')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="sector"]')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="industry"]')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="assetType"]')).toBeVisible();
        await expect(panel.locator('[data-market-universe-filter="availability"]')).toBeVisible();
        if (selection.id === 'etfs') {
          await expect(panel.locator('[data-fund-filter="etf"]')).toBeVisible();
          await expect(panel.locator('[data-fund-filter="reit"]')).toBeVisible();
          await expect(panel.locator('[data-fund-filter="bond_sukuk_fund"]')).toBeVisible();
          await expect(panel.locator('[data-fund-filter="shariah_fund"]')).toBeVisible();
        }

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

        if (selection.id === 'etfs') {
          for (const fundType of ['etf', 'reit', 'bond_sukuk_fund', 'shariah_fund']) {
            const filterPayload = await fetchUniversePayload(selection.id, fundType);
            routedPayload = filterPayload;
            await panel.locator(`[data-fund-filter="${fundType}"]`).click();
            await page.waitForLoadState('networkidle');
            const filterRows = uniqueRows([...(filterPayload.marketUniverse?.symbols ?? []), ...(filterPayload.recommendations ?? [])]);
            expect(filterRows.every(row => validateFundFilter(row, fundType)), `${fundType} rows should stay inside fund subtype`).toBe(true);
            if (filterRows.length === 0) {
              await expect(panel.locator('.empty-state')).toContainText('No matching funds for this market or category right now');
            }
          }
        }

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

        routedMarketId = '';
        routedPayload = null;
        await page.goto(`http://127.0.0.1:${port}/thesfm-trader-own/app/index.html?route=markets`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');
      }

      const reportPath = path.join(screenshotDir, 'report.json');
      await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      await testInfo.attach('trader-full-universe-report', {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      });
    } finally {
      server.close();
    }
  });
});

function createStaticProxyServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) return proxyApi(req, res, url);
    return serveStatic(url, res);
  });
  return new Promise<ReturnType<typeof createServer>>(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function proxyApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  try {
    const response = await fetch(`${realApiBase}${url.pathname}${url.search}`, {
      method: req.method || 'GET',
      headers: { accept: 'application/json' },
    });
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}

function serveStatic(url: URL, res: ServerResponse) {
  const resolved = staticPathFor(url.pathname);
  if (!resolved) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, { 'content-type': mimeType(ext) });
  createReadStream(resolved).on('error', () => {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }).pipe(res);
}

function staticPathFor(urlPath: string) {
  let filePath = decodeURIComponent(urlPath);
  if (filePath.startsWith('/thesfm-trader-own/app/')) filePath = filePath.slice('/thesfm-trader-own/app/'.length);
  else if (filePath === '/' || filePath.startsWith('/thesfm-trader-own')) filePath = 'index.html';
  else filePath = filePath.replace(/^\/+/, '');
  if (!filePath || filePath.endsWith('/')) filePath = `${filePath}index.html`;
  const resolved = path.resolve(publicRoot, filePath);
  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  return resolved;
}

function mimeType(ext: string) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  }[ext] || 'application/octet-stream';
}

async function fetchUniversePayload(marketId: string, fundType?: string): Promise<UniversePayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const url = new URL(`${realApiBase}/api/recommendations`);
    url.searchParams.set('market', marketId);
    url.searchParams.set('discover', '1');
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '50');
    if (fundType) url.searchParams.set('fundType', fundType);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    expect(response.status, `${marketId} API response`).toBeLessThan(500);
    return await response.json() as UniversePayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function previewSymbolsForCard(card: Locator) {
  return card.locator('.tile-tags .badge:not(.market-more) .ltr')
    .evaluateAll(nodes => nodes.map(node => String(node.textContent ?? '').trim()).filter(Boolean));
}

async function tableRowCount(panel: Locator) {
  return panel.locator('.market-universe-table tbody [data-universe-symbol]').count();
}

async function visibleUniverseSymbols(panel: Locator) {
  return panel.locator('.market-universe-table tbody [data-universe-symbol]')
    .evaluateAll(nodes => Array.from(new Set(nodes.map(node => String(node.getAttribute('data-universe-symbol') ?? '').trim()).filter(Boolean))));
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
  return (isStock(row) || assetType(row) === 'fund')
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

function validateFundFilter(row: UniverseRow, fundType: string) {
  if (assetType(row) !== 'fund') return false;
  const type = upper(row.fundType);
  const structure = upper(row.fundStructure);
  if (fundType === 'etf') return structure === 'ETF' || ['ETF', 'LEVERAGED_ETF', 'INVERSE_ETF'].includes(type);
  if (fundType === 'reit') return type === 'REIT';
  if (fundType === 'bond_sukuk_fund') return type === 'BOND_FUND' || type === 'SUKUK_FUND';
  if (fundType === 'shariah_fund') return type === 'SHARIAH_COMPLIANT_FUND' || type === 'SUKUK_FUND' || upper(row.shariahStatus) === 'COMPLIANT';
  return true;
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
