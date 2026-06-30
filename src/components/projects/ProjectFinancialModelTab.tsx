'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Bot, Download, Eye, Plus, Save, Trash2, WalletCards } from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { AppModal } from '@/components/ui/AppModal';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { normalizeDigits } from '@/lib/locale';

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
  totalCosts: number;
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
    totalProjectedRevenue: 'إجمالي الإيرادات المتوقعة',
    totalProjectedCosts: 'إجمالي التكاليف المتوقعة',
    projectedNetProfit: 'صافي الربح المتوقع',
    breakEvenPoint: 'نقطة التعادل',
    profitMargin: 'هامش الربح',
    cashFlowStatus: 'حالة التدفق النقدي',
    cashFlowPositive: 'مستقر',
    cashFlowNeedsReview: 'يحتاج مراجعة',
    noData: 'بيانات غير كافية',
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
    fixedCosts: 'التكاليف الثابتة',
    variableCosts: 'التكاليف المتغيرة',
    totalCosts: 'إجمالي التكاليف',
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
    base: 'واقعي',
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
    close: 'إغلاق',
    charts: 'الرسوم المالية',
    revenueVsCosts: 'الإيرادات مقابل التكاليف',
    cashOverTime: 'الرصيد النقدي عبر الوقت',
    revenueOverTime: 'الإيرادات عبر الوقت',
    costsOverTime: 'التكاليف عبر الوقت',
    netProfitOverTime: 'صافي الربح عبر الوقت',
    cashFlowTrend: 'التدفق النقدي',
    noChartData: 'لا توجد بيانات كافية لعرض الرسم البياني.',
    projectionsPreviewTitle: 'معاينة التوقعات المالية',
    projectionsPreviewSubtitle: 'عرض مختصر لأول أشهر المشروع. يمكنك فتح الجدول الكامل عند الحاجة.',
    showFullTable: 'عرض الجدول الكامل',
    fullTableTitle: 'الجدول الكامل للتوقعات المالية',
    exportPdf: 'تصدير PDF',
    previewCount: (shown: number, total: number) => `يعرض أول ${shown} أشهر من أصل ${total} شهر.`,
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    yearly: 'سنوي',
    realistic: 'واقعي',
    aiInsightTitle: 'رؤية مالية ذكية',
    aiInsightMissing: 'أضف الإيرادات والتكاليف لعرض تحليل مالي أدق.',
    insightBreakEven: (month: string) => `نقطة التعادل المتوقعة في الشهر ${month}.`,
    insightNoBreakEven: 'لم تظهر نقطة تعادل ضمن مدة التوقع الحالية.',
    insightProfitPositive: 'الربح المتوقع موجب بناءً على المدخلات الحالية.',
    insightProfitNegative: 'الربح المتوقع سالب ويحتاج مراجعة للإيرادات أو التكاليف.',
    insightLargestCost: (name: string) => `أكبر بند تكلفة: ${name}.`,
    insightCashPositive: 'التدفق النقدي النهائي مستقر بناءً على الرصيد المتوقع.',
    insightCashNeedsReview: 'التدفق النقدي النهائي يحتاج مراجعة لأنه ينتهي برصيد سلبي.',
    emptyForecastTitle: 'لا توجد توقعات مالية بعد.',
    emptyForecastBody: 'أضف الافتراضات والإيرادات والتكاليف لإنشاء التوقعات.',
    completeFinancialModel: 'إكمال النموذج المالي',
    actualVsPlanned: 'الفعلي مقابل المخطط',
    actualIncome: 'الدخل الفعلي',
    actualExpenses: 'المصروفات الفعلية',
    projectedRevenue: 'الإيرادات المتوقعة',
    projectedCosts: 'التكاليف المتوقعة',
    scenarioComparison: 'مقارنة السيناريوهات',
  },
  en: {
    financialModel: 'Financial Model',
    assumptions: 'Assumptions',
    revenueModel: 'Revenue Model',
    costModel: 'Cost Model',
    forecast: 'Forecast',
    totalProjectedRevenue: 'Total Projected Revenue',
    totalProjectedCosts: 'Total Projected Costs',
    projectedNetProfit: 'Projected Net Profit',
    breakEvenPoint: 'Break-even Point',
    profitMargin: 'Profit Margin',
    cashFlowStatus: 'Cash Flow Status',
    cashFlowPositive: 'Stable',
    cashFlowNeedsReview: 'Needs review',
    noData: 'Insufficient data',
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
    fixedCosts: 'Fixed costs',
    variableCosts: 'Variable costs',
    totalCosts: 'Total costs',
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
    base: 'Realistic',
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
    close: 'Close',
    charts: 'Financial Charts',
    revenueVsCosts: 'Revenue vs Costs',
    cashOverTime: 'Cash balance over time',
    revenueOverTime: 'Revenue over time',
    costsOverTime: 'Costs over time',
    netProfitOverTime: 'Net profit over time',
    cashFlowTrend: 'Cash flow trend',
    noChartData: 'There is not enough data to show this chart.',
    projectionsPreviewTitle: 'Financial projections preview',
    projectionsPreviewSubtitle: 'A compact view of the first project months. Open the full table when needed.',
    showFullTable: 'Show full table',
    fullTableTitle: 'Full financial projections table',
    exportPdf: 'Export PDF',
    previewCount: (shown: number, total: number) => `Showing the first ${shown} months out of ${total}.`,
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    realistic: 'Realistic',
    aiInsightTitle: 'Smart financial insight',
    aiInsightMissing: 'Add revenue and costs to show a more accurate financial analysis.',
    insightBreakEven: (month: string) => `Expected break-even is month ${month}.`,
    insightNoBreakEven: 'No break-even point appears within the current forecast period.',
    insightProfitPositive: 'Projected profit is positive based on the current inputs.',
    insightProfitNegative: 'Projected profit is negative and revenue or costs need review.',
    insightLargestCost: (name: string) => `Largest cost item: ${name}.`,
    insightCashPositive: 'Ending cash flow is stable based on the projected balance.',
    insightCashNeedsReview: 'Ending cash flow needs review because the projected balance is negative.',
    emptyForecastTitle: 'No financial projections yet.',
    emptyForecastBody: 'Add assumptions, revenue, and costs to generate projections.',
    completeFinancialModel: 'Complete financial model',
    actualVsPlanned: 'Actual vs planned',
    actualIncome: 'Actual income',
    actualExpenses: 'Actual expenses',
    projectedRevenue: 'Projected revenue',
    projectedCosts: 'Projected costs',
    scenarioComparison: 'Scenario comparison',
  },
  fr: {
    financialModel: 'Modèle financier',
    assumptions: 'Hypothèses',
    revenueModel: 'Modèle de revenus',
    costModel: 'Modèle de coûts',
    forecast: 'Prévisions financières',
    totalProjectedRevenue: 'Total des revenus projetés',
    totalProjectedCosts: 'Total des coûts projetés',
    projectedNetProfit: 'Bénéfice net projeté',
    breakEvenPoint: 'Point mort',
    profitMargin: 'Marge bénéficiaire',
    cashFlowStatus: 'État du flux de trésorerie',
    cashFlowPositive: 'Stable',
    cashFlowNeedsReview: 'À revoir',
    noData: 'Données insuffisantes',
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
    fixedCosts: 'Coûts fixes',
    variableCosts: 'Coûts variables',
    totalCosts: 'Total des coûts',
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
    base: 'Réaliste',
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
    close: 'Fermer',
    charts: 'Graphiques financiers',
    revenueVsCosts: 'Revenus vs coûts',
    cashOverTime: 'Solde de trésorerie dans le temps',
    revenueOverTime: 'Revenus dans le temps',
    costsOverTime: 'Coûts dans le temps',
    netProfitOverTime: 'Bénéfice net dans le temps',
    cashFlowTrend: 'Tendance du flux de trésorerie',
    noChartData: 'Données insuffisantes pour afficher le graphique.',
    projectionsPreviewTitle: 'Aperçu des prévisions financières',
    projectionsPreviewSubtitle: 'Vue compacte des premiers mois du projet. Ouvrez le tableau complet si nécessaire.',
    showFullTable: 'Afficher le tableau complet',
    fullTableTitle: 'Tableau complet des prévisions financières',
    exportPdf: 'Exporter PDF',
    previewCount: (shown: number, total: number) => `Affiche les ${shown} premiers mois sur ${total}.`,
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    yearly: 'Annuel',
    realistic: 'Réaliste',
    aiInsightTitle: 'Vision financière intelligente',
    aiInsightMissing: 'Ajoutez les revenus et les coûts pour afficher une analyse financière plus précise.',
    insightBreakEven: (month: string) => `Le point mort attendu est au mois ${month}.`,
    insightNoBreakEven: 'Aucun point mort n’apparaît dans la période de prévision actuelle.',
    insightProfitPositive: 'Le bénéfice projeté est positif selon les données actuelles.',
    insightProfitNegative: 'Le bénéfice projeté est négatif et les revenus ou coûts doivent être revus.',
    insightLargestCost: (name: string) => `Poste de coût le plus élevé : ${name}.`,
    insightCashPositive: 'Le flux de trésorerie final est stable selon le solde projeté.',
    insightCashNeedsReview: 'Le flux de trésorerie final doit être revu car le solde projeté est négatif.',
    emptyForecastTitle: 'Aucune prévision financière pour le moment.',
    emptyForecastBody: 'Ajoutez les hypothèses, revenus et coûts pour générer les prévisions.',
    completeFinancialModel: 'Compléter le modèle financier',
    actualVsPlanned: 'Réel vs planifié',
    actualIncome: 'Revenus réels',
    actualExpenses: 'Dépenses réelles',
    projectedRevenue: 'Revenus projetés',
    projectedCosts: 'Coûts projetés',
    scenarioComparison: 'Comparaison des scénarios',
  },
} as const;

