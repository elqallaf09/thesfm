import { AiAnalystMarketExplorer, AiAnalystMarketSessions } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import type { AiAnalystDirectoryAssetType } from '@/components/ai-analyst/aiAnalystMarketSurfaceData';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { isAiAnalystFeatureEnabled } from '@/lib/ai-analyst/features';
import { redirect } from 'next/navigation';

type PageProps = { searchParams: Promise<{ view?: string | string[]; market?: string | string[]; assetType?: string | string[] }> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function marketQuery(value: string | undefined) {
  const normalized = String(value ?? '').trim();
  return /^[A-Za-z0-9 ._-]{1,64}$/.test(normalized) ? normalized : '';
}

function assetType(value: string | undefined): AiAnalystDirectoryAssetType | 'ALL' {
  const normalized = String(value ?? '').trim().toUpperCase();
  return ['STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND'].includes(normalized)
    ? normalized as AiAnalystDirectoryAssetType
    : 'ALL';
}

export default async function AiAnalystMarketsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const view = first(query.view);
  if (view === 'map') {
    if (!isAiAnalystFeatureEnabled('marketMap')) redirect('/ai-analyst/markets');
    return <AiAnalystShell activeTab="marketMap"><AiAnalystMarketSessions view="map" /></AiAnalystShell>;
  }
  return (
    <AiAnalystShell activeTab="markets">
      <AiAnalystMarketExplorer
        initialQuery={marketQuery(first(query.market))}
        initialAssetType={assetType(first(query.assetType))}
      />
    </AiAnalystShell>
  );
}
