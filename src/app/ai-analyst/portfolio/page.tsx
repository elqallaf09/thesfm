import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystPortfolioSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystPortfolioPage() {
  return <AiAnalystShell activeTab="portfolio"><AiAnalystAccessGate surface="portfolio"><AiAnalystPortfolioSurface /></AiAnalystAccessGate></AiAnalystShell>;
}
