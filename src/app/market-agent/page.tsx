'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Bot, BrainCircuit, Gauge, LineChart, Loader2, Search, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import type { MarketAgentAssetType, MarketAgentResponse, MarketAgentTimeframe } from '@/lib/market/marketAgent';

const DISCLAIMER_AR = 'هذا التحليل مجرد قراءة آلية للسوق وليس توصية مالية أو دعوة للشراء أو البيع. قرارات الاستثمار والتداول تقع على مسؤوليتك الشخصية.';
const DISCLAIMER_EN = 'This analysis is an automated market reading only and is not financial advice or a recommendation to buy or sell. Trading and investment decisions are your own responsibility.';

const COPY = {
  ar: {
    title: 'وكيل تحليل الأسواق',
    subtitle: 'تحليل آلي للأسهم والفوركس والمعادن والعملات الرقمية — للقراءة فقط وليس توصية مالية.',
    symbol: 'رمز الأصل',
    symbolPlaceholder: 'مثال: AAPL, TSLA, EURUSD, XAUUSD, BTCUSD, KFH.KW',
    assetType: 'نوع الأصل',
    timeframe: 'الإطار الزمني',
    analyze: 'تحليل الأصل',
    analyzing: 'جاري التحليل...',
    emptyTitle: 'ابدأ بإدخال رمز أصل',
    emptyBody: 'يعتمد الوكيل على بيانات السوق المتاحة من المزود. إذا لم تتوفر بيانات كافية، لن يعرض قراءة مصطنعة.',
    errorTitle: 'تعذر إصدار قراءة موثوقة',
    recentTitle: 'آخر التحليلات',
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
  },
  en: {
    title: 'Market Analysis Agent',
    subtitle: 'Automated analysis for stocks, forex, metals, and crypto — for reading only, not financial advice.',
    symbol: 'Symbol',
    symbolPlaceholder: 'Example: AAPL, TSLA, EURUSD, XAUUSD, BTCUSD, KFH.KW',
    assetType: 'Asset type',
    timeframe: 'Timeframe',
    analyze: 'Analyze asset',
    analyzing: 'Analyzing...',
    emptyTitle: 'Enter a market symbol',
    emptyBody: 'The agent uses available provider market data. If data is not sufficient, it will not invent a reading.',
    errorTitle: 'A reliable reading is not available',
    recentTitle: 'Recent analyses',
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
  },
  fr: {
    title: 'Agent d’analyse des marchés',
    subtitle: 'Analyse automatisée des actions, du forex, des métaux et des cryptos — lecture uniquement, pas un conseil financier.',
    symbol: 'Symbole',
    symbolPlaceholder: 'Exemple : AAPL, TSLA, EURUSD, XAUUSD, BTCUSD, KFH.KW',
    assetType: 'Type d’actif',
    timeframe: 'Horizon',
    analyze: 'Analyser l’actif',
    analyzing: 'Analyse en cours...',
    emptyTitle: 'Saisissez un symbole',
    emptyBody: 'L’agent utilise les données de marché disponibles. Si elles sont insuffisantes, aucune lecture inventée ne sera affichée.',
    errorTitle: 'Lecture fiable indisponible',
    recentTitle: 'Analyses récentes',
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
  },
} as const;

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

const ASSET_OPTIONS: Array<{ value: MarketAgentAssetType; labelKey: keyof typeof COPY.ar }> = [
  { value: 'stock', labelKey: 'stocks' },
  { value: 'forex', labelKey: 'forex' },
  { value: 'index', labelKey: 'indices' },
  { value: 'metal', labelKey: 'metals' },
  { value: 'crypto', labelKey: 'crypto' },
];

const ASSET_LABEL_KEYS: Record<MarketAgentAssetType, keyof typeof COPY.ar> = {
  stock: 'stocks',
  forex: 'forex',
  index: 'indices',
  metal: 'metals',
  crypto: 'crypto',
};

