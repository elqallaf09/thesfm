'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  Bot,
  Bell as BellIcon,
  ChartPie,
  Download,
  Flag,
  Gauge,
  GraduationCap,
  HandHeart,
  Home,
  FolderKanban,
  LineChart,
  Menu,
  PiggyBank,
  Plus,
  Printer,
  ReceiptText,
  Send,
  Settings,
  Trash2,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';

type PageKind = 'expenses' | 'income' | 'invest' | 'savings' | 'goals' | 'reports' | 'ai';
type LangText = { ar: string; en: string };
type TranslateFn = ReturnType<typeof useLanguage>['t'];
type MoneyItem = { id: string; name: string; amount: number; created_at?: string | null };
type IncomeSource = MoneyItem & { label?: string | null; category?: string | null };
type EntryKind = Extract<PageKind, 'expenses' | 'income' | 'invest' | 'savings'>;
type EntryFormState = { id?: string; name: string; amount: string; category: string };
type EntryRow = { id: string; title: string; subtitle: string; value: string; item?: MoneyItem | IncomeSource };
type GoalItem = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  goal_type: string;
  category: string;
  priority: string;
  funding_source: string;
  currency: string;
  ai_enabled: boolean;
  icon?: string | null;
  color?: string | null;
  deadline?: string | null;
  notes?: string | null;
  created_at?: string | null;
};
type GoalRow = {
  id: string;
  goal: string;
  amount: number;
  duration?: string | null;
  duration_unit?: string | null;
  notes?: string | null;
  created_at?: string | null;
};
type GoalFormState = {
  id: string;
  name: string;
  goalType: string;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution: string;
  deadline: string;
  category: string;
  priority: string;
  fundingSource: string;
  currency: string;
  notes: string;
  aiEnabled: boolean;
};
type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface Snapshot {
  income: IncomeSource[];
  expenses: MoneyItem[];
  savings: MoneyItem[];
  investments: MoneyItem[];
  goals: GoalItem[];
  error: string | null;
}

interface SectionCard {
  title: LangText;
  body: LangText;
  value?: string;
  tone: string;
}

const emptySnapshot: Snapshot = {
  income: [],
  expenses: [],
  savings: [],
  investments: [],
  goals: [],
  error: null,
};

const emptyEntryForm: EntryFormState = { name: '', amount: '', category: 'general' };
const emptyGoalForm: GoalFormState = {
  id: '',
  name: '',
  goalType: 'saving',
  targetAmount: '',
  currentAmount: '',
  monthlyContribution: '',
  deadline: '',
  category: 'general',
  priority: 'medium',
  fundingSource: 'salary',
  currency: 'KWD',
  notes: '',
  aiEnabled: true,
};
const entryTitleKeys = {
  expenses: 'expenses_entry_title',
  income: 'income_entry_title',
  invest: 'invest_entry_title',
  savings: 'savings_entry_title',
} as const;
const deleteConfirmKeys = {
  expenses: 'expenses_deleteConfirmMessage',
  income: 'income_deleteConfirmMessage',
  invest: 'invest_deleteConfirmMessage',
  savings: 'savings_deleteConfirmMessage',
} as const;

