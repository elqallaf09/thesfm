import 'server-only';

import {
  SEC_TICKER_DIRECTORY_URL,
  loadSecCompanyDirectory,
  loadSecCompanyFacts,
  loadSecSubmissions,
  secFilingDocumentUrl,
  type SecCompany,
  type SecFiling,
} from '@/lib/sharia-research/secData';
import type { SfmOfficialFiling, SfmRegulatorEvidence } from '@/lib/sfm-market/types';

const PERIODIC_FORMS = new Set(['10-K', '10-Q', '20-F', '40-F', '10-K/A', '10-Q/A', '20-F/A', '40-F/A']);
const CURRENT_REPORT_FORMS = new Set(['8-K', '8-K/A', '6-K', '6-K/A']);

function compactTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function baseEvidence(
  symbol: string,
  status: SfmRegulatorEvidence['status'],
  reason: string | null,
): SfmRegulatorEvidence {
  return {
    status,
    regulator: 'SEC',
    sourceClass: 'regulator',
    sourceUrl: SEC_TICKER_DIRECTORY_URL,
    retrievedAt: null,
    symbol,
    cik: null,
    entityName: null,
    exchange: null,
    latestPeriodicFiling: null,
    latestCurrentReport: null,
    xbrlConceptCount: null,
    reason,
  };
}

function resolveSecCompany(companies: SecCompany[], symbol: string) {
  const wanted = compactTicker(symbol);
  if (!wanted) return null;
  const matches = companies.filter(company => compactTicker(company.ticker) === wanted);
  return matches.length === 1 ? matches[0] : null;
}

function filingEvidence(company: SecCompany, filing: SecFiling | undefined): SfmOfficialFiling | null {
  if (!filing) return null;
  return {
    form: filing.form,
    filingDate: filing.filingDate,
    reportDate: filing.reportDate || null,
    accessionNumber: filing.accessionNumber,
    documentUrl: secFilingDocumentUrl(company.cik, filing),
  };
}

function conceptCount(payload: Awaited<ReturnType<typeof loadSecCompanyFacts>>['payload']) {
  const facts = payload.facts ?? {};
  return Object.values(facts).reduce((sum, taxonomy) => sum + Object.keys(taxonomy ?? {}).length, 0);
}

export function secNotApplicable(symbol: string, reason = 'SEC evidence applies to securities with a resolvable SEC issuer identity.') {
  return baseEvidence(symbol, 'not_applicable', reason);
}

export async function getSecOfficialEvidence(symbolInput: string, signal?: AbortSignal): Promise<SfmRegulatorEvidence> {
  const symbol = symbolInput.trim().toUpperCase();
  if (!symbol) return baseEvidence(symbol, 'not_found', 'A symbol is required to resolve SEC evidence.');

  try {
    const companies = await loadSecCompanyDirectory(signal);
    const company = resolveSecCompany(companies, symbol);
    if (!company) {
      return baseEvidence(symbol, 'not_found', 'No unique SEC ticker identity was resolved for this symbol.');
    }

    const [submissions, companyFacts] = await Promise.all([
      loadSecSubmissions(company.cik, signal),
      loadSecCompanyFacts(company.cik, signal),
    ]);

    const latestPeriodic = submissions.filings.find(filing => PERIODIC_FORMS.has(filing.form));
    const latestCurrentReport = submissions.filings.find(filing => CURRENT_REPORT_FORMS.has(filing.form));
    const retrievedAt = [submissions.retrievedAt, companyFacts.retrievedAt]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return {
      status: 'ready',
      regulator: 'SEC',
      sourceClass: 'regulator',
      sourceUrl: companyFacts.url,
      retrievedAt,
      symbol,
      cik: company.cik,
      entityName: companyFacts.payload.entityName?.trim() || company.name,
      exchange: company.exchange || null,
      latestPeriodicFiling: filingEvidence(company, latestPeriodic),
      latestCurrentReport: filingEvidence(company, latestCurrentReport),
      xbrlConceptCount: conceptCount(companyFacts.payload),
      reason: null,
    };
  } catch (error) {
    const code = error instanceof Error && error.message ? error.message : 'SEC_SOURCE_UNAVAILABLE';
    return baseEvidence(symbol, 'unavailable', code);
  }
}
