'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  CircleAlert,
  Database,
  Gauge,
  Globe2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useLanguage } from '@/hooks/useLanguage';
import type {
  GoldHorizon,
  GoldScenario,
  GoldScenarioSnapshot,
  GoldWhatIfResult,
  GoldWhatIfShocks,
} from '@/lib/gold-intelligence/types';
import styles from './GoldScenarioEngine.module.css';

type Locale = 'ar' | 'en' | 'fr';

const COPY = {
  back: { ar: 'العودة إلى الذهب والفضة', en: 'Back to Gold & Silver', fr: 'Retour à Or et argent' },
  title: { ar: 'محرك سيناريوهات الذهب', en: 'Gold Scenario Engine', fr: 'Moteur de scénarios sur l’or' },
  body: {
    ar: 'يربط الذهب بالدولار والعوائد والفائدة والنفط والمخاطر والأحداث العالمية، ويبني نطاقات واحتمالات بدل رقم سعري واحد.',
    en: 'Connects gold with the dollar, yields, rates, oil, risk and global events, then builds probability-weighted ranges instead of a single target.',
    fr: 'Relie l’or au dollar, aux rendements, aux taux, au pétrole, au risque et aux événements mondiaux, avec des fourchettes probabilistes.',
  },
  refresh: { ar: 'تحديث', en: 'Refresh', fr: 'Actualiser' },
  loading: { ar: 'جارٍ بناء السيناريوهات من الأدلة المتاحة…', en: 'Building scenarios from available evidence…', fr: 'Construction des scénarios…' },
  error: { ar: 'تعذر تحميل التحليل حالياً.', en: 'Analysis is temporarily unavailable.', fr: 'Analyse temporairement indisponible.' },
  retry: { ar: 'إعادة المحاولة', en: 'Try again', fr: 'Réessayer' },
  spot: { ar: 'سعر الذهب', en: 'Gold reference', fr: 'Référence or' },
  factor: { ar: 'درجة العوامل', en: 'Factor score', fr: 'Score des facteurs' },
  confidence: { ar: 'ثقة النموذج', en: 'Model confidence', fr: 'Confiance' },
  coverage: { ar: 'تغطية البيانات', en: 'Data coverage', fr: 'Couverture' },
  volatility: { ar: 'التذبذب السنوي', en: 'Annualized volatility', fr: 'Volatilité annualisée' },
  scenarios: { ar: 'السيناريوهات', en: 'Scenarios', fr: 'Scénarios' },
  range: { ar: 'نطاق السعر', en: 'Price range', fr: 'Fourchette' },
  thesis: { ar: 'الفرضية', en: 'Thesis', fr: 'Hypothèse' },
  invalidation: { ar: 'متى يضعف؟', en: 'What weakens it?', fr: 'Invalidation' },
  drivers: { ar: 'محركات الذهب', en: 'Gold drivers', fr: 'Facteurs de l’or' },
  events: { ar: 'الأحداث العالمية المؤثرة', en: 'Global event intelligence', fr: 'Événements mondiaux' },
  calendar: { ar: 'الأحداث الاقتصادية القادمة', en: 'Upcoming macro events', fr: 'Événements macro' },
  whatIf: { ar: 'ماذا لو؟', en: 'What If?', fr: 'Et si ?' },
  whatIfBody: {
    ar: 'غيّر الفرضيات وشاهد كيف تتغير السيناريوهات فوق الوضع الحالي.',
    en: 'Apply hypothetical shocks to the current baseline and recalculate the scenarios.',
    fr: 'Appliquez des chocs hypothétiques au scénario de référence.',
  },
  dollar: { ar: 'تغير DXY', en: 'DXY change', fr: 'Variation DXY' },
  oil: { ar: 'تغير النفط', en: 'Oil change', fr: 'Variation pétrole' },
  realYield: { ar: 'العائد الحقيقي', en: 'Real yield', fr: 'Rendement réel' },
  geopolitical: { ar: 'المخاطر الجيوسياسية', en: 'Geopolitical risk', fr: 'Risque géopolitique' },
  centralBank: { ar: 'طلب البنوك المركزية', en: 'Central-bank demand', fr: 'Demande banques centrales' },
  run: { ar: 'تشغيل الفرضية', en: 'Run scenario', fr: 'Simuler' },
  reset: { ar: 'إعادة الضبط', en: 'Reset', fr: 'Réinitialiser' },
  sourceHealth: { ar: 'حالة المصادر', en: 'Source health', fr: 'État des sources' },
  methodology: { ar: 'المنهجية', en: 'Methodology', fr: 'Méthodologie' },
  methodologyBody: {
    ar: 'الإصدار 1.0 نموذج كمي قابل للتفسير. يعيد توزيع الأوزان عند فقد البيانات، ويستخدم التذبذب المرصود لبناء النطاقات. لا يخمّن نموذج اللغة سعر الذهب.',
    en: 'Version 1.0 is an explainable quant model. Missing evidence is excluded and weights are redistributed; observed volatility defines ranges. The language model does not guess the gold price.',
    fr: 'La version 1.0 est un modèle quantitatif explicable. Les données manquantes sont exclues et la volatilité observée définit les fourchettes.',
  },
  disclaimer: {
    ar: 'السيناريوهات أداة تحليل وليست وعداً بالسعر أو توصية استثمارية.',
    en: 'Scenarios are analytical tools, not price promises or investment advice.',
    fr: 'Ces scénarios sont des outils d’analyse, pas des promesses de prix.',
  },
  unavailable: { ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' },
  baseline: { ar: 'الأساس', en: 'Baseline', fr: 'Référence' },
  simulated: { ar: 'افتراضي', en: 'Simulated', fr: 'Simulé' },
} as const;

const HORIZONS: Array<{ id: GoldHorizon; ar: string; en: string; fr: string }> = [
  { id: '24h', ar: '24 ساعة', en: '24H', fr: '24 h' },
  { id: '7d', ar: '7 أيام', en: '7D', fr: '7 j' },
  { id: '1m', ar: 'شهر', en: '1M', fr: '1 mois' },
  { id: '3m', ar: '3 أشهر', en: '3M', fr: '3 mois' },
  { id: '6m', ar: '6 أشهر', en: '6M', fr: '6 mois' },
  { id: '12m', ar: '12 شهر', en: '12M', fr: '12 mois' },
];

const SCENARIO_LABELS: Record<GoldScenario['id'], Record<Locale, string>> = {
  base: { ar: 'الأساسي', en: 'Base', fr: 'Central' },
  bull: { ar: 'الصعود', en: 'Bull', fr: 'Haussier' },
  bear: { ar: 'الهبوط', en: 'Bear', fr: 'Baissier' },
  tail: { ar: 'مخاطر قصوى', en: 'Tail risk', fr: 'Risque extrême' },
};

const INITIAL_SHOCKS: GoldWhatIfShocks = {
  dollarPct: 0,
  oilPct: 0,
  realYieldBps: 0,
  geopoliticalRisk: 0,
  centralBankDemand: 0,
};

function formatPrice(value: number | null, currency: string, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return COPY.unavailable[locale];
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function signed(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return '—';
  return (value > 0 ? '+' : '') + value.toFixed(digits);
}

function tone(value: number | null) {
  if (value === null || Math.abs(value) < 0.12) return 'neutral';
  return value > 0 ? 'supportive' : 'restrictive';
}

export function GoldScenarioEngine() {
  const { lang, dir } = useLanguage();
  const locale: Locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const t = (key: keyof typeof COPY) => COPY[key][locale];
  const [snapshot, setSnapshot] = useState<GoldScenarioSnapshot | null>(null);
  const [simulation, setSimulation] = useState<GoldWhatIfResult | null>(null);
  const [horizon, setHorizon] = useState<GoldHorizon>('1m');
  const [shocks, setShocks] = useState<GoldWhatIfShocks>(INITIAL_SHOCKS);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gold-intelligence', { cache: 'no-store' });
      const body = await response.json().catch(() => null) as { success?: boolean; snapshot?: GoldScenarioSnapshot; message?: string } | null;
      if (!response.ok || !body?.success || !body.snapshot) throw new Error(body?.message || 'unavailable');
      setSnapshot(body.snapshot);
      setSimulation(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const baseline = useMemo(
    () => snapshot?.horizons.find(item => item.horizon === horizon) ?? null,
    [snapshot, horizon],
  );
  const active = simulation?.horizon === horizon ? simulation.forecast : baseline;

  async function runSimulation() {
    if (!snapshot) return;
    setSimulating(true);
    setError(null);
    try {
      const response = await fetch('/api/gold-intelligence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ horizon, shocks }),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; simulation?: GoldWhatIfResult } | null;
      if (!response.ok || !body?.success || !body.simulation) throw new Error('simulation_failed');
      setSimulation(body.simulation);
    } catch {
      setError(t('error'));
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.shell} dir={dir}>
        <DashboardPageShell ariaLabel={t('title')} className={styles.main} contentClassName={styles.content}>
          <div className={styles.state}><RefreshCw className={styles.spin} size={20} aria-hidden="true" />{t('loading')}</div>
        </DashboardPageShell>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={styles.shell} dir={dir}>
        <DashboardPageShell ariaLabel={t('title')} className={styles.main} contentClassName={styles.content}>
          <div className={styles.state} role="alert">
            <CircleAlert size={20} aria-hidden="true" />
            <span>{t('error')} {error}</span>
            <button type="button" onClick={() => void load()}>{t('retry')}</button>
          </div>
        </DashboardPageShell>
      </div>
    );
  }

  const scenarioClass: Record<GoldScenario['id'], string> = {
    base: styles.base,
    bull: styles.bull,
    bear: styles.bear,
    tail: styles.tail,
  };

  return (
    <div className={styles.shell} dir={dir}>
      <DashboardPageShell ariaLabel={t('title')} className={styles.main} contentClassName={styles.content}>
        <header className={styles.header}>
          <div>
            <Link href="/investments/gold-silver" className={styles.back}><ArrowLeft size={16} />{t('back')}</Link>
            <p className={styles.eyebrow}><Sparkles size={15} />SFM Gold Intelligence</p>
            <h1>{t('title')}</h1>
            <p>{t('body')}</p>
          </div>
          <button type="button" className={styles.refresh} onClick={() => void load()}><RefreshCw size={16} />{t('refresh')}</button>
        </header>

        {error ? <div className={styles.notice} role="alert">{error}</div> : null}

        <section className={styles.metrics}>
          <Metric icon={<Activity size={18} />} label={t('spot')} value={formatPrice(snapshot.spot.price, snapshot.spot.currency, locale)} detail={signed(snapshot.spot.changePercent) + '% · ' + snapshot.spot.source} />
          <Metric icon={<Gauge size={18} />} label={t('factor')} value={signed(simulation?.simulatedFactorScore ?? snapshot.factorScore, 3)} detail={simulation ? t('simulated') : t('baseline')} />
          <Metric icon={<BrainCircuit size={18} />} label={t('confidence')} value={snapshot.confidence + '%'} detail={t('disclaimer')} />
          <Metric icon={<Database size={18} />} label={t('coverage')} value={snapshot.dataCoverage + '%'} detail={t('volatility') + ': ' + (snapshot.annualizedVolatility === null ? t('unavailable') : snapshot.annualizedVolatility.toFixed(1) + '%')} />
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}><div><span>SFM GSE · 24H → 12M</span><h2>{t('scenarios')}</h2></div></div>
          <div className={styles.tabs} role="tablist" aria-label={t('scenarios')}>
            {HORIZONS.map(item => (
              <button key={item.id} type="button" role="tab" aria-selected={horizon === item.id} onClick={() => { setHorizon(item.id); setSimulation(null); }}>
                {item[locale]}
              </button>
            ))}
          </div>
          <div className={styles.scenarios} aria-live="polite">
            {active?.scenarios.map(scenario => (
              <article key={scenario.id} className={[styles.scenario, scenarioClass[scenario.id]].join(' ')}>
                <div className={styles.scenarioTop}><strong>{SCENARIO_LABELS[scenario.id][locale]}</strong><b>{scenario.probability}%</b></div>
                <div className={styles.range}>
                  <small>{t('range')}</small>
                  <span dir="ltr">{scenario.low === null || scenario.high === null ? t('unavailable') : formatPrice(scenario.low, snapshot.spot.currency, locale) + ' – ' + formatPrice(scenario.high, snapshot.spot.currency, locale)}</span>
                </div>
                <dl>
                  <div><dt>{t('thesis')}</dt><dd>{locale === 'ar' ? scenario.thesisAr : scenario.thesis}</dd></div>
                  <div><dt>{t('invalidation')}</dt><dd>{locale === 'ar' ? scenario.invalidationAr : scenario.invalidation}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.sectionHead}><div><span>{snapshot.methodology}</span><h2>{t('drivers')}</h2></div><Gauge size={19} /></div>
            <div className={styles.list}>
              {snapshot.drivers.map(driver => (
                <article key={driver.id} className={styles.driver}>
                  <div className={styles.driverTop}>
                    <div><strong>{locale === 'ar' ? driver.labelAr : driver.label}</strong><small>{Math.round(driver.weight * 100)}%</small></div>
                    <b data-tone={tone(driver.score)}>{driver.available ? signed(driver.score, 2) : t('unavailable')}</b>
                  </div>
                  <p>{locale === 'ar' ? driver.explanationAr : driver.explanation}</p>
                  <small>{driver.source || t('unavailable')}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHead}><div><span>{t('confidence')} · {snapshot.confidence}%</span><h2>{t('events')}</h2></div><Globe2 size={19} /></div>
            {snapshot.events.length ? (
              <div className={styles.list}>
                {snapshot.events.map(event => (
                  <article key={event.id} className={styles.event}>
                    <div className={styles.eventMeta}><span>{event.verificationStatus}</span><span>{event.expectedImpact}</span><b data-tone={tone(event.bias)}>{signed(event.bias, 2)}</b></div>
                    <h3>{event.url ? <a href={event.url} target="_blank" rel="noreferrer">{event.title}</a> : event.title}</h3>
                    <p>{locale === 'ar' ? event.rationaleAr : event.rationale}</p>
                    <small>{event.source} · {new Date(event.publishedAt).toLocaleString(locale === 'ar' ? 'ar-KW' : undefined)}</small>
                  </article>
                ))}
              </div>
            ) : <p className={styles.empty}>{t('unavailable')}</p>}
          </section>
        </div>

        <section className={styles.whatIf}>
          <div className={styles.sectionHead}><div><span>{t('whatIfBody')}</span><h2>{t('whatIf')}</h2></div><SlidersHorizontal size={20} /></div>
          <div className={styles.sliders}>
            <Shock label={t('dollar')} value={shocks.dollarPct} min={-10} max={10} step={0.25} suffix="%" onChange={value => setShocks(current => ({ ...current, dollarPct: value }))} />
            <Shock label={t('oil')} value={shocks.oilPct} min={-30} max={30} step={0.5} suffix="%" onChange={value => setShocks(current => ({ ...current, oilPct: value }))} />
            <Shock label={t('realYield')} value={shocks.realYieldBps} min={-100} max={100} step={5} suffix=" bps" onChange={value => setShocks(current => ({ ...current, realYieldBps: value }))} />
            <Shock label={t('geopolitical')} value={shocks.geopoliticalRisk} min={-100} max={100} step={5} suffix="" onChange={value => setShocks(current => ({ ...current, geopoliticalRisk: value }))} />
            <Shock label={t('centralBank')} value={shocks.centralBankDemand} min={-100} max={100} step={5} suffix="" onChange={value => setShocks(current => ({ ...current, centralBankDemand: value }))} />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={simulating} onClick={() => void runSimulation()}><Sparkles size={16} />{t('run')}</button>
            <button type="button" className={styles.secondary} onClick={() => { setShocks(INITIAL_SHOCKS); setSimulation(null); }}><RotateCcw size={16} />{t('reset')}</button>
            {simulation ? <div className={styles.simulation}><span>{t('factor')}</span><b>{signed(simulation.baselineFactorScore, 3)} → {signed(simulation.simulatedFactorScore, 3)}</b></div> : null}
          </div>
        </section>

        <div className={styles.columns}>
          <section className={styles.panel}>
            <div className={styles.sectionHead}><div><span>USD · 7D</span><h2>{t('calendar')}</h2></div><CalendarDays size={19} /></div>
            {snapshot.upcomingEvents.length ? (
              <div className={styles.calendar}>
                {snapshot.upcomingEvents.map(event => (
                  <article key={event.id}>
                    <div><strong>{event.title}</strong><small>{event.source || t('unavailable')}</small></div>
                    <b>{event.impact}</b>
                    <time dateTime={event.dateTimeUtc}>{new Date(event.dateTimeUtc).toLocaleString(locale === 'ar' ? 'ar-KW' : undefined)}</time>
                  </article>
                ))}
              </div>
            ) : <p className={styles.empty}>{t('unavailable')}</p>}
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHead}><div><span>{snapshot.engineVersion}</span><h2>{t('sourceHealth')}</h2></div><Database size={19} /></div>
            <div className={styles.sources}>
              {Object.entries(snapshot.sourceStatus).map(([key, value]) => <div key={key}><span>{key.replace('_', ' ')}</span><b data-quality={value}>{value}</b></div>)}
            </div>
            {snapshot.warnings.length ? <ul className={styles.warnings}>{snapshot.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}
          </section>
        </div>

        <section className={styles.methodology}>
          <BrainCircuit size={20} />
          <div><strong>{t('methodology')}</strong><p>{t('methodologyBody')}</p><small>{t('disclaimer')}</small></div>
        </section>
      </DashboardPageShell>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <article className={styles.metric}><span>{icon}</span><div><small>{label}</small><strong dir="ltr">{value}</strong><p>{detail}</p></div></article>;
}

function Shock({ label, value, min, max, step, suffix, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.shock}>
      <span><strong>{label}</strong><b dir="ltr">{value > 0 ? '+' : ''}{value}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
    </label>
  );
}
