import { AiAnalystKnowledgeSurface } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystNewsPage() {
  return <AiAnalystShell activeTab="news"><AiAnalystKnowledgeSurface kind="news" /></AiAnalystShell>;
}
