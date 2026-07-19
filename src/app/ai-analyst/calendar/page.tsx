import { AiAnalystKnowledgeSurface } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystCalendarPage() {
  return <AiAnalystShell activeTab="calendar"><AiAnalystKnowledgeSurface kind="calendar" /></AiAnalystShell>;
}
