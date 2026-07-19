import { describe, expect, it } from 'vitest';
import { isCronApiPath } from '@/lib/auth/accessPolicy';

describe('cron API allowlist', () => {
  it('allows only exact state-changing cron routes', () => {
    expect(isCronApiPath('/api/debts/generate-monthly-expenses')).toBe(true);
    expect(isCronApiPath('/api/market/signals/refresh')).toBe(true);
    expect(isCronApiPath('/api/intelligence/outcomes/evaluate')).toBe(true);
    expect(isCronApiPath('/api/thesfm-trader/scanner/run')).toBe(true);
    expect(isCronApiPath('/api/thesfm-trader/status')).toBe(false);
    expect(isCronApiPath('/api/admin')).toBe(false);
  });
});
