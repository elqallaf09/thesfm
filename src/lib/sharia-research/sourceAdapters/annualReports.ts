import { loadSecSubmissions, secFilingDocumentUrl } from '../secData';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, failedAdapterResult, fetchDocument } from './shared';

export const annualReportsAdapter: SourceAdapter = {
  id: 'annual-reports',
  label: 'Official annual and quarterly filing documents',
  tier: 1,
  isEnabled: () => true,
  supports: security => Boolean(security.cik && String(security.country ?? '').toUpperCase() === 'US'),
  async research(context) {
    if (!context.security.cik) return emptyAdapterResult(this.id);
    try {
      const submissions = await loadSecSubmissions(context.security.cik, context.signal);
      const targetFilings = submissions.filings
        .filter(filing => ['10-K', '10-Q', '20-F', '40-F'].includes(filing.form) && filing.primaryDocument)
        .slice(0, 3);
      if (targetFilings.length === 0) return emptyAdapterResult(this.id);
      const settled = await Promise.allSettled(targetFilings.map(filing => fetchDocument({
        context,
        adapterId: this.id,
        url: secFilingDocumentUrl(context.security.cik!, filing),
        title: `${context.security.name} ${filing.form} — ${filing.reportDate || filing.filingDate}`,
        publisher: 'U.S. Securities and Exchange Commission',
        sourceType: filing.form === '10-Q' ? 'quarterly_report' : 'annual_report',
        tier: 1,
        reliability: 'official',
        publicationDate: filing.filingDate,
        filingDate: filing.filingDate,
        reportingPeriod: filing.reportDate,
        supports: ['business activity', 'subsidiaries', 'revenue categories', 'financial statement context'],
      })));
      const documents = settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const errors = settled.flatMap((result, index) => result.status === 'rejected' ? [{
        code: 'FILING_EXTRACTION_FAILED',
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        retryable: true,
        url: secFilingDocumentUrl(context.security.cik!, targetFilings[index]),
      }] : []);
      return { adapterId: this.id, status: documents.length === targetFilings.length ? 'success' : documents.length ? 'partial' : 'failed', documents, financialValues: [], errors };
    } catch (error) {
      return failedAdapterResult(this.id, error);
    }
  },
};
