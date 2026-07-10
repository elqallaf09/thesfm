import { z } from 'zod';
import type { EvidenceItem, FinancialValue } from './types';

export const AiResearchOutputSchema = z.object({
  summary: z.string().min(1).max(4_000),
  businessActivities: z.array(z.object({
    category: z.string().min(1).max(120),
    explanation: z.string().min(1).max(1_500),
    evidenceIds: z.array(z.string().uuid()).min(1).max(12),
  })).max(20),
  contradictions: z.array(z.object({
    explanation: z.string().min(1).max(1_500),
    evidenceIds: z.array(z.string().uuid()).min(2).max(12),
  })).max(20),
  financialLabelMappings: z.array(z.object({
    evidenceId: z.string().uuid(),
    originalField: z.string().min(1).max(300),
    normalizedField: z.string().min(1).max(120),
  })).max(40),
}).strict();

export type AiResearchOutput = z.infer<typeof AiResearchOutputSchema>;

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

export function validateAiResearchOutput(
  value: unknown,
  evidence: EvidenceItem[],
  financialValues: FinancialValue[],
) {
  const parsed = AiResearchOutputSchema.safeParse(value);
  if (!parsed.success) return { ok: false as const, code: 'AI_SCHEMA_INVALID', issues: parsed.error.issues };
  const evidenceIds = new Set(evidence.map(item => item.id));
  const citedIds = [
    ...parsed.data.businessActivities.flatMap(item => item.evidenceIds),
    ...parsed.data.contradictions.flatMap(item => item.evidenceIds),
    ...parsed.data.financialLabelMappings.map(item => item.evidenceId),
  ];
  const unknownIds = citedIds.filter(id => !evidenceIds.has(id));
  if (unknownIds.length > 0) return { ok: false as const, code: 'AI_CITATION_NOT_RETRIEVED', unknownIds: Array.from(new Set(unknownIds)) };
  const strings = allStrings(parsed.data);
  if (strings.some(text => /https?:\/\//i.test(text) || /www\./i.test(text))) {
    return { ok: false as const, code: 'AI_URL_NOT_ALLOWED' };
  }
  for (const mapping of parsed.data.financialLabelMappings) {
    const matchingValue = financialValues.find(item => item.originalField === mapping.originalField && item.normalizedField === mapping.normalizedField);
    if (!matchingValue) return { ok: false as const, code: 'AI_FINANCIAL_MAPPING_NOT_RETRIEVED', mapping };
  }
  return { ok: true as const, data: parsed.data };
}
