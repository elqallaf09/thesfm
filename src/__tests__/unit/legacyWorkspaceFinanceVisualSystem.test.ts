import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const productionFiles = [
  'src/app/khums/page.tsx',
  'src/app/income/page.tsx',
  'src/app/today/page.tsx',
  'src/app/zakat/page.tsx',
  'src/components/business-subscriptions/SubscriptionManagerPage.tsx',
  'src/components/income/IncomeSourcesForm.tsx',
] as const;

const sources = productionFiles.map((file) => ({
  file,
  source: readFileSync(join(process.cwd(), file), 'utf8'),
}));

describe('legacy workspace finance visual-system contract', () => {
  it.each(sources)('$file consumes centralized colors and typography', ({ source }) => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
    expect(source).not.toMatch(
      /\b(?:text|bg|border|from|via|to)-(?:cyan|sky|blue|emerald|teal|rose|amber|yellow|slate|gray|zinc|stone|neutral)-\d{2,3}\b/i,
    );
    expect(source).not.toMatch(
      /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans)\b|font-mono/i,
    );
    expect(source).not.toMatch(
      /font-(?:extrabold|black)|font-(?:weight|Weight)\s*[:=]\s*['"]?(?:800|900|950)/i,
    );
    expect(source).not.toMatch(
      /(?:html\.)?\.dark(?:[\s.{:#]|$)|:global\(\.dark\)|\[data-theme=["']dark["']\]|\bdark:/i,
    );
    expect(source).not.toMatch(/(?:--|var\(--)(?:sfm|khums|zakat)-/i);
    expect(source).toContain('var(--font-ui)');
    expect(source).toContain('var(--font-data)');
  });

  it.each(sources)('$file uses shared radii, depth, and shell width rules', ({ source }) => {
    expect(source).not.toMatch(/border-radius:\s*(?:[1-9]\d*px|50%)/i);
    expect(source).not.toMatch(/borderRadius:\s*(?:[1-9]\d*|["'](?:[1-9]\d*px|50%)["'])/i);
    expect(source).not.toMatch(
      /box-shadow:\s*(?:-?\d|rgba?\(|#[0-9a-f]|inset\s+\d)|boxShadow:\s*["'`]\s*(?:-?\d|rgba?\(|#[0-9a-f])/i,
    );
    expect(source).not.toMatch(/100vw|max-w-(?:3xl|4xl|5xl|6xl)|calc\([^\n]*(?:sidebar|100vw)/i);
  });

  it('reserves branded gradients for true heroes and the functional income chart', () => {
    const byFile = Object.fromEntries(sources.map(({ file, source }) => [file, source]));
    for (const file of productionFiles.slice(0, 5)) {
      expect(byFile[file]).toContain('var(--hero-gradient)');
      expect(byFile[file]).toContain('var(--hero-foreground)');
    }
    expect(byFile['src/components/income/IncomeSourcesForm.tsx']).not.toContain(
      'var(--hero-gradient)',
    );

    const directGradients = sources.flatMap(({ file, source }) =>
      [...source.matchAll(/(?:linear|radial|conic|repeating-linear)-gradient\(/g)].map(
        (match) => ({ file, value: match[0] }),
      ),
    );
    expect(directGradients).toEqual([]);
    expect(byFile['src/app/income/page.tsx']).toContain(
      'buildSemanticConicGradient(stops)',
    );
  });

  it('keeps semantic focus, primary contrast, responsive, and direction contracts', () => {
    const combined = sources.map(({ source }) => source).join('\n');
    expect(combined).toContain('var(--focus-ring)');
    expect(combined).toContain('var(--focus-shadow)');
    expect(combined).toContain('var(--primary-foreground)');
    expect(combined).toContain("dir={dir}");
    expect(combined).toMatch(/@media\s*\(max-width:/);
    expect(combined).toContain('inset-inline-');
  });

  it('keeps the income-source form on centralized depth tokens', () => {
    const incomeSource = sources.find(
      ({ file }) => file === 'src/components/income/IncomeSourcesForm.tsx',
    )?.source;

    expect(incomeSource).toBeDefined();
    expect(incomeSource).not.toMatch(
      /(?:^|\s)(?:hover:|focus:|active:)?shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?=\s|["'`}])/m,
    );
    expect(incomeSource).not.toMatch(
      /(?:^|\s)(?:sm:|md:|lg:|xl:|2xl:)?rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full)|-\[(?:\d|\.))/m,
    );
    expect(incomeSource).toContain('rounded-[var(--radius-card)]');
    expect(incomeSource).toContain('rounded-[var(--radius-pill)]');
    expect(incomeSource).toContain('shadow-card');
  });
});
