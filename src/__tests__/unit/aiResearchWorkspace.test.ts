import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { researchWorkspaceHref } from '@/lib/ai-analyst/researchWorkspace';
import { finalAnswerFromPrivateModel } from '@/lib/server/aiProvider';
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
  it('keeps the asset picker synchronized with canonical route selections', () => {
    const picker = source('src/components/ai-analyst/AiAnalystAssetPicker.tsx');
    expect(picker).toContain('useEffect(() => {');
    expect(picker).toContain('setSymbol(initialSymbol)');
    expect(picker).toContain("setAssetType(initialSymbol ? initialAssetType : 'ALL')");
    expect(picker).toContain("setHorizon(allHorizons ? 'ALL' : initialHorizon)");
    expect(picker).toContain('[initialSymbol, initialAssetType, initialHorizon, allHorizons]');
  });
  it('never exposes leading private reasoning blocks as the user-visible answer', () => {
    expect(finalAnswerFromPrivateModel('<think>private chain</think>\nFinal answer')).toBe('Final answer');
    expect(finalAnswerFromPrivateModel('<analysis>private chain</analysis>\n<think>more private chain</think>\nAnswer')).toBe('Answer');
    expect(finalAnswerFromPrivateModel('<think>truncated private chain')).toBe('');
    expect(finalAnswerFromPrivateModel('Normal answer')).toBe('Normal answer');
  });
  it('keeps the shared provider private and independent of third-party model vendor credentials', () => {
    const provider = source('src/lib/server/aiProvider.ts');
    expect(provider).not.toMatch(/ANTHROPIC_API_KEY|createAnthropic|@ai-sdk\/anthropic|OPENAI_API_KEY|AI_GATEWAY_API_KEY|AI_GATEWAY_TOKEN|DEFAULT_GATEWAY_MODEL/);
    for (const name of [
      'SFM_AI_BASE_URL',
      'SFM_AI_MODEL',
      'SFM_AI_API_KEY',
      'SFM_AI_FALLBACK_BASE_URL',
      'SFM_AI_FALLBACK_MODEL',
      'SFM_AI_FALLBACK_API_KEY',
    ]) expect(provider).toContain(name);
    expect(provider).toContain("provider: 'sfm-private-primary'");
    expect(provider).toContain("provider: 'sfm-private-fallback'");
  });
});
