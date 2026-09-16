import { redirect } from 'next/navigation';
import { AiAnalystResearchWorkspace } from '@/components/ai-analyst/AiAnalystResearchWorkspace';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import { firstResearchValue, researchWorkspaceHref, type ResearchQuery } from '@/lib/ai-analyst/researchWorkspace';

export default async function AiAnalystAnalyzePage({ searchParams }: { searchParams: Promise<ResearchQuery> }) {
  const query = await searchParams;
  if (normalizeAiAnalystSymbol(firstResearchValue(query.symbol))) redirect(researchWorkspaceHref(query));
  return <AiAnalystShell activeTab="analysis"><AiAnalystResearchWorkspace assetType={normalizeAiAnalystAssetType(firstResearchValue(query.assetType))} horizon={normalizeAiAnalystHorizon(firstResearchValue(query.horizon))} /></AiAnalystShell>;
}
