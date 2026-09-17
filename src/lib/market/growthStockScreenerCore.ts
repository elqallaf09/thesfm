export type GrowthScreenPeriod = {
  year: number;
  period: `Q${1 | 2 | 3 | 4}`;
};

export type GrowthUniverseRow = {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  marketCap: number | null;
  price: number | null;
  volume: number | null;
};

export type GrowthStatementRow = {
  symbol: string;
  date: string | null;
  fiscalYear: string | null;
  period: string | null;
  revenueGrowth: number | null;
  operatingIncomeGrowth: number | null;
  netIncomeGrowth: number | null;
  epsGrowth: number | null;
  epsDilutedGrowth: number | null;
};

export type GrowthScreenCandidate = GrowthUniverseRow & GrowthStatementRow & {
  screenScore: number;
};

export const GROWTH_SCREEN_CRITERIA = {
  minimumRevenueGrowth: 0.10,
  strongRevenueGrowth: 0.20,
  minimumProfitGrowth: 0.10,
  minimumMarketCap: 300_000_000,
  minimumPrice: 1,
  minimumVolume: 100_000,
} as const;

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function growthDateValue(row: GrowthStatementRow) {
  const parsed = row.date ? Date.parse(row.date) : Number.NaN;
  if (Number.isFinite(parsed)) return parsed;
  const fiscalYear = Number(row.fiscalYear);
  const quarter = Number(String(row.period ?? '').replace(/^Q/i, ''));
  if (!Number.isFinite(fiscalYear) || quarter < 1 || quarter > 4) return 0;
  return Date.UTC(fiscalYear, quarter * 3, 0);
}

function bestProfitGrowth(row: GrowthStatementRow) {
  return Math.max(
    ...[
      row.epsGrowth,
      row.epsDilutedGrowth,
      row.netIncomeGrowth,
      row.operatingIncomeGrowth,
    ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
    -Infinity,
  );
}

function bounded(value: number | null, min: number, max: number) {
  if (value === null || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function recentCompletedQuarters(now = new Date(), count = 4): GrowthScreenPeriod[] {
  const output: GrowthScreenPeriod[] = [];
  let year = now.getUTCFullYear();
  let quarter = Math.floor(now.getUTCMonth() / 3) + 1;

  for (let index = 0; index < Math.max(1, count); index += 1) {
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
    output.push({ year, period: `Q${quarter}` as GrowthScreenPeriod['period'] });
  }

  return output;
}

export function normalizeGrowthUniverseRows(rows: Array<Record<string, unknown>>): GrowthUniverseRow[] {
  const bySymbol = new Map<string, GrowthUniverseRow>();

  for (const row of rows) {
    const symbol = normalizeSymbol(row.symbol ?? row.ticker);
    if (!symbol || bySymbol.has(symbol)) continue;
    const name = String(row.companyName ?? row.name ?? symbol).trim() || symbol;
    bySymbol.set(symbol, {
      symbol,
      name,
      exchange: String(row.exchangeShortName ?? row.exchange ?? '').trim() || null,
      sector: String(row.sector ?? '').trim() || null,
      industry: String(row.industry ?? '').trim() || null,
      country: String(row.country ?? '').trim() || null,
      currency: String(row.currency ?? '').trim().toUpperCase() || null,
      marketCap: finite(row.marketCap ?? row.mktCap),
      price: finite(row.price),
      volume: finite(row.volume ?? row.avgVolume),
    });
  }

  return Array.from(bySymbol.values());
}

export function normalizeGrowthStatementRows(rows: Array<Record<string, unknown>>): GrowthStatementRow[] {
  const bySymbol = new Map<string, GrowthStatementRow>();

  for (const row of rows) {
    const symbol = normalizeSymbol(row.symbol ?? row.ticker);
    if (!symbol) continue;
    const candidate: GrowthStatementRow = {
      symbol,
      date: String(row.date ?? '').trim() || null,
      fiscalYear: String(row.fiscalYear ?? row.calendarYear ?? '').trim() || null,
      period: String(row.period ?? '').trim().toUpperCase() || null,
      revenueGrowth: finite(row.growthRevenue ?? row.revenueGrowth),
      operatingIncomeGrowth: finite(row.growthOperatingIncome ?? row.operatingIncomeGrowth),
      netIncomeGrowth: finite(row.growthNetIncome ?? row.netIncomeGrowth),
      epsGrowth: finite(row.growthEPS ?? row.epsGrowth),
      epsDilutedGrowth: finite(row.growthEPSDiluted ?? row.epsDilutedGrowth),
    };

    const current = bySymbol.get(symbol);
    if (!current || growthDateValue(candidate) > growthDateValue(current)) {
      bySymbol.set(symbol, candidate);
    }
  }

  return Array.from(bySymbol.values());
}

export function selectGrowthCandidates(
  universeRows: GrowthUniverseRow[],
  statementRows: GrowthStatementRow[],
): GrowthScreenCandidate[] {
  const growthBySymbol = new Map(statementRows.map(row => [row.symbol, row]));
  const candidates: GrowthScreenCandidate[] = [];

  for (const company of universeRows) {
    const growth = growthBySymbol.get(company.symbol);
    if (!growth || growth.revenueGrowth === null) continue;
    const revenueGrowth = growth.revenueGrowth;
    const profitGrowth = bestProfitGrowth(growth);
    const passesProfitability = profitGrowth >= GROWTH_SCREEN_CRITERIA.minimumProfitGrowth;
    const passesStrongTopLine = revenueGrowth >= GROWTH_SCREEN_CRITERIA.strongRevenueGrowth;

    if (revenueGrowth < GROWTH_SCREEN_CRITERIA.minimumRevenueGrowth) continue;
    if (!passesProfitability && !passesStrongTopLine) continue;

    const revenueComponent = bounded(revenueGrowth, -0.25, 1.5);
    const profitComponent = Number.isFinite(profitGrowth) ? bounded(profitGrowth, -0.50, 2) : 0;
    const screenScore = Number((revenueComponent * 0.7 + profitComponent * 0.3).toFixed(6));
    candidates.push({ ...company, ...growth, screenScore });
  }

  return candidates.sort((a, b) => {
    if (b.screenScore !== a.screenScore) return b.screenScore - a.screenScore;
    return (b.marketCap ?? 0) - (a.marketCap ?? 0);
  });
}
