const root = document.querySelector("#app");
const canvas = document.querySelector("#terminal-background");

const STORAGE_KEY = "the-sfm-trader-settings";
const WATCHLIST_KEY = "the-sfm-trader-watchlist";
const DISMISSED_NOTICE_KEY = "the-sfm-trader-dismissed-legal-notices";
const APP_BASE = "/thesfm-trader-own";

const i18n = {
  ar: {
    dashboard: "الرئيسية",
    markets: "الأسواق",
    forex: "الفوركس",
    indices: "المؤشرات",
    stocks: "الأسهم",
    crypto: "العملات الرقمية",
    commodities: "السلع",
    etfs: "الصناديق المتداولة",
    aiScanner: "ماسح الذكاء الاصطناعي",
    watchlist: "قائمة المراقبة",
    portfolio: "المحفظة",
    alerts: "التنبيهات",
    news: "الأخبار",
    calendar: "التقويم",
    education: "التعليم",
    settings: "الإعدادات",
    searchPlaceholder: "ابحث عن أصل، رمز، أو سوق...",
    aiActive: "AI AGENT ACTIVE",
    analyzing: "تحليل مستمر",
    liveData: "بيانات مباشرة",
    delayedData: "بيانات متأخرة",
    connecting: "جاري الاتصال",
    operational: "يعمل",
    scanning: "قيد الفحص",
    providerAvailability: "حالة مزود البيانات",
    dataFreshness: "حداثة البيانات",
    applicationStatus: "حالة التطبيق",
    providerConnected: "مزود البيانات متصل",
    providerDelayed: "مزود البيانات متصل ببيانات متأخرة",
    providerUnavailable: "مزود البيانات غير متاح",
    unauthorized: "انتهت الجلسة",
    accessDenied: "لا توجد صلاحية",
    requestFailed: "فشل الطلب",
    rateLimited: "تم تجاوز حد الطلبات",
    providerTimeout: "انتهت مهلة الطلب",
    invalidResponse: "استجابة غير صالحة",
    serverError: "خطأ في الخادم",
    unsupportedMetric: "غير مدعوم لهذا السوق",
    noMarketMovers: "لا تتوفر بيانات حركة لهذا السوق",
    multipleCurrencies: "عملات متعددة",
    baseQuoteCurrencies: "عملات أساس/مقابل",
    mixedCurrencies: "عملات متعددة",
    notApplicable: "غير منطبق",
    selectedMarketInstruments: "أدوات في السوق المختار",
    supportedCategories: "فئات سوق مدعومة",
    scannedAssets: "أدوات مفحوصة حالياً",
    availableSignals: "إشارات متاحة حالياً",
    lastUpdatedAt: "آخر تحديث عند",
    unavailable: "غير متاح",
    loading: "جاري التحميل",
    error: "تعذر تحميل البيانات",
    retry: "إعادة المحاولة",
    viewAll: "عرض الكل",
    marketOverview: "نظرة عامة على السوق",
    marketOverviewDesc: "تحليل مرئي للأسواق العالمية والمراكز المالية النشطة.",
    aiTopPicks: "أفضل اختيارات الذكاء الاصطناعي",
    aiTopPicksDesc: "فرص مرتبة حسب الثقة عندما تتوفر بيانات حقيقية.",
    marketNews: "أخبار السوق",
    aiMarketAnalysis: "تحليل السوق بالذكاء الاصطناعي",
    exploreMarkets: "استكشاف الأسواق",
    smartWatchlist: "قائمة مراقبة ذكية",
    smartWatchlistDesc: "متابعة أصولك وتحويل التحليل إلى إشارات واضحة.",
    signal: "الإشارة",
    confidence: "الثقة",
    target: "الهدف",
    timeframe: "المدة",
    risk: "المخاطرة",
    price: "السعر",
    change: "التغير",
    action: "الإجراء",
    buy: "شراء",
    sell: "بيع",
    hold: "انتظار",
    currentPrice: "السعر الحالي",
    targetPrice: "السعر المستهدف",
    stopLoss: "وقف الخسارة",
    aiScore: "AI Score",
    riskNoticeTitle: "تنبيه المخاطر",
    riskNoticeBody: "جميع التحليلات والمؤشرات والتوقعات المعروضة داخل SFM Trading Terminal هي لأغراض تعليمية ومعلوماتية فقط ولا تشكل نصيحة استثمارية أو توصية مالية. قد يؤدي التداول والاستثمار إلى خسارة جزء أو كامل رأس المال.",
    aiNoticeTitle: "تنبيه الذكاء الاصطناعي",
    aiNoticeBody: "يتم إنشاء بعض التحليلات والتوقعات باستخدام تقنيات الذكاء الاصطناعي. قد تحتوي النتائج على أخطاء أو تقديرات غير دقيقة، ويجب عدم الاعتماد عليها وحدها لاتخاذ القرارات الاستثمارية.",
    close: "إغلاق",
    statusBarData: "حالة مزود البيانات",
    totalMarkets: "فئات الأسواق المدعومة",
    activeAssets: "الأدوات المفحوصة",
    scans: "الإشارات المتاحة",
    lastUpdate: "آخر تحديث",
    systemStatus: "حالة النظام",
    noLiveData: "لا توجد بيانات مباشرة متاحة حالياً.",
    noNews: "مزود الأخبار غير متصل حالياً.",
    noPortfolio: "لا توجد ممتلكات محفوظة. لن يتم عرض مراكز وهمية.",
    noAlerts: "لا توجد تنبيهات نشطة حالياً.",
    routeUnavailable: "هذه الصفحة جاهزة للبيانات الحقيقية، ولا تعرض بيانات وهمية.",
    marketSentiment: "معنويات السوق",
    aiConfidence: "ثقة الذكاء الاصطناعي",
    bullish: "صاعد",
    bearish: "هابط",
    neutral: "محايد",
    profileName: "SFM Trader",
    premium: "Premium",
    add: "إضافة",
    symbol: "الرمز",
    notes: "ملاحظات",
    language: "اللغة",
    theme: "المظهر",
    currency: "العملة",
    timezone: "المنطقة الزمنية",
    dataRefresh: "تحديث البيانات",
    privacy: "الخصوصية",
    account: "الحساب",
    notificationPreferences: "تفضيلات التنبيهات",
    marketPreferences: "تفضيلات الأسواق",
    educational: "تعليمي",
    support: "الدعم والمعلومات",
    shariaCompliance: "التوافق الشرعي",
    shariaCompliant: "متوافق شرعياً",
    shariaNonCompliant: "غير متوافق شرعياً",
    shariaReviewRequired: "يحتاج مراجعة",
    shariaNotApplicable: "غير منطبق",
    shariaTooltip: "التصنيف الشرعي إرشادي ويحتاج إلى مراجعة دورية وفق المعايير الشرعية المعتمدة.",
    shariaOnlyFilter: "الأسهم الشرعية فقط",
    shariaOnlyFilterNote: "يعرض الأسهم ذات التصنيف الموثق كمتوافقة شرعياً فقط.",
    shariaFilterStocksOnly: "ينطبق هذا الفلتر على الأسهم فقط ولا يشمل الفوركس أو السلع أو العملات الرقمية.",
    noShariaCompliantResults: "لا توجد أسهم مصنفة كمتوافقة شرعياً ضمن النتائج الحالية.",
    clearFilter: "مسح الفلتر",
    shariaStatusFilter: "الحالة الشرعية",
    shariaReason: "سبب التصنيف",
    shariaSource: "مصدر التصنيف",
    shariaStandard: "المنهجية",
    shariaLastReview: "آخر مراجعة",
    shariaOutdated: "التصنيف قديم ويحتاج إلى تحديث",
    openDrawer: "فتح القائمة",
    closeDrawer: "إغلاق القائمة",
  },
  en: {
    dashboard: "Dashboard",
    markets: "Markets",
    forex: "Forex",
    indices: "Indices",
    stocks: "Stocks",
    crypto: "Crypto",
    commodities: "Commodities",
    etfs: "ETFs",
    aiScanner: "AI Scanner",
    watchlist: "Watchlist",
    portfolio: "Portfolio",
    alerts: "Alerts",
    news: "News",
    calendar: "Calendar",
    education: "Education",
    settings: "Settings",
    searchPlaceholder: "Search markets, stocks, assets...",
    aiActive: "AI AGENT ACTIVE",
    analyzing: "Analyzing 24/7",
    liveData: "Live data",
    delayedData: "Delayed data",
    connecting: "Connecting",
    operational: "Operational",
    scanning: "Scanning",
    providerAvailability: "Data-provider status",
    dataFreshness: "Data freshness",
    applicationStatus: "Application status",
    providerConnected: "Provider connected",
    providerDelayed: "Provider connected with delayed data",
    providerUnavailable: "Provider unavailable",
    unauthorized: "Session expired",
    accessDenied: "Access denied",
    requestFailed: "Request failed",
    rateLimited: "Rate limited",
    providerTimeout: "Request timed out",
    invalidResponse: "Invalid response",
    serverError: "Server error",
    unsupportedMetric: "Unsupported for this market",
    noMarketMovers: "No mover data for this market",
    multipleCurrencies: "Multiple currencies",
    baseQuoteCurrencies: "Base / quote currencies",
    mixedCurrencies: "Mixed currencies",
    notApplicable: "Not applicable",
    selectedMarketInstruments: "Selected-market instruments",
    supportedCategories: "Supported market categories",
    scannedAssets: "Currently scanned assets",
    availableSignals: "Available signals",
    lastUpdatedAt: "Last updated at",
    unavailable: "Unavailable",
    loading: "Loading",
    error: "Unable to load data",
    retry: "Retry",
    viewAll: "View all",
    marketOverview: "Market Overview",
    marketOverviewDesc: "Visual analysis of global markets and active financial hubs.",
    aiTopPicks: "AI Top Picks",
    aiTopPicksDesc: "Opportunities ranked by confidence when real data is available.",
    marketNews: "Market News",
    aiMarketAnalysis: "AI Market Analysis",
    exploreMarkets: "Explore Markets",
    smartWatchlist: "Smart Watchlist",
    smartWatchlistDesc: "Track assets and turn analysis into clear signals.",
    signal: "Signal",
    confidence: "Confidence",
    target: "Target",
    timeframe: "Timeframe",
    risk: "Risk",
    price: "Price",
    change: "Change",
    action: "Action",
    buy: "Buy",
    sell: "Sell",
    hold: "Wait",
    currentPrice: "Current price",
    targetPrice: "Target price",
    stopLoss: "Stop loss",
    aiScore: "AI Score",
    riskNoticeTitle: "Risk notice",
    riskNoticeBody: "All analysis, indicators, and forecasts shown inside SFM Trading Terminal are for educational and informational purposes only and do not constitute investment advice or a financial recommendation. Trading and investing may result in the loss of part or all of your capital.",
    aiNoticeTitle: "AI notice",
    aiNoticeBody: "Some analysis and forecasts are generated using artificial intelligence. Results may contain errors or inaccurate estimates and should not be relied on alone for investment decisions.",
    close: "Close",
    statusBarData: "Data-provider status",
    totalMarkets: "Supported market categories",
    activeAssets: "Scanned assets",
    scans: "Available signals",
    lastUpdate: "Last update",
    systemStatus: "System status",
    noLiveData: "No live data is available right now.",
    noNews: "The news provider is not connected right now.",
    noPortfolio: "No holdings are saved. Fake positions are never shown.",
    noAlerts: "No active alerts right now.",
    routeUnavailable: "This page is ready for real data and does not show fake production values.",
    marketSentiment: "Market sentiment",
    aiConfidence: "AI confidence",
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral",
    profileName: "SFM Trader",
    premium: "Premium",
    add: "Add",
    symbol: "Symbol",
    notes: "Notes",
    language: "Language",
    theme: "Theme",
    currency: "Currency",
    timezone: "Timezone",
    dataRefresh: "Data refresh",
    privacy: "Privacy",
    account: "Account",
    notificationPreferences: "Notification preferences",
    marketPreferences: "Market preferences",
    educational: "Educational",
    support: "Support / About",
    shariaCompliance: "Sharia compliance",
    shariaCompliant: "Sharia compliant",
    shariaNonCompliant: "Non-compliant",
    shariaReviewRequired: "Review required",
    shariaNotApplicable: "Not applicable",
    shariaTooltip: "Sharia classification is indicative and requires periodic review under approved Sharia standards.",
    shariaOnlyFilter: "Sharia-compliant stocks only",
    shariaOnlyFilterNote: "Shows only stocks verified as Sharia compliant.",
    shariaFilterStocksOnly: "This filter applies to stocks only, not forex, commodities, or crypto.",
    noShariaCompliantResults: "No verified Sharia-compliant stocks are available in the current results.",
    clearFilter: "Clear filter",
    shariaStatusFilter: "Sharia status",
    shariaReason: "Classification reason",
    shariaSource: "Classification source",
    shariaStandard: "Methodology",
    shariaLastReview: "Last review",
    shariaOutdated: "Classification is outdated and needs review",
    openDrawer: "Open menu",
    closeDrawer: "Close menu",
  },
  fr: {
    dashboard: "Tableau",
    markets: "Marches",
    forex: "Forex",
    indices: "Indices",
    stocks: "Actions",
    crypto: "Crypto",
    commodities: "Matieres premieres",
    etfs: "ETF",
    aiScanner: "Scanner IA",
    watchlist: "Surveillance",
    portfolio: "Portefeuille",
    alerts: "Alertes",
    news: "Actualites",
    calendar: "Calendrier",
    education: "Education",
    settings: "Parametres",
    searchPlaceholder: "Rechercher un actif, symbole ou marche...",
    aiActive: "AGENT IA ACTIF",
    analyzing: "Analyse 24/7",
    liveData: "Donnees directes",
    delayedData: "Donnees differees",
    connecting: "Connexion",
    operational: "Operationnel",
    scanning: "Scan en cours",
    providerAvailability: "Etat du fournisseur",
    dataFreshness: "Fraicheur des donnees",
    applicationStatus: "Etat application",
    providerConnected: "Fournisseur connecte",
    providerDelayed: "Fournisseur connecte avec donnees differees",
    providerUnavailable: "Fournisseur indisponible",
    unauthorized: "Session expiree",
    accessDenied: "Acces refuse",
    requestFailed: "Echec de la requete",
    rateLimited: "Limite de requetes atteinte",
    providerTimeout: "Delai depasse",
    invalidResponse: "Reponse invalide",
    serverError: "Erreur serveur",
    unsupportedMetric: "Non pris en charge pour ce marche",
    noMarketMovers: "Aucune donnee de mouvement pour ce marche",
    multipleCurrencies: "Devises multiples",
    baseQuoteCurrencies: "Devises base / contrepartie",
    mixedCurrencies: "Devises mixtes",
    notApplicable: "Non applicable",
    selectedMarketInstruments: "Instruments du marche selectionne",
    supportedCategories: "Categories de marche prises en charge",
    scannedAssets: "Actifs scannes",
    availableSignals: "Signaux disponibles",
    lastUpdatedAt: "Derniere mise a jour a",
    unavailable: "Indisponible",
    loading: "Chargement",
    error: "Impossible de charger les donnees",
    retry: "Reessayer",
    viewAll: "Voir tout",
    marketOverview: "Vue globale du marche",
    marketOverviewDesc: "Analyse visuelle des marches mondiaux.",
    aiTopPicks: "Meilleurs choix IA",
    aiTopPicksDesc: "Opportunites classees par confiance quand les donnees existent.",
    marketNews: "Actualites du marche",
    aiMarketAnalysis: "Analyse IA du marche",
    exploreMarkets: "Explorer les marches",
    smartWatchlist: "Liste intelligente",
    smartWatchlistDesc: "Suivez les actifs et transformez l'analyse en signaux.",
    signal: "Signal",
    confidence: "Confiance",
    target: "Objectif",
    timeframe: "Horizon",
    risk: "Risque",
    price: "Prix",
    change: "Variation",
    action: "Action",
    buy: "Acheter",
    sell: "Vendre",
    hold: "Attendre",
    currentPrice: "Prix actuel",
    targetPrice: "Prix cible",
    stopLoss: "Stop loss",
    aiScore: "Score IA",
    riskNoticeTitle: "Avertissement risque",
    riskNoticeBody: "Les analyses et previsions affichees dans SFM Trading Terminal sont informatives et educatives et ne constituent pas un conseil financier.",
    aiNoticeTitle: "Avertissement IA",
    aiNoticeBody: "Certaines analyses sont generees par IA et peuvent contenir des erreurs. Ne les utilisez pas seules pour prendre une decision.",
    close: "Fermer",
    statusBarData: "Etat du fournisseur",
    totalMarkets: "Categories de marche",
    activeAssets: "Actifs scannes",
    scans: "Signaux disponibles",
    lastUpdate: "Derniere mise a jour",
    systemStatus: "Etat systeme",
    noLiveData: "Aucune donnee directe disponible.",
    noNews: "Le fournisseur d'actualites n'est pas connecte.",
    noPortfolio: "Aucune position enregistree.",
    noAlerts: "Aucune alerte active.",
    routeUnavailable: "Cette page est prete pour les donnees reelles.",
    marketSentiment: "Sentiment",
    aiConfidence: "Confiance IA",
    bullish: "Haussier",
    bearish: "Baissier",
    neutral: "Neutre",
    profileName: "SFM Trader",
    premium: "Premium",
    add: "Ajouter",
    symbol: "Symbole",
    notes: "Notes",
    language: "Langue",
    theme: "Theme",
    currency: "Devise",
    timezone: "Fuseau horaire",
    dataRefresh: "Actualisation",
    privacy: "Confidentialite",
    account: "Compte",
    notificationPreferences: "Notifications",
    marketPreferences: "Preferences marche",
    educational: "Educatif",
    support: "Support / A propos",
    shariaCompliance: "Conformite Charia",
    shariaCompliant: "Conforme Charia",
    shariaNonCompliant: "Non conforme",
    shariaReviewRequired: "Revue requise",
    shariaNotApplicable: "Non applicable",
    shariaTooltip: "La classification Charia est indicative et doit etre revue periodiquement.",
    shariaOnlyFilter: "Actions conformes Charia uniquement",
    shariaOnlyFilterNote: "Affiche uniquement les actions verifiees conformes Charia.",
    shariaFilterStocksOnly: "Ce filtre concerne les actions seulement.",
    noShariaCompliantResults: "Aucune action verifiee conforme Charia dans les resultats actuels.",
    clearFilter: "Effacer le filtre",
    shariaStatusFilter: "Statut Charia",
    shariaReason: "Raison",
    shariaSource: "Source",
    shariaStandard: "Methode",
    shariaLastReview: "Derniere revue",
    shariaOutdated: "Classification expiree, revue requise",
    openDrawer: "Ouvrir le menu",
    closeDrawer: "Fermer le menu",
  },
};

