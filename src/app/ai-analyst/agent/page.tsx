import { AiAnalystAgent } from '@/components/ai-analyst/AiAnalystFutureSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import {
  normalizeAiAnalystAssetType,
  normalizeAiAnalystHorizon,
  normalizeAiAnalystSymbol,
} from '@/lib/ai-analyst/legacyRoutes';

type AiAnalystAgentPageProps = {
  searchParams: Promise<{
    symbol?: string | string[];
    assetType?: string | string[];
    horizon?: string | string[];
    timeframe?: string | string[];
    range?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AiAnalystAgentPage({ searchParams }: AiAnalystAgentPageProps) {
  const query = await searchParams;
  const initialSymbol = normalizeAiAnalystSymbol(first(query.symbol)) ?? '';
  const initialAssetType = normalizeAiAnalystAssetType(first(query.assetType));
  const initialHorizon = normalizeAiAnalystHorizon(first(query.horizon) ?? first(query.timeframe) ?? first(query.range));
  return (
    <AiAnalystShell activeTab="agent">
      <AiAnalystAgent initialSymbol={initialSymbol} initialAssetType={initialAssetType} initialHorizon={initialHorizon} />
    </AiAnalystShell>
  );
}
