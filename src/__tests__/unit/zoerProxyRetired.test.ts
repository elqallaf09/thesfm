import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/zoer_proxy/[...path]/route.ts', 'utf8');

describe('legacy Zoer proxy retirement', () => {
  it('does not forward requests or read/inject server credentials', () => {
    expect(route).toContain("code: 'ZOER_PROXY_RETIRED'");
    expect(route).toContain('status: 410');
    expect(route).not.toContain('POSTGREST_API_KEY');
    expect(route).not.toContain('api.zoer.ai');
    expect(route).not.toMatch(/fetch\s*\(/);
  });
});
