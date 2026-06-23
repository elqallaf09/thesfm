import { describe, expect, it } from 'vitest';
import { estimatePayoffDateFromNextPayment } from '@/app/debts/_utils';

describe('debt payoff date estimate', () => {
  it('uses the displayed remaining monthly payments to calculate the payoff date', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 70)).toBe('2032-05-23');
  });

  it('adds one full monthly installment when one payment remains', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 1)).toBe('2026-08-23');
  });

  it('keeps mid-month payment days stable across uneven month lengths', () => {
    expect(estimatePayoffDateFromNextPayment('2026-01-15', 2)).toBe('2026-03-15');
  });

  it('clamps end-of-month payoff dates in leap years', () => {
    expect(estimatePayoffDateFromNextPayment('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('clamps end-of-month payoff dates in non-leap years', () => {
    expect(estimatePayoffDateFromNextPayment('2025-01-31', 1)).toBe('2025-02-28');
  });

  it('returns null when the next payment date is unavailable', () => {
    expect(estimatePayoffDateFromNextPayment('', 70)).toBeNull();
  });

  it('returns null when there are no remaining installments', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 0)).toBeNull();
  });
});
