import { describe, expect, it } from 'vitest';
import { validateAiResearchOutput } from '@/lib/sharia-research/aiValidation';
import type { EvidenceItem } from '@/lib/sharia-research/types';

const evidence: EvidenceItem = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  documentId: '550e8400-e29b-41d4-a716-446655440001',
  category: 'business_activity',
  conclusion: 'Software business description',
  excerpt: 'The company develops software.',
  sourceUrl: 'https://www.sec.gov/example',
  sourceTitle: 'Annual report',
  publisher: 'SEC',
  publicationDate: '2026-05-01',
  retrievalDate: '2026-07-10T00:00:00.000Z',
  tier: 1,
  reliability: 'official',
  reportingPeriod: '2026 Q1',
};

describe('structured AI evidence validation', () => {
  it('rejects citations that do not exist in the retrieved evidence set', () => {
    const result = validateAiResearchOutput({
      summary: 'A summary constrained to retrieved evidence.',
      businessActivities: [{ category: 'software', explanation: 'Software activity.', evidenceIds: ['550e8400-e29b-41d4-a716-446655449999'] }],
      contradictions: [],
      financialLabelMappings: [],
    }, [evidence], []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('AI_CITATION_NOT_RETRIEVED');
  });

  it('rejects AI-created URLs even when the schema is otherwise valid', () => {
    const result = validateAiResearchOutput({
      summary: 'See https://invented.example for details.',
      businessActivities: [{ category: 'software', explanation: 'Software activity.', evidenceIds: [evidence.id] }],
      contradictions: [],
      financialLabelMappings: [],
    }, [evidence], []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('AI_URL_NOT_ALLOWED');
  });
});
