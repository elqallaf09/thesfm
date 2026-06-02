'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  Gauge,
  Landmark,
  PauseCircle,
  PlayCircle,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type DebtStatus = 'active' | 'paid' | 'paused';
type InterestType = 'none' | 'annual' | 'monthly';

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  creditor_name: string | null;
  original_amount: number | string;
  remaining_amount: number | string;
  currency: string;
  start_date: string;
  monthly_payment: number | string;
  interest_rate: number | string | null;
  interest_type: InterestType | string | null;
  payment_day: number | string | null;
  category: string | null;
  notes: string | null;
  auto_add_to_expenses: boolean | null;
  status: DebtStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DebtPaymentRow = {
  id: string;
  user_id: string;
  debt_id: string;
  payment_date: string;
  amount: number | string;
  interest_amount: number | string | null;
  principal_amount: number | string | null;
  expense_id: string | null;
};

type DebtForm = {
  id?: string;
  name: string;
  creditorName: string;
  originalAmount: string;
  remainingAmount: string;
  currency: string;
  startDate: string;
  monthlyPayment: string;
  interestRate: string;
  interestType: InterestType;
  paymentDay: string;
  notes: string;
  autoAddToExpenses: boolean;
  status: DebtStatus;
};

const SUPPORTED_CURRENCIES = ['KWD', 'USD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'EUR', 'GBP'];

const DEFAULT_FORM: DebtForm = {
  name: '',
  creditorName: '',
  originalAmount: '',
  remainingAmount: '',
  currency: 'KWD',
  startDate: new Date().toISOString().slice(0, 10),
  monthlyPayment: '',
  interestRate: '0',
  interestType: 'annual',
  paymentDay: '1',
  notes: '',
  autoAddToExpenses: true,
  status: 'active',
};

const TEXT = {
  title: { ar: 'الديون', en: 'Debts', fr: 'Dettes' },
  subtitle: {
    ar: 'تابع التزاماتك الشهرية وخطط لسدادها دون التأثير على ميزانيتك.',
    en: 'Track monthly obligations and plan repayments without disrupting your budget.',
    fr: 'Suivez vos engagements mensuels et planifiez leur remboursement sans déséquilibrer votre budget.',
  },
  addDebt: { ar: 'إضافة دين', en: 'Add debt', fr: 'Ajouter une dette' },
  editDebt: { ar: 'تعديل الدين', en: 'Edit debt', fr: 'Modifier la dette' },
  totalDebts: { ar: 'إجمالي الديون', en: 'Total debts', fr: 'Total des dettes' },
  remainingToPay: { ar: 'المتبقي للسداد', en: 'Remaining to pay', fr: 'Reste à rembourser' },
  monthlyInstallments: { ar: 'إجمالي الأقساط الشهرية', en: 'Monthly payments', fr: 'Mensualités totales' },
  highestDebt: { ar: 'أعلى دين', en: 'Highest debt', fr: 'Dette la plus élevée' },
  debtToIncome: { ar: 'نسبة الديون من الدخل الشهري', en: 'Debt-to-income ratio', fr: 'Ratio dette/revenu' },
  debtAnalysis: { ar: 'تحليل الديون', en: 'Debt analysis', fr: 'Analyse des dettes' },
  educational: { ar: 'تحليل تعليمي محسوب من بياناتك', en: 'Educational analysis from your data', fr: 'Analyse éducative calculée à partir de vos données' },
  noDebts: { ar: 'لا توجد ديون بعد', en: 'No debts yet', fr: 'Aucune dette pour le moment' },
  noDebtsBody: {
    ar: 'أضف أول دين لتتبع الرصيد المتبقي، الأقساط، وتاريخ السداد القادم.',
    en: 'Add your first debt to track remaining balance, payments, and the next due date.',
    fr: 'Ajoutez votre première dette pour suivre le solde restant, les paiements et la prochaine échéance.',
  },
  name: { ar: 'اسم الدين', en: 'Debt name', fr: 'Nom de la dette' },
  namePlaceholder: { ar: 'مثال: قرض سيارة أو بطاقة ائتمان', en: 'Example: car loan or credit card', fr: 'Exemple : prêt auto ou carte de crédit' },
  creditor: { ar: 'الجهة الدائنة', en: 'Creditor', fr: 'Créancier' },
  creditorPlaceholder: { ar: 'بنك أو شركة تمويل أو شخص', en: 'Bank, finance company, or person', fr: 'Banque, société de financement ou personne' },
  originalAmount: { ar: 'مبلغ الدين الأصلي', en: 'Original amount', fr: 'Montant initial' },
  remainingAmount: { ar: 'المبلغ المتبقي', en: 'Remaining amount', fr: 'Montant restant' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  startDate: { ar: 'تاريخ بداية الدين', en: 'Start date', fr: 'Date de début' },
  monthlyPayment: { ar: 'قيمة الدفع الشهري', en: 'Monthly payment', fr: 'Paiement mensuel' },
  interestRate: { ar: 'نسبة الفائدة', en: 'Interest rate', fr: 'Taux d’intérêt' },
  interestType: { ar: 'نوع الفائدة', en: 'Interest type', fr: 'Type d’intérêt' },
  noInterest: { ar: 'بدون فائدة', en: 'No interest', fr: 'Sans intérêt' },
  annualInterest: { ar: 'فائدة سنوية', en: 'Annual interest', fr: 'Intérêt annuel' },
  monthlyInterest: { ar: 'فائدة شهرية', en: 'Monthly interest', fr: 'Intérêt mensuel' },
  paymentDay: { ar: 'يوم الدفع الشهري', en: 'Monthly payment day', fr: 'Jour de paiement mensuel' },
  autoExpense: { ar: 'إضافة الدفعة الشهرية إلى المصروفات تلقائيًا', en: 'Add monthly payment to expenses automatically', fr: 'Ajouter automatiquement la mensualité aux dépenses' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  save: { ar: 'حفظ الدين', en: 'Save debt', fr: 'Enregistrer la dette' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving...', fr: 'Enregistrement...' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  active: { ar: 'نشط', en: 'Active', fr: 'Active' },
  paid: { ar: 'مدفوع', en: 'Paid', fr: 'Payée' },
  paused: { ar: 'متوقف', en: 'Paused', fr: 'Suspendue' },
  remaining: { ar: 'المتبقي', en: 'Remaining', fr: 'Restant' },
  paidAmount: { ar: 'المدفوع', en: 'Paid', fr: 'Payé' },
  payoffRate: { ar: 'نسبة السداد', en: 'Payoff rate', fr: 'Taux de remboursement' },
  nextPayment: { ar: 'الدفعة القادمة', en: 'Next payment', fr: 'Prochain paiement' },
  paymentDayLabel: { ar: 'يوم الدفع', en: 'Payment day', fr: 'Jour de paiement' },
  recordPayment: { ar: 'تسجيل دفعة', en: 'Record payment', fr: 'Enregistrer un paiement' },
  pause: { ar: 'إيقاف مؤقت', en: 'Pause', fr: 'Suspendre' },
  resume: { ar: 'استئناف', en: 'Resume', fr: 'Reprendre' },
  markPaid: { ar: 'تم السداد', en: 'Mark paid', fr: 'Marquer payée' },
  delete: { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
  edit: { ar: 'تعديل', en: 'Edit', fr: 'Modifier' },
  monthlyRatio: { ar: 'نسبة الأقساط من الدخل الشهري', en: 'Payments as share of income', fr: 'Mensualités en part du revenu' },
  incomeUnavailable: { ar: 'لا توجد بيانات دخل كافية لحساب النسبة.', en: 'Not enough income data to calculate the ratio.', fr: 'Données de revenu insuffisantes pour calculer le ratio.' },
  ratioHigh: { ar: 'تتجاوز أقساط الديون 30% من الدخل الشهري المسجل. راجع الالتزامات بعناية.', en: 'Debt payments exceed 30% of recorded monthly income. Review obligations carefully.', fr: 'Les mensualités dépassent 30 % du revenu mensuel enregistré. Examinez les engagements avec attention.' },
  ratioOk: { ar: 'نسبة الأقساط ضمن نطاق يمكن متابعته وفق البيانات المسجلة.', en: 'The payment ratio is within a trackable range based on recorded data.', fr: 'Le ratio de mensualités reste dans une plage suivable selon les données enregistrées.' },
  highestImpact: { ar: 'أعلى دين تأثيرًا على الميزانية', en: 'Highest budget impact', fr: 'Impact budgétaire le plus élevé' },
  payoffOrder: { ar: 'اقتراح ترتيب السداد', en: 'Suggested payoff order', fr: 'Ordre de remboursement suggéré' },
  highestInterestFirst: { ar: 'الأعلى فائدة أولًا', en: 'Highest interest first', fr: 'Taux le plus élevé d’abord' },
  smallestDebtFirst: { ar: 'أصغر دين أولًا', en: 'Smallest debt first', fr: 'Plus petite dette d’abord' },
  payoffEstimate: { ar: 'تقدير مدة السداد', en: 'Estimated payoff period', fr: 'Durée estimée de remboursement' },
  months: { ar: 'شهر', en: 'months', fr: 'mois' },
  interestWarning: {
    ar: 'القسط الشهري لا يغطي الفائدة، وقد يزيد الدين بدلًا من أن ينقص.',
    en: 'The monthly payment does not cover interest, so the debt may increase instead of decrease.',
    fr: 'La mensualité ne couvre pas les intérêts, la dette peut donc augmenter au lieu de diminuer.',
  },
  unavailable: { ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' },
  loading: { ar: 'جارٍ تحميل الديون...', en: 'Loading debts...', fr: 'Chargement des dettes...' },
  saved: { ar: 'تم حفظ الدين بنجاح.', en: 'Debt saved successfully.', fr: 'Dette enregistrée avec succès.' },
  deleted: { ar: 'تم حذف الدين.', en: 'Debt deleted.', fr: 'Dette supprimée.' },
  paymentRecorded: { ar: 'تم تسجيل الدفعة وتحديث الرصيد.', en: 'Payment recorded and balance updated.', fr: 'Paiement enregistré et solde mis à jour.' },
  generatedPayments: { ar: 'تمت إضافة الدفعات الشهرية المستحقة.', en: 'Due monthly payments were added.', fr: 'Les mensualités dues ont été ajoutées.' },
  required: { ar: 'يرجى إكمال الحقول المطلوبة بقيم صحيحة.', en: 'Please complete required fields with valid values.', fr: 'Veuillez compléter les champs obligatoires avec des valeurs valides.' },
  duplicatePayment: { ar: 'تم تسجيل دفعة لهذا الدين في هذا التاريخ مسبقًا.', en: 'A payment for this debt already exists on this date.', fr: 'Un paiement pour cette dette existe déjà à cette date.' },
  error: { ar: 'تعذر إكمال العملية. حاول مرة أخرى لاحقًا.', en: 'Could not complete the action. Please try again later.', fr: 'Impossible de terminer l’action. Réessayez plus tard.' },
  yes: { ar: 'نعم', en: 'Yes', fr: 'Oui' },
  no: { ar: 'لا', en: 'No', fr: 'Non' },
  dueToday: { ar: 'مستحق اليوم', en: 'Due today', fr: 'Dû aujourd’hui' },
  tableView: { ar: 'جدول الديون', en: 'Debts table', fr: 'Tableau des dettes' },
};

function tr(lang: string | undefined, key: keyof typeof TEXT) {
  const safeLang: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  return TEXT[key][safeLang];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPaymentDay(value: unknown) {
  return Math.min(31, Math.max(1, Math.round(toNumber(value, 1))));
}

function dueDateForMonth(day: number, base = new Date()) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function nextPaymentDate(debt: DebtRow) {
  const now = new Date();
  let next = dueDateForMonth(clampPaymentDay(debt.payment_day), now);
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = dueDateForMonth(clampPaymentDay(debt.payment_day), new Date(now.getFullYear(), now.getMonth() + 1, 1));
  }
  return next.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return TEXT.unavailable[lang];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function monthlyInterestAmount(debt: DebtRow) {
  const remaining = toNumber(debt.remaining_amount);
  const rate = toNumber(debt.interest_rate);
  const type = debt.interest_type || 'annual';
  const monthlyRate = type === 'none' ? 0 : type === 'monthly' ? rate / 100 : rate / 100 / 12;
  return remaining * monthlyRate;
}

function calculateDebtPayment(debt: DebtRow, overrideAmount?: number) {
  const amount = overrideAmount ?? toNumber(debt.monthly_payment);
  const interestAmount = Math.max(0, monthlyInterestAmount(debt));
  const principalAmount = amount - interestAmount;
  const nextRemaining = Math.max(0, toNumber(debt.remaining_amount) - principalAmount);
  return {
    amount,
    interestAmount,
    principalAmount,
    nextRemaining,
    warning: principalAmount < 0,
  };
}

function payoffProgress(debt: DebtRow) {
  const original = toNumber(debt.original_amount);
  if (original <= 0) return 0;
  const paid = Math.max(0, original - toNumber(debt.remaining_amount));
  return Math.min(100, Math.max(0, (paid / original) * 100));
}

function estimatePayoffMonths(debt: DebtRow) {
  let remaining = toNumber(debt.remaining_amount);
  const payment = toNumber(debt.monthly_payment);
  if (remaining <= 0) return 0;
  if (payment <= 0) return null;
  for (let month = 1; month <= 600; month += 1) {
    const interest = monthlyInterestAmount({ ...debt, remaining_amount: remaining });
    const principal = payment - interest;
    if (principal <= 0) return null;
    remaining = Math.max(0, remaining - principal);
    if (remaining <= 0) return month;
  }
  return null;
}

function payloadFromForm(form: DebtForm, userId: string) {
  return {
    user_id: userId,
    name: form.name.trim(),
    creditor_name: form.creditorName.trim() || null,
    original_amount: toNumber(form.originalAmount),
    remaining_amount: toNumber(form.remainingAmount || form.originalAmount),
    currency: form.currency,
    start_date: form.startDate,
    monthly_payment: toNumber(form.monthlyPayment),
    interest_rate: toNumber(form.interestRate),
    interest_type: form.interestType,
    payment_day: clampPaymentDay(form.paymentDay),
    category: 'debt',
    notes: form.notes.trim() || null,
    auto_add_to_expenses: form.autoAddToExpenses,
    status: form.status,
  };
}

function isValidForm(form: DebtForm) {
  return Boolean(
    form.name.trim()
    && form.startDate
    && toNumber(form.originalAmount) > 0
    && toNumber(form.remainingAmount || form.originalAmount) >= 0
    && toNumber(form.monthlyPayment) > 0
    && clampPaymentDay(form.paymentDay) >= 1
  );
}

export default function DebtsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const { currency: baseCurrency } = useCurrency();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<DebtPaymentRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DebtForm>({ ...DEFAULT_FORM, currency: baseCurrency || 'KWD' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [generationChecked, setGenerationChecked] = useState(false);

  const t = useCallback((key: keyof typeof TEXT) => tr(locale, key), [locale]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [debtsResult, paymentsResult, incomeResult] = await Promise.all([
        (supabase as any).from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
        (supabase as any).from('monthly_income_sources').select('*').eq('user_id', user.id),
      ]);

      if (debtsResult.error) throw debtsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      setDebts(debtsResult.data ?? []);
      setPayments(paymentsResult.data ?? []);
      setIncomeRows(incomeResult.error ? [] : incomeResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (baseCurrency) setForm(current => ({ ...current, currency: current.id ? current.currency : baseCurrency }));
  }, [baseCurrency]);

  useEffect(() => {
    if (!authLoading && user) void loadData();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, loadData, user]);

  useEffect(() => {
    async function generateDuePayments() {
      if (!user || !session?.access_token || generationChecked) return;
      setGenerationChecked(true);
      try {
        const response = await fetch('/api/debts/generate-monthly-expenses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null) as { processed?: number } | null;
        if (response.ok && payload?.processed && payload.processed > 0) {
          setNotice(t('generatedPayments'));
          await loadData();
        }
      } catch {
        // The page remains usable even if automation is not configured locally.
      }
    }
    void generateDuePayments();
  }, [generationChecked, loadData, session?.access_token, t, user]);

  const activeDebts = useMemo(() => debts.filter(debt => debt.status !== 'paid'), [debts]);
  const monthlyIncome = useMemo(() => incomeRows.reduce((sum, row) => sum + toNumber(row.amount), 0), [incomeRows]);
  const totals = useMemo(() => {
    const totalOriginal = debts.reduce((sum, debt) => sum + toNumber(debt.original_amount), 0);
    const totalRemaining = activeDebts.reduce((sum, debt) => sum + toNumber(debt.remaining_amount), 0);
    const totalMonthly = activeDebts.reduce((sum, debt) => sum + toNumber(debt.monthly_payment), 0);
    const highest = activeDebts.reduce<DebtRow | null>((current, debt) => {
      if (!current || toNumber(debt.remaining_amount) > toNumber(current.remaining_amount)) return debt;
      return current;
    }, null);
    return {
      totalOriginal,
      totalRemaining,
      totalMonthly,
      highest,
      ratio: monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : null,
    };
  }, [activeDebts, debts, monthlyIncome]);

  const payoffMonths = useMemo(() => {
    const estimates = activeDebts.map(estimatePayoffMonths).filter((item): item is number => typeof item === 'number');
    return estimates.length > 0 ? Math.max(...estimates) : null;
  }, [activeDebts]);

  const interestRiskDebt = activeDebts.find(debt => calculateDebtPayment(debt).warning);
  const highestInterest = [...activeDebts].sort((a, b) => toNumber(b.interest_rate) - toNumber(a.interest_rate))[0];
  const smallestDebt = [...activeDebts].sort((a, b) => toNumber(a.remaining_amount) - toNumber(b.remaining_amount))[0];

  function resetForm() {
    setForm({ ...DEFAULT_FORM, currency: baseCurrency || 'KWD' });
    setFormOpen(false);
  }

  function openAddForm() {
    setForm({ ...DEFAULT_FORM, currency: baseCurrency || 'KWD' });
    setFormOpen(true);
  }

  function openEditForm(debt: DebtRow) {
    setForm({
      id: debt.id,
      name: debt.name,
      creditorName: debt.creditor_name ?? '',
      originalAmount: String(debt.original_amount ?? ''),
      remainingAmount: String(debt.remaining_amount ?? ''),
      currency: debt.currency || baseCurrency || 'KWD',
      startDate: debt.start_date,
      monthlyPayment: String(debt.monthly_payment ?? ''),
      interestRate: String(debt.interest_rate ?? '0'),
      interestType: (debt.interest_type === 'none' || debt.interest_type === 'monthly' || debt.interest_type === 'annual') ? debt.interest_type : 'annual',
      paymentDay: String(debt.payment_day ?? '1'),
      notes: debt.notes ?? '',
      autoAddToExpenses: debt.auto_add_to_expenses !== false,
      status: (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active',
    });
    setFormOpen(true);
  }

  async function saveDebt(event: FormEvent) {
    event.preventDefault();
    if (!user || !isValidForm(form)) {
      setError(t('required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = payloadFromForm(form, user.id);
      const result = form.id
        ? await (supabase as any).from('debts').update(payload).eq('id', form.id).eq('user_id', user.id)
        : await (supabase as any).from('debts').insert(payload);
      if (result.error) throw result.error;
      setNotice(t('saved'));
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(debt: DebtRow, status: DebtStatus, remainingAmount?: number) {
    if (!user) return;
    setError('');
    const payload: Record<string, unknown> = { status };
    if (typeof remainingAmount === 'number') payload.remaining_amount = remainingAmount;
    const { error: updateError } = await (supabase as any).from('debts').update(payload).eq('id', debt.id).eq('user_id', user.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(status === 'paid' ? t('paid') : status === 'paused' ? t('paused') : t('active'));
      await loadData();
    }
  }

  async function deleteDebt(debt: DebtRow) {
    if (!user) return;
    const confirmed = window.confirm(`${t('delete')} - ${debt.name}?`);
    if (!confirmed) return;
    const { error: deleteError } = await (supabase as any).from('debts').delete().eq('id', debt.id).eq('user_id', user.id);
    if (deleteError) setError(deleteError.message);
    else {
      setNotice(t('deleted'));
      await loadData();
    }
  }

  async function recordPayment(debt: DebtRow) {
    if (!user) return;
    setError('');
    const paymentDate = new Date().toISOString().slice(0, 10);
    const existing = await (supabase as any)
      .from('debt_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('debt_id', debt.id)
      .eq('payment_date', paymentDate)
      .maybeSingle();
    if (existing.data?.id) {
      setError(t('duplicatePayment'));
      return;
    }

    const payment = calculateDebtPayment(debt);
    try {
      let expenseId: string | null = null;
      if (debt.auto_add_to_expenses !== false) {
        const expenseExisting = await (supabase as any)
          .from('expense_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('debt_id', debt.id)
          .eq('source', 'debt')
          .eq('date', paymentDate)
          .maybeSingle();
        expenseId = expenseExisting.data?.id ?? null;
        if (!expenseId) {
          const expenseInsert = await (supabase as any).from('expense_items').insert({
            user_id: user.id,
            name: `${locale === 'ar' ? 'دفعة شهرية' : locale === 'fr' ? 'Mensualité' : 'Monthly payment'}: ${debt.name}`,
            amount: payment.amount,
            currency: debt.currency || 'KWD',
            category: 'debt',
            date: paymentDate,
            notes: debt.notes,
            source: 'debt',
            debt_id: debt.id,
            enhanced: { source: 'debt', debt_id: debt.id, manual: true },
          }).select('id').maybeSingle();
          if (expenseInsert.error) throw expenseInsert.error;
          expenseId = expenseInsert.data?.id ?? null;
        }
      }

      const paymentInsert = await (supabase as any).from('debt_payments').insert({
        user_id: user.id,
        debt_id: debt.id,
        payment_date: paymentDate,
        amount: payment.amount,
        interest_amount: payment.interestAmount,
        principal_amount: payment.principalAmount,
        expense_id: expenseId,
      });
      if (paymentInsert.error) throw paymentInsert.error;

      const status = payment.nextRemaining <= 0 ? 'paid' : debt.status || 'active';
      const update = await (supabase as any).from('debts').update({
        remaining_amount: payment.nextRemaining,
        status,
      }).eq('id', debt.id).eq('user_id', user.id);
      if (update.error) throw update.error;
      setNotice(payment.warning ? t('interestWarning') : t('paymentRecorded'));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  const money = (value: unknown, currency = baseCurrency || 'KWD') => formatMoney(toNumber(value), currency, locale);

  if (authLoading || loading) {
    return (
      <div className="debts-shell" dir={dir}>
        <Sidebar />
        <main className="debts-main">
          <div className="debts-loading">{t('loading')}</div>
        </main>
        <DebtStyles />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="debts-shell" dir={dir}>
        <Sidebar />
        <main className="debts-main">
          <section className="debts-empty">
            <CreditCard size={28} />
            <h1>{t('title')}</h1>
            <p>{t('noDebtsBody')}</p>
          </section>
        </main>
        <DebtStyles />
      </div>
    );
  }

  return (
    <div className="debts-shell" dir={dir}>
      <Sidebar />
      <main className="debts-main">
        <section className="debts-hero">
          <div>
            <span className="debts-eyebrow"><Landmark size={16} /> THE SFM</span>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <button type="button" className="debts-primary" onClick={openAddForm}>
            <Plus size={18} />
            {t('addDebt')}
          </button>
        </section>

        {(notice || error || supabaseConfigError) && (
          <section className={`debts-notice ${error || supabaseConfigError ? 'error' : 'success'}`}>
            {error || supabaseConfigError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || supabaseConfigError || notice}</span>
          </section>
        )}

        <section className="debts-summary-grid">
          <SummaryCard icon={<WalletCards size={18} />} label={t('totalDebts')} value={money(totals.totalOriginal)} />
          <SummaryCard icon={<CreditCard size={18} />} label={t('remainingToPay')} value={money(totals.totalRemaining)} />
          <SummaryCard icon={<ReceiptText size={18} />} label={t('monthlyInstallments')} value={money(totals.totalMonthly)} />
          <SummaryCard icon={<Gauge size={18} />} label={t('highestDebt')} value={totals.highest ? money(totals.highest.remaining_amount, totals.highest.currency) : t('unavailable')} />
          <SummaryCard icon={<Sparkles size={18} />} label={t('debtToIncome')} value={totals.ratio === null ? t('unavailable') : `${totals.ratio.toFixed(1)}%`} />
        </section>

        <section className="debts-layout">
          <div className="debts-list-panel">
            <div className="debts-section-head">
              <div>
                <span>{t('tableView')}</span>
                <h2>{t('title')}</h2>
              </div>
              <button type="button" onClick={openAddForm}><Plus size={16} />{t('addDebt')}</button>
            </div>

            {debts.length === 0 ? (
              <div className="debts-empty">
                <CreditCard size={30} />
                <h2>{t('noDebts')}</h2>
                <p>{t('noDebtsBody')}</p>
                <button type="button" className="debts-primary" onClick={openAddForm}>{t('addDebt')}</button>
              </div>
            ) : (
              <div className="debt-card-grid">
                {debts.map(debt => {
                  const progress = payoffProgress(debt);
                  const status = (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active';
                  const paidAmount = Math.max(0, toNumber(debt.original_amount) - toNumber(debt.remaining_amount));
                  const isDue = nextPaymentDate(debt) === new Date().toISOString().slice(0, 10);
                  return (
                    <article className="debt-card" key={debt.id}>
                      <div className="debt-card-top">
                        <div>
                          <h3>{debt.name}</h3>
                          <p>{debt.creditor_name || t('unavailable')}</p>
                        </div>
                        <span className={`debt-status ${status}`}>{t(status)}</span>
                      </div>
                      <div className="debt-progress">
                        <span><b>{t('payoffRate')}</b><strong dir="ltr">{progress.toFixed(1)}%</strong></span>
                        <i><b style={{ width: `${progress}%` }} /></i>
                      </div>
                      <div className="debt-metrics">
                        <DebtMetric label={t('remaining')} value={money(debt.remaining_amount, debt.currency)} />
                        <DebtMetric label={t('paidAmount')} value={money(paidAmount, debt.currency)} />
                        <DebtMetric label={t('monthlyPayment')} value={money(debt.monthly_payment, debt.currency)} />
                        <DebtMetric label={t('interestRate')} value={`${toNumber(debt.interest_rate).toFixed(2)}%`} />
                        <DebtMetric label={t('paymentDayLabel')} value={`${clampPaymentDay(debt.payment_day)}`} />
                        <DebtMetric label={t('nextPayment')} value={formatDate(nextPaymentDate(debt), locale)} />
                      </div>
                      {calculateDebtPayment(debt).warning && (
                        <div className="debt-warning"><AlertTriangle size={15} />{t('interestWarning')}</div>
                      )}
                      {isDue && status === 'active' && <div className="debt-due"><CalendarDays size={15} />{t('dueToday')}</div>}
                      <div className="debt-actions">
                        <button type="button" onClick={() => openEditForm(debt)}><Edit3 size={15} />{t('edit')}</button>
                        {status === 'active' && <button type="button" onClick={() => void recordPayment(debt)}><ReceiptText size={15} />{t('recordPayment')}</button>}
                        {status === 'paused'
                          ? <button type="button" onClick={() => void updateStatus(debt, 'active')}><PlayCircle size={15} />{t('resume')}</button>
                          : status === 'active' ? <button type="button" onClick={() => void updateStatus(debt, 'paused')}><PauseCircle size={15} />{t('pause')}</button> : null}
                        {status !== 'paid' && <button type="button" onClick={() => void updateStatus(debt, 'paid', 0)}><CheckCircle2 size={15} />{t('markPaid')}</button>}
                        <button type="button" className="danger" onClick={() => void deleteDebt(debt)}><Trash2 size={15} />{t('delete')}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="debts-insight">
            <div className="debts-section-head compact">
              <div>
                <span>{t('educational')}</span>
                <h2>{t('debtAnalysis')}</h2>
              </div>
            </div>
            <InsightRow label={t('monthlyRatio')} value={totals.ratio === null ? t('incomeUnavailable') : `${totals.ratio.toFixed(1)}%`} />
            <p className={totals.ratio !== null && totals.ratio > 30 ? 'insight-alert' : 'insight-copy'}>
              {totals.ratio === null ? t('incomeUnavailable') : totals.ratio > 30 ? t('ratioHigh') : t('ratioOk')}
            </p>
            {interestRiskDebt && <p className="insight-alert">{t('interestWarning')}</p>}
            <InsightRow label={t('highestImpact')} value={totals.highest ? `${totals.highest.name} - ${money(totals.highest.remaining_amount, totals.highest.currency)}` : t('unavailable')} />
            <InsightRow label={t('highestInterestFirst')} value={highestInterest ? highestInterest.name : t('unavailable')} />
            <InsightRow label={t('smallestDebtFirst')} value={smallestDebt ? smallestDebt.name : t('unavailable')} />
            <InsightRow label={t('payoffEstimate')} value={payoffMonths === null ? t('unavailable') : `${payoffMonths} ${t('months')}`} />
          </aside>
        </section>

        {payments.length > 0 && (
          <section className="payments-panel">
            <div className="debts-section-head">
              <div>
                <span>{t('recordPayment')}</span>
                <h2>{t('monthlyInstallments')}</h2>
              </div>
            </div>
            <div className="payments-list">
              {payments.slice(0, 8).map(payment => {
                const debt = debts.find(item => item.id === payment.debt_id);
                return (
                  <div className="payment-row" key={payment.id}>
                    <span>{debt?.name ?? t('unavailable')}</span>
                    <b dir="ltr">{money(payment.amount, debt?.currency || baseCurrency || 'KWD')}</b>
                    <small>{formatDate(payment.payment_date, locale)}</small>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {formOpen && (
        <div className="debt-modal-backdrop" role="dialog" aria-modal="true" aria-label={form.id ? t('editDebt') : t('addDebt')}>
          <form className="debt-modal" onSubmit={saveDebt}>
            <div className="debt-modal-head">
              <div>
                <span>{form.id ? t('editDebt') : t('addDebt')}</span>
                <h2>{t('title')}</h2>
              </div>
              <button type="button" onClick={resetForm} aria-label={t('cancel')}><X size={18} /></button>
            </div>
            <div className="debt-form-grid">
              <DebtInput label={t('name')} value={form.name} placeholder={t('namePlaceholder')} onChange={value => setForm(current => ({ ...current, name: value }))} />
              <DebtInput label={t('creditor')} value={form.creditorName} placeholder={t('creditorPlaceholder')} onChange={value => setForm(current => ({ ...current, creditorName: value }))} />
              <MoneyInput label={t('originalAmount')} currency={form.currency} value={form.originalAmount} onChange={value => setForm(current => ({ ...current, originalAmount: value, remainingAmount: current.remainingAmount || value }))} />
              <MoneyInput label={t('remainingAmount')} currency={form.currency} value={form.remainingAmount} onChange={value => setForm(current => ({ ...current, remainingAmount: value }))} />
              <label className="debt-field">
                <span>{t('currency')}</span>
                <select value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value }))}>
                  {SUPPORTED_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <DebtInput type="date" label={t('startDate')} value={form.startDate} onChange={value => setForm(current => ({ ...current, startDate: value }))} />
              <MoneyInput label={t('monthlyPayment')} currency={form.currency} value={form.monthlyPayment} onChange={value => setForm(current => ({ ...current, monthlyPayment: value }))} />
              <SuffixInput label={t('interestRate')} suffix="%" value={form.interestRate} onChange={value => setForm(current => ({ ...current, interestRate: value }))} />
              <label className="debt-field">
                <span>{t('interestType')}</span>
                <select value={form.interestType} onChange={event => setForm(current => ({ ...current, interestType: event.target.value as InterestType }))}>
                  <option value="none">{t('noInterest')}</option>
                  <option value="annual">{t('annualInterest')}</option>
                  <option value="monthly">{t('monthlyInterest')}</option>
                </select>
              </label>
              <SuffixInput label={t('paymentDay')} suffix="1 - 31" value={form.paymentDay} onChange={value => setForm(current => ({ ...current, paymentDay: value }))} />
              <label className="debt-field wide toggle-row">
                <span>{t('autoExpense')}</span>
                <button type="button" aria-pressed={form.autoAddToExpenses} onClick={() => setForm(current => ({ ...current, autoAddToExpenses: !current.autoAddToExpenses }))}>
                  {form.autoAddToExpenses ? t('yes') : t('no')}
                </button>
              </label>
              <label className="debt-field wide">
                <span>{t('notes')}</span>
                <textarea value={form.notes} rows={3} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="debt-modal-actions">
              <button type="button" onClick={resetForm}>{t('cancel')}</button>
              <button type="submit" className="debts-primary" disabled={saving}>{saving ? t('saving') : t('save')}</button>
            </div>
          </form>
        </div>
      )}
      <DebtStyles />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="debt-summary-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir="ltr">{value}</strong>
      </div>
    </article>
  );
}

function DebtMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="debt-metric">
      <span>{label}</span>
      <b dir="ltr">{value}</b>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-row">
      <span>{label}</span>
      <b dir="auto">{value}</b>
    </div>
  );
}

function DebtInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="debt-field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function MoneyInput({ label, currency, value, onChange }: { label: string; currency: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="debt-field">
      <span>{label}</span>
      <div className="affix-input">
        <em dir="ltr">{currency}</em>
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(event.target.value.replace(/[^\d.]/g, ''))} />
      </div>
    </label>
  );
}

function SuffixInput({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="debt-field">
      <span>{label}</span>
      <div className="affix-input">
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(event.target.value.replace(/[^\d.]/g, ''))} />
        <em dir="ltr">{suffix}</em>
      </div>
    </label>
  );
}

function DebtStyles() {
  return (
    <style jsx global>{`
      .debts-shell {
        min-height: 100dvh;
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .10), transparent 34%),
          var(--sfm-light-card);
        color: var(--sfm-foreground);
        font-family: Tajawal, Arial, sans-serif;
        overflow-x: hidden;
      }

      .debts-main {
        width: calc(100% - var(--sidebar-w, 230px));
        margin-inline-start: var(--sidebar-w, 230px);
        padding: 24px;
        display: grid;
        gap: 22px;
        box-sizing: border-box;
      }

      .debts-main > * {
        width: 100%;
        max-width: 1500px;
        margin-inline: auto;
        min-width: 0;
      }

      .debts-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        border: 1px solid rgba(167, 243, 240, .24);
        border-radius: 30px;
        padding: clamp(22px, 3vw, 34px);
        color: #fff;
        background: linear-gradient(135deg, var(--sfm-foreground) 0%, var(--sfm-primary-dark) 58%, var(--sfm-soft-cyan) 145%);
        box-shadow: 0 22px 60px rgba(3, 18, 37, .14);
      }

      .debts-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(167, 243, 240, .28);
        background: rgba(167, 243, 240, .12);
        color: var(--sfm-soft-cyan);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 14px;
      }

      .debts-hero h1 {
        margin: 0 0 10px;
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1;
        font-weight: 950;
      }

      .debts-hero p {
        margin: 0;
        max-width: 760px;
        color: rgba(255, 255, 255, .74);
        font-size: 15px;
        font-weight: 800;
        line-height: 1.8;
      }

      .debts-primary,
      .debts-section-head button {
        border: 0;
        border-radius: 999px;
        min-height: 46px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 12px 28px rgba(29, 140, 255, .22);
      }

      .debts-notice,
      .payments-panel,
      .debts-list-panel,
      .debts-insight,
      .debt-summary-card,
      .debt-card,
      .debt-modal,
      .debts-empty {
        border: 1px solid rgba(47, 214, 192, .16);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .82), rgba(234, 246, 255, .64)),
          var(--sfm-card);
        box-shadow: 0 16px 42px rgba(3, 18, 37, .07);
      }

      .debts-notice {
        border-radius: 22px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #047857;
        font-weight: 900;
      }

      .debts-notice.error {
        color: #b91c1c;
        border-color: rgba(239, 68, 68, .22);
        background: rgba(239, 68, 68, .08);
      }

      .debts-summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-summary-card {
        min-height: 118px;
        border-radius: 26px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .debt-summary-card > span,
      .debt-card-top + .debt-progress + .debt-metrics + .debt-warning svg {
        flex: 0 0 auto;
      }

      .debt-summary-card > span {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: var(--sfm-soft-cyan);
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .20);
      }

      .debt-summary-card small,
      .debt-metric span,
      .insight-row span,
      .payment-row small {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
        line-height: 1.45;
      }

      .debt-summary-card strong {
        display: block;
        margin-top: 7px;
        color: var(--sfm-foreground);
        font-size: clamp(18px, 2vw, 24px);
        font-weight: 950;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .debts-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 370px;
        gap: 18px;
        align-items: start;
      }

      .debts-list-panel,
      .debts-insight,
      .payments-panel {
        border-radius: 30px;
        padding: 20px;
        min-width: 0;
      }

      .debts-section-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }

      .debts-section-head.compact {
        margin-bottom: 10px;
      }

      .debts-section-head span {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 5px;
      }

      .debts-section-head h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: 20px;
        font-weight: 950;
      }

      .debt-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-card {
        border-radius: 26px;
        padding: 16px;
        display: grid;
        gap: 14px;
        min-width: 0;
      }

      .debt-card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .debt-card h3 {
        margin: 0 0 4px;
        color: var(--sfm-foreground);
        font-size: 18px;
        font-weight: 950;
        line-height: 1.35;
      }

      .debt-card p {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
      }

      .debt-status,
      .debt-due {
        width: max-content;
        border-radius: 999px;
        border: 1px solid rgba(47, 214, 192, .24);
        background: rgba(47, 214, 192, .12);
        color: #0f766e;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 950;
        white-space: nowrap;
      }

      .debt-status.paused {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .debt-status.paid {
        color: #047857;
        background: #ccfbf1;
      }

      .debt-progress {
        display: grid;
        gap: 8px;
      }

      .debt-progress span {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
      }

      .debt-progress strong {
        color: var(--sfm-foreground);
      }

      .debt-progress i {
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(47, 214, 192, .14);
        background: rgba(148, 163, 184, .14);
      }

      .debt-progress i b {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
      }

      .debt-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .debt-metric {
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: 16px;
        background: var(--sfm-light-card);
        padding: 10px;
        display: grid;
        gap: 6px;
      }

      .debt-metric b,
      .insight-row b,
      .payment-row b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-warning,
      .debt-due {
        display: inline-flex;
        align-items: flex-start;
        gap: 8px;
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border: 1px solid rgba(245, 158, 11, .24);
        border-radius: 16px;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.6;
      }

      .debt-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .debt-actions button,
      .debt-modal-actions button {
        min-height: 38px;
        border: 1px solid rgba(47, 214, 192, .20);
        border-radius: 999px;
        background: rgba(47, 214, 192, .08);
        color: var(--sfm-primary-hover);
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 900 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .debt-actions .danger {
        color: #dc2626;
        background: rgba(220, 38, 38, .08);
        border-color: rgba(220, 38, 38, .18);
      }

      .debts-insight {
        position: sticky;
        top: 18px;
        display: grid;
        gap: 12px;
      }

      .insight-row,
      .payment-row {
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: 18px;
        background: var(--sfm-light-card);
        padding: 12px;
        display: grid;
        gap: 6px;
      }

      .insight-copy,
      .insight-alert {
        margin: 0;
        border-radius: 18px;
        padding: 12px;
        color: var(--sfm-muted);
        background: rgba(47, 214, 192, .08);
        border: 1px solid rgba(47, 214, 192, .15);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .insight-alert {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .payments-list {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .payment-row span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debts-empty,
      .debts-loading {
        border-radius: 28px;
        padding: 32px;
        display: grid;
        justify-items: center;
        gap: 12px;
        text-align: center;
        color: var(--sfm-muted);
        font-weight: 850;
        line-height: 1.8;
      }

      .debts-empty svg {
        color: var(--sfm-soft-cyan);
      }

      .debts-empty h1,
      .debts-empty h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-weight: 950;
      }

      .debts-empty p {
        margin: 0;
        max-width: 640px;
      }

      .debt-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: grid;
        place-items: center;
        background: rgba(3, 18, 37, .56);
        padding: 18px;
        overflow-y: auto;
      }

      .debt-modal {
        width: min(920px, 100%);
        border-radius: 30px;
        padding: 22px;
      }

      .debt-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 18px;
      }

      .debt-modal-head span {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
      }

      .debt-modal-head h2 {
        margin: 4px 0 0;
        color: var(--sfm-foreground);
        font-size: 24px;
        font-weight: 950;
      }

      .debt-modal-head > button {
        width: 40px;
        height: 40px;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 14px;
        background: var(--sfm-light-card);
        color: var(--sfm-foreground);
        cursor: pointer;
      }

      .debt-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-field {
        display: grid;
        gap: 8px;
        min-width: 0;
      }

      .debt-field.wide {
        grid-column: 1 / -1;
      }

      .debt-field > span {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
      }

      .debt-field input,
      .debt-field select,
      .debt-field textarea,
      .affix-input {
        width: 100%;
        min-width: 0;
        min-height: 48px;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 16px;
        background: var(--sfm-card);
        color: var(--sfm-foreground);
        padding: 0 13px;
        font: 850 14px Tajawal, Arial, sans-serif;
        outline: none;
      }

      .debt-field textarea {
        min-height: 92px;
        padding-block: 12px;
        resize: vertical;
      }

      .debt-field input:focus,
      .debt-field select:focus,
      .debt-field textarea:focus,
      .affix-input:focus-within {
        border-color: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 3px rgba(47, 214, 192, .14);
      }

      .affix-input {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-inline: 8px;
      }

      .affix-input em {
        min-width: 54px;
        min-height: 34px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        font-style: normal;
        font-size: 11px;
        font-weight: 950;
      }

      .affix-input input {
        border: 0;
        box-shadow: none;
        background: transparent;
        padding-inline: 6px;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1px solid rgba(47, 214, 192, .14);
        border-radius: 18px;
        background: var(--sfm-light-card);
        padding: 13px;
      }

      .toggle-row button {
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 999px;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        padding: 8px 14px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .toggle-row button[aria-pressed="true"] {
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
      }

      .debt-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      .debt-modal-actions .debts-primary {
        border: 0;
        color: #fff;
      }

      .dark .debts-shell {
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .08), transparent 34%),
          #0a1422;
      }

      .dark .debts-notice,
      .dark .payments-panel,
      .dark .debts-list-panel,
      .dark .debts-insight,
      .dark .debt-summary-card,
      .dark .debt-card,
      .dark .debt-modal,
      .dark .debts-empty {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
          #0f1d31;
        border-color: #1d3050;
        box-shadow: 0 16px 42px rgba(0, 0, 0, .25);
      }

      .dark .debt-metric,
      .dark .insight-row,
      .dark .payment-row,
      .dark .debt-field input,
      .dark .debt-field select,
      .dark .debt-field textarea,
      .dark .affix-input,
      .dark .toggle-row,
      .dark .debt-modal-head > button {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .debt-status.active,
      .dark .debt-status.paid {
        color: #2fd6c0;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .debt-warning,
      .dark .debt-due,
      .dark .insight-alert {
        color: #f5b942;
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
      }

      @media (max-width: 1180px) {
        .debts-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-layout {
          grid-template-columns: 1fr;
        }
        .debts-insight {
          position: static;
        }
        .payments-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 1024px) {
        .debts-main {
          width: 100%;
          margin-inline: 0;
          padding: calc(88px + env(safe-area-inset-top)) 16px 18px;
        }
      }

      @media (max-width: 720px) {
        .debts-hero {
          display: grid;
          border-radius: 24px;
        }
        .debts-primary,
        .debts-section-head button {
          width: 100%;
        }
        .debts-summary-grid,
        .debt-card-grid,
        .payments-list,
        .debt-form-grid {
          grid-template-columns: 1fr;
        }
        .debt-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-section-head {
          display: grid;
        }
        .debt-modal-backdrop {
          align-items: end;
          padding: 0;
        }
        .debt-modal {
          width: 100%;
          max-height: 92dvh;
          overflow-y: auto;
          border-end-start-radius: 0;
          border-end-end-radius: 0;
        }
      }

      @media (max-width: 430px) {
        .debt-metrics {
          grid-template-columns: 1fr;
        }
        .debt-actions button {
          flex: 1 1 100%;
          justify-content: center;
        }
      }
    `}</style>
  );
}
