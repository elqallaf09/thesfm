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
export type SmartTaskSourceId = 'personal' | 'projects' | 'zakatCharity' | 'market' | 'notifications';
export type SmartTaskSourceStatus = 'ok_with_data' | 'ok_empty' | 'failed';
export type SmartTaskSourceDiagnostic = {
  ok: boolean;
  status: SmartTaskSourceStatus;
  count: number;
  tables: SmartTaskTableKey[];
  failedTables: SmartTaskTableKey[];
  errorCodes: string[];
  errorDetails: Partial<Record<SmartTaskTableKey, string>>;
  message?: string;
};

const SMART_TASK_TABLES: Array<{ key: SmartTaskTableKey; table: string; source: SmartTaskSourceId; limit?: number }> = [
  { key: 'income', table: 'monthly_income_sources', source: 'personal', limit: 1000 },
  { key: 'expenses', table: 'expense_items', source: 'personal', limit: 1000 },
  { key: 'goals', table: 'financial_goals', source: 'personal', limit: 1000 },
  { key: 'savings', table: 'savings_items', source: 'personal', limit: 1000 },
  { key: 'investments', table: 'investment_items', source: 'market', limit: 1000 },
  { key: 'marketWatchlist', table: 'market_watchlist', source: 'market', limit: 1000 },
  { key: 'marketPriceAlerts', table: 'market_price_alerts', source: 'market', limit: 1000 },
  { key: 'projects', table: 'projects', source: 'projects', limit: 1000 },
  { key: 'feasibilityStudies', table: 'project_feasibility_studies', source: 'projects', limit: 1000 },
  { key: 'financialModels', table: 'project_financial_models', source: 'projects', limit: 1000 },
  { key: 'projectTasks', table: 'project_tasks', source: 'projects', limit: 1000 },
  { key: 'projectMilestones', table: 'project_milestones', source: 'projects', limit: 1000 },
  { key: 'projectDocuments', table: 'project_documents', source: 'projects', limit: 1000 },
  { key: 'pitchDecks', table: 'project_pitch_decks', source: 'projects', limit: 1000 },
  { key: 'fundingReadiness', table: 'project_funding_readiness', source: 'projects', limit: 1000 },
  { key: 'jurisdictionAssessments', table: 'project_jurisdiction_assessments', source: 'projects', limit: 1000 },
  { key: 'zakatCalculations', table: 'zakat_calculations', source: 'zakatCharity', limit: 1000 },
  { key: 'zakatAssets', table: 'zakat_assets', source: 'zakatCharity', limit: 1000 },
  { key: 'charityProjects', table: 'charity_projects', source: 'zakatCharity', limit: 1000 },
  { key: 'charityReminders', table: 'charity_reminders', source: 'zakatCharity', limit: 1000 },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries', source: 'zakatCharity', limit: 1000 },
  { key: 'charityContributors', table: 'charity_project_contributors', source: 'zakatCharity', limit: 1000 },
  { key: 'charityCommitments', table: 'charity_commitments', source: 'zakatCharity', limit: 1000 },
  { key: 'charityDocuments', table: 'charity_documents', source: 'zakatCharity', limit: 1000 },
  { key: 'notifications', table: 'notifications', source: 'notifications', limit: 1000 },
];

