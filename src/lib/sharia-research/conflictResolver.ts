import type { EvidenceItem, FinancialValue, SourceDocument } from './types';

export type EvidenceConflict = { field: string; summary: string; evidenceIds: string[] };

export function resolveFinancialConflicts(values: FinancialValue[], documents: SourceDocument[], evidence: EvidenceItem[]) {
  const conflicts: EvidenceConflict[] = [];
  const documentById = new Map(documents.map(document => [document.id, document]));
  const grouped = new Map<string, FinancialValue[]>();
  for (const value of values) {
    const key = `${value.normalizedField}:${value.periodEnd}:${value.currency}`;
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  for (const [key, candidates] of grouped) {
    if (candidates.length < 2) continue;
    const positive = candidates.filter(candidate => candidate.value >= 0);
    if (positive.length < 2) continue;
    const minimum = Math.min(...positive.map(candidate => candidate.value));
    const maximum = Math.max(...positive.map(candidate => candidate.value));
    const relativeDifference = maximum === 0 ? 0 : (maximum - minimum) / maximum;
    if (relativeDifference <= 0.02) continue;
    const evidenceIds = positive.map(candidate => {
      const document = documentById.get(candidate.documentId);
      const item: EvidenceItem = {
        id: crypto.randomUUID(),
        documentId: candidate.documentId,
        category: 'conflict',
        conclusion: `Conflicting ${candidate.normalizedField} value`,
        excerpt: `${candidate.originalField}: ${candidate.value} ${candidate.currency} for ${candidate.periodEnd}`,
        sourceUrl: candidate.sourceUrl,
        sourceTitle: candidate.sourceTitle,
        publisher: document?.publisher ?? candidate.sourceTitle,
        publicationDate: document?.publicationDate ?? null,
        retrievalDate: document?.retrievalDate ?? new Date().toISOString(),
        tier: candidate.sourceTier,
        reliability: document?.reliability ?? 'unknown',
        reportingPeriod: candidate.reportingPeriod,
      };
      evidence.push(item);
      return item.id;
    });
    conflicts.push({
      field: key.split(':')[0],
      summary: `Public sources report materially different values for the same normalized field and reporting period (${minimum} vs ${maximum}).`,
      evidenceIds,
    });
  }
  return conflicts;
}
