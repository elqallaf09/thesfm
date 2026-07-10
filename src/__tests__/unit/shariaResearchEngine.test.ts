import { describe, expect, it } from 'vitest';
import { createSourceDocument } from '@/lib/sharia-research/contentExtraction';
import { deduplicateEvidence } from '@/lib/sharia-research/evidenceDeduplication';
import { resolveFinancialConflicts } from '@/lib/sharia-research/conflictResolver';
import { calculateFinancialRatios, isFinancialDataStale } from '@/lib/sharia-research/financialRatioCalculator';
import { MSCI_ISLAMIC_INDEX_JULY_2025 } from '@/lib/sharia-research/methodologies';
import { analyzeShariaEvidence } from '@/lib/sharia-research/shariaAnalyzer';
import type { FinancialValue, SecurityIdentity, SourceDocument } from '@/lib/sharia-research/types';

const security: SecurityIdentity = {
  canonicalId: 'NASDAQ:TEST',
  name: 'Evidence Technology Corporation',
  ticker: 'TEST',
  providerSymbol: 'TEST',
  exchange: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  aliases: [],
  previousNames: [],
  identitySources: [],
};

function officialAnnualReport(text = 'The company develops enterprise software and computing products. '.repeat(20)): SourceDocument {
  return createSourceDocument({
    adapterId: 'annual-reports',
    sourceTitle: 'Current annual report',
    publisher: 'U.S. Securities and Exchange Commission',
    url: 'https://www.sec.gov/Archives/edgar/data/1/report.htm',
    publicationDate: '2026-05-10',
    filingDate: '2026-05-10',
    retrievalDate: '2026-07-10T00:00:00.000Z',
    sourceType: 'annual_report',
    tier: 1,
    reliability: 'official',
    extractedText: text,
    evidenceSnippets: [text.slice(0, 400)],
    companyIdentifier: security.canonicalId,
    reportingPeriod: '2026-04-30',
  });
}

function financial(document: SourceDocument, field: FinancialValue['normalizedField'], value: number, originalField = field): FinancialValue {
  return {
    id: crypto.randomUUID(),
    documentId: document.id,
    sourceUrl: document.sourceUrl,
    sourceTitle: document.sourceTitle,
    sourceTier: 1,
    reportingPeriod: '2026 Q1',
    periodEnd: '2026-04-30',
    filedAt: '2026-05-10',
    currency: 'USD',
    value,
    unit: 'USD',
    originalField,
    normalizedField: field,
    normalizationFormula: 'Direct test filing value.',
    form: '10-Q',
  };
}

function completeValues(document: SourceDocument) {
  return [
    financial(document, 'total_assets', 1_000),
    financial(document, 'interest_bearing_debt', 200),
    financial(document, 'cash_and_equivalents', 100),
    financial(document, 'interest_bearing_securities', 50),
    financial(document, 'accounts_receivable', 120),
    financial(document, 'total_income', 1_000),
    financial(document, 'prohibited_revenue', 0),
    financial(document, 'interest_income', 0),
  ];
}

