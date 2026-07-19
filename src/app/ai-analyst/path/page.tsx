import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystHistory } from '@/components/ai-analyst/AiAnalystHistory';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystPathPage() {
  return <AiAnalystShell activeTab="path"><AiAnalystAccessGate surface="history"><AiAnalystHistory /></AiAnalystAccessGate></AiAnalystShell>;
}
