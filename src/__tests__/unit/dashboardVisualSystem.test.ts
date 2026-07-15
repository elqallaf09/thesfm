import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const dashboardPage = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const dashboardStyles = dashboardPage.slice(dashboardPage.indexOf('const dashboardStyles = `'));

describe('main dashboard visual-system guard', () => {
  it('lets the workspace shell own the dashboard width', () => {
    expect(dashboardStyles).toContain('.dashboard-main {');
    expect(dashboardStyles).toContain('width: 100%');
    expect(dashboardStyles).toContain('max-width: 100%');
    expect(dashboardStyles).toContain('margin-inline: 0');
    expect(dashboardStyles).not.toContain('var(--sidebar-w');
    expect(dashboardStyles).not.toContain('100vw');
  });

  it('uses one centralized hero gradient and flat semantic surfaces elsewhere', () => {
    expect(dashboardStyles.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(dashboardStyles).toMatch(/\.reference-hero \{[\s\S]*?background: var\(--hero-gradient\);/);
    expect(dashboardStyles).toMatch(/\.hero-card \{[\s\S]*?background: var\(--surface\);/);
    expect(dashboardStyles).toContain('background: var(--surface)');
    expect(dashboardStyles).toContain('background: var(--surface-muted)');
    expect(dashboardStyles).toContain('box-shadow: var(--shadow-card)');
    expect(dashboardStyles).toContain('border-radius: var(--radius-card)');
    expect(dashboardStyles).not.toMatch(/(?:linear|radial)-gradient\(/i);
  });

  it('does not retain a page-owned palette or dark-mode override layer', () => {
    expect(dashboardStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(dashboardStyles).not.toMatch(/(?:rgb|hsl)a?\(/i);
    expect(dashboardStyles).not.toContain('.dark .dashboard');
    expect(dashboardStyles).not.toMatch(/--dashboard-|--sfm-/);
  });

  it('keeps UI and numeric typography scoped to their intended content', () => {
    expect(dashboardStyles).toContain('font-family: var(--font-ui)');
    expect(dashboardStyles.match(/font-family: var\(--font-data\)/g)).toHaveLength(1);
    expect(dashboardStyles).toMatch(/\.score-row strong \{[\s\S]*?font-family: var\(--font-data\);/);
    expect(dashboardStyles).not.toMatch(/font-family:\s*[^;]*(?:Tajawal|Cairo|Arial)/i);
  });

  it('maps focus and dashboard statuses to shared semantic tokens', () => {
    expect(dashboardStyles).toContain('outline: 2px solid var(--focus-ring)');
    expect(dashboardStyles).toContain('box-shadow: var(--focus-shadow)');
    expect(dashboardStyles).toContain('background: var(--success-soft)');
    expect(dashboardStyles).toContain('background: var(--warning-soft)');
    expect(dashboardStyles).toContain('background: var(--danger-soft)');
    expect(dashboardStyles).toContain('background: var(--info-soft)');
  });

  it('retains RTL directionality and responsive/reduced-motion behavior', () => {
    expect(dashboardStyles).toContain("[dir='rtl'] .action-link-icon svg");
    expect(dashboardStyles).toContain('@media (max-width: 1024px)');
    expect(dashboardStyles).toContain('@media (max-width: 640px)');
    expect(dashboardStyles).toContain('@media (max-width: 430px)');
    expect(dashboardStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
