'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Coins,
  FolderKanban,
  Gem,
  Home,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { getCurrency } from '@/lib/currencies';
import { formatMarketPrice } from '@/lib/market/marketCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Investment, InvestmentInput, InvestmentType, RiskLevel } from '@/types/investment';

type Mode = 'create' | 'edit';
type SearchState = 'idle' | 'loading' | 'ready' | 'error';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type FxState = {
  state: LoadState;
  from: string;
  to: string;
  rate: number | null;
  source?: string | null;
  lastUpdated?: string | null;
  message?: string;
};

type AssetSearchItem = {
  name: string;
  name_ar?: string;
  name_en?: string;
  symbol: string;
  provider_symbol: string | null;
  market: string | null;
  market_ar?: string;
  market_en?: string;
  country?: string;
  asset_type: string;
  currency: string | null;
  price: number | null;
  change?: number | null;
  change_percent?: number | null;
  updated_at: string | null;
  source: string;
  search_source?: string;
  available: boolean;
  unavailable_reason?: string;
};

type ProjectOption = {
  id: string;
  name: string;
  budget?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  notes?: Record<string, unknown> | null;
};

type MetalPrice = {
  price: number;
  currency: string;
  unit: 'gram';
  lastUpdated: string;
};

type MetalsState = {
  state: LoadState;
  currency: string;
  source: string;
  gold: MetalPrice | null;
  silver: MetalPrice | null;
  message?: string;
};

interface Props {
  open: boolean;
  mode: Mode;
  currency: string;
  dir: 'rtl' | 'ltr';
  labels: {
    titleAdd: string;
    titleEdit: string;
    close: string;
    name: string;
    namePlaceholder: string;
    type: string;
    currentValue: string;
    currentSharePrice: string;
    currentMarketValue: string;
    quantity: string;
    numberOfUnits: string;
    assetQuantity: string;
    quantityHelper: string;
    currentPriceUnavailable: string;
    recalculate: string;
    monthly: string;
    startDate: string;
    risk: string;
    expectedReturn: string;
    notes: string;
    save: string;
    update: string;
    cancel: string;
    assetSearchLoading: string;
    assetSearchNoResultsTitle: string;
    assetSearchNoResultsBody: string;
    assetSearchProviderUnavailable: string;
    selectedAsset: string;
    currentPrice: string;
    lastUpdated: string;
    dataSource: string;
    unavailable: string;
    fetchedPriceNote: string;
    manualLinkWarningTitle: string;
    manualLinkWarningBody: string;
    totalMarketValue: string;
    assetTypes: Record<string, string>;
    sectionAssetData?: string;
    sectionQuantity?: string;
    sectionPricing?: string;
    sectionDetails?: string;
    assetSearchPlaceholder?: string;
    cryptoSearchPlaceholder?: string;
    fundSearchPlaceholder?: string;
    purchasePrice?: string;
    investmentAmount?: string;
    currency?: string;
    metalProductType?: string;
    goldProductType?: string;
    silverProductType?: string;
    goldKarat?: string;
    silverPurity?: string;
    customPurity?: string;
    grams?: string;
    pureGoldGrams?: string;
    pureSilverGrams?: string;
    estimatedValue?: string;
    pricePerGram?: string;
    metalsPriceLoading?: string;
    metalsPriceUnavailable?: string;
    chooseProject?: string;
    noProjectsTitle?: string;
    noProjectsBody?: string;
    addProject?: string;
    projectBudget?: string;
    projectStatus?: string;
    manualValue?: string;
    cashBankName?: string;
    propertyLocation?: string;
    calculationSummary?: string;
    errors: {
      nameRequired: string;
      valuePositive: string;
      contributionPositive: string;
      quantityPositive: string;
      returnRange: string;
      assetRequired?: string;
      projectRequired?: string;
      gramsPositive?: string;
      metalPriceRequired?: string;
      startDateRequired?: string;
      purityRequired?: string;
    };
  };
  typeOptions: InvestmentType[];
  riskOptions: RiskLevel[];
  typeLabel: (type: InvestmentType) => string;
  riskLabel: (risk: RiskLevel) => string;
  initialValues?: Investment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: InvestmentInput) => Promise<void> | void;
}

const GOLD_PRODUCTS = [
  { value: 'bar', labelAr: 'سبيكة', grams: null, karat: 24, manual: true },
  { value: 'lira', labelAr: 'ليرة', grams: 7.2, karat: 22, manual: false },
  { value: 'half_lira', labelAr: 'نصف ليرة', grams: 3.6, karat: 22, manual: false },
  { value: 'quarter_lira', labelAr: 'ربع ليرة', grams: 1.8, karat: 22, manual: false },
  { value: 'makhmus', labelAr: 'مخمس', grams: 36, karat: 22, manual: false },
  { value: 'half_makhmus', labelAr: 'نصف مخمس', grams: 18, karat: 22, manual: false },
  { value: 'ten_tola', labelAr: '10 توله', grams: 116.64, karat: 24, manual: false },
  { value: 'custom_grams', labelAr: 'وزن مخصص بالجرام', grams: null, karat: 24, manual: true },
] as const;

const SILVER_PRODUCTS = [
  { value: 'bar', labelAr: 'سبيكة', grams: null, manual: true },
  { value: 'ounce', labelAr: 'أونصة', grams: 31.1035, manual: false },
  { value: 'kilo', labelAr: 'كيلو', grams: 1000, manual: false },
  { value: 'custom_grams', labelAr: 'وزن مخصص بالجرام', grams: null, manual: true },
] as const;

const KARATS = [24, 22, 21, 18];
const SILVER_PURITIES = [
  { value: '999', label: '999', numeric: 999 },
  { value: '925', label: '925', numeric: 925 },
  { value: 'custom', label: 'مخصص', numeric: null },
] as const;

const MARKET_TYPES: InvestmentType[] = ['stocks', 'fund', 'crypto'];

function parseDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInputNumber(value: number | null | undefined, max = 10) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return Number(value.toFixed(max)).toString();
}

function formatNumber(value: number, decimals = 4) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatPreciseNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value > 0 && value < 1 ? 10 : 4,
  });
}

function isMarketType(type: InvestmentType) {
  return MARKET_TYPES.includes(type);
}

function assetInvestmentType(assetType: string): InvestmentType {
  const normalized = assetType.toLowerCase();
  if (normalized === 'stock') return 'stocks';
  if (normalized === 'etf' || normalized === 'index' || normalized === 'fund') return 'fund';
  if (normalized === 'crypto') return 'crypto';
  if (normalized === 'gold') return 'gold';
  if (normalized === 'commodity') return 'other';
  if (normalized === 'forex') return 'cash';
  return 'other';
}

function assetFromInvestment(item: Investment | null | undefined): AssetSearchItem | null {
  const symbol = item?.symbol || item?.providerSymbol;
  if (!item || !symbol || !isMarketType(item.type)) return null;
  return {
    name: item.name,
    name_en: item.name,
    symbol,
    provider_symbol: item.providerSymbol ?? item.symbol ?? null,
    market: item.market ?? null,
    asset_type: item.assetType ?? (item.type === 'fund' ? 'etf' : item.type === 'crypto' ? 'crypto' : 'stock'),
    currency: item.currency ?? null,
    price: item.lastPrice ?? item.currentPrice ?? null,
    updated_at: item.lastPriceUpdatedAt ?? null,
    source: item.dataSource ?? item.priceSource ?? 'Market data provider',
    available: typeof (item.lastPrice ?? item.currentPrice) === 'number' && Number.isFinite(item.lastPrice ?? item.currentPrice),
  };
}

