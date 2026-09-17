import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  'src/lib/investments/canonicalReadiness.server.ts',
  'utf8',
);

describe('investment cutover readiness server scan', () => {
  it('requests exact counts for every privileged readiness query', () => {
    expect(source.match(/count: 'exact'/g)).toHaveLength(3);
  });

  it('fails closed when any readiness scan is truncated or has no exact count', () => {
    expect(source).toContain("typeof scan.count !== 'number' || scan.count !== loaded");
    expect(source).toContain('INVESTMENT_READINESS_SCAN_INCOMPLETE');
    expect(source).toContain("assertCompleteScan('legacy', legacy)");
    expect(source).toContain("assertCompleteScan('canonical', canonical)");
    expect(source).toContain("assertCompleteScan('checks', checks)");
  });

  it('keeps every privileged query explicitly owner-scoped', () => {
    expect(source.match(/\.eq\('user_id', userId\)/g)).toHaveLength(3);
  });
});
