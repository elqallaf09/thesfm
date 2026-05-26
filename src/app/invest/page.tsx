'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Brain, Layers3, LineChart as LineChartIcon, PieChart as PieChartIcon, Plus, ShieldAlert, TrendingUp, WalletCards } from 'lucide-react';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { InvestmentFormModal } from '@/components/invest/InvestmentFormModal';
import { InvestmentList } from '@/components/invest/InvestmentList';
import { InvestmentDetailDrawer } from '@/components/invest/InvestmentDetailDrawer';
import { ConfirmDeleteModal } from '@/components/invest/ConfirmDeleteModal';
import { EmptyState } from '@/components/invest/EmptyState';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import { investmentSymbol, marketAnalysisUrl } from '@/lib/data/investmentData';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

const TYPES: InvestmentType[] = ['stocks', 'realEstate', 'fund', 'gold', 'cash', 'crypto', 'project', 'other'];
const RISKS: RiskLevel[] = ['low', 'medium', 'high'];
const CHART_COLORS = ['var(--sfm-soft-cyan)', 'var(--sfm-muted)', 'var(--sfm-muted)', '#22C55E', '#3B82F6', 'var(--sfm-muted)', '#C8A96B', '#BFB5A8'];
const RISK_SCORE: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
type InvestTab = 'portfolio' | 'assets' | 'performance' | 'risk' | 'reports';

