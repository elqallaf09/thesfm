import type { SourceDocument, SourceQualityBreakdown } from './types';

const RELIABILITY_WEIGHT: Record<SourceDocument['reliability'], number> = {
  official: 24,
  high: 16,
  medium: 10,
  context_only: 3,
  unknown: 1,
};

export function scoreSource(document: SourceDocument) {
  const tierWeight = { 1: 70, 2: 48, 3: 25, 4: 10 }[document.tier];
  const extractionWeight = document.extractionStatus === 'success' ? 6 : document.extractionStatus === 'partial' ? 2 : -15;
  const datedWeight = document.publicationDate || document.filingDate ? 4 : 0;
  return tierWeight + RELIABILITY_WEIGHT[document.reliability] + extractionWeight + datedWeight;
}

export function sourceQualityBreakdown(documents: SourceDocument[]): SourceQualityBreakdown {
  return documents.reduce((counts, document) => {
    counts[`tier${document.tier}` as keyof SourceQualityBreakdown] += 1;
    return counts;
  }, { tier1: 0, tier2: 0, tier3: 0, tier4: 0 });
}

export function evidenceReliabilityScore(documents: SourceDocument[]) {
  if (documents.length === 0) return 0;
  const decisionDocuments = documents.filter(document => !['news', 'rss'].includes(document.sourceType));
  if (decisionDocuments.length === 0) return 0;
  const best = Math.max(...decisionDocuments.map(scoreSource));
  const officialBonus = Math.min(decisionDocuments.filter(document => document.tier === 1 && document.extractionStatus === 'success').length * 4, 12);
  return Math.min(25, Math.round(best / 4) + officialBonus);
}
