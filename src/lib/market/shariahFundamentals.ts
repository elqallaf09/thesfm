import type { ShariahScreeningData } from '@/lib/market/shariah-screening';

type ScreeningInput = {
  symbol: string;
  providerSymbol?: string | null;
  name?: string | null;
  exchange?: string | null;
  country?: string | null;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  existing?: ShariahScreeningData | null;
};

type FinancialSnapshot = {
  source: string;
  asOf: string | null;
  sector?: string | null;
  industry?: string | null;
  businessDescription?: string | null;
  totalAssets?: number | null;
  totalDebt?: number | null;
  cashAndInterestBearingSecurities?: number | null;
  cash?: number | null;
  accountsReceivable?: number | null;
  revenue?: number | null;
  interestIncome?: number | null;
  interestIncomeEstimated?: boolean;
};

type SecFactRow = {
  val?: number;
  start?: string;
  end?: string;
  filed?: string;
  form?: string;
  fp?: string;
};

type SecCompanyFacts = {
  facts?: {
    'us-gaap'?: Record<string, { units?: Record<string, SecFactRow[]> }>;
  };
};

type SecDirectory = {
  data?: Array<[number, string, string, string]>;
};

type SecSubmission = {
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  sic?: string;
  sicDescription?: string;
};

type YahooQuoteSummary = {
  quoteSummary?: {
    result?: Array<Record<string, unknown>>;
  };
};

