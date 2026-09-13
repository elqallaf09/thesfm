import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('production cleanup stage 1', () => {
  it('keeps paid membership subscription interfaces hidden', () => {
    const flags = read('src/app/temporary-product-flags.css');
    const layout = read('src/app/layout.tsx');

    expect(layout).toContain("import './temporary-product-flags.css';");
    expect(flags).toContain('.landing-page #pricing');
    expect(flags).toContain('.landing-page .landing-links a[href="#pricing"]');
    expect(flags).toContain('.profile-section:has(.premium-layout)');
    expect(flags).toContain('display: none !important');
  });

  it('gives Global Markets its own canonical metadata and sitemap entry', () => {
    const layout = read('src/app/global-markets/layout.tsx');
    const seo = read('src/lib/seo.ts');

    expect(layout).toContain("path: '/global-markets'");
    expect(layout).toContain('مركز الأسواق العالمية | THE SFM');
    expect(seo).toContain("'/global-markets'");
  });
});
