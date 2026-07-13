import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const marketCss = readFileSync(
  join(process.cwd(), 'src/components/market-analysis/market-page.css'),
  'utf8',
);
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('market page CSS visual-system contract', () => {
  it('uses centralized semantic colors without a local palette', () => {
    expect(marketCss).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\.dark\b|var\(--sfm-/i,
    );
    for (const token of [
      '--background', '--surface', '--surface-muted', '--foreground',
      '--foreground-muted', '--border', '--primary', '--success',
      '--warning', '--danger', '--info', '--chart-label', '--focus-shadow',
    ]) {
      expect(marketCss).toContain(`var(${token})`);
    }
  });

  it('reserves the shared gradient for the hero and keeps UI typography semantic', () => {
    expect(marketCss.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(marketCss).toMatch(
      /\.market-hero\s*\{[\s\S]*?background:\s*var\(--hero-gradient\)\s*!important;/,
    );
    expect(marketCss).not.toMatch(/\b(?:Tajawal|Arial)\b|font-weight:\s*(?:8\d{2}|9\d{2})/i);
    expect(marketCss).not.toMatch(rawDepthPattern);
    expect(marketCss).toContain('font: 700 12px var(--font-ui)');
    expect(marketCss).toMatch(
      /\.market-status-value\s*\{[\s\S]*?font-family:\s*var\(--font-data\)/,
    );
  });

  it('maps market outcomes to semantic state roles', () => {
    expect(marketCss).toMatch(/\.sentiment-badge\.buy\s*\{[\s\S]*?var\(--success\)/);
    expect(marketCss).toMatch(/\.sentiment-badge\.sell\s*\{[\s\S]*?var\(--danger\)/);
    expect(marketCss).toMatch(
      /\.sentiment-context-badge\.status\.limited\s*\{[\s\S]*?var\(--warning-soft\)/,
    );
    expect(marketCss).toMatch(
      /\.sentiment-context-badge\.status\.needs-setup,[\s\S]*?var\(--danger-soft\)/,
    );
    expect(marketCss).toMatch(/\.sentiment-context-badge\.source\s*\{[\s\S]*?var\(--info-soft\)/);
  });

  it('lets the shared workspace container own shell padding and sidebar width', () => {
    expect(marketCss).not.toMatch(/--sidebar-w|calc\([^)]*sidebar|padding-inline-start:\s*calc/i);
    expect(marketCss).not.toMatch(/\.market-main\s*\{[^}]*padding\s*:/i);
  });
});
