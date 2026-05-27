export type SfmDataKey =
  | 'profiles'
  | 'income'
  | 'expenses'
  | 'projectExpenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'projects'
  | 'feasibility'
  | 'financialModels'
  | 'tasks'
  | 'milestones'
  | 'documents'
  | 'pitchDecks'
  | 'marketWatchlist'
  | 'marketPriceAlerts'
  | 'zakatCalculations'
  | 'zakatAssets'
  | 'charityProjects'
  | 'charityDonations'
  | 'charityBeneficiaries'
  | 'charityImpact'
  | 'charityReminders'
  | 'charityContributors';

export type SfmDataTable = {
  key: SfmDataKey;
  table: string;
  userScoped?: boolean;
  limit?: number;
};

export type SfmRecords<K extends string = SfmDataKey> = Record<K, any[]>;

export type SfmLoadResult<K extends string = SfmDataKey> = {
  records: SfmRecords<K>;
  errors: Partial<Record<K, string>>;
};

export const CORE_FINANCE_TABLES: SfmDataTable[] = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'investments', table: 'investment_items' },
  { key: 'projects', table: 'projects' },
  { key: 'zakatCalculations', table: 'zakat_calculations' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityProjects', table: 'charity_projects' },
  { key: 'charityDonations', table: 'charity_project_donations' },
];

export const REPORT_DATA_TABLES: SfmDataTable[] = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'projectExpenses', table: 'project_expenses' },
  { key: 'savings', table: 'savings_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'investments', table: 'investment_items' },
  { key: 'projects', table: 'projects' },
  { key: 'feasibility', table: 'project_feasibility_studies' },
  { key: 'financialModels', table: 'project_financial_models' },
  { key: 'tasks', table: 'project_tasks' },
  { key: 'milestones', table: 'project_milestones' },
  { key: 'documents', table: 'project_documents' },
  { key: 'pitchDecks', table: 'project_pitch_decks' },
  { key: 'marketWatchlist', table: 'market_watchlist' },
  { key: 'zakatCalculations', table: 'zakat_calculations' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityProjects', table: 'charity_projects' },
  { key: 'charityDonations', table: 'charity_project_donations' },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries' },
  { key: 'charityImpact', table: 'charity_project_impact_metrics' },
];

export const NOTIFICATION_DATA_TABLES: SfmDataTable[] = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'marketPriceAlerts', table: 'market_price_alerts' },
  { key: 'projects', table: 'projects' },
  { key: 'feasibility', table: 'project_feasibility_studies' },
  { key: 'financialModels', table: 'project_financial_models' },
  { key: 'tasks', table: 'project_tasks' },
  { key: 'milestones', table: 'project_milestones' },
  { key: 'documents', table: 'project_documents' },
  { key: 'zakatAssets', table: 'zakat_assets' },
  { key: 'charityProjects', table: 'charity_projects' },
  { key: 'charityReminders', table: 'charity_reminders' },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries' },
  { key: 'charityContributors', table: 'charity_project_contributors' },
];

export function emptyRecords<K extends string>(tables: Array<{ key: K }>): SfmRecords<K> {
  return tables.reduce((acc, item) => {
    acc[item.key] = [];
    return acc;
  }, {} as SfmRecords<K>);
}

export function moneyAmount(value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function safeDivide(numerator: unknown, denominator: unknown) {
  const top = moneyAmount(numerator);
  const bottom = moneyAmount(denominator);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom === 0) return null;
  return top / bottom;
}

export function safePercent(numerator: unknown, denominator: unknown) {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : ratio * 100;
}

export function sumAmounts(rows: any[] = [], keys: string[] = ['amount']) {
  return rows.reduce((sum, row) => {
    const value = keys.map(key => row?.[key]).find(item => item !== undefined && item !== null && String(item).trim() !== '');
    return sum + moneyAmount(value);
  }, 0);
}

function recordObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function expenseProjectId(row: any) {
  const enhanced = recordObject(row?.enhanced);
  const enhancedProject = recordObject(enhanced.project);
  return String(
    row?.project_id ??
    row?.related_project_id ??
    enhanced.project_id ??
    enhanced.projectId ??
    enhanced.linked_project_id ??
    enhancedProject.id ??
    ''
  ).trim();
}

export function expensePaidFromPersonalBudget(row: any) {
  const enhanced = recordObject(row?.enhanced);
  return row?.paid_from_personal_budget === true ||
    enhanced.paid_from_personal_budget === true ||
    enhanced.include_in_personal_budget === true ||
    enhanced.paidFromPersonalBudget === true;
}

export function isPersonalExpenseRow(row: any) {
  const projectId = expenseProjectId(row);
  if (!projectId) return true;
  return expensePaidFromPersonalBudget(row);
}

export function personalExpenseRows<T = any>(rows: T[] = []) {
  return rows.filter(row => isPersonalExpenseRow(row));
}

export function projectExpenseRows<T = any>(rows: T[] = [], projectId?: string | null) {
  if (!projectId) return [];
  return rows.filter(row => expenseProjectId(row) === projectId);
}

export function currentMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function resolveCurrency(record: Record<string, unknown> | null | undefined, profileCurrency?: string | null) {
  const recordCurrency = String(record?.currency ?? record?.default_currency ?? '').trim();
  return recordCurrency || profileCurrency || 'KWD';
}

export async function loadUserDataTables<K extends string>(
  db: any,
  userId: string,
  tables: Array<{ key: K; table: string; userScoped?: boolean; limit?: number }>,
): Promise<SfmLoadResult<K>> {
  const records = emptyRecords(tables);
  const errors: Partial<Record<K, string>> = {};

  await Promise.all(tables.map(async item => {
    try {
      let query = db.from(item.table).select('*').limit(item.limit ?? 1000);
      if (item.userScoped !== false) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        errors[item.key] = error.message;
        records[item.key] = [];
      } else {
        records[item.key] = data ?? [];
      }
    } catch (error) {
      errors[item.key] = error instanceof Error ? error.message : 'Load error';
      records[item.key] = [];
    }
  }));

  return { records, errors };
}

export function buildFinanceOverview(records: Partial<SfmRecords>) {
  const personalExpenses = personalExpenseRows(records.expenses ?? []);
  const incomeTotal = sumAmounts(records.income ?? [], ['amount']);
  const expenseTotal = sumAmounts(personalExpenses, ['amount']);
  const savingsTotal = sumAmounts(records.savings ?? [], ['amount', 'current_value']);
  const investmentTotal = sumAmounts(records.investments ?? [], ['current_value', 'amount']);
  const charityTotal = sumAmounts(records.charityDonations ?? [], ['amount', 'donation_amount'])
    + sumAmounts(records.charityProjects ?? [], ['collected_amount', 'current_amount']);
  const zakatDue = sumAmounts(records.zakatCalculations ?? [], ['zakat_due']);
  const netBalance = incomeTotal - expenseTotal;

  return {
    incomeTotal,
    expenseTotal,
    savingsTotal,
    investmentTotal,
    charityTotal,
    zakatDue,
    netBalance,
    expenseRatio: safeDivide(expenseTotal, incomeTotal),
    hasIncome: (records.income?.length ?? 0) > 0,
    hasExpenses: personalExpenses.length > 0,
    hasSavings: (records.savings?.length ?? 0) > 0,
    hasInvestments: (records.investments?.length ?? 0) > 0,
    hasGoals: (records.goals?.length ?? 0) > 0,
    hasProjects: (records.projects?.length ?? 0) > 0,
    hasCharity: (records.charityProjects?.length ?? 0) > 0 || (records.charityDonations?.length ?? 0) > 0,
    hasZakat: (records.zakatCalculations?.length ?? 0) > 0 || (records.zakatAssets?.length ?? 0) > 0,
  };
}
