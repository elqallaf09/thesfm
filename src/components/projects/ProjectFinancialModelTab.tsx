'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Bot, Download, Plus, Save, Trash2, WalletCards } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type CostType = 'fixed' | 'variable' | 'one-time';
type ScenarioId = 'conservative' | 'base' | 'optimistic';

type Assumptions = {
  currency: string;
  forecastPeriod: string;
  initialCapital: string;
  openingCash: string;
  revenueGrowth: string;
  expenseGrowth: string;
  discountRate: string;
};

type RevenueStream = {
  id: string;
  name: string;
  startingRevenue: string;
  growthRate: string;
  grossMargin: string;
  notes: string;
};

type CostItem = {
  id: string;
  name: string;
  monthlyCost: string;
  type: CostType;
  growthRate: string;
  notes: string;
};

type ForecastRow = {
  month: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  totalCosts: number;
  netProfit: number;
  cashBalance: number;
  cumulativeCashFlow: number;
};

type Kpis = {
  roi: number | null;
  paybackPeriod: number | null;
  breakEvenMonth: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  burnRate: number | null;
  runway: number | null;
  totalRevenue: number;
  totalProfit: number;
};

type FinancialModelRow = {
  id: string;
  assumptions: Partial<Assumptions> | null;
  revenue_streams: RevenueStream[] | null;
  cost_items: CostItem[] | null;
};

type ScenarioResult = {
  id: ScenarioId;
  totalRevenue: number;
  totalProfit: number;
  breakEvenMonth: number | null;
  roi: number | null;
  risk: 'low' | 'medium' | 'high';
};

