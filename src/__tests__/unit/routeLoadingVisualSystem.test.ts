import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const errorSource = readFileSync(
  join(process.cwd(), 'src/components/loading/RouteError.tsx'),
  'utf8',
);
const skeletonSource = readFileSync(
  join(process.cwd(), 'src/components/loading/RouteSkeleton.tsx'),
  'utf8',
);

describe('shared route loading and error visual-system contract', () => {
  it('uses semantic tokens for the production error state', () => {
    expect(errorSource).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
    expect(errorSource).toContain("color: 'var(--foreground-muted)'");
    expect(errorSource).toContain("background: 'var(--primary)'");
    expect(errorSource).toContain("color: 'var(--primary-foreground)'");
  });

  it('inherits document direction so Arabic, English, and French remain correct', () => {
    expect(skeletonSource).not.toMatch(/dir=["'](?:rtl|ltr)["']/);
  });
});
