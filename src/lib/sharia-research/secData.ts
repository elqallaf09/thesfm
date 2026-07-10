import 'server-only';

import { secureFetch } from './secureFetch';
import { normalizeResearchText } from './normalizeQuery';
import type { FinancialValue, NormalizedFinancialField, SecurityIdentity, SourceDocument } from './types';

export const SEC_TICKER_DIRECTORY_URL = 'https://www.sec.gov/files/company_tickers_exchange.json';
const SEC_SUBMISSIONS_BASE = 'https://data.sec.gov/submissions';
const SEC_COMPANY_FACTS_BASE = 'https://data.sec.gov/api/xbrl/companyfacts';

export type SecCompany = { cik: string; name: string; ticker: string; exchange: string };
export type SecFiling = {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime?: string;
  form: string;
  primaryDocument: string;
  primaryDocDescription: string;
};

type SecSubmissions = {
  cik?: string;
  entityType?: string;
  sic?: string;
  sicDescription?: string;
  name?: string;
  tickers?: string[];
  exchanges?: string[];
  formerNames?: Array<{ name?: string; from?: string; to?: string }>;
  filings?: {
    recent?: Record<string, unknown[]>;
  };
};

type SecFactUnit = {
  start?: string;
  end?: string;
  val?: number;
  accn?: string;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  frame?: string;
};

type SecCompanyFacts = {
  entityName?: string;
  facts?: Record<string, Record<string, {
    label?: string;
    description?: string;
    units?: Record<string, SecFactUnit[]>;
  }>>;
};

const secHeaders = {
  accept: 'application/json',
};

export function normalizeCik(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.padStart(10, '0').slice(-10) : null;
}

export async function loadSecCompanyDirectory(signal?: AbortSignal) {
  const response = await secureFetch(SEC_TICKER_DIRECTORY_URL, {
    acceptedContentTypes: ['application/json', 'text/json', 'text/plain'],
    maxBytes: 6 * 1024 * 1024,
    cacheTtlMs: 24 * 60 * 60 * 1000,
    minDomainIntervalMs: 150,
    headers: secHeaders,
    signal,
  });
  const payload = JSON.parse(new TextDecoder().decode(response.body)) as { fields?: string[]; data?: unknown[][] };
  const fields = payload.fields ?? [];
  const indexes = {
    cik: fields.indexOf('cik'),
    name: fields.indexOf('name'),
    ticker: fields.indexOf('ticker'),
    exchange: fields.indexOf('exchange'),
  };
  if (Object.values(indexes).some(index => index < 0) || !Array.isArray(payload.data)) throw new Error('SEC_TICKER_DIRECTORY_INVALID');
  return payload.data.map(row => ({
    cik: normalizeCik(row[indexes.cik]) ?? '',
    name: String(row[indexes.name] ?? '').trim(),
    ticker: String(row[indexes.ticker] ?? '').trim().toUpperCase(),
    exchange: String(row[indexes.exchange] ?? '').trim(),
  })).filter(company => company.cik && company.ticker && company.name);
}

export function searchSecCompanies(companies: SecCompany[], query: string) {
  const normalized = normalizeResearchText(query);
  const symbol = query.trim().toUpperCase().replace(/\s+/g, '');
  return companies.map(company => {
    const name = normalizeResearchText(company.name);
    let score = 0;
    const matchedOn: string[] = [];
    if (company.ticker === symbol) { score = 130; matchedOn.push('ticker'); }
    if (name === normalized) { score = Math.max(score, 120); matchedOn.push('legal_name'); }
    else if (name.startsWith(normalized) && normalized.length >= 3) { score = Math.max(score, 100); matchedOn.push('legal_name_prefix'); }
    else if (name.includes(normalized) && normalized.length >= 4) { score = Math.max(score, 78); matchedOn.push('legal_name_contains'); }
    return { company, score, matchedOn };
  }).filter(match => match.score > 0).sort((a, b) => b.score - a.score || a.company.ticker.localeCompare(b.company.ticker));
}

