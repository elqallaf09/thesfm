import type { TvLanguage } from './types';

const ar = {
  pricesUnavailable: 'لم يصل سعر موثّق لهذه الدفعة بعد. تُعاد المحاولة تلقائيًا، ويمكنك اختيار دفعة أو بورصة أخرى.',
  hall: 'صالة البورصة', allStocks: 'كل الأسهم', search: 'ابحث باسم الشركة أو رمز السهم',
  directory: 'دليل الأسهم', matches: 'نتائج البحث', company: 'الشركة / الرمز', price: 'السعر', change: 'التغيّر',
  source: 'المصدر / وقت السعر', sample: 'مختارات الأسواق', allMarkets: 'جميع البورصات',
  noResults: 'لا توجد أسهم مطابقة', noNews: 'لا توجد أخبار متاحة حاليًا', news: 'أخبار الأسواق',
  sessions: 'أوقات الأسواق', scheduled: 'حسب جدول التداول — الحالة تقديرية', open: 'مفتوح حسب الجدول', closed: 'مغلق حسب الجدول',
  opens: 'يفتح بعد', closes: 'يغلق بعد', unavailable: 'السعر غير متوفر', chooseMarket: 'اختر البورصة',
  directoryNote: 'عدد الأسهم في الدليل؛ توفر الأسعار يختلف حسب السوق والمصدر.',
  newsPause: 'إيقاف تبديل الأخبار', newsPlay: 'تشغيل تبديل الأخبار', unknown: 'غير معروف',
};
type HallKey = keyof typeof ar;
const en: Record<HallKey, string> = {
  pricesUnavailable: 'Verified prices for this batch have not arrived yet. Retrying automatically; you can select another batch or exchange.',
  hall: 'Trading hall', allStocks: 'All stocks', search: 'Search company or symbol',
  directory: 'Stock directory', matches: 'Search results', company: 'Company / symbol', price: 'Price', change: 'Change',
  source: 'Source / price time', sample: 'Market selection', allMarkets: 'All exchanges',
  noResults: 'No matching stocks', noNews: 'No news available right now', news: 'Market news',
  sessions: 'Market hours', scheduled: 'Scheduled hours — estimated status', open: 'Scheduled open', closed: 'Scheduled closed',
  opens: 'Opens in', closes: 'Closes in', unavailable: 'Price unavailable', chooseMarket: 'Choose exchange',
  directoryNote: 'Directory count; price coverage varies by exchange and source.',
  newsPause: 'Pause news rotation', newsPlay: 'Resume news rotation', unknown: 'Unknown',
};
const fr: Record<HallKey, string> = {
  pricesUnavailable: 'Les cours vérifiés de ce lot ne sont pas encore disponibles. Nouvelle tentative automatique ; vous pouvez choisir un autre lot ou une autre bourse.',
  hall: 'Salle de marché', allStocks: 'Toutes les actions', search: 'Rechercher une société ou un symbole',
  directory: 'Répertoire des actions', matches: 'Résultats', company: 'Société / symbole', price: 'Cours', change: 'Variation',
  source: 'Source / heure du cours', sample: 'Sélection de marchés', allMarkets: 'Toutes les bourses',
  noResults: 'Aucune action correspondante', noNews: 'Aucune actualité disponible', news: 'Actualités des marchés',
  sessions: 'Horaires des marchés', scheduled: 'Horaires prévus — état estimé', open: 'Ouvert selon les horaires', closed: 'Fermé selon les horaires',
  opens: 'Ouverture dans', closes: 'Fermeture dans', unavailable: 'Cours indisponible', chooseMarket: 'Choisir une bourse',
  directoryNote: 'Nombre de titres du répertoire ; couverture variable selon la bourse et la source.',
  newsPause: 'Suspendre les actualités', newsPlay: 'Reprendre les actualités', unknown: 'Inconnu',
};
export const hallText = (language: TvLanguage, key: HallKey) => ({ ar, en, fr })[language][key];
