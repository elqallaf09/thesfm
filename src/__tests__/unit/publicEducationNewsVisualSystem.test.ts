import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const publicAndEducationFiles = [
  'src/app/about/page.tsx',
  'src/app/contact/page.tsx',
  'src/app/ebooks/page.tsx',
  'src/app/ebooks/[slug]/reader-client.tsx',
  'src/app/education/page.tsx',
  'src/app/education/savings/page.tsx',
  'src/app/education/expenses/page.tsx',
  'src/app/education/investments/page.tsx',
] as const;

const stockNewsFiles = [
  'src/components/banking-stocks/BankNewsPage.tsx',
  'src/components/cyclical-stocks/CyclicalStocksNewsPage.tsx',
  'src/components/defensive-stocks/DefensiveStocksNewsPage.tsx',
  'src/components/dividend-stocks/DividendStocksNewsPage.tsx',
  'src/components/growth-stocks/GrowthStocksNewsPage.tsx',
] as const;

const literalColour = /#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\(|oklch\(/i;
const localGradient = /(?:linear|radial|conic)-gradient\(/i;
const directFont = /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans Arabic)\b|font-family\s*:(?!\s*(?:var\(--font-(?:ui|data)\)|inherit\b))/i;
const rawDepth = /border-radius\s*:\s*(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))/i;

describe('public, education, and stock-news visual-system contract', () => {
  it('keeps the assigned production surfaces on centralized colors, type, and depth', () => {
    for (const relativePath of [...publicAndEducationFiles, ...stockNewsFiles]) {
      const source = read(relativePath);
      expect(source, relativePath).not.toMatch(literalColour);
      expect(source, relativePath).not.toMatch(localGradient);
      expect(source, relativePath).not.toMatch(directFont);
      expect(source, relativePath).not.toMatch(rawDepth);
      expect(source, relativePath).not.toMatch(/(?:html\.)?\.dark\b|\[data-theme=['"]?dark/i);
      expect(source, relativePath).toContain('var(--font-ui)');
    }
  });

  it('reserves the shared brand gradient for real hero surfaces', () => {
    for (const relativePath of stockNewsFiles) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('var(--hero-gradient)');
      expect(source, relativePath).not.toMatch(/(?:button|card|panel)[^{}]*\{[^}]*background:\s*var\(--hero-gradient\)/i);
    }

    expect(read('src/app/about/page.tsx')).toContain('background: var(--hero-gradient)');
    expect(read('src/app/contact/page.tsx')).toContain('background: var(--hero-gradient)');
    expect(read('src/app/ebooks/page.tsx')).toContain('background: var(--hero-gradient)');
  });

  it('keeps listings wide and the individual ebook reader within the shared reading route', () => {
    for (const relativePath of stockNewsFiles) {
      expect(read(relativePath), relativePath).toMatch(/WorkspacePageContainer[^>]+variant="wide"/);
    }

    const listing = read('src/app/ebooks/page.tsx');
    expect(listing).toContain('@media (min-width: 1500px)');
    expect(listing).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');

    const reader = read('src/app/ebooks/[slug]/reader-client.tsx');
    const routeLayout = read('src/config/workspaces/workspace-page-layout.ts');
    expect(reader).toContain('width: 100%');
    expect(reader).not.toContain('width: min(1500px, 100%)');
    expect(routeLayout).toMatch(/prefix:\s*'\/ebooks\/'[^\n]+variant:\s*'reading'/);
  });

  it('uses the data face only for market and numeric values and exposes focus states', () => {
    for (const relativePath of stockNewsFiles) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('var(--font-data)');
      expect(source, relativePath).toContain(':focus-visible');
      expect(source, relativePath).toContain('var(--focus-ring)');
    }

    for (const relativePath of publicAndEducationFiles) {
      expect(read(relativePath), relativePath).toContain(':focus-visible');
    }
  });

  it('removes the two unreferenced legacy CSS palettes', () => {
    expect(existsSync(join(process.cwd(), 'src/components/banking-stocks/BankNewsPage.module.css'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/components/defensive-stocks/DefensiveStocksNews.module.css'))).toBe(false);
  });
});
