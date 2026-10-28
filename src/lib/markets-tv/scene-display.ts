import type { TvGroup, TvLanguage, TvQuote, TvScene } from './types';

export const TV_SCENE_ORDER: TvScene[] = ['overview', 'gulf', 'world', 'assets', 'watchlist'];
const SCENE_GROUP: Record<TvScene, TvGroup> = {
  overview: 'global', gulf: 'gulf', world: 'world', assets: 'commodities', watchlist: 'watchlist',
};

/** One bounded snapshot supplies the summaries, main list and ticker together. */
export function tvScenePath(scene: TvScene) {
  return `/api/tv/snapshot?group=${SCENE_GROUP[scene]}&scene=${scene}&pageSize=10`;
}

export const TV_SCENE_TEXT = {
  overview: ['نظرة عامة', 'Overview', 'Vue d’ensemble'],
  gulf: ['الكويت والخليج', 'Kuwait & Gulf', 'Koweït et Golfe'],
  world: ['العالم', 'World', 'Monde'],
  assets: ['عملات وسلع', 'Currencies & commodities', 'Devises et matières premières'],
  watchlist: ['قائمتي', 'My watchlist', 'Ma liste'],
  viewing: ['وضع المشاهدة', 'Viewing mode', 'Mode télévision'],
  browse: ['تصفح كل الأسواق', 'Browse all markets', 'Parcourir les marchés'],
  strips: ['الأشرطة', 'Market strips', 'Bandes des marchés'],
  displayMode: ['طريقة العرض', 'Display mode', 'Mode d’affichage'],
  browseCustomization: ['أسواق التصفح والأشرطة', 'Markets in browsing and strips', 'Marchés du navigateur et des bandes'],
  scene: ['المشهد', 'Scene', 'Scène'],
  scenes: ['مشاهد الأسواق', 'Market scenes', 'Scènes de marché'],
  quoteList: ['الأسعار', 'Quotes', 'Cours'],
  heatmap: ['خريطة التغيّر', 'Change map', 'Carte des variations'],
  sceneCoverage: ['تغطية المشهد', 'Scene coverage', 'Couverture de la scène'],
  quoted: ['أسعار متاحة', 'Quotes available', 'Cours disponibles'],
  missing: ['أسعار غير متاحة', 'Quotes unavailable', 'Cours indisponibles'],
  recent: ['مباشرة أو متأخرة', 'Real-time or delayed', 'Temps réel ou différés'],
  latestQuote: ['أحدث قراءة', 'Latest quote', 'Dernier cours'],
  closePrices: ['آخر إغلاق', 'Last close', 'Dernière clôture'],
  otherPrices: ['أسعار محفوظة أو مرجعية', 'Retained or reference quotes', 'Cours conservés ou de référence'],
  selectedCoverage: ['من الأدوات المختارة لهذا المشهد', 'Of the instruments selected for this scene', 'Parmi les titres sélectionnés pour cette scène'],
  marketSample: ['عينة المشهد، وليست ترتيب السوق كله', 'Scene sample, not a whole-market ranking', 'Échantillon de la scène, pas un classement du marché'],
  chooseScene: ['اختر المشهد', 'Choose a scene', 'Choisir une scène'],
  kuwaitTime: ['توقيت الكويت', 'Kuwait time', 'Heure du Koweït'],
  identity: ['الأداة', 'Instrument', 'Instrument'],
  price: ['السعر', 'Price', 'Cours'],
  change: ['التغيّر', 'Change', 'Variation'],
  evidence: ['المصدر ووقت السعر', 'Source & quote time', 'Source et heure du cours'],
  points: ['نقطة', 'points', 'points'],
  day: ['24 ساعة', '24 hours', '24 heures'],
  session: ['الجلسة', 'Session', 'Séance'],
  referenceBasis: ['مرجعي', 'Reference', 'Référence'],
  unknownBasis: ['فترة غير موثقة', 'Period unverified', 'Période non vérifiée'],
  noScenePrices: ['لا تتوفر أسعار موثقة لهذا المشهد الآن', 'Verified quotes are currently unavailable for this scene', 'Les cours vérifiés de cette scène sont momentanément indisponibles'],
  noSummaries: ['الملخصات غير متاحة حاليًا', 'Summaries are currently unavailable', 'Les résumés sont momentanément indisponibles'],
  retainedDuringRetry: ['نعرض آخر قراءة محفوظة مع وقتها الأصلي.', 'Showing the last retained reading with its original time.', 'Dernière lecture conservée avec son horodatage d’origine.'],
  noHeatmap: ['لا توجد تغيّرات موثقة كافية للخريطة', 'Not enough verified changes for the map', 'Variations vérifiées insuffisantes pour la carte'],
  more: ['أخرى', 'more', 'autres'],
  ticker: ['شريط المشهد', 'Scene ticker', 'Bande de la scène'],
  pauseTicker: ['إيقاف الشريط', 'Pause ticker', 'Suspendre la bande'],
  resumeTicker: ['تشغيل الشريط', 'Resume ticker', 'Reprendre la bande'],
  update: ['تحديث الأسعار', 'Refresh quotes', 'Actualiser les cours'],
  retryAfter: ['إعادة المحاولة بعد', 'Retry after', 'Réessayer après'],
  updatesUnavailable: ['تحديث الأسعار متعذر حاليًا', 'Quote updates are currently unavailable', 'Actualisation des cours indisponible'],
  automatic: ['تبديل تلقائي', 'Auto rotation', 'Rotation automatique'],
  manual: ['مشهد ثابت', 'Fixed scene', 'Scène fixe'],
  previousScene: ['المشهد السابق', 'Previous scene', 'Scène précédente'],
  nextScene: ['المشهد التالي', 'Next scene', 'Scène suivante'],
  sourceUnavailable: ['المصدر لا يعيد سعرًا صالحًا', 'Source returned no valid quote', 'Aucun cours valide fourni par la source'],
  timeout: ['انتهت مهلة المصدر', 'Source timed out', 'Délai de la source dépassé'],
  identityMismatch: ['تعذر تأكيد هوية الأداة', 'Instrument identity could not be verified', 'Identité du titre non vérifiée'],
  rateLimited: ['حد الطلبات لدى المصدر', 'Source request limit reached', 'Limite de requêtes de la source atteinte'],
  accessDenied: ['رفض المصدر طلب البيانات', 'Source access denied', 'Accès à la source refusé'],
  notConfigured: ['مصدر السوق غير مهيأ', 'Market source is not configured', 'Source du marché non configurée'],
  invalidQuote: ['سعر أو وحدة غير صالحين', 'Invalid price or unit', 'Cours ou unité non valide'],
} satisfies Record<string, [string, string, string]>;

