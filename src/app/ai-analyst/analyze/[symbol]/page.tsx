import { redirect } from 'next/navigation';
import { AiAnalystAnalysis } from '@/components/ai-analyst/AiAnalystAnalysis';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import { investmentAnalysisContextFromQuery } from '@/lib/investments/center';

type PageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{
    assetType?: string | string[];
    horizon?: string | string[];
    autoRun?: string | string[];
    investmentId?: string | string[];
    investmentAssetType?: string | string[];
    market?: string | string[];
    currency?: string | string[];
    source?: string | string[];
    privateAsset?: string | string[];
  }>;
};

function single(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

export default async function AiAnalystAssetPage({ params, searchParams }: PageProps) {
  const [{ symbol: rawSymbol }, query] = await Promise.all([params, searchParams]);
  const symbol = normalizeAiAnalystSymbol(rawSymbol);
  if (!symbol) redirect('/ai-analyst/overview');
  const assetType = normalizeAiAnalystAssetType(single(query.assetType));
  const horizon = normalizeAiAnalystHorizon(single(query.horizon));
  const autoRun = single(query.autoRun) === '1' || single(query.autoRun) === 'true';
  const investmentContext = investmentAnalysisContextFromQuery({
    investmentId: single(query.investmentId),
    investmentAssetType: single(query.investmentAssetType),
    market: single(query.market),
    currency: single(query.currency),
    source: single(query.source),
    privateAsset: single(query.privateAsset),
  });
  return (
    <AiAnalystShell activeTab="assetDetails">
      <AiAnalystAnalysis symbol={symbol} assetType={assetType} horizon={horizon} autoRun={autoRun} investmentContext={investmentContext} />
    </AiAnalystShell>
  );
}
