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
    statusBarData: "حالة البيانات",
    totalMarkets: "إجمالي الأسواق",
    activeAssets: "الأصول النشطة",
    scans: "فحوصات الذكاء الاصطناعي",
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
    statusBarData: "Data status",
    totalMarkets: "Total markets",
    activeAssets: "Active assets",
    scans: "AI scans",
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
    statusBarData: "Etat des donnees",
    totalMarkets: "Marches",
    activeAssets: "Actifs actifs",
    scans: "Scans IA",
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
    openDrawer: "Ouvrir le menu",
    closeDrawer: "Fermer le menu",
  },
};

const marketCategories = [
  { id: "forex", route: "markets/forex", apiMarket: "forex", labelAr: "الفوركس", labelEn: "Forex", labelFr: "Forex", subtitleAr: "أزواج رئيسية", subtitleEn: "Major pairs", icon: "fx", currency: "" },
  { id: "indices", route: "markets/indices", apiMarket: "indices", labelAr: "المؤشرات", labelEn: "Indices", labelFr: "Indices", subtitleAr: "مؤشرات عالمية", subtitleEn: "Global indices", icon: "indices", currency: "USD" },
  { id: "stocks", route: "markets/stocks", apiMarket: "us", labelAr: "الأسهم الأمريكية", labelEn: "US Stocks", labelFr: "Actions US", subtitleAr: "ناسداك ونيويورك", subtitleEn: "US market", icon: "us", currency: "USD" },
  { id: "crypto", route: "markets/crypto", apiMarket: "crypto", labelAr: "العملات الرقمية", labelEn: "Crypto", labelFr: "Crypto", subtitleAr: "أصول رقمية", subtitleEn: "Digital assets", icon: "crypto", currency: "USD" },
  { id: "commodities", route: "markets/commodities", apiMarket: "commodities", labelAr: "السلع", labelEn: "Commodities", labelFr: "Matieres", subtitleAr: "ذهب، نفط، فضة", subtitleEn: "Gold, oil, silver", icon: "gold", currency: "USD" },
  { id: "etfs", route: "markets/etfs", apiMarket: "etfs", labelAr: "الصناديق المتداولة", labelEn: "ETFs", labelFr: "ETF", subtitleAr: "صناديق متداولة", subtitleEn: "Exchange traded", icon: "etf", currency: "USD" },
  { id: "gcc", route: "markets", apiMarket: "gcc", labelAr: "أسواق الخليج", labelEn: "Gulf Markets", labelFr: "Golfe", subtitleAr: "نظرة خليجية", subtitleEn: "GCC overview", icon: "gcc", currency: "" },
  { id: "saudi", route: "markets", apiMarket: "saudi", labelAr: "السوق السعودي", labelEn: "Saudi", labelFr: "Arabie", subtitleAr: "تداول", subtitleEn: "Tadawul", icon: "saudi", currency: "SAR" },
  { id: "kuwait", route: "markets", apiMarket: "kuwait", labelAr: "بورصة الكويت", labelEn: "Kuwait", labelFr: "Koweit", subtitleAr: "بورصة الكويت", subtitleEn: "Boursa Kuwait", icon: "kuwait", currency: "KWD" },
  { id: "uae", route: "markets", apiMarket: "uae", labelAr: "السوق الإماراتي", labelEn: "UAE", labelFr: "EAU", subtitleAr: "ADX وDFM", subtitleEn: "ADX & DFM", icon: "uae", currency: "AED" },
  { id: "qatar", route: "markets", apiMarket: "qatar", labelAr: "السوق القطري", labelEn: "Qatar", labelFr: "Qatar", subtitleAr: "QSE", subtitleEn: "QSE", icon: "qatar", currency: "QAR" },
  { id: "bahrain", route: "markets", apiMarket: "bahrain", labelAr: "السوق البحريني", labelEn: "Bahrain", labelFr: "Bahrein", subtitleAr: "BHB", subtitleEn: "BHB", icon: "bahrain", currency: "BHD" },
  { id: "oman", route: "markets", apiMarket: "oman", labelAr: "السوق العماني", labelEn: "Oman", labelFr: "Oman", subtitleAr: "MSX", subtitleEn: "MSX", icon: "oman", currency: "OMR" },
  { id: "europe", route: "markets", apiMarket: "europe", labelAr: "الأسهم الأوروبية", labelEn: "Europe", labelFr: "Europe", subtitleAr: "أسواق أوروبية", subtitleEn: "European", icon: "europe", currency: "EUR" },
  { id: "asia", route: "markets", apiMarket: "asia", labelAr: "الأسهم الآسيوية", labelEn: "Asia", labelFr: "Asie", subtitleAr: "آسيا والمحيط", subtitleEn: "Asia Pacific", icon: "asia", currency: "" },
  { id: "tech", route: "markets", apiMarket: "tech", labelAr: "أسهم التقنية", labelEn: "Technology", labelFr: "Technologie", subtitleAr: "تقنية", subtitleEn: "Technology", icon: "chip", currency: "USD" },
  { id: "food", route: "markets", apiMarket: "food", labelAr: "الأسهم الغذائية", labelEn: "Food / Staples", labelFr: "Consommation", subtitleAr: "سلع غذائية", subtitleEn: "Consumer staples", icon: "food", currency: "USD" },
  { id: "healthcare", route: "markets", apiMarket: "healthcare", labelAr: "الأسهم الدوائية", labelEn: "Healthcare", labelFr: "Sante", subtitleAr: "دواء وصحة", subtitleEn: "Pharma & health", icon: "health", currency: "USD" },
  { id: "banking", route: "markets", apiMarket: "banking", labelAr: "أسهم البنوك", labelEn: "Banking", labelFr: "Banques", subtitleAr: "بنوك", subtitleEn: "Banks", icon: "bank", currency: "USD" },
  { id: "energy", route: "markets", apiMarket: "energy", labelAr: "أسهم الطاقة", labelEn: "Energy", labelFr: "Energie", subtitleAr: "طاقة ونفط", subtitleEn: "Oil & energy", icon: "energy", currency: "USD" },
  { id: "ai", route: "markets", apiMarket: "ai", labelAr: "أسهم الذكاء الاصطناعي", labelEn: "AI Stocks", labelFr: "IA", subtitleAr: "ذكاء اصطناعي", subtitleEn: "AI leaders", icon: "ai", currency: "USD" },
  { id: "semiconductors", route: "markets", apiMarket: "semiconductors", labelAr: "أشباه الموصلات", labelEn: "Semiconductors", labelFr: "Semi-conducteurs", subtitleAr: "رقائق", subtitleEn: "Chip makers", icon: "semi", currency: "USD" },
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

const state = {
  route: normalizeRoute(new URLSearchParams(location.search).get("route") || "dashboard"),
  language: loadSettings().language || "ar",
  drawerOpen: false,
  marketsOpen: loadSettings().marketsOpen ?? true,
  data: {
    markets: [],
    recommendations: [],
    dashboardRecommendations: [],
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

function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeRoute(value) {
  const clean = String(value || "dashboard")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^thesfm-trader-own\/?/, "")
    .replace(/^app\/?/, "");
  return routeMeta[clean] ? clean : "dashboard";
}

function publicHref(route) {
  return route === "dashboard" ? APP_BASE : `${APP_BASE}/${route}`;
}

function apiMarketForRoute(route) {
  return routeMeta[route]?.marketId || "us";
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
    gcc: "GCC",
    saudi: "🇸🇦",
    kuwait: "🇰🇼",
    uae: "🇦🇪",
    qatar: "🇶🇦",
    bahrain: "🇧🇭",
    oman: "🇴🇲",
    europe: "🇪🇺",
    asia: "🌐",
    chip: "⌁",
    food: "◌",
    health: "+",
    bank: "▥",
    energy: "◖",
    ai: "AI",
    semi: "▦",
    indices: "↗",
    etf: "ETF",
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
  const rows = topRecommendations(recs, 6);
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
      ` : emptyState(t("noLiveData"))}
    </section>
  `;
}

function renderMarketPage(marketId) {
  const market = marketCategories.find((item) => item.apiMarket === marketId || item.id === marketId) || marketCategories[2];
  const recs = state.data.recommendations;
  const modules = {
    forex: ["Currency strength meter", "Trading-session status", "Pair correlations", "Economic events"],
    indices: ["Global index list", "Regional performance", "Market breadth", "Index futures"],
    us: ["Stock screener", "Sector selector", "Top gainers", "Company fundamentals"],
    crypto: ["Market capitalization", "BTC dominance", "Liquidity", "Exchange status"],
    commodities: ["Metals", "Energy", "Price curves", "Supply notes"],
    etfs: ["ETF screener", "Expense ratio", "Fund flows", "AUM"],
  }[marketId] || ["Market screener", "Top movers", "Signals", "Provider status"];
  return `
    ${renderPageHeader(localMarketLabel(market), localMarketSubtitle(market), market)}
    <div class="feature-grid">
      ${modules.map((name, index) => metricCard(name, index === 0 ? t("unavailable") : "--", t("routeUnavailable"))).join("")}
    </div>
    <section class="terminal-card">
      <div class="section-header compact"><div><h2>${t("smartWatchlist")}</h2><p>${t("routeUnavailable")}</p></div></div>
      ${recs.length ? `<div class="recommendation-grid">${topRecommendations(recs, 8).map(renderRecommendationCard).join("")}</div>` : emptyState(t("noLiveData"))}
    </section>
  `;
}

function renderMarketsOverviewPage() {
  return `
    ${renderPageHeader(t("markets"), t("routeUnavailable"))}
    <section class="terminal-card">
      <div class="market-directory">
        ${marketCategories.map((market) => `
          <a class="market-directory-card" href="${publicHref(market.route)}" target="_top">
            ${marketIcon(market.icon)}
            <div><strong>${escapeHtml(localMarketLabel(market))}</strong><span>${escapeHtml(localMarketSubtitle(market))}</span></div>
            <em>${normalizeCurrency(market.currency) || "GLOBAL"}</em>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAiScannerPage() {
  const recs = topRecommendations(state.data.dashboardRecommendations, 8);
  return `
    ${renderPageHeader(t("aiScanner"), "Scanner filters, confidence thresholds, saved presets.")}
    <section class="terminal-card scanner-panel">
      <div class="scanner-controls">
        ${["Signal type", "Minimum confidence", "Risk level", "Time horizon"].map((label) => `<label><span>${label}</span><select><option>${t("unavailable")}</option></select></label>`).join("")}
      </div>
      ${recs.length ? `<div class="recommendation-grid">${recs.map(renderRecommendationCard).join("")}</div>` : emptyState(t("noLiveData"))}
    </section>
  `;
}

function renderWatchlistPage() {
  const watchlist = loadWatchlist();
  return `
    ${renderPageHeader(t("watchlist"), "User-created watchlists, notes, sorting, and asset detail drawer.")}
    <section class="terminal-card watchlist-manager">
      <form class="inline-form" data-watchlist-form>
        <input name="symbol" placeholder="${t("symbol")}" />
        <input name="notes" placeholder="${t("notes")}" />
        <button type="submit">${t("add")}</button>
      </form>
      ${watchlist.length ? `<div class="watchlist-list">${watchlist.map((item) => `<div><strong dir="ltr">${escapeHtml(item.symbol)}</strong><span>${escapeHtml(item.notes || "")}</span></div>`).join("")}</div>` : emptyState(t("noLiveData"))}
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
      <div class="rec-head">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || item.symbol || "--")}</span></div><b class="signal-badge ${action}">${actionLabel(action)}</b></div>
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

function renderPickRow(item) {
  const action = actionOf(item);
  return `
    <a class="pick-row" href="/thesfm-trader-own/app/detail.html?symbol=${encodeURIComponent(item.symbol || "")}" target="_top">
      ${assetLogo(item)}
      <div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || "")}</span></div>
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
      <td><div class="table-asset">${assetLogo(item)}<div><strong dir="ltr">${escapeHtml(item.symbol || "--")}</strong><span>${escapeHtml(item.name || "")}</span></div></div></td>
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

function metricCard(label, value, note) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(note || "")}</small></article>`;
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
  const loadedAt = state.data.loadedAt ? new Date(state.data.loadedAt).toLocaleTimeString("en-US", { hour12: false }) : t("unavailable");
  return `
    <footer class="terminal-statusbar">
      <div><span>${t("statusBarData")}</span><strong>${state.data.errors.dashboard ? t("error") : t("liveData")}</strong></div>
      <div><span>${t("totalMarkets")}</span><strong>${marketCategories.length}</strong></div>
      <div><span>${t("activeAssets")}</span><strong>${state.data.dashboardRecommendations.length || t("unavailable")}</strong></div>
      <div><span>${t("scans")}</span><strong>${t("unavailable")}</strong></div>
      <div><span>${t("lastUpdate")}</span><strong>${loadedAt}</strong></div>
      <div><span>${t("systemStatus")}</span><strong>${state.data.errors.dashboard ? t("unavailable") : "Operational"}</strong></div>
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
  root.querySelectorAll("[data-dismiss-notice]").forEach((button) => {
    button.addEventListener("click", () => {
      const dismissed = new Set(loadDismissedNotices());
      dismissed.add(button.dataset.dismissNotice);
      localStorage.setItem(DISMISSED_NOTICE_KEY, JSON.stringify([...dismissed]));
      render();
    });
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
    const response = await fetch(path, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadData() {
  render();
  await Promise.allSettled([loadMarkets(), loadDashboardRecommendations(), loadRouteRecommendations()]);
  render();
}

async function loadMarkets() {
  try {
    const data = await fetchJson("/api/markets");
    state.data.markets = Array.isArray(data.markets) ? data.markets : [];
    delete state.data.errors.markets;
  } catch (error) {
    state.data.errors.markets = String(error?.message || error);
  }
}

async function loadDashboardRecommendations() {
  try {
    const data = await fetchJson("/api/recommendations?market=us");
    state.data.dashboardRecommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    state.data.loadedAt = data.generatedAt || Date.now();
    delete state.data.errors.dashboard;
  } catch (error) {
    state.data.errors.dashboard = String(error?.message || error);
  }
}

async function loadRouteRecommendations() {
  const market = apiMarketForRoute(state.route);
  try {
    const data = await fetchJson(`/api/recommendations?market=${encodeURIComponent(market)}`);
    state.data.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    state.data.loadedAt = data.generatedAt || Date.now();
    delete state.data.errors.route;
  } catch (error) {
    state.data.errors.route = String(error?.message || error);
    state.data.recommendations = [];
  }
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
