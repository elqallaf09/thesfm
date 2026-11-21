import type { IpoTopicId } from '@/lib/market-news/ipoRegions';

export type Lang = 'ar' | 'en' | 'fr';

export type TopicCopy = {
  title: string;
  subtitle: string;
  badge: string;
  method: string;
  empty: string;
  emptyHint: string;
  search: string;
  tickerLabel: string;
};

// Page copy for the regional IPO news pages (ar/en/fr).
export const IPO_TOPIC_COPY: Record<IpoTopicId, Record<Lang, TopicCopy>> = {
  'ipo-us-news': {
    ar: {
      title: 'أخبار الاكتتابات الأمريكية',
      subtitle: 'طروحات عامة أولية وإدراجات جديدة وإدراج مباشر في ناسداك وبورصة نيويورك، مع إيداعات SEC وتسعير الطروحات وبدايات التداول.',
      badge: 'ناسداك · NYSE',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات الأمريكية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات الأمريكية',
    },
    en: {
      title: 'US IPOs News',
      subtitle: 'IPOs, new listings, and direct listings on Nasdaq and NYSE, including SEC filings, pricing, and trading debuts.',
      badge: 'Nasdaq · NYSE',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching US IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'US IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse américaines',
      subtitle: 'IPO, nouvelles cotations et cotations directes au Nasdaq et au NYSE, y compris dépôts SEC, prix et premiers échanges.',
      badge: 'Nasdaq · NYSE',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse américaines',
    },
  },
  'ipo-asia-news': {
    ar: {
      title: 'أخبار الاكتتابات الآسيوية',
      subtitle: 'الاكتتابات في هونغ كونغ وشنغهاي وشنتشن وطوكيو والهند وسنغافورة وكوريا وجنوب شرق آسيا.',
      badge: 'HKEX · طوكيو · الهند',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات الآسيوية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات الآسيوية',
    },
    en: {
      title: 'Asian IPOs News',
      subtitle: 'IPOs in Hong Kong, Shanghai, Shenzhen, Tokyo, India, Singapore, Korea, and Southeast Asia.',
      badge: 'HKEX · Tokyo · India',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching Asian IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'Asian IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse asiatiques',
      subtitle: 'IPO à Hong Kong, Shanghai, Shenzhen, Tokyo, en Inde, à Singapour, en Corée et en Asie du Sud-Est.',
      badge: 'HKEX · Tokyo · Inde',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse asiatiques',
    },
  },
  'ipo-europe-news': {
    ar: {
      title: 'أخبار الاكتتابات الأوروبية',
      subtitle: 'الاكتتابات والإدراجات الجديدة في يورونكست وفرانكفورت وسويسرا ودول الشمال وبقية أسواق أوروبا القارية.',
      badge: 'Euronext · Xetra · SIX',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات الأوروبية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات الأوروبية',
    },
    en: {
      title: 'European IPOs News',
      subtitle: 'IPOs and new listings on Euronext, Frankfurt, SIX Swiss, the Nordics, and other continental European markets.',
      badge: 'Euronext · Xetra · SIX',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching European IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'European IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse européennes',
      subtitle: 'IPO et nouvelles cotations sur Euronext, Francfort, SIX Swiss, les pays nordiques et les autres marchés européens.',
      badge: 'Euronext · Xetra · SIX',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse européennes',
    },
  },
  'ipo-uk-news': {
    ar: {
      title: 'أخبار الاكتتابات البريطانية',
      subtitle: 'الطروحات والإدراجات الجديدة في بورصة لندن وسوق AIM، بما فيها إعلانات نية الطرح وتسعيره.',
      badge: 'بورصة لندن · AIM',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات البريطانية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات البريطانية',
    },
    en: {
      title: 'UK IPOs News',
      subtitle: 'IPOs and new listings on the London Stock Exchange and AIM, including intention-to-float notices and pricing.',
      badge: 'London Stock Exchange · AIM',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching UK IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'UK IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse britanniques',
      subtitle: 'IPO et nouvelles cotations à la Bourse de Londres et sur l’AIM, y compris annonces d’intention et prix.',
      badge: 'Bourse de Londres · AIM',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse britanniques',
    },
  },
  'ipo-gulf-news': {
    ar: {
      title: 'أخبار الاكتتابات الخليجية',
      subtitle: 'الاكتتابات في تداول ونمو وسوق أبوظبي وسوق دبي وبورصة الكويت وبورصة قطر وبورصة البحرين وبورصة مسقط.',
      badge: 'تداول · أبوظبي · دبي · الكويت',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات الخليجية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات الخليجية',
    },
    en: {
      title: 'Gulf IPOs News',
      subtitle: 'IPOs on Tadawul, Nomu, ADX, DFM, Boursa Kuwait, Qatar Stock Exchange, Bahrain Bourse, and Muscat Stock Exchange.',
      badge: 'Tadawul · ADX · DFM · Kuwait',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching Gulf IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'Gulf IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse du Golfe',
      subtitle: 'IPO sur Tadawul, Nomu, ADX, DFM, Boursa Kuwait, la Bourse du Qatar, Bahrain Bourse et la Bourse de Mascate.',
      badge: 'Tadawul · ADX · DFM · Koweït',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse du Golfe',
    },
  },
  'ipo-arab-news': {
    ar: {
      title: 'أخبار الاكتتابات العربية',
      subtitle: 'الاكتتابات خارج الخليج في البورصة المصرية وبورصة الدار البيضاء وبورصة عمّان وتونس وبقية الأسواق العربية.',
      badge: 'مصر · المغرب · الأردن',
      method: 'تُجمع الأخبار من عدة مراجع مستقلة في وقت واحد: نسخ Google News الإقليمية بلغات المنطقة، ومواقع مالية متخصصة، ووكالات عالمية مقيّدة بأسواق المنطقة، ومصادر البورصات الرسمية عند توفرها. تُدمج النسخ المكررة ويُرتب الأحدث أولًا.',
      empty: 'لا توجد أخبار الاكتتابات العربية مطابقة حاليًا.',
      emptyHint: 'تظهر الأخبار عند نشر طرح أو إدراج موثق من المراجع المتاحة؛ لا تُضاف أخبار غير مرتبطة لملء الصفحة.',
      search: 'ابحث عن شركة أو طرح أو بورصة...',
      tickerLabel: 'الاكتتابات العربية',
    },
    en: {
      title: 'Arab Markets IPOs News',
      subtitle: 'IPOs outside the Gulf on the Egyptian Exchange, Casablanca, Amman, Tunis, and other Arab markets.',
      badge: 'Egypt · Morocco · Jordan',
      method: 'Stories are gathered from several independent references at once: regional Google News editions in local languages, specialist financial outlets, global wires scoped to the region’s exchanges, and official exchange feeds where available. Duplicates are merged and the newest come first.',
      empty: 'No matching Arab Markets IPOs news is available right now.',
      emptyHint: 'Stories appear when an available reference reports a documented offering or listing; unrelated stories are never added to fill the page.',
      search: 'Search company, offering, or exchange...',
      tickerLabel: 'Arab Markets IPOs',
    },
    fr: {
      title: 'Actualités — Introductions en Bourse arabes',
      subtitle: 'IPO hors du Golfe à la Bourse égyptienne, Casablanca, Amman, Tunis et sur les autres marchés arabes.',
      badge: 'Égypte · Maroc · Jordanie',
      method: 'Les actualités proviennent de plusieurs références indépendantes : éditions régionales de Google News dans les langues locales, médias financiers spécialisés, agences mondiales limitées aux bourses de la région et flux officiels des bourses lorsqu’ils existent. Les doublons sont fusionnés, les plus récents d’abord.',
      empty: 'Aucune actualité correspondante actuellement.',
      emptyHint: 'Les articles apparaissent lorsqu’une référence disponible annonce une offre ou une cotation documentée ; aucun article hors sujet n’est ajouté.',
      search: 'Rechercher société, offre ou bourse...',
      tickerLabel: 'Introductions en Bourse arabes',
    },
  },
};
