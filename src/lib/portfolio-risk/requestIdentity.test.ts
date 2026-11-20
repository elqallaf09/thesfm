import { describe, expect, it } from 'vitest';
import { sameRiskRequestIdentity } from './requestIdentity';

describe('historical result credential and owner isolation', () => {
  it('accepts only the same owner and credential', () => {
    expect(sameRiskRequestIdentity({ owner: 'a', token: 'a1' }, 'a', 'a1')).toBe(true);
    expect(sameRiskRequestIdentity({ owner: 'a', token: 'a1' }, 'b', 'a1')).toBe(false);
    expect(sameRiskRequestIdentity({ owner: 'a', token: 'a1' }, 'a', 'a2')).toBe(false);
    expect(sameRiskRequestIdentity({ owner: 'a', token: 'a1' }, 'a', undefined)).toBe(false);
  });
  it('never shows a previous response after logout, including a cookie session', () => {
    expect(sameRiskRequestIdentity({ owner: 'a' }, '')).toBe(false);
    expect(sameRiskRequestIdentity({ owner: '' }, '')).toBe(false);
    expect(sameRiskRequestIdentity({ owner: 'a' }, 'b')).toBe(false);
    expect(sameRiskRequestIdentity({ owner: 'a' }, 'a')).toBe(true);
  });
});
