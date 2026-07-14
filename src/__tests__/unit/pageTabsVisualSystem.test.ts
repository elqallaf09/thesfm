import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/layout/PageTabs.tsx'), 'utf8');

describe('shared PageTabs visual and sticky contract', () => {
  it('uses the global header height and shared semantic surfaces', () => {
    expect(source).toContain('calc(var(--global-header-height) + 8px)');
    expect(source).not.toContain('calc(74px + env(safe-area-inset-top))');
    expect(source).toContain('background: var(--primary-soft)');
    expect(source).toContain('box-shadow: var(--active-indicator-shadow)');
  });

  it('keeps tabs flat and uses only the shared UI font and tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial|Inter)\b/i);
    expect(source).not.toMatch(/font(?:-weight|\s*):\s*(?:8\d{2}|9\d{2})/i);
    expect(source).toContain('var(--font-ui)');
    expect(source).toContain('var(--focus-shadow)');
  });
});
