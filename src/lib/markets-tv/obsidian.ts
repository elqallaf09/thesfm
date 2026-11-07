import type { TvLanguage, TvQuote } from './types';
import { quoteStatus } from './quotes';
import { tvSceneHasPrice } from './scene-display';
const copy = {
  tweaks: ['تخصيص المظهر', 'Tweaks', 'Apparence'],
  champagne: ['شمبانيا', 'Champagne', 'Champagne'], blue: ['أزرق', 'Blue', 'Bleu'], green: ['أخضر', 'Green', 'Vert'], purple: ['بنفسجي', 'Purple', 'Violet'],
  sessionsNow: ['جلسات الآن', 'Sessions now', 'Séances en cours'],
  scheduledOpen: ['مفتوحة حسب الجدول', 'Open by schedule', 'Ouverte selon le calendrier'],
  opensIn: ['تفتح بعد', 'Opens in', 'Ouverture dans'], closesIn: ['تغلق بعد', 'Closes in', 'Clôture dans'],
  days: ['يوم', 'days', 'jours'], hours: ['ساعة', 'hours', 'heures'], minutes: ['دقيقة', 'min', 'min'], seconds: ['ثانية', 'sec', 's'],
  noSessionToday: ['لا توجد جلسة اليوم', 'No session today', 'Aucune séance aujourd’hui'],
  savedBrief: ['آخر الأسعار المحفوظة', 'Last saved prices', 'Derniers cours conservés'],
  savedBriefNote: ['الأسعار أدناه محفوظة مع تاريخها ومصدرها؛ يُستأنف ترتيب الصعود والهبوط عند وصول تغيّرات جلسة قابلة للمقارنة.', 'Saved observations with their original time and source. Rankings resume when comparable session changes arrive.', 'Observations conservées avec leur heure et leur source. Le classement reprendra avec des variations comparables.'],
  now: ['الآن', 'Now', 'Maintenant'], kuwait: ['بتوقيت الكويت · UTC+3', 'Kuwait time · UTC+3', 'Heure du Koweït · UTC+3'],
  scheduleNote: ['المواعيد حسب الجدول المعتاد؛ قد تتغير في العطل والإغلاقات الاستثنائية. الحالة ليست تأكيدًا مباشرًا من البورصة.', 'Regular schedules; holidays and exceptional closures may differ. Status is not a live exchange confirmation.', 'Horaires habituels ; jours fériés et fermetures exceptionnelles possibles. Statut non confirmé en direct.'],
  sessionChart: ['مسار الجلسة', 'Session chart', 'Courbe de séance'],
  chartMissing: ['الرسم غير متاح من المصدر حاليًا', 'Session chart is currently unavailable', 'Courbe de séance indisponible'],
  chartPrevious: ['آخر جلسة متاحة', 'Last available session', 'Dernière séance disponible'],
  redDay: ['يوم أحمر', 'A red day', 'Une journée en baisse'], greenDay: ['يوم أخضر', 'A green day', 'Une journée en hausse'], mixedDay: ['جلسة متباينة', 'A mixed session', 'Une séance contrastée'],
  waitingDay: ['بانتظار بيانات قابلة للمقارنة', 'Waiting for comparable prices', 'En attente de cours comparables'],
  scope: ['ملخص العينة المعروضة · ليس السوق كله', 'Displayed sample · not the whole market', 'Échantillon affiché · pas tout le marché'],
  breadth: ['اتساع العينة', 'Sample breadth', 'Amplitude de l’échantillon'], average: ['متوسط التغير', 'Average change', 'Variation moyenne'], health: ['حالة البيانات', 'Data health', 'État des données'],
  available: ['الأسعار المتاحة', 'Available prices', 'Cours disponibles'],
  rising: ['صاعد', 'rising', 'en hausse'], falling: ['هابط', 'falling', 'en baisse'],
  current: ['حديثة ومؤرخة', 'Recent and timestamped', 'Récentes et horodatées'], partial: ['تغطية جزئية', 'Partial coverage', 'Couverture partielle'],
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
  const unique = [...new Map(quotes.map(q => [`${q.exchange}:${q.symbol}:${q.currency}`, q])).values()];
  const available = unique.filter(tvSceneHasPrice);
  const recent = available.filter(q => ['available', 'delayed', 'closed'].includes(quoteStatus(q, now)));
  // Session and rolling-24h changes are not interchangeable. Prefer session
  // observations; use 24h only for a homogeneous crypto sample.
  const basis = unique.length > 0 && unique.every(q => q.changeBasis === '24h') ? '24h' : 'session';
  const comparable = recent.filter(q => q.changeBasis === basis && q.changePercent !== null && Number.isFinite(q.changePercent));
  const rising = comparable.filter(q => q.changePercent! > 0), falling = comparable.filter(q => q.changePercent! < 0);
  const average = comparable.length ? comparable.reduce((sum, q) => sum + q.changePercent!, 0) / comparable.length : null;
  return { total: unique.length, available: available.length, recent: recent.length, comparable: comparable.length, basis,
    rising: rising.length, falling: falling.length, average,
    headline: !comparable.length ? 'waitingDay' : falling.length > rising.length ? 'redDay' : rising.length > falling.length ? 'greenDay' : 'mixedDay',
    saved: available,
    gainers: rising.sort((a,b) => b.changePercent! - a.changePercent!).slice(0,5), losers: falling.sort((a,b) => a.changePercent! - b.changePercent!).slice(0,5),
  } as const;
}
