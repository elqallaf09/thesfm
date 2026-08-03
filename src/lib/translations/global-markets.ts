import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_GLOBAL_MARKETS: Record<string, TranslationEntry> = {
  global_markets_title: { ar: 'مركز الأسواق العالمية', en: 'Global Markets Hub', fr: 'Centre des marchés mondiaux' },
  global_markets_subtitle: {
    ar: 'أسواق وبورصات العالم كل واحدة على حدة: مؤشرات الأسهم، الفوركس، السلع، والعملات الرقمية.',
    en: 'The world’s exchanges, each on its own: equity markets, forex, commodities, and crypto.',
    fr: 'Les bourses mondiales, chacune séparément : marchés actions, forex, matières premières et cryptomonnaies.',
  },
  global_markets_last_updated: { ar: 'آخر تحديث', en: 'Last updated', fr: 'Dernière mise à jour' },
  global_markets_disclaimer: {
    ar: 'الأسعار قد تكون متأخرة عن التوقيت الفعلي وهي لأغراض المتابعة فقط، ولا تُعد توصية استثمارية.',
    en: 'Prices may be delayed and are for informational purposes only; not investment advice.',
    fr: 'Les prix peuvent être différés et sont fournis à titre informatif uniquement ; ce n’est pas un conseil en investissement.',
  },

  global_markets_strips_heading: { ar: 'الأسواق المباشرة', en: 'Live Markets', fr: 'Marchés en direct' },
  global_markets_strip_prev: { ar: 'السابق', en: 'Previous', fr: 'Précédent' },
  global_markets_strip_next: { ar: 'التالي', en: 'Next', fr: 'Suivant' },
  global_markets_strip_live: { ar: 'مباشر', en: 'Live', fr: 'En direct' },
  global_markets_strip_delayed: { ar: 'بيانات متأخرة', en: 'Delayed data', fr: 'Données différées' },
  global_markets_strip_unavailable: { ar: 'البيانات غير متاحة حاليًا', en: 'Data currently unavailable', fr: 'Données actuellement indisponibles' },
  global_markets_price_unavailable: { ar: 'غير متوفر', en: 'Unavailable', fr: 'Indisponible' },
  global_markets_sector_unavailable: { ar: 'القطاع غير متوفر', en: 'Sector unavailable', fr: 'Secteur indisponible' },

  global_markets_search_placeholder: {
    ar: 'ابحث عن سهم أو رمز أو سوق...',
    en: 'Search by stock, symbol, or market...',
    fr: 'Rechercher une action, un symbole ou un marché...',
  },
  global_markets_explorer_heading: { ar: 'استكشاف الأسواق', en: 'Explore Markets', fr: 'Explorer les marchés' },
  global_markets_filter_country: { ar: 'الدولة', en: 'Country', fr: 'Pays' },
  global_markets_filter_exchange: { ar: 'البورصة', en: 'Exchange', fr: 'Bourse' },
  global_markets_filter_sector: { ar: 'القطاع', en: 'Sector', fr: 'Secteur' },
  global_markets_filter_asset_type: { ar: 'نوع الأصل', en: 'Asset type', fr: 'Type d’actif' },
  global_markets_filter_all: { ar: 'الكل', en: 'All', fr: 'Tout' },
  global_markets_asset_type_equity: { ar: 'أسهم', en: 'Equities', fr: 'Actions' },
  global_markets_asset_type_forex: { ar: 'فوركس', en: 'Forex', fr: 'Forex' },
  global_markets_asset_type_commodity: { ar: 'سلع', en: 'Commodities', fr: 'Matières premières' },
  global_markets_asset_type_crypto: { ar: 'عملات رقمية', en: 'Crypto', fr: 'Cryptomonnaies' },
  global_markets_asset_type_index: { ar: 'مؤشرات', en: 'Indices', fr: 'Indices' },
  global_markets_results_count: { ar: '{count} أداة مطابقة', en: '{count} matching instruments', fr: '{count} instruments correspondants' },
  global_markets_load_more: { ar: 'تحميل المزيد', en: 'Load more', fr: 'Charger plus' },
  global_markets_all_loaded: { ar: 'تم عرض جميع النتائج المتاحة', en: 'All available results are shown', fr: 'Tous les résultats disponibles sont affichés' },
  global_markets_no_results: { ar: 'لا توجد نتائج مطابقة', en: 'No matching results', fr: 'Aucun résultat correspondant' },
  global_markets_no_results_hint: { ar: 'جرّب تغيير الفلاتر أو مصطلح البحث.', en: 'Try changing the filters or your search term.', fr: 'Essayez de modifier les filtres ou votre recherche.' },
  global_markets_reset_filters: { ar: 'إعادة تعيين الفلاتر', en: 'Reset filters', fr: 'Réinitialiser les filtres' },

  global_markets_news_heading: { ar: 'أخبار الأسواق العالمية', en: 'Global Market News', fr: 'Actualités des marchés mondiaux' },
  global_markets_news_empty: { ar: 'لا توجد أخبار حاليًا', en: 'No news right now', fr: 'Aucune actualité pour le moment' },
  global_markets_news_error: {
    ar: 'تعذر تحميل أخبار الأسواق حاليًا. حاول مرة أخرى لاحقًا.',
    en: 'Could not load market news right now. Try again later.',
    fr: 'Impossible de charger les actualités des marchés pour le moment. Réessayez plus tard.',
  },
  global_markets_news_source: { ar: 'المصدر', en: 'Source', fr: 'Source' },
  global_markets_news_open_article: { ar: 'فتح الخبر الأصلي', en: 'Open original article', fr: 'Ouvrir l’article original' },
  global_markets_news_link_unavailable: { ar: 'الرابط غير متاح', en: 'Link unavailable', fr: 'Lien indisponible' },
};
