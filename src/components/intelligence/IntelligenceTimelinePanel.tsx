'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AlertTriangle, ChevronDown, Clock3, GitCompareArrows, History, RefreshCw } from 'lucide-react';
import type { AnalysisResult, IntelligenceFactorKey, IntelligenceRecommendation, IntelligenceRisk } from '@/domain/intelligence/contracts';
import type {
  IntelligenceAnalysisOutcome,
  IntelligenceDriftReasonCode,
  IntelligenceTimelineComparison,
  IntelligenceTimelineItem,
} from '@/domain/intelligence/outcomes';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './IntelligenceTimelinePanel.module.css';

type Locale = 'ar' | 'en' | 'fr';

type TimelineResponse = {
  ok?: boolean;
  timeline?: {
    items?: unknown;
    nextCursor?: unknown;
    comparison?: unknown;
  };
  error?: { code?: unknown };
};

const COPY = {
  ar: {
    title: 'مسار التحليل الذكي',
    subtitle: 'تغيّرات موثقة في القراءات السابقة؛ لا يتم احتساب نتيجة قبل اكتمال أفقها.',
    loading: 'جارٍ تحميل سجل التحليل…',
    loadingMore: 'جارٍ تحميل قراءات أقدم…',
    empty: 'لا توجد قراءات سابقة متاحة لهذا الأصل والأفق حتى الآن.',
    unavailable: 'تعذر تحميل سجل التحليل. لم تُعرض بيانات بديلة.',
    retry: 'إعادة المحاولة',
    loadMore: 'تحميل قراءات أقدم',
    choose: 'اختر قراءتين للمقارنة',
    selected: 'قراءات محددة',
    compare: 'مقارنة القراءتين',
    comparing: 'جارٍ إعداد المقارنة…',
    comparisonUnavailable: 'تعذر إعداد المقارنة المطلوبة. لم تُعرض نتيجة بديلة.',
    generated: 'وقت التحليل',
    confidence: 'ثقة التحليل',
    confidenceDelta: 'تغير الثقة',
    risk: 'المخاطر',
    freshness: 'الحداثة',
    change: 'أهم تغير',
    outcome: 'النتيجة',
    details: 'تفاصيل التغير والنتيجة',
    noPrevious: 'لا توجد قراءة سابقة للمقارنة.',
    factorChanges: 'تغير العوامل',
    warnings: 'تنبيهات البيانات',
    provenance: 'الإصدار والمصدر',
    entry: 'سعر المرجع عند البداية',
    final: 'سعر المرجع عند النهاية',
    directionalReturn: 'العائد الاتجاهي',
    mfe: 'أقصى حركة ملائمة',
    mae: 'أقصى حركة معاكسة',
    evaluationWindow: 'نافذة التقييم',
    evaluationMethod: 'منهج التقييم',
    evaluatedAt: 'وقت التقييم',
    notAvailable: 'غير متاح',
    pending: 'بانتظار اكتمال التقييم',
    comparisonTitle: 'مقارنة القراءتين المحددتين',
    from: 'من',
    to: 'إلى',
    recommendationTransition: 'تغير القراءة',
    riskTransition: 'تغير المخاطر',
    methodChange: 'تغير المنهج أو الإصدار',
    noMaterialChange: 'لا يوجد تغير جوهري موثق.',
    previous: 'السابقة',
    current: 'الحالية',
    selectedHint: 'يمكن اختيار قراءتين كحد أقصى. اضغط القراءة لتحديدها أو إلغاء تحديدها.',
    currentAnalysis: 'التحليل الحالي',
    screenReaderTimeline: 'سجل التحليلات السابقة',
  },
  en: {
    title: 'Intelligence timeline',
    subtitle: 'Verified changes across prior readings; an outcome is not evaluated before its horizon completes.',
    loading: 'Loading analysis history…',
    loadingMore: 'Loading earlier readings…',
    empty: 'No prior readings are available for this asset and horizon yet.',
    unavailable: 'The intelligence timeline could not be loaded. No replacement data was shown.',
    retry: 'Try again',
    loadMore: 'Load earlier readings',
    choose: 'Select two readings to compare',
    selected: 'Selected readings',
    compare: 'Compare selected readings',
    comparing: 'Preparing comparison…',
    comparisonUnavailable: 'The requested comparison could not be prepared. No replacement result was shown.',
    generated: 'Generated',
    confidence: 'Analysis confidence',
    confidenceDelta: 'Confidence change',
    risk: 'Risk',
    freshness: 'Freshness',
    change: 'Main change',
    outcome: 'Outcome',
    details: 'Change and outcome details',
    noPrevious: 'No prior reading is available for comparison.',
    factorChanges: 'Factor changes',
    warnings: 'Data warnings',
    provenance: 'Version and source',
    entry: 'Entry reference price',
    final: 'Final reference price',
    directionalReturn: 'Directional return',
    mfe: 'Maximum favourable excursion',
    mae: 'Maximum adverse excursion',
    evaluationWindow: 'Evaluation window',
    evaluationMethod: 'Evaluation methodology',
    evaluatedAt: 'Evaluated',
    notAvailable: 'Unavailable',
    pending: 'Awaiting evaluation',
    comparisonTitle: 'Selected reading comparison',
    from: 'From',
    to: 'To',
    recommendationTransition: 'Reading change',
    riskTransition: 'Risk change',
    methodChange: 'Methodology or version changed',
    noMaterialChange: 'No material documented change.',
    previous: 'Previous',
    current: 'Current',
    selectedHint: 'Choose up to two readings. Select a reading again to remove it.',
    currentAnalysis: 'Current analysis',
    screenReaderTimeline: 'Historical intelligence timeline',
  },
  fr: {
    title: 'Chronologie de l’intelligence',
    subtitle: 'Évolutions vérifiées des lectures antérieures ; aucun résultat n’est évalué avant la fin de son horizon.',
    loading: 'Chargement de l’historique des analyses…',
    loadingMore: 'Chargement des lectures antérieures…',
    empty: 'Aucune lecture antérieure n’est encore disponible pour cet actif et cet horizon.',
    unavailable: 'La chronologie de l’intelligence est indisponible. Aucune donnée de remplacement n’a été affichée.',
    retry: 'Réessayer',
    loadMore: 'Charger les lectures antérieures',
    choose: 'Sélectionnez deux lectures à comparer',
    selected: 'Lectures sélectionnées',
    compare: 'Comparer les lectures sélectionnées',
    comparing: 'Préparation de la comparaison…',
    comparisonUnavailable: 'La comparaison demandée n’a pas pu être préparée. Aucun résultat de remplacement n’a été affiché.',
    generated: 'Générée le',
    confidence: 'Confiance de l’analyse',
    confidenceDelta: 'Évolution de la confiance',
    risk: 'Risque',
    freshness: 'Fraîcheur',
    change: 'Évolution principale',
    outcome: 'Résultat',
    details: 'Détails de l’évolution et du résultat',
    noPrevious: 'Aucune lecture antérieure n’est disponible pour comparaison.',
    factorChanges: 'Évolutions des facteurs',
    warnings: 'Avertissements sur les données',
    provenance: 'Version et source',
    entry: 'Prix de référence initial',
    final: 'Prix de référence final',
    directionalReturn: 'Rendement directionnel',
    mfe: 'Excursion favorable maximale',
    mae: 'Excursion défavorable maximale',
    evaluationWindow: 'Fenêtre d’évaluation',
    evaluationMethod: 'Méthodologie d’évaluation',
    evaluatedAt: 'Évaluée le',
    notAvailable: 'Indisponible',
    pending: 'En attente de l’évaluation',
    comparisonTitle: 'Comparaison des lectures sélectionnées',
    from: 'De',
    to: 'À',
    recommendationTransition: 'Évolution de la lecture',
    riskTransition: 'Évolution du risque',
    methodChange: 'La méthodologie ou la version a changé',
    noMaterialChange: 'Aucun changement significatif documenté.',
    previous: 'Précédente',
    current: 'Actuelle',
    selectedHint: 'Sélectionnez au plus deux lectures. Sélectionnez à nouveau une lecture pour la retirer.',
    currentAnalysis: 'Analyse actuelle',
    screenReaderTimeline: 'Chronologie historique de l’intelligence',
  },
} as const;

