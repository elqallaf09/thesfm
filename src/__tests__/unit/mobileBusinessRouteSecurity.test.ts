import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/app/api/mobile/business/summary/route.ts'),
  'utf8',
);

describe('mobile business summary route security', () => {
  it('requires a user bearer token and keeps summary responses private', () => {
    expect(source).toContain('getUserFromBearerToken(token)');
    expect(source).toContain("'Cache-Control': 'private, no-store'");
    expect(source).toContain("code: 'UNAUTHORIZED'");
  });

  it('queries through the user token and preserves row ownership filters', () => {
    expect(source).toContain('Authorization: `Bearer ${token}`');
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).not.toContain('service_role');
  });
});
