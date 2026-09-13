import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('production policy cleanup', () => {
  it('keeps middleware browser permissions as restrictive as the global headers', () => {
    const middleware = read('src/middleware.ts');
    const nextConfig = read('next.config.ts');
    const restrictive = 'camera=(), microphone=(), geolocation=()';

    expect(middleware).toContain(restrictive);
    expect(nextConfig).toContain(restrictive);
    expect(middleware).not.toContain('microphone=(self), camera=(self)');
  });

  it('generates route inventory from source instead of preserving stale route counts', () => {
    const packageJson = read('package.json');
    const docs = read('docs/route-inventory.md');

    expect(packageJson).toContain('"routes:inventory": "node scripts/release/generate-route-inventory.mjs"');
    expect(docs).toContain('pnpm routes:inventory');
    expect(docs).toContain('exact commit SHA');
    expect(docs).not.toContain('Page routes | 132');
    expect(docs).not.toContain('Route handlers total | 172');
  });
});