const USER_AGENT = 'THE-SFM/1.0 (+https://www.the-sfm.com)';
const SEC_USER_AGENT = process.env.SEC_USER_AGENT || 'THE-SFM admin@the-sfm.com';
const REVALIDATE_SECONDS = 6 * 60 * 60;
const REQUIRED_RATIOS = [
  'nonPermissibleRevenueRatio',
  'interestBearingDebtRatio',
  'cashAndInterestBearingSecuritiesRatio',
  'accountsReceivableAndCashRatio',
  'interestIncomeRatio',
] as const;

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function finiteNumber(value: unknown): number | null {
  if (value && typeof value === 'object' && 'raw' in value) {
    return finiteNumber((value as { raw?: unknown }).raw);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveOrZero(value: unknown) {
  const number = finiteNumber(value);
  return number === null ? null : Math.max(0, number);
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined || denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function firstNumber(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function firstText(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    const text = value && typeof value === 'object' && 'fmt' in value
      ? cleanText((value as { fmt?: unknown }).fmt)
      : cleanText(value);
    if (text) return text;
  }
  return null;
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

function usSecurity(input: ScreeningInput) {
  const country = cleanText(input.country).toUpperCase();
  const exchange = cleanText(input.exchange).toUpperCase();
  return ['US', 'USA', 'UNITED STATES'].includes(country) || /(NASDAQ|NYSE|AMEX|ARCA|BATS|IEX)/.test(exchange);
}

function symbolCandidates(input: ScreeningInput) {
  const values = [input.providerSymbol, input.symbol]
    .map(value => cleanText(value).toUpperCase())
    .filter(Boolean);
  const expanded = values.flatMap(value => [value, value.replace(/\./g, '-'), value.replace(/-/g, '.')]);
  return [...new Set(expanded)];
}

function factRows(facts: SecCompanyFacts | null, concept: string) {
  const units = facts?.facts?.['us-gaap']?.[concept]?.units;
  if (!units) return [];
  const preferred = units.USD ?? units.usd;
  const rows = preferred ?? Object.values(units).flat();
  return rows.filter(row => Number.isFinite(Number(row.val)));
}

function latestInstantFact(facts: SecCompanyFacts | null, concepts: string[]) {
  for (const concept of concepts) {
    const row = factRows(facts, concept)
      .filter(item => ['10-Q', '10-K', '20-F', '40-F', '6-K'].includes(cleanText(item.form).toUpperCase()))
      .sort((a, b) => {
        const end = cleanText(b.end).localeCompare(cleanText(a.end));
        return end || cleanText(b.filed).localeCompare(cleanText(a.filed));
      })[0];
    if (row) return { value: Number(row.val), end: cleanText(row.end) || null, concept };
  }
  return null;
}

function durationDays(row: SecFactRow) {
  const start = Date.parse(cleanText(row.start));
  const end = Date.parse(cleanText(row.end));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function latestDurationFact(facts: SecCompanyFacts | null, concepts: string[]) {
  for (const concept of concepts) {
    const rows = factRows(facts, concept)
      .filter(item => ['10-K', '20-F', '40-F'].includes(cleanText(item.form).toUpperCase()) && durationDays(item) >= 250)
      .sort((a, b) => {
        const end = cleanText(b.end).localeCompare(cleanText(a.end));
        return end || cleanText(b.filed).localeCompare(cleanText(a.filed));
      });
    if (rows[0]) return { value: Number(rows[0].val), end: cleanText(rows[0].end) || null, concept };
  }

  for (const concept of concepts) {
    const rows = factRows(facts, concept)
      .filter(item => ['10-Q', '10-K', '20-F', '40-F', '6-K'].includes(cleanText(item.form).toUpperCase()) && durationDays(item) >= 60)
      .sort((a, b) => cleanText(b.end).localeCompare(cleanText(a.end)) || cleanText(b.filed).localeCompare(cleanText(a.filed)));
    if (rows[0]) return { value: Number(rows[0].val), end: cleanText(rows[0].end) || null, concept };
  }
  return null;
}

function sectorFromSic(sic: unknown) {
  const code = Number(sic);
  if (!Number.isFinite(code)) return null;
  if (code >= 6000 && code <= 6799) return 'Financial Services';
  if (code >= 2100 && code <= 2199) return 'Tobacco';
  if (code >= 2000 && code <= 2099) return 'Food and Beverage';
  if (code >= 3570 && code <= 3699) return 'Technology';
  if (code >= 3800 && code <= 3899) return 'Healthcare';
  if (code >= 1000 && code <= 1499) return 'Energy and Mining';
  if (code >= 4000 && code <= 4999) return 'Utilities and Communications';
  if (code >= 5000 && code <= 5999) return 'Consumer and Retail';
  if (code >= 7000 && code <= 8999) return 'Services';
  return null;
}

async function fetchSecSnapshot(input: ScreeningInput): Promise<FinancialSnapshot | null> {
  if (!usSecurity(input)) return null;
  try {
    const directoryResponse = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(9_000),
      headers: { accept: 'application/json', 'user-agent': SEC_USER_AGENT },
    });
    const directory = await safeJson<SecDirectory>(directoryResponse);
    if (!directoryResponse.ok || !directory?.data?.length) return null;
    const candidates = new Set(symbolCandidates(input));
    const tickerRow = directory.data.find(row => candidates.has(cleanText(row[2]).toUpperCase()));
    if (!tickerRow) return null;
    const cik = String(tickerRow[0]).padStart(10, '0');

    const [submissionResponse, factsResponse] = await Promise.all([
      fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(9_000),
        headers: { accept: 'application/json', 'user-agent': SEC_USER_AGENT },
      }),
      fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(9_000),
        headers: { accept: 'application/json', 'user-agent': SEC_USER_AGENT },
      }),
    ]);
    const submission = await safeJson<SecSubmission>(submissionResponse);
    const facts = await safeJson<SecCompanyFacts>(factsResponse);
    if (!factsResponse.ok || !facts) return null;

    const assets = latestInstantFact(facts, ['Assets']);
    const totalDebt = latestInstantFact(facts, ['LongTermDebtAndFinanceLeaseObligations', 'LongTermDebt']);
    const debtCurrent = latestInstantFact(facts, ['LongTermDebtAndFinanceLeaseObligationsCurrent', 'LongTermDebtCurrent', 'DebtCurrent']);
    const debtNoncurrent = latestInstantFact(facts, ['LongTermDebtAndFinanceLeaseObligationsNoncurrent', 'LongTermDebtNoncurrent']);
    const shortBorrowings = latestInstantFact(facts, ['ShortTermBorrowings', 'ShortTermDebtCurrent']);
    const debt = totalDebt?.value ?? [debtCurrent?.value, debtNoncurrent?.value, shortBorrowings?.value]
      .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
      .reduce((sum, value) => sum + Math.max(0, value), 0);

    const cash = latestInstantFact(facts, ['CashAndCashEquivalentsAtCarryingValue', 'Cash']);
    const combinedCashInvestments = latestInstantFact(facts, ['CashCashEquivalentsAndShortTermInvestments']);
    const shortInvestments = latestInstantFact(facts, ['ShortTermInvestments', 'MarketableSecuritiesCurrent']);
    const cashAndSecurities = combinedCashInvestments?.value
      ?? ((cash?.value ?? 0) + (shortInvestments?.value ?? 0));
    const receivables = latestInstantFact(facts, ['AccountsReceivableNetCurrent', 'AccountsNotesAndLoansReceivableNetCurrent', 'AccountsReceivableNet']);
    const revenue = latestDurationFact(facts, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'SalesRevenueGoodsNet']);
    const interest = latestDurationFact(facts, ['InterestIncomeNonoperating', 'InvestmentIncomeInterest', 'InterestIncomeExpenseNonoperatingNet', 'NonoperatingIncomeExpense']);
    const interestValue = interest ? Math.max(0, interest.value) : 0;

    return {
      source: 'SEC EDGAR',
      asOf: assets?.end ?? revenue?.end ?? null,
      sector: sectorFromSic(submission?.sic),
      industry: cleanText(submission?.sicDescription) || null,
      totalAssets: assets?.value ?? null,
      totalDebt: Number.isFinite(debt) ? debt : null,
      cashAndInterestBearingSecurities: Number.isFinite(cashAndSecurities) ? cashAndSecurities : null,
      cash: cash?.value ?? (combinedCashInvestments?.value ?? null),
      accountsReceivable: receivables?.value ?? null,
      revenue: revenue?.value ?? null,
      interestIncome: interestValue,
      interestIncomeEstimated: !interest,
    };
  } catch {
    return null;
  }
}

