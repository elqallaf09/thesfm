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

  it('keeps public APIs outside page redirects and returns JSON for protected API auth failures', () => {
    const appMiddleware = source('src/middleware.ts');
    expect(appMiddleware).toContain("pathname.startsWith('/api/')");
    expect(appMiddleware).toContain('if (!isProtectedApiPath(pathname)) return response');
    expect(appMiddleware).toContain("apiError('UNAUTHORIZED', 401)");
    expect(appMiddleware).toContain("apiError('MFA_REQUIRED', 403");
    expect(appMiddleware).not.toContain('(?!api|_next/static');
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

  it('keeps the redesigned report compact, accessible, localized, and printable', () => {
    const page = source('src/components/shariah-stocks/ShariaResearchPage.tsx');
    const report = source('src/components/shariah-stocks/ComplianceAnalysisReport.tsx');
    const styles = source('src/components/shariah-stocks/ShariaResearchPage.module.css');
    expect(page).toContain('className={styles.stickySearch}');
    expect(page).toContain('MARKET_EXCHANGE_OPTIONS');
    expect(report).toContain('aria-expanded={open}');
    expect(report).toContain("param: 'reportTab'");
    expect(report).toContain('COMPLIANCE_REPORT_TABS');
    expect(report).toContain('<PageTabs');
    expect(report).toContain('<PageTabPanel');
    expect(report).toContain('useState<Set<ReportSectionId>>(() => new Set())');
    expect(report).toContain("value=\"business-activity\"");
    expect(report).toContain("value=\"financial-ratios\"");
    expect(report).toContain("value=\"diagnostics\"");
    expect(report).toContain('openCompliancePdfReport');
    expect(report).toContain('navigator.share');
    expect(report).toContain('WATCHLIST_STORAGE_KEY');
    expect(styles).toContain('@media print');
    expect(styles).toContain('.accordionContent[hidden]');
    expect(styles).toContain('.reportTabPanel[hidden]');
    expect(styles).toContain('padding-inline: 16px');
    expect(report).not.toContain('styles.finalVerdict');
    expect(report).not.toContain('document.sourceUrl}</span>');
    expect(report).not.toContain('conflict.field');
    expect(report).not.toContain('ratio.formula');
  });
});
