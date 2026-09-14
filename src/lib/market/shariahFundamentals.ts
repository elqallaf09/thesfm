import { createHash } from 'node:crypto';
import type { ShariahScreeningData } from './shariah-screening';
import { createSourceDocument } from '@/lib/sharia-research/contentExtraction';
import { loadSecCompanyDirectory, loadSecSubmissions, loadSecCompanyFacts, secFilingDocumentUrl } from '@/lib/sharia-research/secData';
import { extractFinancialValuesFromCompanyFacts } from '@/lib/sharia-research/secFinancialExtraction';
import { EVIDENCE_VERSION, missingFinancialFields } from '@/lib/sharia-research/evidenceValidation';
import { fetchDocument } from '@/lib/sharia-research/sourceAdapters/shared';
import { normalizeQuery } from '@/lib/sharia-research/normalizeQuery';
import type { FinancialValue, SecurityIdentity, SourceDocument } from '@/lib/sharia-research/types';

export type ScreeningInput = {
  symbol: string; providerSymbol?: string | null; name?: string | null;
  exchange?: string | null; country?: string | null; sector?: string | null;
  industry?: string | null; description?: string | null; existing?: ShariahScreeningData | null;
  signal?: AbortSignal;
};

/** No stale-ratio merge and no unsourced Yahoo/FMP zero-filled fallback. */
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
  // Do not map a Kuwait/Europe ticker to an unrelated US issuer sharing that ticker.
  const usListing = /^(US|USA|UNITED STATES)$/i.test(input.country ?? '') || /NASDAQ|NYSE|AMEX|XNAS|XNYS|ARCX/i.test(input.exchange ?? '');
  try {
    if (!usListing) throw new Error('official_market_filing_adapter_unavailable');
    const directory = await loadSecCompanyDirectory(input.signal);
    const matches = directory.filter(company => symbols.includes(company.ticker.replace(/\./g, '-')));
    if (matches.length !== 1) throw new Error('sec_identity_not_uniquely_resolved');
    const company = matches[0];
    const [submissions, facts] = await Promise.all([
      loadSecSubmissions(company.cik, input.signal), loadSecCompanyFacts(company.cik, input.signal),
    ]);
    security = { ...security, cik: company.cik, name: company.name, ticker: company.ticker, providerSymbol: company.ticker, exchange: company.exchange,
      identitySources: [{ title: 'SEC issuer directory', url: 'https://www.sec.gov/files/company_tickers_exchange.json', publisher: 'SEC', retrievedAt, tier: 1 }] };
    const document = createSourceDocument({
      adapterId: 'regulatory-filings', sourceTitle: `${company.name} — SEC company facts`, publisher: 'SEC',
      url: facts.url, retrievalDate: facts.retrievedAt, sourceType: 'regulatory_filing', tier: 1, reliability: 'official',
      extractedText: `SEC structured filing values for ${company.cik}`, companyIdentifier: security.canonicalId, mimeType: 'application/json',
    });
    financialValues = extractFinancialValuesFromCompanyFacts(facts.payload, document);
    // Persist the actual normalized evidence, not only a list of tag names.
    document.extractedText = JSON.stringify(financialValues.map(value => ({ field: value.originalField, value: value.value,
      currency: value.currency, start: value.periodStart, end: value.periodEnd, accession: value.accessionNumber, validation: value.validation })));
    document.contentHash = createHash('sha256').update(document.extractedText).digest('hex');
    document.reportingPeriod = financialValues.find(value => value.normalizedField === 'total_assets')?.periodEnd ?? null;
    documents.push(document);
    const annual = submissions.filings.find(filing => ['10-K', '10-K/A', '20-F', '40-F'].includes(filing.form) && filing.primaryDocument);
    if (annual) {
      try {
        documents.push(await fetchDocument({
          context: { security, query: normalizeQuery(company.ticker), retrievedAt, signal: input.signal },
          adapterId: 'annual-reports', url: secFilingDocumentUrl(company.cik, annual), title: `${company.name} ${annual.form}`,
          publisher: 'SEC', sourceType: 'annual_report', tier: 1, reliability: 'official',
          filingDate: annual.filingDate, publicationDate: annual.filingDate, reportingPeriod: annual.reportDate,
        }));
      } catch { errors.push('official_business_document_unavailable'); }
    } else errors.push('official_business_document_not_found');
  } catch (error) { errors.push(error instanceof Error && /^official_|^sec_/.test(error.message) ? error.message : 'official_provider_fetch_failed'); }
  const missingFields = missingFinancialFields(financialValues);
  const data: ShariahScreeningData = {
    evidenceVersion: EVIDENCE_VERSION, security, documents, financialValues,
    screeningDataSources: [...new Set(documents.map(document => document.publisher))],
    screeningDataQuality: missingFields.length ? 'partial' : 'complete_reported',
    missingFinancialFields: missingFields, fetchErrors: errors, fetchedAt: retrievedAt,
    // Intentionally never copy input.existing numbers: absence cannot refresh old evidence.
  };
  return { data, security, documents, financialValues, complete: missingFields.length === 0, sources: documents.map(document => document.sourceUrl), estimatedFields: [], errors };
}
