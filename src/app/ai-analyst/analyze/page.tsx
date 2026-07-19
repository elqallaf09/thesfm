import { AiAnalystAssetPicker } from '@/components/ai-analyst/AiAnalystAssetPicker';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default function AiAnalystAnalyzePage() {
  return <AiAnalystShell activeTab="analysis"><AiAnalystAssetPicker /></AiAnalystShell>;
}
