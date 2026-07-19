import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystAlertsSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystAlertsPage() {
  return <AiAnalystShell activeTab="alerts"><AiAnalystAccessGate surface="alerts"><AiAnalystAlertsSurface /></AiAnalystAccessGate></AiAnalystShell>;
}
