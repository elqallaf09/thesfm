/* the-sfm trader — AI Trading Terminal (vanilla SPA controller)
   Architecture: single IIFE, client-side routing (instant page switches),
   pure render-component functions, defensive data layer, no synthetic market data. */
(() => {
  "use strict";
  const Recommendation = window.SFMRecommendation;
  let _marketSelectorOpen = false;
  let _themeMenuOpen = false;

  /* ─────────────────────────── Config ─────────────────────────── */
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const VER = "20260705-funds-universe-1";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3", holdings: "sfmTraderHoldings:v1", settings: "sfmTraderSettings:v1", followed: "sfmTraderFollowedTrades:v1" };
  const LANG_STORAGE_KEY = "sfm_lang";
  const LEGACY_SETTINGS_STORAGE_KEY = "the-sfm-trader-settings";
  const LANG_EVENT = "sfm-language-change";
  const SUPPORTED_LANGUAGES = ["ar", "en"];
  const TERMINAL_I18N = {
    "language.label": { ar: "اختيار اللغة", en: "Choose language" },
    "language.arabic": { ar: "العربية", en: "Arabic" },
    "language.english": { ar: "الإنجليزية", en: "English" },
    "terminal.kicker": { ar: "منصة التداول الذكية", en: "AI trading terminal" },
    "nav.trading": { ar: "التداول", en: "Trading" },
    "nav.monitoring": { ar: "المتابعة", en: "Monitoring" },
    "nav.more": { ar: "أخرى", en: "More" },
    "nav.dashboard": { ar: "القيادة", en: "Dashboard" },
    "nav.dashboardSub": { ar: "لوحة التحكم", en: "Dashboard" },
    "nav.markets": { ar: "الأسواق", en: "Markets" },
    "nav.marketsSub": { ar: "الأسواق", en: "Markets" },
    "nav.aiScanner": { ar: "ماسح الذكاء", en: "AI Scanner" },
    "nav.aiScannerSub": { ar: "الماسح", en: "Scanner" },
    "nav.symbolDetails": { ar: "تفاصيل الرمز", en: "Symbol Details" },
    "nav.symbolDetailsSub": { ar: "تحليل الرمز", en: "Symbol Analysis" },
    "nav.watchlist": { ar: "قائمة المتابعة", en: "Watchlist" },
    "nav.watchlistSub": { ar: "المتابعة", en: "Watchlist" },
    "nav.portfolio": { ar: "المحفظة", en: "Portfolio" },
    "nav.alerts": { ar: "التنبيهات", en: "Alerts" },
    "nav.recommendations": { ar: "التوصيات", en: "Recommendations" },
    "nav.recommendationsSub": { ar: "التحليل", en: "Analysis" },
    "nav.tradePerformance": { ar: "أداء الصفقات", en: "Trade Performance" },
    "nav.tradePerformanceSub": { ar: "الأداء", en: "Performance" },
    "nav.news": { ar: "الأخبار", en: "News" },
    "nav.calendar": { ar: "التقويم", en: "Calendar" },
    "nav.education": { ar: "التعليم", en: "Education" },
    "nav.settings": { ar: "الإعدادات", en: "Settings" },
    "route.dashboard": { ar: "غرفة قيادة السوق", en: "Market command room" },
    "route.markets": { ar: "خريطة الأسواق", en: "Markets map" },
    "route.ai-scanner": { ar: "ماسح الذكاء الاصطناعي", en: "AI scanner" },
    "route.watchlist": { ar: "قائمة المتابعة الذكية", en: "Smart watchlist" },
    "route.portfolio": { ar: "المحفظة", en: "Portfolio" },
    "route.alerts": { ar: "مركز التنبيهات", en: "Alerts center" },
    "route.recommendations": { ar: "التوصيات والتحليل", en: "Recommendations and analysis" },
    "route.trade-performance": { ar: "أداء الصفقات", en: "Trade performance" },
    "route.news": { ar: "أخبار السوق", en: "Market news" },
    "route.calendar": { ar: "تقويم السوق", en: "Market calendar" },
    "route.education": { ar: "مركز التعليم", en: "Education center" },
    "route.settings": { ar: "إعدادات النظام", en: "System settings" },
    "route.symbol-details": { ar: "تفاصيل الرمز", en: "Symbol details" },
    "search.label": { ar: "ابحث عن سهم أو رمز", en: "Search for a stock or symbol" },
    "search.action": { ar: "تحليل", en: "Analyze" },
    "provider.checking": { ar: "جاري فحص مزود البيانات", en: "Checking data provider" },
    "ticker.hide": { ar: "إخفاء الشريط", en: "Hide ticker" },
    "ticker.show": { ar: "إظهار الشريط", en: "Show ticker" },
    "ticker.aria": { ar: "شريط أسعار السوق", en: "Market ticker" },
    "sidebar.collapse": { ar: "طي القائمة", en: "Collapse sidebar" },
    "loading.title": { ar: "يتم تجهيز منصة التداول", en: "Preparing the trading terminal" },
    "loading.body": { ar: "نحمّل حالة المزود، الأخبار، التوصيات، وقوائم المتابعة بدون إنشاء بيانات وهمية.", en: "Loading provider status, news, recommendations, and watchlists without creating synthetic data." },
    "viewAll.symbols": { ar: "عرض كل الرموز", en: "View all symbols" },
    "viewAll.funds": { ar: "عرض كل الصناديق", en: "View all funds" },
    "showingSymbols": { ar: "يعرض {shown} من {total} رمز", en: "Showing {shown} of {total} symbols" },
    "showingFunds": { ar: "يعرض {shown} من {total} صندوق", en: "Showing {shown} of {total} funds" },
    "sampleSymbols": { ar: "رموز معاينة", en: "Preview symbols" },
    "allSymbols": { ar: "كل الرموز المتاحة", en: "Full symbol universe" },
    "allExchanges": { ar: "كل البورصات", en: "All exchanges" },
    "allCurrencies": { ar: "كل العملات", en: "All currencies" },
    "allSectors": { ar: "كل القطاعات", en: "All sectors" },
    "allIndustries": { ar: "كل الصناعات", en: "All industries" },
    "allAssetTypes": { ar: "كل أنواع الأصول", en: "All asset types" },
    "allData": { ar: "كل البيانات", en: "All data" },
    "withPrice": { ar: "بسعر متاح", en: "With price" },
    "priceAvailability": { ar: "توفر السعر", en: "Price availability" },
    "marketCap": { ar: "القيمة السوقية", en: "Market cap" },
    "volume": { ar: "الحجم", en: "Volume" },
    "sort": { ar: "الترتيب", en: "Sort" },
    "direction": { ar: "الاتجاه", en: "Direction" },
    "ascending": { ar: "تصاعدي", en: "Ascending" },
    "descending": { ar: "تنازلي", en: "Descending" },
    "issuer": { ar: "المصدر", en: "Issuer" },
    "yield": { ar: "العائد", en: "Yield" },
    "expenseRatio": { ar: "نسبة المصروفات", en: "Expense ratio" },
    "dataQuality": { ar: "جودة البيانات", en: "Data quality" },
    "shariahStatus": { ar: "حالة التوافق الشرعي", en: "Shariah status" },
    "fundType": { ar: "نوع الصندوق", en: "Fund type" },
    "fund": { ar: "صندوق استثماري", en: "Fund" },
    "marketDetails": { ar: "تفاصيل السوق", en: "Market details" },
    "providerMarketsSummary": { ar: "ملخص أسواق المزود", en: "Provider markets summary" },
    "adminDiagnostics": { ar: "تشخيصات الإدارة", en: "Admin diagnostics" },
    "refresh": { ar: "تحديث", en: "Refresh" },
    "search": { ar: "بحث", en: "Search" },
    "noSource": { ar: "لا يوجد مصدر", en: "No source" },
    "timing": { ar: "التوقيت", en: "Timing" },
    "all": { ar: "الكل", en: "All" },
    "expected": { ar: "متوقعة", en: "Expected" },
    "reported": { ar: "معلنة", en: "Reported" },
    "completeData": { ar: "بيانات مكتملة", en: "Complete data" },
    "partialData": { ar: "بيانات جزئية", en: "Partial data" },
    "showingRows": { ar: "يعرض {shown} من {total} صف", en: "Showing {shown} of {total} rows" },
    "dedupedRows": { ar: "تم دمج {count} صف مكرر", en: "Deduped {count} duplicate rows" },
    "showMore": { ar: "عرض المزيد", en: "Show more" },
    "showLess": { ar: "عرض أقل", en: "Show less" },
    "collapse": { ar: "طي", en: "Collapse" },
    "rows": { ar: "صفوف", en: "rows" },
    "dateRange": { ar: "فترة العرض", en: "Date range" },
    "period": { ar: "الفترة", en: "Period" },
    "results": { ar: "النتائج", en: "Results" },
    "complete": { ar: "الاكتمال", en: "Completeness" },
    "symbol": { ar: "الرمز", en: "Symbol" },
    "name": { ar: "الاسم", en: "Name" },
    "market": { ar: "السوق", en: "Market" },
    "currency": { ar: "العملة", en: "Currency" },
    "type": { ar: "النوع", en: "Type" },
    "source": { ar: "المصدر", en: "Source" },
    "price": { ar: "السعر", en: "Price" },
    "target": { ar: "الهدف", en: "Target" },
    "stop": { ar: "وقف", en: "Stop" },
    "confidence": { ar: "الثقة", en: "Confidence" },
    "lastUpdated": { ar: "آخر تحديث", en: "Last updated" },
    "settings": { ar: "الإعدادات", en: "Settings" },
    "watchlist": { ar: "قائمة المتابعة", en: "Watchlist" },
    "analysis": { ar: "التحليل", en: "Analysis" },
    "news": { ar: "خبر", en: "News" },
    "open": { ar: "فتح", en: "Open" },
    "openAnalysis": { ar: "فتح التحليل", en: "Open analysis" },
    "underWatch": { ar: "تحت المتابعة", en: "Under watch" },
    "insufficientData": { ar: "بيانات غير كافية", en: "Insufficient data" },
    "unavailable": { ar: "غير متاح", en: "Unavailable" },
    "failed": { ar: "فشل", en: "Failed" },
    "connected": { ar: "متصل", en: "Connected" },
    "dataProviderConnected": { ar: "مزود البيانات متصل", en: "Data provider connected" },
    "previous": { ar: "السابق", en: "Previous" },
    "next": { ar: "التالي", en: "Next" },
    "page": { ar: "صفحة", en: "Page" },
    "asset": { ar: "الأصل", en: "Asset" },
    "action": { ar: "إجراء", en: "Action" },
    "exchange": { ar: "البورصة", en: "Exchange" },
    "sector": { ar: "القطاع", en: "Sector" },
    "industry": { ar: "الصناعة", en: "Industry" },
    "allMarkets": { ar: "كل الأسواق", en: "All markets" },
    "retry": { ar: "إعادة المحاولة", en: "Retry" }
  };
  const TERMINAL_TEXT_PAIRS = [
    ["MARKETS", "الأسواق"],
    ["MARKET", "السوق"],
    ["WATCHLIST", "قائمة المتابعة"],
    ["DASHBOARD", "لوحة التحكم"],
    ["SETTINGS", "الإعدادات"],
    ["AI ANALYSIS", "تحليل الذكاء الاصطناعي"],
    ["ANALYSIS", "التحليل"],
    ["SYSTEM", "النظام"],
    ["SYSTEM STATUS", "حالة النظام"],
    ["PROVIDER", "مزود البيانات"],
    ["PROVIDER MARKETS", "أسواق المزود"],
    ["PROVIDER STATUS", "حالة المزود"],
    ["DATA SOURCE", "مصدر البيانات"],
    ["SYMBOLS & RECOMMENDATIONS", "الرموز والتوصيات"],
    ["FULL SYMBOL UNIVERSE", "كل الرموز المتاحة"],
    ["MARKET NEWS", "أخبار السوق"],
    ["AI SCANNER", "ماسح الذكاء الاصطناعي"],
    ["SIGNALS", "الإشارات"],
    ["CONFIDENCE", "الثقة"],
    ["RISK RADAR", "رادار المخاطر"],
    ["STRONGEST", "الأقوى"],
    ["QUICK ADD", "إضافة سريعة"],
    ["MY WATCHLIST", "قائمتي"],
    ["PORTFOLIO", "المحفظة"],
    ["ALERTS", "التنبيهات"],
    ["RECOMMENDATIONS", "التوصيات"],
    ["TRADE PERFORMANCE", "أداء الصفقات"],
    ["NEWS", "الأخبار"],
    ["CALENDAR", "التقويم"],
    ["EDUCATION", "التعليم"],
    ["FINAL RECOMMENDATION", "التوصية النهائية"],
    ["STRATEGY AGREEMENT", "اتفاق الاستراتيجيات"],
    ["TECHNICAL", "التحليل الفني"],
    ["AI CONFIDENCE", "ثقة الذكاء الاصطناعي"],
    ["RELATED NEWS", "أخبار مرتبطة"],
    ["Price", "السعر"],
    ["Target", "الهدف"],
    ["Stop", "وقف"],
    ["Confidence", "الثقة"],
    ["Market", "السوق"],
    ["Currency", "العملة"],
    ["Type", "النوع"],
    ["Source", "المصدر"],
    ["Last updated", "آخر تحديث"],
    ["Open", "فتح"],
    ["Open analysis", "فتح التحليل"],
    ["Under watch", "تحت المتابعة"],
    ["Insufficient data", "بيانات غير كافية"],
    ["Data provider connected", "مزود البيانات متصل"],
    ["Hide ticker", "إخفاء الشريط"],
    ["Show ticker", "إظهار الشريط"],
    ["View all symbols", "عرض كل الرموز"],
    ["View all funds", "عرض كل الصناديق"],
    ["Settings", "الإعدادات"],
    ["Watchlist", "قائمة المتابعة"],
    ["Dashboard", "لوحة التحكم"],
    ["Markets", "الأسواق"],
    ["Connected", "متصل"],
    ["symbols", "رموز"],
    ["Symbol", "الرمز"],
    ["Company", "الشركة"],
    ["Name", "الاسم"],
    ["Exchange", "البورصة"],
    ["Sector", "القطاع"],
    ["Industry", "الصناعة"],
    ["Action", "إجراء"],
    ["Search", "بحث"],
    ["Refresh", "تحديث"],
    ["Previous", "السابق"],
    ["Next", "التالي"],
    ["Unavailable", "غير متاح"],
    ["Price unavailable", "السعر غير متاح"],
    ["Available", "متاح"],
    ["Failed", "فشل"],
    ["Loaded", "تم تحميله"],
    ["Status", "الحالة"],
    ["Updated", "آخر تحديث"],
    ["Real-time", "البيانات اللحظية"],
    ["Analyzed", "الأصول المحللة"],
    ["All markets", "كل الأسواق"],
    ["All exchanges", "كل البورصات"],
    ["All currencies", "كل العملات"],
    ["All sectors", "كل القطاعات"],
    ["All industries", "كل الصناعات"],
    ["All asset types", "كل أنواع الأصول"],
    ["All data", "كل البيانات"],
    ["With price", "بسعر متاح"],
    ["Price availability", "توفر السعر"],
    ["Market cap", "القيمة السوقية"],
    ["Volume", "الحجم"],
    ["Sort", "الترتيب"],
    ["Direction", "الاتجاه"],
    ["Ascending", "تصاعدي"],
    ["Descending", "تنازلي"],
    ["Issuer", "المصدر"],
    ["Yield", "العائد"],
    ["Expense ratio", "نسبة المصروفات"],
    ["Data quality", "جودة البيانات"],
    ["Shariah status", "حالة التوافق الشرعي"],
    ["Fund type", "نوع الصندوق"],
    ["Fund", "صندوق استثماري"],
    ["Funds", "الصناديق"],
    ["Funds filters", "فلاتر الصناديق"],
    ["Preview symbols", "رموز معاينة"],
    ["Full symbol universe", "كل الرموز المتاحة"],
    ["Market details", "تفاصيل السوق"],
    ["Provider markets summary", "ملخص أسواق المزود"],
    ["Admin diagnostics", "تشخيصات الإدارة"],
    ["After filters", "بعد الفلاتر"],
    ["Deduped catalog", "الفهرس بعد الدمج"],
    ["Incomplete rows", "صفوف غير مكتملة"],
    ["Merged rows", "صفوف مدمجة"],
    ["Visible", "ظاهرة"],
    ["Hidden", "مخفية"],
    ["Duplicates", "مكررة"],
    ["Detailed provider market rows are available under Settings / Admin diagnostics.", "صفوف أسواق المزود المفصلة متاحة ضمن الإعدادات / تشخيصات الإدارة."],
    ["Some symbols may not be available from the current provider", "قد لا تتوفر جميع الرموز من المزود الحالي"],
    ["Price currently unavailable", "السعر غير متاح حالياً"],
    ["No provider data is available right now.", "لا توجد بيانات حالياً من المزود."],
    ["These are educational analytical signals based on available data and are not financial advice.", "هذه إشارات تحليلية تعليمية مبنية على البيانات المتاحة، ولا تُعد نصيحة مالية."],
    ["Search symbol or company name", "ابحث عن رمز أو شركة"],
    ["Analyze", "تحليل"],
    ["Open analysis", "فتح التحليل"],
    ["Add to watchlist", "أضف للمتابعة"],
    ["Create alert", "أنشئ تنبيه"],
    ["Remove", "إزالة"],
    ["Watching", "تحت المتابعة"],
    ["Wait", "انتظار"],
    ["Buy", "شراء"],
    ["Sell", "بيع"],
    ["Neutral", "محايد"],
    ["Change", "التغير"],
    ["Recommendation", "التوصية"],
    ["Risk", "المخاطرة"],
    ["Horizon", "المدة"],
    ["Quality", "الجودة"],
    ["Provider symbol", "رمز المزود"],
    ["Fallback", "الاحتياطي"],
    ["Data", "البيانات"],
    ["Final", "النهائي"],
    ["Consensus", "الاتفاق"],
    ["Backtest", "الاختبار الخلفي"],
    ["Samples", "العينات"],
    ["Report date", "تاريخ التقرير"],
    ["Fiscal period", "الفترة المالية"],
    ["EPS est.", "ربحية السهم المتوقعة"],
    ["EPS actual", "ربحية السهم الفعلية"],
    ["Revenue est.", "الإيرادات المتوقعة"],
    ["Revenue actual", "الإيرادات الفعلية"],
    ["Time", "التوقيت"],
    ["Completeness", "الاكتمال"],
    ["Declaration", "الإعلان"],
    ["Ex-date", "تاريخ الاستحقاق"],
    ["Record", "تاريخ السجل"],
    ["Payment", "الدفع"],
    ["Dividend", "التوزيع"],
    ["IPO date", "تاريخ الاكتتاب"],
    ["Price range", "نطاق السعر"],
    ["Shares", "الأسهم"],
    ["Event", "الحدث"],
    ["Country", "الدولة"],
    ["Actual", "الفعلي"],
    ["Forecast", "المتوقع"],
    ["Previous", "السابق"],
    ["Importance", "الأهمية"]
  ];
  const THEME_VALUES = ["dark", "light", "system"];
  const DEFAULT_THEME = "dark";
  let systemThemeQuery = null;
  const TRANSLATION_EN_TO_AR = new Map();
  const TRANSLATION_AR_TO_EN = new Map();
  const TRANSLATION_FRAGMENTS = [];
  Object.values(TERMINAL_I18N).forEach((entry) => registerTranslationPair(entry.ar, entry.en));
  TERMINAL_TEXT_PAIRS.forEach(([en, ar]) => registerTranslationPair(ar, en));
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const leadershipCore = ["NAS100", "US30", "XAUUSD", "BTCUSD"];
  const INITIAL_LOADING_MAX_MS = 4500;
  const REQUEST_TIMEOUTS = { providerStatus: 8000, quotes: 30000, signals: 8000, news: 12000, calendar: 15000, default: 10000 };
  const MARKET_UNIVERSE_PAGE_SIZE = 50;
  const UNAVAILABLE_MESSAGE = "تعذر تحميل هذه البيانات حالياً";
  const ROUTE_UNAVAILABLE_MESSAGE = "المسار غير متاح حالياً";
  const COVERAGE_NOTICE_AR = "قد لا تتوفر جميع الرموز من المزود الحالي";
  const COVERAGE_NOTICE_EN = "Some symbols may not be available from the current provider";
  const PRICE_UNAVAILABLE_AR = "\u0627\u0644\u0633\u0639\u0631 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d";
  const PRICE_UNAVAILABLE_EN = "Price unavailable";
  const CHANGE_UNAVAILABLE_AR = "\u0627\u0644\u062a\u063a\u064a\u0631 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d";
  const CHANGE_UNAVAILABLE_EN = "Change unavailable";
  const TECHNICAL_UNAVAILABLE_COPY = {
    ar: {
      title: "التحليل الفني غير متاح حالياً",
      description: "لم يتمكن مزود البيانات الحالي من توفير مؤشرات فنية كافية لهذا الأصل.",
      reasonsTitle: "الأسباب المحتملة",
      reasons: [
        "الرمز غير مدعوم من المزود الحالي",
        "بيانات الأسعار التاريخية غير كافية",
        "الأصل حديث أو منخفض السيولة",
        "يوجد تأخير مؤقت من مزود البيانات"
      ],
      finalNote: "تم تحويل حالة الأصل إلى: تحت المراقبة",
      retry: "إعادة المحاولة",
      changeProvider: "تغيير المزود",
      viewPriceData: "عرض بيانات السعر",
      detailsTitle: "تفاصيل الحالة",
      reasonLabel: "السبب",
      missingFieldsLabel: "الحقول الناقصة",
      fallbackLabel: "المحاولة البديلة",
      providerLabel: "المزود",
      providerSymbolLabel: "رمز المزود"
    },
    en: {
      title: "Technical analysis is currently unavailable",
      description: "The current data provider could not return enough technical indicators for this asset.",
      reasonsTitle: "Possible reasons",
      reasons: [
        "The symbol is not supported by the current provider",
        "Historical price data is missing",
        "The asset is new or has low liquidity",
        "Temporary provider delay"
      ],
      finalNote: "Asset status changed to: Watch",
      retry: "Retry analysis",
      changeProvider: "Change provider",
      viewPriceData: "View price data",
      detailsTitle: "Status details",
      reasonLabel: "Reason",
      missingFieldsLabel: "Missing fields",
      fallbackLabel: "Fallback attempted",
      providerLabel: "Provider",
      providerSymbolLabel: "Provider symbol"
    }
  };
  const CRYPTO_DISPLAY_BASES = new Set(["BTC", "ETH", "BNB", "ADA", "APT", "AAVE", "APE", "ALGO", "ATOM", "AVAX", "BCH", "AXS", "ARB", "SOL", "XRP", "DOGE", "DOT", "LTC", "LINK", "USDT", "USDC", "TON", "SUI", "PEPE", "TRX", "XLM", "FIL", "ICP", "ETC", "HBAR", "VET", "NEAR", "OP", "INJ", "GRT", "STX", "COMP"]);
  const DEV_DIAGNOSTICS = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.endsWith(".local");
  const PROVIDER_STATUS_LABELS = {
    provider_status_failed: {
      ar: "تعذر الاتصال بمزود البيانات حالياً",
      en: "Unable to connect to the data provider right now"
    },
    provider_status_loading: {
      ar: "جاري تحميل بيانات المزود",
      en: "Loading provider data"
    },
    provider_status_available: {
      ar: "مزود البيانات متصل",
      en: "Data provider connected"
    },
    provider_status_partial: {
      ar: "بيانات المزود متاحة جزئياً",
      en: "Provider data is partially available"
    },
    provider_status_unknown: {
      ar: "حالة مزود البيانات غير معروفة",
      en: "Unknown provider status"
    }
  };
  const PROVIDER_STATUS_EXPLANATION = {
    ar: "سيتم عرض البيانات المتاحة فقط، وقد تكون بعض الأسعار أو التحليلات غير مكتملة.",
    en: "Only available data will be shown. Some prices or analysis may be incomplete."
  };
  const PROVIDER_RETRY_LABEL = { ar: "إعادة المحاولة", en: "Retry" };
  const SETTINGS_COPY = {
    settings: { ar: "الإعدادات", en: "Settings" },
    heroTitle: { ar: "إعدادات النظام", en: "System settings" },
    heroBody: {
      ar: "اضبط اللغة والمظهر وتفضيلات الإشارات، وراجع حالة مزود البيانات بوضوح.",
      en: "Tune language, theme, signal preferences, and data-provider status in one clean workspace."
    },
    provider: { ar: "مزود البيانات", en: "Data provider" },
    signalPreferences: { ar: "تفضيلات الإشارات", en: "Signal preferences" },
    dataPolicy: { ar: "سياسة البيانات", en: "Data policy" },
    about: { ar: "حول المنصة", en: "About" },
    platformActions: { ar: "إجراءات المنصة", en: "Platform actions" },
    language: { ar: "اللغة", en: "Language" },
    theme: { ar: "المظهر", en: "Theme" },
    dataActions: { ar: "إجراءات البيانات", en: "Data actions" },
    defaultMarket: { ar: "السوق الافتراضي", en: "Default market" },
    riskProfile: { ar: "ملف المخاطر", en: "Risk profile" },
    minConfidence: { ar: "حد الثقة الأدنى", en: "Minimum confidence" },
    enabledMarkets: { ar: "الأسواق المفعلة", en: "Enabled markets" },
    signalChannels: { ar: "قنوات وتنبيهات الإشارات", en: "Signal alert channels" },
    quickTicker: { ar: "عرض شريط الأسعار السريع", en: "Show quick price ticker" },
    buyAlerts: { ar: "تنبيهات الشراء", en: "Buy alerts" },
    sellAlerts: { ar: "تنبيهات البيع", en: "Sell alerts" },
    waitAlerts: { ar: "تنبيهات الانتظار والمراقبة", en: "Wait and watch alerts" },
    inAppAlerts: { ar: "تنبيهات داخل المنصة", en: "In-app alerts" },
    emailAlerts: { ar: "البريد الإلكتروني عند توفر الخدمة", en: "Email when available" },
    quickTickerHint: { ar: "يعرض شريط الأسعار المختصر أعلى المنصة.", en: "Shows the compact price ticker at the top of the terminal." },
    buyAlertsHint: { ar: "إظهار إشارات الشراء عند توفر بيانات كافية.", en: "Show buy signals when enough provider data is available." },
    sellAlertsHint: { ar: "إظهار إشارات البيع وخروج المخاطر.", en: "Show sell and risk-exit signals." },
    waitAlertsHint: { ar: "إظهار حالات الانتظار والمراقبة بدل تجاهلها.", en: "Show wait and watch states instead of hiding them." },
    inAppAlertsHint: { ar: "حفظ التنبيهات داخل تجربة المنصة.", en: "Keep alerts visible inside the terminal." },
    emailAlertsHint: { ar: "يعمل عند تفعيل مزود البريد لاحقاً.", en: "Activates when an email provider is configured." },
    save: { ar: "حفظ التفضيلات", en: "Save preferences" },
    arabic: { ar: "العربية", en: "Arabic" },
    english: { ar: "الإنجليزية", en: "English" },
    dark: { ar: "داكن", en: "Dark" },
    light: { ar: "فاتح", en: "Light" },
    system: { ar: "النظام", en: "System" },
    refreshMarketData: { ar: "تحديث بيانات السوق", en: "Refresh market data" },
    retryNow: { ar: "إعادة المحاولة الآن", en: "Retry now" },
    clearProviderCache: { ar: "مسح الكاش", en: "Clear cache" },
    testProviderConnection: { ar: "اختبار الاتصال", en: "Test provider connection" },
    providerStatus: { ar: "الحالة", en: "Status" },
    providerName: { ar: "المزود", en: "Provider" },
    providerConnection: { ar: "الاتصال", en: "Connection" },
    loadedSymbols: { ar: "الرموز المحملة", en: "Loaded symbols" },
    discoveredSymbols: { ar: "الرموز المكتشفة", en: "Discovered symbols" },
    cachedSymbols: { ar: "الرموز المخزنة", en: "Cached symbols" },
    failedSymbols: { ar: "الرموز المتعثرة", en: "Failed symbols" },
    affectedSymbols: { ar: "الرموز المتأثرة", en: "Affected symbols" },
    affectedSymbolsCount: { ar: "عدد الرموز المتأثرة", en: "Affected symbols count" },
    lastAttempt: { ar: "آخر محاولة", en: "Last attempt" },
    nextRetry: { ar: "إعادة المحاولة التالية", en: "Next retry" },
    fallbackAttempted: { ar: "تمت محاولة مزود بديل", en: "Fallback attempted" },
    rejectionReason: { ar: "سبب الرفض", en: "Rejection reason" },
    advancedDiagnostics: { ar: "تشخيصات متقدمة", en: "Advanced Diagnostics" },
    noAdvancedDiagnostics: { ar: "لا توجد تفاصيل تشخيص نشطة للعرض.", en: "No active diagnostic details to show." },
    rateLimitNotice: {
      ar: "تم الوصول مؤقتاً إلى حد استخدام مزود البيانات. سنحاول استخدام مزود بديل أو إعادة المحاولة لاحقاً.",
      en: "The data provider usage limit was reached temporarily. We will try a fallback provider or retry later."
    },
    lastUpdated: { ar: "آخر تحديث", en: "Last updated" },
    configured: { ar: "مهيأ", en: "Configured" },
    notConfigured: { ar: "غير مهيأ", en: "Not configured" },
    supportedFeatures: { ar: "الميزات المدعومة", en: "Supported features" },
    noFeatures: { ar: "غير متاح", en: "Unavailable" },
    languageDirectionTitle: { ar: "اللغة والاتجاه", en: "Language and direction" },
    languageDirectionBody: {
      ar: "العربية تعمل من اليمين إلى اليسار، والرموز والأرقام تبقى معزولة باتجاهها الرسمي.",
      en: "Arabic uses RTL layout, while symbols and numbers stay isolated in their official direction."
    },
    noSyntheticTitle: { ar: "لا بيانات وهمية", en: "No synthetic data" },
    noSyntheticBody: {
      ar: "لا نولّد أسعاراً أو توصيات بديلة عند غياب المزود؛ تظهر البيانات المتاحة فقط.",
      en: "The terminal does not invent prices or recommendations when provider data is unavailable."
    },
    aboutBody: { ar: `منصة تداول وتحليل ذكية. إصدار ${VER}.`, en: `AI trading and analysis terminal. Version ${VER}.` },
    savedPreferences: { ar: "تم حفظ تفضيلات الإشارات.", en: "Signal preferences saved." },
    savedLocal: { ar: "تم حفظها محلياً؛ يلزم تسجيل الدخول لحفظها في الحساب.", en: "Saved locally; sign in to save them to the account." },
    refreshed: { ar: "تم تحديث بيانات السوق.", en: "Market data refreshed." },
    tested: { ar: "تم اختبار اتصال مزود البيانات.", en: "Provider connection tested." },
    cacheCleared: { ar: "تم مسح كاش المزود المحلي وتحديث الحالة.", en: "Local provider cache cleared and status refreshed." },
    actionFailed: { ar: "تعذر تنفيذ الإجراء حالياً.", en: "Could not complete the action right now." },
    conservative: { ar: "محافظ", en: "Conservative" },
    balanced: { ar: "متوازن", en: "Balanced" },
    aggressive: { ar: "هجومي", en: "Aggressive" },
    symbolCount: { ar: "رمز", en: "symbols" }
  };
  const SIGNAL_MARKET_OPTIONS = [
    { id: "US", ar: "السوق الأمريكي", en: "US market" },
    { id: "Kuwait", ar: "بورصة الكويت", en: "Kuwait" },
    { id: "Saudi", ar: "السوق السعودي", en: "Saudi Arabia" },
    { id: "UAE", ar: "أسواق الإمارات", en: "UAE" },
    { id: "Qatar", ar: "سوق قطر", en: "Qatar" },
    { id: "Bahrain", ar: "سوق البحرين", en: "Bahrain" },
    { id: "Oman", ar: "سوق عمان", en: "Oman" },
    { id: "Forex", ar: "العملات", en: "Forex" },
    { id: "Crypto", ar: "الأصول الرقمية", en: "Crypto" },
    { id: "Commodities", ar: "السلع", en: "Commodities" }
  ];

  const routes = {
    dashboard: "غرفة قيادة السوق", markets: "خريطة الأسواق", "ai-scanner": "ماسح الذكاء الاصطناعي",
    watchlist: "قائمة المتابعة الذكية", portfolio: "المحفظة", alerts: "مركز التنبيهات",
    recommendations: "التوصيات والتحليل", "trade-performance": "أداء الصفقات", news: "أخبار السوق",
    calendar: "تقويم السوق", education: "مركز التعليم", settings: "إعدادات النظام", "symbol-details": "تفاصيل الرمز"
  };

  const MARKET_SYMBOLS = {
    usStocks: ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "GOOGL", "NFLX", "AMD", "INTC", "JPM", "BAC", "V", "MA", "DIS", "KO", "PEP", "MCD", "WMT", "COST"],
    forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURJPY", "GBPJPY"],
    crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD"],
    commodities: ["XAUUSD", "XAGUSD", "WTI", "BRENT", "GC=F", "SI=F", "CL=F", "BZ=F"],
    indices: ["US30", "NAS100", "SPX500", "DAX", "FTSE", "CAC40", "NIKKEI", "HSI", "DXY"],
    etfs: ["SPY", "QQQ", "VOO", "DIA", "IWM", "GLD", "SLV", "VTI", "VEA", "VWO", "AGG", "BND", "TLT", "HYG"],
    saudi: ["2222.SR", "1120.SR", "1180.SR", "2010.SR", "7010.SR", "1211.SR", "1010.SR", "1020.SR", "1050.SR", "1060.SR", "1080.SR", "2020.SR", "2380.SR", "2280.SR", "4002.SR", "4004.SR", "4013.SR", "4164.SR", "4190.SR", "4300.SR", "8010.SR", "8210.SR", "7203.SR", "7020.SR"],
    kuwait: ["KFH.KW", "NBK.KW", "ZAIN.KW", "BOUBYAN.KW", "GBK.KW", "BURG.KW", "CBK.KW", "AGLTY.KW", "KIB.KW", "WARBA.KW", "MABANEE.KW", "HUMANSOFT.KW", "STC.KW", "ALIMTIAZ.KW", "GULFBANK.KW", "NIND.KW", "KAMCO.KW", "MEZZAN.KW", "JAZEERA.KW", "ALAFCO.KW"],
    uae: ["EMAAR.AE", "DIB.AE", "DEWA.AE", "SALIK.AE", "DU.AE", "DFM.AE", "EMIRATESNBD.AE", "AIRARABIA.AE", "EMAARDEV.AE", "TALABAT.AE", "FAB.AE", "ETISALAT.AE"],
    qatar: ["QNBK.QA", "QIBK.QA", "IQCD.QA", "MARK.QA", "CBQK.QA", "DHBK.QA", "ABQK.QA", "QIIK.QA", "QISI.QA", "ORDS.QA", "VFQS.QA", "QEWS.QA", "MPHC.QA", "QGTS.QA", "QAMC.QA", "BRES.QA", "ERES.QA", "UDCD.QA", "GWCS.QA", "MERS.QA"],
    bahrain: ["AUB.BH", "GFH.BH", "BATELCO.BH", "NBB.BH", "BBK.BH", "ABC.BH", "BISB.BH", "SALAM.BH", "ZAINBH.BH", "ALBH.BH", "SEEF.BH", "ESTERAD.BH", "TRAFCO.BH", "KHCB.BH"],
    oman: ["BKMB.OM", "OMINV.OM", "NBOB.OM", "OMAB.OM", "ORED.OM", "MSMI.OM", "RAYS.OM", "SMNP.OM", "ALMI.OM", "DHOF.OM", "OQGN.OM", "NAPI.OM", "DBIH.OM", "HBMO.OM", "MAZOON.OM"],
    europe: ["ASML.AS", "SAP.DE", "NESN.SW", "MC.PA", "SHEL.L", "NOVO-B.CO", "AZN.L", "HSBA.L", "ULVR.L", "SIE.DE", "OR.PA", "TTE.PA", "AIR.PA", "SU.PA", "AI.PA", "IBE.MC", "SAN.MC", "ITX.MC", "ENEL.MI", "UCG.MI", "ROG.SW", "NOVN.SW"],
    asia: ["7203.T", "9988.HK", "TSM", "005930.KS", "6758.T", "9984.T", "0700.HK", "1299.HK", "2330.TW", "2317.TW", "BABA", "SONY", "TM", "NIO", "JD", "BIDU"],
    technology: ["AAPL", "MSFT", "GOOGL", "GOOG", "ORCL", "CRM", "ADBE", "NOW", "SNOW", "PANW", "CRWD", "SHOP", "INTU", "ADP", "IBM", "CSCO", "NET", "UBER", "PLTR", "DELL"],
    ai: ["NVDA", "MSFT", "GOOGL", "GOOG", "AMD", "PLTR", "META", "AMZN", "AVGO", "TSM", "ASML", "CRM", "NOW", "SNOW", "AI", "PATH", "SOUN", "ARM", "SMCI", "MU"],
    semiconductors: ["NVDA", "AMD", "INTC", "AVGO", "TSM", "ASML", "QCOM", "TXN", "MU", "AMAT", "LRCX", "KLAC", "MRVL", "MCHP", "ON", "NXPI", "ADI", "MPWR", "ARM", "SMCI", "TER", "SWKS", "QRVO", "LSCC", "COHR", "UMC", "GFS", "WOLF"],
    energy: ["XOM", "CVX", "2222.SR", "OXY", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "HAL", "BKR", "SHEL.L", "TTE.PA", "ADNOCDIST.AE", "ADNOCGAS.AD"],
    banking: ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TD", "RY", "HSBA.L", "SAN.MC", "UCG.MI", "NBK.KW", "KFH.KW", "QNBK.QA", "QIBK.QA", "1120.SR", "1180.SR", "AUB.BH", "BKMB.OM"],
    food: ["KO", "PEP", "MCD", "COST", "WMT", "PG", "MDLZ", "SBUX", "YUM", "KHC", "GIS", "K", "HSY", "TSN", "ULVR.L", "NESN.SW"],
    healthcare: ["LLY", "PFE", "JNJ", "MRK", "UNH", "ABBV", "ABT", "TMO", "DHR", "BMY", "AMGN", "GILD", "ISRG", "VRTX", "AZN.L", "NOVN.SW", "ROG.SW"]
  };

  // [id, ar, en, family, currency, monitoredSymbols, tone, apiMarket]
  const MARKETS = [
    ["us-stocks", "الأسهم الأمريكية", "US Stocks", "Equities", "USD", MARKET_SYMBOLS.usStocks, "featured", "us-stocks"],
    ["forex", "العملات", "Forex", "FX", "Pair", MARKET_SYMBOLS.forex, "", "forex"],
    ["crypto", "الأصول الرقمية", "Crypto", "Digital", "USD", MARKET_SYMBOLS.crypto, "featured", "crypto"],
    ["commodities", "السلع", "Commodities", "Macro", "USD", MARKET_SYMBOLS.commodities, "", "commodities"],
    ["indices", "المؤشرات", "Indices", "Benchmarks", "Local", MARKET_SYMBOLS.indices, "", "indices"],
    ["etfs", "الصناديق الاستثمارية", "Funds & ETFs", "Funds", "Mixed", MARKET_SYMBOLS.etfs, "", "etfs"],
    ["saudi", "السوق السعودي", "Saudi Market", "Tadawul", "SAR", MARKET_SYMBOLS.saudi, "", "saudi"],
    ["kuwait", "بورصة الكويت", "Kuwait Market", "Boursa", "KWD", MARKET_SYMBOLS.kuwait, "", "kuwait"],
    ["uae", "سوق الإمارات", "UAE Market", "ADX/DFM", "AED", MARKET_SYMBOLS.uae, "", "uae"],
    ["qatar", "سوق قطر", "Qatar Market", "QSE", "QAR", MARKET_SYMBOLS.qatar, "", "qatar"],
    ["bahrain", "سوق البحرين", "Bahrain Market", "BHB", "BHD", MARKET_SYMBOLS.bahrain, "", "bahrain"],
    ["oman", "سوق عمان", "Oman Market", "MSX", "OMR", MARKET_SYMBOLS.oman, "", "oman"],
    ["europe", "الأسهم الأوروبية", "European Stocks", "Global", "EUR", MARKET_SYMBOLS.europe, "", "europe"],
    ["asia", "الأسهم الآسيوية", "Asian Stocks", "Global", "Mixed", MARKET_SYMBOLS.asia, "", "asia"],
    ["technology", "أسهم التقنية", "Technology", "Sector", "USD", MARKET_SYMBOLS.technology, "", "technology"],
    ["ai", "أسهم الذكاء الاصطناعي", "AI Stocks", "Sector", "USD", MARKET_SYMBOLS.ai, "featured", "ai"],
    ["semiconductors", "أشباه الموصلات", "Semiconductors", "Sector", "USD", MARKET_SYMBOLS.semiconductors, "", "semiconductors"],
    ["energy", "الطاقة", "Energy Stocks", "Sector", "Mixed", MARKET_SYMBOLS.energy, "", "energy"],
    ["banking", "البنوك", "Banking Stocks", "Sector", "Mixed", MARKET_SYMBOLS.banking, "", "banking"],
    ["food", "الأغذية والاستهلاك", "Food / Consumer", "Sector", "USD", MARKET_SYMBOLS.food, "", "food"],
    ["healthcare", "الصحة والدواء", "Pharma / Healthcare", "Sector", "USD", MARKET_SYMBOLS.healthcare, "", "healthcare"]
  ].map(([id, ar, en, family, currency, symbols, tone, apiMarket]) => ({ id, ar, en, family, currency, symbols, tone, apiMarket }));

  const EXPLORE = ["forex", "us-stocks", "kuwait", "saudi", "uae", "qatar", "bahrain", "europe", "asia", "crypto", "commodities", "indices", "etfs", "technology", "ai", "semiconductors", "energy", "banking", "healthcare", "food"];
  const FUND_FILTERS = [
    ["all", "الكل", "All"],
    ["etf", "الصناديق المتداولة ETF", "ETFs"],
    ["mutual_fund", "الصناديق الاستثمارية المشتركة", "Mutual Funds"],
    ["index_fund", "صناديق المؤشرات", "Index Funds"],
    ["money_market_fund", "صناديق سوق النقد", "Money Market Funds"],
    ["bond_sukuk_fund", "صناديق السندات والصكوك", "Bond/Sukuk Funds"],
    ["reit", "صناديق الاستثمار العقاري REITs", "REITs"],
    ["commodity_fund", "صناديق السلع", "Commodity Funds"],
    ["sector_fund", "الصناديق القطاعية", "Sector Funds"],
    ["thematic_fund", "الصناديق الموضوعية", "Thematic Funds"],
    ["shariah_fund", "الصناديق المتوافقة مع الشريعة", "Shariah Funds"],
    ["leveraged_etf", "الصناديق ذات الرافعة", "Leveraged ETFs"],
    ["inverse_etf", "الصناديق العكسية", "Inverse ETFs"],
    ["income_fund", "صناديق الدخل", "Income Funds"],
    ["growth_fund", "صناديق النمو", "Growth Funds"],
    ["balanced_fund", "الصناديق المتوازنة", "Balanced Funds"]
  ];
  const FUND_TYPE_LABELS = {
    fund: ["صندوق استثماري", "Fund"],
    etf: ["الصناديق المتداولة", "Exchange Traded Funds"],
    mutual_fund: ["الصناديق الاستثمارية المشتركة", "Mutual Funds"],
    index_fund: ["صناديق المؤشرات", "Index Funds"],
    money_market_fund: ["صناديق سوق النقد", "Money Market Funds"],
    bond_fund: ["صناديق السندات والصكوك", "Bond Funds"],
    sukuk_fund: ["صناديق الصكوك", "Sukuk Funds"],
    reit: ["صناديق الاستثمار العقاري", "Real Estate Investment Trusts"],
    commodity_fund: ["صناديق السلع", "Commodity Funds"],
    sector_fund: ["الصناديق القطاعية", "Sector Funds"],
    thematic_fund: ["الصناديق الموضوعية", "Thematic Funds"],
    shariah_compliant_fund: ["الصناديق المتوافقة مع الشريعة", "Shariah-Compliant Funds"],
    leveraged_etf: ["الصناديق المتداولة ذات الرافعة المالية", "Leveraged ETFs"],
    inverse_etf: ["الصناديق العكسية المتداولة", "Inverse ETFs"],
    income_fund: ["صناديق الدخل", "Income Funds"],
    growth_fund: ["صناديق النمو", "Growth Funds"],
    balanced_fund: ["الصناديق المتوازنة", "Balanced Funds"],
    hedge_fund: ["صناديق التحوط", "Hedge Funds"]
  };
  const SELECTION_EMPTY_STATE_AR = "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0635\u0648\u0644 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0633\u0648\u0642 \u0623\u0648 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u062d\u0627\u0644\u064a\u0627\u064b";
  const SELECTION_EMPTY_STATE_EN = "No matching assets for this market or category right now";
  const FUND_EMPTY_STATE_AR = "لا توجد صناديق مطابقة لهذا السوق أو التصنيف حالياً";
  const FUND_EMPTY_STATE_EN = "No matching funds for this market or category right now";
  const FUND_PROVIDER_NOTE_AR = "قد لا يدعم المزود الحالي جميع أنواع الصناديق";
  const FUND_PROVIDER_NOTE_EN = "The current provider may not support all fund types";
  const STRICT_LOCAL_MARKETS = {
    qatar: { country: "Qatar", countries: ["QA", "QATAR"], currency: "QAR", exchange: /QATAR|QSE|DSMD|DSM/i, market: /QATAR|QSE/i, suffix: /\.QA$/i },
    kuwait: { country: "Kuwait", countries: ["KW", "KUWAIT"], currency: "KWD", exchange: /KUWAIT|BOURSA|KSE|XKUW/i, market: /KUWAIT|BOURSA/i, suffix: /\.KW$/i },
    bahrain: { country: "Bahrain", countries: ["BH", "BAHRAIN"], currency: "BHD", exchange: /BAHRAIN|BHB|XBAH/i, market: /BAHRAIN|BHB/i, suffix: /\.BH$/i },
    saudi: { country: "Saudi Arabia", countries: ["SA", "SAUDI", "SAUDI ARABIA"], currency: "SAR", exchange: /SAUDI|TADAWUL|XSAU/i, market: /SAUDI|TADAWUL/i, suffix: /\.(SR|SA)$/i },
    uae: { country: "UAE", countries: ["AE", "UAE", "UNITED ARAB EMIRATES"], currency: "AED", exchange: /ADX|DFM|ABU DHABI|DUBAI|XADS|XDFM/i, market: /UAE|ADX|DFM|ABU DHABI|DUBAI|UNITED ARAB/i, suffix: /\.(AE|DU|AD)$/i }
  };
  const CATEGORY_MARKET_IDS = new Set(["technology", "semiconductors", "crypto", "forex", "commodities", "etfs", "indices"]);
  const US_EXCHANGE_RE = /\b(NASDAQ|NYSE|AMEX|CBOE|ARCX|NYSE ARCA)\b/i;
  const TECHNOLOGY_SYMBOLS = new Set([...MARKET_SYMBOLS.technology, ...MARKET_SYMBOLS.ai, ...MARKET_SYMBOLS.semiconductors].map(s => String(s).toUpperCase()));
  const SEMICONDUCTOR_SYMBOLS = new Set(MARKET_SYMBOLS.semiconductors.map(s => String(s).toUpperCase()));

  const SESSIONS = [
    // [الاسم, top%, left%, النوع, فتح, إغلاق, اتجاه إزاحة التسمية]
    ["New York", 11, 88, "west", 13.5, 20, "left"],
    ["London", 27, 31, "west", 8, 16.5, "left"],
    ["Frankfurt", 34, 35, "west", 7, 15.5, "left"],
    ["Riyadh", 46, 61.5, "gulf", 7, 12, "up"],
    ["Kuwait", 42, 60, "gulf", 6.5, 9.5, "left"],
    ["Dubai", 52, 64, "gulf", 6, 11, "down"],
    ["Tokyo", 45, 87, "west", 0, 6, "right"],
    ["Hong Kong", 55, 82, "west", 1.5, 8, "right"],
    ["Sydney", 62, 89, "west", 0, 6, "right"],
  ];
  function sessionState(kind, openH, closeH) {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const weekend = kind === "gulf" ? (day === 5 || day === 6) : (day === 0 || day === 6);
    const t = now.getUTCHours() + now.getUTCMinutes() / 60;
    const open = !weekend && t >= openH && t < closeH;
    const fmt = (v) => { const hh = Math.floor(v), mm = Math.round((v - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
    return { open, label: open ? `يغلق ${fmt(closeH)} UTC` : `يفتح ${fmt(openH)} UTC` };
  }

  const LESSONS = {
    "أساسيات": [
      ["كيف تقرأ توصية AI؟", "التوصية لا تظهر إلا عند وجود مزود بيانات وتحليل مكتمل. عند غياب المزود سترى حالة فارغة بدل أرقام مصطنعة."],
      ["العملة حسب الأصل", "كل أصل يستخدم عملته الخاصة من بيانات الرمز أو السوق، وليس من السوق المختار في الواجهة."],
      ["السوق مقابل الرمز", "اختيار السوق يصفّي الرموز فقط؛ السعر والعملة يأتيان من الرمز نفسه."]
    ],
    "إدارة المخاطر": [
      ["حجم الصفقة", "حدد حجم المركز ونسبة المخاطرة من رأس المال قبل الدخول في أي صفقة."],
      ["وقف الخسارة", "ضع نقطة إلغاء واضحة قبل الدخول، والتزم بها دون تحريكها عاطفياً."],
      ["العائد إلى المخاطرة", "ابحث عن صفقات بنسبة عائد/مخاطرة 2:1 على الأقل."]
    ],
    "التحليل الفني": [
      ["الدعم والمقاومة", "مناطق يتكرر عندها ارتداد السعر؛ تُستخدم لتحديد الدخول والأهداف."],
      ["الاتجاه", "تداول مع الاتجاه العام أعلى احتمالاً من معاكسته."],
      ["الحجم", "تأكيد الحركة السعرية بحجم تداول مرتفع يزيد موثوقيتها."]
    ],
    "المحفظة": [
      ["التنويع", "وزّع المخاطر عبر أسواق وقطاعات مختلفة لتقليل أثر أصل واحد."],
      ["التوزيع", "حدد نسبة كل فئة أصول وأعد التوازن دورياً."]
    ]
  };

  // Brand color map for recognizable tickers (badge fallback, no external network).
  const BRAND = {
    AAPL: ["A", "#e6e9ee", "#0b0b0d"], MSFT: ["⊞", "#ffffff", "#00a4ef"], GOOGL: ["G", "#ffffff", "#4285f4"], GOOG: ["G", "#ffffff", "#4285f4"],
    NVDA: ["N", "#0b1f0b", "#76b900"], AMZN: ["a", "#0b0b0d", "#ff9900"], META: ["M", "#ffffff", "#0866ff"], TSLA: ["T", "#ffffff", "#e82127"],
    AMD: ["A", "#ffffff", "#ed1c24"], INTC: ["i", "#ffffff", "#0071c5"], NFLX: ["N", "#ffffff", "#e50914"], CRM: ["S", "#ffffff", "#00a1e0"],
    ORCL: ["O", "#ffffff", "#f80000"], JPM: ["J", "#0b0b0d", "#a6804f"], BAC: ["B", "#ffffff", "#012169"], LLY: ["L", "#ffffff", "#d52b1e"],
    PFE: ["P", "#ffffff", "#0093d0"], JNJ: ["J", "#0b0b0d", "#d51900"], MRK: ["M", "#ffffff", "#00857c"], KO: ["C", "#ffffff", "#f40009"],
    PEP: ["P", "#ffffff", "#004b93"], MCD: ["M", "#27251f", "#ffc72c"], COST: ["C", "#ffffff", "#e31837"], PLTR: ["P", "#ffffff", "#101113"],
    AVGO: ["B", "#ffffff", "#cc0000"], TSM: ["T", "#ffffff", "#d4002a"], XOM: ["E", "#ffffff", "#ee1c25"], CVX: ["C", "#ffffff", "#0066b2"], OXY: ["O", "#ffffff", "#d6112b"]
  };
  const CRYPTO = { BTC: ["₿", "#f7931a"], ETH: ["Ξ", "#627eea"], BNB: ["◆", "#f3ba2f"], SOL: ["◎", "#14f195"], XRP: ["✕", "#23292f"], ADA: ["₳", "#0033ad"], DOGE: ["Ð", "#c2a633"], USDT: ["₮", "#26a17b"] };
  const GULF_FLAG = { KW: "🇰🇼", SR: "🇸🇦", SA: "🇸🇦", AE: "🇦🇪", QA: "🇶🇦", BH: "🇧🇭", OM: "🇴🇲" };
  // ticker -> company domain for favicon fallback; failed images remove themselves and leave the badge.
  const DOMAINS = {
    AAPL: "apple.com", MSFT: "microsoft.com", GOOGL: "google.com", GOOG: "google.com", NVDA: "nvidia.com",
    AMZN: "amazon.com", META: "meta.com", TSLA: "tesla.com", AMD: "amd.com", INTC: "intel.com",
    NFLX: "netflix.com", CRM: "salesforce.com", ORCL: "oracle.com", JPM: "jpmorganchase.com", BAC: "bankofamerica.com",
    LLY: "lilly.com", PFE: "pfizer.com", JNJ: "jnj.com", MRK: "merck.com", KO: "coca-cola.com", PEP: "pepsi.com",
    MCD: "mcdonalds.com", COST: "costco.com", PLTR: "palantir.com", AVGO: "broadcom.com", TSM: "tsmc.com",
    XOM: "exxonmobil.com", CVX: "chevron.com", OXY: "oxy.com", ADBE: "adobe.com", QCOM: "qualcomm.com",
    CSCO: "cisco.com", IBM: "ibm.com", PYPL: "paypal.com", DIS: "disney.com", V: "visa.com", MA: "mastercard.com",
    WMT: "walmart.com", PG: "pg.com", UNH: "unitedhealthgroup.com", HD: "homedepot.com", BA: "boeing.com",
    SPY: "ssga.com", QQQ: "invesco.com", GLD: "spdrgoldshares.com"
  };

  /* ─────────────────────────── State ─────────────────────────── */
  const state = {
    route: { id: "dashboard" }, loading: true, timeframe: "1D",
    rec: {}, signals: {}, signalAlerts: {}, markets: {}, news: {}, newsContextKey: "", followed: {}, provider: {}, providerStatus: {}, commandCards: {},
    calendarRange: "30", calendarLoading: false, calendarLoaded: false,
    calendarOpen: { earnings: false, dividends: false, ipos: false, economic: false },
    earningsView: { search: "", tab: "complete", sortKey: "reportDate", sortDir: "asc", source: "all", timing: "all", page: 1, pageSize: 10 },
    marketUniverseView: { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" },
    marketUniverseActiveMarket: null,
    calendar: { earnings: {}, dividends: {}, ipos: {}, economic: {} },
    watch: read(keys.watch, []), alerts: read(keys.alerts, []), holdings: read(keys.holdings, []), localTrades: read(keys.followed, []),
    settings: read(keys.settings, { lang: "ar", theme: DEFAULT_THEME, defaultMarket: "us-stocks", risk: "balanced", quickTickerVisible: true }),
    errors: {},
    cache: new Map(), marketCache: new Map()
  };
  state.settings.lang = currentLanguage();
  state.settings.language = state.settings.lang;
  state.settings.theme = readStoredThemePreference();
  applyThemePreference(state.settings.theme);

  function registerTranslationPair(ar, en) {
    const arText = String(ar || "").trim();
    const enText = String(en || "").trim();
    if (!arText || !enText) return;
    TRANSLATION_AR_TO_EN.set(normalizeTranslationKey(arText), enText);
    TRANSLATION_EN_TO_AR.set(normalizeTranslationKey(enText), arText);
    TRANSLATION_FRAGMENTS.push({ ar: arText, en: enText });
  }

  function normalizeLanguage(value) {
    const lang = String(value || "").trim().toLowerCase().slice(0, 2);
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : "ar";
  }

  function readStoredLanguagePreference() {
    try {
      const globalLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (globalLang) return normalizeLanguage(globalLang);
    } catch (_e) {}
    try {
      const saved = JSON.parse(localStorage.getItem(keys.settings) || "{}");
      if (saved.lang || saved.language) return normalizeLanguage(saved.lang || saved.language);
    } catch (_e) {}
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY) || "{}");
      if (legacy.lang || legacy.language) return normalizeLanguage(legacy.lang || legacy.language);
    } catch (_e) {}
    return "ar";
  }

  function currentLanguage() {
    return normalizeLanguage(readStoredLanguagePreference());
  }

  function isEnglishLanguage() {
    return currentLanguage() === "en";
  }

  function terminalText(key, vars = {}) {
    const entry = TERMINAL_I18N[key] || { ar: key, en: key };
    let text = entry[currentLanguage()] || entry.ar || entry.en || key;
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
    return text;
  }

  function textPair(ar, en) {
    return isEnglishLanguage() ? en : ar;
  }

  function normalizeTranslationKey(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function translateUiText(value) {
    const raw = String(value ?? "");
    if (!raw.trim() || raw.trim() === "--") return raw;
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    let text = raw.trim();

    const mixed = mixedUiText(text);
    if (mixed) text = mixed;

    const normalized = normalizeTranslationKey(text);
    const exact = isEnglishLanguage() ? TRANSLATION_AR_TO_EN.get(normalized) : TRANSLATION_EN_TO_AR.get(normalized);
    if (exact) return `${leading}${exact}${trailing}`;

    text = translateDynamicUiText(text);
    if (isOfficialMarketCode(text)) return raw;
    return `${leading}${text}${trailing}`;
  }

  function translateDynamicUiText(text) {
    if (isEnglishLanguage()) {
      const dynamic = text
        .replace(/يعرض\s+([\d,.\s]+)\s+من\s+([\d,.\s]+)\s+رمز/g, (_m, shown, total) => terminalText("showingSymbols", { shown: shown.trim(), total: total.trim() }))
        .replace(/يعرض\s+([\d,.\s]+)\s+من\s+([\d,.\s]+)\s+صندوق/g, (_m, shown, total) => terminalText("showingFunds", { shown: shown.trim(), total: total.trim() }))
        .replace(/صفحة\s+([\d,.\s]+)\s*\/\s*([\d,.\s]+)/g, (_m, page, total) => `${terminalText("page")} ${page.trim()} / ${total.trim()}`);
      return replaceKnownUiFragments(dynamic);
    }
    const dynamic = text
      .replace(/Showing\s+([\d,.\s]+)\s+of\s+([\d,.\s]+)\s+symbols/gi, (_m, shown, total) => terminalText("showingSymbols", { shown: shown.trim(), total: total.trim() }))
      .replace(/Showing\s+([\d,.\s]+)\s+of\s+([\d,.\s]+)\s+funds/gi, (_m, shown, total) => terminalText("showingFunds", { shown: shown.trim(), total: total.trim() }))
      .replace(/Page\s+([\d,.\s]+)\s*\/\s*([\d,.\s]+)/gi, (_m, page, total) => `${terminalText("page")} ${page.trim()} / ${total.trim()}`);
    return replaceKnownUiFragments(dynamic);
  }

  function replaceKnownUiFragments(text) {
    const source = isEnglishLanguage() ? "ar" : "en";
    const target = isEnglishLanguage() ? "en" : "ar";
    return TRANSLATION_FRAGMENTS
      .filter(pair => pair[source] && pair[target] && pair[source].length > 2)
      .sort((a, b) => b[source].length - a[source].length)
      .reduce((output, pair) => {
        const from = pair[source], to = pair[target];
        if (output === from || isOfficialMarketCode(from)) return output;
        return output.split(from).join(to);
      }, text);
  }

  function mixedUiText(text) {
    if (!text.includes("·")) return "";
    const parts = text.split("·").map(part => part.trim()).filter(Boolean);
    if (parts.length < 2) return "";
    const arabicPart = parts.find(part => hasArabicText(part) && (
      TRANSLATION_AR_TO_EN.has(normalizeTranslationKey(part)) ||
      /^يعرض\s+/i.test(part) ||
      /^عرض\s+/i.test(part) ||
      part.includes("غير متاح")
    ));
    const englishPart = parts.find(part => !hasArabicText(part) && (
      TRANSLATION_EN_TO_AR.has(normalizeTranslationKey(part)) ||
      /^Showing\s+/i.test(part) ||
      /^View\s+/i.test(part) ||
      /unavailable/i.test(part)
    ));
    if (!arabicPart || !englishPart) return "";
    return isEnglishLanguage() ? englishPart : arabicPart;
  }

  function isOfficialMarketCode(value) {
    const text = String(value || "").trim();
    return /^[A-Z0-9]{1,8}([.\-=][A-Z0-9]{1,8})*$/.test(text) || /^[A-Z]{3,6}$/.test(text);
  }

  function persistLanguage(lang) {
    const normalized = normalizeLanguage(lang);
    state.settings.lang = normalized;
    state.settings.language = normalized;
    write(keys.settings, state.settings);
    try { localStorage.setItem(LANG_STORAGE_KEY, normalized); } catch (_e) {}
    try {
      const legacy = read(LEGACY_SETTINGS_STORAGE_KEY, {});
      write(LEGACY_SETTINGS_STORAGE_KEY, { ...legacy, language: normalized, lang: normalized });
    } catch (_e) {}
    return normalized;
  }

  function setLanguage(lang) {
    const normalized = persistLanguage(lang);
    try { window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: normalized } })); } catch (_e) {}
    applyTerminalLanguage();
    render();
  }

  function applyTerminalLanguage() {
    const lang = normalizeLanguage(state.settings.lang || currentLanguage());
    const dir = lang === "ar" ? "rtl" : "ltr";
    state.settings.lang = lang;
    state.settings.language = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.documentElement.dataset.sfmLang = lang;
    document.documentElement.dataset.sfmDir = dir;
    if (document.body) {
      document.body.dir = dir;
      document.body.classList.toggle("language-en", lang === "en");
      document.body.classList.toggle("language-ar", lang === "ar");
    }
    const shell = document.getElementById("app-shell");
    if (shell) shell.dir = dir;
    updateStaticLanguageLabels();
    syncLanguageButtons();
  }

  function updateStaticLanguageLabels() {
    const groupLabels = document.querySelectorAll(".terminal-sidebar .nav-group-label");
    if (groupLabels[0]) groupLabels[0].textContent = terminalText("nav.trading");
    if (groupLabels[1]) groupLabels[1].textContent = terminalText("nav.monitoring");
    if (groupLabels[2]) groupLabels[2].textContent = terminalText("nav.more");
    updateRouteLabel("dashboard", "nav.dashboard", "nav.dashboardSub");
    updateRouteLabel("markets", "nav.markets", "nav.marketsSub");
    updateRouteLabel("ai-scanner", "nav.aiScanner", "nav.aiScannerSub");
    updateRouteLabel("symbol-details", "nav.symbolDetails", "nav.symbolDetailsSub");
    updateRouteLabel("watchlist", "nav.watchlist", "nav.watchlistSub");
    updateRouteLabel("portfolio", "nav.portfolio", "nav.portfolio");
    updateRouteLabel("alerts", "nav.alerts", "nav.alerts");
    updateRouteLabel("recommendations", "nav.recommendations", "nav.recommendationsSub");
    updateRouteLabel("trade-performance", "nav.tradePerformance", "nav.tradePerformanceSub");
    updateRouteLabel("news", "nav.news", "nav.news");
    updateRouteLabel("calendar", "nav.calendar", "nav.calendar");
    updateRouteLabel("education", "nav.education", "nav.education");
    updateRouteLabel("settings", "nav.settings", "nav.settings");
    document.querySelectorAll(".mobile-nav [data-route]").forEach((node) => {
      node.textContent = routeNavText(node.dataset.route);
    });
    setText(".topbar-title .eyebrow", terminalText("terminal.kicker"));
    setAttr(".terminal-sidebar", "aria-label", terminalText("nav.trading"));
    setAttr(".mobile-nav", "aria-label", terminalText("nav.trading"));
    setAttr("#sidebar-collapse", "aria-label", terminalText("sidebar.collapse"));
    setAttr("#sidebar-collapse", "title", terminalText("sidebar.collapse"));
    setText("#symbol-search label", terminalText("search.label"));
    setText("#symbol-search button", terminalText("search.action"));
    setAttr("#symbol-input", "aria-label", terminalText("search.label"));
    setText(".topbar-actions [data-route='alerts']", terminalText("nav.alerts"));
    setText(".topbar-actions [data-route='settings']", terminalText("nav.settings"));
    const tickerRow = document.getElementById("ticker-row");
    if (tickerRow) tickerRow.setAttribute("aria-label", terminalText("ticker.aria"));
  }

  function routeNavText(route) {
    const map = {
      dashboard: "nav.dashboard",
      markets: "nav.markets",
      "ai-scanner": "nav.aiScanner",
      "symbol-details": "nav.symbolDetails",
      watchlist: "nav.watchlist",
      portfolio: "nav.portfolio",
      alerts: "nav.alerts",
      recommendations: "nav.recommendations",
      "trade-performance": "nav.tradePerformance",
      news: "nav.news",
      calendar: "nav.calendar",
      education: "nav.education",
      settings: "nav.settings"
    };
    return terminalText(map[route] || "nav.dashboard");
  }

  function updateRouteLabel(route, labelKey, subKey) {
    document.querySelectorAll(`.terminal-sidebar [data-route='${route}']`).forEach((node) => {
      const label = node.querySelector(".nav-label");
      const small = node.querySelector("small");
      if (label) label.textContent = terminalText(labelKey);
      if (small) small.textContent = terminalText(subKey);
    });
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = text; });
  }

  function setAttr(selector, attr, value) {
    document.querySelectorAll(selector).forEach((node) => { node.setAttribute(attr, value); });
  }

  function syncLanguageButtons() {
    const lang = normalizeLanguage(state.settings.lang || currentLanguage());
    const host = document.getElementById("terminal-language-switcher");
    if (host) host.setAttribute("aria-label", terminalText("language.label"));
    document.querySelectorAll("[data-language]").forEach((button) => {
      const active = normalizeLanguage(button.dataset.language) === lang;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (button.dataset.language === "ar") button.textContent = terminalText("language.arabic");
      if (button.dataset.language === "en") button.textContent = terminalText("language.english");
    });
  }

  function routeTitle(routeId) {
    return terminalText(`route.${routeId || "dashboard"}`);
  }

  function marketName(market) {
    return textPair(market.ar, market.en);
  }

  function marketFamilyName(family) {
    const labels = {
      Equities: ["الأسهم", "Equities"],
      FX: ["العملات", "FX"],
      Digital: ["الأصول الرقمية", "Digital"],
      Macro: ["الاقتصاد الكلي", "Macro"],
      Benchmarks: ["المؤشرات", "Benchmarks"],
      Funds: ["الصناديق", "Funds"],
      Tadawul: ["تداول", "Tadawul"],
      Boursa: ["بورصة", "Boursa"],
      "ADX/DFM": ["ADX/DFM", "ADX/DFM"],
      QSE: ["QSE", "QSE"],
      BHB: ["BHB", "BHB"],
      MSX: ["MSX", "MSX"],
      Global: ["عالمي", "Global"],
      Sector: ["قطاع", "Sector"]
    };
    const label = labels[family];
    return label ? textPair(label[0], label[1]) : String(family || "");
  }

  function translateRenderedUi(root = document.body) {
    if (!root) return;
    const skipSelector = "script,style,svg,path,canvas,.ltr,.symbol-code,code,.asset-logo,.logo-img,.mc-candles,.mc-priceline";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!node.nodeValue?.trim() || !parent || parent.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => { node.nodeValue = translateUiText(node.nodeValue); });
    const attrNames = ["title", "aria-label", "placeholder", "alt"];
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll("*")] : Array.from(root.querySelectorAll?.("*") || []);
    elements.forEach((element) => {
      if (element.closest?.(skipSelector)) return;
      attrNames.forEach((attr) => {
        if (element.hasAttribute(attr)) element.setAttribute(attr, translateUiText(element.getAttribute(attr)));
      });
    });
  }

  /* ─────────────────────────── Boot ─────────────────────────── */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  async function boot() {
    state.route = readRoute();
    applyTerminalLanguage();
    bind();
    render();
    let released = false;
    const releaseLoading = () => {
      if (released) return;
      released = true;
      state.loading = false;
      render();
      afterRoute();
    };
    const loadingTimer = window.setTimeout(releaseLoading, INITIAL_LOADING_MAX_MS);
    try {
      await hydrate();
    } catch (error) {
      devLog("boot", "failed", { message: errorMessage(error) });
    } finally {
      window.clearTimeout(loadingTimer);
      releaseLoading();
      renderAfterData();
    }
  }

  async function hydrate() {
    const commandSymbols = dashboardSymbols();
    const newsPath = marketNewsPath(12);
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`),
      get(`/recommendations?symbols=${encodeURIComponent(commandSymbols.join(","))}`),
      get("/market/signals?limit=60"),
      get("/market/signal-alerts?limit=50"),
      get("/markets"), get(newsPath), get("/followed-trades"),
      get("/trader/provider-status", { label: "providerStatus" })
    ]);
    const [rec, commandCards, signals, signalAlerts, mk, news, followed, providerStatus] = settled.map((result, index) => settledValue(result, ["quotes", "quotes", "signals", "signals", "quotes", "news", "quotes", "providerStatus"][index]));
    state.rec = rec; state.commandCards = commandCards; state.signals = signals; state.signalAlerts = signalAlerts; state.markets = mk; state.news = news; state.followed = followed;
    state.newsContextKey = newsPath;
    state.providerStatus = providerStatus || {};
    state.provider = providerStatus.dataProvider || commandCards.dataProvider || rec.dataProvider || mk.dataProvider || news.dataProvider || commandCards.provider || rec.provider || mk.provider || news.provider || { configured: false, status: "not_configured" };
    renderAfterData();
  }

  async function get(path, options = {}) {
    return requestJson(path, { method: "GET", ...options });
  }
  function marketForSymbol(symbol) {
    const s = sym(symbol);
    return MARKETS.find(m => arr(m.symbols).map(sym).includes(s)) || null;
  }
  function marketNewsContext(symbolOverride = "") {
    const targetSymbol = sym(symbolOverride);
    const inferredMarket = targetSymbol ? marketForSymbol(targetSymbol) : null;
    const market = inferredMarket || currentMarket();
    const symbolCategory = targetSymbol ? assetType(targetSymbol) : "";
    const category = symbolCategory && symbolCategory !== "stock" ? symbolCategory : (state.settings.selectedCategory || categoryFromSelection(market.id));
    const symbols = targetSymbol ? [targetSymbol] : unique(arr(market.symbols));
    return { market, category, symbols, symbol: targetSymbol };
  }
  function marketNewsPath(limit = 12, options = {}) {
    const context = marketNewsContext(options.symbol || "");
    const params = new URLSearchParams({
      limit: String(limit),
      scope: context.symbol ? "asset" : "general",
      market: context.market.id,
      category: context.category,
    });
    if (context.symbol) params.set("symbol", context.symbol);
    if (context.symbols.length) params.set("symbols", context.symbols.join(","));
    if (options.refresh) params.set("refresh", "1");
    return `/market-news?${params.toString()}`;
  }
  async function loadNews(force = false) {
    const cacheKey = marketNewsPath(12);
    if (!force && state.newsContextKey === cacheKey) return;
    state.newsContextKey = cacheKey;
    state.news = await get(marketNewsPath(12, { refresh: force }), { label: "news" });
    if (state.route.id === "news" || state.route.id === "dashboard") render();
  }
  async function post(path, body, options = {}) {
    return requestJson(path, { method: "POST", body, ...options });
  }
  async function requestJson(path, options = {}) {
    const label = options.label || requestLabel(path);
    const timeoutMs = options.timeoutMs || timeoutFor(path, label);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const res = await fetch(`${API}${path}`, {
        method: options.method || "GET",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: options.method === "POST" ? JSON.stringify(options.body || {}) : undefined
      });
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const body = isJson ? await res.json().catch(() => ({})) : {};
      const routeUnavailable = res.status === 404 || (!isJson && /html|text\/plain/i.test(contentType));
      const payload = res.ok && isJson
        ? { ok: true, ...body }
        : {
            ...body,
            ok: false,
            status: res.status,
            message: routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : (body.message || body.error || res.statusText || UNAVAILABLE_MESSAGE),
            routeUnavailable,
            dataProvider: body.dataProvider || null
          };
      logRequestResult(label, path, timeoutMs, payload);
      return payload;
    } catch (error) {
      const timeoutError = timedOut || errorName(error) === "AbortError" || errorName(error) === "TimeoutError";
      const payload = {
        ok: false,
        timeout: timeoutError,
        message: timeoutError ? UNAVAILABLE_MESSAGE : errorMessage(error),
        dataProvider: null
      };
      logRequestResult(label, path, timeoutMs, payload);
      return payload;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function saveSignalPreferences(prefs) {
    const result = await post("/market/signal-preferences", prefs, { label: "signals", timeoutMs: REQUEST_TIMEOUTS.signals });
    return result.ok === true;
  }

  function normalizeThemePreference(value) {
    const theme = String(value || "").toLowerCase();
    return THEME_VALUES.includes(theme) ? theme : null;
  }

  function readJsonStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function readStoredThemePreference() {
    const settingsTheme = normalizeThemePreference(state?.settings?.theme);
    const storedSettings = readJsonStorage(keys.settings);
    const legacySettings = readJsonStorage(LEGACY_SETTINGS_STORAGE_KEY);
    const siteSettings = readJsonStorage("sfm_settings");
    try {
      return settingsTheme
        || normalizeThemePreference(storedSettings?.theme)
        || normalizeThemePreference(legacySettings?.theme)
        || normalizeThemePreference(localStorage.getItem("the-sfm-theme"))
        || normalizeThemePreference(localStorage.getItem("sfmTraderTheme"))
        || normalizeThemePreference(localStorage.getItem("theme"))
        || normalizeThemePreference(siteSettings?.theme)
        || DEFAULT_THEME;
    } catch (_error) {
      return settingsTheme || DEFAULT_THEME;
    }
  }

  function resolvedThemePreference(theme) {
    const preference = normalizeThemePreference(theme) || DEFAULT_THEME;
    if (preference !== "system") return preference;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function syncSystemThemeListener(theme) {
    if (!window.matchMedia) return;
    if (!systemThemeQuery) systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (systemThemeQuery.removeEventListener) systemThemeQuery.removeEventListener("change", handleSystemThemeChange);
    else if (systemThemeQuery.removeListener) systemThemeQuery.removeListener(handleSystemThemeChange);
    if (theme === "system") {
      if (systemThemeQuery.addEventListener) systemThemeQuery.addEventListener("change", handleSystemThemeChange);
      else if (systemThemeQuery.addListener) systemThemeQuery.addListener(handleSystemThemeChange);
    }
  }

  function handleSystemThemeChange() {
    if (normalizeThemePreference(state.settings.theme) !== "system") return;
    applyThemePreference("system");
  }

  function persistThemePreference(theme) {
    const preference = normalizeThemePreference(theme) || DEFAULT_THEME;
    state.settings.theme = preference;
    write(keys.settings, state.settings);
    try {
      localStorage.setItem("the-sfm-theme", preference);
      localStorage.setItem("sfmTraderTheme", preference);
      localStorage.setItem("theme", preference);
      const legacySettings = readJsonStorage(LEGACY_SETTINGS_STORAGE_KEY) || {};
      localStorage.setItem(LEGACY_SETTINGS_STORAGE_KEY, JSON.stringify({ ...legacySettings, theme: preference }));
      const siteSettings = readJsonStorage("sfm_settings") || {};
      localStorage.setItem("sfm_settings", JSON.stringify({ ...siteSettings, theme: preference }));
    } catch (_error) {}
  }

  function applyThemePreference(theme) {
    const preference = normalizeThemePreference(theme) || DEFAULT_THEME;
    const resolved = resolvedThemePreference(preference);
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("light", resolved === "light");
    root.style.colorScheme = resolved;
    if (document.body) {
      document.body.dataset.themePreference = preference;
      document.body.dataset.theme = resolved;
    }
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "dark light" : "light dark");
    syncSystemThemeListener(preference);
    renderThemeSwitcher();
  }

  function selectThemePreference(theme) {
    const preference = normalizeThemePreference(theme);
    if (!preference) return;
    _themeMenuOpen = false;
    persistThemePreference(preference);
    applyThemePreference(preference);
    render();
  }

  function themeCopy() {
    const en = currentLanguage() === "en";
    return {
      title: en ? "Theme" : "المظهر",
      choose: en ? "Choose theme" : "اختيار المظهر",
      options: {
        dark: en ? "Dark" : "داكن",
        light: en ? "Light" : "فاتح",
        system: en ? "System" : "حسب النظام"
      },
      descriptions: {
        dark: en ? "Premium dark terminal" : "الواجهة الداكنة الفاخرة",
        light: en ? "Clean light terminal" : "واجهة فاتحة نظيفة",
        system: en ? "Follow device appearance" : "يتبع مظهر الجهاز"
      }
    };
  }

  function themeOptionsHtml(mode = "menu") {
    const copy = themeCopy();
    const selected = normalizeThemePreference(state.settings.theme) || DEFAULT_THEME;
    return THEME_VALUES.map(theme => {
      const active = theme === selected;
      return `<button class="theme-choice${active ? " is-selected" : ""}" data-theme-option="${theme}" type="button" role="option" aria-selected="${active}">
        <span class="theme-choice-check" aria-hidden="true">${active ? "✓" : ""}</span>
        <span class="theme-choice-copy">
          <strong>${h(copy.options[theme])}</strong>
          ${mode === "settings" ? `<small>${h(copy.descriptions[theme])}</small>` : ""}
        </span>
      </button>`;
    }).join("");
  }

  function themeSwitcherHtml() {
    const copy = themeCopy();
    const selected = normalizeThemePreference(state.settings.theme) || DEFAULT_THEME;
    const resolved = resolvedThemePreference(selected);
    return `<div class="theme-switcher" data-theme-switcher data-open="${_themeMenuOpen ? "true" : "false"}">
      <button class="topbar-chip theme-switcher-button" data-theme-menu-toggle type="button" aria-haspopup="listbox" aria-expanded="${_themeMenuOpen}" aria-label="${h(copy.choose)}" title="${h(copy.choose)}">
        <span class="theme-switcher-glyph theme-switcher-glyph-${resolved}" aria-hidden="true"></span>
        <span class="theme-switcher-label">${h(copy.options[selected])}</span>
        <span class="theme-switcher-chevron" aria-hidden="true">⌄</span>
      </button>
      ${_themeMenuOpen ? `<div class="theme-menu" role="listbox" aria-label="${h(copy.choose)}">${themeOptionsHtml("menu")}</div>` : ""}
    </div>`;
  }

  function renderThemeSwitcher() {
    const host = document.getElementById("theme-switcher");
    if (!host) return;
    host.innerHTML = themeSwitcherHtml();
  }

  function themeSettingsPanel() {
    const copy = themeCopy();
    return `<article class="panel theme-settings-panel">
      <span class="eyebrow">${h(copy.title)}</span>
      <h2>${h(copy.choose)}</h2>
      <div class="settings-theme-grid" role="listbox" aria-label="${h(copy.choose)}">
        ${themeOptionsHtml("settings")}
      </div>
    </article>`;
  }

  function setTerminalLanguage(lang) {
    _themeMenuOpen = false;
    setLanguage(lang);
  }

  /* ─────────────────────────── Router ─────────────────────────── */
  function bind() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-route-link]");
      if (link) { event.preventDefault(); navigate(link.getAttribute("href")); return; }
      const languageOption = event.target.closest("[data-language]");
      if (languageOption) { event.preventDefault(); setTerminalLanguage(languageOption.dataset.language); return; }
      const themeToggle = event.target.closest("[data-theme-menu-toggle]");
      if (themeToggle) { event.preventDefault(); _themeMenuOpen = !_themeMenuOpen; renderThemeSwitcher(); return; }
      const themeOption = event.target.closest("[data-theme-option]");
      if (themeOption) { event.preventDefault(); selectThemePreference(themeOption.dataset.themeOption); return; }
      const settingsAction = event.target.closest("[data-settings-action]");
      if (settingsAction) {
        event.preventDefault();
        handleSettingsAction(settingsAction.dataset.settingsAction).catch((error) => {
          devLog("settings", "failed", { message: errorMessage(error) });
          toast(settingsT("actionFailed"));
        });
        return;
      }
      const tab = event.target.closest("[data-tab]");
      if (tab) { event.preventDefault(); onTab(tab); return; }
      const tf = event.target.closest("[data-timeframe]");
      if (tf) { event.preventDefault(); state.timeframe = tf.dataset.timeframe; render(); return; }
      const cr = event.target.closest("[data-calendar-range]");
      if (cr) {
        event.preventDefault();
        state.calendarRange = cr.dataset.calendarRange || "30";
        state.earningsView.page = 1;
        state.calendarLoading = true;
        render();
        loadCalendars(true).catch((error) => {
          devLog("calendar", "failed", { message: errorMessage(error) });
        }).finally(() => {
          state.calendarLoading = false;
          render();
          afterRoute();
        });
        return;
      }
      const calendarToggle = event.target.closest("[data-calendar-section-toggle]");
      if (calendarToggle) {
        event.preventDefault();
        const kind = calendarToggle.dataset.calendarSectionToggle;
        if (state.calendarOpen && Object.prototype.hasOwnProperty.call(state.calendarOpen, kind)) {
          state.calendarOpen[kind] = !state.calendarOpen[kind];
          render();
        }
        return;
      }
      const earningsTab = event.target.closest("[data-earnings-tab]");
      if (earningsTab) {
        event.preventDefault();
        state.earningsView.tab = earningsTab.dataset.earningsTab || "complete";
        state.earningsView.page = 1;
        render();
        return;
      }
      const earningsSort = event.target.closest("[data-earnings-sort]");
      if (earningsSort) {
        event.preventDefault();
        const key = earningsSort.dataset.earningsSort || "reportDate";
        state.earningsView.sortDir = state.earningsView.sortKey === key && state.earningsView.sortDir === "asc" ? "desc" : "asc";
        state.earningsView.sortKey = key;
        state.earningsView.page = 1;
        render();
        return;
      }
      const earningsPage = event.target.closest("[data-earnings-page]");
      if (earningsPage) {
        event.preventDefault();
        state.earningsView.page = Math.max(1, Number(earningsPage.dataset.earningsPage) || 1);
        render();
        return;
      }
      const earningsPageSize = event.target.closest("[data-earnings-page-size]");
      if (earningsPageSize) {
        event.preventDefault();
        state.earningsView.pageSize = Math.max(10, Number(earningsPageSize.dataset.earningsPageSize) || 10);
        state.earningsView.page = 1;
        render();
        return;
      }
      const detail = event.target.closest("[data-symbol-details]");
      if (detail) { event.preventDefault(); const s = sym(detail.dataset.symbolDetails); if (s) navigate(`${ROOT}/symbol/${encodeURIComponent(s)}`); return; }
      const add = event.target.closest("[data-quick-add]");
      if (add) { event.preventDefault(); addWatch(add.dataset.quickAdd); return; }
      const remove = event.target.closest("[data-remove-watch]");
      if (remove) { event.preventDefault(); removeWatch(remove.dataset.removeWatch); return; }
      const alertBtn = event.target.closest("[data-create-alert]");
      if (alertBtn) { event.preventDefault(); createAlert(alertBtn.dataset.createAlert); return; }
      const priceData = event.target.closest("[data-view-price-data]");
      if (priceData) {
        event.preventDefault();
        const target = document.querySelector(priceData.dataset.viewPriceData || "#price-data-panel");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        else toast(textPair("بيانات السعر غير متاحة حالياً.", "Price data is currently unavailable."));
        return;
      }
      const followTrade = event.target.closest("[data-follow-trade]");
      if (followTrade) {
        event.preventDefault();
        if (followTrade.disabled || followTrade.getAttribute("aria-disabled") === "true") {
          toast(followTrade.title || textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed."));
          return;
        }
        followRecommendationTrade(followTrade.dataset.followTrade);
        return;
      }
      const refreshTrades = event.target.closest("[data-refresh-trades]");
      if (refreshTrades) { event.preventDefault(); refreshFollowedTrades(true); return; }
      const runSignals = event.target.closest("[data-run-signals]");
      if (runSignals) { event.preventDefault(); runSignalRefresh(); return; }
      const tickerToggle = event.target.closest("[data-toggle-ticker]");
      if (tickerToggle) { event.preventDefault(); state.settings.quickTickerVisible = !isQuickTickerVisible(); write(keys.settings, state.settings); render(); return; }
      const universePage = event.target.closest("[data-market-universe-page]");
      if (universePage) {
        event.preventDefault();
        state.marketUniverseView.page = Math.max(1, Number(universePage.dataset.marketUniversePage) || 1);
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const universeSort = event.target.closest("[data-market-universe-sort]");
      if (universeSort) {
        event.preventDefault();
        const key = universeSort.dataset.marketUniverseSort || "symbol";
        state.marketUniverseView.dir = state.marketUniverseView.sort === key && state.marketUniverseView.dir === "asc" ? "desc" : "asc";
        state.marketUniverseView.sort = key;
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const fundFilter = event.target.closest("[data-fund-filter]");
      if (fundFilter) {
        event.preventDefault();
        state.marketUniverseView.fundType = fundFilter.dataset.fundFilter || "all";
        state.marketUniverseView.assetType = "fund";
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
        return;
      }
      const delAlert = event.target.closest("[data-del-alert]");
      if (delAlert) { event.preventDefault(); deleteAlert(delAlert.dataset.delAlert); return; }
      const retry = event.target.closest("[data-retry]");
      if (retry) { event.preventDefault(); retryRoute(); return; }
      const collapse = event.target.closest("#sidebar-collapse");
      if (collapse) { event.preventDefault(); document.getElementById("app-shell").classList.toggle("is-collapsed"); return; }
      const _mst = event.target.closest("[data-market-selector-toggle]");
      if (_mst) { event.preventDefault(); _marketSelectorOpen = !_marketSelectorOpen; renderMarketSelector(); return; }
      const _msm = event.target.closest("[data-select-market]");
      if (_msm) { event.preventDefault(); const _mid = _msm.dataset.selectMarket; if (_mid) { selectMarket(_mid); } return; }
      if (_marketSelectorOpen && !event.target.closest(".ms-wrap")) { _marketSelectorOpen = false; renderMarketSelector(); }
      if (_themeMenuOpen && !event.target.closest("[data-theme-switcher]")) { _themeMenuOpen = false; renderThemeSwitcher(); }
    });
    document.addEventListener("keydown", function(ev) {
      if (_themeMenuOpen) {
        const _themeItems = Array.prototype.slice.call(document.querySelectorAll("[data-theme-switcher] [data-theme-option]") || []);
        const _themeIdx = _themeItems.indexOf(document.activeElement);
        if (ev.key === "Escape") {
          _themeMenuOpen = false;
          renderThemeSwitcher();
          const _themeButton = document.querySelector("[data-theme-menu-toggle]");
          if (_themeButton) _themeButton.focus();
          ev.preventDefault();
          return;
        }
        if (_themeItems.length && ev.key === "ArrowDown") {
          ev.preventDefault();
          const _nextTheme = _themeIdx < 0 ? 0 : Math.min(_themeIdx + 1, _themeItems.length - 1);
          if (_themeItems[_nextTheme]) _themeItems[_nextTheme].focus();
          return;
        }
        if (_themeItems.length && ev.key === "ArrowUp") {
          ev.preventDefault();
          const _prevTheme = Math.max(_themeIdx - 1, 0);
          if (_themeItems[_prevTheme]) _themeItems[_prevTheme].focus();
          return;
        }
        if (ev.key === "Enter" && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.themeOption) {
          ev.preventDefault();
          selectThemePreference(document.activeElement.dataset.themeOption);
          return;
        }
      }
      if (!_marketSelectorOpen) return;
      const _items = Array.prototype.slice.call(document.querySelectorAll("[data-select-market]") || []);
      if (!_items.length) return;
      const _idx = _items.indexOf(document.activeElement);
      if (ev.key === "Escape") {
        _marketSelectorOpen = false;
        renderMarketSelector();
        const _tb = document.querySelector("[data-market-selector-toggle]");
        if (_tb) _tb.focus();
        ev.preventDefault();
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        const _ni = _idx < 0 ? 0 : Math.min(_idx + 1, _items.length - 1);
        if (_items[_ni]) _items[_ni].focus();
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        const _pi = Math.max(_idx - 1, 0);
        if (_items[_pi]) _items[_pi].focus();
      } else if (ev.key === "Enter" && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.selectMarket) {
        ev.preventDefault();
        selectMarket(document.activeElement.dataset.selectMarket);
      }
    });
    document.getElementById("symbol-search")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const symbol = sym(document.getElementById("symbol-input")?.value || "");
      if (!symbol) return toast("اكتب رمزاً أولاً، مثل AAPL أو BTCUSD.");
      navigate(`${ROOT}/symbol/${encodeURIComponent(symbol)}`);
    });
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-earnings-search-form]");
      if (!form) return;
      event.preventDefault();
      state.earningsView.search = String(new FormData(form).get("earningsSearch") || "").trim();
      state.earningsView.page = 1;
      render();
    });
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-market-universe-search]");
      if (!form) return;
      event.preventDefault();
      state.marketUniverseView.q = String(new FormData(form).get("marketUniverseSearch") || "").trim();
      state.marketUniverseView.page = 1;
      loadMarket(state.route.market, true);
      render();
    });
    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-earnings-filter]");
      if (!filter) return;
      const key = filter.dataset.earningsFilter;
      if (key === "source" || key === "timing") {
        state.earningsView[key] = filter.value || "all";
        state.earningsView.page = 1;
        render();
      }
    });
    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-market-universe-filter]");
      if (!filter) return;
      const key = filter.dataset.marketUniverseFilter;
      if (key === "market") {
        const target = filter.value || state.route.market;
        if (target && target !== state.route.market) {
          state.marketUniverseView.page = 1;
          if (target !== "etfs") {
            state.marketUniverseView.fundType = "all";
            state.marketUniverseView.assetType = "all";
          }
          navigate(`${ROOT}/markets/${encodeURIComponent(target)}`);
        }
        return;
      }
      if (Object.prototype.hasOwnProperty.call(state.marketUniverseView, key)) {
        state.marketUniverseView[key] = filter.value || "all";
        state.marketUniverseView.page = 1;
        loadMarket(state.route.market, true);
        render();
      }
    });
    window.addEventListener("popstate", () => { state.route = readRoute(); render(); afterRoute(); });
    window.addEventListener("storage", (event) => {
      if ([LANG_STORAGE_KEY, keys.settings].includes(event.key || "")) {
        state.settings.lang = currentLanguage();
        state.settings.language = state.settings.lang;
        applyTerminalLanguage();
        render();
      }
      if (["the-sfm-theme", "sfmTraderTheme", "theme", "sfm_settings", LEGACY_SETTINGS_STORAGE_KEY, keys.settings].includes(event.key || "")) {
        state.settings.theme = readStoredThemePreference();
        applyThemePreference(state.settings.theme);
        render();
      }
    });
    window.addEventListener(LANG_EVENT, () => {
      state.settings.lang = currentLanguage();
      state.settings.language = state.settings.lang;
      applyTerminalLanguage();
      render();
    });
  }

  function navigate(href) {
    if (!href) return;
    try { history.pushState({}, "", href); } catch (_e) { location.href = href; return; }
    state.route = readRoute();
    document.getElementById("terminal-content")?.scrollIntoView({ block: "start" });
    render();
    afterRoute();
  }
  async function retryRoute() {
    state.errors = {};
    if (state.route.id === "calendar") state.calendarLoading = true;
    render();
    try {
      if (state.route.id === "markets" && state.route.market) {
        state.marketCache.delete(marketUniverseCacheKey(state.route.market));
        await loadMarket(state.route.market, true);
      } else if (state.route.id === "symbol-details" && state.route.symbol) {
        state.cache.delete(sym(state.route.symbol));
        await loadSymbol(state.route.symbol, true);
      } else if (state.route.id === "calendar") {
        await loadCalendars(true);
      } else if (state.route.id === "news") {
        await loadNews(true);
      } else if (state.route.id === "ai-scanner" || state.route.id === "recommendations") {
        state.rec = {};
        state.signals = {};
        await ensureScanData(true);
      } else {
        state.marketCache.clear();
        await hydrate();
      }
      toast(textPair("تمت إعادة المحاولة.", "Retried."));
    } catch (error) {
      devLog("retry", "failed", { route: state.route.id, message: errorMessage(error) });
      toast(UNAVAILABLE_MESSAGE);
    } finally {
      state.calendarLoading = false;
      render();
      afterRoute();
    }
  }

  function readRoute() {
    const q = new URLSearchParams(location.search).get("route");
    const raw = q || location.pathname.replace(ROOT, "").replace(/^\/+|\/+$/g, "") || "dashboard";
    const clean = decodeURIComponent(raw).replace(/^\/+|\/+$/g, "");
    if (!clean || clean === "home" || clean === "app") return { id: "dashboard" };
    const [id, ...rest] = clean.split("/");
    if (id === "market-analysis") return { id: "recommendations" };
    if (id === "symbol" || id === "symbol-details") return { id: "symbol-details", symbol: sym(rest.join("/")) };
    if (id === "markets" && rest.length) return { id: "markets", market: rest[0] };
    return routes[id] ? { id, market: rest[0] } : { id: "dashboard" };
  }

  function onTab(el) {
    const group = el.dataset.tab, value = el.dataset.value;
    el.parentElement.querySelectorAll("[data-tab]").forEach(n => n.classList.toggle("is-active", n === el));
    const panel = document.querySelector(`[data-tabpanel="${group}"]`);
    if (panel && panel.dataset.render) {
      panel.innerHTML = (window.__tabRenderers && window.__tabRenderers[panel.dataset.render]) ? window.__tabRenderers[panel.dataset.render](value) : panel.innerHTML;
      translateRenderedUi(panel);
    }
  }

  /* ─────────────────────────── Render ─────────────────────────── */
  function render() {
    applyTerminalLanguage();
    const title = document.getElementById("page-title");
    if (title) title.textContent = routeTitle(state.route.id);
    document.querySelectorAll("[data-route]").forEach((node) => node.classList.toggle("is-active", node.dataset.route === state.route.id || (state.route.id === "symbol-details" && node.dataset.route === "symbol-details")));
    status(); ticker(); statusBar(); renderThemeSwitcher();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
    translateRenderedUi(document.getElementById("app-shell") || content);
  }

  function afterRoute() {
    const id = state.route.id;
    if (id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
    if (id === "markets" && state.route.market) {
      if (state.marketUniverseActiveMarket !== state.route.market) {
        state.marketUniverseActiveMarket = state.route.market;
        state.marketUniverseView = { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" };
      }
      loadMarket(state.route.market);
    }
    if (id === "ai-scanner" || id === "recommendations") ensureScanData();
    if (id === "news") loadNews(false).catch((error) => devLog("news", "failed", { message: errorMessage(error) }));
    if (id === "calendar" && !state.calendarLoaded && !state.calendarLoading) {
      state.calendarLoading = true;
      render();
      loadCalendars(false).catch((error) => {
        devLog("calendar", "failed", { message: errorMessage(error) });
      }).finally(() => {
        state.calendarLoading = false;
        render();
      });
    }
  }

  function page() {
    const id = state.route.id;
    if (id === "markets") return state.route.market ? marketDetailPage(state.route.market) : marketsPage();
    if (id === "ai-scanner") return scannerPage();
    if (id === "watchlist") return watchPage();
    if (id === "portfolio") return portfolioPage();
    if (id === "alerts") return alertsPage();
    if (id === "recommendations") return recPage();
    if (id === "trade-performance") return performancePage();
    if (id === "news") return newsPage();
    if (id === "calendar") return calendarPage();
    if (id === "education") return educationPage();
    if (id === "settings") return settingsPage();
    if (id === "symbol-details") return symbolPage(state.route.symbol);
    return dashboardPage();
  }

  /* ─────────────────────────── Pages ─────────────────────────── */
  function dashboardPage() {
    const rec = recs(), news = newsItems(), alerts = smartAlerts();
    const movers = sortMovers(rec);
    return `<div class="page-stack">
      ${commandCenter(rec)}
      ${marketOverview(rec)}
      ${marketLeadership(rec)}
      ${opportunityHeatmap(rec)}
      <section class="market-movers-grid">
        ${moverPanel("TOP GAINERS", "الأكثر ارتفاعاً", movers.gainers.slice(0, 3), "up")}
        ${moverPanel("TOP LOSERS", "الأكثر انخفاضاً", movers.losers.slice(0, 3), "down")}
      </section>
      <section class="panel recommendations-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("الرموز والتوصيات", "Symbols and recommendations"))}</span><h2>${h(textPair("الرموز والتوصيات", "Symbols and recommendations"))}</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>${h(textPair("عرض الكل", "View all"))}</a></div>${rec.length ? watchlistTable(rec.slice(0, 14)) : unavailableSection(state.rec, textPair("لم يرجع مزود الأسعار أو التوصيات بيانات قابلة للعرض.", "The price or recommendation provider did not return displayable data."), terminalText("settings"), `${ROOT}/settings`)}</section>
      <section class="dashboard-lower-grid">
        <article class="panel"><span class="eyebrow">${h(textPair("أخبار السوق", "Market news"))}</span><h2>${h(textPair("آخر الأخبار", "Latest news"))}</h2>${news.length ? newsList(news.slice(0, 3)) : unavailableSection(state.news, textPair("مزود الأخبار لم يرجع عناصر حالية.", "The news provider did not return current items."), textPair("صفحة الأخبار", "News page"), `${ROOT}/news`)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair("تحليل الذكاء الاصطناعي", "AI analysis"))}</span><h2>${h(textPair("حالة التحليل الذكي", "AI analysis status"))}</h2>${alerts.length ? alertList(alerts) : unavailableSection(state.signals, textPair("سيظهر التحليل عند توفر بيانات السوق والتوصيات.", "Analysis will appear when market data and recommendations are available."), textPair("افتح الماسح", "Open scanner"), `${ROOT}/ai-scanner`)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair("حالة النظام", "System status"))}</span><h2>${h(textPair("حالة النظام", "System status"))}</h2>${publicSystemStatus()}</article>
      </section>
      ${disclaimer()}
    </div>`;
  }

  function marketsPage() {
    return `<div class="page-stack">${hero(textPair("خريطة أسواق كاملة", "Complete markets map"), textPair("الأسهم، الخليج، العملات، الكريبتو، السلع، المؤشرات، الصناديق والقطاعات. كل بطاقة تعرض العملة الخاصة بالأصل ولا ترث عملة السوق المختار.", "Stocks, Gulf markets, currencies, crypto, commodities, indices, funds, and sectors. Each card shows the asset currency instead of inheriting the selected market currency."), "MARKETS")}
      <section class="market-grid">${MARKETS.map(marketCard).join("")}</section>
      <section class="panel"><span class="eyebrow">${h(terminalText("adminDiagnostics"))}</span><h2>${h(textPair("بيانات الأسواق من المزود", "Provider market data"))}</h2>${providerMarkets()}</section>
    </div>`;
  }

  function marketDetailPage(id) {
    const m = MARKETS.find(x => x.id === id);
    if (!m) return marketsPage();
    const cached = state.marketCache.get(marketUniverseCacheKey(id));
    const total = marketUniverseTotal(m, cached);
    const marketLabel = marketName(m);
    const body = cached
      ? marketUniversePanel(m, cached)
      : `<div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>${h(textPair(`جاري تحميل ${m.ar}`, `Loading ${m.en}`))}</h2><p>${h(textPair(COVERAGE_NOTICE_AR, COVERAGE_NOTICE_EN))}</p></div></div>`;
    return `<div class="page-stack">
      <a class="back-link" href="${ROOT}/markets" data-route-link>‹ ${h(terminalText("allMarkets"))}</a>
      ${hero(h(marketLabel), textPair(`${marketFamilyName(m.family)} · العملة الأساسية: ${m.currency}. الصفحة تعرض الكون الكامل المتاح من المزود مع ترقيم صفحات بحجم ${latinNumber(MARKET_UNIVERSE_PAGE_SIZE)} رمزاً.`, `${marketFamilyName(m.family)}. Base currency: ${m.currency}. This page shows the full provider universe with ${MARKET_UNIVERSE_PAGE_SIZE} symbols per page.`), "MARKET")}
      ${marketPreviewStrip(m, total)}
      ${body}
      ${disclaimer()}
    </div>`;
  }

  function marketPreviewSymbols(m) {
    return unique(arr(m.previewSymbols || m.symbols).slice(0, 10));
  }
  function marketActionLabel(m) {
    return terminalText(m && m.id === "etfs" ? "viewAll.funds" : "viewAll.symbols");
  }
  function marketUniverseTotal(m, payload) {
    const fromPayload = num(payload && payload.marketUniverse && (payload.marketUniverse.total ?? payload.marketUniverse.universeTotal), payload && payload.symbolDiscovery && payload.symbolDiscovery.totalFilteredSymbols);
    if (fromPayload !== null) return fromPayload;
    const group = arr(state.markets.groups).find(x => x.id === m.id);
    return num(group && (group.totalSymbols || group.symbols?.length), m.totalSymbols, m.symbols.length) || m.symbols.length;
  }
  function marketPreviewStrip(m, total) {
    const preview = marketPreviewSymbols(m);
    const countKey = m.id === "etfs" ? "showingFunds" : "showingSymbols";
    return `<section class="market-preview-strip" data-market-preview="${h(m.id)}">
      <div class="market-preview-copy"><strong>${h(terminalText("sampleSymbols"))}</strong><span>${h(terminalText(countKey, { shown: latinNumber(preview.length), total: latinNumber(total) }))}</span></div>
      <div class="chip-row compact">${preview.map(s => `<button class="badge" data-symbol-details="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div>
      <a class="ghost-btn compact-btn" href="${ROOT}/markets/${h(m.id)}" data-route-link>${marketActionLabel(m)}</a>
    </section>`;
  }
  function marketUniverseRows(payload) {
    return arr(payload && (payload.recommendations || payload.data || payload.items || payload.results)).map(norm).filter(x => x.symbol);
  }
  function marketUniversePagination(payload) {
    const mu = (payload && payload.marketUniverse) || {};
    const discovery = (payload && payload.symbolDiscovery) || {};
    return {
      page: Number(mu.page || discovery.page || state.marketUniverseView.page || 1),
      pageSize: Number(mu.pageSize || discovery.pageSize || state.marketUniverseView.pageSize || MARKET_UNIVERSE_PAGE_SIZE),
      total: Number(mu.total || discovery.totalFilteredSymbols || marketUniverseRows(payload).length || 0),
      returned: Number(mu.returned || marketUniverseRows(payload).length || 0),
      hasMore: Boolean(mu.hasMore || discovery.hasMore),
    };
  }
  function marketUniversePanel(m, payload) {
    const rows = marketUniverseRows(payload);
    const pagination = marketUniversePagination(payload);
    const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    const countKey = m.id === "etfs" ? "showingFunds" : "showingSymbols";
    return `<section class="panel market-universe-panel" data-selected-market="${h(m.id)}">
      <div class="panel-head"><div><span class="eyebrow">${h(terminalText("allSymbols"))}</span><h2>${h(terminalText("allSymbols"))}</h2></div><button class="ghost-btn compact-btn" data-retry type="button">${h(terminalText("refresh"))}</button></div>
      ${coverageNotice(payload, rows, m)}
      ${marketUniverseControls(m, payload)}
      <div class="provider-market-result-meta market-universe-result-meta">
        <span>${h(terminalText(countKey, { shown: latinNumber(rows.length), total: latinNumber(pagination.total) }))}</span>
        <span>${h(terminalText("page"))} <b class="ltr">${latinNumber(pagination.page)}</b> / <b class="ltr">${latinNumber(pageCount)}</b></span>
      </div>
      ${rows.length ? marketUniverseTable(rows) : emptyState(m.id === "etfs" ? FUND_EMPTY_STATE_AR : "لا توجد رموز مطابقة", m.id === "etfs" ? FUND_EMPTY_STATE_EN : "غيّر البحث أو الفلاتر. لن نضيف رموزاً تجريبية بدلاً من بيانات المزود.", "", "")}
      <div class="provider-market-pagination market-universe-pagination">
        <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""}>${h(terminalText("previous"))}</button>
        <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page + 1}" ${pagination.page >= pageCount ? "disabled" : ""}>${h(terminalText("next"))}</button>
      </div>
    </section>`;
  }
  function marketUniverseControls(m, payload) {
    const view = state.marketUniverseView, options = marketUniverseFilterOptions(payload);
    return `<div class="market-universe-controls">
      ${fundSubfilters(m)}
      <form data-market-universe-search>
        <input name="marketUniverseSearch" value="${h(view.q)}" placeholder="${h(textPair("ابحث عن رمز أو شركة", "Search symbol or company name"))}" />
        <button class="ghost-btn compact-btn" type="submit">${h(terminalText("search"))}</button>
      </form>
      <label>${h(terminalText("market"))}<select data-market-universe-filter="market">${MARKETS.map(item => `<option value="${h(item.id)}" ${item.id === m.id ? "selected" : ""}>${h(marketName(item))}</option>`).join("")}</select></label>
      <label>${h(terminalText("exchange"))}<select data-market-universe-filter="exchange">${filterOptions(options.exchanges, view.exchange, terminalText("allExchanges"))}</select></label>
      <label>${h(terminalText("currency"))}<select data-market-universe-filter="currency">${filterOptions(options.currencies, view.currency, terminalText("allCurrencies"))}</select></label>
      <label>${h(terminalText("sector"))}<select data-market-universe-filter="sector">${filterOptions(options.sectors, view.sector, terminalText("allSectors"))}</select></label>
      <label>${h(terminalText("industry"))}<select data-market-universe-filter="industry">${filterOptions(options.industries, view.industry, terminalText("allIndustries"))}</select></label>
      <label>${h(terminalText("type"))}<select data-market-universe-filter="assetType">${filterOptions(options.assetTypes, view.assetType, terminalText("allAssetTypes"))}</select></label>
      ${m.id === "etfs" ? `<label>${h(terminalText("fundType"))}<select data-market-universe-filter="fundType">${filterOptions(options.fundFilters || FUND_FILTERS, view.fundType, null)}</select></label>` : ""}
      <label>${h(terminalText("priceAvailability"))}<select data-market-universe-filter="availability">${filterOptions([["all", terminalText("allData")], ["with-price", terminalText("withPrice")], ["price-unavailable", terminalText("unavailable")], ["failed", terminalText("failed")]], view.availability, null)}</select></label>
      <label>${h(terminalText("sort"))}<select data-market-universe-filter="sort">${filterOptions([["symbol", terminalText("symbol")], ["name", textPair("الاسم", "Name")], ["priceAvailability", terminalText("priceAvailability")], ["marketCap", terminalText("marketCap")], ["volume", terminalText("volume")]], view.sort, null)}</select></label>
      <label>${h(terminalText("direction"))}<select data-market-universe-filter="dir">${filterOptions([["asc", terminalText("ascending")], ["desc", terminalText("descending")]], view.dir, null)}</select></label>
    </div>`;
  }
  function fundSubfilters(m) {
    if (m.id !== "etfs") return "";
    const active = state.marketUniverseView.fundType || "all";
    return `<div class="chip-row compact fund-filter-row" role="list" aria-label="${h(textPair("فلاتر الصناديق", "Funds filters"))}">${FUND_FILTERS.map(([id, ar, en]) => `<button type="button" class="chip ${active === id ? "is-active" : ""}" data-fund-filter="${h(id)}" title="${h(textPair(ar, en))}"><span>${h(textPair(ar, en))}</span></button>`).join("")}</div>`;
  }
  function marketUniverseFilterOptions(payload) {
    const fromPayload = (payload && (payload.filterOptions || (payload.marketUniverse && payload.marketUniverse.filterOptions))) || {};
    const rows = marketUniverseRows(payload);
    return {
      exchanges: arr(fromPayload.exchanges).length ? fromPayload.exchanges : unique(rows.map(x => x.exchange || x.exchangeCode).filter(Boolean)),
      currencies: arr(fromPayload.currencies).length ? fromPayload.currencies : unique(rows.map(currency)),
      sectors: arr(fromPayload.sectors).length ? fromPayload.sectors : unique(rows.map(x => x.sector).filter(Boolean)),
      industries: arr(fromPayload.industries).length ? fromPayload.industries : unique(rows.map(x => x.industry).filter(Boolean)),
      assetTypes: arr(fromPayload.assetTypes).length ? fromPayload.assetTypes : unique(rows.map(x => x.assetType || assetType(x.symbol)).filter(Boolean)),
      fundFilters: arr(fromPayload.fundFilters).length ? fromPayload.fundFilters.map(item => Array.isArray(item) ? item : [item.id || item.value || item, item.ar || item.en ? textPair(item.ar || item.en, item.en || item.ar) : item.label || item.en || item.id || item]) : FUND_FILTERS,
    };
  }
  function filterOptions(items, selected, allLabel) {
    const normalized = arr(items).map(item => Array.isArray(item) ? [item[0], item.length > 2 ? textPair(item[1], item[2]) : item[1]] : [item, item]).filter(([value]) => String(value || "").trim());
    const leading = allLabel ? [[ "all", allLabel ]] : [];
    return leading.concat(normalized).map(([value, label]) => `<option value="${h(value)}" ${String(selected) === String(value) ? "selected" : ""}>${h(label)}</option>`).join("");
  }
  function coverageNotice(payload, rows, market) {
    const coverage = (payload && payload.coverage) || {};
    const discovery = (payload && payload.symbolDiscovery) || {};
    const failed = num(coverage.failed, discovery.failedCount, arr(payload && payload.failed).length) || 0;
    const unavailable = num(coverage.unavailablePrice, discovery.unavailablePriceCount, discovery.unavailableCount, arr(payload && payload.unavailable).length) || 0;
    const available = num(coverage.availableWithPrice, discovery.availablePriceCount) || rows.filter(x => num(x.price, x.currentPrice) !== null).length;
    const loaded = num(coverage.loaded, discovery.loadedPageSymbols, rows.length) || rows.length;
    const total = num(coverage.totalFilteredSymbols, discovery.totalFilteredSymbols, payload && payload.marketUniverse && payload.marketUniverse.total, rows.length) || rows.length;
    const lastUpdated = latinDateTime((payload && (payload.lastUpdated || payload.generatedAt || payload.updatedAt)) || discovery.lastUpdated || new Date().toISOString());
    if (market && market.id === "etfs") {
      return `<div class="coverage-stack">
        <div class="provider-market-state warn coverage-notice"><strong>${h(textPair(FUND_PROVIDER_NOTE_AR, FUND_PROVIDER_NOTE_EN))}</strong></div>
        <div class="detail-grid compact-detail-grid">
          ${detailCard("إجمالي الصناديق", latinNumber(total), "Total funds")}
          ${detailCard("الصناديق المتاحة", latinNumber(available), "Available funds")}
          ${detailCard("الصناديق بدون سعر", latinNumber(unavailable), "Funds without price")}
          ${detailCard("آخر تحديث", lastUpdated, "Last updated")}
        </div>
      </div>`;
    }
    const showNotice = failed > 0 || unavailable > 0 || Boolean(payload && payload.reason);
    return `<div class="coverage-stack">
      ${showNotice ? `<div class="provider-market-state warn coverage-notice"><strong>${h(textPair(COVERAGE_NOTICE_AR, COVERAGE_NOTICE_EN))}</strong></div>` : ""}
      <div class="detail-grid compact-detail-grid">
        ${detailCard("إجمالي مكتشف", latinNumber(total), "Total discovered")}
        ${detailCard("تم تحميله", latinNumber(loaded), "Loaded")}
        ${detailCard("بسعر متاح", latinNumber(available), "Available with price")}
        ${detailCard("السعر غير متاح", latinNumber(unavailable), "Unavailable price")}
        ${detailCard("فشل", latinNumber(failed), "Failed")}
      </div>
    </div>`;
  }
  function marketUniverseTable(rows) {
    const headers = [["symbol", terminalText("symbol")], ["name", textPair("الشركة", "Company")], ["priceAvailability", terminalText("price")], ["marketCap", terminalText("marketCap")], ["volume", terminalText("volume")]];
    return `<div class="table-shell market-universe-table" data-market-universe-table><table>
      <thead><tr>${headers.map(([key, label]) => `<th><button type="button" data-market-universe-sort="${h(key)}">${h(label)}${sortMark(key)}</button></th>`).join("")}<th>${h(terminalText("exchange"))}</th><th>${h(terminalText("currency"))}</th><th>${h(terminalText("sector"))}</th><th>${h(terminalText("industry"))}</th><th>${h(terminalText("type"))}</th><th>${h(terminalText("action"))}</th></tr></thead>
      <tbody>${rows.map(marketUniverseRow).join("")}</tbody>
    </table><div class="market-universe-card-list">${rows.map(marketUniverseCard).join("")}</div></div>`;
  }
  function sortMark(key) {
    return state.marketUniverseView.sort === key ? `<span aria-hidden="true">${state.marketUniverseView.dir === "asc" ? " ↑" : " ↓"}</span>` : "";
  }
  function marketUniverseRow(row) {
    const a = normalizeQuote(norm(row)), p = a.price, priceText = price(p, currency(a));
    const typeText = assetType(a.symbol, a.assetType) === "fund" ? fundTypeText(a) : (a.assetType || assetType(a.symbol));
    return `<tr data-universe-symbol="${h(a.symbol)}" class="${!isValidPrice(p) ? "is-muted" : ""}">
      <td class="wt-asset" data-label="${h(terminalText("symbol"))}"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.displaySymbol || a.symbol)}</strong><small class="ltr">${h(a.providerSymbol || a.providerSymbolUsed || "--")}</small></span></button></td>
      <td data-label="${h(textPair("الشركة", "Company"))}">${h(a.companyName || a.name || "--")}</td>
      <td class="ltr" data-label="${h(terminalText("price"))}">${h(priceText)}</td>
      <td class="ltr" data-label="${h(terminalText("marketCap"))}">${h(marketCapText(a.marketCap, a.currency))}</td>
      <td class="ltr" data-label="${h(terminalText("volume"))}">${h(bigNumber(a.volume))}</td>
      <td class="ltr" data-label="${h(terminalText("exchange"))}">${h(a.exchange || a.exchangeCode || "--")}</td>
      <td class="ltr" data-label="${h(terminalText("currency"))}">${h(currency(a))}</td>
      <td data-label="${h(terminalText("sector"))}">${h(a.sector || "--")}</td>
      <td data-label="${h(terminalText("industry"))}">${h(a.industry || "--")}</td>
      <td data-label="${h(terminalText("type"))}">${h(typeText)}</td>
      <td class="row-actions" data-label="${h(terminalText("action"))}"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("analysis"))}</button></td>
    </tr>`;
  }
  function marketUniverseCard(row) {
    const a = normalizeQuote(norm(row)), p = a.price, priceText = price(p, currency(a));
    if (assetType(a.symbol, a.assetType) === "fund") return fundUniverseCard(a, p, priceText);
    return `<article class="provider-market-card market-universe-card ${!isValidPrice(p) ? "is-muted" : ""}" data-universe-symbol="${h(a.symbol)}">
      <div class="provider-market-card-head"><strong class="ltr">${h(a.displaySymbol || a.symbol)}</strong><span class="ltr">${h(currency(a))}</span></div>
      <p>${h(a.companyName || a.name || "--")}</p>
      <dl><div><dt>${h(terminalText("price"))}</dt><dd class="ltr">${h(priceText)}</dd></div><div><dt>${h(terminalText("exchange"))}</dt><dd class="ltr">${h(a.exchange || "--")}</dd></div><div><dt>${h(terminalText("sector"))}</dt><dd>${h(a.sector || "--")}</dd></div><div><dt>${h(terminalText("type"))}</dt><dd>${h(a.assetType || assetType(a.symbol))}</dd></div></dl>
      <button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("open"))}</button>
    </article>`;
  }
  function fundUniverseCard(a, p, priceText) {
    const fundType = fundTypeText(a);
    const market = [a.exchange || a.exchangeCode || a.market, currency(a)].filter(Boolean).join(" · ") || "--";
    const nav = num(a.nav);
    const displayPrice = isValidPrice(p) ? priceText : isValidPrice(nav) ? `NAV ${price(nav, currency(a))}` : priceUnavailableText();
    const quality = dataQualityLabel(a.dataAvailability || a.dataQuality || (!isValidPrice(p) && !isValidPrice(nav) ? "unavailable" : "available"));
    const shariah = shariahStatusLabel(a.shariahStatus || a.shariaStatus);
    return `<article class="provider-market-card market-universe-card fund-universe-card ${!isValidPrice(p) && !isValidPrice(nav) ? "is-muted" : ""}" data-universe-symbol="${h(a.symbol)}">
      <div class="provider-market-card-head"><strong>${h(a.fundName || a.companyName || a.name || a.symbol)}</strong><span class="ltr">${h(a.displaySymbol || a.symbol)}</span></div>
      <p><span>${h(fundType)}</span></p>
      <dl>
        <div><dt>${h(terminalText("symbol"))}</dt><dd class="ltr">${h(a.displaySymbol || a.symbol)}</dd></div>
        <div><dt>${h(terminalText("currency"))}</dt><dd class="ltr">${h(currency(a))}</dd></div>
        <div><dt>${h(textPair("البورصة / السوق", "Exchange / Market"))}</dt><dd class="ltr">${h(market)}</dd></div>
        <div><dt>${h(terminalText("issuer"))}</dt><dd>${h(a.issuer || "--")}</dd></div>
        <div><dt>${h(textPair("السعر / صافي قيمة الأصل", "Price / NAV"))}</dt><dd class="ltr">${h(displayPrice)}</dd></div>
        <div><dt>${h(terminalText("yield"))}</dt><dd class="ltr">${h(percentMetric(a.distributionYield))}</dd></div>
        <div><dt>${h(terminalText("expenseRatio"))}</dt><dd class="ltr">${h(percentMetric(a.expenseRatio))}</dd></div>
        <div><dt>${h(terminalText("dataQuality"))}</dt><dd>${h(quality)}</dd></div>
        <div><dt>${h(terminalText("shariahStatus"))}</dt><dd>${h(shariah)}</dd></div>
      </dl>
      <button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("open"))}</button>
    </article>`;
  }
  function fundTypeText(a) {
    const key = String(a.fundType || "").toLowerCase();
    const label = FUND_TYPE_LABELS[key];
    if (a.fundTypeLabelAr || a.fundTypeLabelEn) return textPair(a.fundTypeLabelAr || a.fundTypeLabelEn, a.fundTypeLabelEn || a.fundTypeLabelAr);
    return label ? textPair(label[0], label[1]) : terminalText("fund");
  }
  function percentMetric(value) {
    const n = num(value);
    if (n === null) return "--";
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}%`;
  }
  function shariahStatusLabel(value) {
    const v = String(value || "").toLowerCase();
    if (v === "compliant") return textPair("متوافق مع الشريعة", "Compliant");
    if (v === "non_compliant") return textPair("غير متوافق", "Non-compliant");
    if (v === "needs_review") return textPair("بحاجة إلى مراجعة", "Needs review");
    if (v === "possible" || v === "partial") return textPair("قد يكون متوافقاً", "Possibly compliant");
    return "--";
  }
  function bigNumber(value) {
    const n = num(value);
    if (n === null) return "--";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function marketCapText(value, currencyCode) {
    let n = num(value);
    if (n === null || n <= 0) return "--";
    // Finnhub يرجّع القيمة السوقية بالملايين؛ لا توجد شركة مدرجة قيمتها أقل من 10 ملايين دولار خام،
    // لذا أي رقم أقل من 1e7 نعتبره بالملايين ونحوّله لقيمة خام.
    if (n < 1e7) n *= 1e6;
    const c = currencyCode && currencyCode !== "--" ? ` ${currencyCode}` : "";
    if (n >= 1e12) return `${(n / 1e12).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${textPair("تريليون", "trillion")}${c}`;
    if (n >= 1e9) return `${(n / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${textPair("مليار", "billion")}${c}`;
    return `${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })} ${textPair("مليون", "million")}${c}`;
  }

  function scannerPage() {
    const r = recs(), u = arr(state.rec.unavailable), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    const conf = confBuckets(r);
    return `<div class="page-stack">${hero(textPair("ماسح الذكاء الاصطناعي بدون نتائج مصطنعة", "AI scanner without synthetic results"), textPair("يفرز الماسح التوصيات والإشارات القادمة من الـ API فقط. عند غياب المزود تظهر أسباب الغياب بوضوح.", "The scanner sorts only recommendations and signals returned by the API. When the provider is unavailable, the reason is shown clearly."), "AI SCANNER")}
      <section class="metric-grid">${stat(textPair("فرص شراء", "Buy opportunities"), buy.length, textPair("إشارات الشراء", "Buy signals"))}${stat(textPair("فرص بيع", "Sell opportunities"), sell.length, textPair("إشارات البيع", "Sell signals"))}${stat(textPair("انتظار", "Wait"), wait.length, textPair("انتظار", "Wait"))}${stat(terminalText("unavailable"), u.length, terminalText("unavailable"))}</section>
      <section class="dash-split">
        <article class="panel"><span class="eyebrow">${h(textPair("نتائج الماسح", "Scanner results"))}</span><h2>${h(textPair("نتائج الفحص", "Scanner results"))}</h2>
          <div class="seg-tabs" role="tablist"><button class="is-active" data-tab="scan" data-value="all">${h(terminalText("all"))}</button><button data-tab="scan" data-value="buy">${h(textPair("شراء", "Buy"))}</button><button data-tab="scan" data-value="sell">${h(textPair("بيع", "Sell"))}</button><button data-tab="scan" data-value="wait">${h(textPair("انتظار", "Wait"))}</button></div>
          <div data-tabpanel="scan" data-render="scan">${r.length ? assetList(r) : selectionEmptyState()}</div>
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">${h(terminalText("confidence"))}</span><h2>${h(textPair("توزيع الثقة", "Confidence distribution"))}</h2>${confBars(conf)}</article>
          <article class="panel"><span class="eyebrow">${h(textPair("رادار المخاطر", "Risk radar"))}</span><h2>${h(textPair("رادار المخاطر", "Risk radar"))}</h2>${riskRadar(r)}</article>
          <article class="panel"><span class="eyebrow">${h(textPair("الأقوى", "Strongest"))}</span><h2>${h(textPair("أقوى الإشارات", "Strongest signals"))}</h2>${r.length ? assetList(topPicks(r, 3)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }
  window.__tabRenderers = window.__tabRenderers || {};
  window.__tabRenderers.scan = (v) => { const r = recs(); const f = v === "all" ? r : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : selectionEmptyState(); };
  window.__tabRenderers.rec = (v) => { const r = recs(); const f = v === "all" ? r : v === "high" ? r.filter(x => (num(x.confidence, x.score, x.aiConfidence) || 0) >= 70) : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : selectionEmptyState(); };

  function watchPage() {
    const quick = unique(defaults.concat(["EURUSD", "SPY", "2222.SR", "ETHUSD"]));
    return `<div class="page-stack">${hero(textPair("قائمة متابعة ذكية ونظيفة", "Clean smart watchlist"), textPair("أضف الرموز التي تريد مراقبتها. الأسعار والتحليلات تظهر فقط عند توفرها من المزود، والعملة تتبع كل رمز.", "Add the symbols you want to watch. Prices and analysis appear only when available from the provider, and currency follows each symbol."), "WATCHLIST")}
      <section class="panel"><span class="eyebrow">${h(textPair("إضافة سريعة", "Quick add"))}</span><h2>${h(textPair("إضافة سريعة", "Quick add"))}</h2><div class="quick-actions">${quick.map(s => `<button class="ghost-btn" data-quick-add="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("قائمتي", "My watchlist"))}</span><h2>${h(textPair(`قائمتي (${state.watch.length})`, `My watchlist (${state.watch.length})`))}</h2></div></div>
        ${state.watch.length ? watchlistTable(state.watch.map(s => matchRec(s) || { symbol: s, name: s }), { removable: true }) : emptyState(textPair("قائمة المتابعة فارغة", "Watchlist is empty"), textPair("أضف رموزاً من الأعلى. لن نملأها ببيانات وهمية.", "Add symbols above. We will not fill it with synthetic data."), textPair("افتح الأسواق", "Open markets"), `${ROOT}/markets`)}
      </section></div>`;
  }

  function portfolioPage() {
    const t = trades(), h2 = state.holdings;
    const enriched = h2.map(p => ({ ...p, rec: matchRec(p.symbol) }));
    const totalCost = h2.reduce((s, p) => s + (num(p.qty) || 0) * (num(p.entry) || 0), 0);
    return `<div class="page-stack">${hero(textPair("المحفظة والمتابعة", "Portfolio and tracking"), textPair("تابع مراكزك المحلية وصفقات المتابعة. قيمة السوق الحية تظهر عند توفر أسعار من المزود.", "Track local positions and followed trades. Live market value appears when provider prices are available."), "PORTFOLIO")}
      <section class="metric-grid">${stat(textPair("مراكز", "Positions"), h2.length, textPair("المراكز", "Holdings"))}${stat(textPair("التكلفة", "Cost basis"), totalCost ? totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "--", textPair("التكلفة", "Cost basis"))}${stat(textPair("صفقات متابعة", "Followed trades"), t.length, textPair("متابعة", "Followed"))}${stat(textPair("ملف المخاطر", "Risk profile"), riskLabel(state.settings.risk), textPair("ملف المخاطر", "Risk profile"))}</section>
      <section class="dash-split">
        <article class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("المراكز", "Holdings"))}</span><h2>${h(textPair("المراكز الحالية", "Current positions"))}</h2></div></div>
          ${h2.length ? holdingsTable(enriched) : emptyState(textPair("لا توجد مراكز", "No positions"), textPair("أضف مركزاً من صفحة تفاصيل الرمز أو تابع توصية حقيقية.", "Add a position from symbol details or follow a real recommendation."), textPair("تفاصيل رمز", "Symbol details"), `${ROOT}/symbol-details`)}
          ${holdingForm()}
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">${h(textPair("التوزيع", "Allocation"))}</span><h2>${h(textPair("توزيع الأصول", "Asset allocation"))}</h2>${allocation(enriched)}</article>
          <article class="panel"><span class="eyebrow">${h(textPair("المتابعة", "Followed"))}</span><h2>${h(textPair("صفقات المتابعة", "Followed trades"))}</h2>${t.length ? tradeList(t.slice(0, 4)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }

  function alertsPage() {
    const smart = smartAlerts(), local = state.alerts;
    return `<div class="page-stack">${hero(textPair("مركز التنبيهات", "Alerts center"), textPair("أنشئ تنبيهات سعرية ونسبية وتنبيهات إشارة. التنبيهات الذكية من المزود، والمحلية تُحفظ على جهازك.", "Create price, percent, and signal alerts. Smart alerts come from the provider, and local alerts are saved on your device."), "ALERTS")}
      <section class="panel"><span class="eyebrow">${h(textPair("إنشاء تنبيه", "Create alert"))}</span><h2>${h(textPair("إنشاء تنبيه", "Create alert"))}</h2>
        <form id="alert-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="${h(textPair("الرمز مثل AAPL", "Symbol e.g. AAPL"))}" /><select name="type"><option value="price">${h(textPair("سعر يصل إلى", "Price reaches"))}</option><option value="percent">${h(textPair("تغير نسبة %", "Percent change %"))}</option><option value="signal">${h(textPair("إشارة AI", "AI signal"))}</option><option value="news">${h(textPair("خبر مؤثر", "Market-moving news"))}</option></select><input name="value" inputmode="decimal" placeholder="${h(textPair("القيمة", "Value"))}" /><button class="action-btn" type="submit">${h(textPair("إضافة", "Add"))}</button></form>
      </section>
      <section class="alert-grid">
        <article class="panel"><span class="eyebrow">${h(textPair("تنبيهات ذكية", "Smart alerts"))}</span><h2>${h(textPair("تنبيهات المزود", "Provider alerts"))}</h2>${smart.length ? alertList(smart) : emptyState(textPair("لا توجد تنبيهات ذكية", "No smart alerts"), textPair("لم يرجع المزود تنبيهات حالية.", "The provider did not return current alerts."), textPair("التوصيات", "Recommendations"), `${ROOT}/recommendations`)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair(`تنبيهات محلية (${local.length})`, `Local alerts (${local.length})`))}</span><h2>${h(textPair("تنبيهاتي المحفوظة", "Saved alerts"))}</h2>${local.length ? local.map(localAlertRow).join("") : emptyState(textPair("لا توجد تنبيهات محلية", "No local alerts"), textPair("استخدم النموذج بالأعلى لإنشاء تنبيه متابعة.", "Use the form above to create a tracking alert."), "", "")}</article>
      </section></div>`;
  }

  function recPage() {
    const r = recs(), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    return `<div class="page-stack">${hero(textPair("التوصيات والتحليل", "Recommendations and analysis"), textPair("توصيات الذكاء مع حالة كل صفقة: مفتوحة، تحت المتابعة، مكتملة، فاشلة أو منتهية. كل بطاقة لها زر تحليل.", "AI recommendations with each trade status: open, under watch, completed, failed, or expired. Every card has an analysis button."), "RECOMMENDATIONS")}
      <section class="metric-grid">${stat(terminalText("all"), r.length, terminalText("all"))}${stat(textPair("شراء", "Buy"), buy.length, textPair("شراء", "Buy"))}${stat(textPair("بيع", "Sell"), sell.length, textPair("بيع", "Sell"))}${stat(textPair("انتظار", "Wait"), wait.length, textPair("انتظار", "Wait"))}</section>
      <section class="panel"><span class="eyebrow">${h(textPair("الإشارات", "Signals"))}</span><h2>${h(textPair("قائمة التوصيات", "Recommendation list"))}</h2><div class="rec-market-chips">${MARKETS.map(m => `<button class="chip ${state.settings.defaultMarket === m.id ? "is-active" : ""}" data-rec-market="${m.id}">${h(marketName(m))}</button>`).join("")}</div>
        <div class="seg-tabs"><button class="is-active" data-tab="rec" data-value="all">${h(terminalText("all"))}</button><button data-tab="rec" data-value="buy">${h(textPair("شراء", "Buy"))}</button><button data-tab="rec" data-value="sell">${h(textPair("بيع", "Sell"))}</button><button data-tab="rec" data-value="wait">${h(textPair("انتظار", "Wait"))}</button><button data-tab="rec" data-value="high">${h(textPair("ثقة عالية", "High confidence"))}</button></div>
        <div data-tabpanel="rec" data-render="rec">${r.length ? recCards(r) : selectionEmptyState()}</div>
      </section>${disclaimer()}</div>`;
  }

  function precisionLivePanel() {
    const pl = state.followed && state.followed.precisionLive;
    if (!pl || !num(pl.total)) return "";
    const resolved = (pl.won || 0) + (pl.lost || 0);
    const liveRate = pl.successRate === null || pl.successRate === undefined ? "--" : `${pl.successRate}%`;
    return `<section class="panel precision-live-panel">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("الدقة · اختبار أمامي", "Precision · forward test"))}</span><h2>${h(textPair("الدقة الحية — إشارات بوابة الـ90%", "Live precision — 90% gate signals"))}</h2></div><span class="precision-badge ${resolved && pl.successRate >= 90 ? "pass" : "info"}">${h(resolved ? textPair(`نجاح حي ${liveRate}`, `Live success ${liveRate}`) : textPair("بانتظار أول نتيجة", "Awaiting first result"))}</span></div>
      <div class="metric-grid">${stat(textPair("إشارات متتبعة", "Tracked signals"), pl.total, textPair("متتبعة", "Tracked"))}${stat(textPair("أصابت الهدف", "Hit target"), pl.won || 0, textPair("ربحت", "Won"))}${stat(textPair("لمست الوقف", "Hit stop"), pl.lost || 0, textPair("خسرت", "Lost"))}${stat(terminalText("open"), pl.open || 0, terminalText("open"))}${stat(textPair("النجاح الحي", "Live success"), liveRate, textPair("المعدل الحي", "Live rate"))}</div>
      <p class="muted-note">${h(textPair("كل إشارة اجتازت بوابة الدقة تُسجَّل تلقائياً بهدفها ووقفها المنشورَين، وتُحسم فوز/خسارة حسب أول ملامسة فعلية. هذا هو الإثبات الحي لنسبة النجاح، وليس الاختبار التاريخي وحده.", "Every signal that passes the precision gate is logged automatically with its published target and stop, then resolved by the first actual touch. This is live proof of success rate, not historical testing alone."))}</p>
    </section>`;
  }
  function performancePage() {
    const all = trades(), g = groupTrades(all), summary = tradeSummary(all);
    return `<div class="page-stack trade-performance-page">${hero(textPair("أداء الصفقات", "Trade performance"), textPair("نتائج إشارات الشراء والبيع المحفوظة، صفقات المتابعة اليدوية، وسجلات التوصيات. لا تُعرض نتائج وهمية عند غياب السجلات.", "Saved buy/sell signal outcomes, manual followed trades, and recommendation logs. No synthetic results are shown when records are missing."), "TRADE PERFORMANCE")}
      ${tradeProviderStatus(all)}
      ${precisionLivePanel()}
      <section class="metric-grid trade-summary-grid">${stat(textPair("الصفقات الرابحة", "Winning trades"), g.win.length, textPair("رابحة", "Winning"))}${stat(textPair("الصفقات الخاسرة", "Losing trades"), g.loss.length, textPair("خاسرة", "Losing"))}${stat(textPair("الصفقات المفتوحة", "Open trades"), g.open.length, terminalText("open"))}${stat(terminalText("underWatch"), g.follow.length, textPair("تحت المتابعة", "Watching"))}${stat(textPair("نسبة النجاح", "Win rate"), summary.successRate === null ? "--" : summary.successRate + "%", textPair("نسبة النجاح", "Win rate"))}</section>
      ${all.length ? `<section class="trade-board">${tradeCol(textPair("الصفقات الرابحة", "Winning trades"), g.win, "win")}${tradeCol(textPair("الصفقات الخاسرة", "Losing trades"), g.loss, "loss")}${tradeCol(textPair("الصفقات المفتوحة", "Open trades"), g.open, "open")}${tradeCol(textPair("صفقات الانتظار", "Waiting trades"), g.wait, "wait")}${tradeCol(textPair("الصفقات تحت المتابعة", "Trades under watch"), g.follow, "follow")}</section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("السجل", "Journal"))}</span><h2>${h(textPair("سجل تفصيلي", "Detailed journal"))}</h2></div><button class="ghost-btn" data-refresh-trades>${h(textPair("تحديث الأسعار", "Refresh prices"))}</button></div>${tradeJournalTable(all)}</section>` : performanceEmptyState()}
      ${followedTradeForm()}
      ${disclaimer()}</div>`;
  }

  function newsPage() {
    const n = newsItems();
    return `<div class="page-stack">${hero(textPair("أخبار السوق", "Market news"), textPair("تُقرأ الأخبار من مزود حقيقي. عند غيابه نعرض رسالة واضحة بدل عناوين مصطنعة.", "News is read from a real provider. When it is unavailable, a clear message is shown instead of synthetic headlines."), "NEWS")}
      <section class="news-grid">${n.length ? n.map(newsCard).join("") : unavailableSection(state.news, textPair("مزود الأخبار لم يرجع عناصر قابلة للعرض.", "The news provider did not return displayable items."), terminalText("settings"), `${ROOT}/settings`)}</section></div>`;
  }

  function calendarPage() {
    const c = state.calendar || {};
    return `<div class="page-stack trader-calendar-page">${hero(textPair("تقويم السوق", "Market calendar"), textPair("تقويم حي لأرباح الشركات والتوزيعات والاكتتابات والأحداث الاقتصادية من مزودين حقيقيين. عند تعذر البيانات نعرض السبب بوضوح بدون بيانات وهمية.", "Live company earnings, dividends, IPOs, and economic events from real providers. When data is unavailable, the reason is shown clearly without synthetic data."), "CALENDAR")}
      <section class="panel trader-calendar-toolbar">
        <div><span class="eyebrow">${h(terminalText("dateRange"))}</span><h2>${h(terminalText("dateRange"))}</h2></div>
        <div class="calendar-ranges">${calendarRangeButtons()}</div>
      </section>
      ${calendarProviderOverview()}
      <section class="calendar-grid">
        ${calendarPanel("earnings", textPair("الأرباح", "Earnings"), textPair("أرباح الشركات", "Company earnings"), c.earnings, earningsRows)}
        ${calendarPanel("dividends", textPair("التوزيعات", "Dividends"), textPair("التوزيعات", "Dividends"), c.dividends, dividendRows)}
        ${calendarPanel("ipos", textPair("الاكتتابات", "IPOs"), textPair("الاكتتابات", "IPOs"), c.ipos, ipoRows)}
        ${calendarPanel("economic", textPair("الاقتصاد", "Economic"), textPair("التقويم الاقتصادي", "Economic calendar"), c.economic, economicRows)}
      </section></div>`;
  }

  function calendarRangeButtons() {
    const ranges = [["today", textPair("اليوم", "Today")], ["7", textPair("7 أيام", "7 days")], ["30", textPair("30 يوم", "30 days")], ["90", textPair("90 يوم", "90 days")], ["all", terminalText("all")]];
    return ranges.map(([value, label]) => `<button class="${state.calendarRange === value ? "is-active" : ""}" data-calendar-range="${h(value)}">${h(label)}</button>`).join("");
  }

  function calendarProviderOverview() {
    const ps = state.providerStatus || {}, features = ps.features || {};
    const rows = [
      [textPair("أرباح الشركات", "Company earnings"), features.earnings],
      [textPair("التوزيعات", "Dividends"), features.dividends],
      [textPair("الاكتتابات", "IPOs"), features.ipos],
      [textPair("التقويم الاقتصادي", "Economic calendar"), features.economic]
    ];
    return `<section class="provider-state-panel trader-provider-panel">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("حالة المزود", "Provider status"))}</span><h2>${h(textPair("مزود البيانات", "Data provider"))}</h2></div><button class="ghost-btn" data-retry>${h(terminalText("retry"))}</button></div>
      <div class="provider-state-grid">${rows.map(([label, feature]) => providerFeatureCard(label, feature)).join("")}</div>
    </section>`;
  }

  function providerFeatureCard(label, feature) {
    feature = feature || {};
    const tone = featureStatusTone(feature.status);
    return `<article class="provider-state-card">
      <span>${h(label)}</span>
      <strong>${""}</strong>
      <p>${h(featureStatusLabel(feature.status))}</p>
      <em class="state-badge ${tone}">${h(resultCountText(feature.resultCount))}</em>
    </article>`;
  }

  function calendarPanel(kind, eyebrow, title, response, rowRenderer) {
    response = response || {};
    const rows = arr(response.data);
    const isOpen = state.calendarOpen && state.calendarOpen[kind] === true;
    const count = response.resultCount ?? rows.length;
    return `<article class="panel trader-calendar-panel calendar-${h(kind)} ${isOpen ? "is-open" : "is-collapsed"}">
      <div class="panel-head calendar-panel-head">
        <div><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-head-actions">
          ${providerBadge(response)}
          <span class="state-badge muted">${h(latinNumber(count))} ${h(terminalText("rows"))}</span>
          <button class="ghost-btn compact-btn" data-calendar-section-toggle="${h(kind)}" aria-expanded="${isOpen ? "true" : "false"}">${h(isOpen ? terminalText("collapse") : terminalText("open"))}</button>
          <button class="ghost-btn compact-btn" data-retry>${h(terminalText("retry"))}</button>
        </div>
      </div>
      ${isOpen ? `<div class="calendar-section-body">
      <div class="calendar-meta">
        <span>${h(terminalText("lastUpdated"))}: <b>${h(latinDateTime(response.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
        <span>${h(terminalText("period"))}: <b class="ltr">${h(rangeText(response.range))}</b></span>
        <span>${h(terminalText("results"))}: <b class="ltr">${h(latinNumber(count))}</b></span>
      </div>
      ${state.calendarLoading ? calendarLoadingState() : rows.length ? rowRenderer(rows) : calendarEmptyState(response)}
      </div>` : ""}
    </article>`;
  }

  function providerBadge(response) {
    const status = response && response.status;
    const tone = featureStatusTone(status);
    return `<span class="state-badge ${tone}">${h(featureStatusLabel(status))}</span>`;
  }

  function calendarLoadingState() {
    return `<div class="empty-state compact"><span class="empty-glyph">◌</span><h3>${h(textPair("جاري تحديث التقويم", "Updating calendar"))}</h3><p>${h(textPair("نراجع المزود المتصل ونحدّث النتائج للفترة المختارة.", "Checking the connected provider and refreshing the selected range."))}</p></div>`;
  }

  function calendarEmptyState(response) {
    const status = String((response && response.status) || "not_configured");
    let title = UNAVAILABLE_MESSAGE;
    let body = formatProviderError(response && response.message, { empty: textPair("اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.", "Connect a data provider to show events, dividends, and IPOs.") });
    let settings = true;
    if (response && response.routeUnavailable) {
      title = ROUTE_UNAVAILABLE_MESSAGE;
      body = textPair("تعذر الوصول إلى مسار البيانات المطلوب.", "The requested data route could not be reached.");
      settings = false;
    } else if (response && response.timeout) {
      title = UNAVAILABLE_MESSAGE;
      body = textPair("انتهت مهلة الطلب. يمكنك إعادة المحاولة بدون إعادة تحميل الصفحة.", "The request timed out. You can retry without reloading the page.");
      settings = false;
    } else if (status === "success") {
      title = textPair("لا توجد أحداث ضمن الفترة الحالية", "No events in the current range");
      body = textPair("جرّب تغيير الفترة أو السوق أو نوع الحدث.", "Try changing the range, market, or event type.");
      settings = false;
    } else if (status === "not_configured" || status === "missing_provider") {
      title = textPair("لا يوجد مزود متصل", "No connected provider");
      body = textPair("اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.", "Connect a data provider to show events, dividends, and IPOs.");
    } else if (["not_entitled", "forbidden", "unauthorized"].includes(status)) {
      title = textPair("الميزة غير متاحة ضمن صلاحية المزود الحالي", "Feature unavailable for the current provider entitlement");
      body = textPair("تحتاج هذه البيانات إلى خطة تدعم هذا النوع من التقويم.", "This data requires a plan that supports this calendar type.");
    } else if (status === "rate_limited") {
      title = UNAVAILABLE_MESSAGE;
      body = response && (response.cached || response.stale) ? textPair("يتم عرض أحدث بيانات متاحة إلى أن يعود التحديث المباشر.", "Showing the latest available data until live updates return.") : textPair("البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل.", "Data is currently unavailable. Try again shortly.");
      settings = false;
    } else if (status === "provider_error" || status === "invalid_request") {
      title = UNAVAILABLE_MESSAGE;
      body = textPair("تعذر جلب البيانات من المزود الحالي. لم يتم عرض أي بيانات بديلة.", "The current provider could not fetch data. No fallback data was shown.");
      settings = false;
    }
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(translateUiText(title))}</h3><p>${h(translateUiText(body))}</p><div class="row-actions">${settings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>${h(terminalText("settings"))}</a>` : ""}<button class="ghost-btn" data-retry>${h(terminalText("retry"))}</button></div></div>`;
  }

  const EARNINGS_COLUMNS = [
    { key: "symbol", label: "Symbol", sort: "symbol", pinned: true, value: r => r.symbol || "--", raw: r => r.symbol, cls: "ltr" },
    { key: "companyName", label: "Company", sort: "companyName", pinned: true, value: r => r.companyName || "--", raw: r => r.companyName },
    { key: "reportDate", label: "Report date", sort: "reportDate", pinned: true, value: r => latinDateOnly(r.reportDate), raw: r => r.reportDate, cls: "ltr" },
    { key: "status", label: "Status", sort: "status", pinned: true, value: r => earningsStatusLabel(r), raw: r => earningsStatusLabel(r) },
    { key: "fiscalDateEnding", label: "Fiscal period", sort: "fiscalDateEnding", value: r => r.fiscalDateEnding || "--", raw: r => r.fiscalDateEnding, cls: "ltr" },
    { key: "epsEstimate", label: "EPS est.", sort: "epsEstimate", value: r => latinNumber(r.epsEstimate), raw: r => r.epsEstimate, cls: "ltr" },
    { key: "epsActual", label: "EPS actual", sort: "epsActual", value: r => latinNumber(r.epsActual), raw: r => r.epsActual, cls: "ltr" },
    { key: "revenueEstimate", label: "Revenue est.", sort: "revenueEstimate", value: r => latinNumber(r.revenueEstimate), raw: r => r.revenueEstimate, cls: "ltr" },
    { key: "revenueActual", label: "Revenue actual", sort: "revenueActual", value: r => latinNumber(r.revenueActual), raw: r => r.revenueActual, cls: "ltr" },
    { key: "time", label: "Time", sort: "time", value: r => earningsTimeLabel(r.time), raw: r => r.time, cls: "ltr" },
    { key: "completeness", label: "Completeness", sort: "completeness", pinned: true, value: r => `${earningsCompletenessScore(r)}%`, raw: r => earningsCompletenessScore(r), cls: "ltr" }
  ];

  function earningsRows(rows) {
    const deduped = dedupeEarningsRows(rows).map(r => ({ ...r, completenessScore: earningsCompletenessScore(r) }));
    const completeRows = deduped.filter(r => !isPartialEarningsRow(r));
    const partialRows = deduped.filter(isPartialEarningsRow);
    const view = state.earningsView || {};
    const activeTab = view.tab === "partial" ? "partial" : "complete";
    const tabRows = activeTab === "partial" ? partialRows : completeRows;
    const searchedRows = filterEarningsRows(tabRows);
    const sortedRows = sortEarningsRows(searchedRows);
    const pageSize = Math.max(10, Number(view.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const page = Math.max(1, Math.min(Number(view.page) || 1, pageCount));
    state.earningsView.page = page;
    const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const columns = visibleEarningsColumns(tabRows.length ? tabRows : deduped);
    const sources = earningsSources(deduped);
    const nextPageSize = pageSize > 10 ? 10 : 25;
    return `<div class="earnings-calendar-view">
      <div class="calendar-source-strip">${sources.length ? sources.map(source => `<span>${h(source)}</span>`).join("") : `<span>${h(terminalText("noSource"))}</span>`}</div>
      <div class="earnings-controls">
        <form class="earnings-search" data-earnings-search-form>
          <input name="earningsSearch" value="${h(view.search || "")}" placeholder="${h(textPair("ابحث عن رمز أو شركة", "Search symbol or company"))}" />
          <button class="ghost-btn compact-btn" type="submit">${h(terminalText("search"))}</button>
        </form>
        <label>${h(terminalText("source"))}<select data-earnings-filter="source">${earningsFilterOptions(["all", ...sources], view.source || "all")}</select></label>
        <label>${h(terminalText("timing"))}<select data-earnings-filter="timing">${earningsFilterOptions(["all", "expected", "reported"], view.timing || "all")}</select></label>
      </div>
      <div class="seg-tabs calendar-data-tabs" role="tablist">
        <button class="${activeTab === "complete" ? "is-active" : ""}" data-earnings-tab="complete">${h(terminalText("completeData"))} <span>${latinNumber(completeRows.length)}</span></button>
        <button class="${activeTab === "partial" ? "is-active" : ""}" data-earnings-tab="partial">${h(terminalText("partialData"))} <span>${latinNumber(partialRows.length)}</span></button>
      </div>
      <div class="earnings-table-summary">
        <span>${h(terminalText("showingRows", { shown: latinNumber(pageRows.length), total: latinNumber(sortedRows.length) }))}</span>
        <span>${h(terminalText("dedupedRows", { count: latinNumber(Math.max(0, rows.length - deduped.length)) }))}</span>
      </div>
      ${pageRows.length ? `${earningsTable(pageRows, columns)}${earningsCards(pageRows, columns)}` : earningsNoRows(activeTab)}
      <div class="calendar-pagination">
        <button class="ghost-btn compact-btn" data-earnings-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${h(terminalText("previous"))}</button>
        <span>${h(terminalText("page"))} <span class="ltr">${latinNumber(page)} / ${latinNumber(pageCount)}</span></span>
        <button class="ghost-btn compact-btn" data-earnings-page="${page + 1}" ${page >= pageCount ? "disabled" : ""}>${h(terminalText("next"))}</button>
        ${sortedRows.length > 10 ? `<button class="ghost-btn compact-btn" data-earnings-page-size="${nextPageSize}">${h(terminalText(pageSize > 10 ? "showLess" : "showMore"))}</button>` : ""}
      </div>
    </div>`;
  }

  function dedupeEarningsRows(rows) {
    const seen = new Set();
    return arr(rows).filter(row => {
      const key = [sym(row.symbol), row.reportDate || "", row.fiscalDateEnding || "", String(row.source || row.provider || "").trim().toLowerCase()].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function earningsCompletenessScore(row) {
    const fields = ["symbol", "companyName", "reportDate", "fiscalDateEnding", "epsEstimate", "revenueEstimate", "time"];
    if (!isFutureEarnings(row)) fields.push("epsActual", "revenueActual");
    const complete = fields.filter(key => hasCalendarValue(row[key])).length;
    return Math.round((complete / fields.length) * 100);
  }

  function isPartialEarningsRow(row) {
    return earningsCompletenessScore(row) < 50;
  }

  function isFutureEarnings(row) {
    if (!row || !row.reportDate) return false;
    const report = new Date(`${String(row.reportDate).slice(0, 10)}T00:00:00Z`);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Number.isFinite(report.getTime()) && report > today;
  }

  function earningsStatusLabel(row) {
    return isFutureEarnings(row) ? "Expected" : "Reported";
  }

  function earningsTimeLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "--";
    const key = raw.toLowerCase();
    if (key === "bmo") return "Before open";
    if (key === "amc") return "After close";
    if (key === "dmh") return "During market";
    return raw;
  }

  function hasCalendarValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "--";
  }

  function visibleEarningsColumns(rows) {
    return EARNINGS_COLUMNS.filter(column => column.pinned || rows.some(row => hasCalendarValue(column.raw(row))));
  }

  function earningsSources(rows) {
    return Array.from(new Set(rows.map(row => providerName(row.provider || row.source)).filter(Boolean))).sort();
  }

  function earningsFilterOptions(values, selected) {
    return values.map(value => `<option value="${h(value)}" ${String(selected) === String(value) ? "selected" : ""}>${h(earningsFilterLabel(value))}</option>`).join("");
  }

  function earningsFilterLabel(value) {
    if (value === "all") return terminalText("all");
    if (value === "expected") return terminalText("expected");
    if (value === "reported") return terminalText("reported");
    return value;
  }

  function filterEarningsRows(rows) {
    const view = state.earningsView || {};
    const query = String(view.search || "").trim().toLowerCase();
    const source = String(view.source || "all");
    const timing = String(view.timing || "all");
    return rows.filter(row => {
      const sourceLabel = providerName(row.provider || row.source);
      const haystack = [row.symbol, row.companyName, row.fiscalDateEnding, row.reportDate, sourceLabel].map(value => String(value || "").toLowerCase()).join(" ");
      if (query && !haystack.includes(query)) return false;
      if (source !== "all" && sourceLabel !== source) return false;
      if (timing === "expected" && !isFutureEarnings(row)) return false;
      if (timing === "reported" && isFutureEarnings(row)) return false;
      return true;
    });
  }

  function sortEarningsRows(rows) {
    const view = state.earningsView || {};
    const key = view.sortKey || "reportDate";
    const dir = view.sortDir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => compareEarningsValue(earningsSortValue(a, key), earningsSortValue(b, key)) * dir);
  }

  function earningsSortValue(row, key) {
    if (key === "status") return earningsStatusLabel(row);
    if (key === "completeness") return earningsCompletenessScore(row);
    return row[key];
  }

  function compareEarningsValue(a, b) {
    const an = Number(a), bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return String(a || "").localeCompare(String(b || ""), "en", { numeric: true, sensitivity: "base" });
  }

  function earningsTable(rows, columns) {
    return `<div class="table-shell calendar-table earnings-table-wrap"><table><thead><tr>${columns.map(column => `<th><button class="calendar-sort" data-earnings-sort="${h(column.sort)}">${h(translateUiText(column.label))}${sortMarker(column.sort)}</button></th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td class="${h(column.cls || "")}" data-label="${h(translateUiText(column.label))}">${h(column.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function earningsCards(rows, columns) {
    const detailColumns = columns.filter(column => !["symbol", "companyName", "status", "completeness"].includes(column.key));
    return `<div class="calendar-card-list earnings-card-list">${rows.map(row => `<article class="calendar-mobile-card">
      <div class="calendar-card-head"><div><strong class="ltr">${h(row.symbol || "--")}</strong><span>${h(row.companyName || "--")}</span></div><em>${h(earningsStatusLabel(row))}</em></div>
      <dl>${detailColumns.map(column => `<div><dt>${h(translateUiText(column.label))}</dt><dd class="${h(column.cls || "")}">${h(column.value(row))}</dd></div>`).join("")}</dl>
      <div class="calendar-card-score"><span>${h(terminalText("complete"))}</span><b class="ltr">${h(earningsCompletenessScore(row))}%</b></div>
    </article>`).join("")}</div>`;
  }

  function sortMarker(key) {
    const view = state.earningsView || {};
    if (view.sortKey !== key) return "";
    return view.sortDir === "desc" ? " v" : " ^";
  }

  function earningsNoRows(activeTab) {
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(textPair("لا توجد صفوف أرباح مطابقة", "No matching earnings rows"))}</h3><p>${h(activeTab === "partial" ? textPair("تظهر الصفوف الجزئية هنا عندما يرسل المزود سجلات غير مكتملة غالباً.", "Partial rows appear here when the provider sends mostly incomplete records.") : textPair("جرّب البحث أو المصدر أو التوقيت أو تبويب البيانات الجزئية.", "Try search, source, timing, or the Partial data tab."))}</p></div>`;
  }

  function calendarRows(rows, columns) {
    const visible = columns.filter(column => column.pinned || rows.some(row => hasCalendarValue(column.raw ? column.raw(row) : column.value(row))));
    return `<div class="table-shell calendar-table"><table><thead><tr>${visible.map(column => `<th>${h(translateUiText(column.label))}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${visible.map(column => `<td class="${h(column.cls || "")}" data-label="${h(translateUiText(column.label))}">${h(column.value(row))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="calendar-card-list">${rows.map(row => `<article class="calendar-mobile-card"><dl>${visible.map(column => `<div><dt>${h(translateUiText(column.label))}</dt><dd class="${h(column.cls || "")}">${h(column.value(row))}</dd></div>`).join("")}</dl></article>`).join("")}</div>`;
  }

  function dividendRows(rows) {
    return calendarRows(rows, [
      { label: "Symbol", value: r => r.symbol || "--", raw: r => r.symbol, pinned: true, cls: "ltr" },
      { label: "Company", value: r => r.companyName || "--", raw: r => r.companyName, pinned: true },
      { label: "Declaration", value: r => latinDateOnly(r.declarationDate), raw: r => r.declarationDate, cls: "ltr" },
      { label: "Ex-date", value: r => latinDateOnly(r.exDividendDate), raw: r => r.exDividendDate, cls: "ltr" },
      { label: "Record", value: r => latinDateOnly(r.recordDate), raw: r => r.recordDate, cls: "ltr" },
      { label: "Payment", value: r => latinDateOnly(r.paymentDate), raw: r => r.paymentDate, cls: "ltr" },
      { label: "Dividend", value: r => latinNumber(r.dividendAmount), raw: r => r.dividendAmount, cls: "ltr" },
      { label: "Yield", value: r => percentText(r.dividendYield), raw: r => r.dividendYield, cls: "ltr" },
      { label: "Currency", value: r => r.currency || "--", raw: r => r.currency, cls: "ltr" },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function ipoRows(rows) {
    return calendarRows(rows, [
      { label: "Company", value: r => r.companyName || "--", raw: r => r.companyName, pinned: true },
      { label: "Symbol", value: r => r.symbol || "--", raw: r => r.symbol, pinned: true, cls: "ltr" },
      { label: "Exchange", value: r => r.exchange || "--", raw: r => r.exchange, cls: "ltr" },
      { label: "IPO date", value: r => latinDateOnly(r.ipoDate), raw: r => r.ipoDate, cls: "ltr" },
      { label: "Price range", value: r => r.priceRange || "--", raw: r => r.priceRange, cls: "ltr" },
      { label: "Shares", value: r => latinNumber(r.shares), raw: r => r.shares, cls: "ltr" },
      { label: "Market cap", value: r => latinNumber(r.marketCap), raw: r => r.marketCap, cls: "ltr" },
      { label: "Status", value: r => r.status || "--", raw: r => r.status },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function economicRows(rows) {
    return calendarRows(rows, [
      { label: "Time", value: r => latinDateTime(r.dateTimeUtc), raw: r => r.dateTimeUtc, pinned: true, cls: "ltr" },
      { label: "Country", value: r => r.country || "--", raw: r => r.country },
      { label: "Currency", value: r => r.currency || "--", raw: r => r.currency, cls: "ltr" },
      { label: "Event", value: r => r.event || "--", raw: r => r.event, pinned: true },
      { label: "Impact", value: r => impactLabel(r.impact), raw: r => r.impact },
      { label: "Previous", value: r => valueText(r.previous), raw: r => r.previous, cls: "ltr" },
      { label: "Forecast", value: r => valueText(r.forecast), raw: r => r.forecast, cls: "ltr" },
      { label: "Actual", value: r => valueText(r.actual), raw: r => r.actual, cls: "ltr" },
      { label: "Source", value: r => providerName(r.provider), raw: r => r.provider }
    ]);
  }

  function featureStatusTone(status) {
    status = String(status || "");
    if (status === "success" || status === "available" || status === "configured") return "ok";
    if (["not_entitled", "forbidden", "unauthorized", "rate_limited"].includes(status)) return "warn";
    return "";
  }

  function featureStatusLabel(status) {
    status = String(status || "not_configured");
    const labels = {
      success: terminalText("connected"),
      available: textPair("متاح", "Available"),
      configured: textPair("متاح", "Available"),
      connected: terminalText("connected"),
      healthy: terminalText("connected"),
      partial: textPair("متاح جزئياً", "Partially available"),
      degraded: textPair("متاح جزئياً", "Partially available"),
      missing: textPair("غير مهيأ", "Not configured"),
      error: textPair("فشل الاتصال", "Connection failed"),
      not_configured: textPair("غير مهيأ", "Not configured"),
      not_entitled: textPair("غير متاح ضمن الصلاحية", "Unavailable for entitlement"),
      forbidden: textPair("غير متاح ضمن الصلاحية", "Unavailable for entitlement"),
      unauthorized: textPair("فشل التصريح", "Authorization failed"),
      rate_limited: textPair("تم الوصول إلى حد استخدام مزود البيانات مؤقتاً", "Data provider rate limit reached temporarily"),
      provider_error: textPair("فشل الاتصال", "Connection failed"),
      invalid_request: textPair("طلب غير صالح", "Invalid request")
    };
    if (labels[status]) return labels[status];
    const providerStatusKey = canonicalProviderStatusKey(status);
    if (/^provider_status_/i.test(status) || providerStatusKey !== "provider_status_unknown" || status === "unknown") return getProviderStatusMessage(providerStatusKey);
    return formatProviderError(status, { empty: getProviderStatusMessage("provider_status_unknown") });
  }

  function providerName(provider) {
    // أسماء المزودات التجارية لا تظهر للمستخدم العام. نُبقي فقط التسميات
    // المحايدة (إدخال يدوي)، وأي مزود بيانات خارجي يظهر كـ"بيانات السوق".
    const raw = String(provider || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "manual") return textPair("إدخال يدوي", "Manual entry");
    const brands = ["fmp", "finnhub", "yahoo", "yahoo finance", "twelve data", "twelvedata", "eodhd", "tradingeconomics", "trading economics", "openbb"];
    if (brands.includes(raw)) return textPair("بيانات السوق", "Market data");
    // رموز غير معروفة تُخفى بدل كشف اسم داخلي
    return textPair("بيانات السوق", "Market data");
  }

  function providerDisplayName(provider) {
    const raw = String(provider || "").trim();
    const key = raw.toLowerCase();
    if (!raw) return "";
    if (key === "manual") return textPair("إدخال يدوي", "Manual entry");
    const official = {
      fmp: "FMP",
      finnhub: "Finnhub",
      yahoo: "Yahoo Finance",
      "yahoo finance": "Yahoo Finance",
      "twelve data": "Twelve Data",
      twelvedata: "Twelve Data",
      eodhd: "EODHD",
      tradingeconomics: "Trading Economics",
      "trading economics": "Trading Economics",
      openbb: "OpenBB"
    };
    return official[key] || raw;
  }

  function resultCountText(value) { return value === null || value === undefined ? "--" : textPair(`${latinNumber(value)} نتيجة`, `${latinNumber(value)} results`); }
  function valueText(value) { return value === null || value === undefined || value === "" ? "--" : String(value); }
  function percentText(value) { return value === null || value === undefined || value === "" ? "--" : `${latinNumber(value)}%`; }
  function impactLabel(value) { const v = String(value || "unknown"); return v === "high" ? textPair("مرتفع", "High") : v === "medium" ? textPair("متوسط", "Medium") : v === "low" ? textPair("منخفض", "Low") : textPair("غير محدد", "Unspecified"); }
  function rangeText(range) { return range && range.from && range.to ? `${range.from} → ${range.to}` : "--"; }
  function latinNumber(value) {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "--";
    return Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  function latinDateOnly(value) {
    if (!value) return "--";
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  }
  function latinDateTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function educationPage() {
    const cats = Object.keys(LESSONS);
    return `<div class="page-stack">${hero(textPair("مركز التعليم", "Education center"), textPair("تعليم مختصر يوضح قيود المنصة: لا توصيات بدون بيانات، لا أسعار وهمية، وكل رمز له عملته.", "Short lessons explaining terminal limits: no recommendations without data, no synthetic prices, and every symbol keeps its own currency."), "EDUCATION")}
      ${cats.map((c, i) => `<section class="panel accordion ${i === 0 ? "is-open" : ""}"><button class="acc-head" data-acc>${h(translateUiText(c))}<span class="acc-icon">+</span></button><div class="acc-body"><div class="education-grid">${LESSONS[c].map(([t, b]) => `<article class="lesson-card"><span class="eyebrow">${h(textPair("درس", "Lesson"))}</span><strong>${h(translateUiText(t))}</strong><p>${h(translateUiText(b))}</p></article>`).join("")}</div></div></section>`).join("")}
    </div>`;
  }

  function settingsPage() {
    const s = state.settings;
    const prefs = signalPrefs();
    const lang = currentLanguage();
    const dir = lang === "ar" ? "rtl" : "ltr";
    const selectedMarkets = new Set(prefs.enabledMarkets);
    const marketOptions = SIGNAL_MARKET_OPTIONS.map(option => {
      const selected = selectedMarkets.has(option.id);
      return `<label class="market-toggle-chip">
        <input type="checkbox" name="enabledMarkets" value="${h(option.id)}" ${selected ? "checked" : ""} />
        <span class="market-chip-shell">
          <span class="market-chip-check" aria-hidden="true"></span>
          <span>${settingsMarketLabel(option, lang)}</span>
        </span>
      </label>`;
    }).join("");
    const languageButtons = ["ar", "en"].map(language => `<button class="settings-segment-btn ${lang === language ? "is-active" : ""}" type="button" data-language="${language}" aria-pressed="${lang === language ? "true" : "false"}">${h(settingsT(language === "ar" ? "arabic" : "english", lang))}</button>`).join("");
    return `<div class="page-stack trader-settings-page" dir="${dir}">${hero(settingsT("heroTitle", lang), settingsT("heroBody", lang), settingsT("settings", lang))}
      <section class="settings-grid settings-grid-polished">
        <article class="panel settings-panel provider-settings-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("provider", lang))}</span><h2>${h(settingsT("provider", lang))}</h2></div><div class="provider-panel-actions"><button class="ghost-btn compact-btn" data-settings-action="retry-provider-now" type="button">${h(settingsT("retryNow", lang))}</button><button class="ghost-btn compact-btn danger-lite" data-settings-action="clear-provider-cache" type="button">${h(settingsT("clearProviderCache", lang))}</button><button class="ghost-btn compact-btn" data-settings-action="test-provider-connection" type="button">${h(settingsT("testProviderConnection", lang))}</button></div></div>
          ${diagnostics()}
        </article>
        <article class="panel settings-panel signal-settings-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("signalPreferences", lang))}</span><h2>${h(settingsT("signalPreferences", lang))}</h2></div></div>
          <form id="settings-form" class="settings-form">
            <div class="settings-form-grid">
              <label class="settings-field"><span>${h(settingsT("defaultMarket", lang))}</span><select name="defaultMarket">${MARKETS.map(m => `<option value="${m.id}" ${s.defaultMarket === m.id ? "selected" : ""}>${h(lang === "en" ? m.en : m.ar)}</option>`).join("")}</select></label>
              <label class="settings-field"><span>${h(settingsT("riskProfile", lang))}</span><select name="risk">${["conservative", "balanced", "aggressive"].map(r => `<option value="${r}" ${s.risk === r ? "selected" : ""}>${h(riskLabelLocalized(r, lang))}</option>`).join("")}</select></label>
              <label class="settings-field"><span>${h(settingsT("minConfidence", lang))}</span><input name="signalMinConfidence" inputmode="numeric" value="${h(prefs.minConfidence)}" /></label>
            </div>
            <div class="settings-market-section">
              <span class="settings-section-label">${h(settingsT("enabledMarkets", lang))}</span>
              <div class="settings-market-grid">${marketOptions}</div>
            </div>
            <div class="settings-check-section">
              <span class="settings-section-label">${h(settingsT("signalChannels", lang))}</span>
              <div class="settings-check-list">
                ${settingsCheckbox("quickTickerVisible", isQuickTickerVisible(), settingsT("quickTicker", lang), settingsT("quickTickerHint", lang))}
                ${settingsCheckbox("buyAlertsEnabled", prefs.buyAlertsEnabled, settingsT("buyAlerts", lang), settingsT("buyAlertsHint", lang))}
                ${settingsCheckbox("sellAlertsEnabled", prefs.sellAlertsEnabled, settingsT("sellAlerts", lang), settingsT("sellAlertsHint", lang))}
                ${settingsCheckbox("waitAlertsEnabled", prefs.waitAlertsEnabled, settingsT("waitAlerts", lang), settingsT("waitAlertsHint", lang))}
                ${settingsCheckbox("inAppAlertsEnabled", prefs.inAppAlertsEnabled, settingsT("inAppAlerts", lang), settingsT("inAppAlertsHint", lang))}
                ${settingsCheckbox("emailAlertsEnabled", prefs.emailAlertsEnabled, settingsT("emailAlerts", lang), settingsT("emailAlertsHint", lang))}
              </div>
            </div>
            <div class="settings-form-actions"><button class="action-btn settings-save-btn" type="submit">${h(settingsT("save", lang))}</button></div>
          </form>
        </article>
        <article class="panel settings-panel settings-actions-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("platformActions", lang))}</span><h2>${h(settingsT("platformActions", lang))}</h2></div></div>
          <div class="settings-action-group">
            <span class="settings-section-label">${h(settingsT("language", lang))}</span>
            <div class="settings-segment-group" role="group" aria-label="${h(settingsT("language", lang))}">${languageButtons}</div>
          </div>
          <div class="settings-action-group">
            <span class="settings-section-label">${h(settingsT("theme", lang))}</span>
            <div class="settings-theme-grid" role="listbox" aria-label="${h(settingsT("theme", lang))}">${themeOptionsHtml("settings")}</div>
          </div>
          <div class="settings-action-group">
            <span class="settings-section-label">${h(settingsT("dataActions", lang))}</span>
            <div class="settings-data-actions">
              <button class="ghost-btn" data-settings-action="retry-provider-now" type="button">${h(settingsT("retryNow", lang))}</button>
              <button class="ghost-btn" data-settings-action="test-provider-connection" type="button">${h(settingsT("testProviderConnection", lang))}</button>
              <button class="ghost-btn danger-lite" data-settings-action="clear-provider-cache" type="button">${h(settingsT("clearProviderCache", lang))}</button>
            </div>
          </div>
        </article>
        <article class="panel settings-panel settings-policy-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("dataPolicy", lang))}</span><h2>${h(settingsT("dataPolicy", lang))}</h2></div></div>
          <div class="settings-info-grid">
            <div class="status-card settings-info-card"><strong>${h(settingsT("languageDirectionTitle", lang))}</strong><p>${h(settingsT("languageDirectionBody", lang))}</p><span class="state-badge ok">${lang === "ar" ? "اتجاه مضبوط" : "Direction clean"}</span></div>
            <div class="status-card settings-info-card"><strong>${h(settingsT("noSyntheticTitle", lang))}</strong><p>${h(settingsT("noSyntheticBody", lang))}</p><span class="state-badge warn">${lang === "ar" ? "بيانات حقيقية فقط" : "Real data only"}</span></div>
            <div class="status-card settings-info-card about-card"><strong>the-sfm trader</strong><p>${h(settingsT("aboutBody", lang))}</p><span class="state-badge">Powered by M.ALQ</span></div>
          </div>
        </article>
      </section>${disclaimer()}</div>`;
  }

  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero("تفاصيل الرمز", "اكتب رمزاً في البحث العلوي لفتح صفحة تحليل مخصصة. أمثلة: AAPL, BTCUSD, XAUUSD, KFH.KW", "SYMBOL DETAILS")}<section class="panel">${emptyState("لم يتم اختيار رمز", "استخدم البحث العلوي أو أزرار التفاصيل من الأسواق والتوصيات.", "الأسواق", `${ROOT}/markets`)}</section></div>`;
    return `<div class="page-stack"><a class="back-link" href="${ROOT}/markets" data-route-link>‹ الأسواق</a>
      ${hero(`تحليل <span class="ltr">${h(symbol)}</span>`, "صفحة تفاصيل حقيقية لكل رمز تعرض الملف والعملة والمصدر والتحليل عند توفرها من المزود.", "SYMBOL DETAILS")}
      <section id="symbol-details-body"><div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>جاري فحص <span class="ltr">${h(symbol)}</span></h2></div></div></section>${disclaimer()}</div>`;
  }

  /* ───────────────────── Async loaders ───────────────────── */
  function calendarQuery(force) {
    const params = new URLSearchParams({ range: state.calendarRange || "30" });
    if (force) params.set("refresh", "1");
    const symbols = unique([...(state.watch || []), ...defaults]);
    if (symbols.length) params.set("symbols", symbols.join(","));
    return params.toString();
  }
  async function loadCalendars(force) {
    const qs = calendarQuery(force);
    const settled = await Promise.allSettled([
      get("/trader/provider-status", { label: "providerStatus" }),
      get(`/trader/calendar/earnings?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/dividends?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/ipos?${qs}`, { label: "calendar" }),
      get(`/trader/calendar/economic?${qs}`, { label: "calendar" })
    ]);
    const [providerStatus, earnings, dividends, ipos, economic] = settled.map((result, index) => settledValue(result, index === 0 ? "providerStatus" : "calendar"));
    state.providerStatus = providerStatus || {};
    state.calendar = { earnings, dividends, ipos, economic };
    state.calendarLoaded = true;
    if (providerStatus && providerStatus.dataProvider) state.provider = providerStatus.dataProvider;
    renderAfterData();
  }
  function marketUniverseCacheKey(id) {
    const view = state.marketUniverseView;
    return ["universe", id, view.page, view.pageSize, view.q, view.exchange, view.currency, view.sector, view.industry, view.assetType, view.fundType, view.availability, view.sort, view.dir].join("|");
  }
  async function getFullSymbolUniverse({ market, sector, category, exchange, currency, industry, assetType, fundType, availability, page, pageSize, q, sort, dir, force } = {}) {
    const params = new URLSearchParams({
      market: marketApi(market),
      page: String(page || 1),
      limit: String(pageSize || MARKET_UNIVERSE_PAGE_SIZE),
      sort: sort || "symbol",
      dir: dir || "asc",
      discover: "1",
    });
    if (sector && sector !== "all") params.set("sectorName", sector);
    if (category && category !== "all") params.set("category", category);
    if (exchange && exchange !== "all") params.set("exchange", exchange);
    if (currency && currency !== "all") params.set("currency", currency);
    if (industry && industry !== "all") params.set("industry", industry);
    if (assetType && assetType !== "all") params.set("assetType", assetType);
    if (fundType && fundType !== "all") params.set("fundType", fundType);
    if (availability && availability !== "all") params.set("availability", availability);
    if (q) params.set("q", q);
    if (force) params.set("refresh", "1");
    return get(`/recommendations?${params.toString()}`, { label: "quotes" });
  }
  async function loadMarket(id, force = false) {
    const m = MARKETS.find(x => x.id === id); if (!m) return;
    const cacheKey = marketUniverseCacheKey(id);
    if (!force && state.marketCache.has(cacheKey)) { render(); return; }
    state.marketUniverseLoading = true;
    const view = state.marketUniverseView;
    const data = await getFullSymbolUniverse({
      market: m.apiMarket || m.id,
      sector: view.sector,
      exchange: view.exchange,
      currency: view.currency,
      industry: view.industry,
      assetType: view.assetType,
      fundType: view.fundType,
      availability: view.availability,
      page: view.page,
      pageSize: view.pageSize,
      q: view.q,
      sort: view.sort,
      dir: view.dir,
      force,
    });
    state.marketCache.set(cacheKey, data);
    state.marketUniverseLoading = false;
    if (data.dataProvider) state.provider = data.dataProvider;
    if (state.route.id === "markets" && state.route.market === id) render();
  }
  async function ensureScanData(force = false) {
    if (!force && (recs().length || state.rec.message)) return;
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`, { label: "quotes" }),
      get("/market/signals?limit=60", { label: "signals" })
    ]);
    const [data, signals] = settled.map((result, index) => settledValue(result, index === 0 ? "quotes" : "signals"));
    state.rec = data; state.signals = signals;
    if (data.dataProvider) state.provider = data.dataProvider;
    if (["ai-scanner", "recommendations"].includes(state.route.id)) render();
  }
  async function loadSymbol(symbol, force = false) {
    const target = document.getElementById("symbol-details-body"); if (!target) return;
    const key = sym(symbol);
    if (!force && state.cache.has(key)) {
      target.innerHTML = symbolContent(state.cache.get(key));
      translateRenderedUi(target);
      return;
    }
    try {
      const settled = await Promise.allSettled([
        get(`/market/asset-profile?symbol=${encodeURIComponent(key)}`, { label: "quotes" }),
        get(`/market/search?q=${encodeURIComponent(key)}&limit=5`, { label: "quotes" }),
        get(`/market/technical-analysis?symbol=${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/signals/${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/history?symbol=${encodeURIComponent(key)}&range=1Y`, { label: "quotes" }),
        get(marketNewsPath(6, { symbol: key }), { label: "news" })
      ]);
      const [profile, search, tech, sig, hist, news] = settled.map((result, index) => settledValue(result, index === 2 || index === 3 ? "signals" : index === 5 ? "news" : "quotes"));
      const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
      const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
      const rawTech = technicalPayloadFromResponse(tech);
      const technicalUnavailable = isTechnicalUnavailablePayload(rawTech);
      const historyPoints = arr(hist.points || hist.history);
      const techAsset = rawTech && typeof rawTech === "object" ? {
        price: rawTech.currentPrice || rawTech.price,
        currentPrice: rawTech.currentPrice || rawTech.price,
        currency: rawTech.currency,
        source: rawTech.source,
        exchange: rawTech.exchange || rawTech.market,
        history: historyPoints
      } : historyPoints.length ? { history: historyPoints } : {};
      const providerStatus = rawTech?.providerStatus || hist.providerStatus || profile.providerStatus || {};
      const rec = sig && (sig.signal || sig.item) ? signalToRec(sig.signal || sig.item) : matchRec(key);
      const asset = normalizeQuote(norm({ symbol: key, ...found, ...rawProfile, ...techAsset, ...(rec || {}) }));
      if (rec) Object.assign(rec, normalizeQuote(norm({ ...asset, ...rec })));
      if (technicalUnavailable) asset.technicalAvailable = false;
      if (technicalUnavailable && rec) {
        rec.technicalAvailable = false;
        rec.canFollowTrade = false;
        rec.tradeable = false;
      }
      const detail = {
        asset, tech: rawTech, providerStatus,
        available: Boolean((profile.ok && (rawProfile.symbol || found.symbol || found.name)) || rawTech || historyPoints.length),
        source: profile.source || search.source || asset.source || (rawTech && rawTech.source) || "--",
        message: profile.message || search.message || UNAVAILABLE_MESSAGE,
        technicalUnavailable,
        technicalReason: technicalUnavailableReason(rawTech),
        rec,
        news
      };
      if (technicalUnavailable) devLog("technical-analysis", "unavailable", technicalUnavailableDiagnostics(detail, asset));
      state.cache.set(key, detail);
      const currentTarget = document.getElementById("symbol-details-body");
      if (state.route.id === "symbol-details" && state.route.symbol === key && currentTarget) {
        currentTarget.innerHTML = symbolContent(detail);
        translateRenderedUi(currentTarget);
      }
    } catch (error) {
      devLog("quotes", "failed", { route: "symbol-details", symbol: key, message: errorMessage(error) });
      target.innerHTML = `<div class="panel">${emptyState(UNAVAILABLE_MESSAGE, errorMessage(error), "الإعدادات", `${ROOT}/settings`)}</div>`;
    }
  }

  function symbolContent(detail) {
    const a = normalizeQuote(detail.asset), c = currency(a), rec = detail.rec ? normalizeQuote(norm(detail.rec)) : null;
    const finalModel = finalRecommendationModel(a, detail, rec);
    const technicalUnavailable = isTechnicalUnavailableDetail(detail, { ...a, ...(rec || {}) });
    const p = a.price;
    const chg = a.changePercent;
    const ps = detail.providerStatus || {};
    const providerSymbolUsed = a.providerSymbolUsed || ps.providerSymbolUsed || a.providerSymbol || (rec && rec.providerSymbol) || terminalText("unavailable");
    const fallbackUsed = ps.fallbackUsed === true ? textPair("نعم", "Yes") : ps.fallbackUsed === false ? textPair("لا", "No") : terminalText("unavailable");
    const lastUpdated = latinDateTime(ps.lastUpdated || a.updatedAt || (detail.rec && detail.rec.lastUpdated));
    const quality = ps.dataQuality ? dataQualityLabel(ps.dataQuality) : terminalText("unavailable");
    return `<div class="detail-layout">
      <article class="panel detail-main" id="price-data-panel">
        <div class="asset-head big">${logo(a, "lg")}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || textPair("اسم الأصل غير متوفر من المزود", "Asset name unavailable from provider"))}</small></div>
          ${rec || technicalUnavailable ? `<span class="state-badge ${signalCardClass(finalModel.action)} big">${h(sigLabel(finalModel.action))}</span>` : ""}</div>
        <div class="detail-grid">${detailCard(terminalText("price"), price(p, c), "Price")}${detailCard(textPair("التغير", "Change"), change(chg), "Change")}${detailCard(terminalText("currency"), c, "Currency")}${detailCard(terminalText("type"), a.assetType || assetType(a.symbol), "Type")}${detailCard(terminalText("market"), a.exchange || a.market || "--", "Exchange")}${detailCard(terminalText("source"), detail.source || "--", "Source")}</div>
        <div class="detail-grid">${detailCard(textPair("رمز المزود المستخدم", "Provider symbol used"), providerSymbolUsed, "Provider symbol")}${detailCard(textPair("استخدم الاحتياطي؟", "Used fallback?"), fallbackUsed, "Fallback")}${detailCard(terminalText("lastUpdated"), lastUpdated === "--" ? terminalText("unavailable") : lastUpdated, "Last updated")}${detailCard(terminalText("dataQuality"), quality, "Data quality")}</div>
        <div class="card-actions"><button class="action-btn" data-quick-add="${h(a.symbol)}">${h(textPair("أضف للمتابعة", "Add to watchlist"))}</button><button class="ghost-btn" data-create-alert="${h(a.symbol)}">${h(textPair("أنشئ تنبيه", "Create alert"))}</button></div>
        ${miniChart(a)}
        ${assetAboutPanel(a)}
      </article>
      <aside class="detail-side">
        ${isSpacAsset(a) ? spacNoticeCard(a) : finalRecommendationCard(a, detail, rec)}
        ${shariaCompliancePanel(a)}
        <article class="panel consensus-panel"><span class="eyebrow">${h(textPair("اتفاق الاستراتيجيات", "Strategy agreement"))}</span><h2>${h(textPair("اتفاق الاستراتيجيات", "Strategy agreement"))}</h2>${technicalUnavailable ? technicalUnavailableState(detail, a, { actions: false, compact: true }) : strategyConsensus(a, detail.tech, rec)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair("التحليل الفني", "Technical analysis"))}</span><h2>${h(textPair("التحليل الفني", "Technical analysis"))}</h2>${technical({ ...a, ...(rec || {}) }, detail.tech, c, detail)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair("ثقة الذكاء الاصطناعي", "AI confidence"))}</span><h2>${h(textPair("قراءة الذكاء الاصطناعي الخام", "Raw AI reading"))}</h2>${technicalUnavailable ? technicalUnavailableState(detail, a, { actions: false, compact: true }) : rec ? signalAnalysis(rec, c) : emptyState(textPair("لا توجد إشارة كافية", "No sufficient signal"), textPair("لم يرجع المزود بيانات كافية لهذا الرمز.", "The provider did not return enough data for this symbol."), "", "")}</article>
        <article class="panel"><span class="eyebrow">${h(textPair("أخبار مرتبطة", "Related news"))}</span><h2>${h(textPair("أخبار مرتبطة", "Related news"))}</h2>${relatedNews(a.symbol, detail)}</article>
      </aside></div>`;
  }

  /* ───────────────────── Components ───────────────────── */
  function sharedRecommendation(asset, context = {}) {
    return Recommendation.normalizeRecommendation(asset, context);
  }
  function recommendationTone(recommendation) {
    return Recommendation.statusTone(recommendation && recommendation.status);
  }
  function recommendationLabel(recommendation) {
    if (!recommendation) return isEnglishLanguage() ? Recommendation.labelEn("watch") : Recommendation.labelAr("watch");
    return isEnglishLanguage() ? recommendation.actionLabelEn || Recommendation.labelEn(recommendation.status) : recommendation.actionLabelAr || Recommendation.labelAr(recommendation.status);
  }
  function recommendationStatusText(recommendation, fallbackAsset) {
    if (!recommendation) return recStatus(fallbackAsset || {});
    if (recommendation.status === "insufficient_data") return recommendationLabel(recommendation);
    if (recommendation.status === "watch") return recommendationLabel(recommendation);
    return recStatus(fallbackAsset || {});
  }
  function unavailablePriceText(asset) {
    const reason = asset && (asset.unavailableReason || asset.reason || asset.providerStatus && asset.providerStatus.reason);
    const fallback = textPair(PRICE_UNAVAILABLE_AR, PRICE_UNAVAILABLE_EN);
    return reason ? `${fallback} · ${translateUiText(formatProviderError(reason, { empty: fallback }))}` : fallback;
  }
  function hasTradeableQuote(asset, recommendation) {
    const a = normalizeQuote(norm(asset));
    const rec = recommendation || sharedRecommendation(a);
    const priceValue = a.price;
    const targetValue = num(a.target, a.targetPrice, a.target1, rec && rec.targetPrice);
    const stopValue = num(a.stopLoss, a.stop, rec && rec.stopLoss);
    const quality = normalizedDataQuality(a.dataQuality || a.data_quality || (a.providerStatus && a.providerStatus.dataQuality));
    return a.available !== false
      && a.tradeable !== false
      && a.canFollowTrade !== false
      && a.technicalAvailable !== false
      && a.technical_available !== false
      && isValidPrice(priceValue)
      && isValidPrice(targetValue)
      && isValidPrice(stopValue)
      && quality !== "unavailable"
      && rec
      && (rec.status === "buy" || rec.status === "sell")
      && rec.status !== "insufficient_data"
      && rec.canFollowTrade === true;
  }
  function followTradeButton(recommendation, symbol, className = "ghost-btn", small = false, asset = null) {
    const disabled = !hasTradeableQuote(asset || { symbol }, recommendation);
    const label = disabled ? recommendationLabel(recommendation) : textPair("متابعة الصفقة", "Follow trade");
    const title = disabled ? h((asset && asset.unavailableReason ? unavailablePriceText(asset) : null) || (recommendation && recommendation.reason) || textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed.")) : "";
    return `<button class="${className}${small ? " sm" : ""}" data-follow-trade="${h(symbol)}" type="button"${disabled ? ` disabled aria-disabled="true" title="${title}"` : ""}>${h(label)}</button>`;
  }
  function isBuySignalName(value) { return value === "buy" || value === "cautious_buy" || value === "weak_buy"; }
  function isSellSignalName(value) { return value === "sell" || value === "sell_or_avoid"; }
  function signalCardClass(value) {
    if (value === "buy") return "ok";
    if (value === "weak_buy" || value === "cautious_buy") return "warn";
    if (isSellSignalName(value)) return "warn";
    if (value === "insufficient_data") return "muted";
    return "";
  }
  function finalRecommendationAction(value) {
    return Recommendation.parseRecommendationStatus(value);
  }
  function agreementObject(...records) {
    for (const record of records) {
      if (!record) continue;
      const agreement = record.strategyAgreement || record.strategyConsensus || record.consensus;
      if (agreement && typeof agreement === "object") return agreement;
    }
    return null;
  }
  function backendStrategyCount(...records) {
    for (const record of records) {
      const count = num(record && (record.strategyCount ?? record.strategy_count ?? record.strategiesAvailable));
      if (count !== null) return Math.max(0, Math.round(count));
    }
    const agreement = agreementObject(...records);
    const count = num(agreement && (agreement.strategyCount ?? agreement.strategy_count ?? agreement.count));
    return count === null ? 0 : Math.max(0, Math.round(count));
  }
  function strategyAgreementMetric(...records) {
    const agreement = agreementObject(...records);
    const count = backendStrategyCount(...records);
    const rawPct = num(agreement && (agreement.agreementPct ?? agreement.agreement ?? agreement.percent));
    const limited = count < 3;
    const pct = rawPct === null ? null : Math.max(0, Math.min(limited ? 66 : 100, Math.round(rawPct)));
    return {
      value: limited ? textPair("توافق محدود", "Limited consensus") : pct === null ? terminalText("unavailable") : `${pct}%`,
      helper: limited ? textPair(`${latinNumber(count)} استراتيجية فقط`, `${latinNumber(count)} strategies only`) : textPair(`${latinNumber(count)} استراتيجية`, `${latinNumber(count)} strategies`),
      count,
      agreementPct: pct,
      limited,
      label: (agreement && (isEnglishLanguage() ? agreement.labelEn || agreement.label : agreement.labelAr || agreement.label)) || (limited ? textPair("توافق محدود", "Limited consensus") : textPair("اتفاق الاستراتيجيات", "Strategy agreement")),
    };
  }
  function backendConsensusFromRecords(...records) {
    const agreement = agreementObject(...records);
    const metric = strategyAgreementMetric(...records);
    const buy = Math.round(num(agreement && (agreement.buyPct ?? agreement.buy ?? agreement.buyPercent)) ?? 0);
    const sell = Math.round(num(agreement && (agreement.sellPct ?? agreement.sell ?? agreement.sellPercent)) ?? 0);
    const watch = Math.round(num(agreement && (agreement.watchPct ?? agreement.neutralPct ?? agreement.watch ?? agreement.neutral)) ?? Math.max(0, 100 - buy - sell));
    const rec = records.find(Boolean) || {};
    return {
      signal: signal(rec),
      agreement: metric.agreementPct ?? 0,
      agreementPct: metric.agreementPct,
      buy,
      sell,
      neutral: watch,
      count: metric.count,
      limited: metric.limited,
      label: metric.label,
    };
  }
  function strategyRowsFromBackend(...records) {
    for (const record of records) {
      const strategies = arr(record && record.strategies);
      if (strategies.length) return strategies;
    }
    return [];
  }
  function marketBias(rec) {
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length, total = rec.length;
    if (!total) return { label: textPair("بانتظار البيانات", "Awaiting data"), en: "AWAITING", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "", note: "" };
    const cf = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = cf.length ? Math.round(cf.reduce((a, b) => a + b, 0) / cf.length) : 0;
    const actionable = buy + sell;
    // بدون إشارات منشورة، السوق ليس "هابطاً" — بوابة الدقة حاجبة فقط
    if (!actionable) return { label: textPair("محايد · وضع الدقة نشط", "Neutral · precision gate active"), en: "NEUTRAL — PRECISION GATE", bull: 0, bear: 0, neutral: 100, conf, tone: "", note: textPair(`لا توجد إشارات تتجاوز حد النشر حالياً (${latinNumber(total)} أصل قيد المراقبة)`, `No signals currently pass the publishing threshold (${latinNumber(total)} assets under watch)`) };
    const bull = Math.round((buy / actionable) * 100), bear = 100 - bull, neutral = Math.round(((total - actionable) / total) * 100);
    return { label: bull >= 55 ? textPair("صاعد", "Bullish") : bull <= 40 ? textPair("هابط", "Bearish") : textPair("محايد", "Neutral"), en: bull >= 55 ? "BULLISH" : bull <= 40 ? "BEARISH" : "NEUTRAL", bull, bear, neutral, conf, tone: bull >= 55 ? "ok" : bull <= 40 ? "warn" : "", note: textPair(`${latinNumber(buy)} شراء · ${latinNumber(sell)} بيع من أصل ${latinNumber(total)}`, `${latinNumber(buy)} buy · ${latinNumber(sell)} sell out of ${latinNumber(total)}`) };
  }
  function marketOverview(rec) {
    const b = marketBias(rec);
    const verdict = b.en === "AWAITING" ? "--" : isEnglishLanguage() ? b.en.replace("NEUTRAL — PRECISION GATE", "NEUTRAL") : b.label;
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("نظرة السوق", "Market overview"))}</span><h2>${h(textPair("نظرة عامة على الأسواق", "Market overview"))}</h2></div><div class="mo-timeframes">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button data-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}">${t}</button>`).join("")}</div></div>
      ${marketMap()}
    </section>
    <section class="panel ai-market-analysis">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("تحليل السوق بالذكاء الاصطناعي", "AI market analysis"))}</span><h2>${h(textPair("تحليل السوق الذكي", "AI market analysis"))}</h2></div></div>
      <div class="ai-analysis-body">
        <div>
          <span class="card-kicker">${h(textPair("التحيز العام للسوق", "Overall market bias"))}</span>
          <div class="ai-analysis-verdict ${b.tone}">${h(verdict)}</div>
          <small class="muted-note">${h(b.label)}${b.note ? " · " + h(b.note) : ""} · ${h(textPair("الإطار", "Frame"))} ${h(state.timeframe)} · ${h(terminalText("confidence"))} ${b.conf ? b.conf + "%" : "--"}</small>
          <div class="ai-bias-rows" style="margin-top:14px">
            <div class="ai-bias-row bull"><span>${h(textPair("صاعد", "Bullish"))}</span><span class="bar"><i style="width:${b.bull}%"></i></span><b class="ltr">${b.bull}%</b></div>
            <div class="ai-bias-row bear"><span>${h(textPair("هابط", "Bearish"))}</span><span class="bar"><i style="width:${b.bear}%"></i></span><b class="ltr">${b.bear}%</b></div>
            <div class="ai-bias-row neut"><span>${h(textPair("محايد", "Neutral"))}</span><span class="bar"><i style="width:${b.neutral}%"></i></span><b class="ltr">${b.neutral}%</b></div>
          </div>
        </div>
        <div class="ai-analysis-bull ${b.tone === "warn" ? "bearish" : ""}" aria-hidden="true"></div>
      </div>
    </section>`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), market = currentMarket();
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length;
    const configured = p.className === "online";
    return `<section class="terminal-command-center" aria-label="${h(textPair("ملخص السوق", "Market summary"))}">
      ${commandMetric("PROVIDER", configured ? terminalText("connected") : textPair("غير مهيأ", "Not configured"), p.label || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : terminalText("unavailable"), b.conf ? b.label : textPair("بانتظار البيانات", "Awaiting data"), b.tone || "neutral")}
      ${commandMetric(textPair("إشارات الشراء", "Buy signals"), buy, textPair("فرص شراء", "Buy opportunities"), "ok")}
      ${commandMetric(textPair("إشارات البيع", "Sell signals"), sell, textPair("فرص بيع", "Sell opportunities"), "bad")}
      ${commandMetric("ANALYZED ASSETS", rec.length || terminalText("unavailable"), textPair("أصول محللة", "Analyzed assets"), rec.length ? "ok" : "neutral")}
      ${commandMetric("ACTIVE MARKET", marketName(market), `${marketName(market)} · ${market.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone) {
    return `<article class="command-metric ${tone || ""}"><span class="card-kicker">${h(translateUiText(kicker))}</span><strong>${h(translateUiText(String(value)))}</strong><small>${h(translateUiText(label || terminalText("unavailable")))}</small></article>`;
  }
  function marketLeadership(rec) {
    const commandRec = mergeRecLists(legacyRecsFrom(state.commandCards), rec);
    return `<section class="panel market-leadership">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("قيادة السوق", "Market command"))}</span><h2>${h(textPair("غرفة قيادة السوق", "Market command room"))}</h2></div><span class="state-badge">${h(marketName(currentMarket()))}</span></div>
      <div class="leadership-grid">${dashboardSymbols().map(s => leadershipCard(s, findAssetForSymbol(s, commandRec))).join("")}</div>
    </section>`;
  }
  function precisionBadge(a) {
    const pm = a.precisionMode || a.precision || null;
    const bt = a.backtest || null;
    const rate = num(pm && pm.measuredWinRate, bt && bt.winRate);
    if (rate === null) return "";
    const req = pm && num(pm.required) !== null ? Math.round(num(pm.required)) : 90;
    const passed = pm ? pm.passed === true : false;
    const text = passed ? textPair(`✓ دقة تاريخية ${rate}%`, `✓ Historical accuracy ${rate}%`) : textPair(`دقة تاريخية ${rate}% · حد النشر ${req}%`, `Historical accuracy ${rate}% · publish threshold ${req}%`);
    return `<span class="precision-badge ${passed ? "pass" : "info"}" title="${h(textPair("نسبة إصابة الهدف الأول في الاختبار الخلفي على نفس الرمز", "First-target hit rate in the backtest for this symbol"))}">${h(text)}</span>`;
  }
  function leadershipCard(symbol, asset) {
    const a = normalizeQuote(asset ? norm(asset) : { symbol, name: terminalText("unavailable") });
    const display = a.displaySymbol || displaySymbolFor(symbol);
    const detailSymbol = a.canonicalSymbol || symbol;
    const c = currency({ ...a, symbol: detailSymbol });
    const p = a.price;
    const chg = a.changePercent;
    const recommendation = sharedRecommendation(a);
    const conf = recommendation.confidence;
    const sig = recommendation.status;
    const quality = a.dataQuality || (!isValidPrice(p) ? "unavailable" : a.chartAvailable === false ? "partial" : "delayed");
    const stateClass = chg === null ? "neutral" : chg >= 0 ? "positive" : "negative";
    return `<button class="leadership-card ${stateClass}" data-symbol-details="${h(detailSymbol)}" type="button">
      <div class="asset-head">${logo({ ...a, symbol: display })}<div class="asset-title"><strong class="ltr">${h(display)}</strong><small>${h(a.name || display)}</small></div></div>
      <div class="leadership-price"><strong class="ltr">${h(price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span></div>
      ${sparkline(a, chg)}
      <div class="leadership-foot">
        <span class="signal-badge ${sig || "unavailable"}">${h(recommendationLabel(recommendation))}</span>
        <span class="quality-badge">${h(conf === null ? terminalText("unavailable") : `${terminalText("confidence")} ${Math.round(conf)}%`)} · ${h(dataQualityLabel(quality))}</span>
        ${precisionBadge(a)}
      </div>
    </button>`;
  }
  function opportunityHeatmap(rec) {
    const symbols = unique([...dashboardSymbols(), ...rec.map(x => x.symbol)]).slice(0, 24);
    return `<section class="panel opportunity-heatmap">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("خريطة الفرص", "Opportunity heatmap"))}</span><h2>${h(textPair("خريطة حرارة الفرص", "Opportunity heatmap"))}</h2></div><span class="state-badge">${h(rec.length ? textPair(`${latinNumber(rec.length)} أصل`, `${latinNumber(rec.length)} assets`) : textPair("البيانات غير متاحة حالياً", "Data is currently unavailable"))}</span></div>
      <div class="opportunity-heat-grid">${symbols.map(s => heatmapCard(s, findAssetForSymbol(s, rec))).join("")}</div>
    </section>`;
  }
  function heatmapCard(symbol, asset) {
    const a = normalizeQuote(asset ? norm(asset) : { symbol, name: terminalText("unavailable") });
    const chg = a.changePercent;
    const recommendation = sharedRecommendation(a);
    const stateClass = chg === null ? "unavailable" : chg > 0 ? "positive" : chg < 0 ? "negative" : "neutral";
    const conf = recommendation.confidence;
    return `<button class="opportunity-cell ${stateClass}" data-symbol-details="${h(symbol)}" type="button">
      ${logo({ ...a, symbol }, "sm")}
      <strong class="ltr">${h(symbol === "BTCUSD" ? "BTC/USD" : symbol)}</strong>
      <span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span>
      <em>${h(recommendationLabel(recommendation))}${conf === null ? "" : ` · ${Math.round(conf)}%`}</em>
    </button>`;
  }
  function moverPanel(kicker, title, items, tone) {
    return `<article class="panel market-movers-panel ${tone}"><div class="panel-head"><div><span class="eyebrow">${h(translateUiText(kicker))}</span><h2>${h(translateUiText(title))}</h2></div></div>${items.length ? assetList(items) : emptyState(textPair("البيانات غير متاحة حالياً", "Data is currently unavailable"), textPair("لم يرجع المزود تغيّر الأسعار الكافي لعرض هذه القائمة.", "The provider did not return enough price movement data to show this list."), textPair("افتح الإعدادات", "Open settings"), `${ROOT}/settings`)}</article>`;
  }
  function dashboardSymbols() {
    const market = currentMarket();
    return unique([...leadershipCore, ...(market.symbols || [])]);
  }
  function findAssetForSymbol(symbol, list) {
    const aliases = symbolAliases(symbol);
    return list.find(x => [x.symbol, x.displaySymbol, x.canonicalSymbol, x.providerSymbolUsed, x.providerSymbol, x.ticker, x.code].some(v => aliases.includes(sym(v)))) || null;
  }
  function symbolAliases(symbol) {
    const s = sym(symbol);
    const map = {
      NAS100: ["NAS100", "NDX", "^NDX", "NQ=F", "IXIC"],
      "^NDX": ["NAS100", "NDX", "^NDX", "NQ=F", "IXIC"],
      US30: ["US30", "DJI", "^DJI", "YM=F"],
      "^DJI": ["US30", "DJI", "^DJI", "YM=F"],
      SPX500: ["SPX500", "SPX", "^GSPC", "ES=F"],
      "^GSPC": ["SPX500", "SPX", "^GSPC", "ES=F"],
      DAX: ["DAX", "^GDAXI", "GER40"],
      FTSE: ["FTSE", "^FTSE", "UK100"],
      CAC40: ["CAC40", "^FCHI", "FRA40"],
      NIKKEI: ["NIKKEI", "^N225", "JP225"],
      HSI: ["HSI", "^HSI", "HK50"],
      BTCUSD: ["BTCUSD", "BTC-USD", "BTC/USD"],
      "BTC-USD": ["BTCUSD", "BTC-USD", "BTC/USD"],
      "BTC/USD": ["BTCUSD", "BTC-USD", "BTC/USD"],
      XAUUSD: ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      "GC=F": ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      "XAUUSD=X": ["XAUUSD", "GC=F", "XAUUSD=X", "GOLD"],
      ETHUSD: ["ETHUSD", "ETH-USD", "ETH/USD"],
      "ETH-USD": ["ETHUSD", "ETH-USD", "ETH/USD"],
      "ETH/USD": ["ETHUSD", "ETH-USD", "ETH/USD"],
      XAGUSD: ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      "SI=F": ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      "XAGUSD=X": ["XAGUSD", "SI=F", "XAGUSD=X", "SILVER"],
      OIL: ["OIL", "WTI", "USOIL", "CL=F"],
      WTI: ["OIL", "WTI", "USOIL", "CL=F"],
      USOIL: ["OIL", "WTI", "USOIL", "CL=F"],
      "CL=F": ["OIL", "WTI", "USOIL", "CL=F"],
      BRENT: ["BRENT", "UKOIL", "BZ=F"],
      "BZ=F": ["BRENT", "UKOIL", "BZ=F"]
    };
    const compactCrypto = s.replace(/^BINANCE:/, "").replace(/[/-]/g, "");
    const cryptoBase = compactCrypto.replace(/USDT$/, "").replace(/USD$/, "");
    if (CRYPTO_DISPLAY_BASES.has(cryptoBase) && [cryptoBase, `${cryptoBase}USD`, `${cryptoBase}USDT`].includes(compactCrypto)) {
      return [cryptoBase, `${cryptoBase}USD`, `${cryptoBase}-USD`, `${cryptoBase}/USD`, `${cryptoBase}USDT`, `BINANCE:${cryptoBase}USDT`];
    }
    return map[s] || [s];
  }
  function displaySymbolFor(symbol) {
    const s = sym(symbol);
    const compactCrypto = s.replace(/^BINANCE:/, "").replace(/[/-]/g, "");
    const cryptoBase = compactCrypto.replace(/USDT$/, "").replace(/USD$/, "");
    if (CRYPTO_DISPLAY_BASES.has(cryptoBase) && [cryptoBase, `${cryptoBase}USD`, `${cryptoBase}USDT`].includes(compactCrypto)) return `${cryptoBase}/USD`;
    if (["NAS100", "^NDX", "NQ=F"].includes(s)) return "NAS100";
    if (["US30", "^DJI", "YM=F"].includes(s)) return "US30";
    if (["SPX", "^GSPC", "ES=F"].includes(s)) return "SPX500";
    if (["^GDAXI", "GER40"].includes(s)) return "DAX";
    if (["^FTSE", "UK100"].includes(s)) return "FTSE";
    if (["^FCHI", "FRA40"].includes(s)) return "CAC40";
    if (["^N225", "JP225"].includes(s)) return "NIKKEI";
    if (["^HSI", "HK50"].includes(s)) return "HSI";
    if (["GC=F", "XAUUSD=X"].includes(s)) return "XAUUSD";
    if (["SI=F", "XAGUSD=X"].includes(s)) return "XAGUSD";
    if (["OIL", "USOIL", "CL=F"].includes(s)) return "Oil";
    if (["UKOIL", "BZ=F"].includes(s)) return "BRENT";
    return symbol;
  }
  function sparkline(asset, chg) {
    const series = arr(asset.history || asset.sparkline || asset.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null);
    if (series.length < 2) return `<div class="leadership-sparkline empty">${h(textPair("الشارت غير متاح", "Chart unavailable"))}</div>`;
    const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
    const points = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(34 - (v - min) / rng * 30).toFixed(2)}`).join(" ");
    const tone = chg === null ? (series[series.length - 1] >= series[0] ? "up" : "down") : chg >= 0 ? "up" : "down";
    return `<svg class="leadership-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polyline class="${tone}" points="${points}"></polyline></svg>`;
  }
  function marketMap() {
    const nodes = SESSIONS.map(([c, top, left, kind, oH, cH, dir], i) => {
      const st = sessionState(kind, oH, cH);
      const state = st.open ? "is-open" : "is-closed";
      return `<span class="map-node node-${i} ${state} off-${dir || "left"}" style="top:${top}%;left:${left}%">
          <i class="map-pin"></i>
          <span class="map-label"><b>${h(c)}</b><small>${h(st.open ? textPair("مفتوح", "Open") : textPair("مغلق", "Closed"))} · ${h(translateUiText(st.label))}</small></span>
        </span>`;
    }).join("");
    return `<div class="world-map world-map-3d" aria-hidden="true">
      <div class="map-stage">
        <div class="map-plane">
          <span class="map-grid-3d"></span>
          <img class="world-map-img" src="/thesfm-trader-own/app/assets/world-dotted-map.png" alt="" aria-hidden="true" loading="lazy" />
          <svg class="map-arcs" viewBox="0 0 900 360" preserveAspectRatio="none"><path d="M95 170 C220 80 325 210 458 132 S690 45 810 155"></path><path d="M120 235 C250 250 345 188 468 220 S650 300 800 230"></path><path d="M432 160 C470 195 520 215 590 202 S690 185 762 244"></path><path d="M150 120 C300 150 500 120 720 150"></path></svg>
          ${nodes}
        </div>
      </div>
      <span class="map-depth-glow"></span>
    </div>`;
  }
  function biasPanel(rec) {
    const b = marketBias(rec);
    return `<span class="eyebrow">${h(textPair("تحليل السوق بالذكاء الاصطناعي", "AI market analysis"))}</span><h2>${h(textPair("التحيّز العام", "Overall bias"))}</h2><strong class="bias-head state-${b.tone}">${h(isEnglishLanguage() ? b.en : b.label)}</strong>
      <div class="bias-rows">
        <div class="bias-row"><span>${h(textPair("صاعد", "Bullish"))}</span><div class="mo-bar"><i style="width:${b.bull}%"></i></div><b>${b.bull}%</b></div>
        <div class="bias-row"><span>${h(textPair("هابط", "Bearish"))}</span><div class="mo-bar"><i class="bear" style="width:${b.bear}%"></i></div><b>${b.bear}%</b></div>
        <div class="bias-row"><span>${h(textPair("محايد", "Neutral"))}</span><div class="mo-bar"><i class="neut" style="width:${b.neutral}%"></i></div><b>${b.neutral}%</b></div>
      </div>`;
  }
  function exploreCarousel() {
    return `<section class="explore"><div class="explore-head"><span class="eyebrow">${h(textPair("استكشف الأسواق", "Explore markets"))}</span></div><div class="explore-row">${EXPLORE.map(id => { const m = MARKETS.find(x => x.id === id); if (!m) return ""; return `<a class="explore-card" href="${ROOT}/markets/${m.id}" data-route-link><span class="ex-icon">${marketGlyph(m)}</span><strong>${h(marketName(m))}</strong><small>${h(marketFamilyName(m.family))}</small></a>`; }).join("")}</div></section>`;
  }
  function watchlistTable(items, opts = {}) {
    const rows = items.map(x => {
      const a = normalizeQuote(norm(x)), c = currency(a), recommendation = sharedRecommendation(a), sig = recommendation.status;
      const conf = recommendation.confidence, p = a.price;
      const chg = a.changePercent, tgt = num(a.target, a.targetPrice, a.priceTarget), score = num(a.aiScore, a.score, a.rating);
      const risk = a.risk || a.riskLevel;
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.symbol)}" title="${h(textPair("إزالة", "Remove"))}">✕</button>` : "";
      return `<tr>
        <td class="wt-asset" data-label="${h(terminalText("asset"))}"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || terminalText("unavailable"))}</small></span></button></td>
        <td class="ltr" data-label="${h(terminalText("price"))}">${h(price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="${h(textPair("التغير", "Change"))}">${h(change(chg))}</td>
        <td data-label="${h(textPair("التوصية", "Recommendation"))}"><span class="state-badge ${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}</span></td>
        <td class="ltr" data-label="${h(terminalText("confidence"))}">${conf === null ? terminalText("unavailable") : Math.round(conf) + "%"}</td>
        <td class="ltr" data-label="${h(terminalText("target"))}">${isValidPrice(tgt) ? price(tgt, c) : terminalText("unavailable")}</td>
        <td data-label="${h(textPair("المدة", "Horizon"))}">${h(a.timeframe || a.horizon || a.duration || terminalText("unavailable"))}</td>
        <td data-label="${h(textPair("المخاطرة", "Risk"))}">${risk ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : terminalText("unavailable")}</td>
        <td class="ltr" data-label="${h(textPair("سكور AI", "AI score"))}">${score === null ? terminalText("unavailable") : (score > 10 ? Math.round(score) + "%" : score.toFixed(1))}</td>
        <td class="row-actions" data-label="${h(terminalText("action"))}"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("analysis"))}</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>${h(terminalText("asset"))}</th><th>${h(terminalText("price"))}</th><th>${h(textPair("التغير", "Change"))}</th><th>${h(textPair("التوصية", "Recommendation"))}</th><th>${h(terminalText("confidence"))}</th><th>${h(terminalText("target"))}</th><th>${h(textPair("المدة", "Horizon"))}</th><th>${h(textPair("المخاطرة", "Risk"))}</th><th>${h(textPair("سكور AI", "AI score"))}</th><th>${h(terminalText("action"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function recCards(items) { return `<div class="rec-grid">${items.map(recCard).join("")}</div>`; }
  function recCard(x) {
    const a = normalizeQuote(norm(x)), c = currency(a), recommendation = sharedRecommendation(a), sig = recommendation.status, conf = recommendation.confidence;
    const p = a.price, tgt = num(a.target, a.targetPrice), sl = num(a.stopLoss, a.stop);
    const unavailableNote = !isValidPrice(p) || a.available === false ? `<p class="muted-note">${h(unavailablePriceText(a))}</p>` : "";
    return `<article class="rec-card ${sig}"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "--")}</small></div><span class="state-badge ${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}</span></div>
      <div class="rec-metrics"><span>${h(terminalText("price"))}<b class="ltr">${h(price(p, c))}</b></span><span>${h(terminalText("target"))}<b class="ltr">${h(isValidPrice(tgt) ? price(tgt, c) : terminalText("unavailable"))}</b></span><span>${h(terminalText("stop"))}<b class="ltr">${h(isValidPrice(sl) ? price(sl, c) : terminalText("unavailable"))}</b></span><span>${h(terminalText("confidence"))}<b>${conf === null ? "--" : Math.round(conf) + "%"}</b></span></div>
      ${unavailableNote}
      <div class="rec-foot"><span class="status-tag ${recommendationTone(recommendation) || recStatusTone(a)}">${h(recommendationStatusText(recommendation, a))}</span><div class="row-actions compact-actions">${followTradeButton(recommendation, a.symbol, "action-btn", true, a)}<button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}" type="button">${h(terminalText("openAnalysis"))}</button></div></div></article>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(normalizeQuote(norm(x)))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = normalizeQuote(norm(asset)), c = currency(a), recommendation = sharedRecommendation(a), sig = recommendation.status, conf = recommendation.confidence, p = a.price;
    const chg = a.changePercent;
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">${h(textPair("إزالة", "Remove"))}</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || textPair("اسم الأصل غير متوفر", "Asset name unavailable"))}</small></div></div>
      <div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}</span><span class="status-tag">${h(recommendationStatusText(recommendation, a))}</span></div>
      <div class="asset-metrics"><span>${h(terminalText("price"))}<b class="ltr">${h(price(p, c))}</b></span><span>${h(textPair("التغيير", "Change"))}<b class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</b></span><span>${h(textPair("ثقة AI", "AI confidence"))}<b>${conf === null ? terminalText("unavailable") : `${Math.round(conf)}%`}</b></span></div>
      ${!isValidPrice(p) || a.available === false ? `<p class="muted-note">${h(unavailablePriceText(a))}</p>` : ""}
      <div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">${h(terminalText("openAnalysis"))}</button>${followTradeButton(recommendation, a.symbol, "ghost-btn", false, a)}<button class="ghost-btn" data-quick-add="${h(a.symbol)}">${h(terminalText("watchlist"))}</button>${remove}</div></article>`;
  }
  function marketCard(m) {
    const visible = marketPreviewSymbols(m).slice(0, 8);
    const total = marketUniverseTotal(m);
    const hidden = Math.max(0, total - visible.length);
    const more = hidden ? `<span class="badge sm muted market-more"><span class="ltr">+${latinNumber(hidden)}</span></span>` : "";
    const countKey = m.id === "etfs" ? "showingFunds" : "showingSymbols";
    return `<a class="market-tile ${m.tone === "featured" ? "featured" : ""}" href="${ROOT}/markets/${m.id}" data-route-link data-market-card="${h(m.id)}"><div class="mt-top"><span class="ex-icon">${marketGlyph(m)}</span><span class="eyebrow">${h(marketFamilyName(m.family))}</span></div><strong>${h(marketName(m))}</strong><p>${h(terminalText("currency"))} <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${visible.map(s => `<span class="badge sm"><span class="ltr">${h(s)}</span></span>`).join("")}${more}</div><span class="market-preview-count">${h(terminalText(countKey, { shown: latinNumber(visible.length), total: latinNumber(total) }))}</span><span class="market-card-action">${h(marketActionLabel(m))}</span></a>`;
  }
  function heatmap(items) {
    return `<div class="heatmap">${items.slice(0, 24).map(x => { const a = normalizeQuote(norm(x)), recommendation = sharedRecommendation(a), chg = a.changePercent; return `<button class="heat-cell ${chg === null ? "unavailable" : recommendation.status}" data-symbol-details="${h(a.symbol)}">${logo(a, "sm")}<strong class="ltr">${h(a.symbol)}</strong><small class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</small><em>${h(recommendationLabel(recommendation))}</em></button>`; }).join("")}</div>`;
  }
  function holdingsTable(items) {
    const rows = items.map((p, i) => { const a = norm(p.rec || { symbol: p.symbol }), c = currency({ symbol: p.symbol }), cur = num(a.price, a.currentPrice), qty = num(p.qty) || 0, entry = num(p.entry) || 0, val = cur !== null ? cur * qty : null, pl = cur !== null ? (cur - entry) * qty : null;
      return `<tr><td class="wt-asset" data-label="${h(terminalText("asset"))}"><button data-symbol-details="${h(p.symbol)}">${logo({ symbol: p.symbol })}<span><strong class="ltr">${h(p.symbol)}</strong></span></button></td><td class="ltr" data-label="${h(textPair("الكمية", "Quantity"))}">${qty}</td><td class="ltr" data-label="${h(textPair("الدخول", "Entry"))}">${price(entry, c)}</td><td class="ltr" data-label="${h(textPair("الحالي", "Current"))}">${cur === null ? "--" : price(cur, c)}</td><td class="ltr" data-label="${h(textPair("القيمة", "Value"))}">${val === null ? "--" : price(val, c)}</td><td class="ltr ${pl === null ? "" : pl >= 0 ? "up" : "down"}" data-label="${h(textPair("ر/خ", "P/L"))}">${pl === null ? "--" : price(pl, c)}</td><td><button class="icon-btn danger" data-remove-holding="${i}" title="${h(textPair("إزالة", "Remove"))}">✕</button></td></tr>`; }).join("");
    return `<div class="table-shell"><table><thead><tr><th>${h(terminalText("asset"))}</th><th>${h(textPair("الكمية", "Quantity"))}</th><th>${h(textPair("الدخول", "Entry"))}</th><th>${h(textPair("الحالي", "Current"))}</th><th>${h(textPair("القيمة", "Value"))}</th><th>${h(textPair("ر/خ", "P/L"))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function holdingForm() { return `<form id="holding-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="${h(terminalText("symbol"))}" /><input name="qty" inputmode="decimal" placeholder="${h(textPair("الكمية", "Quantity"))}" /><input name="entry" inputmode="decimal" placeholder="${h(textPair("سعر الدخول", "Entry price"))}" /><button class="action-btn" type="submit">${h(textPair("إضافة مركز", "Add position"))}</button></form>`; }
  function tradeProviderStatus(items) {
    const status = state.followed.dataStatus || {};
    const p = state.followed.dataProvider || state.provider || {};
    const provider = status.provider || providerName(p.active || p.provider) || "";
    const rows = [
      [textPair("مزود الأسعار", "Price provider"), provider],
      [terminalText("lastUpdated"), latinDateTime(status.lastUpdated || new Date().toISOString())],
      [textPair("عدد الصفقات المحفوظة", "Saved trades"), latinNumber(status.savedTrades ?? items.length)],
      [textPair("تم تحديث سعرها", "Prices updated"), latinNumber(status.updatedPrices ?? items.filter(x => x.priceUpdated || num(x.currentPrice, x.current) !== null).length)],
      [textPair("بدون بيانات سعر", "Missing price data"), latinNumber(status.missingPrices ?? items.filter(x => x.priceMessage || num(x.currentPrice, x.current) === null).length)]
    ];
    const message = translateUiText(formatProviderError(status.message, { empty: "" }));
    return `<section class="panel trade-data-status"><div class="panel-head"><div><span class="eyebrow">${h(textPair("مصدر البيانات", "Data source"))}</span><h2>${h(textPair("حالة بيانات الأداء", "Performance data status"))}</h2></div><button class="ghost-btn" data-refresh-trades>${h(textPair("تحديث الأسعار", "Refresh prices"))}</button></div><div class="trade-status-grid">${rows.map(([label, value]) => `<span><small>${h(label)}</small><b class="ltr">${h(String(value || "--"))}</b></span>`).join("")}</div>${message ? `<p class="muted-note">${h(message)}</p>` : ""}</section>`;
  }
  function performanceEmptyState() {
    return `<section class="empty-state trade-empty-state">
      <span class="empty-glyph">◎</span>
      <h3>${h(textPair("لا توجد صفقات متابعة حتى الآن", "No followed trades yet"))}</h3>
      <p>${h(textPair("ستظهر هنا نتائج إشارات الشراء والبيع بعد حفظها أو متابعتها من صفحة التوصيات أو التحليل.", "Buy and sell signal outcomes will appear here after you save or follow them from recommendations or analysis."))}</p>
      <div class="row-actions">
        <a class="action-btn" href="${ROOT}/recommendations" data-route-link>${h(textPair("فتح التوصيات", "Open recommendations"))}</a>
        <button class="ghost-btn" data-run-signals type="button">${h(textPair("تشغيل فحص الإشارات", "Run signal scan"))}</button>
        <a class="ghost-btn" href="#followed-trade-form">${h(textPair("إضافة صفقة متابعة", "Add followed trade"))}</a>
      </div>
    </section>`;
  }
  function followedTradeForm() {
    return `<section class="panel trade-manual-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("متابعة يدوية", "Manual track"))}</span><h2>${h(textPair("إضافة صفقة متابعة", "Add followed trade"))}</h2></div></div>
      <form id="followed-trade-form" class="trade-form-grid">
        <label>${h(terminalText("symbol"))}<input name="symbol" dir="ltr" placeholder="AAPL" required /></label>
        <label>${h(terminalText("action"))}<select name="action"><option value="buy">${h(sigLabel("buy"))}</option><option value="sell">${h(sigLabel("sell"))}</option><option value="wait">${h(sigLabel("wait"))}</option><option value="watch">${h(terminalText("underWatch"))}</option></select></label>
        <label>${h(textPair("سعر الدخول", "Entry price"))}<input name="entryPrice" inputmode="decimal" placeholder="0.00" required /></label>
        <label>${h(terminalText("target"))}<input name="targetPrice" inputmode="decimal" placeholder="0.00" /></label>
        <label>${h(textPair("وقف الخسارة", "Stop loss"))}<input name="stopLoss" inputmode="decimal" placeholder="0.00" /></label>
        <label>${h(terminalText("confidence"))}<input name="confidence" inputmode="numeric" placeholder="${h(textPair("اختياري", "Optional"))}" /></label>
        <label class="wide">${h(textPair("ملاحظات", "Notes"))}<input name="notes" placeholder="${h(textPair("اختياري", "Optional"))}" /></label>
        <button class="action-btn" type="submit">${h(textPair("إضافة صفقة متابعة", "Add followed trade"))}</button>
      </form>
    </section>`;
  }
  function allocation(items) {
    if (!items.length) return miniEmpty();
    const groups = {};
    items.forEach(p => { const t = assetType(p.symbol); const cost = (num(p.qty) || 0) * (num(p.entry) || 0); groups[t] = (groups[t] || 0) + cost; });
    const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1;
    const typeLabels = {
      stock: textPair("أسهم", "Stocks"),
      crypto: textPair("كريبتو", "Crypto"),
      commodity: textPair("سلع", "Commodities"),
      forex: textPair("عملات", "Forex"),
      fund: textPair("صناديق", "Funds"),
      index: textPair("مؤشرات", "Indices")
    };
    return `<div class="alloc">${Object.entries(groups).map(([t, v]) => `<div class="alloc-row"><span>${h(typeLabels[t] || translateUiText(t))}</span><div class="mo-bar"><i style="width:${Math.round(v / total * 100)}%"></i></div><b>${Math.round(v / total * 100)}%</b></div>`).join("")}</div>`;
  }
  function tradeCol(title, items, tone) { return `<article class="trade-column ${tone}"><h3>${h(translateUiText(title))} <span class="col-count">${items.length}</span></h3>${items.length ? items.map(tradeCard).join("") : `<div class="trade-mini-empty">${h(textPair("لا توجد صفقات في هذا التصنيف.", "No trades in this category."))}</div>`}</article>`; }
  function tradeCard(t) {
    const s = sym(t.symbol || t.ticker || t.asset || "--"), a = norm({ ...t, symbol: s }), c = currency(a), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), sig = tradeAction(t);
    const status = tradeStatus(t), current = num(t.currentPrice, t.current), entry = num(t.entryPrice, t.entry), target = num(t.targetPrice, t.target), stop = num(t.stopLoss, t.stop);
    return `<article class="trade-item"><div class="asset-head">${logo({ symbol: s })}<div class="asset-title"><strong class="ltr">${h(s)}</strong><small>${h(a.name || t.status || "متابعة")}</small></div></div>
      <div class="badge-row"><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></div>
      <div class="trade-row"><span>${h(textPair("الدخول", "Entry"))}<b class="ltr">${h(price(entry, c))}</b></span><span>${h(textPair("الحالي", "Current"))}<b class="ltr">${h(current === null ? "--" : price(current, c))}</b></span><span>P/L<b class="${pnl === null ? "" : pnl >= 0 ? "up" : "down"}">${pnl === null ? "--" : pnl + "%"}</b></span></div>
      <div class="trade-row"><span>${h(terminalText("target"))}<b class="ltr">${h(price(target, c))}</b></span><span>${h(textPair("وقف الخسارة", "Stop loss"))}<b class="ltr">${h(price(stop, c))}</b></span><span>${h(terminalText("confidence"))}<b class="ltr">${h(t.confidence == null ? "--" : Math.round(Number(t.confidence)) + "%")}</b></span></div>
      ${t.priceMessage ? `<p class="trade-warning">${h(t.priceMessage)}</p>` : ""}
      <div class="rec-foot"><small>${h(providerName(t.provider) || t.sourceType || "--")}</small><button class="ghost-btn sm" data-symbol-details="${h(s)}">${h(terminalText("openAnalysis"))}</button></div></article>`;
  }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeCard).join("")}</div>`; }
  function tradeJournalTable(items) {
    const rows = items.map(t => { const s = sym(t.symbol || t.asset || "--"), c = currency({ symbol: s, currency: t.currency }), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), status = tradeStatus(t);
      return `<tr><td class="wt-asset" data-label="${h(terminalText("symbol"))}"><button data-symbol-details="${h(s)}">${logo({ symbol: s })}<span><strong class="ltr">${h(s)}</strong><small>${h(t.assetName || t.name || "--")}</small></span></button></td><td data-label="${h(terminalText("action"))}">${h(sigLabel(tradeAction(t)))}</td><td class="ltr" data-label="${h(textPair("الدخول", "Entry"))}">${h(price(num(t.entryPrice, t.entry), c))}</td><td class="ltr" data-label="${h(textPair("الحالي", "Current"))}">${h(price(num(t.currentPrice, t.current), c))}</td><td class="ltr" data-label="${h(terminalText("target"))}">${h(price(num(t.targetPrice, t.target), c))}</td><td class="ltr" data-label="${h(textPair("وقف الخسارة", "Stop loss"))}">${h(price(num(t.stopLoss, t.stop), c))}</td><td class="ltr ${pnl === null ? "" : pnl >= 0 ? "up" : "down"}" data-label="P/L">${pnl === null ? "--" : pnl + "%"}</td><td data-label="${h(textPair("الحالة", "Status"))}"><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></td><td data-label="${h(terminalText("source"))}">${h(providerName(t.provider) || t.sourceType || "--")}</td></tr>`; }).join("");
    return `<div class="table-shell trade-journal-table"><table><thead><tr><th>${h(terminalText("symbol"))}</th><th>${h(terminalText("action"))}</th><th>${h(textPair("الدخول", "Entry"))}</th><th>${h(textPair("الحالي", "Current"))}</th><th>${h(terminalText("target"))}</th><th>${h(textPair("وقف الخسارة", "Stop loss"))}</th><th>P/L</th><th>${h(textPair("الحالة", "Status"))}</th><th>${h(terminalText("source"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function newsList(items) { return `<div class="news-list">${items.map(newsCard).join("")}</div>`; }
  function newsCard(n) {
    const title = n.title || n.headline || n.name || textPair("خبر بدون عنوان", "Untitled news"), src = n.source || n.publisher || n.provider || textPair("أخبار السوق", "Market news"), when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = n.url || n.link || "", text = n.summary || n.description || n.text || "", impact = (n.impact || n.sentiment || "").toString().toLowerCase();
    const syms = arr(n.symbols || n.relatedSymbols).slice(0, 3);
    return `<article class="news-card"><div class="news-meta"><span>${h(src)} · ${h(when)}</span>${impact ? `<span class="impact ${impact.includes("high") || impact.includes("bull") ? "ok" : impact.includes("low") ? "" : "warn"}">${h(translateUiText(impact))}</span>` : ""}</div><strong>${h(title)}</strong>${text ? `<p>${h(text)}</p>` : ""}${syms.length ? `<div class="news-syms">${syms.map(s => `<button class="badge sm" data-symbol-details="${h(s)}"><span class="ltr">${h(sym(s))}</span></button>`).join("")}</div>` : ""}${url ? `<a class="ghost-btn sm" href="${h(url)}" target="_blank" rel="noopener">${h(terminalText("source"))}</a>` : ""}</article>`;
  }
  function relatedNews(symbol, detail = {}) {
    const detailNews = arr(detail.news && (detail.news.items || detail.news.articles || detail.news.news || detail.news.data || detail.news.results));
    const sourceItems = detailNews.length ? detailNews : newsItems();
    const items = sourceItems.filter(n => {
      const symbols = arr(n.symbols || n.relatedSymbols).map(sym);
      return symbols.includes(sym(symbol)) || (detailNews.length && n.relevanceScore);
    }).slice(0, 3);
    return items.length ? newsList(items) : `<p class="muted-note">${h(textPair("لا توجد أخبار مرتبطة من المزود لهذا الرمز.", "No related provider news for this symbol."))}</p>`;
  }
  function alertList(items) { return `<div class="trade-list">${items.map(i => `<article class="trade-item"><strong>${h(i.title || i.symbol || i.name || textPair("تنبيه", "Alert"))}</strong><p>${h(translateUiText(formatProviderError(i.message || i.reason || i.description || textPair("تنبيه بدون تفاصيل إضافية.", "Alert without additional details."))))}</p>${i.symbol ? `<button class="ghost-btn sm" data-symbol-details="${h(i.symbol)}">${h(textPair("فتح الرمز", "Open symbol"))}</button>` : ""}</article>`).join("")}</div>`; }
  function localAlertRow(a, i) { const T = { price: terminalText("price"), percent: textPair("نسبة %", "Percent %"), signal: textPair("إشارة AI", "AI signal"), news: terminalText("news") }; return `<article class="trade-item alert-row"><div><strong class="ltr">${h(a.symbol)}</strong><p>${h(T[a.type] || translateUiText(a.type))}${a.value ? " · " + h(a.value) : ""} · ${h(date(a.createdAt))}</p></div><button class="icon-btn danger" data-del-alert="${i}" title="${h(textPair("حذف", "Delete"))}">✕</button></article>`; }

  function systemCard() {
    const s = providerCopy();
    const retry = s.showRetry ? `<button class="ghost-btn compact-btn" data-retry>${h(s.retryLabel)}</button>` : "";
    return `<article class="status-card provider-status-card is-${s.className}"><span class="eyebrow">${h(textPair("النظام", "System"))}</span><strong>${h(s.title)}</strong><p>${h(s.copy)}</p><span class="state-badge ${s.tone}">${h(s.label)}</span>${retry}</article>`;
  }
  // حالة نظام عامة للمستخدم النهائي: متصل / غير متاح فقط.
  // لا أسماء مزودات، لا أخطاء خام، لا عدّ مسارات، لا تفاصيل حد استخدام.
  function publicSystemStatus() {
    const normalized = normalizedProviderStatus();
    const online = normalized.status === 'available' || normalized.status === 'healthy' || normalized.configured === true;
    const loaded = Number(normalized.loadedCount) || 0;
    const connected = online && loaded > 0;
    const tone = connected ? 'ok' : 'warn';
    const title = connected ? terminalText("dataProviderConnected") : textPair("البيانات غير متاحة حالياً", "Data is currently unavailable");
    const copy = connected
      ? textPair("يتم عرض بيانات السوق المباشرة بشكل طبيعي.", "Live market data is displaying normally.")
      : textPair("يتعذّر عرض بيانات السوق في الوقت الحالي. حاول مرة أخرى بعد قليل.", "Market data cannot be displayed right now. Try again shortly.");
    const retry = `<button class="ghost-btn compact-btn provider-status-retry" data-retry>${h(getProviderRetryLabel())}</button>`;
    return `<div class="public-system-status">
      <div class="provider-status-banner ${tone}">
        <div><span class="eyebrow">${h(textPair("النظام", "System"))}</span><strong>${h(title)}</strong><p>${h(copy)}</p></div>
        <div class="provider-status-actions"><span class="state-badge ${tone}">${h(connected ? terminalText("connected") : terminalText("unavailable"))}</span>${connected ? '' : retry}</div>
      </div>
    </div>`;
  }

  function diagnostics() {
    const lang = currentLanguage();
    const normalized = normalizedProviderStatus();
    const providerStatus = providerCopy();
    const tone = normalizedStatusTone(normalized.status) || providerStatus.tone || "";
    const cards = [
      [settingsT("providerStatus", lang), providerStatus.label, tone],
      [settingsT("providerName", lang), normalized.provider, ""],
      [settingsT("providerConnection", lang), normalized.configured ? settingsT("configured", lang) : settingsT("notConfigured", lang), normalized.configured ? "ok" : "warn"],
      [settingsT("loadedSymbols", lang), countTextLocalized(normalized.loadedCount, lang), normalized.loadedCount > 0 ? "ok" : "warn"],
      [settingsT("discoveredSymbols", lang), countTextLocalized(normalized.discoveredCount, lang), ""],
      [settingsT("cachedSymbols", lang), countTextLocalized(normalized.cachedCount, lang), normalized.cachedCount > 0 ? "ok" : ""],
      [settingsT("nextRetry", lang), latinDateTime(normalized.nextRetryAt), normalized.nextRetryAt ? "warn" : ""],
      [settingsT("fallbackAttempted", lang), yesNoLocalized(normalized.fallbackAttempted, lang), normalized.fallbackAttempted ? "ok" : ""],
      [settingsT("lastUpdated", lang), latinDateTime(normalized.lastUpdated), ""]
    ];
    const featureList = normalized.supportedFeatures.length ? normalized.supportedFeatures.map(feature => featureLabelLocalized(feature, lang)).join(" · ") : settingsT("noFeatures", lang);
    const errorText = providerUserMessage(normalized, providerStatus, lang);
    const errorSummary = errorText ? `<p class="provider-warning">${h(errorText)}</p>` : "";
    const retryAction = providerStatus.showRetry ? `<button class="ghost-btn compact-btn provider-status-retry" data-retry>${h(providerStatus.retryLabel)}</button>` : "";
    return `<div class="provider-diagnostics-ui">
      <div class="provider-status-banner ${tone}">
        <div><span class="eyebrow">${h(settingsT("provider", lang))}</span><strong>${h(normalized.provider)}</strong><p>${h(providerStatus.title)}</p></div>
        <div class="provider-status-actions"><span class="state-badge ${tone}">${h(normalized.configured ? settingsT("configured", lang) : settingsT("notConfigured", lang))}</span>${retryAction}</div>
      </div>
      ${errorSummary}
      <div class="provider-status-cards">${cards.map(([label, value, cardTone]) => providerMetricCard(label, value, cardTone)).join("")}</div>
      <div class="provider-feature-strip"><span>${h(settingsT("supportedFeatures", lang))}</span><b>${h(featureList)}</b></div>
      ${diagnosticDetails(normalized)}
    </div>`;
  }
  function providerUserMessage(normalized, providerStatus, lang) {
    const ps = state.providerStatus || {};
    const rateLimitCopy = ps.userMessages && ps.userMessages.rateLimit && (ps.userMessages.rateLimit[normalizeLanguage(lang)] || ps.userMessages.rateLimit.en || ps.userMessages.rateLimit.ar);
    if (normalized.status === "rate_limited" || isRateLimitText(normalized.errorSummary)) {
      return rateLimitCopy || settingsT("rateLimitNotice", lang);
    }
    return formatProviderError(normalized.errorSummary, { empty: "" }) || providerStatus.explanation;
  }
  function normalizedProviderStatus() {
    const ps = state.providerStatus || {}, raw = ps.normalizedStatus || {};
    const p = ps.dataProvider || state.provider || {};
    const diag = ps.diagnostics || state.markets.diagnostics || (state.rec && state.rec.symbolDiscovery) || {};
    const summary = ps.summary || diag.summary || state.rec.summary || {};
    const fmpProvider = (ps.providers && ps.providers.fmp) || (ps.providerMatrix && ps.providerMatrix.fmp) || {};
    const failedRows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed));
    const skippedRows = arr(ps.skipped).concat(arr(state.rec.skipped), arr(state.markets.skipped));
    const advanced = arr(ps.advancedDiagnostics);
    const status = normalizeStatusKey(raw.status || p.status || providerCopy().statusKey);
    const loadedCount = numberValue(raw.loadedCount, summary.loadedSymbols, diag.totalSymbolsLoaded, ps.resultCount, state.markets.resultCount);
    const failedCount = numberValue(raw.failedCount, summary.failedSymbols, failedRows.length);
    const cachedCount = numberValue(raw.cachedCount, summary.cachedSymbols);
    const skippedCount = numberValue(raw.skippedCount, summary.skippedDueToRateLimit, skippedRows.length);
    const affectedSymbolsCount = numberValue(raw.affectedSymbolsCount, summary.affectedSymbolsCount, failedCount + skippedCount);
    const discoveredCount = numberValue(diag.totalSymbolsDiscovered, loadedCount);
    const errorSummary = raw.errorSummary || formatProviderError(p.failureReason || ps.providers?.fmp?.error || state.rec.message || state.markets.message || null, { empty: "" });
    return {
      provider: providerDisplayName(raw.provider || p.active || p.requested || p.provider || "FMP"),
      configured: raw.configured !== undefined ? Boolean(raw.configured) : p.configured === true || Boolean(p.active || p.provider),
      status,
      supportedFeatures: arr(raw.supportedFeatures || p.supportedFeatures),
      loadedCount,
      failedCount,
      cachedCount,
      skippedCount,
      affectedSymbolsCount,
      discoveredCount,
      lastUpdated: raw.lastUpdated || p.lastUpdated || ps.generatedAt || diag.generatedAt || null,
      lastAttemptAt: raw.lastAttemptAt || fmpProvider.lastErrorAt || fmpProvider.lastChecked || ps.generatedAt || diag.generatedAt || null,
      nextRetryAt: raw.nextRetryAt || fmpProvider.nextRetryAt || fmpProvider.rateLimitedUntil || null,
      fallbackAttempted: Boolean(raw.fallbackAttempted || ps.fallbackAttempted || (ps.dataProvider && ps.dataProvider.active && ps.dataProvider.active !== "fmp")),
      cacheStatus: diag.cacheStatus || state.rec.cacheStatus || state.markets.cacheStatus || (cachedCount > 0 ? "hit" : "disabled"),
      errorSummary,
      diagnosticGroups: arr(ps.diagnosticGroups),
      advancedDiagnostics: advanced
    };
  }
  function providerMetricCard(label, value, tone) {
    return `<article class="provider-metric-card ${tone || ""}">
      <strong class="${isLatinMetric(value) ? "ltr" : ""}">${h(formatProviderValue(value))}</strong>
      <small>${h(label)}</small>
    </article>`;
  }
  function diagnosticDetails(normalized) {
    const lang = currentLanguage();
    const title = settingsT("advancedDiagnostics", lang);
    const empty = settingsT("noAdvancedDiagnostics", lang);
    const groups = normalized.advancedDiagnostics.length ? normalized.advancedDiagnostics : (normalized.diagnosticGroups.length ? normalized.diagnosticGroups : groupedProviderDiagnostics());
    if (!groups.length) {
      return `<details class="provider-diagnostics-panel"><summary>${h(title)}</summary><p class="provider-clean-note">${h(empty)}</p></details>`;
    }
    return `<details class="provider-diagnostics-panel">
      <summary>${h(title)}</summary>
      <div class="provider-diagnostic-groups">${groups.map(group => {
        const details = arr(group.details);
        const symbols = arr(group.affectedSymbols).concat(details.map(detail => detail.symbol || detail.route)).filter(Boolean);
        const uniqueSymbols = Array.from(new Set(symbols.map(item => String(item).trim()).filter(Boolean)));
        const visibleSymbols = uniqueSymbols.slice(0, 80);
        const hiddenCount = Math.max(0, uniqueSymbols.length - visibleSymbols.length);
        const affectedCount = numberValue(group.affectedSymbolsCount, uniqueSymbols.length, details.length);
        const reason = formatProviderError(group.reason || group.summary || group.status, { admin: true });
        return `<section class="provider-diagnostic-group">
          <strong>${h(providerDisplayName(group.provider || normalized.provider))}</strong>
          <div class="provider-diagnostic-meta">
            <span><small>${h(settingsT("affectedSymbolsCount", lang))}</small><b>${h(latinNumber(affectedCount))}</b></span>
            <span><small>${h(settingsT("lastAttempt", lang))}</small><b class="ltr">${h(latinDateTime(group.lastAttemptAt || normalized.lastAttemptAt))}</b></span>
            <span><small>${h(settingsT("nextRetry", lang))}</small><b class="ltr">${h(latinDateTime(group.nextRetryAt || normalized.nextRetryAt))}</b></span>
            <span><small>${h(settingsT("fallbackAttempted", lang))}</small><b>${h(yesNoLocalized(Boolean(group.fallbackAttempted || normalized.fallbackAttempted), lang))}</b></span>
            <span><small>${h(settingsT("rejectionReason", lang))}</small><b>${h(reason || "--")}</b></span>
          </div>
          ${visibleSymbols.length ? `<div class="provider-symbol-list"><small>${h(settingsT("affectedSymbols", lang))}</small><div>${visibleSymbols.map(symbol => `<code class="ltr">${h(symbol)}</code>`).join("")}${hiddenCount ? `<code class="ltr">+${h(latinNumber(hiddenCount))}</code>` : ""}</div></div>` : ""}
          ${details.length ? `<ul>${details.slice(0, 40).map(detail => `<li><code class="ltr">${h(detail.route || detail.symbol || "route")}</code><span>${h(formatProviderError(detail.reason || group.status, { admin: true }))}</span></li>`).join("")}</ul>` : ""}
        </section>`;
      }).join("")}</div>
    </details>`;
  }
  function groupedProviderDiagnostics() {
    const ps = state.providerStatus || {};
    const rows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed), arr(ps.skipped), arr(state.rec.skipped), arr(state.markets.skipped));
    const groups = [];
    const seenRoutes = new Set();
    const rateLimited = rows.filter(row => isRateLimitText(row && (row.reason || row.error || row.message || row.status)));
    if (rateLimited.length) {
      const details = rateLimited.map(row => ({ route: providerRouteLabel(row.symbol || row.route || row.endpoint || row.reason), reason: "provider_rate_limited" }))
        .filter(item => {
          const key = item.route.toLowerCase();
          if (seenRoutes.has(key)) return false;
          seenRoutes.add(key);
          return true;
        });
      groups.push({
        provider: "FMP",
        status: "rate_limited",
        summary: "provider_rate_limited",
        affectedSymbolsCount: details.length || rateLimited.length,
        affectedSymbols: details.map(detail => detail.route),
        lastAttemptAt: ps.generatedAt || null,
        nextRetryAt: (ps.providers && ps.providers.fmp && (ps.providers.fmp.nextRetryAt || ps.providers.fmp.rateLimitedUntil)) || null,
        fallbackAttempted: Boolean(ps.dataProvider && ps.dataProvider.active && ps.dataProvider.active !== "fmp"),
        reason: "provider_rate_limited",
        details
      });
    }
    return groups;
  }
  // القيم التقنية للمزود تُخفى عن المستخدم العام. الإصدار المفصّل (أسماء المزودات،
  // حد الاستخدام، أكواد الأخطاء) يظهر فقط في صفحة الإعدادات (لوحة الأدمن) عبر
  // options.admin = true. أي مسار عام يحصل على رسالة موحّدة نظيفة.
  function formatProviderError(error, options = {}) {
    const empty = options.empty === undefined ? "--" : options.empty;
    if (error === null || error === undefined || error === "") return empty;
    let value = "";
    if (typeof error === "object") {
      if (Array.isArray(error)) value = error.map(item => formatProviderError(item, { empty: "", admin: options.admin })).filter(Boolean).join(" · ");
      else value = error.message || error.errorSummary || error.reason || error.code || error.status || error.name || "";
    } else {
      value = String(error);
    }
    value = String(value).replace(/\s+/g, " ").trim();
    if (!value || value === "[object Object]") return empty;
    // المسار العام: لا تفاصيل مزود إطلاقاً — رسالة موحّدة واحدة.
    if (!options.admin) {
      return empty || UNAVAILABLE_MESSAGE;
    }
    // ── ما بعد هذه النقطة يُعرض في لوحة الأدمن فقط ──
    const en = isEnglishLanguage();
    if (isRateLimitText(value)) return en ? "Data provider rate limit reached temporarily" : "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً";
    const lower = value.toLowerCase();
    if (/^provider_status_/i.test(lower)) return getProviderStatusMessage(lower);
    if (lower.includes("fmp_not_configured") || (en && lower.includes("fmp") && hasArabicText(value))) return en ? "FMP is not configured" : "FMP غير مهيأ";
    if (lower.includes("provider_not_configured") || lower.includes("missing_provider")) return en ? "Data provider is not configured" : "مزود البيانات غير مهيأ";
    if (/^[a-z0-9_-]+_not_configured$/i.test(value)) return en ? "Data provider is not configured" : "مزود البيانات غير مهيأ";
    if (lower.includes("provider_temporarily_unavailable")) return en ? "Data provider is temporarily unavailable" : "مزود البيانات غير متاح مؤقتاً";
    if (lower.includes("provider_access_denied") || lower.includes("unauthorized") || lower.includes("forbidden")) return en ? "Provider permissions do not allow this data" : "صلاحية المزود لا تسمح بعرض هذه البيانات";
    if (/^[a-z0-9_-]+_[a-z0-9_-]+$/i.test(value)) return en ? "A provider route could not be refreshed" : "تعذر تحديث أحد مسارات المزود";
    if (en && hasArabicText(value)) return "Data provider is not configured";
    return value.length > 140 ? `${value.slice(0, 137).trim()}...` : value;
  }
  function formatProviderValue(value) {
    if (typeof value === "object" && value !== null) return formatProviderError(value);
    return value === null || value === undefined || value === "" ? "--" : String(value);
  }
  function normalizeStatusKey(status) {
    const value = String(status || "").toLowerCase();
    if (value === "provider_status_available") return "available";
    if (value === "provider_status_partial") return "partial";
    if (value === "provider_status_failed") return "error";
    if (value === "provider_status_loading") return "missing";
    if (value === "provider_status_unknown") return "missing";
    if (value === "rate_limited" || isRateLimitText(value)) return "rate_limited";
    if (["healthy", "success", "available", "configured", "connected"].includes(value)) return "available";
    if (["partial", "degraded"].includes(value)) return "partial";
    if (["missing", "not_configured", "missing_provider"].includes(value)) return "missing";
    if (["provider_error", "error", "invalid_request", "unauthorized", "forbidden", "not_entitled"].includes(value)) return "error";
    return value || "missing";
  }
  function normalizedStatusTone(status) {
    if (status === "available") return "ok";
    if (status === "rate_limited" || status === "partial") return "warn";
    return "";
  }
  function numberValue(...values) {
    for (const value of values) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }
  function countText(value) { return textPair(`${latinNumber(numberValue(value))} رمز`, `${latinNumber(numberValue(value))} symbols`); }
  function cacheStatusLabel(value) {
    const status = String(value || "").toLowerCase();
    if (status === "hit") return textPair("الكاش متاح", "Cache available");
    if (status === "stale") return textPair("كاش قديم مستخدم", "Using stale cache");
    if (status === "miss") return textPair("تحديث مباشر", "Live refresh");
    if (status === "provider-cache") return textPair("كاش المزود", "Provider cache");
    if (status === "live") return textPair("بيانات مباشرة", "Live data");
    if (status === "disabled") return textPair("غير مستخدم", "Disabled");
    return formatProviderValue(value);
  }
  function featureLabel(value) {
    const labels = { prices: "أسعار", quotes: "أسعار", symbols: "رموز", earnings: "أرباح", dividends: "توزيعات", ipos: "اكتتابات", economic: "تقويم اقتصادي", economicCalendar: "تقويم اقتصادي", news: "أخبار", technicalAnalysis: "تحليل فني" };
    return labels[value] || value;
  }
  function featureLabelLocalized(value, lang = currentLanguage()) {
    if (normalizeLanguage(lang) === "ar") return featureLabel(value);
    const labels = { prices: "Prices", quotes: "Quotes", symbols: "Symbols", earnings: "Earnings", dividends: "Dividends", ipos: "IPOs", economic: "Economic calendar", economicCalendar: "Economic calendar", news: "News", technicalAnalysis: "Technical analysis" };
    return labels[value] || value;
  }
  function providerRouteLabel(value) {
    const key = String(value || "").trim();
    const labels = { "stock-list": "stock list", "etf-list": "ETF list", "indexes-list": "indexes list", "batch-forex-quotes": "forex quotes", "batch-crypto-quotes": "crypto quotes", "batch-commodity-quotes": "commodity quotes", "batch-index-quotes": "index quotes", "batch-quote": "stock quotes" };
    return labels[key] || key.replace(/^fmp_/, "").replace(/_http_429$/i, "").replace(/_/g, " ") || "provider route";
  }
  function isRateLimitText(value) { return /429|rate_limited|rate limit|too many|provider_rate_limited|http_429/i.test(String(value || "")); }
  function isLatinMetric(value) { return /^[\d\s.,:%A-Za-z/_-]+$/.test(String(value || "")); }
  function featureTitle(key) { return key === "earnings" ? "الأرباح" : key === "dividends" ? "التوزيعات" : key === "ipos" ? "الاكتتابات" : key === "economic" ? "الاقتصادي" : key; }
  function providerMarkets() {
    const rows = arr(state.markets.markets || state.markets.data || state.markets.results);
    const diagnostics = state.markets.providerMarketsDiagnostics || {};
    const pagination = state.markets.pagination || {};
    const fmt = value => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed.toLocaleString("en-US") : "--";
    };
    const stats = [
      [textPair("ظاهرة", "Visible"), fmt(pagination.total ?? diagnostics.visibleRows ?? rows.length), textPair("بعد الفلاتر", "After filters")],
      [textPair("تم تحميلها", "Loaded"), fmt(diagnostics.totalRows ?? rows.length), textPair("الفهرس بعد الدمج", "Deduped catalog")],
      [textPair("مخفية", "Hidden"), fmt(diagnostics.hiddenIncompleteRows), textPair("صفوف غير مكتملة", "Incomplete rows")],
      [textPair("مكررة", "Duplicates"), fmt(diagnostics.duplicateRows), textPair("صفوف مدمجة", "Merged rows")],
    ];
    return `<div class="provider-market-diagnostics-compact">
      <div class="panel-head">
        <div><span class="eyebrow">${h(terminalText("adminDiagnostics"))}</span><h2>${h(terminalText("providerMarketsSummary"))}</h2></div>
        <a class="ghost-btn compact-btn" href="${ROOT}/settings" data-route-link>${h(terminalText("settings"))}</a>
      </div>
      <p class="provider-market-note">${h(translateUiText(state.markets.message || textPair("صفوف أسواق المزود المفصلة متاحة ضمن الإعدادات / تشخيصات الإدارة.", "Detailed provider market rows are available under Settings / Admin diagnostics.")))}</p>
      <div class="provider-market-summary-grid">${stats.map(([label, value, helper]) => `
        <article class="provider-market-summary-card">
          <span>${h(helper)}</span>
          <strong class="ltr">${h(value)}</strong>
          <small>${h(label)}</small>
        </article>`).join("")}</div>
    </div>`;
  }
  function confBuckets(r) { const b = { high: 0, mid: 0, low: 0 }; r.forEach(x => { const c = num(x.confidence, x.score, x.aiConfidence); if (c === null) return; if (c >= 70) b.high++; else if (c >= 45) b.mid++; else b.low++; }); return b; }
  function confBars(b) { const max = Math.max(1, b.high, b.mid, b.low); return `<div class="conf-bars"><div class="bias-row"><span>${h(textPair("عالية", "High"))}</span><div class="mo-bar"><i style="width:${b.high / max * 100}%"></i></div><b>${b.high}</b></div><div class="bias-row"><span>${h(textPair("متوسطة", "Medium"))}</span><div class="mo-bar"><i class="conf" style="width:${b.mid / max * 100}%"></i></div><b>${b.mid}</b></div><div class="bias-row"><span>${h(textPair("منخفضة", "Low"))}</span><div class="mo-bar"><i class="bear" style="width:${b.low / max * 100}%"></i></div><b>${b.low}</b></div></div>`; }
  function riskRadar(r) { if (!r.length) return miniEmpty(); const levels = { low: 0, medium: 0, high: 0 }; r.forEach(x => { const k = riskKey(x.risk || x.riskLevel); levels[k]++; }); const max = Math.max(1, ...Object.values(levels)); const L = { low: [textPair("منخفضة", "Low"), "ok"], medium: [textPair("متوسطة", "Medium"), "warn"], high: [textPair("مرتفعة", "High"), "bear"] }; return `<div class="conf-bars">${Object.entries(levels).map(([k, v]) => `<div class="bias-row"><span>${h(L[k][0])}</span><div class="mo-bar"><i class="${L[k][1] === "ok" ? "" : L[k][1]}" style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>`; }
  function miniChart(a) {
    const series = arr(a.history || a.sparkline || a.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null);
    if (series.length < 2) return `<div class="chart-empty">لا توجد بيانات رسم بياني كافية من المزود بعد. حدّث الرمز أو اربط مزود بيانات تاريخية لعرض حركة السعر.</div>`;
    const W = 100, H = 40, top = 3, bottom = 37, n = series.length;
    const min = Math.min(...series), max = Math.max(...series), rng = (max - min) || 1;
    const X = i => (i / (n - 1)) * W;
    const Y = v => bottom - ((v - min) / rng) * (bottom - top);
    const pts = series.map((v, i) => [X(i), Y(v)]);
    // مسار انسيابي (Catmull-Rom → Bézier) بدل الخط المكسّر
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    const area = `${d} L ${W} ${H} L 0 ${H} Z`;
    const up = series[n - 1] >= series[0];
    const gid = `cg${Math.random().toString(36).slice(2, 8)}`;
    const stroke = up ? "#34e58b" : "#ff5c6c";
    const glow = up ? "rgba(52,229,139,.55)" : "rgba(255,92,108,.55)";
    // الألوان inline كـ attributes كي لا تعتمد على CSS داخل الإطار (iframe) وتتفادى التعبئة السوداء الافتراضية للتدرّج
    const grid = [0.25, 0.5, 0.75].map(f => { const yy = (top + f * (bottom - top)).toFixed(2); return `<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" stroke="rgba(122,153,186,.16)" stroke-width="0.4" stroke-dasharray="1.4 2.4"></line>`; }).join("");
    return `<div class="detail-chart-wrap ${up ? "up" : "down"}">
      <svg class="detail-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="رسم حركة السعر">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.3"></stop><stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop></linearGradient></defs>
        <g>${grid}</g>
        <path d="${area}" fill="url(#${gid})" stroke="none"></path>
        <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 4px ${glow})"></path>
      </svg>
    </div>`;
  }
  function assetShariaStatusMeta(value) {
    const v = String(value || "").toLowerCase();
    if (v === "compliant") return { cls: "ok", ar: "مطابق للشريعة", en: "Shariah-compliant", icon: "✓" };
    if (v === "non_compliant" || v === "not_compliant") return { cls: "bad", ar: "غير مطابق للشريعة", en: "Non-compliant", icon: "✕" };
    if (v === "needs_review" || v === "possible" || v === "partial") return { cls: "warn", ar: "يحتاج مراجعة", en: "Needs review", icon: "!" };
    return { cls: "muted", ar: "غير مصنّف", en: "Unclassified", icon: "?" };
  }
  function factRow(label, value) {
    if (value === null || value === undefined || value === "" || value === "--") return "";
    return `<div class="fact-row"><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`;
  }
  function safeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
    return /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : "";
  }
  function assetAboutPanel(a) {
    const desc = a.description || a.objective || a.summary || a.longBusinessSummary || "";
    const sector = a.sector || a.sectorName || "";
    const industry = a.industry || a.industryName || "";
    const country = a.country || a.region || "";
    const cap = a.marketCap ?? a.marketCapitalization;
    const employees = a.employees ?? a.fullTimeEmployees;
    const url = safeExternalUrl(a.website || a.weburl);
    const facts = [
      factRow(terminalText("sector"), sector),
      factRow(terminalText("industry"), industry),
      factRow(textPair("الدولة", "Country"), country),
      cap != null && num(cap) !== null ? `<div class="fact-row"><dt>${h(terminalText("marketCap"))}</dt><dd class="ltr">${h(marketCapText(cap, currency(a)))}</dd></div>` : "",
      employees != null && num(employees) !== null ? `<div class="fact-row"><dt>${h(textPair("عدد الموظفين", "Employees"))}</dt><dd class="ltr">${h(bigNumber(employees))}</dd></div>` : "",
    ].filter(Boolean).join("");
    if (!desc && !facts && !url) {
      return `<article class="panel about-panel"><span class="eyebrow">${h(textPair("عن الأصل", "About"))}</span><h2>${h(textPair("عن الأصل ونشاطه", "About the asset and business"))}</h2>${emptyState(textPair("لا تتوفر بيانات تعريفية كافية", "Not enough profile data"), textPair("لم يُرجِع المزود ملفاً تعريفياً لهذا الرمز. اربط مزود بيانات أساسية لعرض النشاط والوصف والقيمة السوقية.", "The provider did not return a profile for this symbol. Connect a fundamentals provider to show business activity, description, and market cap."), terminalText("settings"), `${ROOT}/settings`)}</article>`;
    }
    return `<article class="panel about-panel">
      <span class="eyebrow">${h(textPair("عن الأصل", "About"))}</span><h2>${h(textPair("عن الأصل ونشاطه", "About the asset and business"))}</h2>
      ${desc ? `<p class="about-desc">${h(translateUiText(desc))}</p>` : ""}
      ${facts ? `<dl class="about-facts">${facts}</dl>` : ""}
      ${url ? `<a class="about-web ltr" href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(a.website || a.weburl)}</a>` : ""}
    </article>`;
  }
  function isSpacAsset(a) {
    const industry = String(a.industry || a.industryName || "").toLowerCase();
    const name = String(a.name || a.companyName || "").toLowerCase();
    if (/blank check|shell compan|special purpose acquisition/.test(industry)) return true;
    return /\bacquisition\s+(corp|corporation|inc|company|co)\b/.test(name) || /\bspac\b/.test(name);
  }
  function spacNoticeCard(a) {
    return `<article class="panel sharia-panel warn">
      <span class="eyebrow">${h(textPair("التوصية النهائية", "Final recommendation"))}</span><h2>${h(textPair("سهم شركة استحواذ (SPAC)", "SPAC stock"))}</h2>
      <div class="sharia-badge warn"><span class="sharia-mark">!</span><div class="sharia-badge-copy"><strong>${h(textPair("لا ينطبق التحليل الفني", "Technical analysis does not apply"))}</strong><small class="ltr">SPAC / Blank check</small></div></div>
      <p class="sharia-note">${h(textPair("هذا سهم شركة استحواذ ذات غرض خاص: سعره شبه مثبّت حول قيمة صندوق الاكتتاب حتى الإعلان عن صفقة اندماج، لذلك مؤشرات الاتجاه والزخم والاختراق عليه بلا دلالة، ولن يصدر النظام توصية شراء أو بيع له. القرار في هذا النوع يعتمد على أخبار صفقة الاندماج وشروطها، لا على الشارت.", "This is a special purpose acquisition company stock: its price is typically anchored near trust value until a merger is announced, so trend, momentum, and breakout indicators are not meaningful and the system will not issue buy or sell recommendations for it. Decisions here depend on merger news and terms, not the chart."))}</p>
    </article>`;
  }
  function shariaCompliancePanel(a) {
    const meta = assetShariaStatusMeta(a.shariahStatus || a.shariaStatus);
    const reason = a.shariahReasonAr || a.shariah_reason_ar || a.shariahReason || a.shariaReason || a.shariahDescription || "";
    const source = a.shariahSource || a.shariaSource || (meta.cls === "muted" ? "" : textPair("الفحص الداخلي الآلي", "Automated internal screening"));
    const reviewed = latinDateTime(a.shariahLastReviewedAt || a.shariaCheckedAt) || "--";
    return `<article class="panel sharia-panel ${meta.cls}">
      <span class="eyebrow">${h(textPair("التوافق مع الشريعة", "Shariah compliance"))}</span><h2>${h(textPair("التوافق مع الشريعة", "Shariah compliance"))}</h2>
      <div class="sharia-badge ${meta.cls}"><span class="sharia-mark">${meta.icon}</span><div class="sharia-badge-copy"><strong>${h(textPair(meta.ar, meta.en))}</strong></div></div>
      <dl class="sharia-facts">
        ${factRow(textPair("السبب", "Reason"), reason)}
        ${factRow(terminalText("source"), source)}
        ${factRow(textPair("آخر مراجعة", "Last reviewed"), reviewed)}
        ${factRow(textPair("المعيار", "Standard"), textPair("فحص النشاط + النسب المالية", "Business activity + financial ratios screening"))}
      </dl>
      <p class="sharia-note">${h(textPair("تصنيف مبدئي آلي وفق فحص النشاط التجاري والنسب المالية (الديون بفائدة ≤ 33٪، الدخل من الفوائد ≤ 5٪). هذه ليست فتوى؛ للاعتماد النهائي راجع خدمة فحص شرعي معتمدة أو أهل الاختصاص.", "Preliminary automated classification based on business activity and financial ratio screening (interest-bearing debt <= 33%, interest income <= 5%). This is not a fatwa; for final reliance, consult an accredited Shariah screening service or qualified specialists."))}</p>
    </article>`;
  }
  function firstNum(...values) {
    for (const value of values) {
      const n = Array.isArray(value) ? num(...value) : num(value);
      if (n !== null) return n;
    }
    return null;
  }
  function hasChartHistory(asset, tech) {
    return arr(asset.history || asset.sparkline || asset.candles).length >= 2
      || arr((tech || {}).history || (tech || {}).ohlc || (tech || {}).candles).length >= 2;
  }
  function validTechnicalLevel(value, currentPrice, side, hasHistory) {
    if (!hasHistory || value === null || currentPrice === null || value <= 0 || currentPrice <= 0) return null;
    const distance = Math.abs(value - currentPrice) / currentPrice;
    if (distance > 0.75) return null;
    if (side === "support" && value > currentPrice * 1.1) return null;
    if (side === "resistance" && value < currentPrice * 0.9) return null;
    return value;
  }
  function trendText(value) {
    const raw = String(value || "");
    const s = raw.toLowerCase();
    if (!s) return "";
    if (s.includes("bull") || s.includes("up") || s.includes("صاعد")) return "صاعد";
    if (s.includes("bear") || s.includes("down") || s.includes("هابط")) return "هابط";
    if (s.includes("side") || s.includes("neutral") || s.includes("flat") || s.includes("جانبي") || s.includes("محايد")) return "جانبي";
    return raw;
  }
  function technicalUnavailableCopy() {
    return TECHNICAL_UNAVAILABLE_COPY[currentLanguage() === "en" ? "en" : "ar"];
  }
  function technicalPayloadFromResponse(response) {
    if (!response || typeof response !== "object") return null;
    if (response.feature === "technical_analysis" || response.pivotPoints || response.movingAverages || response.providerStatus || response.providerMessage || response.code || response.success === false) return response;
    if (response.analysis && typeof response.analysis === "object") return response.analysis;
    if (Array.isArray(response.data)) return response.data[0] || response;
    if (response.data && typeof response.data === "object") return response.data;
    if (response.available && typeof response.available === "object") return response.available;
    return response.ok === false ? response : null;
  }
  function isTechnicalUnavailablePayload(value) {
    if (!value || typeof value !== "object") return false;
    if (value.available === false || value.technicalAvailable === false || value.technical_available === false || value.success === false) return true;
    const status = String(value.status || value.providerStatus?.dataQuality || value.dataQuality || value.providerStatus?.status || "").toLowerCase();
    if (["empty", "unavailable", "provider_error", "rate_limited", "not_configured", "unauthorized"].includes(status)) return true;
    return /UNAVAILABLE|NOT_AVAILABLE|UNSUPPORTED|TIMEOUT|NO_DATA|EMPTY/i.test(String(value.code || value.unavailableReason || ""));
  }
  function isTechnicalUnavailableDetail(detail, source = {}) {
    const tech = detail && detail.tech;
    return Boolean(
      detail?.technicalUnavailable ||
      isTechnicalUnavailablePayload(tech) ||
      source.technicalAvailable === false ||
      source.technical_available === false ||
      detail?.rec?.technicalAvailable === false
    );
  }
  function technicalMissingFieldsFromPayload(payload, asset = {}) {
    const diagnostics = payload?.unavailableDiagnostics || payload?.diagnostics || {};
    const explicit = arr(payload?.missingFields || payload?.missing_fields || diagnostics.missingFields || diagnostics.missing_fields);
    if (explicit.length) return explicit.map(String).filter(Boolean);
    const summary = asset.technicalSummary || asset.technical_summary || payload?.technicalSummary || payload?.technical_summary || {};
    const indicators = summary.indicators || payload?.indicators || {};
    const missing = [];
    if (firstNum(payload?.rsi, payload?.rsi14, indicators.rsi, indicators.rsi14) === null) missing.push("rsi");
    if (firstNum(payload?.movingAverages?.sma20, payload?.sma20, indicators.sma20, indicators.ema20) === null) missing.push("moving_average_20");
    if (firstNum(payload?.movingAverages?.sma50, payload?.sma50, indicators.sma50, indicators.ema50) === null) missing.push("moving_average_50");
    if (!arr(payload?.history || payload?.ohlc || payload?.candles).length && !payload?.pivotPoints) missing.push("historical_ohlc");
    if (firstNum(payload?.support, payload?.levels?.support, indicators.support) === null) missing.push("support");
    if (firstNum(payload?.resistance, payload?.levels?.resistance, indicators.resistance) === null) missing.push("resistance");
    return missing.length ? missing : ["technical_indicators"];
  }
  function formatTechnicalMissingField(value) {
    const key = String(value || "").toLowerCase();
    const labels = {
      rsi: ["RSI", "RSI"],
      macd: ["MACD", "MACD"],
      moving_average_20: ["متوسط 20", "20-period average"],
      moving_average_50: ["متوسط 50", "50-period average"],
      moving_average_200: ["متوسط 200", "200-period average"],
      historical_ohlc: ["بيانات الأسعار التاريخية", "Historical OHLC prices"],
      ohlc: ["بيانات الأسعار التاريخية", "Historical OHLC prices"],
      support: ["الدعم", "Support"],
      resistance: ["المقاومة", "Resistance"],
      technical_indicators: ["المؤشرات الفنية", "Technical indicators"]
    };
    const label = labels[key];
    return label ? textPair(label[0], label[1]) : translateUiText(String(value || "").replace(/_/g, " "));
  }
  function providerDisplayNameForLanguage(value) {
    const name = providerName(value);
    if (!name) return terminalText("unavailable");
    if (isEnglishLanguage()) {
      if (name === "بيانات السوق") return "Market data";
      if (name === "إدخال يدوي") return "Manual input";
    }
    return name;
  }
  function technicalUnavailableReason(payload) {
    const copy = technicalUnavailableCopy();
    const code = String(payload?.code || payload?.unavailableReason || payload?.providerCode || "").toUpperCase();
    if (code.includes("UNSUPPORTED")) return textPair("الرمز غير مدعوم من المزود الحالي.", "The symbol is not supported by the current provider.");
    if (code.includes("OHLC") || code.includes("HISTORY") || code.includes("NO_DATA")) return textPair("بيانات الأسعار التاريخية غير كافية.", "Historical price data is missing.");
    if (code.includes("TIMEOUT") || code.includes("PROVIDER")) return textPair("يوجد تأخير أو تعذر مؤقت من مزود البيانات.", "The data provider is delayed or temporarily unavailable.");
    const message = payload?.providerMessage || payload?.message || "";
    return translateUiText(formatProviderError(message, { empty: copy.description }));
  }
  function technicalUnavailableDiagnostics(detail = {}, asset = {}) {
    const payload = detail.tech || {};
    const providerStatus = payload.providerStatus || detail.providerStatus || {};
    return {
      symbol: asset.symbol || detail.symbol || "",
      assetClass: asset.assetType || asset.asset_type || assetType(asset.symbol || ""),
      provider: providerStatus.provider || payload.provider || payload.source || detail.source || "",
      providerSymbol: providerStatus.providerSymbolUsed || payload.providerSymbol || asset.providerSymbol || asset.providerSymbolUsed || "",
      missingFields: technicalMissingFieldsFromPayload(payload, asset),
      fallbackAttempted: Boolean(providerStatus.fallbackUsed ?? payload.fallbackAttempted ?? payload.unavailableDiagnostics?.fallbackAttempted),
      reason: payload.code || payload.unavailableReason || detail.technicalReason || payload.providerMessage || ""
    };
  }
  function downgradedTechnicalRecommendation(recommendation, detail) {
    const copy = technicalUnavailableCopy();
    return {
      ...recommendation,
      status: "watch",
      actionLabelAr: Recommendation.labelAr("watch"),
      actionLabelEn: Recommendation.labelEn("watch"),
      reason: `${copy.description} ${copy.finalNote}`,
      canFollowTrade: false,
      safetyReasons: [...arr(recommendation?.safetyReasons), technicalUnavailableReason(detail?.tech)].filter(Boolean)
    };
  }
  function technicalSnapshot(a, tech) {
    const t = tech || {};
    const summary = a.technicalSummary || a.technical_summary || t.technicalSummary || t.technical_summary || {};
    const summaryIndicators = summary.indicators || {};
    const ind = { ...(t.indicators || {}), ...summaryIndicators };
    const ma = t.movingAverages || t.averages || {};
    const levels = t.levels || {};
    const piv = t.pivotPoints || t.pivots || {};
    const supports = Array.isArray(t.support) ? t.support : Array.isArray(levels.support) ? levels.support : [];
    const resistances = Array.isArray(t.resistance) ? t.resistance : Array.isArray(levels.resistance) ? levels.resistance : [];
    const current = firstNum(a.price, a.currentPrice, a.lastPrice, a.regularMarketPrice, a.close, t.currentPrice, t.price);
    const canShowLevels = hasChartHistory(a, t) || firstNum(ind.support, ind.resistance) !== null;
    const rsi = firstNum(t.rsi, t.rsi14, t.RSI, ind.rsi, ind.rsi14);
    const macd = firstNum(t.macd, t.macdValue, ind.macd, ind.macdValue), macdSig = firstNum(t.macdSignal, t.signalLine, ind.macdSignal, ind.signalLine);
    const ma20 = firstNum(t.ma20, t.sma20, t.ema20, ma.ma20, ma.sma20, ma.ema20, ind.sma20, ind.ema20);
    const ma50 = firstNum(t.ma50, t.sma50, t.ema50, ma.ma50, ma.sma50, ma.ema50, ind.sma50, ind.ema50);
    const ma200 = firstNum(t.ma200, t.sma200, t.ema200, ma.ma200, ma.sma200, ma.ema200, ind.sma200, ind.ema200);
    const vol = firstNum(t.volatility, t.atr, t.atr14, ind.atr, ind.atr14);
    const volumeRatio = firstNum(t.volumeRatio, t.volume_ratio, ind.volumeRatio, ind.volume_ratio);
    const s1raw = validTechnicalLevel(firstNum(t.s1, t.support1, supports[0], levels.s1, piv.s1, t.support, ind.support), current, "support", canShowLevels);
    const s2raw = validTechnicalLevel(firstNum(t.s2, t.support2, supports[1], levels.s2, piv.s2), current, "support", canShowLevels);
    const r1raw = validTechnicalLevel(firstNum(t.r1, t.resistance1, resistances[0], levels.r1, piv.r1, t.resistance, ind.resistance), current, "resistance", canShowLevels);
    const r2raw = validTechnicalLevel(firstNum(t.r2, t.resistance2, resistances[1], levels.r2, piv.r2), current, "resistance", canShowLevels);
    const sLevels = [s1raw, s2raw].filter(v => v !== null && (current === null || v <= current * 1.002)).sort((a, b) => b - a);
    const rLevels = [r1raw, r2raw].filter(v => v !== null && (current === null || v >= current * 0.998)).sort((a, b) => a - b);
    const s1 = sLevels[0] ?? null, s2 = sLevels[1] ?? null;
    const r1 = rLevels[0] ?? null, r2 = rLevels[1] ?? null;
    const trend = trendText(t.trend || t.direction || ind.trend || (ma50 !== null && ma200 !== null ? (ma50 >= ma200 ? "صاعد" : "هابط") : ""));
    const rsiTag = rsi === null ? "" : rsi >= 70 ? " (تشبع شرائي)" : rsi <= 30 ? " (تشبع بيعي)" : "";
    const macdTag = (macd !== null && macdSig !== null) ? (macd >= macdSig ? " · إيجابي" : " · سلبي") : "";
    const rows = [
      ["الاتجاه العام", trend],
      ["RSI (14)", rsi === null ? "" : Math.round(rsi) + rsiTag],
      ["MACD", macd === null ? "" : (Math.round(macd * 1000) / 1000) + macdTag],
      ["EMA 20", ma20 === null ? "" : price(ma20, null)],
      ["EMA 50", ma50 === null ? "" : price(ma50, null)],
      ["EMA 200", ma200 === null ? "" : price(ma200, null)],
      ["دعم 1", s1 === null ? "" : price(s1, null)],
      ["دعم 2", s2 === null ? "" : price(s2, null)],
      ["مقاومة 1", r1 === null ? "" : price(r1, null)],
      ["مقاومة 2", r2 === null ? "" : price(r2, null)],
      ["التذبذب", vol === null ? "" : (Math.round(vol * 100) / 100)],
      ["تأكيد الحجم", volumeRatio === null ? "" : `${Math.round(volumeRatio * 100) / 100}×`]
    ].filter(([, v]) => hasDisplayValue(v));
    const recommendation = t.recommendation || t.action || t.signal || "";
    if (recommendation && rows.length) rows.push(["التوصية الفنية", recommendation]);
    return { available: rows.length > 0, rows, raw: t, current };
  }
  function technicalUnavailableState(detail, asset = {}, options = {}) {
    const copy = technicalUnavailableCopy();
    const diagnostics = technicalUnavailableDiagnostics(detail, asset);
    const reason = detail?.technicalReason || technicalUnavailableReason(detail?.tech || {});
    const missingFields = diagnostics.missingFields.map(formatTechnicalMissingField).join(isEnglishLanguage() ? ", " : "، ");
    const fallback = diagnostics.fallbackAttempted ? textPair("تمت المحاولة", "Attempted") : textPair("لم تتم", "Not attempted");
    const direction = currentLanguage() === "en" ? "ltr" : "rtl";
    const compactClass = options.compact ? " is-compact" : "";
    const details = options.compact ? "" : `<dl class="technical-unavailable-details">
        <div><dt>${h(copy.reasonLabel)}</dt><dd>${h(reason)}</dd></div>
        <div><dt>${h(copy.providerLabel)}</dt><dd>${h(providerDisplayNameForLanguage(diagnostics.provider))}</dd></div>
        <div><dt>${h(copy.providerSymbolLabel)}</dt><dd class="ltr">${h(diagnostics.providerSymbol || terminalText("unavailable"))}</dd></div>
        <div><dt>${h(copy.missingFieldsLabel)}</dt><dd>${h(missingFields || terminalText("unavailable"))}</dd></div>
        <div><dt>${h(copy.fallbackLabel)}</dt><dd>${h(fallback)}</dd></div>
      </dl>`;
    const actions = options.actions === false ? "" : `<div class="row-actions technical-unavailable-actions">
        <button class="ghost-btn" data-retry type="button">${h(copy.retry)}</button>
        <a class="ghost-btn" href="${ROOT}/settings" data-route-link>${h(copy.changeProvider)}</a>
        <button class="ghost-btn" data-view-price-data="#price-data-panel" type="button">${h(copy.viewPriceData)}</button>
      </div>`;
    return `<div class="technical-unavailable empty-state compact${compactClass}" dir="${direction}">
      <span class="technical-unavailable-icon" aria-hidden="true">!</span>
      <div class="technical-unavailable-copy">
        <h3>${h(copy.title)}</h3>
        <p>${h(copy.description)}</p>
      </div>
      <div class="technical-unavailable-reasons">
        <strong>${h(copy.reasonsTitle)}</strong>
        <ul>${copy.reasons.map(reasonText => `<li>${h(reasonText)}</li>`).join("")}</ul>
      </div>
      <p class="technical-unavailable-note">${h(copy.finalNote)}</p>
      ${details}
      ${actions}
    </div>`;
  }
  function technical(a, tech, c, detail) {
    if (isTechnicalUnavailableDetail(detail, a) || (tech && tech.available === false)) return technicalUnavailableState(detail, a);
    const snapshot = technicalSnapshot(a, tech);
    if (!snapshot.available) return technicalUnavailableState(detail, a);
    const summary = a.technicalSummary || a.technical_summary || (tech && (tech.technicalSummary || tech.technical_summary)) || {};
    const summaryText = summary.summaryAr || summary.summary_ar || summary.summaryEn || summary.summary_en || "";
    return `${summaryText ? `<p class="muted-note">${h(translateUiText(summaryText))}</p>` : ""}<div class="table-shell technical-available"><table><tbody>${snapshot.rows.map(([k, v]) => `<tr><th>${h(translateUiText(k))}</th><td class="${valueTextClass(v)}">${h(translateUiText(v))}</td></tr>`).join("")}</tbody></table></div>
      <p class="muted-note">${h(textPair("تظهر هنا المؤشرات التي أرجعها المزود فقط؛ تم إخفاء الصفوف غير المتاحة بدلاً من تقديرها.", "Only indicators returned by the provider are shown here; unavailable rows are hidden instead of estimated."))}</p>`;
  }
  function riskReward(rec, c) {
    if (!rec) return "";
    const entry = num(rec.entry, rec.entryPrice, rec.price, rec.currentPrice);
    const tps = arr(rec.takeProfit).map(Number).filter(Number.isFinite);
    const tgt1 = num(rec.target, rec.targetPrice, tps[0]);
    const tgt2 = num(rec.target2, tps[1]);
    const sl = num(rec.stopLoss, rec.stop);
    if (entry === null || tgt1 === null || sl === null) return "";
    const risk = Math.abs(entry - sl); if (!risk) return "";
    const rr1 = Math.round(Math.abs(tgt1 - entry) / risk * 100) / 100;
    const rr2 = tgt2 === null ? null : Math.round(Math.abs(tgt2 - entry) / risk * 100) / 100;
    return `<div class="detail-grid">${detailCard(textPair("الدخول", "Entry"), price(entry, c), "Entry")}${detailCard(textPair("الهدف 1 · احتمال مرتفع", "Target 1 · higher probability"), price(tgt1, c), "TP1")}${tgt2 !== null ? detailCard(textPair("الهدف 2 · تمديد", "Target 2 · extension"), price(tgt2, c), "TP2") : ""}${detailCard(textPair("وقف الخسارة", "Stop loss"), price(sl, c), "Stop")}${detailCard(textPair("العائد/المخاطرة", "Risk/reward"), rr2 !== null ? `${rr2}:1 · TP2` : `${rr1}:1 · TP1`, "R/R")}</div>
    <p class="muted-note">${h(textPair("الهدف الأول قريب عمداً (≈0.9×ATR) لرفع احتمال الإصابة، وهو الهدف الذي تُقاس عليه نسبة النجاح التاريخية. الوقف أوسع خلف الهيكل السعري، لذلك العائد/المخاطرة يُقرأ مع الهدف الثاني.", "The first target is intentionally close (around 0.9x ATR) to raise hit probability; historical success is measured against that target. The stop is wider behind the price structure, so risk/reward is read with the second target."))}</p>`;
  }
  function signalAnalysis(rec, c) {
    const sig = signal(rec), conf = confText(rec);
    const reasons = arr(rec.reasons).map(String).filter(Boolean).slice(0, 5);
    const warnings = arr(rec.warnings).map(String).filter(Boolean).slice(0, 5);
    const score = rec.scoreBreakdown || rec.score_breakdown || {};
    const quality = rec.dataQuality || rec.data_quality || "--";
    const provider = rec.provider || rec.source || "--";
    const summary = translateUiText(rec.reason || rec.summary || reasons[0] || textPair("قراءة تحليلية مبنية على البيانات المتاحة.", "Analytical reading based on available data."));
    const scoreRows = [
      [textPair("فني", "Technical"), score.technicalScore, 40],
      [textPair("زخم", "Momentum"), score.momentumScore, 20],
      [textPair("أخبار", "News"), score.newsScore, 15],
      [textPair("أساسيات", "Fundamentals"), score.fundamentalsScore, 15]
    ].filter(([, value]) => value !== undefined && value !== null);
    const pm = rec.precisionMode || rec.precision || null;
    const bt = rec.backtest || null;
    const precisionRate = num(pm && pm.measuredWinRate, bt && bt.winRate);
    return `<div class="signal-analysis">
      <p>${h(summary)}</p>
      <div class="detail-grid">
        ${detailCard(textPair("الإشارة", "Signal"), sigLabel(sig), "Action")}
        ${detailCard(terminalText("confidence"), conf, "Confidence")}
        ${precisionRate !== null ? detailCard(textPair("الدقة التاريخية", "Historical accuracy"), `${precisionRate}%${pm && pm.passed ? " ✓" : ""}`, "Backtest") : ""}
        ${bt && num(bt.samples) !== null ? detailCard(textPair("عينات الاختبار", "Test samples"), latinNumber(bt.samples), "Samples") : ""}
        ${detailCard(textPair("المخاطرة", "Risk"), riskShort(rec.risk || rec.riskLevel), "Risk")}
        ${detailCard(textPair("المدة", "Horizon"), rec.timeframe || rec.horizon || rec.duration || "--", "Horizon")}
        ${detailCard(textPair("مزود البيانات", "Data provider"), provider, "Provider")}
        ${detailCard(terminalText("dataQuality"), dataQualityLabel(quality), "Quality")}
      </div>
      ${riskReward(rec, c)}
      ${scoreRows.length ? `<div class="table-shell"><table><tbody>${scoreRows.map(([label, value, max]) => `<tr><th>${h(label)}</th><td class="ltr">${h(latinNumber(value))} / ${h(max)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${reasons.length ? `<div class="trade-list">${reasons.map(r => `<article class="trade-item"><strong>${h(textPair("سبب", "Reason"))}</strong><p>${h(translateUiText(r))}</p></article>`).join("")}</div>` : ""}
      ${warnings.length ? `<div class="trade-list">${warnings.map(w => `<article class="trade-item"><strong>${h(textPair("تنبيه مخاطرة", "Risk warning"))}</strong><p>${h(translateUiText(w))}</p></article>`).join("")}</div>` : ""}
      <p class="muted-note">${h(textPair("هذه إشارات تحليلية تعليمية مبنية على البيانات المتاحة، ولا تُعد نصيحة مالية أو توصية ملزمة بالشراء أو البيع. القرار النهائي مسؤولية المستخدم.", "These are educational analytical signals based on available data and are not financial advice."))}</p>
    </div>`;
  }
  function hasArabicText(value) { return /[\u0600-\u06FF]/.test(String(value ?? "")); }
  function valueTextClass(value) { return hasArabicText(value) ? "rtl-value" : "ltr"; }
  function displayValue(value) {
    if (/^provider_status_/i.test(String(value || ""))) return getProviderStatusMessage(value);
    return value === null || value === undefined || value === "" || value === "--" ? terminalText("unavailable") : translateUiText(String(value));
  }
  function hasDisplayValue(value) {
    const shown = displayValue(value).trim();
    return shown && shown !== terminalText("unavailable") && shown !== "—";
  }
  function sampleCountFromRec(rec) {
    const pm = rec && (rec.precisionMode || rec.precision) || {};
    const bt = rec && rec.backtest || {};
    return num(rec && rec.samples, rec && rec.sampleCount, rec && rec.sample_count, bt.samples, bt.sampleCount, pm.samples, pm.sampleCount);
  }
  function normalizedDataQuality(value) {
    const raw = String(value || "").toLowerCase();
    if (raw === "complete") return "complete";
    if (raw === "live") return "live";
    if (raw === "cached") return "cached";
    if (raw === "delayed") return "delayed";
    if (raw === "partial") return "partial";
    if (raw === "unavailable") return "unavailable";
    return raw || "unavailable";
  }
  function detailCard(label, value, helper) {
    const shown = displayValue(value);
    const longValueKeys = ["source", "last updated", "updated", "company", "company name", "provider", "provider symbol"];
    const keyText = `${helper || ""} ${label || ""}`.toLowerCase();
    const isLongValue = shown.length > 28 || /[\/._-]/.test(shown);
    const longValueClass = longValueKeys.some(key => keyText.includes(key)) || isLongValue ? " detail-card--long" : "";
    return `<article class="detail-card${longValueClass}"><span class="card-kicker">${h(translateUiText(helper || label))}</span><strong class="${valueTextClass(shown)}">${h(shown)}</strong><p>${h(translateUiText(label))}</p></article>`;
  }

  /* ── Strategy agreement is informational; the final recommendation is weighted separately. ── */
  function strategySignals(asset, tech, rec) {
    const t = tech || {}, sigs = [];
    if (isTechnicalUnavailableDetail({ tech, rec }, asset)) return sigs;
    const quote = normalizeQuote(asset);
    const price = quote.price;
    const ma50 = num(t.ma50, t.sma50, t.ema50), ma200 = num(t.ma200, t.sma200, t.ema200);
    const rsi = num(t.rsi, t.rsi14, t.RSI), macd = num(t.macd, t.macdValue), macdSig = num(t.macdSignal, t.signalLine);
    const s1 = num(t.support, t.s1, t.support1), r1 = num(t.resistance, t.r1, t.resistance1);
    const chg = quote.changePercent;
    const push = (name, signal, weight, note) => sigs.push({ name, signal, weight, note });
    if (ma50 !== null && ma200 !== null) push(textPair("اتجاه — تقاطع المتوسطات", "Trend — moving average cross"), ma50 >= ma200 ? "buy" : "sell", 1.3, ma50 >= ma200 ? textPair("المتوسط 50 فوق 200 (تقاطع ذهبي)", "50 MA is above 200 MA (golden cross)") : textPair("المتوسط 50 تحت 200 (تقاطع موت)", "50 MA is below 200 MA (death cross)"));
    if (rsi !== null) push(textPair("RSI — تشبع/ارتداد", "RSI — extremes/reversal"), rsi <= 30 ? "buy" : rsi >= 70 ? "sell" : "neutral", 1.0, rsi <= 30 ? textPair(`تشبع بيعي (${Math.round(rsi)})`, `Oversold (${Math.round(rsi)})`) : rsi >= 70 ? textPair(`تشبع شرائي (${Math.round(rsi)})`, `Overbought (${Math.round(rsi)})`) : textPair(`محايد (${Math.round(rsi)})`, `Neutral (${Math.round(rsi)})`));
    if (macd !== null && macdSig !== null) push(textPair("MACD — زخم", "MACD — momentum"), macd >= macdSig ? "buy" : "sell", 1.1, macd >= macdSig ? textPair("تقاطع إيجابي", "Positive crossover") : textPair("تقاطع سلبي", "Negative crossover"));
    if (price !== null && ma50 !== null) push(textPair("السعر مقابل المتوسط 50", "Price versus 50 MA"), price >= ma50 ? "buy" : "sell", 0.9, price >= ma50 ? textPair("السعر فوق المتوسط", "Price above average") : textPair("السعر تحت المتوسط", "Price below average"));
    if (price !== null && s1 !== null && r1 !== null) { const mid = (s1 + r1) / 2; push(textPair("الدعم/المقاومة", "Support/resistance"), price <= s1 * 1.02 ? "buy" : price >= r1 * 0.98 ? "sell" : price >= mid ? "buy" : "neutral", 0.8, price <= s1 * 1.02 ? textPair("قرب الدعم", "Near support") : price >= r1 * 0.98 ? textPair("قرب المقاومة", "Near resistance") : textPair("داخل النطاق", "Inside range")); }
    if (chg !== null) push(textPair("الزخم اللحظي", "Intraday momentum"), chg > 0.3 ? "buy" : chg < -0.3 ? "sell" : "neutral", 0.7, `${chg > 0 ? "+" : ""}${Number(chg).toFixed(2)}%`);
    if (rec) push(textPair("توصية المزود (AI)", "Provider recommendation (AI)"), signal(rec), 1.2, sigLabel(signal(rec)) + (num(rec.confidence, rec.score) !== null ? ` · ${Math.round(num(rec.confidence, rec.score))}%` : ""));
    return sigs;
  }
  function consensus(sigs) {
    let buy = 0, sell = 0, neutral = 0, tw = 0;
    sigs.forEach(s => { if (isBuySignalName(s.signal)) buy += s.weight; else if (isSellSignalName(s.signal)) sell += s.weight; else neutral += s.weight; tw += s.weight; });
    if (!tw) return { signal: "watch", agreement: 0, agreementPct: null, score: 0, buy: 0, sell: 0, neutral: 0, count: 0, limited: true };
    const top = Math.max(buy, sell, neutral);
    const sigName = (top === buy && buy > 0) ? "buy" : (top === sell && sell > 0) ? "sell" : "watch";
    const rawAgreement = Math.round(top / tw * 100);
    const limited = sigs.length < 3;
    const agreement = limited ? Math.min(66, rawAgreement) : rawAgreement;
    const coverage = Math.min(1, sigs.length / 6);
    return {
      signal: sigName,
      agreement,
      agreementPct: agreement,
      score: Math.round(agreement * coverage),
      buy: Math.round(buy / tw * 100),
      sell: Math.round(sell / tw * 100),
      neutral: Math.round(neutral / tw * 100),
      count: sigs.length,
      limited
    };
  }
  function limitedConsensusText(count) {
    if (count <= 0) return textPair("لا توجد تغطية استراتيجية", "No strategy coverage");
    if (count === 1) return textPair("اتفاق محدود: استراتيجية واحدة فقط", "Limited agreement: one strategy only");
    return textPair(`اتفاق محدود: ${latinNumber(count)} استراتيجيات فقط`, `Limited agreement: ${latinNumber(count)} strategies only`);
  }
  function consensusMetricText(c) {
    return c.count < 3 ? limitedConsensusText(c.count) : textPair(`${latinNumber(c.agreement)}% اتفاق`, `${latinNumber(c.agreement)}% agreement`);
  }
  function strategyConsensus(asset, tech, rec) {
    const backendRows = strategyRowsFromBackend(rec, asset);
    const backendMetric = strategyAgreementMetric(rec, asset);
    let sigs = backendRows.length ? backendRows : strategySignals(asset, tech, rec);
    if (!backendRows.length && backendMetric.count > 0 && backendMetric.count < sigs.length) {
      const providerRows = sigs.filter(s => /AI|المزود/i.test(String(s.name || "")));
      sigs = (providerRows.length ? providerRows : sigs).slice(0, backendMetric.count);
    }
    const c = backendRows.length ? backendConsensusFromRecords(rec, asset) : consensus(sigs);
    if (backendMetric.count > 0) {
      c.count = backendMetric.count;
      c.limited = backendMetric.limited;
      if (backendMetric.agreementPct !== null) c.agreement = backendMetric.agreementPct;
    }
    if (!sigs.length) return emptyState("لا توجد بيانات كافية للاستراتيجيات", "يحتاج محرك الاتفاق مؤشرات فنية أو توصية من المزود لتشغيل الاستراتيجيات. لن نعرض اتفاقاً تقديرياً عند غياب البيانات.", "الإعدادات", `${ROOT}/settings`);
    const tone = c.limited ? "muted" : signalCardClass(c.signal);
    const rows = sigs.map(s => {
      const unavailable = s.available === false;
      const rowSignal = unavailable ? "insufficient_data" : (finalRecommendationAction(s.signal) || s.signal || "watch");
      const name = isEnglishLanguage() ? s.nameEn || s.name_en || s.name || s.nameAr || s.name_ar || s.id || textPair("استراتيجية", "Strategy") : s.nameAr || s.name_ar || s.name || s.nameEn || s.name_en || s.id || textPair("استراتيجية", "Strategy");
      const note = isEnglishLanguage() ? s.noteEn || s.note_en || s.note || s.noteAr || s.note_ar || (unavailable ? textPair("لم تتوفر بيانات كافية لهذه الاستراتيجية.", "Not enough data is available for this strategy.") : "") : s.noteAr || s.note_ar || s.note || s.noteEn || s.note_en || (unavailable ? textPair("لم تتوفر بيانات كافية لهذه الاستراتيجية.", "Not enough data is available for this strategy.") : "");
      return `<div class="strat-row ${unavailable ? "is-unavailable" : ""}"><span class="strat-name">${h(translateUiText(name))}</span><span class="strat-note">${h(translateUiText(note))}</span><span class="vote ${signalCardClass(rowSignal)}">${h(unavailable ? terminalText("unavailable") : sigLabel(rowSignal))}</span></div>`;
    }).join("");
    const scoreValue = c.limited ? `<b>${h(textPair("توافق محدود", "Limited agreement"))}</b>` : `<b>${h(latinNumber(c.agreement))}%</b>`;
    const biasRows = c.limited ? "" : `<div class="bias-rows">
        <div class="bias-row"><span>${h(textPair("شراء", "Buy"))}</span><div class="mo-bar"><i style="width:${c.buy}%"></i></div><b>${c.buy}%</b></div>
        <div class="bias-row"><span>${h(textPair("بيع", "Sell"))}</span><div class="mo-bar"><i class="bear" style="width:${c.sell}%"></i></div><b>${c.sell}%</b></div>
        <div class="bias-row"><span>${h(textPair("محايد", "Neutral"))}</span><div class="mo-bar"><i class="neut" style="width:${c.neutral}%"></i></div><b>${c.neutral}%</b></div>
      </div>`;
    const kicker = textPair("اتفاق الاستراتيجيات · ليس ثقة الذكاء الاصطناعي ولا التوصية النهائية", "Strategy agreement · not AI confidence or the final recommendation");
    const note = c.limited
      ? textPair("الاتفاق مبني على تغطية استراتيجية محدودة، لذلك لا يُعامل كإشارة قوية حتى لو كانت النسبة الخام 100%.", "Agreement is based on limited strategy coverage, so it is not treated as a strong signal even if the raw percentage is 100%.")
      : textPair("هذه نسبة اتفاق بين الاستراتيجيات فقط؛ القرار النهائي يدمج ثقة الذكاء الاصطناعي وجودة البيانات والعينات والمخاطر والتحليل الفني.", "This is only strategy agreement; the final decision combines AI confidence, data quality, samples, risk, and technical analysis.");
    return `<div class="strategy-consensus">
      <div class="consensus-head"><div><span class="card-kicker">${h(kicker)}</span><strong class="state-${tone}">${h(c.limited ? textPair("توافق محدود", "Limited agreement") : sigLabel(c.signal))}</strong></div><div class="consensus-score">${scoreValue}<small>${h(consensusMetricText(c))} · ${latinNumber(c.count)} ${h(textPair("استراتيجية", "strategies"))}</small></div></div>
      ${biasRows}
      <div class="strat-list">${rows}</div>
      <p class="muted-note">${h(note)}</p>
    </div>`;
  }
  function finalRecommendationModel(asset, detail, rec, c) {
    const a = asset || {};
    const tech = detail && detail.tech || {};
    const source = rec || a;
    const technicalUnavailable = isTechnicalUnavailableDetail(detail, source);
    let recommendation = sharedRecommendation(source, { asset: a, detail });
    if (technicalUnavailable) recommendation = downgradedTechnicalRecommendation(recommendation, detail);
    const backendRows = technicalUnavailable ? [] : strategyRowsFromBackend(rec, a);
    const sigs = backendRows.length ? backendRows : strategySignals(a, tech, rec);
    const consensusResult = backendRows.length ? backendConsensusFromRecords(rec, a) : consensus(sigs);
    const backendMetric = strategyAgreementMetric(rec, a);
    if (backendMetric.count > 0) {
      consensusResult.count = backendMetric.count;
      consensusResult.limited = backendMetric.limited;
      if (backendMetric.agreementPct !== null) consensusResult.agreement = backendMetric.agreementPct;
    }
    const confidence = recommendation.confidence;
    const samples = sampleCountFromRec(rec);
    const dataQuality = recommendation.dataQuality.status;
    const technicalState = technicalSnapshot({ ...a, ...(rec || {}) }, tech);
    const riskLevel = recommendation.riskLevel;
    const consensusStrong = consensusResult.agreement >= 70 && consensusResult.count >= 3;
    const aiStrong = confidence !== null && confidence >= 70;
    const dataStrong = dataQuality === "complete" && samples !== null && samples > 0;
    const technicalStrong = !technicalUnavailable && technicalState.available && (!rec || rec.technicalAvailable !== false);
    const riskStrong = riskLevel !== "high";
    return {
      action: recommendation.status,
      consensusResult,
      confidence,
      samples,
      dataQuality,
      technicalAvailable: technicalStrong,
      technicalUnavailable,
      riskLevel,
      consensusStrong,
      aiStrong,
      dataStrong,
      finalStrongBuy: recommendation.status === "buy" && consensusStrong && aiStrong && dataStrong && technicalStrong && riskStrong,
      canFollowTrade: technicalUnavailable ? false : recommendation.canFollowTrade,
      normalizedRecommendation: recommendation,
      explanation: recommendation.reason
    };
  }
  function finalRecommendationCard(asset, detail, rec, c) {
    const model = finalRecommendationModel(asset, detail, rec, c);
    const confidenceText = model.confidence === null ? terminalText("unavailable") : `${latinNumber(Math.round(model.confidence))}%`;
    const samplesText = model.samples === null ? terminalText("unavailable") : latinNumber(model.samples);
    const finalLabel = recommendationLabel(model.normalizedRecommendation);
    const metrics = [
      [textPair("التوصية النهائية", "Final recommendation"), finalLabel, textPair("النهائي", "Final")],
      [textPair("اتفاق الاستراتيجيات", "Strategy agreement"), consensusMetricText(model.consensusResult), textPair("الاتفاق", "Consensus")],
      [textPair("ثقة الذكاء الاصطناعي", "AI confidence"), confidenceText, textPair("ثقة الذكاء الاصطناعي", "AI confidence")],
      [textPair("التحليل الفني", "Technical analysis"), model.technicalAvailable ? textPair("متاح من المزود", "Available from provider") : terminalText("unavailable"), textPair("التحليل الفني", "Technical")],
      [textPair("جودة البيانات / العينات", "Data quality / samples"), `${dataQualityLabel(model.dataQuality)} · ${samplesText}`, textPair("البيانات", "Data")],
      [textPair("المخاطر", "Risk"), riskShort(model.riskLevel), textPair("المخاطر", "Risk")]
    ];
    return `<article class="panel final-recommendation-card ${model.technicalUnavailable ? "muted" : signalCardClass(model.action)}">
      <div class="final-recommendation-head">
        <div><span class="eyebrow">${h(textPair("التوصية النهائية", "Final recommendation"))}</span><h2>${h(finalLabel)}</h2></div>
        <span class="state-badge ${model.technicalUnavailable ? "muted" : signalCardClass(model.action)}">${h(finalLabel)}</span>
      </div>
      <div class="final-signal-grid">${metrics.map(([label, value, helper]) => detailCard(label, value, helper)).join("")}</div>
      <p class="recommendation-explanation">${h(translateUiText(model.explanation || terminalText("unavailable")))}</p>
    </article>`;
  }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(translateUiText(helper))}</span><strong>${h(String(value))}</strong><small>${h(translateUiText(label))}</small></article>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(translateUiText(kicker))}</span><h2>${title}</h2><p>${h(translateUiText(body))}</p></section>`; }
  function unavailableSection(response, fallbackBody, label, href) {
    const unavailableTitle = response && response.routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : UNAVAILABLE_MESSAGE;
    const body = formatProviderError((response && response.message) || fallbackBody || UNAVAILABLE_MESSAGE, { empty: fallbackBody || UNAVAILABLE_MESSAGE });
    return emptyState(unavailableTitle, body, label, href);
  }
  function selectionEmptyState() { return emptyState(SELECTION_EMPTY_STATE_AR, SELECTION_EMPTY_STATE_EN, "", ""); }
  function emptyState(title, body, label, href) {
    const cleanTitle = translateUiText(formatProviderError(title, { empty: UNAVAILABLE_MESSAGE }));
    const cleanBody = translateUiText(formatProviderError(body, { empty: UNAVAILABLE_MESSAGE }));
    return `<div class="empty-state compact"><span class="empty-glyph">◎</span><h3>${h(cleanTitle)}</h3><p>${h(cleanBody)}</p><div class="row-actions">${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(translateUiText(label))}</a>` : ""}<button class="ghost-btn" data-retry>${h(terminalText("retry"))}</button></div></div>`;
  }
  function miniEmpty() { return `<div class="empty-state compact"><p>${h(textPair("لا توجد بيانات حالياً من المزود.", "No provider data is available right now."))}</p></div>`; }
  function marketUnavailable(m, data) { const provider = providerCopy(); const message = translateUiText(formatProviderError(data && data.message, { empty: provider.copy })); return `<section class="panel unavailable-panel"><span class="empty-glyph">⚠</span><h2>${h(textPair(`بيانات ${marketName(m)} غير متاحة`, `${marketName(m)} data is unavailable`))}</h2><p>${h(message)}</p>
    <div class="detail-grid">${detailCard(textPair("الرموز المدعومة", "Supported symbols"), String(m.symbols.length), "Symbols")}${detailCard(terminalText("currency"), m.currency, "Currency")}${detailCard(textPair("الحالة", "Status"), provider.label, "Status")}${detailCard(terminalText("lastUpdated"), new Date().toLocaleTimeString(isEnglishLanguage() ? "en-US" : "ar-KW", { hour: "2-digit", minute: "2-digit" }), "Updated")}</div>
    <div class="chip-row">${m.symbols.map(s => `<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div>
    <div class="row-actions"><button class="ghost-btn" data-retry>${h(terminalText("retry"))}</button></div></section>`; }
  function disclaimer() {
    return `<section class="disclaimer-note">${h(textPair("تنبيه: جميع المحتويات لأغراض تعليمية ومعلوماتية فقط ولا تُعد نصيحة استثمارية. التداول ينطوي على مخاطرة قد تصل لكامل رأس المال.", "Notice: All content is for educational and informational purposes only and is not investment advice. Trading involves risk that may include the full loss of capital."))}</section>`;
  }
  function loading() { return `<section class="loading-panel"><span class="pulse-orb"></span><h2>${h(terminalText("loading.title"))}</h2><p>${h(terminalText("loading.body"))}</p></section>`; }

  /* asset icon system */
  function logoUrl(s, base, type) {
    if (type === "crypto") { const k = base.replace(/USDT?$/, "").replace(/USD$/, "").toLowerCase(); return k ? `https://assets.coincap.io/assets/icons/${k}@2x.png` : ""; }
    if (type === "stock" || type === "fund") {
      if (/^[A-Z]{1,5}$/.test(base) && !s.includes(".")) return `https://financialmodelingprep.com/image-stock/${base}.png`;
      const dom = DOMAINS[s] || DOMAINS[base];
      if (dom) return `https://www.google.com/s2/favicons?domain=${dom}&sz=128`;
    }
    return "";
  }
  function logo(a, size) {
    const s = sym(a.symbol || a.ticker || a.code || "SFM"), type = assetType(s, a.assetType || a.type), cls = `asset-logo ${type}${size ? " " + size : ""}`;
    const base = s.replace(/[.\-=].*$/, "");
    let style = "", inner = base.slice(0, 3) || "SFM";
    if (type === "crypto") { const k = base.replace(/USDT?$/, "").replace(/USD$/, ""); const cr = CRYPTO[k]; if (cr) { style = `background:${cr[1]};color:#fff`; inner = cr[0]; } }
    else if (type === "commodity") {
      if (/XAU|GOLD/i.test(s)) return `<span class="${cls}" style="background:linear-gradient(135deg,#ffd76a,#b8860b);color:#3a2a00" aria-hidden="true">Au</span>`;
      if (/XAG|SILVER/i.test(s)) return `<span class="${cls}" style="background:linear-gradient(135deg,#dfe6ee,#9aa6b2);color:#23303a" aria-hidden="true">Ag</span>`;
      if (/WTI|BRENT|OIL/i.test(s)) return `<span class="${cls}" style="background:#1a1a1a;color:#ffcf3f" aria-hidden="true">⛽</span>`;
      return `<span class="${cls}" aria-hidden="true">${h(base.slice(0, 2))}</span>`;
    }
    else if (type === "forex") { return `<span class="${cls}" aria-hidden="true"><b>${h(base.slice(0, 3))}</b><i>${h(base.slice(3, 6))}</i></span>`; }
    else {
      const suffix = s.includes(".") ? s.split(".").pop() : ""; if (GULF_FLAG[suffix]) return `<span class="${cls}" aria-hidden="true">${GULF_FLAG[suffix]}</span>`;
      const br = BRAND[s] || BRAND[base]; if (br) { style = `background:${br[2]};color:${br[1]}`; inner = br[0]; }
    }
    const url = logoUrl(s, base, type);
    const img = url ? `<img class="logo-img" src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="this.remove()" />` : "";
    return `<span class="${cls}" style="${style}" aria-hidden="true">${h(inner)}${img}</span>`;
  }
  function marketGlyph(m) { const G = { forex: "💱", "us-stocks": "🇺🇸", kuwait: "🇰🇼", saudi: "🇸🇦", uae: "🇦🇪", qatar: "🇶🇦", bahrain: "🇧🇭", oman: "🇴🇲", europe: "🇪🇺", asia: "🌏", crypto: "₿", commodities: "🛢", indices: "📊", etfs: "📦", technology: "💻", ai: "🤖", semiconductors: "🔌", energy: "⚡", banking: "🏦", healthcare: "💊", food: "🍔" }; return G[m.id] || "📈"; }

  function status() {
    const s = providerCopy(), pill = document.getElementById("provider-status");
    if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span>${h(s.title)}</span>`;
    const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy");
    if (dot) dot.className = `status-dot ${s.className}`;
    if (title) title.textContent = s.title;
    if (copy) copy.textContent = s.copy;
    const session = document.getElementById("session-status"), market = currentMarket();
    if (session) session.textContent = `${marketName(market)} · ${market.currency}`;
  }
  function ticker() {
    const row = document.getElementById("ticker-row"); if (!row) return;
    const visible = isQuickTickerVisible();
    const items = visible ? tickerAssets() : [];
    const toggle = document.getElementById("ticker-toggle");
    if (toggle) {
      toggle.classList.toggle("is-off", !visible);
      toggle.setAttribute("aria-pressed", visible ? "true" : "false");
      toggle.textContent = terminalText(visible ? "ticker.hide" : "ticker.show");
    }
    row.hidden = !visible || !items.length;
    row.classList.toggle("is-empty", !items.length);
    if (row.hidden) { row.innerHTML = ""; return; }
    row.innerHTML = items.map((a) => {
      const q = normalizeQuote(a);
      const s = q.canonicalSymbol || q.symbol;
      const p = q.price;
      const chg = q.changePercent;
      const label = q.displaySymbol || displaySymbolFor(s);
      const amount = price(p, currency({ ...q, symbol: s }));
      return `<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({ ...q, symbol: s })}<span><strong>${h(label)}</strong><small class="ltr">${h(amount)} <i class="${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</i></small></span></button>`;
    }).join("");
  }
  function isQuickTickerVisible() {
    return state.settings.quickTickerVisible !== false;
  }
  function tickerAssets() {
    const market = currentMarket();
    const selectedMarket = market.id;
    const selectedCategory = currentSelectedCategory();
    const source = allRecommendationSources();
    return unique(market.symbols || [])
      .map((symbol) => {
        const matched = findAssetForSymbol(symbol, source) || {};
        return normalizeQuote(norm({ ...matched, symbol }));
      })
      .filter((asset) => isAssetAllowedForSelection(asset, selectedMarket, selectedCategory))
      .slice(0, 8);
  }
  function statusBar() {
    const statsHost = document.getElementById("topbar-stats");
    const bar = document.getElementById("terminal-statusbar");
    const rec = recs(), mk = arr(state.markets.markets || state.markets.data || state.markets.results), p = providerCopy();
    const cells = [[textPair("البيانات اللحظية", "Real-time"), p.className === "online" ? textPair("متصلة", "Connected") : textPair("غير متصلة", "Disconnected"), textPair("البيانات اللحظية", "Real-time")], [terminalText("market"), mk.length || MARKETS.length, terminalText("market")], [textPair("الأصول المحللة", "Analyzed assets"), rec.length || "--", textPair("الأصول المحللة", "Analyzed")], [terminalText("watchlist"), state.watch.length, terminalText("watchlist")], [terminalText("lastUpdated"), new Date().toLocaleTimeString(isEnglishLanguage() ? "en-US" : "ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), textPair("آخر تحديث", "Updated")]];
    const metricCellsHtml = cells.map(([l, v, hp]) => `<div class="sb-cell"><span>${h(l)}</span><strong>${h(String(v))}</strong><em>${h(hp)}</em></div>`).join("");
    const statusCellHtml = `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${h(p.className === "online" ? textPair("النظام يعمل", "System online") : textPair("بانتظار المزود", "Waiting for provider"))}</strong></div>`;
    if (statsHost) statsHost.innerHTML = metricCellsHtml;
    if (bar) bar.innerHTML = statsHost ? "" : metricCellsHtml + statusCellHtml;
    renderMarketSelector();
  }

  /* ───────────────────── Actions ───────────────────── */
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(textPair(`تمت إضافة ${s} لقائمة المتابعة.`, `${s} added to watchlist.`)); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x => x !== s); write(keys.watch, state.watch); toast(textPair(`تمت إزالة ${s}.`, `${s} removed.`)); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{ symbol: s, type: "signal", title: textPair(`متابعة ${s}`, `Watch ${s}`), message: textPair("تنبيه محلي محفوظ. يحتاج مزود أسعار لتفعيله تلقائياً.", "Local alert saved. A price provider is required to trigger it automatically."), createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(textPair(`تم إنشاء تنبيه لـ ${s}.`, `Alert created for ${s}.`)); render(); }
  function deleteAlert(i) { state.alerts.splice(Number(i), 1); write(keys.alerts, state.alerts); render(); }
  function tradeDraftFromAsset(asset, sourceType = "manual") {
    const a = normalizeQuote(norm(asset)), recommendation = sharedRecommendation(a), action = recommendation.status, now = new Date().toISOString(), entry = num(a.entryPrice, a.entry, a.currentPrice, a.price, a.lastPrice);
    if (!hasTradeableQuote(a, recommendation)) return null;
    return {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      symbol: a.symbol,
      assetName: a.name || a.assetName || a.symbol,
      assetLogo: a.assetLogo || a.logoUrl || null,
      market: a.market || "",
      action,
      entryPrice: entry,
      currentPrice: num(a.currentPrice, a.price, a.lastPrice, entry),
      targetPrice: recommendation.targetPrice,
      stopLoss: recommendation.stopLoss,
      confidence: recommendation.confidence,
      riskLevel: riskKey(a.riskLevel || a.risk),
      timeframe: a.timeframe || a.duration || (action === "watch" ? terminalText("underWatch") : textPair("1-3 أسابيع", "1-3 weeks")),
      status: action === "wait" ? "waiting" : action === "watch" ? "watching" : "open",
      openedAt: now,
      updatedAt: now,
      provider: a.provider || a.source || "",
      sourceSignalId: a.sourceSignalId || a.source_signal_id || null,
      sourceType,
      notes: a.notes || recommendation.reason || a.reason || "",
      currency: a.currency || currency(a),
      payload: { ...a, normalizedRecommendation: recommendation }
    };
  }
  async function persistFollowedTrade(draft) {
    if (!draft) return toast(textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed."));
    const result = await post("/followed-trades", draft);
    if (result.ok) {
      toast(textPair("تمت إضافة الصفقة إلى أداء الصفقات.", "Trade added to trade performance."));
    } else {
      state.localTrades = [draft, ...state.localTrades].slice(0, 80);
      write(keys.followed, state.localTrades);
      toast(textPair("تم حفظ الصفقة محلياً؛ سجّل الدخول أو طبّق migrations للحفظ في قاعدة البيانات.", "Trade saved locally; sign in or apply migrations to save it in the database."));
    }
    await refreshFollowedTrades(false);
  }
  function followRecommendationTrade(raw) {
    const s = sym(raw), rec = matchRec(s);
    if (!rec) return toast(textPair("لم أجد توصية محفوظة لهذا الرمز حالياً.", "No saved recommendation was found for this symbol."));
    const recommendation = sharedRecommendation(rec);
    if (!hasTradeableQuote(rec, recommendation)) return toast(rec.unavailableReason ? unavailablePriceText(rec) : recommendation.reason || textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed."));
    persistFollowedTrade(tradeDraftFromAsset(rec, "recommendation_card"));
  }
  async function refreshFollowedTrades(force) {
    const data = await get(`/followed-trades${force ? "?refresh=1" : ""}`);
    if (data.ok) {
      state.followed = data;
      if (force) toast(textPair("تم تحديث أسعار صفقات المتابعة.", "Followed trade prices were updated."));
      render();
      afterRoute();
    } else {
      toast(textPair("تعذر تحديث صفقات المتابعة حالياً.", "Followed trades cannot be updated right now."));
    }
  }
  async function runSignalRefresh() {
    const result = await post("/market/signals/refresh", { symbols: defaults, force: true });
    if (!result.ok) {
      await get(`/market/signals?symbols=${encodeURIComponent(defaults.join(","))}&refresh=1&limit=${defaults.length}`);
      toast(textPair("تم تشغيل فحص إشارات محلي؛ الحفظ التلقائي يحتاج صلاحية قاعدة البيانات.", "Local signal scan started; automatic saving requires database permissions."));
    } else {
      toast(textPair("تم تشغيل فحص الإشارات وحفظ المرشحات المتاحة.", "Signal scan started and available candidates were saved."));
    }
    await refreshFollowedTrades(true);
  }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.textContent = message; root.appendChild(node); setTimeout(() => node.remove(), 3200); }

  // form submits via delegation (forms re-render, so use document-level submit)
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "alert-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast(textPair("اكتب رمزاً.", "Enter a symbol.")); state.alerts = [{ symbol: s, type: f.get("type"), value: f.get("value"), title: textPair(`تنبيه ${s}`, `${s} alert`), createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(textPair(`تم إنشاء تنبيه لـ ${s}.`, `Alert created for ${s}.`)); render(); }
    if (e.target.id === "holding-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast(textPair("اكتب رمزاً.", "Enter a symbol.")); state.holdings = [{ symbol: s, qty: f.get("qty"), entry: f.get("entry") }, ...state.holdings].slice(0, 50); write(keys.holdings, state.holdings); toast(textPair(`تمت إضافة مركز ${s}.`, `${s} position added.`)); render(); }
    if (e.target.id === "followed-trade-form") {
      e.preventDefault();
      const f = new FormData(e.target);
      const s = sym(f.get("symbol"));
      if (!s) return toast(textPair("اكتب رمزاً.", "Enter a symbol."));
      const draft = tradeDraftFromAsset({
        symbol: s,
        action: f.get("action"),
        entryPrice: f.get("entryPrice"),
        currentPrice: f.get("entryPrice"),
        targetPrice: f.get("targetPrice"),
        stopLoss: f.get("stopLoss"),
        confidence: f.get("confidence"),
        notes: f.get("notes"),
        status: f.get("action") === "wait" ? "waiting" : f.get("action") === "watch" ? "watching" : "open",
        provider: "manual"
      }, "manual");
      await persistFollowedTrade(draft);
      e.target.reset();
    }
    if (e.target.id === "settings-form") {
      e.preventDefault();
      const f = new FormData(e.target);
      state.settings.defaultMarket = f.get("defaultMarket");
      state.settings.risk = f.get("risk");
      state.settings.signalMinConfidence = Math.max(0, Math.min(95, Number(f.get("signalMinConfidence")) || 70));
      state.settings.quickTickerVisible = f.get("quickTickerVisible") === "on";
      state.settings.enabledMarkets = f.getAll("enabledMarkets").map(String).filter(Boolean);
      state.settings.buyAlertsEnabled = f.get("buyAlertsEnabled") === "on";
      state.settings.sellAlertsEnabled = f.get("sellAlertsEnabled") === "on";
      state.settings.waitAlertsEnabled = f.get("waitAlertsEnabled") === "on";
      state.settings.inAppAlertsEnabled = f.get("inAppAlertsEnabled") === "on";
      state.settings.emailAlertsEnabled = f.get("emailAlertsEnabled") === "on";
      write(keys.settings, state.settings);
      const lang = currentLanguage();
      saveSignalPreferences(signalPrefs()).then(ok => toast(ok ? settingsT("savedPreferences", lang) : settingsT("savedLocal", lang)));
      retryRoute();
    }
  });
  document.addEventListener("click", (e) => {
    const acc = e.target.closest("[data-acc]"); if (acc) { acc.closest(".accordion").classList.toggle("is-open"); }
    const delH = e.target.closest("[data-remove-holding]"); if (delH) { state.holdings.splice(Number(delH.dataset.removeHolding), 1); write(keys.holdings, state.holdings); render(); }
  });

  /* ───────────────────── Selectors / utils ───────────────────── */
  function legacyRecsFrom(data) { return arr((data && (data.recommendations || data.items || data.data || data.results))).map(norm).filter(x => x.symbol); }
  function signalsFrom(data) { return arr(data && (data.signals || data.items || data.data || data.results)).map(signalToRec).filter(x => x.symbol); }
  function recsFrom(data) { return mergeRecLists(signalsFrom(data), legacyRecsFrom(data)); }
  function allRecommendationSources() { return mergeRecLists(signalsFrom(state.signals), legacyRecsFrom(state.rec)); }
  function recs() { return filterRecommendationsForSelection(allRecommendationSources(), state.settings.defaultMarket, currentSelectedCategory()); }
  function currentSelectedCategory() { return state.settings.selectedCategory || categoryFromSelection(state.settings.defaultMarket); }
  function filterRecommendationsForSelection(items, selectedMarket, selectedCategory) {
    return arr(items).map(norm).filter(asset => isAssetAllowedForSelection(asset, selectedMarket, selectedCategory));
  }
  function categoryFromSelection(selectedMarket) {
    const id = String(selectedMarket || "").trim().toLowerCase();
    if (id === "commodities") return "commodity";
    if (id === "etfs") return "fund";
    if (id === "indices") return "index";
    return CATEGORY_MARKET_IDS.has(id) ? id : "all";
  }
  function normalizedCategory(value) {
    const raw = String(value || "all").trim().toLowerCase().replace(/[_-]+/g, " ");
    if (!raw || raw === "all" || raw === "all assets") return "all";
    if (["stocks", "equities", "equity"].includes(raw)) return "stock";
    if (["tech", "tech stock", "tech stocks", "technology stocks"].includes(raw)) return "technology";
    if (["semiconductor", "semiconductor stocks"].includes(raw)) return "semiconductors";
    if (["commodities", "metals"].includes(raw)) return "commodity";
    if (["indices", "indexes", "benchmarks"].includes(raw)) return "index";
    if (["etf", "etfs", "funds"].includes(raw)) return "fund";
    if (raw === "fx" || raw === "currency pairs") return "forex";
    return raw;
  }
  function fieldText(asset, keys) {
    const providerStatus = asset && typeof asset.providerStatus === "object" ? asset.providerStatus : {};
    const metadataDiagnostics = asset && typeof asset.metadataDiagnostics === "object" ? asset.metadataDiagnostics : {};
    for (const source of [asset || {}, providerStatus || {}, metadataDiagnostics || {}]) {
      for (const key of keys) {
        const value = String(source[key] ?? "").trim();
        if (value) return value;
      }
    }
    return "";
  }
  function upperField(asset, keys) { return fieldText(asset, keys).toUpperCase(); }
  function countryForAsset(asset) {
    const explicit = upperField(asset, ["country", "countryCode", "country_code", "finalCountry"]);
    if (explicit) return explicit;
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    if (/\.KW$/i.test(s)) return "KUWAIT";
    if (/\.(SR|SA)$/i.test(s)) return "SAUDI ARABIA";
    if (/\.(AE|DU|AD)$/i.test(s)) return "UAE";
    if (/\.QA$/i.test(s)) return "QATAR";
    if (/\.BH$/i.test(s)) return "BAHRAIN";
    if (/\.OM$/i.test(s)) return "OMAN";
    if (!/\.[A-Z]{1,3}$/i.test(s) && inferredAssetType(asset) === "stock") return "US";
    return "";
  }
  function inferredAssetType(asset) {
    const explicit = assetType(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol, asset.assetType || asset.asset_type || asset.quoteType || asset.instrumentType || asset.category);
    return explicit || "stock";
  }
  function classificationForAsset(asset) {
    return [
      fieldText(asset, ["sector", "category"]),
      fieldText(asset, ["industry"]),
      fieldText(asset, ["market", "marketName", "market_name", "finalMarket"]),
      fieldText(asset, ["exchange", "exchangeName", "exchange_name"])
    ].filter(Boolean).join(" ").toUpperCase();
  }
  function localMarketDecision(asset, selectedMarket) {
    const id = String(selectedMarket || "").toLowerCase();
    const rule = STRICT_LOCAL_MARKETS[id];
    if (!rule) return { allowed: true, reason: "not_strict_local_market" };
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    const exchange = upperField(asset, ["exchange", "exchangeName", "exchange_name", "exchangeCode", "exchange_code", "finalExchange", "finalExchangeCode"]);
    const market = upperField(asset, ["market", "marketName", "market_name", "finalMarket"]);
    const country = countryForAsset(asset);
    const currencyCode = currency(asset);
    const type = inferredAssetType(asset);
    const exchangeOk = rule.exchange.test(exchange) || rule.suffix.test(s);
    const marketOk = rule.market.test(market) || rule.suffix.test(s);
    const venueOk = exchangeOk || marketOk || rule.suffix.test(s);
    const countryOk = rule.countries.includes(country) || rule.suffix.test(s);
    const currencyOk = currencyCode === rule.currency;
    const typeOk = type === "stock";
    if (!venueOk) return { allowed: false, reason: "venue_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!countryOk) return { allowed: false, reason: "country_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!currencyOk) return { allowed: false, reason: "currency_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    if (!typeOk) return { allowed: false, reason: "asset_type_mismatch", rule, exchange, market, country, currency: currencyCode, type };
    return { allowed: true, reason: "matched_strict_local_market", rule, exchange, market, country, currency: currencyCode, type };
  }
  function usMarketDecision(asset, selectedMarket) {
    if (!["us-stocks", "technology"].includes(String(selectedMarket || "").toLowerCase())) return { allowed: true, reason: "not_us_market" };
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol);
    const type = inferredAssetType(asset);
    const exchange = upperField(asset, ["exchange", "exchangeName", "exchange_name", "exchangeCode", "exchange_code"]);
    const country = countryForAsset(asset);
    const currencyCode = currency(asset);
    const hasNonUsSuffix = /\.[A-Z]{1,3}$/i.test(s) && !/\.US$/i.test(s);
    const countryOk = !country || ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(country);
    const exchangeOk = !exchange || US_EXCHANGE_RE.test(exchange);
    if (type !== "stock") return { allowed: false, reason: "us_market_asset_type_mismatch", type };
    if (currencyCode !== "USD") return { allowed: false, reason: "us_market_currency_mismatch", currency: currencyCode, type };
    if (!countryOk || !exchangeOk || hasNonUsSuffix) return { allowed: false, reason: "us_market_country_exchange_mismatch", exchange, country, currency: currencyCode, type };
    return { allowed: true, reason: "matched_us_market", exchange, country, currency: currencyCode, type };
  }
  function categoryDecision(asset, selectedMarket, selectedCategory) {
    const category = normalizedCategory(selectedCategory || categoryFromSelection(selectedMarket));
    if (category === "all") return { allowed: true, reason: "category_all", category };
    const type = inferredAssetType(asset);
    const s = sym(asset.symbol || asset.displaySymbol || asset.canonicalSymbol || asset.providerSymbolUsed || asset.providerSymbol).replace(/[-=].*$/, "").replace(/\..*$/, "");
    const classification = classificationForAsset(asset);
    if (category === "stock") return { allowed: type === "stock", reason: type === "stock" ? "matched_stock_category" : "category_asset_type_mismatch", category, type };
    if (["crypto", "forex", "commodity", "fund", "index"].includes(category)) return { allowed: type === category, reason: type === category ? `matched_${category}_category` : "category_asset_type_mismatch", category, type };
    if (category === "technology") {
      const technologyMatch = TECHNOLOGY_SYMBOLS.has(s) || /\b(TECHNOLOGY|INFORMATION TECHNOLOGY|SOFTWARE|CLOUD|CYBERSECURITY|SEMICONDUCTORS?|ELECTRONIC COMPONENTS?)\b/.test(classification);
      const us = usMarketDecision(asset, "technology");
      return { allowed: us.allowed && technologyMatch, reason: us.allowed && technologyMatch ? "matched_technology_category" : (["crypto", "forex", "commodity"].includes(type) ? "technology_category_asset_type_mismatch" : "technology_category_mismatch"), category, type };
    }
    if (category === "semiconductors") {
      const semisMatch = SEMICONDUCTOR_SYMBOLS.has(s) || /\b(SEMICONDUCTORS?|SEMICONDUCTOR EQUIPMENT|SEMICONDUCTOR MATERIALS?|INTEGRATED CIRCUITS?|CHIP(?:S|MAKER|MAKERS)?)\b/.test(classification);
      return { allowed: type === "stock" && semisMatch, reason: type === "stock" && semisMatch ? "matched_semiconductors_category" : (["crypto", "forex", "commodity"].includes(type) ? "semiconductors_category_asset_type_mismatch" : "semiconductors_category_mismatch"), category, type };
    }
    return { allowed: false, reason: "unknown_category", category, type };
  }
  function isAssetAllowedForSelection(asset, selectedMarket, selectedCategory) {
    const local = localMarketDecision(asset, selectedMarket);
    if (!local.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, local); return false; }
    const us = usMarketDecision(asset, selectedMarket);
    if (!us.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, us); return false; }
    const category = categoryDecision(asset, selectedMarket, selectedCategory);
    if (!category.allowed) { warnSelectionExclusion(asset, selectedMarket, selectedCategory, category); return false; }
    return true;
  }
  function warnSelectionExclusion(asset, selectedMarket, selectedCategory, decision) {
    if (!DEV_DIAGNOSTICS) return;
    const marketId = String(selectedMarket || "").toLowerCase();
    const category = normalizedCategory(selectedCategory || categoryFromSelection(selectedMarket));
    const type = decision.type || inferredAssetType(asset);
    const payload = {
      symbol: asset.symbol,
      exchange: asset.exchange || asset.exchangeName || asset.exchangeCode,
      market: asset.market || asset.marketName,
      country: asset.country || asset.countryCode || decision.country || countryForAsset(asset),
      currency: asset.currency || decision.currency || currency(asset),
      assetType: asset.assetType || asset.asset_type || type,
      sector: asset.sector,
      industry: asset.industry,
      category,
      reason: decision.reason
    };
    if (marketId === "qatar" && (payload.currency !== "QAR" || !["QA", "QATAR"].includes(String(payload.country || "").toUpperCase()))) console.warn("[trader] Excluding non-Qatar asset from Qatar selection", payload);
    else if (marketId === "kuwait" && (payload.currency !== "KWD" || !["KW", "KUWAIT"].includes(String(payload.country || "").toUpperCase()))) console.warn("[trader] Excluding non-Kuwait asset from Kuwait selection", payload);
    else if (category === "technology" && ["crypto", "forex", "commodity"].includes(type)) console.warn("[trader] Excluding non-technology asset from technology selection", payload);
    else console.warn("[trader] Excluding asset outside selected market/category", payload);
  }
  function mergeRecLists(primary, fallback) {
    const map = new Map();
    fallback.forEach(item => { if (item.symbol) map.set(sym(item.symbol), item); });
    primary.forEach(item => {
      const key = sym(item.symbol);
      if (key) map.set(key, { ...(map.get(key) || {}), ...item });
    });
    return Array.from(map.values());
  }
  function signalToRec(x) {
    x = x || {};
    const base = norm({ ...x, name: x.assetName || x.asset_name || x.name });
    const currentPrice = num(x.currentPrice, x.current_price, x.price, base.price);
    const targetPrice = num(x.targetPrice, x.target_price, x.target, base.target);
    const stopLoss = num(x.stopLoss, x.stop_loss, x.stop, base.stopLoss);
    const reasons = arr(x.reasons).map(String).filter(Boolean);
    const warnings = arr(x.warnings).map(String).filter(Boolean);
    return {
      ...base,
      assetType: x.assetType || x.asset_type || base.assetType,
      market: x.market || base.market,
      currency: x.currency || base.currency,
      signal: x.finalRecommendation ?? x.final_recommendation ?? x.finalRecommendationAr ?? x.final_recommendation_ar ?? x.action ?? base.signal,
      recommendation: x.finalRecommendation ?? x.final_recommendation ?? x.finalRecommendationAr ?? x.final_recommendation_ar ?? x.action ?? base.recommendation,
      action: x.finalRecommendation ?? x.final_recommendation ?? x.action ?? base.action,
      id: x.id || base.id,
      sourceSignalId: x.id || x.sourceSignalId || x.source_signal_id || base.sourceSignalId,
      actionLabelAr: x.actionLabelAr || x.action_label_ar,
      confidence: num(x.aiConfidence, x.ai_confidence, x.confidence, base.confidence),
      aiConfidence: num(x.aiConfidence, x.ai_confidence, x.confidence, base.aiConfidence),
      score: num(x.finalScore, x.confidence, base.score),
      price: currentPrice,
      currentPrice,
      target: targetPrice,
      targetPrice,
      stopLoss,
      stop: stopLoss,
      riskLevel: x.riskLevel || x.risk_level || base.riskLevel,
      dataQuality: (x.dataQualityStatus && x.dataQualityStatus.status) || x.dataQuality || x.data_quality,
      dataQualityStatus: x.dataQualityStatus || x.data_quality_status,
      samples: x.samples,
      finalRecommendation: x.finalRecommendation ?? x.final_recommendation,
      finalRecommendationAr: x.finalRecommendationAr ?? x.final_recommendation_ar,
      finalScore: x.finalScore ?? x.final_score,
      strategyCount: x.strategyCount ?? x.strategy_count,
      strategyAgreement: x.strategyAgreement,
      strategyConsensus: x.strategyConsensus,
      strategies: x.strategies,
      technicalAvailable: x.technicalAvailable ?? x.technical_available,
      provider: x.provider || base.provider || "",
      source: x.provider || base.source,
      timeframe: x.timeframe || base.timeframe,
      reasons,
      warnings,
      reason: reasons[0] || x.reason || base.reason,
      summary: x.summary || reasons.join(" · "),
      status: x.status || (x.action === "wait" ? "انتظار" : x.action === "watch" ? "تحت المتابعة" : "open"),
      scoreBreakdown: x.scoreBreakdown || x.score_breakdown,
      technicalSummary: x.technicalSummary || x.technical_summary,
      newsSentimentSummary: x.newsSentimentSummary || x.news_sentiment_summary,
      explanation: x.explanation || x.explanationAr || x.explanationEn,
      explanationAr: x.explanationAr,
      explanationEn: x.explanationEn,
      disclaimer: x.disclaimer,
      disclaimerAr: x.disclaimerAr,
      disclaimerEn: x.disclaimerEn,
      lastUpdated: x.lastUpdated || x.last_updated || x.created_at
    };
  }
  function signalNotifications() { return arr(state.signalAlerts.notifications || state.signalAlerts.items || state.signalAlerts.data || state.signalAlerts.results); }
  function signalHistoryItems() {
    const rows = arr(state.signals.history || state.signals.signalHistory || state.signals.signal_history);
    if (rows.length) return rows.map(row => ({
      title: row.title || textPair(`تغيرت الإشارة على ${sym(row.symbol)}`, `Signal changed on ${sym(row.symbol)}`),
      symbol: row.symbol,
      message: row.message || `${sigLabel(row.old_action || row.oldAction || "watch")} → ${sigLabel(row.new_action || row.newAction || "watch")} · ${latinNumber(row.new_confidence || row.newConfidence)}%`
    }));
    return signalNotifications().filter(item => String(item.event || "").includes("change") || String(item.title || "").includes("تغير")).slice(0, 4);
  }
  function smartAlerts() { return [...signalNotifications(), ...arr(state.rec.smartAlerts || state.rec.alerts || state.rec.signals)]; }
  function newsItems() { return arr(state.news.items || state.news.articles || state.news.news || state.news.data || state.news.results); }
  function trades() { return mergeTradeLists(arr(state.followed.followedTrades || state.followed.trades || state.followed.items || state.followed.data || state.followed.followed), state.localTrades || []); }
  function matchRec(s) { const k = sym(s); return recs().find(x => sym(x.symbol) === k) || null; }
  function topPicks(r, n) { return [...r].sort((a, b) => (num(b.aiConfidence, b.ai_confidence, b.confidence, b.score) || 0) - (num(a.aiConfidence, a.ai_confidence, a.confidence, a.score) || 0)).slice(0, n); }
  function sortMovers(r) {
    const normalized = r.map(x => normalizeQuote(norm(x)));
    const withChg = normalized.filter(x => isValidPrice(x.price) && isValidChange(x.changePercent));
    const gainers = withChg.filter(x => x.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
    const losers = withChg.filter(x => x.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
    return { gainers, losers, active: topPicks(normalized, normalized.length) };
  }
  function mergeTradeLists(server, local) {
    const seen = new Set(), output = [];
    [...server, ...local].forEach(item => {
      const s = sym(item.symbol || item.asset || item.ticker), key = item.id || `${s}:${item.action || item.signal}:${item.openedAt || item.createdAt || ""}`;
      if (!s || seen.has(key)) return;
      seen.add(key);
      output.push({ ...item, symbol: s });
    });
    return output.sort((a, b) => new Date(b.openedAt || b.createdAt || 0) - new Date(a.openedAt || a.createdAt || 0));
  }
  function tradeAction(t) { return signal({ action: t.action, signal: t.signal, recommendation: t.recommendation, type: t.type }); }
  function tradeStatus(t) {
    const st = String(t.status || t.state || "").toLowerCase();
    if (st.includes("won") || st.includes("win") || st.includes("target") || st.includes("رابح")) return "won";
    if (st.includes("lost") || st.includes("loss") || st.includes("stop") || st.includes("خاسر")) return "lost";
    if (st.includes("expire") || st.includes("منتهي")) return "expired";
    if (st.includes("wait") || st.includes("pending") || st.includes("انتظار")) return "waiting";
    if (st.includes("watch") || st.includes("متابعة") || st.includes("مراقبة")) return "watching";
    if (st.includes("open") || st.includes("مفتوح")) return "open";
    const action = tradeAction(t);
    return action === "wait" ? "waiting" : action === "watch" ? "watching" : "open";
  }
  function tradeStatusLabel(st) { return st === "won" ? "رابحة" : st === "lost" ? "خاسرة" : st === "open" ? "مفتوحة" : st === "waiting" ? "انتظار" : st === "expired" ? "منتهية" : "تحت المتابعة"; }
  function tradeStatusTone(st) { return st === "won" ? "ok" : st === "lost" ? "bad" : st === "waiting" ? "warn" : st === "expired" ? "muted" : ""; }
  function groupTrades(items) {
    const g = { win: [], loss: [], open: [], wait: [], follow: [] };
    items.forEach(t => {
      const st = tradeStatus(t);
      if (st === "won") g.win.push(t);
      else if (st === "lost") g.loss.push(t);
      else if (st === "open") g.open.push(t);
      else if (st === "waiting") g.wait.push(t);
      else g.follow.push(t);
    });
    return g;
  }
  function tradeSummary(items) { const g = groupTrades(items), resolved = g.win.length + g.loss.length; return { ...g, successRate: resolved ? Math.round(g.win.length / resolved * 100) : null }; }
  function norm(x) {
    x = x || {};
    const providerSymbol = sym(x.providerSymbol || x.provider_symbol || x.providerSymbolUsed || x.provider_symbol_used || x.ticker || x.code || "");
    const displaySymbol = sym(x.displaySymbol || x.display_symbol || x.symbol || x.asset || providerSymbol || x.name || "");
    const s = displaySymbol || providerSymbol;
    const companyName = x.companyName || x.company_name_en || x.company_name_ar || x.assetName || x.longName || x.name || s;
    const normalized = {
      ...x,
      providerSymbol,
      providerSymbolUsed: x.providerSymbolUsed || x.provider_symbol_used || providerSymbol,
      displaySymbol,
      symbol: s,
      exchange: x.exchange || x.exchangeName || x.exchange_name || x.exchangeCode || x.exchange_code || "",
      exchangeCode: x.exchangeCode || x.exchange_code || "",
      market: x.market || x.marketName || x.market_name || "",
      country: x.country || x.countryCode || x.country_code || "",
      currency: x.currency || x.currencyCode || x.quoteCurrency || "",
      assetType: assetType(s, x.assetType || x.asset_type || x.quoteType || x.instrumentType || x.category),
      fundType: x.fundType || x.fund_type || "",
      fundTypeLabelAr: x.fundTypeLabelAr || x.fund_type_label_ar,
      fundTypeLabelEn: x.fundTypeLabelEn || x.fund_type_label_en,
      fundStructure: x.fundStructure || x.fund_structure,
      fundName: x.fundName || x.fund_name || companyName,
      issuer: x.issuer || x.fundIssuer || x.fund_issuer,
      expenseRatio: x.expenseRatio ?? x.expense_ratio,
      distributionYield: x.distributionYield ?? x.distribution_yield ?? x.yield,
      nav: x.nav ?? x.netAssetValue ?? x.net_asset_value,
      aum: x.aum ?? x.assetsUnderManagement ?? x.assets_under_management,
      dataAvailability: x.dataAvailability || x.data_availability,
      shariahStatus: x.shariahStatus || x.shariah_status || x.shariaStatus,
      sector: x.sector || "",
      industry: x.industry || "",
      companyName,
      name: x.name || companyName,
    };
    return normalized;
  }
  function signal(x) {
    return sharedRecommendation(x).status;
  }
  function sigLabel(s) { return isEnglishLanguage() ? sigLabelEn(s) : Recommendation.labelAr(Recommendation.parseRecommendationStatus(s) || s || "watch"); }
  function sigLabelEn(s) { return Recommendation.labelEn(Recommendation.parseRecommendationStatus(s) || s || "watch"); }
  function recStatus(x) { const s = String(x.status || x.state || "open").toLowerCase(); if (s.includes("complet") || s.includes("مكتمل")) return "مكتملة"; if (s.includes("fail") || s.includes("فاشل")) return "فاشلة"; if (s.includes("expир") || s.includes("expire") || s.includes("منتهي")) return "منتهية"; if (s.includes("watch") || s.includes("متابعة")) return "تحت المتابعة"; return "مفتوحة"; }
  function recStatusTone(x) { const s = recStatus(x); return s === "مكتملة" ? "ok" : s === "فاشلة" ? "bad" : s === "منتهية" ? "muted" : ""; }
  function confText(x) { const c = num(x.aiConfidence, x.ai_confidence, x.confidence, x.score); return c === null ? "--" : Math.round(c) + "%"; }
  function riskKey(v) { const s = String(v || "").toLowerCase(); if (s.includes("high") || s.includes("مرتفع") || s.includes("عالي")) return "high"; if (s.includes("low") || s.includes("منخفض")) return "low"; return "medium"; }
  function riskShort(v) { const k = riskKey(v); return k === "high" ? textPair("عالية", "High") : k === "low" ? textPair("منخفضة", "Low") : textPair("متوسطة", "Medium"); }
  function riskTone(v) { const k = riskKey(v); return k === "high" ? "bad" : k === "low" ? "ok" : "warn"; }
  function riskLabel(r) { return r === "conservative" ? textPair("محافظ", "Conservative") : r === "aggressive" ? textPair("هجومي", "Aggressive") : textPair("متوازن", "Balanced"); }
  function dataQualityLabel(value) { const v = String(value || "").toLowerCase(); if (v === "complete") return textPair("مكتملة", "Complete"); if (v === "live") return textPair("مباشرة", "Live"); if (v === "cached") return textPair("بيانات مخزنة مؤقتاً", "Cached"); if (v === "late" || v === "delayed") return textPair("متأخرة", "Delayed"); if (v === "partial") return textPair("جزئية", "Partial"); if (v === "unavailable") return textPair("غير متاحة", "Unavailable"); return value ? translateUiText(value) : terminalText("unavailable"); }
  function signalPrefs() {
    const s = state.settings || {};
    const enabledMarkets = Array.isArray(s.enabledMarkets) && s.enabledMarkets.length
      ? s.enabledMarkets
      : ["US", "Kuwait", "Saudi", "UAE", "Qatar", "Bahrain", "Oman", "Forex", "Crypto", "Commodities"];
    return {
      minConfidence: Math.max(0, Math.min(95, Number(s.signalMinConfidence) || 70)),
      riskProfile: s.risk || "balanced",
      enabledMarkets,
      buyAlertsEnabled: s.buyAlertsEnabled !== false,
      sellAlertsEnabled: s.sellAlertsEnabled !== false,
      waitAlertsEnabled: s.waitAlertsEnabled === true,
      inAppAlertsEnabled: s.inAppAlertsEnabled !== false,
      emailAlertsEnabled: s.emailAlertsEnabled === true,
      telegramAlertsEnabled: false,
      pushAlertsEnabled: false
    };
  }
  function marketApi(id) { const m = MARKETS.find(x => x.id === id); return m ? m.apiMarket : (id || "us-stocks"); }
  function currentMarket() { return MARKETS.find(x => x.id === state.settings.defaultMarket) || MARKETS[0]; }
  function currency(a) { const s = sym(a.symbol || a.ticker || ""), explicit = a.currency || a.currencyCode || a.quoteCurrency; if (explicit && String(explicit).toUpperCase() !== "KWF") return String(explicit).toUpperCase(); if (/\.KW$/i.test(s)) return "KWD"; if (/\.SR$|\.SA$/i.test(s)) return "SAR"; if (/\.AE$|\.DU$|\.AD$/i.test(s)) return "AED"; if (/\.QA$/i.test(s)) return "QAR"; if (/\.OM$/i.test(s)) return "OMR"; if (/\.BH$/i.test(s)) return "BHD"; if (/\.T$/i.test(s)) return "JPY"; if (/\.HK$/i.test(s)) return "HKD"; if (/\.DE$|\.AS$|\.PA$|\.MI$|\.MC$/i.test(s)) return "EUR"; if (/\.L$/i.test(s)) return "GBP"; if (/\.SW$/i.test(s)) return "CHF"; if (/\.KS$/i.test(s)) return "KRW"; if (/^(NAS100|US30|SPX|SPX500|NDX|DJI|DXY|IXIC|DAX|FTSE|CAC40|NIKKEI|HSI)$/.test(s)) return "USD"; if (/^[A-Z]{6}$/.test(s)) return s.slice(3); if (/USD$/.test(s) || /^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(s)) return "USD"; if (/^[A-Z]{1,5}$/.test(s)) return "USD"; return "--"; }
  function assetType(s, explicit) { s = sym(s); if (explicit) { const e = String(explicit).toLowerCase(); if (/crypto/.test(e)) return "crypto"; if (/forex|fx|currency/.test(e)) return "forex"; if (/commodit|metal/.test(e)) return "commodity"; if (/etf|fund|reit|sukuk|mutual/.test(e)) return "fund"; if (/index/.test(e)) return "index"; if (/stock|equity/.test(e)) return "stock"; } const compactCrypto = s.replace(/^BINANCE:/, "").replace(/[/-]/g, ""), cryptoBase = compactCrypto.replace(/USDT$/, "").replace(/USD$/, ""); if (CRYPTO_DISPLAY_BASES.has(cryptoBase) && [cryptoBase, `${cryptoBase}USD`, `${cryptoBase}USDT`].includes(compactCrypto)) return "crypto"; if (/BTC|ETH|SOL|USDT|XRP|ADA|BNB|DOGE/i.test(s) && /USD|USDT/i.test(s)) return "crypto"; if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(s) || /XAU|XAG|WTI|BRENT|OIL|GOLD|SILVER/i.test(s)) return "commodity"; if (/^(NAS100|US30|SPX|SPX500|NDX|DJI|DXY|IXIC|DAX|FTSE|CAC40|NIKKEI|HSI)$/.test(s)) return "index"; if (/^[A-Z]{6}$/.test(s.replace(/[.\-=].*/, ""))) return "forex"; if (/^(SPY|QQQ|VOO|DIA|IWM|GLD|SLV|VTI|VEA|VWO|AGG|BND|TLT|HYG|XLK|XLF|XLE|XLV|XLY|XLI|XLP|XLU|VNQ|SOXX|AMCREIT|ENBDREIT|REIT)$/.test(s)) return "fund"; return "stock"; }
  function sym(v) { return String(v || "").trim().toUpperCase().replace(/\s+/g, "").replace(/[\\/:]/g, ""); }
  function priceUnavailableText() { return textPair(PRICE_UNAVAILABLE_AR, PRICE_UNAVAILABLE_EN); }
  function changeUnavailableText() { return textPair(CHANGE_UNAVAILABLE_AR, CHANGE_UNAVAILABLE_EN); }
  function isValidPrice(value) { const n = num(value); return n !== null && n > 0; }
  function isValidChange(value) { const n = num(value); return n !== null && n > -100 && Math.abs(n) < 100000; }
  function normalizeSymbol(symbol, assetClass) {
    const raw = String(symbol || "").trim(), compact = sym(raw), compactCrypto = compact.replace(/^BINANCE:/, "").replace(/[/-]/g, ""), cryptoBase = compactCrypto.replace(/USDT$/, "").replace(/USD$/, "");
    const type = assetType(compact, assetClass);
    if ((type === "crypto" || CRYPTO_DISPLAY_BASES.has(cryptoBase)) && cryptoBase && [cryptoBase, `${cryptoBase}USD`, `${cryptoBase}USDT`].includes(compactCrypto)) {
      return { inputSymbol: raw, requestedSymbol: raw || compact, canonicalSymbol: `${cryptoBase}/USD`, displaySymbol: `${cryptoBase}/USD`, providerSymbol: `${cryptoBase}-USD`, assetType: "crypto", symbolKey: `${cryptoBase}USD` };
    }
    return { inputSymbol: raw, requestedSymbol: raw || compact, canonicalSymbol: compact, displaySymbol: displaySymbolFor(raw || compact), providerSymbol: compact || null, assetType: type, symbolKey: compact };
  }
  function normalizeQuote(rawQuote) {
    const raw = rawQuote || {};
    const symbolInfo = normalizeSymbol(raw.canonicalSymbol || raw.displaySymbol || raw.symbol || raw.providerSymbol || raw.providerSymbolUsed || raw.ticker || raw.code, raw.assetType || raw.asset_type || raw.type);
    const providerText = String(raw.provider || raw.source || "").toLowerCase();
    const normalizedProviderSymbol = symbolInfo.assetType === "crypto" && providerText.includes("yahoo") ? symbolInfo.providerSymbol : (raw.providerSymbol || raw.provider_symbol || symbolInfo.providerSymbol);
    const priceValue = [raw.price, raw.currentPrice, raw.current_price, raw.lastPrice, raw.regularMarketPrice, raw.close].map(value => num(value)).find(value => isValidPrice(value)) ?? null;
    const previousClose = [raw.previousClose, raw.previous_close, raw.prevClose, raw.regularMarketPreviousClose].map(value => num(value)).find(value => isValidPrice(value)) ?? null;
    const explicitChange = num(raw.changePercent, raw.percentChange, raw.regularMarketChangePercent);
    const changeValue = priceValue !== null && previousClose !== null ? Number((priceValue - previousClose).toFixed(6)) : null;
    const changePercent = priceValue !== null && previousClose !== null
      ? Number((((priceValue - previousClose) / previousClose) * 100).toFixed(6))
      : isValidChange(explicitChange) && priceValue !== null ? explicitChange : null;
    const available = raw.available !== false && priceValue !== null;
    return { ...raw, symbol: symbolInfo.canonicalSymbol || symbolInfo.symbolKey, requestedSymbol: raw.requestedSymbol || raw.requested_symbol || symbolInfo.requestedSymbol, canonicalSymbol: symbolInfo.canonicalSymbol, displaySymbol: symbolInfo.displaySymbol, providerSymbol: normalizedProviderSymbol, providerSymbolUsed: raw.providerSymbolUsed || raw.provider_symbol_used || normalizedProviderSymbol, assetType: raw.assetType || raw.asset_type || symbolInfo.assetType, price: priceValue, currentPrice: priceValue, previousClose, change: changeValue, changePercent, available, unavailableReason: available ? raw.unavailableReason : (raw.unavailableReason || raw.reason || "price_unavailable") };
  }
  function price(v, c) { const n = num(v); return !isValidPrice(n) ? priceUnavailableText() : `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { const n = num(v); return !isValidChange(n) ? changeUnavailableText() : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`; }
  function date(v) { if (!v) return "--"; const d = new Date(Number(v) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString(isEnglishLanguage() ? "en-US" : "ar-KW", { dateStyle: "medium", timeStyle: "short" }); }
  function num(...values) { for (const v of values) { if (v === null || v === undefined || v === "") continue; const n = Number(v); if (Number.isFinite(n)) return n; } return null; }
  function arr(v) { if (Array.isArray(v)) return v; if (v && typeof v === "object") return Object.values(v).filter(x => x && typeof x === "object"); return []; }
  function unique(v) { return Array.from(new Set(v.map(sym).filter(Boolean))); }
  function read(k, f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch (_e) { return f; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} }
  function settingsT(key, lang = currentLanguage()) {
    const entry = SETTINGS_COPY[key];
    const normalized = normalizeLanguage(lang);
    return entry ? (entry[normalized] || entry.ar || entry.en || key) : key;
  }
  function countTextLocalized(value, lang = currentLanguage()) {
    const n = latinNumber(numberValue(value));
    return `${n} ${settingsT("symbolCount", lang)}`;
  }
  function yesNoLocalized(value, lang = currentLanguage()) {
    return value ? (normalizeLanguage(lang) === "en" ? "Yes" : "نعم") : (normalizeLanguage(lang) === "en" ? "No" : "لا");
  }
  function riskLabelLocalized(r, lang = currentLanguage()) {
    if (r === "conservative") return settingsT("conservative", lang);
    if (r === "aggressive") return settingsT("aggressive", lang);
    return settingsT("balanced", lang);
  }
  function settingsMarketLabel(option, lang = currentLanguage()) {
    return h(option[normalizeLanguage(lang)] || option.en || option.id);
  }
  function settingsCheckbox(name, checked, label, hint) {
    return `<label class="settings-check-row">
      <input type="checkbox" name="${h(name)}" ${checked ? "checked" : ""} />
      <span class="settings-check-mark" aria-hidden="true"></span>
      <span class="settings-check-copy"><strong>${h(label)}</strong>${hint ? `<small>${h(hint)}</small>` : ""}</span>
    </label>`;
  }
  async function refreshProviderStatus(options = false) {
    const params = new URLSearchParams();
    if (options === true || (options && options.refresh)) params.set("refresh", "1");
    if (options && options.retry) params.set("retry", "1");
    if (options && options.clearCache) params.set("clearCache", "1");
    const query = params.toString() ? `?${params.toString()}` : "";
    const providerStatus = await get(`/trader/provider-status${query}`, { label: "providerStatus" });
    state.providerStatus = providerStatus || {};
    if (providerStatus && providerStatus.dataProvider) state.provider = providerStatus.dataProvider;
    render();
  }
  async function handleSettingsAction(action) {
    const lang = currentLanguage();
    try {
      if (action === "retry-provider-now" || action === "refresh-market-data") {
        state.cache.clear();
        state.marketCache.clear();
        await refreshProviderStatus({ retry: true });
        toast(settingsT("refreshed", lang));
        return;
      }
      if (action === "clear-provider-cache") {
        state.cache.clear();
        state.marketCache.clear();
        await refreshProviderStatus({ clearCache: true });
        toast(settingsT("cacheCleared", lang));
        return;
      }
      if (action === "test-provider-connection") {
        await refreshProviderStatus({ refresh: true });
        toast(settingsT("tested", lang));
      }
    } catch (error) {
      devLog("settings", "failed", { action, message: errorMessage(error) });
      toast(settingsT("actionFailed", lang));
    }
  }
  function renderAfterData() { if (!state.loading) render(); }
  function requestLabel(path) {
    if (path.includes("/trader/provider-status")) return "providerStatus";
    if (path.includes("/trader/calendar/")) return "calendar";
    if (path.includes("/market-news")) return "news";
    if (path.includes("/market/signals") || path.includes("/market/signal-") || path.includes("/market/technical-analysis")) return "signals";
    return "quotes";
  }
  function timeoutFor(path, label) {
    if (label === "providerStatus") return REQUEST_TIMEOUTS.providerStatus;
    if (label === "calendar") return REQUEST_TIMEOUTS.calendar;
    if (label === "news") return REQUEST_TIMEOUTS.news;
    if (label === "signals") return REQUEST_TIMEOUTS.signals;
    if (path.includes("/recommendations") || path.includes("/market/history") || path.includes("/market/asset-profile") || path.includes("/markets")) return REQUEST_TIMEOUTS.quotes;
    return REQUEST_TIMEOUTS.default;
  }
  function settledValue(result, label) {
    if (result.status === "fulfilled") return result.value || failurePayload(label);
    const payload = failurePayload(label, errorMessage(result.reason));
    devLog(label, "failed", { message: payload.message });
    return payload;
  }
  function failurePayload(label, message) {
    return {
      ok: false,
      message: message || UNAVAILABLE_MESSAGE,
      status: "unavailable",
      data: [],
      items: [],
      results: [],
      failed: [{ provider: label, reason: message || "request_failed", status: "failed" }]
    };
  }
  function errorName(error) { return error && typeof error === "object" && "name" in error ? String(error.name) : ""; }
  function errorMessage(error) { return formatProviderError(error, { empty: UNAVAILABLE_MESSAGE }); }
  function responseFailed(payload) {
    if (!payload || payload.ok === false || payload.timeout || payload.routeUnavailable) return true;
    const status = String(payload.status || payload.legacyStatus || payload.dataProvider?.status || "").toLowerCase();
    return ["provider_error", "invalid_request", "not_configured", "missing_provider", "unauthorized", "forbidden", "rate_limited"].includes(status);
  }
  function logRequestResult(label, path, timeoutMs, payload) {
    const failed = responseFailed(payload);
    devLog(label, failed ? "failed" : "loaded", {
      path: safeLogPath(path),
      status: payload?.status || null,
      httpStatus: payload?.statusCode || payload?.providerStatusCode || null,
      resultCount: payload?.resultCount ?? payload?.count ?? arr(payload?.data || payload?.items || payload?.results).length,
      timedOut: Boolean(payload?.timeout)
    });
    if (payload && payload.timeout) devLog(label, "timed out", { path: safeLogPath(path), timeoutMs });
  }
  function safeLogPath(path) {
    try {
      const url = new URL(path, location.origin);
      ["apiKey", "apikey", "token", "key"].forEach(key => url.searchParams.delete(key));
      return `${url.pathname}${url.search}`;
    } catch (_error) {
      return String(path).replace(/([?&](?:apiKey|apikey|token|key)=)[^&]+/gi, "$1[redacted]");
    }
  }
  function devLog(area, status, details) {
    if (!DEV_DIAGNOSTICS) return;
    const method = status === "loaded" ? "info" : "warn";
    console[method](`[trader] ${area} ${status}`, details || {});
  }
  function providerLocale(locale) {
    const value = String(locale || document.documentElement.lang || navigator.language || "ar").toLowerCase();
    return value.startsWith("en") ? "en" : "ar";
  }
  function canonicalProviderStatusKey(status) {
    const value = String(status || "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PROVIDER_STATUS_LABELS, value)) return value;
    if (["loading", "pending", "checking", "fetching"].includes(value)) return "provider_status_loading";
    if (["success", "available", "configured", "connected", "healthy"].includes(value)) return "provider_status_available";
    if (["partial", "degraded", "rate_limited"].includes(value) || /429|rate_limited|rate limit|too many/i.test(value)) return "provider_status_partial";
    if (["failed", "failure", "unavailable", "missing", "not_configured", "missing_provider", "provider_error", "invalid_request", "unauthorized", "forbidden", "not_entitled", "timeout"].includes(value)) return "provider_status_failed";
    if (/provider_status_/i.test(value)) return "provider_status_unknown";
    if (/error|fail|denied|unauthorized|forbidden|not_configured|missing|unavailable|timeout/i.test(value)) return "provider_status_failed";
    return "provider_status_unknown";
  }
  function getProviderStatusMessage(status, locale) {
    const statusKey = canonicalProviderStatusKey(status);
    const lang = providerLocale(locale);
    return (PROVIDER_STATUS_LABELS[statusKey] || PROVIDER_STATUS_LABELS.provider_status_unknown)[lang];
  }
  function getProviderStatusExplanation(status, locale) {
    const statusKey = canonicalProviderStatusKey(status);
    if (statusKey !== "provider_status_failed" && statusKey !== "provider_status_partial") return "";
    return PROVIDER_STATUS_EXPLANATION[providerLocale(locale)];
  }
  function getProviderRetryLabel(locale) {
    return PROVIDER_RETRY_LABEL[providerLocale(locale)];
  }
  function providerStatusCopy(status, options = {}) {
    const locale = providerLocale(options.locale);
    const statusKey = canonicalProviderStatusKey(status);
    const title = getProviderStatusMessage(statusKey, locale);
    const explanation = getProviderStatusExplanation(statusKey, locale);
    const provider = providerName(options.provider || "");
    const activeProviderCopy = locale === "en" ? `Active provider: ${provider}` : `المزود النشط: ${provider}`;
    return {
      title,
      copy: options.copy || (statusKey === "provider_status_available" ? activeProviderCopy : explanation || title),
      explanation,
      className: statusKey === "provider_status_available" ? "online" : "warning",
      tone: statusKey === "provider_status_available" ? "ok" : "warn",
      statusKey,
      label: title,
      retryLabel: getProviderRetryLabel(locale),
      showRetry: ["provider_status_failed", "provider_status_partial", "provider_status_unknown"].includes(statusKey)
    };
  }
  function providerCopy() {
    const normalized = state.providerStatus && state.providerStatus.normalizedStatus;
    const p = (state.providerStatus && state.providerStatus.dataProvider) || state.provider || {};
    if (state.loading && !Object.keys(state.providerStatus || {}).length) return providerStatusCopy("provider_status_loading", { provider: p.active || p.provider });
    if (state.providerStatus && state.providerStatus.ok === false) return providerStatusCopy("provider_status_failed", { provider: p.active || p.provider });
    const configured = p.configured === true || Boolean(p.active);
    const raw = (normalized && normalized.status) || p.status || (configured ? "configured" : "not_configured");
    const ok = configured && ["success", "available", "configured", "connected", "healthy"].includes(String(raw));
    return providerStatusCopy(ok ? "provider_status_available" : raw, { provider: p.active || p.provider });
  }
  function h(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

  document.addEventListener("click", async (e) => {
    const chip = e.target.closest("[data-rec-market]");
    if (!chip) return;
    state.settings.defaultMarket = chip.dataset.recMarket;
    try { localStorage.setItem(keys.settings, JSON.stringify(state.settings)); } catch {}
    render();
    state.rec = await get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`, { label: "quotes" });
    render();
  });


  function selectMarket(mid) {
    const mk = MARKETS.find(function(x) { return x.id === mid; });
    if (!mk) return;
    state.settings.defaultMarket = mid;
    _marketSelectorOpen = false;
    write(keys.settings, state.settings);
    state.rec = {};
    state.commandCards = {};
    state.signals = {};
    state.signalAlerts = {};
    if (state.marketCache && state.marketCache.clear) state.marketCache.clear();
    if (state.route.id === "markets" && state.route.market) {
      navigate(`${ROOT}/markets/${encodeURIComponent(mid)}`);
      hydrate().catch(function() {});
      return;
    }
    render();
    hydrate().catch(function() {});
  }

  function ensureMarketSelectorCss() {
    if (document.getElementById("_ms_css")) return;
    const _s = document.createElement("style");
    _s.id = "_ms_css";
    _s.textContent =
      ".topbar-market-selector{position:relative;display:inline-flex;align-items:center;min-width:0;overflow:visible}" +
      ".ms-wrap{position:relative;display:inline-flex;align-items:center;min-width:0;overflow:visible;direction:inherit}" +
      ".ms-pill{min-height:42px;display:inline-flex;align-items:center;gap:10px;padding-block:0;padding-inline:15px 10px;border-radius:999px;border:1px solid rgba(34,211,238,.62);background:linear-gradient(180deg,rgba(9,29,48,.96),rgba(3,15,28,.94));color:#e8f8ff;font-size:14px;font-weight:850;font-family:inherit;cursor:pointer;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease,transform .18s ease;white-space:nowrap;box-shadow:0 0 0 1px rgba(34,211,238,.12),0 0 24px rgba(34,211,238,.14),inset 0 1px 0 rgba(255,255,255,.08);touch-action:manipulation;direction:inherit}" +
      ".ms-pill>*{pointer-events:none}.ms-pill:hover,.ms-pill[aria-expanded=true]{border-color:rgba(34,211,238,.92);background:linear-gradient(180deg,rgba(12,42,66,.98),rgba(5,22,39,.96));color:#fff;box-shadow:0 0 0 1px rgba(34,211,238,.22),0 0 30px rgba(34,211,238,.22),inset 0 1px 0 rgba(255,255,255,.1)}" +
      ".ms-pill:focus-visible{outline:2px solid rgba(94,234,212,.9);outline-offset:3px;box-shadow:0 0 0 1px rgba(34,211,238,.28),0 0 0 5px rgba(94,234,212,.14),0 0 30px rgba(34,211,238,.22),inset 0 1px 0 rgba(255,255,255,.1)}.ms-pill:active{transform:translateY(1px)}" +
      ".ms-pill-copy{min-width:0;display:inline-flex;align-items:center;gap:6px;line-height:1}.ms-pill-name{min-width:0;max-width:150px;overflow:hidden;text-overflow:ellipsis;text-align:start}.ms-pill-sep{color:rgba(148,211,224,.62);margin:0 1px}.ms-pill-cur{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:900;color:#22D3EE;direction:ltr;unicode-bidi:embed;letter-spacing:.03em}" +
      ".ms-chevron-box{width:28px;height:28px;display:grid;place-items:center;flex:0 0 28px;border-radius:999px;border:1px solid rgba(125,249,255,.32);background:rgba(34,211,238,.1);color:#dffaff;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:background .18s ease,border-color .18s ease,box-shadow .18s ease}.ms-pill:hover .ms-chevron-box,.ms-pill[aria-expanded=true] .ms-chevron-box{border-color:rgba(94,234,212,.58);background:rgba(94,234,212,.16);box-shadow:0 0 16px rgba(34,211,238,.18),inset 0 1px 0 rgba(255,255,255,.1)}.ms-chevron{width:16px;height:16px;flex-shrink:0;transition:transform .22s cubic-bezier(.2,.8,.2,1);animation:ms-chevron-close .22s cubic-bezier(.2,.8,.2,1)}.ms-chevron.ms-open{transform:rotate(180deg);animation:ms-chevron-open .22s cubic-bezier(.2,.8,.2,1)}@keyframes ms-chevron-open{from{transform:rotate(0)}to{transform:rotate(180deg)}}@keyframes ms-chevron-close{from{transform:rotate(180deg)}to{transform:rotate(0)}}@media(prefers-reduced-motion:reduce){.ms-chevron{transition:none;animation:none!important}}" +
      ".ms-dropdown{position:absolute;top:calc(100% + 9px);inset-inline-start:0;min-width:255px;max-height:min(390px,70vh);overflow-y:auto;overflow-x:hidden;background:linear-gradient(180deg,#071a2c,#04101d);border:1px solid rgba(34,211,238,.42);border-radius:16px;padding:7px;z-index:10050;display:flex;flex-direction:column;gap:3px;box-shadow:0 22px 56px rgba(0,0,0,.64),0 0 0 1px rgba(34,211,238,.09),0 0 36px rgba(34,211,238,.12)}" +
      ".ms-item{display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 10px;border-radius:11px;border:1px solid transparent;background:transparent;color:#a9c1d3;font-size:13px;font-weight:760;cursor:pointer;text-align:start;direction:inherit;width:100%;transition:background .12s,border-color .12s,color .12s}" +
      ".ms-item:hover{background:rgba(34,211,238,.1);border-color:rgba(34,211,238,.16);color:#eefbff}.ms-item:focus-visible{outline:2px solid rgba(34,211,238,.7);outline-offset:2px;background:rgba(34,211,238,.12);color:#fff}" +
      ".ms-item.is-active{color:#22D3EE;font-weight:900;background:rgba(34,211,238,.11);border-color:rgba(34,211,238,.24)}.ms-chk{width:14px;height:14px;flex-shrink:0;color:#22D3EE}.ms-chk-ph{display:inline-block;width:14px;height:14px;flex-shrink:0}.ms-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.ms-cur-tag{font-family:'JetBrains Mono',monospace;font-size:11px;color:#6e8ca1;direction:ltr;unicode-bidi:embed;margin-inline-start:auto;padding-inline-start:8px}.ms-item.is-active .ms-cur-tag{color:#22D3EE}" +
      "@media(max-width:640px){.topbar-market-selector,.topbar-market-selector .ms-wrap,.topbar-market-selector .ms-pill{width:100%}.topbar-market-selector .ms-pill{justify-content:center;min-height:40px;padding-inline:12px;font-size:13px}.ms-pill-name{max-width:46vw}.ms-dropdown{inset-inline-start:auto;left:50%;right:auto;transform:translateX(-50%);min-width:min(312px,calc(100vw - 28px));max-width:calc(100vw - 28px)}}";
    document.head.appendChild(_s);
  }

  // باني HTML نقي — لا يكتب في DOM. يُستدعى من statusBar() ضمن نفس innerHTML.
  function marketSelectorHtml() {
    ensureMarketSelectorCss();
    const m = currentMarket();
    const isOpen = !!_marketSelectorOpen;
    const dir = isEnglishLanguage() ? "ltr" : "rtl";
    const selectorLabel = textPair("\u0627\u062e\u062a\u0631 \u0627\u0644\u0633\u0648\u0642", "Choose market");
    const chkSvg = '<svg class="ms-chk" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6l3 3 5-5"/></svg>';
    const chevSvg = '<span class="ms-chevron-box" aria-hidden="true"><svg class="ms-chevron' + (isOpen ? " ms-open" : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m6 9 6 6 6-6"/></svg></span>';
    const itemsHtml = MARKETS.map(function(mk) {
      const active = mk.id === m.id;
      return '<button class="ms-item' + (active ? " is-active" : "") + '" data-select-market="' + mk.id + '" role="option" aria-selected="' + active + '" type="button">' +
        (active ? chkSvg : '<span class="ms-chk-ph" aria-hidden="true"></span>') +
        '<span class="ms-label">' + h(marketName(mk)) + '</span>' +
        '<span class="ms-cur-tag">' + h(mk.currency) + '</span>' +
        '</button>';
    }).join("");
    const pillHtml = '<button class="ms-pill" data-market-selector-toggle type="button" aria-expanded="' + isOpen + '" aria-haspopup="listbox" aria-controls="market-selector-options" title="' + h(selectorLabel) + '" aria-label="' + h(selectorLabel) + '">' +
      '<span class="ms-pill-copy"><span class="ms-pill-name">' + h(marketName(m)) + '</span>' +
      '<span class="ms-pill-sep">·</span>' +
      '<span class="ms-pill-cur">' + h(m.currency) + '</span></span>' +
      chevSvg +
      '</button>';
    const dropHtml = isOpen ? '<div class="ms-dropdown" id="market-selector-options" role="listbox" aria-label="' + h(selectorLabel) + '">' + itemsHtml + '</div>' : "";
    return '<div class="ms-wrap" dir="' + dir + '" aria-label="' + h(selectorLabel) + '">' + pillHtml + dropHtml + '</div>';
  }

  // تحديث موضعي: يستبدل .ms-wrap فقط دون لمس خلايا شريط الحالة، لتجنّب
  // إعادة بناء الشريط كاملاً عند مجرد فتح/إغلاق القائمة.
  function renderMarketSelector() {
    const host = document.getElementById("topbar-market-selector");
    if (!host) return;
    host.innerHTML = marketSelectorHtml();
  }

})();
