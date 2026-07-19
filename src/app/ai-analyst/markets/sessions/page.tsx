import { AiAnalystMarketSessions } from '@/components/ai-analyst/AiAnalystMarketSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystMarketSessionsPage() {
  return <AiAnalystShell activeTab="marketSessions"><AiAnalystMarketSessions /></AiAnalystShell>;
}
