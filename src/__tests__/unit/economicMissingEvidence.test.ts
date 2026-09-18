import { expect, it } from 'vitest';
import { financialTwinSourceFromRecords } from '@/domain/economic-intelligence/dataSource';
import { buildFinancialTwinSnapshot } from '@/domain/economic-intelligence/digitalTwin';
import { buildEconomicHomeSummary } from '@/lib/dashboard/economicHomeSummary';

it('distinguishes failed/unrequested account data from confirmed empty data', () => {
  const source = financialTwinSourceFromRecords({ income: [{ amount: 2000, currency: 'KWD' }], expenses: [], debts: [], savings: [] }, { expenses: 'timeout' });
  const snapshot = buildFinancialTwinSnapshot(source, 'KWD');
  expect(snapshot.dataQuality.missing).toEqual(['expenses', 'investments']);
  expect(snapshot.dataQuality.warnings).toContain('debts:empty');
  expect(snapshot.dataQuality.missing).not.toContain('debts');
  expect(buildEconomicHomeSummary(snapshot)).toMatchObject({ health: 'watch', riskCode: 'incomplete_data', opportunityCode: 'improve_data' });
});
it('keeps completely loaded income and expenses in the calculation', () => {
  const snapshot = buildFinancialTwinSnapshot(financialTwinSourceFromRecords({ income: [{ amount: 2000, currency: 'KWD' }], expenses: [{ amount: 500, currency: 'KWD' }], debts: [], savings: [], investments: [] }), 'KWD');
  expect(snapshot.monthlySurplus).toBe(1500);
  expect(snapshot.dataQuality.completeness).toBe(1);
});
