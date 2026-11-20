import type { Language } from './api';
import { portfolioText } from '../../../src/lib/markets-tv/portfolioCopy';
import { quoteLabel } from './copy';
import type { Position } from './receiverApi';
const copy = {
  channels: ['قنواتي', 'Channels', 'Chaînes'], pair: ['ربط الحساب', 'Pair account', 'Associer le compte'], linked: ['جهاز مرتبط', 'Device linked', 'Appareil associé'],
  create: ['إنشاء رمز الربط', 'Create pairing code', 'Créer un code'], unlink: ['إلغاء ربط هذا الجهاز', 'Unlink this device', 'Dissocier cet appareil'],
  instructions: ['افتح www.the-sfm.com/tv/pair على هاتفك وسجّل دخولك، ثم أدخل الرمز ووافق على ربط هذا الجهاز.', 'On your phone, open www.the-sfm.com/tv/pair, sign in, enter the code and approve this device.', 'Sur votre téléphone, ouvrez www.the-sfm.com/tv/pair, connectez-vous, saisissez le code et autorisez cet appareil.'],
  expiry: ['ينتهي الرمز خلال', 'Code expires in', 'Expiration du code dans'],
  expired: ['انتهت صلاحية الرمز. أنشئ رمزًا جديدًا.', 'Code expired. Create a new code.', 'Code expiré. Créez un nouveau code.'],
  limit: ['طلبات كثيرة. انتظر قليلًا ثم أعد المحاولة.', 'Too many requests. Please wait before retrying.', 'Trop de demandes. Patientez avant de réessayer.'],
  storage: ['تعذّر حفظ الربط بأمان. أعد المحاولة.', 'Secure storage unavailable. Please retry.', 'Stockage sécurisé indisponible. Réessayez.'],
  pause: ['إيقاف التبديل', 'Pause rotation', 'Arrêter la rotation'], play: ['تبديل كل 40 ثانية', 'Rotate every 40 seconds', 'Défiler toutes les 40 secondes'],
  previous: ['السابق', 'Previous', 'Précédent'], next: ['التالي', 'Next', 'Suivant'], page: ['الصفحة', 'Page', 'Page'], market: ['السوق التالي', 'Next market', 'Marché suivant'],
  portfolioSync: ['تتزامن المحفظة كل 15 ثانية؛ وقت الجلب يختلف عن وقت التقييم.', 'Portfolio syncs every 15 seconds; fetch time is separate from valuation time.', 'Synchronisation toutes les 15 secondes ; la récupération est distincte de la date de valorisation.'],
  coverage: ['تغطية التقييم', 'Valuation coverage', 'Couverture des valorisations'], total: ['إجمالي القيم المتاحة', 'Total available valuations', 'Total des valorisations disponibles'],
  recordedStatus: ['قيمة مسجّلة', 'Recorded value', 'Valeur enregistrée'], stale: ['تقييم قديم', 'Old valuation', 'Valorisation ancienne'], missing: ['غير معروف', 'Unknown', 'Inconnu'],
  sync: ['آخر تحديث بتوقيت الكويت', 'Last update, Kuwait time', 'Dernière mise à jour, heure du Koweït'],
  open: ['مفتوح حسب الجدول؛ يغلق خلال', 'Scheduled open; closes in', 'Ouvert selon le calendrier ; ferme dans'],
  closed: ['مغلق حسب الجدول؛ يفتح خلال', 'Scheduled closed; opens in', 'Fermé selon le calendrier ; ouvre dans'],
  schedule: ['أوقات مجدولة وليست حالة تداول مباشرة؛ قد تتغير العطلات الاستثنائية.', 'Scheduled hours, not live exchange status; exceptional holidays may change.', 'Horaires prévus, pas un statut en direct ; les jours fériés exceptionnels peuvent changer.'],
  sourceLanguage: ['العناوين بلغة المصدر', 'Headlines in source language', 'Titres dans la langue de la source'],
  signIn: ['اربط جهازك لعرض استثماراتك.', 'Pair this device to view your investments.', 'Associez cet appareil pour consulter vos investissements.'],
  confirming: ['جارٍ انتظار الموافقة من هاتفك', 'Waiting for approval on your phone', 'En attente de confirmation sur votre téléphone'],
  day: ['الوضع الفاتح', 'Light mode', 'Mode clair'], night: ['الوضع الداكن', 'Dark mode', 'Mode sombre'],
} as const;
export function r(language: Language, key: keyof typeof copy) { return copy[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1]; }

/** Market provenance is separate from freshness; delayed or stored quotes never imply live prices. */
export function portfolioStatusLabel(language: Language, position: Position) {
  const kind = portfolioText(language, position.valuationKind === 'market' ? 'marketValues' : position.valuationKind === 'manual' ? 'manualValuation' : 'recorded');
  if (position.amount === null && position.baseValue === null) return `${kind} · ${portfolioText(language, 'unavailable')}`;
  if (position.valuationKind === 'market') return `${kind} · ${quoteLabel(language, position.quoteStatus || 'unknown_delay')}`;
  if (position.freshness === 'stale') return `${kind} · ${portfolioText(language, 'stale')}`;
  if (position.freshness === 'missing') return `${kind} · ${portfolioText(language, 'unknownTime')}`;
  return kind;
}