type TimelineCopy = { [Key in keyof typeof COPY.en]: string };

const RECOMMENDATION_LABELS: Record<Locale, Record<IntelligenceRecommendation, string>> = {
  ar: { BUY: 'شراء', SELL: 'بيع', WAIT: 'انتظار', INSUFFICIENT_DATA: 'بيانات غير كافية' },
  en: { BUY: 'Buy', SELL: 'Sell', WAIT: 'Wait', INSUFFICIENT_DATA: 'Insufficient data' },
  fr: { BUY: 'Acheter', SELL: 'Vendre', WAIT: 'Attendre', INSUFFICIENT_DATA: 'Données insuffisantes' },
};

const RISK_LABELS: Record<Locale, Record<IntelligenceRisk, string>> = {
  ar: { LOW: 'منخفضة', MEDIUM: 'متوسطة', HIGH: 'مرتفعة', VERY_HIGH: 'مرتفعة جداً', UNAVAILABLE: 'غير متاح' },
  en: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', VERY_HIGH: 'Very high', UNAVAILABLE: 'Unavailable' },
  fr: { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', VERY_HIGH: 'Très élevé', UNAVAILABLE: 'Indisponible' },
};

const FRESHNESS_LABELS: Record<Locale, Record<AnalysisResult['freshness']['state'], string>> = {
  ar: { FRESH: 'حديث', DELAYED: 'متأخر', STALE: 'قديم', UNAVAILABLE: 'غير متاح' },
  en: { FRESH: 'Fresh', DELAYED: 'Delayed', STALE: 'Stale', UNAVAILABLE: 'Unavailable' },
  fr: { FRESH: 'À jour', DELAYED: 'Retardé', STALE: 'Ancien', UNAVAILABLE: 'Indisponible' },
};

const OUTCOME_STATUS_LABELS: Record<Locale, Record<IntelligenceAnalysisOutcome['evaluationStatus'], string>> = {
  ar: { PENDING: 'بانتظار التقييم', EVALUATED: 'تم التقييم', INSUFFICIENT_DATA: 'بيانات غير كافية للتقييم', INVALIDATED: 'تم إبطال التقييم', FAILED: 'فشل التقييم' },
  en: { PENDING: 'Awaiting evaluation', EVALUATED: 'Evaluated', INSUFFICIENT_DATA: 'Insufficient evaluation data', INVALIDATED: 'Invalidated', FAILED: 'Evaluation failed' },
  fr: { PENDING: 'En attente de l’évaluation', EVALUATED: 'Évaluée', INSUFFICIENT_DATA: 'Données d’évaluation insuffisantes', INVALIDATED: 'Invalidée', FAILED: 'Évaluation échouée' },
};

const DIRECTIONAL_OUTCOME_LABELS: Record<Locale, Record<IntelligenceAnalysisOutcome['outcome'], string>> = {
  ar: { CORRECT: 'اتجاه صحيح', INCORRECT: 'اتجاه غير صحيح', NEUTRAL: 'محايد', NOT_APPLICABLE: 'لا ينطبق' },
  en: { CORRECT: 'Direction correct', INCORRECT: 'Direction incorrect', NEUTRAL: 'Neutral', NOT_APPLICABLE: 'Not applicable' },
  fr: { CORRECT: 'Direction correcte', INCORRECT: 'Direction incorrecte', NEUTRAL: 'Neutre', NOT_APPLICABLE: 'Non applicable' },
};

const FACTOR_LABELS: Record<Locale, Record<IntelligenceFactorKey, string>> = {
  ar: { TECHNICAL: 'فني', FUNDAMENTAL: 'أساسي', SENTIMENT: 'المعنويات', NEWS: 'الأخبار', MACRO: 'الاقتصاد الكلي', MOMENTUM: 'الزخم', LIQUIDITY: 'السيولة', VOLATILITY: 'التذبذب', RISK: 'المخاطر', SHARIA: 'الحالة الشرعية' },
  en: { TECHNICAL: 'Technical', FUNDAMENTAL: 'Fundamental', SENTIMENT: 'Sentiment', NEWS: 'News', MACRO: 'Macro', MOMENTUM: 'Momentum', LIQUIDITY: 'Liquidity', VOLATILITY: 'Volatility', RISK: 'Risk', SHARIA: 'Sharia status' },
  fr: { TECHNICAL: 'Technique', FUNDAMENTAL: 'Fondamental', SENTIMENT: 'Sentiment', NEWS: 'Actualités', MACRO: 'Macro', MOMENTUM: 'Momentum', LIQUIDITY: 'Liquidité', VOLATILITY: 'Volatilité', RISK: 'Risque', SHARIA: 'Statut charia' },
};

const DRIFT_REASON_LABELS: Record<Locale, Record<IntelligenceDriftReasonCode, string>> = {
  ar: {
    TECHNICAL_WEAKENED: 'ضعفت الإشارات الفنية', TECHNICAL_STRENGTHENED: 'تعززت الإشارات الفنية', FUNDAMENTAL_WEAKENED: 'ضعفت العوامل الأساسية', FUNDAMENTAL_STRENGTHENED: 'تعززت العوامل الأساسية', MOMENTUM_WEAKENED: 'ضعف الزخم', MOMENTUM_STRENGTHENED: 'تعزز الزخم', VOLATILITY_INCREASED: 'زاد التذبذب', VOLATILITY_DECREASED: 'انخفض التذبذب', DATA_BECAME_STALE: 'أصبحت البيانات قديمة', COVERAGE_DECREASED: 'انخفضت التغطية', COVERAGE_INCREASED: 'زادت التغطية', PROVIDER_DISAGREEMENT_INCREASED: 'زاد اختلاف المزودين', RISK_INCREASED: 'زادت المخاطر', RISK_DECREASED: 'انخفضت المخاطر', PROVIDER_CHANGED: 'تغير المزود', RECOMMENDATION_CHANGED: 'تغيرت القراءة', METHODOLOGY_VERSION_CHANGED: 'تغير إصدار المنهج', NO_MATERIAL_CHANGE: 'لا يوجد تغير جوهري', NO_PREVIOUS_ANALYSIS: 'لا توجد قراءة سابقة',
  },
  en: {
    TECHNICAL_WEAKENED: 'Technical signals weakened', TECHNICAL_STRENGTHENED: 'Technical signals strengthened', FUNDAMENTAL_WEAKENED: 'Fundamental factors weakened', FUNDAMENTAL_STRENGTHENED: 'Fundamental factors strengthened', MOMENTUM_WEAKENED: 'Momentum weakened', MOMENTUM_STRENGTHENED: 'Momentum strengthened', VOLATILITY_INCREASED: 'Volatility increased', VOLATILITY_DECREASED: 'Volatility decreased', DATA_BECAME_STALE: 'Data became stale', COVERAGE_DECREASED: 'Coverage decreased', COVERAGE_INCREASED: 'Coverage increased', PROVIDER_DISAGREEMENT_INCREASED: 'Provider disagreement increased', RISK_INCREASED: 'Risk increased', RISK_DECREASED: 'Risk decreased', PROVIDER_CHANGED: 'Provider changed', RECOMMENDATION_CHANGED: 'Reading changed', METHODOLOGY_VERSION_CHANGED: 'Methodology version changed', NO_MATERIAL_CHANGE: 'No material change', NO_PREVIOUS_ANALYSIS: 'No previous analysis',
  },
  fr: {
    TECHNICAL_WEAKENED: 'Les signaux techniques se sont affaiblis', TECHNICAL_STRENGTHENED: 'Les signaux techniques se sont renforcés', FUNDAMENTAL_WEAKENED: 'Les facteurs fondamentaux se sont affaiblis', FUNDAMENTAL_STRENGTHENED: 'Les facteurs fondamentaux se sont renforcés', MOMENTUM_WEAKENED: 'Le momentum a faibli', MOMENTUM_STRENGTHENED: 'Le momentum s’est renforcé', VOLATILITY_INCREASED: 'La volatilité a augmenté', VOLATILITY_DECREASED: 'La volatilité a diminué', DATA_BECAME_STALE: 'Les données sont devenues anciennes', COVERAGE_DECREASED: 'La couverture a diminué', COVERAGE_INCREASED: 'La couverture a augmenté', PROVIDER_DISAGREEMENT_INCREASED: 'Le désaccord entre fournisseurs a augmenté', RISK_INCREASED: 'Le risque a augmenté', RISK_DECREASED: 'Le risque a diminué', PROVIDER_CHANGED: 'Le fournisseur a changé', RECOMMENDATION_CHANGED: 'La lecture a changé', METHODOLOGY_VERSION_CHANGED: 'La version de méthodologie a changé', NO_MATERIAL_CHANGE: 'Aucun changement significatif', NO_PREVIOUS_ANALYSIS: 'Aucune analyse antérieure',
  },
};

function localeOf(language: string): Locale {
  return language === 'en' || language === 'fr' ? language : 'ar';
}

function number(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function timestamp(value: string | null, locale: Locale, unavailable: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return unavailable;
  const localeTag = locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR-u-nu-latn' : 'en-GB-u-nu-latn';
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date(value));
}

function signedPercent(value: number | null, unavailable: string) {
  if (value === null || !Number.isFinite(value)) return unavailable;
  return `${value >= 0 ? '+' : ''}${number(value, 2)}%`;
}

function price(value: number | null, currency: string | null, unavailable: string) {
  if (value === null || !Number.isFinite(value)) return unavailable;
  return `${number(value, 4)}${currency ? ` ${currency}` : ''}`;
}

function transition<T extends string>(from: T | null, to: T, labels: Record<T, string>, unavailable: string) {
  return `${from ? labels[from] : unavailable} → ${labels[to]}`;
}

function outcomeLabel(outcome: IntelligenceAnalysisOutcome | null, locale: Locale, copy: TimelineCopy) {
  if (!outcome) return copy.pending;
  const status = OUTCOME_STATUS_LABELS[locale][outcome.evaluationStatus];
  if (outcome.evaluationStatus !== 'EVALUATED') return status;
  return `${status} · ${DIRECTIONAL_OUTCOME_LABELS[locale][outcome.outcome]}`;
}

function itemTone(item: IntelligenceTimelineItem) {
  if (item.recommendation === 'BUY') return styles.buy;
  if (item.recommendation === 'SELL') return styles.sell;
  if (item.recommendation === 'INSUFFICIENT_DATA') return styles.muted;
  return styles.wait;
}

function outcomeTone(outcome: IntelligenceAnalysisOutcome | null) {
  if (!outcome || outcome.evaluationStatus === 'PENDING') return styles.pending;
  if (outcome.evaluationStatus === 'EVALUATED' && outcome.outcome === 'CORRECT') return styles.success;
  if (outcome.evaluationStatus === 'EVALUATED' && outcome.outcome === 'INCORRECT') return styles.negative;
  if (outcome.evaluationStatus === 'EVALUATED') return styles.neutral;
  return styles.warning;
}

function isTimelineItem(value: unknown): value is IntelligenceTimelineItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<IntelligenceTimelineItem>;
  return typeof item.analysisId === 'string'
    && typeof item.generatedAt === 'string'
    && typeof item.confidence === 'number'
    && typeof item.recommendation === 'string'
    && typeof item.risk === 'string'
    && Boolean(item.asset)
    && Boolean(item.drift);
}

