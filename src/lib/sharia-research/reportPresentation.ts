import type {
  EvidenceItem,
  ResearchProgressStep,
  ShariaClassification,
  ShariaScreeningResult,
  SourceDocument,
  SourceType,
} from './types';
import type { ShariaResearchTranslationKey } from '@/lib/translations/sharia-research';

export type ReportSectionId =
  | 'quick'
  | 'ratios'
  | 'business'
  | 'calculations'
  | 'sources'
  | 'methodology'
  | 'references'
  | 'providers'
  | 'quality';

export const REPORT_SECTION_IDS: ReportSectionId[] = [
  'quick',
  'ratios',
  'business',
  'calculations',
  'sources',
  'methodology',
  'references',
  'providers',
  'quality',
];

export type ReportSourceCategory = 'company' | 'exchange' | 'screening' | 'standards' | 'supporting';

export type ReportSource = {
  key: string;
  document: SourceDocument;
  documentIds: string[];
  supports: string[];
  evidenceSnippets: string[];
};

export function classificationTranslationKey(classification: ShariaClassification): ShariaResearchTranslationKey {
  if (classification === 'conflicting_evidence') return 'sharia_research_status_requires_review';
  return `sharia_research_status_${classification}`;
}

export function classificationExplanationKey(classification: ShariaClassification): ShariaResearchTranslationKey {
  return `sharia_research_status_explanation_${classification}`;
}

export function classificationTone(classification: ShariaClassification) {
  if (classification === 'compliant') return 'pass' as const;
  if (classification === 'non_compliant') return 'fail' as const;
  if (classification === 'insufficient_current_data') return 'unavailable' as const;
  return 'review' as const;
}

export function screeningCounts(result: ShariaScreeningResult) {
  const statuses = [result.businessScreen.status, ...result.financialRatios.map(ratio => ratio.status)];
  return {
    passed: statuses.filter(status => status === 'pass').length,
    failed: statuses.filter(status => status === 'fail').length,
    unavailable: statuses.filter(status => status === 'unavailable' || status === 'review').length,
  };
}

export function stepTranslationKey(step: ResearchProgressStep): ShariaResearchTranslationKey {
  return `sharia_research_step_${step}`;
}

export function sourceCategory(sourceType: SourceType): ReportSourceCategory {
  if (['company_ir', 'annual_report', 'quarterly_report', 'fund_prospectus'].includes(sourceType)) return 'company';
  if (['exchange_filing', 'regulatory_filing'].includes(sourceType)) return 'exchange';
  if (sourceType === 'financial_data') return 'screening';
  if (['methodology', 'sharia_board_document'].includes(sourceType)) return 'standards';
  return 'supporting';
}

function sourceKey(document: SourceDocument) {
  try {
    const url = new URL(document.canonicalUrl || document.sourceUrl);
    url.hash = '';
    for (const name of Array.from(url.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(name)) url.searchParams.delete(name);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return [document.publisher, document.sourceTitle, document.publicationDate ?? document.filingDate ?? ''].join('|').toLowerCase();
  }
}

export function deduplicateReportSources(documents: SourceDocument[]) {
  const grouped = new Map<string, ReportSource>();
  for (const document of documents) {
    const key = sourceKey(document);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        key,
        document,
        documentIds: [document.id],
        supports: Array.from(new Set(document.supports)),
        evidenceSnippets: Array.from(new Set(document.evidenceSnippets.filter(Boolean))),
      });
      continue;
    }
    existing.documentIds.push(document.id);
    existing.supports = Array.from(new Set([...existing.supports, ...document.supports]));
    existing.evidenceSnippets = Array.from(new Set([
      ...existing.evidenceSnippets,
      ...document.evidenceSnippets.filter(Boolean),
    ]));
    const existingScore = existing.document.tier * 10 + (existing.document.reliability === 'official' ? 0 : 1);
    const candidateScore = document.tier * 10 + (document.reliability === 'official' ? 0 : 1);
    if (candidateScore < existingScore) existing.document = document;
  }
  return Array.from(grouped.values()).sort((a, b) => (
    a.document.tier - b.document.tier
    || String(b.document.publicationDate ?? b.document.filingDate ?? '').localeCompare(String(a.document.publicationDate ?? a.document.filingDate ?? ''))
  ));
}

export function groupReportSources(documents: SourceDocument[]) {
  const groups: Record<ReportSourceCategory, ReportSource[]> = {
    company: [],
    exchange: [],
    screening: [],
    standards: [],
    supporting: [],
  };
  for (const source of deduplicateReportSources(documents)) {
    groups[sourceCategory(source.document.sourceType)].push(source);
  }
  return groups;
}

export function reportSourceEvidence(source: ReportSource, evidence: EvidenceItem[]) {
  const documentIds = new Set(source.documentIds);
  return Array.from(new Set([
    ...evidence.filter(item => documentIds.has(item.documentId)).map(item => item.excerpt),
    ...source.evidenceSnippets,
  ].map(value => value.trim()).filter(Boolean)));
}

export function ratioNameTranslationKey(ruleId: string): ShariaResearchTranslationKey | null {
  if (ruleId === 'total-debt-to-assets') return 'sharia_research_ratio_interest_debt';
  if (ruleId === 'cash-interest-securities-to-assets') return 'sharia_research_ratio_cash_securities';
  if (ruleId === 'receivables-cash-to-assets') return 'sharia_research_ratio_receivables';
  if (ruleId === 'non-permissible-income') return 'sharia_research_ratio_non_permissible_income';
  return null;
}

export function financialFieldTranslationKey(field: string): ShariaResearchTranslationKey | null {
  const key = `sharia_research_field_${field}` as ShariaResearchTranslationKey;
  const supported = new Set<ShariaResearchTranslationKey>([
    'sharia_research_field_total_assets',
    'sharia_research_field_interest_bearing_debt',
    'sharia_research_field_cash_and_equivalents',
    'sharia_research_field_interest_bearing_securities',
    'sharia_research_field_accounts_receivable',
    'sharia_research_field_total_income',
    'sharia_research_field_prohibited_revenue',
    'sharia_research_field_interest_income',
    'sharia_research_field_market_capitalization',
  ]);
  return supported.has(key) ? key : null;
}
