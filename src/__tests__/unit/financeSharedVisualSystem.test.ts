import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'src/components/finance/_helpers.ts'),
  'utf8',
);
const styles = source.slice(source.indexOf('export const baseStyles = `'));
const baseStyles = styles.slice(0, styles.indexOf('export const expenseSmartStyles = `'));
const expenseStyles = styles.slice(styles.indexOf('export const expenseSmartStyles = `'));

describe('shared Personal Finance visual-system guard', () => {
  it('uses the centralized palette without route-owned dark overrides', () => {
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(styles).not.toMatch(/(?:rgb|hsl)a?\(/i);
    expect(styles).not.toMatch(/(?:linear|radial)-gradient\(/i);
    expect(styles).not.toContain('.dark');
    expect(styles).not.toMatch(/var\(--sfm-/);
  });

  it('keeps one intentional hero surface for each finance route family', () => {
    expect(styles.match(/var\(--hero-gradient\)/g)).toHaveLength(2);
    expect(baseStyles).toMatch(/\.hero\{[^{}]*background:var\(--hero-gradient\)/);
    expect(expenseStyles).toMatch(
      /\.expense-hero\{[^{}]*background:var\(--hero-gradient\)/,
    );
    expect(styles).toContain('background:var(--surface)');
    expect(styles).toContain('background:var(--surface-muted)');
    expect(styles).toContain('box-shadow:var(--shadow-card)');
  });

  it('lets the workspace shell own width in expanded, collapsed, RTL, and LTR layouts', () => {
    expect(baseStyles).toContain(
      '.sfm-main{flex:1;width:100%;max-width:100%;min-width:0;margin:0;',
    );
    expect(expenseStyles).toContain(
      '.expense-smart-main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;',
    );
    expect(styles).not.toMatch(/100vw|sidebar-w|230px/);
    expect(styles).toContain('[dir="rtl"] .switch.active span');
    expect(styles).toContain('[dir="ltr"] .sfm-sidebar');
  });

  it('keeps UI typography separate from numeric financial typography', () => {
    expect(styles).toContain('font-family:var(--font-ui)');
    expect(styles).toMatch(/\.money-amount\{font-family:var\(--font-data\)/);
    expect(styles).toMatch(/\.expense-row-amount>b\{font-family:var\(--font-data\)/);
    expect(styles).toMatch(/\.monthly-grid b\{font-family:var\(--font-data\)/);
    expect(styles).not.toMatch(/Tajawal|Arial|font-(?:weight:)?(?:800|850|900|950)/i);
  });

  it('maps controls, statuses, modal depth, and focus to semantic tokens', () => {
    expect(styles).toContain('outline:2px solid var(--focus-ring)');
    expect(styles).toContain('box-shadow:var(--focus-shadow)');
    expect(styles).toContain('background:var(--success-soft)');
    expect(styles).toContain('background:var(--warning-soft)');
    expect(styles).toContain('background:var(--danger-soft)');
    expect(styles).toContain('background:var(--info-soft)');
    expect(baseStyles).toContain('box-shadow:var(--shadow-popover)');
    expect(expenseStyles).toContain('.receipt-drop{');
    expect(expenseStyles).toContain('.receipt-attach-card{');
    expect(expenseStyles).toContain('.ai-result-card{');
  });

  it('keeps shared actions and selected tabs readable in light and dark themes', () => {
    expect(baseStyles).toMatch(
      /\.chat-box button\{[^{}]*background:var\(--primary\);color:var\(--primary-foreground\)/,
    );
    expect(baseStyles).toContain(
      '.chat-box button:hover:not(:disabled){background:var(--primary-hover)}',
    );
    expect(baseStyles).toMatch(
      /\.data-error-notice button\{[^{}]*background:var\(--primary\);color:var\(--primary-foreground\)/,
    );
    expect(expenseStyles).toMatch(
      /\.expense-modal-tabs button\.active\{[^{}]*background:var\(--primary-soft\);color:var\(--foreground\)/,
    );
    expect(styles).not.toContain(
      'background:var(--foreground);color:var(--accent)',
    );
  });

  it('retains the established responsive and reduced-motion behavior', () => {
    for (const breakpoint of ['1180px', '920px', '640px']) {
      expect(baseStyles).toContain(`@media(max-width:${breakpoint})`);
      expect(expenseStyles).toContain(`@media(max-width:${breakpoint})`);
    }
    expect(baseStyles).toContain('@media(prefers-reduced-motion:reduce)');
    expect(expenseStyles).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
