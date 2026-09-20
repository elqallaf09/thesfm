'use client';

import { useMemo, useState } from 'react';
import { CircleAlert, EqualApproximately, Target, TrendingDown, TrendingUp } from 'lucide-react';
import {
  calculateOilTargetStress,
  type OilScenarioContext,
  type OilScenarioDriverKey,
  type OilScenarioInput,
  type OilTargetEquivalent,
} from '@/lib/market/oilScenarioEngine';
import styles from './OilTargetStressTest.module.css';

type Lang = 'ar' | 'en' | 'fr';

const COPY = {
  ar: {
    title: 'اختبار السعر المستهدف',
    subtitle: 'اكتب سعراً مثل 200$ ليحسب المحرك مقدار الضغط الإضافي المطلوب داخل النموذج، ثم يعرض معادلات «لو تغيّر عامل واحد فقط» مع تثبيت بقية الفرضيات. هذه ليست توقعات لما سيحدث.',
    target: 'السعر المراد اختباره',
    current: 'منتصف السيناريو الحالي',
    requiredMove: 'التغير المطلوب من السعر المرجعي',
    gap: 'الفجوة عن السيناريو الحالي',
    basis: 'أساس الحساب',
    official: 'تدفقات EIA الرسمية للممرات',
    proxy: 'حساسية نسبية',
    up: 'الهدف يحتاج ضغطاً صعودياً إضافياً',
    down: 'الهدف يحتاج ضغطاً هبوطياً إضافياً',
    flat: 'السيناريو الحالي قريب من السعر المستهدف.',
    outside: 'السعر المستهدف خارج حدود سيناريو المركز المهيأة حالياً. لا تُعامل المعادلات أدناه كمسار صالح للوصول إليه داخل هذا النموذج.',
    equivalents: 'معادلات عامل واحد',
    equivalentsHint: 'كل بطاقة تجيب: لو بقيت كل العوامل الأخرى كما هي، كم يجب أن يصبح هذا العامل وحده للوصول إلى السعر المستهدف؟',
    inRange: 'داخل نطاق الاختبار',
    outRange: 'يتجاوز نطاق الاختبار',
    currentValue: 'الحالي',
    requiredValue: 'المطلوب',
    delta: 'الفرق',
    configuredRange: 'نطاق الأداة',
    impliedVolume: 'براميل متأثرة ضمنياً',
    noSingle: 'لا يوجد عامل واحد ضمن النطاقات الحالية يكفي وحده للوصول إلى الهدف؛ الوصول إليه داخل النموذج يتطلب مزيجاً من الصدمات.',
    caveat: 'هذه مساواة حسابية للحساسية وليست تقديراً لاحتمال وقوع الحدث أو توصية تداول.',
    referenceNeeded: 'أدخل سعراً مرجعياً صالحاً في محرك النفط أولاً.',
    hormuz: 'تعطل هرمز',
    babElMandeb: 'تعطل باب المندب',
    offlineProduction: 'إنتاج متعطل',
    spareCapacity: 'طاقة فائضة',
    stockRelease: 'سحب من المخزون',
    tankers: 'تعطل الناقلات',
    freightInsurance: 'الشحن والتأمين',
    demand: 'تغير الطلب',
    rates: 'الفائدة',
    pct: '%',
    mbd: 'مليون ب/ي',
    bps: 'نقطة أساس',
  },
  en: {
    title: 'Target Price Stress Test',
    subtitle: 'Enter a price such as $200. The engine calculates the extra pressure required inside the model, then reverse-solves “one variable changes” equivalents while every other assumption stays fixed. These are not forecasts.',
    target: 'Price to stress-test',
    current: 'Current central midpoint',
    requiredMove: 'Required move from reference',
    gap: 'Gap versus current scenario',
    basis: 'Calculation basis',
    official: 'Official EIA chokepoint flows',
    proxy: 'Percentage sensitivity proxy',
    up: 'The target needs additional upward pressure',
    down: 'The target needs additional downward pressure',
    flat: 'The current scenario is already close to the target.',
    outside: 'The target is outside the configured central-model impact bounds. Do not interpret the equations below as a valid path to that price inside this model.',
    equivalents: 'Single-variable equivalents',
    equivalentsHint: 'Each card asks: if every other assumption stays unchanged, what would this one variable need to become to reach the target?',
    inRange: 'Inside test range',
    outRange: 'Outside test range',
    currentValue: 'Current',
    requiredValue: 'Required',
    delta: 'Delta',
    configuredRange: 'Tool range',
    impliedVolume: 'Implied affected barrels',
    noSingle: 'No single lever within the current ranges can reach the target alone; reaching it inside the model would require a combination of shocks.',
    caveat: 'This is sensitivity arithmetic, not an estimate of event probability or a trading recommendation.',
    referenceNeeded: 'Enter a valid reference price in the oil engine first.',
    hormuz: 'Hormuz disruption',
    babElMandeb: 'Bab el-Mandeb disruption',
    offlineProduction: 'Offline production',
    spareCapacity: 'Spare capacity',
    stockRelease: 'Inventory release',
    tankers: 'Tanker disruption',
    freightInsurance: 'Freight & insurance',
    demand: 'Demand change',
    rates: 'Policy rates',
    pct: '%',
    mbd: 'mb/d',
    bps: 'bps',
  },
  fr: {
    title: 'Test de prix cible',
    subtitle: 'Saisissez un prix comme 200 $. Le moteur calcule la pression supplémentaire requise dans le modèle puis résout des équivalents « une seule variable change » en gardant toutes les autres hypothèses fixes. Ce ne sont pas des prévisions.',
    target: 'Prix à tester',
    current: 'Point central actuel',
    requiredMove: 'Variation requise depuis la référence',
    gap: 'Écart avec le scénario actuel',
    basis: 'Base de calcul',
    official: 'Flux officiels EIA des détroits',
    proxy: 'Sensibilité en pourcentage',
    up: 'La cible exige une pression haussière supplémentaire',
    down: 'La cible exige une pression baissière supplémentaire',
    flat: 'Le scénario actuel est déjà proche de la cible.',
    outside: 'La cible dépasse les limites configurées du modèle central. Les équations ci-dessous ne constituent pas un chemin valide vers ce prix dans ce modèle.',
    equivalents: 'Équivalents à une variable',
    equivalentsHint: 'Chaque carte répond à la question : si toutes les autres hypothèses restent fixes, quelle valeur cette seule variable devrait-elle atteindre ?',
    inRange: 'Dans la plage de test',
    outRange: 'Hors plage de test',
    currentValue: 'Actuel',
    requiredValue: 'Requis',
    delta: 'Écart',
    configuredRange: 'Plage de l’outil',
    impliedVolume: 'Barils affectés implicites',
    noSingle: 'Aucun levier unique dans les plages actuelles ne suffit seul ; la cible nécessiterait une combinaison de chocs dans le modèle.',
    caveat: 'Il s’agit d’une égalité de sensibilité, pas d’une estimation de probabilité ni d’une recommandation de trading.',
    referenceNeeded: 'Saisissez d’abord un prix de référence valide dans le moteur pétrolier.',
    hormuz: 'Perturbation d’Ormuz',
    babElMandeb: 'Perturbation de Bab el-Mandeb',
    offlineProduction: 'Production indisponible',
    spareCapacity: 'Capacité disponible',
    stockRelease: 'Libération de stocks',
    tankers: 'Perturbation des navires',
    freightInsurance: 'Fret et assurance',
    demand: 'Variation de la demande',
    rates: 'Taux directeurs',
    pct: '%',
    mbd: 'Mb/j',
    bps: 'pb',
  },
} as const;

