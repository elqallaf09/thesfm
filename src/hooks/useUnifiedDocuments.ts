'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeUnifiedDocumentsWithMeta, type UnifiedDocument } from '@/lib/documents/unifiedDocuments';

type LoadState = {
  documents: UnifiedDocument[];
  loading: boolean;
  errors: Record<string, string>;
};

const EMPTY_STATE: LoadState = {
  documents: [],
  loading: true,
  errors: {},
};

async function loadRows(table: string, userId: string, options: { userScoped?: boolean; select?: string } = {}) {
  try {
    let query = supabase.from(table).select(options.select ?? '*').limit(1000);
    if (options.userScoped !== false) query = query.eq('user_id', userId);
    const { data, error } = await query;
    return { rows: error ? [] : (data ?? []), error: error?.message ?? '' };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Load error' };
  }
}

export function useUnifiedDocuments() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [state, setState] = useState<LoadState>(EMPTY_STATE);

  const reload = useCallback(async () => {
    if (authLoading) return;
    if (!user || isGuest) {
      setState({ documents: [], loading: false, errors: {} });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    const [
      projectDocuments,
      charityDocuments,
      incomeRows,
      expenseRows,
      pitchDecks,
      generatedReports,
      strategicDocuments,
      projects,
      charityProjects,
    ] = await Promise.all([
      loadRows('project_documents', user.id),
      loadRows('charity_documents', user.id),
      loadRows('monthly_income_sources', user.id),
      loadRows('expense_items', user.id),
      loadRows('project_pitch_decks', user.id),
      loadRows('generated_reports', user.id),
      loadRows('project_strategic_documents', user.id),
      loadRows('projects', user.id, { select: 'id,name' }),
      loadRows('charity_projects', user.id, { select: 'id,name' }),
    ]);

    const normalized = normalizeUnifiedDocumentsWithMeta({
      projectDocuments: projectDocuments.rows,
      charityDocuments: charityDocuments.rows,
      incomeRows: incomeRows.rows,
      expenseRows: expenseRows.rows,
      pitchDecks: pitchDecks.rows,
      generatedReports: generatedReports.rows,
      strategicDocuments: strategicDocuments.rows,
      projects: projects.rows,
      charityProjects: charityProjects.rows,
    });
    const documents = normalized.documents;

    const errors: Record<string, string> = {};
    Object.entries({
      project_documents: projectDocuments.error,
      charity_documents: charityDocuments.error,
      monthly_income_sources: incomeRows.error,
      expense_items: expenseRows.error,
      project_pitch_decks: pitchDecks.error,
      generated_reports: generatedReports.error,
      project_strategic_documents: strategicDocuments.error,
      projects: projects.error,
      charity_projects: charityProjects.error,
    }).forEach(([key, error]) => {
      if (error && !/does not exist|schema cache|not find|relation/i.test(error)) errors[key] = error;
    });

    setState({ documents, loading: false, errors });
  }, [authLoading, isGuest, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return useMemo(() => ({ ...state, reload }), [reload, state]);
}
