'use client';
import type { ReactNode } from 'react';
import { FolderKanban, FileText, BarChart3, ClipboardList, Gauge, Bot, Presentation } from 'lucide-react';
import { getCurrency } from '@/lib/currencies';
import { normalizeDigits } from '@/lib/locale';
import { TEXT } from './_text';
import type {
  Lang, TabId, RiskLevel, FeasibilitySection, FeasibilityForm, ProjectRow,
  ProjectExpenseRow, ProjectExpenseForm, ProjectIncomeForm,
  MoneyFormatter, CurrencyAmountRow, FeasibilityStudyRow,
} from './_types';

export function LazyTabSkeleton() {
  return <div className="tab-skeleton" style={{ height: 200 }} />;
}

export const tabs: Array<{ id: TabId; icon: typeof FolderKanban; hintKey?: keyof typeof TEXT.ar }> = [
  { id: 'overview', icon: FolderKanban },
  { id: 'feasibility', icon: FileText, hintKey: 'feasibilityHint' },
  { id: 'financial', icon: BarChart3, hintKey: 'financialHint' },
  { id: 'tasks', icon: ClipboardList, hintKey: 'tasksHint' },
  { id: 'documents', icon: FileText, hintKey: 'documentsHint' },
  { id: 'kpis', icon: Gauge, hintKey: 'kpisHint' },
  { id: 'ai', icon: Bot, hintKey: 'aiHint' },
  { id: 'pitchDeck', icon: Presentation, hintKey: 'pitchDeckHint' },
];

export const sectionWeights: Record<FeasibilitySection, number> = {
  market: 25,
  technical: 20,
  financial: 35,
  legal: 20,
};

export const countryOptions = ['kuwait', 'saudiArabia', 'uae', 'qatar', 'bahrain', 'oman', 'globalOther'] as const;

export function createEmptyFeasibility(): FeasibilityForm {
  return { market: {}, technical: {}, financial: {}, legal: {} };
}

export function parseNotes(value: ProjectRow['notes']) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function toNum(value: unknown) {
  return Number(normalizeDigits(value).replace(/[^\d.-]/g, '')) || 0;
}

export function normalizeCurrencyCode(value: unknown, fallback = 'KWD') {
  const code = String(value ?? '').trim().toUpperCase();
  return code || fallback;
}

export function formatProjectExpenseMoney(amount: number, currency?: string | null) {
  const code = normalizeCurrencyCode(currency, 'KWD');
  const meta = getCurrency(code);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(safeAmount);
  const symbol = code === 'KWD' ? 'د.ك' : code === 'USD' ? '$' : (meta.symbolAr || meta.symbolEn || code);
  return `${formatted} ${symbol}`;
}

export function normalizeProjectExpenseRow(row: ProjectExpenseRow): ProjectExpenseRow {
  return {
    ...row,
    currency: normalizeCurrencyCode(row.currency, 'KWD'),
  };
}

export function formatRowMoney(row: CurrencyAmountRow, money: MoneyFormatter, fallbackCurrency = 'KWD') {
  return money(toNum(row.amount), normalizeCurrencyCode(row.currency, fallbackCurrency));
}

export function formatRowsByCurrency(rows: CurrencyAmountRow[], money: MoneyFormatter, fallbackCurrency = 'KWD') {
  const totals = new Map<string, number>();
  rows.forEach(row => {
    const currency = normalizeCurrencyCode(row.currency, fallbackCurrency);
    totals.set(currency, (totals.get(currency) ?? 0) + toNum(row.amount));
  });
  return [...totals.entries()]
    .filter(([, total]) => total !== 0)
    .map(([currency, total]) => money(total, currency))
    .join(' + ');
}

export function normalizeProjectExpenseCategory(value?: string | null) {
  const category = String(value ?? '').trim().toLowerCase();
  if (!category) return 'general';
  if (['operations', 'operational', 'bills', 'utilities', 'maintenance'].includes(category)) return 'operations';
  if (['marketing', 'marketingexpense', 'ads', 'advertising'].includes(category)) return 'marketingExpense';
  if (['salary', 'salaries', 'payroll', 'wages'].includes(category)) return 'payroll';
  if (['rent', 'lease'].includes(category)) return 'rent';
  if (['equipment', 'technology', 'software', 'tools', 'subscriptions'].includes(category)) return 'equipment';
  if (['license', 'licenses', 'government', 'legal'].includes(category)) return 'licenses';
  return 'general';
}

export function formatPercentValue(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${Math.round(value)}%`;
}

export function confidencePercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(Math.max(0, Math.min(100, normalized)))}%`;
}

