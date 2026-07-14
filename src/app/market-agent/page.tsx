'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Info,
  LineChart,
  ListChecks,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import type { MarketAgentAssetType, MarketAgentResponse, MarketAgentTimeframe } from '@/lib/market/marketAgent';

const COPY = {
  ar: {
    title: 'وكيل تحليل الأسواق',
    subtitle: 'مساحة تحليل آلية تقرأ الأسهم والفوركس والمؤشرات والمعادن والعملات الرقمية باستخدام بيانات السوق المتاحة.',
    badge: 'THE SFM AI',
    provider: 'مزود البيانات',
    sourceReady: 'عند توفر البيانات',
    legalTitle: 'تنبيه مهم',
    legal:
      'هذا التحليل عبارة عن قراءة آلية للسوق لأغراض تعليمية ومعلوماتية فقط، ولا يعد نصيحة مالية أو توصية بشراء أو بيع أي أصل. تقع قرارات الاستثمار والتداول على مسؤولية المستخدم.',
    symbol: 'رمز الأصل',
    symbolPlaceholder: 'مثال: AAPL أو GOOGL أو EUR/USD',
    symbolHelp: 'اكتب رمزاً مثل AAPL, NVDA, EUR/USD, XAU/USD.',
    assetType: 'نوع الأصل',
    timeframe: 'الإطار الزمني',
    analyze: 'تحليل الأصل',
    analyzing: 'جاري التحليل...',
    focusSearch: 'البحث عن أصل',
    loadingTitle: 'جاري تجهيز القراءة',
    loadingBody: 'نراجع الأسعار والمؤشرات الفنية المتاحة لهذا الأصل.',
    emptyTitle: 'ابدأ بإدخال رمز أصل',
    emptyBody: 'اختر أصلاً مالياً وإطاراً زمنياً لبدء التحليل.',
    examples: 'أمثلة سريعة',
    errorTitle: 'تعذر إصدار قراءة موثوقة',
    recentTitle: 'آخر التحليلات',
    recentSubtitle: 'سجل القراءات المحفوظة من الحساب عند توفرها.',
    noHistory: 'لا توجد تحليلات محفوظة بعد.',
    currentPrice: 'السعر الحالي',
    direction: 'اتجاه السوق',
    action: 'الإجراء المقترح',
    confidence: 'الثقة',
    risk: 'المخاطرة',
    entryZone: 'منطقة الدخول',
    stopLoss: 'وقف الخسارة',
    takeProfit: 'أهداف الربح',
    support: 'الدعم',
    resistance: 'المقاومة',
    trends: 'الاتجاهات',
    indicators: 'المؤشرات الفنية',
    explanation: 'شرح القراءة',
    shortTerm: 'قصير',
    mediumTerm: 'متوسط',
    longTerm: 'طويل',
    noValue: 'غير متاح',
    stocks: 'أسهم',
    forex: 'فوركس',
    indices: 'مؤشرات',
    metals: 'معادن',
    crypto: 'عملات رقمية',
    bullish: 'صاعد',
    bearish: 'هابط',
    neutral: 'محايد',
    buy: 'شراء',
    sell: 'بيع',
    wait: 'انتظار',
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'مرتفعة',
    asset: 'الأصل',
    market: 'السوق',
    date: 'التاريخ',
    actionColumn: 'إجراء',
    reuse: 'إعادة التحليل',
    workspaceTitle: 'مساحة القراءة الحالية',
    snapshotTitle: 'لقطة السوق',
    chartTitle: 'مخطط مستويات السعر',
    chartUnavailable: 'بيانات الرسم البياني التاريخية غير متاحة في الاستجابة الحالية. يتم عرض مستويات السوق المحسوبة فقط.',
    dataStatusTitle: 'حالة البيانات',
    connected: 'متصلة',
    available: 'متاحة',
    lastUpdate: 'آخر تحديث',
    marketLevels: 'مستويات السوق',
    confidenceBasis: 'كيف تم احتساب الثقة؟',
    evidenceTitle: 'الأدلة الفنية',
    positiveFactors: 'العوامل الداعمة',
    cautionFactors: 'عوامل الحذر',
    readingSummary: 'ملخص القراءة',
    bullishScenario: 'السيناريو الصاعد',
    bearishScenario: 'السيناريو الهابط',
    whatChanges: 'ما الذي قد يغير القراءة؟',
    currentReading: 'القراءة الحالية',
    potentialEntry: 'نطاق دخول محتمل',
    invalidation: 'إبطال القراءة',
    volume: 'حجم التداول',
    pivot: 'النقطة المحورية',
    refreshAnalysis: 'تحديث التحليل',
    searchHistory: 'ابحث في آخر التحليلات',
    shownHistory: 'المعروض',
    noChartData: 'لا توجد سلسلة أسعار كافية لرسم شموع حقيقية لهذا الأصل حالياً.',
    unavailable: 'لا توجد بيانات كافية لإصدار قراءة موثوقة لهذا الأصل حالياً.',
  },
  en: {
    title: 'Market Analysis Agent',
    subtitle: 'An automated research workspace for stocks, forex, indices, metals, and crypto using available market data.',
    badge: 'THE SFM AI',
    provider: 'Data provider',
    sourceReady: 'when data is available',
    legalTitle: 'Important notice',
    legal:
      'This analysis is an automated market reading for educational and informational purposes only. It is not financial advice or a recommendation to buy or sell any asset. Trading and investment decisions are your own responsibility.',
    symbol: 'Asset symbol',
    symbolPlaceholder: 'Example: AAPL, GOOGL, or EUR/USD',
    symbolHelp: 'Enter a symbol such as AAPL, NVDA, EUR/USD, XAU/USD.',
    assetType: 'Asset type',
    timeframe: 'Timeframe',
    analyze: 'Analyze asset',
    analyzing: 'Analyzing...',
    focusSearch: 'Search for an asset',
    loadingTitle: 'Preparing the reading',
    loadingBody: 'Reviewing available prices and technical indicators for this asset.',
    emptyTitle: 'Start by entering an asset symbol',
    emptyBody: 'Choose a financial asset and timeframe to begin the analysis.',
    examples: 'Quick examples',
    errorTitle: 'A reliable reading is not available',
    recentTitle: 'Recent analyses',
    recentSubtitle: 'Saved readings from your account when available.',
    noHistory: 'No saved analyses yet.',
    currentPrice: 'Current price',
    direction: 'Market direction',
    action: 'Suggested action',
    confidence: 'Confidence',
    risk: 'Risk level',
    entryZone: 'Entry zone',
    stopLoss: 'Stop loss',
    takeProfit: 'Take profits',
    support: 'Support',
    resistance: 'Resistance',
    trends: 'Trends',
    indicators: 'Technical indicators',
    explanation: 'Reading explanation',
    shortTerm: 'Short',
    mediumTerm: 'Medium',
    longTerm: 'Long',
    noValue: 'Unavailable',
    stocks: 'Stocks',
    forex: 'Forex',
    indices: 'Indices',
    metals: 'Metals',
    crypto: 'Crypto',
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutral: 'Neutral',
    buy: 'Buy',
    sell: 'Sell',
    wait: 'Wait',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    asset: 'Asset',
    market: 'Market',
    date: 'Date',
    actionColumn: 'Action',
    reuse: 'Analyze again',
    workspaceTitle: 'Current reading workspace',
    snapshotTitle: 'Market snapshot',
    chartTitle: 'Price levels chart',
    chartUnavailable: 'Historical chart data is not included in the current response. The computed market levels are shown instead.',
    dataStatusTitle: 'Data status',
    connected: 'Connected',
    available: 'Available',
    lastUpdate: 'Last update',
    marketLevels: 'Market levels',
    confidenceBasis: 'How confidence was calculated',
    evidenceTitle: 'Technical evidence',
    positiveFactors: 'Supporting factors',
    cautionFactors: 'Caution factors',
    readingSummary: 'Reading summary',
    bullishScenario: 'Bullish scenario',
    bearishScenario: 'Bearish scenario',
    whatChanges: 'What could change the reading?',
    currentReading: 'Current reading',
    potentialEntry: 'Potential entry range',
    invalidation: 'Reading invalidation',
    volume: 'Volume',
    pivot: 'Pivot point',
    refreshAnalysis: 'Refresh analysis',
    searchHistory: 'Search recent analyses',
    shownHistory: 'Showing',
    noChartData: 'There is not enough price-series data to draw real candles for this asset right now.',
    unavailable: 'There is not enough reliable data for this asset at the moment.',
  },
  fr: {
    title: 'Agent d’analyse des marchés',
    subtitle: 'Un espace de recherche automatisé pour actions, forex, indices, métaux et cryptos avec les données disponibles.',
    badge: 'THE SFM AI',
    provider: 'Fournisseur',
    sourceReady: 'lorsque les données sont disponibles',
    legalTitle: 'Avis important',
    legal:
      'Cette analyse est une lecture automatisée du marché à des fins éducatives et informatives uniquement. Elle ne constitue pas un conseil financier ni une recommandation d’achat ou de vente. Les décisions de trading et d’investissement relèvent de votre responsabilité.',
    symbol: 'Symbole',
    symbolPlaceholder: 'Exemple : AAPL, GOOGL ou EUR/USD',
    symbolHelp: 'Saisissez un symbole comme AAPL, NVDA, EUR/USD, XAU/USD.',
    assetType: 'Type d’actif',
    timeframe: 'Horizon',
    analyze: 'Analyser l’actif',
    analyzing: 'Analyse en cours...',
    focusSearch: 'Rechercher un actif',
    loadingTitle: 'Préparation de la lecture',
    loadingBody: 'Vérification des prix et indicateurs techniques disponibles.',
    emptyTitle: 'Commencez par saisir un symbole',
    emptyBody: 'Choisissez un actif financier et un horizon pour lancer l’analyse.',
    examples: 'Exemples rapides',
    errorTitle: 'Lecture fiable indisponible',
    recentTitle: 'Analyses récentes',
    recentSubtitle: 'Lectures enregistrées depuis votre compte lorsque disponibles.',
    noHistory: 'Aucune analyse enregistrée.',
    currentPrice: 'Prix actuel',
    direction: 'Direction du marché',
    action: 'Action suggérée',
    confidence: 'Confiance',
    risk: 'Niveau de risque',
    entryZone: 'Zone d’entrée',
    stopLoss: 'Stop loss',
    takeProfit: 'Objectifs',
    support: 'Supports',
    resistance: 'Résistances',
    trends: 'Tendances',
    indicators: 'Indicateurs techniques',
    explanation: 'Explication',
    shortTerm: 'Court',
    mediumTerm: 'Moyen',
    longTerm: 'Long',
    noValue: 'Indisponible',
    stocks: 'Actions',
    forex: 'Forex',
    indices: 'Indices',
    metals: 'Métaux',
    crypto: 'Crypto',
    bullish: 'Haussier',
    bearish: 'Baissier',
    neutral: 'Neutre',
    buy: 'Acheter',
    sell: 'Vendre',
    wait: 'Attendre',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    asset: 'Actif',
    market: 'Marché',
    date: 'Date',
    actionColumn: 'Action',
    reuse: 'Analyser à nouveau',
    workspaceTitle: 'Espace de lecture actuel',
    snapshotTitle: 'Instantané du marché',
    chartTitle: 'Graphique des niveaux',
    chartUnavailable: 'Les données historiques du graphique ne sont pas incluses dans la réponse actuelle. Les niveaux calculés sont affichés.',
    dataStatusTitle: 'État des données',
    connected: 'Connecté',
    available: 'Disponible',
    lastUpdate: 'Dernière mise à jour',
    marketLevels: 'Niveaux du marché',
    confidenceBasis: 'Comment la confiance est calculée',
    evidenceTitle: 'Éléments techniques',
    positiveFactors: 'Facteurs favorables',
    cautionFactors: 'Facteurs de prudence',
    readingSummary: 'Résumé de la lecture',
    bullishScenario: 'Scénario haussier',
    bearishScenario: 'Scénario baissier',
    whatChanges: 'Ce qui peut changer la lecture',
    currentReading: 'Lecture actuelle',
    potentialEntry: 'Zone d’entrée potentielle',
    invalidation: 'Invalidation de la lecture',
    volume: 'Volume',
    pivot: 'Point pivot',
    refreshAnalysis: 'Actualiser l’analyse',
    searchHistory: 'Rechercher dans les analyses récentes',
    shownHistory: 'Affiché',
    noChartData: 'Les données de série de prix sont insuffisantes pour afficher de vraies bougies actuellement.',
    unavailable: 'Les données fiables sont insuffisantes pour cet actif actuellement.',
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

type HistoryItem = {
  id: string;
  symbol: string;
  asset_type: MarketAgentAssetType;
  timeframe: MarketAgentTimeframe;
  suggested_action: 'buy' | 'sell' | 'wait';
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  current_price: number | null;
  summary: string | null;
  created_at: string;
};

type MarketAgentAnalysisResult = Extract<MarketAgentResponse, { ok: true }>;

type ConfidenceFactor = {
  label: string;
  score: number;
  detail: string;
};

type IndicatorView = {
  label: string;
  value: string;
  status: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
};

const ASSET_OPTIONS: Array<{ value: MarketAgentAssetType; labelKey: keyof Copy }> = [
  { value: 'stock', labelKey: 'stocks' },
  { value: 'forex', labelKey: 'forex' },
  { value: 'index', labelKey: 'indices' },
  { value: 'metal', labelKey: 'metals' },
  { value: 'crypto', labelKey: 'crypto' },
];

const ASSET_LABEL_KEYS: Record<MarketAgentAssetType, keyof Copy> = {
  stock: 'stocks',
  forex: 'forex',
  index: 'indices',
  metal: 'metals',
  crypto: 'crypto',
};

const TIMEFRAMES: MarketAgentTimeframe[] = ['15m', '1h', '4h', '1D', '1W'];
const EXAMPLE_SYMBOLS = ['AAPL', 'GOOGL', 'NVDA', 'EUR/USD', 'XAU/USD'];

function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '';
  const number = Number(value);
  const digits = Math.abs(number) >= 100 ? 2 : Math.abs(number) >= 1 ? 4 : 6;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(number);
}

function formatDate(value: string | null | undefined, lang: keyof typeof COPY) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function joinLevels(values: number[], fallback: string) {
  return values.length ? values.map(formatNumber).join(' / ') : fallback;
}

function actionToneClass(value: 'buy' | 'sell' | 'wait') {
  if (value === 'buy') return 'buy';
  if (value === 'sell') return 'sell';
  return 'wait';
}

function clampPercent(value: number) {
  return Math.max(4, Math.min(96, value));
}

function formatValueOrFallback(value: number | null | undefined, fallback: string) {
  const formatted = formatNumber(value);
  return formatted || fallback;
}

function getTrendTone(value: 'bullish' | 'bearish' | 'neutral') {
  if (value === 'bullish') return 'positive';
  if (value === 'bearish') return 'negative';
  return 'neutral';
}

function buildConfidenceFactors(result: MarketAgentAnalysisResult, text: Copy): ConfidenceFactor[] {
  const signals = result.debugSignals;
  const signalScore = signals?.totalSignals
    ? Math.round((signals.alignedSignals / Math.max(signals.totalSignals, 1)) * 100)
    : result.confidence;
  const indicatorValues = [
    result.indicators.rsi,
    result.indicators.macd,
    result.indicators.ema20,
    result.indicators.ema50,
    result.indicators.ema200,
    result.indicators.atr,
    result.indicators.volume,
  ];
  const dataCompleteness = Math.round((indicatorValues.filter(value => value !== null && value !== undefined).length / indicatorValues.length) * 100);
  const trendAlignment = [result.trends.shortTerm, result.trends.mediumTerm, result.trends.longTerm]
    .filter(value => value === result.direction).length;
  const trendScore = Math.round((trendAlignment / 3) * 100);

  return [
    {
      label: text.evidenceTitle,
      score: Math.max(0, Math.min(100, signalScore)),
      detail: `${Math.round(signals?.alignedSignals ?? result.confidence)} / ${Math.round(signals?.totalSignals ?? 100)}`,
    },
    {
      label: text.trends,
      score: trendScore,
      detail: `${trendAlignment}/3`,
    },
    {
      label: text.indicators,
      score: dataCompleteness,
      detail: `${indicatorValues.filter(value => value !== null && value !== undefined).length}/${indicatorValues.length}`,
    },
  ];
}

function buildIndicatorRows(result: MarketAgentAnalysisResult, text: Copy): IndicatorView[] {
  const rsi = result.indicators.rsi;
  const rsiTone: IndicatorView['tone'] = rsi === null ? 'neutral' : rsi > 70 || rsi < 30 ? 'warning' : rsi >= 45 && rsi <= 70 ? 'positive' : 'negative';
  const macdTone = getTrendTone(result.indicators.macd);
  const emaTone: IndicatorView['tone'] = result.indicators.ema20 && result.indicators.ema50
    ? result.indicators.ema20 > result.indicators.ema50 ? 'positive' : 'negative'
    : 'neutral';

  return [
    {
      label: 'RSI',
      value: rsi === null ? text.noValue : String(rsi),
      status: rsi === null ? text.noValue : rsi > 70 ? text.high : rsi < 30 ? text.low : text.neutral,
      tone: rsiTone,
    },
    {
      label: 'MACD',
      value: result.indicators.macdValue === null ? text.noValue : formatNumber(result.indicators.macdValue),
      status: text[result.indicators.macd],
      tone: macdTone,
    },
    {
      label: 'EMA 20 / EMA 50',
      value: `${formatValueOrFallback(result.indicators.ema20, text.noValue)} / ${formatValueOrFallback(result.indicators.ema50, text.noValue)}`,
      status: emaTone === 'positive' ? text.bullish : emaTone === 'negative' ? text.bearish : text.neutral,
      tone: emaTone,
    },
    {
      label: 'EMA 200',
      value: formatValueOrFallback(result.indicators.ema200, text.noValue),
      status: result.indicators.ema200 ? (result.currentPrice > result.indicators.ema200 ? text.bullish : text.bearish) : text.noValue,
      tone: result.indicators.ema200 ? (result.currentPrice > result.indicators.ema200 ? 'positive' : 'negative') : 'neutral',
    },
    {
      label: 'ATR',
      value: formatValueOrFallback(result.indicators.atr, text.noValue),
      status: result.indicators.atr ? text.available : text.noValue,
      tone: result.indicators.atr ? 'neutral' : 'warning',
    },
    {
      label: text.volume,
      value: formatValueOrFallback(result.indicators.volume, text.noValue),
      status: result.indicators.volume ? text.available : text.noValue,
      tone: result.indicators.volume ? 'neutral' : 'warning',
    },
  ];
}

export default function MarketAgentPage() {
  const { dir, lang } = useLanguage();
  const text = COPY[lang] ?? COPY.ar;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<MarketAgentAssetType>('stock');
  const [timeframe, setTimeframe] = useState<MarketAgentTimeframe>('1D');
  const [result, setResult] = useState<MarketAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [error, setError] = useState('');

  const actionTone = useMemo(() => {
    if (!result?.ok) return 'neutral';
    if (result.suggestedAction === 'buy') return 'positive';
    if (result.suggestedAction === 'sell') return 'negative';
    return 'neutral';
  }, [result]);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/market-agent/analyze', { headers });
      const payload = await response.json().catch(() => ({}));
      setHistory(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const runAnalysis = useCallback(async (
    rawSymbol: string,
    selectedAssetType: MarketAgentAssetType,
    selectedTimeframe: MarketAgentTimeframe,
  ) => {
    const cleanSymbol = rawSymbol.trim();
    if (!cleanSymbol || loading) return;
    setLoading(true);
    setError('');
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/market-agent/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ symbol: cleanSymbol, assetType: selectedAssetType, timeframe: selectedTimeframe }),
      });
      const payload = await response.json().catch(() => null) as MarketAgentResponse | null;
      if (!payload) throw new Error('Invalid response');
      setResult(payload);
      if (!payload.ok) setError(payload.message || text.unavailable);
      if (payload.ok) void loadHistory();
    } catch {
      setError(text.unavailable);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, loadHistory, loading, text.unavailable]);

  async function analyze() {
    await runAnalysis(symbol, assetType, timeframe);
  }

  async function rerunHistory(item: HistoryItem) {
    setSymbol(item.symbol);
    setAssetType(item.asset_type);
    setTimeframe(item.timeframe);
    await runAnalysis(item.symbol, item.asset_type, item.timeframe);
  }

  function focusSearch(nextSymbol?: string) {
    if (nextSymbol) setSymbol(nextSymbol);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  const labelDirection = useCallback((value: 'bullish' | 'bearish' | 'neutral') => text[value], [text]);
  const labelAction = useCallback((value: 'buy' | 'sell' | 'wait') => text[value], [text]);
  const labelRisk = useCallback((value: 'low' | 'medium' | 'high') => text[value], [text]);
  const labelAsset = useCallback((value: MarketAgentAssetType) => text[ASSET_LABEL_KEYS[value]] ?? value, [text]);
  const currentSource = result?.source || text.sourceReady;
  const isAnalyzeDisabled = loading || !symbol.trim();
  const successResult = result?.ok ? result : null;
  // Derived from the real researchStatus field (set server-side via normalizeResearchStatus) —
  // previously this badge was a static "Connected" string, unwired to the actual result.
  const researchStatusIsHealthy = successResult
    ? successResult.researchStatus !== 'insufficient_data' && successResult.researchStatus !== 'failed'
    : false;
  const confidenceFactors = useMemo(
    () => successResult ? buildConfidenceFactors(successResult, text) : [],
    [successResult, text],
  );
  const indicatorRows = useMemo(
    () => successResult ? buildIndicatorRows(successResult, text) : [],
    [successResult, text],
  );
  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    if (!query) return history;
    return history.filter(item => {
      return item.symbol.toLowerCase().includes(query)
        || labelAsset(item.asset_type).toLowerCase().includes(query)
        || labelAction(item.suggested_action).toLowerCase().includes(query);
    });
  }, [history, historyQuery, labelAction, labelAsset]);
  const visibleHistory = filteredHistory.slice(0, 8);

  return (
    <div className="market-agent-page" dir={dir}>
      <main className="market-agent-main">
        <section className="agent-page-header" aria-labelledby="market-agent-title">
          <div className="agent-header-copy">
            <span className="agent-ai-badge">
              <Bot size={16} aria-hidden="true" />
              {text.badge}
            </span>
            <h1 id="market-agent-title">{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="agent-service-chip" aria-live="polite">
            <span className="agent-live-dot" aria-hidden="true" />
            <div>
              <small>{text.provider}</small>
              <strong>{currentSource}</strong>
            </div>
          </div>
        </section>

        <section className="agent-control-panel" aria-label={text.title}>
          <label className="agent-field agent-field-symbol" htmlFor="market-agent-symbol">
            <span>{text.symbol}</span>
            <div className={`agent-input-shell${error && !result?.ok ? ' has-error' : ''}`}>
              <Search size={18} aria-hidden="true" />
              <input
                id="market-agent-symbol"
                ref={searchInputRef}
                value={symbol}
                onChange={event => setSymbol(event.target.value.toUpperCase())}
                onKeyDown={event => {
                  if (event.key === 'Enter') void analyze();
                }}
                placeholder={text.symbolPlaceholder}
                inputMode="text"
                aria-describedby="market-agent-symbol-help"
              />
              {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : null}
            </div>
            <small id="market-agent-symbol-help">{text.symbolHelp}</small>
          </label>

          <label className="agent-field agent-field-type" htmlFor="market-agent-asset-type">
            <span>{text.assetType}</span>
            <div className="agent-select-shell">
              <select
                id="market-agent-asset-type"
                value={assetType}
                onChange={event => setAssetType(event.target.value as MarketAgentAssetType)}
              >
                {ASSET_OPTIONS.map(option => (
                  <option value={option.value} key={option.value}>{text[option.labelKey]}</option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </label>

          <div className="agent-timeframe-group" role="group" aria-label={text.timeframe}>
            <span>{text.timeframe}</span>
            <div className="agent-timeframe-options">
              {TIMEFRAMES.map(item => (
                <button
                  type="button"
                  className={timeframe === item ? 'active' : ''}
                  onClick={() => setTimeframe(item)}
                  aria-pressed={timeframe === item}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button className="agent-primary-action" type="button" onClick={analyze} disabled={isAnalyzeDisabled} aria-disabled={isAnalyzeDisabled}>
            {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            {loading ? text.analyzing : text.analyze}
          </button>
        </section>

        <section className="agent-legal-notice" role="note" aria-label={text.legalTitle}>
          <span>
            <ShieldAlert size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{text.legalTitle}</strong>
            <p>{text.legal}</p>
          </div>
        </section>

        {loading ? (
          <section className="agent-loading-state" aria-live="polite" aria-busy="true">
            <div className="agent-empty-icon">
              <Activity size={26} aria-hidden="true" />
            </div>
            <div>
              <h2>{text.loadingTitle}</h2>
              <p>{text.loadingBody}</p>
            </div>
            <div className="agent-skeleton-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>
        ) : successResult ? (
          <section className="agent-workspace" aria-labelledby="agent-workspace-title">
            <header className="agent-workspace-header">
              <div>
                <span>{successResult.symbol} · {labelAsset(successResult.assetType)} · {successResult.timeframe}</span>
                <h2 id="agent-workspace-title">{text.workspaceTitle}</h2>
              </div>
              <b className={`agent-signal-badge ${actionToneClass(successResult.suggestedAction)}`}>
                {text.currentReading}: {labelAction(successResult.suggestedAction)}
              </b>
            </header>

            <div className="agent-workspace-grid">
              <div className="agent-main-column">
                <section className="agent-section-card agent-snapshot-card">
                  <div className="agent-section-heading">
                    <div>
                      <span><Activity size={16} aria-hidden="true" /> {text.snapshotTitle}</span>
                      <p>{successResult.source} · {formatDate(successResult.updatedAt, lang) || text.noValue}</p>
                    </div>
                  </div>
                  <div className="agent-metric-grid compact">
                    <Metric icon={<LineChart size={18} />} label={text.currentPrice} value={formatNumber(successResult.currentPrice)} />
                    <Metric icon={<TrendingUp size={18} />} label={text.direction} value={labelDirection(successResult.direction)} />
                    <Metric icon={<Gauge size={18} />} label={text.risk} value={labelRisk(successResult.riskLevel)} />
                    <Metric icon={<Database size={18} />} label={text.volume} value={formatValueOrFallback(successResult.indicators.volume, text.noValue)} />
                    <Metric icon={<Target size={18} />} label={text.potentialEntry} value={`${formatNumber(successResult.entryZone.from)} - ${formatNumber(successResult.entryZone.to)}`} />
                    <Metric icon={<ShieldAlert size={18} />} label={text.invalidation} value={successResult.stopLoss ? formatNumber(successResult.stopLoss) : text.noValue} />
                  </div>
                </section>

                <MarketLevelChart result={successResult} text={text} />

                <section className="agent-section-card agent-evidence-card">
                  <div className="agent-section-heading">
                    <div>
                      <span><ListChecks size={16} aria-hidden="true" /> {text.evidenceTitle}</span>
                      <p>{text.noChartData}</p>
                    </div>
                  </div>
                  <div className="agent-evidence-grid">
                    <TrendPill label={text.shortTerm} value={labelDirection(successResult.trends.shortTerm)} tone={getTrendTone(successResult.trends.shortTerm)} />
                    <TrendPill label={text.mediumTerm} value={labelDirection(successResult.trends.mediumTerm)} tone={getTrendTone(successResult.trends.mediumTerm)} />
                    <TrendPill label={text.longTerm} value={labelDirection(successResult.trends.longTerm)} tone={getTrendTone(successResult.trends.longTerm)} />
                    <TrendPill label="MACD" value={text[successResult.indicators.macd]} tone={getTrendTone(successResult.indicators.macd)} />
                  </div>
                </section>

                <section className="agent-section-card agent-indicators-card">
                  <div className="agent-section-heading">
                    <div>
                      <span><BarChart3 size={16} aria-hidden="true" /> {text.indicators}</span>
                      <p>{text.marketLevels}</p>
                    </div>
                  </div>
                  <div className="agent-indicator-grid">
                    {indicatorRows.map(item => (
                      <IndicatorCard key={item.label} item={item} />
                    ))}
                  </div>
                </section>

                <section className="agent-section-card agent-explanation-card">
                  <div className="agent-section-heading">
                    <div>
                      <span><BrainCircuit size={16} aria-hidden="true" /> {text.explanation}</span>
                      <p>{text.legalTitle}</p>
                    </div>
                  </div>
                  <div className="agent-analysis-notes">
                    <article>
                      <h3>{text.readingSummary}</h3>
                      <p>{successResult.summaryArabic}</p>
                    </article>
                    <article>
                      <h3>{text.bullishScenario}</h3>
                      <p>{text.resistance}: {joinLevels(successResult.resistance, text.noValue)} · {text.takeProfit}: {joinLevels(successResult.takeProfit, text.noValue)}</p>
                    </article>
                    <article>
                      <h3>{text.bearishScenario}</h3>
                      <p>{text.support}: {joinLevels(successResult.support, text.noValue)} · {text.stopLoss}: {successResult.stopLoss ? formatNumber(successResult.stopLoss) : text.noValue}</p>
                    </article>
                    <article>
                      <h3>{text.whatChanges}</h3>
                      <p>{text.risk}: {labelRisk(successResult.riskLevel)} · {text.confidence}: {successResult.confidence}%</p>
                    </article>
                  </div>
                </section>
              </div>

              <aside className={`agent-side-rail ${actionTone}`} aria-label={text.currentReading}>
                <section className="agent-side-card agent-signal-card">
                  <span className="agent-side-kicker">{successResult.symbol}</span>
                  <h3>{labelAction(successResult.suggestedAction)}</h3>
                  <div className="agent-score-ring">
                    <strong>{successResult.confidence}%</strong>
                    <span>{text.confidence}</span>
                  </div>
                  <dl>
                    <div><dt>{text.timeframe}</dt><dd>{successResult.timeframe}</dd></div>
                    <div><dt>{text.direction}</dt><dd>{labelDirection(successResult.direction)}</dd></div>
                    <div><dt>{text.risk}</dt><dd>{labelRisk(successResult.riskLevel)}</dd></div>
                  </dl>
                </section>

                <section className="agent-side-card">
                  <h3><Radio size={16} aria-hidden="true" /> {text.dataStatusTitle}</h3>
                  <dl className="agent-data-list">
                    <div><dt>{text.provider}</dt><dd>{successResult.source}</dd></div>
                    <div><dt>{text.dataStatusTitle}</dt><dd>{researchStatusIsHealthy ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertTriangle size={15} aria-hidden="true" />} {researchStatusIsHealthy ? text.connected : text.unavailable}</dd></div>
                    <div><dt>{text.lastUpdate}</dt><dd>{formatDate(successResult.updatedAt, lang) || text.noValue}</dd></div>
                  </dl>
                </section>

                <section className="agent-side-card">
                  <h3><Info size={16} aria-hidden="true" /> {text.confidenceBasis}</h3>
                  <div className="agent-factor-list">
                    {confidenceFactors.map(item => (
                      <div className="agent-factor" key={item.label}>
                        <div>
                          <span>{item.label}</span>
                          <strong>{item.score}%</strong>
                        </div>
                        <i style={{ inlineSize: `${clampPercent(item.score)}%` }} />
                        <small>{item.detail}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="agent-side-card agent-quick-actions">
                  <button type="button" onClick={() => void analyze()}>
                    <RefreshCw size={15} aria-hidden="true" />
                    {text.refreshAnalysis}
                  </button>
                  <button type="button" onClick={() => focusSearch()}>
                    <Search size={15} aria-hidden="true" />
                    {text.focusSearch}
                  </button>
                </section>
              </aside>
            </div>
          </section>
        ) : (
          <section className={`agent-empty-state ${error || result ? 'error' : ''}`} aria-live="polite">
            <div className="agent-empty-icon">
              {error || result ? <AlertTriangle size={26} aria-hidden="true" /> : <BrainCircuit size={26} aria-hidden="true" />}
            </div>
            <div className="agent-empty-copy">
              <h2>{error || result ? text.errorTitle : text.emptyTitle}</h2>
              <p>{error || result ? (result && !result.ok ? result.message : error) : text.emptyBody}</p>
              {!error && !result ? (
                <div className="agent-example-row" aria-label={text.examples}>
                  <span>{text.examples}</span>
                  {EXAMPLE_SYMBOLS.map(item => (
                    <button type="button" key={item} onClick={() => focusSearch(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" className="agent-secondary-action" onClick={() => focusSearch()}>
                <Search size={16} aria-hidden="true" />
                {text.focusSearch}
              </button>
            </div>
          </section>
        )}

        <section className="agent-history-panel">
          <header>
            <div>
              <span><Clock3 size={16} aria-hidden="true" /> {text.recentTitle}</span>
              <p>{text.recentSubtitle} · {text.shownHistory}: {visibleHistory.length}/{history.length}</p>
            </div>
            <label className="agent-history-search">
              <Search size={15} aria-hidden="true" />
              <input
                value={historyQuery}
                onChange={event => setHistoryQuery(event.target.value)}
                placeholder={text.searchHistory}
                aria-label={text.searchHistory}
              />
            </label>
            {historyLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
          </header>
          {visibleHistory.length ? (
            <div className="agent-history-grid" role="table" aria-label={text.recentTitle}>
              <div className="agent-history-head" role="row">
                <span role="columnheader">{text.asset}</span>
                <span role="columnheader">{text.market}</span>
                <span role="columnheader">{text.timeframe}</span>
                <span role="columnheader">{text.action}</span>
                <span role="columnheader">{text.confidence}</span>
                <span role="columnheader">{text.risk}</span>
                <span role="columnheader">{text.date}</span>
                <span role="columnheader">{text.actionColumn}</span>
              </div>
              {visibleHistory.map(item => (
                <article className="agent-history-row" role="row" key={item.id}>
                  <div role="cell" data-label={text.asset} className="agent-history-asset">
                    <strong>{item.symbol}</strong>
                    {item.current_price ? <small>{formatNumber(item.current_price)}</small> : null}
                  </div>
                  <span role="cell" data-label={text.market}>{labelAsset(item.asset_type)}</span>
                  <span role="cell" data-label={text.timeframe} className="agent-pill neutral">{item.timeframe}</span>
                  <span role="cell" data-label={text.action}>
                    <b className={`agent-signal-badge ${actionToneClass(item.suggested_action)}`}>{labelAction(item.suggested_action)}</b>
                  </span>
                  <span role="cell" data-label={text.confidence}>{Math.round(Number(item.confidence) || 0)}%</span>
                  <span role="cell" data-label={text.risk} className={`agent-risk risk-${item.risk_level}`}>{labelRisk(item.risk_level)}</span>
                  <span role="cell" data-label={text.date}>{formatDate(item.created_at, lang)}</span>
                  <span role="cell" data-label={text.actionColumn}>
                    <button type="button" className="agent-row-action" onClick={() => void rerunHistory(item)}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {text.reuse}
                    </button>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="agent-history-empty">{text.noHistory}</p>
          )}
        </section>
      </main>

      <style jsx global>{`
        .market-agent-page {
          width: 100%;
          min-width: 0;
          color: var(--foreground);
          font-family: var(--font-ui);
        }

        .market-agent-main {
          width: 100%;
          min-width: 0;
          display: grid;
          gap: 18px;
        }

        .agent-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          padding: clamp(22px, 4vw, 34px);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-panel);
          background: var(--hero-gradient);
          color: var(--hero-foreground);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        .agent-header-copy {
          min-width: 0;
          max-width: 820px;
        }

        .agent-ai-badge {
          width: max-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 6px 10px;
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 26%, transparent);
          border-radius: var(--radius-pill);
          background: color-mix(in srgb, var(--surface) 12%, transparent);
          color: var(--hero-foreground);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .04em;
        }

        .agent-page-header h1 {
          margin: 0;
          color: var(--hero-foreground);
          font-size: clamp(30px, 4vw, 44px);
          font-weight: 600;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .agent-page-header p {
          max-width: 760px;
          margin: 12px 0 0;
          color: var(--hero-foreground-muted);
          font-size: 15px;
          font-weight: 400;
          line-height: 1.9;
        }

        .agent-service-chip {
          min-width: min(100%, 210px);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent);
          border-radius: var(--radius-card);
          background: color-mix(in srgb, var(--surface) 12%, transparent);
          color: var(--hero-foreground);
        }

        .agent-live-dot {
          width: 10px;
          height: 10px;
          border-radius: var(--radius-pill);
          background: var(--success);
          flex: 0 0 auto;
        }

        .agent-service-chip small {
          display: block;
          color: var(--hero-foreground-muted);
          font-size: 11px;
          font-weight: 400;
        }

        .agent-service-chip strong {
          display: block;
          margin-top: 2px;
          color: var(--hero-foreground);
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .agent-control-panel {
          display: grid;
          grid-template-columns: minmax(250px, 1.6fr) minmax(180px, .8fr) auto auto;
          align-items: end;
          gap: 14px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          background: var(--surface);
          box-shadow: var(--shadow-card);
          min-width: 0;
        }

        .agent-field,
        .agent-timeframe-group {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .agent-field > span,
        .agent-timeframe-group > span {
          color: var(--foreground-secondary);
          font-size: 12px;
          font-weight: 600;
        }

        .agent-field > small {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.55;
        }

        .agent-input-shell,
        .agent-select-shell,
        .agent-history-search {
          min-width: 0;
          min-height: var(--control-h);
          display: flex;
          align-items: center;
          gap: 9px;
          padding-inline: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-muted);
          color: var(--foreground-muted);
          transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease, background var(--duration-fast) ease;
        }

        .agent-input-shell:focus-within,
        .agent-select-shell:focus-within,
        .agent-history-search:focus-within {
          border-color: var(--focus-ring);
          background: var(--surface);
          box-shadow: var(--focus-shadow);
        }

        .agent-input-shell.has-error {
          border-color: var(--danger);
          background: var(--danger-soft);
        }

        .agent-input-shell input,
        .agent-select-shell select,
        .agent-history-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--foreground);
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 400;
        }

        .agent-input-shell input {
          direction: ltr;
          unicode-bidi: plaintext;
        }

        .agent-input-shell input::placeholder,
        .agent-history-search input::placeholder {
          color: var(--foreground-subtle);
        }

        .agent-select-shell select {
          appearance: none;
          cursor: pointer;
        }

        .agent-select-shell svg {
          flex: 0 0 auto;
          pointer-events: none;
        }

        .agent-timeframe-options {
          min-height: var(--control-h);
          display: inline-flex;
          align-items: stretch;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          background: var(--surface-muted);
        }

        .agent-timeframe-options button {
          min-width: 44px;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--foreground-muted);
          font-family: var(--font-data);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .agent-timeframe-options button:hover {
          background: var(--sidebar-hover);
          color: var(--foreground);
        }

        .agent-timeframe-options button.active {
          border-color: var(--primary);
          background: var(--primary-soft);
          color: var(--primary-hover);
        }

        .agent-primary-action,
        .agent-secondary-action,
        .agent-quick-actions button,
        .agent-row-action,
        .agent-example-row button {
          min-height: var(--control-h);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: var(--radius-control);
          padding: 0 14px;
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--duration-fast) ease, border-color var(--duration-fast) ease, color var(--duration-fast) ease;
        }

        .agent-primary-action {
          border-color: var(--primary);
          background: var(--primary);
          color: var(--primary-foreground);
          white-space: nowrap;
        }

        .agent-primary-action:hover:not(:disabled) {
          border-color: var(--primary-hover);
          background: var(--primary-hover);
        }

        .agent-primary-action:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .agent-primary-action:focus-visible,
        .agent-secondary-action:focus-visible,
        .agent-quick-actions button:focus-visible,
        .agent-row-action:focus-visible,
        .agent-example-row button:focus-visible,
        .agent-timeframe-options button:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
          box-shadow: var(--focus-shadow);
        }

        .agent-legal-notice {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--warning-soft);
          color: var(--warning);
        }

        .agent-legal-notice > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: var(--radius-control);
          background: var(--surface);
        }

        .agent-legal-notice strong {
          display: block;
          color: var(--warning);
          font-weight: 600;
        }

        .agent-legal-notice p {
          margin: 4px 0 0;
          color: var(--foreground-secondary);
          font-size: 12px;
          font-weight: 400;
          line-height: 1.75;
        }

        .agent-loading-state,
        .agent-empty-state,
        .agent-workspace,
        .agent-history-panel {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-panel);
          background: var(--surface);
          box-shadow: var(--shadow-card);
        }

        .agent-loading-state,
        .agent-empty-state {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          padding: clamp(20px, 4vw, 30px);
        }

        .agent-loading-state h2,
        .agent-empty-state h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 20px;
          font-weight: 600;
        }

        .agent-loading-state p,
        .agent-empty-state p {
          margin: 6px 0 0;
          color: var(--foreground-muted);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.75;
        }

        .agent-empty-state.error {
          border-color: var(--danger);
          background: var(--danger-soft);
        }

        .agent-empty-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--primary-soft);
          color: var(--primary);
        }

        .agent-empty-state.error .agent-empty-icon {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .agent-skeleton-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .agent-skeleton-grid span {
          height: 82px;
          border-radius: var(--radius-card);
          background: var(--skeleton-gradient);
          background-size: 220% 100%;
          animation: agentShimmer 1.2s linear infinite;
        }

        @keyframes agentShimmer {
          to { background-position: -220% 0; }
        }

        .agent-example-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 14px;
        }

        .agent-example-row > span {
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 500;
        }

        .agent-example-row button,
        .agent-secondary-action,
        .agent-quick-actions button,
        .agent-row-action {
          min-height: 38px;
          background: var(--surface);
          color: var(--foreground-secondary);
        }

        .agent-example-row button {
          font-family: var(--font-data);
        }

        .agent-example-row button:hover,
        .agent-secondary-action:hover,
        .agent-quick-actions button:hover,
        .agent-row-action:hover {
          border-color: var(--primary);
          background: var(--sidebar-hover);
          color: var(--primary-hover);
        }

        .agent-secondary-action {
          margin-top: 14px;
        }

        .agent-workspace {
          padding: 18px;
        }

        .agent-workspace-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .agent-workspace-header span {
          color: var(--foreground-muted);
          font-family: var(--font-data);
          font-size: 12px;
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .agent-workspace-header h2 {
          margin: 5px 0 0;
          color: var(--foreground);
          font-size: 24px;
          font-weight: 600;
          line-height: 1.35;
        }

        .agent-workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 330px);
          gap: 16px;
          align-items: start;
          margin-top: 16px;
        }

        .agent-main-column,
        .agent-side-rail {
          min-width: 0;
          display: grid;
          gap: 14px;
        }

        .agent-section-card,
        .agent-side-card {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface-muted);
          padding: 15px;
        }

        .agent-section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .agent-section-heading span,
        .agent-history-panel > header span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--foreground);
          font-size: 14px;
          font-weight: 600;
        }

        .agent-section-heading span svg,
        .agent-history-panel > header span svg {
          color: var(--accent);
        }

        .agent-section-heading p,
        .agent-history-panel > header p {
          margin: 4px 0 0;
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.55;
        }

        .agent-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .agent-metric {
          min-width: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 4px 9px;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
        }

        .agent-metric svg {
          grid-row: 1 / 3;
          color: var(--accent);
        }

        .agent-metric span {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
        }

        .agent-metric strong {
          min-width: 0;
          color: var(--foreground);
          font-family: var(--font-data);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .agent-evidence-grid,
        .agent-indicator-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .agent-trend-pill,
        .agent-indicator-card {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
        }

        .agent-trend-pill span,
        .agent-indicator-card span {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
        }

        .agent-trend-pill strong,
        .agent-indicator-card strong {
          display: block;
          margin-top: 3px;
          color: var(--foreground);
          font-family: var(--font-data);
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .agent-indicator-card b {
          border-radius: var(--radius-pill);
          padding: 5px 8px;
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          font-size: 11px;
          font-weight: 600;
        }

        .agent-trend-pill.positive,
        .agent-indicator-card.positive {
          border-color: var(--success);
          background: var(--success-soft);
        }

        .agent-trend-pill.negative,
        .agent-indicator-card.negative {
          border-color: var(--danger);
          background: var(--danger-soft);
        }

        .agent-trend-pill.warning,
        .agent-indicator-card.warning {
          border-color: var(--warning);
          background: var(--warning-soft);
        }

        .agent-analysis-notes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .agent-analysis-notes article {
          min-width: 0;
          padding: 13px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
        }

        .agent-analysis-notes h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 13px;
          font-weight: 600;
        }

        .agent-analysis-notes p {
          margin: 7px 0 0;
          color: var(--foreground-muted);
          font-size: 12px;
          font-weight: 400;
          line-height: 1.75;
          overflow-wrap: anywhere;
        }

        .agent-side-rail {
          position: sticky;
          top: calc(var(--global-header-height) + 16px);
        }

        .agent-side-card h3,
        .agent-signal-card > h3 {
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--foreground);
          font-size: 15px;
          font-weight: 600;
        }

        .agent-side-kicker {
          display: block;
          margin-bottom: 5px;
          color: var(--primary);
          font-family: var(--font-data);
          font-size: 12px;
          font-weight: 600;
        }

        .agent-score-ring {
          width: 116px;
          height: 116px;
          margin: 14px auto;
          display: grid;
          place-items: center;
          align-content: center;
          border: 8px solid var(--accent);
          border-radius: var(--radius-pill);
          background: var(--accent-soft);
          text-align: center;
        }

        .agent-score-ring strong {
          display: block;
          color: var(--foreground);
          font-family: var(--font-data);
          font-size: 24px;
          font-weight: 600;
        }

        .agent-score-ring span {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
        }

        .agent-signal-card dl,
        .agent-data-list {
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .agent-signal-card dl > div,
        .agent-data-list > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        .agent-signal-card dt,
        .agent-data-list dt {
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 500;
        }

        .agent-signal-card dd,
        .agent-data-list dd {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--foreground);
          font-size: 12px;
          font-weight: 600;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .agent-factor-list {
          display: grid;
          gap: 12px;
        }

        .agent-factor > div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--foreground-secondary);
          font-size: 11px;
          font-weight: 500;
        }

        .agent-factor strong {
          color: var(--foreground);
          font-family: var(--font-data);
          font-weight: 600;
        }

        .agent-factor > i {
          display: block;
          height: 6px;
          margin-top: 6px;
          border-radius: var(--radius-pill);
          background: var(--accent);
        }

        .agent-factor small {
          display: block;
          margin-top: 5px;
          color: var(--foreground-muted);
          font-size: 10px;
          font-weight: 400;
          line-height: 1.5;
        }

        .agent-quick-actions {
          display: grid;
          gap: 8px;
        }

        .agent-level-chart {
          min-width: 0;
        }

        .agent-chart-track {
          position: relative;
          height: 230px;
          border: 1px solid var(--border);
          border-radius: var(--radius-card);
          background: var(--surface);
          overflow: hidden;
        }

        .agent-entry-zone {
          position: absolute;
          inset-block: 0;
          border-inline: 1px solid var(--accent);
          background: var(--accent-soft);
        }

        .agent-level-marker {
          position: absolute;
          inset-block: 15px;
          width: max-content;
          max-width: 116px;
          display: grid;
          grid-template-rows: 1fr auto auto;
          justify-items: center;
          gap: 4px;
          translate: -50% 0;
          color: var(--foreground-muted);
          text-align: center;
        }

        [dir='rtl'] .agent-level-marker {
          translate: 50% 0;
        }

        .agent-level-marker i {
          width: 2px;
          height: 100%;
          background: var(--border-strong);
        }

        .agent-level-marker b {
          color: var(--foreground-secondary);
          font-size: 10px;
          font-weight: 600;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .agent-level-marker em {
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          background: var(--surface-elevated);
          color: var(--foreground);
          padding: 4px 6px;
          font-family: var(--font-data);
          font-size: 10px;
          font-style: normal;
          font-weight: 600;
          box-shadow: var(--shadow-xs);
        }

        .agent-level-marker.support i,
        .agent-level-marker.target i {
          background: var(--success);
        }

        .agent-level-marker.resistance i,
        .agent-level-marker.stop i {
          background: var(--danger);
        }

        .agent-level-marker.price i {
          background: var(--primary);
        }

        .agent-level-scale {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 8px;
          color: var(--foreground-muted);
          font-size: 10px;
          font-weight: 500;
        }

        .agent-level-scale span[dir='ltr'] {
          font-family: var(--font-data);
        }

        .agent-signal-badge,
        .agent-risk,
        .agent-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: max-content;
          max-width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
          padding: 6px 9px;
          background: var(--surface-muted);
          color: var(--foreground-secondary);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.25;
          white-space: nowrap;
        }

        .agent-signal-badge.buy,
        .agent-risk.risk-low {
          border-color: var(--success);
          background: var(--success-soft);
          color: var(--success);
        }

        .agent-signal-badge.sell,
        .agent-risk.risk-high {
          border-color: var(--danger);
          background: var(--danger-soft);
          color: var(--danger);
        }

        .agent-signal-badge.wait,
        .agent-risk.risk-medium {
          border-color: var(--warning);
          background: var(--warning-soft);
          color: var(--warning);
        }

        .agent-history-panel {
          padding: 18px;
          overflow: hidden;
        }

        .agent-history-panel > header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .agent-history-search {
          width: min(100%, 280px);
          min-height: 40px;
        }

        .agent-history-grid {
          min-width: 980px;
          display: grid;
          overflow-x: auto;
        }

        .agent-history-head,
        .agent-history-row {
          display: grid;
          grid-template-columns: minmax(120px, 1.2fr) repeat(6, minmax(96px, 1fr)) minmax(100px, auto);
          align-items: center;
          gap: 10px;
          min-width: 980px;
          padding: 11px 12px;
        }

        .agent-history-head {
          border-bottom: 1px solid var(--border);
          background: var(--surface-muted);
          color: var(--foreground-muted);
          font-size: 11px;
          font-weight: 600;
        }

        .agent-history-row {
          border-bottom: 1px solid var(--border);
          color: var(--foreground-secondary);
          font-size: 12px;
          font-weight: 500;
        }

        .agent-history-row:last-child {
          border-bottom: 0;
        }

        .agent-history-row:hover {
          background: var(--sidebar-hover);
        }

        .agent-history-asset {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .agent-history-asset strong,
        .agent-history-asset small,
        .agent-history-row > [role='cell']:nth-child(5) {
          font-family: var(--font-data);
        }

        .agent-history-asset strong {
          color: var(--foreground);
          font-weight: 600;
        }

        .agent-history-asset small {
          color: var(--foreground-muted);
          font-weight: 500;
        }

        .agent-row-action {
          min-height: 34px;
          padding-inline: 10px;
        }

        .agent-history-empty {
          margin: 0;
          padding: 24px 12px;
          color: var(--foreground-muted);
          text-align: center;
          font-size: 13px;
          line-height: 1.7;
        }

        .spin {
          animation: agentSpin .9s linear infinite;
        }

        @keyframes agentSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1180px) {
          .agent-control-panel {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .agent-workspace-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .agent-side-rail {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .agent-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .agent-service-chip {
            width: 100%;
          }

          .agent-control-panel,
          .agent-metric-grid,
          .agent-evidence-grid,
          .agent-indicator-grid,
          .agent-analysis-notes,
          .agent-side-rail {
            grid-template-columns: 1fr;
          }

          .agent-skeleton-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .agent-workspace-header,
          .agent-history-panel > header {
            align-items: flex-start;
            flex-direction: column;
          }

          .agent-history-search {
            width: 100%;
          }

          .agent-history-grid {
            min-width: 0;
            gap: 10px;
            overflow: visible;
          }

          .agent-history-head {
            display: none;
          }

          .agent-history-row {
            min-width: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 13px;
            border: 1px solid var(--border);
            border-radius: var(--radius-card);
            background: var(--surface-muted);
          }

          .agent-history-row > [role='cell'] {
            min-width: 0;
            display: grid;
            gap: 4px;
          }

          .agent-history-row > [role='cell']::before {
            content: attr(data-label);
            color: var(--foreground-muted);
            font-size: 10px;
            font-weight: 500;
          }
        }

        @media (max-width: 560px) {
          .agent-page-header,
          .agent-control-panel,
          .agent-workspace,
          .agent-history-panel {
            padding: 14px;
          }

          .agent-control-panel,
          .agent-loading-state,
          .agent-empty-state {
            grid-template-columns: 1fr;
          }

          .agent-empty-icon {
            width: 46px;
            height: 46px;
          }

          .agent-skeleton-grid,
          .agent-history-row {
            grid-template-columns: 1fr;
          }

          .agent-timeframe-options,
          .agent-primary-action,
          .agent-secondary-action {
            width: 100%;
          }

          .agent-timeframe-options button {
            flex: 1;
            min-height: 40px;
          }

          .agent-workspace-header .agent-signal-badge {
            width: 100%;
          }

          .agent-chart-track {
            height: 260px;
            overflow-x: auto;
          }

          .agent-level-marker b {
            max-width: 74px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .agent-skeleton-grid span,
          .spin {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="agent-metric">
      {icon}
      <span>{label}</span>
      <strong dir="ltr">{value || '-'}</strong>
    </div>
  );
}

function TrendPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
}) {
  return (
    <div className={`agent-trend-pill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IndicatorCard({ item }: { item: IndicatorView }) {
  return (
    <article className={`agent-indicator-card ${item.tone}`}>
      <div>
        <span>{item.label}</span>
        <strong dir="ltr">{item.value}</strong>
      </div>
      <b>{item.status}</b>
    </article>
  );
}

function MarketLevelChart({ result, text }: { result: MarketAgentAnalysisResult; text: Copy }) {
  const levels = [
    ...result.support.map((value, index) => ({
      label: `${text.support} ${index + 1}`,
      value,
      type: 'support' as const,
    })),
    {
      label: text.currentPrice,
      value: result.currentPrice,
      type: 'price' as const,
    },
    ...result.resistance.map((value, index) => ({
      label: `${text.resistance} ${index + 1}`,
      value,
      type: 'resistance' as const,
    })),
    ...result.takeProfit.map((value, index) => ({
      label: `TP${index + 1}`,
      value,
      type: 'target' as const,
    })),
    ...(result.stopLoss
      ? [{
          label: text.stopLoss,
          value: result.stopLoss,
          type: 'stop' as const,
        }]
      : []),
  ].filter(item => Number.isFinite(item.value));

  const rawMin = Math.min(...levels.map(item => item.value), result.entryZone.from, result.entryZone.to);
  const rawMax = Math.max(...levels.map(item => item.value), result.entryZone.from, result.entryZone.to);
  const padding = Math.max((rawMax - rawMin) * 0.08, Math.abs(result.currentPrice) * 0.005, 0.01);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = Math.max(max - min, 0.01);
  const position = (value: number) => clampPercent(((value - min) / range) * 100);
  const entryStart = Math.min(position(result.entryZone.from), position(result.entryZone.to));
  const entryEnd = Math.max(position(result.entryZone.from), position(result.entryZone.to));

  return (
    <section className="agent-section-card agent-chart-card">
      <div className="agent-section-heading">
        <div>
          <span><LineChart size={16} aria-hidden="true" /> {text.chartTitle}</span>
          <p>{text.chartUnavailable}</p>
        </div>
      </div>
      <div className="agent-level-chart" role="img" aria-label={`${text.chartTitle}: ${result.symbol}`}>
        <div className="agent-chart-track">
          <span
            className="agent-entry-zone"
            style={{
              insetInlineStart: `${entryStart}%`,
              inlineSize: `${Math.max(4, entryEnd - entryStart)}%`,
            }}
          />
          {levels.map(item => (
            <span
              className={`agent-level-marker ${item.type}`}
              key={`${item.type}-${item.label}-${item.value}`}
              style={{ insetInlineStart: `${position(item.value)}%` }}
            >
              <i aria-hidden="true" />
              <b>{item.label}</b>
              <em dir="ltr">{formatNumber(item.value)}</em>
            </span>
          ))}
        </div>
        <div className="agent-level-scale">
          <span dir="ltr">{formatNumber(min)}</span>
          <span>{text.potentialEntry}</span>
          <span dir="ltr">{formatNumber(max)}</span>
        </div>
      </div>
    </section>
  );
}
