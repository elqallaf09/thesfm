import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('release boundary guard', () => {
  it('protects the market agent page as well as its API', () => {
    const middleware = read('src/middleware.ts');
    const accessPolicy = read('src/lib/auth/accessPolicy.ts');

    expect(middleware).toContain("'/market-agent'");
    expect(accessPolicy).toContain("'/api/market-agent'");
  });

  it('denies unused browser permissions consistently', () => {
    const middleware = read('src/middleware.ts');
    const nextConfig = read('next.config.ts');
    const expected = 'camera=(), microphone=(), geolocation=()';

    expect(middleware).toContain(expected);
    expect(nextConfig).toContain(expected);
    expect(middleware).not.toContain('microphone=(self)');
    expect(middleware).not.toContain('camera=(self)');
  });

  it('prevents contact responses from being stored by shared caches', () => {
    const contactRoute = read('src/app/api/contact/route.ts');

    expect(contactRoute.match(/'Cache-Control': 'private, no-store'/g)).toHaveLength(2);
  });

  it('keeps protected and capability URLs out of search indexes', () => {
    const robots = read('src/app/robots.ts');
    const marketAgentLayout = read('src/app/market-agent/layout.tsx');

    for (const route of ['/market-agent', '/company-listing', '/investor']) {
      expect(robots).toContain(`'${route}'`);
    }
    expect(marketAgentLayout).toContain('index: false');
    expect(marketAgentLayout).toContain('follow: false');
  });

  it('allows public education discovery while protecting the authenticated course', () => {
    const robots = read('src/app/robots.ts');
    const seo = read('src/lib/seo.ts');

    expect(robots).not.toContain("'/education',");
    expect(robots).toContain("'/education/investments'");
    expect(seo).toContain("'/education'");
    expect(seo).toContain("'/education/expenses'");
    expect(seo).toContain("'/education/savings'");
  });
});
