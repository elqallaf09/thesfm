import type { Language } from './copy';

export const sensitivityCopy = {
  title: { ar: 'تحليل حساسية الحدث', en: 'Event sensitivity explorer', fr: 'Sensibilité à l’événement' },
  intro: { ar: 'ماذا يتغيّر عند تعديل شدة صدمة واحدة؟ نقارن 5 قيم مسموحة حول آخر تشغيل، مع تثبيت بقية الافتراضات.', en: 'What changes when one shock changes? Compare 5 legal magnitudes around the last run, holding every other assumption fixed.', fr: 'Que change une seule intensité de choc ? Comparez 5 valeurs autorisées autour du dernier calcul, toutes les autres hypothèses étant fixes.' },
  shock: { ar: 'الصدمة المراد اختبارها', en: 'Shock to vary', fr: 'Choc à faire varier' },
  path: { ar: 'مسار الحساسية للمقارنة', en: 'Sensitivity path to compare', fr: 'Trajectoire à comparer' },
  fixed: { ar: 'التوقع السابق، والتسعير المسبق، والصدمات الأخرى، والبيئة، والأفق، ورأس المال، والأوزان ثابتة. قرب الحدود تتحرك نافذة القيم دون تكرار.', en: 'Expectations, priced-in assumptions, other shocks, regime, horizon, capital and weights stay fixed. Near a limit, the sample window shifts without duplicates.', fr: 'Anticipations, part déjà intégrée, autres chocs, régime, horizon, capital et pondérations restent fixes. Près des limites, la fenêtre se décale sans doublons.' },
  note: { ar: 'اختبار تعليمي غير معاير؛ هذه ليست احتمالات أو توقعات أسعار. خطوط الرسم تصل نقاطاً محسوبة ولا تمثل أحداثاً زمنية.', en: 'Uncalibrated educational exercise, not probabilities or price forecasts. Chart lines connect calculated points, not events over time.', fr: 'Exercice pédagogique non calibré, sans probabilités ni prévisions de cours. Les lignes relient des points calculés, pas des événements dans le temps.' },
  magnitude: { ar: 'القيمة المفترضة للصدمة', en: 'Assumed shock magnitude', fr: 'Intensité supposée du choc' },
  baseline: { ar: 'قيمة آخر تشغيل', en: 'Last-run magnitude', fr: 'Valeur du dernier calcul' },
  portfolio: { ar: 'أثر المحفظة', en: 'Portfolio impact', fr: 'Effet sur le portefeuille' },
  delta: { ar: 'الفرق عن آخر تشغيل — نقطة مئوية', en: 'Difference from last run — percentage points', fr: 'Écart au dernier calcul — points de pourcentage' },
  apply: { ar: 'استخدم هذه القيمة', en: 'Use this magnitude', fr: 'Utiliser cette valeur' },
  applyNote: { ar: 'استخدام قيمة يغيّر المسودة فقط. اضغط تشغيل المحاكاة لتحديث النتائج؛ لا يُنفَّذ أي تداول.', en: 'Using a magnitude edits the draft only. Run the simulation to update results; no trade is executed.', fr: 'Utiliser une valeur modifie seulement le brouillon. Relancez la simulation pour actualiser les résultats ; aucune transaction n’est exécutée.' },
  stale: { ar: 'المسودة تغيّرت. هذه المقارنة تخص آخر تشغيل؛ أعد التشغيل قبل استخدام إحدى قيمها.', en: 'The draft has changed. This comparison belongs to the last run; rerun before using a magnitude.', fr: 'Le brouillon a changé. Cette comparaison concerne le dernier calcul ; relancez avant d’utiliser une valeur.' },
  table: { ar: 'القيم المحسوبة واختلاف أثر المحفظة', en: 'Calculated values and portfolio differences', fr: 'Valeurs calculées et écarts du portefeuille' },
  action: { ar: 'تعديل المسودة', en: 'Edit draft', fr: 'Modifier le brouillon' },
  chart: { ar: 'حساسية الذهب والنفط والمحفظة لشدة الصدمة', en: 'Gold, oil and portfolio sensitivity to shock magnitude', fr: 'Sensibilité de l’or, du pétrole et du portefeuille à l’intensité du choc' },
} satisfies Record<string, Record<Language, string>>;
