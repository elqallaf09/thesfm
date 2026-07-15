import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const productionFiles = [
  'src/app/debts/_components.tsx',
  'src/app/expenses/monthly-subscriptions/page.tsx',
  'src/app/financial-theories/financial-theories.css',
  'src/app/goals/add/page.tsx',
  'src/app/expenses/add/page.tsx',
  'src/app/charity/charity.module.css',
  'src/app/charity-projects/report/page.tsx',
] as const;

const sources = productionFiles.map((file) => ({
  file,
  source: readFileSync(join(process.cwd(), file), 'utf8'),
}));

describe('legacy finance and charity visual-system contract', () => {
  it.each(sources)('$file uses centralized colors and typography', ({ source }) => {
    expect(source).not.toMatch(
      /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:linear|radial|conic|repeating-linear)-gradient\(/i,
    );
    expect(source).not.toMatch(
      /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|IBM Plex Sans Arabic)\b/i,
    );
    expect(source).not.toMatch(
      /font-weight:\s*(?:8\d{2}|9\d{2})|font:\s*(?:8\d{2}|9\d{2})/i,
    );
    expect(source).not.toMatch(
      /--(?:cc|charity)-(?:bg|surface|ink|muted|border|green|gold|emerald|danger|shadow)\b/i,
    );
    expect(source).not.toContain('var(--sfm-');
    expect(source).not.toMatch(
      /(?:html\.)?\.dark\b|:global\(\.dark\)|\[data-theme=["']dark["']\]/i,
    );
    expect(source).toContain('var(--font-ui)');
    expect(source).toContain('var(--font-data)');
  });

  it.each(sources)('$file uses shared radii and depth tokens', ({ source }) => {
    expect(source).not.toMatch(/border-radius:\s*(?:[1-9]\d*px|50%)/i);
    expect(source).not.toMatch(/borderRadius:\s*["'](?:[1-9]\d*px|50%)["']/i);
    expect(source).not.toMatch(
      /box-shadow:\s*(?:-?\d|rgba?\(|#[0-9a-f]|inset\s+\d)/i,
    );
  });

  it('reserves the shared gradient for branded hero surfaces', () => {
    const byFile = Object.fromEntries(sources.map(({ file, source }) => [file, source]));
    expect(byFile['src/app/debts/_components.tsx']).toContain(
      'background: var(--hero-gradient);',
    );
    expect(byFile['src/app/goals/add/page.tsx']).toContain(
      'background:var(--hero-gradient)',
    );
    expect(byFile['src/app/charity/charity.module.css']).toContain(
      'background: var(--hero-gradient);',
    );
    expect(byFile['src/app/charity-projects/report/page.tsx']).toContain(
      'background: var(--hero-gradient);',
    );
    expect(byFile['src/app/expenses/add/page.tsx']).not.toContain(
      'var(--hero-gradient)',
    );
  });

  it('keeps focus, responsive, RTL, and print contracts intact', () => {
    const combined = sources.map(({ source }) => source).join('\n');
    expect(combined).toContain('var(--focus-ring)');
    expect(combined).toContain('var(--focus-shadow)');
    expect(combined).toContain('border-inline-start');
    expect(combined).toContain('[dir="rtl"]');
    expect(combined).toContain('@media (max-width: 390px)');
    expect(combined).toContain('@media print');
    expect(combined).toContain('var(--print-background)');
    expect(combined).toContain('var(--print-foreground)');
    expect(combined).toContain('var(--print-border)');
  });

  it('keeps savings step markers readable across the legacy dark-theme cascade', () => {
    const helperSource = readFileSync(
      join(process.cwd(), 'src/components/finance/_helpers.ts'),
      'utf8',
    );
    const pageSource = readFileSync(
      join(process.cwd(), 'src/components/finance/RouteDashboardPage.tsx'),
      'utf8',
    );
    const globalStyles = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(helperSource).toMatch(
      /\.savings-guide-step b\{[^}]*background:var\(--primary\);[^}]*color:var\(--button-primary-foreground\);/,
    );
    expect(pageSource).toContain('<b className="sfm-on-primary">');
    expect(globalStyles).toContain(':not(.sfm-on-primary)');
  });
});
