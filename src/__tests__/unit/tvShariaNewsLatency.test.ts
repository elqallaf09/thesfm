import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('TV Sharia news latency contract', () => {
  it('does not wait on the indexed news store before fetching the bounded live headline window', () => {
    const engine = readFileSync('src/lib/market-news/engine.ts', 'utf8');
    const category = readFileSync('src/lib/market/fetchStockCategoryNews.ts', 'utf8');

    expect(engine).toContain('skipStoredSearch?: boolean');
    expect(engine).toContain("storedSearch: options.skipStoredSearch ? 'skip' : 'include'");
    expect(engine).toMatch(/const stored = options\.skipStoredSearch[\s\S]*?searchStoredNews/);
    expect(category).toContain('providerBudgetMs: 6500, skipStoredSearch: true');
  });
});
