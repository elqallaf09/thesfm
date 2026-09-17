import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from './legacyRoutes';

export type ResearchQuery = Record<string, string | string[] | undefined>;
export const firstResearchValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function researchWorkspaceHref(query: ResearchQuery, section: 'details' | 'research' | 'rules' = 'details') {
  const symbol = normalizeAiAnalystSymbol(firstResearchValue(query.symbol));
  const params = new URLSearchParams({
    assetType: normalizeAiAnalystAssetType(firstResearchValue(query.assetType)),
    horizon: normalizeAiAnalystHorizon(firstResearchValue(query.horizon) ?? firstResearchValue(query.timeframe) ?? firstResearchValue(query.range)),
  });
  for (const name of ['investmentId', 'investmentAssetType', 'market', 'currency', 'source', 'privateAsset']) {
    const value = firstResearchValue(query[name]);
    if (value && value.length <= 256) params.set(name, value);
  }
  // Never propagate autorun, auth credentials or redirect-control parameters.
  const path = symbol ? `/ai-analyst/analyze/${encodeURIComponent(symbol)}` : '/ai-analyst/analyze';
  return `${path}?${params}#${section}`;
}