export function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyProjectExpenseForm(currency = 'KWD'): ProjectExpenseForm {
  return {
    title: '',
    amount: '',
    currency,
    expenseDate: todayInputValue(),
    category: 'general',
    paymentMethod: '',
    notes: '',
    receiptFile: null,
    paidFromPersonalBudget: false,
  };
}

export function emptyProjectIncomeForm(currency = 'KWD'): ProjectIncomeForm {
  return {
    title: '',
    amount: '',
    currency,
    incomeDate: todayInputValue(),
    category: 'general',
    source: '',
    description: '',
    notes: '',
    transferredToPersonalIncome: false,
  };
}

export function normalizeStatus(raw: unknown): 'idea' | 'study' | 'setup' | 'launch' | 'growth' | 'paused' | 'completed' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (['completed', 'complete', 'مكتمل', 'terminé'].includes(value)) return 'completed';
  if (['paused', 'متوقف', 'en pause'].includes(value)) return 'paused';
  if (['growth', 'نمو', 'نشط', 'active'].includes(value)) return 'growth';
  if (['launch', 'إطلاق', 'launched'].includes(value)) return 'launch';
  if (['setup', 'تأسيس', 'قيد التنفيذ', 'in_progress', 'in progress'].includes(value)) return 'setup';
  if (['study', 'دراسة', 'planning'].includes(value)) return 'study';
  return 'idea';
}

export function normalizeType(raw: unknown): 'ecommerce' | 'restaurant' | 'services' | 'saas' | 'trading' | 'realEstate' | 'otherProject' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return 'otherProject';
  if (value.includes('متجر') || value.includes('e-commerce') || value.includes('ecommerce')) return 'ecommerce';
  if (value.includes('مطعم') || value.includes('كاف') || value.includes('restaurant') || value.includes('cafe')) return 'restaurant';
  if (value.includes('خدمات') || value.includes('service')) return 'services';
  if (value.includes('saas') || value.includes('تطبيق') || value.includes('تقنية') || value.includes('برمج')) return 'saas';
  if (value.includes('تجارة') || value.includes('trading') || value.includes('توزيع')) return 'trading';
  if (value.includes('عقار') || value.includes('real estate')) return 'realEstate';
  return 'otherProject';
}

export function riskCopyKey(risk: RiskLevel) {
  if (risk === 'high') return 'riskHighText';
  if (risk === 'medium') return 'riskMediumText';
  return 'riskLowText';
}

export function defaultFeasibilityFromProject(project: ProjectRow | null): FeasibilityForm {
  const notes = parseNotes(project?.notes);
  return {
    market: {
      problemSolved: String(notes.idea ?? notes.description ?? ''),
    },
    technical: {},
    financial: {
      requiredCapital: String(notes.capital ?? notes.capital_amount ?? project?.budget ?? ''),
      monthlyOpex: String(notes.monthlyExpenses ?? notes.monthly_expenses ?? ''),
      expectedMonthlyRevenue: String(notes.monthlyRevenue ?? notes.monthly_revenue ?? ''),
      expectedProfitMargin: String(notes.expectedProfitMargin ?? notes.expected_profit_margin ?? ''),
    },
    legal: {},
  };
}

export function normalizeFeasibilityRow(row: FeasibilityStudyRow | null, project: ProjectRow | null): FeasibilityForm {
  if (!row) return defaultFeasibilityFromProject(project);
  return {
    market: row.market_data ?? {},
    technical: row.technical_data ?? {},
    financial: row.financial_data ?? {},
    legal: row.legal_data ?? {},
  };
}

export function hasValue(value: unknown) {
  return String(value ?? '').trim().length > 0;
}

export function sectionCompletion(data: Record<string, string>, fields: string[]) {
  if (!fields.length) return 0;
  const filled = fields.filter(field => hasValue(data[field])).length;
  return filled / fields.length;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function uniqueProjectDocumentCount(rows: any[] = []) {
  const grouped = new Map<string, any>();
  const timestamp = (row: any) => new Date(String(row?.updated_at ?? row?.uploaded_at ?? row?.created_at ?? '')).getTime() || 0;
  for (const row of rows) {
    const sourceUrl = String(row?.source_url ?? '').trim().toLowerCase();
    const key = sourceUrl
      ? [row?.category || '', sourceUrl, row?.document_type || 'uploaded_file'].join('|')
      : `record:${row?.id}`;
    const current = grouped.get(key);
    if (!current || timestamp(row) >= timestamp(current)) grouped.set(key, row);
  }
  return grouped.size;
}
