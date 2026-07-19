import { AiAnalystMarketExplorer } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

function marketQuery(value: string) {
  const normalized = String(value ?? '').trim();
  return /^[A-Za-z0-9 ._-]{1,64}$/.test(normalized) ? normalized : '';
}

export default async function AiAnalystMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  return <AiAnalystShell activeTab="markets"><AiAnalystMarketExplorer initialQuery={marketQuery(market)} /></AiAnalystShell>;
}
