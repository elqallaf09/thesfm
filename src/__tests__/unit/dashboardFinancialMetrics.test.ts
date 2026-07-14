import { describe, expect, it } from 'vitest';
import {
  buildLinePoints,
  buildMonthlyCashFlow,
  buildMonthlyHealthSnapshot,
  calculateFinancialHealth,
  calculateFinancialHealthIndicators,
  monthOverMonthChange,
  realizedIncomeRows,
} from '@/lib/dashboard/financialMetrics';

describe('dashboard financial metrics', () => {
  const now = new Date(2026, 6, 14, 12);

  it('excludes future and unreceived income instead of inflating totals', () => {
    const rows = [
      { amount: 100, received_date: '2026-07-10', status: 'received' },
      { amount: 900, received_date: '2026-08-01', status: 'expected' },
      { amount: 700, received_date: '2026-07-12', status: 'pending' },
    ];
    expect(realizedIncomeRows(rows, now)).toEqual([rows[0]]);
  });

  it('builds the twelve-month cash flow exclusively from dated realized records', () => {
    const points = buildMonthlyCashFlow(
      [{ amount: 500, received_date: '2026-06-05', status: 'received' }, { amount: 800, received_date: '2026-08-05', status: 'expected' }],
      [{ amount: 200, expense_date: '2026-06-08' }, { amount: 50, expense_date: '2026-07-02' }],
      now,
    );
    expect(points).toHaveLength(12);
    expect(points.at(-2)).toMatchObject({ key: '2026-06', income: 500, expenses: 200 });
    expect(points.at(-1)).toMatchObject({ key: '2026-07', income: 0, expenses: 50 });
  });

  it('refuses to invent a health score when a required source is missing', () => {
    expect(calculateFinancialHealth({
      monthlyIncome: 1000,
      monthlyExpenses: 600,
      savingsBalance: 3000,
      monthlyDebtPayments: 100,
      hasIncomeData: true,
      hasExpenseData: true,
      hasSavingsData: false,
      debtsLoaded: true,
    })).toBeNull();
  });

  it('derives health and comparison values from the supplied financial facts', () => {
    const health = calculateFinancialHealth({
      monthlyIncome: 1000,
      monthlyExpenses: 800,
      savingsBalance: 2400,
      monthlyDebtPayments: 300,
      hasIncomeData: true,
      hasExpenseData: true,
      hasSavingsData: true,
      debtsLoaded: true,
    });
    expect(health).toMatchObject({ score: 73, savingsRatio: 0.2, expenseCoverage: 1.25, emergencyFundMonths: 3, debtToIncome: 0.3 });
    expect(monthOverMonthChange(120, 100, true, true)).toBeCloseTo(0.2);
    expect(monthOverMonthChange(120, 0, true, true)).toBeNull();
    expect(buildLinePoints([100, 200, 150])).not.toBe('');
  });

  it('uses active recurring plans for the current health snapshot without counting generated income children twice', () => {
    const snapshot = buildMonthlyHealthSnapshot(
      [
        { id: 'salary', amount: 1000, status: 'expected', is_recurring: true, frequency: 'monthly', start_date: '2026-05-01' },
        { id: 'salary-july', parent_recurring_income_id: 'salary', amount: 1000, status: 'expected', is_recurring: true, frequency: 'monthly', start_date: '2026-05-01', generated_for_date: '2026-07-01' },
      ],
      [
        { id: 'rent', amount: 600, is_recurring: true, frequency: 'monthly', start_date: '2026-01-01', date: '2026-01-01' },
      ],
      now,
    );

    expect(snapshot).toEqual({ monthlyIncome: 1000, monthlyExpenses: 600, hasIncomeData: true, hasExpenseData: true });
  });

  it('keeps available health indicators visible when another required score input is missing', () => {
    expect(calculateFinancialHealthIndicators({
      monthlyIncome: 1000,
      monthlyExpenses: 500,
      savingsBalance: 0,
      monthlyDebtPayments: 100,
      hasIncomeData: true,
      hasExpenseData: true,
      hasSavingsData: false,
      debtsLoaded: true,
    })).toEqual({ savingsRatio: 0.5, expenseCoverage: 2, emergencyFundMonths: null, debtToIncome: 0.1 });
  });
});