const TEXT = {
  ar: {
    financialModel: 'النموذج المالي',
    assumptions: 'الافتراضات',
    revenueModel: 'نموذج الإيرادات',
    costModel: 'نموذج التكاليف',
    forecast: 'التوقعات المالية',
    kpis: 'المؤشرات المالية',
    scenarios: 'السيناريوهات',
    currency: 'العملة',
    forecastPeriod: 'مدة التوقع',
    initialCapital: 'رأس المال الابتدائي',
    openingCash: 'الرصيد النقدي الابتدائي',
    revenueGrowth: 'معدل نمو الإيرادات الشهري %',
    expenseGrowth: 'معدل نمو المصاريف الشهري %',
    discountRate: 'معدل الخصم السنوي %',
    months12: '12 شهر',
    months24: '24 شهر',
    months36: '36 شهر',
    months60: '60 شهر',
    revenueStream: 'مصدر إيراد',
    addRevenueStream: '+ إضافة مصدر إيراد',
    streamName: 'اسم مصدر الإيراد',
    startingRevenue: 'الإيراد الشهري المبدئي',
    monthlyGrowth: 'النمو الشهري %',
    grossMarginInput: 'هامش الربح %',
    notes: 'ملاحظات',
    costItem: 'بند تكلفة',
    addCostItem: '+ إضافة بند تكلفة',
    costName: 'اسم التكلفة',
    monthlyCost: 'التكلفة الشهرية',
    costType: 'نوع التكلفة',
    fixedCost: 'تكلفة ثابتة',
    variableCost: 'تكلفة متغيرة',
    oneTimeCost: 'تكلفة لمرة واحدة',
    month: 'الشهر',
    revenue: 'الإيرادات',
    costs: 'التكاليف',
    cogs: 'COGS / التكاليف المتغيرة',
    grossProfit: 'مجمل الربح',
    operatingExpenses: 'المصاريف التشغيلية',
    netProfit: 'صافي الربح',
    cashBalance: 'الرصيد النقدي',
    cumulativeCashFlow: 'التدفق النقدي التراكمي',
    roi: 'العائد على الاستثمار ROI',
    paybackPeriod: 'فترة الاسترداد',
    breakEven: 'نقطة التعادل',
    grossMargin: 'هامش الربح الإجمالي',
    netMargin: 'هامش الربح الصافي',
    burnRate: 'معدل الحرق',
    runway: 'مدة التشغيل المتبقية',
    totalRevenue: 'إجمالي الإيرادات',
    totalProfit: 'إجمالي الربح',
    conservative: 'متحفظ',
    base: 'أساسي',
    optimistic: 'متفائل',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    scenarioDisclaimer: 'هذه السيناريوهات تقديرية لأغراض التخطيط وليست توقعات مضمونة.',
    saveFinancialModel: 'حفظ النموذج المالي',
    saved: 'تم حفظ النموذج المالي.',
    saveError: 'تعذر حفظ النموذج المالي حالياً.',
    exportExcel: 'تصدير Excel',
    comingSoon: 'قريباً',
    aiTitle: 'تحليل مالي بالذكاء الاصطناعي',
    aiBody: 'سيتم تفعيل تحليل النموذج المالي بالذكاء الاصطناعي في مرحلة لاحقة.',
    na: 'غير متاح',
    remove: 'حذف',
    charts: 'الرسوم المالية',
    revenueVsCosts: 'الإيرادات مقابل التكاليف',
    cashOverTime: 'الرصيد النقدي عبر الوقت',
    scenarioComparison: 'مقارنة السيناريوهات',
  },
  en: {
    financialModel: 'Financial Model',
    assumptions: 'Assumptions',
    revenueModel: 'Revenue Model',
    costModel: 'Cost Model',
    forecast: 'Forecast',
    kpis: 'KPIs',
    scenarios: 'Scenarios',
    currency: 'Currency',
    forecastPeriod: 'Forecast period',
    initialCapital: 'Initial capital',
    openingCash: 'Opening cash balance',
    revenueGrowth: 'Monthly revenue growth %',
    expenseGrowth: 'Monthly expense growth %',
    discountRate: 'Annual discount rate %',
    months12: '12 months',
    months24: '24 months',
    months36: '36 months',
    months60: '60 months',
    revenueStream: 'Revenue stream',
    addRevenueStream: '+ Add revenue stream',
    streamName: 'Revenue stream name',
    startingRevenue: 'Starting monthly revenue',
    monthlyGrowth: 'Monthly growth %',
    grossMarginInput: 'Gross margin %',
    notes: 'Notes',
    costItem: 'Cost item',
    addCostItem: '+ Add cost item',
    costName: 'Cost name',
    monthlyCost: 'Monthly cost',
    costType: 'Cost type',
    fixedCost: 'Fixed cost',
    variableCost: 'Variable cost',
    oneTimeCost: 'One-time cost',
    month: 'Month',
    revenue: 'Revenue',
    costs: 'Costs',
    cogs: 'COGS / variable costs',
    grossProfit: 'Gross profit',
    operatingExpenses: 'Operating expenses',
    netProfit: 'Net profit',
    cashBalance: 'Cash balance',
    cumulativeCashFlow: 'Cumulative cash flow',
    roi: 'ROI',
    paybackPeriod: 'Payback period',
    breakEven: 'Break-even',
    grossMargin: 'Gross margin',
    netMargin: 'Net margin',
    burnRate: 'Burn rate',
    runway: 'Runway',
    totalRevenue: 'Total revenue',
    totalProfit: 'Total profit',
    conservative: 'Conservative',
    base: 'Base',
    optimistic: 'Optimistic',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    scenarioDisclaimer: 'These scenarios are planning estimates and not guaranteed forecasts.',
    saveFinancialModel: 'Save Financial Model',
    saved: 'Financial model saved.',
    saveError: 'Could not save the financial model right now.',
    exportExcel: 'Export Excel',
    comingSoon: 'Coming soon',
    aiTitle: 'AI Financial Model Analysis',
    aiBody: 'AI analysis for the financial model will be enabled in a later phase.',
    na: 'N/A',
    remove: 'Remove',
    charts: 'Financial Charts',
    revenueVsCosts: 'Revenue vs Costs',
    cashOverTime: 'Cash balance over time',
    scenarioComparison: 'Scenario comparison',
  },
  fr: {
    financialModel: 'Modèle financier',
    assumptions: 'Hypothèses',
    revenueModel: 'Modèle de revenus',
    costModel: 'Modèle de coûts',
    forecast: 'Prévisions financières',
    kpis: 'Indicateurs financiers',
    scenarios: 'Scénarios',
    currency: 'Devise',
    forecastPeriod: 'Période de prévision',
    initialCapital: 'Capital initial',
    openingCash: 'Solde de trésorerie initial',
    revenueGrowth: 'Croissance mensuelle des revenus %',
    expenseGrowth: 'Croissance mensuelle des dépenses %',
    discountRate: 'Taux d’actualisation annuel %',
    months12: '12 mois',
    months24: '24 mois',
    months36: '36 mois',
    months60: '60 mois',
    revenueStream: 'Source de revenus',
    addRevenueStream: '+ Ajouter une source de revenus',
    streamName: 'Nom de la source de revenus',
    startingRevenue: 'Revenu mensuel initial',
    monthlyGrowth: 'Croissance mensuelle %',
    grossMarginInput: 'Marge brute %',
    notes: 'Notes',
    costItem: 'Poste de coût',
    addCostItem: '+ Ajouter un poste de coût',
    costName: 'Nom du coût',
    monthlyCost: 'Coût mensuel',
    costType: 'Type de coût',
    fixedCost: 'Coût fixe',
    variableCost: 'Coût variable',
    oneTimeCost: 'Coût ponctuel',
    month: 'Mois',
    revenue: 'Revenus',
    costs: 'Coûts',
    cogs: 'COGS / coûts variables',
    grossProfit: 'Marge brute',
    operatingExpenses: 'Dépenses opérationnelles',
    netProfit: 'Bénéfice net',
    cashBalance: 'Solde de trésorerie',
    cumulativeCashFlow: 'Flux de trésorerie cumulé',
    roi: 'ROI',
    paybackPeriod: 'Période de récupération',
    breakEven: 'Point mort',
    grossMargin: 'Marge brute',
    netMargin: 'Marge nette',
    burnRate: 'Taux de consommation',
    runway: 'Autonomie',
    totalRevenue: 'Total des revenus',
    totalProfit: 'Bénéfice total',
    conservative: 'Prudent',
    base: 'Base',
    optimistic: 'Optimiste',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    scenarioDisclaimer: 'Ces scénarios sont des estimations de planification, pas des prévisions garanties.',
    saveFinancialModel: 'Enregistrer le modèle financier',
    saved: 'Modèle financier enregistré.',
    saveError: 'Impossible d’enregistrer le modèle financier pour le moment.',
    exportExcel: 'Exporter Excel',
    comingSoon: 'Bientôt',
    aiTitle: 'Analyse IA du modèle financier',
    aiBody: 'L’analyse IA du modèle financier sera activée dans une phase ultérieure.',
    na: 'N/A',
    remove: 'Supprimer',
    charts: 'Graphiques financiers',
    revenueVsCosts: 'Revenus vs coûts',
    cashOverTime: 'Solde de trésorerie dans le temps',
    scenarioComparison: 'Comparaison des scénarios',
  },
} as const;

