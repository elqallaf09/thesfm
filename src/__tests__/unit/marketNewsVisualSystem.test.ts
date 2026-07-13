import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const newsPages = [
  'src/components/gulf-news/GulfNewsPage.tsx',
  'src/components/tech-news/TechNewsPage.tsx',
  'src/components/europe-news/EuropeNewsPage.tsx',
  'src/components/crypto-news/CryptoNewsPage.tsx',
] as const;

const supportingComponents = [
  'src/components/stock-categories/CategoryStockTicker.tsx',
  'src/components/tech-news/TechNewsCard.tsx',
] as const;

const literalColour = /#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\(|oklch\(/i;
const localGradient = /(?:linear|radial|conic)-gradient\(/i;
const directFont = /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans Arabic)\b|font-family\s*:(?!\s*(?:var\(--font-(?:ui|data)\)|inherit\b))/i;
const rawDepth = /border-radius\s*:\s*(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))/i;

describe('market news visual-system contract', () => {
  it('keeps market-news production surfaces on the centralized palette, type, and depth system', () => {
    for (const relativePath of [...newsPages, ...supportingComponents]) {
      const source = read(relativePath);
      expect(source, relativePath).not.toMatch(literalColour);
      expect(source, relativePath).not.toMatch(localGradient);
      expect(source, relativePath).not.toMatch(directFont);
      expect(source, relativePath).not.toMatch(rawDepth);
      expect(source, relativePath).not.toMatch(/var\(--sfm-|var\(--(?:gulf|tech|europe|crypto)-/);
      expect(source, relativePath).not.toMatch(/(?:html\.)?\.dark\b|\[data-theme=['"]?dark|\bdark:/i);
      expect(source, relativePath).not.toMatch(/font(?:-weight)?\s*:\s*(?:[7-9]\d\d|9[0-9]{2})/);
      expect(source, relativePath).not.toMatch(/100d?vw|calc\([^)]*(?:sidebar|100d?vw)/i);
    }
  });

  it('uses the wide shared container and responsive listing grids', () => {
    for (const relativePath of newsPages) {
      const source = read(relativePath);
      expect(source, relativePath).toMatch(/WorkspacePageContainer[^>]+variant="wide"/);
      expect(source, relativePath).toMatch(/<NewsPageShell[^>]+\bwide>/);
      expect(source, relativePath).toContain('@media(min-width:1500px)');
      expect(source, relativePath).not.toMatch(/\b(?:max-w-[3456]xl|w-screen)\b|calc\(100vw/i);
    }
  });

  it('reserves named gradients for the three branded heroes and shared loading states', () => {
    for (const relativePath of newsPages) {
      expect(read(relativePath), relativePath).toContain('var(--skeleton-gradient)');
    }

    for (const relativePath of newsPages.filter(path => !path.includes('europe-news'))) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('var(--hero-gradient)');
      expect(source, relativePath).not.toMatch(/(?:button|card|panel)[^{}]*\{[^}]*background:\s*var\(--hero-gradient\)/i);
    }

    expect(read('src/components/europe-news/EuropeNewsPage.tsx')).not.toContain('var(--hero-gradient)');
  });

  it('uses the data face only for market values and keeps keyboard focus visible', () => {
    for (const relativePath of newsPages) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('var(--font-ui)');
      expect(source, relativePath).toContain('var(--font-data)');
      expect(source, relativePath).toContain(':focus-visible');
      expect(source, relativePath).toContain('var(--focus-ring)');
    }

    const ticker = read('src/components/stock-categories/CategoryStockTicker.tsx');
    expect(ticker).toContain('var(--font-ui)');
    expect(ticker).toContain('var(--surface)');
    expect(ticker).not.toMatch(/\b(?:bg|text|border|ring)-(?:slate|cyan|blue)-\d{2,3}\b/);
  });

  it('keeps remote article art unmodified instead of rebuilding a local colour overlay', () => {
    const card = read('src/components/tech-news/TechNewsCard.tsx');
    expect(card).toContain('return { backgroundImage: `url("${safeUrl}")` };');
    expect(card).not.toContain('linear-gradient');
  });
});
