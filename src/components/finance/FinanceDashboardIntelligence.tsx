'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Gauge, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables } from '@/lib/data/financeData';
import { summarizeGoal } from '@/lib/dashboard/executiveOverview';
import { formatCurrency, formatPercent } from '@/lib/locale';
import {
  ECONOMIC_INTELLIGENCE_TABLES,
  buildFinancialTwinSnapshot,
  financialTwinSourceFromRecords,
  forecastFinancialTwin,
  type FinancialTwinForecast,
  type FinancialTwinSnapshot,
} from '@/domain/economic-intelligence';

type Locale = 'ar' | 'en' | 'fr';

type State = {
  loading: boolean;
  snapshot: FinancialTwinSnapshot | null;
  forecast: FinancialTwinForecast | null;
  goals: any[];
  errors: string[];
};

const TEXT = {
  ar: {
    title: 'الذكاء المالي التنفيذي',
    subtitle: 'توأمك المالي الحالي ومحاكاة 12 شهراً مبنية على بياناتك الفعلية وافتراضات منهجية معلنة.',
    current: 'الوضع الحالي',
    surplus: 'الفائض الشهري',
    runway: 'تغطية السيولة',
    debt: 'نسبة خدمة الدين',
    netWorth: 'صافي الثروة',
    months: 'شهر',
    scenarios: 'محاكاة سيناريوهات 12 شهراً',
    stress: 'ضاغط',
    base: 'أساسي',
    optimistic: 'متفائل',
    endLiquidity: 'السيولة بعد 12 شهر',
    endNetWorth: 'صافي الثروة بعد 12 شهر',
    assumptions: 'افتراضات شهرية',
    incomeGrowth: 'الدخل',
    expenseGrowth: 'المصاريف',
    investmentReturn: 'الاستثمار',
    simulationNotice: 'هذه محاكاة حساسية بافتراضات ثابتة وليست توقعاً للسوق أو ضماناً لنتيجة مستقبلية.',
    goals: 'مسار الأهداف',
    onTrack: 'على المسار',
    behind: 'متأخر',
    completed: 'مكتمل',
    warnings: 'إنذارات مبكرة',
    noWarnings: 'لا توجد إنذارات مالية حرجة من البيانات الحالية.',
    deficit: 'المصروفات والالتزامات تتجاوز الدخل الشهري.',
    lowRunway: 'احتياطي السيولة أقل من 3 أشهر من الالتزامات.',
    highDebt: 'نسبة خدمة الدين أعلى من 35% من الدخل.',
    goalRisk: 'يوجد هدف مالي متأخر عن مساره.',
    incomplete: 'بعض مصادر البيانات غير متاحة، لذلك اكتمال المحاكاة أقل.',
    loading: 'جاري بناء التوأم المالي...',
    unavailable: 'تعذر بناء التوأم المالي حالياً.',
    confidence: 'اكتمال البيانات',
  },
  en: {
    title: 'Executive Financial Intelligence',
    subtitle: 'Your current financial twin and a 12-month simulation built from real financial data and disclosed methodology assumptions.',
    current: 'Current state',
    surplus: 'Monthly surplus',
    runway: 'Liquidity runway',
    debt: 'Debt service ratio',
    netWorth: 'Net worth',
    months: 'months',
    scenarios: '12-month scenario simulation',
    stress: 'Stress',
    base: 'Base',
    optimistic: 'Optimistic',
    endLiquidity: 'Liquidity at month 12',
    endNetWorth: 'Net worth at month 12',
    assumptions: 'Monthly assumptions',
    incomeGrowth: 'income',
    expenseGrowth: 'expenses',
    investmentReturn: 'investment',
    simulationNotice: 'This is a sensitivity simulation using fixed assumptions, not a market forecast or a guarantee of future results.',
    goals: 'Goal trajectory',
    onTrack: 'On track',
    behind: 'Behind',
    completed: 'Completed',
    warnings: 'Early warnings',
    noWarnings: 'No critical financial warning is visible in the current data.',
    deficit: 'Monthly spending and obligations exceed monthly income.',
    lowRunway: 'Liquidity reserves cover less than 3 months of obligations.',
    highDebt: 'Debt service is above 35% of monthly income.',
    goalRisk: 'At least one financial goal is behind trajectory.',
    incomplete: 'Some data sources are unavailable, so simulation completeness is lower.',
    loading: 'Building your financial twin...',
    unavailable: 'Financial twin is currently unavailable.',
    confidence: 'Data completeness',
  },
  fr: {
    title: 'Intelligence financière exécutive',
    subtitle: 'Votre jumeau financier actuel et une simulation sur 12 mois fondée sur vos données réelles et des hypothèses méthodologiques explicites.',
    current: 'Situation actuelle',
    surplus: 'Surplus mensuel',
    runway: 'Couverture de liquidité',
    debt: 'Ratio de service de la dette',
    netWorth: 'Valeur nette',
    months: 'mois',
    scenarios: 'Simulation de scénarios sur 12 mois',
    stress: 'Stress',
    base: 'Base',
    optimistic: 'Optimiste',
    endLiquidity: 'Liquidité au mois 12',
    endNetWorth: 'Valeur nette au mois 12',
    assumptions: 'Hypothèses mensuelles',
    incomeGrowth: 'revenu',
    expenseGrowth: 'dépenses',
    investmentReturn: 'investissement',
    simulationNotice: 'Il s’agit d’une simulation de sensibilité avec des hypothèses fixes, et non d’une prévision de marché ni d’une garantie de résultat futur.',
    goals: 'Trajectoire des objectifs',
    onTrack: 'Sur la bonne voie',
    behind: 'En retard',
    completed: 'Terminé',
    warnings: 'Alertes précoces',
    noWarnings: 'Aucune alerte financière critique dans les données actuelles.',
    deficit: 'Les dépenses et engagements mensuels dépassent les revenus.',
    lowRunway: 'Les réserves de liquidité couvrent moins de 3 mois.',
    highDebt: 'Le service de la dette dépasse 35 % du revenu mensuel.',
    goalRisk: 'Au moins un objectif financier est en retard.',
    incomplete: 'Certaines sources sont indisponibles, la complétude de la simulation est donc réduite.',
    loading: 'Construction du jumeau financier...',
    unavailable: 'Le jumeau financier est indisponible pour le moment.',
    confidence: 'Complétude des données',
  },
} as const;

