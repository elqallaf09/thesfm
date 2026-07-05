import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'src', 'trader-app', 'public');
const outputDir = path.join(repoRoot, '.playwright-mcp', 'trader-filter-validation-fixture');
const forbiddenGlobal = ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'];

const semiconductorSymbols = new Set([
  'NVDA', 'AMD', 'INTC', 'AVGO', 'TSM', 'ASML', 'QCOM', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
  'MRVL', 'MCHP', 'ON', 'NXPI', 'ADI', 'MPWR', 'ARM', 'SMCI', 'TER', 'SWKS', 'QRVO', 'LSCC',
  'COHR', 'UMC', 'GFS', 'WOLF',
]);

const technologySymbols = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PANW', 'CRWD',
  'SHOP', 'INTU', 'ADP', 'IBM', 'CSCO', 'NET', 'UBER', 'PLTR', 'DELL', ...semiconductorSymbols,
]);

function recommendation(symbol, overrides = {}) {
  return {
    symbol,
    name: `${symbol} Fixture`,
    price: 10,
    currentPrice: 10,
    targetPrice: 11,
    stopLoss: 9,
    changePercent: 1.1,
    signal: 'buy',
    recommendation: 'buy',
    confidence: 82,
    aiConfidence: 82,
    riskLevel: 'medium',
    status: 'open',
    available: true,
    ...overrides,
  };
}