const marketCategories = [
  { id: "forex", route: "markets/forex", apiMarket: "forex", labelAr: "الفوركس", labelEn: "Forex", labelFr: "Forex", subtitleAr: "أزواج العملات الرئيسية", subtitleEn: "Major currency pairs", exchange: "FX", countryCode: "FX", currency: "Pairs", icon: "fx", type: "market", symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "NZD/USD", "USD/CAD", "XAU/USD"] },
  { id: "stocks", route: "markets/stocks", apiMarket: "us", labelAr: "الأسهم الأمريكية", labelEn: "US Stocks", labelFr: "Actions US", subtitleAr: "NYSE / NASDAQ", subtitleEn: "NYSE / NASDAQ", exchange: "NYSE / NASDAQ", countryCode: "US", currency: "USD", icon: "us", type: "market", symbols: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD", "QQQ", "SPY"] },
  { id: "crypto", route: "markets/crypto", apiMarket: "crypto", labelAr: "العملات الرقمية", labelEn: "Crypto", labelFr: "Crypto", subtitleAr: "أصول رقمية مقابل الدولار", subtitleEn: "Digital assets", exchange: "Crypto", countryCode: "CRYPTO", currency: "USD", icon: "crypto", type: "market", symbols: ["BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "ADAUSD", "AVAXUSD"] },
  { id: "commodities", route: "markets/commodities", apiMarket: "commodities", labelAr: "السلع", labelEn: "Commodities", labelFr: "Matieres", subtitleAr: "ذهب، فضة، نفط وغاز", subtitleEn: "Metals and energy", exchange: "Commodities", countryCode: "CMDTY", currency: "USD", icon: "gold", type: "market", symbols: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NATGAS", "COPPER"] },
  { id: "saudi", route: "markets/saudi", apiMarket: "saudi", labelAr: "السوق السعودي", labelEn: "Saudi Market", labelFr: "Arabie", subtitleAr: "تداول", subtitleEn: "Tadawul", exchange: "Tadawul", countryCode: "SA", currency: "SAR", icon: "saudi", type: "exchange", symbols: ["2222.SR", "1120.SR", "1180.SR", "7010.SR", "2010.SR", "1211.SR", "7203.SR"] },
  { id: "kuwait", route: "markets/kuwait", apiMarket: "kuwait", labelAr: "بورصة الكويت", labelEn: "Boursa Kuwait", labelFr: "Koweit", subtitleAr: "السوق الكويتي", subtitleEn: "Boursa Kuwait", exchange: "Boursa Kuwait", countryCode: "KW", currency: "KWD", icon: "kuwait", type: "exchange", symbols: ["NBK.KW", "KFH.KW", "ZAIN.KW", "AUB.KW", "GBK.KW", "BOUBYAN.KW", "AGILITY.KW"] },
  { id: "uae", route: "markets/uae", apiMarket: "uae", labelAr: "السوق الإماراتي", labelEn: "UAE Market", labelFr: "EAU", subtitleAr: "ADX / DFM", subtitleEn: "ADX / DFM", exchange: "ADX / DFM", countryCode: "AE", currency: "AED", icon: "uae", type: "exchange", symbols: ["EMAAR.AE", "DIB.AE", "FAB.AD", "EAND.AD", "ADNOCGAS.AD", "DEWA.DU"] },
  { id: "qatar", route: "markets/qatar", apiMarket: "qatar", labelAr: "السوق القطري", labelEn: "Qatar Market", labelFr: "Qatar", subtitleAr: "بورصة قطر", subtitleEn: "QSE", exchange: "QSE", countryCode: "QA", currency: "QAR", icon: "qatar", type: "exchange", symbols: ["QNBK.QA", "IQCD.QA", "MARK.QA", "QIBK.QA", "ORDS.QA"] },
  { id: "bahrain", route: "markets/bahrain", apiMarket: "bahrain", labelAr: "السوق البحريني", labelEn: "Bahrain Market", labelFr: "Bahrein", subtitleAr: "بورصة البحرين", subtitleEn: "BHB", exchange: "BHB", countryCode: "BH", currency: "BHD", icon: "bahrain", type: "exchange", symbols: ["NBB.BH", "ALBH.BH", "BEYON.BH", "SALAM.BH"] },
  { id: "oman", route: "markets/oman", apiMarket: "oman", labelAr: "السوق العماني", labelEn: "Oman Market", labelFr: "Oman", subtitleAr: "بورصة مسقط", subtitleEn: "MSX", exchange: "MSX", countryCode: "OM", currency: "OMR", icon: "oman", type: "exchange", symbols: ["BKMB.OM", "OMANTEL.OM", "NBO.OM", "OMINVEST.OM"] },
  { id: "europe", route: "markets/europe", apiMarket: "europe", labelAr: "الأسهم الأوروبية", labelEn: "European Stocks", labelFr: "Europe", subtitleAr: "أسواق الاتحاد الأوروبي والمملكة المتحدة", subtitleEn: "European equities", exchange: "EU Stocks", countryCode: "EU", currency: "EUR", icon: "europe", type: "market", symbols: ["ASML", "SAP", "SHEL", "TTE", "LVMH", "SIE.DE", "AIR.PA", "NESN.SW"] },
  { id: "asia", route: "markets/asia", apiMarket: "asia", labelAr: "الأسهم الآسيوية", labelEn: "Asian Stocks", labelFr: "Asie", subtitleAr: "آسيا والمحيط الهادئ", subtitleEn: "Asia Pacific", exchange: "Asia Markets", countryCode: "ASIA", currency: "Mixed", icon: "asia", type: "market", symbols: ["TSM", "BABA", "TCEHY", "SONY", "TM", "005930.KS", "9988.HK"] },
  { id: "indices", route: "markets/indices", apiMarket: "indices", labelAr: "المؤشرات العالمية", labelEn: "Global Indices", labelFr: "Indices", subtitleAr: "مؤشرات عالمية", subtitleEn: "Global indices", exchange: "Indices", countryCode: "INDEX", currency: "USD", icon: "indices", type: "category", symbols: ["SPY", "QQQ", "DIA", "IWM", "VTI"] },
  { id: "etfs", route: "markets/etfs", apiMarket: "etfs", labelAr: "الصناديق المتداولة", labelEn: "ETFs", labelFr: "ETF", subtitleAr: "صناديق مؤشرات متداولة", subtitleEn: "Exchange traded funds", exchange: "ETFs", countryCode: "US", currency: "USD", icon: "etf", type: "category", symbols: ["SPY", "QQQ", "VTI", "VOO", "GLD", "SLV"] },
  { id: "ai", route: "markets/ai", apiMarket: "ai", labelAr: "أسهم الذكاء الاصطناعي", labelEn: "AI Stocks", labelFr: "IA", subtitleAr: "شركات الذكاء الاصطناعي", subtitleEn: "AI leaders", exchange: "AI Category", countryCode: "US", currency: "USD", icon: "ai", type: "theme", symbols: ["NVDA", "MSFT", "GOOGL", "AMD", "PLTR", "META", "AVGO", "ORCL"] },
  { id: "tech", route: "markets/tech", apiMarket: "tech", labelAr: "أسهم التكنولوجيا", labelEn: "Technology Stocks", labelFr: "Technologie", subtitleAr: "شركات التقنية الكبرى", subtitleEn: "Technology leaders", exchange: "Tech Category", countryCode: "US", currency: "USD", icon: "chip", type: "theme", symbols: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMD", "INTC", "ORCL", "CRM", "AVGO"] },
  { id: "energy", route: "markets/energy", apiMarket: "energy", labelAr: "أسهم الطاقة", labelEn: "Energy Stocks", labelFr: "Energie", subtitleAr: "نفط وطاقة", subtitleEn: "Energy and oil", exchange: "Energy Category", countryCode: "US", currency: "USD", icon: "energy", type: "theme", symbols: ["XOM", "CVX", "COP", "SLB", "BP", "SHEL", "TTE"] },
  { id: "defensive", route: "markets/defensive", apiMarket: "defensive", labelAr: "الأسهم الدفاعية", labelEn: "Defensive Stocks", labelFr: "Defensives", subtitleAr: "شركات مستقرة ودفاعية", subtitleEn: "Defensive equities", exchange: "Defensive Category", countryCode: "US", currency: "USD", icon: "shield", type: "theme", symbols: ["PG", "KO", "PEP", "WMT", "COST", "JNJ", "MRK"] },
  { id: "dividends", route: "markets/dividends", apiMarket: "dividends", labelAr: "أسهم التوزيعات", labelEn: "Dividend Stocks", labelFr: "Dividendes", subtitleAr: "شركات توزيعات أرباح", subtitleEn: "Dividend payers", exchange: "Dividend Category", countryCode: "US", currency: "USD", icon: "dividend", type: "theme", symbols: ["JPM", "KO", "PEP", "PG", "JNJ", "XOM", "CVX"] },
  { id: "semiconductors", route: "markets/semiconductors", apiMarket: "semiconductors", labelAr: "أشباه الموصلات", labelEn: "Semiconductors", labelFr: "Semi-conducteurs", subtitleAr: "شركات الرقائق", subtitleEn: "Chip makers", exchange: "Semiconductors", countryCode: "SEMI", currency: "USD", icon: "semi", type: "theme", symbols: ["NVDA", "AMD", "INTC", "AVGO", "TSM", "QCOM", "ASML", "MU"] },
  { id: "food", route: "markets/food", apiMarket: "food", labelAr: "الأسهم الغذائية", labelEn: "Food / Staples", labelFr: "Consommation", subtitleAr: "الأغذية والسلع الاستهلاكية", subtitleEn: "Consumer staples", exchange: "Staples Category", countryCode: "US", currency: "USD", icon: "food", type: "theme", symbols: ["KO", "PEP", "MCD", "COST", "WMT", "PG", "MDLZ", "KHC", "SBUX"] },
  { id: "healthcare", route: "markets/healthcare", apiMarket: "healthcare", labelAr: "الأسهم الدوائية", labelEn: "Healthcare / Pharma", labelFr: "Sante", subtitleAr: "الصحة والدواء", subtitleEn: "Healthcare and pharma", exchange: "Healthcare Category", countryCode: "HLTH", currency: "USD", icon: "health", type: "theme", symbols: ["LLY", "JNJ", "PFE", "MRK", "ABBV", "NVO", "UNH", "AMGN"] },
  { id: "banking", route: "markets/banking", apiMarket: "banking", labelAr: "أسهم البنوك", labelEn: "Banking Stocks", labelFr: "Banques", subtitleAr: "البنوك والخدمات المالية", subtitleEn: "Banks and financials", exchange: "Banking Category", countryCode: "BANK", currency: "USD", icon: "bank", type: "theme", symbols: ["JPM", "BAC", "WFC", "C", "GS", "MS", "HSBC"] },
];

const sidebarItems = [
  { id: "dashboard", route: "dashboard", labelKey: "dashboard", icon: "dashboard" },
  {
    id: "markets",
    route: "markets",
    labelKey: "markets",
    icon: "markets",
    children: [
      { id: "forex", route: "markets/forex", labelKey: "forex" },
      { id: "indices", route: "markets/indices", labelKey: "indices" },
      { id: "stocks", route: "markets/stocks", labelKey: "stocks" },
      { id: "crypto", route: "markets/crypto", labelKey: "crypto" },
      { id: "commodities", route: "markets/commodities", labelKey: "commodities" },
      { id: "etfs", route: "markets/etfs", labelKey: "etfs" },
    ],
  },
  { id: "ai-scanner", route: "ai-scanner", labelKey: "aiScanner", icon: "scanner" },
  { id: "watchlist", route: "watchlist", labelKey: "watchlist", icon: "watchlist" },
  { id: "portfolio", route: "portfolio", labelKey: "portfolio", icon: "portfolio" },
  { id: "alerts", route: "alerts", labelKey: "alerts", icon: "alerts" },
  { id: "news", route: "news", labelKey: "news", icon: "news" },
  { id: "calendar", route: "calendar", labelKey: "calendar", icon: "calendar" },
  { id: "education", route: "education", labelKey: "education", icon: "education" },
  { id: "settings", route: "settings", labelKey: "settings", icon: "settings" },
];

const routeMeta = {
  dashboard: { title: "THE-SFM Trader", pageKey: "dashboard" },
  markets: { title: "Markets", pageKey: "markets" },
  "markets/forex": { title: "Forex", pageKey: "forex", marketId: "forex" },
  "markets/indices": { title: "Indices", pageKey: "indices", marketId: "indices" },
  "markets/stocks": { title: "Stocks", pageKey: "stocks", marketId: "us" },
  "markets/crypto": { title: "Crypto", pageKey: "crypto", marketId: "crypto" },
  "markets/commodities": { title: "Commodities", pageKey: "commodities", marketId: "commodities" },
  "markets/etfs": { title: "ETFs", pageKey: "etfs", marketId: "etfs" },
  "ai-scanner": { title: "AI Scanner", pageKey: "aiScanner" },
  watchlist: { title: "Watchlist", pageKey: "watchlist" },
  portfolio: { title: "Portfolio", pageKey: "portfolio" },
  alerts: { title: "Alerts", pageKey: "alerts" },
  news: { title: "News", pageKey: "news" },
  calendar: { title: "Calendar", pageKey: "calendar" },
  education: { title: "Education", pageKey: "education" },
  settings: { title: "Settings", pageKey: "settings" },
};

marketCategories.forEach((market) => {
  routeMeta[market.route] = {
    title: market.labelEn,
    pageKey: "markets",
    marketId: market.apiMarket,
    marketCategoryId: market.id,
  };
});

const DEPRECATED_MARKET_IDS = new Set(["gcc", "gulf", "gulf-markets", "mixed_gcc", "mixed-gcc"]);
const DEPRECATED_MARKET_ROUTES = new Set(["markets/gcc", "markets/gulf", "markets/gulf-markets", "markets/mixed-gcc"]);
const initialSearchParams = new URLSearchParams(location.search);
const initialSettings = sanitizeSettings(loadSettings());

const state = {
  route: normalizeRoute(initialSearchParams.get("route") || "dashboard"),
  language: initialSettings.language || "ar",
  selectedMarketId: initialSettings.selectedMarketId || "stocks",
  shariaOnly: initialSearchParams.get("sharia") === "compliant",
  drawerOpen: false,
  marketsOpen: initialSettings.marketsOpen ?? true,
  data: {
    markets: [],
    recommendations: [],
    dashboardRecommendations: [],
    scannerStatus: null,
    scannerSummary: null,
    usStocks: null,
    scannerFilters: { signalType: "all", minimumConfidence: "0", riskLevel: "all", timeHorizon: "all", sharia_status: initialSearchParams.get("sharia") === "compliant" ? "compliant" : "all" },
    errors: {},
    loadedAt: null,
  },
};

function t(key) {
  return i18n[state.language]?.[key] || i18n.en[key] || key;
}

function isRtl() {
  return state.language === "ar";
}

function localMarketLabel(market) {
  if (state.language === "ar") return market.labelAr;
  if (state.language === "fr") return market.labelFr || market.labelEn;
  return market.labelEn;
}

function localMarketSubtitle(market) {
  if (state.language === "ar") return market.subtitleAr;
  return market.subtitleEn;
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function sanitizeSettings(settings = {}) {
  const next = { ...settings };
  if (DEPRECATED_MARKET_IDS.has(String(next.selectedMarketId || "").toLowerCase())) {
    next.selectedMarketId = "stocks";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function saveSettings(patch) {
  const next = sanitizeSettings({ ...loadSettings(), ...patch });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeRoute(value) {
  const clean = String(value || "dashboard")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^thesfm-trader-own\/?/, "")
    .replace(/^app\/?/, "");
  if (DEPRECATED_MARKET_ROUTES.has(clean)) return "markets";
  return routeMeta[clean] ? clean : "dashboard";
}

function publicHref(route) {
  return route === "dashboard" ? APP_BASE : `${APP_BASE}/${route}`;
}

function apiMarketForRoute(route) {
  return routeMeta[route]?.marketId || "us";
}

function marketById(id) {
  return marketCategories.find((market) => market.id === id) || marketCategories.find((market) => market.id === "stocks") || marketCategories[0];
}

function marketForCurrentRoute() {
  const routeMarketId = routeMeta[state.route]?.marketCategoryId;
  if (routeMarketId) return marketById(routeMarketId);
  return marketById(state.selectedMarketId);
}

const TRADER_API_PREFIX = ["", "api", "trader"].join("/");

function traderApi(path) {
  return `${TRADER_API_PREFIX}/${String(path || "").replace(/^\/+/, "")}`;
}

function setLanguage(language) {
  state.language = ["ar", "en", "fr"].includes(language) ? language : "ar";
  saveSettings({ language: state.language });
  applyDocumentLanguage();
  render();
}

function applyDocumentLanguage() {
  document.documentElement.lang = state.language;
  document.documentElement.dir = isRtl() ? "rtl" : "ltr";
  document.body.dataset.lang = state.language;
}

function icon(name) {
  const paths = {
    dashboard: '<path d="M3 11 12 3l9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
    markets: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a13 13 0 0 1 0 18"></path><path d="M12 3a13 13 0 0 0 0 18"></path>',
    scanner: '<path d="M4 17h16"></path><path d="m7 14 3-4 3 3 4-7"></path><path d="M4 20h16"></path>',
    watchlist: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"></path>',
    portfolio: '<path d="M4 7h16v13H4Z"></path><path d="M8 7V5h8v2"></path><path d="M4 12h16"></path>',
    alerts: '<path d="M18 9a6 6 0 1 0-12 0v4l-2 3h16l-2-3Z"></path><path d="M10 19a2 2 0 0 0 4 0"></path>',
    news: '<path d="M4 19a2 2 0 0 0 2 2h14V5H6a2 2 0 0 0-2 2v12Z"></path><path d="M8 9h8"></path><path d="M8 13h8"></path><path d="M8 17h5"></path>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M8 2v4"></path><path d="M16 2v4"></path><path d="M3 10h18"></path>',
    education: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-1.5Z"></path><path d="M8 7h7"></path><path d="M8 11h7"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2 3.4a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5h-4a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-2-3.4a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.3-1.2v-4a1.7 1.7 0 0 0 1.3-1.2 1.7 1.7 0 0 0-.3-1.9l2-3.4a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5h4a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l2 3.4a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.3 1.2v4a1.7 1.7 0 0 0-1.3 1.2Z"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0v4l-2 3h16l-2-3Z"></path><path d="M10 19a2 2 0 0 0 4 0"></path>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"></path>',
    menu: '<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>',
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || paths.dashboard}</svg>`;
}

function marketIcon(kind) {
  const label = {
    fx: "$",
    us: "🇺🇸",
    crypto: "₿",
    gold: "Au",
    saudi: "🇸🇦",
    kuwait: "🇰🇼",
    uae: "🇦🇪",
    qatar: "🇶🇦",
    bahrain: "🇧🇭",
    oman: "🇴🇲",
    europe: "🇪🇺",
    asia: "🌐",
    chip: "CPU",
    food: "●",
    health: "+",
    bank: "▥",
    energy: "◆",
    ai: "AI",
    semi: "▦",
    indices: "↗",
    etf: "ETF",
    shield: "◈",
    dividend: "%",
  }[kind] || "●";
  return `<span class="market-icon market-icon-${kind}" aria-hidden="true">${label}</span>`;
}

function assetLogo(item = {}) {
  const raw = String(item.symbol || item.name || "").toUpperCase();
  const symbol = raw.replace(/[^A-Z0-9]/g, "");
  const exact = [
    ["AAPL", "apple", ""],
    ["GOOGL", "google", "G"],
    ["GOOG", "google", "G"],
    ["MSFT", "microsoft", "▦"],
    ["NVDA", "nvidia", "NV"],
    ["AMZN", "amazon", "a"],
    ["META", "meta", "∞"],
    ["TSLA", "tesla", "T"],
    ["AMD", "amd", "AMD"],
    ["INTC", "intel", "intel"],
    ["NFLX", "netflix", "N"],
    ["BTC", "bitcoin", "₿"],
    ["ETH", "ethereum", "Ξ"],
    ["BNB", "bnb", "BNB"],
    ["XAU", "gold", "Au"],
    ["XAG", "silver", "Ag"],
    ["USOIL", "oil", "Oil"],
    ["UKOIL", "oil", "Oil"],
  ];
  const match = exact.find(([needle]) => symbol.includes(needle));
  if (match) return `<span class="asset-logo asset-logo-${match[1]}" aria-hidden="true">${match[2]}</span>`;
  if (raw.includes(".KW")) return '<span class="asset-logo asset-logo-kuwait" aria-hidden="true">KW</span>';
  if (raw.includes(".SR")) return '<span class="asset-logo asset-logo-saudi" aria-hidden="true">SA</span>';
  return `<span class="asset-logo asset-logo-default" aria-hidden="true">${escapeHtml((symbol || "S").slice(0, 2))}</span>`;
}

function money(value, currency = "USD") {
  const numeric = Number(value);
  const safeCurrency = normalizeCurrency(currency);
  if (!Number.isFinite(numeric)) return t("unavailable");
  return `${formatNumber(numeric, numeric > 99 ? 2 : 4)} ${safeCurrency}`.trim();
}

function normalizeCurrency(currency) {
  const value = String(currency || "").toUpperCase();
  if (value === "KWF") return "KWD";
  return value || "";
}

function marketCurrencyDisplay(market) {
  const currency = normalizeCurrency(market?.currency);
  if (!currency) return t("notApplicable");
  if (currency === "PAIRS") return t("multipleCurrencies");
  if (currency === "MIXED") return t("mixedCurrencies");
  return currency;
}

function marketCurrencyNote(market) {
  const currency = normalizeCurrency(market?.currency);
  if (currency === "PAIRS") return t("baseQuoteCurrencies");
  if (currency === "MIXED") return market?.countryCode || t("mixedCurrencies");
  return market?.countryCode || market?.exchange || t("notApplicable");
}

const SHARIA_STOCK_MARKET_IDS = new Set([
  "stocks",
  "us",
  "saudi",
  "kuwait",
  "uae",
  "qatar",
  "bahrain",
  "oman",
  "europe",
  "asia",
  "tech",
  "ai",
  "energy",
  "defensive",
  "dividends",
  "semiconductors",
  "food",
  "healthcare",
  "banking",
]);

const SHARIA_NON_STOCK_SYMBOLS = new Set([
  "SPY",
  "QQQ",
  "DIA",
  "IWM",
  "VTI",
  "VOO",
  "GLD",
  "SLV",
]);

function symbolKey(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isStockLikeInstrument(item = {}, market) {
  const record = typeof item === "string" ? { symbol: item } : (item || {});
  const rawSymbol = String(record.symbol || record.providerSymbol || record.ticker || "").trim().toUpperCase();
  const key = symbolKey(rawSymbol);
  const explicitType = String(record.assetType || record.type || record.kind || record.category || "").toLowerCase();
  const marketId = String(market?.id || market?.apiMarket || record.market || "").toLowerCase();

  if (!rawSymbol && !key) return false;
  if (/forex|fx|crypto|commodity|commodit|index|indice|etf|fund|future/.test(explicitType)) return false;
  if (SHARIA_NON_STOCK_SYMBOLS.has(key)) return false;
  if (/^(BTC|ETH|BNB|SOL|XRP|ADA|AVAX)/.test(key)) return false;
  if (/^(XAU|XAG|USOIL|UKOIL|NATGAS|COPPER|GOLD|SILVER)/.test(key)) return false;
  if (rawSymbol.includes("/") || /^(EURUSD|GBPUSD|USDJPY|USDCHF|AUDUSD|NZDUSD|USDCAD|EURJPY|EURGBP|GBPJPY)$/.test(key)) return false;
  if (SHARIA_STOCK_MARKET_IDS.has(marketId)) return true;
  if (/\.(KW|SR|AE|AD|DU|QA|BH|OM|DE|PA|SW|KS|HK)$/.test(rawSymbol)) return true;
  return /^[A-Z]{1,5}$/.test(key);
}

const SHARIA_REASON_LABELS = {
  prohibited_business_activity: { ar: "نشاط رئيسي غير متوافق", en: "Core business activity is not compliant", fr: "Activite principale non conforme" },
  financial_ratio_threshold: { ar: "تجاوز النسب المالية المعتمدة", en: "Approved financial ratios were exceeded", fr: "Ratios financiers depasses" },
  interest_bearing_debt_threshold: { ar: "ارتفاع الديون ذات الفائدة", en: "Interest-bearing debt threshold exceeded", fr: "Dette portant interet elevee" },
  non_permissible_income_threshold: { ar: "تجاوز نسبة الإيرادات غير المتوافقة", en: "Non-permissible income threshold exceeded", fr: "Revenus non conformes eleves" },
  insufficient_financial_data: { ar: "بيانات غير مكتملة", en: "Incomplete financial data", fr: "Donnees financieres incompletes" },
  classification_expired: { ar: "التصنيف قديم ويحتاج إلى تحديث", en: "Classification is outdated and needs review", fr: "Classification expiree" },
  source_unavailable: { ar: "المصدر غير متاح", en: "Source unavailable", fr: "Source indisponible" },
  conflicting_sources: { ar: "توجد نتائج متعارضة", en: "Conflicting source results", fr: "Sources contradictoires" },
  not_yet_reviewed: { ar: "لا يوجد تصنيف موثق", en: "No verified classification is available", fr: "Aucune classification verifiee" },
  other_verified_reason: { ar: "سبب آخر موثق", en: "Other verified reason", fr: "Autre raison verifiee" },
};

function normalizeShariaStatus(value, item, market) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["compliant", "sharia_compliant", "halal", "approved"].includes(raw)) return "compliant";
  if (["non_compliant", "not_compliant", "noncompliant", "haram", "rejected"].includes(raw)) return "non_compliant";
  if (["unsupported", "not_applicable", "na", "n_a"].includes(raw)) return "unsupported";
  if (["review_required", "requires_review", "needs_review", "review", "doubtful", "unknown", "unclassified", ""].includes(raw)) {
    return isStockLikeInstrument(item, market) ? "review_required" : null;
  }
  return isStockLikeInstrument(item, market) ? "review_required" : null;
}

function shariaReasonLabel(code, fallback) {
  if (fallback) return localizeDetailish(fallback);
  const labels = SHARIA_REASON_LABELS[code] || SHARIA_REASON_LABELS.not_yet_reviewed;
  return labels[state.language] || labels.en;
}

function localizeDetailish(value) {
  if (!value) return "";
  if (typeof value === "object") {
    return value[state.language] || value.en || value.ar || "";
  }
  return String(value);
}

function isShariaExpired(record) {
  const validUntil = record.valid_until || record.validUntil;
  if (validUntil) {
    const date = new Date(validUntil);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return true;
  }
  const reviewedAt = record.reviewed_at || record.reviewedAt || record.reviewed || record.shariaCheckedAt;
  if (reviewedAt) {
    const date = new Date(reviewedAt);
    if (!Number.isNaN(date.getTime())) {
      return Date.now() - date.getTime() > 365 * 24 * 60 * 60 * 1000;
    }
  }
  return false;
}

function normalizeShariaClassification(item, market) {
  const record = typeof item === "string" ? { symbol: item } : (item || {});
  const structured = record.sharia && typeof record.sharia === "object" ? record.sharia : null;
  const stockLike = isStockLikeInstrument(record, market);
  const status = normalizeShariaStatus(
    structured?.status ?? record.shariaStatus ?? record.sharia_status ?? record.sharia_compliance ?? record.shariaCompliance,
    record,
    market,
  );
  if (!status && !stockLike) return null;

  const base = {
    status: status || "review_required",
    reasonCode: structured?.reason_code || record.shariaReasonCode || record.reason_code || (stockLike ? "not_yet_reviewed" : null),
    reasonAr: structured?.reason_ar || record.shariaReasonAr || record.reason_ar || "",
    source: structured?.source || record.shariaSource || record.source || "",
    standard: structured?.standard || record.shariaStandard || record.standard || "",
    reviewedAt: structured?.reviewed_at || record.shariaCheckedAt || record.reviewed_at || "",
    validUntil: structured?.valid_until || record.valid_until || "",
  };
  const expired = base.status === "compliant" && isShariaExpired(structured || record);
  if (expired) {
    return { ...base, effectiveStatus: "review_required", expired: true, reasonCode: "classification_expired", reasonAr: "" };
  }
  return { ...base, effectiveStatus: base.status, expired: false };
}

function shariaStatusFor(item, market) {
  return normalizeShariaClassification(item, market)?.effectiveStatus || null;
}

function renderShariaBadge(item, market) {
  const classification = normalizeShariaClassification(item, market);
  const status = classification?.effectiveStatus;
  if (!status) return "";
  const labelKey = status === "compliant"
    ? "shariaCompliant"
    : status === "non_compliant"
      ? "shariaNonCompliant"
      : status === "unsupported"
        ? "shariaNotApplicable"
        : "shariaReviewRequired";
  const reason = shariaReasonLabel(classification.reasonCode, classification.reasonAr);
  const title = [t("shariaTooltip"), reason, classification.source].filter(Boolean).join(" · ");
  return `<span class="sharia-badge ${status}${classification.expired ? " expired" : ""}" title="${escapeHtml(title)}"><span class="sr-only">${escapeHtml(t("shariaCompliance"))}: </span>${escapeHtml(t(labelKey))}</span>`;
}

function formatStatusTimestamp(value) {
  if (!value) return t("unavailable");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("unavailable");
  const time = date.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" });
  const datePart = date.toLocaleDateString("en-CA", { timeZone: "UTC" });
  return `${t("lastUpdatedAt")} ${datePart} ${time} UTC`;
}

function requestErrorInfo(error) {
  const code = String(error || "").toLowerCase();
  if (code.includes("unauth") || code.includes("401")) {
    return { key: "unauthorized", label: t("unauthorized"), note: t("retry") };
  }
  if (code.includes("denied") || code.includes("forbidden") || code.includes("403")) {
    return { key: "unauthorized", label: t("accessDenied"), note: t("retry") };
  }
  if (code.includes("429") || code.includes("rate")) {
    return { key: "provider_unavailable", label: t("rateLimited"), note: t("retry") };
  }
  if (code.includes("timeout")) {
    return { key: "provider_unavailable", label: t("providerTimeout"), note: t("retry") };
  }
  if (code.includes("invalid_response") || code.includes("empty_response")) {
    return { key: "error", label: t("invalidResponse"), note: t("retry") };
  }
  if (code.includes("500") || code.includes("server")) {
    return { key: "error", label: t("serverError"), note: t("retry") };
  }
  return { key: "error", label: t("requestFailed"), note: t("retry") };
}

function providerStatusInfo() {
  const status = state.data.scannerStatus?.marketData;
  if (state.data.errors.status) {
    return requestErrorInfo(state.data.errors.status);
  }
  if (!status) {
    return { key: "loading", label: t("loading"), note: t("connecting") };
  }
  if (!status.configured || !status.connected) {
    return { key: "provider_unavailable", label: t("providerUnavailable"), note: status.provider || t("unavailable") };
  }
  if (status.delayed) {
    return { key: "delayed", label: t("delayedData"), note: t("providerDelayed") };
  }
  return { key: "success", label: t("liveData"), note: t("providerConnected") };
}

function marketAnalysisState(market, recs = []) {
  if (!isUsBackedMarket(market)) {
    return { key: "unsupported", label: t("unsupportedMetric"), note: marketCopy("noProviderMarket") };
  }
  if (state.data.errors.route || state.data.errors.dashboard) {
    return requestErrorInfo(state.data.errors.route || state.data.errors.dashboard);
  }
  if (!state.data.loadedAt && !recs.length) {
    return { key: "loading", label: t("loading"), note: t("connecting") };
  }
  if (!recs.length) {
    return { key: "empty", label: t("unavailable"), note: t("noLiveData") };
  }
  return { key: "success", label: `${recs.length} ${t("availableSignals")}`, note: formatStatusTimestamp(state.data.loadedAt) };
}

function marketMoversState(market, recs, direction) {
  if (!isUsBackedMarket(market)) {
    return { key: "unsupported", value: t("unsupportedMetric"), note: t("noMarketMovers") };
  }
  if (state.data.errors.route || state.data.errors.dashboard) {
    const info = requestErrorInfo(state.data.errors.route || state.data.errors.dashboard);
    return { key: info.key, value: info.label, note: info.note };
  }
  if (!recs.length) {
    return { key: "empty", value: 0, note: t("noLiveData") };
  }
  const count = recs.filter((item) => {
    const value = Number(item.expectedMovePct ?? item.changePct);
    return Number.isFinite(value) && (direction === "up" ? value > 0 : value < 0);
  }).length;
  return { key: "success", value: count, note: `${t("selectedMarketInstruments")}: ${recs.length}` };
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: number < 10 && digits > 0 ? Math.min(2, digits) : 0 });
}

function pct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${number >= 0 ? "+" : ""}${formatNumber(number, 2)}%`;
}

function actionOf(item) {
  const action = String(item.action || item.signal || "").toLowerCase();
  if (action.includes("buy") || action.includes("شراء")) return "buy";
  if (action.includes("sell") || action.includes("بيع")) return "sell";
  return "hold";
}

function actionLabel(action) {
  if (action === "buy") return t("buy");
  if (action === "sell") return t("sell");
  return t("hold");
}

function routeTitle(route = state.route) {
  return t(routeMeta[route]?.pageKey || "dashboard");
}

function render() {
  applyDocumentLanguage();
  root.innerHTML = `
    <div class="terminal-shell ${state.drawerOpen ? "drawer-open" : ""}">
      ${renderSidebar()}
      <div class="terminal-main">
        ${renderTopbar()}
        <div class="terminal-page" data-route="${escapeHtml(state.route)}">
          ${renderRoute()}
        </div>
        ${renderStatusBar()}
      </div>
    </div>
  `;
  bindEvents();
}

function renderSidebar() {
  return `
    <aside class="terminal-sidebar" aria-label="${escapeHtml(t("markets"))}">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"><i></i><b></b></span>
        <div>
          <strong>THE-SFM</strong>
          <span>TRADER</span>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="Terminal navigation">
        ${sidebarItems.map(renderSidebarItem).join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="ai-pro-card">
          <span class="ai-pro-orb"></span>
          <strong>AI PRO</strong>
          <small>${t("routeUnavailable")}</small>
        </div>
        <div class="user-mini">
          <span class="avatar">S</span>
          <div>
            <strong>${t("profileName")}</strong>
            <small>${t("premium")}</small>
          </div>
        </div>
      </div>
    </aside>
    <button class="drawer-scrim" type="button" data-close-drawer aria-label="${escapeHtml(t("closeDrawer"))}"></button>
  `;
}

function renderSidebarItem(item) {
  const active = isRouteActive(item.route);
  const hasChildren = Array.isArray(item.children);
  return `
    <div class="nav-group ${hasChildren && state.marketsOpen ? "is-open" : ""}">
      <a class="nav-item ${active ? "active" : ""}" href="${publicHref(item.route)}" target="_top" aria-current="${active ? "page" : "false"}">
        <span>${icon(item.icon || item.id)}</span>
        <strong>${t(item.labelKey)}</strong>
        ${hasChildren ? `<button class="nav-expand" type="button" data-toggle-markets aria-label="${t("markets")}">⌄</button>` : ""}
      </a>
      ${hasChildren ? `<div class="nav-sub">${item.children.map((child) => `
        <a class="nav-sub-item ${isRouteActive(child.route) ? "active" : ""}" href="${publicHref(child.route)}" target="_top">${t(child.labelKey)}</a>
      `).join("")}</div>` : ""}
    </div>
  `;
}

function isRouteActive(route) {
  if (route === "dashboard") return state.route === "dashboard";
  return state.route === route || state.route.startsWith(`${route}/`);
}

function renderTopbar() {
  const now = new Date();
  return `
    <header class="terminal-topbar">
      <button class="mobile-menu-button" type="button" data-open-drawer aria-label="${escapeHtml(t("openDrawer"))}">${icon("menu")}</button>
      <form class="asset-search" role="search">
        ${icon("search")}
        <input type="search" placeholder="${escapeHtml(t("searchPlaceholder"))}" aria-label="${escapeHtml(t("searchPlaceholder"))}" />
        <kbd>Ctrl K</kbd>
      </form>
      <div class="topbar-spacer"></div>
      <div class="agent-status">
        <span class="status-orb"></span>
        <div><strong>${t("aiActive")}</strong><small>${t("analyzing")}</small></div>
      </div>
      <div class="time-card">
        <strong>${now.toLocaleTimeString("en-US", { hour12: false })}</strong>
        <small>${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}</small>
      </div>
      <button class="top-icon" type="button" aria-label="${escapeHtml(t("alerts"))}">${icon("bell")}<span>0</span></button>
      <button class="top-icon" type="button" aria-label="Favorites">${icon("star")}</button>
      <div class="language-switch" role="group" aria-label="${escapeHtml(t("language"))}">
        ${["ar", "en", "fr"].map((language) => `<button class="${state.language === language ? "active" : ""}" type="button" data-language="${language}">${language.toUpperCase()}</button>`).join("")}
      </div>
    </header>
  `;
}

function renderRoute() {
  if (state.route === "dashboard") return renderDashboard();
  if (state.route.startsWith("markets/")) return renderMarketPage(routeMeta[state.route]?.marketId || "us");
  if (state.route === "markets") return renderMarketsOverviewPage();
  if (state.route === "ai-scanner") return renderAiScannerPage();
  if (state.route === "watchlist") return renderWatchlistPage();
  if (state.route === "portfolio") return renderPortfolioPage();
  if (state.route === "alerts") return renderAlertsPage();
  if (state.route === "news") return renderNewsPage();
  if (state.route === "calendar") return renderCalendarPage();
  if (state.route === "education") return renderEducationPage();
  if (state.route === "settings") return renderSettingsPage();
  return renderDashboard();
}

function renderDashboard() {
  const recs = state.data.dashboardRecommendations;
  return `
    ${renderTickerStrip(recs)}
    <div class="dashboard-grid">
      <section class="dashboard-primary">
        ${renderMarketOverview()}
        ${renderExploreMarkets()}
        ${renderSmartWatchlist(recs)}
      </section>
      <aside class="dashboard-aside">
        ${renderAiTopPicks(recs)}
        ${renderMarketNewsCard()}
        ${renderAiMarketAnalysis(recs)}
      </aside>
    </div>
    ${renderTemporaryLegalNotices()}
  `;
}

function renderTickerStrip(recs = []) {
  const fallback = [
    { name: "S&P 500", symbol: "SPY" },
    { name: "NASDAQ 100", symbol: "QQQ" },
    { name: "Dow Jones", symbol: "DIA" },
    { name: "Gold", symbol: "XAUUSD" },
    { name: "Oil", symbol: "USOIL" },
    { name: "BTC/USD", symbol: "BTCUSD" },
  ];
  const cards = fallback.map((asset) => {
    const item = findBySymbol(recs, asset.symbol);
    const change = item ? Number(item.expectedMovePct ?? item.changePct ?? 0) : null;
    return `
      <article class="ticker-card ${change === null ? "is-unavailable" : change >= 0 ? "is-up" : "is-down"}">
        <div><strong>${asset.name}</strong><span>${item ? pct(change) : t("unavailable")}</span></div>
        <b>${item ? money(item.currentPrice, item.currency) : "--"}</b>
        ${sparkline(change ?? 0)}
      </article>
    `;
  }).join("");
  return `<section class="ticker-strip" aria-label="Market ticker">${cards}</section>`;
}

function renderMarketOverview() {
  return `
    <section class="terminal-card market-overview-card">
      <div class="section-header">
        <div>
          <h1>${t("marketOverview")}</h1>
          <p>${t("marketOverviewDesc")}</p>
        </div>
        <div class="timeframe-tabs" aria-label="Timeframes">
          ${["1D", "1W", "1M", "1Y", "ALL"].map((item, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${item}</button>`).join("")}
        </div>
      </div>
      <div class="world-map-panel">
        <svg class="world-map-svg" viewBox="0 0 980 360" role="img" aria-label="${escapeHtml(t("marketOverview"))}">
          <defs>
            <filter id="hubGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <path class="map-land" d="M105 143c54-44 110-42 169-20 45 17 75-5 117-13 68-12 115 28 174 37 76 12 126-41 197-11 55 23 82 72 138 73v76H105Z"></path>
          <path class="map-line" d="M105 190C224 96 342 212 480 142s224-43 385 35"></path>
          <path class="map-line amber" d="M148 262c156-47 255-19 362-67 116-52 202 6 344 47"></path>
          ${[
            ["New York", 245, 145, "+/-"],
            ["London", 455, 126, "+/-"],
            ["Frankfurt", 492, 137, "+/-"],
            ["Kuwait", 575, 184, "+/-"],
            ["Riyadh", 592, 210, "+/-"],
            ["Dubai", 628, 215, "+/-"],
            ["Tokyo", 805, 172, "+/-"],
            ["Hong Kong", 765, 210, "+/-"],
            ["Sydney", 842, 282, "+/-"],
          ].map(([label, x, y, value]) => `
            <g class="market-hub" filter="url(#hubGlow)">
              <circle cx="${x}" cy="${y}" r="5"></circle>
              <foreignObject x="${Number(x) + 10}" y="${Number(y) - 20}" width="130" height="44">
                <div class="hub-label"><strong>${label}</strong><span>${value}</span></div>
              </foreignObject>
            </g>
          `).join("")}
        </svg>
        <div class="sentiment-stack">
          <div><span>${t("marketSentiment")}</span><strong>${deriveBiasLabel()}</strong><em>${deriveAverageConfidence()}%</em></div>
          <div><span>${t("aiConfidence")}</span><strong>${deriveAverageConfidence() ? "HIGH" : t("unavailable")}</strong><em>${deriveAverageConfidence()}%</em></div>
        </div>
      </div>
    </section>
  `;
}

function renderAiTopPicks(recs = []) {
  const items = topRecommendations(recs, 5);
  return `
    <section class="terminal-card side-card ai-picks-card">
      <div class="section-header compact"><div><h2>${t("aiTopPicks")}</h2><p>${t("aiTopPicksDesc")}</p></div><a href="${publicHref("ai-scanner")}" target="_top">${t("viewAll")}</a></div>
      ${items.length ? `<div class="pick-list">${items.map(renderPickRow).join("")}</div>` : emptyState(t("noLiveData"))}
    </section>
  `;
}

function renderMarketNewsCard() {
  return `
    <section class="terminal-card side-card market-news-card">
      <div class="section-header compact"><div><h2>${t("marketNews")}</h2><p>${t("noNews")}</p></div><a href="${publicHref("news")}" target="_top">${t("viewAll")}</a></div>
      ${emptyState(t("noNews"), "news")}
    </section>
  `;
}

function renderAiMarketAnalysis(recs = []) {
  const avg = deriveAverageConfidence(recs);
  const buyCount = recs.filter((item) => actionOf(item) === "buy").length;
  const sellCount = recs.filter((item) => actionOf(item) === "sell").length;
  const total = recs.length || 1;
  const bullish = Math.round((buyCount / total) * 100);
  const bearish = Math.round((sellCount / total) * 100);
  const neutral = Math.max(0, 100 - bullish - bearish);
  return `
    <section class="terminal-card side-card ai-analysis-card">
      <div class="section-header compact"><div><h2>${t("aiMarketAnalysis")}</h2><p>${t("routeUnavailable")}</p></div></div>
      <div class="bias-layout">
        <div>
          <span>${t("marketSentiment")}</span>
          <strong>${deriveBiasLabel(recs)}</strong>
          <small>${t("confidence")} ${avg || "--"}%</small>
          ${progressRow(t("bullish"), bullish, "green")}
          ${progressRow(t("bearish"), bearish, "red")}
          ${progressRow(t("neutral"), neutral, "blue")}
        </div>
        <div class="bull-illustration" aria-hidden="true"><span></span></div>
      </div>
    </section>
  `;
}

function renderExploreMarkets() {
  return `
    <section class="terminal-card explore-card">
      <div class="explore-head"><strong>${t("exploreMarkets")}</strong><span>${t("routeUnavailable")}</span></div>
      <div class="market-tile-row">
        ${marketCategories.map((market) => `
          <a class="market-tile" href="${publicHref(market.route)}" target="_top">
            ${marketIcon(market.icon)}
            <strong>${escapeHtml(localMarketLabel(market))}</strong>
            <span>${escapeHtml(localMarketSubtitle(market))}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSmartWatchlist(recs = []) {
  const rows = topRecommendations(shariaFilteredItems(recs, marketById("stocks")), 6);
  return `
    <section class="terminal-card smart-watchlist-card">
      <div class="section-header compact">
        <div><h2>${t("smartWatchlist")}</h2><p>${t("smartWatchlistDesc")}</p></div>
        <div class="table-filters"><button class="active">${t("aiTopPicks")}</button><button>${t("confidence")}</button></div>
      </div>
      ${rows.length ? `
        <div class="terminal-table-wrap">
          <table class="terminal-table">
            <thead><tr><th>${t("symbol")}</th><th>${t("price")}</th><th>${t("change")}</th><th>${t("signal")}</th><th>${t("confidence")}</th><th>${t("target")}</th><th>${t("timeframe")}</th><th>${t("risk")}</th><th>${t("aiScore")}</th><th>${t("action")}</th></tr></thead>
            <tbody>${rows.map(renderWatchlistRow).join("")}</tbody>
          </table>
        </div>
      ` : (state.shariaOnly ? renderShariaEmptyState() : emptyState(t("noLiveData")))}
    </section>
  `;
}

function isUsBackedMarket(market) {
  return ["us", "tech", "ai", "energy", "defensive", "dividends", "semiconductors", "food", "healthcare", "banking", "etfs", "indices"].includes(market?.apiMarket);
}

function marketCopy(key, market) {
  const copy = {
    heroEyebrow: { ar: "مركز الأسواق العالمية", en: "Global markets hub", fr: "Hub marches" },
    heroTitle: { ar: "استكشف الأسواق العالمية عبر وكيل SFM الذكي", en: "Explore global markets with SFM AI intelligence", fr: "Explorez les marches avec SFM AI" },
    heroText: { ar: "تابع أسواق الكويت والسعودية والإمارات وقطر والبحرين وعُمان، إضافة إلى أمريكا وأوروبا والعملات الرقمية والسلع من واجهة واحدة.", en: "Track Kuwait, Saudi, UAE, Qatar, Bahrain, Oman, US, Europe, crypto, forex, and commodities from one terminal.", fr: "Suivez les marches du Golfe, US, Europe, crypto et matieres premieres depuis un terminal." },
    startScan: { ar: "بدء تحليل السوق", en: "Start market analysis", fr: "Analyser le marche" },
    selectedMarket: { ar: "السوق المختار", en: "Selected market", fr: "Marche selectionne" },
    marketUniverse: { ar: "قائمة الأصول", en: "Asset universe", fr: "Univers" },
    quickStats: { ar: "ملخص سريع", en: "Quick market stats", fr: "Statistiques" },
    assetCount: { ar: "عدد الأصول", en: "Assets", fr: "Actifs" },
    marketState: { ar: "حالة السوق", en: "Market state", fr: "Etat" },
    primaryCurrency: { ar: "العملة الرئيسية", en: "Primary currency", fr: "Devise" },
    dataQuality: { ar: "جودة البيانات", en: "Data quality", fr: "Qualite donnees" },
    topGainers: { ar: "أبرز الرابحين", en: "Top gainers", fr: "Meilleures hausses" },
    topLosers: { ar: "أبرز الخاسرين", en: "Top losers", fr: "Meilleures baisses" },
    providerReady: { ar: "متاح عند توفر المزود", en: "Available when provider is connected", fr: "Selon fournisseur" },
    liveProvider: { ar: "بيانات مزود حقيقي", en: "Real provider data", fr: "Donnees fournisseur" },
    overviewTitle: { ar: "نظرة السوق", en: "Market overview", fr: "Vue du marche" },
    overviewText: { ar: "تعرض هذه المنطقة معلومات السوق المختار، رموزه، عملته، وحالة التحليل المتاحة حالياً.", en: "This section reflects the selected market, its symbols, currency, and currently available analysis state.", fr: "Cette section resume le marche selectionne." },
    opportunities: { ar: "الفرص والأصول البارزة", en: "Featured opportunities", fr: "Opportunites" },
    watchPreview: { ar: "معاينة قائمة المراقبة", en: "Watchlist preview", fr: "Watchlist" },
    newsPreview: { ar: "أخبار السوق", en: "Market news", fr: "Actualites" },
    noProviderMarket: { ar: "لا توجد بيانات مباشرة متاحة لهذا السوق حالياً. سيتم عرض النتائج فور ربط مزود البيانات.", en: "No live provider data is available for this market yet. Results will appear when a data provider is connected.", fr: "Aucune donnee live disponible pour ce marche." },
    configuredSymbols: { ar: "رموز مهيأة للتحليل", en: "Configured symbols", fr: "Symboles configures" },
    routeAction: { ar: "فتح صفحة السوق", en: "Open market page", fr: "Ouvrir" },
    delayedNotice: { ar: "لا يتم عرض أسعار أو توصيات وهمية. تظهر القيم فقط عند توفر بيانات مزود حقيقي.", en: "No fake prices or recommendations are shown. Values appear only when real provider data is available.", fr: "Aucune donnee fictive n'est affichee." },
    newsUnavailable: { ar: "تغذية الأخبار الخاصة بهذا السوق غير متصلة حالياً.", en: "Market-specific news feed is not connected yet.", fr: "Flux actualites non connecte." },
  };
  return copy[key]?.[state.language] || copy[key]?.en || key;
}

function recommendationsForMarket(market) {
  if (!isUsBackedMarket(market)) return [];
  const source = [
    ...(state.data.usStocks?.recommendations || []),
    ...(state.data.dashboardRecommendations || []),
    ...(state.data.recommendations || []),
  ];
  const seen = new Set();
  const symbols = new Set((market.symbols || []).map((symbol) => String(symbol).replace(/[^A-Z0-9]/gi, "").toUpperCase()));
  const filtered = source.filter((item) => {
    const key = String(item.symbol || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!key || seen.has(key)) return false;
    if (market.id !== "stocks" && symbols.size && !symbols.has(key)) return false;
    seen.add(key);
    return true;
  });
  return filtered.length || market.id !== "stocks" ? filtered : topRecommendations(source, 8);
}

function shariaFilteredItems(items = [], market) {
  return shariaStatusFilteredItems(items, state.shariaOnly ? "compliant" : "all", market);
}

function shariaStatusFilteredItems(items = [], status = "all", market) {
  if (!status || status === "all") return items;
  return items.filter((item) => isStockLikeInstrument(item, market) && shariaStatusFor(item, market) === status);
}

function updateShariaQuery() {
  const url = new URL(window.location.href);
  if (state.shariaOnly) url.searchParams.set("sharia", "compliant");
  else url.searchParams.delete("sharia");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function renderShariaFilterControl(count, total) {
  return `
    <section class="terminal-card sharia-filter-panel" aria-label="${escapeHtml(t("shariaStatusFilter"))}">
      <button type="button" class="sharia-filter-chip ${state.shariaOnly ? "active" : ""}" data-sharia-filter aria-pressed="${state.shariaOnly ? "true" : "false"}">
        <span>${escapeHtml(t("shariaOnlyFilter"))}</span>
        <strong>${state.shariaOnly ? `${count}/${total}` : total}</strong>
      </button>
      <p>${escapeHtml(t("shariaOnlyFilterNote"))} <em>${escapeHtml(t("shariaFilterStocksOnly"))}</em></p>
      ${state.shariaOnly ? `<button type="button" class="sharia-clear-filter" data-clear-sharia-filter>${escapeHtml(t("clearFilter"))}</button>` : ""}
    </section>
  `;
}

function renderShariaEmptyState() {
  return `<div class="empty-state sharia-empty-state"><strong>${escapeHtml(t("shariaCompliance"))}</strong><p>${escapeHtml(t("noShariaCompliantResults"))}</p><button type="button" data-clear-sharia-filter>${escapeHtml(t("clearFilter"))}</button></div>`;
}

function marketStatusValue(market) {
  return providerStatusInfo().label;
}

function renderMarketPage(marketId) {
  const market = marketCategories.find((item) => item.apiMarket === marketId || item.id === marketId) || marketForCurrentRoute();
  state.selectedMarketId = market.id;
  return renderMarketsHub(market);
}

function renderMarketsOverviewPage() {
  return renderMarketsHub(marketForCurrentRoute());
}

function renderMarketsHub(selectedMarket) {
  const market = selectedMarket || marketById("stocks");
  const allRecs = recommendationsForMarket(market);
  const recs = shariaFilteredItems(allRecs, market);
  return `
    <div class="markets-hub-page">
      ${renderMarketsHeroBanner(market)}
      ${renderMarketsSelectorGrid(market)}
      ${renderShariaFilterControl(recs.length, allRecs.length)}
      ${renderMarketQuickStats(market, recs)}
      ${renderSelectedMarketOverview(market)}
      ${renderMarketOpportunities(market, recs)}
      ${renderMarketNewsPreview(market)}
      ${renderMarketsQualityStrip(market)}
    </div>
  `;
}

function renderMarketsHeroBanner(market) {
  return `
    <section class="markets-hero terminal-card">
      <div class="markets-hero-copy">
        <span>${marketCopy("heroEyebrow")}</span>
        <h1>${marketCopy("heroTitle")}</h1>
        <p>${marketCopy("heroText")}</p>
        <div class="markets-hero-actions">
          <a href="${publicHref(market.route)}" target="_top">${marketCopy("routeAction")}</a>
          <button type="button" data-market-select="${escapeHtml(market.id)}">${marketCopy("startScan")}</button>
        </div>
      </div>
      <div class="markets-hero-visual" aria-hidden="true">
        <i></i><i></i><i></i>
        <strong>${escapeHtml(market.exchange || market.labelEn)}</strong>
        <span>${escapeHtml(market.countryCode || "")} · ${escapeHtml(marketCurrencyDisplay(market))}</span>
      </div>
    </section>
  `;
}

function renderMarketsSelectorGrid(activeMarket) {
  return `
    <section class="terminal-card markets-selector-card">
      <div class="section-header compact">
        <div><h2>${t("markets")}</h2><p>${marketCopy("selectedMarket")}: ${escapeHtml(localMarketLabel(activeMarket))}</p></div>
      </div>
      <div class="markets-grid" role="list">
        ${marketCategories.map((market) => `
          <button class="market-hub-tile ${market.id === activeMarket.id ? "active" : ""}" type="button" role="listitem" data-market-select="${escapeHtml(market.id)}" title="${escapeHtml(localMarketLabel(market))}">
            <span class="market-tile-icon">${marketIcon(market.icon)}</span>
            <span class="market-tile-body">
              <strong>${escapeHtml(localMarketLabel(market))}</strong>
              <em>${escapeHtml(market.exchange || localMarketSubtitle(market))}</em>
              <small>${escapeHtml(localMarketSubtitle(market))}</small>
            </span>
            <span class="market-tile-meta">
              <b>${escapeHtml(market.countryCode || market.type || "")}</b>
              <i>${escapeHtml(marketCurrencyDisplay(market))}</i>
            </span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMarketQuickStats(market, recs) {
  const symbols = market.symbols || [];
  const analysisState = marketAnalysisState(market, recs);
  const gainers = marketMoversState(market, recs, "up");
  const losers = marketMoversState(market, recs, "down");
  const providerState = providerStatusInfo();
  return `
    <section class="markets-stats-grid" aria-label="${marketCopy("quickStats")}">
      ${metricCard(marketCopy("assetCount"), symbols.length, `${t("selectedMarketInstruments")} · ${marketCopy("configuredSymbols")}`)}
      ${metricCard(t("providerAvailability"), providerState.label, providerState.note)}
      ${metricCard(marketCopy("primaryCurrency"), marketCurrencyDisplay(market), marketCurrencyNote(market))}
      ${metricCard(marketCopy("dataQuality"), analysisState.label, analysisState.note)}
      ${metricCard(marketCopy("topGainers"), gainers.value, gainers.note)}
      ${metricCard(marketCopy("topLosers"), losers.value, losers.note)}
    </section>
  `;
}

function renderSelectedMarketOverview(market) {
  return `
    <section class="terminal-card selected-market-overview">
      <div class="section-header">
        <div>
          <span>${marketCopy("selectedMarket")}</span>
          <h2>${escapeHtml(localMarketLabel(market))}</h2>
          <p>${marketCopy("overviewText")}</p>
        </div>
        <a href="${publicHref(market.route)}" target="_top">${marketCopy("routeAction")}</a>
      </div>
      <div class="selected-market-layout">
        <div class="selected-market-profile">
          ${marketIcon(market.icon)}
          <div>
            <strong>${escapeHtml(market.exchange || market.labelEn)}</strong>
            <span>${escapeHtml(market.countryCode || "")} · ${escapeHtml(marketCurrencyDisplay(market))}</span>
            <p>${escapeHtml(localMarketSubtitle(market))}</p>
          </div>
        </div>
        <div class="market-symbol-strip">
          ${(market.symbols || []).slice(0, 12).map((symbol) => `<span dir="ltr">${escapeHtml(symbol)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMarketOpportunities(market, recs) {
  const watchlist = loadWatchlist().slice(0, 5);
  return `
    <div class="market-opportunity-layout">
      <section class="terminal-card market-opportunities-card">
        <div class="section-header compact"><div><h2>${marketCopy("opportunities")}</h2><p>${isUsBackedMarket(market) ? marketCopy("liveProvider") : marketCopy("noProviderMarket")}</p></div></div>
        ${recs.length ? `<div class="recommendation-grid compact-market-recs">${topRecommendations(recs, 6).map(renderRecommendationCard).join("")}</div>` : (state.shariaOnly ? renderShariaEmptyState() : emptyState(marketCopy("noProviderMarket")))}
      </section>
      <section class="terminal-card market-watch-preview">
        <div class="section-header compact"><div><h2>${marketCopy("watchPreview")}</h2><p>${marketCopy("configuredSymbols")}</p></div></div>
        <div class="watch-preview-list">
          ${(watchlist.length ? watchlist.map((item) => item.symbol) : (market.symbols || []).slice(0, 6)).map((symbol) => `<div><span dir="ltr">${escapeHtml(symbol)}</span><em>${escapeHtml(marketCurrencyDisplay(market))}</em>${renderShariaBadge(symbol, market)}</div>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderMarketNewsPreview(market) {
  return `
    <section class="terminal-card market-news-preview">
      <div class="section-header compact"><div><h2>${marketCopy("newsPreview")}</h2><p>${escapeHtml(localMarketLabel(market))}</p></div><a href="${publicHref("news")}" target="_top">${t("viewAll")}</a></div>
      <div class="market-news-empty">${emptyState(marketCopy("newsUnavailable"), "news")}</div>
    </section>
  `;
}

function renderMarketsQualityStrip(market) {
  return `
    <section class="markets-quality-strip">
      <span>${marketIcon(market.icon)} ${escapeHtml(localMarketLabel(market))}</span>
      <span>${marketCopy("assetCount")}: ${(market.symbols || []).length}</span>
      <span>${marketCopy("primaryCurrency")}: ${escapeHtml(marketCurrencyDisplay(market))}</span>
      <strong>${marketCopy("delayedNotice")}</strong>
    </section>
  `;
}

function scannerSelected(key, value) {
  return String(state.data.scannerFilters?.[key] ?? "") === String(value) ? "selected" : "";
}

function renderAiScannerPage() {
  const stockMarket = marketById("stocks");
  const scannerShariaStatus = state.data.scannerFilters?.sharia_status || "all";
  const recs = topRecommendations(shariaStatusFilteredItems(state.data.dashboardRecommendations, scannerShariaStatus, stockMarket), 12);
  return `
    ${renderPageHeader(t("aiScanner"), "Real provider scan results, confidence thresholds, risk filters, and explainable signals.")}
    <section class="terminal-card scanner-panel">
      <div class="scanner-controls">
        <label><span>Signal type</span><select data-scanner-filter="signalType"><option value="all" ${scannerSelected("signalType", "all")}>All</option><option value="buy" ${scannerSelected("signalType", "buy")}>${t("buy")}</option><option value="sell" ${scannerSelected("signalType", "sell")}>${t("sell")}</option><option value="hold" ${scannerSelected("signalType", "hold")}>${t("hold")}</option></select></label>
        <label><span>Minimum confidence</span><select data-scanner-filter="minimumConfidence"><option value="0" ${scannerSelected("minimumConfidence", "0")}>All</option><option value="50" ${scannerSelected("minimumConfidence", "50")}>50%</option><option value="60" ${scannerSelected("minimumConfidence", "60")}>60%</option><option value="70" ${scannerSelected("minimumConfidence", "70")}>70%</option><option value="80" ${scannerSelected("minimumConfidence", "80")}>80%</option></select></label>
        <label><span>Risk level</span><select data-scanner-filter="riskLevel"><option value="all" ${scannerSelected("riskLevel", "all")}>All</option><option value="low" ${scannerSelected("riskLevel", "low")}>Low</option><option value="medium" ${scannerSelected("riskLevel", "medium")}>Medium</option><option value="high" ${scannerSelected("riskLevel", "high")}>High</option></select></label>
        <label><span>Time horizon</span><select data-scanner-filter="timeHorizon"><option value="all" ${scannerSelected("timeHorizon", "all")}>All</option><option value="days" ${scannerSelected("timeHorizon", "days")}>Days</option><option value="weeks" ${scannerSelected("timeHorizon", "weeks")}>Weeks</option><option value="months" ${scannerSelected("timeHorizon", "months")}>Months</option></select></label>
        <label><span>${t("shariaStatusFilter")}</span><select data-scanner-filter="sharia_status"><option value="all" ${scannerSelected("sharia_status", "all")}>All</option><option value="compliant" ${scannerSelected("sharia_status", "compliant")}>${t("shariaCompliant")}</option><option value="non_compliant" ${scannerSelected("sharia_status", "non_compliant")}>${t("shariaNonCompliant")}</option><option value="review_required" ${scannerSelected("sharia_status", "review_required")}>${t("shariaReviewRequired")}</option></select></label>
        <button type="button" data-refresh-scanner>${t("refresh") || "Refresh"}</button>
      </div>
      ${recs.length ? `
        <div class="terminal-table-wrap">
          <table class="terminal-table">
            <thead><tr><th>${t("symbol")}</th><th>${t("price")}</th><th>${t("signal")}</th><th>${t("confidence")}</th><th>${t("target")}</th><th>${t("stopLoss")}</th><th>${t("timeframe")}</th><th>${t("risk")}</th><th>${t("aiScore")}</th><th>${t("action")}</th></tr></thead>
            <tbody>${recs.map(renderScannerRow).join("")}</tbody>
          </table>
        </div>
      ` : (state.data.scannerFilters?.sharia_status === "compliant" ? renderShariaEmptyState() : emptyState(state.data.errors.dashboard ? "Provider scan failed or is still connecting." : t("noLiveData")))}
    </section>
  `;
}

function renderWatchlistPage() {
  const watchlist = loadWatchlist();
  const latest = state.data.dashboardRecommendations || [];
  const allRows = watchlist.map((item) => findBySymbol(latest, item.symbol) || item);
  const rows = shariaFilteredItems(allRows, marketById("stocks"));
  return `
    ${renderPageHeader(t("watchlist"), "User-created watchlists, notes, sorting, and asset detail drawer.")}
    ${renderShariaFilterControl(rows.length, allRows.length)}
    <section class="terminal-card watchlist-manager">
      <form class="inline-form" data-watchlist-form>
        <input name="symbol" placeholder="${t("symbol")}" />
        <input name="notes" placeholder="${t("notes")}" />
        <button type="submit">${t("add")}</button>
      </form>
      ${rows.length ? `<div class="terminal-table-wrap"><table class="terminal-table"><thead><tr><th>${t("symbol")}</th><th>${t("price")}</th><th>${t("change")}</th><th>${t("signal")}</th><th>${t("confidence")}</th><th>${t("target")}</th><th>${t("risk")}</th><th>${t("lastUpdate")}</th></tr></thead><tbody>${rows.map(renderWatchlistSignalRow).join("")}</tbody></table></div>` : (state.shariaOnly && watchlist.length ? renderShariaEmptyState() : emptyState("Add stocks to your watchlist to show prices and analysis."))}
    </section>
  `;
}

function renderPortfolioPage() {
  return `
    ${renderPageHeader(t("portfolio"), "Holdings, P&L, allocation, exposure, and portfolio AI insights.")}
    <section class="terminal-card portfolio-empty">${emptyState(t("noPortfolio"), "portfolio")}</section>
  `;
}

function renderAlertsPage() {
  return `
    ${renderPageHeader(t("alerts"), "Price alerts, percent-change alerts, news alerts, AI-signal alerts.")}
    <section class="terminal-card">
      <div class="scanner-controls">
        <label><span>${t("symbol")}</span><input placeholder="AAPL" /></label>
        <label><span>${t("price")}</span><input placeholder="0.00" /></label>
        <label><span>${t("signal")}</span><select><option>${t("buy")}</option><option>${t("sell")}</option></select></label>
        <button type="button">${t("add")}</button>
      </div>
      ${emptyState(t("noAlerts"))}
    </section>
  `;
}

function renderNewsPage() {
  return `
    ${renderPageHeader(t("news"), "Full market news feed, filters, sources, and impact labels.")}
    <section class="terminal-card">${emptyState(t("noNews"), "news")}</section>
  `;
}

function renderCalendarPage() {
  return `
    ${renderPageHeader(t("calendar"), "Economic calendar, earnings, dividends, IPOs, and market holidays.")}
    <section class="terminal-card calendar-grid">
      ${["Economic calendar", "Earnings", "Dividends", "Market holidays"].map((title) => metricCard(title, t("unavailable"), t("routeUnavailable"))).join("")}
    </section>
  `;
}

function renderEducationPage() {
  return `
    ${renderPageHeader(t("education"), "Courses, lessons, risk education, terminology, and saved learning items.")}
    <section class="terminal-card education-grid">
      ${["Risk foundations", "Technical analysis", "Portfolio basics", "Trading terminology"].map((title) => `
        <article class="education-card"><strong>${title}</strong><p>${t("educational")} · ${t("routeUnavailable")}</p></article>
      `).join("")}
    </section>
  `;
}

function renderSettingsPage() {
  const settings = loadSettings();
  return `
    ${renderPageHeader(t("settings"), "Language, currency, timezone, notifications, privacy, and account preferences.")}
    <div class="settings-grid">
      ${settingsCard(t("language"), `
        <div class="language-cards" role="radiogroup" aria-label="${t("language")}">
          ${["ar", "en", "fr"].map((language) => `<button class="${state.language === language ? "active" : ""}" data-language="${language}" type="button" role="radio" aria-checked="${state.language === language}"><strong>${language.toUpperCase()}</strong><span>${language === "ar" ? "العربية" : language === "en" ? "English" : "Francais"}</span></button>`).join("")}
        </div>
      `)}
      ${settingsCard(t("account"), settingRows([t("profileName"), t("premium")]))}
      ${settingsCard(t("marketPreferences"), settingRows([t("currency"), settings.currency || "USD", t("timezone"), settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone]))}
      ${settingsCard(t("notificationPreferences"), settingRows([t("alerts"), t("unavailable")]))}
      ${settingsCard(t("dataRefresh"), settingRows([t("liveData"), t("unavailable")]))}
      ${settingsCard(t("privacy"), settingRows([t("systemStatus"), "Private route · noindex"]))}
      ${settingsCard(t("support"), settingRows(["Powered by", "M.ALQ"]))}
    </div>
  `;
}

function renderPageHeader(title, description, market) {
  return `
    <header class="terminal-page-header">
      <div>${market ? marketIcon(market.icon) : ""}<div><span>${state.route}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description || "")}</p></div></div>
    </header>
  `;
}

function renderRecommendationCard(item) {
  const action = actionOf(item);
  return `
    <article class="recommendation-card ${action}">
      <div class="rec-head">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || item.symbol || "--")}</span></div><div class="rec-badges"><b class="signal-badge ${action}">${actionLabel(action)}</b>${renderShariaBadge(item)}</div></div>
      <div class="rec-metrics">
        <div><span>${t("currentPrice")}</span><strong>${money(item.currentPrice, item.currency)}</strong></div>
        <div><span>${t("targetPrice")}</span><strong>${money(item.expectedPrice || item.target1, item.currency)}</strong></div>
        <div><span>${t("stopLoss")}</span><strong>${item.stopLoss ? money(item.stopLoss, item.currency) : "--"}</strong></div>
      </div>
      <div class="confidence-line"><span>${t("confidence")}</span><i style="--value:${Number(item.confidence || 0)}%"></i><strong>${formatNumber(item.confidence || 0, 0)}%</strong></div>
      ${sparkline(Number(item.expectedMovePct || 0))}
    </article>
  `;
}

function detailHref(symbol) {
  const query = new URLSearchParams({ symbol: String(symbol || "") });
  if (state.shariaOnly || state.data.scannerFilters?.sharia_status === "compliant") query.set("sharia", "compliant");
  return `/thesfm-trader-own/app/detail.html?${query.toString()}`;
}

function renderPickRow(item) {
  const action = actionOf(item);
  return `
    <a class="pick-row" href="${detailHref(item.symbol)}" target="_top">
      ${assetLogo(item)}
      <div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || "")}</span>${renderShariaBadge(item)}</div>
      <b class="signal-badge ${action}">${actionLabel(action)}</b>
      <span>${money(item.currentPrice, item.currency)}</span>
      <em>${formatNumber(item.confidence || 0, 0)}%</em>
      <small>${escapeHtml(item.duration || item.timeframe || "--")}</small>
    </a>
  `;
}

function renderWatchlistRow(item) {
  const action = actionOf(item);
  return `
    <tr>
      <td><div class="table-asset">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || "")}</span>${renderShariaBadge(item)}</div></div></td>
      <td>${money(item.currentPrice, item.currency)}</td>
      <td class="${Number(item.expectedMovePct || 0) >= 0 ? "positive" : "negative"}">${pct(item.expectedMovePct || 0)}</td>
      <td><b class="signal-badge ${action}">${actionLabel(action)}</b></td>
      <td>${formatNumber(item.confidence || 0, 0)}%</td>
      <td>${money(item.expectedPrice || item.target1, item.currency)}</td>
      <td>${escapeHtml(item.duration || "--")}</td>
      <td>${escapeHtml(item.risk?.label || "--")}</td>
      <td>${formatNumber(item.finalScore || item.confidence || 0, 1)}/10</td>
      <td><button class="row-action" type="button">☆</button></td>
    </tr>
  `;
}

function renderScannerRow(item) {
  const action = actionOf(item);
  return `
    <tr>
      <td><div class="table-asset">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || "")}</span>${renderShariaBadge(item)}</div></div></td>
      <td>${money(item.currentPrice, item.currency)}</td>
      <td><b class="signal-badge ${action}">${actionLabel(action)}</b></td>
      <td>${formatNumber(item.confidence || 0, 0)}%</td>
      <td>${item.expectedPrice ? money(item.expectedPrice, item.currency) : "--"}</td>
      <td>${item.stopLoss ? money(item.stopLoss, item.currency) : "--"}</td>
      <td>${escapeHtml(item.duration || "--")}</td>
      <td>${escapeHtml(item.risk?.label || item.riskLevel || "--")}</td>
      <td>${formatNumber(item.finalScore || item.score || 0, 1)}/10</td>
      <td><a class="row-action" href="${detailHref(item.symbol)}" target="_top">View</a></td>
    </tr>
  `;
}

function renderWatchlistSignalRow(item) {
  const hasSignal = Boolean(item.currentPrice);
  const action = actionOf(item);
  return `
    <tr>
      <td><div class="table-asset">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || item.notes || "")}</span>${renderShariaBadge(item)}</div></div></td>
      <td>${hasSignal ? money(item.currentPrice, item.currency) : "--"}</td>
      <td class="${Number(item.expectedMovePct || 0) >= 0 ? "positive" : "negative"}">${hasSignal ? pct(item.expectedMovePct || 0) : "--"}</td>
      <td>${hasSignal ? `<b class="signal-badge ${action}">${actionLabel(action)}</b>` : "--"}</td>
      <td>${hasSignal ? `${formatNumber(item.confidence || 0, 0)}%` : "--"}</td>
      <td>${hasSignal && item.expectedPrice ? money(item.expectedPrice, item.currency) : "--"}</td>
      <td>${hasSignal ? escapeHtml(item.risk?.label || item.riskLevel || "--") : "--"}</td>
      <td>${hasSignal ? escapeHtml(item.dataTimestamp ? new Date(item.dataTimestamp).toLocaleString("en-US") : "--") : "Not scanned"}</td>
    </tr>
  `;
}

function metricCard(label, value, note) {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(String(value));
  const safeNote = escapeHtml(note || "");
  return `<article class="metric-card" title="${safeLabel}: ${safeValue}${safeNote ? ` - ${safeNote}` : ""}"><span>${safeLabel}</span><strong>${safeValue}</strong><small>${safeNote}</small></article>`;
}

function settingsCard(title, body) {
  return `<section class="terminal-card settings-card"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function settingRows(values) {
  const rows = [];
  for (let index = 0; index < values.length; index += 2) {
    rows.push(`<div class="setting-row"><span>${escapeHtml(values[index])}</span><strong>${escapeHtml(values[index + 1] ?? "")}</strong></div>`);
  }
  return rows.join("");
}

function progressRow(label, value, tone) {
  return `<div class="analysis-progress ${tone}"><span>${escapeHtml(label)}</span><i style="--value:${value}%"></i><strong>${value}%</strong></div>`;
}

function emptyState(message, kind = "data") {
  return `<div class="empty-state ${kind}"><strong>${t("unavailable")}</strong><p>${escapeHtml(message)}</p></div>`;
}

function renderTemporaryLegalNotices() {
  const dismissed = new Set(loadDismissedNotices());
  const items = [
    { id: "risk", title: t("riskNoticeTitle"), body: t("riskNoticeBody"), icon: "🛡" },
    { id: "ai", title: t("aiNoticeTitle"), body: t("aiNoticeBody"), icon: "AI" },
  ].filter((item) => !dismissed.has(item.id));
  if (!items.length) return "";
  // Temporary legal notices for internal SFM Trading Terminal testing.
  // Full legal pages will be added before public release.
  return `
    <section class="temporary-notices" aria-label="Temporary notices">
      ${items.map((item) => `
        <article class="temporary-notice">
          <span>${item.icon}</span>
          <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body)}</p></div>
          <button type="button" data-dismiss-notice="${item.id}" aria-label="${t("close")}">×</button>
        </article>
      `).join("")}
    </section>
  `;
}

