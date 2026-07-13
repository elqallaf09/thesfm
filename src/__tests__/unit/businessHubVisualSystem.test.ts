import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const businessHubPage = read('src/app/business-hub/page.tsx');
const businessHubStyles = read('src/app/business-hub/_styles.ts');
const visualBaseline = JSON.parse(read('scripts/visual-system-legacy-baseline.json')) as {
  files: Record<string, Record<string, number>>;
};

describe('business hub visual system', () => {
  it('uses the shared wide workspace container and page-only semantic stylesheet', () => {
    expect(businessHubPage).toContain('<WorkspacePageContainer as="main" variant="wide" className="business-hub-main">');
    expect(businessHubPage).toContain("import { BUSINESS_HUB_STYLES } from './_styles';");
    expect(businessHubPage.match(/<style>\{BUSINESS_HUB_STYLES\}<\/style>/g)).toHaveLength(3);
    expect(businessHubPage).not.toContain('const styles = `');
    expect(businessHubPage).not.toContain('<style>{styles}</style>');
  });

  it('consumes centralized surfaces, typography, status, focus, and depth tokens', () => {
    expect(businessHubStyles).toContain('font-family: var(--font-ui)');
    expect(businessHubStyles).toContain('font-family: var(--font-data)');
    expect(businessHubStyles).toContain('background: var(--surface-elevated)');
    expect(businessHubStyles).toContain('background: var(--surface-muted)');
    expect(businessHubStyles).toContain('color: var(--foreground-muted)');
    expect(businessHubStyles).toContain('background: var(--success-soft)');
    expect(businessHubStyles).toContain('background: var(--warning-soft)');
    expect(businessHubStyles).toContain('background: var(--danger-soft)');
    expect(businessHubStyles).toContain('outline: 2px solid var(--focus-ring)');
    expect(businessHubStyles).toContain('box-shadow: var(--shadow-card)');
  });

  it('keeps one intentional semantic hero and removes the page-local legacy palette', () => {
    expect(businessHubStyles.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(businessHubStyles).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
    expect(businessHubStyles).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(businessHubStyles).not.toMatch(/--sfm-|\b(?:Tajawal|Cairo|Arial|Helvetica|Inter)\b/i);
    expect(businessHubStyles).not.toMatch(/font-weight:\s*(?:8|9)\d{2}/);
    expect(businessHubStyles).not.toMatch(/\.dark\b|html\.dark/i);
    expect(visualBaseline.files).not.toHaveProperty('src/app/business-hub/page.tsx');
  });

  it('uses shared radius and shadow tokens for every visual-depth declaration', () => {
    const radii = [...businessHubStyles.matchAll(/border-radius:\s*([^;]+);/g)].map(match => match[1].trim());
    const shadows = [...businessHubStyles.matchAll(/box-shadow:\s*([^;]+);/g)].map(match => match[1].trim());

    expect(radii.length).toBeGreaterThan(0);
    expect(radii.every(value => /^var\(--radius-/.test(value))).toBe(true);
    expect(shadows.length).toBeGreaterThan(0);
    expect(shadows.every(value => /^var\(--(?:shadow|focus-shadow)/.test(value))).toBe(true);
  });

  it('preserves RTL, responsive stacking, and shell-owned width behavior', () => {
    expect(businessHubStyles).toContain('[dir="rtl"] .funding-layout > * { direction: rtl; }');
    expect(businessHubStyles).toContain('@media (max-width: 1260px)');
    expect(businessHubStyles).toContain('@media (max-width: 1024px)');
    expect(businessHubStyles).toContain('@media (max-width: 720px)');
    expect(businessHubStyles).not.toMatch(/100vw|calc\(100vw|--sidebar|margin-(?:left|right)/i);
  });

  it('keeps secondary module headers flat while preserving a clear accent edge', () => {
    expect(businessHubStyles).toMatch(/\.funding-header,[\s\S]*?\.documents-header \{[\s\S]*?border-inline-start: 4px solid var\(--primary\);[\s\S]*?background: var\(--surface-elevated\);/);
    expect(businessHubStyles).toMatch(/\.module-links a,[\s\S]*?\.module-link-button \{[\s\S]*?background: var\(--surface-muted\);/);
  });
});
