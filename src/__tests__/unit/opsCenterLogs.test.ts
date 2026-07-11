import { describe, expect, it } from 'vitest';

import { safeLogDetail } from '@/app/sfm-admin-control/market-diagnostics/tabs/LogsTab';

describe('Operations Center log disclosure', () => {
  it('redacts credentials in common URL, header, JSON, and connection-string forms', () => {
    const detail = safeLogDetail([
      'https://example.test/run?api_key=query-secret',
      'Authorization: Bearer header-secret',
      '{"access_token":"json-secret","password":"json-password"}',
      'https://db-user:db-password@example.test/database',
    ].join(' '));

    expect(detail).not.toContain('query-secret');
    expect(detail).not.toContain('header-secret');
    expect(detail).not.toContain('json-secret');
    expect(detail).not.toContain('json-password');
    expect(detail).not.toContain('db-password');
    expect(detail).toContain('[redacted]');
  });

  it('preserves safe context, limits output length, and has an explicit empty value', () => {
    expect(safeLogDetail(null)).toBe('\u2014');
    expect(safeLogDetail('provider timeout after 5 seconds')).toBe('provider timeout after 5 seconds');
    expect(safeLogDetail('x'.repeat(2_100))).toHaveLength(2_000);
  });
});
