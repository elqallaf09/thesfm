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
});
