'use client';

import { AlertTriangle, BrainCircuit, CheckCircle2, ChevronDown, Database, RefreshCw, ShieldAlert } from 'lucide-react';
import type {
  AnalysisResult,
  ConfidenceQuality,
  DirectionalBias,
  FactorAvailability,
  IntelligenceFactorKey,
  IntelligenceRecommendation,
  IntelligenceRisk,
} from '@/domain/intelligence/contracts';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import { useLanguage } from '@/hooks/useLanguage';
import { marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';
import styles from './IntelligencePanel.module.css';

type Locale = 'ar' | 'en' | 'fr';

const COPY = {
  ar: {
    title: 'سجل الأدلة الذكي', subtitle: 'تحليل حتمي مبني على البيانات المتاحة فعلياً', loading: 'جارٍ بناء التحليل من مصادر البيانات المتاحة…',
    retry: 'إعادة المحاولة', error: 'تعذر إنشاء التحليل الذكي حالياً.', providerUnavailable: 'تعذر الوصول إلى مزود البيانات. لم يتم إنشاء قيم بديلة.',
    unsupported: 'هذا الأصل غير مدعوم حالياً.', partial: 'التحليل جزئي لأن بعض عوامل البيانات غير متاحة.', stale: 'هذه نتيجة قديمة وموسومة بوضوح؛ تعذر تحديث البيانات الحية.',
    insufficient: 'الأدلة المتاحة لا تكفي لإصدار توصية اتجاهية.', conflict: 'توجد إشارات قوية متعارضة؛ تم خفض الثقة.',
    recommendation: 'القراءة', confidence: 'ثقة التحليل', confidenceNote: 'تعكس اكتمال الأدلة وحداثتها واتساقها، وليست احتمالاً مضموناً للربح.',
    quality: 'جودة الأدلة', risk: 'المخاطر', horizon: 'الأفق', generated: 'وقت التحليل', dataAsOf: 'البيانات حتى', freshness: 'الحداثة',
    factors: 'تفصيل العوامل', evidence: 'الأدلة المؤثرة', supporting: 'عوامل داعمة', opposing: 'عوامل معاكسة', limitations: 'القيود',
    source: 'المصدر', attempts: 'محاولات المزود', explanation: 'التفسير والمصدر وشروط الإبطال', reason: 'سبب القراءة', invalidation: 'ما الذي قد يبطل القراءة',
    targetsUnavailable: 'أسعار الدخول والأهداف ووقف الخسارة غير متاحة لأن طريقة حساب موثقة غير مدعومة في هذه المرحلة.',
    noEvidence: 'لا توجد أدلة موثقة متاحة لهذا القسم.', unavailable: 'غير متاح', noPrevious: 'لا يوجد تحليل سابق للمقارنة.', previous: 'التحليل السابق',
    changed: 'تغيرت القراءة بعد تغير الأدلة الموزونة.', confidenceChanged: 'تغير مستوى الثقة مع اكتمال الأدلة أو حداثتها.', unchanged: 'لا يوجد تغير جوهري.',
  },
  en: {
    title: 'Intelligence evidence ledger', subtitle: 'Deterministic analysis from data that is actually available', loading: 'Building analysis from available verified sources…',
    retry: 'Try again', error: 'Financial intelligence is unavailable right now.', providerUnavailable: 'The data provider is unavailable. No replacement values were generated.',
    unsupported: 'This asset is not supported yet.', partial: 'This analysis is partial because some data factors are unavailable.', stale: 'This is an explicitly stale result; live refresh failed.',
    insufficient: 'Available evidence is insufficient for a directional recommendation.', conflict: 'Strong signals conflict, so confidence was reduced.',
    recommendation: 'Reading', confidence: 'Analysis confidence', confidenceNote: 'Reflects evidence completeness, freshness, and consistency—not a guaranteed probability of profit.',
    quality: 'Evidence quality', risk: 'Risk', horizon: 'Horizon', generated: 'Generated', dataAsOf: 'Data as of', freshness: 'Freshness',
    factors: 'Factor breakdown', evidence: 'Material evidence', supporting: 'Supporting factors', opposing: 'Opposing factors', limitations: 'Limitations',
    source: 'Source', attempts: 'Provider attempts', explanation: 'Explanation, provenance, and invalidation', reason: 'Reason for reading', invalidation: 'What would invalidate it',
    targetsUnavailable: 'Entry prices, targets, and stop-loss values are unavailable because no documented calculation method is supported in this phase.',
    noEvidence: 'No verified evidence is available for this section.', unavailable: 'Unavailable', noPrevious: 'No previous analysis is available for comparison.', previous: 'Previous analysis',
    changed: 'The reading changed after the weighted evidence changed.', confidenceChanged: 'Confidence changed with evidence completeness or freshness.', unchanged: 'No material change.',
  },
  fr: {
    title: 'Registre des preuves intelligentes', subtitle: 'Analyse déterministe fondée sur les données réellement disponibles', loading: 'Construction de l’analyse à partir des sources vérifiées disponibles…',
    retry: 'Réessayer', error: 'L’intelligence financière est indisponible pour le moment.', providerUnavailable: 'Le fournisseur de données est indisponible. Aucune valeur de remplacement n’a été générée.',
    unsupported: 'Cet actif n’est pas encore pris en charge.', partial: 'Cette analyse est partielle car certains facteurs sont indisponibles.', stale: 'Ce résultat est explicitement ancien ; l’actualisation en direct a échoué.',
    insufficient: 'Les preuves disponibles sont insuffisantes pour une recommandation directionnelle.', conflict: 'Des signaux forts sont contradictoires ; la confiance a été réduite.',
    recommendation: 'Lecture', confidence: 'Confiance de l’analyse', confidenceNote: 'Reflète la complétude, la fraîcheur et la cohérence des preuves, pas une probabilité garantie de gain.',
    quality: 'Qualité des preuves', risk: 'Risque', horizon: 'Horizon', generated: 'Générée le', dataAsOf: 'Données au', freshness: 'Fraîcheur',
    factors: 'Détail des facteurs', evidence: 'Preuves déterminantes', supporting: 'Facteurs favorables', opposing: 'Facteurs opposés', limitations: 'Limites',
    source: 'Source', attempts: 'Tentatives fournisseur', explanation: 'Explication, provenance et invalidation', reason: 'Raison de la lecture', invalidation: 'Ce qui invaliderait la lecture',
    targetsUnavailable: 'Les prix d’entrée, objectifs et niveaux stop-loss sont indisponibles, faute de méthode de calcul documentée prise en charge durant cette phase.',
    noEvidence: 'Aucune preuve vérifiée n’est disponible pour cette section.', unavailable: 'Indisponible', noPrevious: 'Aucune analyse antérieure n’est disponible pour comparaison.', previous: 'Analyse précédente',
    changed: 'La lecture a changé après une évolution des preuves pondérées.', confidenceChanged: 'La confiance a changé avec la complétude ou la fraîcheur des preuves.', unchanged: 'Aucun changement significatif.',
  },
} as const;

const STATUS_COPY: Record<Locale, { title: string; available: string; factorUnavailable: string }> = {
  ar: { title: 'حالة الذكاء المالي', available: 'تتوفر أدلة موثقة لهذه القراءة.', factorUnavailable: 'غير متاح' },
  en: { title: 'Financial intelligence status', available: 'Verified evidence is available for this reading.', factorUnavailable: 'Unavailable' },
  fr: { title: 'État de l’intelligence financière', available: 'Des preuves vérifiées sont disponibles pour cette lecture.', factorUnavailable: 'Indisponible' },
};

const FACTORS: Record<Locale, Record<IntelligenceFactorKey, string>> = {
  ar: { TECHNICAL: 'فني', FUNDAMENTAL: 'أساسي', SENTIMENT: 'المعنويات', NEWS: 'الأخبار', MACRO: 'الاقتصاد الكلي', MOMENTUM: 'الزخم', LIQUIDITY: 'السيولة', VOLATILITY: 'التذبذب', RISK: 'المخاطر', SHARIA: 'الحالة الشرعية' },
  en: { TECHNICAL: 'Technical', FUNDAMENTAL: 'Fundamental', SENTIMENT: 'Sentiment', NEWS: 'News', MACRO: 'Macro', MOMENTUM: 'Momentum', LIQUIDITY: 'Liquidity', VOLATILITY: 'Volatility', RISK: 'Risk', SHARIA: 'Sharia status' },
  fr: { TECHNICAL: 'Technique', FUNDAMENTAL: 'Fondamental', SENTIMENT: 'Sentiment', NEWS: 'Actualités', MACRO: 'Macro', MOMENTUM: 'Momentum', LIQUIDITY: 'Liquidité', VOLATILITY: 'Volatilité', RISK: 'Risque', SHARIA: 'Statut charia' },
};

const EVIDENCE_LABELS: Record<Locale, Record<string, string>> = {
  ar: { price_vs_sma20: 'السعر مقابل متوسط 20', sma20_vs_sma50: 'متوسط 20 مقابل 50', rsi14: 'مؤشر القوة النسبية 14', change_5_period: 'تغير 5 فترات', change_20_period: 'تغير 20 فترة', annualized_volatility: 'التذبذب السنوي', recent_volume_ratio: 'نسبة حجم التداول الحديثة', earnings_per_share: 'ربحية السهم', revenue_growth: 'نمو الإيرادات', earnings_growth: 'نمو الأرباح', debt_to_equity: 'الدين إلى حقوق الملكية', price_earnings_ratio: 'مضاعف الربحية', reported_risk_level: 'مستوى المخاطر المبلغ عنه', volatility_risk: 'مخاطر التذبذب', verified_sharia_status: 'الحالة الشرعية الموثقة' },
  en: { price_vs_sma20: 'Price vs SMA 20', sma20_vs_sma50: 'SMA 20 vs SMA 50', rsi14: 'RSI 14', change_5_period: '5-period change', change_20_period: '20-period change', annualized_volatility: 'Annualized volatility', recent_volume_ratio: 'Recent volume ratio', earnings_per_share: 'Earnings per share', revenue_growth: 'Revenue growth', earnings_growth: 'Earnings growth', debt_to_equity: 'Debt to equity', price_earnings_ratio: 'Price/earnings ratio', reported_risk_level: 'Reported risk level', volatility_risk: 'Volatility risk', verified_sharia_status: 'Verified Sharia status' },
  fr: { price_vs_sma20: 'Prix vs MM 20', sma20_vs_sma50: 'MM 20 vs MM 50', rsi14: 'RSI 14', change_5_period: 'Variation sur 5 périodes', change_20_period: 'Variation sur 20 périodes', annualized_volatility: 'Volatilité annualisée', recent_volume_ratio: 'Ratio de volume récent', earnings_per_share: 'Bénéfice par action', revenue_growth: 'Croissance du chiffre d’affaires', earnings_growth: 'Croissance des bénéfices', debt_to_equity: 'Dette sur fonds propres', price_earnings_ratio: 'Ratio cours/bénéfice', reported_risk_level: 'Niveau de risque déclaré', volatility_risk: 'Risque de volatilité', verified_sharia_status: 'Statut charia vérifié' },
};

const ENUM_LABELS = {
  recommendation: {
    ar: { BUY: 'شراء', SELL: 'بيع', WAIT: 'انتظار', INSUFFICIENT_DATA: 'بيانات غير كافية' },
    en: { BUY: 'Buy', SELL: 'Sell', WAIT: 'Wait', INSUFFICIENT_DATA: 'Insufficient data' },
    fr: { BUY: 'Acheter', SELL: 'Vendre', WAIT: 'Attendre', INSUFFICIENT_DATA: 'Données insuffisantes' },
  } satisfies Record<Locale, Record<IntelligenceRecommendation, string>>,
  risk: {
    ar: { LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'مرتفعة', VERY_HIGH: 'مرتفعة جداً', UNAVAILABLE: 'غير متاحة' },
    en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', VERY_HIGH: 'Very high', UNAVAILABLE: 'Unavailable' },
    fr: { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', VERY_HIGH: 'Très élevé', UNAVAILABLE: 'Indisponible' },
  } satisfies Record<Locale, Record<IntelligenceRisk, string>>,
  quality: {
    ar: { STRONG_EVIDENCE: 'أدلة قوية', MODERATE_EVIDENCE: 'أدلة متوسطة', LIMITED_EVIDENCE: 'أدلة محدودة', INSUFFICIENT_EVIDENCE: 'أدلة غير كافية' },
    en: { STRONG_EVIDENCE: 'Strong evidence', MODERATE_EVIDENCE: 'Moderate evidence', LIMITED_EVIDENCE: 'Limited evidence', INSUFFICIENT_EVIDENCE: 'Insufficient evidence' },
    fr: { STRONG_EVIDENCE: 'Preuves solides', MODERATE_EVIDENCE: 'Preuves modérées', LIMITED_EVIDENCE: 'Preuves limitées', INSUFFICIENT_EVIDENCE: 'Preuves insuffisantes' },
  } satisfies Record<Locale, Record<ConfidenceQuality, string>>,
};

const REASONS: Record<Locale, Record<string, string>> = {
  ar: { SCORE_WITHIN_WAIT_BAND: 'النتيجة الموزونة داخل نطاق الانتظار.', RISK_EVIDENCE_UNAVAILABLE: 'لا تتوفر أدلة مخاطر كافية.', MINIMUM_EVIDENCE_NOT_MET: 'لم يتحقق الحد الأدنى للأدلة.', STRONG_SIGNALS_CONFLICT: 'الإشارات القوية متعارضة.', VERY_HIGH_RISK_PREVENTS_DIRECTIONAL_OUTPUT: 'المخاطر المرتفعة جداً تمنع قراءة اتجاهية.', DIRECTIONAL_CONFIDENCE_BELOW_THRESHOLD: 'الثقة أقل من الحد المطلوب للاتجاه.', WEIGHTED_SCORE_ABOVE_BUY_THRESHOLD: 'تجاوزت النتيجة الموزونة حد الشراء.', WEIGHTED_SCORE_BELOW_SELL_THRESHOLD: 'انخفضت النتيجة الموزونة دون حد البيع.', HIGH_RISK_BLOCKED_BUY: 'المخاطر المرتفعة منعت قراءة الشراء.' },
  en: { SCORE_WITHIN_WAIT_BAND: 'The weighted score is inside the wait band.', RISK_EVIDENCE_UNAVAILABLE: 'Required risk evidence is unavailable.', MINIMUM_EVIDENCE_NOT_MET: 'Minimum evidence requirements were not met.', STRONG_SIGNALS_CONFLICT: 'Strong signals conflict.', VERY_HIGH_RISK_PREVENTS_DIRECTIONAL_OUTPUT: 'Very high risk prevents directional output.', DIRECTIONAL_CONFIDENCE_BELOW_THRESHOLD: 'Confidence is below the directional threshold.', WEIGHTED_SCORE_ABOVE_BUY_THRESHOLD: 'The weighted score cleared the buy threshold.', WEIGHTED_SCORE_BELOW_SELL_THRESHOLD: 'The weighted score fell below the sell threshold.', HIGH_RISK_BLOCKED_BUY: 'High risk blocked a buy reading.' },
  fr: { SCORE_WITHIN_WAIT_BAND: 'Le score pondéré se situe dans la zone d’attente.', RISK_EVIDENCE_UNAVAILABLE: 'Les preuves de risque requises sont indisponibles.', MINIMUM_EVIDENCE_NOT_MET: 'Le minimum de preuves n’est pas atteint.', STRONG_SIGNALS_CONFLICT: 'Des signaux forts sont contradictoires.', VERY_HIGH_RISK_PREVENTS_DIRECTIONAL_OUTPUT: 'Un risque très élevé empêche une lecture directionnelle.', DIRECTIONAL_CONFIDENCE_BELOW_THRESHOLD: 'La confiance est sous le seuil directionnel.', WEIGHTED_SCORE_ABOVE_BUY_THRESHOLD: 'Le score pondéré dépasse le seuil d’achat.', WEIGHTED_SCORE_BELOW_SELL_THRESHOLD: 'Le score pondéré est sous le seuil de vente.', HIGH_RISK_BLOCKED_BUY: 'Un risque élevé a bloqué la lecture d’achat.' },
};

const STATE_LABELS: Record<Locale, Record<FactorAvailability | DirectionalBias | AnalysisResult['freshness']['state'], string>> = {
  ar: { AVAILABLE: 'متاح', PARTIAL: 'جزئي', UNAVAILABLE: 'غير متاح', BULLISH: 'إيجابي', BEARISH: 'سلبي', NEUTRAL: 'محايد', MIXED: 'مختلط', FRESH: 'حديث', DELAYED: 'متأخر', STALE: 'قديم' },
  en: { AVAILABLE: 'Available', PARTIAL: 'Partial', UNAVAILABLE: 'Unavailable', BULLISH: 'Bullish', BEARISH: 'Bearish', NEUTRAL: 'Neutral', MIXED: 'Mixed', FRESH: 'Fresh', DELAYED: 'Delayed', STALE: 'Stale' },
  fr: { AVAILABLE: 'Disponible', PARTIAL: 'Partiel', UNAVAILABLE: 'Indisponible', BULLISH: 'Haussier', BEARISH: 'Baissier', NEUTRAL: 'Neutre', MIXED: 'Mixte', FRESH: 'À jour', DELAYED: 'Retardé', STALE: 'Ancien' },
};

function localeOf(value: string): Locale {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function number(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function timestamp(value: string | null, locale: Locale, unavailable: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return unavailable;
  const localeTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB';
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function evidenceValue(value: string | number | boolean | null, unit: string | null, unavailable: string) {
  if (value === null) return unavailable;
  const rendered = typeof value === 'number' ? number(value) : typeof value === 'boolean' ? String(value) : value;
  return `${rendered}${unit ? ` ${unit}` : ''}`;
}

function errorMessage(code: string | null, copy: typeof COPY[Locale]) {
  if (code === 'UNSUPPORTED_ASSET' || code === 'INVALID_ASSET') return copy.unsupported;
  if (code === 'PROVIDER_UNAVAILABLE' || code === 'PROVIDER_TIMEOUT') return copy.providerUnavailable;
  return copy.error;
}

type IntelligencePanelProps = {
  result: AnalysisResult | null;
  loading: boolean;
  errorCode: string | null;
  onRetry: () => void;
  emptyMessage?: string;
  /** Lets the consolidated Analyst workspace render one status panel above the ledger. */
  showStatus?: boolean;
};

export function IntelligenceStatusPanel({ result, loading, errorCode, onRetry, emptyMessage }: Omit<IntelligencePanelProps, 'showStatus'>) {
  const { lang, dir } = useLanguage();
  const locale = localeOf(lang);
  const copy = COPY[locale];
  const statusCopy = STATUS_COPY[locale];

  if (loading) {
    return (
      <section className={`${styles.panel} ${styles.unifiedStatus}`} dir={dir} aria-live="polite" aria-busy="true" data-testid="intelligence-status-panel">
        <div className={styles.state}><BrainCircuit aria-hidden="true" /><span>{copy.loading}</span></div>
      </section>
    );
  }
  if (errorCode || !result) {
    return (
      <section className={`${styles.panel} ${styles.unifiedStatus}`} dir={dir} role="alert" data-testid="intelligence-status-panel">
        <div className={styles.state}>
          <AlertTriangle aria-hidden="true" />
          <span>{errorCode ? errorMessage(errorCode, copy) : (emptyMessage ?? copy.error)}</span>
          <button type="button" onClick={onRetry}><RefreshCw aria-hidden="true" />{copy.retry}</button>
        </div>
      </section>
    );
  }

  const entries: Array<{ key: string; tone: 'warning' | 'info'; text: string }> = [];
  if (result.staleData) entries.push({ key: 'stale', tone: 'warning', text: copy.stale });
  if (result.status === 'PARTIAL') entries.push({ key: 'partial', tone: 'info', text: copy.partial });
  if (result.recommendation === 'INSUFFICIENT_DATA') entries.push({ key: 'insufficient', tone: 'warning', text: copy.insufficient });
  if (result.conflictStatus !== 'NONE') entries.push({ key: 'conflict', tone: 'warning', text: copy.conflict });
  if (!result.providerProvenance.selectedProvider) entries.push({ key: 'provider', tone: 'warning', text: copy.providerUnavailable });
  result.factors
    .filter(factor => factor.availability === 'UNAVAILABLE')
    .forEach(factor => entries.push({
      key: `factor-${factor.factor}`,
      tone: 'info',
      text: `${FACTORS[locale][factor.factor]}: ${statusCopy.factorUnavailable}`,
    }));

  return (
    <section className={`${styles.panel} ${styles.unifiedStatus}`} dir={dir} aria-labelledby="intelligence-status-title" data-testid="intelligence-status-panel">
      <header className={styles.statusHeader}>
        <div>
          <span id="intelligence-status-title"><Database size={16} aria-hidden="true" />{statusCopy.title}</span>
          <small>{entries.length ? copy.subtitle : statusCopy.available}</small>
        </div>
        <span className={entries.length ? styles.statusDegraded : styles.statusAvailable}>
          {entries.length ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          {entries.length ? copy.partial : statusCopy.available}
        </span>
      </header>
      {entries.length ? (
        <ul className={styles.statusList}>
          {entries.map(entry => <li className={entry.tone === 'warning' ? styles.warning : styles.info} key={entry.key}>{entry.text}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export function IntelligencePanel({
  result,
  loading,
  errorCode,
  onRetry,
  showStatus = true,
}: IntelligencePanelProps) {
  const { lang, dir } = useLanguage();
  const locale = localeOf(lang);
  const copy = COPY[locale];

  if (loading && showStatus) {
    return (
      <section className={styles.panel} dir={dir} aria-live="polite" aria-busy="true">
        <div className={styles.state}><BrainCircuit aria-hidden="true" /><span>{copy.loading}</span></div>
      </section>
    );
  }
  if ((errorCode || !result) && showStatus) {
    return (
      <section className={styles.panel} dir={dir} role="alert">
        <div className={styles.state}>
          <AlertTriangle aria-hidden="true" />
          <span>{errorMessage(errorCode, copy)}</span>
          <button type="button" onClick={onRetry}><RefreshCw aria-hidden="true" />{copy.retry}</button>
        </div>
      </section>
    );
  }

  if (!result) return null;

  const recommendationTone = result.recommendation === 'BUY' ? styles.positive
    : result.recommendation === 'SELL' ? styles.negative
      : result.recommendation === 'INSUFFICIENT_DATA' ? styles.muted
        : styles.caution;
  const availableEvidence = (keys: IntelligenceFactorKey[]) => result.evidence
    .filter(item => keys.includes(item.factor))
    .sort((left, right) => right.significance - left.significance)
    .slice(0, 6);
  const supporting = availableEvidence(result.explanation.supportingFactors);
  const opposing = availableEvidence(result.explanation.opposingFactors);
  const unavailableFactors = result.factors.filter(factor => factor.availability === 'UNAVAILABLE');
  const previousReason = result.previousAnalysis?.changeReasonCode === 'RECOMMENDATION_CHANGED' ? copy.changed
    : result.previousAnalysis?.changeReasonCode === 'CONFIDENCE_CHANGED' ? copy.confidenceChanged
      : copy.unchanged;

  return (
    <section className={styles.panel} dir={dir} aria-labelledby="intelligence-ledger-title">
      <header className={styles.header}>
        <div className={styles.identity}>
          <AssetIdentity
            variant="badge"
            symbol={result.asset.displaySymbol}
            name={result.asset.name}
            assetType={marketAssetTypeFromIntelligence(result.asset.assetType)}
            exchange={result.asset.exchange}
            market={result.asset.market}
            logoUrl={result.asset.logoUrl}
            size="sm"
          />
          <div className={styles.title}>
            <span><BrainCircuit size={16} aria-hidden="true" />{copy.title}</span>
            <small id="intelligence-ledger-title">{copy.subtitle}</small>
          </div>
        </div>
        <span className={`${styles.recommendation} ${recommendationTone}`}>
          <small>{copy.recommendation}</small>
          <strong>{ENUM_LABELS.recommendation[locale][result.recommendation]}</strong>
        </span>
      </header>

      <div className={styles.contextLine}>
        <span dir="ltr">{result.asset.displaySymbol}</span>
        <span>{result.asset.exchange ?? copy.unavailable}</span>
        <span dir="ltr">{result.asset.quoteCurrency ?? copy.unavailable}</span>
      </div>

      {showStatus ? <div className={styles.alerts}>
        {result.staleData ? <p className={styles.warning}><AlertTriangle aria-hidden="true" />{copy.stale}</p> : null}
        {result.status === 'PARTIAL' ? <p className={styles.info}><Database aria-hidden="true" />{copy.partial}</p> : null}
        {result.recommendation === 'INSUFFICIENT_DATA' ? <p className={styles.warning}><ShieldAlert aria-hidden="true" />{copy.insufficient}</p> : null}
        {result.conflictStatus !== 'NONE' ? <p className={styles.warning}><AlertTriangle aria-hidden="true" />{copy.conflict}</p> : null}
        {!result.providerProvenance.selectedProvider ? <p className={styles.warning}><Database aria-hidden="true" />{copy.providerUnavailable}</p> : null}
      </div> : null}

      <div className={styles.metrics}>
        <div><span>{copy.confidence}</span><strong dir="ltr">{number(result.confidence, 0)}%</strong><small>{copy.confidenceNote}</small></div>
        <div><span>{copy.quality}</span><strong>{ENUM_LABELS.quality[locale][result.confidenceQuality]}</strong></div>
        <div><span>{copy.risk}</span><strong>{ENUM_LABELS.risk[locale][result.risk]}</strong></div>
        <div><span>{copy.horizon}</span><strong dir="ltr">{result.horizon.replace('_', ' ')}</strong></div>
        <div><span>{copy.generated}</span><strong dir="ltr">{timestamp(result.generatedAt, locale, copy.unavailable)}</strong></div>
        <div><span>{copy.dataAsOf}</span><strong dir="ltr">{timestamp(result.dataAsOf, locale, copy.unavailable)}</strong></div>
      </div>

      <div className={styles.factorSection}>
        <div className={styles.sectionHeading}>
          <h3>{copy.factors}</h3>
          <span>{copy.freshness}: {STATE_LABELS[locale][result.freshness.state]}</span>
        </div>
        <div className={styles.factorGrid}>
          {result.factors.map(factor => (
            <article key={factor.factor} className={styles.factor}>
              <div><strong>{FACTORS[locale][factor.factor]}</strong><span>{STATE_LABELS[locale][factor.availability]}</span></div>
              <div className={styles.factorScore}>
                <b dir="ltr">{factor.normalizedScore === null ? '—' : `${factor.normalizedScore > 0 ? '+' : ''}${number(factor.normalizedScore, 0)}`}</b>
                <small>{STATE_LABELS[locale][factor.directionalBias]}</small>
              </div>
            </article>
          ))}
        </div>
      </div>

      <details className={styles.details}>
        <summary><span>{copy.explanation}</span><ChevronDown aria-hidden="true" /></summary>
        <div className={styles.detailsBody}>
          <section>
            <h4>{copy.reason}</h4>
            <p>{REASONS[locale][result.explanation.recommendationReasonCode] ?? copy.insufficient}</p>
          </section>
          <div className={styles.evidenceColumns}>
            {([
              [copy.supporting, supporting],
              [copy.opposing, opposing],
            ] as const).map(([heading, items]) => (
              <section key={heading}>
                <h4>{heading}</h4>
                {items.length ? (
                  <ul>{items.map(item => (
                    <li key={item.id}>
                      <span>{EVIDENCE_LABELS[locale][item.labelKey.replace('intelligence_evidence_', '')] ?? FACTORS[locale][item.factor]}</span>
                      <strong dir="ltr">{evidenceValue(item.value, item.unit, copy.unavailable)}</strong>
                    </li>
                  ))}</ul>
                ) : <p>{copy.noEvidence}</p>}
              </section>
            ))}
          </div>
          <section>
            <h4>{copy.limitations}</h4>
            <ul>
              {unavailableFactors.map(factor => <li key={factor.factor}>{FACTORS[locale][factor.factor]}: {copy.unavailable}</li>)}
              <li>{copy.targetsUnavailable}</li>
            </ul>
          </section>
          <section>
            <h4>{copy.invalidation}</h4>
            <ul>
              {result.explanation.invalidationConditions.map((condition, index) => (
                <li key={`${condition.code}:${condition.factor ?? index}`}>
                  {condition.factor ? `${FACTORS[locale][condition.factor]} — ` : ''}
                  {condition.code === 'FACTOR_REVERSAL'
                    ? (locale === 'ar' ? 'انعكاس العامل المؤثر.' : locale === 'fr' ? 'Renversement du facteur déterminant.' : 'Material factor reversal.')
                    : condition.code === 'DATA_STALENESS'
                      ? (locale === 'ar' ? 'تقادم البيانات.' : locale === 'fr' ? 'Vieillissement des données.' : 'Data becoming stale.')
                      : condition.code === 'RISK_ESCALATION'
                        ? (locale === 'ar' ? 'ارتفاع المخاطر.' : locale === 'fr' ? 'Hausse du risque.' : 'Risk escalation.')
                        : (locale === 'ar' ? 'تراجع موثوقية المزود.' : locale === 'fr' ? 'Dégradation du fournisseur.' : 'Provider degradation.')}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.provenance}>
            <h4>{copy.source}</h4>
            <p><b>{result.providerProvenance.selectedProvider ?? copy.unavailable}</b> · {copy.attempts}: <span dir="ltr">{number(result.providerProvenance.attempts.length, 0)}</span></p>
            <small dir="ltr">{result.engineVersion} · {result.weightingVersion} · {result.rulesVersion}</small>
          </section>
          <section>
            <h4>{copy.previous}</h4>
            {result.previousAnalysis ? (
              <p>{ENUM_LABELS.recommendation[locale][result.previousAnalysis.recommendation]} · <span dir="ltr">{number(result.previousAnalysis.confidence, 0)}%</span> — {previousReason}</p>
            ) : <p>{copy.noPrevious}</p>}
          </section>
        </div>
      </details>
    </section>
  );
}
