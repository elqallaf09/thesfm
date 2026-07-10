import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Sharia page regression contracts', () => {
  it('keeps the stock/news page as the route root and embeds deep research', () => {
    const page = source('src/app/sharia-stocks/page.tsx');
    const screen = source('src/components/shariah-stocks/ShariahStocksNewsPage.tsx');
    expect(page).toContain('ShariahStocksNewsPage');
    expect(page).not.toContain('return <ShariaResearchPage />');
    expect(screen).toContain('data-testid="sharia-stock-results"');
    expect(screen).toContain('data-testid="sharia-news-section"');
    expect(screen).toContain('data-testid="sharia-deep-research-entry"');
    expect(screen).toContain('<ShariaResearchPage embedded');
    expect(screen).toContain("fetch('/api/market/tickers/shariah'");
    expect(screen).toContain("fetch(`/api/sharia-stocks/news?");
  });

  it('keeps every API path outside page-auth and locale redirects', () => {
    const rootMiddleware = source('middleware.ts');
    const appMiddleware = source('src/middleware.ts');
    expect(rootMiddleware).toContain('matcher: "/wakeel/:path*"');
    expect(appMiddleware).toContain("(?!api|_next/static|_next/image|favicon.ico");
  });

  it('loads the PDF parser lazily with its serverless worker', () => {
    const extraction = source('src/lib/sharia-research/contentExtraction.ts');
    const nextConfig = source('next.config.ts');
    expect(extraction).not.toContain("import { PDFParse } from 'pdf-parse'");
    expect(extraction).toContain("await import('pdf-parse/worker')");
    expect(extraction).toContain("await import('pdf-parse')");
    expect(nextConfig).toContain("'@napi-rs/canvas'");
    expect(nextConfig).toContain("'pdf-parse'");
  });
});
