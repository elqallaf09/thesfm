'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCcw,
  Snowflake,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { useCurrency } from '@/lib/useCurrency';

import type { Lang, DebtRow, DebtPaymentRow, DebtForm, DebtStatus, InterestType } from './_types';
import { TEXT } from './_text';
import { SUPPORTED_CURRENCIES, DEFAULT_FORM, createDefaultForm, tr as trFn, debtPaymentMonth, deriveFirstPaymentDate, toNumber, remainingForDebt, optionalNumber, cleanNumericInput, formatDateToYYYYMMDD, mapInterestTypeToDb, mapDebtStatusToDb, clampPaymentDay, addOneDebtMonth, debtFirstPaymentDate, debtSchedule, formatDate, monthlyInterestAmount, calculateDebtPayment, payoffProgress, estimatePayoffMonths, estimatePayoffDate, simulatePayoffStrategy, payloadFromForm, validateDebtForm, debtSaveErrorMessage, safeDebtSaveErrorDetails } from './_utils';
import { SummaryCard, DebtMetric, InsightRow, FormSectionTitle, RequiredMark, DebtInput, MoneyInput, SuffixInput, PayoffStrategiesPanel, DebtStyles } from './_components';

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
  const [calculating, setCalculating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DebtForm>(() => createDefaultForm(baseCurrency || 'KWD'));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [generationChecked, setGenerationChecked] = useState(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState('0');
  const modalRef = useRef<HTMLFormElement>(null);

  const t = useCallback((key: keyof typeof TEXT) => trFn(locale, key), [locale]);
  const validationKeys = useMemo(() => validateDebtForm(form), [form]);
  const formIsValid = validationKeys.length === 0;
  const visibleValidationKeys = submitAttempted && !formIsValid ? validationKeys : [];

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [debtsResult, paymentsResult, incomeResult] = await Promise.all([
        supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
        supabase.from('monthly_income_sources').select('*').eq('user_id', user.id),
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
      const paymentDate = new Date().toISOString().slice(0, 10);
      const generationKey = `sfm:debts:monthly-generation:${user.id}:${paymentDate}`;
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(generationKey)) {
        setGenerationChecked(true);
        return;
      }
      setGenerationChecked(true);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(generationKey, 'checked');
        }
      } catch {
        // Session storage can be unavailable in some browser privacy modes.
      }
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
    const totalRemaining = activeDebts.reduce((sum, debt) => sum + remainingForDebt(debt), 0);
    const totalMonthly = activeDebts.reduce((sum, debt) => sum + toNumber(debt.monthly_payment), 0);
    const highest = activeDebts.reduce<DebtRow | null>((current, debt) => {
      if (!current || remainingForDebt(debt) > remainingForDebt(current)) return debt;
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

  const extraPayment = Math.max(0, parseFloat(extraPaymentAmount) || 0);

  const snowballResult = useMemo(
    () => simulatePayoffStrategy(activeDebts, extraPayment, 'snowball'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDebts, extraPayment],
  );
  const avalancheResult = useMemo(
    () => simulatePayoffStrategy(activeDebts, extraPayment, 'avalanche'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDebts, extraPayment],
  );

  const interestRiskDebt = activeDebts.find(debt => calculateDebtPayment(debt).warning);
  const highestInterest = [...activeDebts].sort((a, b) => toNumber(b.interest_rate) - toNumber(a.interest_rate))[0];
  const smallestDebt = [...activeDebts].sort((a, b) => remainingForDebt(a) - remainingForDebt(b))[0];

  function resetForm() {
    setForm(createDefaultForm(baseCurrency || 'KWD'));
    setSubmitAttempted(false);
    setError('');
    setFormOpen(false);
  }

  function openAddForm() {
    setForm(createDefaultForm(baseCurrency || 'KWD'));
    setSubmitAttempted(false);
    setError('');
    setFormOpen(true);
  }

  function openEditForm(debt: DebtRow) {
    setForm({
      id: debt.id,
      name: debt.name,
      creditorName: debt.creditor_name ?? '',
      originalAmount: String(debt.original_amount ?? ''),
      remainingAmount: String(debt.calculated_remaining_amount ?? debt.remaining_amount ?? ''),
      currency: debt.currency || baseCurrency || 'KWD',
      startDate: debt.start_date,
      firstPaymentDate: debtFirstPaymentDate(debt),
      monthlyPayment: String(debt.monthly_payment ?? ''),
      interestRate: String(debt.interest_rate ?? '0'),
      interestType: (debt.interest_type === 'none' || debt.interest_type === 'monthly' || debt.interest_type === 'annual') ? debt.interest_type : 'annual',
      paymentDay: String(debt.payment_day ?? '1'),
      notes: debt.notes ?? '',
      autoAddToExpenses: debt.auto_add_to_expenses !== false,
      status: (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active',
    });
    setSubmitAttempted(false);
    setError('');
    setFormOpen(true);
  }

  useEffect(() => {
    if (!formOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const firstField = modalRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      );
      firstField?.focus();
    }, 60);

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSubmitAttempted(false);
        setError('');
        setFormOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter(element => !element.hasAttribute('disabled') && element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [formOpen]);

  async function saveDebt(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!user) {
      setError(t('authSaveError'));
      return;
    }
    if (!formIsValid) {
      setError('');
      window.requestAnimationFrame(() => {
        const firstInvalidField = modalRef.current?.querySelector<HTMLElement>(
          '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea',
        );
        firstInvalidField?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        firstInvalidField?.focus();
      });
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = payloadFromForm(form, user.id);
      const result = form.id
        ? await supabase.from('debts').update(payload).eq('id', form.id).eq('user_id', user.id)
        : await supabase.from('debts').insert(payload);
      if (result.error) throw result.error;
      setNotice(t('saved'));
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Debt save failed:', safeDebtSaveErrorDetails(err));
      setError(debtSaveErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(debt: DebtRow, status: DebtStatus, remainingAmount?: number) {
    if (!user) return;
    setError('');
    const payload: Record<string, unknown> = { status };
    if (typeof remainingAmount === 'number') {
      payload.remaining_amount = remainingAmount;
      payload.calculated_remaining_amount = remainingAmount;
      payload.last_calculated_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase.from('debts').update(payload).eq('id', debt.id).eq('user_id', user.id);
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
    const { error: deleteError } = await supabase.from('debts').delete().eq('id', debt.id).eq('user_id', user.id);
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
    const paymentMonth = debtPaymentMonth(paymentDate);
    const nextMonth = addOneDebtMonth(paymentMonth);
    const existing = await supabase
      .from('debt_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('debt_id', debt.id)
      .gte('payment_date', paymentMonth || paymentDate)
      .lt('payment_date', nextMonth || paymentDate)
      .limit(1)
      .maybeSingle();
    if (existing.data?.id) {
      setError(t('duplicatePayment'));
      return;
    }

    const payment = calculateDebtPayment(debt);
    try {
      let expenseId: string | null = null;
      if (debt.auto_add_to_expenses !== false) {
        const expenseExisting = await supabase
          .from('expense_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('debt_id', debt.id)
          .eq('source', 'debt')
          .gte('date', paymentMonth || paymentDate)
          .lt('date', nextMonth || paymentDate)
          .limit(1)
          .maybeSingle();
        expenseId = expenseExisting.data?.id ?? null;
        if (!expenseId) {
          const expenseInsert = await supabase.from('expense_items').insert({
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

      const paymentInsert = await supabase.from('debt_payments').insert({
        user_id: user.id,
        debt_id: debt.id,
        payment_date: paymentDate,
        amount: payment.amount,
        interest_amount: payment.interestAmount,
        principal_amount: payment.principalAmount,
        currency: debt.currency || 'KWD',
        expense_id: expenseId,
      });
      if (paymentInsert.error) throw paymentInsert.error;

      const status = payment.nextRemaining <= 0 ? 'paid' : debt.status || 'active';
      const debtPayments = payments.filter(item => item.debt_id === debt.id);
      const recordedTotalPaid = debtPayments.reduce((sum, item) => sum + toNumber(item.amount), 0);
      const recordedTotalInterest = debtPayments.reduce((sum, item) => sum + toNumber(item.interest_amount), 0);
      const recordedTotalPrincipal = debtPayments.reduce((sum, item) => sum + toNumber(item.principal_amount), 0);
      const update = await supabase.from('debts').update({
        remaining_amount: payment.nextRemaining,
        calculated_remaining_amount: payment.nextRemaining,
        total_paid_amount: (debt.total_paid_amount == null ? recordedTotalPaid : toNumber(debt.total_paid_amount)) + payment.amount,
        total_interest_paid: (debt.total_interest_paid == null ? recordedTotalInterest : toNumber(debt.total_interest_paid)) + payment.interestAmount,
        total_principal_paid: (debt.total_principal_paid == null ? recordedTotalPrincipal : toNumber(debt.total_principal_paid)) + payment.principalAmount,
        last_calculated_at: new Date().toISOString(),
        status,
      }).eq('id', debt.id).eq('user_id', user.id);
      if (update.error) throw update.error;
      setNotice(payment.warning ? t('interestWarning') : t('paymentRecorded'));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function runDebtCalculations() {
    if (!session?.access_token || calculating) return;
    setCalculating(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/debts/generate-monthly-expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; success?: boolean; processed?: number; updated?: number; code?: string; message?: string } | null;
      if (!response.ok || payload?.ok === false || payload?.success === false) {
        throw new Error(payload?.code || payload?.message || 'DEBT_CALCULATION_FAILED');
      }
      const processed = toNumber(payload?.processed);
      setNotice(processed > 0 ? t('debtCalculationUpdated') : t('noDueMonthlyPayments'));
      await loadData();
    } catch (err) {
      console.error('Debt calculation refresh failed:', safeDebtSaveErrorDetails(err));
      setError(t('debtCalculationError'));
    } finally {
      setCalculating(false);
    }
  }

  const money = (value: unknown, currency = baseCurrency || 'KWD') => formatMoney(toNumber(value), currency, locale);
  const pageError = formOpen ? supabaseConfigError : error || supabaseConfigError;

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
          <div className="debts-hero-actions">
            <button type="button" className="debts-secondary-hero" onClick={() => void runDebtCalculations()} disabled={calculating || !session?.access_token}>
              <RefreshCcw size={18} className={calculating ? 'spin' : undefined} />
              {calculating ? t('calculatingDebts') : t('updateDebtCalculations')}
            </button>
            <button type="button" className="debts-primary" onClick={openAddForm}>
              <Plus size={18} />
              {t('addDebt')}
            </button>
          </div>
        </section>

        {(notice || pageError) && (
          <section className={`debts-notice ${pageError ? 'error' : 'success'}`}>
            {pageError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{pageError || notice}</span>
          </section>
        )}

        <section className="debts-summary-grid">
          <SummaryCard icon={<WalletCards size={18} />} label={t('totalDebts')} value={money(totals.totalOriginal)} />
          <SummaryCard icon={<CreditCard size={18} />} label={t('remainingToPay')} value={money(totals.totalRemaining)} />
          <SummaryCard icon={<ReceiptText size={18} />} label={t('monthlyInstallments')} value={money(totals.totalMonthly)} />
          <SummaryCard icon={<Gauge size={18} />} label={t('highestDebt')} value={totals.highest ? money(remainingForDebt(totals.highest), totals.highest.currency) : t('unavailable')} />
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
                  const schedule = debtSchedule(debt);
                  const status = (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active';
                  const effectiveRemaining = remainingForDebt(debt);
                  const debtPayments = payments.filter(item => item.debt_id === debt.id);
                  const totalPaid = debt.total_paid_amount == null
                    ? debtPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
                    : toNumber(debt.total_paid_amount);
                  const paidAmount = Math.max(0, toNumber(debt.original_amount) - effectiveRemaining);
                  const nextPayment = schedule.nextPaymentDate ?? '';
                  const lastPayment = debtPayments[0]?.payment_date ?? '';
                  const isDue = nextPayment === new Date().toISOString().slice(0, 10);
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
                        <DebtMetric label={t('originalAmount')} value={money(debt.original_amount, debt.currency)} />
                        <DebtMetric label={t('remaining')} value={money(effectiveRemaining, debt.currency)} />
                        <DebtMetric label={t('monthlyPayment')} value={money(debt.monthly_payment, debt.currency)} />
                        <DebtMetric label={t('startDate')} value={formatDate(debt.start_date, locale)} />
                        <DebtMetric label={t('firstPaymentDate')} value={formatDate(debtFirstPaymentDate(debt), locale)} />
                        <DebtMetric label={t('lastPayment')} value={formatDate(lastPayment, locale)} />
                        <DebtMetric label={t('nextPayment')} value={formatDate(nextPayment, locale)} />
                        <DebtMetric label={t('paidPaymentsCount')} value={`${debtPayments.length}`} />
                        <DebtMetric label={t('totalPaidAmount')} value={money(totalPaid || paidAmount, debt.currency)} />
                        <DebtMetric label={t('interestRate')} value={`${toNumber(debt.interest_rate).toFixed(2)}%`} />
                        <DebtMetric label={t('totalInterestPaid')} value={money(debt.total_interest_paid ?? 0, debt.currency)} />
                        <DebtMetric label={t('paymentDayLabel')} value={`${clampPaymentDay(debt.payment_day)}`} />
                        {debt.status !== 'paid' && (
                          <DebtMetric
                            label={t('payoffDate')}
                            value={formatDate(estimatePayoffDate(debt), locale)}
                            highlight
                          />
                        )}
                      </div>
                      {(schedule.warning || calculateDebtPayment(debt).warning) && (
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
            <InsightRow label={t('highestImpact')} value={totals.highest ? `${totals.highest.name} - ${money(remainingForDebt(totals.highest), totals.highest.currency)}` : t('unavailable')} />
            <InsightRow label={t('highestInterestFirst')} value={highestInterest ? highestInterest.name : t('unavailable')} />
            <InsightRow label={t('smallestDebtFirst')} value={smallestDebt ? smallestDebt.name : t('unavailable')} />
            <InsightRow label={t('payoffEstimate')} value={payoffMonths === null ? t('unavailable') : `${payoffMonths} ${t('months')}`} />
          </aside>
        </section>

        <PayoffStrategiesPanel
          locale={locale}
          dir={dir}
          t={t}
          money={money}
          snowball={snowballResult}
          avalanche={avalancheResult}
          extraPaymentAmount={extraPaymentAmount}
          setExtraPaymentAmount={setExtraPaymentAmount}
        />

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
        <div
          className="debt-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) resetForm();
          }}
        >
          <form
            ref={modalRef}
            className="debt-modal"
            onSubmit={saveDebt}
            dir={dir}
            role="dialog"
            aria-modal="true"
            aria-labelledby="debt-modal-title"
            aria-describedby="debt-modal-description"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="debt-modal-head">
              <div>
                <span>THE SFM</span>
                <h2 id="debt-modal-title">{form.id ? t('editDebt') : t('addDebt')}</h2>
                <p id="debt-modal-description">{t('modalSubtitle')}</p>
              </div>
              <button type="button" onClick={resetForm} aria-label={t('cancel')}><X size={18} /></button>
            </div>
            {error && (
              <div className="debt-save-alert" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>{t('saveErrorTitle')}</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}
            {visibleValidationKeys.length > 0 && (
              <div className="debt-validation-panel">
                <AlertTriangle size={18} />
                <div>
                  <strong>{t('completeRequired')}</strong>
                  <ul>
                    {visibleValidationKeys.map(key => <li key={key}>{t(key)}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <div className="debt-form-grid">
              <FormSectionTitle title={t('sectionDebtData')} />
              <DebtInput required invalid={submitAttempted && validationKeys.includes('validationName')} label={t('name')} value={form.name} placeholder={t('namePlaceholder')} onChange={value => setForm(current => ({ ...current, name: value }))} />
              <DebtInput required invalid={submitAttempted && validationKeys.includes('validationCreditor')} label={t('creditor')} value={form.creditorName} placeholder={t('creditorPlaceholder')} onChange={value => setForm(current => ({ ...current, creditorName: value }))} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationOriginalAmount')} label={t('originalAmount')} currency={form.currency} value={form.originalAmount} onChange={value => setForm(current => ({ ...current, originalAmount: value, remainingAmount: current.remainingAmount || value }))} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationRemainingAmount')} label={t('remainingAmount')} currency={form.currency} value={form.remainingAmount} onChange={value => setForm(current => ({ ...current, remainingAmount: value }))} />
              <label className={`debt-field ${submitAttempted && validationKeys.includes('validationCurrency') ? 'invalid' : ''}`} data-invalid={submitAttempted && validationKeys.includes('validationCurrency') ? 'true' : undefined}>
                <span>{t('currency')} <i>*</i></span>
                <select value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value }))}>
                  {SUPPORTED_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <DebtInput
                required
                invalid={submitAttempted && validationKeys.includes('validationStartDate')}
                type="date"
                label={t('startDate')}
                value={form.startDate}
                onChange={value => setForm(current => ({
                  ...current,
                  startDate: value,
                  firstPaymentDate: current.id ? current.firstPaymentDate : deriveFirstPaymentDate(value, current.paymentDay),
                }))}
              />
              <DebtInput
                required
                invalid={submitAttempted && validationKeys.includes('validationFirstPaymentDate')}
                type="date"
                label={t('firstPaymentDate')}
                helper={t('firstPaymentDateHelp')}
                value={form.firstPaymentDate}
                onChange={value => setForm(current => ({ ...current, firstPaymentDate: value }))}
              />
              <FormSectionTitle title={t('sectionPaymentDetails')} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationMonthlyPayment')} label={t('monthlyPayment')} currency={form.currency} value={form.monthlyPayment} onChange={value => setForm(current => ({ ...current, monthlyPayment: value }))} />
              <SuffixInput
                required
                invalid={submitAttempted && validationKeys.includes('validationPaymentDay')}
                label={t('paymentDay')}
                suffix="1 - 31"
                value={form.paymentDay}
                onChange={value => setForm(current => ({
                  ...current,
                  paymentDay: value,
                  firstPaymentDate: current.id ? current.firstPaymentDate : deriveFirstPaymentDate(current.startDate, value),
                }))}
              />
              <FormSectionTitle title={t('sectionInterest')} />
              <SuffixInput invalid={submitAttempted && validationKeys.includes('validationInterestRate')} label={t('interestRate')} suffix="%" value={form.interestRate} onChange={value => setForm(current => ({ ...current, interestRate: value }))} />
              <label className="debt-field">
                <span>{t('interestType')}</span>
                <select value={form.interestType} onChange={event => setForm(current => ({ ...current, interestType: event.target.value as InterestType }))}>
                  <option value="none">{t('noInterest')}</option>
                  <option value="annual">{t('annualInterest')}</option>
                  <option value="monthly">{t('monthlyInterest')}</option>
                </select>
              </label>
              <FormSectionTitle title={t('sectionSettings')} />
              <label className="debt-field wide toggle-row">
                <span>{t('autoExpense')} <small>{t('autoExpenseHelper')}</small></span>
                <button type="button" aria-pressed={form.autoAddToExpenses} onClick={() => setForm(current => ({ ...current, autoAddToExpenses: !current.autoAddToExpenses }))}>
                  {form.autoAddToExpenses ? t('yes') : t('no')}
                </button>
              </label>
              <label className="debt-field wide">
                <span>{t('notes')}</span>
                <textarea value={form.notes} rows={3} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            {!formIsValid && <p className="debt-form-helper">{t('completeRequired')}</p>}
            <div className="debt-modal-actions">
              <button type="button" className="debt-secondary-action" onClick={resetForm}>{t('cancel')}</button>
              <button type="submit" className="debts-primary" disabled={saving} aria-disabled={saving || !formIsValid}>{saving ? t('saving') : t('save')}</button>
            </div>
          </form>
        </div>
      )}
      <DebtStyles />
    </div>
  );
}

