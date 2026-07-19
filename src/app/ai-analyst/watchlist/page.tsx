import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystWatchlistSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystWatchlistPage() {
  return <AiAnalystShell activeTab="watchlist"><AiAnalystAccessGate surface="watchlist"><AiAnalystWatchlistSurface /></AiAnalystAccessGate></AiAnalystShell>;
}
