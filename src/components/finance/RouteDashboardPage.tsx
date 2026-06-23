'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  Bot,
  Bell as BellIcon,
  Calendar,
  CheckCircle2,
  ChartPie,
  CreditCard,
  Download,
  Eye,
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
  Receipt,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Target,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageTabs } from '@/components/layout/PageTabs';
import { MoneyAmount } from '@/components/finance/MoneyAmount';
import { useCurrency } from '@/lib/useCurrency';
import { approximateFxRate, convertCurrencyAmount, fxKey, normalizeMoneyCurrencyCode } from '@/lib/currencyConversion';
import { formatCurrency } from '@/lib/format';
import { getCurrency } from '@/lib/currencies';
import { CurrencySelect } from '@/components/CurrencySelect';
import { calculateGoalProgress, parseMoney } from '@/lib/goalProgress';
import { parseMoneyValue } from '@/lib/money';
import { isProjectLinkedExpenseRow, personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { trackEvent } from '@/lib/analytics';

// --- Types and helpers extracted to lib ---
import type {
  PageKind, ExpensePageTab, ExpensePeriodPreset, ExpensePeriodState, ExpensePeriodRange,
  LangText, TranslateFn, MoneyItem, IncomeSource, EntryKind, EntryFormState, EntryRow,
  GoalItem, GoalRow, GoalFormState, QueryResult, ChatMessage, DataErrorKind, DataLoadError,
  DataResult, ReceiptItem, ReceiptAmountCandidate, AiExtractedData, ReceiptScanDebug,
  ReceiptScanApiResult, ReceiptScanApiPayload, SmartExpense, ExpenseFormState,
  ExpenseModalMode, PendingReceiptExpense, Snapshot, SectionCard, DebtSnapshotItem,
} from '@/lib/routeDashboard/types';
import {
  emptySnapshot, todayInputDate, emptyEntryForm, emptyExpenseForm, emptyGoalForm,
  entryTitleKeys, deleteConfirmKeys, navItems, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  SAVING_TYPES, SAVING_METHODS, RECEIPT_SCANNING_REQUIRES_PAID_PLAN,
  EXPENSE_OPTIONAL_SAVE_COLUMNS, EXPENSE_PAGE_SIZE, EXPENSE_PERIOD_PRESETS, savingModalText, expenseUi, pageMeta,
  normalizeSavingsOption, normalizeSavingsDate, normalizeCurrencyCode,
  pick, optionLabelById, expenseText, receiptScanningPlanGateEnabled,
  categoryLabel, paymentLabel, projectExpenseLabel, normalizeReceiptNumber,
  extractedReceiptAmount, validReceiptCandidates, receiptCandidateAmount,
  receiptCandidateLabel, receiptProviderLabel, receiptConfidenceLabel,
  normalizeReceiptScanCode, receiptScanSpecificErrorText, receiptScanErrorText,
  isReceiptProviderUnavailable, receiptProviderDevDetail, receiptProviderDebugDetail,
  selectedReceiptsLabel, inferClientReceiptMimeType, normalizeReceiptDate,
  normalizeReceiptCategory, normalizeReceiptPayment, receiptItemsNotes,
  receiptFallbackName, textWithCount, pendingReceiptFromResult, receiptConfidenceMessage,
  dataErrorCopy, money, sum, progress, editableKind, guestKey, readGuestItems,
  writeGuestItems, parseGoalNotes, addMonths, formatDateInput, localDateFromInput,
  startOfLocalMonth, addLocalMonths, makeExpenseRange, defaultExpensePeriodState,
  parseExpenseMonthParam, expensePeriodFromSearch, readExpensePeriodFromLocation,
  writeExpensePeriodToLocation, expensePeriodRange, previousExpensePeriodRange,
  expenseDisplayDate, recurringFrequency, isTruthyFlag,
  isRecurringExpense, isMonthlyRecurringExpense, isExpenseActiveDuringRange,
  isExpenseInPeriod, expensePeriodDayCount, formatExpenseMonthYear,
  expensePeriodOptionLabel, expensePeriodLabel, expensePeriodBadge,
  expenseFilterTypeLabel, expenseMatchesType, monthsBetween, goalFromRow,
  entryTitleKey, deleteConfirmKey, classifyDataError, missingColumnFromError,
  isSchemaColumnError, logDataLoadError, safeQuery,
} from '@/lib/routeDashboard/helpers';

import { buildCards, buildDataShape, buildRows, buildGoalAnalysis, buildInsights, suggestion, sectionTitle, summaryTitle, summaryText, buildPrimaryActions, baseStyles, expenseSmartStyles } from './_helpers';

function smartExpenseEnhanced(item: SmartExpense) {
  return item.enhanced && typeof item.enhanced === 'object' ? item.enhanced : {};
}

function looseExpenseValue(item: SmartExpense, key: string) {
  const loose = item as SmartExpense & Record<string, unknown>;
  return loose[key];
}

function isMonthlySubscriptionExpense(item: SmartExpense) {
  const category = String(item.category || '').trim().toLowerCase();
  const source = String(looseExpenseValue(item, 'source') || '').trim().toLowerCase();
  const enhanced = smartExpenseEnhanced(item);
  const enhancedSource = String(enhanced.source || '').trim().toLowerCase();
  const createdFrom = String(enhanced.created_from || '').trim().toLowerCase();
  return category === 'subscriptions' ||
    source === 'subscription' ||
    enhancedSource === 'subscription' ||
    createdFrom === 'monthly_subscriptions_page';
}

function isDebtInstallmentExpense(item: SmartExpense) {
  const category = String(item.category || '').trim().toLowerCase();
  const source = String(looseExpenseValue(item, 'source') || '').trim().toLowerCase();
  const enhanced = smartExpenseEnhanced(item);
  const enhancedSource = String(enhanced.source || '').trim().toLowerCase();
  const hasDebtId = Boolean(looseExpenseValue(item, 'debt_id') || enhanced.debt_id);
  return ['debt', 'debts', 'loan', 'loans'].includes(category) ||
    source === 'debt' ||
    enhancedSource === 'debt' ||
    hasDebtId;
}

function normalizedExpenseCategory(item: SmartExpense) {
  return isDebtInstallmentExpense(item) ? 'loans' : (item.category || 'other');
}

function debtExpenseDebtId(item: SmartExpense) {
  const enhanced = smartExpenseEnhanced(item);
  const raw = looseExpenseValue(item, 'debt_id') ?? enhanced.debt_id;
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function expenseMonthKey(item: SmartExpense) {
  const date = localDateFromInput(item.date || item.created_at);
  return date ? monthKeyFromDate(date) : '';
}

function isScheduledDebtDisplayExpense(item: SmartExpense) {
  const enhanced = smartExpenseEnhanced(item);
  return enhanced.source === 'debt' && enhanced.virtual === true && enhanced.scheduled === true;
}

function clampDebtPaymentDay(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(parsed)));
}

function dateWithPaymentDay(year: number, monthIndex: number, paymentDay: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(paymentDay, lastDay));
}

function countDebtInstallmentsInRange(debt: DebtSnapshotItem, range: ExpensePeriodRange | null) {
  if (debt.auto_add_to_expenses === false || debt.auto_add_to_expenses === 'false') return 0;

  const status = String(debt.status || 'active').trim().toLowerCase();
  const remaining = parseMoney(debt.calculated_remaining_amount ?? debt.remaining_amount);
  const monthlyPayment = parseMoney(debt.monthly_payment);
  if (status === 'paid' || remaining <= 0 || monthlyPayment <= 0) return 0;

  if (!range) return 1;

  const firstPaymentDate = localDateFromInput(debt.first_payment_date || debt.start_date);
  if (!firstPaymentDate) return Math.max(1, range.months);

  const paymentDay = clampDebtPaymentDay(debt.payment_day ?? firstPaymentDate.getDate());
  let cursor = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth(), 1);
  const rangeStartMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  if (cursor < rangeStartMonth) cursor = rangeStartMonth;

  let count = 0;
  while (cursor < range.end) {
    const paymentDate = dateWithPaymentDay(cursor.getFullYear(), cursor.getMonth(), paymentDay);
    if (paymentDate >= firstPaymentDate && paymentDate >= range.start && paymentDate < range.end) {
      count += 1;
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return count;
}

function scheduledDebtInstallmentsForRange(
  debts: DebtSnapshotItem[],
  range: ExpensePeriodRange | null,
  baseCurrency: string,
  fxRates: Record<string, number>,
) {
  return debts.reduce((sumValue, debt) => {
    const installmentCount = countDebtInstallmentsInRange(debt, range);
    if (installmentCount <= 0) return sumValue;
    const debtCurrency = normalizeCurrencyCode(debt.currency, baseCurrency);
    const monthlyPayment = parseMoney(debt.monthly_payment) * installmentCount;
    const converted = convertCurrencyAmount(monthlyPayment, debtCurrency, baseCurrency, fxRates);
    return sumValue + (converted ?? 0);
  }, 0);
}

function debtInstallmentExpenseTotal(expenses: SmartExpense[]) {
  return expenses.filter(isDebtInstallmentExpense).reduce((sumValue, item) => sumValue + item.amount, 0);
}

function fallbackDebtRange(range: ExpensePeriodRange | null): ExpensePeriodRange {
  if (range) return range;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start,
    end,
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    months: 1,
  };
}

