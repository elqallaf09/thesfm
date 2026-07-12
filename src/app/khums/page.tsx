'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BellRing,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  FileText,
  History,
  Info,
  Landmark,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Scale,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { Sidebar } from '@/components/Sidebar';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { calculateKhums, type KhumsStatus } from '@/lib/khums';
import { normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { formatMoney } from '@/lib/formatMoney';

const KHUMS_PANES = ['overview', 'financial-data', 'calculation', 'distribution', 'history', 'reports', 'documents'] as const;

type KhumsPane = typeof KHUMS_PANES[number];
type ShareType = 'imam' | 'sayyid' | 'unspecified';
type ReminderType = 'before_year_end_30' | 'year_end' | 'custom';
type ReminderStatus = 'active' | 'completed' | 'dismissed';

type KhumsYear = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  currency: string;
  marja_name: string | null;
  total_income: number;
  total_expenses: number;
  surplus: number;
  khums_due: number;
  imam_share: number;
  sayyid_share: number;
  imam_share_percent: number;
  sayyid_share_percent: number;
  status: KhumsStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type KhumsEntry = {
  id: string;
  type: 'income' | 'expense' | 'adjustment';
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  date: string | null;
};

type KhumsPayment = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  recipient: string | null;
  share_type: ShareType;
  receipt_url: string | null;
  notes: string | null;
};

type KhumsReminder = {
  id: string;
  reminder_date: string;
  reminder_type: ReminderType;
  status: ReminderStatus;
  notes: string | null;
};

const KHUMS_INTEGRITY_COPY = {
  ar: {
    loading: 'جارٍ تحميل سجلات الخمس…',
    splitError: 'يجب أن يساوي مجموع حصص التوزيع 100% بالضبط قبل الحفظ. المجموع الحالي: {total}%.',
    excludedPayments: 'تم استبعاد {count} من سجلات الدفع ({currencies}) من إجمالي المدفوع، لأن عملة سنة الخمس المحددة هي {currency}. تظل السجلات ظاهرة للمراجعة.',
    missingCurrency: 'عملة غير محددة',
    savedCurrencyMissing: 'لا تحتوي سنة الخمس المحفوظة على عملة صريحة. احفظ السنة بعملة صحيحة قبل إضافة دفعة.',
    paymentStatusSyncError: 'تم حفظ الدفعة، لكن تعذر تحديث حالة سنة الخمس. راجع السجل قبل المتابعة.',
    deleteStatusSyncError: 'تم حذف الدفعة، لكن تعذر إعادة حساب حالة سنة الخمس. راجع السجل قبل المتابعة.',
  },
  en: {
    loading: 'Loading Khums records…',
    splitError: 'Distribution shares must total exactly 100% before saving. Current total: {total}%.',
    excludedPayments: '{count} payment record(s) ({currencies}) are excluded from the paid total because the selected Khums year uses {currency}. The records remain visible for review.',
    missingCurrency: 'currency not recorded',
    savedCurrencyMissing: 'The saved Khums year has no explicit currency. Save the year with a valid currency before adding a payment.',
    paymentStatusSyncError: 'The payment was saved, but the selected Khums year status could not be refreshed. Review the record before continuing.',
    deleteStatusSyncError: 'The payment was deleted, but the selected Khums year status could not be recalculated. Review the record before continuing.',
  },
  fr: {
    loading: 'Chargement des données du Khums…',
    splitError: 'La répartition doit totaliser exactement 100 % avant l’enregistrement. Total actuel : {total} %.',
    excludedPayments: '{count} paiement(s) ({currencies}) sont exclus du total payé, car l’année du Khums sélectionnée utilise {currency}. Les enregistrements restent visibles pour vérification.',
    missingCurrency: 'devise non renseignée',
    savedCurrencyMissing: 'L’année du Khums enregistrée ne contient aucune devise explicite. Enregistrez une devise valide avant d’ajouter un paiement.',
    paymentStatusSyncError: 'Le paiement a été enregistré, mais le statut de l’année du Khums n’a pas pu être actualisé. Vérifiez l’enregistrement avant de continuer.',
    deleteStatusSyncError: 'Le paiement a été supprimé, mais le statut de l’année du Khums n’a pas pu être recalculé. Vérifiez l’enregistrement avant de continuer.',
  },
} as const;

const INCOME_FIELDS = [
  { key: 'salary', labelKey: 'khums_income_salary' },
  { key: 'business', labelKey: 'khums_income_business' },
  { key: 'investment', labelKey: 'khums_income_investment' },
  { key: 'dividends', labelKey: 'khums_income_dividends' },
  { key: 'realEstate', labelKey: 'khums_income_real_estate' },
  { key: 'gifts', labelKey: 'khums_income_gifts' },
  { key: 'other', labelKey: 'khums_income_other' },
] as const;

const EXPENSE_FIELDS = [
  { key: 'living', labelKey: 'khums_expense_living' },
  { key: 'housing', labelKey: 'khums_expense_housing' },
  { key: 'food', labelKey: 'khums_expense_food' },
  { key: 'education', labelKey: 'khums_expense_education' },
  { key: 'medical', labelKey: 'khums_expense_medical' },
  { key: 'debts', labelKey: 'khums_expense_debts' },
  { key: 'family', labelKey: 'khums_expense_family' },
  { key: 'work', labelKey: 'khums_expense_work' },
  { key: 'other', labelKey: 'khums_expense_other' },
] as const;

