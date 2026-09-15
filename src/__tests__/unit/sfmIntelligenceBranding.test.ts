import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import {
  SFM_MARKET_INTELLIGENCE_ENGINE_NAME,
  withSfmAnalyticalSource,
} from '@/lib/intelligence/branding';

describe('THE SFM analytical source branding', () => {
  it('keeps the canonical upstream provenance outside the presentation projection', () => {
    const original = {
      providerProvenance: {
        selectedProvider: 'twelve_data',
        attempts: [],
        fallbackUsed: false,
        dataKinds: [],
      },
    } as unknown as AnalysisResult;

    const presented = withSfmAnalyticalSource(original);

    expect(presented).not.toBe(original);
    expect(presented.providerProvenance).not.toBe(original.providerProvenance);
    expect(presented.providerProvenance.selectedProvider).toBe(SFM_MARKET_INTELLIGENCE_ENGINE_NAME);
    expect(original.providerProvenance.selectedProvider).toBe('twelve_data');
  });

  it('shows THE SFM as the analytical source while retaining the market-data provider separately', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/ai-analyst/AiAnalystAnalysis.tsx'), 'utf8');
    expect(source).toContain('data-testid="sfm-intelligence-source"');
    expect(source).toContain('SFM_MARKET_INTELLIGENCE_ENGINE_NAME');
    expect(source).toContain('result.providerProvenance.selectedProvider ?? sourceCopy.unavailable');
    expect(source).toContain('withSfmAnalyticalSource(result)');
  });
});
