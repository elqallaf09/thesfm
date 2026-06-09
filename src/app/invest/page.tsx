'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BarChart3, Brain, Layers3, LineChart as LineChartIcon, PieChart as PieChartIcon, Plus, ShieldAlert, TrendingUp, WalletCards } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { InvestmentFormModal } from '@/components/invest/InvestmentFormModal';
import { InvestmentList } from '@/components/invest/InvestmentList';
import { InvestmentRow, type InvestmentPriceRefreshStatus } from '@/components/invest/InvestmentRow';
import { InvestmentDetailDrawer } from '@/components/invest/InvestmentDetailDrawer';
import { ConfirmDeleteModal } from '@/components/invest/ConfirmDeleteModal';
import { EmptyState } from '@/components/invest/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import { formatMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import type { MoneyParseStatus } from '@/lib/money';
import { calculateInvestmentHoldingMetrics } from '@/lib/investmentCalculations';
import { investmentSymbol, marketAnalysisUrl } from '@/lib/data/investmentData';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

const InvestPerformanceCharts = dynamic(() => import('@/components/invest/InvestPerformanceCharts'), {
  ssr: false,
  loading: () => (
    <section className="invest-chart-grid" aria-hidden="true">
      <div className="invest-panel invest-chart-card invest-chart-skeleton" />
      <div className="invest-panel invest-chart-card invest-chart-skeleton" />
      <div className="invest-panel invest-chart-card invest-chart-skeleton" />
    </section>
  ),
});

const TYPES: InvestmentType[] = ['stocks', 'fund', 'crypto', 'gold', 'silver', 'realEstate', 'cash', 'project', 'other'];
const RISKS: RiskLevel[] = ['low', 'medium', 'high'];
const CHART_COLORS = ['#1D8CFF', '#18D4D4', '#10B981', '#F59E0B', '#6366F1', '#0B3A66', '#14B8A6', '#94A3B8'];
const RISK_SCORE: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
type InvestTab = 'portfolio' | 'assets' | 'performance' | 'risk' | 'reports';

function calculateMonthlyContributionProjection(years: number, monthlyContribution: number, annualReturn: number) {
  const safeYears = Math.max(0, years);
  const months = safeYears * 12;
  const contribution = Number.isFinite(monthlyContribution) ? Math.max(0, monthlyContribution) : 0;
  const returnRate = Number.isFinite(annualReturn) ? annualReturn : 0;
  const monthlyReturn = returnRate / 12 / 100;
  let balance = 0;

  for (let month = 0; month < months; month += 1) {
    balance += contribution;
    balance *= 1 + monthlyReturn;
  }

  const contribTotal = contribution * months;
  return {
    years,
    value: balance,
    contribTotal,
    gain: balance - contribTotal,
  };
}

