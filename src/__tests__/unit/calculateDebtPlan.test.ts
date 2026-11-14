import { describe, expect, it } from 'vitest';
import { calculateDebtPlan } from '@/lib/debts/calculateDebtPlan';

function estimate(balance: number, rate: number, monthly: number) {
  const result = calculateDebtPlan({ balance: String(balance), rate: String(rate), monthly: String(monthly) });
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected a payable plan');
  expect(result.months).toBeGreaterThan(0);
  expect(result.finalPayment).toBeGreaterThan(0);
  expect(result.finalPayment).toBeLessThanOrEqual(monthly);
  expect(result.totalInterest).toBeGreaterThanOrEqual(0);
  for (const value of [result.months, result.finalPayment, result.totalPaid, result.totalInterest]) {
    expect(Number.isFinite(value)).toBe(true);
  }
  return result;
}

describe('debt plan estimate', () => {
  it('does not count a full installment for the zero-interest final payment', () => {
    expect(estimate(1000, 0, 300)).toMatchObject({ months: 4, finalPayment: 100, totalPaid: 1000, totalInterest: 0 });
  });

  it('keeps exact multiples and oversized payments interest-free at zero percent', () => {
    expect(estimate(1000, 0, 250)).toMatchObject({ months: 4, finalPayment: 250, totalPaid: 1000, totalInterest: 0 });
    expect(estimate(1000, 0, 2000)).toMatchObject({ months: 1, finalPayment: 1000, totalPaid: 1000, totalInterest: 0 });
  });

  it('includes only accrued interest with a partial final payment at a positive rate', () => {
    const result = estimate(1000, 12, 300);
    expect(result.months).toBe(4);
    expect(result.finalPayment).toBeCloseTo(122.48371, 7);
    expect(result.totalPaid).toBeCloseTo(1022.48371, 7);
    expect(result.totalInterest).toBeCloseTo(22.48371, 7);
    expect(estimate(1000, 12, 2000)).toMatchObject({ months: 1, finalPayment: 1010, totalPaid: 1010, totalInterest: 10 });
  });

  it('does not add a spurious month to an exactly amortizing payment', () => {
    const monthly = 1000 * 0.01 / -Math.expm1(-12 * Math.log1p(0.01));
    const result = estimate(1000, 12, monthly);
    expect(result.months).toBe(12);
    expect(result.totalPaid).toBeCloseTo(monthly * 12, 8);
  });

  it.each([1e-14, 1e-10, 0.00001])('remains stable for a tiny positive annual rate of %s', rate => {
    const result = estimate(1000, rate, 300);
    expect(result.months).toBe(4);
    expect(result.totalPaid).toBeCloseTo(1000, 3);
  });

  it.each(['balance', 'rate', 'monthly'] as const)('requires an explicit valid %s', field => {
    for (const value of ['', '   ', '-1', 'invalid', 'NaN', 'Infinity', '1e309']) {
      expect(calculateDebtPlan({ balance: '1000', rate: '0', monthly: '300', [field]: value })).toEqual({ status: 'invalid' });
    }
  });

  it.each(['balance', 'monthly'] as const)('requires positive %s', field => {
    expect(calculateDebtPlan({ balance: '1000', rate: '0', monthly: '300', [field]: '0' })).toEqual({ status: 'invalid' });
  });

  it.each(['9', '10'])('returns no estimate when payment %s does not exceed interest', monthly => {
    expect(calculateDebtPlan({ balance: '1000', rate: '12', monthly })).toEqual({ status: 'unpayable' });
  });

  it('handles huge finite values without overflowing displayed totals or looping', () => {
    expect(estimate(1e300, 12, 3e299).totalPaid / 1e300).toBeCloseTo(1.02248371, 8);
    expect(estimate(1e308, 0, 1e308).totalPaid).toBe(1e308);
    expect(calculateDebtPlan({ balance: '1e308', rate: '0', monthly: '0.1' })).toEqual({ status: 'invalid' });
    expect(calculateDebtPlan({ balance: '1e308', rate: '1200', monthly: '1.5e308' })).toEqual({ status: 'invalid' });
    expect(calculateDebtPlan({ balance: '1e308', rate: '1e308', monthly: '1e308' })).toEqual({ status: 'unpayable' });
  });

  it('matches an independent monthly payment simulation across rates and terms', () => {
    for (const balance of [1, 1000, 10653.633, 1e6]) {
      for (const rate of [0, 0.1, 7.25, 24]) {
        for (const principalFraction of [0.001, 0.01, 0.1, 0.3, 2]) {
          const monthly = balance * (rate / 1200 + principalFraction);
          let remaining = balance;
          let totalInterest = 0;
          let months = 0;
          let finalPayment = 0;
          while (remaining > balance * 1e-12 && months < 10000) {
            const interest = remaining * rate / 1200;
            finalPayment = Math.min(monthly, remaining + interest);
            totalInterest += interest;
            remaining = Math.max(0, remaining + interest - finalPayment);
            months += 1;
          }
          const result = estimate(balance, rate, monthly);
          expect(result.months).toBe(months);
          expect(result.finalPayment / balance).toBeCloseTo(finalPayment / balance, 9);
          expect(result.totalPaid / balance).toBeCloseTo((balance + totalInterest) / balance, 9);
        }
      }
    }
  });
});