describe('evidence-based Shariah analysis', () => {
  it('deduplicates syndicated or repeated copies and preserves grouped URLs', () => {
    const first = officialAnnualReport();
    const second = { ...first, id: crypto.randomUUID(), sourceUrl: `${first.sourceUrl}?utm_source=test`, canonicalUrl: `${first.sourceUrl}?utm_source=test` };
    const deduped = deduplicateEvidence([first, second]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].groupedUrls).toHaveLength(2);
  });

  it('does not fill missing financial values and returns unavailable ratios', () => {
    const document = officialAnnualReport();
    const ratios = calculateFinancialRatios([financial(document, 'total_assets', 1_000)], MSCI_ISLAMIC_INDEX_JULY_2025);
    expect(ratios.every(ratio => ratio.status === 'unavailable')).toBe(true);
    expect(ratios[0].warning).toContain('No zero value was assumed');
  });

  it('marks a complete, current, passing evidence set compliant', () => {
    const document = officialAnnualReport();
    const result = analyzeShariaEvidence({
      security,
      documents: [document],
      financialValues: completeValues(document),
      methodology: MSCI_ISLAMIC_INDEX_JULY_2025,
      retrievedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(result.classification).toBe('compliant');
    expect(result.financialRatios.every(ratio => ratio.status === 'pass')).toBe(true);
  });

  it('never converts incomplete evidence into a compliant result', () => {
    const document = officialAnnualReport();
    const result = analyzeShariaEvidence({
      security,
      documents: [document],
      financialValues: [financial(document, 'total_assets', 1_000)],
      methodology: MSCI_ISLAMIC_INDEX_JULY_2025,
      retrievedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(result.classification).toBe('insufficient_current_data');
    expect(result.unavailableChecks.length).toBeGreaterThan(0);
  });

  it('fails a current financial ratio that exceeds the documented entry threshold', () => {
    const document = officialAnnualReport();
    const values = completeValues(document).map(value => value.normalizedField === 'interest_bearing_debt' ? { ...value, value: 450 } : value);
    const result = analyzeShariaEvidence({ security, documents: [document], financialValues: values, methodology: MSCI_ISLAMIC_INDEX_JULY_2025, retrievedAt: '2026-07-10T00:00:00.000Z' });
    expect(result.classification).toBe('non_compliant');
    expect(result.financialRatios.find(ratio => ratio.ruleId === 'total-debt-to-assets')?.status).toBe('fail');
  });

  it('detects stale financial statements before returning a positive result', () => {
    expect(isFinancialDataStale('2024-01-01', 15, new Date('2026-07-10T00:00:00.000Z'))).toBe(true);
    const document = officialAnnualReport();
    const oldValues = completeValues(document).map(value => ({ ...value, periodEnd: '2024-01-01', reportingPeriod: '2023 FY' }));
    const result = analyzeShariaEvidence({ security, documents: [document], financialValues: oldValues, methodology: MSCI_ISLAMIC_INDEX_JULY_2025, retrievedAt: '2026-07-10T00:00:00.000Z' });
    expect(result.classification).toBe('insufficient_current_data');
  });

  it('surfaces materially conflicting values instead of hiding them', () => {
    const document = officialAnnualReport();
    const other = { ...document, id: crypto.randomUUID(), sourceTitle: 'Second official filing', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1/other.htm', canonicalUrl: 'https://www.sec.gov/Archives/edgar/data/1/other.htm', contentHash: 'different' };
    const evidence: Parameters<typeof resolveFinancialConflicts>[2] = [];
    const conflicts = resolveFinancialConflicts([
      financial(document, 'total_assets', 1_000),
      { ...financial(other, 'total_assets', 1_300), documentId: other.id, sourceUrl: other.sourceUrl, sourceTitle: other.sourceTitle },
    ], [document, other], evidence);
    expect(conflicts).toHaveLength(1);
    const result = analyzeShariaEvidence({ security, documents: [document, other], financialValues: completeValues(document), methodology: MSCI_ISLAMIC_INDEX_JULY_2025, conflicts, evidence, retrievedAt: '2026-07-10T00:00:00.000Z' });
    expect(result.classification).toBe('conflicting_evidence');
    expect(result.evidence.filter(item => item.category === 'conflict')).toHaveLength(2);
  });

  it('pins every threshold to the methodology version and official source', () => {
    expect(MSCI_ISLAMIC_INDEX_JULY_2025.version).toBe('2025-07');
    expect(MSCI_ISLAMIC_INDEX_JULY_2025.sourceDocument.url).toMatch(/^https:\/\/www\.msci\.com\//);
    expect(MSCI_ISLAMIC_INDEX_JULY_2025.financialRatioRules.map(rule => rule.threshold)).toEqual([0.30, 0.30, 0.46]);
  });
});
