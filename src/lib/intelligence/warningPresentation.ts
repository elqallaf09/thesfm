import type { IntelligenceFactorKey } from '@/domain/intelligence/contracts';

type Locale = 'ar' | 'en' | 'fr';
type Warning = { code: string; factor?: IntelligenceFactorKey | null };
const MESSAGES: Record<string, [string, string, string]> = {
  STALE_FACTOR_DATA: ['بيانات بعض العوامل تجاوزت حد الحداثة.', 'Some factor observations exceed their freshness limit.', 'Certaines observations dépassent leur limite de fraîcheur.'],
  DELAYED_FACTOR_DATA: ['بعض بيانات العوامل متأخرة عن السوق.', 'Some factor observations are delayed.', 'Certaines observations sont retardées.'],
  SENTIMENT_PROVIDER_NOT_AVAILABLE: ['لا تتوفر عينة معنويات موثقة من المصدر.', 'No verified sentiment sample is available.', 'Aucun échantillon de sentiment vérifié n’est disponible.'],
  NEWS_NO_RELEVANT_RESULTS: ['لم يُرجع المصدر أخباراً حديثة مرتبطة بهذا الأصل.', 'The source returned no recent news relevant to this asset.', 'La source ne fournit aucune actualité récente liée à cet actif.'],
  MACRO_DIRECTION_UNCLEAR: ['المؤشرات الاقتصادية متاحة، لكنها لا تكفي لتحديد اتجاه تداول.', 'Economic observations are available but do not establish a trading direction.', 'Les observations économiques ne suffisent pas à établir une direction de trading.'],
  MACRO_RULE_BASED_CONTEXT: ['التأثير الاقتصادي تقدير وفق قواعد معلنة، وليس ضماناً للاتجاه.', 'Macro impact follows documented rules, not a guaranteed direction.', 'L’impact macro suit des règles documentées, sans garantie de direction.'],
  EXCESSIVE_VOLATILITY: ['تقلب السعر مرتفع ويزيد مخاطر القراءة.', 'High price volatility increases analysis risk.', 'La forte volatilité augmente le risque de l’analyse.'],
  VERIFIED_SHARIA_STATUS_UNAVAILABLE: ['لا تتوفر نتيجة شرعية موثقة؛ افتح البحث الشرعي لاستكمال الأدلة.', 'No verified Sharia result is available; open Sharia research to gather evidence.', 'Aucun résultat charia vérifié ; ouvrez la recherche pour compléter les preuves.'],
  ORIGINAL_ANALYSIS_HAD_INSUFFICIENT_EVIDENCE: ['القراءة الأصلية لم تتضمن أدلة كافية لتقييم توصية اتجاهية.', 'The original reading lacked evidence for directional evaluation.', 'La lecture initiale ne permettait pas d’évaluation directionnelle.'],
  WAIT_EXCLUDED_FROM_DIRECTIONAL_ACCURACY: ['قراءة الانتظار لا تدخل في قياس دقة الاتجاه.', 'Wait readings are excluded from directional accuracy.', 'Les lectures d’attente sont exclues de la précision directionnelle.'],
  ENTRY_REFERENCE_PRICE_UNAVAILABLE: ['لا يتوفر سعر موثق عند بداية نافذة التقييم.', 'No verified entry reference price is available.', 'Aucun prix initial vérifié n’est disponible.'],
  FINAL_REFERENCE_PRICE_UNAVAILABLE: ['لا يتوفر سعر موثق عند نهاية نافذة التقييم.', 'No verified final reference price is available.', 'Aucun prix final vérifié n’est disponible.'],
  HISTORICAL_PRICE_CURRENCY_MISMATCH: ['عملة سجل الأسعار لا تطابق عملة الأصل؛ لم يُحسب العائد.', 'History currency differs from the asset; no return was calculated.', 'La devise historique diffère de celle de l’actif ; aucun rendement calculé.'],
  HISTORICAL_PRICE_CURRENCY_UNAVAILABLE: ['عملة سجل الأسعار غير موثقة.', 'Historical price currency is not verified.', 'La devise des cours historiques n’est pas vérifiée.'],
  HISTORICAL_PRICE_CACHE_TOO_STALE: ['نسخة سجل الأسعار أقدم من الحد المسموح للتقييم.', 'Cached price history is too old for evaluation.', 'L’historique en cache est trop ancien pour l’évaluation.'],
  HISTORICAL_PRICE_HISTORY_NOT_COVERED: ['سجل الأسعار لا يغطي نافذة التقييم المطلوبة.', 'Price history does not cover the evaluation window.', 'L’historique ne couvre pas la fenêtre d’évaluation.'],
  HISTORICAL_PRICE_HISTORY_PERMANENTLY_UNAVAILABLE: ['المصدر لا يوفر سجل الأسعار المطلوب للتقييم.', 'The source does not supply the required price history.', 'La source ne fournit pas l’historique requis.'],
  HISTORICAL_PRICE_PROVIDER_UNSUPPORTED: ['مصدر السجل لا يدعم هذا الأصل أو الأفق.', 'The history source does not support this asset or horizon.', 'La source historique ne prend pas en charge cet actif ou cet horizon.'],
  ADJUSTED_HISTORY_REQUIRED_FOR_CORPORATE_ACTION_INTEGRITY: ['يلزم سجل أسعار معدل لإجراءات الشركة قبل تقييم العائد.', 'Corporate actions require adjusted history before return evaluation.', 'Les opérations sur titres exigent un historique ajusté avant évaluation.'],
  MFE_MAE_UNAVAILABLE_FOR_PRICE_SERIES: ['السجل لا يكفي لحساب أقصى حركة ملائمة أو معاكسة.', 'The series cannot support favourable/adverse excursion calculations.', 'La série ne permet pas de calculer les excursions favorables ou défavorables.'],
  INVALID_ANALYSIS_EVALUATION_WINDOW: ['تعذر اعتماد نافذة التقييم بسبب تاريخ غير صالح.', 'The evaluation window contains an invalid date.', 'La fenêtre d’évaluation contient une date invalide.'],
  PERSISTED_OUTCOME_POLICY_SNAPSHOT_INVALID: ['تعذر التقييم لأن المنهج المحفوظ غير مكتمل أو غير متسق.', 'The saved evaluation policy is incomplete or inconsistent.', 'La méthode enregistrée est incomplète ou incohérente.'],
};

export function groupedIntelligenceWarnings(warnings: Warning[], locale: Locale) {
  const groups = new Map<string, Set<IntelligenceFactorKey>>();
  for (const warning of warnings) {
    const factors = groups.get(warning.code) ?? new Set<IntelligenceFactorKey>();
    if (warning.factor) factors.add(warning.factor);
    groups.set(warning.code, factors);
  }
  const index = locale === 'ar' ? 0 : locale === 'fr' ? 2 : 1;
  return [...groups].map(([code, factors]) => ({ code, factors: [...factors], text: (MESSAGES[code]
    ?? ['يوجد قيد إضافي على البيانات أو التقييم؛ راجع مصادر القراءة.', 'An additional data or evaluation limitation applies; review the reading sources.', 'Une limite supplémentaire affecte les données ou l’évaluation ; consultez les sources.'])[index] }));
}

export function signedScorePoints(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return '—';
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  return `${value > 0 ? '+' : ''}${number} ${{ ar: 'نقطة', en: 'points', fr: 'points' }[locale]}`;
}