const INITIAL: State = { loading: true, snapshot: null, forecast: null, goals: [], errors: [] };

export function FinanceDashboardIntelligence() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency } = useCurrency();
  const locale = (lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar') as Locale;
  const text = TEXT[locale];
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setState({ ...INITIAL, loading: false });
      return;
    }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    void (async () => {
      const result = await loadUserDataTables(supabase as any, user.id, ECONOMIC_INTELLIGENCE_TABLES);
      if (cancelled) return;
      const records = result.records as Record<string, any[]>;
      const snapshot = buildFinancialTwinSnapshot(financialTwinSourceFromRecords(records), currency || 'KWD');
      const forecast = forecastFinancialTwin(snapshot, 12);
      const goals = (records.goals ?? []).map((row) => summarizeGoal(row, currency || 'KWD')).filter((goal) => goal.title);
      setState({ loading: false, snapshot, forecast, goals, errors: Object.keys(result.errors ?? {}) });
    })().catch(() => {
      if (!cancelled) setState({ loading: false, snapshot: null, forecast: null, goals: [], errors: ['load'] });
    });
    return () => { cancelled = true; };
  }, [authLoading, currency, user?.id]);

  const warnings = useMemo(() => {
    const list: string[] = [];
    const snapshot = state.snapshot;
    if (!snapshot) return list;
    if (snapshot.monthlySurplus < 0) list.push(text.deficit);
    if (snapshot.runwayMonths !== null && snapshot.runwayMonths < 3) list.push(text.lowRunway);
    if (snapshot.debtServiceRatio !== null && snapshot.debtServiceRatio > 0.35) list.push(text.highDebt);
    if (state.goals.some((goal) => goal.status === 'behind')) list.push(text.goalRisk);
    if (state.errors.length > 0 || snapshot.dataQuality.completeness < 1) list.push(text.incomplete);
    return list;
  }, [state.errors.length, state.goals, state.snapshot, text]);

  if (authLoading || state.loading) {
    return <aside className="sfm-economic-dashboard" dir={dir}><div className="sfm-economic-loading"><BrainCircuit size={18} />{text.loading}</div></aside>;
  }
  if (!state.snapshot || !state.forecast) return null;

  const snapshot = state.snapshot;
  const confidence = Math.round(snapshot.dataQuality.completeness * 100);
  const goalCounts = {
    onTrack: state.goals.filter((goal) => goal.status === 'on_track').length,
    behind: state.goals.filter((goal) => goal.status === 'behind').length,
    completed: state.goals.filter((goal) => goal.status === 'completed').length,
  };

  return (
    <aside className="sfm-economic-dashboard" dir={dir} aria-label={text.title}>
      <div className="sfm-economic-head">
        <div><span><BrainCircuit size={16} />Economic Intelligence</span><h2>{text.title}</h2><p>{text.subtitle}</p></div>
        <div className="sfm-economic-confidence"><Gauge size={16} /><span>{text.confidence}</span><strong>{confidence}%</strong></div>
      </div>

      <div className="sfm-economic-current" aria-label={text.current}>
        <Metric label={text.surplus} value={formatCurrency(snapshot.monthlySurplus, snapshot.currency, locale)} />
        <Metric label={text.runway} value={snapshot.runwayMonths === null ? '—' : `${snapshot.runwayMonths.toFixed(1)} ${text.months}`} />
        <Metric label={text.debt} value={snapshot.debtServiceRatio === null ? '—' : formatPercent(snapshot.debtServiceRatio, locale, { maximumFractionDigits: 1 })} />
        <Metric label={text.netWorth} value={formatCurrency(snapshot.netWorth, snapshot.currency, locale)} />
      </div>

      <div className="sfm-economic-body">
        <section>
          <div className="sfm-economic-section-title"><TrendingUp size={16} /><b>{text.scenarios}</b></div>
          <div className="sfm-economic-scenarios">
            {(['stress', 'base', 'optimistic'] as const).map((id) => {
              const scenario = state.forecast!.scenarios[id];
              const point = scenario.points.at(-1);
              const assumptions = scenario.assumptions;
              const pct = (value: number) => formatPercent(value, locale, { maximumFractionDigits: 1, signDisplay: 'always' });
              return <article key={id}><strong>{text[id]}</strong><span>{text.endLiquidity}: {point ? formatCurrency(point.liquidBalance, snapshot.currency, locale) : '—'}</span><span>{text.endNetWorth}: {point ? formatCurrency(point.netWorth, snapshot.currency, locale) : '—'}</span><small>{text.assumptions}: {text.incomeGrowth} {pct(assumptions.incomeGrowthMonthly)} · {text.expenseGrowth} {pct(assumptions.expenseGrowthMonthly)} · {text.investmentReturn} {pct(assumptions.investmentReturnMonthly)}</small></article>;
            })}
          </div>
          <p className="sfm-economic-simulation-note">{text.simulationNotice}</p>
        </section>

        <section>
          <div className="sfm-economic-section-title"><Target size={16} /><b>{text.goals}</b></div>
          <div className="sfm-economic-goals"><Metric label={text.onTrack} value={String(goalCounts.onTrack)} /><Metric label={text.behind} value={String(goalCounts.behind)} /><Metric label={text.completed} value={String(goalCounts.completed)} /></div>
        </section>

        <section>
          <div className="sfm-economic-section-title"><AlertTriangle size={16} /><b>{text.warnings}</b></div>
          {warnings.length > 0 ? <ul className="sfm-economic-warnings">{warnings.map((warning) => <li key={warning}><AlertTriangle size={14} />{warning}</li>)}</ul> : <div className="sfm-economic-clear"><ShieldCheck size={16} />{text.noWarnings}</div>}
        </section>
      </div>

      <style jsx>{`
        .sfm-economic-dashboard{display:grid;gap:16px;margin:0 auto 18px;max-width:1440px;padding:18px;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:var(--shadow-card);color:var(--foreground);font-family:var(--font-ui)}.sfm-economic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.sfm-economic-head>div:first-child>span{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.sfm-economic-head h2{margin:5px 0 4px;font-size:22px}.sfm-economic-head p{margin:0;color:var(--foreground-muted);line-height:1.6}.sfm-economic-confidence{display:grid;grid-template-columns:auto 1fr;gap:2px 7px;align-items:center;min-width:150px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.sfm-economic-confidence span{font-size:11px;color:var(--foreground-muted)}.sfm-economic-confidence strong{grid-column:2;font-family:var(--font-data);font-size:19px}.sfm-economic-current{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sfm-economic-metric{padding:12px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.sfm-economic-metric span{display:block;color:var(--foreground-muted);font-size:12px}.sfm-economic-metric strong{display:block;margin-top:5px;font-family:var(--font-data);font-size:17px;overflow-wrap:anywhere}.sfm-economic-body{display:grid;grid-template-columns:1.4fr .8fr 1fr;gap:12px}.sfm-economic-body section{min-width:0;padding-top:12px;border-top:1px solid var(--border)}.sfm-economic-section-title{display:flex;align-items:center;gap:7px;margin-bottom:9px}.sfm-economic-scenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.sfm-economic-scenarios article{display:grid;gap:5px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted)}.sfm-economic-scenarios span,.sfm-economic-scenarios small{color:var(--foreground-muted);font-size:11px;font-family:var(--font-data)}.sfm-economic-scenarios small{line-height:1.5}.sfm-economic-simulation-note{margin:8px 0 0;color:var(--foreground-muted);font-size:11px;line-height:1.6}.sfm-economic-goals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.sfm-economic-warnings{display:grid;gap:7px;margin:0;padding:0;list-style:none}.sfm-economic-warnings li,.sfm-economic-clear{display:flex;align-items:flex-start;gap:7px;padding:9px;border-radius:var(--radius-control);font-size:12px;line-height:1.5}.sfm-economic-warnings li{background:var(--warning-soft);color:var(--foreground)}.sfm-economic-clear{background:var(--success-soft);color:var(--success)}.sfm-economic-loading{display:flex;align-items:center;justify-content:center;gap:8px;min-height:80px;color:var(--foreground-muted)}@media(max-width:1050px){.sfm-economic-current{grid-template-columns:repeat(2,minmax(0,1fr))}.sfm-economic-body{grid-template-columns:1fr}}@media(max-width:680px){.sfm-economic-dashboard{margin-inline:0;padding:14px}.sfm-economic-head{display:grid}.sfm-economic-current,.sfm-economic-scenarios,.sfm-economic-goals{grid-template-columns:1fr}.sfm-economic-confidence{min-width:0}}
      `}</style>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="sfm-economic-metric"><span>{label}</span><strong>{value}</strong></div>;
}
