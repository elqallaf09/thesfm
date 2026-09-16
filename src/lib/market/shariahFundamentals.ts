import { createHash } from 'node:crypto';
import type { ShariahScreeningData } from './shariah-screening';
import { createSourceDocument } from '@/lib/sharia-research/contentExtraction';
import { loadSecCompanyDirectory, loadSecSubmissions, loadSecCompanyFacts } from '@/lib/sharia-research/secData';
import { extractFinancialValuesFromCompanyFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { currentSecFilings, loadSecFilingEvidence } from '@/lib/sharia-research/secFilingEvidence';
import { regionalFilingsAdapter, regionalProfile } from '@/lib/sharia-research/regionalFilings';
import { EVIDENCE_VERSION, missingFinancialFields, financialFieldCoverage } from '@/lib/sharia-research/evidenceValidation';
import { normalizeQuery } from '@/lib/sharia-research/normalizeQuery';
import type { FinancialValue, SecurityIdentity, SourceDocument } from '@/lib/sharia-research/types';

export type ScreeningInput = {
  symbol: string; providerSymbol?: string | null; name?: string | null;
  exchange?: string | null; country?: string | null; sector?: string | null;
  industry?: string | null; description?: string | null; existing?: ShariahScreeningData | null;
  signal?: AbortSignal;
};

function sourceError(error: unknown, signal?: AbortSignal) {
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  return signal?.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
    ? 'official_provider_timed_out'
    : status === 429 ? 'official_provider_rate_limited' : status === 403 ? 'official_provider_access_denied'
      : code === 'DNS_RESOLUTION_FAILED' ? 'official_provider_dns_failed'
        : error instanceof Error && /^(official_|sec_)[a-z_]+$/.test(error.message) ? error.message : 'official_provider_fetch_failed';
}

/** Primary filings and their manifest bind issuer, accession, dates and units.
 * An aggregate API is a same-period supplement, never an older passing fallback.
 * Regional reports follow an exact issuer profile; no stale input numbers merge.
 */
export async function enrichShariahScreeningData(input: ScreeningInput) {
  const retrievedAt = new Date().toISOString();
  const symbols = [...new Set([input.providerSymbol, input.symbol].filter(Boolean).map(symbol => String(symbol).toUpperCase().replace(/\./g, '-')))];
  let security: SecurityIdentity = {
    canonicalId: `${input.exchange ?? 'UNKNOWN'}:${input.symbol}`, name: input.name || input.symbol,
    ticker: input.symbol, providerSymbol: input.providerSymbol || input.symbol, exchange: input.exchange || 'UNKNOWN',
    country: input.country, aliases: [], previousNames: [], identitySources: [],
  };
  const documents: SourceDocument[] = [];
  let financialValues: FinancialValue[] = [];
  const errors: string[] = [];
  const usListing = /^(US|USA|UNITED STATES)$/i.test(input.country ?? '')
    || /^(NASDAQ(?: GLOBAL (?:SELECT )?MARKET)?|NYSE|AMEX|XNAS|XNYS|ARCX)$/i.test(input.exchange ?? '');
  try {
    if (regionalProfile(security)) {
      const regional = await regionalFilingsAdapter.research({ security, query: normalizeQuery(input.symbol), retrievedAt, signal: input.signal });
      documents.push(...regional.documents);
      financialValues = regional.financialValues;
      security = { ...security, ...regional.identityPatch };
      if (!documents.length) errors.push('official_regional_document_unavailable');
      else errors.push('official_regional_coverage_partial');
    } else {
      if (!usListing) throw new Error('official_market_filing_adapter_unavailable');
      const directory = await loadSecCompanyDirectory(input.signal);
      const matches = directory.filter(company => symbols.includes(company.ticker.replace(/\./g, '-')));
      if (matches.length !== 1) throw new Error('sec_identity_not_uniquely_resolved');
      const company = matches[0];
      security = { ...security, cik: company.cik, name: company.name, ticker: company.ticker, providerSymbol: company.ticker, exchange: company.exchange,
        identitySources: [{ title: 'SEC issuer directory', url: 'https://www.sec.gov/files/company_tickers_exchange.json', publisher: 'SEC', retrievedAt, tier: 1 }] };
      const submissions = await loadSecSubmissions(company.cik, input.signal);
      const filings = currentSecFilings(submissions.filings, new Date(retrievedAt));
      const latest = filings[0];
      if (!latest) throw new Error('official_current_filing_not_found');
      const annual = filings.find(filing => /^(10-K|20-F|40-F)/.test(filing.form));
      const context = { security, query: normalizeQuery(company.ticker), retrievedAt, signal: input.signal };
      const targets = [latest, ...(annual && annual.accessionNumber !== latest.accessionNumber ? [annual] : [])];
      const [reports, aggregate] = await Promise.all([
        Promise.allSettled(targets.map(filing => loadSecFilingEvidence(context, filing))),
        loadSecCompanyFacts(company.cik, input.signal).then(value => ({ value, error: null as unknown }), error => ({ value: null, error })),
      ]);
      for (let i = 0; i < reports.length; i++) {
        const report = reports[i];
        if (report.status === 'rejected') { errors.push(sourceError(report.reason, input.signal)); continue; }
        documents.push(report.value.document);
        if (targets[i].reportDate === latest.reportDate) financialValues.push(...report.value.financialValues);
        if (report.value.extractionError) errors.push(report.value.extractionError);
      }
      if (aggregate.value) {
        const facts = aggregate.value;
        const document = createSourceDocument({ adapterId: 'regulatory-filings', sourceTitle: `${company.name} — SEC company facts`, publisher: 'SEC',
          url: facts.url, retrievalDate: facts.retrievedAt, sourceType: 'regulatory_filing', tier: 1, reliability: 'official',
          extractedText: `SEC structured values for ${company.cik}`, companyIdentifier: security.canonicalId,
          reportingPeriod: latest.reportDate, filingDate: latest.filingDate, mimeType: 'application/json' });
        const supplemental = extractFinancialValuesFromCompanyFacts({ ...facts.payload, reportingPeriod: latest.reportDate,
          expectedAccession: latest.accessionNumber }, document);
        document.extractedText = JSON.stringify(supplemental.map(value => ({ field: value.originalField, value: value.value,
          currency: value.currency, start: value.periodStart, end: value.periodEnd, accession: value.accessionNumber, validation: value.validation })));
        document.contentHash = createHash('sha256').update(document.extractedText).digest('hex');
        documents.push(document);
        // Retain independently reported bounds and conflicts; the calculator,
        // not the provider preference, decides whether they are compatible.
        financialValues.push(...supplemental);
      } else errors.push(sourceError(aggregate.error, input.signal));
    }
  } catch (error) { errors.push(sourceError(error, input.signal)); }
  const period = documents.map(document => document.reportingPeriod).filter((value): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))).sort().at(-1) ?? null;
  const coverage = financialFieldCoverage(financialValues, period, new Date(retrievedAt));
  const missingFields = missingFinancialFields(financialValues, new Date(retrievedAt));
  const data: ShariahScreeningData = {
    evidenceVersion: EVIDENCE_VERSION, security, documents, financialValues, fieldCoverage: coverage,
    screeningDataSources: [...new Set(documents.map(document => document.publisher))],
    screeningDataQuality: missingFields.length ? 'partial' : 'complete_reported',
    missingFinancialFields: missingFields, fetchErrors: errors, fetchedAt: retrievedAt,
  };
  return { data, security, documents, financialValues, complete: missingFields.length === 0, sources: documents.map(document => document.sourceUrl), estimatedFields: [], errors };
}
