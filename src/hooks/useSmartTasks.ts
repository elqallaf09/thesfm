'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import {
  compareSmartTasks,
  generateSmartTasks,
  type SmartTask,
  type SmartTaskLang,
  type SmartTaskProfile,
  type SmartTaskSourceData,
  type SmartTaskStatus,
} from '@/lib/tasks/generateSmartTasks';

type SmartTaskTableKey = keyof SmartTaskSourceData;

const SMART_TASK_TABLES: Array<{ key: SmartTaskTableKey; table: string; limit?: number }> = [
  { key: 'income', table: 'monthly_income_sources', limit: 1000 },
  { key: 'expenses', table: 'expense_items', limit: 1000 },
  { key: 'goals', table: 'financial_goals', limit: 1000 },
  { key: 'savings', table: 'savings_items', limit: 1000 },
  { key: 'investments', table: 'investment_items', limit: 1000 },
  { key: 'marketWatchlist', table: 'market_watchlist', limit: 1000 },
  { key: 'marketPriceAlerts', table: 'market_price_alerts', limit: 1000 },
  { key: 'projects', table: 'projects', limit: 1000 },
  { key: 'feasibilityStudies', table: 'project_feasibility_studies', limit: 1000 },
  { key: 'financialModels', table: 'project_financial_models', limit: 1000 },
  { key: 'projectTasks', table: 'project_tasks', limit: 1000 },
  { key: 'projectMilestones', table: 'project_milestones', limit: 1000 },
  { key: 'projectDocuments', table: 'project_documents', limit: 1000 },
  { key: 'pitchDecks', table: 'project_pitch_decks', limit: 1000 },
  { key: 'fundingReadiness', table: 'project_funding_readiness', limit: 1000 },
  { key: 'jurisdictionAssessments', table: 'project_jurisdiction_assessments', limit: 1000 },
  { key: 'zakatCalculations', table: 'zakat_calculations', limit: 1000 },
  { key: 'zakatAssets', table: 'zakat_assets', limit: 1000 },
  { key: 'charityProjects', table: 'charity_projects', limit: 1000 },
  { key: 'charityReminders', table: 'charity_reminders', limit: 1000 },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries', limit: 1000 },
  { key: 'charityContributors', table: 'charity_project_contributors', limit: 1000 },
  { key: 'charityCommitments', table: 'charity_commitments', limit: 1000 },
  { key: 'charityDocuments', table: 'charity_documents', limit: 1000 },
  { key: 'notifications', table: 'notifications', limit: 1000 },
];

type TaskOverride = {
  status: SmartTaskStatus;
  updatedAt: string;
};

function normalizeLang(value: string): SmartTaskLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function storageKey(userId?: string | null) {
  return `sfm_task_overrides:${userId || 'guest'}`;
}

function readOverrides(key: string): Record<string, TaskOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(key: string, value: Record<string, TaskOverride>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useSmartTasks() {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const [profile, setProfile] = useState<SmartTaskProfile | null>(null);
  const [records, setRecords] = useState<SmartTaskSourceData>({});
  const [errors, setErrors] = useState<Partial<Record<SmartTaskTableKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, TaskOverride>>({});

  const key = useMemo(() => storageKey(user?.id), [user?.id]);

  useEffect(() => {
    setOverrides(readOverrides(key));
  }, [key]);

  const loadTasks = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setRecords({});
      setErrors({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = supabase as any;
    const [profileResult, dataResult] = await Promise.allSettled([
      db.from('profiles').select('id,display_name,default_currency,onboarding_completed').eq('id', user.id).maybeSingle(),
      loadUserDataTables<SmartTaskTableKey>(db, user.id, SMART_TASK_TABLES),
    ]);

    if (profileResult.status === 'fulfilled' && !profileResult.value.error) {
      setProfile(profileResult.value.data ?? null);
    } else {
      setProfile(null);
    }

    if (dataResult.status === 'fulfilled') {
      setRecords({
        ...(dataResult.value.records as SmartTaskSourceData),
        income: personalIncomeRows(dataResult.value.records.income ?? []),
        expenses: personalExpenseRows(dataResult.value.records.expenses ?? []),
      });
      setErrors(dataResult.value.errors);
    } else {
      setRecords({});
      setErrors({ income: 'load_failed' });
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const generatedTasks = useMemo(
    () => generateSmartTasks({ profile, data: records, lang: locale }),
    [locale, profile, records],
  );

  const tasks = useMemo(() => generatedTasks.map(task => ({
    ...task,
    status: overrides[task.id]?.status ?? task.status,
  })).sort(compareSmartTasks), [generatedTasks, overrides]);

  const setTaskStatus = useCallback((taskId: string, status: SmartTaskStatus) => {
    setOverrides(prev => {
      const next = {
        ...prev,
        [taskId]: { status, updatedAt: new Date().toISOString() },
      };
      writeOverrides(key, next);
      return next;
    });
  }, [key]);

  const resetTaskStatus = useCallback((taskId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[taskId];
      writeOverrides(key, next);
      return next;
    });
  }, [key]);

  return {
    tasks,
    rawTasks: generatedTasks,
    loading: authLoading || loading,
    errors,
    reload: loadTasks,
    setTaskStatus,
    resetTaskStatus,
  };
}

export type { SmartTask, SmartTaskStatus };
