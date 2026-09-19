import { describe, expect, it } from 'vitest';
import { parseGrowthCompanyFacts } from './growthFundamentalsCore';
import { GROWTH_WATCHLIST } from './growthWatchlist';
const now = Date.parse('2026-09-19T12:00:00Z');
const fact = (val: number, year = 2025, extra = {}) => ({ start: `${year}-01-01`, end: `${year}-12-31`, filed: '2026-02-15', val, form: '10-K', accn: 'current', ...extra });
function payload() {
  return { cik: 1, facts: { 'us-gaap': {
    Revenues: { units: { USD: [fact(120), fact(100, 2024)] } },
    NetIncomeLoss: { units: { USD: [fact(24), fact(20, 2024)] } },
    NetCashProvidedByUsedInOperatingActivities: { units: { USD: [fact(30)] } },
    PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [fact(5)] } },
  } } };
}
describe('reported growth fundamentals', () => {
  it('distinguishes parent earnings from total profit including minority interests', () => {
    const data = payload();
    Object.assign(data.facts['us-gaap'], { ProfitLoss: { units: { USD: [fact(26), fact(21, 2024)] } } });
    const result = parseGrowthCompanyFacts(data, 'TEST', '1', now);
    expect(result.netMarginPercent).toBe(20);
    expect(result.earningsGrowthPercent).toBeCloseTo(20);
    expect(result.status).toBe('complete');
  });
  it('accepts combined capex with an explicit basis, without adding overlapping totals', () => {
    const data = payload();
    Object.assign(data.facts['us-gaap'], { PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets: { units: { USD: [fact(8)] } } });
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now)).toMatchObject({ freeCashFlow: 25, freeCashFlowBasis: 'property_equipment' });
    data.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units.USD = [];
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now)).toMatchObject({ freeCashFlow: 22, freeCashFlowBasis: 'property_equipment_and_intangibles' });
  });
  it('never switches earnings concepts between years or ignores a same-tag conflict', () => {
    const data = payload();
    data.facts['us-gaap'].NetIncomeLoss.units.USD = [fact(24)];
    Object.assign(data.facts['us-gaap'], { ProfitLoss: { units: { USD: [fact(26), fact(21, 2024)] } } });
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).earningsGrowthPercent).toBeNull();
    data.facts['us-gaap'].NetIncomeLoss.units.USD.push(fact(99));
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).netMarginPercent).toBeNull();
  });
  it('calculates comparable annual growth, margin and cash flow from the same filing/currency', () => {
    const result = parseGrowthCompanyFacts(payload(), 'TEST', '0000000001', now);
    expect(result).toMatchObject({ status: 'complete', period: '2025-12-31', previousPeriod: '2024-12-31', freeCashFlow: 25, netMarginPercent: 20, currency: 'USD' });
    expect(result.revenueGrowthPercent).toBeCloseTo(20); expect(result.earningsGrowthPercent).toBeCloseTo(20);
    expect(result.sourceUrl).toContain('CIK0000000001.json');
  });
  it('does not convert losses or a zero earnings base into a misleading growth rate', () => {
    for (const prior of [-10, 0]) {
      const data = payload(); data.facts['us-gaap'].NetIncomeLoss.units.USD[1].val = prior;
      expect(parseGrowthCompanyFacts(data, 'TEST', '1', now)).toMatchObject({ earningsGrowthPercent: null, status: 'partial' });
    }
  });
  it('preserves zero cash flow and negative margins', () => {
    const data = payload(); data.facts['us-gaap'].NetIncomeLoss.units.USD[0].val = -12;
    data.facts['us-gaap'].NetCashProvidedByUsedInOperatingActivities.units.USD[0].val = 5;
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now)).toMatchObject({ freeCashFlow: 0, netMarginPercent: -10 });
  });
  it('rejects different issuers, future filings, stale periods and invalid dates', () => {
    expect(parseGrowthCompanyFacts(payload(), 'TEST', '2', now).status).toBe('unavailable');
    expect(parseGrowthCompanyFacts(payload(), 'TEST', '1', Date.parse('2029-01-01')).status).toBe('unavailable');
    for (const filed of ['2027-01-01', '2026-02-30']) {
      const data = payload(); data.facts['us-gaap'].Revenues.units.USD.forEach(row => { row.filed = filed; });
      expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).status).toBe('unavailable');
    }
  });
  it('never mixes currencies, quarterly periods or different accessions', () => {
    const data = payload();
    data.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units.USD = [];
    Object.assign(data.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units, { EUR: [fact(5)] });
    data.facts['us-gaap'].NetIncomeLoss.units.USD[0].accn = 'different';
    data.facts['us-gaap'].Revenues.units.USD.push(fact(500, 2026, { end: '2026-03-31', filed: '2026-05-01', form: '10-Q' }));
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now)).toMatchObject({ period: '2025-12-31', freeCashFlow: null, netMarginPercent: null, earningsGrowthPercent: null, status: 'partial' });
  });
  it('requires an adjacent comparable year and rejects conflicting revenue values', () => {
    const data = payload(); data.facts['us-gaap'].Revenues.units.USD[1] = fact(100, 2023);
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).revenueGrowthPercent).toBeNull();
    data.facts['us-gaap'].Revenues.units.USD.push(fact(999));
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).status).toBe('unavailable');
  });
  it('does not derive cash flow from missing or sign-reversed capex', () => {
    const data = payload(); data.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units.USD[0].val = -5;
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).freeCashFlow).toBeNull();
    data.facts['us-gaap'].PaymentsToAcquirePropertyPlantAndEquipment.units.USD = [];
    expect(parseGrowthCompanyFacts(data, 'TEST', '1', now).freeCashFlow).toBeNull();
  });
  it('covers 100 distinct monitoring candidates using the current Block ticker', () => {
    expect(GROWTH_WATCHLIST).toHaveLength(100);
    expect(new Set(GROWTH_WATCHLIST.map(item => item.symbol)).size).toBe(100);
    expect(GROWTH_WATCHLIST.some(item => item.symbol === 'XYZ')).toBe(true);
    expect(GROWTH_WATCHLIST.some(item => item.symbol === 'SQ')).toBe(false);
  });
});
