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
import { Sidebar } from '@/components/Sidebar';
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
      <Sidebar />
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
                    <div><dt>{text.dataStatusTitle}</dt><dd><CheckCircle2 size={15} aria-hidden="true" /> {text.connected}</dd></div>
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
        .market-agent-page{
          --agent-page-max:1360px;
          --agent-gutter:clamp(18px,2vw,32px);
          --agent-bg:
            radial-gradient(circle at 16% 6%,rgba(24,212,212,.15),transparent 30%),
            linear-gradient(180deg,#eef7ff 0%,#f8fcff 48%,#edf6ff 100%);
          --agent-surface:#ffffff;
          --agent-surface-soft:#f7fbff;
          --agent-border:rgba(29,140,255,.16);
          --agent-border-strong:rgba(29,140,255,.28);
          --agent-text:#0b172a;
          --agent-heading:#061b33;
          --agent-muted:#475569;
          --agent-muted-soft:#64748b;
          --agent-primary:#1d8cff;
          --agent-accent:#18d4d4;
          --agent-success:#047857;
          --agent-warning:#b45309;
          --agent-danger:#b91c1c;
          --agent-shadow:0 18px 46px rgba(3,18,37,.08);
          --agent-shadow-soft:0 10px 28px rgba(3,18,37,.055);
          width:100%;
          max-width:100%;
          min-height:100vh;
          background:var(--agent-bg);
          color:var(--agent-text);
          font-family:Tajawal,Arial,sans-serif;
          color-scheme:light;
          overflow-x:clip;
        }

        :global(.dark) .market-agent-page{
          --agent-bg:
            radial-gradient(circle at 18% 6%,rgba(24,212,212,.10),transparent 30%),
            linear-gradient(180deg,#081625 0%,#0a1a2d 52%,#071421 100%);
          --agent-surface:#0f1d31;
          --agent-surface-soft:#13243a;
          --agent-border:#1d3050;
          --agent-border-strong:rgba(47,214,192,.36);
          --agent-text:#e8eef6;
          --agent-heading:#f8fbff;
          --agent-muted:#b8c7d9;
          --agent-muted-soft:#94a9c2;
          --agent-primary:#2a98ff;
          --agent-accent:#2fd6c0;
          --agent-shadow:0 20px 54px rgba(0,0,0,.28);
          --agent-shadow-soft:0 12px 30px rgba(0,0,0,.22);
          color-scheme:dark;
        }

        .market-agent-page *{box-sizing:border-box}

        .market-agent-main{
          width:100%;
          max-width:100%;
          min-height:100vh;
          margin:0;
          padding:var(--agent-gutter);
          display:grid;
          align-content:start;
          gap:22px;
          overflow-x:clip;
        }

        .market-agent-main>*{
          width:100%;
          max-width:var(--agent-page-max);
          min-width:0;
          margin-inline:auto;
        }

        .market-agent-page[dir="rtl"] .market-agent-main{
          padding-inline-start:calc(var(--sidebar-w,230px) + var(--agent-gutter));
          padding-inline-end:var(--agent-gutter);
        }

        .market-agent-page[dir="ltr"] .market-agent-main{
          padding-inline-start:var(--agent-gutter);
          padding-inline-end:calc(var(--sidebar-w,230px) + var(--agent-gutter));
        }

        .agent-page-header{
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(230px,320px);
          align-items:end;
          gap:18px;
          padding:26px 28px;
          border:1px solid rgba(167,243,240,.18);
          border-radius:26px;
          background:
            radial-gradient(circle at 12% 8%,rgba(24,212,212,.18),transparent 32%),
            linear-gradient(135deg,#061b33 0%,#08243f 56%,#0d4b61 100%);
          box-shadow:var(--agent-shadow);
          color:#fff;
        }

        .agent-header-copy{
          display:grid;
          gap:10px;
          min-width:0;
        }

        .agent-ai-badge{
          width:max-content;
          max-width:100%;
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:7px 13px;
          border-radius:999px;
          border:1px solid rgba(119,232,229,.35);
          background:rgba(32,212,207,.12);
          color:#9ff6f0;
          font-size:12px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-page-header h1{
          margin:0;
          color:#fff;
          font-size:clamp(32px,3.2vw,44px);
          line-height:1.12;
          font-weight:950;
          letter-spacing:0;
        }

        .agent-page-header p{
          margin:0;
          max-width:780px;
          color:#d8e8f4;
          font-size:15px;
          line-height:1.8;
          font-weight:800;
        }

        .agent-service-chip{
          justify-self:end;
          width:100%;
          display:flex;
          align-items:center;
          gap:12px;
          min-height:64px;
          padding:12px 14px;
          border-radius:18px;
          border:1px solid rgba(167,243,240,.20);
          background:rgba(255,255,255,.08);
          color:#f8fcff;
        }

        .agent-live-dot{
          width:11px;
          height:11px;
          border-radius:50%;
          background:#34d399;
          box-shadow:0 0 0 6px rgba(52,211,153,.14);
        }

        .agent-service-chip small{
          display:block;
          color:#b9d7e7;
          font-size:12px;
          font-weight:900;
          line-height:1.2;
        }

        .agent-service-chip strong{
          display:block;
          margin-top:4px;
          color:#fff;
          font-size:13px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-control-panel{
          display:grid;
          grid-template-columns:minmax(280px,1.35fr) minmax(190px,.5fr) minmax(300px,.72fr) minmax(170px,.4fr);
          align-items:end;
          gap:14px;
          padding:22px;
          border:1px solid var(--agent-border);
          border-radius:22px;
          background:rgba(255,255,255,.96);
          box-shadow:var(--agent-shadow);
        }

        :global(.dark) .agent-control-panel{
          background:var(--agent-surface);
        }

        .agent-field,
        .agent-timeframe-group{
          display:grid;
          gap:8px;
          min-width:0;
        }

        .agent-field>span,
        .agent-timeframe-group>span{
          color:var(--agent-muted);
          font-size:13px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-field small{
          min-height:16px;
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:800;
          line-height:1.35;
        }

        .agent-input-shell,
        .agent-select-shell{
          min-height:52px;
          display:flex;
          align-items:center;
          gap:10px;
          border:1px solid var(--agent-border-strong);
          background:var(--agent-surface-soft);
          color:var(--agent-text);
          border-radius:14px;
          padding:0 13px;
          transition:border-color .18s ease,box-shadow .18s ease,background .18s ease;
        }

        .agent-input-shell.has-error{
          border-color:rgba(185,28,28,.32);
        }

        .agent-input-shell svg,
        .agent-select-shell svg{
          flex:0 0 auto;
          color:var(--agent-primary);
        }

        .agent-input-shell:focus-within,
        .agent-select-shell:focus-within{
          border-color:var(--agent-accent);
          box-shadow:0 0 0 4px rgba(24,212,212,.16);
          background:var(--agent-surface);
        }

        input,
        select{
          width:100%;
          min-width:0;
          height:100%;
          border:0;
          outline:0;
          background:transparent;
          color:var(--agent-text);
          font:900 14px Tajawal,Arial,sans-serif;
          -webkit-text-fill-color:var(--agent-text);
        }

        input{text-transform:uppercase}

        input::placeholder{
          color:var(--agent-muted-soft);
          text-transform:none;
          -webkit-text-fill-color:var(--agent-muted-soft);
        }

        select{
          min-height:50px;
          appearance:none;
          cursor:pointer;
        }

        option{
          background:var(--agent-surface);
          color:var(--agent-text);
        }

        .agent-timeframe-options{
          display:grid;
          grid-template-columns:repeat(5,minmax(48px,1fr));
          gap:6px;
          padding:4px;
          border:1px solid var(--agent-border);
          border-radius:16px;
          background:var(--agent-surface-soft);
        }

        .agent-timeframe-options button{
          min-height:42px;
          min-width:0;
          border:1px solid transparent;
          background:transparent;
          color:var(--agent-muted);
          border-radius:12px;
          font:950 13px Arial,sans-serif;
          cursor:pointer;
          transition:background .18s ease,color .18s ease,box-shadow .18s ease,transform .18s ease;
        }

        .agent-timeframe-options button:hover,
        .agent-timeframe-options button:focus-visible{
          outline:0;
          background:rgba(29,140,255,.10);
          color:var(--agent-heading);
        }

        .agent-timeframe-options button.active{
          background:linear-gradient(135deg,var(--agent-primary),var(--agent-accent));
          color:#fff;
          box-shadow:0 10px 22px rgba(29,140,255,.20);
        }

        .agent-primary-action,
        .agent-secondary-action,
        .agent-row-action{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border-radius:14px;
          font-family:Tajawal,Arial,sans-serif;
          font-weight:950;
          line-height:1.2;
          cursor:pointer;
          transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease;
        }

        .agent-primary-action{
          min-height:52px;
          width:100%;
          border:0;
          padding:0 18px;
          background:linear-gradient(135deg,var(--agent-primary),var(--agent-accent));
          color:#fff;
          font-size:14px;
          box-shadow:0 14px 34px rgba(29,140,255,.24);
          white-space:nowrap;
        }

        .agent-primary-action:not(:disabled):hover,
        .agent-primary-action:not(:disabled):focus-visible{
          outline:0;
          transform:translateY(-1px);
          box-shadow:0 18px 42px rgba(29,140,255,.30),0 0 0 4px rgba(24,212,212,.15);
        }

        .agent-primary-action:disabled{
          opacity:.58;
          cursor:not-allowed;
          box-shadow:none;
        }

        .agent-legal-notice{
          display:grid;
          grid-template-columns:auto minmax(0,1fr);
          gap:12px;
          align-items:start;
          padding:14px 16px;
          border:1px solid rgba(180,83,9,.18);
          border-radius:18px;
          background:linear-gradient(135deg,rgba(255,247,237,.92),rgba(255,255,255,.96));
          box-shadow:0 10px 28px rgba(3,18,37,.045);
        }

        :global(.dark) .agent-legal-notice{
          background:rgba(245,158,11,.10);
          border-color:rgba(245,158,11,.24);
        }

        .agent-legal-notice>span{
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:14px;
          background:rgba(245,158,11,.12);
          color:var(--agent-warning);
        }

        .agent-legal-notice strong{
          display:block;
          color:var(--agent-heading);
          font-size:13px;
          font-weight:950;
          margin-bottom:2px;
        }

        .agent-legal-notice p{
          margin:0;
          color:var(--agent-muted);
          font-size:13px;
          font-weight:850;
          line-height:1.75;
        }

        .spin{animation:agentSpin 1s linear infinite}
        @keyframes agentSpin{to{transform:rotate(360deg)}}

        .agent-loading-state,
        .agent-result-panel,
        .agent-empty-state,
        .agent-history-panel{
          border:1px solid var(--agent-border);
          background:linear-gradient(180deg,var(--agent-surface),var(--agent-surface-soft));
          border-radius:24px;
          padding:22px;
          box-shadow:var(--agent-shadow);
        }

        .agent-loading-state,
        .agent-empty-state{
          display:grid;
          grid-template-columns:auto minmax(0,1fr);
          align-items:center;
          gap:18px;
          min-height:190px;
        }

        .agent-empty-icon{
          width:58px;
          height:58px;
          display:grid;
          place-items:center;
          border-radius:20px;
          background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(24,212,212,.16));
          color:var(--agent-primary);
          border:1px solid rgba(24,212,212,.20);
        }

        .agent-empty-state.error .agent-empty-icon{
          background:rgba(239,68,68,.10);
          color:var(--agent-danger);
          border-color:rgba(239,68,68,.20);
        }

        .agent-empty-copy{
          display:grid;
          gap:10px;
          min-width:0;
        }

        .agent-loading-state h2,
        .agent-empty-state h2{
          margin:0;
          color:var(--agent-heading);
          font-size:clamp(20px,2vw,25px);
          font-weight:950;
          line-height:1.35;
        }

        .agent-loading-state p,
        .agent-empty-state p{
          margin:0;
          max-width:760px;
          color:var(--agent-muted);
          font-size:14px;
          font-weight:850;
          line-height:1.8;
        }

        .agent-example-row{
          display:flex;
          align-items:center;
          flex-wrap:wrap;
          gap:8px;
          margin-top:4px;
        }

        .agent-example-row>span{
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
        }

        .agent-example-row button,
        .agent-secondary-action{
          min-height:38px;
          border:1px solid var(--agent-border);
          background:var(--agent-surface);
          color:var(--agent-heading);
          padding:0 12px;
          border-radius:999px;
          font:950 12px Tajawal,Arial,sans-serif;
          cursor:pointer;
        }

        .agent-secondary-action{
          width:max-content;
          min-height:42px;
          padding:0 16px;
          border-color:rgba(24,212,212,.26);
          background:rgba(24,212,212,.10);
          color:#047a8f;
        }

        .agent-example-row button:hover,
        .agent-example-row button:focus-visible,
        .agent-secondary-action:hover,
        .agent-secondary-action:focus-visible{
          outline:0;
          border-color:var(--agent-border-strong);
          background:rgba(24,212,212,.14);
          box-shadow:0 0 0 4px rgba(24,212,212,.12);
        }

        .agent-skeleton-grid{
          grid-column:1/-1;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
        }

        .agent-skeleton-grid span{
          height:84px;
          border-radius:16px;
          background:linear-gradient(90deg,rgba(29,140,255,.08),rgba(24,212,212,.14),rgba(29,140,255,.08));
          background-size:220% 100%;
          animation:agentSkeleton 1.1s ease-in-out infinite;
        }

        @keyframes agentSkeleton{
          to{background-position:-220% 0}
        }

        .agent-result-panel>header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
        }

        .agent-result-panel>header span{
          color:var(--agent-muted);
          font-size:13px;
          font-weight:950;
        }

        .agent-result-panel h2{
          margin:5px 0 0;
          color:var(--agent-heading);
          font-size:clamp(28px,3vw,38px);
          line-height:1.1;
          font-weight:950;
        }

        .agent-result-panel.positive h2,
        .agent-result-panel.positive .agent-score-ring strong{color:var(--agent-success)}

        .agent-result-panel.negative h2,
        .agent-result-panel.negative .agent-score-ring strong{color:var(--agent-danger)}

        .agent-result-panel.neutral h2,
        .agent-result-panel.neutral .agent-score-ring strong{color:var(--agent-warning)}

        .agent-score-ring{
          width:100px;
          height:100px;
          flex:0 0 auto;
          border-radius:50%;
          display:grid;
          place-items:center;
          text-align:center;
          border:1px solid rgba(24,212,212,.28);
          background:linear-gradient(145deg,rgba(29,140,255,.08),rgba(24,212,212,.12));
        }

        .agent-score-ring strong{
          display:block;
          font-size:27px;
          font-weight:950;
          line-height:1.1;
        }

        .agent-score-ring span{
          display:block;
          color:var(--agent-muted);
          font-size:11px;
          font-weight:950;
        }

        .agent-metric-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:12px;
        }

        .agent-metric{
          min-height:112px;
          display:grid;
          align-content:space-between;
          gap:10px;
          padding:14px;
          border:1px solid var(--agent-border);
          background:var(--agent-surface);
          border-radius:18px;
          box-shadow:var(--agent-shadow-soft);
        }

        .agent-metric svg{color:var(--agent-primary)}

        .agent-metric span{
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-metric strong{
          color:var(--agent-heading);
          font-size:15px;
          font-weight:950;
          line-height:1.35;
          overflow-wrap:anywhere;
        }

        .agent-workspace{
          border:1px solid var(--agent-border);
          background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(247,251,255,.96));
          border-radius:26px;
          padding:22px;
          box-shadow:var(--agent-shadow);
        }

        :global(.dark) .agent-workspace{
          background:linear-gradient(180deg,rgba(15,29,49,.96),rgba(11,25,43,.98));
        }

        .agent-workspace-header{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
        }

        .agent-workspace-header span{
          color:var(--agent-muted);
          font-size:12px;
          font-weight:950;
          letter-spacing:0;
        }

        .agent-workspace-header h2{
          margin:5px 0 0;
          color:var(--agent-heading);
          font-size:clamp(24px,2.5vw,34px);
          line-height:1.2;
          font-weight:950;
        }

        .agent-workspace-grid{
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(300px,360px);
          gap:18px;
          align-items:start;
        }

        .agent-main-column,
        .agent-side-rail{
          min-width:0;
          display:grid;
          gap:16px;
        }

        .agent-side-rail{
          position:sticky;
          top:20px;
        }

        .agent-section-card,
        .agent-side-card{
          min-width:0;
          border:1px solid var(--agent-border);
          background:linear-gradient(180deg,var(--agent-surface),var(--agent-surface-soft));
          border-radius:22px;
          padding:18px;
          box-shadow:var(--agent-shadow-soft);
        }

        .agent-section-heading{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
          margin-bottom:14px;
        }

        .agent-section-heading span{
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--agent-heading);
          font-size:16px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-section-heading span svg{
          color:var(--agent-primary);
        }

        .agent-section-heading p{
          margin:4px 0 0;
          color:var(--agent-muted);
          font-size:12px;
          font-weight:850;
          line-height:1.65;
        }

        .agent-metric-grid.compact{
          grid-template-columns:repeat(3,minmax(0,1fr));
        }

        .agent-chart-card{
          overflow:hidden;
        }

        .agent-level-chart{
          display:grid;
          gap:12px;
          min-width:0;
        }

        .agent-chart-track{
          position:relative;
          min-height:210px;
          border:1px solid rgba(29,140,255,.14);
          border-radius:20px;
          background:
            linear-gradient(90deg,rgba(29,140,255,.08) 1px,transparent 1px),
            linear-gradient(0deg,rgba(29,140,255,.08) 1px,transparent 1px),
            linear-gradient(180deg,rgba(24,212,212,.08),rgba(29,140,255,.04));
          background-size:64px 64px,64px 64px,100% 100%;
          overflow:hidden;
        }

        .agent-chart-track::before{
          content:"";
          position:absolute;
          inset-inline:22px;
          inset-block-start:50%;
          height:3px;
          border-radius:999px;
          background:linear-gradient(90deg,rgba(29,140,255,.18),rgba(24,212,212,.8),rgba(29,140,255,.18));
        }

        .agent-entry-zone{
          position:absolute;
          inset-block:38px 32px;
          border-radius:999px;
          border:1px solid rgba(24,212,212,.32);
          background:linear-gradient(180deg,rgba(24,212,212,.18),rgba(29,140,255,.08));
          box-shadow:0 0 0 4px rgba(24,212,212,.06);
        }

        .agent-level-marker{
          position:absolute;
          inset-block-start:24px;
          transform:translateX(-50%);
          display:grid;
          justify-items:center;
          gap:5px;
          min-width:76px;
          max-width:118px;
          text-align:center;
          pointer-events:none;
        }

        .market-agent-page[dir="rtl"] .agent-level-marker{
          transform:translateX(50%);
        }

        .agent-level-marker.price{
          inset-block-start:84px;
        }

        .agent-level-marker.target{
          inset-block-start:136px;
        }

        .agent-level-marker.stop{
          inset-block-start:160px;
        }

        .agent-level-marker i{
          width:11px;
          height:11px;
          border-radius:999px;
          border:2px solid var(--agent-surface);
          box-shadow:0 0 0 3px rgba(29,140,255,.12);
          background:var(--agent-primary);
        }

        .agent-level-marker.support i{background:var(--agent-success)}
        .agent-level-marker.resistance i{background:var(--agent-warning)}
        .agent-level-marker.target i{background:var(--agent-primary)}
        .agent-level-marker.stop i{background:var(--agent-danger)}

        .agent-level-marker b{
          color:var(--agent-muted);
          font-size:11px;
          font-weight:950;
          line-height:1.25;
        }

        .agent-level-marker em{
          padding:3px 7px;
          border-radius:999px;
          background:rgba(255,255,255,.9);
          border:1px solid rgba(29,140,255,.14);
          color:var(--agent-heading);
          font-style:normal;
          font-size:11px;
          font-weight:950;
          line-height:1.25;
          box-shadow:0 8px 18px rgba(3,18,37,.06);
        }

        :global(.dark) .agent-level-marker em{
          background:rgba(15,29,49,.92);
        }

        .agent-level-scale{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          color:var(--agent-muted);
          font-size:12px;
          font-weight:950;
        }

        .agent-evidence-grid,
        .agent-indicator-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
        }

        .agent-indicator-grid{
          grid-template-columns:repeat(3,minmax(0,1fr));
        }

        .agent-trend-pill,
        .agent-indicator-card{
          min-width:0;
          display:grid;
          gap:8px;
          padding:13px;
          border:1px solid var(--agent-border);
          border-radius:16px;
          background:var(--agent-surface);
        }

        .agent-trend-pill span,
        .agent-indicator-card span{
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
          line-height:1.3;
        }

        .agent-trend-pill strong,
        .agent-indicator-card strong{
          color:var(--agent-heading);
          font-size:14px;
          font-weight:950;
          line-height:1.35;
          overflow-wrap:anywhere;
        }

        .agent-indicator-card{
          min-height:108px;
          align-content:space-between;
        }

        .agent-indicator-card div{
          display:grid;
          gap:5px;
        }

        .agent-indicator-card b{
          width:max-content;
          max-width:100%;
          min-height:28px;
          display:inline-flex;
          align-items:center;
          padding:0 9px;
          border-radius:999px;
          font-size:11px;
          font-weight:950;
          color:var(--agent-muted);
          background:rgba(100,116,139,.10);
        }

        .agent-trend-pill.positive,
        .agent-indicator-card.positive{
          border-color:rgba(4,120,87,.22);
          background:linear-gradient(180deg,rgba(236,253,245,.92),var(--agent-surface));
        }

        .agent-trend-pill.negative,
        .agent-indicator-card.negative{
          border-color:rgba(185,28,28,.20);
          background:linear-gradient(180deg,rgba(254,242,242,.92),var(--agent-surface));
        }

        .agent-trend-pill.warning,
        .agent-indicator-card.warning{
          border-color:rgba(180,83,9,.22);
          background:linear-gradient(180deg,rgba(255,251,235,.92),var(--agent-surface));
        }

        :global(.dark) .agent-trend-pill.positive,
        :global(.dark) .agent-indicator-card.positive{
          background:linear-gradient(180deg,rgba(4,120,87,.16),var(--agent-surface));
        }

        :global(.dark) .agent-trend-pill.negative,
        :global(.dark) .agent-indicator-card.negative{
          background:linear-gradient(180deg,rgba(185,28,28,.16),var(--agent-surface));
        }

        :global(.dark) .agent-trend-pill.warning,
        :global(.dark) .agent-indicator-card.warning{
          background:linear-gradient(180deg,rgba(180,83,9,.16),var(--agent-surface));
        }

        .agent-analysis-notes{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:12px;
        }

        .agent-analysis-notes article{
          min-width:0;
          padding:15px;
          border:1px solid var(--agent-border);
          border-radius:16px;
          background:var(--agent-surface);
        }

        .agent-analysis-notes h3{
          margin:0 0 8px;
          color:var(--agent-heading);
          font-size:15px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-analysis-notes p{
          margin:0;
          color:var(--agent-muted);
          font-size:13px;
          font-weight:850;
          line-height:1.8;
        }

        .agent-side-card{
          display:grid;
          gap:13px;
        }

        .agent-side-card h3{
          margin:0;
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--agent-heading);
          font-size:15px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-side-card h3 svg{
          color:var(--agent-primary);
        }

        .agent-side-kicker{
          width:max-content;
          max-width:100%;
          display:inline-flex;
          min-height:30px;
          align-items:center;
          border-radius:999px;
          padding:0 10px;
          color:var(--agent-primary);
          background:rgba(29,140,255,.10);
          font-size:12px;
          font-weight:950;
        }

        .agent-signal-card h3{
          margin:0;
          color:var(--agent-heading);
          font-size:28px;
          font-weight:950;
          line-height:1.15;
        }

        .agent-side-rail.buy .agent-signal-card h3,
        .agent-side-rail.buy .agent-score-ring strong{color:var(--agent-success)}

        .agent-side-rail.sell .agent-signal-card h3,
        .agent-side-rail.sell .agent-score-ring strong{color:var(--agent-danger)}

        .agent-side-rail.wait .agent-signal-card h3,
        .agent-side-rail.wait .agent-score-ring strong{color:var(--agent-warning)}

        .agent-signal-card dl,
        .agent-data-list{
          display:grid;
          gap:9px;
          margin:0;
        }

        .agent-signal-card dl div,
        .agent-data-list div{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding-bottom:9px;
          border-bottom:1px solid rgba(29,140,255,.12);
        }

        .agent-signal-card dl div:last-child,
        .agent-data-list div:last-child{
          border-bottom:0;
          padding-bottom:0;
        }

        .agent-data-list dd{
          display:flex;
          align-items:center;
          gap:6px;
        }

        .agent-data-list dd svg{
          color:var(--agent-success);
        }

        .agent-factor-list{
          display:grid;
          gap:12px;
        }

        .agent-factor{
          display:grid;
          gap:7px;
        }

        .agent-factor div{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }

        .agent-factor span,
        .agent-factor small{
          color:var(--agent-muted);
          font-size:12px;
          font-weight:850;
          line-height:1.55;
        }

        .agent-factor strong{
          color:var(--agent-heading);
          font-size:13px;
          font-weight:950;
        }

        .agent-factor i{
          display:block;
          max-width:100%;
          height:7px;
          border-radius:999px;
          background:linear-gradient(90deg,var(--agent-primary),var(--agent-accent));
        }

        .agent-quick-actions{
          grid-template-columns:1fr;
        }

        .agent-quick-actions button{
          min-height:44px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border:1px solid var(--agent-border);
          border-radius:14px;
          background:var(--agent-surface);
          color:var(--agent-heading);
          font:950 12px Tajawal,Arial,sans-serif;
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }

        .agent-quick-actions button:hover,
        .agent-quick-actions button:focus-visible{
          outline:0;
          transform:translateY(-1px);
          border-color:var(--agent-border-strong);
          background:rgba(24,212,212,.12);
          box-shadow:0 0 0 4px rgba(24,212,212,.10);
        }

        .agent-detail-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:14px;
          margin-top:14px;
        }

        .agent-detail-grid section,
        .agent-explanation{
          border:1px solid var(--agent-border);
          background:var(--agent-surface-soft);
          border-radius:18px;
          padding:16px;
        }

        .market-agent-page h3{
          margin:0 0 12px;
          color:var(--agent-heading);
          font-size:16px;
          font-weight:950;
          display:flex;
          align-items:center;
          gap:8px;
        }

        .market-agent-page h3 svg{color:var(--agent-primary)}

        .market-agent-page dl{
          margin:0;
          display:grid;
          gap:8px;
        }

        .market-agent-page dl div{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          border-bottom:1px solid rgba(29,140,255,.12);
          padding-bottom:8px;
        }

        .market-agent-page dl div:last-child{
          border-bottom:0;
          padding-bottom:0;
        }

        .market-agent-page dt{
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
        }

        .market-agent-page dd{
          margin:0;
          color:var(--agent-heading);
          font-size:13px;
          font-weight:950;
          text-align:end;
        }

        .agent-explanation{
          margin-top:14px;
          display:grid;
          gap:10px;
        }

        .agent-explanation p{
          margin:0;
          color:var(--agent-muted);
          line-height:1.85;
          font-size:14px;
          font-weight:850;
        }

        .agent-history-panel{
          display:grid;
          gap:14px;
        }

        .agent-history-panel>header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
        }

        .agent-history-panel>header span{
          display:flex;
          align-items:center;
          gap:8px;
          color:var(--agent-heading);
          font-size:20px;
          font-weight:950;
          line-height:1.35;
        }

        .agent-history-panel>header span svg{color:var(--agent-primary)}

        .agent-history-panel>header p{
          margin:4px 0 0;
          color:var(--agent-muted);
          font-size:13px;
          font-weight:850;
        }

        .agent-history-search{
          min-height:42px;
          min-width:min(280px,100%);
          display:flex;
          align-items:center;
          gap:9px;
          padding:0 12px;
          border:1px solid var(--agent-border);
          border-radius:14px;
          background:var(--agent-surface-soft);
          color:var(--agent-muted);
        }

        .agent-history-search svg{
          flex:0 0 auto;
          color:var(--agent-primary);
        }

        .agent-history-search input{
          width:100%;
          min-width:0;
          border:0;
          outline:0;
          background:transparent;
          color:var(--agent-heading);
          font:900 13px Tajawal,Arial,sans-serif;
        }

        .agent-history-search input::placeholder{
          color:var(--agent-muted-soft);
        }

        .agent-history-search:focus-within{
          border-color:var(--agent-border-strong);
          box-shadow:0 0 0 4px rgba(24,212,212,.12);
        }

        .agent-history-grid{
          display:grid;
          gap:8px;
        }

        .agent-history-head,
        .agent-history-row{
          display:grid;
          grid-template-columns:minmax(120px,1.1fr) minmax(100px,.8fr) 82px 92px 92px 100px minmax(150px,1fr) minmax(130px,.9fr);
          align-items:center;
          gap:10px;
        }

        .agent-history-head{
          min-height:40px;
          padding:0 14px;
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
        }

        .agent-history-row{
          min-height:70px;
          padding:12px 14px;
          border:1px solid var(--agent-border);
          border-radius:16px;
          background:var(--agent-surface);
          color:var(--agent-text);
          box-shadow:0 8px 20px rgba(3,18,37,.04);
          transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
        }

        .agent-history-row:hover{
          transform:translateY(-1px);
          border-color:var(--agent-border-strong);
          box-shadow:0 14px 30px rgba(3,18,37,.08);
        }

        .agent-history-row span,
        .agent-history-row small{
          color:var(--agent-muted);
          font-size:13px;
          font-weight:900;
          line-height:1.45;
        }

        .agent-history-asset{
          display:grid;
          gap:3px;
        }

        .agent-history-asset strong{
          color:var(--agent-heading);
          font-size:15px;
          font-weight:950;
          line-height:1.25;
        }

        .agent-pill,
        .agent-signal-badge,
        .agent-risk{
          width:max-content;
          max-width:100%;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:30px;
          border-radius:999px;
          padding:0 10px;
          font-size:12px;
          font-weight:950;
          line-height:1.2;
          border:1px solid transparent;
        }

        .agent-pill.neutral{
          background:rgba(29,140,255,.10);
          border-color:rgba(29,140,255,.16);
          color:#075985;
        }

        .agent-signal-badge.buy{
          background:#ecfdf5;
          color:#047857;
          border-color:rgba(4,120,87,.18);
        }

        .agent-signal-badge.sell{
          background:#fef2f2;
          color:#b91c1c;
          border-color:rgba(185,28,28,.16);
        }

        .agent-signal-badge.wait{
          background:#fff7ed;
          color:#b45309;
          border-color:rgba(180,83,9,.18);
        }

        .agent-risk.risk-low{
          background:rgba(16,185,129,.10);
          border-color:rgba(16,185,129,.18);
          color:#047857;
        }

        .agent-risk.risk-medium{
          background:rgba(245,158,11,.12);
          border-color:rgba(245,158,11,.20);
          color:#b45309;
        }

        .agent-risk.risk-high{
          background:rgba(239,68,68,.10);
          border-color:rgba(239,68,68,.18);
          color:#b91c1c;
        }

        .agent-row-action{
          min-height:38px;
          border:1px solid rgba(24,212,212,.24);
          background:rgba(24,212,212,.10);
          color:#047a8f;
          padding:0 12px;
          font-size:12px;
        }

        .agent-row-action:hover,
        .agent-row-action:focus-visible{
          outline:0;
          background:rgba(24,212,212,.16);
          box-shadow:0 0 0 4px rgba(24,212,212,.12);
        }

        .agent-history-empty{
          margin:0;
          padding:18px;
          border:1px dashed var(--agent-border-strong);
          border-radius:16px;
          background:var(--agent-surface-soft);
          color:var(--agent-muted);
          font-size:14px;
          font-weight:900;
          text-align:center;
        }

        :global(.dark) .agent-pill.neutral{
          color:#a7d8ff;
        }

        :global(.dark) .agent-signal-badge.buy,
        :global(.dark) .agent-risk.risk-low{
          background:rgba(16,185,129,.16);
          color:#86efac;
          border-color:rgba(16,185,129,.26);
        }

        :global(.dark) .agent-signal-badge.sell,
        :global(.dark) .agent-risk.risk-high{
          background:rgba(239,68,68,.16);
          color:#fca5a5;
          border-color:rgba(239,68,68,.26);
        }

        :global(.dark) .agent-signal-badge.wait,
        :global(.dark) .agent-risk.risk-medium{
          background:rgba(245,158,11,.16);
          color:#fcd34d;
          border-color:rgba(245,158,11,.26);
        }

        @media(max-width:1280px){
          .agent-control-panel{
            grid-template-columns:minmax(0,1fr) minmax(180px,.55fr);
          }
          .agent-timeframe-group,
          .agent-primary-action{
            grid-column:1/-1;
          }
          .agent-metric-grid{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .agent-history-head,
          .agent-history-row{
            grid-template-columns:minmax(120px,1fr) minmax(96px,.75fr) 76px 90px 88px 96px minmax(128px,.9fr) minmax(120px,.7fr);
          }
          .agent-workspace-grid{
            grid-template-columns:minmax(0,1fr) minmax(280px,320px);
          }
          .agent-metric-grid.compact{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
          .agent-evidence-grid,
          .agent-indicator-grid{
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media(max-width:1024px){
          .market-agent-page{
            overflow-x:clip;
          }
          .market-agent-page[dir="rtl"] .market-agent-main,
          .market-agent-page[dir="ltr"] .market-agent-main,
          .market-agent-main{
            width:100%;
            max-width:100%;
            margin:0;
            padding:calc(22px + env(safe-area-inset-top)) 18px 42px!important;
          }
          .market-agent-main>*{
            max-width:100%;
            margin-inline:0;
          }
          .agent-page-header{
            grid-template-columns:1fr;
            align-items:start;
          }
          .agent-service-chip{
            justify-self:stretch;
          }
          .agent-history-head{
            display:none;
          }
          .agent-history-row{
            grid-template-columns:1fr 1fr;
            align-items:start;
          }
          .agent-history-row [role="cell"]{
            display:grid;
            gap:3px;
          }
          .agent-history-row [role="cell"]::before{
            content:attr(data-label);
          }
          .agent-workspace-grid{
            grid-template-columns:1fr;
          }
          .agent-side-rail{
            position:static;
          }
          .agent-history-panel>header{
            display:grid;
            align-items:stretch;
          }
          .agent-history-search{
            width:100%;
          }
        }

        @media(max-width:768px){
          .market-agent-page[dir="rtl"] .market-agent-main,
          .market-agent-page[dir="ltr"] .market-agent-main,
          .market-agent-main{
            padding-inline:14px!important;
          }
          .agent-page-header,
          .agent-control-panel,
          .agent-loading-state,
          .agent-empty-state,
          .agent-workspace,
          .agent-result-panel,
          .agent-history-panel{
            border-radius:20px;
            padding:18px;
          }
          .agent-workspace-header{
            display:grid;
          }
          .agent-control-panel,
          .agent-detail-grid,
          .agent-analysis-notes{
            grid-template-columns:1fr;
          }
          .agent-timeframe-group,
          .agent-primary-action{
            grid-column:auto;
          }
          .agent-timeframe-options{
            display:flex;
            overflow-x:auto;
            scrollbar-width:none;
            -webkit-overflow-scrolling:touch;
          }
          .agent-timeframe-options::-webkit-scrollbar{display:none}
          .agent-timeframe-options button{
            min-width:62px;
            flex:0 0 auto;
          }
          .agent-loading-state,
          .agent-empty-state{
            grid-template-columns:1fr;
            justify-items:start;
          }
          .agent-skeleton-grid,
          .agent-metric-grid,
          .agent-metric-grid.compact,
          .agent-evidence-grid,
          .agent-indicator-grid,
          .agent-history-row{
            grid-template-columns:1fr;
          }
          .agent-chart-track{
            min-height:245px;
          }
          .agent-level-marker{
            min-width:66px;
          }
          .agent-level-marker.target{
            inset-block-start:150px;
          }
          .agent-level-marker.stop{
            inset-block-start:178px;
          }
          .agent-result-panel>header{
            align-items:flex-start;
          }
          .agent-score-ring{
            width:84px;
            height:84px;
          }
          .agent-secondary-action,
          .agent-primary-action{
            width:100%;
          }
        }

        @media(max-width:420px){
          .agent-page-header h1{
            font-size:30px;
          }
          .agent-page-header p,
          .agent-legal-notice p,
          .agent-empty-state p{
            font-size:13px;
          }
          .agent-control-panel{
            gap:12px;
          }
        }

        @media(prefers-reduced-motion:reduce){
          .spin,
          .agent-skeleton-grid span{
            animation:none!important;
          }
          .agent-primary-action,
          .agent-secondary-action,
          .agent-row-action,
          .agent-timeframe-options button,
          .agent-history-row{
            transition:none!important;
          }
          .agent-primary-action:hover,
          .agent-history-row:hover{
            transform:none!important;
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
