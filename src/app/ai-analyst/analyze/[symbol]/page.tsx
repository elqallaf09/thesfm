import { redirect } from 'next/navigation';
import { AiAnalystAnalysis } from '@/components/ai-analyst/AiAnalystAnalysis';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';

type PageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ assetType?: string | string[]; horizon?: string | string[]; autoRun?: string | string[] }>;
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
  return (
    <AiAnalystShell activeTab="assetDetails">
      <AiAnalystAnalysis symbol={symbol} assetType={assetType} horizon={horizon} autoRun={autoRun} />
    </AiAnalystShell>
  );
}
