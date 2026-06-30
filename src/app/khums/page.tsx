'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Coins,
  Download,
  FileText,
  Landmark,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Scale,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { calculateKhums, type KhumsStatus } from '@/lib/khums';
import { normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { formatMoney } from '@/lib/formatMoney';

type KhumsPane = 'calculator' | 'payments' | 'reminders' | 'reports';
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

const INCOME_FIELDS = [
  { key: 'salary', label: 'الراتب السنوي' },
  { key: 'business', label: 'الأرباح التجارية' },
  { key: 'investment', label: 'أرباح الاستثمار' },
  { key: 'dividends', label: 'أرباح الأسهم' },
  { key: 'realEstate', label: 'الأرباح العقارية' },
  { key: 'gifts', label: 'الهدايا أو المكافآت' },
  { key: 'other', label: 'أموال أخرى' },
] as const;

const EXPENSE_FIELDS = [
  { key: 'living', label: 'مصاريف المعيشة' },
  { key: 'housing', label: 'الإيجار / السكن' },
  { key: 'food', label: 'الطعام' },
  { key: 'education', label: 'التعليم' },
  { key: 'medical', label: 'العلاج' },
  { key: 'debts', label: 'الديون المدفوعة خلال السنة' },
  { key: 'family', label: 'مصاريف العائلة' },
  { key: 'work', label: 'مصاريف العمل' },
  { key: 'other', label: 'مصاريف أخرى' },
] as const;

type IncomeKey = typeof INCOME_FIELDS[number]['key'];
type ExpenseKey = typeof EXPENSE_FIELDS[number]['key'];

const statusLabel: Record<KhumsStatus, string> = {
  not_due: 'لا يوجد خمس مستحق',
  incomplete: 'غير مكتمل',
  complete: 'مكتمل',
  overpaid: 'فائض مدفوع',
};

const shareLabel: Record<ShareType, string> = {
  imam: 'سهم الإمام',
  sayyid: 'سهم السادة',
  unspecified: 'غير محدد',
};

const reminderLabel: Record<ReminderType, string> = {
  before_year_end_30: 'قبل نهاية سنة الخمس بـ 30 يوم',
  year_end: 'يوم نهاية سنة الخمس',
  custom: 'تذكير مخصص',
};

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
  const { dir, lang } = useLanguage();
  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
  const db = supabase as any;

  const [activePane, setActivePane] = useState<KhumsPane>('calculator');
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

  const money = useCallback((amount: number, currency = yearForm.currency) => (
    formatMoney(Number.isFinite(amount) ? amount : 0, currency || 'KWD', lang)
  ), [lang, yearForm.currency]);

  const dateLabel = useCallback((date?: string | null) => {
    if (!date) return '-';
    return normalizeDigits(new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { numberingSystem: 'latn' }));
  }, [locale]);

  const totalIncome = useMemo(() => INCOME_FIELDS.reduce((sum, field) => sum + Math.max(0, toNumber(incomeValues[field.key])), 0), [incomeValues]);
  const totalExpenses = useMemo(() => EXPENSE_FIELDS.reduce((sum, field) => sum + Math.max(0, toNumber(expenseValues[field.key])), 0), [expenseValues]);
  const paidTotal = useMemo(() => payments.reduce((sum, payment) => sum + Math.max(0, toNumber(payment.amount)), 0), [payments]);
  const imamPercent = Math.min(1, Math.max(0, toNumber(yearForm.imam_share_percent) / 100));
  const sayyidPercent = Math.min(1, Math.max(0, toNumber(yearForm.sayyid_share_percent) / 100));
  const splitTotal = toNumber(yearForm.imam_share_percent) + toNumber(yearForm.sayyid_share_percent);
  const khums = useMemo(() => calculateKhums({
    totalIncome,
    totalExpenses,
    imamSharePercent: imamPercent,
    sayyidSharePercent: sayyidPercent,
    paidAmount: paidTotal,
  }), [imamPercent, paidTotal, sayyidPercent, totalExpenses, totalIncome]);
  const activeYear = useMemo(() => years.find(year => year.id === activeYearId) ?? null, [activeYearId, years]);

  const hydrateYearForm = useCallback((year: KhumsYear) => {
    setYearForm({
      start_date: year.start_date,
      end_date: year.end_date,
      currency: year.currency || 'KWD',
      marja_name: year.marja_name ?? '',
      imam_share_percent: String((toNumber(year.imam_share_percent) || 0.5) * 100),
      sayyid_share_percent: String((toNumber(year.sayyid_share_percent) || 0.5) * 100),
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
      setMessage({ type: 'warn', text: 'تعذر تحميل سجلات الخمس من قاعدة البيانات. تأكد من تطبيق ترحيل قاعدة البيانات ثم أعد المحاولة.' });
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
  }, [db, user]);

  const loadYears = useCallback(async (preferredYearId?: string) => {
    if (!user) return;
    const { data, error } = await db
      .from('khums_years')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStorageReady(false);
      setMessage({ type: 'warn', text: 'لم يتم العثور على جداول الخمس بعد. يمكنك استخدام الحاسبة الآن، وسيعمل الحفظ بعد تطبيق ترحيل قاعدة البيانات.' });
      return;
    }

    setStorageReady(true);
    const loadedYears = (data ?? []) as KhumsYear[];
    setYears(loadedYears);
    const selected = loadedYears.find(year => year.id === preferredYearId) ?? loadedYears[0] ?? null;
    if (selected) {
      setActiveYearId(selected.id);
      hydrateYearForm(selected);
    }
  }, [db, hydrateYearForm, user]);

  useEffect(() => {
    if (user) void loadYears();
  }, [loadYears, user]);

  useEffect(() => {
    if (activeYearId) void loadYearDetails(activeYearId);
  }, [activeYearId, loadYearDetails]);

  useEffect(() => {
    const setPaneFromHash = () => {
      if (window.location.hash === '#reminders') setActivePane('reminders');
      if (window.location.hash === '#reports') setActivePane('reports');
    };
    setPaneFromHash();
    window.addEventListener('hashchange', setPaneFromHash);
    return () => window.removeEventListener('hashchange', setPaneFromHash);
  }, []);

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
        notes: 'مراجعة بيانات سنة الخمس قبل نهاية السنة.',
      },
      {
        user_id: user.id,
        khums_year_id: yearId,
        reminder_date: yearForm.end_date,
        reminder_type: 'year_end',
        status: 'active',
        notes: 'موعد نهاية سنة الخمس.',
      },
    ];
    await db
      .from('khums_reminders')
      .upsert(rows, { onConflict: 'user_id,khums_year_id,reminder_type,reminder_date' });
  }

  async function saveKhumsYear() {
    if (!user || saving) return;
    if (!yearForm.start_date || !yearForm.end_date) {
      setMessage({ type: 'error', text: 'أدخل تاريخ بداية ونهاية سنة الخمس.' });
      return;
    }
    if (new Date(yearForm.end_date) < new Date(yearForm.start_date)) {
      setMessage({ type: 'error', text: 'تاريخ نهاية سنة الخمس يجب أن يكون بعد تاريخ البداية.' });
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
          description: field.label,
          date: savedYear.end_date,
        })),
        ...EXPENSE_FIELDS.map(field => ({
          user_id: user.id,
          khums_year_id: savedYear.id,
          type: 'expense',
          category: field.key,
          amount: Math.max(0, toNumber(expenseValues[field.key])),
          currency: savedYear.currency,
          description: field.label,
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
      setMessage({ type: 'ok', text: 'تم حفظ سنة الخمس والبيانات المرتبطة بها.' });
    } catch {
      setStorageReady(false);
      setMessage({ type: 'error', text: 'تعذر حفظ بيانات الخمس. تأكد من تطبيق جداول الخمس في Supabase.' });
    } finally {
      setSaving(false);
    }
  }

  async function addPayment() {
    if (!user || !activeYearId) {
      setMessage({ type: 'warn', text: 'احفظ سنة الخمس أولاً قبل إضافة الدفعات.' });
      return;
    }
    const amount = toNumber(paymentForm.amount);
    if (amount <= 0) {
      setMessage({ type: 'error', text: 'أدخل مبلغ دفعة صحيحاً.' });
      return;
    }

    const { error } = await db.from('khums_payments').insert({
      user_id: user.id,
      khums_year_id: activeYearId,
      amount,
      currency: yearForm.currency,
      payment_date: paymentForm.payment_date || today(),
      recipient: paymentForm.recipient.trim() || null,
      share_type: paymentForm.share_type,
      receipt_url: paymentForm.receipt_url.trim() || null,
      notes: paymentForm.notes.trim() || null,
    });

    if (error) {
      setMessage({ type: 'error', text: 'تعذر حفظ دفعة الخمس.' });
      return;
    }

    const nextStatus = calculateKhums({
      totalIncome,
      totalExpenses,
      imamSharePercent: imamPercent,
      sayyidSharePercent: sayyidPercent,
      paidAmount: paidTotal + amount,
    }).status;
    await db.from('khums_years').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', activeYearId).eq('user_id', user.id);
    setPaymentForm({ payment_date: today(), amount: '', recipient: '', share_type: 'unspecified', receipt_url: '', notes: '' });
    await loadYearDetails(activeYearId);
    await loadYears(activeYearId);
    setMessage({ type: 'ok', text: 'تمت إضافة دفعة الخمس.' });
  }

  async function deletePayment(payment: KhumsPayment) {
    if (!user || !activeYearId) return;
    const { error } = await db.from('khums_payments').delete().eq('id', payment.id).eq('user_id', user.id);
    if (error) {
      setMessage({ type: 'error', text: 'تعذر حذف الدفعة.' });
      return;
    }
    await loadYearDetails(activeYearId);
    setMessage({ type: 'ok', text: 'تم حذف الدفعة.' });
  }

  async function addReminder() {
    if (!user || !activeYearId) {
      setMessage({ type: 'warn', text: 'احفظ سنة الخمس أولاً قبل إضافة تذكير.' });
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
      setMessage({ type: 'error', text: 'تعذر حفظ التذكير.' });
      return;
    }
    setReminderForm({ reminder_date: addDays(yearForm.end_date, -30), reminder_type: 'custom', notes: '' });
    await loadYearDetails(activeYearId);
    setMessage({ type: 'ok', text: 'تمت إضافة تذكير الخمس.' });
  }

  async function updateReminderStatus(reminder: KhumsReminder, status: ReminderStatus) {
    if (!user || !activeYearId) return;
    const { error } = await db.from('khums_reminders').update({ status }).eq('id', reminder.id).eq('user_id', user.id);
    if (error) {
      setMessage({ type: 'error', text: 'تعذر تحديث التذكير.' });
      return;
    }
    await loadYearDetails(activeYearId);
  }

  function reportRows() {
    return [
      ['البند', 'القيمة'],
      ['تاريخ بداية سنة الخمس', dateLabel(yearForm.start_date)],
      ['تاريخ نهاية سنة الخمس', dateLabel(yearForm.end_date)],
      ['العملة', yearForm.currency],
      ['المرجع الديني / المرجع الفقهي', yearForm.marja_name || '-'],
      ['إجمالي الدخل والأرباح', money(khums.totalIncome)],
      ['المصاريف السنوية', money(khums.totalExpenses)],
      ['الفائض السنوي', money(khums.surplus)],
      ['الخمس المستحق', money(khums.khumsDue)],
      ['سهم الإمام', money(khums.imamShare)],
      ['سهم السادة', money(khums.sayyidShare)],
      ['المدفوع', money(khums.paidAmount)],
      ['المتبقي', money(khums.remainingBalance)],
      ['حالة السداد', statusLabel[khums.status]],
    ];
  }

  function exportCsvReport() {
    const csv = reportRows()
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    downloadTextFile(`khums-report-${yearForm.end_date || today()}.csv`, `\uFEFF${csv}`);
  }

  if (loading) {
    return (
      <div className="khums-loading" dir={dir}>
        <div />
      </div>
    );
  }

  return (
    <div className="khums-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="khums-content">
        <section className="khums-hero">
          <div className="hero-copy">
            <span className="eyebrow">THE SFM / الزكاة والأعمال الخيرية</span>
            <h1>الخمس</h1>
            <p>حاسبة تقديرية لمتابعة الخمس السنوي حسب المذهب الجعفري، مع إمكانية ضبط سنة الخمس والمصاريف والأرباح المتبقية.</p>
            <div className="disclaimer-badge">
              <ShieldCheck size={16} />
              <span>هذه الحاسبة تقديرية ولا تُعد فتوى شرعية.</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" type="button" onClick={saveKhumsYear} disabled={saving || !user}>
              <Save size={16} /> {saving ? 'جار الحفظ...' : 'حفظ سنة الخمس'}
            </button>
            <button className="dark-btn" type="button" onClick={resetDraft}>
              <Plus size={16} /> سنة خمس جديدة
            </button>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        <ActionTabs label="تبويبات الزكاة والأعمال الخيرية">
          <Link href="/zakat">الزكاة</Link>
          <button type="button" className={activePane === 'calculator' || activePane === 'payments' ? 'active' : ''} onClick={() => setActivePane('calculator')}>الخمس</button>
          <Link href="/charity-projects">المشاريع الخيرية</Link>
          <button type="button" className={activePane === 'reminders' ? 'active' : ''} onClick={() => setActivePane('reminders')}>التذكيرات</button>
          <button type="button" className={activePane === 'reports' ? 'active' : ''} onClick={() => setActivePane('reports')}>التقارير</button>
        </ActionTabs>

        {message && (
          <div className={`notice ${message.type}`}>
            {message.type === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
            <span>{message.text}</span>
          </div>
        )}

        {!storageReady && (
          <div className="notice warn">
            <AlertTriangle size={17} />
            <span>وضع الحفظ يحتاج إلى تطبيق ترحيل قاعدة البيانات الخاص بالخمس. الحسابات المعروضة هنا لا تعتمد على الزكاة ولا تستخدم نسبة 2.5%.</span>
          </div>
        )}

        <section className="khums-stat-grid" aria-label="ملخص الخمس">
          {[
            ['إجمالي الدخل', money(khums.totalIncome), Coins],
            ['إجمالي المصاريف', money(khums.totalExpenses), ReceiptText],
            ['الفائض السنوي', money(khums.surplus), Scale],
            ['الخمس المستحق', money(khums.khumsDue), Landmark],
            ['المدفوع', money(khums.paidAmount), CheckCircle2],
            ['المتبقي', money(khums.remainingBalance), AlertTriangle],
          ].map(([label, value, Icon]) => {
            return (
              <StatCard key={String(label)} icon={Icon as LucideIcon} label={String(label)} value={String(value)} />
            );
          })}
        </section>

        {years.length > 0 && (
          <section className="year-strip" aria-label="سنوات الخمس المحفوظة">
            <strong>سنوات الخمس المحفوظة</strong>
            <div>
              {years.map(year => (
                <button
                  key={year.id}
                  type="button"
                  className={year.id === activeYearId ? 'active' : ''}
                  onClick={() => {
                    setActiveYearId(year.id);
                    hydrateYearForm(year);
                  }}
                >
                  {dateLabel(year.start_date)} - {dateLabel(year.end_date)}
                </button>
              ))}
            </div>
          </section>
        )}

        {(activePane === 'calculator' || activePane === 'payments') && (
          <>
            <section className="khums-layout">
              <article className="panel-card setup-card">
                <SectionHeader
                  eyebrow="سنة الخمس"
                  title="إعداد سنة الخمس"
                  description="اضبط بداية ونهاية السنة والعملة والمرجع الفقهي، ثم احفظ السنة لتفعيل الدفعات والتذكيرات."
                  icon={<CalendarDays size={22} />}
                />
                <div className="form-grid">
                  <label><span>تاريخ بداية سنة الخمس</span><input type="date" value={yearForm.start_date} onChange={event => setYearForm(prev => ({ ...prev, start_date: event.target.value, end_date: addYear(event.target.value) }))} /></label>
                  <label><span>تاريخ نهاية سنة الخمس</span><input type="date" value={yearForm.end_date} onChange={event => setYearForm(prev => ({ ...prev, end_date: event.target.value }))} /></label>
                  <div className="currency-field"><CurrencySelect value={yearForm.currency} onChange={currency => setYearForm(prev => ({ ...prev, currency }))} lang={lang} label="العملة" ariaLabel="العملة" /></div>
                  <label><span>المرجع الديني / المرجع الفقهي (اختياري)</span><input value={yearForm.marja_name} onChange={event => setYearForm(prev => ({ ...prev, marja_name: event.target.value }))} /></label>
                  <label><span>نسبة سهم الإمام</span><input inputMode="decimal" value={yearForm.imam_share_percent} onChange={event => setYearForm(prev => ({ ...prev, imam_share_percent: event.target.value }))} /></label>
                  <label><span>نسبة سهم السادة</span><input inputMode="decimal" value={yearForm.sayyid_share_percent} onChange={event => setYearForm(prev => ({ ...prev, sayyid_share_percent: event.target.value }))} /></label>
                  <label className="wide"><span>ملاحظات</span><textarea value={yearForm.notes} onChange={event => setYearForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
                </div>
                {Math.abs(splitTotal - 100) > 0.01 && <p className="warning-line">تنبيه: مجموع نسب التقسيم الحالي {splitTotal.toFixed(1)}%. يفضّل أن يساوي 100% ما لم تكن تتبع توجيهاً خاصاً.</p>}
                <p className="muted-note">يستخدم هذا الإصدار عملة واحدة لكل سنة خمس. إذا كانت لديك مبالغ بعملات أخرى، حوّلها إلى عملة سنة الخمس قبل الإدخال.</p>
              </article>

              <article className="panel-card formula-card">
                <SectionHeader
                  eyebrow="حساب مستقل عن الزكاة"
                  title="ملخص الفائض والخمس"
                  description="لا يوجد نصاب هنا، ولا تُستخدم نسبة الزكاة 2.5%. الحساب الأساسي هو الفائض السنوي × 20%."
                  icon={<Scale size={22} />}
                />
                <div className="formula-box">
                  <small>الفائض السنوي</small>
                  <strong>{money(khums.surplus)}</strong>
                  <span>إجمالي الدخل والأرباح - المصاريف السنوية المسموحة</span>
                </div>
                <div className={`status-card ${khums.status}`}>
                  <small>حالة الخمس</small>
                  <strong>{statusLabel[khums.status]}</strong>
                  <p>{khums.surplus <= 0 ? 'لا يوجد خمس مستحق حالياً حسب البيانات المدخلة.' : `الخمس المستحق يساوي ${money(khums.khumsDue)}.`}</p>
                </div>
                <div className="split-grid">
                  <div><small>إجمالي الخمس المستحق</small><strong>{money(khums.khumsDue)}</strong></div>
                  <div><small>سهم الإمام</small><strong>{money(khums.imamShare)}</strong></div>
                  <div><small>سهم السادة</small><strong>{money(khums.sayyidShare)}</strong></div>
                  <div><small>المتبقي بعد الخمس</small><strong>{money(khums.remainingAfterKhums)}</strong></div>
                </div>
              </article>
            </section>

            <section className="two-column">
              <FormSectionCard
                eyebrow="الدخل والأرباح"
                title="إجمالي الدخل والأرباح"
                description="أدخل ما تبقى من دخل وأرباح خلال سنة الخمس قبل احتساب المصاريف السنوية."
                icon={<Coins size={22} />}
              >
                <div className="form-grid">
                  {INCOME_FIELDS.map(field => (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <input inputMode="decimal" value={incomeValues[field.key]} onChange={event => setIncomeValues(prev => ({ ...prev, [field.key]: event.target.value }))} placeholder="0.000" />
                    </label>
                  ))}
                </div>
              </FormSectionCard>

              <FormSectionCard
                eyebrow="المصاريف المسموحة"
                title="المصاريف السنوية"
                description="سجّل المصاريف السنوية المسموحة المرتبطة بالمعيشة والعمل والأسرة قبل حساب الفائض."
                icon={<ReceiptText size={22} />}
              >
                <div className="form-grid">
                  {EXPENSE_FIELDS.map(field => (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <input inputMode="decimal" value={expenseValues[field.key]} onChange={event => setExpenseValues(prev => ({ ...prev, [field.key]: event.target.value }))} placeholder="0.000" />
                    </label>
                  ))}
                </div>
              </FormSectionCard>
            </section>

            <section className="panel-card" id="payments">
              <SectionHeader
                eyebrow="متابعة السداد"
                title="دفعات الخمس"
                description="أضف دفعات سهم الإمام أو سهم السادة أو دفعات غير محددة، وتابع المتبقي للسداد."
                icon={<Landmark size={22} />}
                action={<button className="gold-btn compact" type="button" onClick={() => setActivePane('payments')}>إضافة دفعة</button>}
              />
              <div className="payment-layout">
                <div className="payment-form form-grid">
                  <label><span>التاريخ</span><input type="date" value={paymentForm.payment_date} onChange={event => setPaymentForm(prev => ({ ...prev, payment_date: event.target.value }))} /></label>
                  <label><span>المبلغ</span><input inputMode="decimal" value={paymentForm.amount} onChange={event => setPaymentForm(prev => ({ ...prev, amount: event.target.value }))} placeholder="0.000" /></label>
                  <label><span>الجهة المستلمة</span><input value={paymentForm.recipient} onChange={event => setPaymentForm(prev => ({ ...prev, recipient: event.target.value }))} /></label>
                  <label><span>نوع السهم</span><select value={paymentForm.share_type} onChange={event => setPaymentForm(prev => ({ ...prev, share_type: event.target.value as ShareType }))}><option value="imam">سهم الإمام</option><option value="sayyid">سهم السادة</option><option value="unspecified">غير محدد</option></select></label>
                  <label><span>رابط الإيصال / المستند (اختياري)</span><input value={paymentForm.receipt_url} onChange={event => setPaymentForm(prev => ({ ...prev, receipt_url: event.target.value }))} placeholder="https://" /></label>
                  <label><span>ملاحظات</span><input value={paymentForm.notes} onChange={event => setPaymentForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
                  <button className="primary-wide wide" type="button" onClick={addPayment} disabled={!activeYearId}>إضافة دفعة</button>
                </div>

                <div className="payment-summary">
                  <div><small>إجمالي الخمس المستحق</small><strong>{money(khums.khumsDue)}</strong></div>
                  <div><small>المدفوع</small><strong>{money(khums.paidAmount)}</strong></div>
                  <div><small>المتبقي</small><strong>{money(khums.remainingBalance)}</strong></div>
                  <div className={`payment-state ${khums.status}`}><small>حالة السداد</small><strong>{statusLabel[khums.status]}</strong></div>
                </div>
              </div>

              {payments.length === 0 ? (
                <EmptyState
                  icon={<ReceiptText size={26} />}
                  title="لا توجد دفعات خمس محفوظة بعد."
                  description="احفظ سنة الخمس ثم أضف الدفعات لإظهار المدفوع والمتبقي."
                  action={<button className="mini-btn" type="button" onClick={() => setActivePane('payments')}>إضافة دفعة</button>}
                />
              ) : (
                <div className="payment-list">
                  {payments.map(payment => (
                    <article key={payment.id}>
                      <div>
                        <strong>{money(toNumber(payment.amount), payment.currency)}</strong>
                        <span>{shareLabel[payment.share_type]} - {payment.recipient || 'جهة غير محددة'}</span>
                        <small>{dateLabel(payment.payment_date)}{payment.receipt_url ? ` - ${payment.receipt_url}` : ''}</small>
                      </div>
                      <button type="button" onClick={() => void deletePayment(payment)} aria-label="حذف الدفعة"><Trash2 size={15} /></button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activePane === 'reminders' && (
          <section className="panel-card" id="reminders">
            <SectionHeader
              eyebrow="تذكيرات سنة الخمس"
              title="التذكيرات"
              description="أضف تذكيراً قبل نهاية سنة الخمس أو في يوم النهاية أو في موعد مخصص."
              icon={<CalendarDays size={22} />}
            />
            <div className="reminder-form form-grid">
              <label><span>تاريخ التذكير</span><input type="date" value={reminderForm.reminder_date} onChange={event => setReminderForm(prev => ({ ...prev, reminder_date: event.target.value }))} /></label>
              <label><span>نوع التذكير</span><select value={reminderForm.reminder_type} onChange={event => setReminderForm(prev => ({ ...prev, reminder_type: event.target.value as ReminderType }))}><option value="before_year_end_30">قبل نهاية سنة الخمس بـ 30 يوم</option><option value="year_end">يوم نهاية سنة الخمس</option><option value="custom">تذكير مخصص</option></select></label>
              <label className="wide"><span>ملاحظات</span><input value={reminderForm.notes} onChange={event => setReminderForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
              <button className="primary-wide wide" type="button" onClick={addReminder} disabled={!activeYearId}>إضافة تذكير</button>
            </div>

            {reminders.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={26} />}
                title="لا توجد تذكيرات محفوظة بعد."
                description="عند حفظ سنة الخمس، سيتم إنشاء تذكير قبل النهاية وتذكير يوم النهاية."
                action={<button className="mini-btn" type="button" onClick={() => void saveKhumsYear()}>حفظ السنة وإنشاء التذكيرات</button>}
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
                      <button type="button" onClick={() => void updateReminderStatus(reminder, 'completed')}>تم</button>
                      <button type="button" onClick={() => void updateReminderStatus(reminder, 'dismissed')}>تجاهل</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activePane === 'reports' && (
          <section className="reports-layout" id="reports">
            <article className="panel-card">
              <SectionHeader
                eyebrow="تقرير الخمس"
                title="تقرير الخمس السنوي"
                description="ملخص الدخل والمصاريف والخمس المستحق والمدفوع والمتبقي."
                icon={<FileText size={22} />}
                action={(
                  <div className="report-actions">
                    <button className="mini-btn" type="button" onClick={() => window.print()}><Printer size={15} /> طباعة / PDF</button>
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
                eyebrow="تنبيه شرعي"
                title="إخلاء مسؤولية"
                description="هذه الحاسبة أداة تنظيمية وتقديرية فقط، ولا تُعد فتوى شرعية."
                icon={<AlertTriangle size={22} />}
              />
              <p>
                هذه الحاسبة أداة تنظيمية وتقديرية فقط، ولا تُعد فتوى شرعية. تختلف تفاصيل الخمس حسب مرجع التقليد والظروف الشخصية. يُنصح بمراجعة المرجع الديني أو الجهة الشرعية المختصة قبل الاعتماد النهائي على النتائج.
              </p>
            </article>
          </section>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .khums-page{min-height:100vh;background:radial-gradient(circle at 8% 0%,rgba(47,214,192,.11),transparent 30%),var(--sfm-page-gradient);color:var(--sfm-deep-navy);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .khums-loading{min-height:100vh;display:grid;place-items:center;background:var(--sfm-page-gradient)}
        .khums-loading div{width:46px;height:46px;border-radius:50%;border:3px solid rgba(29,140,255,.14);border-top-color:var(--sfm-primary);animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .khums-content{display:grid;gap:18px;width:100%;max-inline-size:min(1280px,100%);margin-inline:auto;min-width:0}
        .khums-content > *,.khums-layout > *,.two-column > *,.reports-layout > *,.form-grid > *,.khums-stat-grid > *{min-width:0}
        .khums-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:22px;border-radius:28px;padding:clamp(22px,3vw,34px);background:radial-gradient(circle at 14% 14%,rgba(167,243,240,.26),transparent 30%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 140%);color:var(--sfm-card);border:1px solid rgba(167,243,240,.18);box-shadow:0 22px 56px rgba(3,18,37,.20)}
        .eyebrow{display:inline-flex;border:1px solid rgba(167,243,240,.2);background:rgba(167,243,240,.10);color:var(--sfm-soft-cyan);border-radius:999px;padding:7px 11px;font-size:12px;font-weight:950}
        .khums-hero h1{margin:12px 0 8px;font-size:clamp(36px,4vw,54px);line-height:1.08;font-weight:950;letter-spacing:0}
        .khums-hero p{margin:0;max-width:760px;color:rgba(234,246,255,.82);font-size:16px;line-height:1.85}
        .disclaimer-badge{display:inline-flex;align-items:center;gap:8px;margin-top:14px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);padding:8px 12px;color:#EAF6FF;font-size:13px;font-weight:900}
        .hero-actions,.report-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
        button,a{font-family:inherit}
        .gold-btn,.dark-btn,.primary-wide,.mini-btn{min-height:44px;border-radius:14px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 15px;font-weight:900;text-decoration:none;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
        .gold-btn,.primary-wide{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 14px 30px rgba(29,140,255,.20)}
        .gold-btn.compact{min-height:40px}
        .dark-btn{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);color:var(--sfm-card)}
        .mini-btn{border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-midnight)}
        .primary-wide{width:auto}
        .gold-btn:hover,.dark-btn:hover,.primary-wide:hover,.mini-btn:hover,.module-tabs a:hover,.module-tabs button:hover,.gold-btn:focus-visible,.dark-btn:focus-visible,.primary-wide:focus-visible,.mini-btn:focus-visible,.module-tabs a:focus-visible,.module-tabs button:focus-visible{transform:translateY(-1px);box-shadow:0 16px 34px rgba(3,18,37,.13),0 0 0 3px rgba(24,212,212,.14);outline:0}
        button:disabled{opacity:.58;cursor:not-allowed;transform:none}
        .module-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:8px;border:1px solid rgba(29,140,255,.13);border-radius:22px;background:rgba(255,255,255,.82);box-shadow:0 10px 28px rgba(3,18,37,.045)}
        .module-tabs a,.module-tabs button{min-height:46px;border-radius:16px;border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-muted-readable);display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-weight:950;font-size:13px;padding:8px 10px;line-height:1.35;cursor:pointer}
        .module-tabs .active{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;border-color:rgba(167,243,240,.28);box-shadow:0 12px 26px rgba(29,140,255,.20)}
        .notice{display:flex;align-items:flex-start;gap:9px;border-radius:16px;padding:13px 14px;font-weight:900;line-height:1.7;border:1px solid rgba(29,140,255,.15);background:rgba(255,255,255,.82);color:var(--sfm-primary-hover)}
        .notice.ok{background:#ECFDF5;color:#047857;border-color:rgba(4,120,87,.18)}
        .notice.warn{background:#FFF7ED;color:#B45309;border-color:rgba(180,83,9,.18)}
        .notice.error{background:#FEF2F2;color:#B91C1C;border-color:rgba(185,28,28,.18)}
        .khums-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(170px,1fr));gap:16px;align-items:stretch;margin-top:4px}
        .stat-card{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto 1fr;align-items:start;gap:7px 12px;min-height:136px;padding:18px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.90));border:1px solid rgba(29,140,255,.13);box-shadow:0 14px 30px rgba(3,18,37,.06)}
        .stat-card span{grid-row:1 / span 2;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(24,212,212,.10));color:var(--sfm-primary);display:grid;place-items:center}
        .stat-card small{color:var(--sfm-muted-readable);font-size:12.5px;font-weight:950;line-height:1.45}
        .stat-card strong{align-self:end;color:var(--sfm-midnight);font-size:clamp(18px,1.35vw,23px);line-height:1.25;overflow-wrap:normal;word-break:keep-all;unicode-bidi:isolate}
        .year-strip{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:12px;padding:12px;border:1px solid rgba(29,140,255,.13);border-radius:18px;background:rgba(255,255,255,.72)}
        .year-strip strong{color:var(--sfm-midnight)}
        .year-strip div{display:flex;gap:8px;overflow-x:auto}
        .year-strip button{flex:0 0 auto;border:1px solid rgba(29,140,255,.15);background:var(--sfm-card);color:var(--sfm-primary-hover);border-radius:999px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}
        .year-strip button.active{background:var(--sfm-midnight);color:#fff;border-color:var(--sfm-midnight)}
        .khums-layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:16px;align-items:start}
        .two-column,.reports-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
        .panel-card{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,251,255,.90));border:1px solid rgba(29,140,255,.13);border-radius:24px;padding:clamp(18px,2vw,24px);box-shadow:0 14px 36px rgba(3,18,37,.065)}
        .section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
        .section-head h2{margin:2px 0 0;color:var(--sfm-midnight);font-size:clamp(20px,1.8vw,24px);line-height:1.35;font-weight:950}
        .section-head p{max-width:720px;margin:6px 0 0;color:var(--sfm-muted-readable);line-height:1.75}
        .section-head small{display:inline-flex;color:#6B5A46;font-size:12px;font-weight:950;line-height:1.35}
        .section-head .head-icon{flex:0 0 auto;width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);border:1px solid rgba(29,140,255,.12)}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .form-grid label,.currency-field{display:grid;gap:7px;color:var(--sfm-midnight);font-size:13px;font-weight:900;min-width:0}
        .form-grid input,.form-grid select,.form-grid textarea{width:100%;min-height:48px;border:1px solid rgba(29,140,255,.18);border-radius:14px;background:#fff;color:var(--sfm-deep-navy);padding-inline:13px;outline:none;font:850 14px Tajawal,Arial,sans-serif}
        .form-grid textarea{min-height:96px;padding-block:12px;resize:vertical;line-height:1.7}
        .form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.16)}
        .wide{grid-column:1/-1}
        .warning-line,.muted-note{margin:12px 0 0;border-radius:14px;padding:11px 12px;line-height:1.7;font-weight:850}
        .warning-line{background:#FFF7ED;color:#B45309;border:1px solid rgba(180,83,9,.16)}
        .muted-note{background:rgba(29,140,255,.07);color:var(--sfm-primary-hover);border:1px solid rgba(29,140,255,.12)}
        .formula-box,.status-card,.payment-summary div,.split-grid div{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:17px;padding:14px;min-width:0}
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
        .payment-list article,.reminder-grid article{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border:1px solid rgba(29,140,255,.13);background:#fff;border-radius:17px;padding:13px;min-width:0}
        .payment-list strong,.reminder-grid strong{display:block;color:var(--sfm-midnight);font-size:16px;line-height:1.4;overflow-wrap:anywhere}
        .payment-list span,.payment-list small,.reminder-grid span,.reminder-grid small{display:block;color:var(--sfm-muted-readable);font-size:12px;line-height:1.6;overflow-wrap:anywhere}
        .payment-list button{width:38px;height:38px;border:1px solid rgba(185,28,28,.14);background:#FEF2F2;color:#B91C1C;border-radius:12px;display:grid;place-items:center;cursor:pointer}
        .reminder-grid article.completed{opacity:.72}
        .reminder-grid article > div:last-child{display:flex;gap:8px;flex-wrap:wrap}
        .reminder-grid button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:11px;min-height:36px;padding:0 10px;font-weight:900;cursor:pointer}
        .empty-panel{margin-top:14px;min-height:132px;display:grid;place-items:center;text-align:center;gap:8px;border:1px dashed rgba(29,140,255,.20);border-radius:20px;background:linear-gradient(135deg,rgba(255,255,255,.88),rgba(234,246,255,.66));padding:20px}
        .empty-panel-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary);border:1px solid rgba(29,140,255,.12)}
        .empty-panel strong{color:var(--sfm-midnight);font-size:17px}
        .empty-panel p{margin:0;max-width:520px;color:var(--sfm-muted-readable);line-height:1.7}
        .report-table{display:grid;gap:8px}
        .report-table div{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1fr);gap:12px;align-items:center;border:1px solid rgba(29,140,255,.11);background:var(--sfm-light-card);border-radius:14px;padding:11px}
        .info-card p{margin:0;color:var(--sfm-muted-readable);line-height:1.9;font-weight:800}
        @media(min-width:1025px){.khums-page .sfm-dashboard-page-shell{width:auto;max-width:none;margin-inline-start:var(--sidebar-w);margin-inline-end:0;padding-inline:clamp(22px,2.4vw,36px)}}
        @media(max-width:1240px){.khums-stat-grid{grid-template-columns:repeat(3,minmax(180px,1fr))}.khums-layout,.two-column,.reports-layout,.payment-layout{grid-template-columns:1fr}}
        @media(max-width:820px){.khums-hero{grid-template-columns:1fr;align-items:start}.hero-actions{justify-content:flex-start}.module-tabs{display:flex;overflow-x:auto;scrollbar-width:none}.module-tabs::-webkit-scrollbar{display:none}.module-tabs a,.module-tabs button{flex:0 0 auto;min-width:132px}.khums-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.year-strip{grid-template-columns:1fr}.section-head{display:grid}.section-head .head-icon{order:-1}.form-grid,.split-grid,.report-table div{grid-template-columns:1fr}}
        @media(max-width:560px){.khums-content{gap:14px}.khums-hero{padding:20px;border-radius:22px}.hero-actions,.report-actions{display:grid;grid-template-columns:1fr;width:100%}.gold-btn,.dark-btn,.mini-btn{width:100%}.khums-stat-grid{grid-template-columns:1fr}.stat-card{min-height:118px}.panel-card{border-radius:20px;padding:16px}.payment-list article,.reminder-grid article{grid-template-columns:1fr}.reminder-grid article > div:last-child{display:grid}.reminder-grid button{width:100%}}
        @media print{.sfm-shared-sidebar,.khums-hero,.module-tabs,.notice,.hero-actions,.payment-form,.reminder-form,.report-actions{display:none!important}.khums-page{background:#fff}.khums-page .sfm-dashboard-page-shell{margin:0!important;padding:0!important}.panel-card{box-shadow:none;border-color:#d9e2ec}}

        /* Khums route production polish for the Charity Projects module. */
        .khums-page{--khums-radius-xl:26px;--khums-radius-lg:20px;--khums-border:rgba(29,140,255,.15);--khums-shadow:0 18px 44px rgba(3,18,37,.075);overflow-x:clip}.khums-page .sfm-dashboard-page-content.khums-content{width:min(100%,1280px);max-inline-size:min(1280px,calc(100vw - 32px));margin-inline:auto;gap:clamp(16px,1.8vw,24px);min-width:0}.khums-page .sfm-dashboard-page-content.khums-content > *{inline-size:100%;min-width:0}
        .khums-hero{grid-template-columns:minmax(0,1fr) minmax(300px,max-content);border-radius:var(--khums-radius-xl);min-height:0}.khums-hero h1{font-size:clamp(32px,3.2vw,48px);letter-spacing:0;text-wrap:balance}.khums-hero p{font-size:15.5px;max-width:780px}.hero-actions{min-width:0}.hero-actions > *{flex:0 1 auto}.khums-page :is(.gold-btn,.dark-btn,.primary-wide,.mini-btn){border-radius:14px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.khums-page :is(button,a,input,select,textarea):focus-visible{outline:3px solid rgba(47,214,192,.34);outline-offset:2px}
        .module-tabs{min-height:62px;align-items:stretch;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}.module-tabs::-webkit-scrollbar{display:none}.module-tabs a,.module-tabs button{min-height:48px;white-space:nowrap}.khums-stat-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.stat-card{height:100%;min-height:124px;border-radius:20px}.stat-card strong,.split-grid strong,.payment-summary strong,.report-table strong,.formula-box strong{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
        .panel-card,.year-strip,.notice{border-radius:var(--khums-radius-xl);border:1px solid var(--khums-border);box-shadow:var(--khums-shadow);min-width:0}.khums-layout{grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:16px}.two-column,.reports-layout,.payment-layout{gap:16px}.section-head{align-items:center}.section-head h2{letter-spacing:0;text-wrap:balance}.section-head p{max-width:760px}.form-grid{gap:14px}.form-grid label{line-height:1.45}.form-grid input,.form-grid select,.form-grid textarea{min-height:46px;border-radius:13px}.empty-panel{min-height:132px;border-radius:20px;padding:18px}.payment-list article,.reminder-grid article,.report-table div,.split-grid div,.formula-box,.status-card,.payment-summary{border-radius:18px;min-width:0}.muted-note,.warning-line{border-radius:16px}.report-actions{flex-wrap:wrap}
        .dark .khums-page{--khums-border:rgba(167,243,240,.14);--khums-shadow:0 18px 44px rgba(0,0,0,.22)}.dark .khums-page :is(.panel-card,.stat-card,.year-strip,.notice,.payment-list article,.reminder-grid article,.report-table div,.split-grid div,.formula-box,.status-card,.payment-summary,.empty-panel){background:linear-gradient(180deg,rgba(16,47,82,.88),rgba(8,24,42,.92));border-color:var(--khums-border);box-shadow:var(--khums-shadow)}.dark .khums-page .module-tabs{background:linear-gradient(135deg,rgba(8,24,42,.94),rgba(16,47,82,.86));border-color:rgba(167,243,240,.14)}.dark .khums-page .module-tabs a,.dark .khums-page .module-tabs button{background:rgba(10,20,34,.72);border-color:rgba(167,243,240,.12);color:var(--sfm-body)}.dark .khums-page .module-tabs .active{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-primary-dark));color:#fff}.dark .khums-page :is(.form-grid input,.form-grid select,.form-grid textarea){background:#081827;border-color:rgba(167,243,240,.18);color:var(--sfm-heading)}.dark .khums-page :is(.section-head h2,.panel-card strong,.stat-card strong,.empty-panel strong,.report-table strong){color:var(--sfm-heading)}.dark .khums-page :is(.section-head p,.muted-note,.empty-panel p,.report-table small,.stat-card small){color:var(--sfm-body)}
        @media(max-width:1260px){.khums-hero{grid-template-columns:1fr}.hero-actions{justify-content:flex-start}.khums-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.khums-layout,.two-column,.reports-layout,.payment-layout{grid-template-columns:1fr}}
        @media(max-width:920px){.khums-page .sfm-dashboard-page-content.khums-content{max-inline-size:min(100%,calc(100vw - 24px))}.module-tabs{display:flex}.module-tabs a,.module-tabs button{flex:0 0 auto;min-width:142px}.khums-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid,.split-grid,.report-table div{grid-template-columns:1fr}.section-head{display:grid}.section-head .head-icon{order:-1}}
        @media(max-width:560px){.khums-page .sfm-dashboard-page-content.khums-content{max-inline-size:min(100%,calc(100vw - 18px));gap:14px}.khums-hero{padding:18px;border-radius:22px}.hero-actions,.report-actions{display:grid;grid-template-columns:1fr;width:100%}.khums-stat-grid{grid-template-columns:1fr}.panel-card{border-radius:22px;padding:16px}.module-tabs button,.module-tabs a{min-width:132px}.gold-btn,.dark-btn,.primary-wide,.mini-btn{width:100%}}

      `}</style>
    </div>
  );
}

function ActionTabs({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav className="module-tabs" aria-label={label}>
      {children}
    </nav>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="stat-card">
      <span><Icon size={18} /></span>
      <small>{label}</small>
      <strong dir="ltr">{value}</strong>
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
