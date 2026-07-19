import { AiAnalystHistory } from '@/components/ai-analyst/AiAnalystHistory';
import { AiAnalystAccessGate } from '@/components/ai-analyst/AiAnalystAccessGate';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default async function AiAnalystHistoryPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const query = await searchParams;
  const activeTab = query.view === 'timeline' ? 'path' : 'history';
  return <AiAnalystShell activeTab={activeTab}><AiAnalystAccessGate surface="history"><AiAnalystHistory /></AiAnalystAccessGate></AiAnalystShell>;
}