export default function InvestPage() {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const { items, isLoading, error, add, update, remove } = useInvestments();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Investment | null>(null);
  const [details, setDetails] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<InvestTab>('portfolio');
  const insightsRef = useRef<HTMLDivElement | null>(null);

  const labels = useMemo(() => ({
    heroTitle: t('invest_hero_title'),
    heroSubtitle: t('invest_hero_subtitle'),
    activeBadge: t('invest_hero_activeBadge'),
    addCta: t('invest_hero_addCta'),
    aiCta: t('invest_hero_aiCta'),
    marketCta: t('market_title'),
    emptyTitle: t('invest_empty_title'),
    emptyDescription: t('invest_empty_description'),
    emptyCta: t('invest_empty_cta'),
    search: t('invest_list_search'),
    allTypes: t('invest_list_allTypes'),
    sortBy: t('invest_list_sortBy'),
    valueDesc: t('invest_list_valueDesc'),
    valueAsc: t('invest_list_valueAsc'),
    monthlyDesc: t('invest_list_monthlyDesc'),
    riskDesc: t('invest_list_riskDesc'),
    newest: t('invest_list_newest'),
    details: t('invest_list_details'),
    edit: t('invest_list_edit'),
    delete: t('invest_list_delete'),
    monthly: t('invest_form_monthly'),
    risk: t('invest_form_risk'),
    expectedReturn: t('invest_form_expectedReturn'),
    ofPortfolio: t('invest_list_ofPortfolio'),
    currentValue: t('invest_form_currentValue'),
    type: t('invest_form_type'),
    startDate: t('invest_form_startDate'),
    notes: t('invest_form_notes'),
    close: t('close'),
  }), [t]);

  const formLabels = useMemo(() => ({
    titleAdd: t('invest_form_titleAdd'),
    titleEdit: t('invest_form_titleEdit'),
    close: t('close'),
    name: t('invest_form_name'),
    namePlaceholder: t('invest_form_namePlaceholder'),
    type: t('invest_form_type'),
    currentValue: t('invest_form_currentValue'),
    monthly: t('invest_form_monthly'),
    startDate: t('invest_form_startDate'),
    risk: t('invest_form_risk'),
    expectedReturn: t('invest_form_expectedReturn'),
    notes: t('invest_form_notes'),
    save: t('invest_form_save'),
    update: t('invest_form_update'),
    cancel: t('cancel'),
    errors: {
      nameRequired: t('invest_form_errors_nameRequired'),
      valuePositive: t('invest_form_errors_valuePositive'),
      contributionPositive: t('invest_form_errors_contributionPositive'),
      returnRange: t('invest_form_errors_returnRange'),
    },
  }), [t]);

  const typeLabel = useCallback((type: InvestmentType) => t(`invest_types_${type}`), [t]);
  const riskLabel = useCallback((risk: RiskLevel) => t(`invest_risks_${risk}`), [t]);
  const L = useCallback((ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en, [lang]);
  const tabs = useMemo(() => [
    { id: 'portfolio', label: L('المحفظة', 'Portfolio', 'Portefeuille') },
    { id: 'assets', label: L('الأصول', 'Assets', 'Actifs'), count: items.length },
    { id: 'performance', label: L('الأداء', 'Performance', 'Performance') },
    { id: 'risk', label: L('المخاطر', 'Risk', 'Risque') },
    { id: 'reports', label: L('التقارير', 'Reports', 'Rapports') },
  ], [L, items.length]);
  const money = useCallback((amount: number) => formatCurrency(amount, currency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'), [currency, lang]);
  const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.currentValue, 0), [items]);
  const totalMonthly = useMemo(() => items.reduce((sum, item) => sum + item.monthlyContribution, 0), [items]);
  const uniqueCategories = useMemo(() => new Set(items.map(item => item.type)).size, [items]);
  const weightedRiskScore = useMemo(() => {
    if (totalValue <= 0) return 0;
    return items.reduce((sum, item) => sum + RISK_SCORE[item.riskLevel] * (item.currentValue / totalValue), 0);
  }, [items, totalValue]);
  const overallRisk: RiskLevel = weightedRiskScore < 1.5 ? 'low' : weightedRiskScore < 2.5 ? 'medium' : 'high';
  const weightedReturn = useMemo(() => {
    const withReturns = items.filter(item => typeof item.expectedAnnualReturn === 'number' && item.expectedAnnualReturn >= 0);
    const returnBase = withReturns.reduce((sum, item) => sum + item.currentValue, 0);
    if (returnBase <= 0) return null;
    return withReturns.reduce((sum, item) => sum + (item.expectedAnnualReturn ?? 0) * item.currentValue, 0) / returnBase;
  }, [items]);
  const analysisReturn = weightedReturn ?? 0;
  const canShowReturnProjection = weightedReturn !== null;
  const typeDistribution = useMemo(() => TYPES.map((type, index) => ({
    name: typeLabel(type),
    value: items.filter(item => item.type === type).reduce((sum, item) => sum + item.currentValue, 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
  })).filter(item => item.value > 0), [items, typeLabel]);
  const valueByInvestment = useMemo(() => items.map(item => ({
    name: item.name,
    value: item.currentValue,
  })), [items]);
  const projectionLineData = useMemo(() => {
    const monthlyRate = analysisReturn / 100 / 12;
    return Array.from({ length: 13 }, (_, month) => {
      const factor = monthlyRate > 0 ? Math.pow(1 + monthlyRate, month) : 1;
      const contributionGrowth = monthlyRate > 0 ? totalMonthly * ((factor - 1) / monthlyRate) : totalMonthly * month;
      return {
        month: `${t('invest_charts_month')} ${month}`,
        value: Math.round(totalValue * factor + contributionGrowth),
      };
    });
  }, [analysisReturn, totalMonthly, totalValue, t]);
  const projections = useMemo(() => [1, 3, 5].map(years => {
    const months = years * 12;
    const monthlyRate = analysisReturn / 100 / 12;
    const factor = monthlyRate > 0 ? Math.pow(1 + monthlyRate, months) : 1;
    const contributionGrowth = monthlyRate > 0 ? totalMonthly * ((factor - 1) / monthlyRate) : totalMonthly * months;
    const value = totalValue * factor + contributionGrowth;
    const contribTotal = totalMonthly * months;
    return {
      years,
      value,
      contribTotal,
      gain: value - totalValue - contribTotal,
    };
  }), [analysisReturn, totalMonthly, totalValue]);
  const marketLinkedInvestments = useMemo(() => items
    .map(item => ({ investment: item, symbol: investmentSymbol(item) }))
    .filter(item => item.symbol), [items]);
  const insights = useMemo(() => {
    if (items.length === 0) return [];
    if (items.length === 1) return [t('invest_insights_addMoreForDiversification')];

    const next: string[] = [];
    const biggest = [...items].sort((a, b) => b.currentValue - a.currentValue)[0];
    const biggestPct = totalValue > 0 ? (biggest.currentValue / totalValue) * 100 : 0;
    if (biggestPct > 70) {
      next.push(t('invest_insights_concentratedRisk')
        .replace('{type}', typeLabel(biggest.type))
        .replace('{pct}', biggestPct.toFixed(0)));
    }

    if (totalMonthly <= 0) {
      next.push(t('invest_insights_noMonthlyContribution'));
    } else {
      const fiveYearMonthlyTotal = totalMonthly * 60;
      next.push(t('invest_insights_monthlyContribution')
        .replace('{amount}', money(totalMonthly))
        .replace('{total}', money(fiveYearMonthlyTotal)));
    }

    const futureFiveYears = canShowReturnProjection ? projections.find(item => item.years === 5) : null;
    if (futureFiveYears) {
      next.push(t('invest_insights_projection5y')
        .replace('{amount}', money(Math.round(futureFiveYears.value)))
        .replace('{rate}', analysisReturn.toFixed(1)));
    } else {
      next.push(t('invest_summary_defaultReturn'));
    }

    if (uniqueCategories >= 4) {
      next.push(t('invest_insights_wellDiversified').replace('{count}', String(uniqueCategories)));
    } else {
      next.push(t('invest_insights_diversifyMore').replace('{count}', String(uniqueCategories)));
    }

    return next;
  }, [analysisReturn, canShowReturnProjection, items, money, projections, t, totalMonthly, totalValue, typeLabel, uniqueCategories]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function openCreate() {
    setSelected(null);
    setMode('create');
    setModalOpen(true);
  }

  function openEdit(item: Investment) {
    setSelected(item);
    setMode('edit');
    setModalOpen(true);
  }

  async function handleSave(input: InvestmentInput) {
    setSaving(true);
    try {
      if (mode === 'create') {
        await add(input);
        showToast(t('invest_form_successAdd'));
      } else if (selected) {
        await update(selected.id, input);
        showToast(t('invest_form_successUpdate'));
      }
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      showToast(t('invest_delete_success'));
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('error'));
    } finally {
      setDeleting(false);
    }
  }

  const pct = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="invest-shell" dir={dir}>
      <Sidebar />
      <main className="invest-main">
        <header className="invest-topbar">
          <div>
            <span>{labels.activeBadge}</span>
            <h1>{labels.heroTitle}</h1>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="invest-hero">
          <div className="invest-hero-content">
            <div className="invest-badge">
              <span />
              {labels.activeBadge}
            </div>
            <h2>{labels.heroTitle}</h2>
            <p>{labels.heroSubtitle}</p>
            <button type="button" className="invest-primary-btn" onClick={openCreate}>
              <Plus size={17} />
              {labels.addCta}
            </button>
            {items.length > 0 && (
              <button type="button" className="invest-glass-btn" onClick={() => { setActiveTab('risk'); window.setTimeout(() => insightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}>
                <Brain size={17} />
                {labels.aiCta}
              </button>
            )}
            <button type="button" className="invest-glass-btn" onClick={() => router.push('/market-analysis')}>
              <LineChartIcon size={17} />
              {labels.marketCta}
            </button>
          </div>
          <div className="invest-hero-total">
            <TrendingUp size={25} />
            <span>{t('invest_summary_portfolioValue')}</span>
            <strong>{money(totalValue)}</strong>
          </div>
        </section>

        {error && <div className="invest-notice">{error}</div>}

        {isLoading ? (
          <div className="invest-panel invest-loading">{t('loading')}</div>
        ) : items.length === 0 ? (
          <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} cta={labels.emptyCta} onCreate={openCreate} />
        ) : (
          <>
            <section className="invest-summary-grid">
              <SummaryCard icon={<WalletCards size={20} />} title={t('invest_summary_portfolioValue')} value={money(totalValue)} subtitle={t('recordedData')} />
              <SummaryCard icon={<TrendingUp size={20} />} title={t('invest_summary_monthlyContribution')} value={money(totalMonthly)} subtitle={t('invest_projections_totalContributions')} />
              <SummaryCard icon={<ShieldAlert size={20} />} title={t('invest_summary_riskLevel')} value={riskLabel(overallRisk)} subtitle={t('invest_summary_notFinancialAdvice')} />
              <SummaryCard icon={<Layers3 size={20} />} title={t('invest_summary_diversification')} value={t('invest_summary_categoriesCount').replace('{count}', String(uniqueCategories))} subtitle={uniqueCategories >= 4 ? t('invest_insights_wellDiversified').replace('{count}', String(uniqueCategories)) : t('invest_insights_diversifyMore').replace('{count}', String(uniqueCategories))} />
              <SummaryCard icon={<LineChartIcon size={20} />} title={t('invest_summary_expectedReturn')} value={weightedReturn === null ? t('insufficientData') : pct(weightedReturn)} subtitle={weightedReturn === null ? t('invest_summary_defaultReturn') : t('invest_summary_notFinancialAdvice')} />
            </section>

            <PageTabs
              tabs={tabs}
              active={activeTab}
              onChange={id => setActiveTab(id as InvestTab)}
              ariaLabel={labels.heroTitle}
            />

            {activeTab === 'portfolio' && (
            <section className="invest-panel invest-market-link">
              <div className="invest-section-head">
                <LineChartIcon size={18} />
                <h2>{L('ربط الاستثمار بتحليل السوق','Investments and Market Analysis','Investissements et analyse du marché')}</h2>
              </div>
              {marketLinkedInvestments.length > 0 ? (
                <div className="invest-market-chips">
                  {marketLinkedInvestments.map(item => (
                    <button key={`${item.investment.id}-${item.symbol}`} type="button" onClick={() => router.push(marketAnalysisUrl(item.symbol))}>
                      <strong>{item.symbol}</strong>
                      <span>{item.investment.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p>{L('أضف رمز الأصل لتحليل السوق. لا يتم عرض أسعار أو أرباح غير محققة بدون بيانات سوق حقيقية.','Add asset symbol for market analysis. No prices or unrealized gains are shown without real market data.','Ajoutez le symbole de l’actif pour l’analyse du marché. Aucun prix ni gain latent n’est affiché sans données de marché réelles.')}</p>
              )}
            </section>
            )}

            {activeTab === 'performance' && (
            <section className="invest-chart-grid">
              <ChartCard icon={<PieChartIcon size={18} />} title={t('invest_charts_distribution')}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={typeDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
                      {typeDistribution.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard icon={<BarChart3 size={18} />} title={t('invest_charts_byInvestment')}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={valueByInvestment}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={value => String(Math.round(Number(value)))} tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => money(Number(value))} />
                    <Bar dataKey="value" fill="var(--sfm-soft-cyan)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              {canShowReturnProjection ? (
                <ChartCard icon={<LineChartIcon size={18} />} title={t('invest_charts_projection12')}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={projectionLineData}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={value => String(Math.round(Number(value)))} tick={{ fontSize: 11, fill: 'var(--sfm-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => money(Number(value))} />
                      <Line type="monotone" dataKey="value" stroke="var(--sfm-muted)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : (
                <ChartCard icon={<LineChartIcon size={18} />} title={t('invest_charts_projection12')}>
                  <div className="invest-empty-chart">{t('invest_summary_defaultReturn')}</div>
                </ChartCard>
              )}
            </section>
            )}

            {(activeTab === 'risk' || activeTab === 'reports') && (
            <section className="invest-analysis-grid" ref={insightsRef}>
              <div className="invest-panel invest-insights">
                <div className="invest-section-head">
                  <Brain size={19} />
                  <h2>{t('invest_insights_title')}</h2>
                </div>
                <div className="invest-insight-list">
                  {insights.map((insight, index) => (
                    <div key={`${insight}-${index}`} className="invest-insight-item">
                      <span>{index + 1}</span>
                      <p>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="invest-panel invest-projections">
                <div className="invest-section-head">
                  <LineChartIcon size={19} />
                  <h2>{t('invest_projections_title')}</h2>
                </div>
                {canShowReturnProjection ? (
                  <>
                    <div className="invest-projection-grid">
                      {projections.map(item => (
                        <div key={item.years}>
                          <span>{t(`invest_projections_years${item.years}`)}</span>
                          <strong>{money(Math.round(item.value))}</strong>
                          <small>{t('invest_projections_totalContributions')}: {money(item.contribTotal)}</small>
                          <small>{t('invest_projections_expectedGain')}: {money(Math.round(item.gain))}</small>
                        </div>
                      ))}
                    </div>
                    <p className="invest-disclaimer">{t('invest_projections_disclaimer')}</p>
                  </>
                ) : (
                  <div className="invest-empty-chart">{t('invest_summary_defaultReturn')}</div>
                )}
              </div>
            </section>
            )}

            {activeTab === 'assets' && (
            <InvestmentList
              investments={items}
              labels={labels}
              types={TYPES}
              typeLabel={typeLabel}
              riskLabel={riskLabel}
              formatMoney={money}
              onDetails={setDetails}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
            )}
          </>
        )}

        <InvestmentFormModal
          open={modalOpen}
          mode={mode}
          currency={currency}
          dir={dir}
          labels={formLabels}
          typeOptions={TYPES}
          riskOptions={RISKS}
          typeLabel={typeLabel}
          riskLabel={riskLabel}
          initialValues={selected}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />

        <InvestmentDetailDrawer
          open={Boolean(details)}
          investment={details}
          labels={labels}
          typeLabel={typeLabel}
          riskLabel={riskLabel}
          formatMoney={money}
          onClose={() => setDetails(null)}
        />

        <ConfirmDeleteModal
          open={Boolean(deleteTarget)}
          investment={deleteTarget}
          title={t('invest_delete_title')}
          message={t('invest_delete_message')}
          cancelLabel={t('cancel')}
          confirmLabel={t('invest_delete_confirm')}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        />

        {toast && <div className="invest-toast">{toast}</div>}
      </main>

      <style jsx global>{`
        .invest-shell{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);display:flex;font-family:Tajawal,Arial,sans-serif}
        .invest-main{flex:1;width:100%;max-width:1280px;margin:0 auto;padding:22px;margin-inline-start:230px}
        .invest-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
        .invest-topbar span{font-size:12px;color:var(--sfm-muted);font-weight:900}.invest-topbar h1{font-size:25px;margin:4px 0 0;font-weight:900;color:var(--sfm-foreground)}
        .invest-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 140%);border:1px solid rgba(167,243,240,.22);border-radius:26px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;color:var(--sfm-card);box-shadow:0 20px 55px rgba(3,18,37,.16);margin-bottom:18px}
        .invest-hero:before{content:"";position:absolute;inset-inline-end:-80px;top:-90px;width:240px;height:240px;border-radius:50%;background:rgba(167,243,240,.12);filter:blur(18px)}
        .invest-hero-content{position:relative;z-index:1}.invest-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.14);color:#86EFAC;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:900;margin-bottom:14px}.invest-badge span{width:7px;height:7px;border-radius:50%;background:#22C55E;animation:pulse 1.6s infinite}
        .invest-hero h2{font-size:34px;line-height:1.05;margin:0 0 10px;font-weight:900}.invest-hero p{max-width:680px;margin:0 0 18px;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .invest-hero-total{position:relative;z-index:1;min-width:230px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:18px;display:grid;gap:7px;backdrop-filter:blur(12px)}.invest-hero-total svg{color:var(--sfm-soft-cyan)}.invest-hero-total span{color:rgba(255,255,255,.68);font-size:12px;font-weight:800}.invest-hero-total strong{font-size:23px;color:var(--sfm-soft-cyan)}
        .invest-primary-btn,.invest-secondary-btn,.invest-danger-btn,.invest-glass-btn{height:43px;border-radius:14px;border:0;padding:0 17px;font:900 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .2s}.invest-primary-btn{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(167,243,240,.22)}.invest-primary-btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(167,243,240,.28)}.invest-secondary-btn{background:var(--sfm-card);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.22)}.invest-danger-btn{background:#B91C1C;color:#fff}.invest-glass-btn{margin-inline-start:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:var(--sfm-card)}.invest-glass-btn:hover{background:rgba(255,255,255,.18)}.invest-primary-btn:disabled,.invest-secondary-btn:disabled,.invest-danger-btn:disabled{opacity:.6;cursor:wait}
        .invest-panel,.invest-empty{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 4px 22px rgba(3,18,37,.06)}
        .invest-summary-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.invest-summary-card{min-height:132px;padding:16px;display:grid;gap:8px}.invest-summary-card .icon{width:38px;height:38px;border-radius:13px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-summary-card span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.invest-summary-card strong{font-size:18px;color:var(--sfm-foreground)}.invest-summary-card p{margin:0;color:var(--sfm-muted);font-size:11px;font-weight:800;line-height:1.6}
        .invest-chart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:14px}.invest-chart-card{padding:17px;min-height:330px}.invest-section-head{display:flex;align-items:center;gap:9px;margin-bottom:14px;color:var(--sfm-muted)}.invest-section-head h2{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:900}
        .invest-market-link{padding:17px;margin-bottom:14px}.invest-market-link p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7}.invest-market-chips{display:flex;flex-wrap:wrap;gap:9px}.invest-market-chips button{min-height:44px;border:1px solid rgba(167,243,240,.16);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:8px 12px;display:flex;align-items:center;gap:8px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.invest-market-chips button strong{direction:ltr;color:var(--sfm-muted)}.invest-market-chips button span{color:var(--sfm-muted)}
        .invest-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.invest-insights,.invest-projections{padding:18px}.invest-insight-list{display:grid;gap:10px}.invest-insight-item{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px}.invest-insight-item span{width:30px;height:30px;border-radius:11px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));display:grid;place-items:center;color:var(--sfm-foreground);font-size:12px;font-weight:900}.invest-insight-item p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.7}.invest-empty-chart{min-height:220px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7;background:var(--sfm-light-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px;padding:18px}
        .invest-projection-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.invest-projection-grid div{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px;display:grid;gap:6px}.invest-projection-grid span{color:var(--sfm-muted);font-size:11px;font-weight:900}.invest-projection-grid strong{font-size:15px;color:var(--sfm-foreground)}.invest-projection-grid small{font-size:11px;color:var(--sfm-muted);font-weight:800}.invest-disclaimer{margin:12px 0 0;color:var(--sfm-muted);font-size:11px;font-weight:900}
        .invest-empty{min-height:280px;padding:42px 20px;text-align:center;display:grid;place-items:center;align-content:center;gap:12px}.invest-empty-icon{width:68px;height:68px;border-radius:22px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-empty h3{margin:0;font-size:20px}.invest-empty p{max-width:520px;margin:0;color:var(--sfm-muted);line-height:1.8;font-size:14px}
        .invest-controls{display:grid;grid-template-columns:1fr 220px 220px;gap:10px;padding:16px;border-bottom:1px solid rgba(167,243,240,.1)}.invest-controls input,.invest-controls select,.invest-field input,.invest-field select,.invest-field textarea{height:48px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.invest-controls input:focus,.invest-controls select:focus,.invest-field input:focus,.invest-field select:focus,.invest-field textarea:focus{border-color:var(--sfm-soft-cyan);background:var(--sfm-card);box-shadow:0 0 0 4px rgba(167,243,240,.12)}
        .invest-list{display:grid;gap:0;padding:4px 16px 16px}.invest-row{padding:16px 0;border-bottom:1px solid rgba(167,243,240,.1);display:grid;gap:11px}.invest-row:last-child{border-bottom:0}.invest-row-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.invest-row-main h3{margin:0 0 5px;font-size:16px;font-weight:900}.invest-row-main p{margin:0;color:#8B7A6D;font-size:12px;font-weight:800}.invest-row-main strong{font-size:16px;color:var(--sfm-soft-cyan);white-space:nowrap}.invest-row-meta{display:flex;flex-wrap:wrap;gap:8px}.invest-row-meta span{font-size:12px;font-weight:800;color:var(--sfm-muted);background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:999px;padding:6px 10px}.invest-row-actions{display:flex;gap:7px;flex-wrap:wrap}.invest-row-actions button{height:34px;border-radius:11px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);color:var(--sfm-muted);padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:6px;cursor:pointer}.invest-row-actions button:hover{background:rgba(167,243,240,.09);color:var(--sfm-muted)}.invest-row-actions button.danger:hover{background:rgba(185,28,28,.08);color:#B91C1C}
        .invest-overlay{position:fixed;inset:0;z-index:80;background:rgba(17,17,17,.42);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:18px}.invest-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:26px;box-shadow:0 28px 90px rgba(3,18,37,.3)}.invest-modal-head{position:sticky;top:0;background:rgba(248,251,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(167,243,240,.12);padding:18px 20px;display:flex;justify-content:space-between;align-items:center}.invest-modal-head h2{margin:0;font-size:21px}.invest-icon-btn{width:38px;height:38px;border-radius:12px;border:1px solid rgba(167,243,240,.18);background:var(--sfm-card);color:var(--sfm-muted);display:grid;place-items:center;cursor:pointer}.invest-form{padding:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.invest-field{display:grid;gap:7px}.invest-field>span{font-size:12px;font-weight:900;color:var(--sfm-muted)}.invest-field b{color:#B91C1C;margin-inline-start:3px}.invest-field textarea{height:auto;min-height:88px;padding-top:12px;resize:vertical}.invest-field small{font-size:11px;color:#B91C1C;font-weight:800}.span-2{grid-column:1/-1}.invest-form-actions{display:flex;justify-content:flex-end;gap:10px}.invest-form-actions.center{justify-content:center}
        .invest-confirm{position:relative;width:min(430px,100%);background:var(--sfm-card);border-radius:24px;border:1px solid rgba(167,243,240,.18);box-shadow:0 24px 75px rgba(3,18,37,.28);padding:26px;text-align:center}.invest-close{position:absolute;top:14px;inset-inline-end:14px}.invest-confirm-icon{width:62px;height:62px;margin:0 auto 12px;border-radius:20px;background:rgba(185,28,28,.08);color:#B91C1C;display:grid;place-items:center}.invest-confirm h3{margin:0 0 8px}.invest-confirm p{margin:0 0 18px;color:var(--sfm-muted);line-height:1.8;font-weight:800}
        .invest-drawer{width:min(460px,100%);max-height:92vh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:24px;padding:20px;box-shadow:0 28px 90px rgba(3,18,37,.3)}.invest-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.invest-drawer-title{display:flex;align-items:center;gap:12px}.invest-drawer-title>span{width:42px;height:42px;border-radius:14px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-drawer-title p{margin:0 0 4px;color:var(--sfm-muted);font-size:12px;font-weight:900}.invest-drawer-title h3{margin:0;font-size:19px}.invest-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.invest-detail-grid div,.invest-notes-box{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px}.invest-detail-grid span,.invest-notes-box strong{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:6px}.invest-detail-grid strong,.invest-notes-box p{margin:0;color:var(--sfm-foreground);font-size:13px;font-weight:800;line-height:1.7}.invest-notes-box{margin-top:10px}
        .invest-toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.28);border-radius:16px;padding:13px 16px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(3,18,37,.2)}.invest-notice{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:15px;padding:12px 14px;margin-bottom:14px;font-weight:800}.invest-loading{padding:34px;text-align:center;color:var(--sfm-muted);font-weight:900}
        @keyframes pulse{50%{opacity:.45}}@media(max-width:1180px){.invest-summary-grid{grid-template-columns:repeat(3,1fr)}.invest-chart-grid{grid-template-columns:1fr 1fr}.invest-analysis-grid{grid-template-columns:1fr}}@media(max-width:1024px){.invest-main{margin-inline-start:0}}@media(max-width:760px){.invest-main{padding:14px}.invest-hero{display:grid;padding:22px}.invest-hero h2{font-size:28px}.invest-hero-total{min-width:0}.invest-summary-grid,.invest-chart-grid,.invest-projection-grid{grid-template-columns:1fr}.invest-controls{grid-template-columns:1fr}.invest-form{grid-template-columns:1fr}.span-2{grid-column:auto}.invest-row-main{display:grid}.invest-row-main strong{white-space:normal}.invest-row-actions button{flex:1}.invest-detail-grid{grid-template-columns:1fr}.invest-overlay{align-items:flex-end;padding:0}.invest-modal,.invest-drawer{border-radius:24px 24px 0 0;max-height:95vh}.invest-confirm{margin:16px}}
      `}</style>
    </div>
  );
}

function SummaryCard({ icon, title, value, subtitle }: { icon: ReactNode; title: string; value: string; subtitle: string }) {
  return (
    <div className="invest-panel invest-summary-card">
      <div className="icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{subtitle}</p>
    </div>
  );
}

function ChartCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="invest-panel invest-chart-card">
      <div className="invest-section-head">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
