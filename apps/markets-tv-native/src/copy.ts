import type { Language } from './api';
const copy = {
  overview: ['نظرة عامة', 'Overview', 'Vue d’ensemble'], gulf: ['الكويت والخليج', 'Kuwait & Gulf', 'Koweït et Golfe'],
  world: ['العالم', 'World', 'Monde'], assets: ['عملات وسلع', 'Currencies & commodities', 'Devises et matières premières'],
  brief: ['موجز العينة', 'Sample brief', 'Résumé de l’échantillon'], refresh: ['تحديث', 'Refresh', 'Actualiser'],
  loading: ['جارٍ تحميل الأسعار', 'Loading quotes', 'Chargement des cours'], error: ['تعذر التحديث؛ أعد المحاولة', 'Update failed; please retry', 'Échec de l’actualisation ; réessayez'],
  noPrice: ['السعر غير متاح', 'Price unavailable', 'Cours indisponible'], noData: ['لا توجد بيانات متاحة', 'No data available', 'Aucune donnée disponible'],
  close: ['إغلاق', 'Close', 'Fermer'], back: ['رجوع لإغلاق التفاصيل', 'Back closes details', 'Retour ferme les détails'],
  scope: ['عينة مختارة، وليست السوق كله', 'Selected sample, not the whole market', 'Échantillon sélectionné, pas l’ensemble du marché'],
  prices: ['أسعار متاحة', 'Available quotes', 'Cours disponibles'], rising: ['صاعدة', 'Rising', 'En hausse'], falling: ['هابطة', 'Falling', 'En baisse'],
  average: ['متوسط التغير', 'Average change', 'Variation moyenne'], rotation: ['تبديل تلقائي', 'Auto rotation', 'Rotation automatique'],
  delayed: ['بيانات متأخرة', 'Delayed data', 'Données différées'], closed: ['آخر إغلاق', 'Last close', 'Dernière clôture'],
  stale: ['قراءة قديمة', 'Old observation', 'Observation ancienne'], reference: ['سعر مرجعي', 'Reference quote', 'Cours de référence'],
  unknown_time: ['وقت السعر غير معروف', 'Quote time unknown', 'Heure du cours inconnue'], unknown_delay: ['التأخير غير موثق', 'Delay unverified', 'Délai non vérifié'],
  available: ['سعر متاح', 'Quote available', 'Cours disponible'],
  rate_limited: ['بلغ المصدر حد الطلبات', 'Source request limit reached', 'Limite de requêtes atteinte'],
  access_denied: ['رفض المصدر طلب البيانات', 'Source access denied', 'Accès à la source refusé'],
  provider_unavailable: ['المصدر غير متاح', 'Source unavailable', 'Source indisponible'],
  timeout: ['انتهت مهلة المصدر', 'Source timed out', 'Délai de la source dépassé'],
  not_configured: ['مصدر السوق غير مهيأ', 'Market source not configured', 'Source du marché non configurée'],
  identity_mismatch: ['تعذر تأكيد هوية الأداة', 'Instrument identity unverified', 'Identité du titre non vérifiée'],
  invalid_quote: ['سعر أو وحدة غير صالحين', 'Invalid price or unit', 'Cours ou unité non valide'],
} as const;
export type CopyKey = keyof typeof copy;
export const t = (language: Language, key: CopyKey) => copy[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
export function quoteLabel(language: Language, key: string) { return key in copy ? t(language, key as CopyKey) : t(language, 'noPrice'); }
