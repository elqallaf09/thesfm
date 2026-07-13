import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/app/projects/ad-calculator/page.tsx'),
  'utf8',
);

describe('advertising calculator visual-system contract', () => {
  it('uses shared semantic colors and the approved font roles', () => {
    expect(source).toContain('font-family:var(--font-ui)');
    expect(source).toContain("fontFamily: 'var(--font-data)'");
    expect(source).toContain('var(--surface)');
    expect(source).toContain('var(--border)');
    expect(source).toContain('var(--focus-ring)');
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(source).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/i);
  });

  it('keeps controls labelled, focusable, and mobile-safe', () => {
    expect(source).toContain('htmlFor="ad-total-budget"');
    expect(source).toContain('htmlFor="ad-duration-days"');
    expect(source).toContain('htmlFor="ad-industry"');
    expect(source).toContain('aria-label={`${platform.name}: ${t(\'ad_total_allocation\')}`}');
    expect(source).toContain('min-height:44px');
    expect(source).toContain('overflow-x:auto');
    expect(source).toContain('@media(max-width:760px)');
  });
});
