import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const translations = readFileSync(join(process.cwd(), 'src/lib/translations/dashboard.ts'), 'utf8');

describe('dashboard no-fabricated-data contract', () => {
  it('does not ship the former fixed values, sample people, or decorative chart paths', () => {
    for (const value of ['5.1%', '12.7%', '3.2%', '8.4%', 'Mohammed', 'Payroll', 'Rent & utilities', 'M0 150 C55', 'M0 172 C48']) {
      expect(dashboard).not.toContain(value);
    }
    expect(dashboard).toContain('buildMonthlyCashFlow');
    expect(dashboard).toContain('point.incomeRecords > 0 || point.expenseRecords > 0');
  });

  it('loads only strategic finance sources and does not duplicate tasks or notifications', () => {
    for (const table of ['monthly_income_sources', 'expense_items', 'savings_items', 'financial_goals', 'investment_items', 'debts']) {
      expect(dashboard).toContain(`table: '${table}'`);
    }
    expect(dashboard).not.toContain('useSmartTasks');
    expect(dashboard).not.toContain("table: 'notifications'");
    expect(dashboard).not.toContain("table: 'project_tasks'");
    expect(dashboard).not.toContain("table: 'market_watchlist'");
  });

  it('keeps real zero, missing records, source failure, and unavailable calculation distinct', () => {
    expect(dashboard).toContain("status === 'empty'");
    expect(dashboard).toContain("status === 'permission'");
    expect(dashboard).toContain("status === 'network'");
    expect(dashboard).toContain("status === 'unavailable'");
    expect(translations).toContain('dashboard_exec_real_zero');
    expect(translations).toContain('dashboard_exec_no_records');
    expect(translations).toContain('dashboard_exec_calculation_unavailable');
    expect(translations).toContain('dashboard_exec_not_configured');
    expect(dashboard).not.toMatch(/progressRatio\s*\?\?\s*0/);
    expect(dashboard).not.toMatch(/primaryCurrency[\s\S]{0,120}\?\?\s*['"]KWD['"]/);
  });

  it('shows the health result only from the audited calculation and loaded source facts', () => {
    expect(dashboard).toContain('const health = calculateFinancialHealth(financialInput)');
    expect(dashboard).toContain('calculateFinancialHealthIndicators(financialInput)');
    expect(dashboard).toContain('debtsLoaded: loaded(sources.debts.status)');
    expect(dashboard).toContain("hasSavingsData: loaded(sources.savings.status) && valuedSavingsRows.length > 0 && savingsAmountsComplete");
    expect(dashboard).not.toMatch(/healthScore\s*=\s*\d+/);
  });
});