const periodOptions = [
  { value: '12', key: 'months12' },
  { value: '24', key: 'months24' },
  { value: '36', key: 'months36' },
  { value: '60', key: 'months60' },
] as const;

const scenarioConfig: Record<ScenarioId, { revenueMultiplier: number; costMultiplier: number }> = {
  conservative: { revenueMultiplier: 0.8, costMultiplier: 1.15 },
  base: { revenueMultiplier: 1, costMultiplier: 1 },
  optimistic: { revenueMultiplier: 1.2, costMultiplier: 0.95 },
};

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNum(value: unknown) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function defaultRevenueStream(): RevenueStream {
  return { id: makeId('revenue'), name: '', startingRevenue: '', growthRate: '', grossMargin: '60', notes: '' };
}

function defaultCostItem(): CostItem {
  return { id: makeId('cost'), name: '', monthlyCost: '', type: 'fixed', growthRate: '', notes: '' };
}

function calculateModel(
  assumptions: Assumptions,
  revenueStreams: RevenueStream[],
  costItems: CostItem[],
  scenario: { revenueMultiplier: number; costMultiplier: number } = scenarioConfig.base,
) {
  const months = Math.max(1, Math.min(60, toNum(assumptions.forecastPeriod) || 36));
  const initialCapital = toNum(assumptions.initialCapital);
  const openingCash = toNum(assumptions.openingCash);
  const baseRevenueGrowth = toNum(assumptions.revenueGrowth) / 100;
  const baseExpenseGrowth = toNum(assumptions.expenseGrowth) / 100;
  let cashBalance = openingCash;
  let cumulativeProfit = 0;
  const forecast: ForecastRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    const revenueData = revenueStreams.reduce((totals, stream) => {
      const startingRevenue = toNum(stream.startingRevenue) * scenario.revenueMultiplier;
      const growth = baseRevenueGrowth + toNum(stream.growthRate) / 100;
      const revenue = startingRevenue * Math.pow(Math.max(0, 1 + growth), month - 1);
      const grossMargin = Math.max(0, Math.min(100, toNum(stream.grossMargin) || 0)) / 100;
      return {
        revenue: totals.revenue + revenue,
        cogs: totals.cogs + revenue * (1 - grossMargin),
      };
    }, { revenue: 0, cogs: 0 });

    const costData = costItems.reduce((totals, item) => {
      const startingCost = toNum(item.monthlyCost) * scenario.costMultiplier;
      const growth = baseExpenseGrowth + toNum(item.growthRate) / 100;
      const cost = item.type === 'one-time'
        ? month === 1 ? startingCost : 0
        : startingCost * Math.pow(Math.max(0, 1 + growth), month - 1);
      if (item.type === 'variable') return { variable: totals.variable + cost, operating: totals.operating };
      return { variable: totals.variable, operating: totals.operating + cost };
    }, { variable: 0, operating: 0 });

    const variableCosts = revenueData.cogs + costData.variable;
    const grossProfit = revenueData.revenue - variableCosts;
    const totalCosts = variableCosts + costData.operating;
    const netProfit = revenueData.revenue - totalCosts;
    cashBalance += netProfit;
    cumulativeProfit += netProfit;

    forecast.push({
      month,
      revenue: revenueData.revenue,
      cogs: variableCosts,
      grossProfit,
      operatingExpenses: costData.operating,
      totalCosts,
      netProfit,
      cashBalance,
      cumulativeCashFlow: cumulativeProfit - initialCapital,
    });
  }

  const totalRevenue = forecast.reduce((sum, row) => sum + row.revenue, 0);
  const totalProfit = forecast.reduce((sum, row) => sum + row.netProfit, 0);
  const totalGrossProfit = forecast.reduce((sum, row) => sum + row.grossProfit, 0);
  const negativeMonths = forecast.filter(row => row.netProfit < 0);
  const burnRate = negativeMonths.length
    ? Math.abs(negativeMonths.reduce((sum, row) => sum + row.netProfit, 0) / negativeMonths.length)
    : null;
  const kpis: Kpis = {
    roi: initialCapital > 0 ? (totalProfit / initialCapital) * 100 : null,
    paybackPeriod: forecast.find(row => row.cumulativeCashFlow >= 0)?.month ?? null,
    breakEvenMonth: forecast.find(row => row.netProfit >= 0)?.month ?? null,
    grossMargin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : null,
    netMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null,
    burnRate,
    runway: burnRate && burnRate > 0 ? openingCash / burnRate : null,
    totalRevenue,
    totalProfit,
  };
  return { forecast, kpis };
}

