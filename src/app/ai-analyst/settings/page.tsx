import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystSettingsSurface } from '@/components/ai-analyst/AiAnalystPersonalSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystSettingsPage() {
  return <AiAnalystShell activeTab="settings"><AiAnalystAccessGate surface="settings"><AiAnalystSettingsSurface /></AiAnalystAccessGate></AiAnalystShell>;
}
