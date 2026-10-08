import { describe, expect, it } from 'vitest';

import { buildMobileBusinessSummary } from '@/lib/mobile/businessSummary';

describe('mobile business summary', () => {
  it('uses only a user business aggregate in the profile currency', () => {
    const summary = buildMobileBusinessSummary({
      profile: { default_currency: 'KWD' },
      projects: [{ id: 'project-1' }],
      customers: [{ id: 'customer-1' }, { id: 'customer-2' }],
      suppliers: [{ id: 'supplier-1' }],
      employees: [{ status: 'active' }, { status: 'inactive' }],
      invoices: [
        { amount: 125, currency: 'KWD', status: 'sent' },
        { amount: 75, currency: 'KWD', status: 'overdue' },
        { amount: 20, currency: 'KWD', status: 'paid' },
      ],
      sales: [{ amount: 600, currency: 'KWD', status: 'completed', sale_date: '2026-10-02' }],
      operatingExpenses: [{ amount: 150, currency: 'KWD', expense_date: '2026-10-03' }],
      now: new Date('2026-10-06T12:00:00.000Z'),
    });

    expect(summary).toMatchObject({
      currency: 'KWD',
      projectCount: 1,
      customerCount: 2,
      supplierCount: 1,
      activeEmployeeCount: 1,
      invoiceCount: 3,
      openInvoiceCount: 2,
      overdueInvoiceCount: 1,
      outstandingInvoiceAmount: 200,
      monthlySales: 600,
      monthlyOperatingExpenses: 150,
      monthlyOperatingNet: 450,
    });
  });

  it('does not invent a total when an included row is in another currency', () => {
    const summary = buildMobileBusinessSummary({
      profile: { default_currency: 'KWD' },
      projects: [], customers: [], suppliers: [], employees: [], invoices: [],
      sales: [{ amount: 100, currency: 'USD', status: 'completed', sale_date: '2026-10-02' }],
      operatingExpenses: [],
      now: new Date('2026-10-06T12:00:00.000Z'),
    });

    expect(summary.monthlySales).toBeNull();
    expect(summary.monthlyOperatingNet).toBeNull();
  });

  it.each([null, undefined, '', '   ', false, true, 'invalid', NaN])(
    'preserves incomplete amounts (%s) instead of coercing them to zero', amount => {
      const summary = buildMobileBusinessSummary({
        profile: { default_currency: 'KWD' },
        projects: [], customers: [], suppliers: [], employees: [],
        invoices: [{ amount, currency: 'KWD', status: 'sent' }],
        sales: [{ amount, currency: 'KWD', status: 'completed', sale_date: '2026-10-02' }],
        operatingExpenses: [{ amount, currency: 'KWD', expense_date: '2026-10-03' }],
        now: new Date('2026-10-06T12:00:00.000Z'),
      });

      expect(summary.outstandingInvoiceAmount).toBeNull();
      expect(summary.monthlySales).toBeNull();
      expect(summary.monthlyOperatingExpenses).toBeNull();
      expect(summary.monthlyOperatingNet).toBeNull();
    },
  );

  it('keeps a real zero and numeric database strings valid', () => {
    const summary = buildMobileBusinessSummary({
      profile: { default_currency: 'KWD' },
      projects: [], customers: [], suppliers: [], employees: [],
      invoices: [{ amount: 0, currency: 'KWD', status: 'sent' }],
      sales: [{ amount: '12.500', currency: 'KWD', status: 'completed', sale_date: '2026-10-02' }],
      operatingExpenses: [{ amount: 0, currency: 'KWD', expense_date: '2026-10-03' }],
      now: new Date('2026-10-06T12:00:00.000Z'),
    });

    expect(summary.outstandingInvoiceAmount).toBe(0);
    expect(summary.monthlyOperatingExpenses).toBe(0);
    expect(summary.monthlySales).toBe(12.5);
    expect(summary.monthlyOperatingNet).toBe(12.5);
  });
});