function formatInvestmentType(type: string | null | undefined, t: (key: any) => string) {
  const fallback = t('investment_type_investment') || 'استثمار';
  if (!type) return fallback;

  const normalized = String(type)
    .replace(/^invest_types_/, '')
    .replace(/^investment_type_/, '')
    .trim();

  const aliases: Record<string, string> = {
    stocks: 'stock',
    stock: 'stock',
    realEstate: 'real_estate',
    real_estate: 'real_estate',
    crypto: 'crypto',
    gold: 'gold',
    silver: 'silver',
    bonds: 'bonds',
    bond: 'bonds',
    fund: 'fund',
    funds: 'fund',
    investment: 'investment',
  };
  const key = `investment_type_${aliases[normalized] || normalized}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;

  const legacyKey = `invest_types_${normalized}`;
  const legacyTranslated = t(legacyKey);
  if (legacyTranslated && legacyTranslated !== legacyKey) return legacyTranslated;

  const directTranslated = t(type);
  if (directTranslated && directTranslated !== type) return directTranslated;

  return normalized || fallback;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedCurrency(value: string | null | undefined) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) || code === 'GBP' || code === 'GBX' || code === 'GBp' ? code : null;
}

function nativeCurrencyOf(item: Investment) {
  return normalizedCurrency(item.nativeCurrency)
    ?? normalizedCurrency(item.priceCurrency)
    ?? normalizedCurrency(item.currency)
    ?? null;
}

function nativeMarketValueOf(item: Investment) {
  return finiteNumber(item.nativeMarketValue)
    ?? finiteNumber(item.currentMarketValue)
    ?? finiteNumber(item.amount)
    ?? finiteNumber(item.currentValue);
}

function accountMarketValueOf(item: Investment, accountCurrency: string) {
  const userCurrency = normalizedCurrency(item.userCurrency);
  const nativeCurrency = nativeCurrencyOf(item);
  const converted = finiteNumber(item.convertedMarketValue);
  if (converted !== null && (!userCurrency || userCurrency === accountCurrency)) return converted;
  if (!nativeCurrency || nativeCurrency === accountCurrency) {
    return nativeMarketValueOf(item) ?? finiteNumber(item.currentValue);
  }
  if (!item.nativeCurrency && !item.priceCurrency && !item.userCurrency) return finiteNumber(item.currentValue);
  return null;
}

export default function InvestPage() {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const { session } = useAuth();
  const { items, isLoading, error, add, update, updateMarketPrice, remove } = useInvestments();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Investment | null>(null);
  const [details, setDetails] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshingPriceId, setRefreshingPriceId] = useState<string | null>(null);
  const [refreshingAllPrices, setRefreshingAllPrices] = useState(false);
  const [priceRefreshStatuses, setPriceRefreshStatuses] = useState<Record<string, InvestmentPriceRefreshStatus>>({});
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<InvestTab>('portfolio');
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const autoRefreshedRef = useRef(false);
  const L = useCallback((ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en, [lang]);

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
    refreshPrice: t('invest_asset_refreshPrice'),
    refreshingPrice: t('invest_asset_refreshingPrice'),
    refreshAllPrices: L('تحديث الأسعار', 'Refresh prices', 'Actualiser les prix'),
    refreshingPrices: L('جارٍ تحديث الأسعار', 'Refreshing prices', 'Actualisation des prix'),
    lastPrice: t('invest_asset_currentPrice'),
    symbol: t('invest_asset_symbol'),
    market: t('invest_asset_market'),
    currency: L('العملة', 'Currency', 'Devise'),
    quantity: t('invest_asset_quantity'),
    currentMarketValue: t('invest_asset_currentMarketValue'),
    currentPrice: t('invest_asset_currentPrice'),
    purchasePrice: L('سعر الشراء', 'Purchase price', 'Prix d’achat'),
    totalInvested: L('إجمالي الاستثمار', 'Total invested', 'Total investi'),
    profitLoss: L('الربح / الخسارة', 'Profit / loss', 'Profit / perte'),
    profitLossPercent: L('نسبة الربح / الخسارة', 'Profit / loss %', 'Profit / perte %'),
    priceStatus: L('حالة السعر', 'Price status', 'Statut du prix'),
    priceUpdated: L('السعر محدث', 'Price updated', 'Prix actualisé'),
    priceUpdateFailed: L('تعذر تحديث السعر حالياً', 'Could not update the price right now', 'Impossible d’actualiser le prix pour le moment'),
    currentPriceUnavailable: L('السعر الحالي غير متاح', 'Current price unavailable', 'Prix actuel indisponible'),
    purchasePriceMissing: L('سعر الشراء غير مكتمل', 'Purchase price is incomplete', 'Prix d’achat incomplet'),
    approxUserCurrency: L('تعادل تقريباً', 'Approx. in your currency', 'Équivaut environ'),
    dataSource: t('invest_asset_dataSource'),
    lastUpdated: t('invest_asset_lastUpdated'),
    unavailable: t('invest_asset_unavailable'),
    type: t('invest_form_type'),
    startDate: t('invest_form_startDate'),
    notes: t('invest_form_notes'),
    close: t('close'),
  }), [L, t]);

  const formLabels = useMemo(() => ({
    titleAdd: t('invest_form_titleAdd'),
    titleEdit: t('invest_form_titleEdit'),
    subtitle: t('invest_form_subtitle'),
    close: t('close'),
    name: t('invest_form_name'),
    namePlaceholder: t('invest_form_namePlaceholderSmart'),
    type: t('invest_form_type'),
    exchange: t('invest_form_exchange'),
    exchangeAll: t('invest_form_exchangeAll'),
    currentValue: t('invest_form_currentValue'),
    currentSharePrice: t('invest_asset_currentSharePrice'),
    currentMarketValue: t('invest_asset_currentMarketValue'),
    quantity: t('invest_asset_quantity'),
    numberOfUnits: t('invest_asset_numberOfUnits'),
    assetQuantity: t('invest_asset_assetQuantity'),
    quantityHelper: t('invest_asset_quantityHelper'),
    currentPriceUnavailable: t('invest_asset_currentPriceUnavailable'),
    recalculate: t('invest_asset_recalculate'),
    monthly: t('invest_form_monthly'),
    startDate: t('invest_form_startDate'),
    risk: t('invest_form_risk'),
    expectedReturn: t('invest_form_expectedReturn'),
    notes: t('invest_form_notes'),
    save: t('invest_form_save'),
    saving: t('invest_form_saving'),
    update: t('invest_form_update'),
    updating: t('invest_form_updating'),
    cancel: t('cancel'),
    saveAnother: t('invest_form_saveAnother'),
    assetSearchLoading: t('invest_asset_searchLoading'),
    assetSearchNoResultsTitle: t('invest_asset_noResultsTitle'),
    assetSearchNoResultsBody: t('invest_asset_noResultsBody'),
    assetSearchProviderUnavailable: t('invest_asset_providerUnavailable'),
    symbolsSyncing: t('invest_asset_symbolsSyncing'),
    savedAssetMissingFromDirectory: t('invest_asset_savedAssetMissingFromDirectory'),
    selectedAsset: t('invest_asset_selectedAsset'),
    currentPrice: t('invest_asset_currentPrice'),
    lastUpdated: t('invest_asset_lastUpdated'),
    dataSource: t('invest_asset_dataSource'),
    unavailable: t('invest_asset_unavailable'),
    fetchedPriceNote: t('invest_asset_fetchedPriceNote'),
    totalMarketValue: t('invest_asset_totalMarketValue'),
    sectionAssetType: t('invest_form_sectionAssetType'),
    sectionAssetDetails: t('invest_form_sectionAssetDetails'),
    sectionQuantityCost: t('invest_form_sectionQuantityCost'),
    sectionExtraDetails: t('invest_form_sectionExtraDetails'),
    assetSearchPlaceholder: t('invest_form_assetSearchPlaceholder'),
    cryptoSearchPlaceholder: t('invest_form_cryptoSearchPlaceholder'),
    fundSearchPlaceholder: t('invest_form_fundSearchPlaceholder'),
    symbolRequired: t('invest_form_symbolRequired'),
    symbolOptional: t('invest_form_symbolOptional'),
    marketOptional: t('invest_form_marketOptional'),
    investmentCurrency: t('invest_form_investmentCurrency'),
    purchasePricePerShare: t('invest_form_purchasePricePerShare'),
    currentPricePerShare: t('invest_form_currentPricePerShare'),
    purchasePricePerUnit: t('invest_form_purchasePricePerUnit'),
    currentPricePerUnit: t('invest_form_currentPricePerUnit'),
    purchasePricePerGram: t('invest_form_purchasePricePerGram'),
    currentPricePerGram: t('invest_form_currentPricePerGram'),
    purchaseTotal: t('invest_form_purchaseTotal'),
    purchaseTotalHelper: t('invest_form_purchaseTotalHelper'),
    currentValueAuto: t('invest_form_currentValueAuto'),
    goldProductType: t('invest_form_goldProductType'),
    silverProductType: t('invest_form_silverProductType'),
    grams: t('invest_form_grams'),
    count: t('invest_form_count'),
    propertyName: t('invest_form_propertyName'),
    propertyLocation: t('invest_form_propertyLocation'),
    propertyPurchasePrice: t('invest_form_propertyPurchasePrice'),
    propertyCurrentValue: t('invest_form_propertyCurrentValue'),
    propertyMonthlyIncome: t('invest_form_propertyMonthlyIncome'),
    propertyType: t('invest_form_propertyType'),
    cashName: t('invest_form_cashName'),
    cashAmount: t('invest_form_cashAmount'),
    annualYield: t('invest_form_annualYield'),
    maturityDate: t('invest_form_maturityDate'),
    projectName: t('invest_form_projectName'),
    projectCapital: t('invest_form_projectCapital'),
    projectMonthlyIncome: t('invest_form_projectMonthlyIncome'),
    projectMonthlyExpense: t('invest_form_projectMonthlyExpense'),
    projectNetProfit: t('invest_form_projectNetProfit'),
    otherAmount: t('invest_form_otherAmount'),
    otherCurrentValue: t('invest_form_otherCurrentValue'),
    summaryTitle: t('invest_form_summaryTitle'),
    summaryIncomplete: t('invest_form_summaryIncomplete'),
    summaryPurchaseTotal: t('invest_form_summaryPurchaseTotal'),
    summaryCurrentValue: t('invest_form_summaryCurrentValue'),
    summaryProfitLoss: t('invest_form_summaryProfitLoss'),
    summaryProfitLossPercent: t('invest_form_summaryProfitLossPercent'),
    summaryCurrency: t('invest_form_summaryCurrency'),
    summaryDefaultCurrencyValue: t('invest_form_summaryDefaultCurrencyValue'),
    fxUnavailable: t('invest_form_fxUnavailable'),
    fxLoading: t('invest_form_fxLoading'),
    fxRate: t('invest_form_fxRate'),
    fxRetry: t('invest_form_fxRetry'),
    validationSummary: t('invest_form_validationSummary'),
    manualPriceHint: t('invest_form_manualPriceHint'),
    livePriceHint: t('invest_form_livePriceHint'),
    searchMustSelect: t('invest_form_searchMustSelect'),
    metalsPriceLoading: t('invest_form_metalsPriceLoading'),
    metalsPriceUnavailable: t('invest_form_metalsPriceUnavailable'),
    goldUnits: {
      bar: t('invest_form_goldUnitBar'),
      lira: t('invest_form_goldUnitLira'),
      gram: t('invest_form_goldUnitGram'),
      ounce: t('invest_form_goldUnitOunce'),
      other: t('invest_form_goldUnitOther'),
    },
    silverUnits: {
      gram: t('invest_form_silverUnitGram'),
      ounce: t('invest_form_silverUnitOunce'),
      kilo: t('invest_form_silverUnitKilo'),
      other: t('invest_form_silverUnitOther'),
    },
    propertyTypes: {
      residential: t('invest_form_propertyTypeResidential'),
      commercial: t('invest_form_propertyTypeCommercial'),
      land: t('invest_form_propertyTypeLand'),
      other: t('invest_form_propertyTypeOther'),
    },
    assetTypes: {
      stock: t('invest_asset_type_stock'),
      etf: t('invest_asset_type_etf'),
      index: t('invest_asset_type_index'),
      crypto: t('invest_asset_type_crypto'),
      forex: t('invest_asset_type_forex'),
      commodity: t('invest_asset_type_commodity'),
      gold: t('invest_asset_type_gold'),
      silver: t('invest_types_silver'),
      fund: t('investment_type_fund'),
      project: t('invest_types_project'),
    },
    errors: {
      nameRequired: t('invest_form_errors_nameRequired'),
      valuePositive: t('invest_form_errors_valuePositive'),
      contributionPositive: t('invest_form_errors_contributionPositive'),
      quantityPositive: t('invest_form_errors_quantityPositive'),
      quantityRequired: t('invest_form_errors_quantityRequired'),
      returnRange: t('invest_form_errors_returnRangeWide'),
      assetRequired: t('invest_form_errors_assetRequired'),
      purchasePriceRequired: t('invest_form_errors_purchasePriceRequired'),
      purchaseBasisRequired: t('invest_form_errors_purchaseBasisRequired'),
      numericInvalid: t('invest_form_errors_numericInvalid'),
      currentValueRequired: t('invest_form_errors_currentValueRequired'),
      gramsPositive: t('invest_form_errors_gramsPositive'),
      startDateRequired: t('invest_form_errors_startDateRequired'),
      fxRequired: t('invest_form_errors_fxRequired'),
      expensePositive: t('invest_form_errors_expensePositive'),
    },
  }), [t]);

  const typeLabel = useCallback((type: InvestmentType | string | null | undefined) => formatInvestmentType(type, t), [t]);
  const riskLabel = useCallback((risk: RiskLevel) => t(`invest_risks_${risk}`), [t]);
  const tabs = useMemo(() => [
    { id: 'portfolio', label: L('المحفظة', 'Portfolio', 'Portefeuille') },
    { id: 'assets', label: L('الأصول', 'Assets', 'Actifs'), count: items.length },
    { id: 'performance', label: L('الأداء', 'Performance', 'Performance') },
    { id: 'risk', label: L('المخاطر', 'Risk', 'Risque') },
    { id: 'reports', label: L('التقارير', 'Reports', 'Rapports') },
  ], [L, items.length]);
  const money = useCallback((amount: number | null | undefined, status: MoneyParseStatus = 'valid') => {
    if (status === 'missing' || amount === null || amount === undefined) {
      return L('القيمة غير مدخلة', 'Value not entered', 'Valeur non saisie');
    }
    if (status === 'invalid' || !Number.isFinite(amount)) {
      return L('قيمة غير صالحة', 'Invalid value', 'Valeur invalide');
    }
    return formatCurrency(amount, currency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en');
  }, [L, currency, lang]);
  const accountCurrency = currency.toUpperCase();
  const accountValue = useCallback((item: Investment) => accountMarketValueOf(item, accountCurrency), [accountCurrency]);
  const formatNativeMoney = useCallback((amount: number | null | undefined, nativeCurrency?: string | null, item?: Investment | null) => {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return labels.unavailable;
    const resolvedCurrency = resolveMarketCurrency({
      providerCurrency: nativeCurrency ?? item?.nativeCurrency ?? item?.priceCurrency ?? item?.currency,
      exchange: item?.market,
      market: item?.market,
      symbol: item?.symbol ?? item?.providerSymbol,
      providerSymbol: item?.providerSymbol,
      assetType: item?.assetType ?? item?.type,
    }).currency;
    if (!resolvedCurrency) {
      return amount.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.abs(amount) >= 1000 ? 2 : 4,
      });
    }
    return formatMarketPrice({
      price: amount,
      currency: resolvedCurrency,
      exchange: item?.market,
      symbol: item?.symbol ?? item?.providerSymbol,
      locale: lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en',
      includeKuwaitDinarEquivalent: true,
    });
  }, [labels.unavailable, lang]);
  const totalValue = useMemo(() => items.reduce((sum, item) => sum + (accountValue(item) ?? 0), 0), [accountValue, items]);
  const unavailableConversionCount = useMemo(() => items.filter(item => accountValue(item) === null).length, [accountValue, items]);
  const totalMonthly = useMemo(() => items.reduce((sum, item) => sum + item.monthlyContribution, 0), [items]);
  const uniqueCategories = useMemo(() => new Set(items.map(item => item.type)).size, [items]);
  const weightedRiskScore = useMemo(() => {
    if (totalValue <= 0) return 0;
    return items.reduce((sum, item) => {
      const value = accountValue(item) ?? 0;
      return sum + RISK_SCORE[item.riskLevel] * (value / totalValue);
    }, 0);
  }, [accountValue, items, totalValue]);
  const overallRisk: RiskLevel = weightedRiskScore < 1.5 ? 'low' : weightedRiskScore < 2.5 ? 'medium' : 'high';
  const weightedReturn = useMemo(() => {
    const withReturns = items.filter(item => typeof item.expectedAnnualReturn === 'number' && item.expectedAnnualReturn >= 0);
    const returnBase = withReturns.reduce((sum, item) => sum + (accountValue(item) ?? 0), 0);
    if (returnBase <= 0) return null;
    return withReturns.reduce((sum, item) => sum + (item.expectedAnnualReturn ?? 0) * (accountValue(item) ?? 0), 0) / returnBase;
  }, [accountValue, items]);
  const analysisReturn = weightedReturn ?? 0;
  const canShowReturnProjection = weightedReturn !== null;
  const typeDistribution = useMemo(() => TYPES.map((type, index) => ({
    name: typeLabel(type),
    value: items.filter(item => item.type === type).reduce((sum, item) => sum + (accountValue(item) ?? 0), 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
  })).filter(item => item.value > 0), [accountValue, items, typeLabel]);
  const valueByInvestment = useMemo(() => items.map(item => ({
    name: item.name,
    value: accountValue(item) ?? 0,
  })).filter(item => item.value > 0), [accountValue, items]);
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
  const projections = useMemo(
    () => [1, 3, 5].map(years => calculateMonthlyContributionProjection(years, totalMonthly, analysisReturn)),
    [analysisReturn, totalMonthly],
  );
  const marketLinkedInvestments = useMemo(() => items
    .map(item => ({ investment: item, symbol: investmentSymbol(item) }))
    .filter(item => item.symbol), [items]);
  const portfolioPreview = useMemo(() => [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5), [items]);
  const currencyBreakdown = useMemo(() => {
    const groups = new Map<string, { currency: string; nativeValue: number; convertedValue: number; count: number; unavailable: number }>();
    for (const item of items) {
      const nativeCurrency = nativeCurrencyOf(item) ?? accountCurrency;
      const nativeValue = nativeMarketValueOf(item) ?? 0;
      const convertedValue = accountValue(item);
      const group = groups.get(nativeCurrency) ?? { currency: nativeCurrency, nativeValue: 0, convertedValue: 0, count: 0, unavailable: 0 };
      group.nativeValue += nativeValue;
      group.count += 1;
      if (convertedValue === null) {
        group.unavailable += 1;
      } else {
        group.convertedValue += convertedValue;
      }
      groups.set(nativeCurrency, group);
    }
    return Array.from(groups.values()).sort((a, b) => b.convertedValue - a.convertedValue);
  }, [accountCurrency, accountValue, items]);
  const lastValuationUpdate = useMemo(() => {
    const dates = items
      .map(item => item.valuationLastUpdatedAt || item.fxLastUpdatedAt || item.lastPriceUpdatedAt || item.updatedAt)
      .map(value => value ? new Date(value).getTime() : NaN)
      .filter(value => Number.isFinite(value));
    return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
  }, [items]);
  const insights = useMemo(() => {
    if (items.length === 0) return [];
    if (items.length === 1) return [t('invest_insights_addMoreForDiversification')];

    const next: string[] = [];
    const biggest = [...items].sort((a, b) => (accountValue(b) ?? 0) - (accountValue(a) ?? 0))[0];
    const biggestValue = accountValue(biggest) ?? 0;
    const biggestPct = totalValue > 0 ? (biggestValue / totalValue) * 100 : 0;
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
  }, [accountValue, analysisReturn, canShowReturnProjection, items, money, projections, t, totalMonthly, totalValue, typeLabel, uniqueCategories]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function fetchFxRate(fromCurrency: string, toCurrency: string) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) {
      return {
        rate: 1,
        source: 'same_currency',
        lastUpdated: new Date().toISOString(),
      };
    }
    const params = new URLSearchParams({ from, to });
    const response = await fetch(`/api/market/fx/rate?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json() as {
      ok?: boolean;
      rate?: number | null;
      source?: string | null;
      lastUpdated?: string | null;
      error?: string;
    };
    const rate = Number(payload.rate);
    if (!response.ok || payload.ok === false || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(payload.error || L('ØªØ¹Ø°Ø± ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ù‚ÙŠÙ…Ø© Ø¥Ù„Ù‰ Ø¹Ù…Ù„Ø© Ø§Ù„Ø­Ø³Ø§Ø¨ Ø­Ø§Ù„ÙŠØ§Ù‹', 'Could not convert value to account currency right now.', 'Impossible de convertir la valeur dans la devise du compte pour le moment.'));
    }
    return {
      rate,
      source: payload.source || 'FX provider',
      lastUpdated: payload.lastUpdated || new Date().toISOString(),
    };
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

  async function handleSave(input: InvestmentInput, options?: { addAnother?: boolean }) {
    setSaving(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Investments] page save input', {
          mode,
          editingId: selected?.id,
          type: input.type,
          name: input.name,
          symbol: input.symbol,
          providerSymbol: input.providerSymbol,
          market: input.market,
          currency: input.currency ?? input.nativeCurrency ?? input.priceCurrency,
          quantity: input.quantity,
          purchasePrice: input.purchasePrice,
          purchaseTotal: input.purchaseTotal,
          currentPrice: input.currentPrice ?? input.lastPrice,
          currentMarketValue: input.currentMarketValue ?? input.nativeMarketValue,
          lastPriceUpdatedAt: input.lastPriceUpdatedAt ?? input.valuationLastUpdatedAt,
        });
      }
      if (mode === 'create') {
        await add(input);
        showToast(t('invest_form_successAdd'));
      } else if (selected) {
        await update(selected.id, input);
        showToast(t('invest_form_successUpdate'));
      }
      if (!options?.addAnother) {
        setModalOpen(false);
        setSelected(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshPrice(item: Investment, options?: { silent?: boolean }) {
    const providerSymbol = item.providerSymbol || item.symbol;
    if (!providerSymbol) return false;

    setRefreshingPriceId(item.id);
    try {
      const params = new URLSearchParams({
        symbol: providerSymbol,
        displaySymbol: item.symbol || providerSymbol,
        name: item.name,
      });
      if (item.assetType) params.set('assetType', item.assetType);
      if (item.market) params.set('market', item.market);
      if (item.nativeCurrency || item.priceCurrency || item.currency) {
        params.set('currency', item.nativeCurrency || item.priceCurrency || item.currency || '');
      }
      const authToken = session?.access_token;
      const response = await fetch(`/api/market/refresh-investment-price?${params.toString()}`, {
        cache: 'no-store',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const payload = await response.json() as {
        ok?: boolean;
        item?: {
          symbol?: string;
          provider_symbol?: string;
          price?: number | null;
          currency?: string | null;
          price_unit?: string | null;
          updated_at?: string | null;
          source?: string;
        };
        code?: string;
      };

      const price = Number(payload.item?.price);
      if (!response.ok || payload.ok === false || !Number.isFinite(price) || price <= 0) {
        const failedAt = new Date().toISOString();
        setPriceRefreshStatuses(prev => ({
          ...prev,
          [item.id]: {
            state: 'failed',
            message: payload.code || 'PRICE_UNAVAILABLE',
            at: failedAt,
          },
        }));
        if (!options?.silent) showToast(labels.priceUpdateFailed);
        return false;
      }

      const nativeCurrency = (payload.item?.currency || item.nativeCurrency || item.priceCurrency || item.currency || currency).toUpperCase();
      const metrics = calculateInvestmentHoldingMetrics(item, { currentPrice: price });
      const currentMarketValue = metrics.currentValue;
      let fx: Awaited<ReturnType<typeof fetchFxRate>> | null = null;
      if (currentMarketValue !== null) {
        try {
          fx = await fetchFxRate(nativeCurrency, accountCurrency);
        } catch {
          fx = nativeCurrency === accountCurrency
            ? { rate: 1, source: 'same_currency', lastUpdated: new Date().toISOString() }
            : null;
        }
      }
      const convertedMarketValue = currentMarketValue !== null && fx
        ? currentMarketValue * fx.rate
        : null;
      const valuationUpdatedAt = payload.item?.updated_at || new Date().toISOString();
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MARKET_DATA === 'true') {
        console.info('[Investments] price refresh parsed', {
          requestedSymbol: providerSymbol,
          providerSymbol: payload.item?.provider_symbol || providerSymbol,
          parsedCurrentPrice: price,
          currency: nativeCurrency,
          lastUpdated: valuationUpdatedAt,
          source: payload.item?.source,
          priceUnit: payload.item?.price_unit,
        });
      }
      const source = payload.item?.source || item.priceSource || item.dataSource;
      const updated = await updateMarketPrice(item.id, {
        currentPrice: price,
        currentMarketValue: currentMarketValue ?? undefined,
        defaultCurrencyValue: convertedMarketValue ?? undefined,
        convertedMarketValue: convertedMarketValue ?? undefined,
        lastPrice: price,
        lastPriceUpdatedAt: valuationUpdatedAt,
        dataSource: source,
        priceSource: source,
        valuationSource: source,
        valuationLastUpdatedAt: valuationUpdatedAt,
        priceCurrency: nativeCurrency,
        nativeCurrency,
        nativeUnitPrice: price,
        nativeMarketValue: currentMarketValue ?? undefined,
        userCurrency: accountCurrency,
        fxRateToUserCurrency: fx?.rate,
        fxSource: fx?.source ?? (nativeCurrency === accountCurrency ? 'same_currency' : 'unavailable'),
        fxLastUpdatedAt: fx?.lastUpdated,
      });
      if (details?.id === item.id) setDetails(updated);
      if (selected?.id === item.id) setSelected(updated);
      setPriceRefreshStatuses(prev => ({
        ...prev,
        [item.id]: {
          state: 'updated',
          at: valuationUpdatedAt,
        },
      }));
      if (!options?.silent) showToast(t('invest_asset_priceUpdated'));
      return true;
    } catch (err) {
      const failedAt = new Date().toISOString();
      setPriceRefreshStatuses(prev => ({
        ...prev,
        [item.id]: {
          state: 'failed',
          message: err instanceof Error ? err.message : 'PRICE_UNAVAILABLE',
          at: failedAt,
        },
      }));
      if (!options?.silent) showToast(labels.priceUpdateFailed);
      return false;
    } finally {
      setRefreshingPriceId(null);
    }
  }

  async function handleRefreshPrices(visibleItems: Investment[]) {
    const refreshable = visibleItems.filter(item => item.providerSymbol || item.symbol);
    if (refreshable.length === 0 || refreshingAllPrices) return;
    setRefreshingAllPrices(true);
    try {
      let updatedCount = 0;
      for (const item of refreshable) {
        const updated = await handleRefreshPrice(item, { silent: true });
        if (updated) updatedCount += 1;
      }
      showToast(updatedCount === refreshable.length ? t('invest_asset_priceUpdated') : labels.priceUpdateFailed);
    } finally {
      setRefreshingAllPrices(false);
    }
  }

  // Auto-refresh market prices on first load for investments missing current price
  useEffect(() => {
    if (isLoading || autoRefreshedRef.current) return;
    const stale = items.filter(
      item => (item.providerSymbol || item.symbol) && !item.lastPrice && !item.currentPrice
    );
    if (stale.length === 0) return;
    autoRefreshedRef.current = true;
    void handleRefreshPrices(stale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, items]);

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
      <DashboardPageShell
        ariaLabel={labels.heroTitle}
        className="invest-main"
        contentClassName="invest-content"
      >
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
              <SummaryCard icon={<WalletCards size={20} />} title={L('إجمالي قيمة الاستثمارات', 'Total investment value', 'Valeur totale des investissements')} value={money(totalValue)} subtitle={unavailableConversionCount > 0 ? L(`لم يتم احتساب ${unavailableConversionCount} أصل بسبب تعذر سعر الصرف`, `${unavailableConversionCount} asset(s) excluded because FX is unavailable`, `${unavailableConversionCount} actif(s) exclus car le FX est indisponible`) : L(`محسوب من ${items.length} أصل وبأسعار صرف حقيقية`, `Calculated from ${items.length} asset(s) with real FX rates`, `Calculé depuis ${items.length} actif(s) avec des taux réels`)} />
              <SummaryCard icon={<TrendingUp size={20} />} title={t('invest_summary_monthlyContribution')} value={money(totalMonthly)} subtitle={t('invest_projections_totalContributions')} />
              <SummaryCard icon={<ShieldAlert size={20} />} title={t('invest_summary_riskLevel')} value={riskLabel(overallRisk)} subtitle={t('invest_summary_notFinancialAdvice')} />
              <SummaryCard icon={<Layers3 size={20} />} title={t('invest_summary_diversification')} value={t('invest_summary_categoriesCount').replace('{count}', String(uniqueCategories))} subtitle={uniqueCategories >= 4 ? t('invest_insights_wellDiversified').replace('{count}', String(uniqueCategories)) : t('invest_insights_diversifyMore').replace('{count}', String(uniqueCategories))} />
              <SummaryCard icon={<LineChartIcon size={20} />} title={t('invest_summary_expectedReturn')} value={weightedReturn === null ? t('insufficientData') : pct(weightedReturn)} subtitle={weightedReturn === null ? t('invest_summary_defaultReturn') : t('invest_summary_notFinancialAdvice')} />
            </section>

            <section className="invest-panel invest-currency-breakdown">
              <div className="invest-section-head invest-section-head--split">
                <div>
                  <span>{L('آخر تحديث للقيم', 'Last valuation update', 'Dernière mise à jour')}</span>
                  <h2>{L('تفصيل الاستثمارات حسب العملة', 'Investment breakdown by currency', 'Répartition des investissements par devise')}</h2>
                </div>
                <strong dir="ltr">{lastValuationUpdate ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastValuationUpdate)) : labels.unavailable}</strong>
              </div>
              <div className="invest-currency-grid">
                {currencyBreakdown.map(group => (
                  <article key={group.currency}>
                    <span dir="ltr">{group.currency}</span>
                    <b dir="ltr">{formatNativeMoney(group.nativeValue, group.currency)}</b>
                    <small dir="ltr">≈ {money(group.convertedValue)}</small>
                    {group.unavailable > 0 && <em>{L('تحويل غير متاح لبعض الأصول', 'Some conversions unavailable', 'Certaines conversions sont indisponibles')}</em>}
                  </article>
                ))}
              </div>
            </section>

            <PageTabs
              tabs={tabs}
              active={activeTab}
              onChange={id => setActiveTab(id as InvestTab)}
              ariaLabel={labels.heroTitle}
            />

            {activeTab === 'portfolio' && (
            <section className="invest-portfolio-grid">
            <section className="invest-panel invest-preview-panel">
              <div className="invest-section-head invest-section-head--split">
                <div>
                  <span>{L('نظرة سريعة', 'Portfolio Preview', 'Aperçu du portefeuille')}</span>
                  <h2>{L('آخر الأصول المسجلة', 'Latest recorded assets', 'Derniers actifs enregistrés')}</h2>
                </div>
                <button type="button" className="invest-secondary-btn" onClick={() => setActiveTab('assets')}>
                  {L('عرض كل الأصول', 'View all assets', 'Voir tous les actifs')}
                </button>
              </div>
              <div className="invest-list invest-list--preview">
                {portfolioPreview.map(item => (
                  <InvestmentRow
                    key={item.id}
                    investment={item}
                    accountValue={accountValue(item)}
                    portfolioPercent={totalValue > 0 && accountValue(item) !== null ? ((accountValue(item) ?? 0) / totalValue) * 100 : null}
                    labels={labels}
                    typeLabel={typeLabel}
                    riskLabel={riskLabel}
                    formatMoney={money}
                    formatNativeMoney={formatNativeMoney}
                    onDetails={setDetails}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onRefreshPrice={handleRefreshPrice}
                    refreshing={refreshingPriceId === item.id}
                    priceRefreshStatus={priceRefreshStatuses[item.id]}
                  />
                ))}
              </div>
            </section>

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
            </section>
            )}

            {activeTab === 'performance' && (
              <InvestPerformanceCharts
                distribution={typeDistribution}
                values={valueByInvestment}
                projection={projectionLineData}
                canShowProjection={canShowReturnProjection}
                titles={{
                  distribution: t('invest_charts_distribution'),
                  byInvestment: t('invest_charts_byInvestment'),
                  projection12: t('invest_charts_projection12'),
                }}
                fallbackText={t('invest_summary_defaultReturn')}
                money={money}
              />
            )}

            {activeTab === 'risk' && (
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
                {totalMonthly <= 0 ? (
                  <p className="invest-projection-warning">{t('invest_projections_zeroContributionWarning')}</p>
                ) : null}
                {canShowReturnProjection ? (
                  <>
                    <p className="invest-projection-rate">
                      {t('invest_projections_selectedReturn').replace('{rate}', pct(analysisReturn))}
                    </p>
                    <div className="invest-projection-grid">
                      {projections.map(item => (
                        <div key={item.years}>
                          <span>{t(`invest_projections_years${item.years}`)}</span>
                          <strong>{money(item.value)}</strong>
                          <small>{t('invest_projections_totalContributions')}: {money(item.contribTotal)}</small>
                          <small>{t('invest_projections_expectedGain')}: {money(item.gain)}</small>
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

            {activeTab === 'reports' && (
            <section className="invest-panel invest-report-card">
              <div className="invest-section-head invest-section-head--split">
                <div>
                  <span>{L('التقارير', 'Reports', 'Rapports')}</span>
                  <h2>{L('تقرير الاستثمار', 'Investment report', 'Rapport d’investissement')}</h2>
                </div>
                <PieChartIcon size={20} />
              </div>
              <p>{items.length > 0
                ? L('توجه إلى مركز التقارير لمعاينة تقرير الاستثمار بناءً على بياناتك المسجلة.', 'Open the Reports Center to preview the investment report from your saved data.', 'Ouvrez le centre des rapports pour prévisualiser le rapport d’investissement à partir de vos données enregistrées.')
                : L('لا توجد بيانات استثمار كافية لإعداد تقرير.', 'There is not enough investment data to prepare a report.', 'Les données d’investissement sont insuffisantes pour préparer un rapport.')
              }</p>
              <button type="button" className="invest-primary-btn" onClick={() => router.push('/reports-center')}>
                <BarChart3 size={16} />
                {L('فتح مركز التقارير', 'Open Reports Center', 'Ouvrir le centre des rapports')}
              </button>
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
              formatNativeMoney={formatNativeMoney}
              accountValue={accountValue}
              onDetails={setDetails}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onRefreshPrice={handleRefreshPrice}
              onRefreshPrices={handleRefreshPrices}
              refreshingPriceId={refreshingPriceId}
              refreshingPrices={refreshingAllPrices}
              priceRefreshStatuses={priceRefreshStatuses}
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
          formatNativeMoney={formatNativeMoney}
          accountValue={details ? accountValue(details) : null}
          onClose={() => setDetails(null)}
          onRefreshPrice={handleRefreshPrice}
          refreshing={Boolean(details && refreshingPriceId === details.id)}
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
      </DashboardPageShell>

      <style jsx global>{`
        .invest-shell{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);display:flex;font-family:Tajawal,Arial,sans-serif}
        .invest-main{width:auto!important;max-width:none!important;margin:0!important;margin-inline-start:var(--sidebar-w)!important;margin-inline-end:0!important;padding:24px!important;overflow-x:clip!important}
        .invest-content{display:grid;gap:16px;width:100%;max-width:none!important;max-inline-size:none!important;min-width:0;margin:0}
        .invest-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:0;min-width:0}
        .invest-topbar span{font-size:12px;color:var(--sfm-muted);font-weight:900}.invest-topbar h1{font-size:25px;margin:4px 0 0;font-weight:900;color:var(--sfm-foreground)}
        .invest-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--sfm-foreground) 0%,var(--sfm-primary-dark) 58%,var(--sfm-soft-cyan) 140%);border:1px solid rgba(167,243,240,.22);border-radius:26px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;color:var(--sfm-card);box-shadow:0 20px 55px rgba(3,18,37,.16);min-width:0;max-width:100%}
        .invest-hero:before{content:"";position:absolute;inset-inline-end:-80px;top:-90px;width:240px;height:240px;border-radius:50%;background:rgba(167,243,240,.12);filter:blur(18px)}
        .invest-hero-content{position:relative;z-index:1;min-width:0}.invest-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.14);color:#86EFAC;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:900;margin-bottom:14px}.invest-badge span{width:7px;height:7px;border-radius:50%;background:#22C55E;animation:pulse 1.6s infinite}
        .invest-hero h2{font-size:34px;line-height:1.05;margin:0 0 10px;font-weight:900}.invest-hero p{max-width:680px;margin:0 0 18px;color:rgba(255,255,255,.72);line-height:1.8;font-size:14px}
        .invest-hero-total{position:relative;z-index:1;min-width:230px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:18px;display:grid;gap:7px;backdrop-filter:blur(12px)}.invest-hero-total svg{color:var(--sfm-soft-cyan)}.invest-hero-total span{color:rgba(255,255,255,.68);font-size:12px;font-weight:800}.invest-hero-total strong{font-size:23px;color:var(--sfm-soft-cyan)}
        .invest-primary-btn,.invest-secondary-btn,.invest-danger-btn,.invest-glass-btn{height:43px;border-radius:14px;border:0;padding:0 17px;font:900 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .2s}.invest-primary-btn{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(167,243,240,.22)}.invest-primary-btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(167,243,240,.28)}.invest-secondary-btn{background:var(--sfm-card);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.22)}.invest-danger-btn{background:#B91C1C;color:#fff}.invest-glass-btn{margin-inline-start:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:var(--sfm-card)}.invest-glass-btn:hover{background:rgba(255,255,255,.18)}.invest-primary-btn:disabled,.invest-secondary-btn:disabled,.invest-danger-btn:disabled{opacity:.6;cursor:wait}
        .invest-panel,.invest-empty{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 4px 22px rgba(3,18,37,.06);min-width:0}
        .invest-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;min-width:0;max-width:100%}.invest-summary-card{min-height:132px;padding:16px;display:grid;gap:8px;align-content:start}.invest-summary-card .icon{width:38px;height:38px;border-radius:13px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-summary-card span{font-size:11px;font-weight:900;color:var(--sfm-muted)}.invest-summary-card strong{font-size:18px;color:var(--sfm-foreground);overflow-wrap:anywhere}.invest-summary-card p{margin:0;color:var(--sfm-muted);font-size:11px;font-weight:800;line-height:1.6}
        .invest-chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.invest-chart-card{padding:17px;min-height:330px}.invest-chart-skeleton{background:linear-gradient(90deg,var(--sfm-card),var(--sfm-light-card),var(--sfm-card));background-size:200% 100%;animation:invest-chart-shimmer 1.25s linear infinite}@keyframes invest-chart-shimmer{to{background-position:-200% 0}}.invest-section-head{display:flex;align-items:center;gap:9px;margin-bottom:14px;color:var(--sfm-muted);min-width:0}.invest-section-head h2{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:900}.invest-section-head span{display:block;margin-bottom:4px;color:var(--sfm-muted);font-size:11px;font-weight:900}.invest-section-head--split{justify-content:space-between;align-items:flex-start;gap:14px}.invest-currency-breakdown{padding:17px}.invest-currency-breakdown .invest-section-head strong{color:var(--sfm-muted);font-size:12px;font-weight:900}.invest-currency-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.invest-currency-grid article{display:grid;gap:6px;border:1px solid rgba(14,116,144,.14);border-radius:16px;background:rgba(236,254,255,.58);padding:12px;min-width:0}.dark .invest-currency-grid article{background:rgba(8,47,73,.36);border-color:rgba(103,232,249,.16)}.invest-currency-grid span{font-size:11px;font-weight:950;color:#0f766e}.dark .invest-currency-grid span{color:var(--sfm-soft-cyan)}.invest-currency-grid b{font-size:14px;color:var(--sfm-foreground);overflow-wrap:anywhere}.invest-currency-grid small{font-size:12px;font-weight:900;color:var(--sfm-muted);overflow-wrap:anywhere}.invest-currency-grid em{font-style:normal;color:#B45309;font-size:11px;font-weight:900}
        .invest-portfolio-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:14px;align-items:start;min-width:0;max-width:100%}.invest-preview-panel{padding:17px}.invest-list--preview{padding:0}.invest-list--preview .invest-row:last-child{padding-bottom:0}.invest-market-link{padding:17px}.invest-market-link p,.invest-report-card p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7}.invest-market-chips{display:flex;flex-wrap:wrap;gap:9px}.invest-market-chips button{min-height:44px;border:1px solid rgba(167,243,240,.16);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:8px 12px;display:flex;align-items:center;gap:8px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.invest-market-chips button strong{direction:ltr;color:var(--sfm-muted)}.invest-market-chips button span{color:var(--sfm-muted)}
        .invest-analysis-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.invest-insights,.invest-projections,.invest-report-card{padding:18px}.invest-report-card{display:grid;gap:12px;align-content:start}.invest-insight-list{display:grid;gap:10px}.invest-insight-item{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px}.invest-insight-item span{width:30px;height:30px;border-radius:11px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));display:grid;place-items:center;color:var(--sfm-foreground);font-size:12px;font-weight:900}.invest-insight-item p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.7}.invest-empty-chart{min-height:220px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.7;background:var(--sfm-light-card);border:1px dashed rgba(167,243,240,.24);border-radius:18px;padding:18px}
        .invest-projection-rate{margin:0 0 10px;display:inline-flex;width:max-content;max-width:100%;border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:#0f766e;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:950;line-height:1.35}.dark .invest-projection-rate{color:var(--sfm-soft-cyan);background:rgba(47,214,192,.11);border-color:rgba(47,214,192,.24)}.invest-projection-warning{margin:0 0 10px;border:1px solid rgba(245,158,11,.24);background:rgba(245,158,11,.10);color:#92400E;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:900;line-height:1.65}.dark .invest-projection-warning{color:#FCD34D;background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.26)}
        .invest-projection-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.invest-projection-grid div{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px;display:grid;gap:6px}.invest-projection-grid span{color:var(--sfm-muted);font-size:11px;font-weight:900}.invest-projection-grid strong{font-size:15px;color:var(--sfm-foreground)}.invest-projection-grid small{font-size:11px;color:var(--sfm-muted);font-weight:800}.invest-disclaimer{margin:12px 0 0;color:var(--sfm-muted);font-size:11px;font-weight:900}
        .invest-empty{min-height:280px;padding:42px 20px;text-align:center;display:grid;place-items:center;align-content:center;gap:12px}.invest-empty-icon{width:68px;height:68px;border-radius:22px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-empty h3{margin:0;font-size:20px}.invest-empty p{max-width:520px;margin:0;color:var(--sfm-muted);line-height:1.8;font-size:14px}
        .invest-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,220px) minmax(160px,220px);gap:10px;padding:14px;border-bottom:1px solid rgba(167,243,240,.1);min-width:0}.invest-controls input,.invest-controls select,.invest-field input,.invest-field select,.invest-field textarea{height:48px;min-width:0;width:100%;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);padding:0 13px;font:800 13px Tajawal,Arial,sans-serif;outline:0}.invest-controls input:focus,.invest-controls select:focus,.invest-field input:focus,.invest-field select:focus,.invest-field textarea:focus{border-color:var(--sfm-soft-cyan);background:var(--sfm-card);box-shadow:0 0 0 4px rgba(167,243,240,.12)}
        .invest-list{display:grid;gap:0;padding:0 14px 14px;min-width:0}.invest-row{padding:13px 0;border-bottom:1px solid rgba(167,243,240,.1);display:grid;gap:9px;min-width:0}.invest-row:last-child{border-bottom:0}.invest-row-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}.invest-row-main>div{min-width:0}.invest-row-main h3{margin:0 0 5px;font-size:15px;font-weight:900;overflow-wrap:anywhere}.invest-row-main p{margin:0;color:#475569;font-size:12px;font-weight:800;overflow-wrap:anywhere}.invest-row-main strong{font-size:15px;color:var(--sfm-foreground);white-space:nowrap}.invest-row-main .invest-asset-value{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border-radius:12px;border:1px solid rgba(14,116,144,.18);background:rgba(236,254,255,.72);color:#0F172A;font-size:clamp(16px,1.6vw,18px);font-weight:950;line-height:1.25;padding:7px 11px;font-variant-numeric:tabular-nums;letter-spacing:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.52),0 8px 20px rgba(15,23,42,.05);text-align:end}.invest-row-meta{display:flex;flex-wrap:wrap;gap:7px;min-width:0}.invest-row-meta span{font-size:11px;font-weight:800;color:var(--sfm-muted);background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:999px;padding:5px 9px;overflow-wrap:anywhere}.invest-row-actions{display:flex;gap:7px;flex-wrap:wrap}.invest-row-actions button{height:34px;border-radius:11px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);color:var(--sfm-muted);padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:6px;cursor:pointer}.invest-row-actions button:hover{background:rgba(167,243,240,.09);color:var(--sfm-muted)}.invest-row-actions button.danger:hover{background:rgba(185,28,28,.08);color:#B91C1C}
        .invest-list-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border-bottom:1px solid rgba(167,243,240,.1)}.invest-list-toolbar .invest-controls{padding:0;border-bottom:0}.invest-refresh-all{height:48px;border-radius:14px;border:1px solid rgba(47,214,192,.24);background:linear-gradient(135deg,rgba(45,212,191,.14),rgba(29,140,255,.1));color:#0f766e;padding:0 15px;font:950 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:nowrap}.invest-refresh-all:hover{border-color:rgba(47,214,192,.45);box-shadow:0 10px 24px rgba(15,118,110,.08)}.invest-refresh-all:disabled{opacity:.64;cursor:wait}.invest-list{gap:12px;padding:14px}.invest-holding-card{padding:16px;border:1px solid rgba(167,243,240,.16)!important;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.98));box-shadow:0 12px 30px rgba(15,23,42,.06);display:grid;gap:14px}.dark .invest-holding-card{background:linear-gradient(180deg,rgba(15,29,49,.94),rgba(10,24,42,.94));border-color:rgba(167,243,240,.14)!important}.invest-holding-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;min-width:0}.invest-holding-identity{display:flex;align-items:flex-start;gap:12px;min-width:0}.invest-holding-identity h3{margin:0 0 8px;font-size:17px;font-weight:950;color:var(--sfm-foreground);overflow-wrap:anywhere}.invest-holding-badges{display:flex;flex-wrap:wrap;gap:7px}.invest-badge-soft,.invest-risk-badge,.invest-weight-badge{min-height:27px;border-radius:999px;padding:5px 10px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(167,243,240,.18);background:var(--sfm-light-card);color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1}.invest-risk-badge--low{color:#047857;background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.22)}.invest-risk-badge--medium{color:#B45309;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.24)}.invest-risk-badge--high{color:#B91C1C;background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.2)}.invest-weight-badge{color:#0f766e;background:rgba(45,212,191,.1);border-color:rgba(45,212,191,.22)}.invest-holding-actions{justify-content:flex-end}.invest-holding-primary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.invest-holding-metric{min-width:0;border:1px solid rgba(167,243,240,.15);border-radius:16px;background:var(--sfm-light-card);padding:12px;display:grid;gap:7px}.invest-holding-metric span{font-size:11px;font-weight:950;color:var(--sfm-muted)}.invest-holding-metric strong{min-width:0;display:flex;align-items:center;gap:6px;color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.35;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.invest-holding-metric--gain strong{color:#047857}.invest-holding-metric--loss strong{color:#B91C1C}.invest-holding-metric--warning{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.08)}.invest-holding-metric--warning strong{color:#92400E}.invest-holding-secondary{display:flex;flex-wrap:wrap;gap:8px}.invest-detail-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;border:1px solid rgba(167,243,240,.13);background:var(--sfm-card);border-radius:999px;padding:6px 10px;color:var(--sfm-muted);font-size:11px;font-weight:900}.invest-detail-chip b{font-weight:950;color:var(--sfm-muted)}.invest-detail-chip em{font-style:normal;color:var(--sfm-foreground);font-weight:950;overflow-wrap:anywhere}.invest-detail-chip--gain em{color:#047857}.invest-detail-chip--loss em{color:#B91C1C}.invest-holding-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(167,243,240,.1);padding-top:12px}.invest-price-status{display:inline-flex;align-items:center;gap:7px;color:var(--sfm-muted);font-size:12px;font-weight:950}.invest-price-status svg{color:#0f766e}.invest-holding-card--loss .invest-price-status svg,.invest-holding-card--neutral .invest-price-status svg{color:var(--sfm-muted)}.invest-last-updated{font-size:12px;font-weight:900;color:var(--sfm-muted)}.invest-refresh-inline{height:36px;border-radius:12px;border:1px solid rgba(47,214,192,.22);background:rgba(45,212,191,.1);color:#0f766e;padding:0 12px;font:950 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.invest-refresh-inline:disabled{opacity:.65;cursor:wait}.dark .invest-refresh-all,.dark .invest-refresh-inline{color:var(--sfm-soft-cyan);background:rgba(47,214,192,.1)}
        .invest-overlay{position:fixed;inset:0;z-index:80;background:rgba(17,17,17,.42);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:18px}.invest-modal{width:min(780px,100%);max-height:92vh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:26px;box-shadow:0 28px 90px rgba(3,18,37,.3)}.invest-modal-head{position:sticky;top:0;z-index:3;background:rgba(248,251,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(167,243,240,.12);padding:18px 20px;display:flex;justify-content:space-between;align-items:center}.dark .invest-modal-head{background:rgba(15,29,49,.92)}.invest-modal-head h2{margin:0;font-size:21px}.invest-icon-btn{width:38px;height:38px;border-radius:12px;border:1px solid rgba(167,243,240,.18);background:var(--sfm-card);color:var(--sfm-muted);display:grid;place-items:center;cursor:pointer}.invest-form{padding:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.invest-field{display:grid;gap:7px;min-width:0}.invest-field>span{font-size:12px;font-weight:900;color:var(--sfm-muted)}.invest-field b{color:#B91C1C;margin-inline-start:3px}.invest-field textarea{height:auto;min-height:88px;padding-top:12px;resize:vertical}.invest-field small{font-size:11px;color:#B91C1C;font-weight:800}.invest-field em{font-style:normal;font-size:11px;color:var(--sfm-muted);font-weight:850;line-height:1.6}.span-2{grid-column:1/-1}.invest-form-actions{display:flex;justify-content:flex-end;gap:10px}.invest-form-actions.center{justify-content:center}.invest-input-icon,.invest-money-input,.invest-suffix-input,.invest-readonly-money{height:48px;display:flex;align-items:center;gap:8px;border:1.5px solid rgba(167,243,240,.22);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-foreground);min-width:0;transition:all .2s}.invest-input-icon:focus-within,.invest-money-input:focus-within,.invest-suffix-input:focus-within{border-color:var(--sfm-soft-cyan);background:var(--sfm-card);box-shadow:0 0 0 4px rgba(167,243,240,.12)}.invest-input-icon svg{margin-inline-start:13px;color:var(--sfm-muted);flex:0 0 auto}.invest-input-icon input,.invest-money-input input,.invest-suffix-input input{border:0!important;background:transparent!important;box-shadow:none!important;height:100%!important;padding:0 12px!important;min-width:0;flex:1}.invest-money-input>span,.invest-suffix-input>span,.invest-readonly-money>span{height:34px;min-width:58px;margin-inline-start:7px;border-radius:11px;background:rgba(15,118,110,.1);color:#0f766e;display:inline-flex;align-items:center;justify-content:center;font:950 12px Tajawal,Arial,sans-serif;border:1px solid rgba(15,118,110,.15)}.dark .invest-money-input>span,.dark .invest-suffix-input>span,.dark .invest-readonly-money>span{background:rgba(47,214,192,.13);border-color:rgba(47,214,192,.24);color:var(--sfm-soft-cyan)}.invest-readonly-money strong{flex:1;min-width:0;padding-inline:8px;color:var(--sfm-foreground);font:950 14px Arial,sans-serif}.invest-suffix-input>span{margin-inline-start:0;margin-inline-end:7px;min-width:42px}.invest-price-unavailable{height:48px;display:flex;align-items:center;gap:8px;border:1px solid rgba(245,158,11,.24);border-radius:14px;background:rgba(245,158,11,.1);color:#92400E;padding:0 13px;font:900 12px Tajawal,Arial,sans-serif}.dark .invest-price-unavailable{color:#FCD34D;background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.26)}.invest-calculation-card{border:1px solid rgba(47,214,192,.24);border-radius:20px;background:linear-gradient(135deg,rgba(45,212,191,.12),rgba(29,140,255,.08));padding:14px;display:grid;gap:12px;min-width:0}.invest-calculation-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.invest-calculation-head span{font-size:12px;font-weight:950;color:var(--sfm-muted)}.invest-calculation-head button{height:34px;border-radius:12px;border:1px solid rgba(47,214,192,.24);background:rgba(45,212,191,.12);color:#0f766e;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;padding:0 12px}.dark .invest-calculation-head button{color:var(--sfm-soft-cyan);background:rgba(47,214,192,.11)}.invest-calculation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.invest-calculation-grid>div{display:grid;gap:5px;min-width:0;padding:11px;border:1px solid rgba(167,243,240,.16);border-radius:15px;background:rgba(255,255,255,.62)}.dark .invest-calculation-grid>div{background:rgba(15,29,49,.58);border-color:rgba(167,243,240,.14)}.invest-calculation-grid span{font-size:11px;font-weight:950;color:var(--sfm-muted)}.invest-calculation-grid strong{font-size:14px;font-weight:950;color:var(--sfm-foreground);overflow-wrap:anywhere}.invest-calculation-total{border-color:rgba(47,214,192,.32)!important;background:rgba(204,251,241,.7)!important}.dark .invest-calculation-total{background:rgba(47,214,192,.12)!important}.invest-calculation-card small{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.6}.invest-asset-search{position:relative;min-width:0}.invest-asset-results{position:absolute;z-index:6;inset-inline:0;top:calc(100% + 8px);display:grid;gap:8px;padding:10px;border:1px solid rgba(167,243,240,.24);border-radius:18px;background:rgba(255,255,255,.98);box-shadow:0 22px 55px rgba(3,18,37,.18);max-height:320px;overflow:auto}.dark .invest-asset-results{background:rgba(15,29,49,.98);border-color:rgba(167,243,240,.18)}.invest-asset-state{display:grid;gap:6px;justify-items:start;padding:13px;border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-muted);font:850 12px Tajawal,Arial,sans-serif;line-height:1.7}.invest-asset-state strong{color:var(--sfm-foreground);font-size:13px}.invest-asset-state--warning{display:flex;align-items:center;gap:8px;color:#B45309;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.18)}.invest-asset-result{width:100%;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:16px;padding:10px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:start;color:var(--sfm-foreground);cursor:pointer}.invest-asset-result:hover{border-color:rgba(47,214,192,.45);box-shadow:0 10px 24px rgba(15,23,42,.08);transform:translateY(-1px)}.invest-asset-result-icon{width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,rgba(29,140,255,.13),rgba(24,212,212,.16));display:grid;place-items:center;color:#0f766e;font:950 11px Arial,sans-serif}.dark .invest-asset-result-icon{color:var(--sfm-soft-cyan)}.invest-asset-result-body{display:grid;gap:4px;min-width:0}.invest-asset-result-body strong{font-size:13px;font-weight:950;color:var(--sfm-foreground);overflow-wrap:anywhere}.invest-asset-result-body small{font-size:11px;font-weight:850;color:var(--sfm-muted);overflow-wrap:anywhere}.invest-asset-result-price{font:950 12px Arial,sans-serif;color:#0f766e;white-space:nowrap}.dark .invest-asset-result-price{color:var(--sfm-soft-cyan)}.invest-selected-asset{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr) minmax(0,.8fr);gap:10px;padding:12px;border:1px solid rgba(47,214,192,.24);border-radius:18px;background:linear-gradient(135deg,rgba(45,212,191,.12),rgba(29,140,255,.08))}.invest-selected-asset>div,.invest-market-value{background:rgba(255,255,255,.62);border:1px solid rgba(167,243,240,.16);border-radius:15px;padding:11px;display:grid;gap:5px;min-width:0}.dark .invest-selected-asset>div,.dark .invest-market-value{background:rgba(15,29,49,.58);border-color:rgba(167,243,240,.14)}.invest-selected-asset span,.invest-market-value span{display:flex;align-items:center;gap:6px;color:var(--sfm-muted);font-size:11px;font-weight:950}.invest-selected-asset strong,.invest-market-value strong{font-size:14px;color:var(--sfm-foreground);font-weight:950;overflow-wrap:anywhere}.invest-selected-asset small,.invest-market-value small{font-size:11px;color:var(--sfm-muted);font-weight:850;line-height:1.5}.invest-manual-warning{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;border:1px solid rgba(245,158,11,.2);border-radius:17px;background:rgba(245,158,11,.1);color:#92400E;padding:12px}.dark .invest-manual-warning{color:#FCD34D;background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.24)}.invest-manual-warning strong{display:block;margin-bottom:4px;font-size:13px}.invest-manual-warning p{margin:0;font-size:12px;font-weight:850;line-height:1.7}.invest-market-value{align-items:start;background:rgba(236,254,255,.7)}.invest-refresh-wide{width:100%;height:42px;margin-bottom:12px;border-radius:14px;border:1px solid rgba(47,214,192,.22);background:rgba(45,212,191,.1);color:#0f766e;font:950 13px Tajawal,Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.dark .invest-refresh-wide{color:var(--sfm-soft-cyan);background:rgba(47,214,192,.1)}.invest-spin{animation:invest-spin 1s linear infinite}@keyframes invest-spin{to{transform:rotate(360deg)}}.invest-row-actions button:disabled{opacity:.65;cursor:wait}.invest-expand-btn{background:linear-gradient(135deg,rgba(29,140,255,.1),rgba(24,212,212,.1))!important;border-color:rgba(29,140,255,.22)!important;color:var(--sfm-primary)!important;font-weight:950!important}.invest-expand-btn:hover{background:linear-gradient(135deg,rgba(29,140,255,.18),rgba(24,212,212,.18))!important}
        .invest-confirm{position:relative;width:min(430px,100%);background:var(--sfm-card);border-radius:24px;border:1px solid rgba(167,243,240,.18);box-shadow:0 24px 75px rgba(3,18,37,.28);padding:26px;text-align:center}.invest-close{position:absolute;top:14px;inset-inline-end:14px}.invest-confirm-icon{width:62px;height:62px;margin:0 auto 12px;border-radius:20px;background:rgba(185,28,28,.08);color:#B91C1C;display:grid;place-items:center}.invest-confirm h3{margin:0 0 8px}.invest-confirm p{margin:0 0 18px;color:var(--sfm-muted);line-height:1.8;font-weight:800}
        .dark .invest-row-main .invest-asset-value{border-color:rgba(103,232,249,.28);background:rgba(8,47,73,.55);color:#F8FAFC;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 10px 24px rgba(0,0,0,.18)}
        .invest-drawer{width:min(460px,100%);max-height:92vh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:24px;padding:20px;box-shadow:0 28px 90px rgba(3,18,37,.3)}.invest-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.invest-drawer-title{display:flex;align-items:center;gap:12px}.invest-drawer-title>span{width:42px;height:42px;border-radius:14px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.invest-drawer-title p{margin:0 0 4px;color:var(--sfm-muted);font-size:12px;font-weight:900}.invest-drawer-title h3{margin:0;font-size:19px}.invest-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.invest-detail-grid div,.invest-notes-box{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:15px;padding:12px}.invest-detail-grid span,.invest-notes-box strong{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:6px}.invest-detail-grid strong,.invest-notes-box p{margin:0;color:var(--sfm-foreground);font-size:13px;font-weight:800;line-height:1.7}.invest-notes-box{margin-top:10px}
        .invest-toast{position:fixed;z-index:100;inset-inline-end:22px;bottom:22px;background:var(--sfm-foreground);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.28);border-radius:16px;padding:13px 16px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(3,18,37,.2)}.invest-notice{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:15px;padding:12px 14px;margin-bottom:14px;font-weight:800}.invest-loading{padding:34px;text-align:center;color:var(--sfm-muted);font-weight:900}
        @keyframes pulse{50%{opacity:.45}}@media(max-width:1180px){.invest-chart-grid{grid-template-columns:1fr 1fr}.invest-analysis-grid,.invest-portfolio-grid{grid-template-columns:1fr}.invest-holding-primary{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:1024px){.invest-main{width:100%!important;margin-inline-start:0!important;margin-inline-end:0!important;padding:calc(78px + env(safe-area-inset-top)) 16px 52px!important}}@media(max-width:760px){.invest-content{gap:14px}.invest-topbar{align-items:flex-start}.invest-hero{display:grid;padding:22px}.invest-hero h2{font-size:28px}.invest-hero-total{min-width:0}.invest-hero-content .invest-primary-btn,.invest-hero-content .invest-glass-btn{width:100%;margin-inline-start:0;margin-top:8px}.invest-summary-grid,.invest-chart-grid,.invest-projection-grid,.invest-holding-primary{grid-template-columns:1fr}.invest-list-toolbar{grid-template-columns:1fr}.invest-refresh-all{width:100%}.invest-controls{grid-template-columns:1fr}.invest-form{grid-template-columns:1fr}.span-2{grid-column:auto}.invest-section-head--split{display:grid}.invest-section-head--split .invest-secondary-btn{width:100%}.invest-holding-head{display:grid}.invest-holding-actions{justify-content:stretch}.invest-row-main{display:grid}.invest-row-main strong{white-space:normal;overflow-wrap:anywhere}.invest-row-actions button{flex:1}.invest-holding-footer{display:grid;justify-items:stretch}.invest-refresh-inline{width:100%;justify-content:center}.invest-detail-grid{grid-template-columns:1fr}.invest-selected-asset,.invest-calculation-grid{grid-template-columns:1fr}.invest-asset-result{grid-template-columns:34px minmax(0,1fr);align-items:start}.invest-asset-result-price{grid-column:2;justify-self:start}.invest-overlay{align-items:flex-end;padding:0}.invest-modal,.invest-drawer{border-radius:24px 24px 0 0;max-height:95vh}.invest-confirm{margin:16px}}
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