type IncomeKey = typeof INCOME_FIELDS[number]['key'];
type ExpenseKey = typeof EXPENSE_FIELDS[number]['key'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addYear(date: string) {
  const next = new Date(`${date || today()}T00:00:00`);
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date || today()}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function emptyFieldValues<T extends readonly { key: string }[]>(fields: T) {
  return Object.fromEntries(fields.map(field => [field.key, ''])) as Record<T[number]['key'], string>;
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = normalizeDigits(value).replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return currency || null;
}

function selectKhumsYearForToday(years: KhumsYear[], preferredYearId?: string, currentDate = today()) {
  const preferredYear = years.find(year => year.id === preferredYearId);
  if (preferredYear) return preferredYear;

  const containingToday = years
    .filter(year => year.start_date.slice(0, 10) <= currentDate && year.end_date.slice(0, 10) >= currentDate)
    .sort((left, right) => right.end_date.localeCompare(left.end_date))[0];
  if (containingToday) return containingToday;

  return years
    .slice()
    .sort((left, right) => right.end_date.localeCompare(left.end_date))[0] ?? null;
}

function statusForSavedKhumsDue(khumsDue: number, paidAmount: number): KhumsStatus {
  const due = Math.max(0, toNumber(khumsDue));
  const paid = Math.max(0, toNumber(paidAmount));
  if (due <= 0) return 'not_due';
  if (paid > due) return 'overpaid';
  return due - paid <= 0.000001 ? 'complete' : 'incomplete';
}

function downloadTextFile(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function KhumsPage() {
  const { user, loading } = useAuth();
  const { dir, lang, t } = useLanguage();
  const integrityCopy = KHUMS_INTEGRITY_COPY[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'];
  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
  const db = supabase as any;
  const statusLabel: Record<KhumsStatus, string> = {
    not_due: t('khums_status_not_due'),
    incomplete: t('khums_status_incomplete'),
    complete: t('khums_status_complete'),
    overpaid: t('khums_status_overpaid'),
  };
  const shareLabel: Record<ShareType, string> = {
    imam: t('khums_imam_share'),
    sayyid: t('khums_sayyid_share'),
    unspecified: t('khums_share_unspecified'),
  };
  const reminderLabel: Record<ReminderType, string> = {
    before_year_end_30: t('khums_reminder_before_30'),
    year_end: t('khums_reminder_year_end'),
    custom: t('khums_reminder_custom'),
  };
  const khumsTabs = useMemo(() => [
    { id: 'overview', label: t('khums_tab_overview') },
    { id: 'financial-data', label: t('khums_tab_financial_data') },
    { id: 'calculation', label: t('khums_tab_calculation') },
    { id: 'distribution', label: t('khums_tab_distribution') },
    { id: 'history', label: t('khums_tab_year_history') },
    { id: 'reports', label: t('khums_tab_reports') },
    { id: 'documents', label: t('khums_tab_documents') },
  ], [t]);

  const [activePane, setActivePane] = useUrlTabState<KhumsPane>({
    param: 'tab',
    values: KHUMS_PANES,
    defaultValue: 'overview',
    omitDefault: true,
    legacyValueResolver: value => value === 'data-entry' ? 'financial-data' : null,
  });
  const [years, setYears] = useState<KhumsYear[]>([]);
  const [activeYearId, setActiveYearId] = useState<string>('');
  const [entries, setEntries] = useState<KhumsEntry[]>([]);
  const [payments, setPayments] = useState<KhumsPayment[]>([]);
  const [reminders, setReminders] = useState<KhumsReminder[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [yearForm, setYearForm] = useState({
    start_date: today(),
    end_date: addYear(today()),
    currency: 'KWD',
    marja_name: '',
    imam_share_percent: '50',
    sayyid_share_percent: '50',
    notes: '',
  });
  const [incomeValues, setIncomeValues] = useState<Record<IncomeKey, string>>(() => emptyFieldValues(INCOME_FIELDS));
  const [expenseValues, setExpenseValues] = useState<Record<ExpenseKey, string>>(() => emptyFieldValues(EXPENSE_FIELDS));
  const [paymentForm, setPaymentForm] = useState({
    payment_date: today(),
    amount: '',
    recipient: '',
    share_type: 'unspecified' as ShareType,
    receipt_url: '',
    notes: '',
  });
  const [reminderForm, setReminderForm] = useState({
    reminder_date: addDays(addYear(today()), -30),
    reminder_type: 'custom' as ReminderType,
    notes: '',
  });
  const paymentAmountRef = useRef<HTMLInputElement>(null);
  const reminderDetailsRef = useRef<HTMLDetailsElement>(null);
  const reminderDateRef = useRef<HTMLInputElement>(null);
  const [distributionFocus, setDistributionFocus] = useState<'payment' | 'reminder' | null>(null);
  const [printWhenReportsReady, setPrintWhenReportsReady] = useState(false);
  const activeYear = useMemo(() => years.find(year => year.id === activeYearId) ?? null, [activeYearId, years]);
  const savedYearCurrency = normalizeCurrencyCode(activeYear?.currency);

  const money = useCallback((amount: number, currency = yearForm.currency) => (
    formatMoney(Number.isFinite(amount) ? amount : 0, currency || 'KWD', lang)
  ), [lang, yearForm.currency]);

  const dateLabel = useCallback((date?: string | null) => {
    if (!date) return '-';
    return normalizeDigits(new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { numberingSystem: 'latn' }));
  }, [locale]);

  const dateTimeLabel = useCallback((date?: string | null) => {
    if (!date) return t('khums_not_available');
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return t('khums_not_available');
    return normalizeDigits(new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      numberingSystem: 'latn',
    }).format(parsed));
  }, [locale, t]);

  const totalIncome = useMemo(() => INCOME_FIELDS.reduce((sum, field) => sum + Math.max(0, toNumber(incomeValues[field.key])), 0), [incomeValues]);
  const totalExpenses = useMemo(() => EXPENSE_FIELDS.reduce((sum, field) => sum + Math.max(0, toNumber(expenseValues[field.key])), 0), [expenseValues]);
  const matchingCurrencyPayments = useMemo(() => (
    savedYearCurrency
      ? payments.filter(payment => normalizeCurrencyCode(payment.currency) === savedYearCurrency)
      : []
  ), [payments, savedYearCurrency]);
  const excludedCurrencyPayments = useMemo(() => (
    activeYear
      ? payments.filter(payment => normalizeCurrencyCode(payment.currency) !== savedYearCurrency)
      : []
  ), [activeYear, payments, savedYearCurrency]);
  const paidTotal = useMemo(() => matchingCurrencyPayments.reduce(
    (sum, payment) => sum + Math.max(0, toNumber(payment.amount)),
    0,
  ), [matchingCurrencyPayments]);
  const imamPercent = Math.min(1, Math.max(0, toNumber(yearForm.imam_share_percent) / 100));
  const sayyidPercent = Math.min(1, Math.max(0, toNumber(yearForm.sayyid_share_percent) / 100));
  const splitTotal = toNumber(yearForm.imam_share_percent) + toNumber(yearForm.sayyid_share_percent);
  const splitIsValid = splitTotal === 100;
  const splitTotalLabel = normalizeDigits(new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
    numberingSystem: 'latn',
  }).format(splitTotal));
  const khums = useMemo(() => calculateKhums({
    totalIncome,
    totalExpenses,
    imamSharePercent: imamPercent,
    sayyidSharePercent: sayyidPercent,
    paidAmount: paidTotal,
  }), [imamPercent, paidTotal, sayyidPercent, totalExpenses, totalIncome]);
  const nextReminder = useMemo(() => reminders
    .filter(reminder => reminder.status === 'active')
    .slice()
    .sort((left, right) => left.reminder_date.localeCompare(right.reminder_date))[0] ?? null, [reminders]);
  const lastPayment = useMemo(() => matchingCurrencyPayments
    .slice()
    .sort((left, right) => right.payment_date.localeCompare(left.payment_date))[0] ?? null, [matchingCurrencyPayments]);
  const currentYearLabel = activeYear
    ? `${dateLabel(activeYear.start_date)} - ${dateLabel(activeYear.end_date)}`
    : `${dateLabel(yearForm.start_date)} - ${dateLabel(yearForm.end_date)}`;
  const recordLastUpdate = activeYear?.updated_at
    ? dateTimeLabel(activeYear.updated_at)
    : t('khums_current_draft');

  useEffect(() => {
    if (activePane !== 'distribution' || !distributionFocus) return;
    const animationFrame = window.requestAnimationFrame(() => {
      if (distributionFocus === 'reminder') {
        if (reminderDetailsRef.current) reminderDetailsRef.current.open = true;
        reminderDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        reminderDateRef.current?.focus({ preventScroll: true });
      } else {
        paymentAmountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        paymentAmountRef.current?.focus({ preventScroll: true });
      }
      setDistributionFocus(null);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activePane, distributionFocus]);

  useEffect(() => {
    if (activePane !== 'reports' || !printWhenReportsReady) return;
    const animationFrame = window.requestAnimationFrame(() => {
      setPrintWhenReportsReady(false);
      window.print();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activePane, printWhenReportsReady]);

  const hydrateYearForm = useCallback((year: KhumsYear) => {
    setYearForm({
      start_date: year.start_date,
      end_date: year.end_date,
      currency: year.currency || 'KWD',
      marja_name: year.marja_name ?? '',
      imam_share_percent: String(toNumber(year.imam_share_percent ?? 0.5) * 100),
      sayyid_share_percent: String(toNumber(year.sayyid_share_percent ?? 0.5) * 100),
      notes: year.notes ?? '',
    });
  }, []);

  const loadYearDetails = useCallback(async (yearId: string) => {
    if (!user || !yearId) return;
    const [entryRes, paymentRes, reminderRes] = await Promise.all([
      db.from('khums_entries').select('*').eq('user_id', user.id).eq('khums_year_id', yearId).order('created_at', { ascending: true }),
      db.from('khums_payments').select('*').eq('user_id', user.id).eq('khums_year_id', yearId).order('payment_date', { ascending: false }),
      db.from('khums_reminders').select('*').eq('user_id', user.id).eq('khums_year_id', yearId).order('reminder_date', { ascending: true }),
    ]);

    if (entryRes.error || paymentRes.error || reminderRes.error) {
      setStorageReady(false);
      setMessage({ type: 'warn', text: t('khums_load_records_error') });
      return;
    }

    const loadedEntries = (entryRes.data ?? []) as KhumsEntry[];
    setEntries(loadedEntries);
    setPayments((paymentRes.data ?? []) as KhumsPayment[]);
    setReminders((reminderRes.data ?? []) as KhumsReminder[]);

    const nextIncome = emptyFieldValues(INCOME_FIELDS);
    const nextExpenses = emptyFieldValues(EXPENSE_FIELDS);
    loadedEntries.forEach(entry => {
      if (entry.type === 'income' && entry.category in nextIncome) {
        nextIncome[entry.category as IncomeKey] = String(entry.amount ?? '');
      }
      if (entry.type === 'expense' && entry.category in nextExpenses) {
        nextExpenses[entry.category as ExpenseKey] = String(entry.amount ?? '');
      }
    });
    setIncomeValues(nextIncome);
    setExpenseValues(nextExpenses);
  }, [db, t, user]);

  const loadYears = useCallback(async (preferredYearId?: string) => {
    if (!user) return;
    const { data, error } = await db
      .from('khums_years')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStorageReady(false);
      setMessage({ type: 'warn', text: t('khums_tables_missing') });
      return;
    }

    setStorageReady(true);
    const loadedYears = (data ?? []) as KhumsYear[];
    setYears(loadedYears);
    const selected = selectKhumsYearForToday(loadedYears, preferredYearId);
    if (selected) {
      setActiveYearId(selected.id);
      hydrateYearForm(selected);
    }
  }, [db, hydrateYearForm, t, user]);

  useEffect(() => {
    if (user) void loadYears();
  }, [loadYears, user]);

  useEffect(() => {
    if (activeYearId) void loadYearDetails(activeYearId);
  }, [activeYearId, loadYearDetails]);

  function resetDraft() {
    setActiveYearId('');
    setEntries([]);
    setPayments([]);
    setReminders([]);
    setYearForm({
      start_date: today(),
      end_date: addYear(today()),
      currency: 'KWD',
      marja_name: '',
      imam_share_percent: '50',
      sayyid_share_percent: '50',
      notes: '',
    });
    setIncomeValues(emptyFieldValues(INCOME_FIELDS));
    setExpenseValues(emptyFieldValues(EXPENSE_FIELDS));
    setMessage(null);
  }

  async function ensureDefaultReminders(yearId: string) {
    if (!user || !yearForm.end_date) return;
    const rows = [
      {
        user_id: user.id,
        khums_year_id: yearId,
        reminder_date: addDays(yearForm.end_date, -30),
        reminder_type: 'before_year_end_30',
        status: 'active',
        notes: t('khums_default_reminder_review'),
      },
      {
        user_id: user.id,
        khums_year_id: yearId,
        reminder_date: yearForm.end_date,
        reminder_type: 'year_end',
        status: 'active',
        notes: t('khums_default_reminder_end'),
      },
    ];
    await db
      .from('khums_reminders')
      .upsert(rows, { onConflict: 'user_id,khums_year_id,reminder_type,reminder_date' });
  }

  async function saveKhumsYear() {
    if (!user || saving) return;
    if (!yearForm.start_date || !yearForm.end_date) {
      setMessage({ type: 'error', text: t('khums_dates_required') });
      return;
    }
    if (new Date(yearForm.end_date) < new Date(yearForm.start_date)) {
      setMessage({ type: 'error', text: t('khums_end_after_start') });
      return;
    }
    if (!splitIsValid) {
      setMessage({
        type: 'error',
        text: integrityCopy.splitError.replace('{total}', splitTotalLabel),
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        user_id: user.id,
        start_date: yearForm.start_date,
        end_date: yearForm.end_date,
        currency: yearForm.currency || 'KWD',
        marja_name: yearForm.marja_name.trim() || null,
        total_income: khums.totalIncome,
        total_expenses: khums.totalExpenses,
        surplus: khums.surplus,
        khums_due: khums.khumsDue,
        imam_share: khums.imamShare,
        sayyid_share: khums.sayyidShare,
        imam_share_percent: imamPercent,
        sayyid_share_percent: sayyidPercent,
        status: khums.status,
        notes: yearForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const saveResult = activeYearId
        ? await db.from('khums_years').update(payload).eq('id', activeYearId).eq('user_id', user.id).select('*').single()
        : await db.from('khums_years').insert(payload).select('*').single();

      if (saveResult.error || !saveResult.data) throw saveResult.error ?? new Error('save_failed');
      const savedYear = saveResult.data as KhumsYear;

      const rows = [
        ...INCOME_FIELDS.map(field => ({
          user_id: user.id,
          khums_year_id: savedYear.id,
          type: 'income',
          category: field.key,
          amount: Math.max(0, toNumber(incomeValues[field.key])),
          currency: savedYear.currency,
          description: t(field.labelKey),
          date: savedYear.end_date,
        })),
        ...EXPENSE_FIELDS.map(field => ({
          user_id: user.id,
          khums_year_id: savedYear.id,
          type: 'expense',
          category: field.key,
          amount: Math.max(0, toNumber(expenseValues[field.key])),
          currency: savedYear.currency,
          description: t(field.labelKey),
          date: savedYear.end_date,
        })),
      ].filter(row => row.amount > 0);

      await db.from('khums_entries').delete().eq('user_id', user.id).eq('khums_year_id', savedYear.id);
      if (rows.length > 0) {
        const { error: entryError } = await db.from('khums_entries').insert(rows);
        if (entryError) throw entryError;
      }

      await ensureDefaultReminders(savedYear.id);
      await loadYears(savedYear.id);
      setMessage({ type: 'ok', text: t('khums_save_success') });
    } catch {
      setStorageReady(false);
      setMessage({ type: 'error', text: t('khums_save_error') });
    } finally {
      setSaving(false);
    }
  }

  async function addPayment() {
    if (!user || !activeYearId || !activeYear) {
      setMessage({ type: 'warn', text: t('khums_save_before_payment') });
      return;
    }
    if (!savedYearCurrency) {
      setMessage({ type: 'error', text: integrityCopy.savedCurrencyMissing });
      return;
    }
    const amount = toNumber(paymentForm.amount);
    if (amount <= 0) {
      setMessage({ type: 'error', text: t('khums_payment_invalid') });
      return;
    }

    const { error } = await db.from('khums_payments').insert({
      user_id: user.id,
      khums_year_id: activeYearId,
      amount,
      currency: savedYearCurrency,
      payment_date: paymentForm.payment_date || today(),
      recipient: paymentForm.recipient.trim() || null,
      share_type: paymentForm.share_type,
      receipt_url: paymentForm.receipt_url.trim() || null,
      notes: paymentForm.notes.trim() || null,
    });

    if (error) {
      setMessage({ type: 'error', text: t('khums_payment_save_error') });
      return;
    }

    const nextStatus = statusForSavedKhumsDue(activeYear.khums_due, paidTotal + amount);
    const { error: statusError } = await db
      .from('khums_years')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', activeYear.id)
      .eq('user_id', user.id);
    setPaymentForm({ payment_date: today(), amount: '', recipient: '', share_type: 'unspecified', receipt_url: '', notes: '' });
    await loadYearDetails(activeYear.id);
    await loadYears(activeYear.id);
    setMessage(statusError
      ? { type: 'warn', text: integrityCopy.paymentStatusSyncError }
      : { type: 'ok', text: t('khums_payment_added') });
  }

  async function deletePayment(payment: KhumsPayment) {
    if (!user || !activeYearId || !activeYear) return;
    const { error } = await db.from('khums_payments').delete().eq('id', payment.id).eq('user_id', user.id);
    if (error) {
      setMessage({ type: 'error', text: t('khums_payment_delete_error') });
      return;
    }
    const remainingPaidTotal = matchingCurrencyPayments
      .filter(candidate => candidate.id !== payment.id)
      .reduce((sum, candidate) => sum + Math.max(0, toNumber(candidate.amount)), 0);
    const nextStatus = statusForSavedKhumsDue(activeYear.khums_due, remainingPaidTotal);
    const { error: statusError } = await db
      .from('khums_years')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', activeYear.id)
      .eq('user_id', user.id);
    await loadYearDetails(activeYear.id);
    await loadYears(activeYear.id);
    setMessage(statusError
      ? { type: 'warn', text: integrityCopy.deleteStatusSyncError }
      : { type: 'ok', text: t('khums_payment_deleted') });
  }

  async function addReminder() {
    if (!user || !activeYearId) {
      setMessage({ type: 'warn', text: t('khums_save_before_reminder') });
      return;
    }
    const { error } = await db.from('khums_reminders').insert({
      user_id: user.id,
      khums_year_id: activeYearId,
      reminder_date: reminderForm.reminder_date || yearForm.end_date,
      reminder_type: reminderForm.reminder_type,
      status: 'active',
      notes: reminderForm.notes.trim() || null,
    });
    if (error) {
      setMessage({ type: 'error', text: t('khums_reminder_save_error') });
      return;
    }
    setReminderForm({ reminder_date: addDays(yearForm.end_date, -30), reminder_type: 'custom', notes: '' });
    await loadYearDetails(activeYearId);
    setMessage({ type: 'ok', text: t('khums_reminder_added') });
  }

  async function updateReminderStatus(reminder: KhumsReminder, status: ReminderStatus) {
    if (!user || !activeYearId) return;
    const { error } = await db.from('khums_reminders').update({ status }).eq('id', reminder.id).eq('user_id', user.id);
    if (error) {
      setMessage({ type: 'error', text: t('khums_reminder_update_error') });
      return;
    }
    await loadYearDetails(activeYearId);
  }

  function reportRows() {
    return [
      [t('khums_report_item'), t('khums_report_value')],
      [t('khums_year_start'), dateLabel(yearForm.start_date)],
      [t('khums_year_end'), dateLabel(yearForm.end_date)],
      [t('khums_currency'), yearForm.currency],
      [t('khums_religious_authority'), yearForm.marja_name || '-'],
      [t('khums_income_title'), money(khums.totalIncome)],
      [t('khums_expenses_title'), money(khums.totalExpenses)],
      [t('khums_annual_surplus'), money(khums.surplus)],
      [t('khums_due'), money(khums.khumsDue)],
      [t('khums_imam_share'), money(khums.imamShare)],
      [t('khums_sayyid_share'), money(khums.sayyidShare)],
      [t('khums_paid'), money(khums.paidAmount)],
      [t('khums_remaining'), money(khums.remainingBalance)],
      [t('khums_payment_status'), statusLabel[khums.status]],
    ];
  }

  function exportCsvReport() {
    const csv = reportRows()
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    downloadTextFile(`khums-report-${yearForm.end_date || today()}.csv`, `\uFEFF${csv}`);
  }

  function openDistributionTarget(target: 'payment' | 'reminder') {
    setDistributionFocus(target);
    setActivePane('distribution');
  }

  function exportPdfFromActionCenter() {
    setPrintWhenReportsReady(true);
    setActivePane('reports');
  }

  async function shareKhumsSummary() {
    const summary = t('khums_share_text')
      .replace('{due}', money(khums.khumsDue))
      .replace('{paid}', money(khums.paidAmount))
      .replace('{remaining}', money(khums.remainingBalance));
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: t('khums_share_title'), text: summary, url: window.location.href });
        setMessage({ type: 'ok', text: t('khums_share_success') });
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(`${t('khums_share_title')}\n${summary}\n${window.location.href}`);
      setMessage({ type: 'ok', text: t('khums_share_copy_success') });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage({ type: 'error', text: t('khums_share_error') });
    }
  }

  if (loading) {
    return (
      <div
        className="khums-loading"
        dir={dir}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={integrityCopy.loading}
      >
        <div aria-hidden="true" />
        <span>{integrityCopy.loading}</span>
      </div>
    );
  }

  return (
    <div className="khums-page" data-charity-experience="khums" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="khums-content">
        <section className="khums-hero">
          <div className="hero-copy">
            <span className="eyebrow">THE SFM / {t('khums_breadcrumb')}</span>
            <h1>{t('khums_title')}</h1>
            <p>{t('khums_description')}</p>
            <div className="disclaimer-badge">
              <ShieldCheck size={16} />
              <span>{t('khums_disclaimer_short')}</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" type="button" onClick={saveKhumsYear} disabled={saving || !user}>
              <Save size={16} /> {saving ? t('khums_saving') : t('khums_save_year')}
            </button>
            <button className="dark-btn" type="button" onClick={resetDraft}>
              <Plus size={16} /> {t('khums_new_year')}
            </button>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        <PageTabs
          idBase="khums-workspace"
          tabs={khumsTabs}
          active={activePane}
          onChange={pane => setActivePane(pane as KhumsPane)}
          ariaLabel={t('khums_tabs_aria')}
          className="khums-workspace-tabs"
          mobileMode="auto"
          sticky
        />

        {message && (
          <div
            className={`notice ${message.type}`}
            role={message.type === 'error' ? 'alert' : 'status'}
            aria-live={message.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            {message.type === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        {!storageReady && (
          <div className="notice warn" role="alert" aria-live="assertive" aria-atomic="true">
            <AlertTriangle size={17} />
            <span>{t('khums_storage_notice')}</span>
          </div>
        )}

        {activeYear && !savedYearCurrency && (
          <div className="notice error" role="alert" aria-live="assertive" aria-atomic="true">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{integrityCopy.savedCurrencyMissing}</span>
          </div>
        )}

        {activeYear && savedYearCurrency && excludedCurrencyPayments.length > 0 && (
          <div className="notice warn" role="status" aria-live="polite" aria-atomic="true">
            <Info size={17} aria-hidden="true" />
            <span>{integrityCopy.excludedPayments
              .replace('{count}', String(excludedCurrencyPayments.length))
              .replace('{currencies}', Array.from(new Set(excludedCurrencyPayments.map(payment => (
                normalizeCurrencyCode(payment.currency) ?? integrityCopy.missingCurrency
              )))).join(', '))
              .replace('{currency}', savedYearCurrency)}</span>
          </div>
        )}

        <section className="khums-critical-summary" aria-label={t('khums_summary')} aria-live="polite">
          <div className={`critical-status ${khums.status}`}>
            <small>{t('khums_status')}</small>
            <strong>{statusLabel[khums.status]}</strong>
          </div>
          <div>
            <small>{t('khums_due')}</small>
            <strong dir="ltr">{money(khums.khumsDue)}</strong>
          </div>
          <div>
            <small>{t('khums_paid')}</small>
            <strong dir="ltr">{money(khums.paidAmount)}</strong>
          </div>
          <div>
            <small>{t('khums_remaining')}</small>
            <strong dir="ltr">{money(khums.remainingBalance)}</strong>
          </div>
        </section>

        <PageTabPanel idBase="khums-workspace" value="overview" active={activePane === 'overview'} className="khums-tab-panel">
          <section className="khums-stat-grid" aria-label={t('khums_summary')}>
            {[
              {
                label: t('khums_current_status'), value: statusLabel[khums.status], icon: ShieldCheck, valueDir: dir,
                explanation: t('khums_status_explanation'), formula: undefined, source: t('khums_source_financial_and_payments'), lastUpdated: recordLastUpdate,
              },
              {
                label: t('khums_current_year'), value: currentYearLabel, icon: CalendarDays, valueDir: 'ltr',
                explanation: activeYear ? t('khums_current_year_explanation') : t('khums_current_year_draft_explanation'), formula: undefined, source: activeYear ? t('khums_source_saved_year') : t('khums_source_current_draft'), lastUpdated: recordLastUpdate,
              },
              {
                label: t('khums_due'), value: money(khums.khumsDue), icon: Landmark, valueDir: 'ltr',
                explanation: t('khums_due_explanation'), formula: t('khums_due_formula_visual'), source: t('khums_source_financial_data'), lastUpdated: recordLastUpdate,
              },
              {
                label: t('khums_paid'), value: money(khums.paidAmount), icon: CheckCircle2, valueDir: 'ltr',
                explanation: t('khums_paid_explanation'), formula: t('khums_paid_formula_visual'), source: t('khums_source_payment_records'), lastUpdated: lastPayment ? dateLabel(lastPayment.payment_date) : t('khums_not_available'),
              },
              {
                label: t('khums_remaining'), value: money(khums.remainingBalance), icon: Scale, valueDir: 'ltr',
                explanation: t('khums_remaining_explanation'), formula: t('khums_remaining_formula_visual'), source: t('khums_source_financial_and_payments'), lastUpdated: recordLastUpdate,
              },
              {
                label: t('khums_next_reminder'), value: nextReminder ? dateLabel(nextReminder.reminder_date) : t('khums_no_next_reminder'), icon: BellRing, valueDir: dir,
                explanation: t('khums_next_reminder_explanation'), formula: undefined, source: t('khums_source_reminders'), lastUpdated: nextReminder ? dateLabel(nextReminder.reminder_date) : t('khums_not_available'),
              },
              {
                label: t('khums_last_payment'), value: lastPayment ? money(toNumber(lastPayment.amount), lastPayment.currency) : t('khums_no_last_payment'), icon: ReceiptText, valueDir: lastPayment ? 'ltr' : dir,
                explanation: t('khums_last_payment_explanation'), formula: undefined, source: t('khums_source_payment_records'), lastUpdated: lastPayment ? dateLabel(lastPayment.payment_date) : t('khums_not_available'),
              },
            ].map(metric => (
              <StatCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                valueDir={metric.valueDir as 'ltr' | 'rtl'}
                explanation={metric.explanation}
                formula={metric.formula}
                source={metric.source}
                lastUpdated={metric.lastUpdated}
                detailsLabel={t('khums_metric_details_for').replace('{metric}', metric.label)}
                formulaLabel={t('khums_metric_formula')}
                sourceLabel={t('khums_metric_source')}
                lastUpdatedLabel={t('khums_metric_last_update')}
              />
            ))}
          </section>

          <section className="overview-grid">
            <article className="panel-card current-year-card">
              <SectionHeader
                eyebrow={t('khums_year_eyebrow')}
                title={t('khums_current_year')}
                description={currentYearLabel}
                icon={<CalendarDays size={22} />}
                action={<button className="mini-btn compact" type="button" onClick={() => setActivePane('financial-data')}>{t('khums_go_to_financial_data')}</button>}
              />
              {!activeYear && <p className="muted-note">{t('khums_current_year_empty')}</p>}
              <div className="overview-count-grid">
                <div><small>{t('khums_saved_years')}</small><strong>{years.length}</strong></div>
                <div><small>{t('khums_payments_title')}</small><strong>{payments.length}</strong></div>
                <div><small>{t('khums_reminders')}</small><strong>{reminders.length}</strong></div>
              </div>
            </article>

            <article className="panel-card quick-actions-card">
              <SectionHeader
                eyebrow={t('khums_overview_eyebrow')}
                title={t('khums_action_center')}
                description={t('khums_action_center_desc')}
                icon={<CheckCircle2 size={22} />}
              />
              <div className="quick-actions" aria-label={t('khums_action_center')}>
                <button className="mini-btn" type="button" aria-label={t('khums_action_calculate')} onClick={() => setActivePane('calculation')}><Calculator size={16} />{t('khums_action_calculate')}</button>
                <button className="mini-btn" type="button" aria-label={t('khums_action_pay')} onClick={() => openDistributionTarget('payment')}><CreditCard size={16} />{t('khums_action_pay')}</button>
                <button className="mini-btn" type="button" aria-label={t('khums_action_export_pdf')} onClick={exportPdfFromActionCenter}><Download size={16} />{t('khums_action_export_pdf')}</button>
                <button className="mini-btn" type="button" aria-label={t('khums_action_share')} onClick={() => void shareKhumsSummary()}><Share2 size={16} />{t('khums_action_share')}</button>
                <button className="mini-btn" type="button" aria-label={t('khums_action_history')} onClick={() => setActivePane('history')}><History size={16} />{t('khums_action_history')}</button>
                <button className="mini-btn" type="button" aria-label={t('khums_action_reminder')} onClick={() => openDistributionTarget('reminder')}><BellRing size={16} />{t('khums_action_reminder')}</button>
              </div>
            </article>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="financial-data" active={activePane === 'financial-data'} className="khums-tab-panel">
          <article className="panel-card setup-card">
            <SectionHeader
              eyebrow={t('khums_year_eyebrow')}
              title={t('khums_year_setup')}
              description={t('khums_year_setup_desc')}
              icon={<CalendarDays size={22} />}
            />
            <div className="form-grid">
              <label><span>{t('khums_year_start')}</span><input type="date" value={yearForm.start_date} onChange={event => setYearForm(prev => ({ ...prev, start_date: event.target.value, end_date: addYear(event.target.value) }))} /></label>
              <label><span>{t('khums_year_end')}</span><input type="date" value={yearForm.end_date} onChange={event => setYearForm(prev => ({ ...prev, end_date: event.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={yearForm.currency} onChange={currency => setYearForm(prev => ({ ...prev, currency }))} lang={lang} label={t('khums_currency')} ariaLabel={t('khums_currency')} /></div>
              <label><span>{t('khums_religious_authority')}</span><input value={yearForm.marja_name} onChange={event => setYearForm(prev => ({ ...prev, marja_name: event.target.value }))} /></label>
              <label><span>{t('khums_imam_percent')}</span><input inputMode="decimal" value={yearForm.imam_share_percent} aria-invalid={!splitIsValid} aria-describedby={!splitIsValid ? 'khums-split-error' : undefined} onChange={event => setYearForm(prev => ({ ...prev, imam_share_percent: event.target.value }))} /></label>
              <label><span>{t('khums_sayyid_percent')}</span><input inputMode="decimal" value={yearForm.sayyid_share_percent} aria-invalid={!splitIsValid} aria-describedby={!splitIsValid ? 'khums-split-error' : undefined} onChange={event => setYearForm(prev => ({ ...prev, sayyid_share_percent: event.target.value }))} /></label>
            </div>
            {!splitIsValid && (
              <p id="khums-split-error" className="warning-line" role="alert" aria-live="assertive">
                {integrityCopy.splitError.replace('{total}', splitTotalLabel)}
              </p>
            )}
            <details className="khums-disclosure optional-notes">
              <summary>{t('khums_optional_notes')}</summary>
              <div className="form-grid disclosure-body">
                <label className="wide"><span>{t('khums_notes')}</span><textarea value={yearForm.notes} onChange={event => setYearForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
              </div>
            </details>
          </article>

          <section className="two-column">
            <FormSectionCard
              eyebrow={t('khums_income_eyebrow')}
              title={t('khums_income_title')}
              description={t('khums_income_desc')}
              icon={<Coins size={22} />}
            >
              <div className="form-grid">
                {INCOME_FIELDS.map(field => (
                  <label key={field.key}>
                    <span>{t(field.labelKey)}</span>
                    <input inputMode="decimal" value={incomeValues[field.key]} onChange={event => setIncomeValues(prev => ({ ...prev, [field.key]: event.target.value }))} placeholder="0.000" />
                  </label>
                ))}
              </div>
            </FormSectionCard>

            <FormSectionCard
              eyebrow={t('khums_expenses_eyebrow')}
              title={t('khums_expenses_title')}
              description={t('khums_expenses_desc')}
              icon={<ReceiptText size={22} />}
            >
              <div className="form-grid">
                {EXPENSE_FIELDS.map(field => (
                  <label key={field.key}>
                    <span>{t(field.labelKey)}</span>
                    <input inputMode="decimal" value={expenseValues[field.key]} onChange={event => setExpenseValues(prev => ({ ...prev, [field.key]: event.target.value }))} placeholder="0.000" />
                  </label>
                ))}
              </div>
            </FormSectionCard>
          </section>

          <div className="khums-save-bar">
            <span>{dateLabel(yearForm.start_date)} - {dateLabel(yearForm.end_date)}</span>
            <button className="gold-btn" type="button" onClick={saveKhumsYear} disabled={saving || !user}>
              <Save size={16} /> {saving ? t('khums_saving') : t('khums_save_year')}
            </button>
          </div>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="calculation" active={activePane === 'calculation'} className="khums-tab-panel">
          <article className="panel-card formula-card">
            <SectionHeader
              eyebrow={t('khums_separate_from_zakat')}
              title={t('khums_surplus_summary')}
              description={t('khums_calculation_intro')}
              icon={<Scale size={22} />}
            />
            <div className="formula-box">
              <small>{t('khums_annual_surplus')}</small>
              <strong>{money(khums.surplus)}</strong>
              <span>{t('khums_surplus_formula')}</span>
            </div>
            <section className="calculation-evidence" aria-label={t('khums_calculation_evidence')}>
              <div><small>{t('khums_metric_formula')}</small><strong>{t('khums_due_formula_visual')}</strong></div>
              <div><small>{t('khums_metric_source')}</small><strong>{t('khums_source_financial_data')}</strong></div>
              <div><small>{t('khums_metric_last_update')}</small><strong>{recordLastUpdate}</strong></div>
              <div><small>{t('khums_metric_explanation')}</small><strong>{t('khums_due_explanation')}</strong></div>
            </section>
            <div className={`status-card ${khums.status}`}>
              <small>{t('khums_status')}</small>
              <strong>{statusLabel[khums.status]}</strong>
              <p>{khums.surplus <= 0 ? t('khums_none_due_body') : `${t('khums_due_equals')} ${money(khums.khumsDue)}.`}</p>
            </div>
            <div className="split-grid calculation-split">
              <div><small>{t('khums_total_due')}</small><strong>{money(khums.khumsDue)}</strong></div>
              <div><small>{t('khums_imam_share')}</small><strong>{money(khums.imamShare)}</strong></div>
              <div><small>{t('khums_sayyid_share')}</small><strong>{money(khums.sayyidShare)}</strong></div>
              <div><small>{t('khums_after_payment')}</small><strong>{money(khums.remainingAfterKhums)}</strong></div>
            </div>
            <details className="khums-disclosure calculation-rules">
              <summary>{t('khums_calculation_rules')}</summary>
              <div className="disclosure-copy">
                <p>{t('khums_formula_desc')}</p>
                <p>{t('khums_currency_note')}</p>
                <p>{t('khums_disclaimer_short')}</p>
              </div>
            </details>
          </article>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="distribution" active={activePane === 'distribution'} className="khums-tab-panel">
          <article className="panel-card" id="payments">
            <SectionHeader
              eyebrow={t('khums_payments_eyebrow')}
              title={t('khums_payments_title')}
              description={t('khums_payments_desc')}
              icon={<Landmark size={22} />}
            />
            <div className="payment-layout">
              <div className="payment-form form-grid">
                <label><span>{t('khums_date')}</span><input type="date" value={paymentForm.payment_date} onChange={event => setPaymentForm(prev => ({ ...prev, payment_date: event.target.value }))} /></label>
                <label><span>{t('khums_amount')}</span><input ref={paymentAmountRef} inputMode="decimal" value={paymentForm.amount} onChange={event => setPaymentForm(prev => ({ ...prev, amount: event.target.value }))} placeholder="0.000" /></label>
                <label><span>{t('khums_recipient')}</span><input value={paymentForm.recipient} onChange={event => setPaymentForm(prev => ({ ...prev, recipient: event.target.value }))} /></label>
                <label><span>{t('khums_share_type')}</span><select value={paymentForm.share_type} onChange={event => setPaymentForm(prev => ({ ...prev, share_type: event.target.value as ShareType }))}><option value="imam">{t('khums_imam_share')}</option><option value="sayyid">{t('khums_sayyid_share')}</option><option value="unspecified">{t('khums_share_unspecified')}</option></select></label>
                <label><span>{t('khums_receipt_link')}</span><input value={paymentForm.receipt_url} onChange={event => setPaymentForm(prev => ({ ...prev, receipt_url: event.target.value }))} placeholder="https://" /></label>
                <label><span>{t('khums_notes')}</span><input value={paymentForm.notes} onChange={event => setPaymentForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
                <button className="primary-wide wide" type="button" onClick={addPayment} disabled={!activeYearId}>{t('khums_add_payment')}</button>
              </div>

              <div className="payment-summary">
                <div><small>{t('khums_total_due')}</small><strong>{money(khums.khumsDue)}</strong></div>
                <div><small>{t('khums_paid')}</small><strong>{money(khums.paidAmount)}</strong></div>
                <div><small>{t('khums_remaining')}</small><strong>{money(khums.remainingBalance)}</strong></div>
                <div className={`payment-state ${khums.status}`}><small>{t('khums_payment_status')}</small><strong>{statusLabel[khums.status]}</strong></div>
              </div>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                icon={<ReceiptText size={26} />}
                title={t('khums_payments_empty')}
                description={t('khums_payments_empty_body')}
              />
            ) : (
              <div className="payment-list">
                {payments.map(payment => (
                  <article key={payment.id}>
                    <div>
                      <strong>{money(toNumber(payment.amount), payment.currency)}</strong>
                      <span>{shareLabel[payment.share_type]} - {payment.recipient || t('khums_recipient_unspecified')}</span>
                      <small>{dateLabel(payment.payment_date)}{payment.receipt_url ? ` - ${payment.receipt_url}` : ''}</small>
                    </div>
                    <button type="button" onClick={() => void deletePayment(payment)} aria-label={t('khums_delete_payment')}><Trash2 size={15} /></button>
                  </article>
                ))}
              </div>
            )}
          </article>

          <details ref={reminderDetailsRef} className="khums-disclosure panel-card reminders-disclosure" id="khums-reminders">
            <summary>
              <span><strong>{t('khums_reminders_and_follow_up')}</strong><small>{t('khums_reminders_desc')}</small></span>
              <b>{reminders.length}</b>
            </summary>
            <div className="disclosure-body">
              <div className="reminder-form form-grid">
                <label><span>{t('khums_reminder_date')}</span><input ref={reminderDateRef} type="date" value={reminderForm.reminder_date} onChange={event => setReminderForm(prev => ({ ...prev, reminder_date: event.target.value }))} /></label>
                <label><span>{t('khums_reminder_type')}</span><select value={reminderForm.reminder_type} onChange={event => setReminderForm(prev => ({ ...prev, reminder_type: event.target.value as ReminderType }))}><option value="before_year_end_30">{t('khums_reminder_before_30')}</option><option value="year_end">{t('khums_reminder_year_end')}</option><option value="custom">{t('khums_reminder_custom')}</option></select></label>
                <label className="wide"><span>{t('khums_notes')}</span><input value={reminderForm.notes} onChange={event => setReminderForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
                <button className="primary-wide wide" type="button" onClick={addReminder} disabled={!activeYearId}>{t('khums_add_reminder')}</button>
              </div>

              {reminders.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={26} />}
                  title={t('khums_reminders_empty')}
                  description={t('khums_reminders_empty_body')}
                  action={<button className="mini-btn" type="button" onClick={() => void saveKhumsYear()}>{t('khums_save_create_reminders')}</button>}
                />
              ) : (
                <div className="reminder-grid">
                  {reminders.map(reminder => (
                    <article key={reminder.id} className={reminder.status}>
                      <div>
                        <strong>{reminderLabel[reminder.reminder_type]}</strong>
                        <span>{dateLabel(reminder.reminder_date)}</span>
                        {reminder.notes && <small>{reminder.notes}</small>}
                      </div>
                      <div>
                        <button type="button" onClick={() => void updateReminderStatus(reminder, 'completed')}>{t('khums_complete')}</button>
                        <button type="button" onClick={() => void updateReminderStatus(reminder, 'dismissed')}>{t('khums_dismiss')}</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </details>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="history" active={activePane === 'history'} className="khums-tab-panel">
          <article className="panel-card">
            <SectionHeader
              eyebrow={t('khums_year_eyebrow')}
              title={t('khums_saved_years')}
              description={t('khums_year_history_desc')}
              icon={<CalendarDays size={22} />}
            />
            {years.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={26} />}
                title={t('khums_year_history_empty')}
                description={t('khums_year_history_empty_desc')}
                action={<button className="mini-btn" type="button" onClick={() => setActivePane('financial-data')}>{t('khums_go_to_financial_data')}</button>}
              />
            ) : (
              <div className="year-history-list">
                {years.map(year => (
                  <details key={year.id} className={`khums-disclosure year-history-item${year.id === activeYearId ? ' active' : ''}`}>
                    <summary>
                      <span><strong>{dateLabel(year.start_date)} - {dateLabel(year.end_date)}</strong><small>{statusLabel[year.status]}</small></span>
                      <b dir="ltr">{money(year.khums_due, year.currency)}</b>
                    </summary>
                    <div className="disclosure-body">
                      <div className="split-grid history-breakdown">
                        <div><small>{t('khums_total_income')}</small><strong>{money(year.total_income, year.currency)}</strong></div>
                        <div><small>{t('khums_total_expenses')}</small><strong>{money(year.total_expenses, year.currency)}</strong></div>
                        <div><small>{t('khums_annual_surplus')}</small><strong>{money(year.surplus, year.currency)}</strong></div>
                        <div><small>{t('khums_due')}</small><strong>{money(year.khums_due, year.currency)}</strong></div>
                        <div><small>{t('khums_imam_share')}</small><strong>{money(year.imam_share, year.currency)}</strong></div>
                        <div><small>{t('khums_sayyid_share')}</small><strong>{money(year.sayyid_share, year.currency)}</strong></div>
                      </div>
                      {year.notes && <p className="history-notes">{year.notes}</p>}
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => {
                          setActiveYearId(year.id);
                          hydrateYearForm(year);
                        }}
                      >
                        {t('khums_select_year')}
                      </button>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </article>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="reports" active={activePane === 'reports'} className="khums-tab-panel">
          <section className="reports-layout" id="reports">
            <article className="panel-card">
              <SectionHeader
                eyebrow={t('khums_report_eyebrow')}
                title={t('khums_report_title')}
                description={t('khums_report_desc')}
                icon={<FileText size={22} />}
                action={(
                  <div className="report-actions">
                    <button className="mini-btn" type="button" onClick={() => window.print()}><Printer size={15} /> {t('khums_print_pdf')}</button>
                    <button className="mini-btn" type="button" onClick={exportCsvReport}><Download size={15} /> CSV</button>
                  </div>
                )}
              />
              <div className="report-table">
                {reportRows().map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel-card info-card">
              <SectionHeader
                eyebrow={t('khums_religious_notice')}
                title={t('khums_disclaimer_title')}
                description={t('khums_disclaimer_short')}
                icon={<AlertTriangle size={22} />}
              />
              <p>{t('khums_disclaimer_full')}</p>
            </article>
          </section>
        </PageTabPanel>

        <PageTabPanel idBase="khums-workspace" value="documents" active={activePane === 'documents'} className="khums-tab-panel">
          <article className="panel-card documents-card">
            <SectionHeader
              eyebrow={t('khums_tab_documents')}
              title={t('khums_supporting_documents')}
              description={t('khums_supporting_documents_desc')}
              icon={<FileText size={22} />}
              action={<span className="document-count" aria-label={t('khums_documents_count').replace('{count}', String(payments.filter(payment => payment.receipt_url).length))}>{payments.filter(payment => payment.receipt_url).length}</span>}
            />
            {payments.some(payment => payment.receipt_url) ? (
              <ul className="documents-list">
                {payments.filter(payment => payment.receipt_url).map(payment => (
                  <li key={payment.id}>
                    <div>
                      <strong>{money(toNumber(payment.amount), payment.currency)}</strong>
                      <span>{dateLabel(payment.payment_date)} - {payment.recipient || t('khums_recipient_unspecified')}</span>
                    </div>
                    <a href={payment.receipt_url ?? '#'} target="_blank" rel="noopener noreferrer">{t('khums_open_document')}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FileText size={26} />}
                title={t('khums_supporting_documents_empty')}
                description={t('khums_supporting_documents_empty_desc')}
                action={<button className="mini-btn" type="button" onClick={() => openDistributionTarget('payment')}>{t('khums_add_payment_document')}</button>}
              />
            )}
          </article>
        </PageTabPanel>
      </DashboardPageShell>

      <style jsx global>{`
        .khums-page{min-height:100vh;background:radial-gradient(circle at 8% 0%,rgba(47,214,192,.11),transparent 30%),var(--sfm-page-gradient);color:var(--sfm-deep-navy);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .khums-loading{min-height:100vh;display:grid;place-items:center;align-content:center;gap:14px;background:var(--sfm-page-gradient)}
        .khums-loading div{width:46px;height:46px;border-radius:50%;border:3px solid rgba(29,140,255,.14);border-top-color:var(--sfm-primary);animation:spin 1s linear infinite}
        .khums-loading span{color:var(--sfm-body);font-size:14px;font-weight:850}
        @keyframes spin{to{transform:rotate(360deg)}}
        .khums-content{display:grid;gap:18px;width:100%;max-inline-size:min(1280px,100%);margin-inline:auto;min-width:0}
        .khums-content > *,.khums-tab-panel > *,.overview-grid > *,.two-column > *,.reports-layout > *,.form-grid > *,.khums-stat-grid > *{min-width:0}
        .khums-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:22px;border-radius:var(--r-2xl);padding:clamp(22px,3vw,34px);background:radial-gradient(circle at 14% 14%,rgba(167,243,240,.26),transparent 30%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 140%);color:var(--sfm-card);border:1px solid rgba(167,243,240,.18);box-shadow:0 22px 56px rgba(3,18,37,.20)}
        .eyebrow{display:inline-flex;border:1px solid rgba(167,243,240,.2);background:rgba(167,243,240,.10);color:var(--sfm-soft-cyan);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:950}
        .khums-hero h1{margin:12px 0 8px;font-size:clamp(36px,4vw,54px);line-height:1.08;font-weight:950;letter-spacing:0}
        .khums-hero p{margin:0;max-width:760px;color:rgba(234,246,255,.82);font-size:16px;line-height:1.85}
        .disclaimer-badge{display:inline-flex;align-items:center;gap:8px;margin-top:14px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);padding:8px 12px;color:#EAF6FF;font-size:13px;font-weight:900}
        .hero-actions,.report-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
        button,a{font-family:inherit}
        .gold-btn,.dark-btn,.primary-wide,.mini-btn{min-height:44px;border-radius:var(--r-md);border:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 15px;font-weight:900;text-decoration:none;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
        .gold-btn,.primary-wide{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 14px 30px rgba(29,140,255,.20)}
        .gold-btn.compact{min-height:40px}
        .dark-btn{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);color:var(--sfm-card)}
        .mini-btn{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-midnight)}
        .primary-wide{width:auto}
        .gold-btn:hover,.dark-btn:hover,.primary-wide:hover,.mini-btn:hover,.gold-btn:focus-visible,.dark-btn:focus-visible,.primary-wide:focus-visible,.mini-btn:focus-visible{transform:translateY(-1px);box-shadow:0 16px 34px rgba(3,18,37,.13),0 0 0 3px rgba(24,212,212,.14);outline:0}
        button:disabled{opacity:.58;cursor:not-allowed;transform:none}
        .khums-page .page-section-tabs-shell.sticky{z-index:25;border-radius:var(--r-2xl)}
        .khums-page .khums-workspace-tabs{min-height:62px}
        .khums-page .khums-workspace-tabs button{min-height:48px}
        .khums-tab-panel{display:grid;gap:16px;min-width:0;outline:none}
        .khums-tab-panel:focus-visible{border-radius:var(--r-2xl);box-shadow:0 0 0 3px rgba(24,212,212,.20)}
        .khums-critical-summary{display:grid;grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(150px,1fr));gap:10px;padding:10px;border:1px solid rgba(29,140,255,.14);border-radius:var(--r-2xl);background:color-mix(in srgb,var(--sfm-card) 92%,transparent);box-shadow:0 12px 30px rgba(3,18,37,.055)}
        .khums-critical-summary > div{display:grid;gap:4px;align-content:center;min-height:72px;border:1px solid rgba(29,140,255,.11);border-radius:var(--r-lg);background:var(--sfm-light-card);padding:11px 13px;min-width:0}
        .khums-critical-summary small{color:var(--sfm-muted-readable);font-size:12px;font-weight:950}
        .khums-critical-summary strong{color:var(--sfm-midnight);font-size:clamp(16px,1.45vw,21px);font-weight:950;line-height:1.35;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
        .khums-critical-summary .critical-status.not_due,.khums-critical-summary .critical-status.complete{background:#ECFDF5}
        .khums-critical-summary .critical-status.incomplete{background:#FFF7ED}
        .khums-critical-summary .critical-status.overpaid{background:#E0F2FE}
        .notice{display:flex;align-items:flex-start;gap:9px;border-radius:var(--r-lg);padding:13px 14px;font-weight:900;line-height:1.7;border:1px solid rgba(29,140,255,.15);background:rgba(255,255,255,.82);color:var(--sfm-primary-hover)}
        .notice.ok{background:#ECFDF5;color:#047857;border-color:rgba(4,120,87,.18)}
        .notice.warn{background:#FFF7ED;color:#B45309;border-color:rgba(180,83,9,.18)}
        .notice.error{background:#FEF2F2;color:#B91C1C;border-color:rgba(185,28,28,.18)}
        .khums-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(170px,1fr));gap:16px;align-items:stretch;margin-top:4px}
        .stat-card{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto 1fr;align-items:start;gap:7px 12px;min-height:136px;padding:18px 16px;border-radius:var(--r-xl);background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.90));border:1px solid rgba(29,140,255,.13);box-shadow:0 14px 30px rgba(3,18,37,.06)}
        .stat-card > .stat-icon{grid-row:1 / span 2;width:42px;height:42px;border-radius:var(--r-md);background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(24,212,192,.10));color:var(--sfm-primary);display:grid;place-items:center}
        .stat-card > small{color:var(--sfm-muted-readable);font-size:12.5px;font-weight:950;line-height:1.45}
        .stat-card > strong{align-self:end;color:var(--sfm-midnight);font-size:clamp(18px,1.35vw,23px);line-height:1.25;overflow-wrap:normal;word-break:keep-all;unicode-bidi:isolate}
        .overview-grid,.two-column,.reports-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
        .overview-count-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .overview-count-grid div{display:grid;gap:6px;border:1px solid rgba(29,140,255,.12);border-radius:var(--r-lg);background:var(--sfm-light-card);padding:13px}
        .overview-count-grid small{color:var(--sfm-muted-readable);font-size:12px;font-weight:900;line-height:1.45}
        .overview-count-grid strong{color:var(--sfm-midnight);font-size:24px;font-weight:950;font-variant-numeric:tabular-nums}
        .quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .quick-actions .mini-btn{width:100%;min-height:48px;white-space:normal;line-height:1.45}
        .panel-card{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,255,.90));border:1px solid rgba(29,140,255,.13);border-radius:var(--r-2xl);padding:clamp(18px,2vw,24px);box-shadow:0 14px 36px rgba(3,18,37,.065)}
        .section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
        .section-head h2{margin:2px 0 0;color:var(--sfm-midnight);font-size:clamp(20px,1.8vw,24px);line-height:1.35;font-weight:950}
        .section-head p{max-width:720px;margin:6px 0 0;color:var(--sfm-muted-readable);line-height:1.75}
        .section-head small{display:inline-flex;color:#6B5A46;font-size:12px;font-weight:950;line-height:1.35}
        .section-head .head-icon{flex:0 0 auto;width:44px;height:44px;border-radius:var(--r-lg);display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);border:1px solid rgba(29,140,255,.12)}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .form-grid label,.currency-field{display:grid;gap:7px;color:var(--sfm-midnight);font-size:13px;font-weight:900;min-width:0}
        .form-grid input,.form-grid select,.form-grid textarea{width:100%;min-height:48px;border:1px solid rgba(29,140,255,.18);border-radius:var(--r-md);background:#fff;color:var(--sfm-deep-navy);padding-inline:13px;outline:none;font:850 14px Tajawal,Arial,sans-serif}
        .form-grid textarea{min-height:96px;padding-block:12px;resize:vertical;line-height:1.7}
        .form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}
        .wide{grid-column:1/-1}
        .warning-line,.muted-note{margin:12px 0 0;border-radius:var(--r-md);padding:11px 12px;line-height:1.7;font-weight:850}
        .warning-line{background:#FFF7ED;color:#B45309;border:1px solid rgba(180,83,9,.16)}
        .muted-note{background:rgba(29,140,255,.07);color:var(--sfm-primary-hover);border:1px solid rgba(29,140,255,.12)}
        .khums-disclosure{border:1px solid rgba(29,140,255,.14);border-radius:var(--r-xl);background:var(--sfm-card);overflow:hidden;min-width:0}
        .khums-disclosure > summary{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:54px;padding:13px 15px;color:var(--sfm-midnight);font-weight:950;line-height:1.45;cursor:pointer;list-style:none}
        .khums-disclosure > summary::-webkit-details-marker{display:none}
        .khums-disclosure > summary::after{content:'+';flex:0 0 auto;width:28px;height:28px;border-radius:var(--r-sm);display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);font-size:20px;line-height:1}
        .khums-disclosure[open] > summary::after{content:'−'}
        .khums-disclosure > summary:focus-visible{outline:3px solid rgba(47,214,192,.34);outline-offset:-3px;border-radius:var(--r-lg)}
        .khums-disclosure > summary span{display:grid;gap:4px;min-width:0}
        .khums-disclosure > summary span strong{font-size:16px;overflow-wrap:anywhere}
        .khums-disclosure > summary span small{color:var(--sfm-muted-readable);font-size:12px;font-weight:800;overflow-wrap:anywhere}
        .khums-disclosure > summary b{margin-inline-start:auto;color:var(--sfm-primary-hover);font-size:15px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
        .disclosure-body{padding:16px;border-top:1px solid rgba(29,140,255,.11)}
        .disclosure-copy{display:grid;gap:10px;padding:16px;border-top:1px solid rgba(29,140,255,.11)}
        .disclosure-copy p,.history-notes{margin:0;color:var(--sfm-muted-readable);font-weight:800;line-height:1.8}
        .optional-notes,.calculation-rules{margin-top:14px}
        .optional-notes .disclosure-body{padding:14px}
        .panel-card.khums-disclosure{padding:0}
        .reminders-disclosure{margin-top:0}
        .khums-save-bar{position:sticky;inset-block-end:max(12px,env(safe-area-inset-bottom));z-index:18;display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid rgba(29,140,255,.18);border-radius:var(--r-xl);background:color-mix(in srgb,var(--sfm-card) 94%,transparent);backdrop-filter:blur(14px);box-shadow:0 18px 42px rgba(3,18,37,.14);padding:10px 12px}
        .khums-save-bar > span{color:var(--sfm-muted-readable);font-weight:900;font-variant-numeric:tabular-nums}
        .year-history-list{display:grid;gap:10px}
        .year-history-item.active{border-color:rgba(24,212,212,.45);box-shadow:0 0 0 3px rgba(24,212,212,.10)}
        .history-breakdown{grid-template-columns:repeat(3,minmax(0,1fr));margin:0 0 12px}
        .history-notes{margin-bottom:12px;border-radius:var(--r-md);background:var(--sfm-light-card);padding:12px}
        .documents-card{grid-column:1/-1}
        .documents-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}
        .documents-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid rgba(29,140,255,.12);border-radius:var(--r-lg);background:var(--sfm-light-card);padding:12px;min-width:0}
        .documents-list li div{display:grid;gap:4px;min-width:0}
        .documents-list li strong{color:var(--sfm-midnight);overflow-wrap:anywhere}
        .documents-list li span{color:var(--sfm-muted-readable);font-size:12px;font-weight:800;overflow-wrap:anywhere}
        .documents-list a{min-height:40px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(29,140,255,.18);border-radius:var(--r-md);background:var(--sfm-card);color:var(--sfm-primary-hover);padding:0 12px;text-decoration:none;font-weight:900;white-space:nowrap}
        .formula-box,.status-card,.payment-summary div,.split-grid div{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:var(--r-lg);padding:14px;min-width:0}
        .formula-box{background:var(--sfm-midnight);color:#fff}
        .formula-box small,.formula-box span{display:block;color:var(--sfm-soft-cyan);font-weight:900;line-height:1.5}
        .formula-box strong{display:block;margin:6px 0;color:#fff;font-size:clamp(25px,2.4vw,34px);overflow-wrap:anywhere}
        .status-card{margin-top:12px}
        .status-card small,.payment-summary small,.split-grid small,.report-table span{display:block;color:var(--sfm-primary-hover);font-weight:950;line-height:1.45}
        .status-card strong,.payment-summary strong,.split-grid strong,.report-table strong{display:block;margin-top:5px;color:var(--sfm-midnight);font-size:18px;overflow-wrap:anywhere}
        .status-card p{margin:7px 0 0;color:var(--sfm-muted-readable);line-height:1.7}
        .status-card.not_due,.payment-state.not_due{background:#ECFDF5}
        .status-card.complete,.payment-state.complete{background:#ECFDF5}
        .status-card.incomplete,.payment-state.incomplete{background:#FFF7ED}
        .status-card.overpaid,.payment-state.overpaid{background:#E0F2FE}
        .split-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
        .payment-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.55fr);gap:14px;align-items:start}
        .payment-summary{display:grid;gap:10px}
        .payment-list,.reminder-grid{display:grid;gap:10px;margin-top:14px}
        .payment-list article,.reminder-grid article{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid rgba(29,140,255,.13);background:#fff;border-radius:var(--r-lg);padding:13px;min-width:0}
        .payment-list strong,.reminder-grid strong{display:block;color:var(--sfm-midnight);font-size:16px;line-height:1.4;overflow-wrap:anywhere}
        .payment-list span,.payment-list small,.reminder-grid span,.reminder-grid small{display:block;color:var(--sfm-muted-readable);font-size:12px;line-height:1.6;overflow-wrap:anywhere}
        .payment-list button{width:38px;height:var(--control-h-sm);border:1px solid rgba(185,28,28,.14);background:#FEF2F2;color:#B91C1C;border-radius:var(--r-md);display:grid;place-items:center;cursor:pointer}
        .reminder-grid article.completed{opacity:.72}
        .reminder-grid article > div:last-child{display:flex;gap:8px;flex-wrap:wrap}
        .reminder-grid button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:var(--r-md);min-height:36px;padding:0 10px;font-weight:900;cursor:pointer}
        .empty-panel{margin-top:14px;min-height:132px;display:grid;place-items:center;text-align:center;gap:8px;border:1px dashed rgba(29,140,255,.20);border-radius:var(--r-xl);background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(234,246,255,.66));padding:20px}
        .empty-panel-icon{width:48px;height:48px;border-radius:var(--r-lg);display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);border:1px solid rgba(29,140,255,.12)}
        .empty-panel strong{color:var(--sfm-midnight);font-size:17px}
        .empty-panel p{margin:0;max-width:520px;color:var(--sfm-muted-readable);line-height:1.7}
        .report-table{display:grid;gap:8px}
        .report-table div{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr);gap:12px;align-items:center;border:1px solid rgba(29,140,255,.11);background:var(--sfm-light-card);border-radius:var(--r-md);padding:11px}
        .info-card p{margin:0;color:var(--sfm-muted-readable);line-height:1.9;font-weight:800}
        @media(min-width:1025px){.khums-page .sfm-dashboard-page-shell{width:auto;max-width:none;margin-inline-start:var(--sidebar-w);margin-inline-end:0;padding-inline:clamp(22px,2.4vw,36px)}}
        @media(max-width:1240px){.khums-stat-grid{grid-template-columns:repeat(3,minmax(180px,1fr))}.overview-grid,.two-column,.reports-layout,.payment-layout{grid-template-columns:1fr}.documents-card{grid-column:auto}}
        @media(max-width:820px){.khums-hero{grid-template-columns:1fr;align-items:start}.hero-actions{justify-content:flex-start}.khums-critical-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.khums-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:grid}.section-head .head-icon{order:-1}.form-grid,.split-grid,.report-table div{grid-template-columns:1fr}.overview-count-grid,.quick-actions{grid-template-columns:1fr}.history-breakdown{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.khums-content{gap:14px}.khums-hero{padding:20px;border-radius:var(--r-2xl)}.hero-actions,.report-actions{display:grid;grid-template-columns:1fr;width:100%}.gold-btn,.dark-btn,.mini-btn{width:100%}.khums-critical-summary{grid-template-columns:1fr}.khums-stat-grid{grid-template-columns:1fr}.stat-card{min-height:118px}.panel-card{border-radius:var(--r-xl);padding:16px}.panel-card.khums-disclosure{padding:0}.payment-list article,.reminder-grid article,.documents-list li{grid-template-columns:1fr}.reminder-grid article > div:last-child{display:grid}.reminder-grid button,.documents-list a{width:100%}.history-breakdown{grid-template-columns:1fr}.khums-save-bar{display:grid;grid-template-columns:1fr}.khums-save-bar .gold-btn{width:100%}.khums-disclosure > summary{align-items:flex-start}.khums-disclosure > summary b{margin-inline-start:0}}
        @media print{.sfm-shared-sidebar,.khums-hero,.page-section-tabs-shell,.notice,.khums-critical-summary,.hero-actions,.payment-form,.reminder-form,.report-actions,.khums-save-bar{display:none!important}.khums-page{background:#fff}.khums-page .sfm-dashboard-page-shell{margin:0!important;padding:0!important}.panel-card{box-shadow:none;border-color:#d9e2ec}}

        /* Khums route production polish. */
        .khums-page{--khums-radius-xl:26px;--khums-radius-lg:20px;--khums-border:rgba(29,140,255,.15);--khums-shadow:0 18px 44px rgba(3,18,37,.075);overflow-x:clip}.khums-page .sfm-dashboard-page-content.khums-content{width:min(100%,1280px);max-inline-size:min(1280px,calc(100vw - 32px));margin-inline:auto;gap:clamp(16px,1.8vw,24px);min-width:0}.khums-page .sfm-dashboard-page-content.khums-content > *{inline-size:100%;min-width:0}
        .khums-hero{grid-template-columns:minmax(0,1fr) minmax(300px,max-content);border-radius:var(--khums-radius-xl);min-height:0}.khums-hero h1{font-size:clamp(32px,3.2vw,48px);letter-spacing:0;text-wrap:balance;color:#fff!important}.khums-hero p{font-size:15.5px;max-width:780px;color:rgba(234,246,255,.82)!important}.hero-actions{min-width:0}.hero-actions > *{flex:0 1 auto}.khums-page :is(.gold-btn,.dark-btn,.primary-wide,.mini-btn){border-radius:var(--r-md);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.khums-page :is(button,a,input,select,textarea):focus-visible{outline:3px solid rgba(47,214,192,.34);outline-offset:2px}
        .khums-stat-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.stat-card{height:100%;min-height:136px;border-radius:var(--r-xl)}.stat-card strong,.split-grid strong,.payment-summary strong,.report-table strong,.formula-box strong{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
        .panel-card,.notice{border-radius:var(--khums-radius-xl);border:1px solid var(--khums-border);box-shadow:var(--khums-shadow);min-width:0}.two-column,.reports-layout,.payment-layout,.overview-grid{gap:16px}.section-head{align-items:center}.section-head h2{letter-spacing:0;text-wrap:balance}.section-head p{max-width:760px}.form-grid{gap:14px}.form-grid label{line-height:1.45}.form-grid input,.form-grid select,.form-grid textarea{min-height:46px;border-radius:var(--r-md)}.empty-panel{min-height:132px;border-radius:var(--r-xl);padding:18px}.payment-list article,.reminder-grid article,.report-table div,.split-grid div,.formula-box,.status-card,.payment-summary{border-radius:var(--r-xl);min-width:0}.muted-note,.warning-line{border-radius:var(--r-lg)}.report-actions{flex-wrap:wrap}
        .dark .khums-page{--khums-border:rgba(167,243,240,.14);--khums-shadow:0 18px 44px rgba(0,0,0,.22)}.dark .khums-page :is(.panel-card,.stat-card,.notice,.khums-critical-summary,.khums-critical-summary > div,.khums-disclosure,.payment-list article,.reminder-grid article,.documents-list li,.report-table div,.split-grid div,.formula-box,.status-card,.payment-summary,.empty-panel,.overview-count-grid div){background:linear-gradient(180deg,rgba(16,47,82,.88),rgba(8,24,42,.92));border-color:var(--khums-border);box-shadow:var(--khums-shadow)}.dark .khums-page :is(.form-grid input,.form-grid select,.form-grid textarea){background:#081827;border-color:rgba(167,243,240,.18);color:var(--sfm-heading)}.dark .khums-page :is(.section-head h2,.panel-card strong,.stat-card strong,.empty-panel strong,.report-table strong,.khums-critical-summary strong,.khums-disclosure > summary,.documents-list li strong,.overview-count-grid strong){color:var(--sfm-heading)}.dark .khums-page :is(.section-head p,.muted-note,.empty-panel p,.report-table small,.stat-card small,.khums-critical-summary small,.khums-disclosure > summary small,.disclosure-copy p,.history-notes,.documents-list li span,.overview-count-grid small){color:var(--sfm-body)}
        @media(max-width:1260px){.khums-hero{grid-template-columns:1fr}.hero-actions{justify-content:flex-start}.khums-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.two-column,.reports-layout,.payment-layout,.overview-grid{grid-template-columns:1fr}}
        @media(max-width:920px){.khums-page .sfm-dashboard-page-content.khums-content{max-inline-size:min(100%,calc(100vw - 24px))}.khums-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid,.split-grid,.report-table div{grid-template-columns:1fr}.history-breakdown{grid-template-columns:repeat(2,minmax(0,1fr))}.section-head{display:grid}.section-head .head-icon{order:-1}}
        @media(max-width:560px){.khums-page .sfm-dashboard-page-content.khums-content{max-inline-size:min(100%,calc(100vw - 18px));gap:14px}.khums-hero{padding:18px;border-radius:var(--r-2xl)}.hero-actions,.report-actions{display:grid;grid-template-columns:1fr;width:100%}.khums-stat-grid{grid-template-columns:1fr}.panel-card{border-radius:var(--r-2xl);padding:16px}.panel-card.khums-disclosure{padding:0}.gold-btn,.dark-btn,.primary-wide,.mini-btn{width:100%}}

        /* Phase 2.8: calm Islamic-finance treatment, scoped to Khums only. */
        .khums-page{
          --khums-deep-green:#123F35;
          --khums-emerald:#087A5F;
          --khums-emerald-bright:#159B78;
          --khums-gold:#C8993D;
          --khums-gold-soft:#F2DFC0;
          --khums-warm-white:#FCFAF5;
          --khums-soft-gray:#EEF2EE;
          --khums-ink:#17352D;
          --khums-muted:#566B63;
          --khums-border:rgba(18,63,53,.16);
          --khums-shadow:0 18px 44px rgba(18,63,53,.09);
          background:radial-gradient(circle at 12% 0%,rgba(21,155,120,.12),transparent 29%),linear-gradient(180deg,#F8F7F1 0%,var(--khums-warm-white) 48%,#F2F4EF 100%);
          color:var(--khums-ink);
        }
        .khums-page .khums-hero{background:radial-gradient(circle at 15% 12%,rgba(242,223,192,.18),transparent 30%),linear-gradient(135deg,#0A3028 0%,var(--khums-deep-green) 58%,#1A5547 100%);border-color:rgba(242,223,192,.24);box-shadow:0 24px 58px rgba(18,63,53,.24)}
        .khums-page .eyebrow{border-color:rgba(242,223,192,.28);background:rgba(242,223,192,.11);color:#F3D89F}
        .khums-page .disclaimer-badge{border-color:rgba(242,223,192,.25);background:rgba(255,255,255,.08);color:#F7F2E8}
        .khums-page .gold-btn,.khums-page .primary-wide{background:linear-gradient(135deg,var(--khums-emerald),var(--khums-emerald-bright));color:#fff;box-shadow:0 13px 28px rgba(8,122,95,.24)}
        .khums-page .dark-btn{border-color:rgba(242,223,192,.28);background:rgba(255,255,255,.08);color:#fff}
        .khums-page .mini-btn{border-color:rgba(18,63,53,.19);background:var(--khums-warm-white);color:var(--khums-deep-green)}
        .khums-page .quick-actions .mini-btn{justify-content:flex-start;border-inline-start:3px solid var(--khums-gold);padding-inline:14px;background:linear-gradient(135deg,var(--khums-warm-white),#F6F5EE)}
        .khums-page :is(button,a,input,select,textarea,summary):focus-visible{outline:3px solid rgba(200,153,61,.48);outline-offset:2px}
        .khums-page .page-section-tabs{border-color:rgba(18,63,53,.16);background:linear-gradient(135deg,rgba(8,122,95,.055),rgba(200,153,61,.06)),var(--khums-warm-white);box-shadow:0 12px 30px rgba(18,63,53,.06)}
        .khums-page .page-section-tabs button{border-color:rgba(18,63,53,.16);background:#FFFEFA;color:var(--khums-muted)}
        .khums-page .page-section-tabs button:hover,.khums-page .page-section-tabs button:focus-visible{border-color:rgba(8,122,95,.42);color:var(--khums-deep-green);background:#F3F7F3;box-shadow:0 0 0 3px rgba(8,122,95,.10)}
        .khums-page .page-section-tabs button.active{border-color:rgba(8,122,95,.34);background:linear-gradient(135deg,var(--khums-deep-green),var(--khums-emerald));color:#fff;box-shadow:0 12px 28px rgba(18,63,53,.18),inset 0 -2px 0 rgba(242,223,192,.28)}
        .khums-page .page-section-tabs-select select{border-color:rgba(18,63,53,.24);background:var(--khums-warm-white);color:var(--khums-deep-green)}
        .khums-page :is(.panel-card,.stat-card,.notice,.khums-critical-summary,.khums-critical-summary > div,.khums-disclosure,.payment-list article,.reminder-grid article,.documents-list li,.report-table div,.split-grid div,.status-card,.payment-summary div,.empty-panel,.overview-count-grid div){border-color:var(--khums-border);background:linear-gradient(180deg,#FFFEFA,var(--khums-warm-white));box-shadow:var(--khums-shadow)}
        .khums-page :is(.section-head h2,.stat-card > strong,.khums-critical-summary strong,.overview-count-grid strong,.payment-list strong,.reminder-grid strong,.documents-list li strong,.report-table strong,.split-grid strong,.payment-summary strong){color:var(--khums-ink)}
        .khums-page :is(.section-head p,.stat-explanation,.khums-critical-summary small,.overview-count-grid small,.payment-list span,.payment-list small,.reminder-grid span,.reminder-grid small,.documents-list li span,.empty-panel p,.history-notes){color:var(--khums-muted)}
        .khums-page .section-head > div > small,.khums-page .report-table span,.khums-page .split-grid small,.khums-page .payment-summary small{color:#755513}
        .khums-page .section-head .head-icon,.khums-page .stat-icon,.khums-page .empty-panel-icon{border-color:rgba(8,122,95,.14);background:linear-gradient(135deg,rgba(8,122,95,.11),rgba(200,153,61,.11));color:var(--khums-emerald)}
        .khums-page .form-grid input,.khums-page .form-grid select,.khums-page .form-grid textarea{border-color:rgba(18,63,53,.20);background:#FFFEFA;color:var(--khums-ink)}
        .khums-page .form-grid input:focus,.khums-page .form-grid select:focus,.khums-page .form-grid textarea:focus{border-color:var(--khums-emerald);box-shadow:0 0 0 3px rgba(8,122,95,.13)}
        .khums-page .khums-critical-summary{border-inline-start:4px solid var(--khums-gold)}
        .khums-page .critical-status.not_due,.khums-page .critical-status.complete,.khums-page .status-card.not_due,.khums-page .status-card.complete,.khums-page .payment-state.not_due,.khums-page .payment-state.complete{background:#DDF4E9;border-color:rgba(8,122,95,.30)}
        .khums-page .critical-status.incomplete,.khums-page .status-card.incomplete,.khums-page .payment-state.incomplete{background:#FFF0CF;border-color:rgba(160,105,15,.30)}
        .khums-page .critical-status.overpaid,.khums-page .status-card.overpaid,.khums-page .payment-state.overpaid{background:#DDEFEA;border-color:rgba(18,63,53,.28)}
        .khums-stat-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .stat-card{position:relative;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto 1fr auto;min-height:214px;padding:17px 16px;align-content:start}
        .stat-card > .stat-icon{grid-row:1 / span 2;background:linear-gradient(135deg,rgba(8,122,95,.12),rgba(200,153,61,.13));color:var(--khums-emerald)}
        .stat-card > small{grid-column:2}
        .stat-card > strong{grid-column:2;align-self:start;margin-top:2px;font-size:clamp(17px,1.35vw,22px)}
        .stat-explanation{grid-column:1/-1;margin:11px 0 0;font-size:12px;font-weight:800;line-height:1.65}
        .metric-evidence{grid-column:1/-1;align-self:end;margin-top:10px;border-top:1px solid rgba(18,63,53,.12);padding-top:8px}
        .metric-evidence > summary{width:34px;height:32px;border-radius:var(--r-sm);display:grid;place-items:center;cursor:pointer;list-style:none;color:var(--khums-emerald);background:rgba(8,122,95,.08);border:1px solid rgba(8,122,95,.13)}
        .metric-evidence > summary::-webkit-details-marker{display:none}
        .metric-evidence > div{display:grid;gap:7px;margin-top:9px;border-radius:var(--r-md);background:var(--khums-soft-gray);padding:10px}
        .metric-evidence p{display:grid;gap:2px;margin:0;color:var(--khums-muted);font-size:11px;line-height:1.55}
        .metric-evidence b{color:var(--khums-deep-green);font-weight:950}
        .metric-evidence span{width:auto;height:auto;display:block;background:none;color:inherit;border:0;border-radius:0}
        .calculation-evidence{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}
        .calculation-evidence div{min-width:0;border:1px solid rgba(18,63,53,.14);border-radius:var(--r-lg);background:var(--khums-soft-gray);padding:12px}
        .calculation-evidence small{display:block;color:#755513;font-size:11px;font-weight:950;line-height:1.45}
        .calculation-evidence strong{display:block;margin-top:5px;color:var(--khums-ink);font-size:12px;line-height:1.65;overflow-wrap:anywhere}
        .khums-page .formula-box{border-color:rgba(242,223,192,.24);background:linear-gradient(135deg,#0A3028,var(--khums-deep-green));box-shadow:0 16px 34px rgba(18,63,53,.18)}
        .khums-page .formula-box :is(small,span){color:#F3D89F}
        .document-count{min-width:42px;height:42px;border-radius:999px;display:grid;place-items:center;background:var(--khums-deep-green);color:#fff;font-weight:950;font-variant-numeric:tabular-nums}
        .khums-page .documents-list a{border-color:rgba(8,122,95,.22);background:#FFFEFA;color:var(--khums-emerald)}
        .dark .khums-page{--khums-border:rgba(242,223,192,.15);--khums-shadow:0 20px 48px rgba(0,0,0,.26);background:radial-gradient(circle at 12% 0%,rgba(21,155,120,.14),transparent 31%),linear-gradient(180deg,#061A16,#091F1A 58%,#071914);color:#F7F2E8}
        .dark .khums-page :is(.panel-card,.stat-card,.notice,.khums-critical-summary,.khums-critical-summary > div,.khums-disclosure,.payment-list article,.reminder-grid article,.documents-list li,.report-table div,.split-grid div,.status-card,.payment-summary div,.empty-panel,.overview-count-grid div){border-color:var(--khums-border);background:linear-gradient(180deg,#10352D,#0B2922);box-shadow:var(--khums-shadow)}
        .dark .khums-page :is(.section-head h2,.stat-card > strong,.khums-critical-summary strong,.overview-count-grid strong,.payment-list strong,.reminder-grid strong,.documents-list li strong,.report-table strong,.split-grid strong,.payment-summary strong,.calculation-evidence strong,.metric-evidence b){color:#F7F2E8}
        .dark .khums-page :is(.section-head p,.stat-explanation,.khums-critical-summary small,.overview-count-grid small,.payment-list span,.payment-list small,.reminder-grid span,.reminder-grid small,.documents-list li span,.empty-panel p,.history-notes,.metric-evidence p){color:#C8D5CF}
        .dark .khums-page .page-section-tabs{border-color:rgba(242,223,192,.14);background:linear-gradient(135deg,rgba(8,122,95,.15),rgba(200,153,61,.08)),#0B2922}
        .dark .khums-page .page-section-tabs button{border-color:rgba(242,223,192,.13);background:#10352D;color:#D5E0DA}
        .dark .khums-page .page-section-tabs button.active{background:linear-gradient(135deg,#176852,var(--khums-emerald));color:#fff}
        .dark .khums-page .page-section-tabs-select select,.dark .khums-page .form-grid input,.dark .khums-page .form-grid select,.dark .khums-page .form-grid textarea{border-color:rgba(242,223,192,.17);background:#09251E;color:#F7F2E8}
        .dark .khums-page .mini-btn,.dark .khums-page .quick-actions .mini-btn{border-color:rgba(242,223,192,.17);background:linear-gradient(135deg,#113A30,#0D3028);color:#F7F2E8}
        .dark .khums-page .metric-evidence > div,.dark .khums-page .calculation-evidence div{border-color:rgba(242,223,192,.13);background:#09251E}
        .dark .khums-page .formula-box{background:linear-gradient(135deg,#071E19,#123F35)}
        .dark .khums-page .documents-list a{border-color:rgba(242,223,192,.18);background:#0D3028;color:#F3D89F}
        @media(max-width:1260px){.khums-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.calculation-evidence{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:920px){.khums-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.khums-stat-grid,.calculation-evidence{grid-template-columns:1fr}.stat-card{min-height:196px}.quick-actions{grid-template-columns:1fr}.khums-page .quick-actions .mini-btn{width:100%}.metric-evidence > div{padding:9px}}
        @media(prefers-reduced-motion:reduce){.khums-page *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}

      `}</style>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueDir = 'ltr',
  explanation,
  formula,
  source,
  lastUpdated,
  detailsLabel,
  formulaLabel,
  sourceLabel,
  lastUpdatedLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueDir?: 'ltr' | 'rtl';
  explanation: string;
  formula?: string;
  source: string;
  lastUpdated: string;
  detailsLabel: string;
  formulaLabel: string;
  sourceLabel: string;
  lastUpdatedLabel: string;
}) {
  return (
    <article className="stat-card" aria-label={`${label}: ${value}`}>
      <span className="stat-icon" aria-hidden="true"><Icon size={18} /></span>
      <small>{label}</small>
      {valueDir === 'ltr' ? <strong dir="ltr">{value}</strong> : <strong dir={valueDir}>{value}</strong>}
      <p className="stat-explanation">{explanation}</p>
      <details className="metric-evidence">
        <summary aria-label={detailsLabel} title={detailsLabel}><Info size={15} aria-hidden="true" /></summary>
        <div>
          {formula && <p><b>{formulaLabel}</b><span>{formula}</span></p>}
          <p><b>{sourceLabel}</b><span>{source}</span></p>
          <p><b>{lastUpdatedLabel}</b><span>{lastUpdated}</span></p>
        </div>
      </details>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action ?? (icon ? <span className="head-icon" aria-hidden="true">{icon}</span> : null)}
    </div>
  );
}

function FormSectionCard({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="panel-card">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} icon={icon} />
      {children}
    </article>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-panel">
      <span className="empty-panel-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