function renderStatusBar() {
  const status = state.data.scannerStatus;
  const scanner = status?.scanner;
  const providerState = providerStatusInfo();
  const scannedAssets = Number.isFinite(Number(scanner?.scannedAssets)) ? Number(scanner.scannedAssets) : t("unavailable");
  const generatedSignals = Number.isFinite(Number(scanner?.generatedSignals)) ? Number(scanner.generatedSignals) : 0;
  const routeError = state.data.errors.dashboard || state.data.errors.route;
  const systemStatus = scanner?.running
    ? t("scanning")
    : scanner?.lastScanCompletedAt
      ? t("operational")
      : routeError
        ? requestErrorInfo(routeError).label
        : providerState.key === "provider_unavailable" || providerState.key === "unauthorized"
          ? providerState.label
          : t("connecting");
  const freshness = scanner?.lastScanCompletedAt || status?.marketData?.lastSuccessfulUpdate || state.data.loadedAt;
  return `
    <footer class="terminal-statusbar">
      <div><span>${t("statusBarData")}</span><strong>${providerState.label}</strong></div>
      <div><span>${t("totalMarkets")}</span><strong>${marketCategories.length}</strong></div>
      <div><span>${t("activeAssets")}</span><strong>${escapeHtml(String(scannedAssets))}</strong></div>
      <div><span>${t("scans")}</span><strong>${escapeHtml(String(generatedSignals))}</strong></div>
      <div><span>${t("dataFreshness")}</span><strong>${escapeHtml(formatStatusTimestamp(freshness))}</strong></div>
      <div><span>${t("systemStatus")}</span><strong>${state.data.errors.dashboard ? t("unavailable") : systemStatus}</strong></div>
    </footer>
  `;
}

