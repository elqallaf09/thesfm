import { loadSecSubmissions, secFilingDocumentUrl } from '../secData';
import { currentSecFilings, loadSecFilingEvidence } from '../secFilingEvidence';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, failedAdapterResult } from './shared';

export const annualReportsAdapter: SourceAdapter = {
  id: 'annual-reports', label: 'Official annual and quarterly filing documents', tier: 1,
  isEnabled: () => true, supports: security => Boolean(security.cik),
  async research(context) {
    if (!context.security.cik) return emptyAdapterResult(this.id);
    try {
      const submissions = await loadSecSubmissions(context.security.cik, context.signal);
      const filings = currentSecFilings(submissions.filings, new Date(context.retrievedAt));
      if (!filings.length) return emptyAdapterResult(this.id);
      const annual = filings.find(filing => /^(10-K|20-F|40-F)/.test(filing.form));
      const targetFilings = [filings[0], ...(annual && annual.accessionNumber !== filings[0].accessionNumber ? [annual] : [])];
      const settled = await Promise.allSettled(targetFilings.map(filing => loadSecFilingEvidence(context, filing)));
      const documents = settled.flatMap(result => result.status === 'fulfilled' ? [result.value.document] : []);
      const financialValues = settled.flatMap((result, index) => result.status === 'fulfilled' && targetFilings[index].reportDate === filings[0].reportDate ? result.value.financialValues : []);
      const errors = settled.flatMap((result, index) => result.status === 'rejected' || result.value.extractionError ? [{
        code: result.status === 'rejected' ? 'FILING_EXTRACTION_FAILED' : 'INLINE_FINANCIAL_COVERAGE_PARTIAL',
        message: 'The official report could not provide a complete supported numeric extraction; unavailable values were not guessed.',
        retryable: result.status === 'rejected', url: secFilingDocumentUrl(context.security.cik!, targetFilings[index]),
      }] : []);
      return { adapterId: this.id, status: !documents.length ? 'failed' : errors.length ? 'partial' : 'success', documents, financialValues, errors };
    } catch (error) { return failedAdapterResult(this.id, error); }
  },
};
