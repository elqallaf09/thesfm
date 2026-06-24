import { describe, expect, it } from 'vitest';
import { estimatePayoffDateFromNextPayment } from '@/app/debts/_utils';
import { calculateDebtAmortization } from '@/lib/debts/calculateDebtAmortization';

function expectClose(actual: number, expected: number, precision = 3) {
  expect(actual).toBeCloseTo(expected, precision);
}

describe('debt payoff date estimate', () => {
  it('uses the displayed remaining monthly payments to calculate the payoff date', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 70)).toBe('2032-04-23');
  });

  it('uses the next payment date when one payment remains', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 1)).toBe('2026-07-23');
  });

  it('keeps mid-month payment days stable across uneven month lengths', () => {
    expect(estimatePayoffDateFromNextPayment('2026-01-15', 2)).toBe('2026-02-15');
  });

  it('clamps end-of-month payoff dates in leap years', () => {
    expect(estimatePayoffDateFromNextPayment('2024-01-31', 2)).toBe('2024-02-29');
  });

  it('clamps end-of-month payoff dates in non-leap years', () => {
    expect(estimatePayoffDateFromNextPayment('2025-01-31', 2)).toBe('2025-02-28');
  });

  it('returns null when the next payment date is unavailable', () => {
    expect(estimatePayoffDateFromNextPayment('', 70)).toBeNull();
  });

  it('returns null when there are no remaining installments', () => {
    expect(estimatePayoffDateFromNextPayment('2026-07-23', 0)).toBeNull();
  });
});

describe('debt reducing-balance amortization', () => {
  it('matches the confirmed remaining-balance payoff example', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 11646.700,
      remainingBalance: 10653.633,
      annualInterestRate: 7.25,
      monthlyPayment: 105.754,
      nextPaymentDate: '2026-07-23',
      totalPaidAmount: 2749.604,
      totalInterestPaid: 1756.537,
      totalPrincipalPaid: 993.067,
    });

    expectClose(result.totalPaid, 2749.604);
    expectClose(result.principalPaid, 993.067);
    expectClose(result.interestPaid, 1756.537);
    expectClose(result.repaymentProgressPercent, 8.5266);
    expect(result.remainingPayments).toBe(156);
    expect(result.expectedPayoffDate).toBe('2039-06-23');
    expectClose(result.finalPaymentAmount ?? 0, 78.657, 2);
    expect(result.isPaymentSufficient).toBe(true);
  });

  it('calculates zero-interest debt from balance divided by payment', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 1000,
      remainingBalance: 450,
      annualInterestRate: 0,
      interestType: 'none',
      monthlyPayment: 100,
      nextPaymentDate: '2026-01-10',
    });

    expect(result.remainingPayments).toBe(5);
    expect(result.expectedPayoffDate).toBe('2026-05-10');
    expectClose(result.finalPaymentAmount ?? 0, 50);
    expectClose(result.totalRemainingInterest, 0);
  });

  it('flags an insufficient monthly payment', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 10000,
      remainingBalance: 10000,
      annualInterestRate: 12,
      monthlyPayment: 100,
      nextPaymentDate: '2026-01-01',
    });

    expect(result.isPaymentSufficient).toBe(false);
    expect(result.remainingPayments).toBeNull();
    expect(result.expectedPayoffDate).toBeNull();
    expect(result.warning).toBe('monthly_payment_below_interest');
  });

  it('reduces remaining payments when an extra payment amount is used', () => {
    const base = calculateDebtAmortization({
      originalPrincipal: 5000,
      remainingBalance: 5000,
      annualInterestRate: 6,
      monthlyPayment: 150,
      nextPaymentDate: '2026-01-15',
    });
    const extra = calculateDebtAmortization({
      originalPrincipal: 5000,
      remainingBalance: 5000,
      annualInterestRate: 6,
      monthlyPayment: 250,
      nextPaymentDate: '2026-01-15',
    });

    expect(extra.remainingPayments ?? 0).toBeLessThan(base.remainingPayments ?? 0);
  });

  it('uses partial and extra recorded payments for paid totals', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 1000,
      remainingBalance: 700,
      annualInterestRate: 5,
      monthlyPayment: 100,
      nextPaymentDate: '2026-03-01',
      paymentHistory: [
        { amount: 50, interestAmount: 4, principalAmount: 46, paymentDate: '2026-01-01' },
        { amount: 275, interestAmount: 21, principalAmount: 254, paymentDate: '2026-02-01' },
      ],
    });

    expectClose(result.totalPaid, 325);
    expectClose(result.principalPaid, 300);
    expectClose(result.interestPaid, 25);
  });

  it('calculates a smaller final payment', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 240,
      remainingBalance: 240,
      annualInterestRate: 0,
      interestType: 'none',
      monthlyPayment: 100,
      nextPaymentDate: '2026-01-01',
    });

    expect(result.remainingPayments).toBe(3);
    expectClose(result.finalPaymentAmount ?? 0, 40);
  });

  it('supports changed interest rates by recalculating from the current balance', () => {
    const lowerRate = calculateDebtAmortization({
      originalPrincipal: 2000,
      remainingBalance: 1800,
      annualInterestRate: 3,
      monthlyPayment: 120,
      nextPaymentDate: '2026-01-20',
    });
    const higherRate = calculateDebtAmortization({
      originalPrincipal: 2000,
      remainingBalance: 1800,
      annualInterestRate: 10,
      monthlyPayment: 120,
      nextPaymentDate: '2026-01-20',
    });

    expect(higherRate.remainingPayments ?? 0).toBeGreaterThan(lowerRate.remainingPayments ?? 0);
  });

  it('keeps paused debts calculable without mutating their payment data', () => {
    const result = calculateDebtAmortization({
      originalPrincipal: 1200,
      remainingBalance: 600,
      annualInterestRate: 0,
      interestType: 'none',
      monthlyPayment: 200,
      nextPaymentDate: '2026-04-05',
    });

    expect(result.remainingPayments).toBe(3);
    expect(result.expectedPayoffDate).toBe('2026-06-05');
  });
});
