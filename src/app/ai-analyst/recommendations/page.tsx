import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystRecommendationsSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystRecommendationsPage() {
  return <AiAnalystShell activeTab="recommendations"><AiAnalystAccessGate surface="recommendations"><AiAnalystRecommendationsSurface /></AiAnalystAccessGate></AiAnalystShell>;
}
