import { AiAnalystHistory } from '@/components/ai-analyst/AiAnalystHistory';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';

export default async function AiAnalystHistoryPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const query = await searchParams;
  const activeTab = query.view === 'accuracy' ? 'history' : 'timeline';
  return <AiAnalystShell activeTab={activeTab}><AiAnalystHistory /></AiAnalystShell>;
}