const navItems = [
  { href: '/', label: { ar: 'الرئيسية', en: 'Dashboard' }, icon: Home },
  { href: '/expenses', label: { ar: 'المصروفات', en: 'Expenses' }, icon: ReceiptText },
  { href: '/income', label: { ar: 'الدخل', en: 'Income' }, icon: Wallet },
  { href: '/invest', label: { ar: 'الاستثمارات', en: 'Investments' }, icon: TrendingUp },
  { href: '/savings', label: { ar: 'الإدخار', en: 'Savings' }, icon: PiggyBank },
  { href: '/goals', label: { ar: 'الأهداف', en: 'Goals' }, icon: Target },
  { href: '/projects', label: { ar: 'مشاريعي', en: 'My Projects' }, icon: FolderKanban },
  { href: '/reports', label: { ar: 'التقارير', en: 'Reports' }, icon: ChartPie },
  { href: '/ai', label: { ar: 'الذكاء المالي', en: 'AI' }, icon: Bot },
  { href: '/charity', label: { ar: 'الأعمال الخيرية', en: 'Charity' }, icon: HandHeart },
  { href: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications' }, icon: BellIcon },
  { href: '/settings', label: { ar: 'الإعدادات', en: 'Settings' }, icon: Settings },
  { href: '/profile', label: { ar: 'الملف الشخصي', en: 'Profile' }, icon: GraduationCap },
];

const pageMeta: Record<PageKind, { title: LangText; subtitle: LangText; accent: string; icon: typeof ReceiptText }> = {
  expenses: {
    title: { ar: 'المصروفات', en: 'Expenses' },
    subtitle: { ar: 'راقب الصرف الشهري، التصنيفات، وآخر العمليات في مكان واحد.', en: 'Track monthly spend, categories, and recent expense activity in one place.' },
    accent: '#EF4444',
    icon: ReceiptText,
  },
  income: {
    title: { ar: 'الدخل', en: 'Income' },
    subtitle: { ar: 'نظرة واضحة على الراتب، الدخل الجانبي، ومصادر الدخل الشهرية.', en: 'A clean view of salary, side income, and monthly income sources.' },
    accent: '#22C55E',
    icon: Wallet,
  },
  invest: {
    title: { ar: 'الاستثمار', en: 'Investments' },
    subtitle: { ar: 'تابع المحفظة، فئات الاستثمار، المخاطر، والمساهمة الشهرية.', en: 'Follow portfolio value, investment categories, risk level, and monthly contribution.' },
    accent: '#3B82F6',
    icon: TrendingUp,
  },
  savings: {
    title: { ar: 'الإدخار', en: 'Savings' },
    subtitle: { ar: 'تتبّع مدخراتك وحقّق أهدافك المالية بخطوات واضحة ومنتظمة.', en: 'Track your savings and reach your financial goals with clear, consistent steps.' },
    accent: '#22C55E',
    icon: PiggyBank,
  },
  goals: {
    title: { ar: 'الأهداف المالية', en: 'Financial Goals' },
    subtitle: { ar: 'حوّل أهدافك إلى بطاقات تقدم بمبلغ مستهدف ومتبقي واضح.', en: 'Turn targets into progress cards with clear target and remaining amounts.' },
    accent: '#D8AE63',
    icon: Target,
  },
  reports: {
    title: { ar: 'التقارير', en: 'Reports' },
    subtitle: { ar: 'ملخص مالي قابل للطباعة للتدفقات، الادخار، الاستثمار، والتوازن الشهري.', en: 'Printable financial summaries for cash flow, savings, investments, and monthly balance.' },
    accent: '#8B5CF6',
    icon: ChartPie,
  },
  ai: {
    title: { ar: 'المساعد المالي الذكي', en: 'AI Financial Assistant' },
    subtitle: { ar: 'اقتراحات ذكية، رؤى فورية، وبطاقات عمل لتحسين قراراتك المالية.', en: 'Smart suggestions, instant insights, and action cards for better financial decisions.' },
    accent: '#06B6D4',
    icon: Bot,
  },
};

function pick(text: LangText, isAr: boolean) {
  return isAr ? text.ar : text.en;
}

function money(value: number, isAr: boolean, currency = 'KWD') {
  return formatCurrency(value, currency, isAr ? 'ar' : 'en');
}

function sum(items: MoneyItem[]) {
  return items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function progress(current: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function editableKind(kind: PageKind): kind is EntryKind {
  return kind === 'expenses' || kind === 'income' || kind === 'invest' || kind === 'savings';
}

function guestKey(kind: EntryKind) {
  return `sfm_guest_${kind}`;
}

function readGuestItems(kind: EntryKind): MoneyItem[] | IncomeSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(guestKey(kind)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestItems(kind: EntryKind, items: MoneyItem[] | IncomeSource[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(guestKey(kind), JSON.stringify(items));
}

function parseGoalNotes(notes?: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { description: notes };
  }
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Math.max(0, months));
  return next;
}

function formatDateInput(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthsBetween(from: Date, to?: string | null) {
  if (!to) return 0;
  const end = new Date(to);
  if (Number.isNaN(end.getTime()) || end <= from) return 0;
  const years = end.getFullYear() - from.getFullYear();
  const months = end.getMonth() - from.getMonth();
  const days = end.getDate() >= from.getDate() ? 0 : -1;
  return Math.max(1, years * 12 + months + days);
}

function goalFromRow(item: GoalRow): GoalItem {
  const notes = parseGoalNotes(item.notes);
  const deadline = typeof notes.deadline === 'string'
    ? notes.deadline
    : item.duration && item.duration_unit === 'month'
      ? formatDateInput(addMonths(new Date(), Number(item.duration) || 0))
      : null;

  return {
    id: item.id,
    name: item.goal,
    target_amount: Number(item.amount) || 0,
    current_amount: Number(notes.currentAmount) || 0,
    monthly_contribution: Number(notes.monthlyContribution) || 0,
    goal_type: typeof notes.goalType === 'string' ? notes.goalType : 'saving',
    category: typeof notes.category === 'string' ? notes.category : 'general',
    priority: typeof notes.priority === 'string' ? notes.priority : 'medium',
    funding_source: typeof notes.fundingSource === 'string' ? notes.fundingSource : 'salary',
    currency: typeof notes.currency === 'string' ? notes.currency : 'KWD',
    ai_enabled: typeof notes.aiEnabled === 'boolean' ? notes.aiEnabled : true,
    icon: '🎯',
    color: '#D8AE63',
    deadline,
    notes: item.notes,
    created_at: item.created_at,
  };
}

function entryTitleKey(kind: EntryKind) {
  return entryTitleKeys[kind];
}

function deleteConfirmKey(kind: EntryKind) {
  return deleteConfirmKeys[kind];
}

async function safeQuery<T>(query: QueryResult<T>) {
  try {
    const { data, error } = await query;
    if (error) return { data: [] as T[], error: error.message };
    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [] as T[], error: err instanceof Error ? err.message : 'Unknown data error' };
  }
}

export function RouteDashboardPage({ kind }: { kind: PageKind }) {
  const router = useRouter();
  const { user, loading, isGuest } = useAuth();
  const { isAr, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const meta = pageMeta[kind];
  const Icon = meta.icon;

  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [dataLoading, setDataLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);
  const [entryMode, setEntryMode] = useState<'create' | 'edit'>('create');
  const [entryOpen, setEntryOpen] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<(MoneyItem | IncomeSource) | null>(null);
  const [entryMessage, setEntryMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalMode, setGoalMode] = useState<'create' | 'edit'>('edit');
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [rowSort, setRowSort] = useState<'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc'>('dateDesc');
  const [rowRange, setRowRange] = useState<'all' | 'month' | 'last3' | 'year'>('all');
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        if (isGuest) {
          setSnapshot({
            ...emptySnapshot,
            income: readGuestItems('income') as IncomeSource[],
            expenses: readGuestItems('expenses') as MoneyItem[],
            savings: readGuestItems('savings') as MoneyItem[],
            investments: readGuestItems('invest') as MoneyItem[],
          });
        }
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      const [income, expenses, savings, investments, goals] = await Promise.all([
        safeQuery<IncomeSource>(supabase.from('monthly_income_sources').select('id, label, category, amount').eq('user_id', user.id) as unknown as QueryResult<IncomeSource>),
        safeQuery<MoneyItem>(supabase.from('expense_items').select('id, name, amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<MoneyItem>),
        safeQuery<MoneyItem>(supabase.from('savings_items').select('id, name, amount').eq('user_id', user.id) as unknown as QueryResult<MoneyItem>),
        safeQuery<MoneyItem>(supabase.from('investment_items').select('id, name, amount').eq('user_id', user.id) as unknown as QueryResult<MoneyItem>),
        safeQuery<GoalRow>(supabase.from('financial_goals').select('id, goal, amount, duration, duration_unit, notes, created_at').eq('user_id', user.id) as unknown as QueryResult<GoalRow>),
      ]);

      if (cancelled) return;

      setSnapshot({
        income: income.data.map(item => ({ ...item, name: item.label || item.category || item.name || 'Income' })),
        expenses: expenses.data,
        savings: savings.data,
        investments: investments.data,
        goals: goals.data.map(goalFromRow),
        error: [income.error, expenses.error, savings.error, investments.error, goals.error].filter(Boolean)[0] ?? null,
      });
      setDataLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isGuest, user]);

  const data = useMemo(() => {
    const income = snapshot.income;
    const expenses = snapshot.expenses;
    const savings = snapshot.savings;
    const investments = snapshot.investments;
    const goals = snapshot.goals;
    const totalIncome = sum(income);
    const totalExpenses = sum(expenses);
    const totalSavings = sum(savings);
    const totalInvestments = sum(investments);
    const charityTotal = expenses.filter(item => item.name.startsWith('خيرية:')).reduce((total, item) => total + item.amount, 0);

    return {
      income,
      expenses,
      savings,
      investments,
      goals,
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      charityTotal,
      balance: totalIncome - totalExpenses,
    };
  }, [snapshot]);

  const cards = useMemo<SectionCard[]>(() => buildCards(kind, data, isAr, currency), [data, isAr, kind, currency]);
  const rows = useMemo(() => buildRows(kind, data, isAr, currency), [data, isAr, kind, currency]);
  const insights = useMemo(() => buildInsights(kind, data, isAr, currency), [data, isAr, kind, currency]);
  const goalPreview = useMemo(() => buildGoalAnalysis({
    id: goalForm.id || 'preview',
    name: goalForm.name || t('goal_name_label'),
    target_amount: Number(goalForm.targetAmount) || 0,
    current_amount: Number(goalForm.currentAmount) || 0,
    monthly_contribution: Number(goalForm.monthlyContribution) || 0,
    goal_type: goalForm.goalType,
    category: goalForm.category,
    priority: goalForm.priority,
    funding_source: goalForm.fundingSource,
    currency: goalForm.currency || currency || 'KWD',
    ai_enabled: goalForm.aiEnabled,
    deadline: goalForm.deadline || null,
    icon: '🎯',
    color: '#D8AE63',
    notes: goalForm.notes,
  }, data, isAr, goalForm.currency || currency, t), [currency, data, goalForm, isAr, t]);

  const filteredRows = useMemo(() => {
    if (!editableKind(kind)) return rows;
    let result = [...rows];
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
    }
    if (rowRange !== 'all') {
      const now = new Date();
      result = result.filter(r => {
        const ca = r.item?.created_at;
        if (!ca) return true;
        const d = new Date(ca);
        if (rowRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (rowRange === 'last3') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
        if (rowRange === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    if (rowSort === 'amountDesc') result.sort((a, b) => (b.item?.amount ?? 0) - (a.item?.amount ?? 0));
    else if (rowSort === 'amountAsc') result.sort((a, b) => (a.item?.amount ?? 0) - (b.item?.amount ?? 0));
    else if (rowSort === 'dateAsc') result.sort((a, b) => new Date(a.item?.created_at ?? 0).getTime() - new Date(b.item?.created_at ?? 0).getTime());
    else result.sort((a, b) => new Date(b.item?.created_at ?? 0).getTime() - new Date(a.item?.created_at ?? 0).getTime());
    return result;
  }, [rows, rowSearch, rowSort, rowRange, kind]);

  useEffect(() => { setVisibleCount(30); }, [rowSearch, rowSort, rowRange, kind]);

  function showEntryMessage(type: 'ok' | 'err', text: string) {
    setEntryMessage({ type, text });
    window.setTimeout(() => setEntryMessage(null), 2200);
  }

  function openCreateEntry() {
    if (!editableKind(kind)) return;
    setEntryMode('create');
    setEntryForm(emptyEntryForm);
    setEntryOpen(true);
  }

  function openEditEntry(item: MoneyItem | IncomeSource) {
    if (!editableKind(kind)) return;
    setEntryMode('edit');
    setEntryForm({
      id: item.id,
      name: 'label' in item && item.label ? item.label : item.name,
      amount: String(item.amount ?? ''),
      category: 'category' in item && item.category ? item.category : 'general',
    });
    setEntryOpen(true);
  }

  function applyEntryToSnapshot(entryKind: EntryKind, item: MoneyItem | IncomeSource, mode: 'create' | 'edit') {
    setSnapshot(prev => {
      const apply = <T extends MoneyItem>(items: T[]) => (
        mode === 'create'
          ? [item as T, ...items]
          : items.map(existing => existing.id === item.id ? { ...existing, ...item } as T : existing)
      );

      if (entryKind === 'income') return { ...prev, income: apply(prev.income) as IncomeSource[] };
      if (entryKind === 'expenses') return { ...prev, expenses: apply(prev.expenses) };
      if (entryKind === 'savings') return { ...prev, savings: apply(prev.savings) };
      return { ...prev, investments: apply(prev.investments) };
    });
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editableKind(kind) || entrySaving) return;

    const name = entryForm.name.trim();
    const amount = Number(entryForm.amount);
    if (!name || !amount || amount <= 0) {
      showEntryMessage('err', t('entry_validation_error'));
      return;
    }

    setEntrySaving(true);
    const mode = entryMode;
    const id = entryForm.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);

    try {
      if (isGuest) {
        const current = readGuestItems(kind);
        const item = kind === 'income'
          ? { id, name, label: name, category: entryForm.category || 'general', amount, created_at: new Date().toISOString() } as IncomeSource
          : { id, name, amount, created_at: new Date().toISOString() } as MoneyItem;
        const next = mode === 'create' ? [item, ...current] : current.map(existing => existing.id === id ? item : existing);
        writeGuestItems(kind, next);
        applyEntryToSnapshot(kind, item, mode);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        if (kind === 'income') {
          if (mode === 'create') {
            const { data: created, error } = await supabase.from('monthly_income_sources').insert({
              user_id: user.id,
              category: entryForm.category || 'general',
              label: name,
              amount,
            }).select('id,label,category,amount').single();
            if (error) throw error;
            applyEntryToSnapshot(kind, { id: created.id, name: created.label || name, label: created.label, category: created.category, amount: Number(created.amount) || amount }, mode);
          } else {
            const { error } = await supabase.from('monthly_income_sources').update({
              category: entryForm.category || 'general',
              label: name,
              amount,
            }).eq('id', id);
            if (error) throw error;
            applyEntryToSnapshot(kind, { id, name, label: name, category: entryForm.category || 'general', amount }, mode);
          }
        } else {
          const table = kind === 'expenses' ? 'expense_items' : kind === 'savings' ? 'savings_items' : 'investment_items';
          if (mode === 'create') {
            const { data: created, error } = await supabase.from(table).insert({
              user_id: user.id,
              name,
              amount,
            }).select('id,name,amount,created_at').single();
            if (error) throw error;
            applyEntryToSnapshot(kind, { id: created.id, name: created.name, amount: Number(created.amount) || amount, created_at: created.created_at }, mode);
          } else {
            const { error } = await supabase.from(table).update({ name, amount }).eq('id', id);
            if (error) throw error;
            applyEntryToSnapshot(kind, { id, name, amount }, mode);
          }
        }
      }

      setEntryOpen(false);
      setEntryForm(emptyEntryForm);
      showEntryMessage('ok', mode === 'create' ? t('success') : t('updateSuccess'));
    } catch (err) {
      showEntryMessage('err', err instanceof Error ? err.message : t('error'));
    } finally {
      setEntrySaving(false);
    }
  }

  async function deleteEntry() {
    if (!editableKind(kind) || !confirmDelete || entrySaving) return;

    setEntrySaving(true);
    try {
      if (isGuest) {
        const next = readGuestItems(kind).filter(item => item.id !== confirmDelete.id);
        writeGuestItems(kind, next);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        const table = kind === 'income' ? 'monthly_income_sources' : kind === 'expenses' ? 'expense_items' : kind === 'savings' ? 'savings_items' : 'investment_items';
        const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
        if (error) throw error;
      }

      setSnapshot(prev => {
        if (kind === 'income') return { ...prev, income: prev.income.filter(item => item.id !== confirmDelete.id) };
        if (kind === 'expenses') return { ...prev, expenses: prev.expenses.filter(item => item.id !== confirmDelete.id) };
        if (kind === 'savings') return { ...prev, savings: prev.savings.filter(item => item.id !== confirmDelete.id) };
        return { ...prev, investments: prev.investments.filter(item => item.id !== confirmDelete.id) };
      });
      setConfirmDelete(null);
      showEntryMessage('ok', t('deleteSuccess'));
    } catch (err) {
      showEntryMessage('err', err instanceof Error ? err.message : t('error'));
    } finally {
      setEntrySaving(false);
    }
  }

  function openEditGoal(goal: GoalItem) {
    setGoalError('');
    const notes = parseGoalNotes(goal.notes);
    setGoalMode('edit');
    setGoalForm({
      id: goal.id,
      name: goal.name,
      goalType: goal.goal_type || 'saving',
      targetAmount: String(goal.target_amount || ''),
      currentAmount: String(goal.current_amount || ''),
      monthlyContribution: String(goal.monthly_contribution || ''),
      deadline: goal.deadline || '',
      category: goal.category || 'general',
      priority: goal.priority || 'medium',
      fundingSource: goal.funding_source || 'salary',
      currency: goal.currency || currency || 'KWD',
      notes: typeof notes.description === 'string' ? notes.description : '',
      aiEnabled: goal.ai_enabled,
    });
    setGoalEditOpen(true);
  }

  function openCreateGoal() {
    const nextMonth = addMonths(new Date(), 12);
    setGoalError('');
    setGoalMode('create');
    setGoalForm({
      ...emptyGoalForm,
      currency: currency || 'KWD',
      deadline: formatDateInput(nextMonth),
    });
    setGoalEditOpen(true);
  }

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goalSaving) return;

    const name = goalForm.name.trim();
    const targetAmount = Number(goalForm.targetAmount);
    const currentAmount = Number(goalForm.currentAmount || 0);
    const monthlyContribution = Number(goalForm.monthlyContribution || 0);

    const deadlineDate = goalForm.deadline ? new Date(goalForm.deadline) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!name || !targetAmount || targetAmount <= 0) {
      setGoalError(t('goal_validation_required'));
      return;
    }
    if (currentAmount < 0 || monthlyContribution < 0) {
      setGoalError(t('goal_validation_positive'));
      return;
    }
    if (currentAmount > targetAmount) {
      setGoalError(t('goal_validation_current_over_target'));
      return;
    }
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime()) || deadlineDate <= today) {
      setGoalError(t('goal_validation_future_deadline'));
      return;
    }

    setGoalSaving(true);
    setGoalError('');

    const notes = JSON.stringify({
      currentAmount,
      monthlyContribution,
      goalType: goalForm.goalType,
      deadline: goalForm.deadline || null,
      category: goalForm.category,
      priority: goalForm.priority,
      fundingSource: goalForm.fundingSource,
      currency: goalForm.currency,
      description: goalForm.notes.trim() || null,
      aiEnabled: goalForm.aiEnabled,
    });
    const months = monthsBetween(new Date(), goalForm.deadline);

    try {
      if (!user) throw new Error(t('entry_auth_required'));
      const payload = {
        goal: name,
        amount: targetAmount,
        duration: months ? String(months) : null,
        duration_unit: months ? 'month' : null,
        notes,
      };

      if (goalMode === 'create') {
        const { data: created, error } = await supabase.from('financial_goals').insert({
          ...payload,
          user_id: user.id,
        }).select('id, goal, amount, duration, duration_unit, notes, created_at').single();
        if (error) throw error;
        setSnapshot(prev => ({
          ...prev,
          goals: [goalFromRow(created as GoalRow), ...prev.goals],
        }));
      } else {
        const { error } = await supabase.from('financial_goals').update(payload).eq('id', goalForm.id).eq('user_id', user.id);
        if (error) throw error;

        setSnapshot(prev => ({
          ...prev,
          goals: prev.goals.map(goal => goal.id === goalForm.id ? {
            ...goal,
            name,
            target_amount: targetAmount,
            current_amount: currentAmount,
            monthly_contribution: monthlyContribution,
            goal_type: goalForm.goalType,
            deadline: goalForm.deadline || null,
            category: goalForm.category,
            priority: goalForm.priority,
            funding_source: goalForm.fundingSource,
            currency: goalForm.currency,
            ai_enabled: goalForm.aiEnabled,
            notes,
          } : goal),
        }));
      }

      setGoalEditOpen(false);
      showEntryMessage('ok', goalMode === 'create' ? t('goal_create_success') : t('goal_update_success'));
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : t('goal_update_error'));
      showEntryMessage('err', err instanceof Error ? err.message : t('goal_update_error'));
    } finally {
      setGoalSaving(false);
    }
  }

  useEffect(() => {
    if (!entryOpen && !confirmDelete && !goalEditOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEntryOpen(false);
        setConfirmDelete(null);
        setGoalEditOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [confirmDelete, entryOpen, goalEditOpen]);

  async function sendAiMessage() {
    const content = chatValue.trim();
    if (!content || chatLoading) return;

    const nextHistory: ChatMessage[] = [...chatHistory, { role: 'user', content }];
    setChatHistory(nextHistory);
    setChatValue('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/projects-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const result = await response.json() as { text?: string };
      setChatHistory([...nextHistory, {
        role: 'assistant',
        content: result.text || (isAr ? 'وصلتني رسالتك، لكن لم أستطع توليد رد الآن.' : 'I received your message, but could not generate a reply right now.'),
      }]);
    } catch {
      setChatHistory([...nextHistory, {
        role: 'assistant',
        content: isAr ? 'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.' : 'The service is unavailable right now. Please try again shortly.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sfm-shell" dir={dir}>
        <div className="sfm-spinner" />
        <style>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className="sfm-shell" dir={dir}>
      <Sidebar />

      <main className="sfm-main">
        <header className="sfm-header">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="title-wrap">
            <div className="title-icon" style={{ '--accent': meta.accent } as CSSProperties}>
              <Icon size={22} />
            </div>
            <div>
              <p>{isAr ? 'THE SFM / لوحة التحكم' : 'THE SFM / Dashboard'}</p>
              <h1>{pick(meta.title, isAr)}</h1>
            </div>
          </div>
          <div className="finance-header-lang">
            <LanguageSwitcher variant="gold" compact />
          </div>
          {isGuest && <span className="guest-pill">{isAr ? 'وضع الضيف' : 'Guest mode'}</span>}
        </header>

        {menuOpen && (
          <div className="mobile-panel">
            <div className="mobile-head">
              <strong>THE SFM</strong>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <X size={19} />
              </button>
            </div>
            {navItems.map(item => {
              const NavIcon = item.icon;
              return (
                <button key={item.href} onClick={() => { setMenuOpen(false); router.push(item.href); }}>
                  <NavIcon size={18} />
                  {pick(item.label, isAr)}
                </button>
              );
            })}
          </div>
        )}

        <section className="hero">
          <div>
            <span className="eyebrow">{isAr ? 'مسار نشط' : 'Active route'}</span>
            <h2>{pick(meta.title, isAr)}</h2>
            <p>{pick(meta.subtitle, isAr)}</p>
          </div>
          <div className="hero-actions">
            {buildPrimaryActions(kind, isAr, openCreateEntry, openCreateGoal, () => {
              const input = document.getElementById('ai-chat-input');
              input?.focus();
            }).map(action => (
              <button key={action.label} className={action.variant === 'print' ? 'ghost-btn' : 'primary-btn'} onClick={action.onClick}>
                <action.icon size={17} />
                {action.label}
              </button>
            ))}
          </div>
        </section>

        {snapshot.error && (
          <div className="notice">
            {isAr ? 'تعذر تحميل بعض البيانات، لذلك نعرض واجهة آمنة بدون تعطيل الصفحة.' : 'Some data could not load, so the page is showing a safe fallback instead.'}
          </div>
        )}

        <section className="kpi-grid">
          {cards.map(card => (
            <article key={pick(card.title, isAr)} className="kpi-card">
              <span style={{ background: card.tone }} />
              <p>{pick(card.title, isAr)}</p>
              <strong>{card.value}</strong>
              <small>{pick(card.body, isAr)}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div>
                <p>{isAr ? 'تفاصيل الصفحة' : 'Page details'}</p>
                <h3>{sectionTitle(kind, isAr)}</h3>
              </div>
              {dataLoading && <span className="loading-pill">{isAr ? 'جاري التحميل' : 'Loading'}</span>}
            </div>

            {editableKind(kind) && (
              <div className="row-controls">
                <input
                  type="search"
                  className="row-search"
                  placeholder={isAr ? 'بحث...' : 'Search...'}
                  value={rowSearch}
                  onChange={e => setRowSearch(e.target.value)}
                />
                <select className="row-select" value={rowRange} onChange={e => setRowRange(e.target.value as typeof rowRange)}>
                  <option value="all">{isAr ? 'كل الفترات' : 'All time'}</option>
                  <option value="month">{isAr ? 'هذا الشهر' : 'This month'}</option>
                  <option value="last3">{isAr ? 'آخر 3 أشهر' : 'Last 3 months'}</option>
                  <option value="year">{isAr ? 'هذه السنة' : 'This year'}</option>
                </select>
                <select className="row-select" value={rowSort} onChange={e => setRowSort(e.target.value as typeof rowSort)}>
                  <option value="dateDesc">{isAr ? 'الأحدث أولاً' : 'Newest first'}</option>
                  <option value="dateAsc">{isAr ? 'الأقدم أولاً' : 'Oldest first'}</option>
                  <option value="amountDesc">{isAr ? 'أعلى مبلغ' : 'Highest amount'}</option>
                  <option value="amountAsc">{isAr ? 'أقل مبلغ' : 'Lowest amount'}</option>
                </select>
              </div>
            )}

            {editableKind(kind) && rows.length > 0 && (
              <div className="row-count">
                {isAr
                  ? `يعرض ${Math.min(visibleCount, filteredRows.length)} من ${filteredRows.length} ${rows.length !== filteredRows.length ? `(المجموع ${rows.length})` : ''}`
                  : `Showing ${Math.min(visibleCount, filteredRows.length)} of ${filteredRows.length}${rows.length !== filteredRows.length ? ` (total ${rows.length})` : ''}`}
                {' · '}
                {money(filteredRows.slice(0, visibleCount).reduce((s, r) => s + (r.item?.amount ?? 0), 0), isAr, currency)}
              </div>
            )}

            <div className="row-list">
              {kind === 'goals' && data.goals.length === 0 && (
                <div className="empty-state">{t('goals_empty_state')}</div>
              )}
              {kind === 'goals' && data.goals.map(goal => {
                const analysis = buildGoalAnalysis(goal, data, isAr, currency, t);
                const done = progress(goal.current_amount, goal.target_amount);
                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-card-head">
                      <div className="goal-title-wrap">
                        <span className="goal-icon">{goal.icon || '🎯'}</span>
                        <div>
                          <strong>{goal.name}</strong>
                          <span>{t('goal_remaining_amount')}: {money(analysis.remainingAmount, isAr, goal.currency || currency)}</span>
                        </div>
                      </div>
                      <button type="button" className="goal-edit-btn" onClick={() => openEditGoal(goal)}>
                        <Edit3 size={15} />
                        {t('goal_edit_button')}
                      </button>
                    </div>
                    <div className="goal-progress-row">
                      <div className="goal-progress-track">
                        <span style={{ width: `${done}%` }} />
                      </div>
                      <b>{done}%</b>
                    </div>
                    <div className="goal-meta-grid">
                      <div><span>{t('goal_target_amount')}</span><strong>{money(goal.target_amount, isAr, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_current_amount')}</span><strong>{money(goal.current_amount, isAr, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_monthly_contribution')}</span><strong>{money(goal.monthly_contribution, isAr, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_deadline')}</span><strong>{goal.deadline || t('goal_deadline_missing')}</strong></div>
                    </div>
                    <div className="goal-ai-card">
                      <div className="goal-ai-head">
                        <Bot size={18} />
                        <strong>{t('goal_ai_title')}</strong>
                        <span className={`risk-pill ${analysis.riskClass}`}>{analysis.riskLabel}</span>
                      </div>
                      <div className="goal-ai-metrics">
                        <div><span>{t('goal_required_monthly')}</span><b>{money(analysis.requiredMonthlySaving, isAr, goal.currency || currency)}</b></div>
                        <div><span>{t('goal_estimated_completion')}</span><b>{analysis.estimatedCompletion}</b></div>
                        <div><span>{t('goal_status_label')}</span><b>{analysis.statusLabel}</b></div>
                        <div><span>{t('goal_adjustment_label')}</span><b>{money(analysis.adjustment, isAr, goal.currency || currency)}</b></div>
                      </div>
                      <p>{analysis.summary}</p>
                      <div className="goal-ai-plan">
                        <strong>{t('goal_plan_title')}</strong>
                        <ol>
                          {analysis.steps.map(step => <li key={step}>{step}</li>)}
                        </ol>
                      </div>
                    </div>
                  </article>
                );
              })}
              {kind !== 'goals' && filteredRows.length === 0 && (
                <div className="empty-state">{isAr ? 'لا توجد بيانات محفوظة حالياً' : 'No saved data yet'}</div>
              )}
              {kind !== 'goals' && (editableKind(kind) ? filteredRows.slice(0, visibleCount) : filteredRows).map(row => (
                <div className="data-row" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <div className="row-actions-wrap">
                    <b>{row.value}</b>
                    {editableKind(kind) && row.item && (
                      <div className="row-actions">
                        <button type="button" className="row-action" onClick={() => openEditEntry(row.item!)} aria-label={t('edit')} title={t('edit')}>
                          <Edit3 size={15} />
                        </button>
                        <button type="button" className="row-action" onClick={() => setConfirmDelete(row.item!)} aria-label={t('delete')} title={t('delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {editableKind(kind) && filteredRows.length > visibleCount && (
                <button type="button" className="load-more-btn" onClick={() => setVisibleCount(v => v + 30)}>
                  {isAr ? `تحميل المزيد (${filteredRows.length - visibleCount} متبقية)` : `Load more (${filteredRows.length - visibleCount} remaining)`}
                </button>
              )}
            </div>
          </div>

          <aside className="panel">
            <div className="panel-head compact">
              <div>
                <p>{isAr ? 'رؤى ذكية' : 'Smart insights'}</p>
                <h3>{isAr ? 'اقتراحات الآن' : 'Suggestions now'}</h3>
              </div>
              <Gauge size={21} />
            </div>
            <div className="insight-list">
              {insights.map(item => (
                <div key={item.title}>
                  <Flag size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {kind === 'ai' ? (
          <section className="ai-panel">
            <div>
              <h3>{isAr ? 'اسأل المساعد المالي' : 'Ask the financial assistant'}</h3>
              <p>{isAr ? 'اكتب سؤالك عن الميزانية، الدخل، أو الاستثمار. الواجهة جاهزة للتوصيل بخدمة الذكاء الموجودة.' : 'Ask about budgets, income, or investing. The interface is ready for the existing AI service.'}</p>
            </div>
            <div className="chat-history">
              {(chatHistory.length ? chatHistory : [{ role: 'assistant', content: isAr ? 'مرحباً، اسألني عن دخلك أو مصروفاتك أو فرص تحسين الادخار.' : 'Hi, ask me about income, expenses, or savings optimization.' }]).map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="chat-box">
              <input
                id="ai-chat-input"
                value={chatValue}
                onChange={event => setChatValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void sendAiMessage();
                }}
                placeholder={isAr ? 'مثال: كيف أخفض مصاريفي هذا الشهر؟' : 'Example: How can I reduce expenses this month?'}
              />
              <button aria-label="Send message" onClick={() => void sendAiMessage()} disabled={chatLoading}>
                <Send size={18} />
              </button>
            </div>
          </section>
        ) : (
          <section className="summary-band">
            <LineChart size={20} />
            <div>
              <strong>{summaryTitle(kind, isAr)}</strong>
              <p>{summaryText(kind, data, isAr, currency)}</p>
            </div>
          </section>
        )}

        {entryOpen && editableKind(kind) && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setEntryOpen(false)}>
            <div className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{entryMode === 'edit' ? t('update') : t('entry_save')}</p>
                  <h3 id="entry-modal-title">{t(entryTitleKey(kind))}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setEntryOpen(false)} aria-label={t('close')}>
                  <X size={18} />
                </button>
              </div>
              <form className="entry-form" onSubmit={saveEntry}>
                <label>
                  <span>{t('entry_name')}</span>
                  <input
                    value={entryForm.name}
                    onChange={event => setEntryForm(prev => ({ ...prev, name: event.target.value }))}
                    autoFocus
                  />
                </label>
                <label>
                  <span>{t('entry_amount')}</span>
                  <input
                    inputMode="decimal"
                    value={entryForm.amount}
                    onChange={event => setEntryForm(prev => ({ ...prev, amount: event.target.value }))}
                  />
                </label>
                {kind === 'income' && (
                  <label>
                    <span>{t('entry_category')}</span>
                    <input
                      value={entryForm.category}
                      onChange={event => setEntryForm(prev => ({ ...prev, category: event.target.value }))}
                    />
                  </label>
                )}
                <div className="entry-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setEntryOpen(false)} disabled={entrySaving}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="primary-form-btn" disabled={entrySaving}>
                    {entrySaving ? t('saving') : entryMode === 'edit' ? t('update') : t('entry_save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {goalEditOpen && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setGoalEditOpen(false)}>
            <div className="entry-modal goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{t('goal_edit_button')}</p>
                  <h3 id="goal-modal-title">{t('goal_edit_title')}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setGoalEditOpen(false)} aria-label={t('close')}>
                  <X size={18} />
                </button>
              </div>
              <form className="entry-form goal-form-grid" onSubmit={saveGoal}>
                <label>
                  <span>{t('goal_name_label')}</span>
                  <input value={goalForm.name} onChange={event => setGoalForm(prev => ({ ...prev, name: event.target.value }))} autoFocus />
                </label>
                <label>
                  <span>{t('goal_type_label')}</span>
                  <select value={goalForm.goalType} onChange={event => setGoalForm(prev => ({ ...prev, goalType: event.target.value }))}>
                    <option value="debt">{t('goal_type_debt')}</option>
                    <option value="saving">{t('goal_type_saving')}</option>
                    <option value="investment">{t('goal_type_investment')}</option>
                    <option value="emergency">{t('goal_type_emergency')}</option>
                    <option value="asset">{t('goal_type_asset')}</option>
                    <option value="education">{t('goal_type_education')}</option>
                    <option value="travel">{t('goal_type_travel')}</option>
                    <option value="retirement">{t('goal_type_retirement')}</option>
                    <option value="custom">{t('goal_type_custom')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_target_amount')}</span>
                  <input inputMode="decimal" value={goalForm.targetAmount} onChange={event => setGoalForm(prev => ({ ...prev, targetAmount: event.target.value }))} />
                </label>
                <label>
                  <span>{t('goal_current_amount')}</span>
                  <input inputMode="decimal" value={goalForm.currentAmount} onChange={event => setGoalForm(prev => ({ ...prev, currentAmount: event.target.value }))} />
                </label>
                <label>
                  <span>{t('goal_monthly_contribution')}</span>
                  <input inputMode="decimal" value={goalForm.monthlyContribution} onChange={event => setGoalForm(prev => ({ ...prev, monthlyContribution: event.target.value }))} />
                </label>
                <label>
                  <span>{t('goal_deadline')}</span>
                  <input type="date" value={goalForm.deadline} onChange={event => setGoalForm(prev => ({ ...prev, deadline: event.target.value }))} />
                </label>
                <label>
                  <span>{t('goal_category_label')}</span>
                  <select value={goalForm.category} onChange={event => setGoalForm(prev => ({ ...prev, category: event.target.value }))}>
                    <option value="general">{t('goal_category_general')}</option>
                    <option value="emergency">{t('goal_category_emergency')}</option>
                    <option value="home">{t('goal_category_home')}</option>
                    <option value="car">{t('goal_category_car')}</option>
                    <option value="education">{t('goal_category_education')}</option>
                    <option value="business">{t('goal_category_business')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_priority_label')}</span>
                  <select value={goalForm.priority} onChange={event => setGoalForm(prev => ({ ...prev, priority: event.target.value }))}>
                    <option value="low">{t('goal_priority_low')}</option>
                    <option value="medium">{t('goal_priority_medium')}</option>
                    <option value="high">{t('goal_priority_high')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_funding_source_label')}</span>
                  <select value={goalForm.fundingSource} onChange={event => setGoalForm(prev => ({ ...prev, fundingSource: event.target.value }))}>
                    <option value="salary">{t('goal_funding_salary')}</option>
                    <option value="investment_return">{t('goal_funding_investment_return')}</option>
                    <option value="expense_reduction">{t('goal_funding_expense_reduction')}</option>
                    <option value="extra_income">{t('goal_funding_extra_income')}</option>
                    <option value="automatic">{t('goal_funding_automatic')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_currency_label')}</span>
                  <select value={goalForm.currency} onChange={event => setGoalForm(prev => ({ ...prev, currency: event.target.value }))}>
                    <option value="KWD">KWD</option>
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label className="goal-notes-field">
                  <span>{t('goal_notes_label')}</span>
                  <textarea value={goalForm.notes} onChange={event => setGoalForm(prev => ({ ...prev, notes: event.target.value }))} placeholder={t('optional')} />
                </label>
                <label className="goal-ai-toggle">
                  <span>{t('goal_ai_toggle')}</span>
                  <button
                    type="button"
                    className={goalForm.aiEnabled ? 'switch active' : 'switch'}
                    aria-pressed={goalForm.aiEnabled}
                    onClick={() => setGoalForm(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                  >
                    <span />
                  </button>
                </label>
                {goalForm.aiEnabled && (
                  <div className="goal-modal-preview">
                    <div className="goal-ai-head">
                      <Bot size={18} />
                      <strong>{t('goal_ai_preview_title')}</strong>
                      <span className={`risk-pill ${goalPreview.riskClass}`}>{goalPreview.riskLabel}</span>
                    </div>
                    {goalPreview.missing.length > 0 ? (
                      <div className="preview-missing">
                        <strong>{t('goal_ai_missing_title')}</strong>
                        <ul>{goalPreview.missing.map(item => <li key={item}>{item}</li>)}</ul>
                      </div>
                    ) : (
                      <>
                        <div className="goal-ai-metrics">
                          <div><span>{t('goal_remaining_amount')}</span><b>{money(goalPreview.remainingAmount, isAr, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_required_monthly')}</span><b>{money(goalPreview.requiredMonthlySaving, isAr, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_current_contribution')}</span><b>{money(Number(goalForm.monthlyContribution) || 0, isAr, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_estimated_completion')}</span><b>{goalPreview.estimatedCompletion}</b></div>
                        </div>
                        <p>{goalPreview.summary}</p>
                        <div className="goal-ai-plan">
                          <strong>{t('goal_plan_title')}</strong>
                          <ol>{goalPreview.steps.map(step => <li key={step}>{step}</li>)}</ol>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {goalError && <div className="form-error">{goalError}</div>}
                <div className="entry-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setGoalEditOpen(false)} disabled={goalSaving}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="primary-form-btn" disabled={goalSaving}>
                    {goalSaving ? t('saving') : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && editableKind(kind) && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setConfirmDelete(null)}>
            <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onMouseDown={event => event.stopPropagation()}>
              <div className="confirm-icon">
                <Trash2 size={24} />
              </div>
              <h3 id="confirm-delete-title">{t('confirmDelete')}</h3>
              <p>{t(deleteConfirmKey(kind))}</p>
              <small>{t('deleteWarning')}</small>
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => setConfirmDelete(null)} disabled={entrySaving}>
                  {t('cancel')}
                </button>
                <button type="button" className="danger-form-btn" onClick={() => void deleteEntry()} disabled={entrySaving}>
                  {entrySaving ? t('saving') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {entryMessage && (
          <div className={`entry-toast ${entryMessage.type}`}>
            {entryMessage.text}
          </div>
        )}
      </main>

      <style>{baseStyles}</style>
    </div>
  );
}

function buildCards(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean, currency = 'KWD'): SectionCard[] {
  const common = {
    income: money(data.totalIncome, isAr, currency),
    expenses: money(data.totalExpenses, isAr, currency),
    savings: money(data.totalSavings, isAr, currency),
    investments: money(data.totalInvestments, isAr, currency),
    balance: money(data.balance, isAr, currency),
  };

  if (kind === 'expenses') return [
    { title: { ar: 'إجمالي المصروفات', en: 'Total expenses' }, body: { ar: 'يشمل كل عمليات المصروفات المسجلة.', en: 'Includes all recorded expense items.' }, value: common.expenses, tone: '#EF4444' },
    { title: { ar: 'الأعمال الخيرية', en: 'Charity spend' }, body: { ar: 'مرتبطة بالمصروفات الشهرية عند تسجيلها.', en: 'Included in monthly expenses when recorded.' }, value: money(data.charityTotal, isAr, currency), tone: '#D8AE63' },
    { title: { ar: 'عدد التصنيفات', en: 'Categories' }, body: { ar: 'تصنيفات نشطة من آخر السجلات.', en: 'Active categories from recent records.' }, value: String(data.expenses.length), tone: '#3B82F6' },
  ];
  if (kind === 'income') return [
    { title: { ar: 'إجمالي الدخل', en: 'Total income' }, body: { ar: 'راتب، دخل جانبي، وأعمال.', en: 'Salary, side income, and business.' }, value: common.income, tone: '#22C55E' },
    { title: { ar: 'مصادر الدخل', en: 'Income sources' }, body: { ar: 'مصادر شهرية مسجلة أو بيانات نموذجية.', en: 'Recorded monthly sources or safe fallback data.' }, value: String(data.income.length), tone: '#D8AE63' },
    { title: { ar: 'الصافي المتوقع', en: 'Expected net' }, body: { ar: 'الدخل ناقص المصروفات الحالية.', en: 'Income minus current expenses.' }, value: common.balance, tone: '#111111' },
  ];
  if (kind === 'invest') return [
    { title: { ar: 'قيمة المحفظة', en: 'Portfolio value' }, body: { ar: 'إجمالي الاستثمارات المسجلة.', en: 'Total recorded investments.' }, value: common.investments, tone: '#3B82F6' },
    { title: { ar: 'المساهمة الشهرية', en: 'Monthly contribution' }, body: { ar: 'تقدير 15% من الدخل الحالي.', en: 'Estimated as 15% of current income.' }, value: money(data.totalIncome * 0.15, isAr, currency), tone: '#22C55E' },
    { title: { ar: 'مستوى المخاطر', en: 'Risk level' }, body: { ar: 'متوازن بناءً على التوزيع الحالي.', en: 'Balanced based on current allocation.' }, value: isAr ? 'متوسط' : 'Medium', tone: '#D8AE63' },
  ];
  if (kind === 'savings') return [
    { title: { ar: 'إجمالي المدخرات', en: 'Total savings' }, body: { ar: 'مجموع عمليات الادخار المسجلة.', en: 'Total recorded savings entries.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'عدد السجلات', en: 'Entries count' }, body: { ar: 'سجلات الادخار النشطة.', en: 'Active saving records.' }, value: String(data.savings.length), tone: '#D8AE63' },
    { title: { ar: 'الصافي بعد الادخار', en: 'Net after savings' }, body: { ar: 'الدخل ناقص المصروفات والمدخرات.', en: 'Income minus expenses and savings.' }, value: money(data.balance - data.totalSavings, isAr, currency), tone: '#3B82F6' },
  ];
  if (kind === 'goals') return [
    { title: { ar: 'الأهداف النشطة', en: 'Active goals' }, body: { ar: 'أهداف مالية قيد المتابعة.', en: 'Financial goals being tracked.' }, value: String(data.goals.length), tone: '#D8AE63' },
    { title: { ar: 'إجمالي المستهدف', en: 'Target total' }, body: { ar: 'مجموع مبالغ الأهداف.', en: 'Combined target amounts.' }, value: money(data.goals.reduce((total, goal) => total + goal.target_amount, 0), isAr, currency), tone: '#3B82F6' },
    { title: { ar: 'تقدم حالي', en: 'Current progress' }, body: { ar: 'مجموع المبالغ الحالية داخل الأهداف.', en: 'Combined current goal progress.' }, value: money(data.goals.reduce((total, goal) => total + goal.current_amount, 0), isAr, currency), tone: '#22C55E' },
  ];
  if (kind === 'reports') return [
    { title: { ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses' }, body: { ar: 'مؤشر التوازن المالي الحالي.', en: 'Current financial balance signal.' }, value: common.balance, tone: '#111111' },
    { title: { ar: 'تقرير الادخار', en: 'Savings report' }, body: { ar: 'رصيد الادخار المسجل.', en: 'Recorded savings balance.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'تقرير الاستثمار', en: 'Investment report' }, body: { ar: 'إجمالي قيمة الاستثمارات.', en: 'Total investment value.' }, value: common.investments, tone: '#3B82F6' },
  ];
  return [
    { title: { ar: 'الصحة المالية', en: 'Financial health' }, body: { ar: 'تقدير سريع من الدخل والمصروفات.', en: 'Quick estimate from income and expenses.' }, value: `${progress(data.balance, data.totalIncome)}%`, tone: '#06B6D4' },
    { title: { ar: 'فرصة ادخار', en: 'Savings opportunity' }, body: { ar: 'الفرق المتاح بعد المصروفات.', en: 'Potential surplus after expenses.' }, value: money(data.balance, isAr, currency), tone: '#22C55E' },
    { title: { ar: 'تنبيه ذكي', en: 'Smart alert' }, body: { ar: 'الصفحة جاهزة للرؤى والإجراءات.', en: 'Page is ready for insights and actions.' }, value: isAr ? 'نشط' : 'Active', tone: '#D8AE63' },
  ];
}

function buildDataShape() {
  return {
    income: [] as IncomeSource[],
    expenses: [] as MoneyItem[],
    savings: [] as MoneyItem[],
    investments: [] as MoneyItem[],
    goals: [] as GoalItem[],
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalInvestments: 0,
    charityTotal: 0,
    balance: 0,
  };
}

function buildRows(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean, currency = 'KWD'): EntryRow[] {
  if (kind === 'goals') {
    return data.goals.map(goal => {
      const done = progress(goal.current_amount, goal.target_amount);
      return {
        id: goal.id,
        title: goal.name,
        subtitle: isAr ? `تقدم ${done}%، المتبقي ${money(Math.max(goal.target_amount - goal.current_amount, 0), isAr, currency)}` : `${done}% complete, remaining ${money(Math.max(goal.target_amount - goal.current_amount, 0), isAr, currency)}`,
        value: money(goal.target_amount, isAr, currency),
      };
    });
  }

  if (kind === 'reports') {
    return [
      { id: 'income-vs-expenses', title: isAr ? 'الدخل مقابل المصروفات' : 'Income vs expenses', subtitle: isAr ? 'ملخص التدفق النقدي الحالي' : 'Current cash flow summary', value: money(data.balance, isAr, currency) },
      { id: 'savings-report', title: isAr ? 'تقرير الادخار' : 'Savings report', subtitle: isAr ? 'رصيد الادخار المسجل' : 'Recorded savings balance', value: money(data.totalSavings, isAr, currency) },
      { id: 'investment-report', title: isAr ? 'تقرير الاستثمار' : 'Investment report', subtitle: isAr ? 'قيمة المحفظة الحالية' : 'Current portfolio value', value: money(data.totalInvestments, isAr, currency) },
    ];
  }

  if (kind === 'ai') {
    return [
      { id: 'reduce-expenses', title: isAr ? 'خفض المصروفات' : 'Reduce expenses', subtitle: isAr ? 'راجع أعلى 3 بنود صرف هذا الشهر.' : 'Review the top 3 spending items this month.', value: money(data.totalExpenses, isAr, currency) },
      { id: 'increase-savings', title: isAr ? 'زيادة الادخار' : 'Increase savings', subtitle: isAr ? 'حوّل جزءًا من الصافي إلى هدف واضح.' : 'Move part of your surplus into a clear goal.', value: money(Math.max(data.balance * 0.2, 0), isAr, currency) },
      { id: 'recurring-investing', title: isAr ? 'استثمار منتظم' : 'Recurring investing', subtitle: isAr ? 'مساهمة شهرية صغيرة تحافظ على الاستمرارية.' : 'A small monthly contribution keeps momentum.', value: money(data.totalIncome * 0.1, isAr, currency) },
    ];
  }

  const source = kind === 'income' ? data.income : kind === 'invest' ? data.investments : kind === 'savings' ? data.savings : data.expenses;
  return source.map(item => ({
    id: item.id,
    title: item.name.replace(/^خيرية:\d{4}-\d{2}:/, ''),
    subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : (isAr ? 'سجل مالي' : 'Financial record'),
    value: money(item.amount, isAr, currency),
    item,
  }));
}

function buildGoalAnalysis(goal: GoalItem, data: ReturnType<typeof buildDataShape>, isAr: boolean, currency = 'KWD', t: TranslateFn) {
  const remainingAmount = Math.max(goal.target_amount - goal.current_amount, 0);
  const monthsRemaining = monthsBetween(new Date(), goal.deadline);
  const missing = [
    goal.target_amount <= 0 ? t('goal_missing_target') : '',
    goal.current_amount < 0 ? t('goal_missing_current') : '',
    goal.monthly_contribution <= 0 ? t('goal_missing_contribution') : '',
    monthsRemaining <= 0 ? t('goal_missing_deadline') : '',
  ].filter(Boolean);
  const requiredMonthlySaving = monthsRemaining > 0
    ? remainingAmount / monthsRemaining
    : goal.monthly_contribution > 0
      ? goal.monthly_contribution
      : 0;
  const contribution = goal.monthly_contribution;
  const adjustment = Math.max(requiredMonthlySaving - contribution, 0);
  const expenseRatio = data.totalIncome > 0 ? data.totalExpenses / data.totalIncome : 0;
  const availableSurplus = Math.max(data.totalIncome - data.totalExpenses - data.totalSavings, 0);
  const estimatedMonths = contribution > 0 ? Math.ceil(remainingAmount / contribution) : 0;
  const estimatedCompletion = monthsRemaining > 0
    ? `${monthsRemaining} ${t('goal_months')}`
    : estimatedMonths > 0
      ? `${estimatedMonths} ${t('goal_months')}`
      : t('goal_unknown_completion');
  const ratio = requiredMonthlySaving > 0 ? contribution / requiredMonthlySaving : 1;
  const riskClass = contribution <= 0 || ratio < 0.55 ? 'high' : ratio < 0.95 ? 'medium' : 'low';
  const riskLabel = riskClass === 'low' ? t('goal_risk_low') : riskClass === 'medium' ? t('goal_risk_medium') : t('goal_risk_high');
  const statusLabel = riskClass === 'low' ? t('goal_status_on_track') : riskClass === 'medium' ? t('goal_status_needs_adjustment') : t('goal_status_high_risk');
  const suggestedExpenseReduction = data.totalExpenses > 0
    ? Math.min(15, Math.max(5, Math.ceil((adjustment / data.totalExpenses) * 100)))
    : 0;
  const suggestedSavingIncrease = availableSurplus > 0 ? Math.min(adjustment, availableSurplus) : adjustment;

  const summary = contribution <= 0
    ? t('goal_ai_no_contribution')
    : riskClass === 'low'
      ? t('goal_ai_on_track')
      : riskClass === 'medium'
        ? t('goal_ai_needs_adjustment')
        : t('goal_ai_high_risk');

  const steps = [
    contribution <= 0
      ? t('goal_step_add_contribution')
      : t('goal_step_raise_contribution').replace('{amount}', money(Math.max(requiredMonthlySaving, contribution), isAr, goal.currency || currency)),
    suggestedExpenseReduction > 0
      ? t('goal_step_reduce_expenses').replace('{percent}', String(suggestedExpenseReduction))
      : t('goal_step_review_spending'),
    t('goal_step_automate'),
    suggestedSavingIncrease > 0
      ? t('goal_step_increase_saving').replace('{amount}', money(suggestedSavingIncrease, isAr, goal.currency || currency))
      : t('goal_step_monthly_review'),
  ];

  return {
    remainingAmount,
    requiredMonthlySaving,
    estimatedCompletion,
    adjustment,
    riskClass,
    riskLabel,
    statusLabel,
    missing,
    summary: summary
      .replace('{remaining}', money(remainingAmount, isAr, goal.currency || currency))
      .replace('{required}', money(requiredMonthlySaving, isAr, goal.currency || currency))
      .replace('{adjustment}', money(adjustment, isAr, goal.currency || currency))
      .replace('{expenseRatio}', String(Math.round(expenseRatio * 100))),
    steps,
  };
}

function buildInsights(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean, currency = 'KWD') {
  const ratio = data.totalIncome ? Math.round((data.totalExpenses / data.totalIncome) * 100) : 0;
  const base = [
    {
      title: isAr ? 'نسبة الصرف' : 'Spend ratio',
      body: isAr ? `مصروفاتك تساوي ${ratio}% من الدخل.` : `Expenses equal ${ratio}% of income.`,
    },
    {
      title: isAr ? 'مساحة الصافي' : 'Net runway',
      body: isAr ? `الصافي الحالي ${money(data.balance, isAr, currency)}.` : `Current net balance is ${money(data.balance, isAr, currency)}.`,
    },
  ];
  return [
    ...base,
    {
      title: isAr ? 'خطوة مقترحة' : 'Suggested action',
      body: suggestion(kind, isAr),
    },
  ];
}

function suggestion(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ابدأ بأكبر تصنيف مصروفات وخفّضه 5%.', en: 'Start with your largest expense category and reduce it by 5%.' },
    income: { ar: 'قسّم الدخل إلى راتب، دخل جانبي، وأعمال لقراءة أوضح.', en: 'Split income into salary, side income, and business for cleaner tracking.' },
    invest: { ar: 'حافظ على مساهمة شهرية ثابتة قبل زيادة المخاطر.', en: 'Keep a steady monthly contribution before increasing risk.' },
    savings: { ar: 'حدد هدفًا شهريًا للادخار وراقب تقدمك في كل دورة.', en: 'Set a monthly savings target and track your progress each cycle.' },
    goals: { ar: 'اربط كل هدف بمبلغ شهري صغير قابل للاستمرار.', en: 'Attach every goal to a small sustainable monthly amount.' },
    reports: { ar: 'اطبع التقرير قبل نهاية الشهر لمراجعة قراراتك.', en: 'Print the report before month-end to review decisions.' },
    ai: { ar: 'اسأل المساعد عن أفضل قرار واحد لهذا الأسبوع.', en: 'Ask the assistant for one best action this week.' },
  };
  return pick(text[kind], isAr);
}

function sectionTitle(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'آخر المصروفات والتصنيفات', en: 'Recent expenses and categories' },
    income: { ar: 'مصادر الدخل والتوزيع', en: 'Income sources and distribution' },
    invest: { ar: 'بطاقات المحفظة وفئات الاستثمار', en: 'Portfolio cards and investment categories' },
    savings: { ar: 'سجلات الادخار والمبالغ', en: 'Savings records and amounts' },
    goals: { ar: 'بطاقات تقدم الأهداف', en: 'Goal progress cards' },
    reports: { ar: 'ملخص التقارير المالية', en: 'Financial report summary' },
    ai: { ar: 'بطاقات العمل الذكية', en: 'Smart action cards' },
  };
  return pick(text[kind], isAr);
}

function summaryTitle(kind: PageKind, isAr: boolean) {
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ملخص المصروفات الشهري', en: 'Monthly expense summary' },
    income: { ar: 'ملخص توزيع الدخل', en: 'Income distribution summary' },
    invest: { ar: 'ملخص المساهمة الاستثمارية', en: 'Investment contribution summary' },
    savings: { ar: 'ملخص المدخرات المسجلة', en: 'Recorded savings summary' },
    goals: { ar: 'ملخص تقدم الادخار', en: 'Savings progress summary' },
    reports: { ar: 'جاهز للتصدير والطباعة', en: 'Ready to export and print' },
    ai: { ar: 'واجهة المساعد', en: 'Assistant interface' },
  };
  return pick(text[kind], isAr);
}

function summaryText(kind: PageKind, data: ReturnType<typeof buildDataShape>, isAr: boolean, currency = 'KWD') {
  const values: Record<PageKind, LangText> = {
    expenses: { ar: `إجمالي المصروفات الحالي ${money(data.totalExpenses, isAr, currency)} مع ${data.expenses.length} سجل.`, en: `Current expenses total ${money(data.totalExpenses, isAr, currency)} across ${data.expenses.length} records.` },
    income: { ar: `الدخل الشهري الحالي ${money(data.totalIncome, isAr, currency)} موزع على ${data.income.length} مصادر.`, en: `Monthly income is ${money(data.totalIncome, isAr, currency)} across ${data.income.length} sources.` },
    invest: { ar: `قيمة المحفظة ${money(data.totalInvestments, isAr, currency)} مع مساهمة مقترحة ${money(data.totalIncome * 0.15, isAr, currency)}.`, en: `Portfolio value is ${money(data.totalInvestments, isAr, currency)} with suggested contribution ${money(data.totalIncome * 0.15, isAr, currency)}.` },
    savings: { ar: `إجمالي المدخرات ${money(data.totalSavings, isAr, currency)} موزع على ${data.savings.length} سجلات.`, en: `Total savings are ${money(data.totalSavings, isAr, currency)} across ${data.savings.length} entries.` },
    goals: { ar: `مدخراتك الحالية ${money(data.totalSavings, isAr, currency)} تقيس تقدم ${data.goals.length} أهداف.`, en: `Current savings of ${money(data.totalSavings, isAr, currency)} measure progress across ${data.goals.length} goals.` },
    reports: { ar: 'استخدم أزرار الطباعة والتصدير لحفظ نسخة من ملخصك المالي.', en: 'Use print and export actions to save a copy of your financial summary.' },
    ai: { ar: 'اكتب سؤالك للحصول على مساعدة مالية موجهة حسب بياناتك.', en: 'Type a prompt to get financial guidance shaped by your data.' },
  };
  return pick(values[kind], isAr);
}

function buildPrimaryActions(kind: PageKind, isAr: boolean, openEntry: () => void, openGoal: () => void, focusAi: () => void) {
  if (kind === 'reports') {
    return [
      { label: isAr ? 'طباعة' : 'Print', icon: Printer, variant: 'print' as const, onClick: () => window.print() },
      { label: isAr ? 'تصدير' : 'Export', icon: Download, variant: 'default' as const, onClick: () => {
        const html = document.querySelector('.sfm-main')?.innerHTML || document.body.innerHTML;
        const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>SFM Report</title></head><body>${html}</body></html>`], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sfm-report.html';
        a.click();
        URL.revokeObjectURL(url);
      } },
    ];
  }
  if (kind === 'ai') {
    return [
      { label: isAr ? 'اسأل الآن' : 'Ask now', icon: Send, variant: 'default' as const, onClick: focusAi },
    ];
  }

  if (editableKind(kind)) {
    const labels: Record<EntryKind, LangText> = {
      expenses: { ar: 'إضافة مصروف', en: 'Add expense' },
      income: { ar: 'إضافة دخل', en: 'Add income' },
      invest: { ar: 'إضافة استثمار', en: 'Add investment' },
      savings: { ar: 'إضافة مدخرات', en: 'Add saving' },
    };
    return [
      { label: pick(labels[kind], isAr), icon: Plus, variant: 'default' as const, onClick: openEntry },
    ];
  }

  const action: { label: LangText; onClick: () => void } = {
    label: { ar: 'إضافة هدف', en: 'Add goal' },
    onClick: openGoal,
  };
  return [
    { label: pick(action.label, isAr), icon: Plus, variant: 'default' as const, onClick: action.onClick },
  ];
}

const baseStyles = `
  .sfm-shell{min-height:100vh;background:#F7F3EA;color:#111;display:flex;font-family:Tajawal,Arial,sans-serif}
  .sfm-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.2);border-top-color:#D8AE63;animation:spin 1s linear infinite;margin:auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sfm-sidebar{width:250px;background:#111;border-left:1px solid rgba(216,174,99,.22);padding:22px 16px;position:sticky;top:0;height:100vh;color:#FFFDFC;flex-shrink:0}
  [dir="ltr"] .sfm-sidebar{border-left:0;border-right:1px solid rgba(216,174,99,.22)}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer}
  .brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#D8AE63,#9A6C3C);display:grid;place-items:center;color:#111;font-weight:900}
  .brand strong{display:block;font-size:15px}.brand span{display:block;font-size:11px;color:rgba(255,255,255,.48);margin-top:2px}
  nav{display:grid;gap:7px}nav button,.mobile-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:rgba(255,255,255,.62);padding:11px 12px;border-radius:12px;cursor:pointer;font:700 13px Tajawal,Arial,sans-serif;text-align:start}
  nav button:hover,nav button.active{background:rgba(216,174,99,.13);color:#D8AE63}
  .sfm-main{flex:1;padding:22px;max-width:1280px;margin:0 auto;width:100%;margin-inline-start:230px}
  .sfm-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .guest-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;border:1px solid rgba(216,174,99,.24);background:rgba(216,174,99,.12);color:#9A6C3C;font-size:12px;font-weight:900;white-space:nowrap}
  .title-wrap{display:flex;align-items:center;gap:13px}.title-wrap p{font-size:11px;color:#9A6C3C;font-weight:700;margin:0 0 3px}.title-wrap h1{font-size:24px;margin:0;font-weight:900}
  .title-icon{width:44px;height:44px;border-radius:14px;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent);display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 22%,transparent)}
  .icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer}.menu-btn{display:none}
  .hero{background:linear-gradient(135deg,#111 0%,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 18px 45px rgba(45,26,10,.16);margin-bottom:18px}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:800;margin-bottom:12px}.hero h2{font-size:34px;line-height:1.05;margin:0 0 9px}.hero p{max-width:640px;margin:0;color:rgba(255,255,255,.68);line-height:1.8;font-size:14px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{height:42px;border-radius:13px;border:0;padding:0 15px;font:800 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}.primary-btn{background:#D8AE63;color:#111}.ghost-btn{background:rgba(255,255,255,.08);color:#FFFDFC;border:1px solid rgba(255,255,255,.12)}
  .notice{padding:12px 15px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:14px;margin-bottom:14px;font-size:13px;font-weight:700}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.kpi-card,.panel{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;box-shadow:0 4px 22px rgba(90,67,51,.06)}
  .kpi-card{padding:18px;position:relative;overflow:hidden}.kpi-card>span{position:absolute;inset-inline-start:0;top:0;width:4px;height:100%}.kpi-card p{font-size:12px;color:#9A6C3C;font-weight:800;margin:0 0 7px}.kpi-card strong{font-size:23px;font-weight:900;display:block}.kpi-card small{display:block;margin-top:8px;color:#7C6A5D;font-size:12px;line-height:1.6}
  .content-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:18px}.panel{padding:20px}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head p{margin:0 0 4px;font-size:11px;color:#9A6C3C;font-weight:800}.panel-head h3{margin:0;font-size:18px}.loading-pill{font-size:11px;font-weight:800;color:#D8AE63;background:rgba(216,174,99,.11);border-radius:999px;padding:5px 10px}
  .row-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}.row-search{flex:1;min-width:160px;height:38px;border:1.5px solid rgba(216,174,99,.22);border-radius:12px;padding:0 12px;background:#F7F3EA;font:700 13px Tajawal,Arial,sans-serif;color:#111;outline:none}.row-search:focus{border-color:#D8AE63;background:#FFFDFC}.row-select{height:38px;border:1.5px solid rgba(216,174,99,.22);border-radius:12px;padding:0 10px;background:#F7F3EA;font:700 13px Tajawal,Arial,sans-serif;color:#111;outline:none;cursor:pointer}.row-select:focus{border-color:#D8AE63}.row-count{font-size:12px;font-weight:800;color:#9A6C3C;margin-bottom:10px;padding:6px 0;border-bottom:1px solid rgba(216,174,99,.1)}.load-more-btn{width:100%;margin-top:12px;padding:12px;border-radius:14px;border:1.5px dashed rgba(216,174,99,.3);background:transparent;color:#9A6C3C;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer;transition:all .2s}.load-more-btn:hover{background:rgba(216,174,99,.08);border-color:#D8AE63;color:#7a5a2a}
  .row-list{display:grid;gap:10px}.empty-state{padding:22px;border:1px dashed rgba(216,174,99,.25);border-radius:16px;color:#9A6C3C;text-align:center;font-size:13px;font-weight:800}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(216,174,99,.08)}.data-row:last-child{border-bottom:0}.data-row strong{display:block;font-size:14px}.data-row span{display:block;color:#8B7A6D;font-size:12px;margin-top:4px}.data-row b{font-size:14px;color:#D8AE63;white-space:nowrap}.row-actions-wrap{display:flex;align-items:center;gap:10px}.row-actions{display:flex;align-items:center;gap:6px}.row-action{width:34px;height:34px;border-radius:11px;border:1px solid rgba(216,174,99,.16);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer;transition:all .18s ease}.row-action:hover{border-color:rgba(216,174,99,.45);color:#D8AE63;background:rgba(216,174,99,.08);transform:translateY(-1px)}
  .goal-card{background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:22px;padding:18px;box-shadow:0 8px 28px rgba(90,67,51,.07);display:grid;gap:15px;transition:all .22s ease}.goal-card:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(90,67,51,.11)}.goal-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.goal-title-wrap{display:flex;align-items:center;gap:12px}.goal-icon{width:42px;height:42px;border-radius:14px;background:rgba(216,174,99,.13);display:grid;place-items:center;font-size:20px}.goal-title-wrap strong{display:block;font-size:16px;font-weight:900;color:#111}.goal-title-wrap span{display:block;margin-top:4px;color:#9A6C3C;font-size:12px;font-weight:800}.goal-edit-btn{height:38px;border:1px solid rgba(216,174,99,.28);border-radius:13px;background:linear-gradient(135deg,rgba(216,174,99,.16),rgba(255,253,252,.95));color:#5B4332;padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer;box-shadow:0 6px 18px rgba(216,174,99,.12);transition:all .2s ease}.goal-edit-btn:hover{background:#D8AE63;color:#111;transform:translateY(-1px)}.goal-progress-row{display:flex;align-items:center;gap:10px}.goal-progress-track{height:10px;border-radius:999px;background:#F0E8DA;overflow:hidden;flex:1}.goal-progress-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#D8AE63,#9A6C3C)}.goal-progress-row b{color:#9A6C3C;font-size:13px}.goal-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.goal-meta-grid div,.goal-ai-metrics div{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:14px;padding:10px}.goal-meta-grid span,.goal-ai-metrics span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:5px}.goal-meta-grid strong,.goal-ai-metrics b{font-size:13px;color:#111}.goal-ai-card,.goal-modal-preview{border:1px solid rgba(216,174,99,.2);background:linear-gradient(180deg,#FFFDFC,#FFF8EA);border-radius:18px;padding:15px;display:grid;gap:12px}.goal-ai-head{display:flex;align-items:center;gap:9px;color:#5B4332}.goal-ai-head svg{color:#D8AE63}.goal-ai-head strong{font-size:14px;font-weight:900}.risk-pill{margin-inline-start:auto;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.risk-pill.low{background:rgba(34,197,94,.12);color:#15803D}.risk-pill.medium{background:rgba(216,174,99,.16);color:#9A6C3C}.risk-pill.high{background:rgba(239,68,68,.1);color:#B91C1C}.goal-ai-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.goal-ai-card p,.goal-modal-preview p{margin:0;color:#5B4332;font-size:13px;line-height:1.8;font-weight:700}.goal-ai-plan{background:rgba(255,255,255,.72);border-radius:14px;padding:12px}.goal-ai-plan strong{font-size:13px;color:#111}.goal-ai-plan ol{margin:8px 18px 0;padding:0;color:#5B4332;font-size:12.5px;line-height:1.8;font-weight:700}.goal-modal{width:min(860px,100%);max-height:min(88vh,980px);overflow:auto}.goal-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-form-grid label:first-child,.goal-form-grid .entry-actions,.goal-notes-field,.goal-ai-toggle,.goal-modal-preview{grid-column:1/-1}.goal-form-grid select,.goal-form-grid textarea{border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:0 13px;color:#111;font:800 14px Tajawal,Arial,sans-serif;outline:0}.goal-form-grid select{height:50px}.goal-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.goal-form-grid select:focus,.goal-form-grid textarea:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.12);background:#FFFDFC}.goal-ai-toggle{display:flex!important;align-items:center;justify-content:space-between;border:1px solid rgba(216,174,99,.14);background:#FFF8EA;border-radius:16px;padding:12px 14px}.switch{width:54px;height:30px;border:0;border-radius:999px;background:#D9CDBB;padding:3px;cursor:pointer;transition:.2s}.switch span{display:block;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:.2s}.switch.active{background:#D8AE63}.switch.active span{transform:translateX(24px)}[dir="rtl"] .switch.active span{transform:translateX(-24px)}.preview-missing{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.12);border-radius:14px;padding:12px;color:#B91C1C}.preview-missing strong{font-size:13px}.preview-missing ul{margin:8px 18px 0;padding:0;font-size:12.5px;line-height:1.8;font-weight:800}.form-error{grid-column:1/-1;border-radius:13px;padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:900}
  .insight-list{display:grid;gap:12px}.insight-list>div{display:flex;gap:10px;padding:12px;border-radius:14px;background:rgba(216,174,99,.07)}.insight-list svg{color:#D8AE63;flex-shrink:0}.insight-list strong{display:block;font-size:13px}.insight-list span{display:block;font-size:12px;color:#7C6A5D;line-height:1.6;margin-top:3px}
  .summary-band,.ai-panel{margin-top:18px;background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;padding:18px 20px;display:flex;align-items:center;gap:14px}.summary-band svg{color:#D8AE63}.summary-band strong,.ai-panel h3{font-size:16px}.summary-band p,.ai-panel p{margin:4px 0 0;color:#7C6A5D;line-height:1.7;font-size:13px}
  .ai-panel{align-items:stretch;justify-content:space-between}.chat-history{display:grid;gap:8px;min-width:min(460px,100%);max-height:190px;overflow:auto;margin-bottom:10px}.chat-history>div{padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.6}.chat-history .user{background:#111;color:#FFFDFC}.chat-history .assistant{background:rgba(216,174,99,.11);color:#5B4332}.chat-box{display:flex;gap:10px;min-width:min(460px,100%)}.chat-box input{height:46px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;padding:0 14px;background:#F7F3EA;min-width:0;flex:1;font:600 14px Tajawal,Arial,sans-serif;color:#111}.chat-box button{width:46px;border-radius:14px;border:0;background:#111;color:#D8AE63;display:grid;place-items:center;cursor:pointer}.chat-box button:disabled{opacity:.55;cursor:wait}
  .mobile-panel{position:fixed;inset:12px;z-index:50;background:#111;border-radius:22px;padding:16px;color:#FFFDFC;box-shadow:0 24px 80px rgba(0,0,0,.35)}.mobile-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .entry-overlay{position:fixed;inset:0;background:rgba(17,17,17,.42);backdrop-filter:blur(8px);z-index:80;display:grid;place-items:center;padding:18px}.entry-modal,.confirm-modal{width:min(480px,100%);background:#FFFDFC;border:1px solid rgba(216,174,99,.2);border-radius:22px;box-shadow:0 26px 80px rgba(45,26,10,.26);padding:20px}.entry-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.entry-modal-head p{margin:0 0 4px;color:#9A6C3C;font-size:12px;font-weight:900}.entry-modal-head h3,.confirm-modal h3{margin:0;font-size:21px;font-weight:900}.entry-form{display:grid;gap:14px}.entry-form label{display:grid;gap:7px;font-weight:900;color:#5B4332;font-size:13px}.entry-form input{height:50px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:0 14px;color:#111;font:800 14px Tajawal,Arial,sans-serif;outline:0}.entry-form input:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.12);background:#FFFDFC}.entry-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.primary-form-btn,.ghost-form-btn,.danger-form-btn{height:44px;border-radius:13px;padding:0 18px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.primary-form-btn{border:0;background:linear-gradient(135deg,#111,#2D1A0A,#D8AE63);color:#fff}.ghost-form-btn{border:1px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332}.danger-form-btn{border:0;background:#C2410C;color:#fff}.primary-form-btn:disabled,.ghost-form-btn:disabled,.danger-form-btn:disabled{opacity:.58;cursor:wait}.confirm-modal{text-align:center}.confirm-icon{width:58px;height:58px;border-radius:18px;background:rgba(194,65,12,.09);color:#C2410C;display:grid;place-items:center;margin:0 auto 12px}.confirm-modal p{margin:8px 0 4px;color:#5B4332;font-weight:800}.confirm-modal small{display:block;color:#9A6C3C;line-height:1.6;margin-bottom:14px}.confirm-modal .entry-actions{justify-content:center}.entry-toast{position:fixed;z-index:90;inset-inline-end:22px;bottom:22px;max-width:min(360px,calc(100vw - 32px));padding:13px 16px;border-radius:15px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(45,26,10,.18);animation:slideUp .22s ease}.entry-toast.ok{background:#ECFDF5;color:#047857;border:1px solid rgba(34,197,94,.2)}.entry-toast.err{background:#FEF2F2;color:#B91C1C;border:1px solid rgba(239,68,68,.2)}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .finance-header-lang{display:none}
  @media(max-width:1024px){.finance-header-lang{display:block}}
  @media(max-width:920px){.sfm-sidebar{display:none}.menu-btn{display:grid}.sfm-main{padding:16px;margin-inline-start:0}.hero{display:block}.hero-actions{margin-top:18px}.content-grid{grid-template-columns:1fr}.ai-panel{display:grid}.chat-box{min-width:0}}
  @media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.sfm-header{height:auto}.title-wrap h1{font-size:20px}.hero{padding:22px}.hero h2{font-size:27px}.data-row{align-items:flex-start;flex-direction:column}.row-actions-wrap{width:100%;justify-content:space-between}.summary-band{align-items:flex-start}.primary-btn,.ghost-btn{width:100%;justify-content:center}.entry-actions{display:grid;grid-template-columns:1fr 1fr}.primary-form-btn,.ghost-form-btn,.danger-form-btn{width:100%}.goal-card-head{display:grid}.goal-edit-btn{width:100%;justify-content:center}.goal-meta-grid,.goal-ai-metrics,.goal-form-grid{grid-template-columns:1fr}.goal-form-grid label:first-child{grid-column:auto}}
`;