type FinancialCopy = (typeof TEXT)[Lang];
type ProjectionViewMode = 'monthly' | 'quarterly' | 'yearly';

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
  const number = Number(normalizeDigits(value).replace(/[^\d.-]/g, ''));
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
  const totalCosts = forecast.reduce((sum, row) => sum + row.totalCosts, 0);
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
    totalCosts,
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
  actualIncome = 0,
  actualExpenses = 0,
  lang = 'ar',
}: {
  userId: string;
  projectId: string;
  initialCapital?: number;
  defaultCurrency?: string;
  actualIncome?: number;
  actualExpenses?: number;
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
  const [fullTableOpen, setFullTableOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProjectionViewMode>('monthly');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('base');

  const money = useCallback((amount: number) => formatMoney(Number.isFinite(amount) ? amount : 0, assumptions.currency || 'KWD', locale), [assumptions.currency, locale]);
  const pct = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}%`;
  }, [locale, t.na]);
  const monthValue = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value)}`;
  }, [locale, t.na]);

  const { forecast, kpis } = useMemo(() => calculateModel(assumptions, revenueStreams, costItems), [assumptions, revenueStreams, costItems]);
  const hasProjectionInput = useMemo(() => (
    revenueStreams.some(stream => toNum(stream.startingRevenue) > 0)
    || costItems.some(item => toNum(item.monthlyCost) > 0)
  ), [costItems, revenueStreams]);
  const hasProjectionData = hasProjectionInput && forecast.length > 0;
  const previewRows = useMemo(() => forecast.slice(0, 6), [forecast]);
  const finalCashBalance = forecast[forecast.length - 1]?.cashBalance ?? 0;
  const largestCostItem = useMemo(() => {
    return costItems
      .map(item => ({ name: item.name.trim() || t.costItem, amount: toNum(item.monthlyCost) }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [costItems, t.costItem]);
  const insightItems = useMemo(() => {
    if (!hasProjectionData) return [t.aiInsightMissing];
    return [
      kpis.breakEvenMonth ? t.insightBreakEven(monthValue(kpis.breakEvenMonth)) : t.insightNoBreakEven,
      kpis.totalProfit >= 0 ? t.insightProfitPositive : t.insightProfitNegative,
      largestCostItem ? t.insightLargestCost(largestCostItem.name) : '',
      finalCashBalance >= 0 ? t.insightCashPositive : t.insightCashNeedsReview,
    ].filter(Boolean);
  }, [finalCashBalance, hasProjectionData, kpis.breakEvenMonth, kpis.totalProfit, largestCostItem, monthValue, t]);
  const hasActuals = actualIncome > 0 || actualExpenses > 0;
  const actualIncomeRatio = kpis.totalRevenue > 0 && actualIncome > 0 ? (actualIncome / kpis.totalRevenue) * 100 : null;
  const actualExpenseRatio = kpis.totalCosts > 0 && actualExpenses > 0 ? (actualExpenses / kpis.totalCosts) * 100 : null;
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
    netProfit: Math.round(row.netProfit),
    cash: Math.round(row.cashBalance),
    cashFlow: Math.round(row.cumulativeCashFlow),
  })), [forecast]);

  useEffect(() => {
    let mounted = true;
    async function loadModel() {
      const { data, error } = await supabase
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

  useEffect(() => {
    if (!fullTableOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullTableOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullTableOpen]);

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
    const { data, error } = await supabase
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
        <MetricCard title={t.totalProjectedRevenue} value={hasProjectionData ? money(kpis.totalRevenue) : t.noData} />
        <MetricCard title={t.totalProjectedCosts} value={hasProjectionData ? money(kpis.totalCosts) : t.noData} />
        <MetricCard title={t.projectedNetProfit} value={hasProjectionData ? money(kpis.totalProfit) : t.noData} />
        <MetricCard title={t.breakEvenPoint} value={hasProjectionData ? monthValue(kpis.breakEvenMonth) : t.noData} />
        <MetricCard title={t.profitMargin} value={hasProjectionData ? pct(kpis.netMargin) : t.noData} />
        <MetricCard title={t.cashFlowStatus} value={hasProjectionData ? (finalCashBalance >= 0 ? t.cashFlowPositive : t.cashFlowNeedsReview) : t.noData} />
      </div>

      {notice ? <div className="financial-notice" role="status">{notice}</div> : null}

      {hasActuals ? (
        <div className="financial-actuals-grid" aria-label={t.actualVsPlanned}>
          <MetricCard title={t.actualIncome} value={money(actualIncome)} />
          <MetricCard title={t.actualExpenses} value={money(actualExpenses)} />
          <MetricCard title={`${t.projectedRevenue} / ${t.actualIncome}`} value={pct(actualIncomeRatio)} />
          <MetricCard title={`${t.projectedCosts} / ${t.actualExpenses}`} value={pct(actualExpenseRatio)} />
        </div>
      ) : null}

      <div className="financial-layout">
        <div className="financial-main">
          <article className="financial-card" id="financial-assumptions">
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
            <div className="chart-grid financial-chart-grid">
              <ChartBox title={t.revenueOverTime}>
                {hasProjectionData ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(29,140,255,.16)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" name={t.revenue} stroke="var(--sfm-primary)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart text={t.noChartData} />}
              </ChartBox>
              <ChartBox title={t.costsOverTime}>
                {hasProjectionData ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(29,140,255,.16)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                      <Tooltip />
                      <Line type="monotone" dataKey="costs" name={t.costs} stroke="#F59E0B" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart text={t.noChartData} />}
              </ChartBox>
              <ChartBox title={t.netProfitOverTime}>
                {hasProjectionData ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(29,140,255,.16)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                      <Tooltip />
                      <Line type="monotone" dataKey="netProfit" name={t.netProfit} stroke="#10B981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart text={t.noChartData} />}
              </ChartBox>
              <ChartBox title={t.cashFlowTrend}>
                {hasProjectionData ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="rgba(29,140,255,.16)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--sfm-muted)', fontSize: 12 }} width={46} />
                      <Tooltip />
                      <Line type="monotone" dataKey="cashFlow" name={t.cumulativeCashFlow} stroke="var(--sfm-accent)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart text={t.noChartData} />}
              </ChartBox>
            </div>
          </article>

          <article className="financial-card forecast-preview-card">
            <div className="forecast-preview-head">
              <div>
                <SectionTitle icon={<BarChart3 size={20} />} title={t.projectionsPreviewTitle} />
                <p>{t.projectionsPreviewSubtitle}</p>
              </div>
              <div className="projection-actions">
                <button type="button" className="projection-primary" onClick={() => setFullTableOpen(true)} disabled={!hasProjectionData} aria-label={t.showFullTable}>
                  <Eye size={16} />
                  {t.showFullTable}
                </button>
                <button type="button" className="projection-disabled" disabled aria-disabled="true">
                  <Download size={16} />
                  {t.exportExcel}
                  <span>{t.comingSoon}</span>
                </button>
                <button type="button" className="projection-disabled" disabled aria-disabled="true">
                  <Download size={16} />
                  {t.exportPdf}
                  <span>{t.comingSoon}</span>
                </button>
              </div>
            </div>
            <ViewToggleRow text={t} value={viewMode} onChange={setViewMode} />
            {hasProjectionData ? (
              <>
                <ProjectionTable rows={previewRows} text={t} money={money} variant="preview" />
                {forecast.length > previewRows.length ? <p className="forecast-preview-note">{t.previewCount(previewRows.length, forecast.length)}</p> : null}
              </>
            ) : (
              <EmptyForecastState text={t} onAction={() => document.getElementById('financial-assumptions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
            )}
          </article>

          <FinancialInsightCard text={t} insights={insightItems} />
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
            <div className="scenario-toggle-row" role="group" aria-label={t.scenarios}>
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  type="button"
                  aria-pressed={activeScenario === scenario.id}
                  className={activeScenario === scenario.id ? 'active' : ''}
                  onClick={() => setActiveScenario(scenario.id)}
                >
                  {t[scenario.id]}
                </button>
              ))}
            </div>
            <p className="scenario-note">{t.scenarioDisclaimer}</p>
            <div className="scenario-list">
              {scenarios.map(scenario => (
                <div className={`scenario-card ${scenario.risk} ${activeScenario === scenario.id ? 'active' : ''}`} key={scenario.id}>
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

      {fullTableOpen ? (
        <FullProjectionsModal
          rows={forecast}
          text={t}
          money={money}
          onClose={() => setFullTableOpen(false)}
        />
      ) : null}

      <style jsx global>{`
        .financial-model-tab{display:grid;gap:16px;min-width:0}
        .financial-summary-grid,.financial-actuals-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
        .financial-actuals-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
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
        .financial-empty-chart{min-height:220px;display:grid;place-items:center;text-align:center;border:1px dashed rgba(29,140,255,.22);border-radius:14px;color:var(--sfm-muted);font-weight:900;line-height:1.7;padding:18px}
        .forecast-preview-card{display:grid;gap:14px}
        .forecast-preview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .forecast-preview-head .section-title{margin-bottom:6px}
        .forecast-preview-head p,.forecast-preview-note{margin:0;color:var(--sfm-muted);font-weight:850;line-height:1.7}
        .projection-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;min-width:260px}
        .projection-actions button,.financial-modal-actions button{min-height:40px;border-radius:12px;border:1px solid rgba(29,140,255,.18);padding:0 12px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
        .projection-primary{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 12px 24px rgba(29,140,255,.18)}
        .projection-primary:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
        .projection-disabled{background:var(--sfm-light-card);color:var(--sfm-muted);cursor:not-allowed}
        .projection-disabled span{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:3px 8px;font-size:11px}
        .projection-view-toggle,.scenario-toggle-row{display:flex;flex-wrap:wrap;gap:8px}
        .projection-view-toggle button,.scenario-toggle-row button{min-height:36px;border:1px solid rgba(29,140,255,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 12px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .projection-view-toggle button.active,.scenario-toggle-row button.active{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border-color:transparent;box-shadow:0 10px 22px rgba(24,212,212,.18)}
        .projection-view-toggle button:disabled{cursor:not-allowed;opacity:.72}
        .projection-view-toggle button span{border-radius:999px;background:rgba(255,255,255,.20);padding:2px 7px;font-size:10px}
        .forecast-table-wrap{overflow:auto;border:1px solid rgba(29,140,255,.12);border-radius:16px;max-width:100%}
        .forecast-table-wrap.compact{max-height:420px}
        .forecast-table-wrap.full{max-height:min(62vh,680px)}
        .forecast-table{width:100%;min-width:980px;border-collapse:separate;border-spacing:0;background:var(--sfm-light-card)}
        .forecast-table th,.forecast-table td{padding:11px 12px;border-bottom:1px solid rgba(29,140,255,.1);text-align:start;white-space:nowrap;color:var(--sfm-midnight)}
        .forecast-table th{position:sticky;top:0;z-index:1;font-size:12px;color:var(--sfm-muted);background:rgba(29,140,255,.12);backdrop-filter:blur(8px)}
        .forecast-table tbody tr:hover td{background:rgba(29,140,255,.06)}
        .financial-empty-forecast{display:grid;gap:9px;place-items:center;text-align:center;border:1px dashed rgba(29,140,255,.26);border-radius:18px;background:var(--sfm-light-card);padding:28px;min-height:220px}
        .financial-empty-forecast strong{color:var(--sfm-midnight);font-size:18px}
        .financial-empty-forecast p{margin:0;color:var(--sfm-muted);line-height:1.8;font-weight:850}
        .financial-empty-forecast button{min-height:42px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:0 16px;font-family:inherit;font-weight:950;cursor:pointer}
        .financial-insight-card ul{display:grid;gap:10px;margin:0;padding:0;list-style:none}
        .financial-insight-card li{border:1px solid rgba(24,212,212,.18);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(24,212,212,.06));border-radius:14px;padding:12px;color:var(--sfm-primary-dark);font-weight:900;line-height:1.7}
        .side-metrics,.scenario-list,.financial-actions{display:grid;gap:10px}
        .scenario-note{margin:0 0 12px;color:var(--sfm-muted);line-height:1.7}
        .scenario-card{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:12px;display:grid;gap:7px}
        .scenario-card.active{border-color:rgba(24,212,212,.35);box-shadow:0 12px 26px rgba(24,212,212,.12)}
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
        .financial-modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(3,18,37,.58);backdrop-filter:blur(8px);display:grid;place-items:center;padding:24px}
        .financial-modal{width:min(1180px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:hidden;display:grid;gap:14px;background:var(--sfm-card);border:1px solid rgba(167,243,240,.22);border-radius:24px;padding:18px;box-shadow:0 28px 80px rgba(3,18,37,.30);color:var(--sfm-midnight)}
        .financial-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .financial-modal-head h2{margin:0;color:var(--sfm-midnight);font-size:22px}
        .financial-modal-head p{margin:6px 0 0;color:var(--sfm-muted);font-weight:850}
        .financial-modal-close{width:40px;height:40px;border:1px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-light-card);color:var(--sfm-midnight);display:grid;place-items:center;cursor:pointer}
        .financial-modal-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
        .dark .financial-card,.dark .financial-metric,.dark .financial-modal{background:var(--card);border-color:var(--border);box-shadow:0 16px 36px rgba(0,0,0,.22)}
        .dark .financial-metric,.dark .model-row,.dark .chart-box,.dark .forecast-table,.dark .financial-empty-chart,.dark .financial-empty-forecast,.dark .projection-disabled,.dark .disabled-financial-btn,.dark .financial-modal-close{background:var(--sfm-card-elevated, #0F335C)}
        .dark .section-title h2,.dark .section-header h2,.dark .financial-metric strong,.dark .row-heading strong,.dark .chart-box h3,.dark .forecast-table td,.dark .financial-empty-forecast strong,.dark .financial-modal-head h2,.dark .scenario-card strong,.dark .financial-insight-card li{color:var(--foreground)}
        .dark .forecast-table th{background:rgba(24,212,212,.14);color:var(--sfm-muted)}
        .dark .forecast-table tbody tr:hover td{background:rgba(24,212,212,.08)}
        @media(max-width:1280px){.financial-summary-grid,.financial-actuals-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.financial-layout{grid-template-columns:1fr}.financial-side{position:static}.chart-grid{grid-template-columns:1fr}}
        @media(max-width:760px){.financial-summary-grid,.financial-actuals-grid,.financial-form-grid,.model-row{grid-template-columns:1fr}.financial-card,.financial-metric{padding:16px}.section-header,.forecast-preview-head,.financial-modal-head{align-items:flex-start;flex-direction:column}.section-header button,.projection-actions,.projection-actions button,.financial-modal-actions,.financial-modal-actions button{width:100%;justify-content:center;min-width:0}.financial-modal-backdrop{align-items:end;padding:0}.financial-modal{width:100%;max-height:94vh;border-radius:24px 24px 0 0}.forecast-table{min-width:860px}}
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

function EmptyChart({ text }: { text: string }) {
  return <div className="financial-empty-chart" role="status">{text}</div>;
}

function ViewToggleRow({
  text,
  value,
  onChange,
}: {
  text: FinancialCopy;
  value: ProjectionViewMode;
  onChange: (value: ProjectionViewMode) => void;
}) {
  const options: Array<{ id: ProjectionViewMode; label: string; enabled: boolean }> = [
    { id: 'monthly', label: text.monthly, enabled: true },
    { id: 'quarterly', label: text.quarterly, enabled: false },
    { id: 'yearly', label: text.yearly, enabled: false },
  ];

  return (
    <div className="projection-view-toggle" role="group" aria-label={text.forecast}>
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          disabled={!option.enabled}
          className={value === option.id ? 'active' : ''}
          onClick={() => option.enabled && onChange(option.id)}
        >
          {option.label}
          {!option.enabled ? <span>{text.comingSoon}</span> : null}
        </button>
      ))}
    </div>
  );
}

function ProjectionTable({
  rows,
  text,
  money,
  variant = 'full',
}: {
  rows: ForecastRow[];
  text: FinancialCopy;
  money: (amount: number) => string;
  variant?: 'preview' | 'full';
}) {
  const showGrossProfit = variant === 'full';

  return (
    <div className={`forecast-table-wrap ${variant === 'preview' ? 'compact' : 'full'}`}>
      <table className="forecast-table">
        <caption className="sr-only">{variant === 'preview' ? text.projectionsPreviewTitle : text.fullTableTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{text.month}</th>
            <th scope="col">{text.revenue}</th>
            <th scope="col">{text.fixedCosts}</th>
            <th scope="col">{text.variableCosts}</th>
            <th scope="col">{text.totalCosts}</th>
            {showGrossProfit ? <th scope="col">{text.grossProfit}</th> : null}
            <th scope="col">{text.netProfit}</th>
            <th scope="col">{text.cashBalance}</th>
            <th scope="col">{text.cumulativeCashFlow}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.month}>
              <td>{row.month}</td>
              <td>{money(row.revenue)}</td>
              <td>{money(row.operatingExpenses)}</td>
              <td>{money(row.cogs)}</td>
              <td>{money(row.totalCosts)}</td>
              {showGrossProfit ? <td>{money(row.grossProfit)}</td> : null}
              <td>{money(row.netProfit)}</td>
              <td>{money(row.cashBalance)}</td>
              <td>{money(row.cumulativeCashFlow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyForecastState({ text, onAction }: { text: FinancialCopy; onAction: () => void }) {
  return (
    <div className="financial-empty-forecast" role="status">
      <strong>{text.emptyForecastTitle}</strong>
      <p>{text.emptyForecastBody}</p>
      <button type="button" onClick={onAction}>{text.completeFinancialModel}</button>
    </div>
  );
}

function FinancialInsightCard({ text, insights }: { text: FinancialCopy; insights: string[] }) {
  return (
    <article className="financial-card ai-card financial-insight-card">
      <SectionTitle icon={<Bot size={20} />} title={text.aiInsightTitle} />
      <ul>
        {insights.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
    </article>
  );
}

function FullProjectionsModal({
  rows,
  text,
  money,
  onClose,
}: {
  rows: ForecastRow[];
  text: FinancialCopy;
  money: (amount: number) => string;
  onClose: () => void;
}) {
  return (
    <AppModal
      open
      title={text.fullTableTitle}
      subtitle={text.previewCount(rows.length, rows.length)}
      closeLabel={text.close}
      onClose={onClose}
      size="xl"
      className="financial-modal"
      bodyClassName="financial-modal-body"
    >
      <div className="financial-modal-actions">
        <button type="button" className="projection-disabled" disabled aria-disabled="true">
          <Download size={16} />
          {text.exportExcel}
          <span>{text.comingSoon}</span>
        </button>
        <button type="button" className="projection-disabled" disabled aria-disabled="true">
          <Download size={16} />
          {text.exportPdf}
          <span>{text.comingSoon}</span>
        </button>
      </div>
      <ProjectionTable rows={rows} text={text} money={money} variant="full" />
    </AppModal>
  );
}

function GaugeIcon() {
  return <BarChart3 size={20} />;
}
