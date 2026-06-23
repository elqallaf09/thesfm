import { describe, expect, it } from 'vitest';
import { estimatePayoffDateFromNextPayment } from '@/app/debts/_utils';

describe('debt payoff date estimate', () => {
  it('uses the displayed remaining monthly payments to calculate the payoff date', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 70)).toBe('2032-04-23');
  });

  it('keeps a single remaining payment on the next payment date', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 1)).toBe('2026-07-23');
  });

  it('returns null when the next payment date is unavailable', () => {
    expect(estimatePayoffDateFromNextPayment('', 70)).toBeNull();
  });
});