function labelOf<T extends readonly { value: string; labelAr: string }[]>(items: T, value: string) {
  return items.find(item => item.value === value)?.labelAr ?? value;
}

function localizedAssetName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.name_ar || asset.name || asset.name_en || asset.symbol;
  return asset.name_en || asset.name || asset.name_ar || asset.symbol;
}

function localizedMarketName(asset: AssetSearchItem, dir: 'rtl' | 'ltr') {
  if (dir === 'rtl') return asset.market_ar || asset.market || asset.market_en || '';
  return asset.market_en || asset.market || asset.market_ar || '';
}

function getQuantityLabel(type: InvestmentType, assetType: string | undefined, labels: Props['labels']) {
  if (type === 'crypto') return labels.assetQuantity;
  const normalized = String(assetType ?? '').toLowerCase();
  if (normalized === 'etf' || normalized === 'fund' || normalized === 'index' || type === 'fund') return labels.numberOfUnits;
  return labels.quantity;
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function projectNumber(value: unknown) {
  const parsed = parseDecimal(typeof value === 'string' || typeof value === 'number' ? value : undefined);
  return parsed && parsed > 0 ? parsed : null;
}

function projectBudget(project: ProjectOption | null) {
  if (!project) return null;
  return projectNumber(project.budget)
    ?? projectNumber(project.notes?.capital)
    ?? projectNumber(project.notes?.currentValue)
    ?? projectNumber(project.notes?.estimatedValue);
}

function sourceLabel(source: string | undefined) {
  if (!source) return '';
  return source === 'api' ? 'Metals API / Yahoo Finance' : source;
}

function metalProductGrams(type: InvestmentType, product: string | undefined) {
  if (type === 'gold') return GOLD_PRODUCTS.find(item => item.value === product)?.grams ?? null;
  if (type === 'silver') return SILVER_PRODUCTS.find(item => item.value === product)?.grams ?? null;
  return null;
}

export function InvestmentFormModal({
  open,
  mode,
  currency,
  dir,
  labels,
  typeOptions,
  riskOptions,
  typeLabel,
  riskLabel,
  initialValues,
  saving,
  onClose,
  onSave,
}: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stocks');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualValueEdited, setManualValueEdited] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchItem | null>(null);
  const [searchResults, setSearchResults] = useState<AssetSearchItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [goldProduct, setGoldProduct] = useState('bar');
  const [goldKarat, setGoldKarat] = useState('24');
  const [silverProduct, setSilverProduct] = useState('bar');
  const [silverPurity, setSilverPurity] = useState('999');
  const [customPurity, setCustomPurity] = useState('99.9');
  const [metalGrams, setMetalGrams] = useState('');
  const [metals, setMetals] = useState<MetalsState>({
    state: 'idle',
    currency,
    source: '',
    gold: null,
    silver: null,
  });
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsState, setProjectsState] = useState<LoadState>('idle');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [fx, setFx] = useState<FxState>({ state: 'idle', from: '', to: '', rate: null });
  const [fxReloadKey, setFxReloadKey] = useState(0);

  const currencyInfo = useMemo(() => getCurrency(currency), [currency]);
  const accountCurrency = (currencyInfo.code || currency || 'KWD').toUpperCase();
  const selectedPrice = selectedAsset?.price ?? null;
  const hasLinkedPrice = selectedPrice !== null && Number.isFinite(selectedPrice) && selectedPrice > 0;
  const quantityValue = parseDecimal(quantity);
  const hasQuantity = quantityValue !== null && quantityValue > 0;
  const isMetal = type === 'gold' || type === 'silver';
  const metalUnitQuantity = isMetal && hasQuantity ? quantityValue : isMetal ? 1 : null;
  const selectedAssetCurrency = selectedAsset?.currency || initialValues?.currency || currencyInfo.code || currency;
  const activeCurrency = selectedAssetCurrency.toUpperCase();
  const metalCurrency = (metals.gold?.currency || metals.silver?.currency || currencyInfo.code || currency).toUpperCase();
  const selectedProject = projects.find(project => project.id === selectedProjectId) ?? null;
  const selectedMatchesName = Boolean(selectedAsset && name.trim() === localizedAssetName(selectedAsset, dir));
  const assetSearchType = type === 'fund' ? 'etf' : type === 'crypto' ? 'crypto' : type === 'stocks' ? 'stock' : undefined;
  const shouldSearchAssets = open && isMarketType(type);
  const quantityLabel = isMetal ? labels.numberOfUnits : getQuantityLabel(type, selectedAsset?.asset_type, labels);
  const goldConfig = GOLD_PRODUCTS.find(product => product.value === goldProduct) ?? GOLD_PRODUCTS[0];
  const silverConfig = SILVER_PRODUCTS.find(product => product.value === silverProduct) ?? SILVER_PRODUCTS[0];
  const gramsValue = parseDecimal(metalGrams);
  const karatValue = parseDecimal(goldKarat) ?? 24;
  const selectedSilverPurity = SILVER_PURITIES.find(item => item.value === silverPurity) ?? SILVER_PURITIES[0];
  const silverPurityValue = selectedSilverPurity.numeric ?? (parseDecimal(customPurity) !== null ? (parseDecimal(customPurity)! * 10) : null);
  const silverPurityRatio = silverPurityValue !== null ? silverPurityValue / 1000 : null;
  const totalMetalGrams = isMetal && gramsValue !== null && gramsValue > 0 ? gramsValue * (metalUnitQuantity ?? 1) : null;
  const pureGoldGrams = type === 'gold' && totalMetalGrams !== null && totalMetalGrams > 0 ? totalMetalGrams * (karatValue / 24) : null;
  const pureSilverGrams = type === 'silver' && totalMetalGrams !== null && totalMetalGrams > 0 && silverPurityRatio !== null ? totalMetalGrams * silverPurityRatio : null;
  const goldPrice = metals.gold?.price ?? null;
  const silverPrice = metals.silver?.price ?? null;
  const assetMarketValue = hasLinkedPrice && hasQuantity ? selectedPrice * quantityValue : null;
  const goldMarketValue = pureGoldGrams !== null && goldPrice !== null && goldPrice > 0 ? pureGoldGrams * goldPrice : null;
  const silverMarketValue = pureSilverGrams !== null && silverPrice !== null && silverPrice > 0 ? pureSilverGrams * silverPrice : null;
  const calculatedValue = type === 'gold'
    ? goldMarketValue
    : type === 'silver'
      ? silverMarketValue
      : isMarketType(type)
        ? assetMarketValue
        : null;
  const formCurrency = type === 'gold' || type === 'silver' ? metalCurrency : activeCurrency;
  const nativeMarketValue = calculatedValue ?? parseDecimal(currentValue);
  const valueForValidation = nativeMarketValue;
  const isSameAccountCurrency = formCurrency === accountCurrency;
  const convertedMarketValue = nativeMarketValue !== null && nativeMarketValue > 0
    ? isSameAccountCurrency
      ? nativeMarketValue
      : fx.state === 'ready' && fx.rate !== null
        ? nativeMarketValue * fx.rate
        : null
    : null;
  const isManualMarketValue = calculatedValue === null && (isMarketType(type) || type === 'gold' || type === 'silver');
  const locale = dir === 'rtl' ? 'ar' : 'en';

  const C = useMemo(() => ({
    sectionAssetData: labels.sectionAssetData || 'بيانات الأصل',
    sectionQuantity: labels.sectionQuantity || 'الكمية أو الوزن',
    sectionPricing: labels.sectionPricing || 'السعر والقيمة الحالية',
    sectionDetails: labels.sectionDetails || 'تفاصيل إضافية',
    assetSearchPlaceholder: labels.assetSearchPlaceholder || 'ابحث باسم السهم أو الرمز مثل: Apple, AAPL, QQQ, SPY',
    cryptoSearchPlaceholder: labels.cryptoSearchPlaceholder || 'ابحث عن العملة الرقمية مثل: BTC, ETH, SOL',
    fundSearchPlaceholder: labels.fundSearchPlaceholder || 'ابحث باسم الصندوق أو الرمز مثل: QQQ, SPY',
    purchasePrice: labels.purchasePrice || 'سعر الشراء اختياري',
    investmentAmount: labels.investmentAmount || 'مبلغ الاستثمار',
    currency: labels.currency || 'العملة',
    goldProductType: labels.goldProductType || 'نوع الذهب',
    silverProductType: labels.silverProductType || 'نوع الفضة',
    goldKarat: labels.goldKarat || 'العيار',
    silverPurity: labels.silverPurity || 'النقاء',
    customPurity: labels.customPurity || 'النقاء %',
    grams: labels.grams || 'الوزن بالجرام',
    pureGoldGrams: labels.pureGoldGrams || 'صافي الذهب الخالص',
    pureSilverGrams: labels.pureSilverGrams || 'صافي الفضة الخالصة',
    estimatedValue: labels.estimatedValue || 'القيمة التقديرية',
    pricePerGram: labels.pricePerGram || 'سعر الجرام',
    metalsPriceLoading: labels.metalsPriceLoading || 'جارٍ جلب أسعار المعادن الحقيقية...',
    metalsPriceUnavailable: labels.metalsPriceUnavailable || 'تعذر جلب سعر المعدن الحقيقي حالياً. يمكنك إدخال القيمة يدوياً مع حفظها كقيمة غير مرتبطة بسعر مباشر.',
    chooseProject: labels.chooseProject || 'اختر المشروع',
    noProjectsTitle: labels.noProjectsTitle || 'لا توجد مشاريع بعد',
    noProjectsBody: labels.noProjectsBody || 'أضف مشروعاً أولاً ثم اربطه بالاستثمار.',
    addProject: labels.addProject || 'إضافة مشروع جديد',
    projectBudget: labels.projectBudget || 'ميزانية المشروع',
    projectStatus: labels.projectStatus || 'حالة المشروع',
    manualValue: labels.manualValue || 'القيمة اليدوية الحالية',
    cashBankName: labels.cashBankName || 'اسم البنك أو الوديعة',
    propertyLocation: labels.propertyLocation || 'اسم العقار أو الموقع',
    calculationSummary: labels.calculationSummary || 'ملخص الحساب',
    accountCurrencyValue: 'القيمة بعملة الحساب',
    nativeValue: 'القيمة الأصلية',
    fxRate: 'سعر الصرف',
    fxSource: 'مصدر سعر الصرف',
    sameAccountCurrency: 'نفس عملة الحساب',
    conversionLoading: 'جاري تحويل القيمة إلى عملة الحساب...',
    conversionUnavailable: 'تعذر تحويل القيمة إلى عملة الحساب حالياً',
    retryFx: 'إعادة المحاولة',
    realFxBadge: 'سعر صرف حقيقي',
    totalWeight: 'الوزن الإجمالي',
  }), [labels]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSearchResults([]);
    setSearchState('idle');

    if (mode === 'edit' && initialValues) {
      const initialProduct = initialValues.type === 'gold'
        ? initialValues.metalProductType || 'bar'
        : initialValues.type === 'silver'
          ? initialValues.metalProductType || 'bar'
          : undefined;
      const fixedGrams = metalProductGrams(initialValues.type, initialProduct);
      const inferredMetalQuantity = (initialValues.type === 'gold' || initialValues.type === 'silver')
        ? initialValues.quantity ?? (fixedGrams && initialValues.grams ? initialValues.grams / fixedGrams : 1)
        : initialValues.quantity;
      const baseMetalGrams = (initialValues.type === 'gold' || initialValues.type === 'silver')
        ? fixedGrams ?? initialValues.grams
        : initialValues.grams;

      setName(initialValues.name);
      setType(initialValues.type);
      setCurrentValue(toInputNumber(initialValues.nativeMarketValue ?? initialValues.currentMarketValue ?? initialValues.currentValue, 10));
      setManualValueEdited(false);
      setMonthlyContribution(toInputNumber(initialValues.monthlyContribution, 10));
      setQuantity(toInputNumber(inferredMetalQuantity, 10));
      setPurchasePrice(toInputNumber(initialValues.purchasePrice, 10));
      setStartDate(initialValues.startDate);
      setRiskLevel(initialValues.riskLevel);
      setExpectedReturn(initialValues.expectedAnnualReturn === undefined ? '' : toInputNumber(initialValues.expectedAnnualReturn, 4));
      setNotes(initialValues.notes || '');
      setSelectedAsset(assetFromInvestment(initialValues));
      setSelectedProjectId(initialValues.projectId || '');
      setGoldProduct(initialValues.type === 'gold' && initialProduct ? initialProduct : 'bar');
      setGoldKarat(initialValues.metalKarat ? toInputNumber(initialValues.metalKarat, 4) : '24');
      setSilverProduct(initialValues.type === 'silver' && initialProduct ? initialProduct : 'bar');
      setSilverPurity(initialValues.metalPurity ? (initialValues.metalPurity === 999 || initialValues.metalPurity === 925 ? String(initialValues.metalPurity) : 'custom') : '999');
      setCustomPurity(initialValues.metalPurity && initialValues.metalPurity !== 999 && initialValues.metalPurity !== 925 ? toInputNumber(initialValues.metalPurity / 10, 4) : '99.9');
      setMetalGrams(toInputNumber(baseMetalGrams, 10));
      return;
    }

    setName('');
    setType('stocks');
    setCurrentValue('');
    setManualValueEdited(false);
    setMonthlyContribution('');
    setQuantity('');
    setPurchasePrice('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setRiskLevel('medium');
    setExpectedReturn('');
    setNotes('');
    setSelectedAsset(null);
    setSelectedProjectId('');
    setGoldProduct('bar');
    setGoldKarat('24');
    setSilverProduct('bar');
    setSilverPurity('999');
    setCustomPurity('99.9');
    setMetalGrams('');
  }, [initialValues, mode, open]);

  useEffect(() => {
    if (!open || !shouldSearchAssets) return;
    const query = name.trim();
    if (query.length < 2 || selectedMatchesName) {
      setSearchResults([]);
      setSearchState('idle');
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchState('loading');
      try {
        const params = new URLSearchParams({ q: query });
        if (assetSearchType) params.set('assetType', assetSearchType);
        const response = await fetch(`/api/market/search-assets?${params.toString()}`, {
          cache: 'no-store',
        });
        const payload = await response.json() as { ok?: boolean; items?: AssetSearchItem[] };
        if (cancelled) return;
        if (!response.ok || payload.ok === false) {
          setSearchResults([]);
          setSearchState('error');
          return;
        }
        setSearchResults(Array.isArray(payload.items) ? payload.items : []);
        setSearchState('ready');
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchState('error');
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [assetSearchType, name, open, selectedMatchesName, shouldSearchAssets]);

  useEffect(() => {
    if (!open || (type !== 'gold' && type !== 'silver')) return;
    let cancelled = false;

    async function loadMetals() {
      setMetals(prev => ({ ...prev, state: 'loading', message: undefined }));
      const targets = Array.from(new Set([currency.toUpperCase(), 'USD']));
      for (const target of targets) {
        try {
          const response = await fetch(`/api/market/metals?currency=${encodeURIComponent(target)}`, { cache: 'no-store' });
          const payload = await response.json() as {
            success?: boolean;
            source?: string;
            gold?: MetalPrice;
            silver?: MetalPrice;
            error?: string;
          };
          const gold = payload.gold?.price && payload.gold.price > 0 ? payload.gold : null;
          const silver = payload.silver?.price && payload.silver.price > 0 ? payload.silver : null;
          if (!cancelled && response.ok && payload.success && payload.source !== 'mock' && gold && silver) {
            setMetals({
              state: 'ready',
              currency: gold.currency || silver.currency || target,
              source: sourceLabel(payload.source) || 'Metals API / Yahoo Finance',
              gold,
              silver,
            });
            return;
          }
        } catch {
          // Try the next real currency target before surfacing an error.
        }
      }

      if (!cancelled) {
        setMetals({
          state: 'error',
          currency: currency.toUpperCase(),
          source: '',
          gold: null,
          silver: null,
          message: C.metalsPriceUnavailable,
        });
      }
    }

    void loadMetals();
    return () => {
      cancelled = true;
    };
  }, [C.metalsPriceUnavailable, currency, open, type]);

  useEffect(() => {
    if (!open || type !== 'project') return;
    let cancelled = false;

    async function loadProjects() {
      if (!user) {
        setProjects([]);
        setProjectsState('ready');
        return;
      }
      setProjectsState('loading');
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,budget,status,notes,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        setProjects([]);
        setProjectsState('error');
        return;
      }
      setProjects((data ?? []).map((project: any) => ({
        id: project.id,
        name: project.name || project.title || project.id,
        budget: project.budget ?? null,
        status: project.status ?? project.notes?.status ?? null,
        notes: project.notes ?? null,
        created_at: project.created_at ?? null,
        updated_at: project.updated_at ?? null,
      })));
      setProjectsState('ready');
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [open, type, user]);

  useEffect(() => {
    if (!open || manualValueEdited || calculatedValue === null) return;
    setCurrentValue(toInputNumber(calculatedValue, 10));
  }, [calculatedValue, manualValueEdited, open]);

  useEffect(() => {
    if (!open || !formCurrency || !accountCurrency) {
      setFx({ state: 'idle', from: '', to: '', rate: null });
      return;
    }
    if (formCurrency === accountCurrency) {
      setFx({
        state: 'ready',
        from: formCurrency,
        to: accountCurrency,
        rate: 1,
        source: 'same_currency',
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setFx({ state: 'loading', from: formCurrency, to: accountCurrency, rate: null });
      try {
        const params = new URLSearchParams({ from: formCurrency, to: accountCurrency });
        const response = await fetch(`/api/market/fx/rate?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json() as {
          ok?: boolean;
          rate?: number | null;
          source?: string | null;
          lastUpdated?: string | null;
          error?: string;
        };
        if (cancelled) return;
        const rate = Number(payload.rate);
        if (!response.ok || payload.ok === false || !Number.isFinite(rate) || rate <= 0) {
          setFx({
            state: 'error',
            from: formCurrency,
            to: accountCurrency,
            rate: null,
            message: payload.error || C.conversionUnavailable,
          });
          return;
        }
        setFx({
          state: 'ready',
          from: formCurrency,
          to: accountCurrency,
          rate,
          source: payload.source || 'FX provider',
          lastUpdated: payload.lastUpdated || new Date().toISOString(),
        });
      } catch {
        if (!cancelled) {
          setFx({
            state: 'error',
            from: formCurrency,
            to: accountCurrency,
            rate: null,
            message: C.conversionUnavailable,
          });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [accountCurrency, C.conversionUnavailable, formCurrency, fxReloadKey, open]);

  useEffect(() => {
    if (!open || type !== 'gold') return;
    if (goldConfig.grams !== null) setMetalGrams(toInputNumber(goldConfig.grams, 4));
    if (goldConfig.karat) setGoldKarat(String(goldConfig.karat));
  }, [goldConfig, open, type]);

  useEffect(() => {
    if (!open || type !== 'silver') return;
    if (silverConfig.grams !== null) setMetalGrams(toInputNumber(silverConfig.grams, 4));
  }, [open, silverConfig, type]);

  useEffect(() => {
    if (!selectedProject) return;
    setName(selectedProject.name);
  }, [selectedProject]);

  function buildErrors() {
    const nextErrors: Record<string, string> = {};
    const monthly = parseDecimal(monthlyContribution) ?? 0;
    const expected = parseDecimal(expectedReturn);

    if (!name.trim()) nextErrors.name = labels.errors.nameRequired;
    if (!startDate) nextErrors.startDate = labels.errors.startDateRequired || 'تاريخ البداية مطلوب';
    if (isMarketType(type)) {
      if (!selectedAsset) nextErrors.asset = labels.errors.assetRequired || 'اختر أصلاً من نتائج البحث.';
      if (!hasQuantity) nextErrors.quantity = labels.errors.quantityPositive;
      if (!hasLinkedPrice && (!currentValue || valueForValidation === null || valueForValidation <= 0)) {
        nextErrors.currentValue = labels.errors.valuePositive;
      }
    } else if (type === 'gold') {
      if (!goldProduct) nextErrors.metalProduct = labels.errors.nameRequired;
      if (!hasQuantity) nextErrors.quantity = labels.errors.quantityPositive;
      if (gramsValue === null || gramsValue <= 0) nextErrors.grams = labels.errors.gramsPositive || labels.errors.quantityPositive;
      if (karatValue <= 0 || karatValue > 24) nextErrors.goldKarat = labels.errors.valuePositive;
      if (goldMarketValue === null && (!currentValue || valueForValidation === null || valueForValidation <= 0)) {
        nextErrors.currentValue = labels.errors.metalPriceRequired || labels.errors.valuePositive;
      }
    } else if (type === 'silver') {
      if (!silverProduct) nextErrors.metalProduct = labels.errors.nameRequired;
      if (!hasQuantity) nextErrors.quantity = labels.errors.quantityPositive;
      if (gramsValue === null || gramsValue <= 0) nextErrors.grams = labels.errors.gramsPositive || labels.errors.quantityPositive;
      if (silverPurityRatio === null || silverPurityRatio <= 0 || silverPurityRatio > 1) {
        nextErrors.silverPurity = labels.errors.purityRequired || labels.errors.valuePositive;
      }
      if (silverMarketValue === null && (!currentValue || valueForValidation === null || valueForValidation <= 0)) {
        nextErrors.currentValue = labels.errors.metalPriceRequired || labels.errors.valuePositive;
      }
    } else if (type === 'project') {
      if (!selectedProjectId) nextErrors.project = labels.errors.projectRequired || 'اختر مشروعاً من مشاريعك.';
      if (!currentValue || valueForValidation === null || valueForValidation <= 0) nextErrors.currentValue = labels.errors.valuePositive;
    } else if (!currentValue || valueForValidation === null || valueForValidation <= 0) {
      nextErrors.currentValue = labels.errors.valuePositive;
    }

    if (monthlyContribution && (monthly < 0)) nextErrors.monthlyContribution = labels.errors.contributionPositive;
    if (expectedReturn && (expected === null || expected < -100 || expected > 1000)) nextErrors.expectedReturn = labels.errors.returnRange;
    if (valueForValidation !== null && valueForValidation > 0 && !isSameAccountCurrency && (fx.state !== 'ready' || fx.rate === null)) {
      nextErrors.fx = C.conversionUnavailable;
    }

    return nextErrors;
  }

  function validate() {
    const nextErrors = buildErrors();
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleTypeChange(nextType: InvestmentType) {
    setType(nextType);
    setErrors({});
    setSearchResults([]);
    setSearchState('idle');
    setManualValueEdited(false);

    if (!isMarketType(nextType) && nextType !== 'gold' && nextType !== 'silver') {
      setSelectedAsset(null);
      setQuantity('');
      setPurchasePrice('');
    }
    if (nextType !== 'project') setSelectedProjectId('');
    if (nextType === 'gold') {
      setName(labelOf(GOLD_PRODUCTS, goldProduct));
      setQuantity('1');
      setGoldKarat('24');
      setMetalGrams('');
      setCurrentValue('');
    } else if (nextType === 'silver') {
      setName(labelOf(SILVER_PRODUCTS, silverProduct));
      setQuantity('1');
      setSilverPurity('999');
      setMetalGrams('');
      setCurrentValue('');
    } else if (nextType === 'cash') {
      setName('');
      setCurrentValue('');
    } else if (nextType === 'realEstate') {
      setName('');
      setCurrentValue('');
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    if (selectedAsset && value.trim() !== localizedAssetName(selectedAsset, dir)) {
      setSelectedAsset(null);
    }
  }

  function handleSelectAsset(asset: AssetSearchItem) {
    const localizedName = localizedAssetName(asset, dir);
    setSelectedAsset(asset);
    setName(localizedName);
    setType(assetInvestmentType(asset.asset_type));
    setSearchResults([]);
    setSearchState('idle');

    if (asset.price !== null && Number.isFinite(asset.price) && asset.price > 0) {
      if (hasQuantity) {
        setCurrentValue(toInputNumber(asset.price * quantityValue!, 10));
      } else {
        setCurrentValue('');
      }
      setManualValueEdited(false);
    }
    if (!notes.trim()) setNotes(labels.fetchedPriceNote);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const manualValue = parseDecimal(currentValue);
    const finalNativeMarketValue = calculatedValue ?? manualValue ?? 0;
    const finalConvertedMarketValue = convertedMarketValue ?? finalNativeMarketValue;
    const purchase = parseDecimal(purchasePrice);
    const monthly = parseDecimal(monthlyContribution) ?? 0;
    const expected = parseDecimal(expectedReturn);
    const isGold = type === 'gold';
    const isSilver = type === 'silver';
    const metalProduct = isGold ? goldProduct : isSilver ? silverProduct : undefined;
    const metalPurity = isSilver ? silverPurityValue ?? undefined : undefined;
    const pureMetalGrams = isGold ? pureGoldGrams : isSilver ? pureSilverGrams : null;
    const currentMetalPrice = isGold ? goldPrice : isSilver ? silverPrice : null;
    const priceSource = isGold || isSilver ? metals.source || undefined : selectedAsset?.source;
    const lastUpdated = isGold
      ? metals.gold?.lastUpdated
      : isSilver
        ? metals.silver?.lastUpdated
        : selectedAsset?.updated_at ?? undefined;

    await onSave({
      name: name.trim(),
      type,
      currentValue: finalConvertedMarketValue,
      amount: finalConvertedMarketValue,
      monthlyContribution: monthly,
      startDate,
      riskLevel,
      expectedAnnualReturn: expected === null ? undefined : expected,
      notes: notes.trim() || undefined,
      symbol: selectedAsset?.symbol,
      providerSymbol: selectedAsset?.provider_symbol ?? undefined,
      market: selectedAsset ? localizedMarketName(selectedAsset, dir) : undefined,
      assetType: selectedAsset?.asset_type ?? (isGold || isSilver ? 'commodity' : type === 'project' ? 'project' : type),
      currency: formCurrency,
      quantity: (isMarketType(type) || isGold || isSilver) && hasQuantity ? quantityValue! : undefined,
      purchasePrice: purchase ?? undefined,
      currentPrice: isGold || isSilver ? currentMetalPrice ?? undefined : hasLinkedPrice ? selectedPrice : undefined,
      currentMarketValue: finalNativeMarketValue,
      priceCurrency: formCurrency,
      nativeCurrency: formCurrency,
      nativeUnitPrice: isGold || isSilver ? currentMetalPrice ?? undefined : hasLinkedPrice ? selectedPrice : undefined,
      nativeMarketValue: finalNativeMarketValue,
      userCurrency: accountCurrency,
      fxRateToUserCurrency: isSameAccountCurrency ? 1 : fx.rate ?? undefined,
      convertedMarketValue: finalConvertedMarketValue,
      fxSource: isSameAccountCurrency ? 'same_currency' : fx.source ?? undefined,
      fxLastUpdatedAt: isSameAccountCurrency ? new Date().toISOString() : fx.lastUpdated ?? undefined,
      valuationSource: priceSource,
      valuationLastUpdatedAt: lastUpdated,
      lastPrice: isGold || isSilver ? currentMetalPrice ?? undefined : selectedPrice ?? undefined,
      lastPriceUpdatedAt: lastUpdated,
      dataSource: priceSource,
      projectId: type === 'project' ? selectedProjectId : undefined,
      projectName: type === 'project' ? selectedProject?.name : undefined,
      metalType: isGold ? 'gold' : isSilver ? 'silver' : undefined,
      metalProductType: metalProduct,
      metalKarat: isGold ? karatValue : undefined,
      metalPurity,
      grams: isGold || isSilver ? totalMetalGrams ?? undefined : undefined,
      pureMetalGrams: pureMetalGrams ?? undefined,
      priceSource,
    });
  }

  if (!open) return null;

  const searchOpen = shouldSearchAssets && name.trim().length >= 2 && !selectedMatchesName && searchState !== 'idle';
  const saveDisabled = saving || Object.keys(buildErrors()).length > 0;
  const currentMetalPrice = type === 'gold' ? goldPrice : type === 'silver' ? silverPrice : null;
  const currentPureGrams = type === 'gold' ? pureGoldGrams : type === 'silver' ? pureSilverGrams : null;
  const searchPlaceholder = type === 'crypto' ? C.cryptoSearchPlaceholder : type === 'fund' ? C.fundSearchPlaceholder : C.assetSearchPlaceholder;
  const nativeValueText = nativeMarketValue !== null && nativeMarketValue > 0
    ? formatMarketPrice({
      price: nativeMarketValue,
      currency: formCurrency,
      symbol: selectedAsset?.symbol,
      exchange: selectedAsset?.market ?? undefined,
      locale,
      includeKuwaitDinarEquivalent: true,
    })
    : labels.unavailable;
  const convertedValueText = convertedMarketValue !== null && convertedMarketValue > 0
    ? formatMarketPrice({ price: convertedMarketValue, currency: accountCurrency, locale })
    : labels.unavailable;

  return (
    <div className="invest-overlay" role="presentation" onMouseDown={onClose}>
      <div className="invest-modal invest-modal--upgraded" role="dialog" aria-modal="true" aria-labelledby="invest-modal-title" onMouseDown={event => event.stopPropagation()}>
        <div className="invest-modal-head">
          <h2 id="invest-modal-title">{mode === 'create' ? labels.titleAdd : labels.titleEdit}</h2>
          <button type="button" className="invest-icon-btn" onClick={onClose} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <form className="invest-form invest-form--upgraded" onSubmit={handleSubmit}>
          <FormSection title={C.sectionAssetData} icon={<Building2 size={17} />} />

          <Field label={labels.type} required>
            <div className="invest-type-grid">
              {typeOptions.map(option => (
                <button
                  type="button"
                  key={option}
                  className={type === option ? 'selected' : ''}
                  onClick={() => handleTypeChange(option)}
                >
                  <TypeIcon type={option} />
                  <span>{typeLabel(option)}</span>
                </button>
              ))}
            </div>
          </Field>

          {isMarketType(type) && (
            <Field label={labels.name} error={errors.name || errors.asset} required className="span-2">
              <div className="invest-asset-search">
                <div className="invest-input-icon">
                  <Search size={16} />
                  <input value={name} onChange={event => handleNameChange(event.target.value)} placeholder={searchPlaceholder} autoFocus />
                </div>
                {searchOpen && (
                  <div className="invest-asset-results" role="listbox">
                    {searchState === 'loading' && (
                      <div className="invest-asset-state">
                        <Loader2 size={17} className="invest-spin" />
                        <span>{labels.assetSearchLoading}</span>
                      </div>
                    )}
                    {searchState === 'error' && (
                      <div className="invest-asset-state invest-asset-state--warning">
                        <AlertCircle size={17} />
                        <span>{labels.assetSearchProviderUnavailable}</span>
                      </div>
                    )}
                    {searchState === 'ready' && searchResults.length === 0 && (
                      <div className="invest-asset-state">
                        <strong>{labels.assetSearchNoResultsTitle}</strong>
                        <span>{labels.assetSearchNoResultsBody}</span>
                      </div>
                    )}
                    {searchState === 'ready' && searchResults.map(asset => (
                      <button key={`${asset.symbol}:${asset.provider_symbol ?? asset.asset_type}`} type="button" className="invest-asset-result" onClick={() => handleSelectAsset(asset)}>
                        <span className="invest-asset-result-icon"><TrendingGlyph assetType={asset.asset_type} /></span>
                        <span className="invest-asset-result-body">
                          <strong>{localizedAssetName(asset, dir)}</strong>
                          <small>
                            <b dir="ltr">{asset.symbol}</b>
                            {' · '}
                            {localizedMarketName(asset, dir) || asset.country || labels.unavailable}
                            {' · '}
                            {labels.assetTypes[asset.asset_type] ?? asset.asset_type}
                          </small>
                        </span>
                        <span className="invest-asset-result-price" dir="ltr">
                          {asset.price !== null && asset.currency
                            ? `${asset.currency} ${formatNumber(asset.price)}`
                            : labels.unavailable}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          )}

          {!isMarketType(type) && type !== 'project' && (
            <Field label={type === 'cash' ? C.cashBankName : type === 'realEstate' ? C.propertyLocation : labels.name} error={errors.name} required className="span-2">
              <input value={name} onChange={event => setName(event.target.value)} placeholder={labels.namePlaceholder} autoFocus />
            </Field>
          )}

          {selectedAsset && (
            <div className="invest-selected-asset span-2">
              <div>
                <span><CheckCircle2 size={15} /> {labels.selectedAsset}</span>
                <strong>{localizedAssetName(selectedAsset, dir)}</strong>
                <small>
                  <b dir="ltr">{selectedAsset.provider_symbol ?? selectedAsset.symbol}</b>
                  {' · '}
                  {localizedMarketName(selectedAsset, dir) || labels.unavailable}
                  {' · '}
                  {labels.assetTypes[selectedAsset.asset_type] ?? selectedAsset.asset_type}
                </small>
              </div>
              <div>
                <span>{labels.currentPrice}</span>
                <strong dir="ltr">{selectedAsset.price !== null && selectedAsset.currency ? `${selectedAsset.currency} ${formatNumber(selectedAsset.price)}` : labels.unavailable}</strong>
                <small>{labels.lastUpdated}: {formatUpdatedAt(selectedAsset.updated_at) || labels.unavailable}</small>
              </div>
              <div>
                <span>{labels.dataSource}</span>
                <strong>{selectedAsset.source}</strong>
                <small>{selectedAsset.available ? labels.currentPrice : labels.unavailable}</small>
              </div>
            </div>
          )}

          {type === 'project' && (
            <div className="span-2 invest-project-box">
              <Field label={C.chooseProject} error={errors.project} required>
                {projectsState === 'loading' ? (
                  <div className="invest-asset-state">
                    <Loader2 size={17} className="invest-spin" />
                    <span>{labels.assetSearchLoading}</span>
                  </div>
                ) : projectsState === 'error' ? (
                  <div className="invest-asset-state invest-asset-state--warning">
                    <AlertCircle size={17} />
                    <span>{labels.assetSearchProviderUnavailable}</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="invest-project-empty">
                    <FolderKanban size={20} />
                    <div>
                      <strong>{C.noProjectsTitle}</strong>
                      <p>{C.noProjectsBody}</p>
                    </div>
                    <Link href="/projects">{C.addProject}</Link>
                  </div>
                ) : (
                  <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
                    <option value="">{C.chooseProject}</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                )}
              </Field>

              {selectedProject && (
                <div className="invest-selected-asset invest-selected-asset--project">
                  <div>
                    <span><FolderKanban size={15} /> {C.chooseProject}</span>
                    <strong>{selectedProject.name}</strong>
                    <small>{C.projectStatus}: {selectedProject.status || labels.unavailable}</small>
                  </div>
                  <div>
                    <span>{C.projectBudget}</span>
                    <strong dir="ltr">{projectBudget(selectedProject) !== null ? `${activeCurrency} ${formatNumber(projectBudget(selectedProject)!)} ` : labels.unavailable}</strong>
                    <small>{labels.lastUpdated}: {formatUpdatedAt(selectedProject.updated_at) || labels.unavailable}</small>
                  </div>
                </div>
              )}
            </div>
          )}

          {(type === 'gold' || type === 'silver') && (
            <>
              <Field label={type === 'gold' ? C.goldProductType : C.silverProductType} error={errors.metalProduct} required>
                <select value={type === 'gold' ? goldProduct : silverProduct} onChange={event => {
                  if (type === 'gold') {
                    setGoldProduct(event.target.value);
                    setName(labelOf(GOLD_PRODUCTS, event.target.value));
                  } else {
                    setSilverProduct(event.target.value);
                    setName(labelOf(SILVER_PRODUCTS, event.target.value));
                  }
                }}>
                  {(type === 'gold' ? GOLD_PRODUCTS : SILVER_PRODUCTS).map(product => (
                    <option key={product.value} value={product.value}>{product.labelAr}</option>
                  ))}
                </select>
              </Field>

              {type === 'gold' ? (
                <Field label={C.goldKarat} error={errors.goldKarat} required>
                  <select value={goldKarat} onChange={event => setGoldKarat(event.target.value)} disabled={!goldConfig.manual}>
                    {KARATS.map(karat => <option key={karat} value={karat}>{karat}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label={C.silverPurity} error={errors.silverPurity} required>
                  <select value={silverPurity} onChange={event => setSilverPurity(event.target.value)}>
                    {SILVER_PURITIES.map(purity => <option key={purity.value} value={purity.value}>{purity.label}</option>)}
                  </select>
                </Field>
              )}

              {type === 'silver' && silverPurity === 'custom' && (
                <Field label={C.customPurity} error={errors.silverPurity} required>
                  <input type="number" min="0" max="100" step="0.01" value={customPurity} onChange={event => setCustomPurity(event.target.value)} dir="ltr" />
                </Field>
              )}

              <Field label={C.grams} error={errors.grams} required>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={metalGrams}
                  onChange={event => setMetalGrams(event.target.value)}
                  disabled={type === 'gold' ? !goldConfig.manual : !silverConfig.manual}
                  dir="ltr"
                />
              </Field>

              <div className="invest-metal-price-card span-2">
                {metals.state === 'loading' ? (
                  <div className="invest-asset-state">
                    <Loader2 size={17} className="invest-spin" />
                    <span>{C.metalsPriceLoading}</span>
                  </div>
                ) : metals.state === 'error' ? (
                  <div className="invest-asset-state invest-asset-state--warning">
                    <AlertCircle size={17} />
                    <span>{metals.message || C.metalsPriceUnavailable}</span>
                  </div>
                ) : currentMetalPrice ? (
                  <div className="invest-calculation-grid">
                    <div>
                      <span>{C.pricePerGram}</span>
                      <strong dir="ltr">{metalCurrency} {formatNumber(currentMetalPrice, 6)}</strong>
                    </div>
                    <div>
                      <span>{C.totalWeight}</span>
                      <strong dir="ltr">{totalMetalGrams !== null ? `${formatNumber(totalMetalGrams, 6)} g` : '-'}</strong>
                    </div>
                    <div>
                      <span>{type === 'gold' ? C.pureGoldGrams : C.pureSilverGrams}</span>
                      <strong dir="ltr">{currentPureGrams !== null ? `${formatNumber(currentPureGrams, 6)} g` : '-'}</strong>
                    </div>
                    <div className="invest-calculation-total">
                      <span>{C.estimatedValue}</span>
                      <strong dir="ltr">{calculatedValue !== null ? `${metalCurrency} ${formatNumber(calculatedValue, 4)}` : '-'}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="invest-asset-state">
                    <span>{labels.unavailable}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <FormSection title={C.sectionQuantity} icon={<Coins size={17} />} />

          {(isMarketType(type) || type === 'gold' || type === 'silver') && (
            <Field label={quantityLabel} error={errors.quantity} helper={type === 'crypto' ? 'يدعم هذا الحقل كسور العملات الرقمية حتى 8 منازل عشرية وأكثر.' : labels.quantityHelper} required>
              <input type="number" min="0" step={type === 'crypto' ? '0.00000001' : '0.000001'} value={quantity} onChange={event => setQuantity(event.target.value)} dir="ltr" inputMode="decimal" />
            </Field>
          )}

          {(isMarketType(type) || type === 'gold' || type === 'silver') && (
            <Field label={C.purchasePrice}>
              <div className="invest-money-input">
                <span dir="ltr">{formCurrency}</span>
                <input type="number" min="0" step="0.000001" value={purchasePrice} onChange={event => setPurchasePrice(event.target.value)} dir="ltr" inputMode="decimal" />
              </div>
            </Field>
          )}

          <FormSection title={C.sectionPricing} icon={<Banknote size={17} />} />

          {isMarketType(type) && selectedAsset && hasLinkedPrice ? (
            <div className="invest-field">
              <span>{labels.currentSharePrice}</span>
              <div className="invest-readonly-money">
                <span dir="ltr">{activeCurrency}</span>
                <strong dir="ltr">{formatNumber(selectedPrice!)}</strong>
              </div>
            </div>
          ) : (isMarketType(type) && selectedAsset) ? (
            <div className="invest-price-unavailable">
              <AlertCircle size={17} />
              <span>{labels.currentPriceUnavailable}</span>
            </div>
          ) : null}

          {((!isMarketType(type) && type !== 'gold' && type !== 'silver') || isManualMarketValue || type === 'project') && (
            <Field label={type === 'project' ? C.investmentAmount : isManualMarketValue ? C.manualValue : labels.currentValue} error={errors.currentValue} required>
              <div className="invest-money-input">
                <span dir="ltr">{formCurrency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={currentValue}
                  onChange={event => {
                    setCurrentValue(event.target.value);
                    setManualValueEdited(true);
                  }}
                  dir="ltr"
                  inputMode="decimal"
                />
              </div>
            </Field>
          )}

          {calculatedValue !== null && (
            <div className="invest-calculation-card span-2">
              <div className="invest-calculation-head">
                <span>{C.calculationSummary}</span>
                <button type="button" onClick={() => {
                  setCurrentValue(toInputNumber(calculatedValue, 10));
                  setManualValueEdited(false);
                }}>
                  {labels.recalculate}
                </button>
              </div>
              <div className="invest-calculation-grid">
                <div>
                  <span>{isMarketType(type) ? labels.currentSharePrice : C.pricePerGram}</span>
                  <strong dir="ltr">
                    {isMarketType(type)
                      ? `${activeCurrency} ${formatNumber(selectedPrice!)}`
                      : `${metalCurrency} ${formatNumber(currentMetalPrice!, 6)}`}
                  </strong>
                </div>
                <div>
                  <span>{isMarketType(type) ? quantityLabel : C.totalWeight}</span>
                  <strong dir="ltr">
                    {isMarketType(type)
                      ? formatPreciseNumber(quantityValue!)
                      : `${formatNumber(totalMetalGrams!, 6)} g`}
                  </strong>
                </div>
                {!isMarketType(type) && (
                  <div>
                    <span>{type === 'gold' ? C.pureGoldGrams : C.pureSilverGrams}</span>
                    <strong dir="ltr">{`${formatNumber(currentPureGrams!, 6)} g`}</strong>
                  </div>
                )}
                <div className="invest-calculation-total">
                  <span>{labels.currentMarketValue}</span>
                  <strong dir="ltr">{formCurrency} {formatNumber(calculatedValue, 4)}</strong>
                </div>
              </div>
              <small>
                {labels.dataSource}: {isMarketType(type) ? selectedAsset?.source : metals.source || labels.unavailable}
                {' · '}
                {labels.lastUpdated}: {isMarketType(type) ? formatUpdatedAt(selectedAsset?.updated_at) || labels.unavailable : formatUpdatedAt(type === 'gold' ? metals.gold?.lastUpdated : metals.silver?.lastUpdated) || labels.unavailable}
              </small>
            </div>
          )}

          {nativeMarketValue !== null && nativeMarketValue > 0 && (
            <div className="invest-conversion-card span-2">
              <div className="invest-calculation-head">
                <span>{C.accountCurrencyValue}</span>
                {!isSameAccountCurrency && (
                  <button type="button" onClick={() => setFxReloadKey(key => key + 1)}>
                    {C.retryFx}
                  </button>
                )}
              </div>
              <div className="invest-calculation-grid">
                <div>
                  <span>{C.nativeValue}</span>
                  <strong dir="ltr">{nativeValueText}</strong>
                </div>
                <div className="invest-calculation-total">
                  <span>{C.accountCurrencyValue}</span>
                  <strong dir="ltr">{fx.state === 'loading' && !isSameAccountCurrency ? C.conversionLoading : convertedValueText}</strong>
                </div>
                <div>
                  <span>{C.fxRate}</span>
                  <strong dir="ltr">
                    {isSameAccountCurrency
                      ? C.sameAccountCurrency
                      : fx.state === 'ready' && fx.rate !== null
                        ? `1 ${formCurrency} = ${formatNumber(fx.rate, 8)} ${accountCurrency}`
                        : C.conversionUnavailable}
                  </strong>
                </div>
              </div>
              <small>
                {isSameAccountCurrency
                  ? C.sameAccountCurrency
                  : `${C.fxSource}: ${fx.source || labels.unavailable} · ${labels.lastUpdated}: ${formatUpdatedAt(fx.lastUpdated) || labels.unavailable} · ${C.realFxBadge}`}
              </small>
              {errors.fx && <small className="invest-error-text">{errors.fx}</small>}
            </div>
          )}

          <Field label={labels.monthly} error={errors.monthlyContribution}>
            <div className="invest-money-input">
              <span dir="ltr">{formCurrency}</span>
              <input type="number" min="0" step="0.000001" value={monthlyContribution} onChange={event => setMonthlyContribution(event.target.value)} dir="ltr" inputMode="decimal" />
            </div>
          </Field>

          <FormSection title={C.sectionDetails} icon={<CheckCircle2 size={17} />} />

          <Field label={labels.startDate} error={errors.startDate} required>
            <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
          </Field>

          <Field label={labels.risk} required>
            <select value={riskLevel} onChange={event => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map(option => <option key={option} value={option}>{riskLabel(option)}</option>)}
            </select>
          </Field>

          <Field label={labels.expectedReturn} error={errors.expectedReturn}>
            <div className="invest-suffix-input">
              <input type="number" min="-100" max="1000" step="0.1" value={expectedReturn} onChange={event => setExpectedReturn(event.target.value)} placeholder="-100 إلى 1000" dir="ltr" />
              <span>%</span>
            </div>
          </Field>

          <Field label={labels.notes} className="span-2">
            <textarea value={notes} onChange={event => setNotes(event.target.value)} />
          </Field>

          <div className="invest-form-actions span-2">
            <button type="button" className="invest-secondary-btn" onClick={onClose} disabled={saving}>
              {labels.cancel}
            </button>
            <button type="submit" className="invest-primary-btn" disabled={saveDisabled}>
              {saving && <Loader2 size={16} className="invest-spin" />}
              {mode === 'create' ? labels.save : labels.update}
            </button>
          </div>
        </form>

        <style jsx>{`
          .invest-modal--upgraded {
            width: min(920px, 100%);
          }
          .invest-form--upgraded {
            align-items: start;
          }
          .invest-conversion-card {
            border: 1px solid rgba(14, 116, 144, .18);
            border-radius: 20px;
            background: linear-gradient(135deg, rgba(236, 254, 255, .76), rgba(240, 253, 250, .72));
            padding: 14px;
            display: grid;
            gap: 12px;
            min-width: 0;
          }
          .dark .invest-conversion-card {
            background: linear-gradient(135deg, rgba(8, 47, 73, .54), rgba(15, 118, 110, .16));
            border-color: rgba(103, 232, 249, .18);
          }
          .invest-error-text {
            color: #B91C1C !important;
          }
          .invest-type-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
            gap: 9px;
          }
          .invest-type-grid button {
            min-height: 64px;
            border: 1px solid rgba(14,116,144,.16);
            border-radius: 16px;
            background: rgba(255,255,255,.68);
            color: var(--sfm-foreground);
            padding: 10px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 9px;
            text-align: start;
            font: 950 12px Tajawal, Arial, sans-serif;
            cursor: pointer;
            transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
          }
          .invest-type-grid button svg {
            color: #0e7490;
          }
          .invest-type-grid button:hover,
          .invest-type-grid button.selected {
            border-color: rgba(24,212,212,.44);
            background: rgba(236,254,255,.92);
            box-shadow: 0 12px 28px rgba(14,116,144,.1);
            transform: translateY(-1px);
          }
          .invest-form-section {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 38px;
            margin-top: 2px;
            color: var(--sfm-foreground);
            font-weight: 950;
            border-bottom: 1px solid rgba(14,116,144,.12);
          }
          .invest-form-section span {
            width: 30px;
            height: 30px;
            border-radius: 11px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, rgba(29,140,255,.12), rgba(24,212,212,.16));
            color: #0e7490;
          }
          .invest-project-box {
            display: grid;
            gap: 12px;
          }
          .invest-project-empty {
            border: 1px dashed rgba(14,116,144,.24);
            border-radius: 18px;
            background: rgba(236,254,255,.55);
            padding: 14px;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
          }
          .invest-project-empty svg {
            color: #0e7490;
          }
          .invest-project-empty strong {
            display: block;
            font-size: 13px;
            color: var(--sfm-foreground);
            margin-bottom: 4px;
          }
          .invest-project-empty p {
            margin: 0;
            color: var(--sfm-muted);
            font-size: 12px;
            font-weight: 850;
            line-height: 1.6;
          }
          .invest-project-empty a {
            min-height: 38px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            text-decoration: none;
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }
          .invest-metal-price-card {
            display: grid;
            gap: 10px;
          }
          .invest-selected-asset--project {
            grid-template-columns: minmax(0, 1fr) minmax(0, .8fr);
          }
          @media (max-width: 760px) {
            .invest-type-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .invest-project-empty {
              grid-template-columns: auto minmax(0, 1fr);
            }
            .invest-project-empty a {
              grid-column: 1 / -1;
              width: 100%;
            }
            .invest-selected-asset--project {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function FormSection({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="invest-form-section span-2">
      <span>{icon}</span>
      {title}
    </div>
  );
}

function TypeIcon({ type }: { type: InvestmentType }) {
  if (type === 'gold') return <Gem size={17} />;
  if (type === 'silver') return <Coins size={17} />;
  if (type === 'crypto') return <Coins size={17} />;
  if (type === 'project') return <FolderKanban size={17} />;
  if (type === 'realEstate') return <Home size={17} />;
  if (type === 'cash') return <Banknote size={17} />;
  return <Building2 size={17} />;
}

function TrendingGlyph({ assetType }: { assetType: string }) {
  return <span dir="ltr">{assetType.slice(0, 2).toUpperCase()}</span>;
}

function Field({
  label,
  error,
  helper,
  required,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`invest-field ${className}`}>
      <span>{label}{required && <b>*</b>}</span>
      {children}
      {helper && !error && <em>{helper}</em>}
      {error && <small>{error}</small>}
    </label>
  );
}
