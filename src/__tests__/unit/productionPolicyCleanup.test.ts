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

  it('fails launch policy for page routes that have no platform ownership classification', () => {
    const packageJson = read('package.json');
    const routeGate = read('scripts/check-page-route-ownership.mjs');

    expect(packageJson).toContain('"check:page-routes": "node scripts/check-page-route-ownership.mjs"');
    expect(packageJson).toContain('node scripts/check-api-route-policy.mjs && node scripts/check-page-route-ownership.mjs');
    expect(routeGate).toContain('Page route ownership check failed');
    expect(routeGate).toContain('protectedPrefixes');
    expect(routeGate).toContain('workspacePrefixes');
    expect(routeGate).toContain('publicShellRoutes');
  });

  it('pins Vercel to the same Node major used by CI', () => {
    const packageJson = read('package.json');
    const ci = read('.github/workflows/ci.yml');

    expect(packageJson).toContain('"node": "22.x"');
    expect(ci).toContain('node-version: 22.13.0');
  });
});