const SOURCE_IDS: SmartTaskSourceId[] = ['personal', 'projects', 'zakatCharity', 'market', 'notifications'];
const OPTIONAL_ZAKAT_CHARITY_KEYS: SmartTaskTableKey[] = [
  'zakatCalculations',
  'zakatAssets',
  'charityProjects',
  'charityReminders',
  'charityBeneficiaries',
  'charityContributors',
  'charityCommitments',
  'charityDocuments',
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

function safeErrorCode(message: string) {
  if (/permission denied|42501|not authorized|unauthorized/i.test(message)) return 'permission_denied';
  if (/relation .* does not exist|does not exist|42P01|schema cache|not find|not found|could not find/i.test(message)) return 'relation_missing';
  if (/column .* does not exist|42703/i.test(message)) return 'column_missing';
  if (/timeout|timed out|abort/i.test(message)) return 'timeout';
  return 'load_failed';
}

function isOptionalMissingTableError(message: string | undefined) {
  return Boolean(message) && safeErrorCode(message || '') === 'relation_missing';
}

function buildSourceDiagnostics(
  records: SmartTaskSourceData,
  errors: Partial<Record<SmartTaskTableKey, string>>,
) {
  const diagnostics = Object.fromEntries(SOURCE_IDS.map(source => [source, {
    ok: true,
    status: 'ok_empty' as SmartTaskSourceStatus,
    count: 0,
    tables: [] as SmartTaskTableKey[],
    failedTables: [] as SmartTaskTableKey[],
    errorCodes: [] as string[],
    errorDetails: {} as Partial<Record<SmartTaskTableKey, string>>,
  }])) as Record<SmartTaskSourceId, SmartTaskSourceDiagnostic>;

  SMART_TASK_TABLES.forEach(item => {
    const diagnostic = diagnostics[item.source];
    diagnostic.tables.push(item.key);
    diagnostic.count += records[item.key]?.length ?? 0;
    const error = errors[item.key];
    if (error) {
      diagnostic.ok = false;
      diagnostic.failedTables.push(item.key);
      diagnostic.errorDetails[item.key] = error;
      const code = safeErrorCode(error);
      if (!diagnostic.errorCodes.includes(code)) diagnostic.errorCodes.push(code);
    }
  });

  const zakatCharityDataCount = OPTIONAL_ZAKAT_CHARITY_KEYS.reduce((sum, key) => sum + (records[key]?.length ?? 0), 0);
  const zakatCharityErrors = OPTIONAL_ZAKAT_CHARITY_KEYS
    .map(key => [key, errors[key]] as const)
    .filter((entry): entry is readonly [SmartTaskTableKey, string] => Boolean(entry[1]));
  const onlyOptionalMissingTables = zakatCharityErrors.length > 0
    && zakatCharityErrors.every(([, error]) => isOptionalMissingTableError(error));

  if (zakatCharityDataCount === 0 && onlyOptionalMissingTables) {
    const diagnostic = diagnostics.zakatCharity;
    if (process.env.NODE_ENV === 'development') {
      console.log('Optional source table missing: zakat/charity', {
        page: 'tasks',
        source: 'zakat_charity',
        tables: zakatCharityErrors.map(([key]) => SMART_TASK_TABLES.find(item => item.key === key)?.table ?? key),
      });
    }
    diagnostic.ok = true;
    diagnostic.status = 'ok_empty';
    diagnostic.failedTables = [];
    diagnostic.errorCodes = [];
    diagnostic.errorDetails = {};
    diagnostic.message = 'No zakat or charity data yet';
  }

  SOURCE_IDS.forEach(source => {
    const diagnostic = diagnostics[source];
    if (!diagnostic.ok) {
      diagnostic.status = 'failed';
      diagnostic.message = `${source} source failed to load`;
    } else if (diagnostic.count > 0) {
      diagnostic.status = 'ok_with_data';
    } else {
      diagnostic.status = 'ok_empty';
      diagnostic.message = source === 'zakatCharity'
        ? 'No zakat or charity data yet'
        : 'No data yet';
    }
  });

  return diagnostics;
}

export function useSmartTasks() {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const [profile, setProfile] = useState<SmartTaskProfile | null>(null);
  const [records, setRecords] = useState<SmartTaskSourceData>({});
  const [errors, setErrors] = useState<Partial<Record<SmartTaskTableKey, string>>>({});
  const [sourceDiagnostics, setSourceDiagnostics] = useState<Record<SmartTaskSourceId, SmartTaskSourceDiagnostic>>(() => buildSourceDiagnostics({}, {}));
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
      setSourceDiagnostics(buildSourceDiagnostics({}, {}));
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
      const nextRecords = {
        ...(dataResult.value.records as SmartTaskSourceData),
        income: personalIncomeRows(dataResult.value.records.income ?? []),
        expenses: personalExpenseRows(dataResult.value.records.expenses ?? []),
      };
      setRecords(nextRecords);
      setErrors(dataResult.value.errors);
      const nextDiagnostics = buildSourceDiagnostics(nextRecords, dataResult.value.errors);
      setSourceDiagnostics(nextDiagnostics);
      if (process.env.NODE_ENV === 'development') {
        const diagnostic = nextDiagnostics.zakatCharity;
        console.log('source status', {
          page: 'tasks',
          source: 'zakat_charity',
          status: diagnostic.status,
          count: diagnostic.count,
          hasError: Object.keys(diagnostic.errorDetails).length > 0,
          errorCode: diagnostic.errorCodes[0],
          errorMessage: Object.values(diagnostic.errorDetails)[0],
        });
      }
      if (process.env.NODE_ENV === 'development' && Object.keys(dataResult.value.errors).length > 0) {
        console.warn('Task Center source load errors', nextDiagnostics);
      }
    } else {
      setRecords({});
      setErrors({ income: 'load_failed' });
      setSourceDiagnostics(buildSourceDiagnostics({}, { income: 'load_failed' }));
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
    sourceDiagnostics,
    reload: loadTasks,
    setTaskStatus,
    resetTaskStatus,
  };
}

export type { SmartTask, SmartTaskStatus };
