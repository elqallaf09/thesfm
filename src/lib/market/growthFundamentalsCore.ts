/** Annual, reported financials. Percentages are percentage points, never ratios. */
export type GrowthFundamentals = {
  symbol: string;
  status: 'complete' | 'partial' | 'unavailable';
  reason: 'source_unavailable' | 'issuer_not_found' | 'annual_data_unavailable' | null;
  period: string | null;
  previousPeriod: string | null;
  filedAt: string | null;
  retrievedAt: string;
  source: 'SEC EDGAR';
  sourceUrl: string | null;
  currency: string | null;
  revenueGrowthPercent: number | null;
  earningsGrowthPercent: number | null;
  netMarginPercent: number | null;
  freeCashFlow: number | null;
};
type Fact = { start?: string; end?: string; filed?: string; val?: number; form?: string; accn?: string };
type CompanyFacts = { cik?: number | string; facts?: Record<string, Record<string, { units?: Record<string, Fact[]> }>> };
const DAY = 86_400_000;
const tags = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  income: ['NetIncomeLoss', 'ProfitLoss'],
  cash: ['NetCashProvidedByUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment'],
};
export function emptyGrowthFundamentals(symbol: string, reason: GrowthFundamentals['reason'], now = Date.now()): GrowthFundamentals {
  return { symbol, status: 'unavailable', reason, period: null, previousPeriod: null, filedAt: null,
    retrievedAt: new Date(now).toISOString(), source: 'SEC EDGAR', sourceUrl: null, currency: null,
    revenueGrowthPercent: null, earningsGrowthPercent: null, netMarginPercent: null, freeCashFlow: null };
}
function date(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
function annual(fact: Fact, now: number) {
  const days = (date(fact.end) - date(fact.start)) / DAY;
  return typeof fact.val === 'number' && Number.isFinite(fact.val) && days >= 330 && days <= 380
    && /^(10-K|20-F|40-F)(\/A)?$/.test(fact.form ?? '') && Boolean(fact.accn)
    && date(fact.end) <= now && date(fact.filed) <= now && date(fact.filed) >= date(fact.end);
}
function rows(payload: CompanyFacts, names: string[], now: number) {
  return names.flatMap(tag => Object.entries(payload.facts?.['us-gaap']?.[tag]?.units ?? {})
    .filter(([unit]) => /^[A-Z]{3}$/.test(unit))
    .flatMap(([currency, facts]) => facts.filter(fact => annual(fact, now)).map(fact => ({ ...fact, currency, tag }))));
}
type Row = ReturnType<typeof rows>[number];
function metric(candidates: Row[], anchor: Row) {
  const matches = candidates.filter(row => row.start === anchor.start && row.end === anchor.end
    && row.currency === anchor.currency && row.accn === anchor.accn);
  if (!matches.length || new Set(matches.map(row => row.val)).size !== 1) return null;
  return matches[0].val!;
}
function growth(current: number | null, previous: number | null) {
  // A loss/zero base is not a meaningful conventional percentage growth rate.
  return current !== null && previous !== null && previous > 0 ? (current / previous - 1) * 100 : null;
}
export function parseGrowthCompanyFacts(payload: CompanyFacts, symbol: string, cik: string, now = Date.now()): GrowthFundamentals {
  const result = emptyGrowthFundamentals(symbol, 'annual_data_unavailable', now);
  if (String(payload.cik ?? '').replace(/^0+/, '') !== cik.replace(/^0+/, '')) return result;
  const revenueRows = rows(payload, tags.revenue, now).sort((a, b) => date(b.end) - date(a.end) || date(b.filed) - date(a.filed));
  const current = revenueRows[0];
  if (!current || now - date(current.end) > 550 * DAY) return result;
  // Reject ambiguous conflicting revenue tags/values in the selected filing.
  const revenue = metric(revenueRows, current);
  if (revenue === null || revenue <= 0) return result;
  const prior = revenueRows.filter(row => {
    const endGap = (date(current.end) - date(row.end)) / DAY;
    const startGap = (date(current.start) - date(row.start)) / DAY;
    return row.currency === current.currency && endGap >= 330 && endGap <= 380 && Math.abs(endGap - startGap) <= 10;
  }).sort((a, b) => Number(b.accn === current.accn) - Number(a.accn === current.accn) || date(b.filed) - date(a.filed))[0];
  const incomeRows = rows(payload, tags.income, now);
  const income = metric(incomeRows, current);
  const cash = metric(rows(payload, tags.cash, now), current);
  const capex = metric(rows(payload, tags.capex, now), current);
  const values = {
    revenueGrowthPercent: growth(revenue, prior ? metric(revenueRows, prior) : null),
    earningsGrowthPercent: growth(income, prior ? metric(incomeRows, prior) : null),
    netMarginPercent: income !== null ? income / revenue * 100 : null,
    freeCashFlow: cash !== null && capex !== null && capex >= 0 ? cash - capex : null,
  };
  const count = Object.values(values).filter(value => value !== null && Number.isFinite(value)).length;
  return { ...result, ...values, status: count === 4 ? 'complete' : count ? 'partial' : 'unavailable',
    reason: count ? null : 'annual_data_unavailable', period: current.end!, previousPeriod: prior?.end ?? null,
    filedAt: current.filed!, currency: current.currency, sourceUrl: `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, '0')}.json` };
}
export function growthMetricCount(data: GrowthFundamentals | null | undefined) {
  return [data?.revenueGrowthPercent, data?.earningsGrowthPercent, data?.netMarginPercent, data?.freeCashFlow]
    .filter(value => typeof value === 'number' && Number.isFinite(value)).length;
}
