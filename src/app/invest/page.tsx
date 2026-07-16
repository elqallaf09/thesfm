'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BarChart3, Brain, Layers3, LineChart as LineChartIcon, PieChart as PieChartIcon, Plus, RefreshCw, ShieldAlert, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import type { InvestmentPriceRefreshStatus } from '@/components/invest/InvestmentRow';
import { EmptyState } from '@/components/invest/EmptyState';
import type { MarketLinkEntry } from '@/components/invest/MarketLinkPanel';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import { formatMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import type { MoneyParseStatus } from '@/lib/money';
import { calculateInvestmentHoldingMetrics, investmentLinkedSymbol } from '@/lib/investmentCalculations';
import { investmentSymbol, marketAnalysisUrl } from '@/lib/data/investmentData';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

const InvestmentList = dynamic(
  () => import('@/components/invest/InvestmentList').then(mod => mod.InvestmentList),
  {
    ssr: false,
    loading: () => <section className="invest-panel invest-list-skeleton" aria-hidden="true" />,
  },
);

const InvestmentRow = dynamic(
  () => import('@/components/invest/InvestmentRow').then(mod => mod.InvestmentRow),
  {
    ssr: false,
    loading: () => <div className="invest-row invest-row-skeleton" aria-hidden="true" />,
  },
);

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

const InvestmentFormModal = dynamic(
  () => import('@/components/invest/InvestmentFormModal').then(mod => mod.InvestmentFormModal),
  { ssr: false },
);

const InvestmentDetailDrawer = dynamic(
  () => import('@/components/invest/InvestmentDetailDrawer').then(mod => mod.InvestmentDetailDrawer),
  { ssr: false },
);

const MarketLinkPanel = dynamic(
  () => import('@/components/invest/MarketLinkPanel').then(mod => mod.MarketLinkPanel),
  {
    ssr: false,
    loading: () => <div className="invest-market-rows invest-list-skeleton" aria-hidden="true" />,
  },
);

const ConfirmDeleteModal = dynamic(
  () => import('@/components/invest/ConfirmDeleteModal').then(mod => mod.ConfirmDeleteModal),
  { ssr: false },
);

const TYPES: InvestmentType[] = ['stocks', 'fund', 'crypto', 'gold', 'silver', 'realEstate', 'cash', 'project', 'other'];
const RISKS: RiskLevel[] = ['low', 'medium', 'high'];
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
const RISK_SCORE: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
const LIVE_PRICE_REFRESH_MS = 15_000;
const LIVE_PRICE_BATCH_CONCURRENCY = 4;
const INVEST_TAB_IDS = ['portfolio', 'assets', 'performance', 'risk', 'reports'] as const;
type InvestTab = typeof INVEST_TAB_IDS[number];
const INVEST_TABS_ID = 'investment-workspace';
type PortfolioLiveTrend = {
  direction: 'up' | 'down' | 'flat';
  delta: number;
  percent: number;
  at: string;
};

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

type InvestmentPricePayload = {
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

type MetalsPricePayload = {
  success?: boolean;
  gold?: { price?: number | null; currency?: string | null; unit?: string | null; lastUpdated?: string | null };
  silver?: { price?: number | null; currency?: string | null; unit?: string | null; lastUpdated?: string | null };
  source?: string;
  error?: string;
};

function investmentMetalKind(item: Investment) {
  const normalized = String(item.metalType || item.type || '').trim().toLowerCase();
  if (normalized === 'gold' || normalized === 'silver') return normalized;
  return null;
}

async function fetchMetalInvestmentPrice(item: Investment, targetCurrency: string): Promise<{ responseOk: boolean; payload: InvestmentPricePayload }> {
  const metalKind = investmentMetalKind(item);
  if (!metalKind) {
    return { responseOk: false, payload: { ok: false, code: 'NOT_METAL' } };
  }

  const response = await fetch(`/api/market/metals?currency=${encodeURIComponent(targetCurrency)}`, {
    cache: 'no-store',
  });
  const metals = await response.json() as MetalsPricePayload;
  const metal = metalKind === 'gold' ? metals.gold : metals.silver;
  const price = Number(metal?.price);
  const currency = String(metal?.currency || targetCurrency || '').trim().toUpperCase();

  return {
    responseOk: response.ok,
    payload: {
      ok: Boolean(response.ok && metals.success && Number.isFinite(price) && price > 0),
      code: metals.error || (metals.success ? undefined : 'METALS_PRICE_UNAVAILABLE'),
      item: {
        symbol: metalKind === 'gold' ? 'XAUUSD' : 'XAGUSD',
        provider_symbol: metalKind === 'gold' ? 'XAUUSD' : 'XAGUSD',
        price: Number.isFinite(price) && price > 0 ? price : null,
        currency: currency || null,
        price_unit: metal?.unit || 'gram',
        updated_at: metal?.lastUpdated || new Date().toISOString(),
        source: metals.source ? `metals:${metals.source}` : 'metals',
      },
    },
  };
}

export default function InvestPage() {
  const router = useRouter();
  const { lang, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const { session, isGuest } = useAuth();
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
  const [platformLogos, setPlatformLogos] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useUrlTabState<InvestTab>({
    param: 'tab',
    values: INVEST_TAB_IDS,
    defaultValue: 'portfolio',
    omitDefault: true,
  });
  const [portfolioLiveTrend, setPortfolioLiveTrend] = useState<PortfolioLiveTrend | null>(null);
  const [liveRefreshState, setLiveRefreshState] = useState<'idle' | 'refreshing' | 'error' | 'guest_restricted' | 'offline'>('idle');
  const [lastLiveRefreshAt, setLastLiveRefreshAt] = useState<string | null>(null);
  const insightsRef = useRef<HTMLDivElement | null>(null);
  const autoRefreshedRef = useRef(false);
  const batchPriceRefreshRef = useRef(false);
  const liveRefreshInFlightRef = useRef(false);
  const liveItemsRef = useRef<Investment[]>([]);
  const liveRefreshHandlerRef = useRef<((visibleItems: Investment[], options?: { silent?: boolean }) => Promise<void>) | null>(null);
  const lastPortfolioValueRef = useRef<number | null>(null);
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
    expandDetails: t('invest_list_expand_details'),
    collapseDetails: t('invest_list_collapse_details'),
    moreActions: L('المزيد من الإجراءات', 'More actions', 'Plus d’actions'),
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
    numberOfUnits: t('invest_asset_numberOfUnits'),
    assetQuantity: t('invest_asset_assetQuantity'),
    metalCount: L('عدد القطع', 'Pieces count', 'Nombre de pieces'),
    metalWeight: t('invest_form_grams'),
    currentMarketValue: t('invest_asset_currentMarketValue'),
    currentPrice: t('invest_asset_currentPrice'),
    purchasePrice: L('سعر الشراء', 'Purchase price', 'Prix d’achat'),
    totalInvested: L('إجمالي الاستثمار', 'Total invested', 'Total investi'),
    investedValue: L('القيمة المستثمرة', 'Invested value', 'Valeur investie'),
    averageCost: L('متوسط التكلفة', 'Average cost', 'Coût moyen'),
    todayChange: L('تغير اليوم', 'Today change', 'Variation du jour'),
    profitLoss: L('الربح / الخسارة', 'Profit / loss', 'Profit / perte'),
    profitLossPercent: L('نسبة الربح / الخسارة', 'Profit / loss %', 'Profit / perte %'),
    priceStatus: L('حالة السعر', 'Price status', 'Statut du prix'),
    priceUpdated: L('السعر محدث', 'Price updated', 'Prix actualisé'),
    priceUpdateFailed: L('تعذر تحديث السعر حالياً', 'Could not update the price right now', 'Impossible d’actualiser le prix pour le moment'),
    guestPriceRefreshRestricted: L('التحديث التلقائي متوقف في وضع الضيف', 'Automatic refresh is paused in guest mode', 'L’actualisation automatique est suspendue en mode invité'),
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
    purchasePlatform: t('invest_platform_detail_label'),
    purchasePlatformBadgeTitle: t('invest_platform_badge_title'),
    purchasePlatformPending: t('invest_platform_pending'),
    purchasePlatformNotSpecified: t('invest_platform_not_specified'),
    allPlatforms: t('invest_platform_all'),
    overview: t('invest_card_overview'),
    aiSummary: t('invest_card_ai_summary'),
    allocation: t('invest_card_allocation'),
    performance: t('invest_card_performance'),
    dividends: t('invest_card_dividends'),
    attachments: t('invest_card_attachments'),
    brokerNotes: t('invest_card_broker_notes'),
    transactions: t('invest_card_transactions'),
    priceHistory: t('invest_card_price_history'),
    historyLoading: L('جارٍ تحميل سجل السعر', 'Loading historical prices', 'Chargement de l’historique des prix'),
    historyUnavailable: L('سجل السعر غير متاح من مزود البيانات', 'Historical prices are unavailable from the data provider', 'L’historique des prix est indisponible auprès du fournisseur'),
    period30Days: L('30 يومًا', '30D', '30 j'),
    documents: t('invest_card_documents'),
    noData: t('invest_card_no_data'),
    lifetime: t('invest_card_lifetime'),
    activeStatus: t('invest_card_active'),
    riskShort: t('invest_card_risk'),
    platformTypeLabels: {
      stock_broker: t('invest_platform_type_stock_broker'),
      bank_brokerage: t('invest_platform_type_bank_brokerage'),
      multi_asset_broker: t('invest_platform_type_multi_asset_broker'),
      crypto_exchange: t('invest_platform_type_crypto_exchange'),
      fund_platform: t('invest_platform_type_fund_platform'),
      robo_advisor: t('invest_platform_type_robo_advisor'),
      precious_metals_dealer: t('invest_platform_type_precious_metals_dealer'),
      real_estate_platform: t('invest_platform_type_real_estate_platform'),
      private_investment_provider: t('invest_platform_type_private_investment_provider'),
      other: t('invest_platform_type_other'),
    },
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
    marketSource: t('invest_form_marketSource'),
    investmentCurrency: t('invest_form_investmentCurrency'),
    purchasePricePerShare: t('invest_form_purchasePricePerShare'),
    currentPricePerShare: t('invest_form_currentPricePerShare'),
    purchasePricePerUnit: t('invest_form_purchasePricePerUnit'),
    currentPricePerUnit: t('invest_form_currentPricePerUnit'),
    purchasePricePerCoin: t('invest_form_purchasePricePerCoin'),
    currentPricePerCoin: t('invest_form_currentPricePerCoin'),
    purchasePricePerGram: t('invest_form_purchasePricePerGram'),
    currentPricePerGram: t('invest_form_currentPricePerGram'),
    purchaseTotal: t('invest_form_purchaseTotal'),
    purchaseTotalHelper: t('invest_form_purchaseTotalHelper'),
    cryptoQuantityHelper: t('invest_form_cryptoQuantityHelper'),
    cryptoPurchasePriceHelper: t('invest_form_cryptoPurchasePriceHelper'),
    cryptoPurchaseTotalHelper: t('invest_form_cryptoPurchaseTotalHelper'),
    currentValueAuto: t('invest_form_currentValueAuto'),
    goldProductType: t('invest_form_goldProductType'),
    silverProductType: t('invest_form_silverProductType'),
    grams: t('invest_form_grams'),
    count: t('invest_form_count'),
    metalCount: L('عدد القطع', 'Pieces count', 'Nombre de pieces'),
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
      ten_gram: t('invest_form_silverUnit10Gram'),
      twenty_gram: t('invest_form_silverUnit20Gram'),
      ounce: t('invest_form_silverUnitOunce'),
      lira: t('invest_form_silverUnitLira'),
      half_lira: t('invest_form_silverUnitHalfLira'),
      kilo: t('invest_form_silverUnitKilo'),
      other: t('invest_form_silverUnitOther'),
    },
    propertyTypes: {
      residential: t('invest_form_propertyTypeResidential'),
      commercial: t('invest_form_propertyTypeCommercial'),
      land: t('invest_form_propertyTypeLand'),
      other: t('invest_form_propertyTypeOther'),
    },
    platform: {
      sectionTitle: t('invest_platform_section'),
      contextual: {
        stocks: t('invest_platform_context_stocks'),
        realEstate: t('invest_platform_context_realEstate'),
        fund: t('invest_platform_context_fund'),
        gold: t('invest_platform_context_gold'),
        silver: t('invest_platform_context_silver'),
        cash: t('invest_platform_context_cash'),
        crypto: t('invest_platform_context_crypto'),
        project: t('invest_platform_context_project'),
        other: t('invest_platform_context_other'),
      },
      optional: t('invest_platform_optional'),
      type: t('invest_platform_type'),
      allTypes: t('invest_platform_all_types'),
      search: t('invest_platform_search'),
      noResults: t('invest_platform_no_results'),
      loadFailed: t('invest_platform_load_failed'),
      addNew: t('invest_platform_add_new'),
      addTitle: t('invest_platform_add_new'),
      name: t('invest_platform_name'),
      website: t('invest_platform_website'),
      websiteOptional: t('invest_platform_website_optional'),
      add: t('invest_platform_add'),
      adding: t('invest_platform_adding'),
      cancel: t('cancel'),
      clear: t('invest_platform_clear'),
      selected: t('invest_platform_selected'),
      pending: t('invest_platform_pending'),
      localOnly: t('invest_platform_local_only'),
      notSpecified: t('invest_platform_not_specified'),
      submissionFailed: t('invest_platform_submission_failed'),
      validationInvalid: t('invest_platform_validation_invalid'),
      typeLabels: {
        stock_broker: t('invest_platform_type_stock_broker'),
        bank_brokerage: t('invest_platform_type_bank_brokerage'),
        multi_asset_broker: t('invest_platform_type_multi_asset_broker'),
        crypto_exchange: t('invest_platform_type_crypto_exchange'),
        fund_platform: t('invest_platform_type_fund_platform'),
        robo_advisor: t('invest_platform_type_robo_advisor'),
        precious_metals_dealer: t('invest_platform_type_precious_metals_dealer'),
        real_estate_platform: t('invest_platform_type_real_estate_platform'),
        private_investment_provider: t('invest_platform_type_private_investment_provider'),
        other: t('invest_platform_type_other'),
      },
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
  }), [L, t]);

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
  const formatNativeMoney = useCallback((amount: number | null | undefined, nativeCurrency?: string | null, item?: Investment | null, options?: { unitPrice?: boolean }) => {
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
    if (!options?.unitPrice) {
      return formatCurrency(amount, resolvedCurrency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en');
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
    .filter((item): item is MarketLinkEntry => Boolean(item.symbol)), [items]);
  const liveRefreshableCount = useMemo(() => items.filter(item => investmentLinkedSymbol(item)).length, [items]);
  useEffect(() => {
    if (!items.some(item => item.purchasePlatformId)) return;
    const controller = new AbortController();
    void fetch('/api/investment-platforms?limit=50', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((payload: { items?: Array<{ id: string; logoUrl?: string | null }> } | null) => {
        const entries = (payload?.items ?? [])
          .filter(entry => entry.logoUrl)
          .map(entry => [entry.id, entry.logoUrl as string] as const);
        setPlatformLogos(Object.fromEntries(entries));
      })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setPlatformLogos({});
      });
    return () => controller.abort();
  }, [items]);
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
      throw new Error(payload.error || L('تعذر تحويل القيمة إلى عملة الحساب حالياً', 'Could not convert value to account currency right now.', 'Impossible de convertir la valeur dans la devise du compte pour le moment.'));
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
    const providerSymbol = investmentLinkedSymbol(item);
    if (!providerSymbol) return false;
    const metalKind = investmentMetalKind(item);

    if (isGuest && !metalKind) {
      const restrictedAt = new Date().toISOString();
      setPriceRefreshStatuses(prev => ({
        ...prev,
        [item.id]: { state: 'guest_restricted', message: 'GUEST_RESTRICTION', at: restrictedAt },
      }));
      if (!options?.silent) showToast(labels.guestPriceRefreshRestricted);
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineAt = new Date().toISOString();
      setPriceRefreshStatuses(prev => ({
        ...prev,
        [item.id]: { state: 'offline', message: 'OFFLINE', at: offlineAt },
      }));
      if (!options?.silent) showToast(L('أنت غير متصل بالإنترنت', 'You are offline', 'Vous êtes hors ligne'));
      return false;
    }

    if (!options?.silent) setRefreshingPriceId(item.id);
    try {
      const requestedCurrency = (item.nativeCurrency || item.priceCurrency || item.currency || currency).toUpperCase();
      let responseOk = false;
      let payload: InvestmentPricePayload;

      if (metalKind) {
        const metalResult = await fetchMetalInvestmentPrice(item, requestedCurrency);
        responseOk = metalResult.responseOk;
        payload = metalResult.payload;
      } else {
        const params = new URLSearchParams({
          symbol: providerSymbol,
          displaySymbol: item.symbol || providerSymbol,
          name: item.name,
        });
        if (item.assetType) params.set('assetType', item.assetType);
        if (item.market) params.set('market', item.market);
        if (requestedCurrency) params.set('currency', requestedCurrency);
        const authToken = session?.access_token;
        const response = await fetch(`/api/market/refresh-investment-price?${params.toString()}`, {
          cache: 'no-store',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        responseOk = response.ok;
        payload = await response.json() as InvestmentPricePayload;
      }

      const price = Number(payload.item?.price);
      if (!responseOk || payload.ok === false || !Number.isFinite(price) || price <= 0) {
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

      const nativeCurrency = (payload.item?.currency || requestedCurrency).toUpperCase();
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
      if (!options?.silent) setRefreshingPriceId(null);
    }
  }

  async function handleRefreshPrices(visibleItems: Investment[], options?: { silent?: boolean }) {
    const refreshable = visibleItems.filter(item => investmentLinkedSymbol(item));
    if (refreshable.length === 0 || batchPriceRefreshRef.current) return;
    batchPriceRefreshRef.current = true;
    if (!options?.silent) setRefreshingAllPrices(true);
    try {
      let updatedCount = 0;
      const canRefreshInParallel = Boolean(session?.access_token) && refreshable.length > 1;
      if (canRefreshInParallel) {
        for (let index = 0; index < refreshable.length; index += LIVE_PRICE_BATCH_CONCURRENCY) {
          const batch = refreshable.slice(index, index + LIVE_PRICE_BATCH_CONCURRENCY);
          const results = await Promise.all(batch.map(item => handleRefreshPrice(item, { silent: true })));
          updatedCount += results.filter(Boolean).length;
        }
      } else {
        for (const item of refreshable) {
          const updated = await handleRefreshPrice(item, { silent: true });
          if (updated) updatedCount += 1;
        }
      }
      if (!options?.silent) {
        showToast(updatedCount === refreshable.length ? t('invest_asset_priceUpdated') : labels.priceUpdateFailed);
      }
    } finally {
      batchPriceRefreshRef.current = false;
      if (!options?.silent) setRefreshingAllPrices(false);
    }
  }

  useEffect(() => {
    liveItemsRef.current = items;
  }, [items]);

  useEffect(() => {
    liveRefreshHandlerRef.current = handleRefreshPrices;
  });

  useEffect(() => {
    if (isLoading) return;

    const previous = lastPortfolioValueRef.current;
    const current = Number(totalValue.toFixed(3));

    if (previous === null) {
      lastPortfolioValueRef.current = current;
      return;
    }

    const delta = current - previous;
    const epsilon = Math.max(0.001, Math.abs(previous) * 0.000001);
    if (Math.abs(delta) <= epsilon) return;

    lastPortfolioValueRef.current = current;
    setPortfolioLiveTrend({
      direction: delta > 0 ? 'up' : 'down',
      delta,
      percent: previous > 0 ? (delta / previous) * 100 : 0,
      at: new Date().toISOString(),
    });
  }, [isLoading, totalValue]);

  useEffect(() => {
    if (isLoading) return;

    if (isGuest) {
      setLiveRefreshState('guest_restricted');
      return;
    }

    let cancelled = false;
    const runLiveRefresh = async () => {
      if (cancelled || liveRefreshInFlightRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLiveRefreshState('offline');
        return;
      }

      const refreshable = liveItemsRef.current.filter(item => investmentLinkedSymbol(item));
      if (refreshable.length === 0) {
        setLiveRefreshState('idle');
        return;
      }

      liveRefreshInFlightRef.current = true;
      setLiveRefreshState('refreshing');
      try {
        await liveRefreshHandlerRef.current?.(refreshable, { silent: true });
        if (!cancelled) {
          setLiveRefreshState('idle');
          setLastLiveRefreshAt(new Date().toISOString());
        }
      } catch {
        if (!cancelled) setLiveRefreshState('error');
      } finally {
        liveRefreshInFlightRef.current = false;
      }
    };

    void runLiveRefresh();
    const interval = window.setInterval(() => void runLiveRefresh(), LIVE_PRICE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isGuest, isLoading]);

  // Auto-refresh market prices on first load for investments missing current price
  useEffect(() => {
    if (isLoading || isGuest || autoRefreshedRef.current) return;
    const stale = items.filter(
      item => investmentLinkedSymbol(item) && !item.lastPrice && !item.currentPrice
    );
    if (stale.length === 0) return;
    autoRefreshedRef.current = true;
    void handleRefreshPrices(stale, { silent: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, isLoading, items]);

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
  const PortfolioMoveIcon = portfolioLiveTrend?.direction === 'down'
    ? TrendingDown
    : portfolioLiveTrend?.direction === 'up'
      ? TrendingUp
      : RefreshCw;
  const liveTrendClass = portfolioLiveTrend?.direction ?? 'flat';
  const liveDeltaText = portfolioLiveTrend
    ? `${portfolioLiveTrend.delta > 0 ? '+' : '-'}${money(Math.abs(portfolioLiveTrend.delta))}`
    : L('بانتظار أول تحديث مباشر', 'Waiting for first live update', 'En attente de la premiere mise a jour');
  const liveDeltaPercentText = portfolioLiveTrend
    ? `${portfolioLiveTrend.delta > 0 ? '+' : '-'}${Math.abs(portfolioLiveTrend.percent).toFixed(2)}%`
    : '';
  const liveUpdatedText = lastLiveRefreshAt
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { timeStyle: 'medium' }).format(new Date(lastLiveRefreshAt))
    : L('لم يبدأ بعد', 'Not started yet', 'Pas encore demarre');
  const liveRefreshCopy = liveRefreshState === 'refreshing'
    ? L('تحديث الأسعار الآن', 'Refreshing prices now', 'Actualisation des prix')
    : liveRefreshState === 'guest_restricted'
      ? labels.guestPriceRefreshRestricted
      : liveRefreshState === 'offline'
        ? L('التحديث متوقف حتى عودة الاتصال', 'Refresh paused until you are back online', 'Actualisation suspendue jusqu’au retour de la connexion')
    : liveRefreshState === 'error'
      ? L('تعذر آخر تحديث مباشر', 'Last live refresh failed', 'Derniere actualisation echouee')
      : L(`تحديث حي كل ${LIVE_PRICE_REFRESH_MS / 1000} ثواني`, `Live refresh every ${LIVE_PRICE_REFRESH_MS / 1000}s`, `Actualisation toutes les ${LIVE_PRICE_REFRESH_MS / 1000}s`);

  return (
    <div className="invest-shell" dir={dir}>
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
          <div className={`invest-hero-total invest-hero-total--${liveTrendClass}`}>
            <div className="invest-live-icon" aria-hidden="true">
              <PortfolioMoveIcon size={25} className={liveRefreshState === 'refreshing' && !portfolioLiveTrend ? 'invest-spin' : undefined} />
            </div>
            <span>{t('invest_summary_portfolioValue')}</span>
            <strong>{money(totalValue)}</strong>
            <div className="invest-live-delta">
              <b>{liveDeltaText}</b>
              {liveDeltaPercentText && <em dir="ltr">{liveDeltaPercentText}</em>}
            </div>
            <small>
              {liveRefreshCopy} · {L('آخر تحديث', 'Last update', 'Derniere mise a jour')}: <b dir="ltr">{liveUpdatedText}</b>
            </small>
            {liveRefreshableCount > 0 && (
              <small className="invest-live-count">
                {L(`متابعة ${liveRefreshableCount} أصل مرتبط بالسوق`, `Watching ${liveRefreshableCount} market-linked asset(s)`, `${liveRefreshableCount} actif(s) relies au marche`)}
              </small>
            )}
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
                <strong dir="ltr">{lastValuationUpdate ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastValuationUpdate)) : labels.unavailable}</strong>
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
              idBase={INVEST_TABS_ID}
              sticky
              mobileMode="scroll"
            />

            <PageTabPanel idBase={INVEST_TABS_ID} value={activeTab} active>
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
                    platformLogoUrl={item.purchasePlatformId ? platformLogos[item.purchasePlatformId] : null}
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
                <MarketLinkPanel
                  entries={marketLinkedInvestments}
                  labels={{
                    search: labels.search,
                    sortBy: labels.sortBy,
                    sortName: L('الاسم', 'Name', 'Nom'),
                    sortSymbol: L('الرمز', 'Symbol', 'Symbole'),
                    connected: L('مرتبط بالسوق', 'Market linked', 'Lié au marché'),
                    openAnalysis: L('فتح التحليل', 'Open analysis', 'Ouvrir l’analyse'),
                    holdingsCount: L('{count} حيازات', '{count} holdings', '{count} positions'),
                    noResults: L('لا توجد نتائج مطابقة', 'No matching assets', 'Aucun actif correspondant'),
                  }}
                  onOpen={symbol => router.push(marketAnalysisUrl(symbol))}
                />
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
              platformLogos={platformLogos}
            />
            )}
            </PageTabPanel>
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
          authToken={session?.access_token}
          isGuest={isGuest}
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