function scheduledDebtInstallmentExpensesForRange(
  debts: DebtSnapshotItem[],
  existingExpenses: SmartExpense[],
  range: ExpensePeriodRange | null,
  baseCurrency: string,
  fxRates: Record<string, number>,
  lang: string,
) {
  const effectiveRange = fallbackDebtRange(range);
  const existingDebtMonths = new Set(
    existingExpenses
      .filter(isDebtInstallmentExpense)
      .map(item => {
        const debtId = debtExpenseDebtId(item);
        const monthKey = expenseMonthKey(item);
        return debtId && monthKey ? `${debtId}:${monthKey}` : '';
      })
      .filter(Boolean),
  );
  const rows: SmartExpense[] = [];

  debts.forEach(debt => {
    if (debt.auto_add_to_expenses === false || debt.auto_add_to_expenses === 'false') return;

    const status = String(debt.status || 'active').trim().toLowerCase();
    const remaining = parseMoney(debt.calculated_remaining_amount ?? debt.remaining_amount);
    const monthlyPayment = parseMoney(debt.monthly_payment);
    if (status === 'paid' || remaining <= 0 || monthlyPayment <= 0) return;

    const firstPaymentDate = localDateFromInput(debt.first_payment_date || debt.start_date) ?? effectiveRange.start;
    const paymentDay = clampDebtPaymentDay(debt.payment_day ?? firstPaymentDate.getDate());
    let cursor = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth(), 1);
    const rangeStartMonth = new Date(effectiveRange.start.getFullYear(), effectiveRange.start.getMonth(), 1);
    if (cursor < rangeStartMonth) cursor = rangeStartMonth;

    while (cursor < effectiveRange.end) {
      const paymentDate = dateWithPaymentDay(cursor.getFullYear(), cursor.getMonth(), paymentDay);
      if (paymentDate >= firstPaymentDate && paymentDate >= effectiveRange.start && paymentDate < effectiveRange.end) {
        const paymentMonth = monthKeyFromDate(paymentDate);
        const existingKey = `${debt.id}:${paymentMonth}`;
        if (!existingDebtMonths.has(existingKey)) {
          const debtCurrency = normalizeCurrencyCode(debt.currency, baseCurrency);
          const converted = convertCurrencyAmount(monthlyPayment, debtCurrency, baseCurrency, fxRates);
          const amount = converted ?? monthlyPayment;
          const paymentDateInput = formatDateInput(paymentDate);
          const debtName = String(debt.name || '').trim() || pick({ ar: 'دين', en: 'Debt', fr: 'Dette' }, lang);

          rows.push({
            id: `scheduled-debt-${debt.id}-${paymentMonth}`,
            name: pick({
              ar: `قسط دين شهري: ${debtName}`,
              en: `Monthly debt payment: ${debtName}`,
              fr: `Mensualite de dette : ${debtName}`,
            }, lang),
            amount,
            currency: baseCurrency,
            category: 'loans',
            date: paymentDateInput,
            created_at: paymentDateInput,
            updated_at: paymentDateInput,
            payment_method: 'transfer',
            original_amount: monthlyPayment,
            original_currency: debtCurrency,
            converted_amount: converted ?? null,
            converted_currency: converted === null ? null : baseCurrency,
            fx_rate_to_base: converted !== null && monthlyPayment > 0 ? converted / monthlyPayment : null,
            amount_is_converted: Boolean(converted !== null && debtCurrency !== baseCurrency),
            is_recurring: true,
            frequency: 'monthly',
            enhanced: {
              source: 'debt',
              virtual: true,
              scheduled: true,
              debt_id: debt.id,
              payment_month: paymentMonth,
              display_only: true,
            },
          });
        }
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  });

  return rows;
}

export function RouteDashboardPage({ kind }: { kind: PageKind }) {
  const router = useRouter();
  const { user, session, loading, isGuest } = useAuth();
  const { lang, isAr, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const meta = pageMeta[kind];
  const Icon = meta.icon;

  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [dataLoading, setDataLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(() => emptyEntryForm(currency || 'KWD'));
  const [entryMode, setEntryMode] = useState<'create' | 'edit'>('create');
  const [entryOpen, setEntryOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() => emptyExpenseForm());
  const [expenseModalMode, setExpenseModalMode] = useState<ExpenseModalMode>('manual');
  const [receiptAnalyzing, setReceiptAnalyzing] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptDebug, setReceiptDebug] = useState<ReceiptScanDebug | null>(null);
  const [receiptBatchProgress, setReceiptBatchProgress] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [pendingReceiptExpenses, setPendingReceiptExpenses] = useState<PendingReceiptExpense[]>([]);
  const [receiptDetails, setReceiptDetails] = useState<SmartExpense | null>(null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<(MoneyItem | IncomeSource) | null>(null);
  const [entryMessage, setEntryMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalMode, setGoalMode] = useState<'create' | 'edit'>('edit');
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [goalDeleteTarget, setGoalDeleteTarget] = useState<GoalItem | null>(null);
  const [goalDeleting, setGoalDeleting] = useState(false);
  const [rowSearch, setRowSearch] = useState('');
  const [rowSort, setRowSort] = useState<'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc'>('dateDesc');
  const [rowRange, setRowRange] = useState<'all' | 'month' | 'last3' | 'year'>('all');
  const [expensePeriod, setExpensePeriod] = useState<ExpensePeriodState>(() => readExpensePeriodFromLocation());
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expensePaymentFilter, setExpensePaymentFilter] = useState('all');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(EXPENSE_PAGE_SIZE);
  const [expenseTab, setExpenseTab] = useState<ExpensePageTab>('overview');
  const [expenseFxRates, setExpenseFxRates] = useState<Record<string, number>>({});
  const [debtGenerationChecked, setDebtGenerationChecked] = useState(false);
  const [debtGenerationRefreshKey, setDebtGenerationRefreshKey] = useState(0);
  const selectedExpenseRange = useMemo(() => expensePeriodRange(expensePeriod), [expensePeriod]);
  const previousExpenseRange = useMemo(() => previousExpensePeriodRange(expensePeriod), [expensePeriod]);
  const expenseBaseCurrency = normalizeCurrencyCode(currency, 'KWD');

  useEffect(() => {
    if (kind !== 'expenses') return;
    setExpensePeriod(readExpensePeriodFromLocation());
  }, [kind]);

  useEffect(() => {
    async function generateDueDebtExpenses() {
      if (kind !== 'expenses' || !user || !session?.access_token || debtGenerationChecked) return;

      const paymentDate = new Date().toISOString().slice(0, 10);
      const generationKey = `sfm:expenses:debt-generation:${user.id}:${paymentDate}`;
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(generationKey)) {
        setDebtGenerationChecked(true);
        return;
      }

      setDebtGenerationChecked(true);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(generationKey, 'checked');
        }
      } catch {
        // Some browsers can block sessionStorage; generation still runs safely.
      }

      try {
        const response = await fetch('/api/debts/generate-monthly-expenses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null) as { processed?: number } | null;
        if (response.ok && payload?.processed && payload.processed > 0) {
          setDebtGenerationRefreshKey(value => value + 1);
        }
      } catch {
        // Expenses remain usable; scheduled installments are still counted below.
      }
    }

    void generateDueDebtExpenses();
  }, [debtGenerationChecked, kind, session?.access_token, user]);

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
            debts: [],
          });
        }
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      const queryMeta = (queryName: string, table?: string) => ({
        page: kind,
        functionName: 'RouteDashboardPage.load',
        queryName,
        userId: user.id,
        table,
      });
      const expensesQuery = async () => {
        const baseCurrentQuery = () => {
          let query = supabase.from('expense_items').select('*').eq('user_id', user.id);
          return query.order('date', { ascending: false }).order('created_at', { ascending: false });
        };
        const currentSchema = await safeQuery<SmartExpense>(
          baseCurrentQuery() as unknown as QueryResult<SmartExpense>,
          queryMeta('expense_items', 'expense_items'),
        );
        if (!currentSchema.error || !/column|schema|pgrst/i.test(currentSchema.error.message)) return currentSchema;

        const legacy = await safeQuery<SmartExpense>(
          supabase.from('expense_items').select('id, name, amount, category, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<SmartExpense>,
          queryMeta('expense_items.legacy', 'expense_items'),
        );
        return legacy.error ? currentSchema : legacy;
      };
      const [income, expenses, savings, investments, goals, debts] = await Promise.all([
        safeQuery<IncomeSource>(supabase.from('monthly_income_sources').select('*').eq('user_id', user.id) as unknown as QueryResult<IncomeSource>, queryMeta('monthly_income_sources', 'monthly_income_sources')),
        expensesQuery(),
        safeQuery<MoneyItem>(supabase.from('savings_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<MoneyItem>, queryMeta('savings_items', 'savings_items')),
        safeQuery<MoneyItem>(supabase.from('investment_items').select('id, name, amount, converted_market_value, current_value, current_market_value, native_market_value, created_at').eq('user_id', user.id) as unknown as QueryResult<MoneyItem>, queryMeta('investment_items', 'investment_items')),
        safeQuery<GoalRow>(supabase.from('financial_goals').select('*').eq('user_id', user.id) as unknown as QueryResult<GoalRow>, queryMeta('financial_goals', 'financial_goals')),
        safeQuery<DebtSnapshotItem>(
          supabase
            .from('debts')
            .select('id,name,monthly_payment,currency,status,remaining_amount,calculated_remaining_amount,start_date,first_payment_date,payment_day,auto_add_to_expenses')
            .eq('user_id', user.id) as unknown as QueryResult<DebtSnapshotItem>,
          queryMeta('debts', 'debts'),
        ),
      ]);

      if (cancelled) return;

      setSnapshot({
        income: personalIncomeRows(income.data).map(item => ({ ...item, name: item.label || item.category || item.name || 'Income' })),
        expenses: personalExpenseRows(expenses.data),
        savings: savings.data,
        investments: investments.data.map(item => ({
          ...item,
          amount: parseMoney(item.converted_market_value ?? item.current_value ?? item.amount ?? item.current_market_value ?? item.native_market_value),
        })),
        debts: debts.data,
        goals: goals.data.map(goalFromRow),
        error: [income.error, expenses.error, savings.error, investments.error, goals.error, debts.error].find(Boolean) ?? null,
      });
      setDataLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debtGenerationRefreshKey, isGuest, kind, user]);

  useEffect(() => {
    if (kind !== 'expenses') return;
    const sourceCurrencies = Array.from(new Set(
      [
        ...snapshot.expenses.map(item => normalizeCurrencyCode(item.currency, expenseBaseCurrency)),
        ...snapshot.debts.map(item => normalizeCurrencyCode(item.currency, expenseBaseCurrency)),
      ]
        .filter(code => code !== expenseBaseCurrency),
    ));

    if (!sourceCurrencies.length) return;

    let cancelled = false;
    const fallbackRates = sourceCurrencies.reduce<Record<string, number>>((next, from) => {
      const rate = approximateFxRate(from, expenseBaseCurrency);
      if (rate) next[fxKey(from, expenseBaseCurrency)] = rate;
      return next;
    }, {});
    if (Object.keys(fallbackRates).length) {
      setExpenseFxRates(current => ({ ...current, ...fallbackRates }));
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/market/fx/batch', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs: sourceCurrencies.map(from => ({ from, to: expenseBaseCurrency })) }),
        });
        const payload = await response.json() as {
          rates?: Array<{ from?: string; to?: string; rate?: number | null; available?: boolean }>;
        };
        if (cancelled) return;
        const liveRates = (payload.rates ?? []).reduce<Record<string, number>>((next, item) => {
          const from = normalizeMoneyCurrencyCode(item.from, '');
          const to = normalizeMoneyCurrencyCode(item.to, '');
          const rate = Number(item.rate);
          if (item.available && from && to && Number.isFinite(rate) && rate > 0) {
            next[fxKey(from, to)] = rate;
          }
          return next;
        }, {});
        if (Object.keys(liveRates).length) {
          setExpenseFxRates(current => ({ ...current, ...liveRates }));
        }
      } catch {
        // Fallback rates prevent mixed-currency expenses from being summed as raw numbers.
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [expenseBaseCurrency, kind, snapshot.debts, snapshot.expenses]);

  const data = useMemo(() => {
    const income = snapshot.income;
    const expenses = snapshot.expenses.map(item => {
      const originalCurrency = normalizeCurrencyCode(item.currency, expenseBaseCurrency);
      const originalAmount = parseMoney(item.amount);
      const converted = convertCurrencyAmount(originalAmount, originalCurrency, expenseBaseCurrency, expenseFxRates);
      if (originalCurrency === expenseBaseCurrency || converted === null) {
        return {
          ...item,
          original_amount: originalAmount,
          original_currency: originalCurrency,
          converted_amount: originalAmount,
          converted_currency: originalCurrency,
          fx_rate_to_base: 1,
          amount_is_converted: false,
        };
      }
      return {
        ...item,
        amount: converted,
        currency: expenseBaseCurrency,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        converted_amount: converted,
        converted_currency: expenseBaseCurrency,
        fx_rate_to_base: converted / Math.max(originalAmount, 1e-9),
        amount_is_converted: true,
      };
    });
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
  }, [expenseBaseCurrency, expenseFxRates, snapshot]);

  const expensePeriodExpenses = useMemo(
    () => data.expenses.filter(item => isExpenseInPeriod(item, selectedExpenseRange)),
    [data.expenses, selectedExpenseRange],
  );
  const previousPeriodExpenses = useMemo(
    () => previousExpenseRange ? data.expenses.filter(item => isExpenseInPeriod(item, previousExpenseRange)) : [],
    [data.expenses, previousExpenseRange],
  );
  const actualExpensePeriodTotal = useMemo(() => sum(expensePeriodExpenses), [expensePeriodExpenses]);
  const actualDebtInstallmentsTotal = useMemo(() => debtInstallmentExpenseTotal(expensePeriodExpenses), [expensePeriodExpenses]);
  const scheduledDebtInstallmentsTotal = useMemo(
    () => scheduledDebtInstallmentsForRange(snapshot.debts, selectedExpenseRange, expenseBaseCurrency, expenseFxRates),
    [expenseBaseCurrency, expenseFxRates, selectedExpenseRange, snapshot.debts],
  );
  const missingScheduledDebtInstallmentsTotal = useMemo(
    () => Math.max(0, scheduledDebtInstallmentsTotal - actualDebtInstallmentsTotal),
    [actualDebtInstallmentsTotal, scheduledDebtInstallmentsTotal],
  );
  const scheduledDebtExpenseRows = useMemo(
    () => scheduledDebtInstallmentExpensesForRange(
      snapshot.debts,
      expensePeriodExpenses,
      selectedExpenseRange,
      expenseBaseCurrency,
      expenseFxRates,
      lang,
    ),
    [expenseBaseCurrency, expenseFxRates, expensePeriodExpenses, lang, selectedExpenseRange, snapshot.debts],
  );
  const expenseDisplayRecords = useMemo(
    () => [...expensePeriodExpenses, ...scheduledDebtExpenseRows],
    [expensePeriodExpenses, scheduledDebtExpenseRows],
  );
  const expensePeriodTotal = useMemo(
    () => actualExpensePeriodTotal + missingScheduledDebtInstallmentsTotal,
    [actualExpensePeriodTotal, missingScheduledDebtInstallmentsTotal],
  );
  const previousActualDebtInstallmentsTotal = useMemo(() => debtInstallmentExpenseTotal(previousPeriodExpenses), [previousPeriodExpenses]);
  const previousScheduledDebtInstallmentsTotal = useMemo(
    () => scheduledDebtInstallmentsForRange(snapshot.debts, previousExpenseRange, expenseBaseCurrency, expenseFxRates),
    [expenseBaseCurrency, expenseFxRates, previousExpenseRange, snapshot.debts],
  );
  const previousExpensePeriodTotal = useMemo(
    () => sum(previousPeriodExpenses) + Math.max(0, previousScheduledDebtInstallmentsTotal - previousActualDebtInstallmentsTotal),
    [previousActualDebtInstallmentsTotal, previousPeriodExpenses, previousScheduledDebtInstallmentsTotal],
  );
  const expenseScopedData = useMemo(() => ({
    ...data,
    expenses: expensePeriodExpenses,
    totalExpenses: expensePeriodTotal,
    charityTotal: expensePeriodExpenses.filter(item => item.name.startsWith('خيرية:')).reduce((total, item) => total + item.amount, 0),
    balance: data.totalIncome - expensePeriodTotal,
  }), [data, expensePeriodExpenses, expensePeriodTotal]);
  const dashboardData = kind === 'expenses' ? expenseScopedData : data;
  const cards = useMemo<SectionCard[]>(() => buildCards(kind, dashboardData, lang, currency), [dashboardData, lang, kind, currency]);
  const rows = useMemo(() => buildRows(kind, dashboardData, lang, currency, t), [dashboardData, lang, kind, currency, t]);
  const insights = useMemo(() => buildInsights(kind, dashboardData, lang, currency, t), [dashboardData, lang, kind, currency, t]);
  const expenseSummaryCards = useMemo<SectionCard[]>(() => {
    const total = expensePeriodTotal;
    const recurringTotal = expensePeriodExpenses.filter(isRecurringExpense).reduce((sumValue, item) => sumValue + item.amount, 0) + missingScheduledDebtInstallmentsTotal;
    const dailyAverage = total / expensePeriodDayCount(selectedExpenseRange, expensePeriodExpenses);
    const byCategory = expensePeriodExpenses.reduce<Record<string, number>>((acc, item) => {
      const key = normalizedExpenseCategory(item);
      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {});
    if (missingScheduledDebtInstallmentsTotal > 0) {
      byCategory.loans = (byCategory.loans || 0) + missingScheduledDebtInstallmentsTotal;
    }
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const previousTotal = previousExpensePeriodTotal;
    const comparisonDelta = total - previousTotal;
    const comparisonPercent = previousTotal > 0
      ? Math.round((comparisonDelta / previousTotal) * 100)
      : total > 0 ? 100 : 0;
    const comparisonValue = previousExpenseRange
      ? `${comparisonDelta >= 0 ? '+' : '-'}${money(Math.abs(comparisonDelta), lang, expenseBaseCurrency)} (${comparisonDelta >= 0 ? '+' : ''}${comparisonPercent}%)`
      : pick({ ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' }, lang);
    return [
      {
        title: { ar: 'إجمالي المصروفات', en: 'Total expenses', fr: 'Total des dépenses' },
        body: { ar: expensePeriodBadge(expensePeriod, lang), en: expensePeriodBadge(expensePeriod, lang), fr: expensePeriodBadge(expensePeriod, lang) },
        value: money(total, lang, expenseBaseCurrency),
        tone: '#EF4444',
      },
      {
        title: { ar: 'عدد المصروفات', en: 'Expense count', fr: 'Nombre de dépenses' },
        body: { ar: 'سجلات داخل الفترة المحددة فقط.', en: 'Records in the selected period only.', fr: 'Enregistrements de la période sélectionnée.' },
        value: String(expenseDisplayRecords.length),
        tone: 'var(--sfm-soft-cyan)',
      },
      {
        title: { ar: 'المصروفات المتكررة', en: 'Recurring expenses', fr: 'Dépenses récurrentes' },
        body: { ar: 'اشتراكات وفواتير وقروض نشطة داخل الفترة.', en: 'Subscriptions, bills, and loans active in the period.', fr: 'Abonnements, factures et prêts actifs sur la période.' },
        value: money(recurringTotal, lang, expenseBaseCurrency),
        tone: '#3B82F6',
      },
      {
        title: { ar: 'متوسط المصروف اليومي', en: 'Daily average', fr: 'Moyenne quotidienne' },
        body: { ar: 'محسوب على أيام الفترة المعروضة.', en: 'Calculated over the displayed period days.', fr: 'Calculé sur les jours de la période affichée.' },
        value: money(dailyAverage, lang, expenseBaseCurrency),
        tone: '#F59E0B',
      },
      {
        title: { ar: 'أعلى تصنيف', en: 'Top category', fr: 'Catégorie principale' },
        body: {
          ar: topCategory ? money(topCategory[1], lang, expenseBaseCurrency) : 'لا توجد مصروفات في الفترة.',
          en: topCategory ? money(topCategory[1], lang, expenseBaseCurrency) : 'No expenses in this period.',
          fr: topCategory ? money(topCategory[1], lang, expenseBaseCurrency) : 'Aucune dépense sur cette période.',
        },
        value: topCategory ? categoryLabel(topCategory[0], lang) : '-',
        tone: '#22C55E',
      },
      {
        title: { ar: 'مقارنة مع الفترة السابقة', en: 'Previous period comparison', fr: 'Comparaison période précédente' },
        body: { ar: 'الفرق مقارنة بالفترة السابقة المماثلة.', en: 'Difference versus the matching previous period.', fr: 'Écart par rapport à la période précédente équivalente.' },
        value: comparisonValue,
        tone: comparisonDelta > 0 ? '#EF4444' : '#22C55E',
      },
    ];
  }, [expenseBaseCurrency, expenseDisplayRecords.length, expensePeriod, expensePeriodExpenses, expensePeriodTotal, lang, missingScheduledDebtInstallmentsTotal, previousExpensePeriodTotal, previousExpenseRange, selectedExpenseRange]);
  const selectedGoalCurrency = useMemo(() => getCurrency(goalForm.currency || currency || 'KWD'), [currency, goalForm.currency]);
  const selectedCurrencySymbol = isAr ? selectedGoalCurrency.symbolAr : selectedGoalCurrency.symbolEn;
  const selectedEntryCurrency = useMemo(() => getCurrency(entryForm.currency || currency || 'KWD'), [currency, entryForm.currency]);
  const selectedEntryCurrencySymbol = isAr ? selectedEntryCurrency.symbolAr : selectedEntryCurrency.symbolEn;
  const normalizedSavingForm = useMemo(() => {
    const amount = parseMoneyValue(entryForm.amount);
    return {
      name: entryForm.name.trim(),
      amount,
      currency: normalizeCurrencyCode(entryForm.currency, currency || 'KWD'),
      savingType: normalizeSavingsOption(entryForm.savingType, SAVING_TYPES),
      savingMethod: normalizeSavingsOption(entryForm.savingMethod, SAVING_METHODS),
      savedAt: normalizeSavingsDate(entryForm.savedAt),
      note: entryForm.note.trim(),
      goalId: entryForm.goalId.trim(),
    };
  }, [currency, entryForm]);
  const savingFormErrors = useMemo(() => {
    if (kind !== 'savings') return [] as string[];
    const errors: string[] = [];
    if (!normalizedSavingForm.name) errors.push(t('savings_error_name_required'));
    if (normalizedSavingForm.amount.status !== 'valid' || normalizedSavingForm.amount.value <= 0) errors.push(t('savings_error_amount_required'));
    if (!normalizedSavingForm.currency) errors.push(t('savings_error_currency_required'));
    if (!normalizedSavingForm.savingType) errors.push(t('savings_error_type_required'));
    if (!normalizedSavingForm.savingMethod) errors.push(t('savings_error_method_required'));
    if (!normalizedSavingForm.savedAt) errors.push(t('savings_error_date_required'));
    return errors;
  }, [kind, normalizedSavingForm, t]);
  const savingFormValid = kind !== 'savings' || savingFormErrors.length === 0;
  const goalPreview = useMemo(() => buildGoalAnalysis({
    id: goalForm.id || 'preview',
    name: goalForm.name || t('goal_name_label'),
    target_amount: parseMoney(goalForm.targetAmount),
    current_amount: parseMoney(goalForm.currentAmount),
    monthly_contribution: parseMoney(goalForm.monthlyContribution),
    goal_type: goalForm.goalType,
    category: goalForm.category,
    priority: goalForm.priority,
    funding_source: goalForm.fundingSource,
    currency: goalForm.currency || currency || 'KWD',
    ai_enabled: goalForm.aiEnabled,
    deadline: goalForm.deadline || null,
    icon: '🎯',
    color: 'var(--sfm-soft-cyan)',
    notes: goalForm.notes,
  }, data, lang, goalForm.currency || currency, t), [currency, data, goalForm, lang, t]);

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

  const filteredExpenses = useMemo(() => {
    let result = [...expenseDisplayRecords];
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        categoryLabel(normalizedExpenseCategory(item), lang).toLowerCase().includes(q) ||
        paymentLabel(item.payment_method, lang).toLowerCase().includes(q),
      );
    }
    if (expenseCategoryFilter !== 'all') result = result.filter(item => normalizedExpenseCategory(item) === expenseCategoryFilter);
    if (expensePaymentFilter !== 'all') result = result.filter(item => (item.payment_method || 'cash') === expensePaymentFilter);
    if (expenseTypeFilter !== 'all') {
      result = result.filter(item => expenseMatchesType({ ...item, category: normalizedExpenseCategory(item) }, expenseTypeFilter));
    }
    if (rowSort === 'amountDesc') result.sort((a, b) => b.amount - a.amount);
    else if (rowSort === 'amountAsc') result.sort((a, b) => a.amount - b.amount);
    else if (rowSort === 'dateAsc') result.sort((a, b) => (localDateFromInput(a.date || a.created_at)?.getTime() ?? 0) - (localDateFromInput(b.date || b.created_at)?.getTime() ?? 0));
    else result.sort((a, b) => (localDateFromInput(b.date || b.created_at)?.getTime() ?? 0) - (localDateFromInput(a.date || a.created_at)?.getTime() ?? 0));
    return result;
  }, [expenseCategoryFilter, expenseDisplayRecords, expensePaymentFilter, expenseTypeFilter, lang, rowSearch, rowSort]);

  useEffect(() => { setVisibleCount(EXPENSE_PAGE_SIZE); }, [expenseCategoryFilter, expensePaymentFilter, expensePeriod, expenseTypeFilter, rowSearch, rowSort, rowRange, kind]);

  function changeExpensePeriod(next: ExpensePeriodState) {
    setExpensePeriod(next);
    writeExpensePeriodToLocation(next);
  }

  function changeExpensePeriodPreset(preset: ExpensePeriodPreset) {
    const now = new Date();
    const base = preset === 'custom' ? expensePeriod : defaultExpensePeriodState(now);
    changeExpensePeriod({ ...base, preset });
  }

  function changeCustomExpenseMonth(partial: Partial<Pick<ExpensePeriodState, 'month' | 'year'>>) {
    changeExpensePeriod({
      preset: 'custom',
      month: partial.month ?? expensePeriod.month,
      year: partial.year ?? expensePeriod.year,
    });
  }

  function showEntryMessage(type: 'ok' | 'err', text: string) {
    setEntryMessage({ type, text });
    window.setTimeout(() => setEntryMessage(null), 2200);
  }

  async function adjustLinkedSavingsGoal(goalId: string | null | undefined, delta: number) {
    if (!goalId || !user || !Number.isFinite(delta) || delta === 0) return;
    let goalFetchResult = await supabase
      .from('financial_goals')
      .select('id,current_amount,saved_amount,progress_amount,notes')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (goalFetchResult.error && /saved_amount|progress_amount|notes|column|schema|PGRST/i.test(goalFetchResult.error.message)) {
      goalFetchResult = await supabase
        .from('financial_goals')
        .select('id,current_amount')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .maybeSingle();
    }
    const { data: goal, error: goalFetchError } = goalFetchResult;
    if (goalFetchError) throw goalFetchError;
    if (!goal) return;
    const currentProgress = calculateGoalProgress(goal as GoalRow);
    const nextAmount = Math.max(0, currentProgress.currentAmount + delta);
    let updateResult = await supabase
      .from('financial_goals')
      .update({ current_amount: nextAmount, saved_amount: nextAmount, progress_amount: nextAmount, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .eq('user_id', user.id);
    if (updateResult.error && /saved_amount|progress_amount|updated_at|column|schema|PGRST/i.test(updateResult.error.message)) {
      updateResult = await supabase
        .from('financial_goals')
        .update({ current_amount: nextAmount })
        .eq('id', goalId)
        .eq('user_id', user.id);
    }
    if (updateResult.error) throw updateResult.error;
    setSnapshot(prev => ({
      ...prev,
      goals: prev.goals.map(item => item.id === goalId ? { ...item, current_amount: nextAmount } : item),
    }));
  }

  function openCreateEntry() {
    if (!editableKind(kind)) return;
    if (kind === 'expenses') {
      setEntryMode('create');
      setExpenseModalMode('manual');
      setReceiptError('');
      setReceiptDebug(null);
      setExpenseForm(emptyExpenseForm(currency || 'KWD'));
      setEntryOpen(true);
      return;
    }
    setEntryMode('create');
    setEntryForm(emptyEntryForm(currency || 'KWD'));
    setEntryOpen(true);
  }

  function openEditEntry(item: MoneyItem | IncomeSource) {
    if (!editableKind(kind)) return;
    if (kind === 'expenses') {
      const expense = item as SmartExpense;
      setEntryMode('edit');
      setExpenseModalMode('manual');
      setReceiptError('');
      setReceiptDebug(null);
      setExpenseForm({
        id: expense.id,
        name: expense.name,
        amount: String(expense.original_amount ?? expense.amount ?? ''),
        currency: expense.original_currency || expense.currency || currency || 'KWD',
        category: expense.category || 'other',
        date: expense.date || (expense.created_at ? expense.created_at.slice(0, 10) : todayInputDate()),
        paymentMethod: expense.payment_method || 'cash',
        notes: expense.notes || '',
        receiptFile: null,
        receiptPreview: expense.receipt_image_url || '',
        receiptImageUrl: expense.receipt_image_url || null,
        receiptFileName: expense.receipt_file_name || null,
        aiExtractedData: expense.ai_extracted_data || null,
        aiConfidenceScore: expense.ai_confidence_score || null,
      });
      setEntryOpen(true);
      return;
    }
    setEntryMode('edit');
    setEntryForm({
      id: item.id,
      name: 'label' in item && item.label ? item.label : item.name,
      amount: String(item.amount ?? ''),
      category: 'category' in item && item.category ? item.category : 'general',
      currency: item.currency || currency || 'KWD',
      savingType: item.saving_type || '',
      savingMethod: item.method || item.saving_method || '',
      savedAt: item.saved_at ? item.saved_at.slice(0, 10) : item.created_at ? item.created_at.slice(0, 10) : todayInputDate(),
      note: item.notes || item.note || '',
      goalId: item.goal_id || '',
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

  function handleExpenseFile(file: File | null) {
    setReceiptError('');
    setReceiptDebug(null);
    if (!file) {
      if (receiptInputRef.current) receiptInputRef.current.value = '';
      setExpenseForm(prev => ({ ...prev, receiptFile: null, receiptPreview: '', receiptFileName: null, aiExtractedData: null, aiConfidenceScore: null }));
      setReceiptFiles([]);
      setPendingReceiptExpenses([]);
      setReceiptBatchProgress('');
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('Receipt image selected', { name: file.name, type: file.type, size: file.size });
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(inferClientReceiptMimeType(file))) {
      setReceiptError(expenseText('fileUnsupported', lang));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptError(expenseText('fileLarge', lang));
      return;
    }
    const mimeType = inferClientReceiptMimeType(file);
    const preview = mimeType === 'application/pdf' ? '' : URL.createObjectURL(file);
    setExpenseForm(prev => ({
      ...prev,
      receiptFile: file,
      receiptPreview: preview,
      receiptFileName: file.name,
    }));
    setReceiptFiles([{ file, previewUrl: preview }]);
    setPendingReceiptExpenses([]);
  }

  function handleExpenseFiles(files: FileList | File[] | null) {
    setReceiptError('');
    setReceiptDebug(null);
    setReceiptBatchProgress('');
    setPendingReceiptExpenses([]);
    const selected = Array.from(files || []);
    if (!selected.length) {
      handleExpenseFile(null);
      return;
    }
    if (selected.length > 10) {
      setReceiptError(expenseText('uploadLimit', lang));
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const invalid = selected.find(file => !allowed.includes(inferClientReceiptMimeType(file)));
    if (invalid) {
      setReceiptError(expenseText('fileUnsupported', lang));
      return;
    }
    const large = selected.find(file => file.size > 10 * 1024 * 1024);
    if (large) {
      setReceiptError(expenseText('fileLarge', lang));
      return;
    }
    const entries = selected.map(file => ({ file, previewUrl: inferClientReceiptMimeType(file) === 'application/pdf' ? '' : URL.createObjectURL(file) }));
    setReceiptFiles(entries);
    const first = entries[0];
    setExpenseForm(prev => ({
      ...prev,
      receiptFile: first.file,
      receiptPreview: first.previewUrl,
      receiptFileName: first.file.name,
      aiExtractedData: null,
      aiConfidenceScore: null,
    }));
  }

  async function analyzeReceipt() {
    if (!expenseForm.receiptFile || receiptAnalyzing) {
      setReceiptError(expenseText('unclear', lang));
      return;
    }
    setReceiptAnalyzing(true);
    setReceiptError('');
    setReceiptDebug({
      stage: 'upload',
      fileName: expenseForm.receiptFile.name,
      fileType: expenseForm.receiptFile.type,
      fileSize: expenseForm.receiptFile.size,
    });
    try {
      const form = new FormData();
      form.append('receipt', expenseForm.receiptFile);
      const response = await fetch('/api/receipts/scan', { method: 'POST', body: form });
      const payload = await response.json() as ReceiptScanApiPayload;
      setReceiptDebug(payload.debug ? {
        ...payload.debug,
        errorSource: payload.debug.errorSource || payload.code || payload.error,
        message: payload.debug.message || payload.error,
      } : {
        stage: response.ok ? 'parser' : 'ui',
        fileName: expenseForm.receiptFile.name,
        fileType: expenseForm.receiptFile.type,
        fileSize: expenseForm.receiptFile.size,
        status: response.status,
        errorSource: payload.code || payload.error,
      });
      if (!response.ok || !payload.data) {
        throw new Error(receiptScanErrorText(payload.debug?.errorSource || payload.code, lang, payload.error || expenseText('couldNotRead', lang)));
      }
      const extracted = { ...payload.data, provider: payload.provider || payload.data.provider };
      if (process.env.NODE_ENV !== 'production') {
        console.info('AI receipt result', {
          success: payload.success,
          provider: payload.provider,
          apiStatus: response.status,
          rawTextLength: extracted.rawText?.length || 0,
          amount: extractedReceiptAmount(extracted),
          currency: extracted.currency,
          confidenceLevel: extracted.confidenceLevel,
          candidates: extracted.amountCandidates || [],
          debug: payload.debug,
        });
      }
      const amount = extractedReceiptAmount(extracted);
      const notes = receiptItemsNotes(extracted.items);
      setExpenseForm(prev => ({
        ...prev,
        name: extracted.description?.trim() || extracted.merchantName?.trim() || prev.name || receiptFallbackName(lang),
        amount: amount ? String(amount) : prev.amount,
        currency: extracted.currency || prev.currency || currency || 'KWD',
        category: normalizeReceiptCategory(extracted.category) || prev.category || 'other',
        date: normalizeReceiptDate(extracted) || prev.date,
        paymentMethod: normalizeReceiptPayment(extracted.paymentMethod) || prev.paymentMethod || 'other',
        notes: notes || prev.notes,
        aiExtractedData: extracted,
        aiConfidenceScore: extracted.confidenceScore ?? extracted.confidence ?? (amount ? 0.84 : 0.48),
      }));
      if (!amount && extracted.currency) setReceiptError(expenseText('partialCurrencyNoAmount', lang));
      else if (!amount || extracted.confidenceLevel === 'low') setReceiptError(expenseText('lowConfidence', lang));
      else if (extracted.confidenceLevel === 'medium') setReceiptError(expenseText('mediumConfidence', lang));
      else if (!extracted.currency) setReceiptError(expenseText('currencyFallback', lang));
      else if ((extracted.warnings || []).length) setReceiptError(expenseText('partialExtraction', lang));
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : expenseText('couldNotRead', lang));
    } finally {
      setReceiptAnalyzing(false);
    }
  }

  function applyReceiptCandidate(candidate: ReceiptAmountCandidate) {
    const amount = receiptCandidateAmount(candidate);
    if (!amount) return;
    setExpenseForm(prev => ({
      ...prev,
      amount: String(amount),
      currency: candidate.currency || prev.currency || currency || 'KWD',
      aiExtractedData: prev.aiExtractedData ? {
        ...prev.aiExtractedData,
        totalAmount: amount,
        currency: candidate.currency || prev.aiExtractedData.currency || prev.currency || currency || 'KWD',
        selectedAmountLabel: candidate.label,
      } : prev.aiExtractedData,
    }));
  }

  async function analyzeAllReceipts() {
    if (!receiptFiles.length || receiptAnalyzing) {
      setReceiptError(expenseText('unclear', lang));
      return;
    }
    setReceiptAnalyzing(true);
    setReceiptError('');
    setReceiptBatchProgress(textWithCount(expenseText('batchProgress', lang), { current: 1, total: receiptFiles.length }));
    try {
      const form = new FormData();
      receiptFiles.forEach(({ file }) => form.append('receipt', file));
      const response = await fetch('/api/receipts/scan', { method: 'POST', body: form });
      const payload = await response.json() as ReceiptScanApiPayload;
      const batchDebug = payload.debug || payload.results?.[0]?.debug || null;
      setReceiptDebug(batchDebug ? {
        ...batchDebug,
        errorSource: batchDebug.errorSource || payload.results?.[0]?.code || payload.code || payload.error,
        message: batchDebug.message || payload.error || payload.results?.[0]?.error,
      } : null);
      if (process.env.NODE_ENV !== 'production') {
        console.info('AI receipt batch result', {
          apiStatus: response.status,
          success: payload.success,
          results: payload.results?.map(result => ({
            fileName: result.fileName,
            success: result.success,
            rawTextLength: result.data?.rawText?.length || 0,
            candidates: result.data?.amountCandidates?.length || 0,
            selectedAmount: result.data ? extractedReceiptAmount(result.data) : undefined,
            confidence: result.data?.confidenceLevel,
            errorSource: result.debug?.errorSource,
          })),
        });
      }
      if (!response.ok) throw new Error(receiptScanErrorText(payload.debug?.errorSource || payload.code, lang, payload.error || expenseText('couldNotRead', lang)));
      const results = payload.results?.length
        ? payload.results
        : [{ fileName: receiptFiles[0].file.name, success: payload.success, data: payload.data, error: payload.error }];
      const normalizedResults = results.map(result => ({
        ...result,
        data: result.data ? { ...result.data, provider: result.provider || result.data.provider } : result.data,
      }));
      const pending = receiptFiles.map((entry, index) => pendingReceiptFromResult(entry.file, entry.previewUrl, normalizedResults[index] || { success: false, error: expenseText('couldNotRead', lang) }, lang, currency || 'KWD'));
      setPendingReceiptExpenses(pending);
      const firstReady = pending.find(item => item.amount) || pending[0];
      if (firstReady) {
        setExpenseForm(prev => ({
          ...prev,
          name: firstReady.name,
          amount: firstReady.amount,
          currency: firstReady.currency || prev.currency || currency || 'KWD',
          category: firstReady.category,
          date: firstReady.date,
          paymentMethod: firstReady.paymentMethod,
          notes: firstReady.notes,
          receiptFile: firstReady.file,
          receiptPreview: firstReady.previewUrl,
          receiptFileName: firstReady.fileName,
          aiExtractedData: firstReady.aiExtractedData,
          aiConfidenceScore: firstReady.aiConfidenceScore,
        }));
      }
      if (pending.some(item => item.status === 'failed')) setReceiptError(expenseText('amountNotDetected', lang));
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : expenseText('couldNotRead', lang));
    } finally {
      setReceiptAnalyzing(false);
      setReceiptBatchProgress('');
    }
  }

  async function uploadReceiptFile(file: File | null, id: string, previewUrl?: string | null) {
    if (!file || !user || isGuest) {
      return {
        receiptImageUrl: previewUrl || null,
        receiptFileName: file?.name || null,
      };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${id}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (error) {
      return {
        receiptImageUrl: previewUrl || null,
        receiptFileName: file.name,
      };
    }
    const { data: publicUrl } = supabase.storage.from('receipts').getPublicUrl(path);
    return {
      receiptImageUrl: publicUrl.publicUrl,
      receiptFileName: file.name,
    };
  }

  async function uploadReceiptIfAvailable(id: string) {
    if (!expenseForm.receiptFile) {
      return {
        receiptImageUrl: expenseForm.receiptImageUrl || expenseForm.receiptPreview || null,
        receiptFileName: expenseForm.receiptFileName || null,
      };
    }
    return uploadReceiptFile(expenseForm.receiptFile, id, expenseForm.receiptImageUrl || expenseForm.receiptPreview || null);
  }

  async function insertExpenseItem(payload: Record<string, unknown>) {
    let nextPayload = { ...payload };
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= EXPENSE_OPTIONAL_SAVE_COLUMNS.length; attempt += 1) {
      const { data: created, error } = await supabase
        .from('expense_items')
        .insert(nextPayload)
        .select('*')
        .single();

      if (!error) {
        void trackEvent('add_expense', { module: 'expenses', metadata: { category: String(nextPayload.category ?? 'general') } });
        return created as SmartExpense;
      }

      lastError = error;
      console.error('Expense insert failed:', {
        table: 'expense_items',
        missingColumn: missingColumnFromError(error.message),
        message: error.message,
      });

      const missingColumn = missingColumnFromError(error.message);
      if (
        !isSchemaColumnError(error) ||
        !missingColumn ||
        !EXPENSE_OPTIONAL_SAVE_COLUMNS.includes(missingColumn as typeof EXPENSE_OPTIONAL_SAVE_COLUMNS[number]) ||
        !(missingColumn in nextPayload)
      ) {
        throw error;
      }

      const { [missingColumn]: _removed, ...remainingPayload } = nextPayload;
      nextPayload = remainingPayload;
    }

    throw lastError instanceof Error ? lastError : new Error(expenseText('saveFailed', lang));
  }

  async function updateExpenseItem(id: string, payload: Record<string, unknown>) {
    let nextPayload = { ...payload };
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= EXPENSE_OPTIONAL_SAVE_COLUMNS.length; attempt += 1) {
      const { error } = await supabase
        .from('expense_items')
        .update(nextPayload)
        .eq('id', id);

      if (!error) return;

      lastError = error;
      console.error('Expense update failed:', {
        table: 'expense_items',
        missingColumn: missingColumnFromError(error.message),
        message: error.message,
      });

      const missingColumn = missingColumnFromError(error.message);
      if (
        !isSchemaColumnError(error) ||
        !missingColumn ||
        !EXPENSE_OPTIONAL_SAVE_COLUMNS.includes(missingColumn as typeof EXPENSE_OPTIONAL_SAVE_COLUMNS[number]) ||
        !(missingColumn in nextPayload)
      ) {
        throw error;
      }

      const { [missingColumn]: _removed, ...remainingPayload } = nextPayload;
      nextPayload = remainingPayload;
    }

    throw lastError instanceof Error ? lastError : new Error(expenseText('saveFailed', lang));
  }

  async function saveExpense(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (entrySaving) return;

    const name = expenseForm.name.trim();
    const amount = parseMoney(expenseForm.amount);
    if (name.length < 2) {
      showEntryMessage('err', expenseText('nameRequired', lang));
      return;
    }
    if (!amount || amount <= 0) {
      showEntryMessage('err', expenseText('amountRequired', lang));
      return;
    }
    if (!expenseForm.date) {
      showEntryMessage('err', expenseText('dateRequired', lang));
      return;
    }
    if (!expenseForm.category) {
      showEntryMessage('err', expenseText('categoryRequired', lang));
      return;
    }

    setEntrySaving(true);
    const mode = entryMode;
    const id = expenseForm.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);
    const now = new Date().toISOString();

    try {
      const uploaded = await uploadReceiptIfAvailable(id);
      const item: SmartExpense = {
        id,
        name,
        amount,
        category: expenseForm.category,
        date: expenseForm.date,
        currency: expenseForm.currency || currency || 'KWD',
        payment_method: expenseForm.paymentMethod,
        notes: expenseForm.notes,
        receipt_image_url: uploaded.receiptImageUrl,
        receipt_file_name: uploaded.receiptFileName,
        ai_extracted_data: expenseForm.aiExtractedData,
        ai_confidence_score: expenseForm.aiConfidenceScore ?? expenseForm.aiExtractedData?.confidenceScore ?? null,
        created_at: mode === 'create' ? now : undefined,
        updated_at: now,
      };

      if (isGuest) {
        const current = readGuestItems('expenses') as SmartExpense[];
        const next = mode === 'create' ? [item, ...current] : current.map(existing => existing.id === id ? { ...existing, ...item } : existing);
        writeGuestItems('expenses', next);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        const payload = {
          user_id: user.id,
          name,
          amount,
          currency: expenseForm.currency || currency || 'KWD',
          category: expenseForm.category,
          date: expenseForm.date,
          payment_method: expenseForm.paymentMethod,
          notes: expenseForm.notes || null,
          receipt_image_url: uploaded.receiptImageUrl,
          receipt_file_name: uploaded.receiptFileName,
          ai_extracted_data: expenseForm.aiExtractedData ?? null,
          ai_confidence_score: expenseForm.aiConfidenceScore ?? expenseForm.aiExtractedData?.confidenceScore ?? null,
          updated_at: now,
        };
        if (mode === 'create') {
          const created = await insertExpenseItem(payload);
          Object.assign(item, created);
        } else {
          await updateExpenseItem(id, payload);
        }
      }

      applyEntryToSnapshot('expenses', item, mode);
      setEntryOpen(false);
      setExpenseForm(emptyExpenseForm(currency || 'KWD'));
      showEntryMessage('ok', mode === 'create' ? expenseText('saveSuccess', lang) : t('updateSuccess'));
    } catch (err) {
      console.error('Expense save failed:', {
        table: 'expense_items',
        mode,
        message: err instanceof Error ? err.message : String(err),
      });
      showEntryMessage('err', expenseText('saveFailed', lang));
    } finally {
      setEntrySaving(false);
    }
  }

  async function savePendingReceiptExpenses(selectedOnly = true) {
    if (entrySaving) return;
    const candidates = pendingReceiptExpenses.filter(item => (!selectedOnly || item.selected) && item.name.trim() && parseMoney(item.amount) > 0);
    if (!candidates.length) {
      showEntryMessage('err', expenseText('amountNotDetected', lang));
      return;
    }
    setEntrySaving(true);
    let successCount = 0;
    let failedCount = 0;
    const now = new Date().toISOString();
    const savedItems: SmartExpense[] = [];

    for (const receipt of candidates) {
      try {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${successCount}`;
        const uploaded = await uploadReceiptFile(receipt.file, id, receipt.previewUrl);
        const item: SmartExpense = {
          id,
          name: receipt.name.trim() || receiptFallbackName(lang),
          amount: parseMoney(receipt.amount),
          category: receipt.category,
          date: receipt.date,
          currency: receipt.currency || currency || 'KWD',
          payment_method: receipt.paymentMethod,
          notes: receipt.notes,
          receipt_image_url: uploaded.receiptImageUrl,
          receipt_file_name: uploaded.receiptFileName,
          ai_extracted_data: receipt.aiExtractedData,
          ai_confidence_score: receipt.aiConfidenceScore,
          created_at: now,
          updated_at: now,
        };

        if (isGuest) {
          savedItems.push(item);
        } else {
          if (!user) throw new Error(t('entry_auth_required'));
          const payload = {
            user_id: user.id,
            name: item.name,
            amount: item.amount,
            currency: receipt.currency || currency || 'KWD',
            category: item.category,
            date: item.date,
            payment_method: item.payment_method,
            notes: item.notes || null,
            receipt_image_url: item.receipt_image_url,
            receipt_file_name: item.receipt_file_name,
            ai_extracted_data: item.ai_extracted_data,
            ai_confidence_score: item.ai_confidence_score,
            updated_at: now,
          };
          const created = await insertExpenseItem(payload);
          savedItems.push({ ...item, ...created });
        }
        successCount += 1;
      } catch (error) {
        console.error('Batch receipt save failed:', { fileName: receipt.fileName, error });
        failedCount += 1;
      }
    }

    if (isGuest && savedItems.length) {
      const current = readGuestItems('expenses') as SmartExpense[];
      writeGuestItems('expenses', [...savedItems, ...current]);
    }
    savedItems.reverse().forEach(item => applyEntryToSnapshot('expenses', item, 'create'));
    setPendingReceiptExpenses([]);
    setReceiptFiles([]);
    setExpenseForm(emptyExpenseForm(currency || 'KWD'));
    setEntryOpen(false);
    showEntryMessage('ok', textWithCount(expenseText('batchSaveResult', lang), { successCount, failedCount }));
    setEntrySaving(false);
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editableKind(kind) || entrySaving) return;

    if (kind === 'savings' && savingFormErrors.length > 0) {
      showEntryMessage('err', savingFormErrors[0]);
      return;
    }
    const name = kind === 'savings' ? normalizedSavingForm.name : entryForm.name.trim();
    const amount = kind === 'savings' && normalizedSavingForm.amount.status === 'valid'
      ? normalizedSavingForm.amount.value
      : parseMoney(entryForm.amount);
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
          : kind === 'savings'
            ? {
              id,
              name,
              amount,
              currency: entryForm.currency || currency || 'KWD',
              saving_type: entryForm.savingType,
              method: entryForm.savingMethod,
              saving_method: entryForm.savingMethod,
              saved_at: entryForm.savedAt,
              notes: entryForm.note.trim() || null,
              note: entryForm.note.trim() || null,
              goal_id: entryForm.savingType === 'financial_goal' ? entryForm.goalId || null : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as MoneyItem
            : { id, name, amount, created_at: new Date().toISOString() } as MoneyItem;
        const next = mode === 'create' ? [item, ...current] : current.map(existing => existing.id === id ? item : existing);
        writeGuestItems(kind, next);
        applyEntryToSnapshot(kind, item, mode);
      } else {
        if (!user?.id) throw new Error(kind === 'savings' ? t('savings_error_auth_required') : t('entry_auth_required'));
        if (kind === 'income') {
          if (mode === 'create') {
            const { data: created, error } = await supabase.from('monthly_income_sources').insert({
              user_id: user.id,
              category: entryForm.category || 'general',
              label: name,
              amount,
            }).select('id,label,category,amount').single();
            if (error) throw error;
            void trackEvent('add_income', { module: 'income', metadata: { category: entryForm.category || 'general' } });
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
          if (kind === 'savings') {
            const previous = snapshot.savings.find(item => item.id === id);
            const linkedGoalId = normalizedSavingForm.savingType === 'financial_goal' ? normalizedSavingForm.goalId || null : null;
            const savingNotes = normalizedSavingForm.note || null;
            const savingPayload = {
              user_id: user.id,
              name,
              amount,
              currency: normalizedSavingForm.currency,
              saving_type: normalizedSavingForm.savingType,
              method: normalizedSavingForm.savingMethod,
              saved_at: normalizedSavingForm.savedAt,
              notes: savingNotes,
              goal_id: linkedGoalId,
              updated_at: new Date().toISOString(),
            };
            const createPayload = { ...savingPayload, created_at: new Date().toISOString() };
            const isSchemaCacheColumnError = (error: unknown) => {
              if (!error || typeof error !== 'object') return false;
              const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };
              const text = `${supabaseError.message || ''} ${supabaseError.details || ''} ${supabaseError.hint || ''}`.toLowerCase();
              return supabaseError.code === 'PGRST204' || (text.includes('schema cache') && text.includes('column'));
            };
            const logSavingsSaveError = (error: unknown, payload: Record<string, unknown>) => {
              if (process.env.NODE_ENV !== 'development') return;
              const supabaseError = error && typeof error === 'object'
                ? error as { code?: string; message?: string; details?: string; hint?: string }
                : {};
              console.error('[Savings] Failed to save saving', {
                code: supabaseError.code,
                message: supabaseError.message,
                details: supabaseError.details,
                hint: supabaseError.hint,
                payload,
              });
            };
            const savingsErrorMessage = (error: unknown) => {
              if (!error || typeof error !== 'object') return t('savings_error_unknown');
              const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };
              const text = `${supabaseError.code || ''} ${supabaseError.message || ''} ${supabaseError.details || ''} ${supabaseError.hint || ''}`.toLowerCase();
              if (text.includes('permission') || text.includes('row-level') || text.includes('rls') || text.includes('42501') || text.includes('not authorized')) return t('savings_error_permission');
              if (text.includes('auth') || text.includes('jwt') || text.includes('session')) return t('savings_error_auth_required');
              return t('savings_error_unknown');
            };
            if (process.env.NODE_ENV === 'development') {
              console.info('[Savings] Submit values', {
                rawForm: entryForm,
                normalized: normalizedSavingForm,
                validationErrors: savingFormErrors,
                payload: mode === 'create' ? createPayload : savingPayload,
              });
            }
            const adjustGoal = async (goalId: string | null | undefined, delta: number) => {
              if (!goalId || !Number.isFinite(delta) || delta === 0) return;
              let goalFetchResult = await supabase
                .from('financial_goals')
                .select('id,current_amount,saved_amount,progress_amount,notes')
                .eq('id', goalId)
                .eq('user_id', user.id)
                .maybeSingle();
              if (goalFetchResult.error && /saved_amount|progress_amount|notes|column|schema|PGRST/i.test(goalFetchResult.error.message)) {
                goalFetchResult = await supabase
                  .from('financial_goals')
                  .select('id,current_amount')
                  .eq('id', goalId)
                  .eq('user_id', user.id)
                  .maybeSingle();
              }
              const { data: goal, error: goalFetchError } = goalFetchResult;
              if (goalFetchError) throw goalFetchError;
              if (!goal) return;
              const currentProgress = calculateGoalProgress(goal as GoalRow);
              const nextAmount = Math.max(0, currentProgress.currentAmount + delta);
              let updateResult = await supabase
                .from('financial_goals')
                .update({ current_amount: nextAmount, saved_amount: nextAmount, progress_amount: nextAmount, updated_at: new Date().toISOString() })
                .eq('id', goalId)
                .eq('user_id', user.id);
              if (updateResult.error && /saved_amount|progress_amount|updated_at|column|schema|PGRST/i.test(updateResult.error.message)) {
                updateResult = await supabase
                  .from('financial_goals')
                  .update({ current_amount: nextAmount })
                  .eq('id', goalId)
                  .eq('user_id', user.id);
              }
              if (updateResult.error) throw updateResult.error;
              setSnapshot(prev => ({
                ...prev,
                goals: prev.goals.map(item => item.id === goalId ? { ...item, current_amount: nextAmount } : item),
              }));
            };

            if (mode === 'create') {
              let createResult = await supabase
                .from('savings_items')
                .insert(createPayload)
                .select('*')
                .single();
              if (createResult.error && isSchemaCacheColumnError(createResult.error)) {
                logSavingsSaveError(createResult.error, createPayload);
                const { created_at: _createdAt, updated_at: _updatedAt, ...schemaSafePayload } = createPayload;
                createResult = await supabase
                  .from('savings_items')
                  .insert(schemaSafePayload)
                  .select('*')
                  .single();
              }
              if (createResult.error) {
                logSavingsSaveError(createResult.error, createPayload);
                throw new Error(savingsErrorMessage(createResult.error));
              }
              void trackEvent('add_saving', { module: 'savings', metadata: { saving_type: normalizedSavingForm.savingType || normalizedSavingForm.savingMethod || 'general', linked_goal: Boolean(linkedGoalId) } });
              await adjustGoal(linkedGoalId, amount);
              applyEntryToSnapshot(kind, { ...createPayload, ...createResult.data } as MoneyItem, mode);
            } else {
              let updateResult = await supabase
                .from('savings_items')
                .update(savingPayload)
                .eq('id', id)
                .eq('user_id', user.id)
                .select('*')
                .single();
              if (updateResult.error && isSchemaCacheColumnError(updateResult.error)) {
                logSavingsSaveError(updateResult.error, savingPayload);
                const { updated_at: _updatedAt, ...schemaSafePayload } = savingPayload;
                updateResult = await supabase
                  .from('savings_items')
                  .update(schemaSafePayload)
                  .eq('id', id)
                  .eq('user_id', user.id)
                  .select('*')
                  .single();
              }
              if (updateResult.error) {
                logSavingsSaveError(updateResult.error, savingPayload);
                throw new Error(savingsErrorMessage(updateResult.error));
              }
              if (previous?.goal_id && previous.goal_id !== linkedGoalId) await adjustGoal(previous.goal_id, -Number(previous.amount || 0));
              const delta = amount - (previous?.goal_id === linkedGoalId ? Number(previous.amount || 0) : 0);
              await adjustGoal(linkedGoalId, delta);
              applyEntryToSnapshot(kind, { ...savingPayload, ...updateResult.data } as MoneyItem, mode);
            }
          } else
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
      setEntryForm(emptyEntryForm(currency || 'KWD'));
      showEntryMessage('ok', kind === 'savings' ? pick(savingModalText.success, lang) : mode === 'create' ? t('success') : t('updateSuccess'));
    } catch (err) {
      if (kind === 'savings') {
        if (process.env.NODE_ENV === 'development') console.error('[Savings] Save flow failed', err);
      } else {
        console.error(`[${kind}] Failed to save entry`, err);
      }
      showEntryMessage('err', kind === 'savings' ? err instanceof Error ? err.message : t('savings_error_unknown') : err instanceof Error ? err.message : t('error'));
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
        if (kind === 'savings') {
          try {
            await adjustLinkedSavingsGoal((confirmDelete as MoneyItem).goal_id, -Number(confirmDelete.amount || 0));
          } catch (goalError) {
            console.error('[savings] Failed to update linked goal after deleting saving', goalError);
          }
        }
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
      currentAmount: goal.current_amount === null || goal.current_amount === undefined ? '' : String(goal.current_amount),
      monthlyContribution: goal.monthly_contribution === null || goal.monthly_contribution === undefined ? '' : String(goal.monthly_contribution),
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
    const targetAmount = parseMoney(goalForm.targetAmount);
    const currentAmount = parseMoney(goalForm.currentAmount);
    const monthlyContribution = parseMoney(goalForm.monthlyContribution);

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
        title: name,
        name,
        amount: targetAmount,
        target_amount: targetAmount,
        current_amount: currentAmount,
        saved_amount: currentAmount,
        progress_amount: currentAmount,
        monthly_contribution: monthlyContribution,
        target_date: goalForm.deadline || null,
        currency: goalForm.currency || currency || 'KWD',
        duration: months ? String(months) : null,
        duration_unit: months ? 'month' : null,
        notes,
      };
      const compactPayload = {
        goal: payload.goal,
        amount: payload.amount,
        current_amount: payload.current_amount,
        duration: payload.duration,
        duration_unit: payload.duration_unit,
        notes: payload.notes,
      };
      const legacyPayload = {
        goal: payload.goal,
        amount: payload.amount,
        duration: payload.duration,
        duration_unit: payload.duration_unit,
        notes: payload.notes,
      };

      if (goalMode === 'create') {
        let insertResult = await supabase.from('financial_goals').insert({
          ...payload,
          user_id: user.id,
        }).select('*').single();
        if (insertResult.error && /title|name|target_amount|saved_amount|progress_amount|monthly_contribution|target_date|currency|column|schema|PGRST/i.test(insertResult.error.message)) {
          insertResult = await supabase.from('financial_goals').insert({
            ...compactPayload,
            user_id: user.id,
          }).select('*').single();
        }
        if (insertResult.error && /current_amount|column|schema|PGRST/i.test(insertResult.error.message)) {
          insertResult = await supabase.from('financial_goals').insert({
            ...legacyPayload,
            user_id: user.id,
          }).select('*').single();
        }
        const { data: created, error } = insertResult;
        if (error) throw error;
        void trackEvent('add_goal', { module: 'goals', metadata: { category: goalForm.category || 'general' } });
        setSnapshot(prev => ({
          ...prev,
          goals: [goalFromRow(created as GoalRow), ...prev.goals],
        }));
      } else {
        let updateResult = await supabase.from('financial_goals').update(payload).eq('id', goalForm.id).eq('user_id', user.id);
        if (updateResult.error && /title|name|target_amount|saved_amount|progress_amount|monthly_contribution|target_date|currency|column|schema|PGRST/i.test(updateResult.error.message)) {
          updateResult = await supabase.from('financial_goals').update(compactPayload).eq('id', goalForm.id).eq('user_id', user.id);
        }
        if (updateResult.error && /current_amount|column|schema|PGRST/i.test(updateResult.error.message)) {
          updateResult = await supabase.from('financial_goals').update(legacyPayload).eq('id', goalForm.id).eq('user_id', user.id);
        }
        const { error } = updateResult;
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

  async function deleteGoal() {
    if (!goalDeleteTarget || goalDeleting) return;

    if (!user?.id) {
      showEntryMessage('err', t('entry_auth_required'));
      return;
    }

    setGoalDeleting(true);
    const target = goalDeleteTarget;

    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', target.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSnapshot(prev => ({
        ...prev,
        goals: prev.goals.filter(goal => goal.id !== target.id),
      }));
      setGoalDeleteTarget(null);
      showEntryMessage('ok', t('goal_delete_success'));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        const supabaseError = error && typeof error === 'object'
          ? error as { code?: string; message?: string; details?: string; hint?: string }
          : {};
        console.error('[FinancialGoals] Failed to delete goal', {
          goalId: target.id,
          userId: user.id,
          code: supabaseError.code,
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
        });
      }
      showEntryMessage('err', t('goal_delete_error'));
    } finally {
      setGoalDeleting(false);
    }
  }

  useEffect(() => {
    if (!entryOpen && !confirmDelete && !goalEditOpen && !goalDeleteTarget && !receiptDetails) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEntryOpen(false);
        setConfirmDelete(null);
        setGoalEditOpen(false);
        setGoalDeleteTarget(null);
        setReceiptDetails(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [confirmDelete, entryOpen, goalDeleteTarget, goalEditOpen, receiptDetails]);

  useEffect(() => {
    const modalOpen = entryOpen || Boolean(confirmDelete) || goalEditOpen || Boolean(goalDeleteTarget) || Boolean(receiptDetails);
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmDelete, entryOpen, goalDeleteTarget, goalEditOpen, receiptDetails]);

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
        content: result.text || t('ai_fallback'),
      }]);
    } catch {
      setChatHistory([...nextHistory, {
        role: 'assistant',
        content: t('ai_unavailable'),
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

  const dataError = dataErrorCopy(snapshot.error, lang);

  if (kind === 'expenses') {
    const visibleExpenses = filteredExpenses.slice(0, visibleCount);
    const monthlyExpenses = expensePeriodExpenses;
    const monthlyExpenseRecords = expenseDisplayRecords;
    const monthlyTotal = expensePeriodTotal;
    const recurringTotal = monthlyExpenses
      .filter(item => isRecurringExpense(item) || isDebtInstallmentExpense(item))
      .reduce((sum, item) => sum + item.amount, 0) + missingScheduledDebtInstallmentsTotal;
    const monthlySubscriptionsTotal = monthlyExpenses.filter(isMonthlySubscriptionExpense).reduce((sum, item) => sum + item.amount, 0);
    const debtInstallmentsTotal = actualDebtInstallmentsTotal + missingScheduledDebtInstallmentsTotal;
    const fixedCommitmentsTotal = monthlySubscriptionsTotal + debtInstallmentsTotal;
    const expenseNow = new Date();
    const expenseYearOptions = Array.from({ length: 8 }, (_, index) => expenseNow.getFullYear() + 1 - index);
    const expenseMonthFormatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' });
    const expensePeriodEmptyTitle = expensePeriod.preset === 'all'
      ? expenseText('emptyTitle', lang)
      : selectedExpenseRange?.months === 1
        ? pick({ ar: 'لا توجد مصروفات في هذا الشهر', en: 'No expenses in this month', fr: 'Aucune dépense ce mois-ci' }, lang)
        : pick({ ar: 'لا توجد مصروفات في الفترة المحددة', en: 'No expenses in this period', fr: 'Aucune dépense sur cette période' }, lang);
    const expenseFilteredEmptyTitle = monthlyExpenseRecords.length > 0
      ? pick({ ar: 'لا توجد مصروفات مطابقة للفلاتر', en: 'No expenses match these filters', fr: 'Aucune dépense ne correspond aux filtres' }, lang)
      : expensePeriodEmptyTitle;
    const expenseEmptyBody = monthlyExpenseRecords.length > 0
      ? pick({ ar: 'جرّب تعديل البحث أو التصنيف أو طريقة الدفع داخل الفترة المحددة.', en: 'Try adjusting search, category, or payment filters inside this period.', fr: 'Ajustez la recherche, la catégorie ou le mode de paiement sur cette période.' }, lang)
      : pick({ ar: 'يمكنك إضافة مصروف جديد أو عرض كل المصروفات التاريخية بشكل صريح.', en: 'Add a new expense or explicitly switch to all historical expenses.', fr: 'Ajoutez une dépense ou affichez explicitement tout l’historique.' }, lang);
    const expenseTabs = [
      { id: 'overview', label: pick({ ar: 'نظرة عامة', en: 'Overview', fr: 'Aperçu' }, lang) },
      { id: 'records', label: pick({ ar: 'السجلات', en: 'Records', fr: 'Enregistrements' }, lang), count: monthlyExpenseRecords.length },
      { id: 'receipts', label: pick({ ar: 'الإيصالات', en: 'Receipts', fr: 'Reçus' }, lang), count: monthlyExpenseRecords.filter(item => item.receipt_image_url || item.receipt_file_name).length },
      { id: 'categories', label: pick({ ar: 'التصنيفات', en: 'Categories', fr: 'Catégories' }, lang) },
      { id: 'analytics', label: pick({ ar: 'التحليلات', en: 'Analytics', fr: 'Analyses' }, lang) },
      { id: 'reports', label: pick({ ar: 'التقارير', en: 'Reports', fr: 'Rapports' }, lang) },
    ];

    return (
      <div className="sfm-shell expense-smart-shell" dir={dir}>
        <Sidebar />
        <DashboardPageShell
          ariaLabel={expenseText('smartTitle', lang)}
          className="expense-smart-main"
          contentClassName="expense-smart-content"
        >
          <section className="expense-hero">
            <div>
              <span className="eyebrow"><Sparkles size={14} /> {expenseText('aiInsights', lang)}</span>
              <h1>{expenseText('smartTitle', lang)}</h1>
              <p>{expenseText('smartSubtitle', lang)}</p>
            </div>
            <div className="expense-hero-actions">
              <button type="button" className="primary-btn" onClick={openCreateEntry}>
                <Plus size={17} />
                {expenseText('addExpense', lang)}
              </button>
            </div>
          </section>

          {dataError && (
            <div className="notice data-error-notice">
              <strong>{dataError.title}</strong>
              <span>{dataError.body}</span>
              <small>{dataError.queryName}</small>
              <button type="button" onClick={() => window.location.reload()}>{isAr ? 'إعادة المحاولة' : lang === 'fr' ? 'Reessayer' : 'Retry'}</button>
            </div>
          )}

          <section className="expense-kpi-grid">
            {expenseSummaryCards.map(card => (
              <article key={pick(card.title, lang)} className="kpi-card">
                <span style={{ background: card.tone }} />
                <p>{pick(card.title, lang)}</p>
                <strong>{card.value}</strong>
                <small>{pick(card.body, lang)}</small>
              </article>
            ))}
            <article className="kpi-card expense-obligations-card">
              <span style={{ background: '#14B8A6' }} />
              <p>{pick({ ar: 'الاشتراكات وأقساط الديون', en: 'Subscriptions and debt payments', fr: 'Abonnements et mensualités' }, lang)}</p>
              <strong>{money(fixedCommitmentsTotal, lang, expenseBaseCurrency)}</strong>
              <small className="expense-obligation-lines">
                <span>
                  {pick({ ar: 'إجمالي الاشتراكات الشهرية', en: 'Total monthly subscriptions', fr: 'Total abonnements mensuels' }, lang)}
                  <b>{money(monthlySubscriptionsTotal, lang, expenseBaseCurrency)}</b>
                </span>
                <span>
                  {pick({ ar: 'إجمالي أقساط الديون', en: 'Total debt payments', fr: 'Total mensualités de dettes' }, lang)}
                  <b>{money(debtInstallmentsTotal, lang, expenseBaseCurrency)}</b>
                </span>
                <span>
                  {pick({ ar: 'إجمالي الاشتراكات + أقساط الديون', en: 'Subscriptions + debt payments', fr: 'Abonnements + mensualités' }, lang)}
                  <b>{money(fixedCommitmentsTotal, lang, expenseBaseCurrency)}</b>
                </span>
              </small>
            </article>
          </section>

          <PageTabs
            tabs={expenseTabs}
            active={expenseTab}
            onChange={id => setExpenseTab(id as ExpensePageTab)}
            ariaLabel={expenseText('smartTitle', lang)}
          />

          {expenseTab !== 'reports' ? (
          <section className="expense-dashboard-grid">
            <div className="panel expense-list-panel">
              <div className="panel-head">
                <div>
                  <p>{t('page_details')}</p>
                  <h3>{sectionTitle(kind, lang)}</h3>
                </div>
                {dataLoading && <span className="loading-pill">{t('loading')}</span>}
              </div>

              <div className="expense-period-panel">
                <div className="expense-period-head">
                  <div>
                    <span>{pick({ ar: 'اختر الشهر', en: 'Choose period', fr: 'Choisir la période' }, lang)}</span>
                    <strong>{expensePeriodBadge(expensePeriod, lang)}</strong>
                  </div>
                  <small>{pick({ ar: 'تتغير البطاقات والقائمة حسب الفترة المحددة فقط.', en: 'Cards and records update only for the selected period.', fr: 'Les cartes et la liste suivent uniquement la période choisie.' }, lang)}</small>
                </div>
                <div className="expense-period-options" role="group" aria-label={pick({ ar: 'اختر الشهر', en: 'Choose period', fr: 'Choisir la période' }, lang)}>
                  {EXPENSE_PERIOD_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className={expensePeriod.preset === preset ? 'active' : ''}
                      onClick={() => changeExpensePeriodPreset(preset)}
                    >
                      {expensePeriodOptionLabel(preset, lang)}
                    </button>
                  ))}
                </div>
                {expensePeriod.preset === 'custom' && (
                  <div className="expense-custom-period">
                    <label>
                      <span>{pick({ ar: 'الشهر', en: 'Month', fr: 'Mois' }, lang)}</span>
                      <select value={expensePeriod.month} onChange={event => changeCustomExpenseMonth({ month: Number(event.target.value) })}>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                          <option key={month} value={month}>{expenseMonthFormatter.format(startOfLocalMonth(expensePeriod.year, month))}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{pick({ ar: 'السنة', en: 'Year', fr: 'Année' }, lang)}</span>
                      <select value={expensePeriod.year} onChange={event => changeCustomExpenseMonth({ year: Number(event.target.value) })}>
                        {expenseYearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="row-controls">
                <input className="row-search" type="search" placeholder={t('search')} value={rowSearch} onChange={e => setRowSearch(e.target.value)} />
                <select className="row-select" value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)}>
                  <option value="all">{pick({ ar: 'كل التصنيفات', en: 'All categories', fr: 'Toutes les catégories' }, lang)}</option>
                  {EXPENSE_CATEGORIES.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}
                </select>
                <select className="row-select" value={expensePaymentFilter} onChange={e => setExpensePaymentFilter(e.target.value)}>
                  <option value="all">{pick({ ar: 'كل طرق الدفع', en: 'All payment methods', fr: 'Tous les modes de paiement' }, lang)}</option>
                  {PAYMENT_METHODS.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}
                </select>
                <select className="row-select" value={expenseTypeFilter} onChange={e => setExpenseTypeFilter(e.target.value)}>
                  {['all', 'personal', 'project', 'recurring', 'one_time'].map(type => <option key={type} value={type}>{expenseFilterTypeLabel(type, lang)}</option>)}
                </select>
                <select className="row-select" value={rowSort} onChange={e => setRowSort(e.target.value as typeof rowSort)}>
                  <option value="dateDesc">{t('sort_newest')}</option>
                  <option value="dateAsc">{t('sort_oldest')}</option>
                  <option value="amountDesc">{t('sort_highest')}</option>
                  <option value="amountAsc">{t('sort_lowest')}</option>
                </select>
              </div>

              <div className="expense-period-badge">{expensePeriodBadge(expensePeriod, lang)}</div>

              {dataLoading ? (
                <div className="expense-list-skeleton" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="expense-empty">
                  <div><Receipt size={34} /></div>
                  <h3>{expenseFilteredEmptyTitle}</h3>
                  <p>{expenseEmptyBody}</p>
                  <div>
                    <button type="button" className="primary-btn" onClick={openCreateEntry}>{expenseText('addExpense', lang)}</button>
                    {expensePeriod.preset !== 'all' && (
                      <button type="button" className="ghost-btn" onClick={() => changeExpensePeriodPreset('all')}>
                        {expensePeriodOptionLabel('all', lang)}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="row-count">
                    {isAr
                      ? `يعرض ${Math.min(visibleCount, filteredExpenses.length)} من ${filteredExpenses.length}`
                      : `Showing ${Math.min(visibleCount, filteredExpenses.length)} of ${filteredExpenses.length}`}
                    {' · '}
                    {money(filteredExpenses.reduce((s, item) => s + item.amount, 0), lang, expenseBaseCurrency)}
                  </div>
                  <div className="expense-card-list">
                    {visibleExpenses.map(item => {
                      const hasReceipt = Boolean(item.receipt_image_url || item.receipt_file_name);
                      const aiAdded = Boolean(item.ai_extracted_data || item.ai_confidence_score);
                      const projectLinked = isProjectLinkedExpenseRow(item);
                      const scheduledDebtRow = isScheduledDebtDisplayExpense(item);
                      const originalCurrency = item.original_currency || item.currency || expenseBaseCurrency;
                      const originalAmount = Number(item.original_amount ?? item.amount ?? 0);
                      const showConvertedAmount = Boolean(item.amount_is_converted && originalCurrency !== expenseBaseCurrency);
                      return (
                        <article className="expense-card-row" key={item.id}>
                          <div className="expense-row-main">
                            <div className="expense-row-icon"><ReceiptText size={19} /></div>
                            <div>
                              <strong>{item.name.replace(/^خيرية:\d{4}-\d{2}:/, '')}</strong>
                              <span>{expenseDisplayDate(item)} · {paymentLabel(item.payment_method, lang)}</span>
                              <div className="expense-badges">
                                {projectLinked && <em className="project">{projectExpenseLabel(lang)}</em>}
                                <em>{categoryLabel(normalizedExpenseCategory(item), lang)}</em>
                                {scheduledDebtRow && <em className="ok">{pick({ ar: 'قسط دين مجدول', en: 'Scheduled debt payment', fr: 'Mensualite planifiee' }, lang)}</em>}
                                <em className={hasReceipt ? 'ok' : ''}>{hasReceipt ? expenseText('hasReceipt', lang) : expenseText('noReceipt', lang)}</em>
                                {aiAdded && <em className="ai">{expenseText('aiAdded', lang)}</em>}
                              </div>
                            </div>
                          </div>
                          <div className="expense-row-actions">
                            <div className="expense-row-amount">
                              <b>{money(item.amount, lang, expenseBaseCurrency)}</b>
                              {showConvertedAmount && (
                                <small dir="ltr">
                                  {money(originalAmount, lang, originalCurrency)} = {money(item.amount, lang, expenseBaseCurrency)}
                                </small>
                              )}
                            </div>
                            <div>
                              {hasReceipt && (
                                <button type="button" className="row-action" onClick={() => setReceiptDetails(item)} aria-label={expenseText('viewReceipt', lang)} title={expenseText('viewReceipt', lang)}>
                                  <Eye size={15} />
                                </button>
                              )}
                              {!scheduledDebtRow && (
                                <>
                                  <button type="button" className="row-action" onClick={() => openEditEntry(item)} aria-label={t('edit')} title={t('edit')}>
                                    <Edit3 size={15} />
                                  </button>
                                  <button type="button" className="row-action" onClick={() => setConfirmDelete(item)} aria-label={t('delete')} title={t('delete')}>
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {filteredExpenses.length > visibleCount && (
                    <button type="button" className="load-more-btn" onClick={() => setVisibleCount(v => v + EXPENSE_PAGE_SIZE)}>
                      {t('load_more').replace('{n}', String(filteredExpenses.length - visibleCount))}
                    </button>
                  )}
                </>
              )}
            </div>

            <aside className="expense-side-stack">
              <section className="panel">
                <div className="panel-head compact">
                  <div>
                    <p>{expenseText('aiInsights', lang)}</p>
                    <h3>{t('suggestions_now')}</h3>
                  </div>
                  <Bot size={21} />
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
              </section>
              <section className="panel monthly-panel">
                <div className="panel-head compact">
                  <div>
                    <p>{expenseText('monthlySummary', lang)}</p>
                    <h3>{money(monthlyTotal, lang, expenseBaseCurrency)}</h3>
                    <small>{expensePeriodLabel(expensePeriod, lang)}</small>
                  </div>
                  <ChartPie size={21} />
                </div>
                <div className="monthly-grid">
                  <div><span>{pick({ ar: 'الفترة', en: 'Period', fr: 'Période' }, lang)}</span><b>{monthlyExpenseRecords.length}</b></div>
                  <div><span>{expenseText('hasReceipt', lang)}</span><b>{monthlyExpenseRecords.filter(item => item.receipt_image_url || item.receipt_file_name).length}</b></div>
                  <div><span>{expenseText('aiAdded', lang)}</span><b>{monthlyExpenseRecords.filter(item => item.ai_extracted_data || item.ai_confidence_score).length}</b></div>
                  <div><span>{pick({ ar: 'المتكرر', en: 'Recurring', fr: 'Recurrent' }, lang)}</span><b>{money(recurringTotal, lang, expenseBaseCurrency)}</b></div>
                </div>
              </section>
            </aside>
          </section>
          ) : (
            <section className="panel expense-report-shortcut">
              <div className="panel-head compact">
                <div>
                  <p>{pick({ ar: 'مركز التقارير', en: 'Reports Center', fr: 'Centre des rapports' }, lang)}</p>
                  <h3>{pick({ ar: 'تقارير المصروفات', en: 'Expense Reports', fr: 'Rapports de dépenses' }, lang)}</h3>
                </div>
                <Printer size={21} />
              </div>
              <p>{summaryText(kind, dashboardData, lang, currency)}</p>
              <button type="button" className="primary-btn" onClick={() => router.push('/reports-center')}>
                <Download size={16} />
                {pick({ ar: 'فتح مركز التقارير', en: 'Open Reports Center', fr: 'Ouvrir le centre des rapports' }, lang)}
              </button>
            </section>
          )}

          <button type="button" className="expense-floating-add" onClick={openCreateEntry} aria-label={expenseText('addExpense', lang)}>
            <Plus size={22} />
          </button>
        </DashboardPageShell>

        {entryOpen && (
          <div className="entry-overlay expense-modal-overlay" role="presentation" onMouseDown={() => setEntryOpen(false)}>
            <div className="entry-modal expense-smart-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{entryMode === 'edit' ? t('update') : expenseText('addExpense', lang)}</p>
                  <h3 id="expense-modal-title">{expenseModalMode === 'scan' ? expenseText('scanTab', lang) : expenseText('manualTab', lang)}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setEntryOpen(false)} aria-label={t('close')}><X size={18} /></button>
              </div>

              <div className="expense-modal-tabs">
                <button type="button" className={expenseModalMode === 'manual' ? 'active' : ''} onClick={() => setExpenseModalMode('manual')}>{expenseText('manualTab', lang)}</button>
                <button type="button" className={expenseModalMode === 'scan' ? 'active' : ''} onClick={() => setExpenseModalMode('scan')}>{expenseText('scanTab', lang)}</button>
              </div>

              <form className="entry-form expense-form-grid" onSubmit={saveExpense}>
                {expenseModalMode === 'scan' && (
                  <div className="receipt-scan-area">
                    <label className="receipt-drop" aria-label={expenseText('uploadReceipt', lang)}>
                      <input ref={receiptInputRef} type="file" accept="image/*,.pdf,application/pdf" multiple aria-label={expenseText('uploadReceipt', lang)} onChange={event => handleExpenseFiles(event.target.files)} />
                      {receiptFiles.length ? (
                        <div className="receipt-preview-grid">
                          {receiptFiles.map(({ file, previewUrl }) => (
                            <div key={`${file.name}-${file.size}`}>
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewUrl} alt={file.name} />
                              ) : <ReceiptText size={28} />}
                              <small>{file.name}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="receipt-drop-copy">
                          <Upload size={30} />
                          <strong>{expenseText('uploadTitle', lang)}</strong>
                          <small>{expenseText('uploadOptionalHint', lang)}</small>
                          <small>{expenseText('chooseImages', lang)}</small>
                        </span>
                      )}
                    </label>
                    {!!receiptFiles.length && (
                      <div className="receipt-selected-count">
                        {selectedReceiptsLabel(receiptFiles.length, lang)}
                      </div>
                    )}
                    <div className="receipt-scan-actions">
                      {!!receiptFiles.length && (
                        <>
                          <button type="button" className="ghost-form-btn" onClick={() => receiptInputRef.current?.click()}>{expenseText('changeImage', lang)}</button>
                          <button type="button" className="ghost-form-btn danger-soft" onClick={() => handleExpenseFile(null)}>{expenseText('removeReceipt', lang)}</button>
                        </>
                      )}
                      {receiptFiles.length <= 1 ? (
                        <button type="button" className="primary-form-btn" onClick={() => void analyzeReceipt()} disabled={receiptAnalyzing || !expenseForm.receiptFile}>
                          {receiptAnalyzing ? <RefreshCw size={15} className="spin-icon" /> : <Sparkles size={15} />}
                          {receiptAnalyzing ? expenseText('reading', lang) : expenseText('analyze', lang)}
                        </button>
                      ) : (
                        <button type="button" className="primary-form-btn" onClick={() => void analyzeAllReceipts()} disabled={receiptAnalyzing || !receiptFiles.length}>
                          {receiptAnalyzing ? <RefreshCw size={15} className="spin-icon" /> : <Sparkles size={15} />}
                          {receiptAnalyzing ? expenseText('readingAll', lang) : expenseText('analyzeAll', lang)}
                        </button>
                      )}
                    </div>
                    {receiptBatchProgress && <div className="receipt-selected-count">{receiptBatchProgress}</div>}
                    {receiptError && (
                      <div className={`receipt-error ${isReceiptProviderUnavailable(receiptDebug?.errorSource, undefined, receiptError) ? 'provider-unavailable' : ''}`} role={isReceiptProviderUnavailable(receiptDebug?.errorSource, undefined, receiptError) ? 'status' : 'alert'}>
                        {isReceiptProviderUnavailable(receiptDebug?.errorSource, undefined, receiptError) ? (
                          <>
                            <strong>{expenseText('providerUnavailableTitle', lang)}</strong>
                            <span>{expenseText('providerUnavailable', lang)}</span>
                            {receiptProviderDebugDetail(receiptDebug, lang) && (
                              <small>{receiptProviderDebugDetail(receiptDebug, lang)}</small>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>{expenseText('scanFailedTitle', lang)}</strong>
                            <span>{receiptError}</span>
                            <small>{expenseText('scanFailedManualHint', lang)}</small>
                          </>
                        )}
                      </div>
                    )}
                    {process.env.NODE_ENV !== 'production' && receiptDebug && (
                      <div className="receipt-debug-panel" role="status">
                        <strong>{pick({ ar: 'تشخيص التحليل', en: 'Scan debug', fr: 'Diagnostic du scan' }, lang)}</strong>
                        <span>{pick({ ar: 'المرحلة', en: 'Stage', fr: 'Étape' }, lang)}: {receiptDebug.stage || '-'}</span>
                        <span>{expenseText('providerUsed', lang)}: {receiptProviderLabel(receiptDebug.provider, lang)}</span>
                        <span>{pick({ ar: 'المزوّد', en: 'Provider', fr: 'Fournisseur' }, lang)}: {(receiptDebug.providerConfigured || receiptDebug.googleConfigured || receiptDebug.openaiConfigured) ? pick({ ar: 'مُعد', en: 'configured', fr: 'configuré' }, lang) : pick({ ar: 'غير مُعد', en: 'missing', fr: 'manquant' }, lang)}</span>
                        <span>{pick({ ar: 'طول النص', en: 'Text length', fr: 'Longueur du texte' }, lang)}: {receiptDebug.rawTextLength ?? 0}</span>
                        <span>{pick({ ar: 'المبالغ', en: 'Candidates', fr: 'Candidats' }, lang)}: {receiptDebug.candidateCount ?? 0}</span>
                        <span>{pick({ ar: 'المبلغ المختار', en: 'Selected amount', fr: 'Montant choisi' }, lang)}: {receiptDebug.selectedAmount ?? '-'}</span>
                        <span>{pick({ ar: 'الثقة', en: 'Confidence', fr: 'Confiance' }, lang)}: {receiptDebug.confidence || '-'}</span>
                        {receiptDebug.errorSource && <span>{pick({ ar: 'مصدر الخطأ', en: 'Error source', fr: 'Source d’erreur' }, lang)}: {receiptDebug.errorSource}</span>}
                      </div>
                    )}
                    {!!pendingReceiptExpenses.length && (
                      <div className="receipt-batch-review">
                        <div className="receipt-batch-head">
                          <button type="button" className="ghost-form-btn" onClick={() => setPendingReceiptExpenses(prev => prev.map(item => ({ ...item, selected: true })))}>{expenseText('selectAll', lang)}</button>
                          <button type="button" className="primary-form-btn" onClick={() => void savePendingReceiptExpenses(true)} disabled={entrySaving}>{expenseText('confirmSelected', lang)}</button>
                          <button type="button" className="primary-form-btn" onClick={() => void savePendingReceiptExpenses(false)} disabled={entrySaving}>{expenseText('confirmAll', lang)}</button>
                        </div>
                        {pendingReceiptExpenses.map(item => (
                          <div key={item.id} className={`receipt-review-card ${item.status}`}>
                            <label className="receipt-review-select">
                              <input type="checkbox" checked={item.selected} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, selected: event.target.checked } : row))} />
                              <span>{item.status === 'ready' ? expenseText('ready', lang) : item.status === 'review' ? expenseText('needsReview', lang) : expenseText('failed', lang)}</span>
                            </label>
                            <div className="receipt-review-body">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.previewUrl} alt={item.fileName} />
                              ) : <ReceiptText size={34} />}
                              <div className="receipt-review-fields">
                                <input value={item.name} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, name: event.target.value } : row))} />
                                <input inputMode="decimal" value={item.amount} placeholder={expenseText('amount', lang)} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, amount: event.target.value, status: Number(event.target.value) > 0 && row.status === 'failed' ? 'review' : row.status } : row))} />
                                <input type="date" value={item.date} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, date: event.target.value } : row))} />
                                <select value={item.category} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, category: event.target.value } : row))}>{EXPENSE_CATEGORIES.map(category => <option key={category.id} value={category.id}>{pick(category.label, lang)}</option>)}</select>
                                <select value={item.paymentMethod} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, paymentMethod: event.target.value } : row))}>{PAYMENT_METHODS.map(method => <option key={method.id} value={method.id}>{pick(method.label, lang)}</option>)}</select>
                              </div>
                            </div>
                            <div className="receipt-review-meta">
                              <span>{expenseText('confidence', lang)}: {Math.round(item.aiConfidenceScore * 100)}%</span>
                              {item.error && <span>{item.error}</span>}
                            </div>
                            <div className="receipt-scan-actions">
                              <button type="button" className="ghost-form-btn" onClick={() => setPendingReceiptExpenses(prev => prev.filter(row => row.id !== item.id))}>{expenseText('removeReceipt', lang)}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {expenseForm.aiExtractedData && (
                      <div className="ai-result-card">
                        <div>
                          <CheckCircle2 size={18} />
                          <strong>{expenseText('scanReviewTitle', lang)}</strong>
                          <span className="extracted-field-badge">{expenseText('extractedBadge', lang)}</span>
                          <span className="extracted-field-badge">{receiptProviderLabel(expenseForm.aiExtractedData.provider, lang)}</span>
                          <span className="extracted-field-badge">{receiptConfidenceLabel(expenseForm.aiExtractedData.confidenceLevel, lang)}</span>
                        </div>
                        <p>{receiptConfidenceMessage(expenseForm.aiExtractedData, lang) || expenseText('review', lang)}</p>
                        {!!validReceiptCandidates(expenseForm.aiExtractedData).length && (
                          <div className="receipt-candidate-panel" aria-label={expenseText('amountCandidates', lang)}>
                            <strong>{expenseText('chooseAmount', lang)}</strong>
                            <div>
                              {validReceiptCandidates(expenseForm.aiExtractedData).map(candidate => {
                                const amount = receiptCandidateAmount(candidate);
                                const currentAmount = parseMoney(expenseForm.amount);
                                const active = amount > 0 && Boolean(currentAmount) && Math.abs(amount - currentAmount) < 0.01;
                                const formattedAmount = `${candidate.amount < 0 ? '-' : ''}${money(amount, lang, candidate.currency || expenseForm.currency || currency || 'KWD')}`;
                                return (
                                  <button
                                    key={`${candidate.kind || candidate.label}-${candidate.amount}-${candidate.source || ''}`}
                                    type="button"
                                    className={active ? 'active' : ''}
                                    onClick={() => applyReceiptCandidate(candidate)}
                                  >
                                    <span>{receiptCandidateLabel(candidate, lang)}</span>
                                    <b>{formattedAmount}</b>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <dl>
                          <dt>{expenseText('merchant', lang)}</dt><dd>{expenseForm.aiExtractedData.description || expenseForm.aiExtractedData.merchantName || expenseForm.name || '-'}</dd>
                          <dt>{expenseText('amount', lang)}</dt><dd>{expenseForm.amount ? money(Number(expenseForm.amount), lang, expenseForm.currency || currency) : '-'}</dd>
                          <dt>{expenseText('currency', lang)}</dt><dd>{expenseForm.currency || expenseForm.aiExtractedData.currency || currency || 'KWD'}</dd>
                          <dt>{expenseText('providerUsed', lang)}</dt><dd>{receiptProviderLabel(expenseForm.aiExtractedData.provider, lang)}</dd>
                          <dt>{expenseText('date', lang)}</dt><dd>{expenseForm.date}</dd>
                          <dt>{expenseText('suggestedCategory', lang)}</dt><dd>{categoryLabel(expenseForm.category, lang)}</dd>
                          <dt>{expenseText('tax', lang)}</dt><dd>{expenseForm.aiExtractedData.taxAmount ? money(expenseForm.aiExtractedData.taxAmount, lang, expenseForm.currency || currency) : '-'}</dd>
                          <dt>{expenseText('discount', lang)}</dt><dd>{expenseForm.aiExtractedData.discountAmount ? money(Math.abs(expenseForm.aiExtractedData.discountAmount), lang, expenseForm.currency || currency) : '-'}</dd>
                          <dt>{expenseText('invoiceNumber', lang)}</dt><dd>{expenseForm.aiExtractedData.invoiceNumber || '-'}</dd>
                          <dt>{expenseText('confidence', lang)}</dt><dd>{Math.round((expenseForm.aiConfidenceScore || expenseForm.aiExtractedData.confidenceScore || 0.82) * 100)}%</dd>
                        </dl>
                        <div className="receipt-scan-actions">
                          <button type="submit" className="primary-form-btn">{expenseText('confirmOnly', lang)}</button>
                          <button type="button" className="ghost-form-btn" onClick={() => setExpenseModalMode('manual')}>{expenseText('editData', lang)}</button>
                          <button type="button" className="ghost-form-btn" onClick={() => void analyzeReceipt()}>{expenseText('reanalyze', lang)}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label><span>{expenseText('name', lang)}</span><input value={expenseForm.name} onChange={event => setExpenseForm(prev => ({ ...prev, name: event.target.value }))} autoFocus /></label>
                <label><span>{expenseText('amount', lang)}</span><input inputMode="decimal" value={expenseForm.amount} onChange={event => setExpenseForm(prev => ({ ...prev, amount: event.target.value }))} /></label>
                <label><span>{expenseText('currency', lang)}</span><CurrencySelect value={expenseForm.currency || currency || 'KWD'} onChange={code => setExpenseForm(prev => ({ ...prev, currency: code }))} lang={lang} ariaLabel={expenseText('currency', lang)} /></label>
                <label><span>{expenseText('category', lang)}</span><select value={expenseForm.category} onChange={event => setExpenseForm(prev => ({ ...prev, category: event.target.value }))}>{EXPENSE_CATEGORIES.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}</select></label>
                <label><span>{expenseText('date', lang)}</span><input type="date" value={expenseForm.date} onChange={event => setExpenseForm(prev => ({ ...prev, date: event.target.value }))} /></label>
                <label><span>{expenseText('paymentMethod', lang)}</span><select value={expenseForm.paymentMethod} onChange={event => setExpenseForm(prev => ({ ...prev, paymentMethod: event.target.value }))}>{PAYMENT_METHODS.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}</select></label>
                {expenseModalMode === 'manual' && (
                  <label className="receipt-attach-card">
                    <input type="file" accept="image/*,application/pdf" capture="environment" aria-label={expenseText('attachReceipt', lang)} onChange={event => handleExpenseFile(event.target.files?.[0] || null)} />
                    <span className="receipt-attach-icon"><Upload size={20} /></span>
                    <span className="receipt-attach-copy">
                      <strong>{expenseText('attachReceipt', lang)}</strong>
                      <small>{expenseText('uploadOptionalHint', lang)}</small>
                      {expenseForm.receiptFileName && <em>{expenseForm.receiptFileName}</em>}
                    </span>
                  </label>
                )}
                <label className="expense-notes"><span>{expenseText('notes', lang)}</span><textarea value={expenseForm.notes} onChange={event => setExpenseForm(prev => ({ ...prev, notes: event.target.value }))} /></label>

                <div className="entry-actions expense-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setEntryOpen(false)} disabled={entrySaving}>{t('cancel')}</button>
                  <button type="submit" className="primary-form-btn" disabled={entrySaving}>
                    {entrySaving ? t('saving') : expenseModalMode === 'scan' ? expenseText(expenseForm.receiptFile || expenseForm.receiptImageUrl ? 'saveWithAttachment' : 'saveManual', lang) : expenseText('confirmAdd', lang)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {receiptDetails && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setReceiptDetails(null)}>
            <div className="entry-modal receipt-details-modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div><p>{expenseText('extractedData', lang)}</p><h3>{expenseText('receiptDetails', lang)}</h3></div>
                <button type="button" className="icon-btn" onClick={() => setReceiptDetails(null)} aria-label={t('close')}><X size={18} /></button>
              </div>
              {receiptDetails.receipt_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="receipt-detail-image" src={receiptDetails.receipt_image_url} alt={expenseText('originalImage', lang)} />
              )}
              <div className="receipt-detail-grid">
                <div><span>{expenseText('merchant', lang)}</span><b>{receiptDetails.ai_extracted_data?.description || receiptDetails.ai_extracted_data?.merchantName || receiptDetails.name}</b></div>
                <div><span>{expenseText('amount', lang)}</span><b>{money(receiptDetails.amount, lang, currency)}</b></div>
                <div><span>{expenseText('date', lang)}</span><b>{receiptDetails.date || '-'}</b></div>
                <div><span>{expenseText('category', lang)}</span><b>{categoryLabel(receiptDetails.category, lang)}</b></div>
                <div><span>{expenseText('confidence', lang)}</span><b>{receiptDetails.ai_confidence_score ? `${Math.round(receiptDetails.ai_confidence_score * 100)}%` : '-'}</b></div>
              </div>
              {!!receiptDetails.ai_extracted_data?.items?.length && (
                <div className="receipt-items">
                  <strong>{expenseText('receiptItems', lang)}</strong>
                  {receiptDetails.ai_extracted_data.items.map((item, index) => <span key={`${item.name}-${index}`}>{item.name}<b>{money(normalizeReceiptNumber(item.total) ?? normalizeReceiptNumber(item.price) ?? 0, lang, currency)}</b></span>)}
                </div>
              )}
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => { openEditEntry(receiptDetails); setReceiptDetails(null); }}>{t('edit')}</button>
                <button type="button" className="danger-form-btn" onClick={() => { setConfirmDelete(receiptDetails); setReceiptDetails(null); }}>{t('delete')}</button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setConfirmDelete(null)}>
            <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onMouseDown={event => event.stopPropagation()}>
              <div className="confirm-icon"><Trash2 size={24} /></div>
              <h3 id="confirm-delete-title">{t('confirmDelete')}</h3>
              <p>{t(deleteConfirmKey(kind))}</p>
              <small>{t('deleteWarning')}</small>
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => setConfirmDelete(null)} disabled={entrySaving}>{t('cancel')}</button>
                <button type="button" className="danger-form-btn" onClick={() => void deleteEntry()} disabled={entrySaving}>{entrySaving ? t('saving') : t('delete')}</button>
              </div>
            </div>
          </div>
        )}

        {entryMessage && <div className={`entry-toast ${entryMessage.type}`}>{entryMessage.text}</div>}
        <style>{baseStyles + expenseSmartStyles}</style>
      </div>
    );
  }

  const savingsGuide = kind === 'savings' ? {
    eyebrow: pick({ ar: 'دليل عملي', en: 'Practical guide', fr: 'Guide pratique' }, lang),
    title: pick({ ar: 'كل ما تحتاج معرفته عن الادخار', en: 'Everything you need to know about saving', fr: 'Tout savoir sur l epargne' }, lang),
    subtitle: pick({
      ar: 'تعرف على أنواع الادخار، لماذا تدخر، متى تستخدم كل نوع، وكيف تحول الادخار إلى عادة شهرية واضحة.',
      en: 'Learn the saving types, why saving matters, when to use each type, and how to turn it into a clear monthly habit.',
      fr: 'Decouvrez les types d epargne, pourquoi epargner, quand utiliser chaque type et comment en faire une habitude mensuelle claire.',
    }, lang),
    cards: [
      {
        icon: PiggyBank,
        title: pick({ ar: 'أنواع الادخار', en: 'Saving types', fr: 'Types d epargne' }, lang),
        body: pick({
          ar: 'قسّم ادخارك حسب الهدف والمدة حتى تعرف أين تضع كل مبلغ.',
          en: 'Split your savings by goal and timeline so every amount has a clear place.',
          fr: 'Separez votre epargne par objectif et par duree pour donner une place claire a chaque montant.',
        }, lang),
        points: [
          pick({ ar: 'ادخار الطوارئ: 3 إلى 6 أشهر من المصروفات الأساسية.', en: 'Emergency saving: 3 to 6 months of essential expenses.', fr: 'Epargne d urgence: 3 a 6 mois de depenses essentielles.' }, lang),
          pick({ ar: 'ادخار الأهداف: سفر، سيارة، تعليم، أو دفعة أولى.', en: 'Goal saving: travel, car, education, or a down payment.', fr: 'Epargne objectif: voyage, voiture, education ou apport initial.' }, lang),
          pick({ ar: 'ادخار قصير الأجل: احتياجات خلال سنة.', en: 'Short-term saving: needs within one year.', fr: 'Epargne court terme: besoins dans l annee.' }, lang),
          pick({ ar: 'ادخار طويل الأجل: استقرار ورأس مال للمستقبل.', en: 'Long-term saving: stability and future capital.', fr: 'Epargne long terme: stabilite et capital futur.' }, lang),
        ],
      },
      {
        icon: ShieldCheck,
        title: pick({ ar: 'لماذا الادخار؟', en: 'Why save?', fr: 'Pourquoi epargner ?' }, lang),
        body: pick({
          ar: 'الادخار يعطيك مساحة أمان ويقلل ضغط القرارات المفاجئة.',
          en: 'Saving gives you a safety buffer and reduces pressure during sudden decisions.',
          fr: 'L epargne cree une marge de securite et reduit la pression des decisions soudaines.',
        }, lang),
        points: [
          pick({ ar: 'يحميك من الطوارئ بدون الاعتماد على الدين.', en: 'It protects you from emergencies without relying on debt.', fr: 'Elle protege des urgences sans dependre de la dette.' }, lang),
          pick({ ar: 'يساعدك على الوصول للأهداف بدون ضغط كبير.', en: 'It helps you reach goals with less pressure.', fr: 'Elle aide a atteindre les objectifs avec moins de pression.' }, lang),
          pick({ ar: 'يعطيك حرية أكبر عند ظهور فرصة مناسبة.', en: 'It gives you more freedom when an opportunity appears.', fr: 'Elle donne plus de liberte lorsqu une opportunite arrive.' }, lang),
        ],
      },
      {
        icon: Target,
        title: pick({ ar: 'أسباب الادخار', en: 'Reasons to save', fr: 'Raisons d epargner' }, lang),
        body: pick({
          ar: 'كل مبلغ ادخار يجب أن يكون له سبب واضح حتى لا يضيع مع المصاريف اليومية.',
          en: 'Every saved amount should have a clear reason so it does not disappear into daily spending.',
          fr: 'Chaque montant epargne doit avoir une raison claire pour ne pas se perdre dans les depenses quotidiennes.',
        }, lang),
        points: [
          pick({ ar: 'صندوق طوارئ للأسرة أو العمل.', en: 'A family or work emergency fund.', fr: 'Un fonds d urgence familial ou professionnel.' }, lang),
          pick({ ar: 'مصاريف موسمية مثل السفر، الدراسة، أو التأمين.', en: 'Seasonal costs such as travel, school, or insurance.', fr: 'Depenses saisonnieres comme voyage, etudes ou assurance.' }, lang),
          pick({ ar: 'تجهيز رأس مال للاستثمار أو مشروع صغير.', en: 'Preparing capital for investing or a small project.', fr: 'Preparer un capital pour investir ou lancer un petit projet.' }, lang),
        ],
      },
      {
        icon: CheckCircle2,
        title: pick({ ar: 'طريقة الادخار', en: 'How to save', fr: 'Comment epargner' }, lang),
        body: pick({
          ar: 'ابدأ بخطة بسيطة ثم راقبها شهرياً. المهم هو الاستمرار وليس حجم المبلغ فقط.',
          en: 'Start with a simple plan and review it monthly. Consistency matters as much as the amount.',
          fr: 'Commencez par un plan simple et revisez le chaque mois. La regularite compte autant que le montant.',
        }, lang),
        points: [
          pick({ ar: 'حدد هدفاً ومبلغاً وموعداً للوصول.', en: 'Set a goal, amount, and target date.', fr: 'Fixez un objectif, un montant et une date cible.' }, lang),
          pick({ ar: 'حوّل مبلغ الادخار بعد الراتب مباشرة.', en: 'Move the saving amount right after income arrives.', fr: 'Transferez le montant juste apres le revenu.' }, lang),
          pick({ ar: 'افصل حساب الادخار عن حساب المصروفات.', en: 'Separate savings from daily spending accounts.', fr: 'Separez l epargne du compte de depenses.' }, lang),
        ],
      },
    ],
    stepsTitle: pick({ ar: 'خطة بداية سريعة', en: 'Quick start plan', fr: 'Plan de demarrage rapide' }, lang),
    steps: [
      pick({ ar: 'احسب مصروفاتك الأساسية للشهر.', en: 'Calculate your essential monthly expenses.', fr: 'Calculez vos depenses essentielles mensuelles.' }, lang),
      pick({ ar: 'اختر نسبة واقعية من الدخل، مثل 10% أو 15%.', en: 'Choose a realistic income share, such as 10% or 15%.', fr: 'Choisissez une part realiste du revenu, comme 10% ou 15%.' }, lang),
      pick({ ar: 'سجل كل عملية ادخار في THE SFM لمتابعة التقدم.', en: 'Record every saving entry in THE SFM to track progress.', fr: 'Enregistrez chaque epargne dans THE SFM pour suivre le progres.' }, lang),
      pick({ ar: 'راجع الخطة نهاية كل شهر وزد المبلغ تدريجياً عند القدرة.', en: 'Review the plan monthly and increase the amount gradually when possible.', fr: 'Revisez le plan chaque mois et augmentez progressivement si possible.' }, lang),
    ],
  } : null;

  return (
    <div className={`sfm-shell${kind === 'savings' ? ' savings-shell' : ''}`} dir={dir}>
      <Sidebar />

      <main className={`sfm-main${kind === 'reports' ? ' reports-main' : ''}${kind === 'savings' ? ' savings-main' : ''}${kind === 'goals' ? ' goals-main' : ''}`}>
        <header className="sfm-header">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="title-wrap">
            <div className="title-icon" style={{ '--accent': meta.accent } as CSSProperties}>
              <Icon size={22} />
            </div>
            <div>
              <p>{t('route_breadcrumb')}</p>
              <h1>{pick(meta.title, lang)}</h1>
            </div>
          </div>
          <div className="finance-header-lang">
            <LanguageSwitcher variant="gold" compact />
          </div>
          {isGuest && <span className="guest-pill">{t('guest_mode')}</span>}
        </header>

        {menuOpen && (
          <div className="mobile-panel">
            <div className="mobile-head">
              <span className="mobile-brand">
                <Image src="/sfm-logo.png" alt="THE SFM" width={32} height={32} priority className="sfm-brand-mark sfm-brand-mark--header" />
                <strong>THE SFM</strong>
              </span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <X size={19} />
              </button>
            </div>
            {navItems.map(item => {
              const NavIcon = item.icon;
              return (
                <button key={item.href} onClick={() => { setMenuOpen(false); router.push(item.href); }}>
                  <NavIcon size={18} />
                  {pick(item.label, lang)}
                </button>
              );
            })}
          </div>
        )}

        <section className="hero">
          <div>
            <span className="eyebrow">{t('active_route')}</span>
            <h2>{pick(meta.title, lang)}</h2>
            <p>{pick(meta.subtitle, lang)}</p>
          </div>
          <div className="hero-actions">
            {buildPrimaryActions(kind, lang, openCreateEntry, openCreateGoal, () => {
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

        {dataError && (
          <div className="notice data-error-notice">
            <strong>{dataError.title}</strong>
            <span>{dataError.body}</span>
            <small>{dataError.queryName}</small>
            <button type="button" onClick={() => window.location.reload()}>{isAr ? 'إعادة المحاولة' : lang === 'fr' ? 'Reessayer' : 'Retry'}</button>
          </div>
        )}

        <section className="kpi-grid">
          {cards.map(card => (
            <article key={pick(card.title, lang)} className="kpi-card">
              <span style={{ background: card.tone }} />
              <p>{pick(card.title, lang)}</p>
              <strong>{card.value}</strong>
              <small>{pick(card.body, lang)}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div>
                <p>{t('page_details')}</p>
                <h3>{sectionTitle(kind, lang)}</h3>
              </div>
              {dataLoading && <span className="loading-pill">{t('loading')}</span>}
            </div>

            {editableKind(kind) && (
              <div className="row-controls">
                <input
                  type="search"
                  className="row-search"
                  placeholder={t('search')}
                  value={rowSearch}
                  onChange={e => setRowSearch(e.target.value)}
                />
                <select className="row-select" value={rowRange} onChange={e => setRowRange(e.target.value as typeof rowRange)}>
                  <option value="all">{t('filter_all')}</option>
                  <option value="month">{t('filter_month')}</option>
                  <option value="last3">{t('filter_last3')}</option>
                  <option value="year">{t('filter_year')}</option>
                </select>
                <select className="row-select" value={rowSort} onChange={e => setRowSort(e.target.value as typeof rowSort)}>
                  <option value="dateDesc">{t('sort_newest')}</option>
                  <option value="dateAsc">{t('sort_oldest')}</option>
                  <option value="amountDesc">{t('sort_highest')}</option>
                  <option value="amountAsc">{t('sort_lowest')}</option>
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
                const analysis = buildGoalAnalysis(goal, data, lang, currency, t);
                const goalProgress = calculateGoalProgress(goal);
                const done = goalProgress.progressPercent;
                const visualDone = done > 0 && done < 2 ? 2 : done;
                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-card-head">
                      <div className="goal-title-wrap">
                        <span className="goal-icon">{goal.icon || '🎯'}</span>
                        <div>
                          <strong>{goal.name}</strong>
                          <span>{t('goal_remaining_amount')}: {money(analysis.remainingAmount, lang, goal.currency || currency)}</span>
                        </div>
                      </div>
                      <div className="goal-card-actions">
                        <button type="button" className="goal-edit-btn" onClick={() => openEditGoal(goal)}>
                          <Edit3 size={15} />
                          {t('goal_edit_button')}
                        </button>
                        <button type="button" className="goal-delete-btn" onClick={() => setGoalDeleteTarget(goal)}>
                          <Trash2 size={15} />
                          {t('goal_delete_button')}
                        </button>
                      </div>
                    </div>
                    <div className="goal-progress-row">
                      <div className="goal-progress-track">
                        <span style={{ width: `${visualDone}%` }} />
                      </div>
                      <b>{done}%</b>
                    </div>
                    <div className="goal-meta-grid">
                      <div><span>{t('goal_target_amount')}</span><strong>{goalProgress.targetAmount > 0 ? money(goalProgress.targetAmount, lang, goal.currency || currency) : t('goal_missing_target_hint')}</strong></div>
                      <div><span>{t('goal_current_amount')}</span><strong>{goalProgress.hasCurrentAmount ? money(goalProgress.currentAmount, lang, goal.currency || currency) : t('goal_missing_current_hint')}</strong></div>
                      <div><span>{t('goal_remaining_amount')}</span><strong>{money(goalProgress.remainingAmount, lang, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_monthly_contribution')}</span><strong>{goalProgress.hasMonthlyContribution ? money(goalProgress.monthlyContribution, lang, goal.currency || currency) : t('goal_missing_contribution_hint')}</strong></div>
                    </div>
                    <div className="goal-ai-card">
                      <div className="goal-ai-head">
                        <Bot size={18} />
                        <strong>{t('goal_ai_title')}</strong>
                        <span className={`risk-pill ${analysis.riskClass}`}>{analysis.riskLabel}</span>
                      </div>
                      <div className="goal-ai-metrics">
                        <div><span>{t('goal_target_amount')}</span><b>{money(analysis.targetAmount, lang, goal.currency || currency)}</b></div>
                        <div><span>{t('goal_current_amount')}</span><b>{money(analysis.currentAmount, lang, goal.currency || currency)}</b></div>
                        <div><span>{t('goal_monthly_contribution')}</span><b>{analysis.hasMonthlyContribution ? money(analysis.monthlyContribution, lang, goal.currency || currency) : t('goal_missing_contribution_hint')}</b></div>
                        <div><span>{t('goal_required_monthly')}</span><b>{money(analysis.requiredMonthlySaving, lang, goal.currency || currency)}</b></div>
                        <div><span>{t('goal_estimated_completion')}</span><b>{analysis.estimatedCompletion}</b></div>
                        <div><span>{t('goal_status_label')}</span><b>{analysis.statusLabel}</b></div>
                        <div><span>{t('goal_adjustment_label')}</span><b>{money(analysis.adjustment, lang, goal.currency || currency)}</b></div>
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
                <div className="empty-state">{t('no_data_saved')}</div>
              )}
              {kind !== 'goals' && (editableKind(kind) ? filteredRows.slice(0, visibleCount) : filteredRows).map(row => (
                <div className="data-row" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <div className="row-actions-wrap">
                    <MoneyAmount>{row.value}</MoneyAmount>
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
                  {t('load_more').replace('{n}', String(filteredRows.length - visibleCount))}
                </button>
              )}
            </div>
          </div>

          <aside className="panel">
            <div className="panel-head compact">
              <div>
                <p>{t('smart_insights')}</p>
                <h3>{t('suggestions_now')}</h3>
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
              <h3>{t('ask_assistant')}</h3>
              <p>{t('ai_chat_hint')}</p>
            </div>
            <div className="chat-history">
              {(chatHistory.length ? chatHistory : [{ role: 'assistant' as const, content: t('ai_welcome') }]).map((message, index) => (
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
                placeholder={t('ai_placeholder')}
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
              <strong>{summaryTitle(kind, lang)}</strong>
              <p>{summaryText(kind, data, lang, currency)}</p>
            </div>
          </section>
        )}

        {savingsGuide && (
          <section className="savings-guide" aria-labelledby="savings-guide-title">
            <div className="savings-guide-head">
              <span className="savings-guide-eyebrow">
                <GraduationCap size={16} />
                {savingsGuide.eyebrow}
              </span>
              <h2 id="savings-guide-title">{savingsGuide.title}</h2>
              <p>{savingsGuide.subtitle}</p>
            </div>
            <div className="savings-guide-grid">
              {savingsGuide.cards.map(card => {
                const GuideIcon = card.icon;
                return (
                  <article className="savings-guide-card" key={card.title}>
                    <span className="savings-guide-icon">
                      <GuideIcon size={20} />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                    <ul>
                      {card.points.map(point => <li key={point}>{point}</li>)}
                    </ul>
                  </article>
                );
              })}
            </div>
            <div className="savings-guide-plan">
              <strong>{savingsGuide.stepsTitle}</strong>
              <div className="savings-guide-steps">
                {savingsGuide.steps.map((step, index) => (
                  <div className="savings-guide-step" key={step}>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {entryOpen && editableKind(kind) && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setEntryOpen(false)}>
            <div className={`entry-modal${kind === 'savings' ? ' savings-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{kind === 'savings' ? pick(savingModalText.subtitle, lang) : entryMode === 'edit' ? t('update') : t('entry_save')}</p>
                  <h3 id="entry-modal-title">{kind === 'savings' ? entryMode === 'edit' ? pick(savingModalText.editTitle, lang) : pick(savingModalText.title, lang) : t(entryTitleKey(kind))}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setEntryOpen(false)} aria-label={t('close')}>
                  <X size={18} />
                </button>
              </div>
              <form className={`entry-form${kind === 'savings' ? ' savings-form-grid' : ''}`} onSubmit={saveEntry}>
                <label>
                  <span>{kind === 'savings' ? pick(savingModalText.name, lang) : t('entry_name')}</span>
                  <input
                    value={entryForm.name}
                    onChange={event => setEntryForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder={kind === 'savings' ? pick(savingModalText.namePlaceholder, lang) : undefined}
                    autoFocus
                  />
                </label>
                <label>
                  <span>{kind === 'savings' ? pick(savingModalText.amount, lang) : t('entry_amount')}</span>
                  <div className={kind === 'savings' ? 'currency-input-wrap' : undefined}>
                    {kind === 'savings' && <span className="currency-symbol">{selectedEntryCurrencySymbol}</span>}
                    <input
                      inputMode="decimal"
                      value={entryForm.amount}
                      onChange={event => setEntryForm(prev => ({ ...prev, amount: event.target.value }))}
                      placeholder={kind === 'savings' ? '0.000' : undefined}
                    />
                  </div>
                </label>
                {kind === 'savings' && (
                  <>
                    <label>
                      <span>{pick(savingModalText.type, lang)}</span>
                      <select value={entryForm.savingType} onChange={event => setEntryForm(prev => ({ ...prev, savingType: event.target.value, goalId: event.target.value === 'financial_goal' ? prev.goalId : '' }))}>
                        <option value="">{pick(savingModalText.typeRequired, lang)}</option>
                        {SAVING_TYPES.map(option => <option key={option.id} value={option.id}>{pick(option.label, lang)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>{pick(savingModalText.method, lang)}</span>
                      <select value={entryForm.savingMethod} onChange={event => setEntryForm(prev => ({ ...prev, savingMethod: event.target.value }))}>
                        <option value="">{pick(savingModalText.methodRequired, lang)}</option>
                        {SAVING_METHODS.map(option => <option key={option.id} value={option.id}>{pick(option.label, lang)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>{pick(savingModalText.date, lang)}</span>
                      <input type="date" value={entryForm.savedAt} onChange={event => setEntryForm(prev => ({ ...prev, savedAt: event.target.value }))} />
                    </label>
                    {entryForm.savingType === 'financial_goal' && (
                      <label>
                        <span>{pick(savingModalText.linkedGoal, lang)}</span>
                        <select value={entryForm.goalId} onChange={event => setEntryForm(prev => ({ ...prev, goalId: event.target.value }))}>
                          <option value="">{pick(savingModalText.noGoal, lang)}</option>
                          {data.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="savings-note-field">
                      <span>{pick(savingModalText.note, lang)}</span>
                      <textarea value={entryForm.note} onChange={event => setEntryForm(prev => ({ ...prev, note: event.target.value }))} placeholder={pick(savingModalText.notePlaceholder, lang)} />
                    </label>
                    {savingFormErrors.length > 0 && (
                      <div className="form-error">{savingFormErrors[0]}</div>
                    )}
                  </>
                )}
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
                  <button type="submit" className="primary-form-btn" disabled={entrySaving || !savingFormValid}>
                    {kind === 'savings' ? entrySaving ? pick(savingModalText.saving, lang) : pick(savingModalText.save, lang) : entrySaving ? t('saving') : entryMode === 'edit' ? t('update') : t('entry_save')}
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
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.targetAmount} onChange={event => setGoalForm(prev => ({ ...prev, targetAmount: event.target.value }))} />
                  </div>
                </label>
                <label>
                  <span>{t('goal_current_amount')}</span>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.currentAmount} onChange={event => setGoalForm(prev => ({ ...prev, currentAmount: event.target.value }))} />
                  </div>
                </label>
                <label>
                  <span>{t('goal_monthly_contribution')}</span>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.monthlyContribution} onChange={event => setGoalForm(prev => ({ ...prev, monthlyContribution: event.target.value }))} />
                  </div>
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
                  <CurrencySelect value={goalForm.currency} onChange={code => setGoalForm(prev => ({ ...prev, currency: code }))} lang={lang} ariaLabel={t('goal_currency_label')} />
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
                          <div><span>{t('goal_remaining_amount')}</span><b>{money(goalPreview.remainingAmount, lang, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_required_monthly')}</span><b>{money(goalPreview.requiredMonthlySaving, lang, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_current_contribution')}</span><b>{money(goalPreview.monthlyContribution, lang, goalForm.currency || currency)}</b></div>
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

        {goalDeleteTarget && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => !goalDeleting && setGoalDeleteTarget(null)}>
            <div className="confirm-modal goal-delete-modal" role="dialog" aria-modal="true" aria-labelledby="goal-delete-title" onMouseDown={event => event.stopPropagation()}>
              <div className="confirm-icon danger">
                <Trash2 size={24} />
              </div>
              <h3 id="goal-delete-title">{t('goal_delete_title')}</h3>
              <p>{t('goal_delete_message')}</p>
              <strong className="delete-target-name">{goalDeleteTarget.name}</strong>
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => setGoalDeleteTarget(null)} disabled={goalDeleting}>
                  {t('cancel')}
                </button>
                <button type="button" className="danger-form-btn" onClick={() => void deleteGoal()} disabled={goalDeleting}>
                  {goalDeleting ? t('goal_delete_loading') : t('goal_delete_button')}
                </button>
              </div>
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

