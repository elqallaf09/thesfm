import type { TvLanguage, TvView } from './types';
import { TV_EXTRA_NEWS_CHANNELS, TV_NEWS_LABELS } from './newsReceiver';

export const TV_RECEIVER_CHANNELS = ['allStocks', 'technology', 'kuwait', 'sessions', 'investments', ...TV_EXTRA_NEWS_CHANNELS] as const;
export type TvReceiverChannel = typeof TV_RECEIVER_CHANNELS[number];
export function isTvReceiverChannel(value: unknown): value is TvReceiverChannel {
  return TV_RECEIVER_CHANNELS.includes(value as TvReceiverChannel);
}
export function nextTvReceiverChannel(view: TvView, step: number): TvReceiverChannel {
  const index = TV_RECEIVER_CHANNELS.indexOf(view as TvReceiverChannel);
  if (index < 0) return TV_RECEIVER_CHANNELS[step < 0 ? TV_RECEIVER_CHANNELS.length - 1 : 0];
  return TV_RECEIVER_CHANNELS[(index + step + TV_RECEIVER_CHANNELS.length) % TV_RECEIVER_CHANNELS.length];
}
const COPY = {
  ...TV_NEWS_LABELS,
  allStocks: ['كل الأسهم', 'All stocks', 'Toutes les actions'],
  technology: ['أخبار أسهم التقنية', 'Technology stocks news', 'Actualités des valeurs technologiques'],
  kuwait: ['بورصة الكويت', 'Boursa Kuwait', 'Bourse du Koweït'],
  sessions: ['أوقات الأسواق', 'Market hours', 'Horaires des marchés'],
  investments: ['استثماراتي', 'My investments', 'Mes investissements'],
  receiver: ['قنوات SFM TV', 'SFM TV channels', 'Chaînes SFM TV'],
  help: ['الأرقام 1–5 لاختيار قناة · CH+ / CH− للتبديل', 'Keys 1–5 select a channel · CH+ / CH− switch channels', 'Touches 1–5 : choisir · CH+ / CH− : changer de chaîne'],
  allHelp: ['يتناوب دليل الأسهم المتاح على صفحات كل 40 ثانية. توفر السعر ووقته موضحان لكل سهم.', 'Available stock directories cycle in pages every 40 seconds. Each quote retains its availability and time.', 'Les répertoires disponibles défilent toutes les 40 secondes. Chaque cours conserve son état et sa date.'],
  technologyHelp: ['أخبار مرتبطة بأسهم شركات التقنية من مصادر الموقع.', 'News linked to technology stocks from the website’s sources.', 'Actualités des valeurs technologiques provenant des sources du site.'],
  kuwaitHelp: ['أسهم بورصة الكويت وأخبارها فقط · تحديث الأسعار حسب توفر المصدر', 'Kuwait listings and news only · Prices refresh as sources permit', 'Titres et actualités du Koweït · Actualisation selon les sources'],
  newsHelp: ['أخبار قسم الموقع · تتبدل الصفحات كل 40 ثانية', 'Website section news · Pages change every 40 seconds', 'Actualités du site · Pages toutes les 40 secondes'],
  shariaHelp: ['الحالة الشرعية موضحة لكل خبر حسب تصنيف الموقع', 'Each story shows the website’s screening status', 'Chaque article indique le statut de conformité du site'],
  partial: ['تغطية جزئية', 'Partial coverage', 'Couverture partielle'],
  stored: ['أخبار محفوظة من المصدر', 'Stored source news', 'Actualités conservées de la source'],
  compliant: ['متوافق حسب المصدر', 'Compliant per source', 'Conforme selon la source'],
  needs_review: ['يحتاج مراجعة شرعية', 'Screening needs review', 'Conformité à revoir'],
  non_compliant: ['غير متوافق', 'Non-compliant', 'Non conforme'],
  unclassified: ['الحالة الشرعية غير معروفة', 'Screening status unknown', 'Conformité inconnue'],
  channel: ['القناة', 'Channel', 'Chaîne'],
  market: ['السوق المعروض', 'Displayed market', 'Marché affiché'],
} as const;
export function receiverText(language: TvLanguage, key: keyof typeof COPY): string {
  return COPY[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1];
}
