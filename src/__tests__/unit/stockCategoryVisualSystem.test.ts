import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/stock-categories/StockCategoryNewsPage.tsx'),
  'utf8',
);

describe('stock-category news visual-system contract', () => {
  it('uses semantic colors instead of a route-local palette', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(/i);
    expect(source).not.toMatch(
      /\b(?:bg|text|border|ring|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
    expect(source).not.toMatch(/(?:bg|from|via|to)-gradient|(?:linear|radial|conic)-gradient\(/i);
    expect(source).not.toMatch(/\bdark:/);
    expect(source).toContain('var(--surface)');
    expect(source).toContain('var(--foreground)');
    expect(source).toContain('var(--focus-ring)');
  });

  it('inherits workspace width from the application shell', () => {
    expect(source).not.toMatch(/calc\(100vw|\b100vw\b|max-w-\[1440px\]|--sidebar-w/);
    expect(source).not.toContain('<main className="stock-category-main"');
    expect(source).toMatch(/<NewsPageShell[^>]+\bwide>/);
    expect(source).toContain('overflow-x:clip');
  });

  it('keeps financial values visually distinct without a global mono face', () => {
    expect(source).not.toMatch(/font-family\s*:\s*(?:monospace|['"]?(?:Courier|Consolas|Roboto Mono))/i);
    expect(source).not.toMatch(/\bfont-mono\b/);
    expect(source).not.toMatch(/\bfont-(?:black|extrabold)\b[^\n]*(?:button|aria-label)/i);
  });

  it('uses centralized depth tokens instead of Tailwind depth presets', () => {
    expect(source).not.toMatch(
      /(?:^|\s)(?:hover:|focus:|active:)?shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?=\s|["'`}])/m,
    );
    expect(source).not.toMatch(
      /(?:^|\s)(?:sm:|md:|lg:|xl:|2xl:)?rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full)|-\[(?:\d|\.))/m,
    );
    expect(source).toContain('rounded-[var(--radius-panel)]');
    expect(source).toContain('rounded-[var(--radius-card)]');
    expect(source).toContain('rounded-[var(--radius-control)]');
    expect(source).toContain('rounded-[var(--radius-pill)]');
    expect(source).toContain('rounded-[var(--radius-circle)]');
    expect(source).toContain('shadow-[var(--shadow-card)]');
    expect(source).toContain('shadow-[var(--shadow-popover)]');
  });
});