function scenarioRisk(kpis: Kpis, period: number): 'low' | 'medium' | 'high' {
  if ((kpis.roi ?? -1) < 0) return 'high';
  if (!kpis.paybackPeriod || kpis.paybackPeriod > period) return 'medium';
  if (kpis.paybackPeriod > Math.ceil(period * 0.75)) return 'medium';
  return 'low';
}

export function ProjectFinancialModelTab({
  userId,
  projectId,
  initialCapital = 0,
  defaultCurrency = 'KWD',
  lang = 'ar',
}: {
  userId: string;
  projectId: string;
  initialCapital?: number;
  defaultCurrency?: string;
  lang?: string;
}) {
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const t = TEXT[locale];
  const [modelId, setModelId] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions>({
    currency: defaultCurrency || 'KWD',
    forecastPeriod: '36',
    initialCapital: initialCapital > 0 ? String(initialCapital) : '',
    openingCash: initialCapital > 0 ? String(initialCapital) : '',
    revenueGrowth: '0',
    expenseGrowth: '0',
    discountRate: '10',
  });
  const [revenueStreams, setRevenueStreams] = useState<RevenueStream[]>(() => [defaultRevenueStream()]);
  const [costItems, setCostItems] = useState<CostItem[]>(() => [defaultCostItem()]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const money = useCallback((amount: number) => formatMoney(Number.isFinite(amount) ? amount : 0, assumptions.currency || 'KWD', locale), [assumptions.currency, locale]);
  const pct = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}%`;
  }, [locale, t.na]);
  const monthValue = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value)}`;
  }, [locale, t.na]);

  const { forecast, kpis } = useMemo(() => calculateModel(assumptions, revenueStreams, costItems), [assumptions, revenueStreams, costItems]);
  const period = toNum(assumptions.forecastPeriod) || 36;
  const scenarios = useMemo<ScenarioResult[]>(() => {
    return (Object.keys(scenarioConfig) as ScenarioId[]).map(id => {
      const result = calculateModel(assumptions, revenueStreams, costItems, scenarioConfig[id]);
      return {
        id,
        totalRevenue: result.kpis.totalRevenue,
        totalProfit: result.kpis.totalProfit,
        breakEvenMonth: result.kpis.breakEvenMonth,
        roi: result.kpis.roi,
        risk: scenarioRisk(result.kpis, period),
      };
    });
  }, [assumptions, costItems, period, revenueStreams]);

  const chartData = useMemo(() => forecast.map(row => ({
    month: row.month,
    revenue: Math.round(row.revenue),
    costs: Math.round(row.totalCosts),
    cash: Math.round(row.cashBalance),
  })), [forecast]);

  useEffect(() => {
    let mounted = true;
    async function loadModel() {
      const { data, error } = await (supabase as any)
        .from('project_financial_models')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .maybeSingle();
      if (!mounted || error || !data) return;
      const row = data as FinancialModelRow;
      setModelId(row.id);
      setAssumptions(current => ({ ...current, ...(row.assumptions ?? {}) }));
      setRevenueStreams(row.revenue_streams?.length ? row.revenue_streams : [defaultRevenueStream()]);
      setCostItems(row.cost_items?.length ? row.cost_items : [defaultCostItem()]);
    }
    loadModel();
    return () => { mounted = false; };
  }, [projectId, userId]);

  const updateAssumption = (field: keyof Assumptions, value: string) => {
    setNotice('');
    setAssumptions(prev => ({ ...prev, [field]: value }));
  };

  const updateRevenue = (id: string, field: keyof RevenueStream, value: string) => {
    setNotice('');
    setRevenueStreams(prev => prev.map(stream => stream.id === id ? { ...stream, [field]: value } : stream));
  };

  const updateCost = (id: string, field: keyof CostItem, value: string) => {
    setNotice('');
    setCostItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const saveModel = async () => {
    setSaving(true);
    setNotice('');
    const payload = {
      id: modelId ?? undefined,
      user_id: userId,
      project_id: projectId,
      assumptions,
      revenue_streams: revenueStreams,
      cost_items: costItems,
      scenarios,
      forecast,
      kpis,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase as any)
      .from('project_financial_models')
      .upsert(payload, { onConflict: 'user_id,project_id' })
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setModelId(data?.id ?? modelId);
    setNotice(t.saved);
  };

  return (
    <section className="financial-model-tab" role="tabpanel" aria-label={t.financialModel}>
      <div className="financial-summary-grid">
        <MetricCard title={t.totalRevenue} value={money(kpis.totalRevenue)} />
        <MetricCard title={t.totalProfit} value={money(kpis.totalProfit)} />
        <MetricCard title={t.roi} value={pct(kpis.roi)} />
        <MetricCard title={t.paybackPeriod} value={monthValue(kpis.paybackPeriod)} />
        <MetricCard title={t.breakEven} value={monthValue(kpis.breakEvenMonth)} />
        <MetricCard title={t.runway} value={monthValue(kpis.runway)} />
      </div>

      {notice ? <div className="financial-notice" role="status">{notice}</div> : null}

      <div className="financial-layout">
        <div className="financial-main">
          <article className="financial-card">
            <SectionTitle icon={<WalletCards size={20} />} title={t.assumptions} />
            <div className="financial-form-grid">
              <CurrencySelect value={assumptions.currency} onChange={code => updateAssumption('currency', code)} lang={locale} label={t.currency} ariaLabel={t.currency} />
              <label className="financial-field" htmlFor="financial-period">
                <span>{t.forecastPeriod}</span>
                <select id="financial-period" value={assumptions.forecastPeriod} onChange={event => updateAssumption('forecastPeriod', event.target.value)}>
                  {periodOptions.map(option => <option key={option.value} value={option.value}>{t[option.key]}</option>)}
                </select>
              </label>
              <NumberField id="financial-initial-capital" label={t.initialCapital} value={assumptions.initialCapital} onChange={value => updateAssumption('initialCapital', value)} />
              <NumberField id="financial-opening-cash" label={t.openingCash} value={assumptions.openingCash} onChange={value => updateAssumption('openingCash', value)} />
              <NumberField id="financial-revenue-growth" label={t.revenueGrowth} value={assumptions.revenueGrowth} onChange={value => updateAssumption('revenueGrowth', value)} />
              <NumberField id="financial-expense-growth" label={t.expenseGrowth} value={assumptions.expenseGrowth} onChange={value => updateAssumption('expenseGrowth', value)} />
              <NumberField id="financial-discount-rate" label={t.discountRate} value={assumptions.discountRate} onChange={value => updateAssumption('discountRate', value)} />
            </div>
          </article>

          <article className="financial-card">
            <SectionHeader title={t.revenueModel} actionLabel={t.addRevenueStream} onAction={() => setRevenueStreams(prev => [...prev, defaultRevenueStream()])} />
            <div className="model-row-list">
              {revenueStreams.map((stream, index) => (
                <div className="model-row" key={stream.id}>
                  <div className="row-heading">
                    <strong>{stream.name || `${t.revenueStream} ${index + 1}`}</strong>
                    <button type="button" aria-label={t.remove} onClick={() => setRevenueStreams(prev => prev.length > 1 ? prev.filter(item => item.id !== stream.id) : prev)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <TextField id={`${stream.id}-name`} label={t.streamName} value={stream.name} onChange={value => updateRevenue(stream.id, 'name', value)} />
                  <NumberField id={`${stream.id}-revenue`} label={t.startingRevenue} value={stream.startingRevenue} onChange={value => updateRevenue(stream.id, 'startingRevenue', value)} />
                  <NumberField id={`${stream.id}-growth`} label={t.monthlyGrowth} value={stream.growthRate} onChange={value => updateRevenue(stream.id, 'growthRate', value)} />
                  <NumberField id={`${stream.id}-margin`} label={t.grossMarginInput} value={stream.grossMargin} onChange={value => updateRevenue(stream.id, 'grossMargin', value)} />
                  <TextField id={`${stream.id}-notes`} label={t.notes} value={stream.notes} multiline onChange={value => updateRevenue(stream.id, 'notes', value)} />
                </div>
              ))}
            </div>
          </article>

          <article className="financial-card">
            <SectionHeader title={t.costModel} actionLabel={t.addCostItem} onAction={() => setCostItems(prev => [...prev, defaultCostItem()])} />
            <div className="model-row-list">
              {costItems.map((item, index) => (
                <div className="model-row" key={item.id}>
                  <div className="row-heading">
                    <strong>{item.name || `${t.costItem} ${index + 1}`}</strong>
                    <button type="button" aria-label={t.remove} onClick={() => setCostItems(prev => prev.length > 1 ? prev.filter(cost => cost.id !== item.id) : prev)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <TextField id={`${item.id}-name`} label={t.costName} value={item.name} onChange={value => updateCost(item.id, 'name', value)} />
                  <NumberField id={`${item.id}-cost`} label={t.monthlyCost} value={item.monthlyCost} onChange={value => updateCost(item.id, 'monthlyCost', value)} />
                  <label className="financial-field" htmlFor={`${item.id}-type`}>
                    <span>{t.costType}</span>
                    <select id={`${item.id}-type`} value={item.type} onChange={event => updateCost(item.id, 'type', event.target.value as CostType)}>
                      <option value="fixed">{t.fixedCost}</option>
                      <option value="variable">{t.variableCost}</option>
                      <option value="one-time">{t.oneTimeCost}</option>
                    </select>
                  </label>
                  <NumberField id={`${item.id}-growth`} label={t.monthlyGrowth} value={item.growthRate} onChange={value => updateCost(item.id, 'growthRate', value)} />
                  <TextField id={`${item.id}-notes`} label={t.notes} value={item.notes} multiline onChange={value => updateCost(item.id, 'notes', value)} />
                </div>
              ))}
            </div>
          </article>

          <article className="financial-card">
            <SectionTitle icon={<BarChart3 size={20} />} title={t.charts} />
            <div className="chart-grid">
              <ChartBox title={t.revenueVsCosts}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(29,140,255,.16)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name={t.revenue} stroke="var(--sfm-primary)" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="costs" name={t.costs} stroke="#7A3E1D" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
              <ChartBox title={t.cashOverTime}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(29,140,255,.16)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                    <Tooltip />
                    <Line type="monotone" dataKey="cash" name={t.cashBalance} stroke="#1F7A4D" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            </div>
          </article>

          <article className="financial-card">
            <SectionTitle icon={<BarChart3 size={20} />} title={t.forecast} />
            <div className="forecast-table-wrap">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>{t.month}</th>
                    <th>{t.revenue}</th>
                    <th>{t.cogs}</th>
                    <th>{t.grossProfit}</th>
                    <th>{t.operatingExpenses}</th>
                    <th>{t.netProfit}</th>
                    <th>{t.cashBalance}</th>
                    <th>{t.cumulativeCashFlow}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map(row => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{money(row.cogs)}</td>
                      <td>{money(row.grossProfit)}</td>
                      <td>{money(row.operatingExpenses)}</td>
                      <td>{money(row.netProfit)}</td>
                      <td>{money(row.cashBalance)}</td>
                      <td>{money(row.cumulativeCashFlow)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="financial-side">
          <article className="financial-card">
            <SectionTitle icon={<GaugeIcon />} title={t.kpis} />
            <div className="side-metrics">
              <MetricCard title={t.grossMargin} value={pct(kpis.grossMargin)} />
              <MetricCard title={t.netMargin} value={pct(kpis.netMargin)} />
              <MetricCard title={t.burnRate} value={kpis.burnRate === null ? t.na : money(kpis.burnRate)} />
              <MetricCard title={t.runway} value={monthValue(kpis.runway)} />
            </div>
          </article>

          <article className="financial-card">
            <SectionTitle icon={<BarChart3 size={20} />} title={t.scenarios} />
            <p className="scenario-note">{t.scenarioDisclaimer}</p>
            <div className="scenario-list">
              {scenarios.map(scenario => (
                <div className={`scenario-card ${scenario.risk}`} key={scenario.id}>
                  <div>
                    <strong>{t[scenario.id]}</strong>
                    <span>{t[scenario.risk]}</span>
                  </div>
                  <small>{t.totalRevenue}: {money(scenario.totalRevenue)}</small>
                  <small>{t.totalProfit}: {money(scenario.totalProfit)}</small>
                  <small>{t.breakEven}: {monthValue(scenario.breakEvenMonth)}</small>
                  <small>{t.roi}: {pct(scenario.roi)}</small>
                </div>
              ))}
            </div>
            <ChartBox title={t.scenarioComparison}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={scenarios.map(item => ({ name: t[item.id], profit: Math.round(item.totalProfit), revenue: Math.round(item.totalRevenue) }))}>
                  <CartesianGrid stroke="rgba(29,140,255,.16)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--sfm-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 11 }} width={42} />
                  <Tooltip />
                  <Bar dataKey="profit" name={t.totalProfit} fill="var(--sfm-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          </article>

          <article className="financial-card ai-card">
            <SectionTitle icon={<Bot size={20} />} title={t.aiTitle} />
            <p>{t.aiBody}</p>
          </article>

          <article className="financial-card financial-actions">
            <button type="button" className="primary-financial-btn" onClick={saveModel} disabled={saving} aria-label={t.saveFinancialModel}>
              <Save size={16} />
              {t.saveFinancialModel}
            </button>
            <button type="button" className="disabled-financial-btn" disabled aria-disabled="true">
              <Download size={16} />
              {t.exportExcel}
              <span>{t.comingSoon}</span>
            </button>
          </article>
        </aside>
      </div>

      <style jsx global>{`
        .financial-model-tab{display:grid;gap:16px;min-width:0}
        .financial-summary-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
        .financial-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,.9fr);gap:16px;align-items:start}
        .financial-main,.financial-side{display:grid;gap:16px;min-width:0}
        .financial-side{position:sticky;top:16px}
        .financial-card,.financial-metric{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}
        .financial-metric{background:var(--sfm-light-card)}
        .financial-metric small{display:block;color:var(--sfm-muted);font-weight:900}
        .financial-metric strong{display:block;margin-top:6px;color:var(--sfm-primary-dark);font-size:18px;overflow-wrap:anywhere}
        .section-title,.section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
        .section-title h2,.section-header h2{margin:0;color:var(--sfm-midnight);font-size:19px}
        .section-title svg{color:var(--sfm-primary)}
        .section-header button{min-height:40px;border:1px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 12px;font-family:inherit;font-weight:900;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .financial-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .financial-field{display:grid;gap:7px;min-width:0}
        .financial-field span{font-weight:900;color:var(--sfm-muted)}
        .financial-field input,.financial-field select,.financial-field textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}
        .financial-field textarea{resize:vertical;line-height:1.6}
        .financial-field input:focus,.financial-field select:focus,.financial-field textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15)}
        .model-row-list{display:grid;gap:12px}
        .model-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;border:1px solid rgba(29,140,255,.12);border-radius:16px;background:var(--sfm-light-card);padding:14px;min-width:0}
        .row-heading{grid-column:1 / -1;display:flex;justify-content:space-between;align-items:center;gap:12px}
        .row-heading strong{color:var(--sfm-midnight)}
        .row-heading button{width:36px;height:36px;border:1px solid rgba(121,31,31,.18);border-radius:11px;background:#FEF2F2;color:#B91C1C;display:grid;place-items:center;cursor:pointer}
        .chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .chart-box{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:12px;min-width:0}
        .chart-box h3{margin:0 0 10px;color:var(--sfm-midnight);font-size:15px}
        .forecast-table-wrap{overflow-x:auto;border:1px solid rgba(29,140,255,.12);border-radius:16px}
        .forecast-table{width:100%;min-width:980px;border-collapse:collapse;background:var(--sfm-light-card)}
        .forecast-table th,.forecast-table td{padding:11px 12px;border-bottom:1px solid rgba(29,140,255,.1);text-align:start;white-space:nowrap;color:var(--sfm-midnight)}
        .forecast-table th{font-size:12px;color:var(--sfm-muted);background:rgba(29,140,255,.10)}
        .side-metrics,.scenario-list,.financial-actions{display:grid;gap:10px}
        .scenario-note{margin:0 0 12px;color:var(--sfm-muted);line-height:1.7}
        .scenario-card{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:12px;display:grid;gap:7px}
        .scenario-card div{display:flex;justify-content:space-between;gap:10px;align-items:center}
        .scenario-card strong{color:var(--sfm-midnight)}.scenario-card small{color:var(--sfm-muted);font-weight:800}
        .scenario-card span{border-radius:999px;padding:4px 9px;font-size:11px;font-weight:950}
        .scenario-card.low span{background:#ECFDF5;color:#047857}.scenario-card.medium span{background:#FFF7ED;color:#B45309}.scenario-card.high span{background:#FEF2F2;color:#B91C1C}
        .ai-card p{margin:0;color:var(--sfm-muted);line-height:1.7}
        .financial-actions button{min-height:44px;border-radius:13px;border:1px solid rgba(29,140,255,.18);font-family:inherit;font-weight:950;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
        .primary-financial-btn{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}
        .primary-financial-btn:disabled{opacity:.68;cursor:not-allowed}
        .disabled-financial-btn{background:var(--sfm-light-card);color:var(--sfm-muted);cursor:not-allowed}
        .disabled-financial-btn span{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:3px 8px;font-size:11px}
        .financial-notice{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:15px;padding:12px 14px;font-weight:900}
        @media(max-width:1280px){.financial-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.financial-layout{grid-template-columns:1fr}.financial-side{position:static}.chart-grid{grid-template-columns:1fr}}
        @media(max-width:760px){.financial-summary-grid,.financial-form-grid,.model-row{grid-template-columns:1fr}.financial-card,.financial-metric{padding:16px}.section-header{align-items:flex-start;flex-direction:column}.section-header button{width:100%;justify-content:center}}
      `}</style>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="section-title"><h2>{title}</h2>{icon}</div>;
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <button type="button" onClick={onAction} aria-label={actionLabel}><Plus size={15} />{actionLabel}</button>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return <div className="financial-metric"><small>{title}</small><strong>{value}</strong></div>;
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="financial-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" step="0.01" value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function TextField({ id, label, value, multiline = false, onChange }: { id: string; label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="financial-field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea id={id} rows={2} value={value} onChange={event => onChange(event.target.value)} />
      ) : (
        <input id={id} type="text" value={value} onChange={event => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="chart-box"><h3>{title}</h3>{children}</div>;
}

function GaugeIcon() {
  return <BarChart3 size={20} />;
}