export type TvSceneTextKey = keyof typeof TV_SCENE_TEXT;
export function tvSceneText(language: TvLanguage, key: TvSceneTextKey) {
  return TV_SCENE_TEXT[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
}

export function tvSceneQuoteUnit(quote: TvQuote, language: TvLanguage) {
  if (quote.symbol.startsWith('^')) return tvSceneText(language, 'points');
  // Unit labels are restricted to the exact contracts whose units are known.
  if (quote.currency === 'USD' && ['GC=F', 'SI=F', 'XAUUSD', 'XAGUSD'].includes(quote.symbol)) return 'USD / oz';
  if (quote.currency === 'USD' && ['CL=F', 'BZ=F'].includes(quote.symbol)) return 'USD / bbl';
  if (quote.currency === 'USD' && quote.symbol === 'NG=F') return 'USD / MMBtu';
  return quote.currency || '—';
}

export function tvSceneChange(quote: TvQuote) {
  const value = quote.changePercent;
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function tvSceneHasPrice(quote: TvQuote) {
  return quote.price !== null && Number.isFinite(quote.price) && quote.price > 0 && Boolean(quote.source?.trim());
}

export function tvSceneIssue(issue: string | undefined): TvSceneTextKey {
  const keys: Record<string, TvSceneTextKey> = {
    timeout: 'timeout', identity_mismatch: 'identityMismatch', rate_limited: 'rateLimited',
    access_denied: 'accessDenied', not_configured: 'notConfigured', invalid_quote: 'invalidQuote',
  };
  return issue ? keys[issue] || 'sourceUnavailable' : 'sourceUnavailable';
}

/** Keep an unavailable strip from scanning another batch during provider cooldown. */
export function tvStripSourceCooling(quotes: TvQuote[], retryAt: string | null | undefined, now: number) {
  return Boolean(retryAt && Date.parse(retryAt) > now)
    || quotes.length > 0 && quotes.every(quote => quote.issue === 'rate_limited');
}