async function fetchYahooSnapshot(input: ScreeningInput): Promise<FinancialSnapshot | null> {
  const symbol = cleanText(input.providerSymbol || input.symbol).toUpperCase();
  if (!symbol) return null;
  const modules = ['assetProfile', 'financialData', 'balanceSheetHistory', 'incomeStatementHistory'].join(',');
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(9_000),
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    const payload = await safeJson<YahooQuoteSummary>(response);
    const root = payload?.quoteSummary?.result?.[0];
    if (!response.ok || !root) return null;
    const profile = objectValue(root.assetProfile);
    const financialData = objectValue(root.financialData);
    const balanceHistory = objectValue(root.balanceSheetHistory);
    const incomeHistory = objectValue(root.incomeStatementHistory);
    const balances = Array.isArray(balanceHistory?.balanceSheetStatements) ? balanceHistory?.balanceSheetStatements : [];
    const incomes = Array.isArray(incomeHistory?.incomeStatementHistory) ? incomeHistory?.incomeStatementHistory : [];
    const balance = objectValue(balances[0]);
    const income = objectValue(incomes[0]);

    const totalAssets = firstNumber(balance, ['totalAssets', 'TotalAssets']);
    const totalDebt = firstNumber(balance, ['totalDebt', 'TotalDebt']) ?? firstNumber(financialData, ['totalDebt']);
    const cash = firstNumber(balance, ['cash', 'cashAndCashEquivalents', 'CashCashEquivalentsAndShortTermInvestments'])
      ?? firstNumber(financialData, ['totalCash']);
    const cashAndSecurities = firstNumber(balance, ['cashCashEquivalentsAndShortTermInvestments', 'CashCashEquivalentsAndShortTermInvestments'])
      ?? (() => {
        const investments = firstNumber(balance, ['shortTermInvestments', 'ShortTermInvestments']);
        return cash !== null || investments !== null ? (cash ?? 0) + (investments ?? 0) : null;
      })();
    const receivables = firstNumber(balance, ['netReceivables', 'accountsReceivable', 'NetReceivables']);
    const revenue = firstNumber(income, ['totalRevenue', 'TotalRevenue']);
    const reportedInterest = firstNumber(income, ['interestIncome', 'InterestIncome', 'interestIncomeNonOperating', 'netNonOperatingInterestIncomeExpense']);
    const interestIncome = reportedInterest === null ? 0 : Math.max(0, reportedInterest);
    const asOf = firstText(balance, ['endDate']) ?? firstText(income, ['endDate']);

    return {
      source: 'Yahoo Finance fundamentals',
      asOf,
      sector: firstText(profile, ['sector']),
      industry: firstText(profile, ['industry']),
      businessDescription: firstText(profile, ['longBusinessSummary']),
      totalAssets,
      totalDebt,
      cashAndInterestBearingSecurities: cashAndSecurities,
      cash,
      accountsReceivable: receivables,
      revenue,
      interestIncome,
      interestIncomeEstimated: reportedInterest === null,
    };
  } catch {
    return null;
  }
}

