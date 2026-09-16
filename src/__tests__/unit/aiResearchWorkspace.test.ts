import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { researchWorkspaceHref } from '@/lib/ai-analyst/researchWorkspace';
const source = (file: string) => readFileSync(file, 'utf8');
describe('one asset research workspace', () => {
  it('preserves asset, horizon and investment context across old bookmarks without autorun', () => {
    expect(researchWorkspaceHref({ symbol: 'nvda', assetType: 'stock', timeframe: '1D', autoRun: '1', investmentId: 'owned-investment' }, 'research'))
      .toBe('/ai-analyst/analyze/NVDA?assetType=STOCK&horizon=INTRADAY&investmentId=owned-investment#research');
  });
  it('rejects path-like symbols and never forwards tokens or external redirects', () => {
    const url = researchWorkspaceHref({ symbol: '../secret', next: 'https://bad.test', access_token: 'secret' });
    expect(url).toBe('/ai-analyst/analyze?assetType=STOCK&horizon=SWING#details');
  });
  it('normalizes array-valued legacy query parameters', () => {
    expect(researchWorkspaceHref({ symbol: ['btc-usd'], assetType: ['crypto'], range: ['1W'] }))
      .toBe('/ai-analyst/analyze/BTC-USD?assetType=CRYPTO&horizon=SHORT_TERM#details');
  });
  it('uses the same component for the empty and selected workspace routes', () => {
    for (const file of ['src/app/ai-analyst/analyze/page.tsx', 'src/app/ai-analyst/analyze/[symbol]/page.tsx']) expect(source(file)).toContain('AiAnalystResearchWorkspace');
    for (const route of ['agent', 'assets']) expect(source(`src/app/ai-analyst/${route}/page.tsx`)).toContain('redirect(researchWorkspaceHref');
  });
  it('has one asset picker, a quote-only section and a full-span truthful rules panel', () => {
    const workspace = source('src/components/ai-analyst/AiAnalystResearchWorkspace.tsx');
    expect(workspace.match(/<AiAnalystAssetPicker /g)).toHaveLength(1);
    expect(workspace).toContain('embedded'); expect(workspace).toContain('autoRun={false}');
    const rules = source('src/components/ai-analyst/AiAnalystRuleEngine.tsx');
    expect(rules).toContain('styles.spanFull'); expect(rules).toContain('minimumEvidenceMet'); expect(rules).toContain('result.rulesVersion');
    const details = source('src/app/api/intelligence/asset-details/route.ts');
    expect(details).not.toMatch(/consumeAiUsage|generateAssistantReply|intelligenceOrchestrator/);
  });
  it('shares one canonical result with the investment summary instead of duplicate polling', () => {
    expect(source('src/components/ai-analyst/AiAnalystResearchRunner.tsx')).toContain('providedResult={result}');
    expect(source('src/components/ai-analyst/InvestmentCheckCard.tsx')).toContain('if (providedResult !== undefined) return;');
  });
  it('keeps the shared provider module independent of the Anthropic SDK and key', () => {
    const provider = source('src/lib/server/aiProvider.ts');
    expect(provider).not.toMatch(/ANTHROPIC_API_KEY|createAnthropic|@ai-sdk\/anthropic/);
    expect(provider).toContain("DEFAULT_GATEWAY_MODEL = 'openai/gpt-4o-mini'");
  });
});
