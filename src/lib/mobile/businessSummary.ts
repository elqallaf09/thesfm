import { isCurrency, rowCurrency } from '@/lib/dashboard/executiveOverview';
import type { FinancialRow } from '@/lib/dashboard/financialMetrics';

export type MobileBusinessSummary = {
  currency: string | null;
  projectCount: number;
  customerCount: number;
  supplierCount: number;
  activeEmployeeCount: number;
  invoiceCount: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  outstandingInvoiceAmount: number | null;
  monthlySales: number | null;
  monthlyOperatingExpenses: number | null;
  monthlyOperatingNet: number | null;
  refreshedAt: string;
};

export type MobileBusinessSummaryInput = {
  profile: FinancialRow | null;
  projects: FinancialRow[];
  customers: FinancialRow[];
  suppliers: FinancialRow[];
  employees: FinancialRow[];
  invoices: FinancialRow[];
  sales: FinancialRow[];
  operatingExpenses: FinancialRow[];
  now?: Date;
};

function amount(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inCurrentMonth(value: unknown, now: Date) {
  if (typeof value !== 'string') return false;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth();
}

/**
 * A mobile-safe business view: it reports only aggregates from rows already
 * owned by the authenticated user. Mixed or incomplete money never becomes a
 * misleading total; it is represented as null instead.
 */
function totalInCurrency(rows: FinancialRow[], currency: string | null) {
  if (!currency) return null;
  if (rows.some(row => !isCurrency(row, currency) || amount(row.amount) === null)) return null;
  return rows.reduce((total, row) => total + (amount(row.amount) ?? 0), 0);
}

export function buildMobileBusinessSummary(input: MobileBusinessSummaryInput): MobileBusinessSummary {
  const now = input.now ?? new Date();
  const currency = rowCurrency(input.profile ?? {}, ['default_currency', 'preferred_currency', 'currency']);
  const openInvoices = input.invoices.filter(row => ['sent', 'overdue'].includes(String(row.status ?? '').trim().toLowerCase()));
  const overdueInvoices = openInvoices.filter(row => String(row.status ?? '').trim().toLowerCase() === 'overdue');
  const completedMonthlySales = input.sales.filter(row =>
    String(row.status ?? '').trim().toLowerCase() === 'completed'
      && inCurrentMonth(row.sale_date, now),
  );
  const monthlyOperatingExpenses = input.operatingExpenses.filter(row => inCurrentMonth(row.expense_date, now));
  const monthlySales = totalInCurrency(completedMonthlySales, currency);
  const operatingTotal = totalInCurrency(monthlyOperatingExpenses, currency);

  return {
    currency,
    projectCount: input.projects.length,
    customerCount: input.customers.length,
    supplierCount: input.suppliers.length,
    activeEmployeeCount: input.employees.filter(row => String(row.status ?? 'active').trim().toLowerCase() === 'active').length,
    invoiceCount: input.invoices.length,
    openInvoiceCount: openInvoices.length,
    overdueInvoiceCount: overdueInvoices.length,
    outstandingInvoiceAmount: totalInCurrency(openInvoices, currency),
    monthlySales,
    monthlyOperatingExpenses: operatingTotal,
    monthlyOperatingNet: monthlySales === null || operatingTotal === null ? null : monthlySales - operatingTotal,
    refreshedAt: now.toISOString(),
  };
}
