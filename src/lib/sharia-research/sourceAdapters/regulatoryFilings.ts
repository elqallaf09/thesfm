import { createSourceDocument, evidenceSnippets } from '../contentExtraction';
import { extractFinancialValuesFromCompanyFacts, loadSecCompanyFacts, loadSecSubmissions, secSecurityPatch } from '../secData';
import type { SourceAdapter } from '../types';
import { BUSINESS_EVIDENCE_TERMS, emptyAdapterResult, failedAdapterResult } from './shared';

export const regulatoryFilingsAdapter: SourceAdapter = {
  id: 'regulatory-filings',
  label: 'SEC EDGAR regulatory filings and XBRL company facts',
  tier: 1,
  isEnabled: () => true,
  supports: security => Boolean(security.cik && String(security.country ?? '').toUpperCase() === 'US'),
  async research(context) {
    if (!context.security.cik) return emptyAdapterResult(this.id);
    try {
      const [submissions, companyFacts] = await Promise.all([
        loadSecSubmissions(context.security.cik, context.signal),
        loadSecCompanyFacts(context.security.cik, context.signal),
      ]);
      const recentFilings = submissions.filings
        .filter(filing => ['10-K', '10-Q', '20-F', '40-F', '8-K'].includes(filing.form))
        .slice(0, 25);
      const submissionText = [
        `Entity: ${submissions.payload.name ?? context.security.name}`,
        `SIC: ${submissions.payload.sic ?? ''} ${submissions.payload.sicDescription ?? ''}`,
        ...recentFilings.map(filing => `${filing.form} filed ${filing.filingDate}, report period ${filing.reportDate}, ${filing.primaryDocDescription || filing.primaryDocument}`),
      ].join('\n');
      const submissionDocument = createSourceDocument({
        adapterId: this.id,
        sourceTitle: `${submissions.payload.name ?? context.security.name} — EDGAR submissions`,
        publisher: 'U.S. Securities and Exchange Commission',
        url: submissions.url,
        retrievalDate: submissions.retrievedAt,
        sourceType: 'regulatory_filing',
        tier: 1,
        reliability: 'official',
        extractedText: submissionText,
        evidenceSnippets: evidenceSnippets(submissionText, ['SIC', '10-K', '10-Q', 'report period']),
        companyIdentifier: context.security.canonicalId,
        reportingPeriod: recentFilings[0]?.reportDate || null,
        mimeType: 'application/json',
        supports: ['security identity', 'filing dates', 'official filing availability', 'industry classification'],
      });

      const facts = companyFacts.payload.facts?.['us-gaap'] ?? {};
      const factNames = Object.entries(facts).map(([tag, fact]) => `${tag}: ${fact.label ?? ''}`).slice(0, 500);
      const factsText = [`Entity: ${companyFacts.payload.entityName ?? context.security.name}`, ...factNames].join('\n');
      const factsDocument = createSourceDocument({
        adapterId: this.id,
        sourceTitle: `${companyFacts.payload.entityName ?? context.security.name} — SEC XBRL company facts`,
        publisher: 'U.S. Securities and Exchange Commission',
        url: companyFacts.url,
        retrievalDate: companyFacts.retrievedAt,
        sourceType: 'regulatory_filing',
        tier: 1,
        reliability: 'official',
        extractedText: factsText,
        evidenceSnippets: evidenceSnippets(factsText, ['Assets', 'Debt', 'Cash', 'Receivable', 'Revenue']),
        companyIdentifier: context.security.canonicalId,
        reportingPeriod: recentFilings[0]?.reportDate || null,
        mimeType: 'application/json',
        supports: ['financial statement values', 'reporting period'],
      });
      const financialValues = extractFinancialValuesFromCompanyFacts(companyFacts.payload, factsDocument);
      const status = financialValues.length >= 4 ? 'success' : 'partial';
      return {
        adapterId: this.id,
        status,
        documents: [submissionDocument, factsDocument],
        financialValues,
        identityPatch: secSecurityPatch(context.security, submissions.payload),
        errors: financialValues.length >= 4 ? [] : [{ code: 'SEC_FINANCIAL_FIELDS_INCOMPLETE', message: 'The SEC facts set did not contain every methodology input for one current reporting period.', retryable: false }],
      };
    } catch (error) {
      return failedAdapterResult(this.id, error);
    }
  },
};
