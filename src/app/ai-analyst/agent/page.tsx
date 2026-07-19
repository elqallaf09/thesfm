import { AiAnalystAgent } from '@/components/ai-analyst/AiAnalystFutureSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystAgentPage() {
  return <AiAnalystShell activeTab="agent"><AiAnalystAgent /></AiAnalystShell>;
}
