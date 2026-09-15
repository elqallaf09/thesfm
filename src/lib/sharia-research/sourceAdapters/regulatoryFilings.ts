import { createHash } from 'node:crypto';
import { missingFinancialFields } from '../evidenceValidation';
import { createSourceDocument, evidenceSnippets } from '../contentExtraction';
import { extractFinancialValuesFromCompanyFacts, loadSecCompanyFacts, loadSecSubmissions, secSecurityPatch } from '../secData';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, failedAdapterResult } from './shared';

export const regulatoryFilingsAdapter: SourceAdapter = {
  id: 'regulatory-filings',
  label: 'SEC EDGAR regulatory filings and XBRL company facts',
  tier: 1,
  isEnabled: () => true,
  supports: security => Boolean(security.cik),
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
      factsDocument.extractedText = JSON.stringify(financialValues.map(value => ({
        field: value.originalField, value: value.value, currency: value.currency,
        start: value.periodStart, end: value.periodEnd, accession: value.accessionNumber, validation: value.validation,
      })));
      factsDocument.contentHash = createHash('sha256').update(factsDocument.extractedText).digest('hex');
      const missing = missingFinancialFields(financialValues, new Date(context.retrievedAt));
      const status = missing.length ? 'partial' : 'success';
      return {
        adapterId: this.id,
        status,
        documents: [submissionDocument, factsDocument],
        financialValues,
        identityPatch: secSecurityPatch(context.security, submissions.payload),
        errors: missing.length ? [{ code: 'SEC_FINANCIAL_FIELDS_INCOMPLETE', message: `Missing exact evidence: ${missing.join(', ')}. Disclosed lower bounds can prove failure but cannot prove a pass.`, retryable: false }] : [],
      };
    } catch (error) {
      return failedAdapterResult(this.id, error);
    }
  },
};
