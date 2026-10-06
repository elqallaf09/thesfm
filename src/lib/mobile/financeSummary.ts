import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import {
  buildMonthlyHealthSnapshot,
  realizedExpenseRows,
  realizedIncomeRows,
  type FinancialRow,
} from '@/lib/dashboard/financialMetrics';
import {
  activeDebtRows,
  debtBalance,
  firstNumber,
  investmentValue,
  isCurrency,
  primaryInvestmentTotal,
  rowCurrency,
  sumRows,
} from '@/lib/dashboard/executiveOverview';

export type MobileFinanceSummary = {
  currency: string | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  monthlyNet: number | null;
  trackedPosition: number | null;
  activeDebtCount: number;
  refreshedAt: string;
};

export type MobileFinanceSummaryInput = {
  profile: FinancialRow | null;
  income: FinancialRow[];
  expenses: FinancialRow[];
  savings: FinancialRow[];
  investments: FinancialRow[];
  debts: FinancialRow[];
  now?: Date;
};

/**
 * Produces the deliberately small financial payload consumed by native apps.
 * The calculations are shared with the web dashboard so mobile cannot drift
 * from the product's treatment of recurring and unrealized transactions.
 */
export function buildMobileFinanceSummary(input: MobileFinanceSummaryInput): MobileFinanceSummary {
  const now = input.now ?? new Date();
  const currency = rowCurrency(input.profile ?? {}, ['default_currency', 'preferred_currency', 'currency']);
  const compatible = (row: FinancialRow) => Boolean(currency && isCurrency(row, currency));
  const incomeRows = personalIncomeRows(input.income);
  const expenseRows = personalExpenseRows(input.expenses);
  const plan = buildMonthlyHealthSnapshot(incomeRows, expenseRows, now, compatible);
  const activeDebts = activeDebtRows(input.debts).filter(compatible);
  const savingsRows = input.savings.filter(compatible);
  const valuedSavings = savingsRows.filter(row => firstNumber(row, ['current_amount', 'balance', 'amount']) !== null);
  const savingsComplete = valuedSavings.length === savingsRows.length;
  const debtBalancesComplete = activeDebts.every(row => debtBalance(row) !== null);
  const investmentValues = input.investments.map(row => investmentValue(row, currency));
  const investmentsComplete = investmentValues.every(value => value !== null && value.currency !== null);
  const investmentsTotal = primaryInvestmentTotal(input.investments, currency);
  const hasInvestmentValue = input.investments.some(row => investmentValue(row, currency)?.currency === currency);
  const savingsBalance = sumRows(valuedSavings, ['current_amount', 'balance', 'amount']);
  const debtBalanceTotal = activeDebts.reduce((total, row) => total + (debtBalance(row) ?? 0), 0);
  const positionReady = Boolean(currency) && savingsComplete && investmentsComplete && debtBalancesComplete
    && (valuedSavings.length > 0 || hasInvestmentValue || activeDebts.length > 0);
  const incomeReady = Boolean(currency) && plan.hasIncomeData && plan.incomeAmountsComplete;
  const expensesReady = Boolean(currency) && plan.hasExpenseData && plan.expenseAmountsComplete;

  return {
    currency,
    monthlyIncome: incomeReady ? plan.monthlyIncome : null,
    monthlyExpenses: expensesReady ? plan.monthlyExpenses : null,
    monthlyNet: incomeReady && expensesReady ? plan.monthlyIncome - plan.monthlyExpenses : null,
    trackedPosition: positionReady ? savingsBalance + investmentsTotal - debtBalanceTotal : null,
    activeDebtCount: activeDebts.length,
    refreshedAt: now.toISOString(),
  };
}

export function mobileFinanceRowsAreRealized(input: Pick<MobileFinanceSummaryInput, 'income' | 'expenses'>, now = new Date()) {
  return {
    income: realizedIncomeRows(personalIncomeRows(input.income), now),
    expenses: realizedExpenseRows(personalExpenseRows(input.expenses), now),
  };
}
