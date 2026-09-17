import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const categoryPages = [
  ['energy', 'src/app/energy-stocks/page.tsx'],
  ['banking', 'src/app/banking-stocks/page.tsx'],
  ['sharia', 'src/app/sharia-stocks/page.tsx'],
  ['growth', 'src/app/growth-stocks/page.tsx'],
  ['defensive', 'src/app/defensive-stocks/page.tsx'],
  ['cyclical', 'src/app/cyclical-stocks/page.tsx'],
  ['dividend', 'src/app/dividend-stocks/page.tsx'],
] as const;

describe('full stock-category scanners', () => {
  it('mounts the full scanner on every stock-category destination', () => {
    for (const [category, path] of categoryPages) {
      const source = read(path);
      expect(source).toContain('StockCategoryScannerPanel');
      expect(source).toContain(`category="${category}"`);
    }
  });

  it('scans the real US exchange universe instead of only configured watchlists', () => {
    const source = read('src/lib/market/stockCategoryScanner.ts');
    expect(source).toContain("const US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'] as const");
    expect(source).toContain("fetchFmpArray('company-screener'");
    expect(source).toContain('limit: 10_000');
    expect(source).toContain("mode: 'dynamic_market_screener'");
    expect(source).toContain("return await shariaScanner");
    expect(source).toContain('screenGrowthStocks()');
  });

  it('keeps a transparent degraded fallback rather than inventing data', () => {
    const service = read('src/lib/market/stockCategoryScanner.ts');
    const route = read('src/app/api/stock-categories/scanner/route.ts');
    expect(service).toContain("mode: 'fallback_watchlist'");
    expect(service).toContain('degradedReason: reason');
    expect(route).toContain("status: degraded ? 'degraded' : 'success'");
    expect(route).toContain('degraded_reason: result.degradedReason');
  });

  it('refreshes the full scanner automatically and exposes rich market fields', () => {
    const panel = read('src/components/stock-categories/StockCategoryScannerPanel.tsx');
    expect(panel).toContain('const AUTO_REFRESH_MS = 5 * 60 * 1000');
    expect(panel).toContain('window.setInterval(() => void load(false), AUTO_REFRESH_MS)');
    expect(panel).toContain('marketCap');
    expect(panel).toContain('volume');
    expect(panel).toContain('dividendYieldPercent');
    expect(panel).toContain('revenueGrowthPercent');
    expect(panel).toContain('shariahStatus');
    expect(panel).toContain('StockTickerStrip');
  });

  it('uses scanner data for category tickers, movers, and news coverage', () => {
    const ticker = read('src/components/stock-categories/CategoryStockTicker.tsx');
    const movers = read('src/lib/market/fetchStockCategoryMovers.ts');
    const news = read('src/lib/market/fetchStockCategoryNews.ts');
    expect(ticker).toContain('/api/stock-categories/scanner?category=');
    expect(movers).toContain('screenStockCategory(config.id, { limit: 300 })');
    expect(news).toContain('screenStockCategory(config.id, { limit: NEWS_SYMBOL_LIMIT })');
    expect(news).toContain('scannerUniverseCount');
  });

  it('replaces the small fixed energy, banking, defensive, cyclical and dividend ticker lists', () => {
    const routes = [
      'src/app/api/energy-stocks/ticker/route.ts',
      'src/app/api/banking-stocks/ticker/route.ts',
      'src/app/api/defensive-stocks/ticker/route.ts',
      'src/app/api/cyclical-stocks/ticker/route.ts',
      'src/app/api/dividend-stocks/ticker/route.ts',
    ];
    for (const path of routes) {
      const source = read(path);
      expect(source).toContain('screenStockCategory(');
      expect(source).not.toMatch(/_TICKER_SYMBOLS\s*=\s*\[/);
    }
  });
});
