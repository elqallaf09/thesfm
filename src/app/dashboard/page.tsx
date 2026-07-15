'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  FileChartColumn,
  Flag,
  Landmark,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import {
  buildLinePoints,
  buildMonthlyCashFlow,
  buildMonthlyHealthSnapshot,
  calculateFinancialHealth,
  calculateFinancialHealthIndicators,
  financialRowDate,
  realizedExpenseRows,
  realizedIncomeRows,
  type CashFlowPoint,
  type FinancialRow,
} from '@/lib/dashboard/financialMetrics';
import {
  activeDebtRows,
  classifyDashboardError,
  currentMonthRows,
  debtBalance,
  debtBreakdown,
  expenseCategoryBreakdown,
  firstNumber,
  groupCurrencyAmounts,
  investmentBreakdown,
  investmentValue,
  isCurrency,
  primaryInvestmentTotal,
  rowCurrency,
  summarizeGoal,
  sumRows,
  type CurrencyAmount,
  type DashboardSourceKey,
  type DashboardSourceStatus,
  type GoalSummary,
} from '@/lib/dashboard/executiveOverview';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/locale';
import styles from './dashboard.module.css';

type SourceState = {
  rows: FinancialRow[];
  status: DashboardSourceStatus;
};

type Profile = FinancialRow & {
  default_currency?: string | null;
  preferred_currency?: string | null;
};

type AttentionItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: 'danger' | 'warning' | 'info';
};

const SOURCE_TABLES: Array<{ key: Exclude<DashboardSourceKey, 'profile'>; table: string }> = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
  { key: 'goals', table: 'financial_goals' },
  { key: 'investments', table: 'investment_items' },
  { key: 'debts', table: 'debts' },
];

const EMPTY_SOURCES = SOURCE_TABLES.reduce((result, source) => {
  result[source.key] = { rows: [], status: 'loading' };
  return result;
}, {} as Record<Exclude<DashboardSourceKey, 'profile'>, SourceState>);

function loaded(status: DashboardSourceStatus) {
  return status === 'success' || status === 'empty';
}

function sourceStatusText(status: DashboardSourceStatus, t: ReturnType<typeof useLanguage>['t']) {
  if (status === 'permission') return t('dashboard_exec_permission');
  if (status === 'network') return t('dashboard_exec_network');
  if (status === 'unavailable') return t('dashboard_exec_source_unavailable');
  if (status === 'empty') return t('dashboard_exec_no_records');
  return t('dashboard_exec_loading');
}

function logSourceFailure(source: DashboardSourceKey, error: unknown) {
  if (process.env.NODE_ENV === 'development') {
    const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    console.warn('[dashboard] source unavailable', {
      source,
      code: typeof value.code === 'string' ? value.code : undefined,
      status: classifyDashboardError(error),
    });
  }
}

