'use client';

import { AlertTriangle, Bell, Clock3, Gauge, Info, ShieldAlert, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';
import {
  MARKET_SIGNAL_DISCLAIMER_AR,
  MARKET_SIGNAL_DISCLAIMER_EN,
  type MarketSignal,
  type MarketSignalAction,
  type MarketSignalDataQuality,
  type MarketSignalRiskLevel,
} from '@/lib/market/signalEngine';

type MarketSignalPanelProps = {
  signal: MarketSignal | null;
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
};

type Localized = Record<Lang, string>;

const ACTION_BADGE: Record<MarketSignalAction, { label: Localized; className: string }> = {
  buy: { label: { ar: 'شراء', en: 'Buy', fr: 'Acheter' }, className: 'buy' },
  cautious_buy: { label: { ar: 'شراء بحذر', en: 'Cautious buy', fr: 'Achat prudent' }, className: 'cautious-buy' },
  sell: { label: { ar: 'تجنب / بيع', en: 'Avoid / Sell', fr: 'Éviter / Vendre' }, className: 'sell' },
  sell_or_avoid: { label: { ar: 'تجنب / بيع', en: 'Avoid / Sell', fr: 'Éviter / Vendre' }, className: 'sell' },
  wait: { label: { ar: 'انتظار', en: 'Wait', fr: 'Attendre' }, className: 'wait' },
  watch: { label: { ar: 'مراقبة', en: 'Watch', fr: 'Surveiller' }, className: 'watch' },
  insufficient_data: { label: { ar: 'بيانات غير كافية', en: 'Insufficient data', fr: 'Données insuffisantes' }, className: 'insufficient' },
};

const RISK_LABELS: Record<MarketSignalRiskLevel, Localized> = {
  low: { ar: 'منخفض', en: 'Low', fr: 'Faible' },
  medium: { ar: 'متوسط', en: 'Medium', fr: 'Moyen' },
  high: { ar: 'مرتفع', en: 'High', fr: 'Élevé' },
};

const DATA_QUALITY_LABELS: Record<MarketSignalDataQuality, Localized> = {
  live: { ar: 'مباشرة', en: 'Live', fr: 'En direct' },
  delayed: { ar: 'متأخرة', en: 'Delayed', fr: 'Différées' },
  partial: { ar: 'جزئية', en: 'Partial', fr: 'Partielles' },
  unavailable: { ar: 'غير متاحة', en: 'Unavailable', fr: 'Indisponibles' },
};

const UI: Record<Lang, Record<string, string>> = {
  ar: { signal:'إشارة التداول', analysis:'تحليل الإشارة', loading:'جارٍ تحليل البيانات المتاحة...', loadingBadge:'قيد التحليل', empty:'اكتمل الطلب، لكن البيانات لا تكفي لإظهار إشارة موثوقة حالياً.', emptyBadge:'بيانات غير كافية', error:'تعذر تحميل الإشارة من المزود حالياً. أعد المحاولة بعد قليل.', errorBadge:'تعذر التحميل', confidence:'الثقة', currentPrice:'السعر الحالي', target:'الهدف', stop:'وقف الخسارة', upside:'الصعود المتوقع', downside:'الهبوط إلى وقف الخسارة', ratio:'نسبة العائد إلى المخاطرة', timeframe:'الأفق الزمني', risk:'المخاطر', dataQuality:'جودة البيانات', reasons:'أسباب الإشارة', warnings:'المخاطر والتنبيهات', score:'نقاط التقييم', scoreBreakdown:'تفاصيل نقاط التقييم', technical:'فني', momentum:'زخم', news:'أخبار', fundamentals:'أساسيات', defaultTimeframe:'1-3 أسابيع' },
  en: { signal:'Trading signal', analysis:'Signal analysis', loading:'Analyzing available data...', loadingBadge:'Analysis in progress', empty:'The request completed, but there is not enough data to show a reliable signal right now.', emptyBadge:'Insufficient data', error:'The signal could not be loaded from the provider. Try again shortly.', errorBadge:'Load failed', confidence:'Confidence', currentPrice:'Current price', target:'Target', stop:'Stop loss', upside:'Expected upside', downside:'Downside to stop loss', ratio:'Risk/reward ratio', timeframe:'Time horizon', risk:'Risk', dataQuality:'Data quality', reasons:'Signal reasons', warnings:'Risks and warnings', score:'Score breakdown', scoreBreakdown:'Score breakdown', technical:'Technical', momentum:'Momentum', news:'News', fundamentals:'Fundamentals', defaultTimeframe:'1–3 weeks' },
  fr: { signal:'Signal de trading', analysis:'Analyse du signal', loading:'Analyse des données disponibles...', loadingBadge:'Analyse en cours', empty:'La requête a abouti, mais les données sont insuffisantes pour afficher un signal fiable.', emptyBadge:'Données insuffisantes', error:'Le signal n’a pas pu être chargé depuis le fournisseur. Réessayez dans un instant.', errorBadge:'Échec du chargement', confidence:'Confiance', currentPrice:'Cours actuel', target:'Objectif', stop:'Stop de protection', upside:'Hausse attendue', downside:'Baisse jusqu’au stop', ratio:'Rapport risque/rendement', timeframe:'Horizon temporel', risk:'Risque', dataQuality:'Qualité des données', reasons:'Raisons du signal', warnings:'Risques et avertissements', score:'Détail du score', scoreBreakdown:'Détail du score', technical:'Technique', momentum:'Momentum', news:'Actualités', fundamentals:'Fondamentaux', defaultTimeframe:'1 à 3 semaines' },
};

const REASON_COPY: Record<string, { en: string; fr: string }> = {
  'البيانات غير كافية لإصدار إشارة شراء أو بيع موثوقة.': { en: 'There is not enough data for a reliable buy or sell signal.', fr: 'Les données sont insuffisantes pour produire un signal fiable d’achat ou de vente.' },
  'البيانات غير كافية.': { en: 'Data is insufficient.', fr: 'Les données sont insuffisantes.' },
  'البيانات الفنية غير مكتملة.': { en: 'Technical data is incomplete.', fr: 'Les données techniques sont incomplètes.' },
  'الاتجاه الفني إيجابي والسعر أعلى من متوسطات رئيسية.': { en: 'The technical trend is positive and price is above key averages.', fr: 'La tendance technique est positive et le cours est au-dessus des moyennes principales.' },
  'الاتجاه الفني سلبي والسعر أدنى من متوسطات رئيسية.': { en: 'The technical trend is negative and price is below key averages.', fr: 'La tendance technique est négative et le cours est sous les moyennes principales.' },
  'الاتجاه الفني مختلط ويحتاج إلى تأكيد إضافي.': { en: 'The technical trend is mixed and needs more confirmation.', fr: 'La tendance technique est mitigée et nécessite une confirmation supplémentaire.' },
  'MACD يميل إلى الزخم الإيجابي.': { en: 'MACD indicates positive momentum.', fr: 'Le MACD indique un momentum positif.' },
  'MACD يميل إلى الزخم السلبي.': { en: 'MACD indicates negative momentum.', fr: 'Le MACD indique un momentum négatif.' },
  'الأخبار أو المعنويات المتاحة داعمة.': { en: 'Available news or sentiment is supportive.', fr: 'Les actualités ou le sentiment disponibles sont favorables.' },
  'الأخبار أو المعنويات المتاحة تضغط على الإشارة.': { en: 'Available news or sentiment weighs on the signal.', fr: 'Les actualités ou le sentiment disponibles pèsent sur le signal.' },
  'جودة البيانات جزئية وتم تقييد الثقة.': { en: 'Data quality is partial, so confidence was limited.', fr: 'La qualité des données est partielle ; la confiance a donc été limitée.' },
  'الأسعار قد تكون متأخرة حسب المزود.': { en: 'Prices may be delayed depending on the provider.', fr: 'Les cours peuvent être différés selon le fournisseur.' },
  'مستوى المخاطر مرتفع؛ لا تستخدم الإشارة دون إدارة وقف خسارة.': { en: 'Risk is high; do not use the signal without stop-loss management.', fr: 'Le risque est élevé ; n’utilisez pas le signal sans gérer un stop de protection.' },
  'السوق متقلب.': { en: 'The market is volatile.', fr: 'Le marché est volatil.' },
  'خبر عالي التأثير قد يغير الاتجاه بسرعة.': { en: 'High-impact news may change the trend quickly.', fr: 'Une actualité à fort impact peut modifier rapidement la tendance.' },
  'لا توجد إشارة تداول كافية حالياً.': { en: 'There is not enough confirmation for a trading signal right now.', fr: 'Il n’y a pas assez de confirmation pour un signal de trading pour le moment.' },
  'الهدف أدنى من السعر الحالي والثقة تدعم تجنب الصفقة أو البيع.': { en: 'The target is below the current price, and confidence supports avoiding or selling.', fr: 'L’objectif est inférieur au cours actuel, et la confiance appuie le fait d’éviter la position ou de vendre.' },
  'الهدف أعلى من السعر الحالي ونسبة العائد إلى المخاطرة كافية للشراء.': { en: 'The target is above the current price and the risk/reward ratio supports a buy.', fr: 'L’objectif est supérieur au cours actuel et le rapport risque/rendement soutient un achat.' },
  'الهدف أعلى من السعر الحالي، لكن الثقة متوسطة ونسبة العائد إلى المخاطرة غير كافية للشراء القوي.': { en: 'The target is above the current price, but confidence is moderate and risk/reward is not enough for a strong buy.', fr: 'L’objectif est supérieur au cours actuel, mais la confiance est modérée et le rapport risque/rendement est insuffisant pour un achat fort.' },
  'الهدف أعلى من السعر الحالي، لكن البيانات الفنية غير مكتملة.': { en: 'The target is above the current price, but technical data is incomplete.', fr: 'L’objectif est supérieur au cours actuel, mais les données techniques sont incomplètes.' },
  'الهدف أعلى من السعر الحالي، لكن الثقة متوسطة.': { en: 'The target is above the current price, but confidence is moderate.', fr: 'L’objectif est supérieur au cours actuel, mais la confiance est modérée.' },
  'الهدف لا يتجاوز السعر الحالي، لذلك تبقى الإشارة للمراقبة.': { en: 'The target does not exceed the current price, so the signal remains a watch.', fr: 'L’objectif ne dépasse pas le cours actuel, le signal reste donc en surveillance.' },
  'الهدف أعلى من السعر الحالي، لكن الثقة دون الحد الأدنى.': { en: 'The target is above the current price, but confidence is below the minimum threshold.', fr: 'L’objectif est supérieur au cours actuel, mais la confiance est inférieure au seuil minimal.' },
};

const DISCLAIMER_FR = 'Ces signaux sont fournis à titre pédagogique à partir des données disponibles et ne constituent pas un conseil financier. Les marchés comportent des risques et les données peuvent être retardées ou incomplètes.';

function formatNumber(value: number | null | undefined, digits = 2) {
  if (!Number.isFinite(Number(value))) return '--';
  return Number(value).toLocaleString('en-US', {
    numberingSystem: 'latn',
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatPrice(value: number | null | undefined, currency?: string | null) {
  if (!Number.isFinite(Number(value))) return '--';
  const abs = Math.abs(Number(value));
  const digits = abs < 1 ? 6 : abs < 10 ? 4 : 2;
  return `${formatNumber(value, digits)} ${currency || ''}`.trim();
}

function formatPercent(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value, 2)}%`;
}

function formatRiskReward(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return '—';
  return `${formatNumber(value, 2)}:1`;
}

function actionLabel(action: MarketSignalAction) {
  return ACTION_BADGE[action] ?? ACTION_BADGE.watch;
}

function localizedReason(value: string, lang: Lang) {
  if (lang === 'ar') return value;
  const exact = REASON_COPY[value];
  if (exact) return exact[lang];
  const rsi = value.match(/^قراءة RSI عند ([\d.]+) وتستخدم كمرشح زخم لا كتنبؤ مؤكد\.$/);
  if (rsi) return lang === 'fr' ? `Le RSI est à ${rsi[1]} et sert de filtre de momentum, non de prévision certaine.` : `RSI is at ${rsi[1]} and is used as a momentum filter, not a certain forecast.`;
  const score = value.match(/^النتيجة المركبة الحالية ([\d.]+)\/100/);
  if (score) return lang === 'fr' ? `Le score composite actuel est de ${score[1]}/100 selon le cours, les indicateurs, le risque et la qualité des données.` : `The current composite score is ${score[1]}/100 based on price, indicators, risk, and data quality.`;
  return lang === 'fr' ? 'Informations supplémentaires indisponibles dans cette langue.' : 'Additional details are unavailable in this language.';
}

function localizedTimeframe(value: string | null | undefined, lang: Lang) {
  if (!value || value === '1-3 أسابيع') return UI[lang].defaultTimeframe;
  if (value === 'بيانات غير كافية') return ACTION_BADGE.insufficient_data.label[lang];
  if (value === 'مراقبة') return ACTION_BADGE.watch.label[lang];
  return value;
}

function Meter({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(95, Math.round(value)));
  return (
    <div className="market-signal-meter" aria-label={`${label} ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="market-signal-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function MarketSignalMiniBadge({ signal }: { signal: Pick<MarketSignal, 'action' | 'confidence'> | null | undefined }) {
  const { lang } = useLanguage();
  if (!signal) return null;
  const badge = actionLabel(signal.action);
  return (
    <span className={`market-signal-mini ${badge.className}`} title={`${UI[lang].confidence} ${Math.round(signal.confidence)}%`}>
      {badge.label[lang]}
      <b>{Math.round(signal.confidence)}%</b>
      <style jsx>{`
        .market-signal-mini{
          display:inline-flex;
          align-items:center;
          gap:6px;
          border-radius:var(--radius-pill);
          padding:4px 8px;
          font-size:11px;
          font-weight:500;
          line-height:1;
          white-space:nowrap;
          border:1px solid var(--border);
          background:var(--surface-muted);
          color:var(--foreground-secondary);
        }
        .market-signal-mini b{font:inherit;color:inherit;direction:ltr}
        .market-signal-mini.buy,.market-signal-mini.cautious-buy{background:var(--success-soft);color:var(--success);border-color:color-mix(in srgb,var(--success) 34%,var(--border))}
        .market-signal-mini.sell{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 34%,var(--border))}
        .market-signal-mini.wait{background:var(--warning-soft);color:var(--warning);border-color:color-mix(in srgb,var(--warning) 34%,var(--border))}
        .market-signal-mini.watch{background:var(--info-soft);color:var(--info);border-color:color-mix(in srgb,var(--info) 34%,var(--border))}
        .market-signal-mini.insufficient{background:var(--surface-muted);color:var(--foreground-muted);border-color:var(--border-strong)}
      `}</style>
    </span>
  );
}

export function MarketSignalPanel({ signal, loading = false, error = false, compact = false }: MarketSignalPanelProps) {
  const { lang, dir } = useLanguage();
  const text = UI[lang];
  const lifecycle = loading ? 'loading' : error ? 'error' : signal ? 'success' : 'empty';
  const badge = signal ? actionLabel(signal.action) : null;
  const lifecycleBadge = lifecycle === 'loading'
    ? { className: 'loading', label: text.loadingBadge }
    : lifecycle === 'error'
      ? { className: 'error', label: text.errorBadge }
      : lifecycle === 'empty'
        ? { className: 'empty', label: text.emptyBadge }
        : badge
          ? { className: badge.className, label: badge.label[lang] }
          : null;
  const confidence = Math.max(0, Math.min(95, Math.round(signal?.confidence ?? 0)));
  const risk = signal?.riskLevel ? RISK_LABELS[signal.riskLevel][lang] : '--';
  const dataQuality = signal?.dataQuality ? DATA_QUALITY_LABELS[signal.dataQuality][lang] : '--';

  return (
    <article className={`market-signal-panel ${compact ? 'compact' : ''}`} dir={dir} aria-busy={loading} aria-live="polite">
      <header className="market-signal-header">
        <div>
          <span className="market-signal-eyebrow">
            <Bell size={14} />
            {text.signal}
          </span>
          <h2>{signal?.symbol ? `${text.analysis}: ${signal.symbol}` : text.analysis}</h2>
        </div>
        {lifecycleBadge ? (
          <span className={`market-signal-badge ${lifecycleBadge.className}`}>
            {lifecycleBadge.label}
          </span>
        ) : null}
      </header>

      {loading ? (
        <div className="market-signal-loading" role="status">{text.loading}</div>
      ) : error ? (
        <div className="market-signal-error" role="alert">
          <AlertTriangle size={17} />
          {text.error}
        </div>
      ) : !signal ? (
        <div className="market-signal-empty">
          <Info size={17} />
          {text.empty}
        </div>
      ) : (
        <>
          <div className="market-signal-main">
            <div className="market-signal-confidence">
              <span>{text.confidence}</span>
              <strong dir="ltr">{confidence}%</strong>
              <Meter value={confidence} label={text.confidence} />
              <p className="market-signal-explanation">{lang === 'ar' ? signal.signalExplanationAr : lang === 'en' ? signal.signalExplanationEn : (REASON_COPY[signal.signalExplanationAr]?.fr ?? signal.signalExplanationEn)}</p>
            </div>
            <div className="market-signal-price">
              <small>{text.currentPrice}</small>
              <strong dir="ltr">{formatPrice(signal.currentPrice, signal.currency)}</strong>
            </div>
          </div>

          <div className="market-signal-grid">
            <Metric icon={<Target size={16} />} label={text.target} value={formatPrice(signal.targetPrice, signal.currency)} />
            <Metric icon={<ShieldAlert size={16} />} label={text.stop} value={formatPrice(signal.stopLoss, signal.currency)} />
            <Metric icon={<Target size={16} />} label={text.upside} value={formatPercent(signal.upsidePercent)} />
            <Metric icon={<ShieldAlert size={16} />} label={text.downside} value={formatPercent(signal.downsidePercent)} />
            <Metric icon={<Gauge size={16} />} label={text.ratio} value={formatRiskReward(signal.riskRewardRatio)} />
            <Metric icon={<Clock3 size={16} />} label={text.timeframe} value={localizedTimeframe(signal.timeframe, lang)} />
            <Metric icon={<Gauge size={16} />} label={text.risk} value={risk} />
            <Metric icon={<AlertTriangle size={16} />} label={text.dataQuality} value={dataQuality} />
          </div>

          {!compact && (
            <div className="market-signal-details">
              <section>
                <h3>{text.reasons}</h3>
                <ul>
                  {signal.reasons.slice(0, 5).map(reason => <li key={reason}>{localizedReason(reason, lang)}</li>)}
                </ul>
              </section>
              <section>
                <h3>{text.warnings}</h3>
                <ul>
                  {signal.warnings.slice(0, 5).map(warning => <li key={warning}>{localizedReason(warning, lang)}</li>)}
                </ul>
              </section>
              <section className="market-signal-score" aria-label={text.scoreBreakdown}>
                <h3>{text.score}</h3>
                <dl>
                  <div><dt>{text.technical}</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.technicalScore, 0)} / 40</dd></div>
                  <div><dt>{text.momentum}</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.momentumScore, 0)} / 20</dd></div>
                  <div><dt>{text.news}</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.newsScore, 0)} / 15</dd></div>
                  <div><dt>{text.fundamentals}</dt><dd dir="ltr">{formatNumber(signal.scoreBreakdown.fundamentalsScore, 0)} / 15</dd></div>
                </dl>
              </section>
            </div>
          )}

          <p className="market-signal-disclaimer">
            {lang === 'ar' ? (signal.disclaimerAr || MARKET_SIGNAL_DISCLAIMER_AR) : lang === 'fr' ? DISCLAIMER_FR : (signal.disclaimerEn || MARKET_SIGNAL_DISCLAIMER_EN)}
          </p>
        </>
      )}

      <style jsx>{`
        .market-signal-panel{
          border:1px solid var(--border);
          border-radius:var(--radius-card);
          background:var(--surface);
          box-shadow:var(--shadow-card);
          padding:18px;
          display:grid;
          gap:16px;
          color:var(--foreground);
          font-family:var(--font-ui);
        }
        .market-signal-header{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
        }
        .market-signal-eyebrow{
          display:inline-flex;
          align-items:center;
          gap:6px;
          color:var(--foreground-muted);
          font-size:12px;
          font-weight:500;
        }
        .market-signal-header h2{
          margin:5px 0 0;
          font-size:clamp(18px,2vw,24px);
          letter-spacing:0;
        }
        .market-signal-badge{
          min-width:74px;
          text-align:center;
          border-radius:var(--radius-pill);
          padding:8px 12px;
          font-size:13px;
          font-weight:600;
          border:1px solid var(--border);
        }
        .market-signal-badge.buy,.market-signal-badge.cautious-buy{background:var(--success-soft);color:var(--success);border-color:color-mix(in srgb,var(--success) 34%,var(--border))}
        .market-signal-badge.sell,.market-signal-badge.error{background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 34%,var(--border))}
        .market-signal-badge.wait{background:var(--warning-soft);color:var(--warning);border-color:color-mix(in srgb,var(--warning) 34%,var(--border))}
        .market-signal-badge.watch,.market-signal-badge.loading{background:var(--info-soft);color:var(--info);border-color:color-mix(in srgb,var(--info) 34%,var(--border))}
        .market-signal-badge.insufficient,.market-signal-badge.empty{background:var(--surface-muted);color:var(--foreground-muted);border-color:var(--border-strong)}
        .market-signal-loading,.market-signal-empty,.market-signal-error{
          display:flex;
          align-items:center;
          gap:8px;
          min-height:72px;
          border:1px dashed var(--border-strong);
          border-radius:var(--radius-control);
          padding:14px;
          color:var(--foreground-secondary);
          background:var(--surface-muted);
        }
        .market-signal-error{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 34%,var(--border));background:var(--danger-soft)}
        .market-signal-main{
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(160px,.35fr);
          gap:12px;
          align-items:stretch;
        }
        .market-signal-confidence,.market-signal-price,.market-signal-metric{
          border:1px solid var(--border);
          border-radius:var(--radius-control);
          background:var(--surface);
          padding:12px;
        }
        .market-signal-confidence span,.market-signal-price small,.market-signal-metric small{
          display:block;
          color:var(--foreground-muted);
          font-size:12px;
          font-weight:500;
        }
        .market-signal-confidence strong,.market-signal-price strong{
          display:block;
          margin-top:4px;
          font-size:24px;
          letter-spacing:0;
          font-family:var(--font-data);
        }
        .market-signal-meter{
          height:8px;
          margin-top:10px;
          border-radius:var(--radius-pill);
          overflow:hidden;
          background:var(--chart-grid);
        }
        .market-signal-meter span{
          display:block;
          height:100%;
          border-radius:var(--radius-pill);
          background:var(--primary);
        }
        .market-signal-explanation{
          margin:10px 0 0;
          color:var(--foreground-secondary);
          font-size:12px;
          line-height:1.6;
          font-weight:400;
        }
        .market-signal-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
        }
        .market-signal-metric{
          display:flex;
          align-items:center;
          gap:10px;
        }
        .market-signal-metric > span{
          width:34px;
          height:34px;
          border-radius:var(--radius-sm);
          display:grid;
          place-items:center;
          color:var(--primary);
          background:var(--primary-soft);
          flex:0 0 auto;
        }
        .market-signal-metric strong{
          display:block;
          margin-top:2px;
          font-size:13px;
          color:var(--foreground);
          font-family:var(--font-data);
          overflow-wrap:anywhere;
        }
        .market-signal-details{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
        }
        .market-signal-details section{
          border:1px solid var(--border);
          border-radius:var(--radius-control);
          background:var(--surface);
          padding:12px;
          min-width:0;
        }
        .market-signal-details h3{
          margin:0 0 8px;
          font-size:13px;
        }
        .market-signal-details ul{
          margin:0;
          padding:0 18px 0 0;
          color:var(--foreground-secondary);
          font-size:13px;
          line-height:1.65;
        }
        .market-signal-score dl{
          margin:0;
          display:grid;
          gap:7px;
          font-size:13px;
        }
        .market-signal-score div{
          display:flex;
          justify-content:space-between;
          gap:10px;
          color:var(--foreground-secondary);
        }
        .market-signal-score dt,.market-signal-score dd{margin:0}
        .market-signal-score dd{font-family:var(--font-data)}
        .market-signal-disclaimer{
          margin:0;
          border-radius:var(--radius-control);
          background:var(--warning-soft);
          color:var(--warning);
          padding:11px 12px;
          font-size:12px;
          line-height:1.7;
          border:1px solid color-mix(in srgb,var(--warning) 34%,var(--border));
        }
        .market-signal-disclaimer span{
          display:block;
          direction:ltr;
          margin-top:2px;
        }
        .market-signal-panel.compact .market-signal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        @media (max-width: 780px){
          .market-signal-panel{padding:14px;border-radius:var(--radius-control)}
          .market-signal-header{align-items:center}
          .market-signal-main,.market-signal-grid,.market-signal-details{grid-template-columns:1fr}
          .market-signal-badge{min-width:64px}
        }
      `}</style>
    </article>
  );
}
