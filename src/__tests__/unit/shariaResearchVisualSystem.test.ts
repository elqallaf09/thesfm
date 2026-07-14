import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  join(process.cwd(), 'src/components/shariah-stocks/ShariaResearchPage.module.css'),
  'utf8',
);

describe('Sharia research visual-system contract', () => {
  it('uses centralized semantic colors without a page-owned light or dark palette', () => {
    expect(styles).not.toMatch(
      /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|:global\(\.dark\)|var\(--sfm-/i,
    );
    expect(styles).not.toMatch(
      /--(?:ink|muted|subtle|line|line-strong|paper|canvas|teal|teal-deep|green|red|amber|gray)\s*:|var\(--(?:ink|muted|subtle|line|line-strong|paper|canvas|teal|teal-deep|green|red|amber|gray)\)/,
    );

    for (const token of [
      '--surface', '--surface-muted', '--foreground',
      '--foreground-secondary', '--foreground-muted', '--border', '--border-strong',
      '--primary', '--primary-hover', '--primary-foreground', '--accent', '--success',
      '--warning', '--danger', '--focus-ring', '--focus-shadow', '--shadow-card',
    ]) {
      expect(styles).toContain(`var(${token})`);
    }
  });

  it('keeps typography within the shared IBM Plex roles and approved hierarchy', () => {
    expect(styles).toContain('font-family: var(--font-ui)');
    expect(styles).toContain('font-family: var(--font-data)');
    expect(styles).not.toMatch(
      /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b|font-weight:\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})/i,
    );
  });

  it('uses theme-safe shared animation and print-view tokens', () => {
    expect(styles).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(styles).toContain('background: var(--skeleton-gradient)');
    expect(styles).toContain('color: var(--print-foreground)');
    expect(styles).toContain('background: var(--print-surface) !important');
    expect(styles).toContain('border-color: var(--print-border)');
  });

  it('preserves status semantics, responsive layouts, reduced motion, and print output', () => {
    expect(styles).toMatch(/\.status_pass\s*\{[^}]*var\(--shariah-compliant\)/);
    expect(styles).toMatch(/\.status_fail\s*\{[^}]*var\(--shariah-non-compliant\)/);
    expect(styles).toMatch(/\.status_review\s*\{[^}]*var\(--shariah-review\)/);
    expect(styles).toMatch(/\.status_unavailable\s*\{[^}]*var\(--shariah-insufficient\)/);
    expect(styles).toContain('@media (max-width: 390px)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('@media print');
    expect(styles).toContain('border-inline-start');
    expect(styles).toContain('padding-inline');
  });

  it('lets the shared wide page container own width and keeps sticky search below the header', () => {
    expect(styles).toContain('max-width: none');
    expect(styles).not.toContain('max-width: 1180px');
    expect(styles).not.toContain('safe-area-inset-bottom');
    expect(styles).toContain('top: calc(var(--global-header-height) + 12px)');
  });
});
