'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  ChevronDown,
  Clock3,
  Gauge,
  LineChart,
  Loader2,
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
    sourceReady: 'Yahoo Finance عند توفر البيانات',
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
    unavailable: 'لا توجد بيانات كافية لإصدار قراءة موثوقة لهذا الأصل حالياً.',
  },
  en: {
    title: 'Market Analysis Agent',
    subtitle: 'An automated research workspace for stocks, forex, indices, metals, and crypto using available market data.',
    badge: 'THE SFM AI',
    provider: 'Data provider',
    sourceReady: 'Yahoo Finance when data is available',
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
    unavailable: 'There is not enough reliable data for this asset at the moment.',
  },
  fr: {
    title: 'Agent d’analyse des marchés',
    subtitle: 'Un espace de recherche automatisé pour actions, forex, indices, métaux et cryptos avec les données disponibles.',
    badge: 'THE SFM AI',
    provider: 'Fournisseur',
    sourceReady: 'Yahoo Finance lorsque les données sont disponibles',
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
    unavailable: 'Les données fiables sont insuffisantes pour cet actif actuellement.',
  },
} as const;

type Copy = typeof COPY.ar;

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
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
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

  const labelDirection = (value: 'bullish' | 'bearish' | 'neutral') => text[value];
  const labelAction = (value: 'buy' | 'sell' | 'wait') => text[value];
  const labelRisk = (value: 'low' | 'medium' | 'high') => text[value];
  const labelAsset = (value: MarketAgentAssetType) => text[ASSET_LABEL_KEYS[value]] ?? value;
  const currentSource = result?.source || text.sourceReady;
  const isAnalyzeDisabled = loading || !symbol.trim();

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
        ) : result?.ok ? (
          <section className={`agent-result-panel ${actionTone}`}>
            <header>
              <div>
                <span>{result.symbol} · {labelAsset(result.assetType)} · {result.timeframe}</span>
                <h2>{labelAction(result.suggestedAction)}</h2>
              </div>
              <div className="agent-score-ring">
                <strong>{result.confidence}%</strong>
                <span>{text.confidence}</span>
              </div>
            </header>

            <div className="agent-metric-grid">
              <Metric icon={<LineChart size={18} />} label={text.currentPrice} value={formatNumber(result.currentPrice)} />
              <Metric icon={<TrendingUp size={18} />} label={text.direction} value={labelDirection(result.direction)} />
              <Metric icon={<Gauge size={18} />} label={text.risk} value={labelRisk(result.riskLevel)} />
              <Metric icon={<Target size={18} />} label={text.entryZone} value={`${formatNumber(result.entryZone.from)} - ${formatNumber(result.entryZone.to)}`} />
              <Metric icon={<ShieldAlert size={18} />} label={text.stopLoss} value={result.stopLoss ? formatNumber(result.stopLoss) : text.noValue} />
              <Metric icon={<TrendingUp size={18} />} label={text.takeProfit} value={joinLevels(result.takeProfit, text.noValue)} />
              <Metric icon={<TrendingDown size={18} />} label={text.support} value={joinLevels(result.support, text.noValue)} />
              <Metric icon={<TrendingUp size={18} />} label={text.resistance} value={joinLevels(result.resistance, text.noValue)} />
            </div>

            <div className="agent-detail-grid">
              <section>
                <h3>{text.trends}</h3>
                <dl>
                  <div><dt>{text.shortTerm}</dt><dd>{labelDirection(result.trends.shortTerm)}</dd></div>
                  <div><dt>{text.mediumTerm}</dt><dd>{labelDirection(result.trends.mediumTerm)}</dd></div>
                  <div><dt>{text.longTerm}</dt><dd>{labelDirection(result.trends.longTerm)}</dd></div>
                </dl>
              </section>
              <section>
                <h3>{text.indicators}</h3>
                <dl>
                  <div><dt>RSI</dt><dd>{result.indicators.rsi ?? text.noValue}</dd></div>
                  <div><dt>MACD</dt><dd>{result.indicators.macd}</dd></div>
                  <div><dt>EMA 20</dt><dd>{formatNumber(result.indicators.ema20)}</dd></div>
                  <div><dt>EMA 50</dt><dd>{formatNumber(result.indicators.ema50)}</dd></div>
                  <div><dt>EMA 200</dt><dd>{result.indicators.ema200 ? formatNumber(result.indicators.ema200) : text.noValue}</dd></div>
                  <div><dt>ATR</dt><dd>{result.indicators.atr ? formatNumber(result.indicators.atr) : text.noValue}</dd></div>
                </dl>
              </section>
            </div>

            <section className="agent-explanation">
              <h3><BrainCircuit size={18} aria-hidden="true" /> {text.explanation}</h3>
              <p>{result.summaryArabic}</p>
            </section>
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
              <p>{text.recentSubtitle}</p>
            </div>
            {historyLoading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
          </header>
          {history.length ? (
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
              {history.map(item => (
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

      <style jsx>{`
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

        h3{
          margin:0 0 12px;
          color:var(--agent-heading);
          font-size:16px;
          font-weight:950;
          display:flex;
          align-items:center;
          gap:8px;
        }

        h3 svg{color:var(--agent-primary)}

        dl{
          margin:0;
          display:grid;
          gap:8px;
        }

        dl div{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          border-bottom:1px solid rgba(29,140,255,.12);
          padding-bottom:8px;
        }

        dl div:last-child{
          border-bottom:0;
          padding-bottom:0;
        }

        dt{
          color:var(--agent-muted-soft);
          font-size:12px;
          font-weight:950;
        }

        dd{
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
          .agent-result-panel,
          .agent-history-panel{
            border-radius:20px;
            padding:18px;
          }
          .agent-control-panel,
          .agent-detail-grid{
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
          .agent-history-row{
            grid-template-columns:1fr;
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
      <strong>{value || '-'}</strong>
    </div>
  );
}