const leaks = [
  recommendation('NVDA', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Semiconductors' }),
  recommendation('TSLA', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' }),
  recommendation('BTC-USD', { exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' }),
  recommendation('EURUSD', { exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' }),
  recommendation('GLD', { exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' }),
];

const fixtureByMarket = {
  qatar: [recommendation('QNBK.QA', { exchange: 'Qatar Exchange', market: 'Qatar Market', country: 'QA', currency: 'QAR', assetType: 'stock' }), ...leaks],
  kuwait: [recommendation('KFH.KW', { exchange: 'Boursa Kuwait', market: 'Kuwait Market', country: 'KW', currency: 'KWD', assetType: 'stock' }), ...leaks],
  bahrain: [recommendation('AUB.BH', { exchange: 'Bahrain Bourse', market: 'Bahrain Market', country: 'BH', currency: 'BHD', assetType: 'stock' }), ...leaks],
  saudi: [recommendation('2222.SR', { exchange: 'Tadawul', market: 'Saudi Market', country: 'SA', currency: 'SAR', assetType: 'stock' }), ...leaks],
  uae: [recommendation('EMAAR.AE', { exchange: 'Dubai Financial Market', market: 'UAE Market', country: 'AE', currency: 'AED', assetType: 'stock' }), ...leaks],
  technology: [
    recommendation('AAPL', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Consumer Electronics' }),
    recommendation('MSFT', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Software' }),
    ...leaks,
  ],
  semiconductors: [
    recommendation('NVDA', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Semiconductors' }),
    recommendation('AMD', { exchange: 'NASDAQ', market: 'US Stocks', country: 'US', currency: 'USD', assetType: 'stock', sector: 'Technology', industry: 'Semiconductors' }),
    ...leaks,
  ],
  crypto: [
    recommendation('BTCUSD', { exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' }),
    recommendation('ETHUSD', { exchange: 'Crypto', market: 'Crypto', country: 'Global', currency: 'USD', assetType: 'crypto' }),
    ...leaks,
  ],
  forex: [
    recommendation('EURUSD', { exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' }),
    recommendation('GBPUSD', { exchange: 'Forex', market: 'Forex', country: 'Global', currency: 'USD', assetType: 'forex' }),
    ...leaks,
  ],
  commodities: [
    recommendation('XAUUSD', { exchange: 'Commodities', market: 'Commodities', country: 'Global', currency: 'USD', assetType: 'commodity' }),
    recommendation('WTI', { exchange: 'Commodities', market: 'Commodities', country: 'Global', currency: 'USD', assetType: 'commodity' }),
    ...leaks,
  ],
  etfs: [
    recommendation('SPY', { exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' }),
    recommendation('GLD', { exchange: 'NYSE Arca', market: 'US ETFs', country: 'US', currency: 'USD', assetType: 'fund' }),
    ...leaks.filter(item => item.symbol !== 'GLD'),
  ],
};

const cases = [
  { name: 'Qatar Market QAR', apiMarket: 'qatar', chipPattern: /قطر|Qatar/i, forbidden: forbiddenGlobal, validate: symbol => /\.QA$/i.test(symbol) },
  { name: 'Kuwait Market KWD', apiMarket: 'kuwait', chipPattern: /الكويت|Kuwait/i, forbidden: forbiddenGlobal, validate: symbol => /\.KW$/i.test(symbol) },
  { name: 'Bahrain Market BHD', apiMarket: 'bahrain', chipPattern: /البحرين|Bahrain/i, forbidden: forbiddenGlobal, validate: symbol => /\.BH$/i.test(symbol) },
  { name: 'Saudi Market SAR', apiMarket: 'saudi', chipPattern: /السعودي|Saudi/i, forbidden: forbiddenGlobal, validate: symbol => /\.(SR|SA)$/i.test(symbol) },
  { name: 'UAE Market AED', apiMarket: 'uae', chipPattern: /الإمارات|UAE/i, forbidden: forbiddenGlobal, validate: symbol => /\.(AE|DU|AD)$/i.test(symbol) },
  { name: 'US Technology', apiMarket: 'technology', chipPattern: /التقنية|Technology/i, forbidden: ['TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => technologySymbols.has(symbol) },
  { name: 'Semiconductors', apiMarket: 'semiconductors', chipPattern: /الموصلات|Semiconductors/i, forbidden: ['TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => semiconductorSymbols.has(symbol) },
  { name: 'Crypto', apiMarket: 'crypto', chipPattern: /الرقمية|Crypto/i, forbidden: ['NVDA', 'TSLA', 'EURUSD', 'GLD'], validate: symbol => /^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|USDT|AVAX|DOT|LTC|BCH|LINK)(?:USD|-USD)?$/i.test(symbol) },
  { name: 'Forex', apiMarket: 'forex', chipPattern: /العملات|Forex/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'GLD'], validate: symbol => /^[A-Z]{6}$/i.test(symbol) },
  { name: 'Commodities', apiMarket: 'commodities', chipPattern: /السلع|Commodities/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD', 'GLD'], validate: symbol => /^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/i.test(symbol) },
  { name: 'ETFs', apiMarket: 'etfs', chipPattern: /الصناديق|ETFs/i, forbidden: ['NVDA', 'TSLA', 'BTC-USD', 'BTCUSD', 'EURUSD'], validate: symbol => /^(SPY|QQQ|VOO|DIA|IWM|GLD|SLV|VTI|VEA|VWO|AGG|BND|TLT|HYG)$/i.test(symbol) },
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function jsonResponse(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function apiResponse(url, res) {
  if (url.pathname === '/api/recommendations') {
    const market = url.searchParams.get('market') || 'us-stocks';
    const recommendations = fixtureByMarket[market] || fixtureByMarket.technology;
    return jsonResponse(res, {
      ok: true,
      market,
      selectedMarket: market,
      recommendations,
      unavailable: [],
      smartAlerts: [],
      resultCount: recommendations.length,
      dataProvider: { configured: true, status: 'success', active: 'fixture' },
    });
  }
  if (url.pathname === '/api/market/signals') return jsonResponse(res, { ok: true, signals: leaks });
  if (url.pathname === '/api/market/signal-alerts') return jsonResponse(res, { ok: true, notifications: [] });
  if (url.pathname === '/api/markets') return jsonResponse(res, { ok: true, markets: [] });
  if (url.pathname === '/api/market-news') return jsonResponse(res, { ok: true, items: [] });
  if (url.pathname === '/api/followed-trades') return jsonResponse(res, { ok: true, followedTrades: [] });
  if (url.pathname === '/api/trader/provider-status') {
    return jsonResponse(res, {
      ok: true,
      dataProvider: { configured: true, status: 'success', active: 'fixture' },
      normalizedStatus: { status: 'available', provider: 'fixture' },
    });
  }
  return jsonResponse(res, { ok: true });
}

function staticPathFor(urlPath) {
  let filePath = decodeURIComponent(urlPath);
  if (filePath.startsWith('/thesfm-trader-own/app/')) filePath = filePath.slice('/thesfm-trader-own/app/'.length);
  else if (filePath === '/' || filePath.startsWith('/thesfm-trader-own')) filePath = 'index.html';
  else filePath = filePath.replace(/^\/+/, '');
  if (!filePath || filePath.endsWith('/')) filePath = `${filePath}index.html`;
  const resolved = path.resolve(publicRoot, filePath);
  if (resolved !== publicRoot && !resolved.startsWith(`${publicRoot}${path.sep}`)) return null;
  return resolved;
}

function createFixtureServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) return apiResponse(url, res);

    const resolved = staticPathFor(url.pathname);
    if (!resolved) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    createReadStream(resolved).on('error', () => {
      if (!res.headersSent) res.writeHead(404);
      res.end('Not found');
    }).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function visibleSymbols(page) {
  return page.locator('.rec-card .asset-title strong, [data-tabpanel="rec"] .asset-card .symbol-code')
    .evaluateAll(nodes => Array.from(new Set(nodes.map(node => (node.textContent || '').trim()).filter(Boolean))));
}

const server = await createFixtureServer();
const port = server.address().port;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = [];

try {
  await page.goto(`http://127.0.0.1:${port}/thesfm-trader-own/app/index.html?route=recommendations`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  for (const selection of cases) {
    const chip = page.locator('[data-rec-market]').filter({ hasText: selection.chipPattern }).first();
    await chip.waitFor({ state: 'visible', timeout: 10_000 });
    const responsePromise = page.waitForResponse(response => {
      const responseUrl = new URL(response.url());
      return responseUrl.pathname === '/api/recommendations' && responseUrl.searchParams.get('market') === selection.apiMarket;
    });
    await chip.click();
    await responsePromise;
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(150);

    const symbols = await visibleSymbols(page);
    const symbolValidation = Object.fromEntries(symbols.map(symbol => [symbol, selection.validate(symbol)]));
    const forbiddenFound = selection.forbidden.filter(symbol => symbols.includes(symbol));
    const passed = symbols.length > 0 && forbiddenFound.length === 0 && Object.values(symbolValidation).every(Boolean);
    const screenshot = path.join(outputDir, `${selection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    report.push({ selection: selection.name, visibleSymbols: symbols, symbolValidation, forbiddenFound, passed, screenshot });
    if (!passed) {
      throw new Error(`${selection.name} failed strict validation: ${JSON.stringify(report.at(-1))}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

await writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