const UPWARD_KEYS: OilScenarioDriverKey[] = [
  'hormuz',
  'babElMandeb',
  'offlineProduction',
  'tankers',
  'freightInsurance',
  'demand',
];

const DOWNWARD_KEYS: OilScenarioDriverKey[] = [
  'spareCapacity',
  'stockRelease',
  'demand',
  'rates',
];

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function number(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function signed(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return \`\${value > 0 ? '+' : ''}\${number(value, digits)}\`;
}

function unitLabel(item: OilTargetEquivalent, copy: typeof COPY.ar | typeof COPY.en | typeof COPY.fr) {
  if (item.unit === 'mbd') return copy.mbd;
  if (item.unit === 'bps') return copy.bps;
  return copy.pct;
}

function formattedValue(item: OilTargetEquivalent, value: number, copy: typeof COPY.ar | typeof COPY.en | typeof COPY.fr) {
  const digits = item.unit === 'bps' ? 0 : item.unit === 'mbd' ? 2 : 1;
  return \`\${number(value, digits)} \${unitLabel(item, copy)}\`;
}

export function OilTargetStressTest({
  input,
  context,
  lang,
}: {
  input: OilScenarioInput;
  context?: OilScenarioContext;
  lang: Lang;
}) {
  const copy = COPY[lang];
  const labels = COPY[lang];
  const [targetPrice, setTargetPrice] = useState(200);

  const result = useMemo(
    () => input.referencePrice > 0 && targetPrice > 0
      ? calculateOilTargetStress(input, targetPrice, context)
      : null,
    [context, input, targetPrice],
  );

  const visible = useMemo(() => {
    if (!result || result.direction === 'flat') return [];
    const allowed = new Set(result.direction === 'up' ? UPWARD_KEYS : DOWNWARD_KEYS);
    return result.equivalents.filter(item => allowed.has(item.key));
  }, [result]);

  const anyInsideRange = visible.some(item => item.insideConfiguredRange);
  const leverLabels: Record<OilScenarioDriverKey, string> = {
    hormuz: labels.hormuz,
    babElMandeb: labels.babElMandeb,
    offlineProduction: labels.offlineProduction,
    spareCapacity: labels.spareCapacity,
    stockRelease: labels.stockRelease,
    tankers: labels.tankers,
    freightInsurance: labels.freightInsurance,
    demand: labels.demand,
    rates: labels.rates,
  };

  return (
    <section className={styles.panel} aria-label={copy.title}>
      <header className={styles.header}>
        <div className={styles.icon} aria-hidden="true"><Target size={22} /></div>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className={styles.inputRow}>
        <label>
          <span>{copy.target}</span>
          <div><span aria-hidden="true">$</span><input type="number" min="0.01" max="2000" step="1" value={targetPrice} onChange={event => setTargetPrice(Number(event.target.value))} /></div>
        </label>
        {result ? (
          <div className={styles.direction}>
            {result.direction === 'up' ? <TrendingUp size={18} aria-hidden="true" /> : result.direction === 'down' ? <TrendingDown size={18} aria-hidden="true" /> : <EqualApproximately size={18} aria-hidden="true" />}
            <strong>{result.direction === 'up' ? copy.up : result.direction === 'down' ? copy.down : copy.flat}</strong>
          </div>
        ) : null}
      </div>

      {!result ? (
        <p className={styles.notice}><CircleAlert size={17} aria-hidden="true" />{copy.referenceNeeded}</p>
      ) : (
        <>
          <div className={styles.metrics}>
            <article><span>{copy.current}</span><strong dir="ltr">{money(result.currentCentralPrice)}</strong></article>
            <article><span>{copy.requiredMove}</span><strong dir="ltr">{signed(result.requiredImpactPct)}%</strong></article>
            <article><span>{copy.gap}</span><strong dir="ltr">{signed(result.impactGapPct)} pp</strong></article>
            <article><span>{copy.basis}</span><strong>{result.context.mode === 'official_flow_baseline' ? copy.official : copy.proxy}</strong>{result.context.referencePeriod ? <small dir="ltr">{result.context.referencePeriod}</small> : null}</article>
          </div>

          {!result.modelReachable ? <p className={styles.warning}><CircleAlert size={17} aria-hidden="true" />{copy.outside}</p> : null}

          {result.direction !== 'flat' ? (
            <div className={styles.equivalents}>
              <div className={styles.sectionHead}><h3>{copy.equivalents}</h3><p>{copy.equivalentsHint}</p></div>
              <div className={styles.cards}>
                {visible.map(item => (
                  <article className={styles.card} key={item.key}>
                    <div className={styles.cardHead}>
                      <strong>{leverLabels[item.key]}</strong>
                      <span className={item.insideConfiguredRange ? styles.inside : styles.outside}>
                        {item.insideConfiguredRange ? copy.inRange : copy.outRange}
                      </span>
                    </div>
                    <dl>
                      <div><dt>{copy.currentValue}</dt><dd dir="ltr">{formattedValue(item, item.currentValue, copy)}</dd></div>
                      <div><dt>{copy.requiredValue}</dt><dd dir="ltr">{formattedValue(item, item.requiredValue, copy)}</dd></div>
                      <div><dt>{copy.delta}</dt><dd dir="ltr">{signed(item.delta, item.unit === 'bps' ? 0 : 2)} {unitLabel(item, copy)}</dd></div>
                      <div><dt>{copy.configuredRange}</dt><dd dir="ltr">{formattedValue(item, item.min, copy)} – {formattedValue(item, item.max, copy)}</dd></div>
                      {item.impliedDisruptionMbd !== null ? <div><dt>{copy.impliedVolume}</dt><dd dir="ltr">{number(item.impliedDisruptionMbd, 2)} {copy.mbd}</dd></div> : null}
                    </dl>
                  </article>
                ))}
              </div>
              {result.modelReachable && !anyInsideRange ? <p className={styles.notice}><CircleAlert size={17} aria-hidden="true" />{copy.noSingle}</p> : null}
            </div>
          ) : null}

          <p className={styles.caveat}>{copy.caveat}</p>
        </>
      )}
    </section>
  );
}

export default OilTargetStressTest;
