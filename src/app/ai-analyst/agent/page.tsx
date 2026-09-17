import { redirect } from 'next/navigation';
import { researchWorkspaceHref, type ResearchQuery } from '@/lib/ai-analyst/researchWorkspace';

export default async function LegacyResearchPage({ searchParams }: { searchParams: Promise<ResearchQuery> }) {
  redirect(researchWorkspaceHref(await searchParams, 'research'));
}