function isComparison(value: unknown): value is IntelligenceTimelineComparison {
  if (!value || typeof value !== 'object') return false;
  const comparison = value as Partial<IntelligenceTimelineComparison>;
  return isTimelineItem(comparison.left) && isTimelineItem(comparison.right) && Boolean(comparison.drift);
}

function uniqueItems(items: IntelligenceTimelineItem[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.analysisId)) return false;
    seen.add(item.analysisId);
    return true;
  });
}

type IntelligenceTimelinePanelProps = {
  asset: Pick<AnalysisResult['asset'], 'canonicalSymbol' | 'assetType'>;
  horizon: AnalysisResult['horizon'];
  activeAnalysisId: string | null;
};

export function IntelligenceTimelinePanel({ asset, horizon, activeAnalysisId }: IntelligenceTimelinePanelProps) {
  const { dir, lang } = useLanguage();
  const locale = localeOf(lang);
  const copy = COPY[locale];
  const timelineId = useId();
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [items, setItems] = useState<IntelligenceTimelineItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<IntelligenceTimelineComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(false);

  const baseSearch = useMemo(() => {
    const params = new URLSearchParams({
      symbol: asset.canonicalSymbol,
      assetType: asset.assetType,
      horizon,
      limit: '10',
    });
    return params;
  }, [asset.assetType, asset.canonicalSymbol, horizon]);

  const requestTimeline = useCallback(async (params: URLSearchParams, signal?: AbortSignal) => {
    const response = await fetch(`/api/intelligence/timeline?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal,
    });
    const payload = await response.json().catch(() => ({})) as TimelineResponse;
    if (!response.ok || payload.ok !== true || !payload.timeline) throw new Error('TIMELINE_UNAVAILABLE');
    return payload.timeline;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(false);
    setItems([]);
    setNextCursor(null);
    setSelectedIds([]);
    setComparison(null);
    setComparisonError(false);

    void requestTimeline(new URLSearchParams(baseSearch), controller.signal)
      .then(timeline => {
        if (!active) return;
        setItems(uniqueItems(Array.isArray(timeline.items) ? timeline.items.filter(isTimelineItem) : []));
        setNextCursor(typeof timeline.nextCursor === 'string' && timeline.nextCursor ? timeline.nextCursor : null);
      })
      .catch(requestError => {
        if (!active || (requestError instanceof DOMException && requestError.name === 'AbortError')) return;
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [baseSearch, reloadToken, requestTimeline]);

  useEffect(() => {
    setSelectedIds(current => current.filter(id => items.some(item => item.analysisId === id)).slice(0, 2));
  }, [items]);

  const selectItem = useCallback((analysisId: string) => {
    setSelectedIds(current => {
      if (current.includes(analysisId)) return current.filter(id => id !== analysisId);
      if (current.length < 2) return [...current, analysisId];
      return [current[1]!, analysisId];
    });
    setComparison(null);
    setComparisonError(false);
  }, []);

  const handleRowKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const move = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1
        : 0;
    if (!move || !rowRefs.current.length) return;
    event.preventDefault();
    const target = (index + move + rowRefs.current.length) % rowRefs.current.length;
    rowRefs.current[target]?.focus();
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams(baseSearch);
      params.set('cursor', nextCursor);
      const timeline = await requestTimeline(params);
      const nextItems = Array.isArray(timeline.items) ? timeline.items.filter(isTimelineItem) : [];
      setItems(current => uniqueItems([...current, ...nextItems]));
      setNextCursor(typeof timeline.nextCursor === 'string' && timeline.nextCursor ? timeline.nextCursor : null);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [baseSearch, loadingMore, nextCursor, requestTimeline]);

  const compareSelected = useCallback(async () => {
    if (selectedIds.length !== 2) return;
    setComparisonLoading(true);
    setComparisonError(false);
    setComparison(null);
    try {
      const params = new URLSearchParams(baseSearch);
      params.set('analysisId', selectedIds[0]!);
      params.set('compareAnalysisId', selectedIds[1]!);
      const timeline = await requestTimeline(params);
      if (!isComparison(timeline.comparison)) throw new Error('COMPARISON_UNAVAILABLE');
      setComparison(timeline.comparison);
    } catch {
      setComparisonError(true);
    } finally {
      setComparisonLoading(false);
    }
  }, [baseSearch, requestTimeline, selectedIds]);

  if (loading) {
    return (
      <section className={styles.panel} dir={dir} aria-labelledby={`${timelineId}-title`} data-testid="intelligence-timeline">
        <div className={styles.state} role="status" aria-live="polite">
          <History aria-hidden="true" />
          <span id={`${timelineId}-title`}>{copy.loading}</span>
        </div>
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <section className={styles.panel} dir={dir} aria-labelledby={`${timelineId}-title`} data-testid="intelligence-timeline">
        <div className={styles.state} role="alert">
          <AlertTriangle aria-hidden="true" />
          <span id={`${timelineId}-title`}>{copy.unavailable}</span>
          <button type="button" onClick={() => setReloadToken(value => value + 1)}>
            <RefreshCw aria-hidden="true" />{copy.retry}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel} dir={dir} aria-labelledby={`${timelineId}-title`} data-testid="intelligence-timeline">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><History size={16} aria-hidden="true" />{copy.title}</span>
          <h2 id={`${timelineId}-title`}>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <span className={styles.horizon} dir="ltr">{horizon.replace('_', ' ')}</span>
      </header>

      {items.length === 0 ? (
        <div className={styles.state}>
          <Clock3 aria-hidden="true" />
          <span>{copy.empty}</span>
        </div>
      ) : (
        <>
          <div className={styles.selectionBar}>
            <div>
              <strong>{selectedIds.length === 2 ? copy.selected : copy.choose}</strong>
              <span>{copy.selectedHint}</span>
            </div>
            <button
              type="button"
              className={styles.compareButton}
              disabled={selectedIds.length !== 2 || comparisonLoading}
              onClick={() => void compareSelected()}
              aria-controls={`${timelineId}-comparison`}
            >
              <GitCompareArrows aria-hidden="true" />
              {comparisonLoading ? copy.comparing : copy.compare}
            </button>
          </div>

          <div className={styles.timeline} role="listbox" aria-label={copy.screenReaderTimeline} aria-multiselectable="true">
            {items.map((item, index) => {
              const selected = selectedIds.includes(item.analysisId);
              const active = item.analysisId === activeAnalysisId;
              return (
                <article key={item.analysisId} className={`${styles.item} ${selected ? styles.itemSelected : ''}`}>
                  <button
                    ref={element => { rowRefs.current[index] = element; }}
                    type="button"
                    className={styles.itemButton}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectItem(item.analysisId)}
                    onKeyDown={event => handleRowKeyDown(event, index)}
                  >
                    <span className={styles.marker} aria-hidden="true" />
                    <span className={styles.itemTopline}>
                      <time dateTime={item.generatedAt} dir="ltr">{timestamp(item.generatedAt, locale, copy.notAvailable)}</time>
                      {active ? <em>{copy.currentAnalysis}</em> : null}
                      <span className={`${styles.recommendation} ${itemTone(item)}`}>{RECOMMENDATION_LABELS[locale][item.recommendation]}</span>
                    </span>
                    <span className={styles.itemMetrics}>
                      <span><small>{copy.confidence}</small><b dir="ltr">{number(item.confidence)}%</b></span>
                      <span><small>{copy.confidenceDelta}</small><b dir="ltr">{item.drift.confidenceDelta === null ? '—' : signedPercent(item.drift.confidenceDelta, '—')}</b></span>
                      <span><small>{copy.risk}</small><b>{RISK_LABELS[locale][item.risk]}</b></span>
                      <span><small>{copy.freshness}</small><b>{FRESHNESS_LABELS[locale][item.freshness]}</b></span>
                    </span>
                    <span className={styles.itemFooter}>
                      <span><small>{copy.change}</small><b>{DRIFT_REASON_LABELS[locale][item.drift.primaryReasonCode]}</b></span>
                      <span className={`${styles.outcome} ${outcomeTone(item.outcome)}`}><small>{copy.outcome}</small><b>{outcomeLabel(item.outcome, locale, copy)}</b></span>
                    </span>
                  </button>
                  <details className={styles.details}>
                    <summary>{copy.details}<ChevronDown aria-hidden="true" /></summary>
                    <TimelineItemDetails item={item} locale={locale} copy={copy} />
                  </details>
                </article>
              );
            })}
          </div>

          {error ? <p className={styles.inlineError} role="status"><AlertTriangle aria-hidden="true" />{copy.unavailable}</p> : null}
          {nextCursor ? (
            <div className={styles.loadMore}>
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore}>
                <History aria-hidden="true" />{loadingMore ? copy.loadingMore : copy.loadMore}
              </button>
            </div>
          ) : null}
        </>
      )}

      {comparisonError ? <p id={`${timelineId}-comparison`} className={styles.comparisonError} role="alert"><AlertTriangle aria-hidden="true" />{copy.comparisonUnavailable}</p> : null}
      {comparison ? <TimelineComparison comparison={comparison} locale={locale} copy={copy} id={`${timelineId}-comparison`} /> : null}
    </section>
  );
}

function TimelineItemDetails({ item, locale, copy }: { item: IntelligenceTimelineItem; locale: Locale; copy: TimelineCopy }) {
  const outcome = item.outcome;
  const factorChanges = item.drift.factorDeltas.filter(delta => delta.scoreDelta !== null || delta.previousAvailability !== delta.currentAvailability);
  const warningCodes = [...item.warnings.map(warning => warning.code), ...(outcome?.warnings.map(warning => warning.code) ?? [])];

  return (
    <div className={styles.detailsBody}>
      <section>
        <h3>{copy.change}</h3>
        {item.drift.primaryReasonCode === 'NO_PREVIOUS_ANALYSIS' ? <p>{copy.noPrevious}</p> : (
          <ul className={styles.reasonList}>
            {item.drift.reasonCodes.map(reason => <li key={reason}>{DRIFT_REASON_LABELS[locale][reason]}</li>)}
          </ul>
        )}
      </section>

      <section>
        <h3>{copy.factorChanges}</h3>
        {factorChanges.length ? (
          <ul className={styles.factorList}>
            {factorChanges.map(delta => (
              <li key={delta.factor}>
                <span>{FACTOR_LABELS[locale][delta.factor]}</span>
                <b dir="ltr">{delta.scoreDelta === null ? '—' : signedPercent(delta.scoreDelta, '—')}</b>
              </li>
            ))}
          </ul>
        ) : <p>{copy.noMaterialChange}</p>}
      </section>

      <section className={styles.outcomeDetails}>
        <h3>{copy.outcome}</h3>
        {!outcome ? <p>{copy.pending}</p> : (
          <dl>
            <div><dt>{copy.outcome}</dt><dd>{outcomeLabel(outcome, locale, copy)}</dd></div>
            <div><dt>{copy.evaluationWindow}</dt><dd dir="ltr">{timestamp(outcome.evaluationWindow.startAt, locale, copy.notAvailable)} → {timestamp(outcome.evaluationWindow.endAt, locale, copy.notAvailable)}</dd></div>
            <div><dt>{copy.evaluationMethod}</dt><dd dir="ltr">{outcome.methodologyVersion}</dd></div>
            <div><dt>{copy.evaluatedAt}</dt><dd dir="ltr">{timestamp(outcome.evaluatedAt, locale, copy.notAvailable)}</dd></div>
            {outcome.evaluationStatus === 'EVALUATED' ? (
              <>
                <div><dt>{copy.entry}</dt><dd dir="ltr">{price(outcome.entryReferencePrice, outcome.entryCurrency, copy.notAvailable)}</dd></div>
                <div><dt>{copy.final}</dt><dd dir="ltr">{price(outcome.finalReferencePrice, outcome.finalCurrency, copy.notAvailable)}</dd></div>
                <div><dt>{copy.directionalReturn}</dt><dd dir="ltr">{signedPercent(outcome.directionalReturn, copy.notAvailable)}</dd></div>
                <div><dt>{copy.mfe}</dt><dd dir="ltr">{signedPercent(outcome.maximumFavorableExcursion, copy.notAvailable)}</dd></div>
                <div><dt>{copy.mae}</dt><dd dir="ltr">{signedPercent(outcome.maximumAdverseExcursion, copy.notAvailable)}</dd></div>
              </>
            ) : null}
          </dl>
        )}
      </section>

      {warningCodes.length ? (
        <section>
          <h3>{copy.warnings}</h3>
          <ul className={styles.codeList}>{warningCodes.map((code, index) => <li key={`${code}:${index}`} dir="ltr">{code}</li>)}</ul>
        </section>
      ) : null}

      <section className={styles.provenance}>
        <h3>{copy.provenance}</h3>
        <p dir="ltr">{item.versions.engineVersion} · {item.versions.weightingVersion} · {item.versions.rulesVersion}</p>
        <small dir="ltr">{item.provider.selectedProvider ?? copy.notAvailable}</small>
      </section>
    </div>
  );
}

function TimelineComparison({ comparison, locale, copy, id }: { comparison: IntelligenceTimelineComparison; locale: Locale; copy: TimelineCopy; id: string }) {
  const drift = comparison.drift;
  return (
    <details id={id} className={styles.comparison} open>
      <summary><span><GitCompareArrows aria-hidden="true" />{copy.comparisonTitle}</span><ChevronDown aria-hidden="true" /></summary>
      <div className={styles.comparisonBody}>
        <div className={styles.comparisonReadings}>
          <ComparisonReading label={copy.from} item={comparison.left} locale={locale} />
          <ComparisonReading label={copy.to} item={comparison.right} locale={locale} />
        </div>
        <dl className={styles.comparisonMetrics}>
          <div><dt>{copy.confidenceDelta}</dt><dd dir="ltr">{drift.confidenceDelta === null ? '—' : signedPercent(drift.confidenceDelta, '—')}</dd></div>
          <div><dt>{copy.recommendationTransition}</dt><dd>{transition(drift.recommendationTransition.from, drift.recommendationTransition.to, RECOMMENDATION_LABELS[locale], copy.notAvailable)}</dd></div>
          <div><dt>{copy.riskTransition}</dt><dd>{transition(drift.riskTransition.from, drift.riskTransition.to, RISK_LABELS[locale], copy.notAvailable)}</dd></div>
          {drift.methodologyChanged ? <div><dt>{copy.methodChange}</dt><dd>{DRIFT_REASON_LABELS[locale].METHODOLOGY_VERSION_CHANGED}</dd></div> : null}
        </dl>
        <ul className={styles.reasonList}>
          {drift.reasonCodes.map(reason => <li key={reason}>{DRIFT_REASON_LABELS[locale][reason]}</li>)}
        </ul>
      </div>
    </details>
  );
}

function ComparisonReading({ label, item, locale }: { label: string; item: IntelligenceTimelineItem; locale: Locale }) {
  return (
    <section>
      <small>{label}</small>
      <strong>{RECOMMENDATION_LABELS[locale][item.recommendation]}</strong>
      <span dir="ltr">{timestamp(item.generatedAt, locale, '—')}</span>
    </section>
  );
}
