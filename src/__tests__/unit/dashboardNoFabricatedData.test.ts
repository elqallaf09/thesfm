import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');

describe('dashboard no-fabricated-data contract', () => {
  it('does not ship the former fixed KPI percentages or chart paths', () => {
    for (const value of ['5.1%', '12.7%', '3.2%', '8.4%', 'M0 150 C55', 'M0 172 C48']) {
      expect(dashboard).not.toContain(value);
    }
    expect(dashboard).toContain('monthOverMonthChange');
    expect(dashboard).toContain('buildMonthlyCashFlow');
  });

  it('does not substitute sample categories, actions, or people when data is absent', () => {
    for (const value of ['Payroll', 'Operations', 'Marketing', 'Rent & utilities', 'محمد\' : \'Mohammed', 'reviewExpenses', 'approveInvoices', 'updateBudget']) {
      expect(dashboard).not.toContain(value);
    }
    expect(dashboard).toContain('text.insufficientData');
    expect(dashboard).toContain('topOpenTasks.map');
  });

  it('shows a health result only from the audited financial-health calculation', () => {
    expect(dashboard).toContain('calculateFinancialHealth({');
    expect(dashboard).toContain("debtsLoaded: !errors.debts");
    expect(dashboard).toContain("summary.healthScore ?? '—'");
    expect(dashboard).not.toMatch(/healthScore\s*=\s*healthInputsAvailable/);
  });
});