export default function ExecutiveDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir, t } = useLanguage();
  const [sources, setSources] = useState(EMPTY_SOURCES);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<DashboardSourceStatus>('loading');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadDashboard = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();

    if (!user?.id) {
      setProfile(null);
      setProfileStatus('empty');
      setSources(SOURCE_TABLES.reduce((result, source) => {
        result[source.key] = { rows: [], status: 'empty' };
        return result;
      }, {} as typeof sources));
      setUpdatedAt(new Date());
      return () => controller.abort();
    }

    setProfileStatus('loading');
    setSources(SOURCE_TABLES.reduce((result, source) => {
      result[source.key] = { rows: [], status: 'loading' };
      return result;
    }, {} as typeof sources));

    const profileRequest = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .maybeSingle();
        if (error) throw error;
        if (!controller.signal.aborted) {
          setProfile((data ?? null) as Profile | null);
          setProfileStatus(data ? 'success' : 'empty');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        logSourceFailure('profile', error);
        setProfile(null);
        setProfileStatus(classifyDashboardError(error));
      }
    })();

    const tableRequests = SOURCE_TABLES.map((source) => (async () => {
      try {
        const { data, error } = await supabase
          .from(source.table)
          .select('*')
          .eq('user_id', user.id)
          .limit(1000)
          .abortSignal(controller.signal);
        if (error) throw error;
        if (controller.signal.aborted) return;
        let rows = (data ?? []) as FinancialRow[];
        if (source.key === 'income') rows = personalIncomeRows(rows);
        if (source.key === 'expenses') rows = personalExpenseRows(rows);
        setSources((current) => ({
          ...current,
          [source.key]: { rows, status: rows.length > 0 ? 'success' : 'empty' },
        }));
      } catch (error) {
        if (controller.signal.aborted) return;
        logSourceFailure(source.key, error);
        setSources((current) => ({
          ...current,
          [source.key]: { rows: [], status: classifyDashboardError(error) },
        }));
      }
    })());

    void Promise.allSettled([profileRequest, ...tableRequests]).then(() => {
      if (!controller.signal.aborted) setUpdatedAt(new Date());
    });

    return () => controller.abort();
  }, [authLoading, reloadToken, user?.id]);

  const summary = useMemo(() => {
    const primaryCurrency = rowCurrency(profile ?? {}, ['default_currency', 'preferred_currency', 'currency']);
    const now = updatedAt ?? new Date();
    const compatible = (row: FinancialRow) => Boolean(primaryCurrency && isCurrency(row, primaryCurrency));
    const realizedIncome = realizedIncomeRows(sources.income.rows, now).filter(compatible);
    const realizedExpenses = realizedExpenseRows(sources.expenses.rows, now).filter(compatible);
    const monthIncomeRows = currentMonthRows(realizedIncome, 'income', now);
    const monthExpenseRows = currentMonthRows(realizedExpenses, 'expense', now);
    const monthlyPlan = buildMonthlyHealthSnapshot(sources.income.rows, sources.expenses.rows, now, compatible);
    const savingsRows = sources.savings.rows.filter(compatible);
    const activeDebts = activeDebtRows(sources.debts.rows).filter(compatible);
    const valuedSavingsRows = savingsRows.filter((row) => firstNumber(row, ['current_amount', 'balance', 'amount']) !== null);
    const savingsAmountsComplete = valuedSavingsRows.length === savingsRows.length;
    const debtBalancesComplete = activeDebts.every((row) => debtBalance(row) !== null);
    const debtPaymentsComplete = activeDebts.every((row) => firstNumber(row, ['monthly_payment']) !== null);
    const investmentValues = sources.investments.rows.map((row) => investmentValue(row, primaryCurrency));
    const investmentsComplete = investmentValues.every((value) => value !== null && value.currency !== null);
    const savingsBalance = sumRows(valuedSavingsRows, ['current_amount', 'balance', 'amount']);
    const monthlyDebtPayments = sumRows(activeDebts, ['monthly_payment']);
    const debtBalanceTotal = activeDebts.reduce((total, row) => total + (debtBalance(row) ?? 0), 0);
    const investmentsTotal = primaryInvestmentTotal(sources.investments.rows, primaryCurrency);
    const hasInvestmentValue = sources.investments.rows.some((row) => {
      const breakdown = investmentBreakdown([row], primaryCurrency);
      return breakdown.some((item) => item.currency === primaryCurrency);
    });
    const monthlyIncome = monthlyPlan.monthlyIncome;
    const monthlyExpenses = monthlyPlan.monthlyExpenses;
    const monthlyNet = monthlyIncome - monthlyExpenses;
    const financialInput = {
      monthlyIncome,
      monthlyExpenses,
      savingsBalance,
      monthlyDebtPayments,
      hasIncomeData: loaded(sources.income.status) && monthlyPlan.hasIncomeData && monthlyPlan.incomeAmountsComplete,
      hasExpenseData: loaded(sources.expenses.status) && monthlyPlan.hasExpenseData && monthlyPlan.expenseAmountsComplete,
      hasSavingsData: loaded(sources.savings.status) && valuedSavingsRows.length > 0 && savingsAmountsComplete,
      debtsLoaded: loaded(sources.debts.status) && debtPaymentsComplete,
    };
    const health = calculateFinancialHealth(financialInput);
    const indicators = calculateFinancialHealthIndicators(financialInput);
    const cashFlow = buildMonthlyCashFlow(sources.income.rows, sources.expenses.rows, now, compatible);
    const observedCashFlow = cashFlow.filter((point) => point.incomeRecords > 0 || point.expenseRecords > 0);
    const goals = sources.goals.rows
      .map((row) => summarizeGoal(row, primaryCurrency, now))
      .filter((goal) => goal.title)
      .sort((a, b) => {
        const priority = { behind: 0, on_track: 1, insufficient: 2, completed: 3 };
        return priority[a.status] - priority[b.status];
      });
    const currentCategories = expenseCategoryBreakdown(monthExpenseRows).slice(0, 4);
    const savingsBreakdown = groupCurrencyAmounts(sources.savings.rows, (row) => firstNumber(row, ['current_amount', 'balance', 'amount']));
    const investmentsBreakdown = investmentBreakdown(sources.investments.rows, primaryCurrency);
    const debtsBreakdown = debtBreakdown(sources.debts.rows);
    const cashFlowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const cashFlowIncomplete = [...realizedIncome.map((row) => ({ row, kind: 'income' as const })), ...realizedExpenses.map((row) => ({ row, kind: 'expense' as const }))]
      .some(({ row, kind }) => {
        const date = financialRowDate(row, kind);
        return Boolean(date && date >= cashFlowStart && firstNumber(row, ['amount']) === null);
      });
    const categoryAmountsComplete = monthExpenseRows.every((row) => firstNumber(row, ['amount']) !== null);
    const positionReady = Boolean(primaryCurrency) && loaded(sources.savings.status) && loaded(sources.investments.status) && loaded(sources.debts.status)
      && savingsAmountsComplete && investmentsComplete && debtBalancesComplete
      && (valuedSavingsRows.length > 0 || hasInvestmentValue || activeDebts.length > 0);

    return {
      primaryCurrency,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      hasIncomeData: monthlyPlan.hasIncomeData && monthlyPlan.incomeAmountsComplete,
      hasExpenseData: monthlyPlan.hasExpenseData && monthlyPlan.expenseAmountsComplete,
      health,
      indicators,
      observedCashFlow,
      monthIncomeRows,
      monthExpenseRows,
      currentCategories,
      cashFlowIncomplete,
      categoryAmountsComplete,
      goals,
      savingsBalance,
      investmentsTotal,
      debtBalanceTotal,
      trackedPosition: savingsBalance + investmentsTotal - debtBalanceTotal,
      positionReady,
      savingsBreakdown,
      investmentsBreakdown,
      debtsBreakdown,
      savingsAmountsComplete,
      investmentsComplete,
      debtBalancesComplete,
      hasForeignCurrency: Boolean(primaryCurrency) && [...savingsBreakdown, ...investmentsBreakdown, ...debtsBreakdown].some((item) => item.currency !== primaryCurrency),
    };
  }, [profile, sources, updatedAt]);

  const sourceFailures = useMemo(() => SOURCE_TABLES.filter((source) => ['permission', 'network', 'unavailable'].includes(sources[source.key].status)), [sources]);
  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    if (summary.monthlyIncome > 0 && summary.monthlyExpenses > summary.monthlyIncome) {
      items.push({ id: 'overspending', title: t('dashboard_exec_overspending_title'), body: t('dashboard_exec_overspending_body'), href: '/expenses', tone: 'danger' });
    }
    if (summary.indicators.debtToIncome !== null && summary.indicators.debtToIncome > 0.3) {
      items.push({ id: 'debt-risk', title: t('dashboard_exec_debt_risk_title'), body: t('dashboard_exec_debt_risk_body'), href: '/debts', tone: 'warning' });
    }
    const behindGoal = summary.goals.find((goal) => goal.status === 'behind');
    if (behindGoal) {
      items.push({ id: `goal-${behindGoal.id}`, title: t('dashboard_exec_goal_risk_title'), body: t('dashboard_exec_goal_risk_body'), href: '/goals', tone: 'warning' });
    }
    if (sourceFailures.length > 0) {
      items.push({ id: 'source', title: t('dashboard_exec_source_issue_title'), body: t('dashboard_exec_source_issue_body'), href: '/profile', tone: 'info' });
    }
    return items.slice(0, 3);
  }, [sourceFailures.length, summary.goals, summary.indicators.debtToIncome, summary.monthlyExpenses, summary.monthlyIncome, t]);

  const isInitialLoading = authLoading || SOURCE_TABLES.every((source) => sources[source.key].status === 'loading');
  if (isInitialLoading) return <DashboardSkeleton dir={dir} label={t('dashboard_exec_loading')} />;

  const incomeReady = Boolean(summary.primaryCurrency) && loaded(sources.income.status) && summary.hasIncomeData;
  const expensesReady = Boolean(summary.primaryCurrency) && loaded(sources.expenses.status) && summary.hasExpenseData;
  const netReady = incomeReady && expensesReady;
  const healthLoading = [sources.income.status, sources.expenses.status, sources.savings.status, sources.debts.status].some((status) => status === 'loading');
  const cashFlowLoading = sources.income.status === 'loading' || sources.expenses.status === 'loading';
  const cashFlowFailure = [sources.income.status, sources.expenses.status].find((status) => status === 'permission' || status === 'network' || status === 'unavailable');
  const attentionLoading = SOURCE_TABLES.some((source) => sources[source.key].status === 'loading');

  return (
    <main className={styles.page} dir={dir} lang={lang} aria-labelledby="dashboard-title" data-dashboard-executive="true">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t('dashboard_exec_eyebrow')}</p>
          <h1 id="dashboard-title">{t('dashboard_exec_title')}</h1>
          <p className={styles.subtitle}>{t('dashboard_exec_subtitle')}</p>
          <div className={styles.contextRow} aria-label={t('dashboard_exec_current_month')}>
            <span><CalendarDays aria-hidden="true" />{t('dashboard_exec_current_month')}</span>
            <span><CircleDollarSign aria-hidden="true" />{t('dashboard_exec_primary_currency')}: <bdi>{summary.primaryCurrency ?? t('dashboard_exec_not_configured')}</bdi></span>
            {updatedAt ? <span>{t('dashboard_exec_updated')}: {formatDate(updatedAt, lang, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : null}
          </div>
        </div>
        <button type="button" className={styles.refreshButton} onClick={loadDashboard} aria-label={t('dashboard_exec_refresh')}>
          <RefreshCw aria-hidden="true" />
          <span>{t('dashboard_exec_refresh')}</span>
        </button>
      </header>

      <section className={styles.section} aria-labelledby="executive-summary-title">
        <SectionHeading id="executive-summary-title" title={t('dashboard_exec_summary')} />
        <div className={styles.metricGrid}>
          <MetricCard
            label={t('dashboard_exec_position')}
            value={summary.positionReady && summary.primaryCurrency ? formatCurrency(summary.trackedPosition, summary.primaryCurrency, lang) : null}
            status={summary.positionReady ? t('dashboard_exec_primary_only') : summary.primaryCurrency ? sourceReason([sources.savings.status, sources.investments.status, sources.debts.status], t) : t('dashboard_exec_not_configured')}
            icon={<WalletCards />}
            tone={summary.trackedPosition < 0 ? 'danger' : 'primary'}
          />
          <MetricCard
            label={t('dashboard_exec_monthly_income')}
            value={incomeReady && summary.primaryCurrency ? formatCurrency(summary.monthlyIncome, summary.primaryCurrency, lang) : null}
            status={incomeReady ? (summary.monthlyIncome === 0 ? t('dashboard_exec_real_zero') : t('dashboard_exec_planned_actual')) : summary.primaryCurrency ? sourceReason([sources.income.status], t) : t('dashboard_exec_not_configured')}
            icon={<TrendingUp />}
            tone="success"
          />
          <MetricCard
            label={t('dashboard_exec_monthly_expenses')}
            value={expensesReady && summary.primaryCurrency ? formatCurrency(summary.monthlyExpenses, summary.primaryCurrency, lang) : null}
            status={expensesReady ? (summary.monthlyExpenses === 0 ? t('dashboard_exec_real_zero') : t('dashboard_exec_planned_actual')) : summary.primaryCurrency ? sourceReason([sources.expenses.status], t) : t('dashboard_exec_not_configured')}
            icon={<TrendingDown />}
            tone="danger"
          />
          <MetricCard
            label={summary.monthlyNet < 0 ? t('dashboard_exec_monthly_deficit') : t('dashboard_exec_monthly_surplus')}
            value={netReady && summary.primaryCurrency ? formatCurrency(Math.abs(summary.monthlyNet), summary.primaryCurrency, lang) : null}
            status={netReady ? (summary.monthlyNet === 0 ? t('dashboard_exec_real_zero') : t('dashboard_exec_primary_only')) : summary.primaryCurrency ? sourceReason([sources.income.status, sources.expenses.status], t) : t('dashboard_exec_not_configured')}
            icon={<PiggyBank />}
            tone={summary.monthlyNet < 0 ? 'danger' : 'accent'}
          />
        </div>
        <p className={styles.methodNote}>{t('dashboard_exec_position_hint')}</p>
      </section>

      <section className={styles.section} aria-labelledby="financial-health-title">
        <SectionHeading id="financial-health-title" title={t('dashboard_exec_health_title')} description={t('dashboard_exec_health_desc')} />
        {healthLoading ? <SectionSkeleton /> : <div className={styles.healthGrid}>
          <article className={styles.scoreCard}>
            <div className={styles.scoreRing} aria-label={summary.health ? `${t('dashboard_exec_health_score')}: ${summary.health.score}/100` : t('dashboard_exec_score_unavailable')}>
              <span>{summary.health?.score ?? '—'}</span>
              <small>/ 100</small>
            </div>
            <div>
              <h3>{t('dashboard_exec_health_score')}</h3>
              <p>{summary.health ? t('dashboard_exec_current_month') : t('dashboard_exec_score_unavailable')}</p>
            </div>
          </article>
          <div className={styles.indicatorGrid}>
            <HealthIndicator label={t('dashboard_exec_savings_rate')} value={summary.indicators.savingsRatio === null ? null : formatPercent(summary.indicators.savingsRatio, lang, { maximumFractionDigits: 1 })} unavailable={t('dashboard_exec_calculation_unavailable')} />
            <HealthIndicator label={t('dashboard_exec_expense_coverage')} value={summary.indicators.expenseCoverage === null ? null : formatNumber(summary.indicators.expenseCoverage, lang, { maximumFractionDigits: 2 })} unavailable={t('dashboard_exec_calculation_unavailable')} />
            <HealthIndicator label={t('dashboard_exec_emergency_coverage')} value={summary.indicators.emergencyFundMonths === null ? null : `${formatNumber(summary.indicators.emergencyFundMonths, lang, { maximumFractionDigits: 1 })} ${t('dashboard_exec_months')}`} unavailable={t('dashboard_exec_calculation_unavailable')} />
            <HealthIndicator label={t('dashboard_exec_debt_ratio')} value={summary.indicators.debtToIncome === null ? null : formatPercent(summary.indicators.debtToIncome, lang, { maximumFractionDigits: 1 })} unavailable={t('dashboard_exec_calculation_unavailable')} />
          </div>
        </div>}
      </section>

      <div className={styles.primaryGrid}>
        <section className={`${styles.section} ${styles.cashFlowSection}`} aria-labelledby="cash-flow-title">
          <SectionHeading id="cash-flow-title" title={t('dashboard_exec_cashflow_title')} description={t('dashboard_exec_cashflow_desc')} />
          {cashFlowLoading
            ? <SectionSkeleton compact />
            : cashFlowFailure
              ? <InlineSourceState status={cashFlowFailure} t={t} onRetry={loadDashboard} />
              : !summary.primaryCurrency
                ? <StateMessage icon={<CircleDollarSign />} title={t('dashboard_exec_not_configured')} />
                : summary.cashFlowIncomplete
                ? <StateMessage icon={<AlertTriangle />} title={t('dashboard_exec_calculation_unavailable')} />
                : <CashFlowChart points={summary.observedCashFlow} currency={summary.primaryCurrency} lang={lang} label={t('dashboard_exec_cashflow_chart_label')} periodLabel={t('dashboard_exec_period')} incomeLabel={t('dashboard_exec_income')} expensesLabel={t('dashboard_exec_expenses')} insufficientLabel={summary.observedCashFlow.length === 0 ? t('dashboard_exec_no_cashflow') : t('dashboard_exec_insufficient_history')} />}
        </section>

        <section className={styles.section} aria-labelledby="expense-categories-title">
          <SectionHeading id="expense-categories-title" title={t('dashboard_exec_categories')} description={t('dashboard_exec_current_month')} />
          {sources.expenses.status === 'loading' ? <SectionSkeleton compact /> : !summary.primaryCurrency ? <StateMessage icon={<CircleDollarSign />} title={t('dashboard_exec_not_configured')} /> : !summary.categoryAmountsComplete ? <StateMessage icon={<AlertTriangle />} title={t('dashboard_exec_calculation_unavailable')} /> : summary.currentCategories.length > 0 ? (
            <div className={styles.categoryList}>
              {summary.currentCategories.map((item) => {
                const maximum = summary.currentCategories[0]?.amount || 1;
                return (
                  <div className={styles.categoryItem} key={item.category}>
                    <div><span>{item.category}</span><bdi>{formatCurrency(item.amount, summary.primaryCurrency!, lang)}</bdi></div>
                    <span className={styles.categoryTrack} aria-hidden="true"><i style={{ inlineSize: `${Math.max(4, (item.amount / maximum) * 100)}%` }} /></span>
                  </div>
                );
              })}
            </div>
          ) : <StateMessage icon={<BarChart3 />} title={t('dashboard_exec_no_categories')} />}
          {!loaded(sources.expenses.status) && sources.expenses.status !== 'loading' ? <InlineSourceState status={sources.expenses.status} t={t} onRetry={loadDashboard} /> : null}
        </section>
      </div>

      <section className={styles.section} aria-labelledby="allocation-title">
        <SectionHeading id="allocation-title" title={t('dashboard_exec_allocation_title')} description={t('dashboard_exec_allocation_desc')} />
        <div className={styles.allocationGrid}>
          <AllocationCard title={t('dashboard_exec_savings')} items={summary.savingsBreakdown} empty={t('dashboard_exec_no_assets')} lang={lang} status={sources.savings.status} incomplete={!summary.savingsAmountsComplete} t={t} onRetry={loadDashboard} />
          <AllocationCard title={t('dashboard_exec_investments')} items={summary.investmentsBreakdown} empty={t('dashboard_exec_no_assets')} lang={lang} status={sources.investments.status} incomplete={!summary.investmentsComplete} t={t} onRetry={loadDashboard} />
          <AllocationCard title={t('dashboard_exec_debts')} items={summary.debtsBreakdown} empty={t('dashboard_exec_no_debts')} lang={lang} status={sources.debts.status} incomplete={!summary.debtBalancesComplete} t={t} onRetry={loadDashboard} />
        </div>
        {summary.hasForeignCurrency ? <p className={styles.currencyNote}><CircleDollarSign aria-hidden="true" />{t('dashboard_exec_multi_currency_note')}</p> : null}
      </section>

      <div className={styles.secondaryGrid}>
        <section className={styles.section} aria-labelledby="goals-title">
          <SectionHeading id="goals-title" title={t('dashboard_exec_goals_title')} description={t('dashboard_exec_goals_desc')} action={<Link href="/goals">{t('dashboard_exec_view_all')}<ArrowUpRight aria-hidden="true" /></Link>} />
          {sources.goals.status === 'loading' ? <SectionSkeleton compact /> : loaded(sources.goals.status) ? (
            summary.goals.length > 0
              ? <div className={styles.goalList}>{summary.goals.slice(0, 3).map((goal) => <GoalItem key={goal.id} goal={goal} lang={lang} t={t} />)}</div>
              : <StateMessage icon={<Target />} title={t('dashboard_exec_no_goals')} action={<Link href="/goals/add">{t('dashboard_exec_add_goal')}</Link>} />
          ) : <InlineSourceState status={sources.goals.status} t={t} onRetry={loadDashboard} />}
        </section>

        <section className={styles.section} aria-labelledby="attention-title">
          <SectionHeading id="attention-title" title={t('dashboard_exec_attention_title')} description={t('dashboard_exec_attention_desc')} />
          {attentionLoading ? <SectionSkeleton compact /> : attention.length > 0 ? (
            <div className={styles.attentionList}>
              {attention.map((item) => (
                <article className={styles.attentionItem} data-tone={item.tone} key={item.id}>
                  <span className={styles.attentionIcon} aria-hidden="true">{item.tone === 'danger' ? <AlertTriangle /> : item.tone === 'warning' ? <Flag /> : <ShieldCheck />}</span>
                  <div><h3>{item.title}</h3><p>{item.body}</p></div>
                  <Link href={item.href} aria-label={`${t('dashboard_exec_review')}: ${item.title}`}><ArrowUpRight aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          ) : <StateMessage icon={<ShieldCheck />} title={t('dashboard_exec_no_attention')} />}
        </section>
      </div>

      <section className={styles.section} aria-labelledby="next-actions-title">
        <SectionHeading id="next-actions-title" title={t('dashboard_exec_next_title')} description={t('dashboard_exec_next_desc')} />
        <nav className={styles.shortcutGrid} aria-label={t('dashboard_exec_next_title')}>
          <Shortcut href="/reports-center" icon={<FileChartColumn />} label={t('dashboard_exec_reports')} />
          <Shortcut href="/today" icon={<CalendarDays />} label={t('dashboard_exec_today')} />
          <Shortcut href="/goals" icon={<Target />} label={t('dashboard_exec_goals')} />
          <Shortcut href="/invest" icon={<TrendingUp />} label={t('dashboard_exec_invest')} />
          <Shortcut href="/debts" icon={<Landmark />} label={t('dashboard_exec_debt_workspace')} />
          <Shortcut href="/income" icon={<CircleDollarSign />} label={t('dashboard_exec_income_workspace')} />
          <Shortcut href="/expenses" icon={<WalletCards />} label={t('dashboard_exec_expense_workspace')} />
        </nav>
      </section>

      {profileStatus === 'permission' || profileStatus === 'network' || profileStatus === 'unavailable' ? (
        <div className={styles.profileNotice} role="status">{sourceStatusText(profileStatus, t)}</div>
      ) : null}
    </main>
  );
}

function sourceReason(statuses: DashboardSourceStatus[], t: ReturnType<typeof useLanguage>['t']) {
  const failure = statuses.find((status) => status === 'permission' || status === 'network' || status === 'unavailable');
  if (failure) return sourceStatusText(failure, t);
  if (statuses.some((status) => status === 'loading')) return t('dashboard_exec_loading');
  if (statuses.some((status) => status === 'empty')) return t('dashboard_exec_no_records');
  return t('dashboard_exec_calculation_unavailable');
}

function SectionHeading({ id, title, description, action }: { id: string; title: string; description?: string; action?: ReactNode }) {
  return <header className={styles.sectionHeading}><div><h2 id={id}>{title}</h2>{description ? <p>{description}</p> : null}</div>{action}</header>;
}

function MetricCard({ label, value, status, icon, tone }: { label: string; value: string | null; status: string; icon: ReactNode; tone: 'primary' | 'success' | 'danger' | 'accent' }) {
  return (
    <article className={styles.metricCard} data-tone={tone}>
      <div className={styles.metricHeader}><span>{label}</span><i aria-hidden="true">{icon}</i></div>
      <strong className={styles.financialValue} data-financial-value="true"><bdi>{value ?? '—'}</bdi></strong>
      <p>{status}</p>
    </article>
  );
}

function HealthIndicator({ label, value, unavailable }: { label: string; value: string | null; unavailable: string }) {
  return <article className={styles.healthIndicator}><span>{label}</span><strong data-financial-value="true"><bdi>{value ?? '—'}</bdi></strong><small>{value === null ? unavailable : ''}</small></article>;
}

function CashFlowChart({ points, currency, lang, label, periodLabel, incomeLabel, expensesLabel, insufficientLabel }: { points: CashFlowPoint[]; currency: string; lang: 'ar' | 'en' | 'fr'; label: string; periodLabel: string; incomeLabel: string; expensesLabel: string; insufficientLabel: string }) {
  if (points.length < 2) return <StateMessage icon={<BarChart3 />} title={insufficientLabel} />;
  const maximum = Math.max(...points.flatMap((point) => [point.income, point.expenses]), 0);
  if (maximum <= 0) return <StateMessage icon={<BarChart3 />} title={insufficientLabel} />;
  const incomePoints = buildLinePoints(points.map((point) => point.income), 760, 18, 190, maximum);
  const expensePoints = buildLinePoints(points.map((point) => point.expenses), 760, 18, 190, maximum);
  const x = (index: number) => points.length === 1 ? 0 : (index / (points.length - 1)) * 760;
  const y = (value: number) => 190 - (Math.max(0, value) / maximum) * 172;
  return (
    <figure className={styles.chartFigure}>
      <div className={styles.chartLegend}><span data-series="income">{incomeLabel}</span><span data-series="expenses">{expensesLabel}</span></div>
      <svg viewBox="0 0 760 220" role="img" aria-label={label} preserveAspectRatio="none">
        <title>{label}</title>
        {[18, 61, 104, 147, 190].map((line) => <line key={line} x1="0" y1={line} x2="760" y2={line} className={styles.chartGridLine} />)}
        <polyline points={incomePoints} className={styles.incomeLine} vectorEffect="non-scaling-stroke" />
        <polyline points={expensePoints} className={styles.expenseLine} vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <g key={point.key}>
            <circle cx={x(index)} cy={y(point.income)} r="5" className={styles.incomePoint} tabIndex={0}>
              <title>{`${incomeLabel}, ${point.key}: ${formatCurrency(point.income, currency, lang)}`}</title>
            </circle>
            <circle cx={x(index)} cy={y(point.expenses)} r="5" className={styles.expensePoint} tabIndex={0}>
              <title>{`${expensesLabel}, ${point.key}: ${formatCurrency(point.expenses, currency, lang)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className={styles.chartLabels} style={{ gridTemplateColumns: `repeat(${points.length}, minmax(2.5rem, 1fr))` }}>{points.map((point) => <span key={point.key}>{formatDate(new Date(point.year, point.month, 1), lang, { month: 'short' })}</span>)}</div>
      <table className={styles.srOnly}>
        <caption>{label}</caption><thead><tr><th>{periodLabel}</th><th>{incomeLabel}</th><th>{expensesLabel}</th></tr></thead>
        <tbody>{points.map((point) => <tr key={point.key}><th>{point.key}</th><td>{formatCurrency(point.income, currency, lang)}</td><td>{formatCurrency(point.expenses, currency, lang)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function AllocationCard({ title, items, empty, lang, status, incomplete, t, onRetry }: { title: string; items: CurrencyAmount[]; empty: string; lang: 'ar' | 'en' | 'fr'; status: DashboardSourceStatus; incomplete: boolean; t: ReturnType<typeof useLanguage>['t']; onRetry: () => void }) {
  return (
    <article className={styles.allocationCard}>
      <h3>{title}</h3>
      {status === 'loading'
        ? <SectionSkeleton compact />
        : loaded(status)
          ? incomplete
            ? <p>{t('dashboard_exec_calculation_unavailable')}</p>
            : items.length > 0 ? <dl>{items.map((item) => <div key={item.currency}><dt><bdi>{item.currency}</bdi><small>{formatNumber(item.records, lang)}</small></dt><dd data-financial-value="true"><bdi>{formatCurrency(item.amount, item.currency, lang)}</bdi></dd></div>)}</dl> : <p>{empty}</p>
          : <InlineSourceState status={status} t={t} onRetry={onRetry} />}
    </article>
  );
}

function GoalItem({ goal, lang, t }: { goal: GoalSummary; lang: 'ar' | 'en' | 'fr'; t: ReturnType<typeof useLanguage>['t'] }) {
  const statusKey = `dashboard_exec_status_${goal.status}` as 'dashboard_exec_status_completed' | 'dashboard_exec_status_on_track' | 'dashboard_exec_status_behind' | 'dashboard_exec_status_insufficient';
  return (
    <article className={styles.goalItem}>
      <div className={styles.goalHeading}><h3>{goal.title}</h3><span data-status={goal.status}>{t(statusKey)}</span></div>
      {goal.progressRatio !== null ? <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goal.progressRatio * 100)} aria-label={`${goal.title}: ${formatPercent(goal.progressRatio, lang)}`}><i style={{ inlineSize: `${goal.progressRatio * 100}%` }} /></div> : <p className={styles.goalUnavailable}>{t('dashboard_exec_progress_unavailable')}</p>}
      <dl className={styles.goalFacts}>
        <div><dt>{t('dashboard_exec_current')}</dt><dd><bdi>{goal.currentAmount === null || !goal.currency ? '—' : formatCurrency(goal.currentAmount, goal.currency, lang)}</bdi></dd></div>
        <div><dt>{t('dashboard_exec_target')}</dt><dd><bdi>{goal.targetAmount === null || !goal.currency ? '—' : formatCurrency(goal.targetAmount, goal.currency, lang)}</bdi></dd></div>
        <div><dt>{t('dashboard_exec_deadline')}</dt><dd>{goal.deadline ? formatDate(goal.deadline, lang) : '—'}</dd></div>
      </dl>
    </article>
  );
}

function StateMessage({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return <div className={styles.stateMessage}><span aria-hidden="true">{icon}</span><p>{title}</p>{action}</div>;
}

function InlineSourceState({ status, t, onRetry }: { status: DashboardSourceStatus; t: ReturnType<typeof useLanguage>['t']; onRetry: () => void }) {
  return <div className={styles.sourceState} role={status === 'loading' ? 'status' : 'alert'}><p>{sourceStatusText(status, t)}</p>{status !== 'loading' ? <button type="button" onClick={onRetry}>{t('dashboard_exec_retry')}</button> : null}</div>;
}

function Shortcut({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <Link href={href} className={styles.shortcut}><span aria-hidden="true">{icon}</span><b>{label}</b><ArrowUpRight aria-hidden="true" /></Link>;
}

function SectionSkeleton({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.sectionSkeleton} ${compact ? styles.sectionSkeletonCompact : ''}`} aria-hidden="true"><i /><i /><i /></div>;
}

function DashboardSkeleton({ dir, label }: { dir: 'rtl' | 'ltr'; label: string }) {
  return (
    <main className={styles.page} dir={dir} aria-busy="true" aria-label={label} data-dashboard-skeleton="true">
      <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
      <div className={styles.metricGrid}>{Array.from({ length: 4 }, (_, index) => <div className={`${styles.skeleton} ${styles.skeletonMetric}`} key={index} />)}</div>
      <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
      <div className={styles.primaryGrid}><div className={`${styles.skeleton} ${styles.skeletonPanel}`} /><div className={`${styles.skeleton} ${styles.skeletonPanel}`} /></div>
      <span className={styles.srOnly}>{label}</span>
    </main>
  );
}
