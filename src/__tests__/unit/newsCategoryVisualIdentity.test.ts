import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');
const themes = read('src/styles/themes.css');
const globals = read('src/app/globals.css');

const CATEGORY_PAGES = [
  { category: 'tech', file: 'src/components/tech-news/TechNewsPage.tsx' },
  { category: 'europe', file: 'src/components/europe-news/EuropeNewsPage.tsx' },
  { category: 'gulf', file: 'src/components/gulf-news/GulfNewsPage.tsx' },
  { category: 'crypto', file: 'src/components/crypto-news/CryptoNewsPage.tsx' },
  { category: 'energy', file: 'src/components/energy-stocks/EnergyNewsPage.tsx' },
  { category: 'banking', file: 'src/components/banking-stocks/BankNewsPage.tsx' },
  { category: 'sharia', file: 'src/components/shariah-stocks/ShariahStocksNewsPage.tsx' },
  { category: 'growth', file: 'src/components/growth-stocks/GrowthStocksNewsPage.tsx' },
  { category: 'defensive', file: 'src/components/defensive-stocks/DefensiveStocksNewsPage.tsx' },
  { category: 'cyclical', file: 'src/components/cyclical-stocks/CyclicalStocksNewsPage.tsx' },
  { category: 'high-income', file: 'src/components/dividend-stocks/DividendStocksNewsPage.tsx' },
] as const;

describe('news category visual identity', () => {
  it('wires every one of the 11 required news pages to its NewsPageShell category', () => {
    for (const { category, file } of CATEGORY_PAGES) {
      const source = read(file);
      expect(source, file).toMatch(new RegExp(`<NewsPageShell category="${category}"`));
    }
  });

  it('defines a distinct identity token for each of the 11 categories in both light and dark', () => {
    for (const { category } of CATEGORY_PAGES) {
      const token = `--market-news-category-${category}`;
      const occurrences = themes.match(new RegExp(`${token}:`, 'g')) ?? [];
      expect(occurrences, token).toHaveLength(2);
    }
  });

  it('keeps each identity token derived only from existing semantic color tokens', () => {
    const literalColour = /#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\(/i;
    for (const { category } of CATEGORY_PAGES) {
      const declaration = themes.match(new RegExp(`--market-news-category-${category}:[^;]+;`, 'g')) ?? [];
      expect(declaration.length, category).toBeGreaterThan(0);
      for (const value of declaration) {
        expect(value, category).not.toMatch(literalColour);
        expect(value, category).toMatch(/color-mix\(in srgb, var\(--/);
      }
    }
  });

  it('applies each token as a restrained wash behind the flat background, not a replacement for it', () => {
    for (const { category } of CATEGORY_PAGES) {
      const rule = globals.match(new RegExp(`\\.news-page-bg\\.news-bg-${category} \\{[^}]+\\}`));
      expect(rule, category).not.toBeNull();
      expect(rule?.[0], category).toContain(`var(--market-news-category-${category})`);
      expect(rule?.[0], category).toContain('var(--background) !important');
    }
  });

  it('keeps globals.css free of raw gradients for the category identities (guard-compliant)', () => {
    const categoryRulesBlock = globals.slice(
      globals.indexOf('.news-page-bg.news-bg-tech'),
      globals.indexOf('.news-page-bg.news-bg-high-income') + 200,
    );
    expect(categoryRulesBlock).not.toMatch(/(?:linear|radial|conic)-gradient\(/);
  });
});