function sparkline(change = 0) {
  const up = Number(change) >= 0;
  const points = up ? "0,32 20,26 38,29 57,18 75,21 92,12 112,15 132,7" : "0,10 20,14 38,12 57,20 75,24 92,21 112,30 132,34";
  return `<svg class="mini-sparkline ${up ? "up" : "down"}" viewBox="0 0 132 42" aria-hidden="true"><polyline points="${points}"></polyline></svg>`;
}

function topRecommendations(recs = [], count = 5) {
  return [...(recs || [])]
    .filter((item) => item && item.symbol)
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, count);
}

function findBySymbol(items, symbol) {
  const normalized = String(symbol).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return items.find((item) => String(item.symbol || "").replace(/[^A-Z0-9]/gi, "").toUpperCase().includes(normalized));
}

function deriveAverageConfidence(recs = state.data.dashboardRecommendations) {
  const values = (recs || []).map((item) => Number(item.confidence)).filter(Number.isFinite);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function deriveBiasLabel(recs = state.data.dashboardRecommendations) {
  const buys = (recs || []).filter((item) => actionOf(item) === "buy").length;
  const sells = (recs || []).filter((item) => actionOf(item) === "sell").length;
  if (!recs?.length) return t("unavailable");
  if (buys > sells) return t("bullish");
  if (sells > buys) return t("bearish");
  return t("neutral");
}

function bindEvents() {
  root.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.language));
  });
  root.querySelector("[data-open-drawer]")?.addEventListener("click", () => {
    state.drawerOpen = true;
    render();
  });
  root.querySelector("[data-close-drawer]")?.addEventListener("click", () => {
    state.drawerOpen = false;
    render();
  });
  root.querySelector("[data-toggle-markets]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.marketsOpen = !state.marketsOpen;
    saveSettings({ marketsOpen: state.marketsOpen });
    render();
  });
  root.querySelectorAll("[data-market-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const market = marketById(button.dataset.marketSelect);
      state.selectedMarketId = market.id;
      saveSettings({ selectedMarketId: market.id });
      if (isUsBackedMarket(market) && !state.data.usStocks && !state.data.errors.route) {
        loadRouteRecommendations().then(render);
      }
      render();
    });
  });
  root.querySelectorAll("[data-dismiss-notice]").forEach((button) => {
    button.addEventListener("click", () => {
      const dismissed = new Set(loadDismissedNotices());
      dismissed.add(button.dataset.dismissNotice);
      localStorage.setItem(DISMISSED_NOTICE_KEY, JSON.stringify([...dismissed]));
      render();
    });
  });
  root.querySelectorAll("[data-scanner-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      state.data.scannerFilters = {
        ...state.data.scannerFilters,
        [select.dataset.scannerFilter]: select.value,
      };
      if (select.dataset.scannerFilter === "sharia_status") {
        state.shariaOnly = select.value === "compliant";
        updateShariaQuery();
      }
      loadScannerWithFilters();
    });
  });
  root.querySelector("[data-sharia-filter]")?.addEventListener("click", () => {
    state.shariaOnly = !state.shariaOnly;
    state.data.scannerFilters = {
      ...state.data.scannerFilters,
      sharia_status: state.shariaOnly ? "compliant" : "all",
    };
    updateShariaQuery();
    render();
  });
  root.querySelectorAll("[data-clear-sharia-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.shariaOnly = false;
      state.data.scannerFilters = {
        ...state.data.scannerFilters,
        sharia_status: "all",
      };
      updateShariaQuery();
      render();
    });
  });
  root.querySelector("[data-refresh-scanner]")?.addEventListener("click", () => {
    loadScannerWithFilters();
  });
  root.querySelector("[data-watchlist-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const symbol = String(form.get("symbol") || "").trim().toUpperCase();
    if (!symbol) return;
    const items = loadWatchlist();
    items.push({ symbol, notes: String(form.get("notes") || "").trim() });
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    render();
  });
}

