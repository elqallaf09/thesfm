import type { MobileRecord } from '../../../src/lib/mobile/resourceContract';

type CurrencyTotals = {
  currency: string;
  receivedIncome: number;
  expectedIncome: number;
  expenses: number;
  savings: number;
  debtOutstanding: number;
  completedSales: number;
  pendingSales: number;
  paidInvoices: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  operatingExpenses: number;
};

export type FinanceReport = {
  currencies: CurrencyTotals[];
  incomeCount: number;
  expenseCount: number;
  savingsCount: number;
  debtCount: number;
  goalCount: number;
  undatedRecords: number;
};

export type BusinessReport = {
  currencies: CurrencyTotals[];
  projectCount: number;
  customerCount: number;
  supplierCount: number;
  employeeCount: number;
  openInvoiceCount: number;
  undatedRecords: number;
};

const currencyCode = (record: MobileRecord) => {
  const value = typeof record.currency === 'string' ? record.currency.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(value) ? value : null;
};
const positive = (record: MobileRecord, key: string) => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
};
const inPeriod = (record: MobileRecord, key: string, period: string) => typeof record[key] === 'string' && record[key].startsWith(`${period}-`);
const freshTotals = (currency: string): CurrencyTotals => ({ currency, receivedIncome: 0, expectedIncome: 0, expenses: 0, savings: 0, debtOutstanding: 0, completedSales: 0, pendingSales: 0, paidInvoices: 0, outstandingInvoices: 0, overdueInvoices: 0, operatingExpenses: 0 });
const totalsFor = (values: Map<string, CurrencyTotals>, currency: string) => {
  const current = values.get(currency) ?? freshTotals(currency);
  values.set(currency, current);
  return current;
};
const list = (values: Map<string, CurrencyTotals>) => [...values.values()].sort((left, right) => left.currency.localeCompare(right.currency));

export function financeReport(period: string, data: { income: MobileRecord[]; expenses: MobileRecord[]; savings: MobileRecord[]; debts: MobileRecord[]; goals: MobileRecord[] }): FinanceReport {
  const values = new Map<string, CurrencyTotals>(); let undatedRecords = 0;
  for (const record of data.income) {
    if (!inPeriod(record, 'received_date', period)) { if (typeof record.received_date !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount == null || !currency) continue;
    const totals = totalsFor(values, currency);
    if (record.status === 'expected') totals.expectedIncome += amount;
    else totals.receivedIncome += amount;
  }
  for (const record of data.expenses) {
    if (!inPeriod(record, 'date', period)) { if (typeof record.date !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount != null && currency) totalsFor(values, currency).expenses += amount;
  }
  for (const record of data.savings) {
    if (!inPeriod(record, 'saved_at', period)) { if (typeof record.saved_at !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount != null && currency) totalsFor(values, currency).savings += amount;
  }
  for (const record of data.debts) {
    const amount = positive(record, 'remaining_amount'); const currency = currencyCode(record);
    if (amount != null && currency) totalsFor(values, currency).debtOutstanding += amount;
  }
  return { currencies: list(values), incomeCount: data.income.length, expenseCount: data.expenses.length, savingsCount: data.savings.length, debtCount: data.debts.length, goalCount: data.goals.length, undatedRecords };
}

export function businessReport(period: string, data: { projects: MobileRecord[]; customers: MobileRecord[]; suppliers: MobileRecord[]; sales: MobileRecord[]; invoices: MobileRecord[]; employees: MobileRecord[]; operatingExpenses: MobileRecord[] }): BusinessReport {
  const values = new Map<string, CurrencyTotals>(); let undatedRecords = 0;
  for (const record of data.sales) {
    if (!inPeriod(record, 'sale_date', period)) { if (typeof record.sale_date !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount == null || !currency) continue;
    const totals = totalsFor(values, currency);
    if (record.status === 'completed') totals.completedSales += amount;
    else if (record.status === 'pending') totals.pendingSales += amount;
  }
  for (const record of data.invoices) {
    if (!inPeriod(record, 'invoice_date', period)) { if (typeof record.invoice_date !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount == null || !currency) continue;
    const totals = totalsFor(values, currency);
    if (record.status === 'paid') totals.paidInvoices += amount;
    else if (record.status === 'sent' || record.status === 'overdue') {
      totals.outstandingInvoices += amount;
      if (record.status === 'overdue') totals.overdueInvoices += amount;
    }
  }
  for (const record of data.operatingExpenses) {
    if (!inPeriod(record, 'expense_date', period)) { if (typeof record.expense_date !== 'string') undatedRecords += 1; continue; }
    const amount = positive(record, 'amount'); const currency = currencyCode(record);
    if (amount != null && currency) totalsFor(values, currency).operatingExpenses += amount;
  }
  return {
    currencies: list(values), projectCount: data.projects.length, customerCount: data.customers.length, supplierCount: data.suppliers.length,
    employeeCount: data.employees.filter(record => record.status === 'active').length,
    openInvoiceCount: data.invoices.filter(record => record.status === 'sent' || record.status === 'overdue').length,
    undatedRecords,
  };
}

export function shiftReportPeriod(period: string, offset: number) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Number.isInteger(offset)) return null;
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