export async function loadSecSubmissions(cik: string, signal?: AbortSignal) {
  const normalizedCik = normalizeCik(cik);
  if (!normalizedCik) throw new Error('SEC_CIK_REQUIRED');
  const url = `${SEC_SUBMISSIONS_BASE}/CIK${normalizedCik}.json`;
  const response = await secureFetch(url, {
    acceptedContentTypes: ['application/json', 'text/json'],
    maxBytes: 8 * 1024 * 1024,
    cacheTtlMs: 6 * 60 * 60 * 1000,
    minDomainIntervalMs: 150,
    headers: secHeaders,
    signal,
  });
  const payload = JSON.parse(new TextDecoder().decode(response.body)) as SecSubmissions;
  const recent = payload.filings?.recent ?? {};
  const accessions = Array.isArray(recent.accessionNumber) ? recent.accessionNumber : [];
  const filings: SecFiling[] = accessions.map((_, index) => ({
    accessionNumber: String(accessions[index] ?? ''),
    filingDate: String(recent.filingDate?.[index] ?? ''),
    reportDate: String(recent.reportDate?.[index] ?? ''),
    acceptanceDateTime: String(recent.acceptanceDateTime?.[index] ?? ''),
    form: String(recent.form?.[index] ?? ''),
    primaryDocument: String(recent.primaryDocument?.[index] ?? ''),
    primaryDocDescription: String(recent.primaryDocDescription?.[index] ?? ''),
  })).filter(filing => filing.accessionNumber && filing.form);
  return { payload, filings, url, retrievedAt: response.retrievedAt };
}

