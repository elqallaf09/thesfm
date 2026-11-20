import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('full category scanner truthfulness contracts', () => {
  it('reports complete scanned and matched universe counts separately from returned rows', () => {
    const route = read('src/app/api/stock-categories/scanner/route.ts');
    expect(route).toContain('universe_count: result.universeCount');
    expect(route).toContain('matched_count: result.matchedCount');
    expect(route).toContain('returned_count: result.returnedCount');
    expect(route).toContain('quote_enriched_count: result.quoteEnrichedCount');
  });

  it('retains unavailable values and labels degraded fallback mode', () => {
    const scanner = read('src/lib/market/stockCategoryScanner.ts');
    expect(scanner).toContain("unavailableReason: quote?.unavailableReason ?? 'price_unavailable'");
    expect(scanner).toContain("source: 'configured category fallback + market quote providers'");
    expect(scanner).toContain("mode: 'fallback_watchlist'");
  });
});
