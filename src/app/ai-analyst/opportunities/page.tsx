import { AiAnalystOpportunities } from '@/components/ai-analyst/AiAnalystFutureSurfaces';
import { AiAnalystShell } from '@/components/ai-analyst/AiAnalystShell';
import { isAiAnalystFeatureEnabled } from '@/lib/ai-analyst/features';
import { redirect } from 'next/navigation';

export default function AiAnalystOpportunitiesPage() {
  if (!isAiAnalystFeatureEnabled('futureTools')) redirect('/ai-analyst/overview');
  return <AiAnalystShell activeTab="future"><AiAnalystOpportunities /></AiAnalystShell>;
}
