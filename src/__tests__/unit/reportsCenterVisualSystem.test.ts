import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const reportsCenterPage = readFileSync(
  join(process.cwd(), 'src/app/reports-center/page.tsx'),
  'utf8',
);
const reportsShortcutPage = readFileSync(
  join(process.cwd(), 'src/app/reports/page.tsx'),
  'utf8',
);
const reportsCenterStyles = reportsCenterPage.slice(
  reportsCenterPage.indexOf('const pageStyles = `'),
);

describe('Reports Center visual-system guard', () => {
  it('uses the centralized palette without a page-owned legacy theme', () => {
    expect(reportsCenterStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(reportsCenterStyles).not.toMatch(/(?:rgb|hsl)a?\(/i);
    expect(reportsCenterStyles).not.toMatch(/--sfm-|\.dark\b/i);
    expect(reportsCenterPage).not.toContain('variant="gold"');
    expect(reportsCenterStyles).toContain('background: var(--surface)');
    expect(reportsCenterStyles).toContain('background: var(--surface-muted)');
    expect(reportsCenterStyles).toContain('box-shadow: var(--shadow-card)');
  });

  it('keeps exactly one intentional branded hero gradient', () => {
    expect(reportsCenterStyles.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(reportsCenterStyles).not.toMatch(
      /(?:linear|radial|conic)-gradient\(/i,
    );
    expect(reportsCenterStyles).toMatch(
      /\.reports-hero \{[\s\S]*?background: var\(--hero-gradient\);/,
    );
    expect(reportsCenterStyles).toContain(
      'color: var(--hero-foreground-muted) !important',
    );
  });

  it('lets the shared workspace shell own the available width', () => {
    expect(reportsCenterStyles).toMatch(
      /\.reports-center-main \{[\s\S]*?width: 100% !important;[\s\S]*?margin: 0 !important;/,
    );
    expect(reportsCenterStyles).toContain(
      'padding: var(--workspace-page-padding-block) var(--workspace-page-padding-inline)',
    );
    expect(reportsCenterStyles).not.toMatch(
      /100vw|--sidebar|230px|calc\(100%\s*-/i,
    );
  });

  it('maps report statuses and focus states to semantic tokens', () => {
    expect(reportsCenterPage).not.toContain('STATUS_TONE');
    expect(reportsCenterPage).toContain(
      '<span className={`status-badge ${status}`}>',
    );
    expect(reportsCenterStyles).toContain('background: var(--success-soft)');
    expect(reportsCenterStyles).toContain('background: var(--warning-soft)');
    expect(reportsCenterStyles).toContain('background: var(--danger-soft)');
    expect(reportsCenterStyles).toContain('background: var(--info-soft)');
    expect(reportsCenterStyles).toContain(
      'outline: 2px solid var(--focus-ring)',
    );
    expect(reportsCenterStyles).toContain('box-shadow: var(--focus-shadow)');
  });

  it('keeps UI typography and financial data typography separated', () => {
    expect(reportsCenterStyles).toContain('font-family: var(--font-ui)');
    expect(reportsCenterStyles).toContain('font-family: var(--font-data)');
    expect(reportsCenterStyles).not.toMatch(/\b(?:Tajawal|Cairo|Arial)\b/i);
    expect(reportsCenterStyles).not.toMatch(
      /font(?:-weight|):\s*(?:[89]00|[7-9][5-9]0)/,
    );
    expect(reportsCenterStyles).toMatch(
      /\.pdf-report-table \.is-numeric \{[\s\S]*?font-family: var\(--font-data\);/,
    );
  });

  it('retains logical-direction, responsive, print, and reduced-motion rules', () => {
    expect(reportsCenterStyles).toContain('inset-inline-end: 0');
    expect(reportsCenterStyles).toContain('margin-inline-end: auto');
    expect(reportsCenterStyles).toContain('@media (max-width: 1200px)');
    expect(reportsCenterStyles).toContain('@media (max-width: 1024px)');
    expect(reportsCenterStyles).toContain('@media (max-width: 720px)');
    expect(reportsCenterStyles).toContain('@media (max-width: 430px)');
    expect(reportsCenterStyles).toContain(
      '@media (prefers-reduced-motion: reduce)',
    );
    expect(reportsCenterStyles).toContain('@media print');
  });

  it('retires the duplicate reports shortcut UI with a server redirect', () => {
    expect(reportsShortcutPage).toContain("redirect('/reports-center')");
    expect(reportsShortcutPage).not.toContain("'use client'");
    expect(reportsShortcutPage).not.toMatch(/<Link|<button|<style/);
  });
});
