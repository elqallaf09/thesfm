import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystPortfolioSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystTradePerformancePage() {
  return <AiAnalystShell activeTab="tradePerformance"><AiAnalystAccessGate surface="tradePerformance"><AiAnalystPortfolioSurface performance /></AiAnalystAccessGate></AiAnalystShell>;
}