function loadDismissedNotices() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_NOTICE_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadWatchlist() {
  try {
    const raw = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    if (Array.isArray(raw)) {
      return raw.map((item) => typeof item === "string" ? { symbol: item, notes: "" } : item).filter((item) => item?.symbol);
    }
  } catch {
    return [];
  }
  return [];
}

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 12000);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`TRADER_INVALID_RESPONSE_${response.status}`);
    }
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.code || payload?.message || payload?.error || `HTTP_${response.status}`);
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("TRADER_EMPTY_RESPONSE");
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("TRADER_REQUEST_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function loadData() {
  render();
  await Promise.allSettled([loadMarkets(), loadTraderStatus(), loadDashboardRecommendations(), loadRouteRecommendations()]);
  render();
}

async function loadMarkets() {
  try {
    state.data.markets = marketCategories;
    delete state.data.errors.markets;
  } catch (error) {
    state.data.errors.markets = String(error?.message || error);
  }
}

async function loadTraderStatus() {
  try {
    const data = await fetchJson(traderApi("status"));
    state.data.scannerStatus = data;
    delete state.data.errors.status;
  } catch (error) {
    state.data.errors.status = String(error?.message || error);
  }
}

async function loadDashboardRecommendations() {
  try {
    const suffix = state.shariaOnly ? "?market=US&sharia_status=compliant" : "?market=US";
    const data = await fetchJson(traderApi(`scanner/results${suffix}`), { timeout: 45000 });
    state.data.dashboardRecommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    state.data.scannerSummary = data.summary || null;
    state.data.scannerStatus = data.status || state.data.scannerStatus;
    state.data.loadedAt = data.generatedAt || Date.now();
    delete state.data.errors.dashboard;
  } catch (error) {
    state.data.errors.dashboard = String(error?.message || error);
  }
}