export function secFilingDocumentUrl(cik: string, filing: SecFiling) {
  const cikWithoutLeadingZeroes = String(Number(normalizeCik(cik)));
  const accession = filing.accessionNumber.replace(/-/g, '');
  const safeDocument = filing.primaryDocument.replace(/^\/+/, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikWithoutLeadingZeroes}/${accession}/${safeDocument}`;
}

export async function loadSecCompanyFacts(cik: string, signal?: AbortSignal) {
  const normalizedCik = normalizeCik(cik);
  if (!normalizedCik) throw new Error('SEC_CIK_REQUIRED');
  const url = `${SEC_COMPANY_FACTS_BASE}/CIK${normalizedCik}.json`;
  const response = await secureFetch(url, {
    acceptedContentTypes: ['application/json', 'text/json'],
    maxBytes: 14 * 1024 * 1024,
    cacheTtlMs: 6 * 60 * 60 * 1000,
    minDomainIntervalMs: 150,
    headers: secHeaders,
    signal,
  });
  return {
    payload: JSON.parse(new TextDecoder().decode(response.body)) as SecCompanyFacts,
    url,
    retrievedAt: response.retrievedAt,
  };
}

type FactSelection = SecFactUnit & { taxonomy: string; tag: string; label: string; unit: string };

function candidatesForTag(payload: SecCompanyFacts, taxonomy: string, tag: string) {
  const fact = payload.facts?.[taxonomy]?.[tag];
  if (!fact?.units) return [];
  return Object.entries(fact.units).flatMap(([unit, values]) => values.map(value => ({
    ...value,
    taxonomy,
    tag,
    label: fact.label ?? tag,
    unit,
  }))).filter((value): value is FactSelection => (
    typeof value.val === 'number'
    && Number.isFinite(value.val)
    && Boolean(value.end)
    && ['10-K', '10-Q', '20-F', '40-F'].includes(value.form ?? '')
  ));
}

function selectLatestFact(payload: SecCompanyFacts, tags: string[], periodEnd?: string | null) {
  const all = tags.flatMap(tag => candidatesForTag(payload, 'us-gaap', tag));
  const filtered = periodEnd ? all.filter(value => value.end === periodEnd) : all;
  return filtered.sort((a, b) => (
    String(b.end).localeCompare(String(a.end))
    || String(b.filed).localeCompare(String(a.filed))
    || Number(Boolean(b.frame)) - Number(Boolean(a.frame))
  ))[0] ?? null;
}

function buildFinancialValue(input: {
  selections: FactSelection[];
  normalizedField: NormalizedFinancialField;
  document: SourceDocument;
  formula: string;
  value?: number;
}): FinancialValue | null {
  const first = input.selections[0];
  if (!first?.end) return null;
  const value = input.value ?? input.selections.reduce((sum, selection) => sum + Number(selection.val), 0);
  return {
    id: crypto.randomUUID(),
    documentId: input.document.id,
    sourceUrl: input.document.sourceUrl,
    sourceTitle: input.document.sourceTitle,
    sourceTier: input.document.tier,
    reportingPeriod: first.fp ? `${first.fy ?? ''} ${first.fp}`.trim() : first.end,
    periodEnd: first.end,
    filedAt: first.filed ?? null,
    currency: first.unit === 'USD' ? 'USD' : first.unit,
    value,
    unit: first.unit,
    originalField: input.selections.map(selection => `${selection.taxonomy}:${selection.tag}`).join(' + '),
    normalizedField: input.normalizedField,
    normalizationFormula: input.formula,
    accessionNumber: first.accn ?? null,
    form: first.form ?? null,
  };
}

function chooseComponentSet(payload: SecCompanyFacts, alternatives: string[][], periodEnd: string) {
  for (const tags of alternatives) {
    const selections = tags.map(tag => selectLatestFact(payload, [tag], periodEnd)).filter((value): value is FactSelection => Boolean(value));
    if (selections.length === tags.length) return selections;
  }
  return [];
}

export function extractFinancialValuesFromCompanyFacts(payload: SecCompanyFacts, document: SourceDocument) {
  const assets = selectLatestFact(payload, ['Assets']);
  if (!assets?.end) return [];
  const periodEnd = assets.end;
  const values: FinancialValue[] = [];
  const add = (value: FinancialValue | null) => { if (value) values.push(value); };

  add(buildFinancialValue({
    selections: [assets],
    normalizedField: 'total_assets',
    document,
    formula: 'Direct XBRL value reported as total assets.',
    value: assets.val,
  }));

  const debt = chooseComponentSet(payload, [
    ['LongTermDebtAndFinanceLeaseObligationsCurrent', 'LongTermDebtAndFinanceLeaseObligationsNoncurrent', 'ShortTermBorrowings'],
    ['LongTermDebtCurrent', 'LongTermDebtNoncurrent', 'ShortTermBorrowings'],
    ['LongTermDebtAndFinanceLeaseObligationsCurrent', 'LongTermDebtAndFinanceLeaseObligationsNoncurrent'],
    ['LongTermDebtCurrent', 'LongTermDebtNoncurrent'],
    ['LongTermDebt', 'ShortTermBorrowings'],
    ['LongTermDebt'],
  ], periodEnd);
  add(buildFinancialValue({
    selections: debt,
    normalizedField: 'interest_bearing_debt',
    document,
    formula: `Sum of non-overlapping reported debt fields for ${periodEnd}; see original fields.`,
  }));

  const cash = selectLatestFact(payload, [
    'CashAndCashEquivalentsAtCarryingValue',
    'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
  ], periodEnd);
  if (cash) add(buildFinancialValue({
    selections: [cash],
    normalizedField: 'cash_and_equivalents',
    document,
    formula: 'Direct XBRL cash and cash-equivalents field.',
    value: cash.val,
  }));

  const securities = chooseComponentSet(payload, [
    ['MarketableSecuritiesCurrent', 'MarketableSecuritiesNoncurrent'],
    ['ShortTermInvestments', 'LongTermInvestments'],
    ['MarketableSecuritiesCurrent'],
    ['ShortTermInvestments'],
  ], periodEnd);
  add(buildFinancialValue({
    selections: securities,
    normalizedField: 'interest_bearing_securities',
    document,
    formula: 'Sum of reported marketable-security/investment fields; instrument composition remains visible for manual review.',
  }));

  const receivable = selectLatestFact(payload, ['AccountsReceivableNetCurrent', 'AccountsNotesAndLoansReceivableNetCurrent'], periodEnd);
  if (receivable) add(buildFinancialValue({
    selections: [receivable],
    normalizedField: 'accounts_receivable',
    document,
    formula: 'Direct XBRL net current receivables field.',
    value: receivable.val,
  }));

  const income = selectLatestFact(payload, ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet']);
  if (income) add(buildFinancialValue({
    selections: [income],
    normalizedField: 'total_income',
    document,
    formula: 'Latest annual or quarterly XBRL revenue field; no prohibited-income amount is inferred from it.',
    value: income.val,
  }));

  return values;
}

export function secSecurityPatch(security: SecurityIdentity, payload: SecSubmissions): Partial<SecurityIdentity> {
  return {
    name: payload.name?.trim() || security.name,
    cik: normalizeCik(payload.cik) ?? security.cik,
    sector: payload.sicDescription?.trim() || security.sector,
    previousNames: (payload.formerNames ?? []).map(entry => entry.name?.trim()).filter((name): name is string => Boolean(name)),
    aliases: Array.from(new Set([
      ...security.aliases,
      ...(payload.tickers ?? []),
      payload.name ?? '',
      ...(payload.formerNames ?? []).map(entry => entry.name ?? ''),
    ].filter(Boolean))),
  };
}
