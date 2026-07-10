import { describe, expect, it } from 'vitest';
import {
  classificationExplanationKey,
  classificationTone,
  classificationTranslationKey,
  deduplicateReportSources,
  groupReportSources,
  ratioNameTranslationKey,
  reportSourceEvidence,
  screeningCounts,
} from '@/lib/sharia-research/reportPresentation';
import type { ShariaClassification, ShariaScreeningResult, SourceDocument } from '@/lib/sharia-research/types';

const classifications: ShariaClassification[] = [
  'compliant',
  'non_compliant',
  'requires_review',
  'insufficient_current_data',
  'conflicting_evidence',
];

function document(overrides: Partial<SourceDocument> = {}): SourceDocument {
  return {
    id: 'document-1',
    adapterId: 'annual-reports',
    sourceTitle: 'Annual report',
    publisher: 'Example Corp',
    domain: 'example.com',
    sourceUrl: 'https://example.com/report.pdf?utm_source=test',
    canonicalUrl: 'https://example.com/report.pdf',
    publicationDate: '2026-03-01',
    filingDate: null,
    retrievalDate: '2026-07-10T00:00:00.000Z',
    sourceType: 'annual_report',
    tier: 1,
    reliability: 'official',
    extractedText: '',
    evidenceSnippets: ['Primary business activity'],
    companyIdentifier: 'EXAMPLE',
    reportingPeriod: '2025-12-31',
    contentHash: 'content-hash',
    mimeType: 'application/pdf',
    extractionStatus: 'success',
    error: null,
    supports: ['business activity'],
    ...overrides,
  };
}

describe('Sharia research report presentation', () => {
  it('maps every compliance classification to text, explanation, and visual tone', () => {
    for (const classification of classifications) {
      expect(classificationTranslationKey(classification)).toBe(classification === 'conflicting_evidence'
        ? 'sharia_research_status_requires_review'
        : `sharia_research_status_${classification}`);
      expect(classificationExplanationKey(classification)).toBe(`sharia_research_status_explanation_${classification}`);
      expect(['pass', 'fail', 'review', 'unavailable']).toContain(classificationTone(classification));
    }
  });

  it('counts pass, fail, review, and missing criteria without treating review as pass', () => {
    const result = {
      businessScreen: { status: 'review' },
      financialRatios: [{ status: 'pass' }, { status: 'fail' }, { status: 'unavailable' }],
    } as unknown as ShariaScreeningResult;
    expect(screeningCounts(result)).toEqual({ passed: 1, failed: 1, unavailable: 2 });
  });

  it('uses localized labels for the methodology ratio ids', () => {
    expect(ratioNameTranslationKey('total-debt-to-assets')).toBe('sharia_research_ratio_interest_debt');
    expect(ratioNameTranslationKey('cash-interest-securities-to-assets')).toBe('sharia_research_ratio_cash_securities');
    expect(ratioNameTranslationKey('receivables-cash-to-assets')).toBe('sharia_research_ratio_receivables');
    expect(ratioNameTranslationKey('internal_unknown_key')).toBeNull();
  });

  it('deduplicates tracking variants and merges extracted findings', () => {
    const duplicate = document({
      id: 'document-2',
      sourceUrl: 'https://www.example.com/report.pdf?utm_campaign=copy',
      canonicalUrl: 'https://www.example.com/report.pdf#page=2',
      evidenceSnippets: ['Revenue categories'],
      supports: ['financial values'],
    });
    const sources = deduplicateReportSources([document(), duplicate]);
    expect(sources).toHaveLength(1);
    expect(sources[0].documentIds).toEqual(['document-1', 'document-2']);
    expect(sources[0].evidenceSnippets).toEqual(['Primary business activity', 'Revenue categories']);
    expect(sources[0].supports).toEqual(['business activity', 'financial values']);
  });

  it('groups official disclosures separately from supporting news', () => {
    const news = document({ id: 'news-1', sourceType: 'news', sourceUrl: 'https://news.example.org/story', canonicalUrl: 'https://news.example.org/story', publisher: 'News Example' });
    const groups = groupReportSources([document(), news]);
    expect(groups.company).toHaveLength(1);
    expect(groups.supporting).toHaveLength(1);
    expect(groups.exchange).toHaveLength(0);
  });

  it('merges source evidence for the printable report without exposing provider fields', () => {
    const sources = deduplicateReportSources([document()]);
    const excerpts = reportSourceEvidence(sources[0], [{
      id: 'evidence-1',
      documentId: 'document-1',
      category: 'business_activity',
      conclusion: 'Business activity identified',
      excerpt: 'The company manufactures semiconductors.',
      sourceUrl: 'https://example.com/report.pdf',
      sourceTitle: 'Annual report',
      publisher: 'Example Corp',
      publicationDate: '2026-03-01',
      retrievalDate: '2026-07-10T00:00:00.000Z',
      tier: 1,
      reliability: 'official',
      reportingPeriod: '2025-12-31',
    }]);
    expect(excerpts).toEqual(['The company manufactures semiconductors.', 'Primary business activity']);
  });
});