async function fetchFmpSnapshot(input: ScreeningInput): Promise<FinancialSnapshot | null> {
  const apiKey = cleanText(process.env.FMP_API_KEY);
  const symbol = cleanText(input.providerSymbol || input.symbol).toUpperCase();
  if (!apiKey || !symbol) return null;
  const endpoint = async (name: string) => {
    const url = new URL(`https://financialmodelingprep.com/stable/${name}`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('limit', '1');
    url.searchParams.set('apikey', apiKey);
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(9_000),
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    const body = await safeJson<unknown>(response);
    return response.ok && Array.isArray(body) ? objectValue(body[0]) : null;
  };

  try {
    const [balance, income] = await Promise.all([endpoint('balance-sheet-statement'), endpoint('income-statement')]);
    if (!balance && !income) return null;
    const totalAssets = firstNumber(balance, ['totalAssets']);
    const totalDebt = firstNumber(balance, ['totalDebt'])
      ?? (() => {
        const shortDebt = firstNumber(balance, ['shortTermDebt']);
        const longDebt = firstNumber(balance, ['longTermDebt']);
        return shortDebt !== null || longDebt !== null ? (shortDebt ?? 0) + (longDebt ?? 0) : null;
      })();
    const cash = firstNumber(balance, ['cashAndCashEquivalents', 'cashAndShortTermInvestments']);
    const cashAndSecurities = firstNumber(balance, ['cashAndShortTermInvestments'])
      ?? (() => {
        const investments = firstNumber(balance, ['shortTermInvestments']);
        return cash !== null || investments !== null ? (cash ?? 0) + (investments ?? 0) : null;
      })();
    const receivables = firstNumber(balance, ['netReceivables', 'accountsReceivables']);
    const revenue = firstNumber(income, ['revenue']);
    const reportedInterest = firstNumber(income, ['interestIncome', 'netInterestIncome']);
    return {
      source: 'Financial Modeling Prep',
      asOf: firstText(balance, ['date']) ?? firstText(income, ['date']),
      totalAssets,
      totalDebt,
      cashAndInterestBearingSecurities: cashAndSecurities,
      cash,
      accountsReceivable: receivables,
      revenue,
      interestIncome: reportedInterest === null ? 0 : Math.max(0, reportedInterest),
      interestIncomeEstimated: reportedInterest === null,
    };
  } catch {
    return null;
  }
}

function snapshotToData(snapshot: FinancialSnapshot): ShariahScreeningData {
  const debtRatio = ratio(snapshot.totalDebt, snapshot.totalAssets);
  const cashRatio = ratio(snapshot.cashAndInterestBearingSecurities, snapshot.totalAssets);
  const receivableCashRatio = snapshot.accountsReceivable !== null && snapshot.accountsReceivable !== undefined
    && snapshot.cash !== null && snapshot.cash !== undefined
    ? ratio(snapshot.accountsReceivable + snapshot.cash, snapshot.totalAssets)
    : null;
  const interestRatio = ratio(snapshot.interestIncome, snapshot.revenue);

  return {
    sector: snapshot.sector ?? null,
    industry: snapshot.industry ?? null,
    businessDescription: snapshot.businessDescription ?? null,
    interestBearingDebtRatio: debtRatio,
    cashAndInterestBearingSecuritiesRatio: cashRatio,
    accountsReceivableAndCashRatio: receivableCashRatio,
    interestIncomeRatio: interestRatio,
    // Internal low-cost screening assumes no separate prohibited-revenue stream when the
    // business-activity screen is clean; reported/estimated interest income remains included.
    nonPermissibleRevenueRatio: interestRatio,
    screeningFundamentals: {
      source: snapshot.source,
      asOf: snapshot.asOf,
      totalAssets: snapshot.totalAssets ?? null,
      totalDebt: snapshot.totalDebt ?? null,
      cashAndInterestBearingSecurities: snapshot.cashAndInterestBearingSecurities ?? null,
      cash: snapshot.cash ?? null,
      accountsReceivable: snapshot.accountsReceivable ?? null,
      revenue: snapshot.revenue ?? null,
      interestIncome: snapshot.interestIncome ?? null,
      interestIncomeEstimated: snapshot.interestIncomeEstimated === true,
    },
  };
}

function fillMissing(base: ShariahScreeningData, patch: ShariahScreeningData) {
  const next: ShariahScreeningData = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') continue;
    const current = next[key];
    if (current === null || current === undefined || current === '') next[key] = value;
  }
  return next;
}

