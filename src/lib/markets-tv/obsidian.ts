import type { TvLanguage, TvQuote } from './types';
import { quoteStatus } from './quote-status';
import { tvSceneHasPrice } from './scene-display';
import { tvSceneQuoteKey } from './scene-quotes';
const copy = {
  tweaks: ['تخصيص المظهر', 'Tweaks', 'Apparence'],
  champagne: ['شمبانيا', 'Champagne', 'Champagne'], blue: ['أزرق', 'Blue', 'Bleu'], green: ['أخضر', 'Green', 'Vert'], purple: ['بنفسجي', 'Purple', 'Violet'],
  sessionsNow: ['جلسات الآن', 'Sessions now', 'Séances en cours'],
  scheduledOpen: ['مفتوحة حسب الجدول', 'Open by schedule', 'Ouverte selon le calendrier'],
  opensIn: ['تفتح بعد', 'Opens in', 'Ouverture dans'], closesIn: ['تغلق بعد', 'Closes in', 'Clôture dans'],
  days: ['يوم', 'days', 'jours'], hours: ['ساعة', 'hours', 'heures'], minutes: ['دقيقة', 'min', 'min'], seconds: ['ثانية', 'sec', 's'],
  noSessionToday: ['لا توجد جلسة اليوم', 'No session today', 'Aucune séance aujourd’hui'],
  savedBrief: ['آخر الأسعار المحفوظة', 'Last saved prices', 'Derniers cours conservés'],
  savedBriefNote: ['تُعرض كل قراءة بوقت رصدها الأصلي بتوقيت الكويت.', 'Each saved price shows its original observation time in Kuwait time.', 'Chaque cours conserve son heure d’observation, affichée à l’heure du Koweït.'],
  pricesOnlyNote: ['تتوفر أسعار العيّنة وننتظر تغيّرات موثّقة للفترة نفسها.', 'Prices are available. The ranking is waiting for changes measured over the same period.', 'Les cours sont disponibles. Le classement attend des variations sur la même période.'],
  now: ['الآن', 'Now', 'Maintenant'], kuwait: ['بتوقيت الكويت · UTC+3', 'Kuwait time · UTC+3', 'Heure du Koweït · UTC+3'],
  scheduleNote: ['المواعيد حسب الجدول المعتاد؛ قد تتغير في العطل والإغلاقات الاستثنائية. الحالة ليست تأكيدًا مباشرًا من البورصة.', 'Regular schedules; holidays and exceptional closures may differ. Status is not a live exchange confirmation.', 'Horaires habituels ; jours fériés et fermetures exceptionnelles possibles. Statut non confirmé en direct.'],
  sessionChart: ['مسار الجلسة', 'Session chart', 'Courbe de séance'],
  chartMissing: ['الرسم غير متاح من المصدر حاليًا', 'Session chart is currently unavailable', 'Courbe de séance indisponible'],
  chartPrevious: ['آخر جلسة متاحة', 'Last available session', 'Dernière séance disponible'],
  redDay: ['الغلبة للهبوط', 'Declines lead', 'Les baisses dominent'], greenDay: ['الغلبة للصعود', 'Gains lead', 'Les hausses dominent'], mixedDay: ['جلسة متباينة', 'A mixed session', 'Une séance contrastée'],
  flatDay: ['استقرار الأسعار', 'Prices hold steady', 'Les cours restent stables'],
  mostlyFlatDay: ['الاستقرار هو الأبرز', 'Little movement across the sample', 'La stabilité domine'],
  upShare: ['{share} من القراءات القابلة للمقارنة في العيّنة سجّلت ارتفاعًا.', '{share} of comparable prices in the sample rose.', '{share} des cours comparables de la sélection ont progressé.'],
  downShare: ['{share} من القراءات القابلة للمقارنة في العيّنة سجّلت انخفاضًا.', '{share} of comparable prices in the sample fell.', '{share} des cours comparables de la sélection ont reculé.'],
  flatShare: ['{share} من القراءات القابلة للمقارنة في العيّنة بقيت مستقرة.', '{share} of comparable prices in the sample held steady.', '{share} des cours comparables de la sélection sont restés stables.'],
  highlights: ['أبرز التحركات', 'Highlights', 'Temps forts'],
  samplePrices: ['أسعار العيّنة', 'Sample prices', 'Cours de la sélection'],
  largestMove: ['أكبر حركة', 'Largest move', 'Plus forte variation'],
  jointLeaders: ['تعادل في أكبر حركة', 'Tied for largest move', 'Plus fortes variations ex æquo'],
  instrumentCount: ['عدد الأصول', 'Instruments', 'Titres'],
  outsideComparison: ['خارج المقارنة', 'Outside comparison', 'Hors comparaison'],
  differentPeriod: ['فترة تغيّر مختلفة', 'Different change period', 'Période de variation différente'],
  changeMissing: ['التغيّر غير متاح', 'Change unavailable', 'Variation indisponible'],
  noMoves: ['استقرت جميع القراءات القابلة للمقارنة.', 'All comparable prices are unchanged.', 'Tous les cours comparables sont stables.'],
  waitingDay: ['بانتظار بيانات قابلة للمقارنة', 'Waiting for comparable prices', 'En attente de cours comparables'],
  briefAsOf: ['وقت الموجز', 'Brief as of', 'Résumé à'],
  scope: ['أداء الأصول المعروضة في هذه العيّنة فقط', 'Performance of the displayed sample only', 'Performance de la sélection affichée uniquement'],
  breadth: ['توزيع الحركة', 'Market breadth', 'Sens des cours'], average: ['متوسط التغير', 'Average change', 'Variation moyenne'], health: ['حداثة الأسعار', 'Recent prices', 'Cours récents'],
  available: ['الأسعار المتاحة', 'Available prices', 'Cours disponibles'],
  rising: ['صاعد', 'rising', 'en hausse'], falling: ['هابط', 'falling', 'en baisse'],
  current: ['حديثة ومؤرخة', 'Recent and timestamped', 'Récentes et horodatées'], partial: ['تغطية جزئية', 'Partial coverage', 'Couverture partielle'],
  noneRecent: ['بانتظار أسعار حديثة', 'Awaiting recent prices', 'En attente de cours récents'],
  noGainers: ['لا توجد ارتفاعات بين القراءات القابلة للمقارنة.', 'No gains among comparable observations.', 'Aucune hausse parmi les observations comparables.'],
  noLosers: ['لا توجد انخفاضات بين القراءات القابلة للمقارنة.', 'No declines among comparable observations.', 'Aucune baisse parmi les observations comparables.'],
  noComparable: ['القراءات الحالية قديمة أو بلا تغير مؤكد؛ يظهر الترتيب عند وصول بيانات مناسبة.', 'Current observations are old or lack a confirmed change. Ranking resumes when comparable data arrives.', 'Observations anciennes ou variation non confirmée. Le classement reprendra avec des données comparables.'],
  comparable: ['قراءات قابلة للمقارنة', 'comparable observations', 'observations comparables'],
  unavailable: ['بانتظار تحديث السعر', 'Waiting for a price update', 'En attente d’un nouveau cours'],
  chartSource: ['المصدر', 'Source', 'Source'],
  loadingBrief: ['جارٍ تحميل بيانات الموجز', 'Loading brief data', 'Chargement des données du résumé'],
  unavailableBrief: ['تعذر تحميل بيانات الموجز', 'Brief data could not be loaded', 'Impossible de charger le résumé'],
  emptyBrief: ['لا توجد أدوات مختارة لهذا الموجز', 'No instruments selected for this brief', 'Aucun titre sélectionné pour ce résumé'],
} as const;
export function obsText(language: TvLanguage, key: keyof typeof copy) { return copy[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1]; }
export function briefMetrics(quotes: TvQuote[], now: number) {
  const unique = [...new Map(quotes.map(q => [tvSceneQuoteKey(q), q])).values()];
  const available = unique.filter(tvSceneHasPrice);
  const recent = available.filter(q => ['available', 'delayed', 'closed'].includes(quoteStatus(q, now)));
  // Session and rolling-24h changes are not interchangeable. Prefer session
  // observations; use 24h only for a homogeneous crypto sample.
  const basis = unique.length > 0 && unique.every(q => q.changeBasis === '24h') ? '24h' : 'session';
  const comparable = recent.filter(q => q.changeBasis === basis && q.changePercent !== null && Number.isFinite(q.changePercent));
  const rising = comparable.filter(q => q.changePercent! > 0).sort((a, b) => b.changePercent! - a.changePercent!);
  const falling = comparable.filter(q => q.changePercent! < 0).sort((a, b) => a.changePercent! - b.changePercent!);
  const unchanged = comparable.length - rising.length - falling.length;
  const magnitude = Math.max(rising[0]?.changePercent ?? 0, -(falling[0]?.changePercent ?? 0));
  const leaders = magnitude ? comparable.filter(q => Math.abs(q.changePercent!) === magnitude) : [];
  const average = comparable.length ? comparable.reduce((sum, q) => sum + q.changePercent!, 0) / comparable.length : null;
  const headline = !comparable.length ? 'waitingDay' : unchanged === comparable.length ? 'flatDay'
    : unchanged > Math.max(rising.length, falling.length) ? 'mostlyFlatDay'
    : falling.length > Math.max(rising.length, unchanged) ? 'redDay'
    : rising.length > Math.max(falling.length, unchanged) ? 'greenDay' : 'mixedDay';
  return { total: unique.length, available: available.length, recent: recent.length, comparable: comparable.length, basis,
    rising: rising.length, falling: falling.length, unchanged, average, headline, leaders, magnitude,
    saved: available, comparableKeys: new Set(comparable.map(tvSceneQuoteKey)),
    gainers: rising.slice(0, 5), losers: falling.slice(0, 5),
  } as const;
}

export type TvBriefStats = ReturnType<typeof briefMetrics>;

const percentOptions = { style: 'percent', maximumFractionDigits: 1 } as const;
const shareFormat = {
  ar: new Intl.NumberFormat('ar-KW-u-nu-latn', percentOptions),
  en: new Intl.NumberFormat('en', percentOptions),
  fr: new Intl.NumberFormat('fr', percentOptions),
};

export function briefSummary(stats: TvBriefStats, language: TvLanguage) {
  const key = stats.headline === 'redDay' ? 'downShare' : stats.headline === 'greenDay' ? 'upShare'
    : stats.headline === 'flatDay' || stats.headline === 'mostlyFlatDay' ? 'flatShare' : null;
  if (!key) return obsText(language, 'scope');
  const count = key === 'downShare' ? stats.falling : key === 'upShare' ? stats.rising : stats.unchanged;
  const share = shareFormat[language].format(count / stats.comparable);
  return obsText(language, key).replace('{share}', `\u2068${share}\u2069`);
}
