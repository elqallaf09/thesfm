import { describe, expect, it } from 'vitest';
import { buildEconomicAdvisorPrompt } from '@/lib/ai-analyst/economicAdvisorPrompt';

const grounding = {
  advisor: 'finance' as const,
  confidence: 0.8,
  facts: [
    { key: 'monthly_income', value: 2000, source: 'financial_twin' as const },
    { key: 'monthly_surplus', value: 650, source: 'financial_twin' as const },
  ],
  warnings: ['economic_context_incomplete'],
  missing: ['economic_context'],
  allowedClaims: ['explain_current_financial_position'],
  prohibitedClaims: ['guaranteed_outcome', 'fabricated_user_data'],
};

describe('economic advisor prompt', () => {
  it('serializes only explicit grounding facts and restrictions', () => {
    const prompt = buildEconomicAdvisorPrompt(grounding, 'en');
    expect(prompt).toContain('monthly_income=2000 [financial_twin]');
    expect(prompt).toContain('confidence=0.80');
    expect(prompt).toContain('guaranteed_outcome');
    expect(prompt).toContain('Do not infer or invent a missing number');
  });

  it('keeps the no-fabrication instruction in Arabic', () => {
    const prompt = buildEconomicAdvisorPrompt(grounding, 'ar');
    expect(prompt).toContain('لا تستنتج أو تخترع رقماً مفقوداً');
  });
});
