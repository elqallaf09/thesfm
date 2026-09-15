import { createSourceDocument, extractHtmlContent, evidenceSnippets } from './contentExtraction';
import { secureFetch } from './secureFetch';
import { secFilingDocumentUrl, type SecFiling } from './secData';
import { parseInlineXbrlFacts } from './inlineXbrl';
import { extractFinancialValuesFromCompanyFacts } from './secFinancialExtraction';
import { currentDay } from './evidenceValidation';
import { BUSINESS_EVIDENCE_TERMS } from './sourceAdapters/shared';
import type { AdapterContext, FinancialValue } from './types';

export function currentSecFilings(filings: SecFiling[], now = new Date()) {
  return filings.filter(filing => /^(10-[KQ](?:\/A)?|20-F(?:\/A)?|40-F(?:\/A)?)$/.test(filing.form)
    && filing.primaryDocument && currentDay(filing.reportDate, now) && currentDay(filing.filingDate, now)
    && filing.filingDate >= filing.reportDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.filingDate.localeCompare(a.filingDate));
}

/** One public primary filing supplies BOTH its narrative and current inline-XBRL.
 * The SEC submissions manifest binds CIK, accession, period and document path.
 */
export async function loadSecFilingEvidence(context: AdapterContext, filing: SecFiling) {
  if (!context.security.cik) throw new Error('sec_cik_required');
  const url = secFilingDocumentUrl(context.security.cik, filing);
  const response = await secureFetch(url, {
    acceptedContentTypes: ['text/html', 'application/xhtml+xml'], maxBytes: 15 * 1024 * 1024,
    cacheTtlMs: 6 * 60 * 60 * 1000, minDomainIntervalMs: 150,
    headers: { 'user-agent': process.env.SEC_USER_AGENT || 'THE-SFM admin@the-sfm.com' }, signal: context.signal,
  });
  if (response.finalUrl !== url) throw new Error('sec_unexpected_filing_redirect');
  const html = new TextDecoder('utf-8', { fatal: true }).decode(response.body);
  const extracted = extractHtmlContent(html);
  const document = createSourceDocument({ adapterId: 'annual-reports', sourceTitle: `${context.security.name} ${filing.form} — ${filing.reportDate}`,
    publisher: 'U.S. Securities and Exchange Commission', url, retrievalDate: response.retrievedAt,
    sourceType: filing.form.startsWith('10-Q') ? 'quarterly_report' : 'annual_report', tier: 1, reliability: 'official',
    companyIdentifier: context.security.canonicalId, reportingPeriod: filing.reportDate, publicationDate: filing.filingDate,
    filingDate: filing.filingDate, extractedText: extracted.text, evidenceSnippets: evidenceSnippets(extracted.text, BUSINESS_EVIDENCE_TERMS),
    mimeType: response.contentType, supports: ['issuer business narrative', 'inline-XBRL financial facts'] });
  let financialValues: FinancialValue[] = [];
  let extractionError: string | null = null;
  try {
    financialValues = extractFinancialValuesFromCompanyFacts(parseInlineXbrlFacts(html, context.security.cik, filing, new Date(context.retrievedAt)), document);
    if (!financialValues.length) extractionError = 'official_inline_financial_fields_unavailable';
  } catch {
    // An unsupported numeric format cannot be repaired with guessed numbers.
    // The successfully extracted narrative remains available with this warning.
    extractionError = 'official_inline_financial_extraction_failed';
  }
  return { document, financialValues, extractionError };
}
