import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

/** Public provider-state explanations. Technical/upstream error strings never enter this bundle. */
export const TR_MARKET_DIAGNOSTICS: Record<string, TranslationEntry> = {
  market_state_load_failed_title: { ar: 'تعذر تحميل حالة بيانات السوق', en: 'Market-data status could not load', fr: 'Impossible de charger l’état des données de marché' },
  market_state_load_failed_body: { ar: 'لم تتغير بياناتك؛ أعد المحاولة للحصول على آخر حالة للمصادر.', en: 'Your data has not changed. Retry to get the latest source status.', fr: 'Vos données n’ont pas changé. Réessayez pour obtenir le dernier état des sources.' },
  market_header_data_unavailable: { ar: 'البيانات غير متاحة حالياً', en: 'Data temporarily unavailable', fr: 'Données temporairement indisponibles' },
  market_provider_diagnostic_title: { ar: 'تشخيص المصدر', en: 'Source diagnosis', fr: 'Diagnostic de source' },
  market_provider_diagnostic_reason: { ar: 'سبب الحالة', en: 'Why this happened', fr: 'Pourquoi cela arrive' },
  market_provider_diagnostic_action: { ar: 'الإجراء', en: 'What happens next', fr: 'Prochaine étape' },
  market_provider_reason_degraded: { ar: 'هذا المصدر يعمل، لكن بعض البيانات قد تكون متأخرة أو غير مكتملة.', en: 'This source is working, but some data may be delayed or incomplete.', fr: 'Cette source fonctionne, mais certaines données peuvent être retardées ou incomplètes.' },
  market_provider_action_degraded: { ar: 'سيستمر النظام بالمصادر البديلة المتاحة، ويمكن التحديث لاحقاً.', en: 'The system will continue with available fallback sources; you can refresh later.', fr: 'Le système continuera avec les sources de repli disponibles ; vous pouvez actualiser plus tard.' },
  market_provider_reason_rate_limited: { ar: 'تم الوصول مؤقتاً إلى حد استخدام هذا المصدر.', en: 'This source has temporarily reached its usage limit.', fr: 'Cette source a temporairement atteint sa limite d’utilisation.' },
  market_provider_action_rate_limited: { ar: 'سيُعاد استخدامه تلقائياً بعد انتهاء الحد، مع الاعتماد على البدائل إن توفرت.', en: 'It will be used again automatically after the limit resets, with fallbacks used where available.', fr: 'Il sera utilisé à nouveau automatiquement après la réinitialisation, avec des sources de repli si disponibles.' },
  market_provider_reason_disconnected: { ar: 'تعذر الوصول إلى هذا المصدر في آخر فحص.', en: 'This source could not be reached on the latest check.', fr: 'Cette source n’a pas pu être jointe lors de la dernière vérification.' },
  market_provider_action_disconnected: { ar: 'سيحاول النظام الاتصال مجدداً ويستخدم بديلاً عند توفره.', en: 'The system will try again and use a fallback when one is available.', fr: 'Le système réessaiera et utilisera une source de repli lorsqu’elle est disponible.' },
  market_provider_reason_misconfigured: { ar: 'يحتاج هذا المصدر إلى إعداد من فريق النظام.', en: 'This source needs configuration by the system team.', fr: 'Cette source nécessite une configuration par l’équipe système.' },
  market_provider_action_misconfigured: { ar: 'ستبقى البيانات المتاحة من المصادر الأخرى ظاهرة.', en: 'Data from other available sources will remain visible.', fr: 'Les données des autres sources disponibles resteront visibles.' },
  market_provider_reason_disabled: { ar: 'هذا المصدر غير مفعّل في الإعداد الحالي.', en: 'This source is not enabled in the current setup.', fr: 'Cette source n’est pas activée dans la configuration actuelle.' },
  market_provider_action_disabled: { ar: 'سيعتمد النظام على مصدر آخر يدعم هذه البيانات عند توفره.', en: 'The system will use another source that supports this data when available.', fr: 'Le système utilisera une autre source qui prend en charge ces données lorsqu’elle est disponible.' },
  market_provider_reason_unknown: { ar: 'لم تكتمل قراءة حالة هذا المصدر بعد.', en: 'A current status reading for this source is not available yet.', fr: 'Une lecture actuelle de l’état de cette source n’est pas encore disponible.' },
  market_provider_action_unknown: { ar: 'حدّث الحالة لاحقاً؛ لن يفترض النظام أن المصدر يعمل قبل القياس.', en: 'Refresh later; the system will not assume this source works before it is measured.', fr: 'Actualisez plus tard ; le système ne supposera pas que cette source fonctionne avant de l’avoir mesurée.' },
  market_provider_reason_unsupported: { ar: 'هذا المصدر لا يقدم هذه الميزة مباشرة.', en: 'This source does not provide this capability directly.', fr: 'Cette source ne fournit pas directement cette capacité.' },
  market_provider_action_unsupported: { ar: 'اعتمد على مصدر آخر يدعم هذه البيانات.', en: 'Use another source that supports this data.', fr: 'Utilisez une autre source qui prend en charge ces données.' },
};
