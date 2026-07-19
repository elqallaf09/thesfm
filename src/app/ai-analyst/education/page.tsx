import { AiAnalystKnowledgeSurface } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystEducationPage() {
  return <AiAnalystShell activeTab="education"><AiAnalystKnowledgeSurface kind="education" /></AiAnalystShell>;
}