function isComplete(data: ShariahScreeningData) {
  return REQUIRED_RATIOS.every(key => finiteNumber(data[key]) !== null);
}

export async function enrichShariahScreeningData(input: ScreeningInput) {
  let data: ShariahScreeningData = {
    ...(input.existing ?? {}),
    sector: cleanText(input.existing?.sector ?? input.sector) || null,
    industry: cleanText(input.existing?.industry ?? input.industry) || null,
    businessDescription: cleanText(input.existing?.businessDescription ?? input.description) || null,
  };
  const sources: string[] = [];
  const estimatedFields: string[] = [];

  const apply = (snapshot: FinancialSnapshot | null) => {
    if (!snapshot) return;
    sources.push(snapshot.source);
    if (snapshot.interestIncomeEstimated) estimatedFields.push('interestIncome');
    data = fillMissing(data, snapshotToData(snapshot));
  };

  if (usSecurity(input)) apply(await fetchSecSnapshot(input));
  if (!isComplete(data)) apply(await fetchYahooSnapshot(input));
  if (!isComplete(data) && process.env.FMP_API_KEY?.trim()) apply(await fetchFmpSnapshot(input));

  const now = new Date().toISOString();
  data = {
    ...data,
    screeningModel: 'SFM FTSE Yasaar-aligned equity screen',
    screeningMethodology: 'FTSE Yasaar-style business and financial ratio screen',
    screeningMethodologyReference: 'https://www.lseg.com/en/ftse-russell/indices/global-shariah',
    screeningDataSources: [...new Set(sources)],
    screeningDataQuality: isComplete(data) ? (estimatedFields.length ? 'complete_estimated' : 'complete_reported') : 'partial',
    screeningEstimatedFields: [...new Set(estimatedFields)],
    screeningGeneratedAt: now,
    screeningDisclaimer: 'Automated rules-based screening estimate; not a fatwa or certified Shariah opinion.',
  };

  return {
    data,
    complete: isComplete(data),
    sources: [...new Set(sources)],
    estimatedFields: [...new Set(estimatedFields)],
  };
}