const TIMEFRAMES: MarketAgentTimeframe[] = ['15m', '1h', '4h', '1D', '1W'];

function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '';
  const number = Number(value);
  const digits = Math.abs(number) >= 100 ? 2 : Math.abs(number) >= 1 ? 4 : 6;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(number);
}

function joinLevels(values: number[], fallback: string) {
  return values.length ? values.map(formatNumber).join(' / ') : fallback;
}

export default function MarketAgentPage() {
  const { dir, lang } = useLanguage();
  const text = COPY[lang] ?? COPY.ar;
  const [symbol, setSymbol] = useState('AAPL');
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

  async function analyze() {
    const cleanSymbol = symbol.trim();
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
        body: JSON.stringify({ symbol: cleanSymbol, assetType, timeframe }),
      });
      const payload = await response.json().catch(() => null) as MarketAgentResponse | null;
      if (!payload) throw new Error('Invalid response');
      setResult(payload);
      if (!payload.ok) setError(payload.message);
      if (payload.ok) void loadHistory();
    } catch {
      setError('لا توجد بيانات كافية لإصدار قراءة موثوقة لهذا الأصل حالياً.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const labelDirection = (value: 'bullish' | 'bearish' | 'neutral') => text[value];
  const labelAction = (value: 'buy' | 'sell' | 'wait') => text[value];
  const labelRisk = (value: 'low' | 'medium' | 'high') => text[value];
  const labelAsset = (value: MarketAgentAssetType) => text[ASSET_LABEL_KEYS[value]] ?? value;

  return (
    <div className="market-agent-page" dir={dir}>
      <Sidebar />
      <main className="market-agent-main">
        <section className="market-agent-hero">
          <div>
            <span className="market-agent-kicker"><Bot size={16} /> THE SFM AI</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="market-agent-disclaimer">
            <ShieldAlert size={18} />
            <p>{DISCLAIMER_AR}</p>
            <p dir="ltr">{DISCLAIMER_EN}</p>
          </div>
        </section>

        <section className="market-agent-toolbar" aria-label={text.title}>
          <label>
            <span>{text.symbol}</span>
            <div className="market-agent-input">
              <Search size={18} />
              <input
                value={symbol}
                onChange={event => setSymbol(event.target.value.toUpperCase())}
                onKeyDown={event => {
                  if (event.key === 'Enter') void analyze();
                }}
                placeholder={text.symbolPlaceholder}
                inputMode="text"
              />
            </div>
          </label>
          <label>
            <span>{text.assetType}</span>
            <select value={assetType} onChange={event => setAssetType(event.target.value as MarketAgentAssetType)}>
              {ASSET_OPTIONS.map(option => (
                <option value={option.value} key={option.value}>{text[option.labelKey]}</option>
              ))}
            </select>
          </label>
          <div className="market-agent-timeframes">
            <span>{text.timeframe}</span>
            <div>
              {TIMEFRAMES.map(item => (
                <button
                  type="button"
                  className={timeframe === item ? 'active' : ''}
                  onClick={() => setTimeframe(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button className="market-agent-primary" type="button" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {loading ? text.analyzing : text.analyze}
          </button>
        </section>

        {result?.ok ? (
          <section className={`market-agent-result ${actionTone}`}>
            <header>
              <div>
                <span>{result.symbol} · {result.timeframe}</span>
                <h2>{labelAction(result.suggestedAction)}</h2>
              </div>
              <div className="market-agent-score">
                <strong>{result.confidence}%</strong>
                <span>{text.confidence}</span>
              </div>
            </header>

            <div className="market-agent-metrics">
              <Metric icon={<LineChart size={18} />} label={text.currentPrice} value={formatNumber(result.currentPrice)} />
              <Metric icon={<TrendingUp size={18} />} label={text.direction} value={labelDirection(result.direction)} />
              <Metric icon={<Gauge size={18} />} label={text.risk} value={labelRisk(result.riskLevel)} />
              <Metric icon={<Target size={18} />} label={text.entryZone} value={`${formatNumber(result.entryZone.from)} - ${formatNumber(result.entryZone.to)}`} />
              <Metric icon={<ShieldAlert size={18} />} label={text.stopLoss} value={result.stopLoss ? formatNumber(result.stopLoss) : text.noValue} />
              <Metric icon={<TrendingUp size={18} />} label={text.takeProfit} value={joinLevels(result.takeProfit, text.noValue)} />
              <Metric icon={<TrendingDown size={18} />} label={text.support} value={joinLevels(result.support, text.noValue)} />
              <Metric icon={<TrendingUp size={18} />} label={text.resistance} value={joinLevels(result.resistance, text.noValue)} />
            </div>

            <div className="market-agent-detail-grid">
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

            <section className="market-agent-explanation">
              <h3><BrainCircuit size={18} /> {text.explanation}</h3>
              <p>{result.summaryArabic}</p>
              <div>
                <p>{result.disclaimerArabic}</p>
                <p dir="ltr">{result.disclaimerEnglish}</p>
              </div>
            </section>
          </section>
        ) : (
          <section className={`market-agent-empty ${error || result ? 'error' : ''}`}>
            {error || result ? <AlertTriangle size={24} /> : <BrainCircuit size={24} />}
            <h2>{error || result ? text.errorTitle : text.emptyTitle}</h2>
            <p>{error || result ? (result && !result.ok ? result.message : error) : text.emptyBody}</p>
            <div>
              <p>{DISCLAIMER_AR}</p>
              <p dir="ltr">{DISCLAIMER_EN}</p>
            </div>
          </section>
        )}

        <section className="market-agent-history">
          <header>
            <h2>{text.recentTitle}</h2>
            {historyLoading ? <Loader2 className="spin" size={18} /> : null}
          </header>
          {history.length ? (
            <div className="market-agent-history-list">
              {history.map(item => (
                <article key={item.id}>
                  <div>
                    <strong>{item.symbol}</strong>
                    <span>{item.timeframe} · {labelAsset(item.asset_type)}</span>
                  </div>
                  <b className={item.suggested_action}>{labelAction(item.suggested_action)}</b>
                  <small>{Math.round(Number(item.confidence) || 0)}% · {labelRisk(item.risk_level)}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="market-agent-history-empty">{text.noHistory}</p>
          )}
        </section>
      </main>

      <style jsx>{`
        .market-agent-page{--agent-bg:radial-gradient(circle at 18% 8%,rgba(29,140,255,.10),transparent 30%),linear-gradient(160deg,#EEF6FF 0%,#F8FBFF 56%,#E7F1FF 100%);--agent-panel:#FFFFFF;--agent-panel-soft:#F8FBFF;--agent-border:rgba(29,140,255,.16);--agent-border-strong:rgba(29,140,255,.28);--agent-text:#0B172A;--agent-heading:#061B33;--agent-muted:#475569;--agent-muted-soft:#64748B;--agent-primary:#1D8CFF;--agent-accent:#18D4D4;--agent-shadow:0 18px 46px rgba(3,18,37,.08);min-height:100vh;background:var(--agent-bg);color:var(--agent-text);font-family:Tajawal,Arial,sans-serif;color-scheme:light;overflow-x:hidden}
        :global(.dark) .market-agent-page{--agent-bg:radial-gradient(circle at 16% 7%,rgba(47,214,192,.14),transparent 28%),radial-gradient(circle at 86% 18%,rgba(29,140,255,.14),transparent 30%),linear-gradient(180deg,#0A1422 0%,#0F1D31 48%,#08111F 100%);--agent-panel:rgba(15,29,49,.96);--agent-panel-soft:rgba(11,42,74,.92);--agent-border:#1D3050;--agent-border-strong:rgba(47,214,192,.26);--agent-text:#E8EEF6;--agent-heading:#F8FBFF;--agent-muted:#B8C7D9;--agent-muted-soft:#94A9C2;--agent-primary:#2A98FF;--agent-accent:#2FD6C0;--agent-shadow:0 20px 54px rgba(0,0,0,.30);color-scheme:dark}
        .market-agent-page *{box-sizing:border-box}
        .market-agent-main{width:100%;max-width:100%;min-height:100vh;margin:0;padding:28px;display:grid;gap:18px;overflow-x:hidden;box-sizing:border-box}
        .market-agent-main>*{width:100%;max-width:1400px;min-width:0;margin-inline:auto;box-sizing:border-box}
        .market-agent-page[dir="rtl"] .market-agent-main{padding-inline-start:calc(var(--sidebar-w,230px) + 28px);padding-inline-end:28px}
        .market-agent-page[dir="ltr"] .market-agent-main{padding-inline-start:calc(var(--sidebar-w,230px) + 28px);padding-inline-end:28px}
        .market-agent-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,430px);gap:18px;align-items:end}
        .market-agent-kicker{width:max-content;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(24,212,212,.28);background:linear-gradient(135deg,rgba(29,140,255,.10),rgba(24,212,212,.16));color:var(--agent-heading);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950}
        h1{margin:14px 0 8px;color:var(--agent-heading);font-size:clamp(30px,5vw,56px);line-height:1.02;font-weight:950;letter-spacing:0}
        .market-agent-hero p{margin:0;color:var(--agent-muted);font-size:15px;line-height:1.8;font-weight:800}
        .market-agent-disclaimer{display:grid;gap:8px;border:1px solid var(--agent-border);background:linear-gradient(180deg,var(--agent-panel),var(--agent-panel-soft));border-radius:18px;padding:16px;box-shadow:var(--agent-shadow)}
        .market-agent-disclaimer svg{color:var(--agent-primary)}
        .market-agent-disclaimer p{font-size:12px;line-height:1.65}
        .market-agent-toolbar{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(170px,.7fr) minmax(220px,.9fr) auto;gap:12px;align-items:end;border:1px solid var(--agent-border);background:var(--agent-panel);border-radius:20px;padding:16px;box-shadow:var(--agent-shadow);backdrop-filter:blur(18px)}
        label,.market-agent-timeframes{display:grid;gap:8px;min-width:0}
        label span,.market-agent-timeframes>span{color:var(--agent-muted);font-size:12px;font-weight:950}
        .market-agent-input,select{height:48px;border:1px solid var(--agent-border-strong);background:var(--agent-panel-soft)!important;color:var(--agent-text)!important;border-radius:14px;display:flex;align-items:center;gap:10px;padding:0 12px;-webkit-text-fill-color:var(--agent-text)!important}
        .market-agent-input svg{color:var(--agent-primary)}
        .market-agent-input:focus-within,select:focus{border-color:var(--agent-accent);box-shadow:0 0 0 4px rgba(24,212,212,.16);outline:0}
        input{border:0;outline:0;background:transparent!important;color:var(--agent-text)!important;width:100%;height:100%;font:900 14px Tajawal,Arial,sans-serif;min-width:0;text-transform:uppercase;-webkit-text-fill-color:var(--agent-text)!important}
        input::placeholder{color:var(--agent-muted-soft)!important;text-transform:none;-webkit-text-fill-color:var(--agent-muted-soft)!important}
        select{width:100%;font:900 14px Tajawal,Arial,sans-serif;border-color:var(--agent-border-strong)!important}
        option{background:var(--agent-panel);color:var(--agent-text)}
        .market-agent-timeframes div{display:flex;gap:6px;flex-wrap:wrap}
        .market-agent-timeframes button{height:48px;min-width:50px;border:1px solid var(--agent-border);background:var(--agent-panel-soft);color:var(--agent-muted);border-radius:13px;font:950 12px Arial,sans-serif;cursor:pointer}
        .market-agent-timeframes button.active{background:linear-gradient(135deg,var(--agent-primary),var(--agent-accent));color:#FFFFFF;border-color:transparent;box-shadow:0 12px 26px rgba(29,140,255,.20)}
        .market-agent-primary{height:48px;border:0;border-radius:14px;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,var(--agent-primary),var(--agent-accent));color:#FFFFFF;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 14px 34px rgba(29,140,255,.22)}
        .market-agent-primary:disabled{opacity:.65;cursor:wait}
        .spin{animation:agentSpin 1s linear infinite}
        @keyframes agentSpin{to{transform:rotate(360deg)}}
        .market-agent-result,.market-agent-empty,.market-agent-history{border:1px solid var(--agent-border);background:linear-gradient(180deg,var(--agent-panel),var(--agent-panel-soft));border-radius:22px;padding:18px;box-shadow:var(--agent-shadow)}
        .market-agent-result>header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}
        .market-agent-result>header span{color:var(--agent-muted);font-size:12px;font-weight:950}
        .market-agent-result h2{margin:4px 0 0;color:var(--agent-heading);font-size:34px;line-height:1.1;font-weight:950}
        .market-agent-result.positive h2,.market-agent-result.positive .market-agent-score strong{color:#047857}
        .market-agent-result.negative h2,.market-agent-result.negative .market-agent-score strong{color:#B91C1C}
        .market-agent-result.neutral h2,.market-agent-result.neutral .market-agent-score strong{color:#B45309}
        .market-agent-score{width:98px;height:98px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(24,212,212,.28);background:linear-gradient(145deg,rgba(29,140,255,.08),rgba(24,212,212,.12));text-align:center}
        .market-agent-score strong{display:block;font-size:26px;font-weight:950}
        .market-agent-score span{font-size:11px}
        .market-agent-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .market-agent-metric{min-height:104px;border:1px solid var(--agent-border);background:var(--agent-panel);border-radius:16px;padding:13px;display:grid;align-content:space-between;gap:10px;min-width:0;box-shadow:0 10px 24px rgba(3,18,37,.05)}
        .market-agent-metric svg{color:var(--agent-primary)}
        .market-agent-metric span{color:var(--agent-muted-soft);font-size:12px;font-weight:950}
        .market-agent-metric strong{color:var(--agent-heading);font-size:15px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}
        .market-agent-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
        .market-agent-detail-grid section,.market-agent-explanation{border:1px solid var(--agent-border);background:var(--agent-panel-soft);border-radius:16px;padding:15px}
        h3{margin:0 0 12px;color:var(--agent-heading);font-size:16px;font-weight:950;display:flex;align-items:center;gap:8px}
        h3 svg{color:var(--agent-primary)}
        dl{margin:0;display:grid;gap:8px}
        dl div{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(29,140,255,.12);padding-bottom:8px}
        dl div:last-child{border-bottom:0;padding-bottom:0}
        dt{color:var(--agent-muted-soft);font-size:12px;font-weight:950}
        dd{margin:0;color:var(--agent-heading);font-size:13px;font-weight:950}
        .market-agent-explanation{margin-top:12px;display:grid;gap:10px}
        .market-agent-explanation p{margin:0;color:var(--agent-muted);line-height:1.85;font-size:13px;font-weight:800}
        .market-agent-explanation div{border-top:1px solid rgba(29,140,255,.12);padding-top:10px;display:grid;gap:5px}
        .market-agent-empty{min-height:250px;display:grid;place-items:center;text-align:center;gap:10px}
        .market-agent-empty svg{color:var(--agent-primary)}
        .market-agent-empty.error svg{color:#B91C1C}
        .market-agent-empty h2{margin:0;color:var(--agent-heading);font-size:22px;font-weight:950}
        .market-agent-empty p{margin:0;max-width:720px;color:var(--agent-muted);line-height:1.8;font-weight:850}
        .market-agent-empty div{display:grid;gap:5px;margin-top:4px}
        .market-agent-history header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
        .market-agent-history h2{margin:0;color:var(--agent-heading);font-size:19px;font-weight:950}
        .market-agent-history-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .market-agent-history-list article{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;border:1px solid var(--agent-border);background:var(--agent-panel);border-radius:14px;padding:12px}
        .market-agent-history-list strong{display:block;color:var(--agent-heading);font-size:13px;font-weight:950}
        .market-agent-history-list span,.market-agent-history-list small{color:var(--agent-muted-soft);font-size:11px;font-weight:900}
        .market-agent-history-list b{border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950}
        .market-agent-history-list b.buy{background:#ECFDF5;color:#047857;border:1px solid rgba(4,120,87,.18)}
        .market-agent-history-list b.sell{background:#FEF2F2;color:#B91C1C;border:1px solid rgba(185,28,28,.16)}
        .market-agent-history-list b.wait{background:#FFF7ED;color:#B45309;border:1px solid rgba(180,83,9,.18)}
        .market-agent-history-empty{margin:0;color:var(--agent-muted);font-weight:850}
        :global(.dark) .market-agent-page .market-agent-toolbar,:global(.dark) .market-agent-page .market-agent-result,:global(.dark) .market-agent-page .market-agent-empty,:global(.dark) .market-agent-page .market-agent-history,:global(.dark) .market-agent-page .market-agent-disclaimer{box-shadow:var(--agent-shadow)}
        :global(.dark) .market-agent-page .market-agent-kicker{background:rgba(47,214,192,.10);border-color:rgba(47,214,192,.22);color:var(--agent-heading)}
        :global(.dark) .market-agent-page .market-agent-input,:global(.dark) .market-agent-page select{box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
        :global(.dark) .market-agent-page .market-agent-metric{box-shadow:0 10px 24px rgba(0,0,0,.18)}
        :global(.dark) .market-agent-page dl div,:global(.dark) .market-agent-page .market-agent-explanation div{border-color:rgba(47,214,192,.14)}
        :global(.dark) .market-agent-page .market-agent-result.positive h2,:global(.dark) .market-agent-page .market-agent-result.positive .market-agent-score strong{color:#34D399}
        :global(.dark) .market-agent-page .market-agent-result.negative h2,:global(.dark) .market-agent-page .market-agent-result.negative .market-agent-score strong{color:#F87171}
        :global(.dark) .market-agent-page .market-agent-result.neutral h2,:global(.dark) .market-agent-page .market-agent-result.neutral .market-agent-score strong{color:#FBBF24}
        :global(.dark) .market-agent-page .market-agent-history-list b.buy{background:rgba(16,185,129,.14);color:#34D399;border-color:rgba(52,211,153,.22)}
        :global(.dark) .market-agent-page .market-agent-history-list b.sell{background:rgba(248,113,113,.12);color:#F87171;border-color:rgba(248,113,113,.22)}
        :global(.dark) .market-agent-page .market-agent-history-list b.wait{background:rgba(251,191,36,.12);color:#FBBF24;border-color:rgba(251,191,36,.22)}
        @media(max-width:1180px){.market-agent-toolbar{grid-template-columns:1fr 1fr}.market-agent-primary{width:100%}.market-agent-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.market-agent-hero{grid-template-columns:1fr}}
        @media(max-width:1024px){.market-agent-main{margin:0;padding:18px}.market-agent-main>*{max-width:100%}}
        @media(max-width:720px){.market-agent-toolbar,.market-agent-detail-grid,.market-agent-history-list{grid-template-columns:1fr}.market-agent-metrics{grid-template-columns:1fr}.market-agent-result>header{align-items:flex-start}.market-agent-score{width:84px;height:84px}.market-agent-history-list article{grid-template-columns:1fr}.market-agent-main{padding:14px}h1{font-size:32px}}
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="market-agent-metric">
      {icon}
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}