async function loadRouteRecommendations() {
  const market = state.route === "markets" ? marketForCurrentRoute() : marketCategories.find((item) => item.apiMarket === apiMarketForRoute(state.route) || item.id === routeMeta[state.route]?.marketCategoryId);
  if (!isUsBackedMarket(market)) {
    state.data.recommendations = [];
    delete state.data.errors.route;
    return;
  }

  try {
    const suffix = state.shariaOnly ? "?sharia_status=compliant" : "";
    const data = await fetchJson(traderApi(`us-stocks${suffix}`), { timeout: 45000 });
    state.data.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    state.data.usStocks = data;
    state.data.scannerStatus = data.status || state.data.scannerStatus;
    state.data.loadedAt = data.generatedAt || Date.now();
    delete state.data.errors.route;
  } catch (error) {
    state.data.errors.route = String(error?.message || error);
    state.data.recommendations = [];
  }
}

async function loadScannerWithFilters() {
  const filters = state.data.scannerFilters || {};
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "" && String(value) !== "0" && String(value) !== "all") {
      params.set(key, String(value));
    }
  });
  try {
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(traderApi(`scanner/results${suffix}`), { timeout: 45000 });
    state.data.dashboardRecommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    state.data.scannerSummary = data.summary || null;
    state.data.scannerStatus = data.status || state.data.scannerStatus;
    state.data.loadedAt = data.generatedAt || Date.now();
    delete state.data.errors.dashboard;
  } catch (error) {
    state.data.errors.dashboard = String(error?.message || error);
  }
  render();
}

function initBackground() {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let frame = 0;
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function draw() {
    frame += 1;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = 0.26;
    context.strokeStyle = "#123047";
    context.lineWidth = 1;
    for (let x = (frame % 72) - 72; x < width; x += 72) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 72) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.globalAlpha = 0.18;
    for (let i = 0; i < 72; i += 1) {
      const x = (i * 137 + frame * 0.42) % width;
      const y = (i * 59) % height;
      const up = i % 3 !== 0;
      context.strokeStyle = up ? "#19d98b" : "#ff5268";
      context.beginPath();
      context.moveTo(x, y - 18);
      context.lineTo(x, y + 18);
      context.stroke();
      context.fillStyle = up ? "rgba(25,217,139,.22)" : "rgba(255,82,104,.20)";
      context.fillRect(x - 4, y - 9, 8, 18);
    }
    window.requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener("resize", resize);
  draw();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

applyDocumentLanguage();
initBackground();
loadData();
