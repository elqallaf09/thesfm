import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/app/dashboard/dashboard.module.css'), 'utf8');

describe('main dashboard visual-system guard', () => {
  it('lets the workspace shell own width without viewport or sidebar calculations', () => {
    expect(css).toMatch(/\.page \{[\s\S]*?inline-size: 100%/);
    expect(css).toContain('min-inline-size: 0');
    expect(css).not.toContain('var(--sidebar-w');
    expect(css).not.toContain('100vw');
    expect(page).toContain('data-dashboard-executive="true"');
  });

  it('uses the semantic visual system without a route-owned palette', () => {
    expect(css).toMatch(/\.hero,[\s\S]*?background: var\(--surface\)/);
    expect(css).toContain('box-shadow: var(--shadow-card)');
    expect(css).toContain('border-radius: var(--radius-card)');
    expect(css).toContain('background: var(--surface-muted)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:rgb|hsl)a?\(/i);
    expect(css).not.toContain('.dark .');
    expect(css).not.toMatch(/--dashboard-|--sfm-/);
  });

  it('preserves established UI typography and scopes data typography to values', () => {
    expect(css).toContain('font-family: var(--font-ui)');
    expect(css).toContain('font-family: var(--font-data)');
    expect(page).toContain('data-financial-value="true"');
    expect(css).not.toMatch(/font-family:\s*[^;]*(?:Tajawal|Cairo|Arial)/i);
  });

  it('maps focus and status treatments to shared semantic tokens', () => {
    expect(css).toContain('outline: 2px solid var(--focus-ring)');
    for (const token of ['success-soft', 'warning-soft', 'danger-soft', 'info-soft']) {
      expect(css).toContain(`var(--${token})`);
    }
    expect(css).toContain("[data-status='behind']");
  });

  it('supports RTL, narrow screens, practical controls, and reduced motion', () => {
    expect(css).toContain("[dir='rtl'] .sectionHeading a svg");
    for (const width of ['1279px', '1023px', '767px', '430px', '359px']) {
      expect(css).toContain(`@media (max-width: ${width})`);
    }
    expect(css).toContain('min-block-size: 44px');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
