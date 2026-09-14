import { randomUUID } from 'node:crypto';
import { EVIDENCE_VERSION, INCOME_FIELDS } from '@/lib/sharia-research/evidenceValidation';
import { createSourceDocument } from '@/lib/sharia-research/contentExtraction';
import type { FinancialValue, SecurityIdentity } from '@/lib/sharia-research/types';

// Synthetic accounting fixtures. Never exported into production catalogs.
export const security: SecurityIdentity = { canonicalId: 'NASDAQ:TEST', ticker: 'TEST', providerSymbol: 'TEST', name: 'Test Software Inc.', exchange: 'NASDAQ', country: 'US', currency: 'USD', aliases: [], previousNames: [], identitySources: [] };
export function evidenceFixture(text = 'The company develops enterprise software and computing products.') {
  const document = createSourceDocument({ adapterId: 'annual-reports', sourceTitle: 'Synthetic official report', publisher: 'SEC',
    url: 'https://www.sec.gov/Archives/edgar/data/1/report.htm', publicationDate: '2026-08-01', filingDate: '2026-08-01', retrievalDate: '2026-09-14T00:00:00Z',
    sourceType: 'annual_report', tier: 1, reliability: 'official', extractedText: `${text} ${'Operating disclosure. '.repeat(35)}`, companyIdentifier: security.canonicalId, reportingPeriod: '2026-06-30' });
  const field = (normalizedField: FinancialValue['normalizedField'], value: number): FinancialValue => ({ id: randomUUID(), documentId: document.id,
    sourceUrl: document.sourceUrl, sourceTitle: document.sourceTitle, sourceTier: 1, reportingPeriod: '2026-06-30', periodEnd: '2026-06-30',
    periodStart: INCOME_FIELDS.has(normalizedField) ? '2026-01-01' : null, filedAt: '2026-08-01', currency: 'USD', value, unit: 'USD',
    originalField: normalizedField, normalizedField, normalizationFormula: 'Explicit synthetic test disclosure.', accessionNumber: '1-26-1', form: '10-Q',
    validation: { version: EVIDENCE_VERSION, bound: 'exact', note: 'Explicit complete synthetic test field.' } });
  const values = [field('total_assets', 100), field('interest_bearing_debt', 12), field('cash_and_equivalents', 10), field('interest_bearing_securities', 8),
    field('accounts_receivable', 12), field('total_income', 100), field('interest_income', 1), field('prohibited_revenue', 0)];
  return { security, document, values, field, bag: { security, documents: [document], financialValues: values } };
}
