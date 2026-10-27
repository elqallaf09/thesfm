import { loadSupabaseClient } from '@/integrations/supabase/loadClient';
import type { ModuleRows } from './_lib';

export async function loadBusinessHubProjects(userId: string, signal: AbortSignal) {
  const db = await loadSupabaseClient() as any;
  signal.throwIfAborted();
  return db.from('projects').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).abortSignal(signal);
}

export async function loadBusinessHubModules(userId: string, projectId: string): Promise<ModuleRows> {
  const db = await loadSupabaseClient() as any;
  async function rows(table: string) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .limit(500);
    return error ? [] : (data ?? []);
  }
  const [feasibility, financialModels, tasks, milestones, documents, pitchDecks] = await Promise.all([
    rows('project_feasibility_studies'),
    rows('project_financial_models'),
    rows('project_tasks'),
    rows('project_milestones'),
    rows('project_documents'),
    rows('project_pitch_decks'),
  ]);
  return { feasibility, financialModels, tasks, milestones, documents, pitchDecks };
}
