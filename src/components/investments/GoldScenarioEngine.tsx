'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CircleAlert,
  Gauge,
  Globe2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type {
  GoldDriverDirection,
  GoldScenarioHorizon,
  GoldScenarioSnapshot,
  GoldWhatIfInput,
} from '@/lib/gold-scenario/types';
import styles from './GoldScenarioEngine.module.css';

type Lang = 'ar' | 'en' | 'fr';

type ApiResponse = {
  success: boolean;
  snapshot?: GoldScenarioSnapshot;
  error?: string;
  code?: string;
};

const HORIZONS: GoldScenarioHorizon[] = ['24H', '7D', '1M', '3M', '6M', '12M'];

const COPY = {
  eyebrow: {
    ar: 'SFM Gold Scenario Engine',
    en: 'SFM Gold Scenario Engine',
    fr: 'SFM Gold Scenario Engine',
  },
  title: {
    ar: 'محرك سيناريوهات وتوقعات الذهب',
    en: 'Gold scenarios & forecast engine',
    fr: 'Moteur de scénarios et prévisions de l’or',
  },
  description: {
    ar: 'يربط حركة الذهب بالدولار والنفط والفائدة والتضخم والأسواق والأحداث العالمية، ثم يبني سيناريوهات شرطية قابلة للتفسير بدلاً من رقم وحيد.',
    en: 'Connects gold to the dollar, oil, rates, inflation, markets and global events, then builds explainable conditional scenarios instead of one magic number.',
    fr: 'Relie l’or au dollar, au pétrole, aux taux, à l’inflation, aux marchés et aux événements mondiaux pour produire des scénarios conditionnels explicables.',
  },
  current: { ar: 'سعر الذهب المرجعي', en: 'Reference gold price', fr: 'Prix de référence de l’or' },
  bias: { ar: 'انحياز الأدلة', en: 'Evidence bias', fr: 'Biais des preuves' },
  confidence: { ar: 'ثقة المحرك', en: 'Engine confidence', fr: 'Confiance du moteur' },
  quality: { ar: 'جودة البيانات', en: 'Data quality', fr: 'Qualité des données' },
  volatility: { ar: 'التذبذب السنوي المقاس', en: 'Measured annualized volatility', fr: 'Volatilité annualisée mesurée' },
  modelWeight: { ar: 'وزن السيناريو النموذجي', en: 'Model scenario weight', fr: 'Poids du scénario modèle' },
  range: { ar: 'نطاق السعر الشرطي', en: 'Conditional price range', fr: 'Fourchette conditionnelle' },
  midpoint: { ar: 'المنتصف', en: 'Midpoint', fr: 'Point médian' },
  methodology: { ar: 'المنهجية', en: 'Methodology', fr: 'Méthodologie' },
  drivers: { ar: 'أقوى المحركات الآن', en: 'Strongest drivers now', fr: 'Facteurs dominants' },
  globalEvents: { ar: 'الأحداث العالمية المؤثرة', en: 'Global events in the model', fr: 'Événements mondiaux intégrés' },
  upcoming: { ar: 'أحداث اقتصادية قادمة', en: 'Upcoming macro risk events', fr: 'Événements macro à venir' },
  whatIf: { ar: 'ماذا لو؟', en: 'What if?', fr: 'Et si ?' },
  whatIfBody: {
    ar: 'غيّر الفرضيات وشاهد كيف تتغير أوزان السيناريوهات ونطاقات الذهب. هذه فرضيات وليست بيانات حية.',
    en: 'Change assumptions and see how scenario weights and gold ranges respond. These are hypothetical inputs, not live observations.',
    fr: 'Modifiez les hypothèses et observez la réaction des poids de scénarios et des fourchettes de l’or. Ce sont des hypothèses, pas des observations en direct.',
  },
  dollar: { ar: 'تغير مؤشر الدولار DXY', en: 'DXY change', fr: 'Variation du DXY' },
  oil: { ar: 'تغير النفط', en: 'Oil change', fr: 'Variation du pétrole' },
  rates: { ar: 'تغير الفائدة', en: 'Policy-rate change', fr: 'Variation du taux directeur' },
  inflation: { ar: 'مفاجأة التضخم', en: 'Inflation surprise', fr: 'Surprise d’inflation' },
  geopolitics: { ar: 'المخاطر الجيوسياسية', en: 'Geopolitical risk', fr: 'Risque géopolitique' },
  run: { ar: 'شغّل الفرضية', en: 'Run scenario', fr: 'Exécuter le scénario' },
  reset: { ar: 'العودة للوضع الحالي', en: 'Reset to current', fr: 'Revenir à l’actuel' },
  refresh: { ar: 'تحديث الأدلة', en: 'Refresh evidence', fr: 'Actualiser les preuves' },
  presetRisk: { ar: 'تصعيد عالمي', en: 'Risk escalation', fr: 'Escalade mondiale' },
  presetFed: { ar: 'تيسير فيدرالي', en: 'Fed easing', fr: 'Assouplissement Fed' },
  presetDollar: { ar: 'دولار أقوى', en: 'Stronger dollar', fr: 'Dollar plus fort' },
  simulated: { ar: 'سيناريو افتراضي نشط', en: 'Hypothetical scenario active', fr: 'Scénario hypothétique actif' },
  live: { ar: 'الأدلة الحالية', en: 'Current evidence', fr: 'Preuves actuelles' },
  unavailable: { ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' },
  noEvents: { ar: 'لا توجد أحداث كافية ذات أثر محدد حالياً.', en: 'No sufficiently directional events are available right now.', fr: 'Aucun événement suffisamment directionnel n’est disponible actuellement.' },
  noCalendar: { ar: 'لا توجد أحداث عالية أو متوسطة الأثر ضمن النافذة الحالية.', en: 'No high/medium-impact events in the current window.', fr: 'Aucun événement à impact élevé/moyen dans la fenêtre actuelle.' },
  lowEvidence: {
    ar: 'التغطية الحالية غير كافية لتعامل النتيجة كتوقع قوي؛ اعتمد على السيناريوهات كنطاقات شرطية فقط.',
    en: 'Current coverage is too thin for a strong forecast. Treat the output as conditional scenario ranges only.',
    fr: 'La couverture actuelle est insuffisante pour une prévision forte. Utilisez uniquement les fourchettes conditionnelles.',
  },
  disclaimer: {
    ar: 'المحرك أداة تحليل سيناريوهات وليست توصية شراء أو بيع. الأوزان والنطاقات احتمالية وتتغير مع البيانات.',
    en: 'This is a scenario-analysis tool, not a buy/sell recommendation. Weights and ranges are probabilistic and change with evidence.',
    fr: 'Outil d’analyse de scénarios, pas une recommandation d’achat/vente. Les poids et fourchettes évoluent avec les données.',
  },
  error: { ar: 'تعذر تحميل محرك سيناريوهات الذهب.', en: 'Gold scenario engine could not be loaded.', fr: 'Le moteur de scénarios de l’or n’a pas pu être chargé.' },
};

function locale(lang: Lang) {
  if (lang === 'ar') return 'ar-KW';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function money(value: number | null | undefined, lang: Lang) {
  if (!Number.isFinite(value) || Number(value) <= 0) return '—';
  return new Intl.NumberFormat(locale(lang), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function percent(value: number | null | undefined, lang: Lang, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale(lang), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value)) + '%';
}

function dateTime(value: string | null | undefined, lang: Lang) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(locale(lang), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function directionLabel(direction: GoldDriverDirection, lang: Lang) {
  const labels: Record<GoldDriverDirection, Record<Lang, string>> = {
    bullish: { ar: 'داعم للذهب', en: 'Gold-supportive', fr: 'Favorable à l’or' },
    bearish: { ar: 'ضاغط على الذهب', en: 'Gold-negative', fr: 'Défavorable à l’or' },
    neutral: { ar: 'محايد', en: 'Neutral', fr: 'Neutre' },
    unknown: { ar: 'غير محسوم', en: 'Unresolved', fr: 'Indéterminé' },
  };
  return labels[direction][lang];
}

function qualityLabel(level: GoldScenarioSnapshot['dataQuality']['level'], lang: Lang) {
  const labels = {
    high: { ar: 'مرتفعة', en: 'High', fr: 'Élevée' },
    medium: { ar: 'متوسطة', en: 'Medium', fr: 'Moyenne' },
    low: { ar: 'منخفضة', en: 'Low', fr: 'Faible' },
    insufficient: { ar: 'غير كافية', en: 'Insufficient', fr: 'Insuffisante' },
  } as const;
  return labels[level][lang];
}

function impactLabel(value: string, lang: Lang) {
  const labels: Record<string, Record<Lang, string>> = {
    high: { ar: 'مرتفع', en: 'High', fr: 'Élevé' },
    medium: { ar: 'متوسط', en: 'Medium', fr: 'Moyen' },
    low: { ar: 'منخفض', en: 'Low', fr: 'Faible' },
    unknown: { ar: 'غير محدد', en: 'Unknown', fr: 'Inconnu' },
  };
  return (labels[value] ?? labels.unknown)[lang];
}

const EMPTY_FORM = {
  dollarIndexPct: '',
  oilPct: '',
  policyRateBps: '',
  inflationSurprisePct: '',
  geopoliticalRisk: '0',
};

type FormState = typeof EMPTY_FORM;

function toPayload(form: FormState): GoldWhatIfInput {
  const result: GoldWhatIfInput = {};
  (Object.keys(form) as Array<keyof FormState>).forEach(key => {
    const raw = form[key].trim();
    if (!raw) return;
    const value = Number(raw);
    if (Number.isFinite(value)) result[key] = value;
  });
  return result;
}

export function GoldScenarioEngine() {
  const { lang: rawLang, dir } = useLanguage();
  const lang: Lang = rawLang === 'en' || rawLang === 'fr' ? rawLang : 'ar';
  const t = useCallback((key: keyof typeof COPY) => COPY[key][lang], [lang]);
  const [snapshot, setSnapshot] = useState<GoldScenarioSnapshot | null>(null);
  const [horizon, setHorizon] = useState<GoldScenarioHorizon>('1M');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState('');

  const loadBaseline = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/market/gold-scenario', { cache: 'no-store' });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.success || !payload.snapshot) throw new Error(payload.error || 'unavailable');
      setSnapshot(payload.snapshot);
      setSimulated(false);
      setForm(EMPTY_FORM);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBaseline();
  }, [loadBaseline]);

  const topDrivers = useMemo(() => {
    return [...(snapshot?.drivers ?? [])]
      .filter(driver => driver.available)
      .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
      .slice(0, 8);
  }, [snapshot]);

  async function runWhatIf(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError('');
    try {
      const response = await fetch('/api/market/gold-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.success || !payload.snapshot) throw new Error(payload.error || 'unavailable');
      setSnapshot(payload.snapshot);
      setSimulated(true);
    } catch {
      setError(t('error'));
    } finally {
      setRunning(false);
    }
  }

  function preset(values: Partial<FormState>) {
    setForm(current => ({ ...EMPTY_FORM, ...current, ...values }));
  }

  if (loading && !snapshot) {
    return (
      <section className={styles.engine} dir={dir} aria-busy="true">
        <div className={styles.loading}>
          <Activity aria-hidden="true" />
          <div><strong>{t('title')}</strong><span>Loading evidence…</span></div>
        </div>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className={styles.engine} dir={dir}>
        <div className={styles.error} role="alert">
          <CircleAlert aria-hidden="true" />
          <div><strong>{t('error')}</strong>{error ? <p>{error}</p> : null}</div>
          <button type="button" onClick={() => void loadBaseline()}>{t('refresh')}</button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.engine} dir={dir} aria-label={t('title')}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t('eyebrow')}</span>
          <h2>{t('title')}</h2>
          <p>{t('description')}</p>
          <div className={styles.statusRow}>
            <span data-state={simulated ? 'simulated' : 'live'}>{simulated ? t('simulated') : t('live')}</span>
            <span>{snapshot.modelVersion}</span>
            <span>{dateTime(snapshot.generatedAt, lang)}</span>
          </div>
        </div>
        <button className={styles.refreshButton} type="button" onClick={() => void loadBaseline()} disabled={loading || running}>
          <RefreshCw size={16} aria-hidden="true" />
          {t('refresh')}
        </button>
      </header>

      {snapshot.dataQuality.level === 'insufficient' ? (
        <div className={styles.warning}>
          <CircleAlert size={17} aria-hidden="true" />
          <span>{t('lowEvidence')}</span>
        </div>
      ) : null}

      <div className={styles.metrics}>
        <Metric icon={<Target size={18} />} label={t('current')} value={money(snapshot.currentGoldPrice, lang)} detail="USD / oz" />
        <Metric icon={snapshot.directionalBias === 'bearish' ? <TrendingDown size={18} /> : <TrendingUp size={18} />} label={t('bias')} value={directionLabel(snapshot.directionalBias, lang)} detail={`score ${snapshot.evidenceScore >= 0 ? '+' : ''}${snapshot.evidenceScore.toFixed(2)}`} state={snapshot.directionalBias} />
        <Metric icon={<Gauge size={18} />} label={t('confidence')} value={percent(snapshot.confidence, lang)} detail={`${snapshot.dataQuality.availableDrivers}/${snapshot.dataQuality.totalDrivers} drivers`} />
        <Metric icon={<Activity size={18} />} label={t('quality')} value={qualityLabel(snapshot.dataQuality.level, lang)} detail={percent(snapshot.dataQuality.score, lang)} />
        <Metric icon={<SlidersHorizontal size={18} />} label={t('volatility')} value={percent(snapshot.annualizedVolatility, lang, 1)} detail="90-session window" />
      </div>

      <div className={styles.horizonBar} role="group" aria-label={t('range')}>
        {HORIZONS.map(item => (
          <button key={item} type="button" aria-pressed={horizon === item} onClick={() => setHorizon(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className={styles.scenarioGrid}>
        {snapshot.scenarios.map(scenario => {
          const range = scenario.ranges[horizon];
          return (
            <article key={scenario.id} className={styles.scenarioCard} data-kind={scenario.id}>
              <div className={styles.scenarioHead}>
                <div>
                  <span>{lang === 'ar' ? scenario.labelAr : scenario.label}</span>
                  <strong>{percent(scenario.probability, lang, 1)}</strong>
                </div>
                <small>{t('modelWeight')}</small>
              </div>
              <p>{lang === 'ar' ? scenario.thesisAr : scenario.thesis}</p>
              <div className={styles.rangeBox}>
                <span>{t('range')} · {horizon}</span>
                <strong dir="ltr">{money(range.low, lang)} — {money(range.high, lang)}</strong>
                <small>{t('midpoint')}: <b dir="ltr">{money(range.midpoint, lang)}</b></small>
              </div>
              <details>
                <summary>{lang === 'ar' ? 'متى يضعف السيناريو؟' : lang === 'fr' ? 'Quand ce scénario faiblit-il ?' : 'What invalidates it?'}</summary>
                <ul>
                  {(lang === 'ar' ? scenario.invalidationAr : scenario.invalidation).map(item => <li key={item}>{item}</li>)}
                </ul>
              </details>
            </article>
          );
        })}
      </div>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><Gauge size={18} aria-hidden="true" /><h3>{t('drivers')}</h3></div>
            <span>{topDrivers.length}</span>
          </div>
          <div className={styles.driverList}>
            {topDrivers.map(driver => (
              <article key={driver.id}>
                <div className={styles.driverTitle}>
                  <strong>{lang === 'ar' ? driver.labelAr : driver.label}</strong>
                  <span data-direction={driver.direction}>{directionLabel(driver.direction, lang)}</span>
                </div>
                <div className={styles.driverBar} aria-hidden="true">
                  <span style={{ width: `${Math.max(4, Math.min(100, Math.abs(driver.contribution) / Math.max(0.01, driver.weight) * 100))}%` }} data-direction={driver.direction} />
                </div>
                <p>{lang === 'ar' ? driver.rationaleAr : driver.rationale}</p>
                <small>{driver.source || t('unavailable')}{driver.changePercent !== undefined && driver.changePercent !== null ? ` · ${driver.changePercent >= 0 ? '+' : ''}${driver.changePercent.toFixed(2)}%` : ''}</small>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><Globe2 size={18} aria-hidden="true" /><h3>{t('globalEvents')}</h3></div>
            <span>{snapshot.events.length}</span>
          </div>
          {snapshot.events.length ? (
            <div className={styles.eventList}>
              {snapshot.events.slice(0, 6).map(item => (
                <article key={item.id}>
                  <div>
                    <span data-direction={item.direction}>{directionLabel(item.direction, lang)}</span>
                    <small>{dateTime(item.publishedAt, lang)} · {item.sourceName}</small>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{lang === 'ar' ? item.whyItMattersAr : item.whyItMatters}</p>
                </article>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noEvents')}</p>}
        </section>
      </div>

      <form className={styles.whatIf} onSubmit={runWhatIf}>
        <div className={styles.whatIfHead}>
          <div>
            <span><SlidersHorizontal size={17} aria-hidden="true" />{t('whatIf')}</span>
            <h3>{t('whatIf')}</h3>
            <p>{t('whatIfBody')}</p>
          </div>
          <div className={styles.presets}>
            <button type="button" onClick={() => preset({ geopoliticalRisk: '65', oilPct: '12', dollarIndexPct: '-1' })}>{t('presetRisk')}</button>
            <button type="button" onClick={() => preset({ policyRateBps: '-100', dollarIndexPct: '-2' })}>{t('presetFed')}</button>
            <button type="button" onClick={() => preset({ dollarIndexPct: '4', policyRateBps: '50' })}>{t('presetDollar')}</button>
          </div>
        </div>

        <div className={styles.whatIfGrid}>
          <label><span>{t('dollar')}</span><div><input inputMode="decimal" type="number" min="-15" max="15" step="0.1" value={form.dollarIndexPct} onChange={event => setForm(current => ({ ...current, dollarIndexPct: event.target.value }))} /><b>%</b></div></label>
          <label><span>{t('oil')}</span><div><input inputMode="decimal" type="number" min="-40" max="40" step="0.5" value={form.oilPct} onChange={event => setForm(current => ({ ...current, oilPct: event.target.value }))} /><b>%</b></div></label>
          <label><span>{t('rates')}</span><div><input inputMode="numeric" type="number" min="-300" max="300" step="25" value={form.policyRateBps} onChange={event => setForm(current => ({ ...current, policyRateBps: event.target.value }))} /><b>bp</b></div></label>
          <label><span>{t('inflation')}</span><div><input inputMode="decimal" type="number" min="-3" max="3" step="0.1" value={form.inflationSurprisePct} onChange={event => setForm(current => ({ ...current, inflationSurprisePct: event.target.value }))} /><b>pp</b></div></label>
          <label className={styles.riskInput}>
            <span>{t('geopolitics')}</span>
            <div>
              <input type="range" min="-100" max="100" step="5" value={form.geopoliticalRisk || '0'} onChange={event => setForm(current => ({ ...current, geopoliticalRisk: event.target.value }))} />
              <b dir="ltr">{form.geopoliticalRisk || '0'}</b>
            </div>
          </label>
        </div>

        <div className={styles.whatIfActions}>
          <button className={styles.primaryAction} type="submit" disabled={running}>
            {running ? <Activity size={16} className={styles.spin} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {t('run')}
          </button>
          <button type="button" className={styles.secondaryAction} onClick={() => void loadBaseline()} disabled={running}>
            {t('reset')}
          </button>
        </div>
        {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      </form>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div><CalendarClock size={18} aria-hidden="true" /><h3>{t('upcoming')}</h3></div>
          <span>{snapshot.upcomingRiskEvents.length}</span>
        </div>
        {snapshot.upcomingRiskEvents.length ? (
          <div className={styles.calendarList}>
            {snapshot.upcomingRiskEvents.slice(0, 8).map(event => (
              <article key={event.id}>
                <time dateTime={event.dateTimeUtc}>{dateTime(event.dateTimeUtc, lang)}</time>
                <div><strong>{event.title}</strong><small>{event.source || event.country || 'SFM'}</small></div>
                <span data-impact={event.impact}>{impactLabel(event.impact, lang)}</span>
              </article>
            ))}
          </div>
        ) : <p className={styles.empty}>{t('noCalendar')}</p>}
      </section>

      <footer className={styles.footer}>
        <div><strong>{t('methodology')}</strong><p>{lang === 'ar' ? snapshot.methodology.noteAr : snapshot.methodology.note}</p></div>
        <p>{t('disclaimer')}</p>
        {snapshot.dataQuality.sources.length ? (
          <div className={styles.sources}>
            {snapshot.dataQuality.sources.slice(0, 10).map(source => <span key={source}>{source}</span>)}
          </div>
        ) : null}
      </footer>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  state?: string;
}) {
  return (
    <article className={styles.metric} data-state={state}>
      <span className={styles.metricIcon} aria-hidden="true">{icon}</span>
      <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
    </article>
  );
}
