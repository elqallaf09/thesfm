import { describe, expect, it } from 'vitest';
import type { MobileRecord } from '@/lib/mobile/resourceContract';
import { businessReport, financeReport, shiftReportPeriod } from '../../../apps/expo-go/src/workspaceReports';

const row = (values: Record<string, string | number | boolean | null>): MobileRecord => ({ id: crypto.randomUUID(), created_at: '2026-10-01T00:00:00.000Z', ...values });

describe('native account reports', () => {
  it('keeps finance totals separated by recorded currency and excludes undated rows from a month', () => {
    const report = financeReport('2026-10', {
      income: [row({ amount: 100, currency: 'KWD', status: 'received', received_date: '2026-10-03' }), row({ amount: 50, currency: 'KWD', status: 'expected', received_date: '2026-10-04' }), row({ amount: 999, currency: 'USD', status: 'received' })],
      expenses: [row({ amount: 30, currency: 'KWD', date: '2026-10-05' }), row({ amount: 20, currency: 'USD', date: '2026-09-30' })],
      savings: [row({ amount: 10, currency: 'KWD', saved_at: '2026-10-06' })],
      debts: [row({ remaining_amount: 80, currency: 'KWD' })], goals: [row({ goal: 'Emergency fund' })],
    });
    expect(report.currencies).toEqual([expect.objectContaining({ currency: 'KWD', receivedIncome: 100, expectedIncome: 50, expenses: 30, savings: 10, debtOutstanding: 80 })]);
    expect(report.undatedRecords).toBe(1); expect(report.goalCount).toBe(1);
  });
  it('derives business operations only from dated records and recorded statuses', () => {
    const report = businessReport('2026-10', {
      projects: [row({ name: 'One' })], customers: [row({ name: 'Customer' })], suppliers: [], employees: [row({ name: 'Active', status: 'active' }), row({ name: 'Former', status: 'inactive' })],
      sales: [row({ amount: 120, currency: 'KWD', status: 'completed', sale_date: '2026-10-04' }), row({ amount: 50, currency: 'KWD', status: 'pending', sale_date: '2026-10-05' }), row({ amount: 500, currency: 'KWD', status: 'cancelled', sale_date: '2026-10-06' })],
      invoices: [row({ amount: 90, currency: 'KWD', status: 'paid', invoice_date: '2026-10-07' }), row({ amount: 40, currency: 'KWD', status: 'overdue', invoice_date: '2026-10-08' })],
      operatingExpenses: [row({ amount: 20, currency: 'KWD', expense_date: '2026-10-09' }), row({ amount: 20, currency: 'USD' })],
    });
    expect(report.currencies).toEqual([expect.objectContaining({ currency: 'KWD', completedSales: 120, pendingSales: 50, paidInvoices: 90, outstandingInvoices: 40, overdueInvoices: 40, operatingExpenses: 20 })]);
    expect(report).toMatchObject({ projectCount: 1, customerCount: 1, employeeCount: 1, openInvoiceCount: 1, undatedRecords: 1 });
  });
  it('moves months across years and rejects malformed periods', () => {
    expect(shiftReportPeriod('2026-01', -1)).toBe('2025-12'); expect(shiftReportPeriod('2026-12', 1)).toBe('2027-01'); expect(shiftReportPeriod('2026-13', 1)).toBeNull();
  });
});
