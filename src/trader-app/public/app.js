/* SFM Smart Analyzer — AI Trading Terminal (vanilla SPA controller)
   Architecture: single IIFE, client-side routing (instant page switches),
   pure render-component functions, defensive data layer, no synthetic market data. */
(() => {
  "use strict";
  const Recommendation = window.SFMRecommendation;
  let _marketSelectorOpen = false;
  let _mobileMoreOpen = false;
  let drawerReturnFocus = null;
  let drawerBodyOverflow = "";
  let drawerFocusPending = false;
  let chartInstanceCounter = 0;

  /* ─────────────────────────── Config ─────────────────────────── */
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const VER = "20260705-funds-universe-1";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3", holdings: "sfmTraderHoldings:v1", settings: "sfmTraderSettings:v1", followed: "sfmTraderFollowedTrades:v1" };
  const LANG_STORAGE_KEY = "sfm_lang";
  const LEGACY_SETTINGS_STORAGE_KEY = "the-sfm-trader-settings";
  const LANG_EVENT = "sfm-language-change";
  const SUPPORTED_LANGUAGES = ["ar", "en", "fr"];
  const TERMINAL_I18N = {
    "language.label": { ar: "اختيار اللغة", en: "Choose language" },
    "language.arabic": { ar: "العربية", en: "Arabic" },
    "language.english": { ar: "الإنجليزية", en: "English" },
    "language.french": { ar: "الفرنسية", en: "French", fr: "Français" },
    "terminal.brandPrefix": { ar: "اس اف ام", en: "SFM" },
    "terminal.brandTitle": { ar: "المحلل الذكي", en: "Smart Analyzer" },
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
    ["ANALYZED ASSETS", "الأصول المحللة"],
    ["ACTIVE MARKET", "السوق النشط"],
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
    ["1-3 weeks", "1-3 أسابيع", "1 à 3 semaines"],
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
    ["Importance", "الأهمية"],
    ["Unable to load data", "تعذر تحميل البيانات حالياً", "Impossible de charger les données"],
    ["We could not load this data. Try again or open the related page.", "لم نتمكن من تحميل هذه البيانات. حاول مرة أخرى أو افتح الصفحة ذات الصلة.", "Nous n’avons pas pu charger ces données. Réessayez ou ouvrez la page associée."],
    ["This route is currently unavailable", "المسار غير متاح حالياً", "Cette page est actuellement indisponible"],
    ["No matching assets for this market or category right now", "لا توجد أصول مطابقة لهذا السوق أو التصنيف حالياً", "Aucun actif ne correspond actuellement à ce marché ou à cette catégorie"],
    ["The combined final recommendation is neither buy nor sell.", "التوصية النهائية المشتركة ليست شراء أو بيع.", "La recommandation finale combinée n’est ni un achat ni une vente."],
    ["Data quality is delayed or partial, so the signal was reduced to watch.", "جودة البيانات متأخرة أو جزئية، لذلك تم خفض الإشارة إلى المراقبة.", "Les données sont différées ou partielles ; le signal a donc été ramené à la surveillance."],
    ["Core technical indicators are incomplete.", "المؤشرات الفنية الأساسية غير مكتملة.", "Les principaux indicateurs techniques sont incomplets."],
    ["Support and resistance levels are incomplete.", "مستويات الدعم والمقاومة غير مكتملة.", "Les niveaux de support et de résistance sont incomplets."],
    ["ATR is unavailable, so risk cannot be set confidently.", "ATR غير متاح، لذلك لا يمكن ضبط المخاطرة بثقة.", "L’ATR est indisponible ; le risque ne peut donc pas être défini avec fiabilité."],
    ["News or sentiment context is unavailable.", "سياق الأخبار أو المعنويات غير متاح.", "Le contexte d’actualité ou de sentiment est indisponible."],
    ["The risk/reward ratio does not pass the safety gate.", "نسبة العائد إلى المخاطرة لا تجتاز بوابة الأمان.", "Le rapport risque/rendement ne franchit pas le seuil de sécurité."],
    ["Risk is high, so no buy or sell signal is shown.", "المخاطرة مرتفعة، لذلك لا تُعرض إشارة شراء أو بيع.", "Le risque est élevé ; aucun signal d’achat ou de vente n’est affiché."],
    ["There is not enough data to issue a safe buy or sell signal.", "البيانات غير كافية لإصدار إشارة شراء أو بيع آمنة.", "Les données sont insuffisantes pour émettre un signal d’achat ou de vente sûr."]
  ];
  const TERMINAL_FRENCH_TEXT = Object.freeze({
    "Choose language": "Choisir la langue",
    "Arabic": "Arabe",
    "English": "Anglais",
    "French": "Français",
    "DASHBOARD": "TABLEAU DE BORD",
    "MARKETS": "MARCHÉS",
    "MARKET": "MARCHÉ",
    "WATCHLIST": "LISTE DE SUIVI",
    "SETTINGS": "PARAMÈTRES",
    "ANALYSIS": "ANALYSE",
    "PROVIDER MARKETS": "MARCHÉS DU FOURNISSEUR",
    "FULL SYMBOL UNIVERSE": "UNIVERS COMPLET DES SYMBOLES",
    "CONFIDENCE": "CONFIANCE",
    "STRONGEST": "PLUS FORT",
    "PORTFOLIO": "PORTEFEUILLE",
    "ALERTS": "ALERTES",
    "RECOMMENDATIONS": "RECOMMANDATIONS",
    "TRADE PERFORMANCE": "PERFORMANCE DES TRANSACTIONS",
    "NEWS": "ACTUALITÉS",
    "CALENDAR": "CALENDRIER",
    "EDUCATION": "FORMATION",
    "EPS est.": "BPA estimé",
    "EPS actual": "BPA publié",
    "Revenue est.": "Chiffre d’affaires estimé",
    "Revenue actual": "Chiffre d’affaires publié",
    "Declaration": "Déclaration",
    "Ex-date": "Date ex-dividende",
    "Record": "Date d’enregistrement",
    "Payment": "Paiement",
    "Dividend": "Dividende",
    "IPO date": "Date d’introduction",
    "Price range": "Fourchette de prix",
    "Shares": "Actions",
    "Event": "Événement",
    "SFM": "SFM",
    "Smart Analyzer": "Analyseur intelligent",
    "AI trading terminal": "Terminal de trading intelligent",
    "Trading": "Trading",
    "Monitoring": "Suivi",
    "More": "Plus",
    "Dashboard": "Tableau de bord",
    "Markets": "Marchés",
    "AI Scanner": "Scanner IA",
    "Scanner": "Scanner",
    "Symbol Details": "Détails du symbole",
    "Symbol Analysis": "Analyse du symbole",
    "Watchlist": "Liste de suivi",
    "Portfolio": "Portefeuille",
    "Alerts": "Alertes",
    "Recommendations": "Recommandations",
    "Analysis": "Analyse",
    "Trade Performance": "Performance des transactions",
    "Performance": "Performance",
    "News": "Actualités",
    "Calendar": "Calendrier",
    "Education": "Formation",
    "Settings": "Paramètres",
    "Market command room": "Salle de commande des marchés",
    "Markets map": "Carte des marchés",
    "AI scanner": "Scanner IA",
    "Smart watchlist": "Liste de suivi intelligente",
    "Alerts center": "Centre des alertes",
    "Recommendations and analysis": "Recommandations et analyse",
    "Trade performance": "Performance des transactions",
    "Market news": "Actualités des marchés",
    "Market calendar": "Calendrier des marchés",
    "Education center": "Centre de formation",
    "System settings": "Paramètres du système",
    "Symbol details": "Détails du symbole",
    "Search for a stock or symbol": "Rechercher une action ou un symbole",
    "Analyze": "Analyser",
    "Checking data provider": "Vérification du fournisseur de données",
    "Hide ticker": "Masquer le bandeau",
    "Show ticker": "Afficher le bandeau",
    "Market ticker": "Bandeau des cours du marché",
    "Collapse sidebar": "Réduire la barre latérale",
    "Preparing the trading terminal": "Préparation du terminal de trading",
    "Loading provider status, news, recommendations, and watchlists without creating synthetic data.": "Chargement de l’état du fournisseur, des actualités, des recommandations et des listes de suivi sans créer de données synthétiques.",
    "View all symbols": "Voir tous les symboles",
    "View all funds": "Voir tous les fonds",
    "Preview symbols": "Aperçu des symboles",
    "Full symbol universe": "Univers complet des symboles",
    "All exchanges": "Toutes les bourses",
    "All currencies": "Toutes les devises",
    "All sectors": "Tous les secteurs",
    "All industries": "Toutes les industries",
    "All asset types": "Tous les types d’actifs",
    "All data": "Toutes les données",
    "With price": "Avec un cours disponible",
    "Price availability": "Disponibilité du cours",
    "Market cap": "Capitalisation boursière",
    "Volume": "Volume",
    "Sort": "Tri",
    "Direction": "Sens",
    "Ascending": "Croissant",
    "Descending": "Décroissant",
    "Issuer": "Émetteur",
    "Yield": "Rendement",
    "Expense ratio": "Ratio de frais",
    "Data quality": "Qualité des données",
    "Shariah status": "Statut de conformité à la charia",
    "Fund type": "Type de fonds",
    "Fund": "Fonds",
    "Market details": "Détails du marché",
    "Provider markets summary": "Résumé des marchés du fournisseur",
    "Admin diagnostics": "Diagnostics d’administration",
    "Refresh": "Actualiser",
    "Search": "Rechercher",
    "No source": "Aucune source",
    "Timing": "Calendrier",
    "All": "Tous",
    "Expected": "Prévu",
    "Reported": "Publié",
    "Complete data": "Données complètes",
    "Partial data": "Données partielles",
    "Show more": "Afficher plus",
    "Show less": "Afficher moins",
    "Collapse": "Réduire",
    "rows": "lignes",
    "Date range": "Période",
    "Period": "Période",
    "Results": "Résultats",
    "Completeness": "Exhaustivité",
    "Symbol": "Symbole",
    "Name": "Nom",
    "Market": "Marché",
    "Currency": "Devise",
    "Type": "Type",
    "Source": "Source",
    "Price": "Cours",
    "Target": "Objectif",
    "Stop": "Stop",
    "Confidence": "Confiance",
    "Last updated": "Dernière mise à jour",
    "Open": "Ouvrir",
    "Open analysis": "Ouvrir l’analyse",
    "Under watch": "Sous surveillance",
    "Insufficient data": "Données insuffisantes",
    "Unavailable": "Indisponible",
    "Failed": "Échec",
    "Connected": "Connecté",
    "Data provider connected": "Fournisseur de données connecté",
    "Previous": "Précédent",
    "Next": "Suivant",
    "Page": "Page",
    "Asset": "Actif",
    "Action": "Action",
    "Exchange": "Bourse",
    "Sector": "Secteur",
    "Industry": "Industrie",
    "All markets": "Tous les marchés",
    "Retry": "Réessayer",
    "SYSTEM STATUS": "ÉTAT DU SYSTÈME",
    "SYSTEM": "SYSTÈME",
    "PROVIDER": "FOURNISSEUR DE DONNÉES",
    "PROVIDER STATUS": "ÉTAT DU FOURNISSEUR",
    "DATA SOURCE": "SOURCE DES DONNÉES",
    "SYMBOLS & RECOMMENDATIONS": "SYMBOLES ET RECOMMANDATIONS",
    "MARKET NEWS": "ACTUALITÉS DES MARCHÉS",
    "AI ANALYSIS": "ANALYSE IA",
    "AI CONFIDENCE": "CONFIANCE DE L’IA",
    "ANALYZED ASSETS": "ACTIFS ANALYSÉS",
    "ACTIVE MARKET": "MARCHÉ ACTIF",
    "AI SCANNER": "SCANNER IA",
    "SIGNALS": "SIGNAUX",
    "RISK RADAR": "RADAR DES RISQUES",
    "QUICK ADD": "AJOUT RAPIDE",
    "MY WATCHLIST": "MA LISTE DE SUIVI",
    "FINAL RECOMMENDATION": "RECOMMANDATION FINALE",
    "STRATEGY AGREEMENT": "CONCORDANCE DES STRATÉGIES",
    "TECHNICAL": "ANALYSE TECHNIQUE",
    "RELATED NEWS": "ACTUALITÉS ASSOCIÉES",
    "Status": "État",
    "Updated": "Mis à jour",
    "Real-time": "Temps réel",
    "Active now": "Active maintenant",
    "Inactive": "Inactive",
    "Always open": "Toujours ouverte",
    "Trading sessions · UTC": "Séances de trading · UTC",
    "Now": "Maintenant",
    "Forex sessions": "Séances Forex",
    "Prices may be delayed a few minutes depending on the provider.": "Les cours peuvent être retardés de quelques minutes selon le fournisseur.",
    "Analyzed": "Actifs analysés",
    "Available": "Disponible",
    "Loaded": "Chargé",
    "Funds": "Fonds",
    "Funds filters": "Filtres des fonds",
    "After filters": "Après filtrage",
    "Deduped catalog": "Catalogue dédoublonné",
    "Incomplete rows": "Lignes incomplètes",
    "Merged rows": "Lignes fusionnées",
    "Visible": "Visibles",
    "Hidden": "Masqués",
    "Duplicates": "Doublons",
    "Some symbols may not be available from the current provider": "Certains symboles peuvent ne pas être disponibles auprès du fournisseur actuel",
    "Price currently unavailable": "Cours actuellement indisponible",
    "Price unavailable": "Cours indisponible",
    "Change unavailable": "Variation indisponible",
    "No provider data is available right now.": "Aucune donnée du fournisseur n’est disponible pour le moment.",
    "These are educational analytical signals based on available data and are not financial advice.": "Ces signaux analytiques sont fournis à titre pédagogique à partir des données disponibles et ne constituent pas un conseil financier.",
    "Search symbol or company name": "Rechercher un symbole ou une entreprise",
    "Add to watchlist": "Ajouter à la liste de suivi",
    "Create alert": "Créer une alerte",
    "Remove": "Supprimer",
    "Watching": "Sous surveillance",
    "Wait": "Attendre",
    "Buy": "Acheter",
    "Sell": "Vendre",
    "Neutral": "Neutre",
    "Change": "Variation",
    "Recommendation": "Recommandation",
    "Risk": "Risque",
    "Horizon": "Horizon",
    "Quality": "Qualité",
    "Provider symbol": "Symbole du fournisseur",
    "Fallback": "Solution de repli",
    "Data": "Données",
    "Final": "Final",
    "Consensus": "Consensus",
    "Backtest": "Test rétrospectif",
    "Samples": "Échantillons",
    "Report date": "Date du rapport",
    "Fiscal period": "Période fiscale",
    "Time": "Heure",
    "Country": "Pays",
    "Actual": "Réel",
    "Forecast": "Prévision",
    "Importance": "Importance",
    "Latest news": "Dernières actualités",
    "AI analysis": "Analyse IA",
    "AI analysis status": "État de l’analyse IA",
    "System status": "État du système",
    "News page": "Page d’actualités",
    "Open scanner": "Ouvrir le scanner",
    "View all": "Tout voir",
    "Symbols and recommendations": "Symboles et recommandations",
    "Market news": "Actualités des marchés",
    "Analysis will appear when market data and recommendations are available.": "L’analyse apparaîtra lorsque les données du marché et les recommandations seront disponibles.",
    "The news provider did not return current items.": "Le fournisseur d’actualités n’a renvoyé aucun élément récent.",
    "The price or recommendation provider did not return displayable data.": "Le fournisseur de cours ou de recommandations n’a renvoyé aucune donnée affichable.",
    "Live market data is displaying normally.": "Les données de marché en direct s’affichent normalement.",
    "Market data cannot be displayed right now. Try again shortly.": "Les données de marché ne peuvent pas être affichées pour le moment. Réessayez dans quelques instants.",
    "Data is currently unavailable": "Les données sont actuellement indisponibles",
    "Data is currently unavailable. Try again shortly.": "Les données sont actuellement indisponibles. Réessayez dans quelques instants.",
    "Unable to load data": "Impossible de charger les données",
    "We could not load this data. Try again or open the related page.": "Nous n’avons pas pu charger ces données. Réessayez ou ouvrez la page associée.",
    "No events in the current range": "Aucun événement sur la période actuelle",
    "Try changing the range, market, or event type.": "Essayez de modifier la période, le marché ou le type d’événement.",
    "No connected provider": "Aucun fournisseur connecté",
    "Connect a data provider to show events, dividends, and IPOs.": "Connectez un fournisseur de données pour afficher les événements, les dividendes et les introductions en bourse.",
    "The requested data route could not be reached.": "La source de données demandée est inaccessible.",
    "The request timed out. You can retry without reloading the page.": "La requête a expiré. Vous pouvez réessayer sans recharger la page.",
    "Market calendar": "Calendrier des marchés",
    "Company earnings": "Résultats des entreprises",
    "Dividends": "Dividendes",
    "Economic calendar": "Calendrier économique",
    "Today": "Aujourd’hui",
    "7 days": "7 jours",
    "30 days": "30 jours",
    "90 days": "90 jours",
    "Provider status": "État du fournisseur",
    "Data provider": "Fournisseur de données",
    "Updating calendar": "Actualisation du calendrier",
    "Checking the connected provider and refreshing the selected range.": "Vérification du fournisseur connecté et actualisation de la période sélectionnée.",
    "Education center": "Centre de formation",
    "Lesson": "Leçon",
    "Short lessons explaining terminal limits: no recommendations without data, no synthetic prices, and every symbol keeps its own currency.": "De courtes leçons expliquent les limites du terminal : aucune recommandation sans données, aucun cours synthétique et chaque symbole conserve sa propre devise.",
    "Settings": "Paramètres",
    "Language": "Langue",
    "Theme": "Thème",
    "Dark": "Sombre",
    "Light": "Clair",
    "System": "Système",
    "Save preferences": "Enregistrer les préférences",
    "Signal preferences": "Préférences des signaux",
    "Data policy": "Politique des données",
    "About": "À propos",
    "Platform actions": "Actions de la plateforme",
    "Default market": "Marché par défaut",
    "Risk profile": "Profil de risque",
    "Minimum confidence": "Confiance minimale",
    "Enabled markets": "Marchés activés",
    "Signal alert channels": "Canaux d’alerte des signaux",
    "Refresh market data": "Actualiser les données du marché",
    "Retry now": "Réessayer maintenant",
    "Clear cache": "Vider le cache",
    "Test provider connection": "Tester la connexion au fournisseur",
    "Connection": "Connexion",
    "Loaded symbols": "Symboles chargés",
    "Discovered symbols": "Symboles détectés",
    "Cached symbols": "Symboles en cache",
    "Next retry": "Prochaine tentative",
    "Fallback attempted": "Solution de repli tentée",
    "Supported features": "Fonctionnalités prises en charge",
    "Configured": "Configuré",
    "Not configured": "Non configuré",
    "Conservative": "Prudent",
    "Balanced": "Équilibré",
    "Aggressive": "Dynamique",
    "symbols": "symboles",
    "Yes": "Oui",
    "No": "Non",
    "US market": "Marché américain",
    "Kuwait": "Koweït",
    "Saudi Arabia": "Arabie saoudite",
    "UAE": "Émirats arabes unis",
    "Qatar": "Qatar",
    "Bahrain": "Bahreïn",
    "Oman": "Oman",
    "Forex": "Devises",
    "Crypto": "Cryptoactifs",
    "Commodities": "Matières premières",
    "US Stocks": "Actions américaines",
    "Funds & ETFs": "Fonds et ETF",
    "Saudi Market": "Marché saoudien",
    "Kuwait Market": "Marché koweïtien",
    "UAE Market": "Marché des Émirats",
    "Qatar Market": "Marché qatari",
    "Bahrain Market": "Marché bahreïni",
    "Oman Market": "Marché omanais",
    "European Stocks": "Actions européennes",
    "Asian Stocks": "Actions asiatiques",
    "Technology": "Technologie",
    "AI Stocks": "Actions liées à l’IA",
    "Semiconductors": "Semi-conducteurs",
    "Energy Stocks": "Actions du secteur énergétique",
    "Banking Stocks": "Actions bancaires",
    "Food / Consumer": "Alimentation et consommation",
    "Pharma / Healthcare": "Pharmacie et santé"
  });
  const TERMINAL_FRENCH_EXTRA = Object.freeze({
    "Showing {shown} of {total} symbols": "Affichage de {shown} symboles sur {total}",
    "Showing {shown} of {total} funds": "Affichage de {shown} fonds sur {total}",
    "Showing {shown} of {total} rows": "Affichage de {shown} lignes sur {total}",
    "Deduped {count} duplicate rows": "{count} lignes en double fusionnées",
    "Tune signal preferences and review data-provider status in one clean workspace.": "Réglez les préférences de signaux et consultez l’état du fournisseur de données dans un espace unifié.",
    "Data actions": "Actions sur les données", "Show quick price ticker": "Afficher le bandeau rapide des cours",
    "Buy alerts": "Alertes d’achat", "Sell alerts": "Alertes de vente", "Wait and watch alerts": "Alertes d’attente et de surveillance",
    "In-app alerts": "Alertes dans la plateforme", "Email when available": "E-mail lorsque disponible",
    "Shows the compact price ticker at the top of the terminal.": "Affiche le bandeau compact des cours en haut du terminal.",
    "Show buy signals when enough provider data is available.": "Affiche les signaux d’achat lorsque les données du fournisseur sont suffisantes.",
    "Show sell and risk-exit signals.": "Affiche les signaux de vente et de sortie du risque.",
    "Show wait and watch states instead of hiding them.": "Affiche les états d’attente et de surveillance au lieu de les masquer.",
    "Keep alerts visible inside the terminal.": "Conserve les alertes visibles dans le terminal.",
    "Activates when an email provider is configured.": "S’active lorsqu’un fournisseur de messagerie est configuré.",
    "Provider": "Fournisseur", "Failed symbols": "Symboles en échec", "Affected symbols": "Symboles concernés",
    "Affected symbols count": "Nombre de symboles concernés", "Last attempt": "Dernière tentative", "Rejection reason": "Raison du rejet",
    "Advanced Diagnostics": "Diagnostics avancés", "No active diagnostic details to show.": "Aucun détail de diagnostic actif à afficher.",
    "The data provider usage limit was reached temporarily. We will try a fallback provider or retry later.": "La limite d’utilisation du fournisseur de données a été temporairement atteinte. Une solution de repli sera tentée ou une nouvelle tentative sera effectuée plus tard.",
    "Language and direction": "Langue et sens d’écriture", "Arabic uses RTL layout, while symbols and numbers stay isolated in their official direction.": "L’arabe utilise une mise en page de droite à gauche, tandis que les symboles et les nombres conservent leur sens officiel.",
    "No synthetic data": "Aucune donnée synthétique", "The terminal does not invent prices or recommendations when provider data is unavailable.": "Le terminal n’invente ni cours ni recommandations lorsque les données du fournisseur sont indisponibles.",
    "Signal preferences saved.": "Préférences de signaux enregistrées.", "Saved locally; sign in to save them to the account.": "Enregistré localement ; connectez-vous pour l’enregistrer dans le compte.",
    "Market data refreshed.": "Données de marché actualisées.", "Provider connection tested.": "Connexion au fournisseur testée.",
    "Local provider cache cleared and status refreshed.": "Cache local du fournisseur vidé et état actualisé.",
    "Could not complete the action right now.": "Impossible d’effectuer cette action pour le moment.",
    "Equities": "Actions", "Digital": "Actifs numériques", "Macro": "Macroéconomie", "Benchmarks": "Indices de référence",
    "Global": "Mondial", "Sector": "Secteur", "Pair": "Paire", "Local": "Locale", "Mixed": "Mixte",
    "ETFs": "ETF", "Mutual Funds": "Fonds communs de placement", "Index Funds": "Fonds indiciels",
    "Money Market Funds": "Fonds monétaires", "Bond/Sukuk Funds": "Fonds d’obligations et de sukuk",
    "REITs": "Fonds immobiliers cotés", "Commodity Funds": "Fonds de matières premières", "Sector Funds": "Fonds sectoriels",
    "Thematic Funds": "Fonds thématiques", "Shariah Funds": "Fonds conformes à la charia", "Leveraged ETFs": "ETF à effet de levier",
    "Inverse ETFs": "ETF inversés", "Income Funds": "Fonds de revenu", "Growth Funds": "Fonds de croissance",
    "Balanced Funds": "Fonds équilibrés", "Exchange Traded Funds": "Fonds négociés en bourse", "Bond Funds": "Fonds obligataires",
    "Sukuk Funds": "Fonds de sukuk", "Real Estate Investment Trusts": "Fonds de placement immobilier",
    "Shariah-Compliant Funds": "Fonds conformes à la charia", "Hedge Funds": "Fonds spéculatifs",
    "Price data is currently unavailable.": "Les données de cours sont actuellement indisponibles.",
    "Price, target, or stop is currently unavailable; the trade cannot be followed.": "Le cours, l’objectif ou le stop est actuellement indisponible ; la transaction ne peut pas être suivie.",
    "Retried.": "Nouvelle tentative effectuée.", "Complete markets map": "Carte complète des marchés",
    "Stocks, Gulf markets, currencies, crypto, commodities, indices, funds, and sectors. Each card shows the asset currency instead of inheriting the selected market currency.": "Actions, marchés du Golfe, devises, cryptoactifs, matières premières, indices, fonds et secteurs. Chaque carte affiche la devise de l’actif au lieu d’hériter de celle du marché sélectionné.",
    "Provider market data": "Données de marché du fournisseur", "Company": "Entreprise", "Exchange / Market": "Bourse / Marché",
    "Price / NAV": "Cours / Valeur liquidative", "Compliant": "Conforme", "Non-compliant": "Non conforme",
    "Needs review": "À examiner", "Possibly compliant": "Potentiellement conforme", "trillion": "mille milliards",
    "billion": "milliard", "million": "million", "AI scanner without synthetic results": "Scanner IA sans résultats synthétiques",
    "The scanner sorts only recommendations and signals returned by the API. When the provider is unavailable, the reason is shown clearly.": "Le scanner classe uniquement les recommandations et signaux renvoyés par l’API. Lorsque le fournisseur est indisponible, la raison est clairement indiquée.",
    "Buy opportunities": "Opportunités d’achat", "Buy signals": "Signaux d’achat", "Sell opportunities": "Opportunités de vente",
    "Sell signals": "Signaux de vente", "Scanner results": "Résultats du scanner", "Confidence distribution": "Répartition de la confiance",
    "Risk radar": "Radar des risques", "Strongest": "Les plus forts", "Strongest signals": "Signaux les plus forts",
    "Clean smart watchlist": "Liste de suivi intelligente", "Add the symbols you want to watch. Prices and analysis appear only when available from the provider, and currency follows each symbol.": "Ajoutez les symboles à surveiller. Les cours et analyses n’apparaissent que lorsqu’ils sont disponibles auprès du fournisseur, et la devise suit chaque symbole.",
    "Quick add": "Ajout rapide", "My watchlist": "Ma liste de suivi", "Watchlist is empty": "La liste de suivi est vide",
    "Add symbols above. We will not fill it with synthetic data.": "Ajoutez des symboles ci-dessus. Aucune donnée synthétique ne sera utilisée.",
    "Open markets": "Ouvrir les marchés", "Portfolio and tracking": "Portefeuille et suivi",
    "Track local positions and followed trades. Live market value appears when provider prices are available.": "Suivez les positions locales et les transactions suivies. La valeur de marché en direct apparaît lorsque les cours du fournisseur sont disponibles.",
    "Positions": "Positions", "Holdings": "Avoirs", "Cost basis": "Prix de revient", "Followed trades": "Transactions suivies",
    "Followed": "Suivies", "Current positions": "Positions actuelles", "No positions": "Aucune position",
    "Add a position from symbol details or follow a real recommendation.": "Ajoutez une position depuis les détails du symbole ou suivez une recommandation réelle.",
    "Allocation": "Allocation", "Asset allocation": "Allocation d’actifs",
    "Create price, percent, and signal alerts. Smart alerts come from the provider, and local alerts are saved on your device.": "Créez des alertes de cours, de variation et de signal. Les alertes intelligentes proviennent du fournisseur et les alertes locales sont enregistrées sur votre appareil.",
    "Symbol e.g. AAPL": "Symbole, par ex. AAPL", "Price reaches": "Cours atteint", "Percent change %": "Variation en %",
    "AI signal": "Signal IA", "Market-moving news": "Actualité influençant le marché", "Value": "Valeur", "Add": "Ajouter",
    "Smart alerts": "Alertes intelligentes", "Provider alerts": "Alertes du fournisseur", "No smart alerts": "Aucune alerte intelligente",
    "The provider did not return current alerts.": "Le fournisseur n’a renvoyé aucune alerte actuelle.", "Saved alerts": "Alertes enregistrées",
    "No local alerts": "Aucune alerte locale", "Use the form above to create a tracking alert.": "Utilisez le formulaire ci-dessus pour créer une alerte de suivi.",
    "AI recommendations with each trade status: open, under watch, completed, failed, or expired. Every card has an analysis button.": "Recommandations IA avec l’état de chaque transaction : ouverte, sous surveillance, terminée, échouée ou expirée. Chaque carte comporte un bouton d’analyse.",
    "Signals": "Signaux", "Recommendation list": "Liste des recommandations", "High confidence": "Confiance élevée",
    "Precision · forward test": "Précision · test prospectif", "Live precision — 90% gate signals": "Précision en direct — signaux au seuil de 90 %",
    "Awaiting first result": "En attente du premier résultat", "Tracked signals": "Signaux suivis", "Tracked": "Suivis",
    "Hit target": "Objectif atteint", "Won": "Gagné", "Hit stop": "Stop atteint", "Lost": "Perdu",
    "Live success": "Réussite en direct", "Live rate": "Taux en direct",
    "Every signal that passes the precision gate is logged automatically with its published target and stop, then resolved by the first actual touch. This is live proof of success rate, not historical testing alone.": "Chaque signal qui franchit le seuil de précision est enregistré automatiquement avec son objectif et son stop publiés, puis résolu au premier niveau réellement touché. Il s’agit d’une preuve en direct du taux de réussite, et non d’un simple test historique.",
    "Saved buy/sell signal outcomes, manual followed trades, and recommendation logs. No synthetic results are shown when records are missing.": "Résultats enregistrés des signaux d’achat et de vente, transactions suivies manuellement et journal des recommandations. Aucun résultat synthétique n’est affiché lorsque des données manquent.",
    "Winning trades": "Transactions gagnantes", "Winning": "Gagnantes", "Losing trades": "Transactions perdantes", "Losing": "Perdantes",
    "Open trades": "Transactions ouvertes", "Win rate": "Taux de réussite", "Waiting trades": "Transactions en attente",
    "Trades under watch": "Transactions sous surveillance", "Journal": "Journal", "Detailed journal": "Journal détaillé", "Refresh prices": "Actualiser les cours",
    "News is read from a real provider. When it is unavailable, a clear message is shown instead of synthetic headlines.": "Les actualités proviennent d’un fournisseur réel. Lorsqu’elles sont indisponibles, un message clair s’affiche au lieu de titres synthétiques.",
    "The news provider did not return displayable items.": "Le fournisseur d’actualités n’a renvoyé aucun élément affichable.",
    "Live company earnings, dividends, IPOs, and economic events from real providers. When data is unavailable, the reason is shown clearly without synthetic data.": "Résultats d’entreprises, dividendes, introductions en bourse et événements économiques en direct provenant de fournisseurs réels. Lorsque les données sont indisponibles, la raison est clairement indiquée sans données synthétiques.",
    "Earnings": "Résultats", "IPOs": "Introductions en bourse", "Economic": "Économie",
    "Feature unavailable for the current provider entitlement": "Fonction indisponible avec les droits du fournisseur actuel",
    "This data requires a plan that supports this calendar type.": "Ces données nécessitent une offre prenant en charge ce type de calendrier.",
    "Showing the latest available data until live updates return.": "Affichage des dernières données disponibles jusqu’au retour des mises à jour en direct.",
    "The current provider could not fetch data. No fallback data was shown.": "Le fournisseur actuel n’a pas pu récupérer les données. Aucune donnée de repli n’a été affichée.",
    "Search symbol or company": "Rechercher un symbole ou une entreprise", "No matching earnings rows": "Aucune ligne de résultats correspondante",
    "Partial rows appear here when the provider sends mostly incomplete records.": "Les lignes partielles apparaissent ici lorsque le fournisseur envoie des enregistrements majoritairement incomplets.",
    "Try search, source, timing, or the Partial data tab.": "Essayez de modifier la recherche, la source, la période ou l’onglet Données partielles.",
    "Partially available": "Partiellement disponible", "Connection failed": "Échec de la connexion",
    "Unavailable for entitlement": "Indisponible avec les droits actuels", "Authorization failed": "Échec de l’autorisation",
    "Data provider rate limit reached temporarily": "Limite temporaire du fournisseur de données atteinte", "Invalid request": "Requête non valide",
    "Manual entry": "Saisie manuelle", "Market data": "Données de marché", "High": "Élevé", "Medium": "Moyen", "Low": "Faible",
    "Unspecified": "Non précisé", "Asset name unavailable from provider": "Nom de l’actif indisponible auprès du fournisseur",
    "Provider symbol used": "Symbole du fournisseur utilisé", "Used fallback?": "Solution de repli utilisée ?",
    "Strategy agreement": "Concordance des stratégies", "Technical analysis": "Analyse technique", "AI confidence": "Confiance de l’IA",
    "Raw AI reading": "Lecture brute de l’IA", "No sufficient signal": "Aucun signal suffisant",
    "The provider did not return enough data for this symbol.": "Le fournisseur n’a pas renvoyé suffisamment de données pour ce symbole.",
    "Related news": "Actualités associées", "Try again later or choose another market": "Réessayez plus tard ou choisissez un autre marché",
    "Follow trade": "Suivre la transaction", "Limited consensus": "Consensus limité", "Awaiting data": "En attente de données",
    "Neutral · precision gate active": "Neutre · seuil de précision actif", "Bullish": "Haussier", "Bearish": "Baissier",
    "No sufficient signals right now": "Aucun signal suffisant pour le moment", "Analysis status": "État de l’analyse",
    "Waiting for market data": "En attente des données de marché", "Complete data is not yet available for a reliable recommendation.": "Les données complètes ne sont pas encore disponibles pour produire une recommandation fiable.",
    "Overall market bias": "Orientation générale du marché", "Frame": "Cadre", "Market overview": "Vue d’ensemble du marché",
    "AI market analysis": "Analyse du marché par l’IA", "Market summary": "Résumé du marché", "Analyzed assets": "Actifs analysés",
    "Market command": "Commande du marché", "First-target hit rate in the backtest for this symbol": "Taux d’atteinte du premier objectif dans le test rétrospectif de ce symbole",
    "Opportunity heatmap": "Carte thermique des opportunités", "The provider did not return enough price movement data to show this list.": "Le fournisseur n’a pas renvoyé suffisamment de données de mouvement des cours pour afficher cette liste.",
    "Open settings": "Ouvrir les paramètres", "Chart unavailable": "Graphique indisponible", "Closed": "Fermé",
    "Overall bias": "Orientation générale", "Explore markets": "Explorer les marchés", "AI score": "Score IA",
    "Asset name unavailable": "Nom de l’actif indisponible", "Quantity": "Quantité", "Entry": "Entrée", "Current": "Actuel",
    "P/L": "Pertes et profits", "Entry price": "Cours d’entrée", "Add position": "Ajouter une position", "Price provider": "Fournisseur de cours",
    "Saved trades": "Transactions enregistrées", "Prices updated": "Cours actualisés", "Missing price data": "Données de cours manquantes",
    "Data source": "Source des données", "Performance data status": "État des données de performance", "No followed trades yet": "Aucune transaction suivie pour le moment",
    "Buy and sell signal outcomes will appear here after you save or follow them from recommendations or analysis.": "Les résultats des signaux d’achat et de vente apparaîtront ici après leur enregistrement ou leur suivi depuis les recommandations ou l’analyse.",
    "Open recommendations": "Ouvrir les recommandations", "Run signal scan": "Lancer l’analyse des signaux", "Add followed trade": "Ajouter une transaction suivie",
    "Manual track": "Suivi manuel", "Stop loss": "Stop de protection", "Optional": "Facultatif", "Notes": "Notes",
    "Stocks": "Actions", "Indices": "Indices", "No trades in this category.": "Aucune transaction dans cette catégorie.",
    "Untitled news": "Actualité sans titre", "No related provider news for this symbol.": "Aucune actualité associée du fournisseur pour ce symbole.",
    "Alert": "Alerte", "Alert without additional details.": "Alerte sans détails supplémentaires.", "Open symbol": "Ouvrir le symbole",
    "Percent %": "Pourcentage %", "Delete": "Supprimer", "Cache available": "Cache disponible", "Using stale cache": "Utilisation d’un cache ancien",
    "Live refresh": "Actualisation en direct", "Provider cache": "Cache du fournisseur", "Live data": "Données en direct", "Disabled": "Désactivé",
    "Detailed provider market rows are available under Settings / Admin diagnostics.": "Les lignes détaillées des marchés du fournisseur sont disponibles dans Paramètres / Diagnostics d’administration.",
    "Employees": "Employés", "About the asset and business": "À propos de l’actif et de l’entreprise", "Not enough profile data": "Données de profil insuffisantes",
    "The provider did not return a profile for this symbol. Connect a fundamentals provider to show business activity, description, and market cap.": "Le fournisseur n’a renvoyé aucun profil pour ce symbole. Connectez un fournisseur de données fondamentales pour afficher l’activité, la description et la capitalisation boursière.",
    "Final recommendation": "Recommandation finale", "SPAC stock": "Action de SPAC", "Technical analysis does not apply": "L’analyse technique ne s’applique pas",
    "This is a special purpose acquisition company stock: its price is typically anchored near trust value until a merger is announced, so trend, momentum, and breakout indicators are not meaningful and the system will not issue buy or sell recommendations for it. Decisions here depend on merger news and terms, not the chart.": "Il s’agit d’une action de société d’acquisition à vocation spécifique : son cours reste généralement proche de la valeur fiduciaire jusqu’à l’annonce d’une fusion. Les indicateurs de tendance, de momentum et de cassure ne sont donc pas pertinents, et le système n’émettra pas de recommandation d’achat ou de vente. Les décisions dépendent des modalités et des actualités de la fusion, et non du graphique.",
    "Automated internal screening": "Filtrage interne automatisé", "Shariah compliance": "Conformité à la charia", "Reason": "Raison",
    "Last reviewed": "Dernière révision", "Standard": "Norme", "Business activity + financial ratios screening": "Filtrage de l’activité et des ratios financiers",
    "Preliminary automated classification based on business activity and financial ratio screening (interest-bearing debt <= 33%, interest income <= 5%). This is not a fatwa; for final reliance, consult an accredited Shariah screening service or qualified specialists.": "Classification automatisée préliminaire fondée sur l’activité et les ratios financiers (dette portant intérêt ≤ 33 %, revenus d’intérêts ≤ 5 %). Il ne s’agit pas d’une fatwa ; consultez un service agréé de filtrage conforme à la charia ou des spécialistes qualifiés avant toute décision définitive.",
    "The symbol is not supported by the current provider.": "Le symbole n’est pas pris en charge par le fournisseur actuel.",
    "Historical price data is missing.": "Les données historiques de cours sont manquantes.",
    "The data provider is delayed or temporarily unavailable.": "Le fournisseur de données est retardé ou temporairement indisponible.",
    "Attempted": "Tentée", "Not attempted": "Non tentée", "Only indicators returned by the provider are shown here; unavailable rows are hidden instead of estimated.": "Seuls les indicateurs renvoyés par le fournisseur sont affichés ; les lignes indisponibles sont masquées au lieu d’être estimées.",
    "Target 1 · higher probability": "Objectif 1 · probabilité plus élevée", "Target 2 · extension": "Objectif 2 · extension",
    "Risk/reward": "Risque/rendement", "The first target is intentionally close (around 0.9x ATR) to raise hit probability; historical success is measured against that target. The stop is wider behind the price structure, so risk/reward is read with the second target.": "Le premier objectif est volontairement proche (environ 0,9× l’ATR) afin d’augmenter sa probabilité d’atteinte ; la réussite historique est mesurée par rapport à cet objectif. Le stop est plus large derrière la structure des cours ; le rapport risque/rendement s’apprécie donc avec le deuxième objectif.",
    "Analytical reading based on available data.": "Lecture analytique fondée sur les données disponibles.", "Technical": "Technique",
    "Momentum": "Momentum", "Fundamentals": "Fondamentaux", "Signal": "Signal", "Historical accuracy": "Précision historique",
    "Test samples": "Échantillons du test", "Risk warning": "Avertissement sur les risques", "Trend — moving average cross": "Tendance — croisement des moyennes mobiles",
    "50 MA is above 200 MA (golden cross)": "La moyenne mobile 50 est au-dessus de la moyenne mobile 200 (croisement haussier)",
    "50 MA is below 200 MA (death cross)": "La moyenne mobile 50 est au-dessous de la moyenne mobile 200 (croisement baissier)",
    "RSI — extremes/reversal": "RSI — extrêmes/retournement", "MACD — momentum": "MACD — momentum", "Positive crossover": "Croisement positif",
    "Negative crossover": "Croisement négatif", "Price versus 50 MA": "Cours par rapport à la moyenne mobile 50", "Price above average": "Cours au-dessus de la moyenne",
    "Price below average": "Cours au-dessous de la moyenne", "Support/resistance": "Support/résistance", "Near support": "Près du support",
    "Near resistance": "Près de la résistance", "Inside range": "Dans la zone", "Intraday momentum": "Momentum intrajournalier",
    "Provider recommendation (AI)": "Recommandation du fournisseur (IA)", "No strategy coverage": "Aucune couverture stratégique",
    "Limited agreement: one strategy only": "Concordance limitée : une seule stratégie", "Strategy": "Stratégie",
    "Not enough data is available for this strategy.": "Les données disponibles sont insuffisantes pour cette stratégie.", "Limited agreement": "Concordance limitée",
    "Strategy agreement · not AI confidence or the final recommendation": "Concordance des stratégies · distincte de la confiance de l’IA et de la recommandation finale",
    "Agreement is based on limited strategy coverage, so it is not treated as a strong signal even if the raw percentage is 100%.": "La concordance repose sur une couverture stratégique limitée ; elle n’est donc pas considérée comme un signal fort, même si le pourcentage brut atteint 100 %.",
    "This is only strategy agreement; the final decision combines AI confidence, data quality, samples, risk, and technical analysis.": "Il s’agit uniquement de la concordance des stratégies ; la décision finale combine la confiance de l’IA, la qualité des données, les échantillons, le risque et l’analyse technique.",
    "strategies": "stratégies", "Available from provider": "Disponible auprès du fournisseur", "Data quality / samples": "Qualité des données / échantillons",
    "Notice: All content is for educational and informational purposes only and is not investment advice. Trading involves risk that may include the full loss of capital.": "Avis : tout le contenu est fourni à des fins pédagogiques et informatives uniquement et ne constitue pas un conseil en investissement. Le trading comporte un risque pouvant aller jusqu’à la perte totale du capital.",
    "System online": "Système opérationnel", "Waiting for provider": "En attente du fournisseur",
    "Local alert saved. A price provider is required to trigger it automatically.": "Alerte locale enregistrée. Un fournisseur de cours est nécessaire pour la déclencher automatiquement.",
    "1-3 weeks": "1 à 3 semaines", "Trade added to trade performance.": "Transaction ajoutée au suivi des performances.",
    "Trade saved locally; sign in or apply migrations to save it in the database.": "Transaction enregistrée localement ; connectez-vous ou appliquez les migrations pour l’enregistrer dans la base de données.",
    "No saved recommendation was found for this symbol.": "Aucune recommandation enregistrée n’a été trouvée pour ce symbole.",
    "Followed trade prices were updated.": "Les cours des transactions suivies ont été actualisés.", "Followed trades cannot be updated right now.": "Les transactions suivies ne peuvent pas être actualisées pour le moment.",
    "Local signal scan started; automatic saving requires database permissions.": "Analyse locale des signaux lancée ; l’enregistrement automatique nécessite des autorisations de base de données.",
    "Signal scan started and available candidates were saved.": "Analyse des signaux lancée et candidats disponibles enregistrés.",
    "Enter a symbol.": "Saisissez un symbole.", "Not computed": "Non calculé", "Complete": "Complet", "Live": "En direct",
    "Cached": "En cache", "Delayed": "Différé", "Partial": "Partiel", "Choose market": "Choisir un marché"
  });
  const TRANSLATION_EN_TO_AR = new Map();
  const TRANSLATION_AR_TO_EN = new Map();
  const TRANSLATION_EN_TO_FR = new Map();
  const TRANSLATION_AR_TO_FR = new Map();
  const TRANSLATION_FR_TO_EN = new Map();
  const TRANSLATION_FR_TO_AR = new Map();
  const TRANSLATION_FRAGMENTS = [];
  Object.values(TERMINAL_I18N).forEach((entry) => registerTranslationPair(entry.ar, entry.en, entry.fr || frenchUiText(entry.en)));
  TERMINAL_TEXT_PAIRS.forEach(([en, ar, fr]) => registerTranslationPair(ar, en, fr || frenchUiText(en)));
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const leadershipCore = ["NAS100", "US30", "XAUUSD", "BTCUSD"];
  const INITIAL_LOADING_MAX_MS = 4500;
  const REQUEST_TIMEOUTS = { providerStatus: 8000, quotes: 30000, signals: 8000, news: 12000, calendar: 15000, default: 10000 };
  const MARKET_UNIVERSE_PAGE_SIZE = 50;
  const UNAVAILABLE_MESSAGE = "تعذر تحميل البيانات حالياً";
  const UNAVAILABLE_DESCRIPTION = "لم نتمكن من تحميل هذه البيانات. حاول مرة أخرى أو افتح الصفحة ذات الصلة.";
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
    },
    fr: {
      title: "L’analyse technique est actuellement indisponible",
      description: "Le fournisseur de données actuel n’a pas renvoyé suffisamment d’indicateurs techniques pour cet actif.",
      reasonsTitle: "Raisons possibles",
      reasons: [
        "Le symbole n’est pas pris en charge par le fournisseur actuel",
        "Les données historiques de cours sont manquantes",
        "L’actif est récent ou peu liquide",
        "Retard temporaire du fournisseur"
      ],
      finalNote: "État de l’actif modifié : sous surveillance",
      retry: "Relancer l’analyse",
      changeProvider: "Changer de fournisseur",
      viewPriceData: "Voir les données de cours",
      detailsTitle: "Détails de l’état",
      reasonLabel: "Raison",
      missingFieldsLabel: "Champs manquants",
      fallbackLabel: "Solution de repli tentée",
      providerLabel: "Fournisseur",
      providerSymbolLabel: "Symbole du fournisseur"
    }
  };
  const CRYPTO_DISPLAY_BASES = new Set(["BTC", "ETH", "BNB", "ADA", "APT", "AAVE", "APE", "ALGO", "ATOM", "AVAX", "BCH", "AXS", "ARB", "SOL", "XRP", "DOGE", "DOT", "LTC", "LINK", "USDT", "USDC", "TON", "SUI", "PEPE", "TRX", "XLM", "FIL", "ICP", "ETC", "HBAR", "VET", "NEAR", "OP", "INJ", "GRT", "STX", "COMP"]);
  const DEV_DIAGNOSTICS = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.endsWith(".local");
  const PROVIDER_STATUS_LABELS = {
    provider_status_failed: {
      ar: "تعذر الاتصال بمزود البيانات حالياً",
      en: "Unable to connect to the data provider right now",
      fr: "Impossible de se connecter au fournisseur de données pour le moment"
    },
    provider_status_loading: {
      ar: "جاري تحميل بيانات المزود",
      en: "Loading provider data",
      fr: "Chargement des données du fournisseur"
    },
    provider_status_available: {
      ar: "مزود البيانات متصل",
      en: "Data provider connected",
      fr: "Fournisseur de données connecté"
    },
    provider_status_partial: {
      ar: "بيانات المزود متاحة جزئياً",
      en: "Provider data is partially available",
      fr: "Les données du fournisseur sont partiellement disponibles"
    },
    provider_status_unknown: {
      ar: "حالة مزود البيانات غير معروفة",
      en: "Unknown provider status",
      fr: "État du fournisseur de données inconnu"
    }
  };
  const PROVIDER_STATUS_EXPLANATION = {
    ar: "سيتم عرض البيانات المتاحة فقط، وقد تكون بعض الأسعار أو التحليلات غير مكتملة.",
    en: "Only available data will be shown. Some prices or analysis may be incomplete.",
    fr: "Seules les données disponibles seront affichées. Certains cours ou certaines analyses peuvent être incomplets."
  };
  const PROVIDER_RETRY_LABEL = { ar: "إعادة المحاولة", en: "Retry", fr: "Réessayer" };
  const SETTINGS_COPY = {
    settings: { ar: "الإعدادات", en: "Settings" },
    heroTitle: { ar: "إعدادات النظام", en: "System settings" },
    heroBody: {
      ar: "اضبط تفضيلات الإشارات وراجع حالة مزود البيانات بوضوح.",
      en: "Tune signal preferences and review data-provider status in one clean workspace."
    },
    provider: { ar: "مزود البيانات", en: "Data provider" },
    signalPreferences: { ar: "تفضيلات الإشارات", en: "Signal preferences" },
    dataPolicy: { ar: "سياسة البيانات", en: "Data policy" },
    about: { ar: "حول المنصة", en: "About" },
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
    french: { ar: "الفرنسية", en: "French", fr: "Français" },
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
    aboutBody: { ar: `منصة تداول وتحليل ذكية. إصدار ${VER}.`, en: `AI trading and analysis terminal. Version ${VER}.`, fr: `Terminal intelligent de trading et d’analyse. Version ${VER}.` },
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
  const FUND_PROVIDER_NOTE_FR = "Le fournisseur actuel peut ne pas prendre en charge tous les types de fonds";
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
    // [الاسم, name, المنطقة الزمنية IANA, نوع عطلة نهاية الأسبوع, فتح محلي, إغلاق محلي, رمز المؤشر للسعر الحي]
    ["نيويورك", "New York", "America/New_York", "west", 9.5, 16, "SPX500"],
    ["لندن", "London", "Europe/London", "west", 8, 16.5, "FTSE"],
    ["فرانكفورت", "Frankfurt", "Europe/Berlin", "west", 9, 17.5, "DAX"],
    ["الكويت", "Kuwait", "Asia/Kuwait", "gulf", 9, 12.5, null],
    ["المنامة", "Manama", "Asia/Bahrain", "gulf", 9, 13, null],
    ["مسقط", "Muscat", "Asia/Muscat", "gulf", 10, 13.5, null],
    ["دبي", "Dubai", "Asia/Dubai", "west", 10, 14, null],
    ["الدوحة", "Doha", "Asia/Qatar", "gulf", 9.5, 13, null],
    ["الرياض", "Riyadh", "Asia/Riyadh", "gulf", 10, 15, null],
    ["طوكيو", "Tokyo", "Asia/Tokyo", "west", 9, 15, "NIKKEI"],
    ["هونغ كونغ", "Hong Kong", "Asia/Hong_Kong", "west", 9.5, 16, "HSI"],
    ["سيدني", "Sydney", "Australia/Sydney", "west", 10, 16, null],
  ];
  // جلسات الفوركس الأربع التقليدية (نطاقات ثابتة بتوقيت UTC حسب العرف السائد في السوق)
  const FX_SESSIONS = [
    ["سيدني", "Sydney", [[22, 24], [0, 7]]],
    ["طوكيو", "Tokyo", [[0, 9]]],
    ["لندن", "London", [[8, 17]]],
    ["نيويورك", "New York", [[13, 22]]],
  ];
  function tzNow(tz) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short" }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t).value;
    const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { t: (Number(get("hour")) % 24) + Number(get("minute")) / 60, day: WD[get("weekday")] };
  }
  function tzOffsetHours(tz) {
    // إزاحة المنطقة الزمنية الحالية عن UTC بالساعات، محسوبة لحظياً فتراعي التوقيت الصيفي تلقائياً
    const now = new Date();
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return Math.round(((local - utc) / 3600000) * 4) / 4;
  }
  function fmtHM(v) {
    let hh = Math.floor(((v % 24) + 24) % 24);
    let mm = Math.round((v - Math.floor(v)) * 60);
    if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  function utcNowFraction() {
    const now = new Date();
    return now.getUTCHours() + now.getUTCMinutes() / 60;
  }
  function sessionState(tz, kind, openLocal, closeLocal) {
    const { t, day } = tzNow(tz);
    // عطلة الأسواق الخليجية جمعة-سبت، وباقي الأسواق سبت-أحد؛ اليوم محسوب بالتوقيت المحلي للسوق نفسه
    const weekend = kind === "gulf" ? (day === 5 || day === 6) : (day === 0 || day === 6);
    const open = !weekend && t >= openLocal && t < closeLocal;
    const upcoming = !weekend && t < openLocal;
    const offset = tzOffsetHours(tz);
    const toUTC = (v) => (((v - offset) % 24) + 24) % 24;
    const openUTC = toUTC(openLocal), closeUTC = toUTC(closeLocal);
    return {
      open,
      upcoming,
      weekend,
      openUTC,
      closeUTC,
      label: open
        ? textPair(`يغلق ${fmtHM(closeUTC)} UTC`, `Closes ${fmtHM(closeUTC)} UTC`, `Ferme à ${fmtHM(closeUTC)} UTC`)
        : textPair(`يفتح ${fmtHM(openUTC)} UTC`, `Opens ${fmtHM(openUTC)} UTC`, `Ouvre à ${fmtHM(openUTC)} UTC`)
    };
  }

  const LESSONS = {
    "أساسيات": [
      ["كيف تقرأ توصية الذكاء الاصطناعي؟", "How to read an AI recommendation", "Comment lire une recommandation de l’IA", "التوصية لا تظهر إلا عند وجود مزود بيانات وتحليل مكتمل. عند غياب المزود سترى حالة فارغة بدل أرقام مصطنعة.", "A recommendation appears only when a data provider and complete analysis are available. If the provider is unavailable, an empty state appears instead of invented figures.", "Une recommandation n’apparaît que lorsqu’un fournisseur de données et une analyse complète sont disponibles. Si le fournisseur est indisponible, un état vide remplace les chiffres inventés."],
      ["العملة حسب الأصل", "Currency by asset", "Devise par actif", "كل أصل يستخدم عملته الخاصة من بيانات الرمز أو السوق، وليس من السوق المختار في الواجهة.", "Each asset uses its own currency from the symbol or market data, not the market selected in the interface.", "Chaque actif utilise sa propre devise issue des données du symbole ou du marché, et non celle du marché sélectionné dans l’interface."],
      ["السوق مقابل الرمز", "Market versus symbol", "Marché et symbole", "اختيار السوق يصفّي الرموز فقط؛ السعر والعملة يأتيان من الرمز نفسه.", "Choosing a market only filters symbols; the price and currency come from the symbol itself.", "Le choix d’un marché filtre uniquement les symboles ; le cours et la devise proviennent du symbole lui-même."]
    ],
    "إدارة المخاطر": [
      ["حجم الصفقة", "Position size", "Taille de la position", "حدد حجم المركز ونسبة المخاطرة من رأس المال قبل الدخول في أي صفقة.", "Set the position size and capital risk percentage before entering any trade.", "Définissez la taille de la position et le pourcentage du capital risqué avant toute transaction."],
      ["وقف الخسارة", "Stop loss", "Stop de protection", "ضع نقطة إلغاء واضحة قبل الدخول، والتزم بها دون تحريكها عاطفياً.", "Set a clear invalidation point before entry and follow it without moving it emotionally.", "Définissez un niveau d’invalidation clair avant l’entrée et respectez-le sans le déplacer sous l’effet de l’émotion."],
      ["العائد إلى المخاطرة", "Risk/reward", "Risque/rendement", "ابحث عن صفقات بنسبة عائد/مخاطرة 2:1 على الأقل.", "Look for trades with a risk/reward ratio of at least 2:1.", "Recherchez des transactions avec un rapport risque/rendement d’au moins 2:1."]
    ],
    "التحليل الفني": [
      ["الدعم والمقاومة", "Support and resistance", "Support et résistance", "مناطق يتكرر عندها ارتداد السعر؛ تُستخدم لتحديد الدخول والأهداف.", "Zones where price repeatedly reverses, used to define entries and targets.", "Zones où le cours se retourne régulièrement, utilisées pour définir les entrées et les objectifs."],
      ["الاتجاه", "Trend", "Tendance", "تداول مع الاتجاه العام أعلى احتمالاً من معاكسته.", "Trading with the prevailing trend is more probable than trading against it.", "Négocier dans le sens de la tendance dominante est généralement plus probable que de s’y opposer."],
      ["الحجم", "Volume", "Volume", "تأكيد الحركة السعرية بحجم تداول مرتفع يزيد موثوقيتها.", "Confirming a price move with high trading volume increases its reliability.", "La confirmation d’un mouvement de cours par un volume élevé renforce sa fiabilité."]
    ],
    "المحفظة": [
      ["التنويع", "Diversification", "Diversification", "وزّع المخاطر عبر أسواق وقطاعات مختلفة لتقليل أثر أصل واحد.", "Spread risk across different markets and sectors to reduce the impact of one asset.", "Répartissez le risque entre différents marchés et secteurs afin de réduire l’impact d’un seul actif."],
      ["التوزيع", "Allocation", "Allocation", "حدد نسبة كل فئة أصول وأعد التوازن دورياً.", "Set the share of each asset class and rebalance periodically.", "Définissez la part de chaque classe d’actifs et rééquilibrez périodiquement."]
    ]
  };
  const LESSON_CATEGORY_LABELS = {
    "أساسيات": ["أساسيات", "Fundamentals", "Principes de base"],
    "إدارة المخاطر": ["إدارة المخاطر", "Risk management", "Gestion des risques"],
    "التحليل الفني": ["التحليل الفني", "Technical analysis", "Analyse technique"],
    "المحفظة": ["المحفظة", "Portfolio", "Portefeuille"]
  };

  // Recognizable fallback glyphs use semantic visual roles so they remain
  // legible in every theme without maintaining a second palette in JavaScript.
  const ICON_VISUAL_ROLE_STYLE = Object.freeze({
    neutral: "background:var(--surface-muted);color:var(--foreground-secondary)",
    primary: "background:var(--primary-soft);color:var(--primary)",
    accent: "background:var(--accent-soft);color:var(--accent)",
    success: "background:var(--success-soft);color:var(--success)",
    warning: "background:var(--warning-soft);color:var(--warning)",
    danger: "background:var(--danger-soft);color:var(--danger)",
    info: "background:var(--info-soft);color:var(--info)",
    inverse: "background:var(--foreground);color:var(--background)"
  });
  const BRAND = {
    AAPL: ["A", "neutral"], MSFT: ["⊞", "info"], GOOGL: ["G", "primary"], GOOG: ["G", "primary"],
    NVDA: ["N", "success"], AMZN: ["a", "warning"], META: ["M", "info"], TSLA: ["T", "danger"],
    AMD: ["A", "danger"], INTC: ["i", "info"], NFLX: ["N", "danger"], CRM: ["S", "info"],
    ORCL: ["O", "danger"], JPM: ["J", "warning"], BAC: ["B", "primary"], LLY: ["L", "danger"],
    PFE: ["P", "info"], JNJ: ["J", "danger"], MRK: ["M", "accent"], KO: ["C", "danger"],
    PEP: ["P", "primary"], MCD: ["M", "warning"], COST: ["C", "danger"], PLTR: ["P", "inverse"],
    AVGO: ["B", "danger"], TSM: ["T", "danger"], XOM: ["E", "danger"], CVX: ["C", "info"], OXY: ["O", "danger"]
  };
  const CRYPTO = {
    BTC: ["₿", "warning"], ETH: ["Ξ", "info"], BNB: ["◆", "warning"], SOL: ["◎", "accent"],
    XRP: ["✕", "neutral"], ADA: ["₳", "primary"], DOGE: ["Ð", "warning"], USDT: ["₮", "success"]
  };
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
  const WORKSPACE_VIEW_IDS = Object.freeze({
    dashboard: ["overview", "analysis", "recommendations", "sessions", "heatmap", "news", "diagnostics"],
    markets: ["overview", "data", "filters", "sources", "issues"],
    recommendations: ["overview", "data", "filters", "sources", "issues"],
    news: ["overview", "data", "filters", "sources", "issues"],
    calendar: ["overview", "earnings", "dividends", "ipos", "economic", "sources", "issues"],
    settings: ["overview", "capabilities", "issues", "preferences"]
  });
  const CALENDAR_VIEW_IDS = ["earnings", "dividends", "ipos", "economic"];
  const hydrationLoaded = new Set();
  const hydrationInFlight = new Map();
  const hydrationGeneration = new Map();
  const hydrationExpectedCacheKey = new Map();
  let workspaceHistoryHost = null;

  const state = {
    route: { id: "dashboard" }, loading: true, timeframe: "1D",
    rec: {}, signals: {}, signalAlerts: {}, markets: {}, news: {}, newsContextKey: "", followed: {}, provider: {}, providerStatus: {}, commandCards: {},
    calendarRange: "30", calendarLoading: false, calendarPendingView: "",
    calendarLoaded: { provider: false, earnings: false, dividends: false, ipos: false, economic: false },
    calendarOpen: { earnings: false, dividends: false, ipos: false, economic: false },
    earningsView: { search: "", tab: "complete", sortKey: "reportDate", sortDir: "asc", source: "all", timing: "all", page: 1, pageSize: 10 },
    newsView: { search: "", source: "all" },
    recommendationView: { signal: "all" },
    heatmapView: { search: "", tone: "all", sector: "all", zoom: 1, density: "comfortable", selected: "" },
    drawer: { symbol: "", tab: "summary", compare: [] },
    workspace: {
      dashboard: "overview",
      markets: "overview",
      recommendations: "overview",
      news: "overview",
      calendar: "overview",
      settings: "overview"
    },
    marketUniverseView: { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" },
    marketUniverseActiveMarket: null,
    calendar: { earnings: {}, dividends: {}, ipos: {}, economic: {} },
    watch: read(keys.watch, []), alerts: read(keys.alerts, []), holdings: read(keys.holdings, []), localTrades: read(keys.followed, []),
    settings: read(keys.settings, { lang: "ar", defaultMarket: "us-stocks", risk: "balanced", quickTickerVisible: true }),
    errors: {},
    cache: new Map(), marketCache: new Map()
  };
  state.settings.lang = currentLanguage();
  state.settings.language = state.settings.lang;
  discardTraderThemePreference();

  function registerTranslationPair(ar, en, fr) {
    const arText = String(ar || "").trim();
    const enText = String(en || "").trim();
    if (!arText || !enText) return;
    const frText = String(fr || frenchUiText(enText)).trim();
    TRANSLATION_AR_TO_EN.set(normalizeTranslationKey(arText), enText);
    TRANSLATION_EN_TO_AR.set(normalizeTranslationKey(enText), arText);
    if (frText) {
      TRANSLATION_EN_TO_FR.set(normalizeTranslationKey(enText), frText);
      TRANSLATION_AR_TO_FR.set(normalizeTranslationKey(arText), frText);
      TRANSLATION_FR_TO_EN.set(normalizeTranslationKey(frText), enText);
      TRANSLATION_FR_TO_AR.set(normalizeTranslationKey(frText), arText);
    }
    TRANSLATION_FRAGMENTS.push({ ar: arText, en: enText, fr: frText });
  }

  function frenchUiText(value) {
    const text = String(value ?? "").trim();
    if (!text) return text;
    const exact = TERMINAL_FRENCH_TEXT[text] || TERMINAL_FRENCH_EXTRA[text];
    if (exact) return exact;
    const dynamic = text
      .replace(/^Showing ([\d,.]+) of ([\d,.]+) symbols$/i, "Affichage de $1 symboles sur $2")
      .replace(/^Showing ([\d,.]+) of ([\d,.]+) funds$/i, "Affichage de $1 fonds sur $2")
      .replace(/^Showing ([\d,.]+) of ([\d,.]+) rows$/i, "Affichage de $1 lignes sur $2")
      .replace(/^Page ([\d,.]+) \/ ([\d,.]+)$/i, "Page $1 / $2")
      .replace(/^([\d,.]+) results$/i, "$1 résultats")
      .replace(/^([\d,.]+) symbols$/i, "$1 symboles")
      .replace(/^([\d,.]+) assets$/i, "$1 actifs")
      .replace(/^Loading (.+)$/i, (_match, label) => `Chargement de ${frenchUiText(label).toLocaleLowerCase("fr")}`);
    if (dynamic !== text) return dynamic;
    return text;
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

  function isFrenchLanguage() {
    return currentLanguage() === "fr";
  }

  function isLtrLanguage() {
    return currentLanguage() !== "ar";
  }

  function terminalLocale() {
    return isFrenchLanguage() ? "fr-FR" : isEnglishLanguage() ? "en-US" : "ar-KW";
  }

  function terminalText(key, vars = {}) {
    const entry = TERMINAL_I18N[key] || { ar: key, en: key };
    const lang = currentLanguage();
    let text = lang === "fr"
      ? (entry.fr || frenchUiText(entry.en || key))
      : (entry[lang] || entry.ar || entry.en || key);
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
    return text;
  }

  function textPair(ar, en, fr) {
    if (isFrenchLanguage()) return fr || frenchUiText(en);
    return isEnglishLanguage() ? en : ar;
  }

  function terminalBrandFullTitle() {
    return `${terminalText("terminal.brandPrefix")} ${terminalText("terminal.brandTitle")}`.trim();
  }

  function updateTerminalDocumentTitle(routeId = state.route.id) {
    document.title = `${terminalBrandFullTitle()} | ${routeTitle(routeId)}`;
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
    const exact = isFrenchLanguage()
      ? (TRANSLATION_AR_TO_FR.get(normalized) || TRANSLATION_EN_TO_FR.get(normalized) || frenchUiText(text))
      : isEnglishLanguage()
        ? (TRANSLATION_AR_TO_EN.get(normalized) || TRANSLATION_FR_TO_EN.get(normalized))
        : (TRANSLATION_EN_TO_AR.get(normalized) || TRANSLATION_FR_TO_AR.get(normalized));
    if (exact) return `${leading}${exact}${trailing}`;

    text = translateDynamicUiText(text);
    if (isOfficialMarketCode(text)) return raw;
    return `${leading}${text}${trailing}`;
  }

  function translateDynamicUiText(text) {
    if (isFrenchLanguage()) {
      const dynamic = text
        .replace(/Showing\s+([\d,.\s]+)\s+of\s+([\d,.\s]+)\s+symbols/gi, (_m, shown, total) => `Affichage de ${shown.trim()} symboles sur ${total.trim()}`)
        .replace(/Showing\s+([\d,.\s]+)\s+of\s+([\d,.\s]+)\s+funds/gi, (_m, shown, total) => `Affichage de ${shown.trim()} fonds sur ${total.trim()}`)
        .replace(/Page\s+([\d,.\s]+)\s*\/\s*([\d,.\s]+)/gi, (_m, page, total) => `Page ${page.trim()} / ${total.trim()}`);
      return replaceKnownUiFragments(dynamic);
    }
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
    const source = isFrenchLanguage() ? (hasArabicText(text) ? "ar" : "en") : isEnglishLanguage() ? "ar" : "en";
    const target = isFrenchLanguage() ? "fr" : isEnglishLanguage() ? "en" : "ar";
    return TRANSLATION_FRAGMENTS
      .filter(pair => pair[source] && pair[target] && pair[source].length > 2)
      .sort((a, b) => b[source].length - a[source].length)
      .reduce((output, pair) => {
        const from = pair[source], to = pair[target];
        if (output === from || isOfficialMarketCode(from)) return output;
        return replaceFragmentWithBoundaries(output, from, to);
      }, text);
  }

  function replaceFragmentWithBoundaries(output, from, to) {
    if (!output.includes(from)) return output;
    // الاستبدال عند حدود الكلمات فقط: كلمة "بيع" يجب ألا تُستبدل داخل "أسابيع".
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const letter = "[A-Za-z\\u0600-\\u06FF]";
    try {
      return output.replace(new RegExp(`(?<!${letter})${escaped}(?!${letter})`, "gu"), to);
    } catch (_) {
      return output.split(from).join(to);
    }
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
    return isFrenchLanguage() ? frenchUiText(englishPart) : isEnglishLanguage() ? englishPart : arabicPart;
  }

  function isOfficialMarketCode(value) {
    const text = String(value || "").trim();
    return /^[A-Z0-9]{1,8}([.\-=][A-Z0-9]{1,8})*$/.test(text) || /^[A-Z]{3,6}$/.test(text);
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
      document.body.classList.toggle("language-fr", lang === "fr");
    }
    const shell = document.getElementById("app-shell");
    if (shell) shell.dir = dir;
    updateStaticLanguageLabels();
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
    const mobileMoreToggle = document.getElementById("mobile-more-toggle");
    if (mobileMoreToggle) {
      const moreLabel = terminalText("nav.more");
      mobileMoreToggle.textContent = moreLabel;
      mobileMoreToggle.setAttribute("aria-label", moreLabel);
      mobileMoreToggle.setAttribute("title", moreLabel);
    }
    setText(".brand-card .brand-name strong", terminalBrandFullTitle());
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
    updateTerminalDocumentTitle();
    syncMobileMoreActiveState();
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
      const primary = terminalText(labelKey);
      const secondary = subKey ? terminalText(subKey) : "";
      if (label) label.textContent = primary;
      node.setAttribute("aria-label", primary);
      node.setAttribute("title", primary);
      node.dataset.tooltip = primary;
      if (small) {
        const repeated = !secondary || secondary.trim().toLocaleLowerCase() === primary.trim().toLocaleLowerCase();
        small.hidden = repeated;
        small.textContent = repeated ? "" : secondary;
      }
    });
  }

  function mobileMoreItems() {
    return Array.from(document.querySelectorAll("#mobile-more-menu [role='menuitem']"));
  }

  function syncMobileMoreActiveState() {
    const toggle = document.getElementById("mobile-more-toggle");
    if (!toggle) return;
    const active = mobileMoreItems().some(item => item.dataset.route === state.route.id);
    toggle.classList.toggle("is-active", active);
    if (active) toggle.setAttribute("aria-current", "page");
    else toggle.removeAttribute("aria-current");
  }

  function setMobileMoreOpen(open, options = {}) {
    const toggle = document.getElementById("mobile-more-toggle");
    const menu = document.getElementById("mobile-more-menu");
    _mobileMoreOpen = Boolean(open && toggle && menu);
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", _mobileMoreOpen ? "true" : "false");
    menu.hidden = !_mobileMoreOpen;
    if (_mobileMoreOpen && options.focusFirst) mobileMoreItems()[0]?.focus();
    if (!_mobileMoreOpen && options.restoreFocus) toggle.focus();
  }

  function handleMobileMoreKeydown(event) {
    if (!_mobileMoreOpen) return false;
    const items = mobileMoreItems();
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileMoreOpen(false, { restoreFocus: true });
      return true;
    }
    if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return false;
    event.preventDefault();
    const index = items.indexOf(document.activeElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (index < 0 ? 0 : (index + 1) % items.length)
          : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
    items[nextIndex]?.focus();
    return true;
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = text; });
  }

  function setAttr(selector, attr, value) {
    document.querySelectorAll(selector).forEach((node) => { node.setAttribute(attr, value); });
  }

  function routeTitle(routeId) {
    return terminalText(`route.${routeId || "dashboard"}`);
  }

  function marketName(market) {
    return textPair(market.ar, market.en, market.fr);
  }

  function marketFamilyName(family) {
    const labels = {
      Equities: ["الأسهم", "Equities", "Actions"],
      FX: ["العملات", "FX", "Devises"],
      Digital: ["الأصول الرقمية", "Digital", "Actifs numériques"],
      Macro: ["الاقتصاد الكلي", "Macro", "Macroéconomie"],
      Benchmarks: ["المؤشرات", "Benchmarks", "Indices de référence"],
      Funds: ["الصناديق", "Funds", "Fonds"],
      Tadawul: ["تداول", "Tadawul", "Tadawul"],
      Boursa: ["بورصة", "Boursa", "Boursa"],
      "ADX/DFM": ["ADX/DFM", "ADX/DFM", "ADX/DFM"],
      QSE: ["QSE", "QSE", "QSE"],
      BHB: ["BHB", "BHB", "BHB"],
      MSX: ["MSX", "MSX", "MSX"],
      Global: ["عالمي", "Global", "International"],
      Sector: ["قطاع", "Sector", "Secteur"]
    };
    const label = labels[family];
    return label ? textPair(label[0], label[1], label[2]) : String(family || "");
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
    syncWorkspaceViewFromLocation(state.route.id);
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

  function invalidateHydrationCache(...keys) {
    Array.from(hydrationLoaded).forEach((cacheKey) => {
      if (keys.some(key => cacheKey === key || cacheKey.startsWith(`${key}:`))) hydrationLoaded.delete(cacheKey);
    });
    keys.forEach((key) => {
      hydrationGeneration.set(key, (hydrationGeneration.get(key) || 0) + 1);
      hydrationExpectedCacheKey.delete(key);
    });
  }

  async function hydrate(force = false) {
    const commandSymbols = dashboardSymbols();
    const newsPath = marketNewsPath(12);
    const routeId = state.route.id;
    const needs = new Set();
    if (routeId === "dashboard") ["rec", "commandCards", "signals", "signalAlerts", "markets", "news", "followed", "providerStatus"].forEach(key => needs.add(key));
    else if (["ai-scanner", "recommendations"].includes(routeId)) ["rec", "signals", "providerStatus"].forEach(key => needs.add(key));
    else if (routeId === "markets") ["markets", "providerStatus"].forEach(key => needs.add(key));
    else if (routeId === "news") ["news", "providerStatus"].forEach(key => needs.add(key));
    else if (routeId === "alerts") ["rec", "signals", "signalAlerts", "providerStatus"].forEach(key => needs.add(key));
    else if (["portfolio", "trade-performance"].includes(routeId)) ["rec", "followed", "providerStatus"].forEach(key => needs.add(key));
    else if (routeId === "watchlist") ["rec", "providerStatus"].forEach(key => needs.add(key));
    else if (routeId === "settings") needs.add("providerStatus");
    else if (routeId !== "calendar") needs.add("providerStatus");

    const requestMap = {
      rec: { cacheKey: `rec:${marketApi(state.settings.defaultMarket)}`, load: () => get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`), label: "quotes" },
      commandCards: { cacheKey: `commandCards:${commandSymbols.join(",")}`, load: () => get(`/recommendations?symbols=${encodeURIComponent(commandSymbols.join(","))}`), label: "quotes" },
      signals: { cacheKey: "signals", load: () => get("/market/signals?limit=60"), label: "signals" },
      signalAlerts: { cacheKey: "signalAlerts", load: () => get("/market/signal-alerts?limit=50"), label: "signals" },
      markets: { cacheKey: "markets", load: () => get("/markets"), label: "quotes" },
      news: { cacheKey: `news:${newsPath}`, load: () => get(newsPath), label: "news" },
      followed: { cacheKey: "followed", load: () => get("/followed-trades"), label: "quotes" },
      providerStatus: { cacheKey: "providerStatus", load: () => get("/trader/provider-status", { label: "providerStatus" }), label: "providerStatus" }
    };
    const requests = [];
    Array.from(needs).forEach((key) => {
      const request = requestMap[key];
      const cacheKey = request.cacheKey || key;
      const previousCacheKey = hydrationExpectedCacheKey.get(key);
      const contextChanged = previousCacheKey !== undefined && previousCacheKey !== cacheKey;
      if (contextChanged) hydrationGeneration.set(key, (hydrationGeneration.get(key) || 0) + 1);
      hydrationExpectedCacheKey.set(key, cacheKey);
      const generation = hydrationGeneration.get(key) || 0;
      if (!force && !contextChanged && hydrationLoaded.has(cacheKey)) return;
      let inFlight = hydrationInFlight.get(cacheKey);
      if (!inFlight || inFlight.key !== key || inFlight.generation !== generation) {
        const promise = Promise.resolve().then(request.load);
        inFlight = { key, generation, promise };
        hydrationInFlight.set(cacheKey, inFlight);
      }
      requests.push({ key, cacheKey, generation, label: request.label, promise: inFlight.promise });
    });
    const settled = await Promise.allSettled(requests.map(request => request.promise));
    settled.forEach((result, index) => {
      const request = requests[index];
      const isCurrent = hydrationExpectedCacheKey.get(request.key) === request.cacheKey
        && (hydrationGeneration.get(request.key) || 0) === request.generation;
      if (isCurrent) {
        state[request.key] = settledValue(result, request.label);
        if (request.key === "providerStatus") state.calendarLoaded.provider = true;
        hydrationLoaded.add(request.cacheKey);
      }
      if (hydrationInFlight.get(request.cacheKey)?.promise === request.promise) hydrationInFlight.delete(request.cacheKey);
    });
    if (needs.has("news")) state.newsContextKey = newsPath;
    state.providerStatus = state.providerStatus || {};
    state.provider = state.providerStatus.dataProvider || state.commandCards.dataProvider || state.rec.dataProvider || state.markets.dataProvider || state.news.dataProvider || state.commandCards.provider || state.rec.provider || state.markets.provider || state.news.provider || { configured: false, status: "not_configured" };
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
      lang: currentLanguage(),
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

  function discardTraderThemePreference() {
    delete state.settings.theme;
    [keys.settings, LEGACY_SETTINGS_STORAGE_KEY].forEach((storageKey) => {
      const stored = read(storageKey, null);
      if (!stored || typeof stored !== "object" || !("theme" in stored)) return;
      const next = { ...stored };
      delete next.theme;
      write(storageKey, next);
    });
    try { localStorage.removeItem("sfmTraderTheme"); } catch (_error) {}
  }

  /* ─────────────────────────── Router ─────────────────────────── */
  function bind() {
    bindWorkspaceHostHistory();
    window.addEventListener("pagehide", unbindWorkspaceHostHistory);
    window.addEventListener("pageshow", bindWorkspaceHostHistory);
    document.addEventListener("click", (event) => {
      if (_mobileMoreOpen && !event.target.closest("[data-mobile-more]")) setMobileMoreOpen(false);
      const link = event.target.closest("[data-route-link]");
      if (link) { event.preventDefault(); navigate(link.getAttribute("href")); return; }
      const mobileMoreToggle = event.target.closest("[data-mobile-more-toggle]");
      if (mobileMoreToggle) {
        event.preventDefault();
        setMobileMoreOpen(!_mobileMoreOpen, { focusFirst: !_mobileMoreOpen });
        return;
      }
      const settingsAction = event.target.closest("[data-settings-action]");
      if (settingsAction) {
        event.preventDefault();
        handleSettingsAction(settingsAction.dataset.settingsAction).catch((error) => {
          devLog("settings", "failed", { message: errorMessage(error) });
          toast(settingsT("actionFailed"));
        });
        return;
      }
      const drawerClose = event.target.closest("[data-drawer-close]");
      if (drawerClose) { event.preventDefault(); closeSymbolDrawer(); return; }
      const drawerTab = event.target.closest("[data-drawer-tab]");
      if (drawerTab) {
        event.preventDefault();
        setDrawerTab(drawerTab.dataset.drawerTab, { focus: true });
        return;
      }
      const drawerAnalyze = event.target.closest("[data-drawer-analyze]");
      if (drawerAnalyze) { event.preventDefault(); setDrawerTab("ai", { focus: true }); return; }
      const drawerWatch = event.target.closest("[data-drawer-watch]");
      if (drawerWatch) { event.preventDefault(); toggleDrawerWatch(drawerWatch.dataset.drawerWatch); return; }
      const drawerAlert = event.target.closest("[data-drawer-alert]");
      if (drawerAlert) { event.preventDefault(); drawerFocusPending = true; createAlert(drawerAlert.dataset.drawerAlert); return; }
      const drawerCompare = event.target.closest("[data-drawer-compare]");
      if (drawerCompare) {
        event.preventDefault();
        const symbol = sym(drawerCompare.dataset.drawerCompare);
        if (symbol && !state.drawer.symbol) openSymbolDrawer(symbol, drawerCompare);
        toggleDrawerCompare(symbol);
        return;
      }
      const drawerExport = event.target.closest("[data-drawer-export]");
      if (drawerExport) { event.preventDefault(); exportDrawerSymbol(drawerExport.dataset.drawerExport, drawerExport); return; }
      const drawerShare = event.target.closest("[data-drawer-share]");
      if (drawerShare) {
        event.preventDefault();
        shareDrawerSymbol(drawerShare.dataset.drawerShare).catch(() => {
          toast(textPair("تعذر نسخ الرابط على هذا الجهاز.", "Link copying is unavailable on this device.", "La copie du lien n’est pas disponible sur cet appareil."));
        });
        return;
      }
      const drawerFull = event.target.closest("[data-drawer-full]");
      if (drawerFull) {
        event.preventDefault();
        const symbol = sym(drawerFull.dataset.drawerFull);
        closeSymbolDrawer({ restoreFocus: false });
        if (symbol) navigate(`${ROOT}/symbol-details/${encodeURIComponent(symbol)}`);
        return;
      }
      const heatmapTone = event.target.closest("[data-heatmap-tone]");
      if (heatmapTone) {
        event.preventDefault();
        state.heatmapView.tone = heatmapTone.dataset.heatmapTone || "all";
        renderAndRestoreFocus(`[data-heatmap-tone="${state.heatmapView.tone}"]`);
        return;
      }
      const heatmapZoom = event.target.closest("[data-heatmap-zoom]");
      if (heatmapZoom) {
        event.preventDefault();
        const action = heatmapZoom.dataset.heatmapZoom;
        state.heatmapView.zoom = action === "reset" ? 1 : Math.max(0.8, Math.min(1.4, state.heatmapView.zoom + (action === "in" ? 0.1 : -0.1)));
        renderAndRestoreFocus(`[data-heatmap-zoom="${action}"]`);
        return;
      }
      const heatmapDensity = event.target.closest("[data-heatmap-density]");
      if (heatmapDensity) {
        event.preventDefault();
        state.heatmapView.density = heatmapDensity.dataset.heatmapDensity === "compact" ? "compact" : "comfortable";
        renderAndRestoreFocus(`[data-heatmap-density="${state.heatmapView.density}"]`);
        return;
      }
      const workspaceTab = event.target.closest("[data-workspace-tab]");
      if (workspaceTab) {
        event.preventDefault();
        setWorkspaceView(workspaceTab.dataset.workspaceScope, workspaceTab.dataset.workspaceTab, { focus: false });
        return;
      }
      const recommendationSignal = event.target.closest("[data-rec-signal]");
      if (recommendationSignal) {
        event.preventDefault();
        state.recommendationView.signal = recommendationSignal.dataset.recSignal || "all";
        render();
        return;
      }
      const tab = event.target.closest("[data-tab]");
      if (tab) { event.preventDefault(); onTab(tab); return; }
      const tf = event.target.closest("[data-timeframe]");
      if (tf) { event.preventDefault(); state.timeframe = tf.dataset.timeframe; render(); return; }
      const cr = event.target.closest("[data-calendar-range]");
      if (cr) {
        event.preventDefault();
        const activeCalendarView = workspaceView("calendar");
        state.calendarRange = cr.dataset.calendarRange || "30";
        state.earningsView.page = 1;
        state.calendarLoaded = { provider: state.calendarLoaded.provider, earnings: false, dividends: false, ipos: false, economic: false };
        state.calendarLoading = true;
        render();
        loadCalendars(true, CALENDAR_VIEW_IDS.includes(activeCalendarView) ? [activeCalendarView] : []).catch((error) => {
          devLog("calendar", "failed", { message: errorMessage(error) });
        }).finally(() => {
          state.calendarLoading = false;
          render();
          afterRoute();
        });
        return;
      }
      const calendarRetry = event.target.closest("[data-calendar-retry-kind]");
      if (calendarRetry) {
        event.preventDefault();
        const kind = calendarRetry.dataset.calendarRetryKind;
        if (!CALENDAR_VIEW_IDS.includes(kind)) return;
        state.calendarLoaded[kind] = false;
        state.calendarLoading = true;
        render();
        loadCalendars(true, [kind]).catch((error) => {
          devLog("calendar", "failed", { view: kind, message: errorMessage(error) });
        }).finally(() => {
          state.calendarLoading = false;
          render();
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
      if (detail) { event.preventDefault(); const s = sym(detail.dataset.symbolDetails); if (s) openSymbolDrawer(s, detail); return; }
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
      if (runSignals) { event.preventDefault(); runSignalRefresh(runSignals); return; }
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
    });
    document.addEventListener("keydown", function(ev) {
      if (handleSymbolDrawerKeydown(ev)) return;
      if (dismissFocusedTooltip(ev)) return;
      if (handleMobileMoreKeydown(ev)) return;
      if (handleWorkspaceTabKeydown(ev)) return;
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
      if (!symbol) return toast(textPair("اكتب رمزاً أولاً، مثل AAPL أو BTCUSD.", "Enter a symbol first, such as AAPL or BTCUSD.", "Saisissez d’abord un symbole, comme AAPL ou BTCUSD."));
      navigate(`${ROOT}/symbol-details/${encodeURIComponent(symbol)}`);
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
      const form = event.target.closest("[data-news-search-form]");
      if (!form) return;
      event.preventDefault();
      state.newsView.search = String(new FormData(form).get("newsSearch") || "").trim();
      render();
    });
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-heatmap-search-form]");
      if (!form) return;
      event.preventDefault();
      state.heatmapView.search = String(new FormData(form).get("heatmapSearch") || "").trim();
      renderAndRestoreFocus('[data-heatmap-search-form] input[name="heatmapSearch"]');
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
      const filter = event.target.closest("[data-news-source-filter]");
      if (!filter) return;
      state.newsView.source = filter.value || "all";
      render();
    });
    document.addEventListener("change", (event) => {
      const filter = event.target.closest("[data-heatmap-sector]");
      if (!filter) return;
      state.heatmapView.sector = filter.value || "all";
      renderAndRestoreFocus("[data-heatmap-sector]");
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
    window.addEventListener("popstate", (event) => {
      const previousRoute = state.route;
      const nextRoute = readRoute();
      const routeChanged = previousRoute.id !== nextRoute.id
        || previousRoute.market !== nextRoute.market
        || previousRoute.symbol !== nextRoute.symbol;
      state.route = nextRoute;
      const scope = state.route.id;
      const historyWorkspace = event.state && event.state.sfmWorkspace;
      const values = WORKSPACE_VIEW_IDS[scope] || [];
      const isWorkspaceHistory = Boolean(historyWorkspace && historyWorkspace.scope === scope);
      const historyValue = isWorkspaceHistory ? historyWorkspace.value : "";
      const activeView = values.includes(historyValue)
        ? (state.workspace[scope] = historyValue)
        : syncWorkspaceViewFromLocation(scope);
      if (!activeView || !activateMountedWorkspace(scope, activeView)) render();
      if (routeChanged) afterRoute();
      else if (isWorkspaceHistory) afterWorkspaceViewChange(scope, activeView);
      else afterRoute();
    });
    window.addEventListener("resize", syncWorkspaceLayout, { passive: true });
    window.addEventListener("storage", (event) => {
      if ([LANG_STORAGE_KEY, keys.settings].includes(event.key || "")) {
        state.settings.lang = currentLanguage();
        state.settings.language = state.settings.lang;
        applyTerminalLanguage();
        render();
      }
      if (["sfm-density", "sfm_settings"].includes(event.key || "")) {
        // Keep the terminal in step when the parent app's density toggle
        // changes the shared preference in another tab (no reload needed).
        try {
          let density = localStorage.getItem("sfm-density");
          if (density !== "comfortable" && density !== "compact") {
            const settings = JSON.parse(localStorage.getItem("sfm_settings") || "{}");
            density = settings && (settings.density === "comfortable" || settings.density === "compact")
              ? settings.density
              : "auto";
          }
          document.documentElement.dataset.density = density;
        } catch (_) {
          document.documentElement.dataset.density = "auto";
        }
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
    setMobileMoreOpen(false);
    try { history.pushState({}, "", href); } catch (_e) { location.href = href; return; }
    state.route = readRoute();
    syncWorkspaceViewFromLocation(state.route.id);
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
        const activeCalendarView = workspaceView("calendar");
        await loadCalendars(true, CALENDAR_VIEW_IDS.includes(activeCalendarView) ? [activeCalendarView] : []);
      } else if (state.route.id === "news") {
        await loadNews(true);
      } else if (state.route.id === "ai-scanner" || state.route.id === "recommendations") {
        state.rec = { status: "loading" };
        state.signals = { status: "loading" };
        await ensureScanData(true);
      } else {
        state.marketCache.clear();
        await hydrate(true);
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

  function workspaceDefault(scope) {
    return (WORKSPACE_VIEW_IDS[scope] || ["overview"])[0];
  }

  function sameOriginWorkspaceHost() {
    if (window.parent === window) return null;
    try {
      return window.parent.location.origin === window.location.origin ? window.parent : null;
    } catch (_error) {
      return null;
    }
  }

  function workspaceHistoryWindow() {
    return sameOriginWorkspaceHost() || window;
  }

  function bindWorkspaceHostHistory() {
    const host = sameOriginWorkspaceHost();
    if (host === workspaceHistoryHost) return;
    unbindWorkspaceHostHistory();
    workspaceHistoryHost = host;
    workspaceHistoryHost?.addEventListener("popstate", handleWorkspaceHostPopState);
  }

  function unbindWorkspaceHostHistory() {
    if (!workspaceHistoryHost) return;
    try { workspaceHistoryHost.removeEventListener("popstate", handleWorkspaceHostPopState); } catch (_error) {}
    workspaceHistoryHost = null;
  }

  function handleWorkspaceHostPopState(event) {
    const scope = state.route.id;
    const values = WORKSPACE_VIEW_IDS[scope] || [];
    if (!values.length) return;
    const historyWorkspace = event.state && event.state.sfmWorkspace;
    const historyValue = historyWorkspace && historyWorkspace.scope === scope ? historyWorkspace.value : "";
    const activeView = values.includes(historyValue)
      ? (state.workspace[scope] = historyValue)
      : syncWorkspaceViewFromLocation(scope);
    if (!activeView || !activateMountedWorkspace(scope, activeView)) render();
    afterWorkspaceViewChange(scope, activeView);
    window.dispatchEvent(new CustomEvent("sfm:workspace-change", { detail: { scope, value: activeView } }));
  }

  function syncWorkspaceViewFromLocation(scope = state.route.id) {
    const values = WORKSPACE_VIEW_IDS[scope];
    if (!values) return "";
    const requested = new URLSearchParams(workspaceHistoryWindow().location.search).get("view");
    const next = values.includes(requested) ? requested : workspaceDefault(scope);
    state.workspace[scope] = next;
    return next;
  }

  function workspaceView(scope) {
    const values = WORKSPACE_VIEW_IDS[scope] || [];
    const current = state.workspace[scope];
    return values.includes(current) ? current : workspaceDefault(scope);
  }

  function workspaceTabBar(scope, tabs, label, options = {}) {
    const active = workspaceView(scope);
    const keepMounted = options.keepMounted === true;
    return `<div class="workspace-tabs-shell" data-workspace-shell="${h(scope)}" data-workspace-keep-mounted="${keepMounted ? "true" : "false"}">
      <nav class="workspace-tabs" role="tablist" aria-label="${h(label)}" data-workspace-tablist="${h(scope)}">
        ${tabs.map((tab) => {
          const selected = tab.id === active;
          return `<button type="button" role="tab" id="workspace-${h(scope)}-tab-${h(tab.id)}" aria-selected="${selected ? "true" : "false"}" aria-controls="workspace-${h(scope)}-panel-${h(tab.id)}" tabindex="${selected ? "0" : "-1"}" data-workspace-tab="${h(tab.id)}" data-workspace-scope="${h(scope)}" class="${selected ? "is-active" : ""}"><span>${h(tab.label)}</span>${Number.isFinite(Number(tab.count)) ? `<b>${h(latinNumber(Number(tab.count)))}</b>` : ""}</button>`;
        }).join("")}
      </nav>${keepMounted ? "" : tabs.filter(tab => tab.id !== active).map(tab => `<section id="workspace-${h(scope)}-panel-${h(tab.id)}" role="tabpanel" aria-labelledby="workspace-${h(scope)}-tab-${h(tab.id)}" hidden></section>`).join("")}
    </div>`;
  }

  function workspacePanel(scope, value, content, options = {}) {
    const active = workspaceView(scope) === value;
    if (!active && options.keepMounted !== true) return "";
    return `<section class="workspace-tab-panel ${options.className || ""}" id="workspace-${h(scope)}-panel-${h(value)}" role="tabpanel" aria-labelledby="workspace-${h(scope)}-tab-${h(value)}" tabindex="0" data-workspace-panel="${h(value)}" data-workspace-scope="${h(scope)}" ${active ? "" : "hidden"}>${content}</section>`;
  }

  function activateMountedWorkspace(scope, value) {
    const shell = document.querySelector(`[data-workspace-shell="${scope}"]`);
    if (!shell || shell.dataset.workspaceKeepMounted !== "true") return false;
    document.querySelectorAll(`[data-workspace-tab][data-workspace-scope="${scope}"]`).forEach((button) => {
      const selected = button.dataset.workspaceTab === value;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(`[data-workspace-panel][data-workspace-scope="${scope}"]`).forEach((panel) => {
      panel.hidden = panel.dataset.workspacePanel !== value;
    });
    return true;
  }

  function setWorkspaceView(scope, value, options = {}) {
    const values = WORKSPACE_VIEW_IDS[scope] || [];
    if (!values.includes(value)) return;
    const previous = workspaceView(scope);
    state.workspace[scope] = value;
    if (options.history !== false && previous !== value) {
      const historyWindow = workspaceHistoryWindow();
      const url = new URL(historyWindow.location.href);
      if (value === workspaceDefault(scope)) url.searchParams.delete("view");
      else url.searchParams.set("view", value);
      const method = options.replace ? "replaceState" : "pushState";
      const priorState = historyWindow.history.state && typeof historyWindow.history.state === "object" ? historyWindow.history.state : {};
      historyWindow.history[method]({ ...priorState, sfmWorkspace: { scope, value } }, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const switchedInPlace = activateMountedWorkspace(scope, value);
    if (!switchedInPlace) render();
    if (options.focus !== false) {
      window.requestAnimationFrame(() => document.getElementById(`workspace-${scope}-tab-${value}`)?.focus());
    }
    afterWorkspaceViewChange(scope, value);
    window.dispatchEvent(new CustomEvent("sfm:workspace-change", { detail: { scope, value } }));
  }

  function afterWorkspaceViewChange(scope, value) {
    if (scope !== "calendar") return;
    if (!CALENDAR_VIEW_IDS.includes(value) || state.calendarLoaded[value]) {
      state.calendarPendingView = "";
      return;
    }
    if (state.calendarLoading) {
      state.calendarPendingView = value;
      return;
    }
    state.calendarPendingView = "";
    state.calendarLoading = true;
    render();
    loadCalendars(false, [value]).catch((error) => {
      devLog("calendar", "failed", { view: value, message: errorMessage(error) });
    }).finally(() => {
      state.calendarLoading = false;
      render();
      const pendingView = state.calendarPendingView;
      state.calendarPendingView = "";
      if (pendingView && workspaceView("calendar") === pendingView && !state.calendarLoaded[pendingView]) {
        afterWorkspaceViewChange("calendar", pendingView);
      }
    });
    document.addEventListener("focusout", clearDismissedTooltip);
    document.addEventListener("pointerout", clearDismissedTooltip);
    document.addEventListener("focusin", clearDismissedTooltip);
    document.addEventListener("pointerover", clearDismissedTooltip);
  }

  function handleWorkspaceTabKeydown(event) {
    const current = event.target.closest?.("[role='tab'][data-workspace-tab]");
    if (!current) return false;
    const list = current.closest("[data-workspace-tablist]");
    const tabs = Array.from(list?.querySelectorAll("[data-workspace-tab]:not([disabled])") || []);
    if (!tabs.length) return false;
    const index = tabs.indexOf(current);
    const rtl = (list.closest("[dir]")?.getAttribute("dir") || document.documentElement.dir) === "rtl";
    let nextIndex = index;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else if (event.key === "ArrowRight") nextIndex = (index + (rtl ? -1 : 1) + tabs.length) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + (rtl ? 1 : -1) + tabs.length) % tabs.length;
    else return false;
    event.preventDefault();
    const next = tabs[nextIndex];
    setWorkspaceView(next.dataset.workspaceScope, next.dataset.workspaceTab, { focus: true });
    return true;
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
    updateTerminalDocumentTitle();
    document.querySelectorAll("[data-route]").forEach((node) => {
      const active = node.dataset.route === state.route.id || (state.route.id === "symbol-details" && node.dataset.route === "symbol-details");
      node.classList.toggle("is-active", active);
      if (active) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    syncMobileMoreActiveState();
    const skipLink = document.querySelector(".terminal-skip-link");
    if (skipLink) {
      const skipLabel = textPair("تخطَّ إلى المحتوى", "Skip to content", "Aller au contenu");
      skipLink.textContent = skipLabel;
      skipLink.setAttribute("aria-label", skipLabel);
    }
    status(); ticker(); statusBar();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
    translateRenderedUi(document.getElementById("app-shell") || content);
    enhanceCommandDeckSemantics(content);
    renderSymbolDrawer();
    window.requestAnimationFrame(syncWorkspaceLayout);
  }

  function renderAndRestoreFocus(selector) {
    render();
    window.requestAnimationFrame(() => document.querySelector(selector)?.focus());
  }

  function enhanceCommandDeckSemantics(root) {
    root.querySelectorAll(".command-deck-card").forEach(card => {
      const heading = card.querySelector(".command-deck-head > span:first-child");
      const label = heading?.textContent?.trim();
      if (!label) return;
      heading.setAttribute("role", "heading");
      heading.setAttribute("aria-level", "3");
      card.setAttribute("aria-label", label);
    });
  }

  function syncWorkspaceLayout() {
    const topbar = document.querySelector(".terminal-topbar");
    const top = topbar ? Math.ceil(topbar.getBoundingClientRect().height + 12) : 12;
    document.documentElement.style.setProperty("--workspace-sticky-top", `${top}px`);
    const active = document.querySelector("[data-workspace-tab][aria-selected='true']");
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function afterRoute() {
    const id = state.route.id;
    if (id !== "calendar") hydrate().catch((error) => devLog("route-hydration", "failed", { route: id, message: errorMessage(error) }));
    if (id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
    if (id === "markets" && state.route.market) {
      if (state.marketUniverseActiveMarket !== state.route.market) {
        state.marketUniverseActiveMarket = state.route.market;
        state.marketUniverseView = { page: 1, pageSize: MARKET_UNIVERSE_PAGE_SIZE, q: "", exchange: "all", currency: "all", sector: "all", industry: "all", assetType: "all", fundType: "all", availability: "all", sort: "symbol", dir: "asc" };
      }
      loadMarket(state.route.market);
    }
    if (id === "calendar" && !state.calendarLoading) {
      const activeCalendarView = workspaceView("calendar");
      const requiredKinds = CALENDAR_VIEW_IDS.includes(activeCalendarView) ? [activeCalendarView] : [];
      const needsProvider = !state.calendarLoaded.provider;
      const needsData = requiredKinds.some(kind => !state.calendarLoaded[kind]);
      if (!needsProvider && !needsData) return;
      state.calendarPendingView = "";
      state.calendarLoading = true;
      render();
      loadCalendars(false, requiredKinds).catch((error) => {
        devLog("calendar", "failed", { message: errorMessage(error) });
      }).finally(() => {
        state.calendarLoading = false;
        render();
        // A user may switch tabs while the provider summary is still loading.
        // Re-evaluate the active view so its first dataset request is not lost.
        afterRoute();
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
    const rec = recs();
    const active = workspaceView("dashboard");
    const tabs = [
      { id: "overview", label: textPair("نظرة عامة", "Overview", "Vue d’ensemble") },
      { id: "analysis", label: textPair("تحليل السوق", "Market Analysis", "Analyse du marché") },
      { id: "recommendations", label: textPair("التوصيات", "Recommendations", "Recommandations"), count: rec.length },
      { id: "sessions", label: textPair("جلسات السوق", "Market Sessions", "Séances de marché") },
      { id: "heatmap", label: textPair("الخريطة الحرارية", "Heatmap", "Carte thermique") },
      { id: "news", label: textPair("سياق الأخبار", "News Context", "Contexte actualités"), count: newsItems().length },
      { id: "diagnostics", label: textPair("التشخيصات", "Diagnostics", "Diagnostics"), count: state.errors ? Object.keys(state.errors).length : 0 }
    ];
    return `<div class="page-stack smart-analysis-workspace">
      ${workspaceTabBar("dashboard", tabs, textPair("مساحة التحليل الذكي", "Smart analysis workspace", "Espace d’analyse intelligent"))}
      ${workspacePanel("dashboard", active, dashboardWorkspaceContent(active, rec))}
      ${disclaimer()}
    </div>`;
  }

  function dashboardWorkspaceContent(active, rec) {
    if (active === "analysis") {
      const movers = sortMovers(rec);
      const primary = rec
        .filter(hasValidDirectionalSignal)
        .slice()
        .sort((left, right) => (num(right.confidence, right.score, right.aiConfidence) || 0) - (num(left.confidence, left.score, left.aiConfidence) || 0))[0] || rec[0] || {};
      return `${smartAnalysisTerminal(primary)}${marketOverview(rec, "analysis")}${marketLeadership(rec)}<section class="market-movers-grid">${moverPanel(textPair("الأكثر ارتفاعاً", "TOP GAINERS", "PLUS FORTES HAUSSES"), textPair("الأكثر ارتفاعاً", "Top gainers", "Plus fortes hausses"), movers.gainers.slice(0, 3), "up")}${moverPanel(textPair("الأكثر انخفاضاً", "TOP LOSERS", "PLUS FORTES BAISSES"), textPair("الأكثر انخفاضاً", "Top losers", "Plus fortes baisses"), movers.losers.slice(0, 3), "down")}</section>`;
    }
    if (active === "recommendations") return dashboardRecommendationsPanel(rec);
    if (active === "sessions") return marketOverview(rec, "sessions");
    if (active === "heatmap") return opportunityHeatmap(rec);
    if (active === "news") return dashboardNewsPanel();
    if (active === "diagnostics") return dashboardDiagnosticsPanel();
    return commandCenter(rec);
  }

  function dashboardRecommendationsPanel(rec) {
    return `<section class="panel recommendations-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("الرموز والتوصيات", "Symbols and recommendations"))}</span><h2>${h(textPair("التوصيات الأعلى أولوية", "Highest-priority recommendations", "Recommandations prioritaires"))}</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>${h(textPair("عرض الكل", "View all", "Tout afficher"))}</a></div>${rec.length ? watchlistTable(rec.slice(0, 14)) : dataStateEmpty(recommendationFeedState(rec))}</section>`;
  }

  function dashboardNewsPanel() {
    const news = newsItems();
    return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("أخبار السوق", "Market news", "Actualités des marchés"))}</span><h2>${h(textPair("آخر الأخبار", "Latest news", "Dernières actualités"))}</h2></div><a class="rdp-view-all" href="${ROOT}/news" data-route-link>${h(textPair("عرض كل الأخبار", "View all news", "Voir toutes les actualités"))}</a></div>${news.length ? newsList(news.slice(0, 8)) : unavailableSection(state.news, textPair("لم يعرض مزود الأخبار عناصر حالية.", "The news provider did not return current items."), textPair("صفحة الأخبار", "News page"), `${ROOT}/news`)}</section>`;
  }

  function dashboardDiagnosticsPanel() {
    return `<section class="panel"><span class="eyebrow">${h(textPair("حالة النظام", "System status", "État du système"))}</span><h2>${h(textPair("اكتمال البيانات والمزود", "Data completeness and provider", "Complétude et fournisseur"))}</h2>${publicSystemStatus()}<div class="workspace-quick-actions"><a class="ghost-btn" href="${ROOT}/settings?view=issues" data-route-link>${h(textPair("فتح تفاصيل المزود", "Open provider details", "Ouvrir les détails fournisseur"))}</a></div></section>`;
  }

  function dashboardOverviewSummary(rec, alerts) {
    const priority = rec
      .filter(hasValidDirectionalSignal)
      .slice()
      .sort((left, right) => (num(right.confidence, right.score, right.aiConfidence) || 0) - (num(left.confidence, left.score, left.aiConfidence) || 0))[0];
    const recommendation = priority ? sharedRecommendation(priority) : null;
    const priorityText = priority
      ? `${displaySymbolFor(priority.symbol)} · ${recommendationLabel(recommendation)} · ${recommendation.confidence === null ? terminalText("unavailable") : Math.round(recommendation.confidence) + "%"}`
      : terminalText("unavailable");
    const provider = providerCopy();
    const aiConfidence = recommendation && recommendation.confidence !== null
      ? `${Math.round(recommendation.confidence)}%`
      : terminalText("unavailable");
    return `<section class="panel workspace-overview-panel" aria-label="${h(textPair("ملخص القرار", "Decision summary", "Résumé de décision"))}">
      <div class="workspace-overview-grid">
        <article><span>${h(textPair("أعلى أولوية", "Top priority", "Priorité principale"))}</span><strong class="ltr">${h(priorityText)}</strong><a href="${ROOT}/recommendations" data-route-link>${h(textPair("مراجعة التوصيات", "Review recommendations", "Voir les recommandations"))}</a></article>
        <article><span>${h(textPair("المخاطر الرئيسية", "Key risks", "Risques clés"))}</span><strong>${h(alerts.length ? textPair(`${latinNumber(alerts.length)} تنبيهات تحتاج المراجعة`, `${latinNumber(alerts.length)} alerts need review`, `${latinNumber(alerts.length)} alertes à vérifier`) : textPair("لا توجد تنبيهات حرجة حالياً", "No critical alerts right now", "Aucune alerte critique"))}</strong><a href="${ROOT}/alerts" data-route-link>${h(textPair("فتح التنبيهات", "Open alerts", "Ouvrir les alertes"))}</a></article>
        <article><span>${h(textPair("اكتمال البيانات", "Data completeness", "Complétude des données"))}</span><strong>${h(rec.length ? textPair(`${latinNumber(rec.length)} أصل محلل`, `${latinNumber(rec.length)} analyzed assets`, `${latinNumber(rec.length)} actifs analysés`) : terminalText("unavailable"))}</strong><small>${h(provider.label || provider.title)}</small></article>
        <article><span>${h(textPair("حالة التحليل الذكي", "AI analysis status", "État de l’analyse IA"))}</span><strong class="ltr">${h(aiConfidence)}</strong><a href="${ROOT}/ai-scanner" data-route-link>${h(textPair("فتح الماسح", "Open scanner", "Ouvrir le scanner"))}</a></article>
      </div>
    </section>`;
  }

  function marketsPage() {
    const groups = marketMapGroups();
    return `<div class="page-stack">${hero(textPair("خريطة أسواق كاملة", "Complete markets map"), textPair("الأسهم، الخليج، العملات، الكريبتو، السلع، المؤشرات، الصناديق والقطاعات. كل بطاقة تعرض العملة الخاصة بالأصل ولا ترث عملة السوق المختار.", "Stocks, Gulf markets, currencies, crypto, commodities, indices, funds, and sectors. Each card shows the asset currency instead of inheriting the selected market currency."), "MARKETS")}
      <section class="market-map-workspace" aria-labelledby="market-map-title">
        <div class="market-map-header"><div><span class="eyebrow">${h(textPair("وعي السوق", "Market awareness", "Conscience du marché"))}</span><h2 id="market-map-title">${h(textPair("مساحة خريطة السوق", "Market map workspace", "Espace carte des marchés"))}</h2></div><span class="state-badge">${h(textPair(`${latinNumber(MARKETS.length)} سوقاً`, `${latinNumber(MARKETS.length)} markets`, `${latinNumber(MARKETS.length)} marchés`))}</span></div>
        <div class="market-map-legend" aria-label="${h(textPair("دليل الخريطة", "Map legend", "Légende de la carte"))}">
          <span><i class="legend-swatch selected" aria-hidden="true"></i>${h(textPair("السوق النشط", "Active market", "Marché actif"))}</span>
          <span><i class="legend-swatch featured" aria-hidden="true"></i>${h(textPair("سوق مميز", "Featured market", "Marché en vedette"))}</span>
          <span><i class="legend-swatch standard" aria-hidden="true"></i>${h(textPair("مجموعة سوق", "Market group", "Groupe de marché"))}</span>
        </div>
        <div class="market-map-groups">${groups.map(marketMapRegion).join("")}</div>
      </section>
      <section class="panel"><span class="eyebrow">${h(terminalText("adminDiagnostics"))}</span><h2>${h(textPair("بيانات الأسواق من المزود", "Provider market data"))}</h2>${providerMarkets()}</section>
    </div>`;
  }

  function marketMapGroups() {
    const ids = {
      gulf: new Set(["saudi", "kuwait", "uae", "qatar", "bahrain", "oman"]),
      global: new Set(["us-stocks", "europe", "asia"]),
      cross: new Set(["forex", "crypto", "commodities", "indices", "etfs"])
    };
    return [
      { id: "gulf", label: textPair("الأسواق الخليجية", "Gulf markets", "Marchés du Golfe"), markets: MARKETS.filter(m => ids.gulf.has(m.id)) },
      { id: "global", label: textPair("الأسهم العالمية", "Global equities", "Actions mondiales"), markets: MARKETS.filter(m => ids.global.has(m.id)) },
      { id: "cross-asset", label: textPair("الأصول المتقاطعة", "Cross-asset", "Multi-actifs"), markets: MARKETS.filter(m => ids.cross.has(m.id)) },
      { id: "sectors", label: textPair("القطاعات والموضوعات", "Sectors and themes", "Secteurs et thèmes"), markets: MARKETS.filter(m => !ids.gulf.has(m.id) && !ids.global.has(m.id) && !ids.cross.has(m.id)) }
    ];
  }

  function marketMapRegion(group) {
    return `<section class="market-map-region market-map-region-${h(group.id)}" data-market-map-region="${h(group.id)}" aria-labelledby="market-map-${h(group.id)}"><div class="market-map-region-head"><h3 id="market-map-${h(group.id)}">${h(group.label)}</h3><span class="market-map-count">${h(latinNumber(group.markets.length))}</span></div><div class="market-map-region-grid">${group.markets.map(marketMapNode).join("")}</div></section>`;
  }

  function marketMapNode(m) {
    const active = state.settings.defaultMarket === m.id;
    const total = marketUniverseTotal(m);
    const visible = marketPreviewSymbols(m).slice(0, 4);
    return `<a class="market-map-node ${active ? "is-active" : ""} ${m.tone === "featured" ? "featured" : ""}" href="${ROOT}/markets/${h(m.id)}" data-route-link data-market-map-id="${h(m.id)}" ${active ? 'aria-current="true"' : ""}>
      <span class="market-map-icon" aria-hidden="true">${marketGlyph(m)}</span>
      <span class="market-map-copy"><small>${h(marketFamilyName(m.family))}</small><strong>${h(marketName(m))}</strong><span><b class="ltr">${h(m.currency)}</b> · ${h(textPair(`${latinNumber(total)} رمز`, `${latinNumber(total)} symbols`, `${latinNumber(total)} symboles`))}</span></span>
      <span class="market-map-tags" aria-hidden="true">${visible.map(symbol => `<i class="ltr">${h(displaySymbolFor(symbol))}</i>`).join("")}</span>
    </a>`;
  }

  function marketDetailPage(id) {
    const m = MARKETS.find(x => x.id === id);
    if (!m) return marketsPage();
    const cached = state.marketCache.get(marketUniverseCacheKey(id));
    const total = marketUniverseTotal(m, cached);
    const marketLabel = marketName(m);
    const body = cached
      ? marketUniversePanel(m, cached)
      : `<div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>${h(textPair(`جاري تحميل ${m.ar}`, `Loading ${m.en}`, `Chargement de ${frenchUiText(m.en)}`))}</h2><p>${h(textPair(COVERAGE_NOTICE_AR, COVERAGE_NOTICE_EN))}</p></div></div>`;
    return `<div class="page-stack">
      <a class="back-link" href="${ROOT}/markets" data-route-link><span class="back-arrow mirror-inline" aria-hidden="true">‹</span> ${h(terminalText("allMarkets"))}</a>
      ${hero(h(marketLabel), textPair(`${marketFamilyName(m.family)} · العملة الأساسية: ${m.currency}. الصفحة تعرض الكون الكامل المتاح من المزود مع ترقيم صفحات بحجم ${latinNumber(MARKET_UNIVERSE_PAGE_SIZE)} رمزاً.`, `${marketFamilyName(m.family)}. Base currency: ${m.currency}. This page shows the full provider universe with ${MARKET_UNIVERSE_PAGE_SIZE} symbols per page.`, `${marketFamilyName(m.family)}. Devise de base : ${m.currency}. Cette page présente l’univers complet du fournisseur avec ${MARKET_UNIVERSE_PAGE_SIZE} symboles par page.`), "MARKET")}
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
    const coverage = (payload && payload.coverage) || {};
    const discovery = (payload && payload.symbolDiscovery) || {};
    const failed = num(coverage.failed, discovery.failedCount, arr(payload && payload.failed).length) || 0;
    const unavailable = num(coverage.unavailablePrice, discovery.unavailablePriceCount, discovery.unavailableCount, arr(payload && payload.unavailable).length) || 0;
    const issueCount = failed + unavailable + (payload && (payload.reason || payload.message) ? 1 : 0);
    const tabs = [
      { id: "overview", label: textPair("نظرة عامة", "Overview", "Vue d’ensemble") },
      { id: "data", label: textPair("البيانات", "Data", "Données"), count: pagination.total },
      { id: "filters", label: textPair("الفلاتر", "Filters", "Filtres") },
      { id: "sources", label: textPair("المصادر", "Sources", "Sources") },
      { id: "issues", label: textPair("المشكلات", "Issues", "Problèmes"), count: issueCount }
    ];
    const active = workspaceView("markets");
    let panel = "";

    if (active === "overview") {
      panel = `<div class="market-workspace-overview">${marketPreviewStrip(m, pagination.total)}${coverageNotice(payload, rows, m)}</div>`;
    } else if (active === "data") {
      panel = `<section class="panel market-universe-panel" data-selected-market="${h(m.id)}">
        <div class="panel-head"><div><span class="eyebrow">${h(terminalText("allSymbols"))}</span><h2>${h(terminalText("allSymbols"))}</h2></div><button class="ghost-btn compact-btn" data-retry type="button">${h(terminalText("refresh"))}</button></div>
        <div class="provider-market-result-meta market-universe-result-meta">
          <span>${h(terminalText(countKey, { shown: latinNumber(rows.length), total: latinNumber(pagination.total) }))}</span>
          <span>${h(terminalText("page"))} <b class="ltr">${latinNumber(pagination.page)}</b> / <b class="ltr">${latinNumber(pageCount)}</b></span>
        </div>
        ${rows.length ? marketUniverseTable(rows) : emptyState(
          m.id === "etfs" ? textPair(FUND_EMPTY_STATE_AR, FUND_EMPTY_STATE_EN, "Aucun fonds ne correspond actuellement à ce marché ou à cette catégorie") : textPair("لا توجد رموز مطابقة", "No matching symbols", "Aucun symbole correspondant"),
          m.id === "etfs" ? textPair("غيّر البحث أو الفلاتر للعثور على صناديق أخرى.", "Change the search or filters to find other funds.", "Modifiez la recherche ou les filtres pour trouver d’autres fonds.") : textPair("غيّر البحث أو الفلاتر. لن نضيف رموزاً تجريبية بدلاً من بيانات المزود.", "Change the search or filters. We will not add synthetic symbols instead of provider data.", "Modifiez la recherche ou les filtres. Aucun symbole synthétique ne remplacera les données du fournisseur."), "", "")}
        <div class="provider-market-pagination market-universe-pagination">
          <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""}>${h(terminalText("previous"))}</button>
          <button class="ghost-btn compact-btn" data-market-universe-page="${pagination.page + 1}" ${pagination.page >= pageCount ? "disabled" : ""}>${h(terminalText("next"))}</button>
        </div>
      </section>`;
    } else if (active === "filters") {
      panel = `<section class="panel compact-filter-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("تخصيص النتائج", "Refine results", "Affiner les résultats"))}</span><h2>${h(textPair("فلاتر السوق", "Market filters", "Filtres du marché"))}</h2></div></div>${marketUniverseControls(m, payload)}</section>`;
    } else if (active === "sources") {
      panel = `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("التغطية والحداثة", "Coverage and freshness", "Couverture et fraîcheur"))}</span><h2>${h(textPair("بيانات المزود", "Provider data", "Données fournisseur"))}</h2></div></div>${providerMarkets()}</section>`;
    } else {
      const reason = formatProviderError(payload && (payload.reason || payload.message), { empty: "" });
      panel = `<section class="panel issues-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("التغطية الجزئية", "Partial coverage", "Couverture partielle"))}</span><h2>${h(textPair("مشكلات السوق", "Market issues", "Problèmes du marché"))}</h2></div><button class="ghost-btn compact-btn" data-retry type="button">${h(terminalText("refresh"))}</button></div>
        ${issueCount ? `<div class="workspace-issue-list"><article><strong>${h(textPair("طلبات فشلت", "Failed requests", "Requêtes échouées"))}</strong><span class="ltr">${latinNumber(failed)}</span></article><article><strong>${h(textPair("أسعار غير متاحة", "Unavailable prices", "Cours indisponibles"))}</strong><span class="ltr">${latinNumber(unavailable)}</span></article>${reason ? `<article><strong>${h(terminalText("reason"))}</strong><span>${h(reason)}</span></article>` : ""}</div>` : miniEmpty()}
      </section>`;
    }

    return `${workspaceTabBar("markets", tabs, textPair("مساحة بيانات السوق", "Market data workspace", "Espace de données du marché"))}${workspacePanel("markets", active, panel)}`;
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
      fundFilters: arr(fromPayload.fundFilters).length ? fromPayload.fundFilters.map(item => Array.isArray(item) ? item : [item.id || item.value || item, item.ar || item.en ? textPair(item.ar || item.en, item.en || item.ar, item.fr) : item.label || item.fr || item.en || item.id || item]) : FUND_FILTERS,
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
      const totalFundsLabel = textPair("إجمالي الصناديق", "Total funds", "Total des fonds");
      const availableFundsLabel = textPair("الصناديق المتاحة", "Available funds", "Fonds disponibles");
      const fundsWithoutPriceLabel = textPair("الصناديق بدون سعر", "Funds without price", "Fonds sans cours");
      const lastUpdatedLabel = terminalText("lastUpdated");
      return `<div class="coverage-stack">
        <div class="provider-market-state warn coverage-notice"><strong>${h(textPair(FUND_PROVIDER_NOTE_AR, FUND_PROVIDER_NOTE_EN, FUND_PROVIDER_NOTE_FR))}</strong></div>
        <div class="detail-grid compact-detail-grid">
          ${detailCard(totalFundsLabel, latinNumber(total), totalFundsLabel)}
          ${detailCard(availableFundsLabel, latinNumber(available), availableFundsLabel)}
          ${detailCard(fundsWithoutPriceLabel, latinNumber(unavailable), fundsWithoutPriceLabel)}
          ${detailCard(lastUpdatedLabel, lastUpdated, lastUpdatedLabel)}
        </div>
      </div>`;
    }
    const showNotice = failed > 0 || unavailable > 0 || Boolean(payload && payload.reason);
    const totalDiscoveredLabel = textPair("إجمالي مكتشف", "Total discovered", "Total découvert");
    const loadedLabel = terminalText("loaded");
    const availableWithPriceLabel = textPair("بسعر متاح", "Available with price", "Disponibles avec un cours");
    const unavailablePriceLabel = textPair("السعر غير متاح", "Unavailable price", "Cours indisponible");
    const failedLabel = terminalText("failed");
    return `<div class="coverage-stack">
      ${showNotice ? `<div class="provider-market-state warn coverage-notice"><strong>${h(textPair(COVERAGE_NOTICE_AR, COVERAGE_NOTICE_EN))}</strong></div>` : ""}
      <div class="detail-grid compact-detail-grid">
        ${detailCard(totalDiscoveredLabel, latinNumber(total), totalDiscoveredLabel)}
        ${detailCard(loadedLabel, latinNumber(loaded), loadedLabel)}
        ${detailCard(availableWithPriceLabel, latinNumber(available), availableWithPriceLabel)}
        ${detailCard(unavailablePriceLabel, latinNumber(unavailable), unavailablePriceLabel)}
        ${detailCard(failedLabel, latinNumber(failed), failedLabel)}
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
    const feedState = recommendationFeedState(r);
    return `<div class="page-stack">${hero(textPair("ماسح الذكاء الاصطناعي بدون نتائج مصطنعة", "AI scanner without synthetic results"), textPair("يفرز الماسح التوصيات والإشارات القادمة من الـ API فقط. عند غياب المزود تظهر أسباب الغياب بوضوح.", "The scanner sorts only recommendations and signals returned by the API. When the provider is unavailable, the reason is shown clearly."), "AI SCANNER")}
      <section class="metric-grid">${stat(textPair("فرص شراء", "Buy opportunities"), buy.length, textPair("إشارات الشراء", "Buy signals"))}${stat(textPair("فرص بيع", "Sell opportunities"), sell.length, textPair("إشارات البيع", "Sell signals"))}${stat(textPair("انتظار", "Wait"), wait.length, textPair("انتظار", "Wait"))}${stat(terminalText("unavailable"), u.length, terminalText("unavailable"))}</section>
      <section class="dash-split">
        <article class="panel"><span class="eyebrow">${h(textPair("نتائج الماسح", "Scanner results"))}</span><h2>${h(textPair("نتائج الفحص", "Scanner results"))}</h2>
          <div class="seg-tabs" role="tablist"><button class="is-active" data-tab="scan" data-value="all">${h(terminalText("all"))}</button><button data-tab="scan" data-value="buy">${h(textPair("شراء", "Buy"))}</button><button data-tab="scan" data-value="sell">${h(textPair("بيع", "Sell"))}</button><button data-tab="scan" data-value="wait">${h(textPair("انتظار", "Wait"))}</button></div>
          <div data-tabpanel="scan" data-render="scan">${r.length ? assetList(r) : dataStateEmpty(feedState)}</div>
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">${h(terminalText("confidence"))}</span><h2>${h(textPair("توزيع الثقة", "Confidence distribution"))}</h2>${confBars(conf)}</article>
          <article class="panel"><span class="eyebrow">${h(textPair("رادار المخاطر", "Risk radar"))}</span><h2>${h(textPair("رادار المخاطر", "Risk radar"))}</h2>${riskRadar(r)}</article>
          <article class="panel"><span class="eyebrow">${h(textPair("الأقوى", "Strongest"))}</span><h2>${h(textPair("أقوى الإشارات", "Strongest signals"))}</h2>${r.length ? assetList(topPicks(r, 3)) : dataStateEmpty(feedState)}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }
  window.__tabRenderers = window.__tabRenderers || {};
  window.__tabRenderers.scan = (v) => { const r = recs(); const f = v === "all" ? r : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : r.length ? selectionEmptyState() : dataStateEmpty(recommendationFeedState(r)); };
  window.__tabRenderers.rec = (v) => { const r = recs(); const f = v === "all" ? r : v === "high" ? r.filter(x => (num(x.confidence, x.score, x.aiConfidence) || 0) >= 70) : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : r.length ? selectionEmptyState() : dataStateEmpty(recommendationFeedState(r)); };

  function watchPage() {
    const quick = unique(defaults.concat(["EURUSD", "SPY", "2222.SR", "ETHUSD"]));
    return `<div class="page-stack">${hero(textPair("قائمة متابعة ذكية ونظيفة", "Clean smart watchlist"), textPair("أضف الرموز التي تريد مراقبتها. الأسعار والتحليلات تظهر فقط عند توفرها من المزود، والعملة تتبع كل رمز.", "Add the symbols you want to watch. Prices and analysis appear only when available from the provider, and currency follows each symbol."), "WATCHLIST")}
      <section class="panel"><span class="eyebrow">${h(textPair("إضافة سريعة", "Quick add"))}</span><h2>${h(textPair("إضافة سريعة", "Quick add"))}</h2><div class="quick-actions">${quick.map(s => `<button class="ghost-btn" data-quick-add="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("قائمتي", "My watchlist"))}</span><h2>${h(textPair(`قائمتي (${state.watch.length})`, `My watchlist (${state.watch.length})`, `Ma liste de suivi (${state.watch.length})`))}</h2></div></div>
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
        <form id="alert-form" class="trade-form-grid">
          <label>${h(textPair("الرمز", "Symbol", "Symbole"))}<input name="symbol" dir="ltr" placeholder="AAPL" maxlength="24" pattern="[A-Za-z0-9._^=/-]{1,24}" autocomplete="off" required /></label>
          <label>${h(textPair("نوع التنبيه", "Alert type", "Type d’alerte"))}<select name="type" required><option value="price">${h(textPair("سعر يصل إلى", "Price reaches", "Cours atteint"))}</option><option value="percent">${h(textPair("تغير نسبة %", "Percent change %", "Variation en %"))}</option><option value="signal">${h(textPair("إشارة AI", "AI signal", "Signal IA"))}</option><option value="news">${h(textPair("خبر مؤثر", "Market-moving news", "Actualité influente"))}</option></select></label>
          <label>${h(textPair("القيمة عند الحاجة", "Value when required", "Valeur si nécessaire"))}<input name="value" type="number" inputmode="decimal" step="any" placeholder="0.00" /></label>
          <button class="action-btn" type="submit">${h(textPair("إضافة", "Add", "Ajouter"))}</button>
          <p id="alert-form-error" class="form-field-error wide" role="alert" aria-live="assertive" hidden></p>
        </form>
      </section>
      <section class="alert-grid">
        <article class="panel"><span class="eyebrow">${h(textPair("تنبيهات ذكية", "Smart alerts"))}</span><h2>${h(textPair("تنبيهات المزود", "Provider alerts"))}</h2>${smart.length ? alertList(smart) : emptyState(textPair("لا توجد تنبيهات ذكية", "No smart alerts"), textPair("لم يرجع المزود تنبيهات حالية.", "The provider did not return current alerts."), textPair("التوصيات", "Recommendations"), `${ROOT}/recommendations`)}</article>
        <article class="panel"><span class="eyebrow">${h(textPair(`تنبيهات محلية (${local.length})`, `Local alerts (${local.length})`, `Alertes locales (${local.length})`))}</span><h2>${h(textPair("تنبيهاتي المحفوظة", "Saved alerts"))}</h2>${local.length ? local.map(localAlertRow).join("") : emptyState(textPair("لا توجد تنبيهات محلية", "No local alerts"), textPair("استخدم النموذج بالأعلى لإنشاء تنبيه متابعة.", "Use the form above to create a tracking alert."), "", "")}</article>
      </section></div>`;
  }

  function recPage() {
    const r = recs(), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    const filtered = recommendationFilteredItems(r);
    const feedState = recommendationFeedState(r);
    const tabs = [
      { id: "overview", label: textPair("نظرة عامة", "Overview", "Vue d’ensemble") },
      { id: "data", label: textPair("التوصيات", "Recommendations", "Recommandations"), count: filtered.length },
      { id: "filters", label: textPair("الفلاتر", "Filters", "Filtres") },
      { id: "sources", label: textPair("المصادر", "Sources", "Sources") },
      { id: "issues", label: textPair("المشكلات", "Issues", "Problèmes"), count: [state.rec, state.signals].some(responseFailed) ? 1 : 0 }
    ];
    const filterButtons = [
      ["all", terminalText("all")], ["buy", textPair("شراء", "Buy", "Achat")], ["sell", textPair("بيع", "Sell", "Vente")],
      ["wait", textPair("انتظار", "Wait", "Attendre")], ["high", textPair("ثقة عالية", "High confidence", "Confiance élevée")]
    ].map(([value, label]) => `<button type="button" class="${state.recommendationView.signal === value ? "is-active" : ""}" data-rec-signal="${h(value)}" aria-pressed="${state.recommendationView.signal === value ? "true" : "false"}">${h(label)}</button>`).join("");
    return `<div class="page-stack recommendation-workspace">${hero(textPair("التوصيات والتحليل", "Recommendations and analysis"), textPair("توصيات الذكاء مع حالة كل صفقة: مفتوحة، تحت المتابعة، مكتملة، فاشلة أو منتهية. كل بطاقة لها زر تحليل.", "AI recommendations with each trade status: open, under watch, completed, failed, or expired. Every card has an analysis button."), "RECOMMENDATIONS")}
      ${workspaceTabBar("recommendations", tabs, textPair("مساحة التوصيات", "Recommendations workspace", "Espace des recommandations"))}
      ${workspacePanel("recommendations", "overview", `<section class="metric-grid">${stat(terminalText("all"), r.length, terminalText("all"))}${stat(textPair("شراء", "Buy"), buy.length, textPair("شراء", "Buy"))}${stat(textPair("بيع", "Sell"), sell.length, textPair("بيع", "Sell"))}${stat(textPair("انتظار", "Wait"), wait.length, textPair("انتظار", "Wait"))}</section><section class="panel workspace-next-action"><span class="eyebrow">${h(textPair("الخطوة التالية", "Next action", "Prochaine action"))}</span><h2>${h(r.length ? textPair("راجع الإشارات ذات الثقة الأعلى أولاً", "Review the highest-confidence signals first", "Vérifiez d’abord les signaux les plus fiables") : textPair("لا توجد توصيات قابلة للعرض", "No displayable recommendations", "Aucune recommandation disponible"))}</h2><button class="action-btn" type="button" data-workspace-tab="data" data-workspace-scope="recommendations">${h(textPair("فتح التوصيات", "Open recommendations", "Ouvrir les recommandations"))}</button></section>`)}
      ${workspacePanel("recommendations", "data", `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("الإشارات", "Signals", "Signaux"))}</span><h2>${h(textPair("قائمة التوصيات", "Recommendation list", "Liste des recommandations"))}</h2></div><span class="state-badge ${feedState.tone}">${h(feedState.label)}</span></div>${filtered.length ? recCards(filtered) : r.length ? selectionEmptyState() : dataStateEmpty(feedState)}</section>`)}
      ${workspacePanel("recommendations", "filters", `<section class="panel compact-filter-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("الفلاتر", "Filters", "Filtres"))}</span><h2>${h(textPair("السوق ونوع الإشارة", "Market and signal type", "Marché et type de signal"))}</h2></div></div><div class="rec-market-chips">${MARKETS.map(m => `<button class="chip ${state.settings.defaultMarket === m.id ? "is-active" : ""}" data-rec-market="${m.id}">${h(marketName(m))}</button>`).join("")}</div><div class="seg-tabs" role="group" aria-label="${h(textPair("نوع الإشارة", "Signal type", "Type de signal"))}">${filterButtons}</div><button class="action-btn" type="button" data-workspace-tab="data" data-workspace-scope="recommendations">${h(textPair("عرض النتائج", "View results", "Voir les résultats"))}</button></section>`)}
      ${workspacePanel("recommendations", "sources", `<section class="panel"><span class="eyebrow">${h(textPair("المصادر", "Sources", "Sources"))}</span><h2>${h(textPair("مصدر التوصيات وحالة البيانات", "Recommendation source and data status", "Source et état des données"))}</h2>${publicSystemStatus()}</section>`)}
      ${workspacePanel("recommendations", "issues", recommendationIssuesPanel())}
      ${disclaimer()}</div>`;
  }

  function recommendationFilteredItems(items) {
    const view = state.recommendationView.signal || "all";
    if (view === "all") return items;
    if (view === "high") return items.filter(item => (num(item.confidence, item.score, item.aiConfidence) || 0) >= 70);
    if (view === "wait") return items.filter(item => !["buy", "sell"].includes(signal(item)));
    return items.filter(item => signal(item) === view);
  }

  function recommendationIssuesPanel() {
    const feedState = recommendationFeedState(recs());
    const failed = [state.rec, state.signals].some(responseFailed);
    const issue = failed ? feedState.body : formatProviderError(state.rec && (state.rec.message || state.rec.error || state.rec.reason), { empty: "" });
    return `<section class="panel workspace-issues-panel"><span class="eyebrow">${h(textPair("المشكلات", "Issues", "Problèmes"))}</span><h2>${h(issue ? textPair("توجد مشكلة في تغطية التوصيات", "Recommendation coverage needs attention", "La couverture nécessite une vérification") : textPair("لا توجد مشكلات نشطة", "No active issues", "Aucun problème actif"))}</h2>${issue ? `<details><summary>${h(textPair("عرض السبب الآمن", "Show safe reason", "Afficher la raison"))}</summary><p>${h(issue)}</p><button class="ghost-btn" data-retry type="button">${h(terminalText("retry"))}</button></details>` : `<p class="provider-clean-note">${h(textPair("اكتملت آخر محاولة بدون مشكلة قابلة للعرض.", "The latest attempt completed without a displayable issue.", "La dernière tentative ne présente aucun problème."))}</p>`}</section>`;
  }

  function precisionLivePanel() {
    const pl = state.followed && state.followed.precisionLive;
    if (!pl || !num(pl.total)) return "";
    const resolved = (pl.won || 0) + (pl.lost || 0);
    const liveRate = pl.successRate === null || pl.successRate === undefined ? "--" : `${pl.successRate}%`;
    return `<section class="panel precision-live-panel">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("الدقة · اختبار أمامي", "Precision · forward test"))}</span><h2>${h(textPair("الدقة الحية — إشارات بوابة الـ90%", "Live precision — 90% gate signals"))}</h2></div><span class="precision-badge ${resolved && pl.successRate >= 90 ? "pass" : "info"}">${h(resolved ? textPair(`نجاح حي ${liveRate}`, `Live success ${liveRate}`, `Réussite en direct ${liveRate}`) : textPair("بانتظار أول نتيجة", "Awaiting first result"))}</span></div>
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
    const items = newsItems();
    const filtered = filteredNewsItems(items);
    const sources = newsSourceCounts(items);
    const verifiedCount = items.filter(item => newsEvidence(item).tone === "ok").length;
    const tabs = [
      { id: "overview", label: textPair("نظرة عامة", "Overview", "Vue d’ensemble") },
      { id: "data", label: textPair("الأخبار", "Data", "Actualités"), count: filtered.length },
      { id: "filters", label: textPair("الفلاتر", "Filters", "Filtres") },
      { id: "sources", label: textPair("المصادر", "Sources", "Sources"), count: sources.length },
      { id: "issues", label: textPair("المشكلات", "Issues", "Problèmes"), count: newsIssueText() ? 1 : 0 }
    ];
    return `<div class="page-stack news-workspace">${hero(textPair("أخبار السوق", "Market news", "Actualités des marchés"), textPair("تُجمع الأخبار من مصادر مستقلة وتُعرض مع حالة التحقق بوضوح، دون عناوين مصطنعة.", "News is consolidated from independent sources and shown with clear verification status, without synthetic headlines.", "Les actualités sont consolidées à partir de sources indépendantes et accompagnées d’un statut de vérification clair, sans titres artificiels."), "NEWS")}
      ${workspaceTabBar("news", tabs, textPair("مساحة أخبار السوق", "Market news workspace", "Espace actualités"))}
      ${workspacePanel("news", "overview", `<section class="metric-grid">${stat(textPair("التغطية الحالية", "Current coverage", "Couverture actuelle"), items.length, textPair("خبر", "items", "articles"))}${stat(textPair("أخبار موثقة", "Verified items", "Articles vérifiés"), verifiedCount, textPair("موثق", "verified", "vérifiés"))}${stat(textPair("المصادر", "Sources", "Sources"), sources.length, textPair("مصدر مستقل", "independent sources", "sources indépendantes"))}${stat(textPair("آخر تحديث", "Latest update", "Dernière mise à jour"), latinDateTime(state.news.lastUpdated || state.news.lastSuccessfulUpdate || state.news.generatedAt), providerName(state.news.provider) || terminalText("unavailable"))}</section>${publicSystemStatus()}${newsIssueText() ? `<div class="provider-warning" role="status">${h(textPair("توجد تغطية جزئية. راجع تبويب المشكلات.", "Coverage is partial. Review the Issues tab.", "La couverture est partielle. Consultez Problèmes."))}</div>` : ""}`)}
      ${workspacePanel("news", "data", `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("البيانات", "Data", "Données"))}</span><h2>${h(textPair("أخبار السوق", "Market news", "Actualités des marchés"))}</h2></div><span class="state-badge">${h(latinNumber(filtered.length))}</span></div><div class="news-grid">${filtered.length ? filtered.map(newsCard).join("") : emptyState(textPair("لا توجد أخبار مطابقة", "No matching news", "Aucune actualité correspondante"), textPair("غيّر البحث أو المصدر ثم حاول مرة أخرى.", "Change the search or source and try again.", "Modifiez la recherche ou la source."), "", "")}</div></section>`)}
      ${workspacePanel("news", "filters", newsFiltersPanel(sources))}
      ${workspacePanel("news", "sources", newsSourcesPanel(sources))}
      ${workspacePanel("news", "issues", newsIssuesPanel())}
    </div>`;
  }

  function newsSourceName(item) {
    return String(item && (item.sourceName || item.source || item.publisher) || terminalText("unavailable")).trim();
  }

  function newsSourceCounts(items) {
    const counts = new Map();
    items.forEach(item => {
      const source = newsSourceName(item);
      counts.set(source, (counts.get(source) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([source, count]) => ({ source, count })).sort((left, right) => right.count - left.count);
  }

  function filteredNewsItems(items) {
    const search = String(state.newsView.search || "").trim().toLowerCase();
    const source = state.newsView.source || "all";
    return items.filter(item => {
      if (source !== "all" && newsSourceName(item) !== source) return false;
      if (!search) return true;
      return [item.title, item.headline, item.summary, item.description, newsSourceName(item), ...arr(item.symbols || item.relatedSymbols)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }

  function newsFiltersPanel(sources) {
    return `<section class="panel compact-filter-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("الفلاتر", "Filters", "Filtres"))}</span><h2>${h(textPair("ابحث وحدد المصدر", "Search and choose a source", "Rechercher et choisir une source"))}</h2></div></div><form class="workspace-filter-form" data-news-search-form><label><span>${h(terminalText("search"))}</span><input name="newsSearch" value="${h(state.newsView.search || "")}" placeholder="${h(textPair("عنوان أو رمز أو كلمة", "Title, symbol, or keyword", "Titre, symbole ou mot-clé"))}" /></label><label><span>${h(terminalText("source"))}</span><select data-news-source-filter>${[`<option value="all" ${state.newsView.source === "all" ? "selected" : ""}>${h(terminalText("all"))}</option>`, ...sources.map(item => `<option value="${h(item.source)}" ${state.newsView.source === item.source ? "selected" : ""}>${h(item.source)} (${h(latinNumber(item.count))})</option>`)].join("")}</select></label><button class="action-btn" type="submit">${h(textPair("تطبيق", "Apply", "Appliquer"))}</button></form><button class="ghost-btn" type="button" data-workspace-tab="data" data-workspace-scope="news">${h(textPair("عرض الأخبار", "View news", "Voir les actualités"))}</button></section>`;
  }

  function newsSourcesPanel(sources) {
    return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("المصادر", "Sources", "Sources"))}</span><h2>${h(textPair("تغطية المصادر الحالية", "Current source coverage", "Couverture des sources"))}</h2></div></div>${sources.length ? `<div class="workspace-source-grid">${sources.map(item => `<article><strong>${h(item.source)}</strong><span>${h(latinNumber(item.count))} ${h(textPair("أخبار", "items", "articles"))}</span></article>`).join("")}</div>` : `<p class="provider-clean-note">${h(textPair("لا توجد مصادر متاحة حالياً.", "No sources are currently available.", "Aucune source disponible."))}</p>`}<div class="provider-feature-strip"><span>${h(textPair("آخر تحديث ناجح", "Last successful update", "Dernière mise à jour réussie"))}</span><b>${h(latinDateTime(state.news.lastSuccessfulUpdate || state.news.lastUpdated || state.news.generatedAt))}</b></div></section>`;
  }

  function newsIssueText() {
    return formatProviderError(state.news && (state.news.message || state.news.error || state.news.partialFailure || state.news.failureReason), { empty: "" });
  }

  function newsIssuesPanel() {
    const issue = newsIssueText();
    return `<section class="panel workspace-issues-panel"><span class="eyebrow">${h(textPair("المشكلات", "Issues", "Problèmes"))}</span><h2>${h(issue ? textPair("تغطية الأخبار جزئية أو غير متاحة", "News coverage is partial or unavailable", "La couverture est partielle ou indisponible") : textPair("لا توجد مشكلات نشطة", "No active issues", "Aucun problème actif"))}</h2>${issue ? `<details><summary>${h(textPair("التفاصيل الآمنة وإعادة المحاولة", "Safe details and retry", "Détails et nouvelle tentative"))}</summary><p>${h(issue)}</p><button class="ghost-btn" data-retry type="button">${h(terminalText("retry"))}</button></details>` : `<p class="provider-clean-note">${h(textPair("اكتملت آخر محاولة بدون مشكلة قابلة للعرض.", "The latest attempt completed without a displayable issue.", "La dernière tentative ne présente aucun problème."))}</p>`}</section>`;
  }

  function calendarPage() {
    const c = state.calendar || {};
    const countFor = kind => c[kind] && (c[kind].resultCount ?? arr(c[kind].data).length);
    const tabs = [
      { id: "overview", label: textPair("نظرة عامة", "Overview", "Vue d’ensemble") },
      { id: "earnings", label: textPair("الأرباح", "Earnings", "Résultats"), count: countFor("earnings") },
      { id: "dividends", label: textPair("التوزيعات", "Dividends", "Dividendes"), count: countFor("dividends") },
      { id: "ipos", label: textPair("الاكتتابات", "IPOs", "Introductions"), count: countFor("ipos") },
      { id: "economic", label: textPair("الاقتصاد", "Economic", "Économie"), count: countFor("economic") },
      { id: "sources", label: textPair("المصادر", "Sources", "Sources") },
      { id: "issues", label: textPair("المشكلات", "Issues", "Problèmes"), count: calendarIssueCount() }
    ];
    const dataPanel = (kind, eyebrow, title, renderer) => `${calendarFilterToolbar()}<section class="calendar-grid single-view">${calendarPanel(kind, eyebrow, title, c[kind], renderer, { forceOpen: true })}</section>`;
    return `<div class="page-stack trader-calendar-page calendar-workspace">${hero(textPair("تقويم السوق", "Market calendar"), textPair("تقويم حي لأرباح الشركات والتوزيعات والاكتتابات والأحداث الاقتصادية من مزودين حقيقيين. عند تعذر البيانات نعرض السبب بوضوح بدون بيانات وهمية.", "Live company earnings, dividends, IPOs, and economic events from real providers. When data is unavailable, the reason is shown clearly without synthetic data."), "CALENDAR")}
      ${workspaceTabBar("calendar", tabs, textPair("مساحة تقويم السوق", "Market calendar workspace", "Espace calendrier"))}
      ${workspacePanel("calendar", "overview", `${calendarFilterToolbar()}${calendarOverviewPanel()}`)}
      ${workspacePanel("calendar", "earnings", dataPanel("earnings", textPair("الأرباح", "Earnings", "Résultats"), textPair("أرباح الشركات", "Company earnings", "Résultats des sociétés"), earningsRows))}
      ${workspacePanel("calendar", "dividends", dataPanel("dividends", textPair("التوزيعات", "Dividends", "Dividendes"), textPair("التوزيعات", "Dividends", "Dividendes"), dividendRows))}
      ${workspacePanel("calendar", "ipos", dataPanel("ipos", textPair("الاكتتابات", "IPOs", "Introductions"), textPair("الاكتتابات", "IPOs", "Introductions"), ipoRows))}
      ${workspacePanel("calendar", "economic", dataPanel("economic", textPair("الاقتصاد", "Economic", "Économie"), textPair("التقويم الاقتصادي", "Economic calendar", "Calendrier économique"), economicRows))}
      ${workspacePanel("calendar", "sources", calendarProviderOverview())}
      ${workspacePanel("calendar", "issues", calendarIssuesPanel())}
    </div>`;
  }

  function calendarFilterToolbar() {
    return `<section class="panel trader-calendar-toolbar compact-filter-panel"><div><span class="eyebrow">${h(terminalText("dateRange"))}</span><h2>${h(terminalText("dateRange"))}</h2></div><div class="calendar-ranges">${calendarRangeButtons()}</div></section>`;
  }

  function calendarOverviewPanel() {
    const ps = state.providerStatus || {}, features = ps.features || {};
    const rows = [
      [textPair("أرباح الشركات", "Company earnings", "Résultats"), features.earnings],
      [textPair("التوزيعات", "Dividends", "Dividendes"), features.dividends],
      [textPair("الاكتتابات", "IPOs", "Introductions"), features.ipos],
      [textPair("التقويم الاقتصادي", "Economic calendar", "Calendrier économique"), features.economic]
    ];
    return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("التغطية الحالية", "Current coverage", "Couverture actuelle"))}</span><h2>${h(textPair("ملخص التقويم", "Calendar summary", "Résumé du calendrier"))}</h2></div></div><div class="provider-state-grid">${rows.map(([label, feature]) => providerFeatureCard(label, feature)).join("")}</div>${calendarIssueCount() ? `<p class="provider-warning">${h(textPair("بعض مجموعات البيانات تحتاج مراجعة. افتح تبويب المشكلات.", "Some datasets need attention. Open the Issues tab.", "Certaines données nécessitent une vérification."))}</p>` : ""}</section>`;
  }

  function calendarIssueRows() {
    return CALENDAR_VIEW_IDS.map(kind => ({ kind, response: state.calendar && state.calendar[kind] || {} })).filter(({ response }) => {
      const status = String(response.status || response.providerStatus || "").toLowerCase();
      return response.message || response.error || response.partialFailure || ["error", "failed", "unavailable", "partial", "timeout"].includes(status);
    });
  }

  function calendarIssueCount() {
    return calendarIssueRows().length;
  }

  function calendarIssuesPanel() {
    const issues = calendarIssueRows();
    return `<section class="panel workspace-issues-panel"><span class="eyebrow">${h(textPair("المشكلات", "Issues", "Problèmes"))}</span><h2>${h(issues.length ? textPair("تغطية جزئية أو غير متاحة", "Partial or unavailable coverage", "Couverture partielle ou indisponible") : textPair("لا توجد مشكلات نشطة", "No active issues", "Aucun problème actif"))}</h2>${issues.length ? `<div class="workspace-issue-list">${issues.map(({ kind, response }) => `<details><summary><span>${h(calendarKindLabel(kind))}</span><span class="state-badge ${featureStatusTone(response.status)}">${h(featureStatusLabel(response.status))}</span></summary><p>${h(formatProviderError(response.message || response.error || response.partialFailure, { empty: textPair("لم يعرض المزود سبباً إضافياً.", "The provider returned no additional reason.", "Aucun détail supplémentaire." ) }))}</p><button class="ghost-btn" type="button" data-calendar-retry-kind="${h(kind)}">${h(terminalText("retry"))}</button></details>`).join("")}</div>` : `<p class="provider-clean-note">${h(textPair("اكتملت آخر المحاولات بدون مشكلة قابلة للعرض.", "The latest attempts completed without a displayable issue.", "Les dernières tentatives ne présentent aucun problème."))}</p>`}</section>`;
  }

  function calendarKindLabel(kind) {
    if (kind === "earnings") return textPair("الأرباح", "Earnings", "Résultats");
    if (kind === "dividends") return textPair("التوزيعات", "Dividends", "Dividendes");
    if (kind === "ipos") return textPair("الاكتتابات", "IPOs", "Introductions");
    return textPair("الاقتصاد", "Economic", "Économie");
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

  function calendarPanel(kind, eyebrow, title, response, rowRenderer, options = {}) {
    response = response || {};
    const rows = arr(response.data);
    const isOpen = options.forceOpen === true || (state.calendarOpen && state.calendarOpen[kind] === true);
    const count = response.resultCount ?? rows.length;
    const compactState = !state.calendarLoading && rows.length === 0;
    return `<article class="panel trader-calendar-panel calendar-${h(kind)} ${isOpen ? "is-open" : "is-collapsed"} ${compactState ? "has-compact-state" : ""}">
      <div class="panel-head calendar-panel-head">
        <div><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-head-actions">
          ${providerBadge(response)}
          <span class="state-badge muted">${h(latinNumber(count))} ${h(terminalText("rows"))}</span>
          ${options.forceOpen ? "" : `<button class="ghost-btn compact-btn" data-calendar-section-toggle="${h(kind)}" aria-expanded="${isOpen ? "true" : "false"}">${h(isOpen ? terminalText("collapse") : terminalText("open"))}</button>`}
          ${compactState ? "" : `<button class="ghost-btn compact-btn" data-retry>${h(terminalText("retry"))}</button>`}
        </div>
      </div>
      ${isOpen ? `<div class="calendar-section-body">
      ${compactState ? "" : `<div class="calendar-meta">
        <span>${h(terminalText("lastUpdated"))}: <b>${h(latinDateTime(response.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
        <span>${h(terminalText("period"))}: <b class="ltr">${h(rangeText(response.range))}</b></span>
        <span>${h(terminalText("results"))}: <b class="ltr">${h(latinNumber(count))}</b></span>
      </div>`}
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
    let rangeAction = false;
    if (response && response.routeUnavailable) {
      title = ROUTE_UNAVAILABLE_MESSAGE;
      body = textPair("تعذر الوصول إلى مسار البيانات المطلوب.", "The requested data route could not be reached.");
      settings = false;
    } else if (response && response.timeout) {
      title = UNAVAILABLE_MESSAGE;
      body = textPair("انتهت مهلة الطلب. يمكنك إعادة المحاولة بدون إعادة تحميل الصفحة.", "The request timed out. You can retry without reloading the page.");
      settings = false;
    } else if (["success", "available", "connected", "healthy"].includes(status)) {
      title = textPair("لا توجد أحداث ضمن الفترة الحالية", "No events in the current range");
      body = textPair("جرّب تغيير الفترة أو السوق أو نوع الحدث.", "Try changing the range, market, or event type.");
      settings = false;
      rangeAction = true;
    } else if (status === "not_configured" || status === "missing_provider") {
      title = textPair("لا يوجد مزود متصل", "No connected provider");
      body = textPair("اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.", "Connect a data provider to show events, dividends, and IPOs.");
    } else if (["not_entitled", "forbidden", "unauthorized"].includes(status)) {
      title = textPair("الميزة غير متاحة ضمن صلاحية المزود الحالي", "Feature unavailable for the current provider entitlement");
      body = textPair("تحتاج هذه البيانات إلى خطة تدعم هذا النوع من التقويم.", "This data requires a plan that supports this calendar type.");
      settings = false;
    } else if (status === "rate_limited") {
      title = UNAVAILABLE_MESSAGE;
      body = response && (response.cached || response.stale) ? textPair("يتم عرض أحدث بيانات متاحة إلى أن يعود التحديث المباشر.", "Showing the latest available data until live updates return.") : textPair("البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل.", "Data is currently unavailable. Try again shortly.");
      settings = false;
    } else if (status === "provider_error" || status === "invalid_request") {
      title = UNAVAILABLE_MESSAGE;
      body = textPair("تعذر جلب البيانات من المزود الحالي. لم يتم عرض أي بيانات بديلة.", "The current provider could not fetch data. No fallback data was shown.");
      settings = false;
    }
    const provider = providerName(response && (response.provider || response.source || response.providerName)) || terminalText("unavailable");
    const checkedAt = response && (response.lastCheckedAt || response.checkedAt || response.fetchedAt || response.generatedAt);
    const lastSuccessfulUpdate = response && (response.lastSuccessfulUpdate || (["success", "available", "connected", "healthy"].includes(status) ? response.lastUpdated : null));
    const nextAction = rangeAction
      ? textPair("وسّع نطاق التاريخ أو غيّر الفترة المحددة.", "Extend the date range or change the selected period.", "Élargissez la plage de dates ou modifiez la période sélectionnée.")
      : settings
        ? textPair("راجع إعدادات المزود ثم أعد فحص الحالة.", "Review provider settings, then refresh the status.", "Vérifiez les paramètres du fournisseur, puis actualisez l’état.")
        : textPair("أعد فحص الحالة. إذا استمرت المشكلة، راجع صلاحية المزود.", "Refresh the status. If it persists, review provider access.", "Actualisez l’état. Si le problème persiste, vérifiez l’accès au fournisseur.");
    return `<div class="empty-state compact calendar-empty trader-calendar-unavailable" role="status" data-calendar-status="${h(status)}">
      <span class="empty-glyph" aria-hidden="true">${["provider_error", "invalid_request"].includes(status) ? "!" : "◌"}</span>
      <div class="trader-calendar-unavailable-copy">
        <span class="state-badge ${h(featureStatusTone(status))}">${h(featureStatusLabel(status))}</span>
        <h3>${h(translateUiText(title))}</h3>
        <p>${h(translateUiText(body))}</p>
        <dl class="trader-calendar-diagnostics">
          <div><dt>${h(textPair("المزود", "Provider", "Fournisseur"))}</dt><dd>${h(provider)}</dd></div>
          <div><dt>${h(textPair("آخر فحص", "Last checked", "Dernière vérification"))}</dt><dd class="ltr">${h(latinDateTime(checkedAt))}</dd></div>
          <div><dt>${h(textPair("آخر تحديث ناجح", "Last successful update", "Dernière mise à jour réussie"))}</dt><dd class="ltr">${h(latinDateTime(lastSuccessfulUpdate))}</dd></div>
          <div><dt>${h(textPair("السبب الآمن", "Safe reason", "Motif sécurisé"))}</dt><dd>${h(translateUiText(body))}</dd></div>
          <div><dt>${h(textPair("الخطوة التالية", "Next action", "Prochaine action"))}</dt><dd>${h(nextAction)}</dd></div>
        </dl>
        <div class="row-actions">${settings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>${h(terminalText("settings"))}</a>` : ""}${rangeAction ? `<button class="outline-btn" type="button" data-calendar-range="90">${h(textPair("توسيع النطاق", "Extend range", "Élargir la période"))}</button>` : ""}<button class="secondary-btn" type="button" data-retry>${h(textPair("تحديث الحالة", "Refresh status", "Actualiser l’état"))}</button></div>
      </div>
    </div>`;
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
    const brands = ["fmp", "finnhub", "yahoo", "yahoo finance", "twelve data", "twelvedata", "eodhd", "tradingeconomics", "trading economics"];
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
      "trading economics": "Trading Economics"
    };
    return official[key] || raw;
  }

  function resultCountText(value) { return value === null || value === undefined ? "--" : textPair(`${latinNumber(value)} نتيجة`, `${latinNumber(value)} results`, `${latinNumber(value)} résultats`); }
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
      ${cats.map((c, i) => {
        const category = LESSON_CATEGORY_LABELS[c] || [c, c, c];
        return `<section class="panel accordion ${i === 0 ? "is-open" : ""}"><button class="acc-head" data-acc>${h(textPair(category[0], category[1], category[2]))}<span class="acc-icon">+</span></button><div class="acc-body"><div class="education-grid">${LESSONS[c].map(([titleAr, titleEn, titleFr, bodyAr, bodyEn, bodyFr]) => `<article class="lesson-card"><span class="eyebrow">${h(textPair("درس", "Lesson"))}</span><strong>${h(textPair(titleAr, titleEn, titleFr))}</strong><p>${h(textPair(bodyAr, bodyEn, bodyFr))}</p></article>`).join("")}</div></div></section>`;
      }).join("")}
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
    const tabs = [
      { id: "overview", label: textPair("نظرة المزود", "Provider Overview", "Vue du fournisseur") },
      { id: "capabilities", label: textPair("القدرات", "Capabilities", "Capacités") },
      { id: "issues", label: textPair("المشكلات", "Issues", "Problèmes"), count: providerUserMessage(normalizedProviderStatus(), providerCopy(), lang) ? 1 : 0 },
      { id: "preferences", label: textPair("التفضيلات", "Preferences", "Préférences") }
    ];
    const signalPanel = `<article class="panel settings-panel signal-settings-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("signalPreferences", lang))}</span><h2>${h(settingsT("signalPreferences", lang))}</h2></div></div>
          <form id="settings-form" class="settings-form">
            <div class="settings-form-grid">
              <label class="settings-field"><span>${h(settingsT("defaultMarket", lang))}</span><select name="defaultMarket">${MARKETS.map(m => `<option value="${m.id}" ${s.defaultMarket === m.id ? "selected" : ""}>${h(textPair(m.ar, m.en, m.fr))}</option>`).join("")}</select></label>
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
        </article>`;
    const policyPanel = `<article class="panel settings-panel settings-policy-panel">
          <div class="panel-head"><div><span class="eyebrow">${h(settingsT("dataPolicy", lang))}</span><h2>${h(settingsT("dataPolicy", lang))}</h2></div></div>
          <div class="settings-info-grid">
            <div class="status-card settings-info-card"><strong>${h(settingsT("languageDirectionTitle", lang))}</strong><p>${h(settingsT("languageDirectionBody", lang))}</p><span class="state-badge ok">${h(textPair("اتجاه مضبوط", "Direction clean", "Sens d’écriture correct"))}</span></div>
            <div class="status-card settings-info-card"><strong>${h(settingsT("noSyntheticTitle", lang))}</strong><p>${h(settingsT("noSyntheticBody", lang))}</p><span class="state-badge warn">${h(textPair("بيانات حقيقية فقط", "Real data only", "Données réelles uniquement"))}</span></div>
            <div class="status-card settings-info-card about-card"><strong>${h(terminalBrandFullTitle())}</strong><p>${h(settingsT("aboutBody", lang))}</p><span class="state-badge">Powered by M.ALQ</span></div>
          </div>
        </article>`;
    return `<div class="page-stack trader-settings-page settings-workspace" dir="${dir}">${hero(settingsT("heroTitle", lang), settingsT("heroBody", lang), settingsT("settings", lang))}
      ${workspaceTabBar("settings", tabs, textPair("مساحة إعدادات المزود", "Provider settings workspace", "Espace fournisseur"), { keepMounted: true })}
      ${workspacePanel("settings", "overview", providerSettingsOverview(lang), { keepMounted: true })}
      ${workspacePanel("settings", "capabilities", providerSettingsCapabilities(lang), { keepMounted: true })}
      ${workspacePanel("settings", "issues", providerSettingsIssues(lang), { keepMounted: true })}
      ${workspacePanel("settings", "preferences", `<section class="settings-grid settings-grid-polished">${signalPanel}${policyPanel}</section>`, { keepMounted: true })}
      ${disclaimer()}</div>`;
  }

  function providerSettingsOverview(lang) {
    const normalized = normalizedProviderStatus();
    const status = providerCopy();
    const tone = normalizedStatusTone(normalized.status) || status.tone || "";
    const cards = [
      [settingsT("providerStatus", lang), status.label, tone],
      [settingsT("providerName", lang), normalized.provider, ""],
      [settingsT("loadedSymbols", lang), countTextLocalized(normalized.loadedCount, lang), normalized.loadedCount > 0 ? "ok" : "warn"],
      [settingsT("lastUpdated", lang), latinDateTime(normalized.lastUpdated), ""]
    ];
    return `<section class="panel settings-panel provider-settings-panel"><div class="provider-status-banner ${tone}"><div><span class="eyebrow">${h(settingsT("provider", lang))}</span><strong>${h(normalized.provider)}</strong><p>${h(status.title)}</p></div><span class="state-badge ${tone}">${h(normalized.configured ? settingsT("configured", lang) : settingsT("notConfigured", lang))}</span></div><div class="provider-status-cards compact">${cards.map(([label, value, cardTone]) => providerMetricCard(label, value, cardTone)).join("")}</div></section>`;
  }

  function providerSettingsCapabilities(lang) {
    const normalized = normalizedProviderStatus();
    const featureList = normalized.supportedFeatures.length ? normalized.supportedFeatures.map(feature => featureLabelLocalized(feature, lang)).join(" · ") : settingsT("noFeatures", lang);
    return `<section class="panel settings-panel provider-settings-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("القدرات", "Capabilities", "Capacités"))}</span><h2>${h(settingsT("supportedFeatures", lang))}</h2></div></div><div class="provider-feature-strip"><span>${h(settingsT("supportedFeatures", lang))}</span><b>${h(featureList)}</b></div></section><article class="panel provider-market-admin-panel" data-provider-market-admin-host="true" aria-live="polite"></article>`;
  }

  function providerSettingsIssues(lang) {
    const normalized = normalizedProviderStatus();
    const status = providerCopy();
    const issue = providerUserMessage(normalized, status, lang);
    return `<section class="panel settings-panel provider-settings-panel workspace-issues-panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("المشكلات", "Issues", "Problèmes"))}</span><h2>${h(issue ? textPair("المزود يحتاج مراجعة", "Provider needs attention", "Le fournisseur nécessite une vérification") : textPair("لا توجد مشكلة نشطة", "No active provider issue", "Aucun problème actif"))}</h2></div><div class="provider-panel-actions"><button class="ghost-btn compact-btn" data-settings-action="retry-provider-now" type="button">${h(settingsT("retryNow", lang))}</button><button class="ghost-btn compact-btn" data-settings-action="test-provider-connection" type="button">${h(settingsT("testProviderConnection", lang))}</button><button class="ghost-btn compact-btn danger-lite" data-settings-action="clear-provider-cache" type="button">${h(settingsT("clearProviderCache", lang))}</button></div></div>${issue ? `<p class="provider-warning">${h(issue)}</p>` : `<p class="provider-clean-note">${h(textPair("اكتملت آخر محاولة بدون خطأ قابل للعرض.", "The latest attempt completed without a displayable error.", "La dernière tentative ne présente aucune erreur."))}</p>`}${diagnosticDetails(normalized)}</section>`;
  }

  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero(
      textPair("تفاصيل الرمز", "Symbol details", "Détails du symbole"),
      textPair("اكتب رمزاً في البحث العلوي لفتح صفحة تحليل مخصصة. أمثلة: AAPL, BTCUSD, XAUUSD, KFH.KW", "Enter a symbol in the top search to open a dedicated analysis page. Examples: AAPL, BTCUSD, XAUUSD, KFH.KW", "Saisissez un symbole dans la recherche supérieure pour ouvrir une page d’analyse dédiée. Exemples : AAPL, BTCUSD, XAUUSD, KFH.KW"),
      textPair("تفاصيل الرمز", "SYMBOL DETAILS", "DÉTAILS DU SYMBOLE")
    )}<section class="panel">${emptyState(
      textPair("لم يتم اختيار رمز", "No symbol selected", "Aucun symbole sélectionné"),
      textPair("استخدم البحث العلوي أو أزرار التفاصيل من الأسواق والتوصيات.", "Use the top search or the detail buttons in markets and recommendations.", "Utilisez la recherche supérieure ou les boutons de détail des marchés et des recommandations."),
      terminalText("market"),
      `${ROOT}/markets`
    )}</section></div>`;
    return `<div class="page-stack"><a class="back-link" href="${ROOT}/markets" data-route-link><span class="back-arrow mirror-inline" aria-hidden="true">‹</span> ${h(terminalText("market"))}</a>
      ${hero(
        textPair(`تحليل <span class="ltr">${h(symbol)}</span>`, `Analysis of <span class="ltr">${h(symbol)}</span>`, `Analyse de <span class="ltr">${h(symbol)}</span>`),
        textPair("صفحة تفاصيل حقيقية لكل رمز تعرض الملف والعملة والمصدر والتحليل عند توفرها من المزود.", "A real detail page for each symbol, showing its profile, currency, source, and analysis when the provider supplies them.", "Une page détaillée réelle pour chaque symbole, avec son profil, sa devise, sa source et son analyse lorsque le fournisseur les fournit."),
        textPair("تفاصيل الرمز", "SYMBOL DETAILS", "DÉTAILS DU SYMBOLE")
      )}
      <section id="symbol-details-body"><div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>${h(textPair("جاري فحص", "Checking", "Vérification de"))} <span class="ltr">${h(symbol)}</span></h2></div></div></section>${disclaimer()}</div>`;
  }

  /* ───────────────────── Async loaders ───────────────────── */
  function calendarQuery(force) {
    const params = new URLSearchParams({ range: state.calendarRange || "30" });
    if (force) params.set("refresh", "1");
    const symbols = unique([...(state.watch || []), ...defaults]);
    if (symbols.length) params.set("symbols", symbols.join(","));
    return params.toString();
  }
  async function loadCalendars(force, kinds = CALENDAR_VIEW_IDS) {
    const qs = calendarQuery(force);
    const requestedKinds = Array.from(new Set(arr(kinds).filter(kind => CALENDAR_VIEW_IDS.includes(kind))));
    const requests = [];
    if (force || !state.calendarLoaded.provider) {
      requests.push({ key: "provider", promise: get("/trader/provider-status", { label: "providerStatus" }), label: "providerStatus" });
    }
    requestedKinds.forEach(kind => {
      if (force || !state.calendarLoaded[kind]) {
        requests.push({ key: kind, promise: get(`/trader/calendar/${kind}?${qs}`, { label: "calendar" }), label: "calendar" });
      }
    });
    if (!requests.length) return;
    const settled = await Promise.allSettled(requests.map(request => request.promise));
    settled.forEach((result, index) => {
      const request = requests[index];
      const value = settledValue(result, request.label);
      if (request.key === "provider") {
        state.providerStatus = value || {};
        state.calendarLoaded.provider = true;
        hydrationLoaded.add("providerStatus");
        if (value && value.dataProvider) state.provider = value.dataProvider;
        return;
      }
      state.calendar[request.key] = value;
      state.calendarLoaded[request.key] = true;
    });
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
      target.innerHTML = `<div class="panel">${emptyState(UNAVAILABLE_MESSAGE, errorMessage(error), terminalText("settings"), `${ROOT}/settings`)}</div>`;
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
        <div class="detail-grid">${detailCard(terminalText("price"), price(p, c), terminalText("price"))}${detailCard(textPair("التغير", "Change", "Variation"), change(chg), textPair("التغير", "Change", "Variation"))}${detailCard(terminalText("currency"), c, terminalText("currency"))}${detailCard(terminalText("type"), a.assetType || assetType(a.symbol), terminalText("type"))}${detailCard(terminalText("exchange"), a.exchange || a.market || "--", terminalText("exchange"))}${detailCard(terminalText("source"), detail.source || "--", terminalText("source"))}</div>
        <div class="detail-grid">${detailCard(textPair("رمز المزود المستخدم", "Provider symbol used", "Symbole du fournisseur utilisé"), providerSymbolUsed, textPair("رمز المزود", "Provider symbol", "Symbole du fournisseur"))}${detailCard(textPair("استخدم الاحتياطي؟", "Used fallback?", "Solution de repli utilisée ?"), fallbackUsed, textPair("الاحتياطي", "Fallback", "Solution de repli"))}${detailCard(terminalText("lastUpdated"), lastUpdated === "--" ? terminalText("unavailable") : lastUpdated, terminalText("lastUpdated"))}${detailCard(terminalText("dataQuality"), quality, terminalText("dataQuality"))}</div>
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

  function drawerTabs() {
    return [
      ["summary", textPair("الملخص", "Summary", "Résumé")],
      ["technical", textPair("الفني", "Technical", "Technique")],
      ["news", textPair("الأخبار", "News", "Actualités")],
      ["earnings", textPair("الأرباح", "Earnings", "Résultats")],
      ["recommendation", textPair("التوصية", "Recommendation", "Recommandation")],
      ["ai", textPair("الذكاء الاصطناعي", "AI", "IA")],
      ["provider", textPair("المزود", "Provider", "Fournisseur")]
    ];
  }

  function drawerLoadedContext(symbol) {
    const key = sym(symbol);
    const aliases = symbolAliases(key);
    const cachedEntry = Array.from(state.cache.entries()).find(([cacheKey]) => aliases.includes(sym(cacheKey)));
    const cachedDetail = cachedEntry ? cachedEntry[1] : null;
    let loaded = mergeRecLists(legacyRecsFrom(state.commandCards), recs());
    const marketRows = [];
    state.marketCache.forEach(payload => marketRows.push(...marketUniverseRows(payload)));
    loaded = mergeRecLists(marketRows, loaded);
    const loadedAsset = findAssetForSymbol(key, loaded) || matchRec(key) || null;
    const rec = cachedDetail && cachedDetail.rec || loadedAsset;
    const asset = normalizeQuote(norm({ symbol: key, ...(loadedAsset || {}), ...(cachedDetail && cachedDetail.asset || {}), ...(rec || {}) }));
    return { symbol: key, asset, rec: rec ? normalizeQuote(norm(rec)) : null, cachedDetail };
  }

  function openSymbolDrawer(symbol, trigger) {
    const key = sym(symbol);
    if (!key) return;
    if (!state.drawer.symbol) drawerReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    state.drawer.symbol = key;
    state.drawer.tab = "summary";
    state.heatmapView.selected = key;
    document.querySelectorAll(".heatmap-tile[data-symbol-details]").forEach(tile => {
      const selected = sym(tile.dataset.symbolDetails) === key;
      tile.classList.toggle("is-selected", selected);
      tile.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    drawerFocusPending = true;
    renderSymbolDrawer();
  }

  function setDrawerBackgroundState(active) {
    const appShell = document.getElementById("app-shell");
    const skipLink = document.querySelector(".terminal-skip-link");
    [appShell, skipLink].forEach(node => {
      if (!node) return;
      node.inert = active;
      if (active) node.setAttribute("aria-hidden", "true");
      else node.removeAttribute("aria-hidden");
    });
  }

  function closeSymbolDrawer(options = {}) {
    const closingSymbol = state.drawer.symbol;
    const restore = options.restoreFocus !== false ? drawerReturnFocus : null;
    state.drawer.symbol = "";
    state.drawer.tab = "summary";
    drawerFocusPending = false;
    renderSymbolDrawer();
    drawerReturnFocus = null;
    if (options.restoreFocus !== false) {
      window.requestAnimationFrame(() => {
        if (restore && typeof restore.focus === "function" && document.contains(restore)) {
          restore.focus();
          return;
        }
        const fallback = Array.from(document.querySelectorAll("[data-symbol-details]")).find(node => sym(node.dataset.symbolDetails) === closingSymbol);
        fallback?.focus();
      });
    }
  }

  function setDrawerTab(tab, options = {}) {
    const allowed = drawerTabs().map(([value]) => value);
    if (!allowed.includes(tab) || !state.drawer.symbol) return;
    state.drawer.tab = tab;
    drawerFocusPending = options.focus === true;
    renderSymbolDrawer();
  }

  function renderSymbolDrawer() {
    let host = document.getElementById("symbol-drawer-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "symbol-drawer-host";
      document.body.appendChild(host);
    }
    if (!state.drawer.symbol) {
      host.innerHTML = "";
      host.hidden = true;
      document.body.classList.remove("symbol-drawer-open");
      document.body.style.overflow = drawerBodyOverflow;
      setDrawerBackgroundState(false);
      return;
    }
    if (!document.body.classList.contains("symbol-drawer-open")) drawerBodyOverflow = document.body.style.overflow;
    document.body.classList.add("symbol-drawer-open");
    document.body.style.overflow = "hidden";
    setDrawerBackgroundState(true);
    host.hidden = false;
    host.innerHTML = symbolQuickDrawerHtml(drawerLoadedContext(state.drawer.symbol));
    translateRenderedUi(host);
    if (drawerFocusPending) {
      drawerFocusPending = false;
      window.requestAnimationFrame(() => {
        const target = host.querySelector(`[data-drawer-tab="${state.drawer.tab}"]`) || host.querySelector("[data-drawer-close]");
        target?.focus();
      });
    }
  }

  function symbolQuickDrawerHtml(context) {
    const { symbol, asset } = context;
    const active = drawerTabs().some(([value]) => value === state.drawer.tab) ? state.drawer.tab : "summary";
    const watched = state.watch.some(item => sym(item) === symbol);
    const compared = state.drawer.compare.some(item => sym(item) === symbol);
    const panel = drawerTabContent(active, context);
    return `<div class="symbol-drawer-layer is-open" data-drawer-close-layer>
      <button class="symbol-drawer-backdrop" type="button" data-drawer-close aria-label="${h(textPair("إغلاق لوحة الرمز", "Close symbol drawer", "Fermer le panneau du symbole"))}" tabindex="-1"></button>
      <aside class="symbol-quick-drawer" data-symbol-drawer role="dialog" aria-modal="true" aria-labelledby="symbol-drawer-title" aria-describedby="symbol-drawer-description" dir="${isLtrLanguage() ? "ltr" : "rtl"}">
        <header class="drawer-head"><div class="drawer-identity">${logo(asset, "lg")}<div><span class="eyebrow">${h(textPair("عرض سريع", "Quick view", "Vue rapide"))}</span><h2 class="ltr" id="symbol-drawer-title">${h(displaySymbolFor(symbol))}</h2><p id="symbol-drawer-description">${h(asset.name || textPair("تفاصيل الرمز من البيانات المحملة", "Symbol details from loaded data", "Détails issus des données chargées"))}</p></div></div><button class="drawer-close" type="button" data-drawer-close aria-label="${h(textPair("إغلاق", "Close", "Fermer"))}">×</button></header>
        <nav class="drawer-tabs" role="tablist" aria-label="${h(textPair("أقسام تفاصيل الرمز", "Symbol detail sections", "Sections du symbole"))}">${drawerTabs().map(([value, label]) => `<button class="drawer-tab ${active === value ? "is-active" : ""}" type="button" role="tab" id="drawer-tab-${value}" aria-selected="${active === value}" aria-controls="drawer-panel-${value}" tabindex="${active === value ? "0" : "-1"}" data-drawer-tab="${value}">${h(label)}</button>`).join("")}</nav>
        <section class="drawer-panel" id="drawer-panel-${active}" role="tabpanel" aria-labelledby="drawer-tab-${active}" tabindex="0">${panel}</section>${drawerTabs().filter(([value]) => value !== active).map(([value]) => `<section id="drawer-panel-${value}" role="tabpanel" aria-labelledby="drawer-tab-${value}" hidden></section>`).join("")}
        <div class="drawer-actions" aria-label="${h(textPair("إجراءات السوق", "Market actions", "Actions de marché"))}"><button class="action-btn" type="button" data-drawer-analyze="${h(symbol)}">${h(textPair("حلل", "Analyze", "Analyser"))}</button><button class="ghost-btn" type="button" data-drawer-full="${h(symbol)}">${h(textPair("افتح التحليل الكامل", "Open full analysis", "Ouvrir l’analyse complète"))}</button><button class="ghost-btn ${watched ? "is-active" : ""}" type="button" data-drawer-watch="${h(symbol)}">${h(watched ? textPair("إزالة من المتابعة", "Remove from watchlist", "Retirer du suivi") : textPair("أضف للمتابعة", "Add to watchlist", "Ajouter au suivi"))}</button><button class="ghost-btn" type="button" data-drawer-alert="${h(symbol)}">${h(textPair("أنشئ تنبيهاً", "Create alert", "Créer une alerte"))}</button><button class="ghost-btn ${compared ? "is-active" : ""}" type="button" data-drawer-compare="${h(symbol)}">${h(compared ? textPair("إزالة من المقارنة", "Remove comparison", "Retirer la comparaison") : textPair("قارن", "Compare", "Comparer"))}</button><button class="ghost-btn" type="button" data-drawer-export="${h(symbol)}">${h(textPair("تصدير PDF", "Export PDF", "Exporter en PDF"))}</button><button class="ghost-btn" type="button" data-drawer-share="${h(symbol)}">${h(textPair("مشاركة", "Share", "Partager"))}</button></div>
        ${drawerCompareTray()}
      </aside>
    </div>`;
  }

  function drawerTabContent(tab, context) {
    if (tab === "technical") return drawerTechnicalTab(context);
    if (tab === "news") return drawerNewsTab(context);
    if (tab === "earnings") return drawerEarningsTab(context);
    if (tab === "recommendation") return drawerRecommendationTab(context);
    if (tab === "ai") return smartAnalysisTerminal(context.rec || context.asset, "drawer-analysis-terminal-title");
    if (tab === "provider") return drawerProviderTab(context);
    return drawerSummaryTab(context);
  }

  function drawerSummaryTab({ asset }) {
    const recommendation = sharedRecommendation(asset);
    const dataState = assetDataState(asset, recommendation);
    const evidenceReady = dataState.key === "available";
    const c = currency(asset);
    const chg = asset.changePercent;
    return `<div class="drawer-summary"><div class="drawer-price"><span>${h(terminalText("price"))}</span><strong class="ltr">${h(price(asset.price, c))}</strong><b class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</b></div><div class="drawer-metrics">${drawerMetric(textPair("التوصية", "Recommendation", "Recommandation"), evidenceReady ? recommendationLabel(recommendation) : dataState.label, evidenceReady ? recommendationTone(recommendation) : dataState.tone)}${drawerMetric(textPair("ثقة AI", "AI confidence", "Confiance IA"), !evidenceReady || recommendation.confidence === null ? terminalText("unavailable") : `${Math.round(recommendation.confidence)}%`)}${drawerMetric(textPair("المخاطر", "Risk", "Risque"), asset.risk || asset.riskLevel ? riskShort(asset.risk || asset.riskLevel) : terminalText("unavailable"))}${drawerMetric(textPair("الاتجاه", "Trend", "Tendance"), trendText(asset.trend || asset.technicalTrend || asset.direction) || terminalText("unavailable"))}</div>${!evidenceReady ? `<p class="provider-warning">${h(dataState.body)}</p>` : ""}${miniChart(asset)}${stockCardMeta(asset)}</div>`;
  }

  function drawerTechnicalTab({ asset, cachedDetail }) {
    const technicalData = cachedDetail && cachedDetail.tech || asset.technical || asset.technicalAnalysis || asset.indicators;
    if (!technicalData) return drawerUnavailable(textPair("التحليل الفني غير محمل لهذا الرمز", "Technical analysis is not loaded for this symbol", "L’analyse technique n’est pas chargée pour ce symbole"), textPair("افتح التحليل الكامل لجلب بيانات الرمز عند الحاجة.", "Open full analysis to load symbol data when needed.", "Ouvrez l’analyse complète pour charger les données si nécessaire."));
    return `<div class="drawer-technical">${technical(asset, technicalData, currency(asset), cachedDetail || {})}</div>`;
  }

  function drawerNewsForSymbol(symbol, cachedDetail) {
    const payload = cachedDetail && cachedDetail.news || state.news;
    const items = arr(payload && (payload.items || payload.articles || payload.news || payload.data || payload.results));
    const aliases = symbolAliases(symbol);
    return items.filter(item => {
      const symbols = arr(item.symbols || item.tickers || item.relatedSymbols || item.related_symbols).map(sym);
      const direct = sym(item.symbol || item.ticker);
      if (direct && aliases.includes(direct)) return true;
      if (symbols.some(value => aliases.includes(value))) return true;
      return aliases.some(alias => alias.length > 2 && `${item.title || ""} ${item.summary || item.description || ""}`.toUpperCase().includes(alias));
    });
  }

  function drawerNewsTab({ symbol, cachedDetail }) {
    const items = drawerNewsForSymbol(symbol, cachedDetail).slice(0, 6);
    return items.length ? `<div class="drawer-news">${newsList(items)}</div>` : drawerUnavailable(textPair("لا توجد أخبار محملة لهذا الرمز", "No loaded news for this symbol", "Aucune actualité chargée pour ce symbole"), textPair("تعرض هذه اللوحة الأخبار المحملة مسبقاً فقط.", "This drawer only shows news already loaded in the workspace.", "Ce panneau affiche uniquement les actualités déjà chargées."));
  }

  function drawerCalendarRows(symbol, kind) {
    const aliases = symbolAliases(symbol);
    const payload = state.calendar && state.calendar[kind];
    return arr(payload && (payload.data || payload.items || payload.results || payload.events)).filter(item => aliases.includes(sym(item.symbol || item.ticker || item.code)));
  }

  function drawerEarningsTab({ symbol }) {
    const earnings = drawerCalendarRows(symbol, "earnings");
    const dividends = drawerCalendarRows(symbol, "dividends");
    if (!earnings.length && !dividends.length) return drawerUnavailable(textPair("لا توجد أرباح محملة لهذا الرمز", "No loaded earnings for this symbol", "Aucun résultat chargé pour ce symbole"), textPair("تعرض اللوحة بيانات التقويم الموجودة في الذاكرة فقط دون طلب إضافي.", "The drawer shows only calendar data already in memory, without another request.", "Le panneau affiche uniquement les données du calendrier déjà en mémoire."));
    const row = (item, kind) => `<article class="drawer-event"><span class="state-badge">${h(kind)}</span><strong>${h(item.companyName || item.name || displaySymbolFor(symbol))}</strong><small class="ltr">${h(latinDateTime(item.reportDate || item.date || item.exDate || item.paymentDate))}</small><p>${h(item.status || item.time || item.amount || item.epsEstimate || terminalText("unavailable"))}</p></article>`;
    return `<div class="drawer-events">${earnings.map(item => row(item, textPair("أرباح", "Earnings", "Résultats"))).join("")}${dividends.map(item => row(item, textPair("توزيعات", "Dividends", "Dividendes"))).join("")}</div>`;
  }

  function drawerRecommendationTab({ asset, rec }) {
    const source = rec || asset;
    const recommendation = sharedRecommendation(source);
    const dataState = assetDataState({ ...asset, ...source }, recommendation);
    const evidenceReady = dataState.key === "available";
    const c = currency(asset);
    const target = num(source.target, source.targetPrice, recommendation.targetPrice);
    const stop = num(source.stop, source.stopLoss, recommendation.stopLoss);
    return `<div class="drawer-recommendation"><div class="drawer-recommendation-verdict ${evidenceReady ? recommendationTone(recommendation) : dataState.tone}"><span>${h(textPair("التوصية", "Recommendation", "Recommandation"))}</span><strong>${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</strong></div><div class="drawer-metrics">${drawerMetric(textPair("ثقة AI", "AI confidence", "Confiance IA"), !evidenceReady || recommendation.confidence === null ? terminalText("unavailable") : `${Math.round(recommendation.confidence)}%`)}${drawerMetric(terminalText("target"), evidenceReady && target !== null ? price(target, c) : terminalText("unavailable"))}${drawerMetric(terminalText("stop"), evidenceReady && stop !== null ? price(stop, c) : terminalText("unavailable"))}${drawerMetric(textPair("الأفق", "Horizon", "Horizon"), evidenceReady ? source.timeframe || source.horizon || source.duration || terminalText("unavailable") : dataState.label)}</div><p>${h(evidenceReady ? safeStateText(recommendation.reason || source.reason, textPair("لم يقدم المزود سبباً تفصيلياً.", "The provider supplied no detailed rationale.", "Le fournisseur n’a fourni aucune justification détaillée.")) : dataState.body)}</p></div>`;
  }

  function drawerProviderTab({ asset, cachedDetail }) {
    const p = providerCopy();
    const detailStatus = cachedDetail && cachedDetail.providerStatus || asset.providerStatus || {};
    const rows = [
      [textPair("حالة المزود", "Provider status", "État du fournisseur"), p.label],
      [textPair("المزود", "Provider", "Fournisseur"), stockProviderValue(asset)],
      [textPair("رمز المزود", "Provider symbol", "Symbole fournisseur"), asset.providerSymbolUsed || asset.providerSymbol || detailStatus.providerSymbolUsed],
      [terminalText("dataQuality"), dataQualityLabel(asset.dataQuality || detailStatus.dataQuality)],
      [terminalText("lastUpdated"), stockFreshnessValue(asset)],
      [terminalText("source"), cachedDetail && cachedDetail.source || asset.source]
    ];
    return `<div class="drawer-provider"><div class="analysis-provider-state ${p.tone || ""}"><span>${h(textPair("حالة المزود", "Provider status", "État du fournisseur"))}</span><strong>${h(p.label)}</strong><small>${h(p.explanation || p.copy || "")}</small></div><dl>${rows.map(([label, value]) => `<div><dt>${h(label)}</dt><dd>${h(value || terminalText("unavailable"))}</dd></div>`).join("")}</dl></div>`;
  }

  function drawerMetric(label, value, tone = "") {
    return `<span class="drawer-metric ${tone}"><small>${h(label)}</small><b class="${isMarketValueText(value) ? "ltr market-value" : ""}">${h(value || terminalText("unavailable"))}</b></span>`;
  }

  function drawerUnavailable(title, body) {
    return `<div class="drawer-empty" role="status"><span aria-hidden="true">⌁</span><h3>${h(title)}</h3><p>${h(body)}</p></div>`;
  }

  function drawerCompareTray() {
    if (!state.drawer.compare.length) return "";
    return `<div class="drawer-compare-tray"><span>${h(textPair("قائمة المقارنة", "Compare tray", "Liste de comparaison"))}</span><div>${state.drawer.compare.map(symbol => `<button type="button" class="badge" data-symbol-details="${h(symbol)}"><span class="ltr">${h(displaySymbolFor(symbol))}</span></button>`).join("")}</div></div>`;
  }

  function toggleDrawerWatch(raw) {
    const symbol = sym(raw);
    if (!symbol) return;
    drawerFocusPending = true;
    if (state.watch.some(item => sym(item) === symbol)) removeWatch(symbol);
    else addWatch(symbol);
  }

  function toggleDrawerCompare(raw) {
    const symbol = sym(raw);
    if (!symbol) return;
    drawerFocusPending = true;
    const exists = state.drawer.compare.some(item => sym(item) === symbol);
    if (exists) state.drawer.compare = state.drawer.compare.filter(item => sym(item) !== symbol);
    else if (state.drawer.compare.length < 4) state.drawer.compare = [...state.drawer.compare, symbol];
    else return toast(textPair("يمكن مقارنة أربعة رموز كحد أقصى.", "Compare up to four symbols.", "Comparez jusqu’à quatre symboles."));
    renderSymbolDrawer();
  }

  async function shareDrawerSymbol(raw) {
    const symbol = sym(raw || state.drawer.symbol);
    if (!symbol) return;
    const url = new URL(`${ROOT}/symbol-details/${encodeURIComponent(symbol)}`, location.origin).href;
    const title = `${textPair("تحليل", "Analysis", "Analyse")} ${displaySymbolFor(symbol)}`;
    if (navigator.share) {
      try { await navigator.share({ title, text: title, url }); return; } catch (error) { if (errorName(error) === "AbortError") return; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast(textPair("تم نسخ رابط التحليل.", "Analysis link copied.", "Lien d’analyse copié."));
        return;
      } catch (_error) {
        // Fall through to the explicit unavailable message below.
      }
    }
    toast(textPair("تعذر نسخ الرابط على هذا الجهاز.", "Link copying is unavailable on this device.", "La copie du lien n’est pas disponible sur cet appareil."));
  }

  function exportDrawerSymbol(raw, trigger) {
    const symbol = sym(raw || state.drawer.symbol);
    if (!symbol) {
      toast(textPair("اختر رمزاً قبل التصدير.", "Choose a symbol before exporting.", "Choisissez un symbole avant l’exportation."));
      return;
    }
    if (state.drawer.symbol !== symbol) openSymbolDrawer(symbol, trigger);
    window.requestAnimationFrame(() => window.print());
  }

  function dismissFocusedTooltip(event) {
    if (event.key !== "Escape") return false;
    const trigger = event.target.closest?.(".session-bar, .heatmap-tile")
      || document.querySelector(".session-bar:hover, .heatmap-tile:hover");
    if (!trigger) return false;
    trigger.classList.add("tooltip-dismissed");
    const clearWhenInactive = () => {
      if (!trigger.matches(":focus, :hover")) trigger.classList.remove("tooltip-dismissed");
    };
    trigger.addEventListener("blur", clearWhenInactive, { once: true });
    trigger.addEventListener("pointerleave", clearWhenInactive, { once: true });
    event.preventDefault();
    return true;
  }

  function clearDismissedTooltip(event) {
    const trigger = event.target.closest?.(".session-bar, .heatmap-tile");
    if (!trigger || (event.relatedTarget && trigger.contains(event.relatedTarget))) return;
    trigger.classList.remove("tooltip-dismissed");
  }

  function handleSymbolDrawerKeydown(event) {
    if (!state.drawer.symbol) return false;
    const drawer = document.querySelector("[data-symbol-drawer]");
    if (!drawer) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSymbolDrawer();
      return true;
    }
    const activeTab = event.target.closest?.("[data-drawer-tab]");
    if (activeTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const tabs = drawerTabs().map(([value]) => value);
      const current = tabs.indexOf(activeTab.dataset.drawerTab);
      const rtl = !isLtrLanguage();
      let next = current;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key === "ArrowRight") next = (current + (rtl ? -1 : 1) + tabs.length) % tabs.length;
      else next = (current + (rtl ? 1 : -1) + tabs.length) % tabs.length;
      setDrawerTab(tabs[next], { focus: true });
      return true;
    }
    if (event.key !== "Tab") return false;
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => !node.hidden && node.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) return false;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return true; }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return true; }
    if (!drawer.contains(document.activeElement)) { event.preventDefault(); first.focus(); return true; }
    return false;
  }

  /* ───────────────────── Components ───────────────────── */
  function sharedRecommendation(asset, context = {}) {
    return Recommendation.normalizeRecommendation(asset, context);
  }
  function recommendationTone(recommendation) {
    return Recommendation.statusTone(recommendation && recommendation.status);
  }
  function recommendationLabel(recommendation) {
    if (!recommendation) {
      return isFrenchLanguage() ? Recommendation.labelFr("watch") : isEnglishLanguage() ? Recommendation.labelEn("watch") : Recommendation.labelAr("watch");
    }
    if (isFrenchLanguage()) return recommendation.actionLabelFr || Recommendation.labelFr(recommendation.status);
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
  function noMarketDataTitle() {
    return textPair("\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u0627\u064b", "Data is currently unavailable");
  }
  function noMarketDataBody() {
    return textPair("\u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0644\u0627\u062d\u0642\u0627\u064b \u0623\u0648 \u0627\u062e\u062a\u0631 \u0633\u0648\u0642\u0627\u064b \u0622\u062e\u0631", "Try again later or choose another market");
  }
  function marketDataEmptyHtml(extraClass = "") {
    return `<div class="market-card-empty ${h(extraClass)}"><strong>${h(noMarketDataTitle())}</strong><span>${h(noMarketDataBody())}</span></div>`;
  }

  function marketDataStateCopy(key, detail = {}) {
    const states = {
      loading: {
        tone: "", label: textPair("قيد التحميل", "Loading", "Chargement"),
        title: textPair("التحليل قيد التنفيذ", "Analysis in progress", "Analyse en cours"),
        body: textPair("لا تزال المصادر المدعومة قيد المحاولة.", "Supported sources are still being attempted.", "Les sources prises en charge sont toujours en cours d’interrogation.")
      },
      empty: {
        tone: "muted", label: textPair("لا توجد نتائج", "No results", "Aucun résultat"),
        title: textPair("لا توجد نتائج مطابقة", "No matching results", "Aucun résultat correspondant"),
        body: textPair("اكتمل الطلب بنجاح ولم يرجع بيانات تطابق السوق أو الفلاتر الحالية.", "The request succeeded but returned no data matching the current market or filters.", "La requête a abouti, mais aucune donnée ne correspond au marché ou aux filtres actuels.")
      },
      partial: {
        tone: "warn", label: textPair("بيانات جزئية", "Partial data", "Données partielles"),
        title: textPair("تم تحميل جزء من البيانات", "Some data was loaded", "Une partie des données a été chargée"),
        body: textPair("نجحت بعض المصادر أو الحقول، بينما تعذرت أجزاء أخرى. لا تُعرض ثقة أو توصية نهائية للمدخلات الناقصة.", "Some sources or fields succeeded while others failed. Confidence and final recommendations are hidden for incomplete inputs.", "Certaines sources ou données ont abouti, d’autres non. La confiance et la recommandation finale sont masquées pour les entrées incomplètes.")
      },
      stale: {
        tone: "warn", label: textPair("بيانات قديمة", "Stale data", "Données anciennes"),
        title: textPair("تُعرض آخر بيانات صالحة", "Showing the last valid data", "Affichage des dernières données valides"),
        body: textPair("البيانات المخزنة أقدم من حد الحداثة المطلوب ولم ينجح التحديث بعد.", "Cached data is older than the freshness threshold and the refresh has not succeeded yet.", "Les données en cache dépassent le seuil de fraîcheur et l’actualisation n’a pas encore abouti.")
      },
      delayed: {
        tone: "warn", label: textPair("بيانات متأخرة", "Delayed data", "Données différées"),
        title: textPair("البيانات ليست لحظية", "Data is not real time", "Les données ne sont pas en temps réel"),
        body: textPair("يعرض المزود بيانات متأخرة. لا تُعامل كبيانات مباشرة.", "The provider is returning delayed data. It is not presented as live data.", "Le fournisseur renvoie des données différées, qui ne sont pas présentées comme étant en direct.")
      },
      cached: {
        tone: "warn", label: textPair("بيانات مخزنة", "Cached data", "Données en cache"),
        title: textPair("تم استخدام النسخة المخزنة", "Cached data is being used", "Les données en cache sont utilisées"),
        body: textPair("تعذر التحديث المباشر، لذلك تُعرض آخر نسخة صالحة مع توضيح حالتها.", "Live refresh failed, so the last valid copy is shown with its status disclosed.", "L’actualisation en direct a échoué ; la dernière copie valide est affichée avec son statut.")
      },
      unavailable: {
        tone: "muted", label: textPair("غير متاح", "Unavailable", "Indisponible"),
        title: textPair("البيانات غير متاحة حالياً", "Data is currently unavailable", "Les données sont indisponibles"),
        body: textPair("لم تُرجع المصادر المدعومة بيانات قابلة للعرض لهذا الأصل.", "Supported sources returned no displayable data for this asset.", "Les sources prises en charge n’ont renvoyé aucune donnée affichable pour cet actif.")
      },
      unsupported: {
        tone: "muted", label: textPair("غير مدعوم", "Unsupported", "Non pris en charge"),
        title: textPair("الميزة غير مدعومة", "This feature is unsupported", "Cette fonction n’est pas prise en charge"),
        body: textPair("لا يدعم أي مزود مهيأ هذه الميزة أو هذا النوع من الأصول.", "No configured provider supports this feature or asset type.", "Aucun fournisseur configuré ne prend en charge cette fonction ou ce type d’actif.")
      },
      insufficient: {
        tone: "warn", label: textPair("بيانات غير كافية", "Insufficient data", "Données insuffisantes"),
        title: textPair("البيانات لا تكفي لإنتاج توصية", "There is not enough data for a recommendation", "Les données sont insuffisantes pour une recommandation"),
        body: textPair("توجد بعض البيانات، لكن مدخلات التحليل المطلوبة غير مكتملة.", "Some data exists, but required analysis inputs are incomplete.", "Certaines données existent, mais les entrées requises pour l’analyse sont incomplètes.")
      },
      rate_limited: {
        tone: "warn", label: textPair("تم تجاوز حد الاستخدام", "Rate limited", "Limite d’utilisation atteinte"),
        title: textPair("أوقف المزود الطلبات مؤقتاً", "The provider temporarily limited requests", "Le fournisseur a temporairement limité les requêtes"),
        body: textPair("حاول مرة أخرى لاحقاً. لن تُعرض قيم مصطنعة أثناء الانتظار.", "Try again later. No synthetic values are shown while waiting.", "Réessayez plus tard. Aucune valeur artificielle n’est affichée pendant l’attente.")
      },
      misconfigured: {
        tone: "warn", label: textPair("إعداد غير مكتمل", "Misconfigured", "Configuration incomplète"),
        title: textPair("إعداد المزود غير مكتمل", "Provider configuration is incomplete", "La configuration du fournisseur est incomplète"),
        body: textPair("يجب إكمال إعداد المزود أو صلاحياته قبل تحميل هذه البيانات.", "Complete the provider configuration or permissions before loading this data.", "Terminez la configuration ou les autorisations du fournisseur avant de charger ces données.")
      },
      error: {
        tone: "warn", label: textPair("تعذر التحميل", "Request failed", "Échec de la requête"),
        title: textPair("تعذر الاتصال بالمصادر المدعومة", "Supported sources could not be reached", "Impossible de joindre les sources prises en charge"),
        body: textPair("فشل الطلب ولم تُعرض رسالة المزود الخام أو بيانات بديلة مصطنعة.", "The request failed; raw provider errors and synthetic fallback data are not shown.", "La requête a échoué ; les erreurs brutes du fournisseur et les données de remplacement artificielles ne sont pas affichées.")
      },
      available: {
        tone: "ok", label: textPair("متاح", "Available", "Disponible"),
        title: textPair("تم تحميل البيانات", "Data loaded", "Données chargées"),
        body: textPair("اكتمل الطلب بالمدخلات المطلوبة.", "The request completed with the required inputs.", "La requête a abouti avec les entrées requises.")
      }
    };
    return { key, ...(states[key] || states.unavailable), ...detail };
  }

  function sourceRecommendationStatus(asset) {
    const a = asset || {};
    const candidates = [a.normalizedRecommendation, a.finalRecommendationNormalized, a.sharedRecommendation, a.finalRecommendationStatus, a.final_recommendation_status, a.recommendationStatus, a.recommendation_status, a.finalRecommendation, a.final_recommendation, a.finalRecommendationAr, a.final_recommendation_ar, a.action, a.signal, a.recommendation, a.side];
    for (const candidate of candidates) {
      const parsed = Recommendation.parseRecommendationStatus(candidate);
      if (parsed) return parsed;
    }
    return "";
  }
  function assetDataState(asset, recommendation) {
    const a = normalizeQuote(norm(asset));
    const rec = recommendation || sharedRecommendation(a);
    const providerRecord = a.providerStatus && typeof a.providerStatus === "object" ? a.providerStatus : {};
    const qualitySource = a.dataQuality || a.data_quality || providerRecord.dataQuality || providerRecord.freshness || a.cacheStatus;
    const quality = qualitySource ? normalizedDataQuality(qualitySource) : "";
    const providerStatus = String((providerRecord.status || providerRecord.code) || a.provider_status || a.statusCode || "").toLowerCase();
    const failureText = [a.error, a.message, a.reason, a.unavailableReason, providerRecord.error, providerRecord.reason, providerRecord.message, providerStatus].filter(Boolean).join(" ");
    const hasPrice = isValidPrice(a.price);
    const isRateLimited = providerStatus === "rate_limited" || isRateLimitText(failureText);
    const isMisconfigured = /not_configured|missing_provider|misconfigured|configuration_missing|invalid_config/.test(failureText.toLowerCase());
    const isUnsupported = /unsupported|not_supported|not_entitled/.test(failureText.toLowerCase()) || a.supported === false;
    const isError = /provider_error|request_failed|failed|failure|timeout|unauthorized|forbidden|invalid_request/.test(failureText.toLowerCase());
    const unavailable = a.available === false
      || !hasPrice
      || a.priceUnavailable === true
      || a.dataUnavailable === true
      || quality === "unavailable"
      || providerStatus === "unavailable"
      || providerStatus === "missing";
    if (!hasPrice || unavailable) {
      if (isRateLimited) return marketDataStateCopy("rate_limited", { quality: quality || "unavailable" });
      if (isMisconfigured) return marketDataStateCopy("misconfigured", { quality: quality || "unavailable" });
      if (isUnsupported) return marketDataStateCopy("unsupported", { quality: quality || "unavailable" });
      if (isError) return marketDataStateCopy("error", { quality: quality || "unavailable" });
      return marketDataStateCopy("unavailable", { quality: quality || "unavailable" });
    }
    if ((rec && rec.status === "insufficient_data")
      || a.technicalAvailable === false
      || a.technical_available === false
      || !sourceRecommendationStatus(a)) {
      return marketDataStateCopy("insufficient", { quality: quality || "partial" });
    }
    if (quality === "stale" || a.stale === true || providerRecord.stale === true) return marketDataStateCopy("stale", { quality: "stale" });
    if (quality === "delayed" || quality === "late" || a.delayed === true || providerRecord.delayed === true) return marketDataStateCopy("delayed", { quality: "delayed" });
    if (quality === "cached" || a.cached === true || providerRecord.cached === true) return marketDataStateCopy("cached", { quality: "cached" });
    if (quality === "partial" || a.partial === true || providerRecord.partial === true || isError) return marketDataStateCopy("partial", { quality: "partial" });
    return marketDataStateCopy("available", { quality: quality || "live" });
  }

  function payloadFeatureState(payload) {
    if (!payload || !Object.keys(payload).length) return marketDataStateCopy("loading");
    const provider = payload.dataProvider || payload.provider || {};
    const rawStatus = [payload.status, payload.code, payload.legacyStatus, payload.normalizedStatus && payload.normalizedStatus.status, provider.status].filter(Boolean).join(" ").toLowerCase();
    const reason = [payload.message, payload.error, payload.reason, payload.failureReason, rawStatus].filter(Boolean).join(" ");
    const quality = normalizedDataQuality(payload.dataQuality || payload.data_quality || payload.freshness || payload.cacheStatus || "");
    if (/loading|pending|checking|fetching/.test(rawStatus)) return marketDataStateCopy("loading");
    if (rawStatus === "rate_limited" || isRateLimitText(reason)) return marketDataStateCopy("rate_limited");
    if (/not_configured|missing_provider|misconfigured|configuration_missing|invalid_config/.test(reason.toLowerCase())) return marketDataStateCopy("misconfigured");
    if (payload.routeUnavailable || /unsupported|not_supported|not_entitled/.test(reason.toLowerCase())) return marketDataStateCopy("unsupported");
    if (payload.timeout || /provider_error|request_failed|failed|failure|timeout|unauthorized|forbidden|invalid_request/.test(reason.toLowerCase())) return marketDataStateCopy("error");
    if (quality === "stale" || payload.stale === true) return marketDataStateCopy("stale");
    if (quality === "delayed" || quality === "late" || payload.delayed === true) return marketDataStateCopy("delayed");
    if (quality === "cached" || payload.cached === true) return marketDataStateCopy("cached");
    if (quality === "partial" || /partial|degraded/.test(rawStatus)) return marketDataStateCopy("partial");
    if (payload.ok === false) return marketDataStateCopy("error");
    if (/unavailable|missing/.test(rawStatus)) return marketDataStateCopy("unavailable");
    return marketDataStateCopy("available");
  }

  function recommendationFeedState(items = recs()) {
    const records = arr(items);
    const pending = state.loading || Array.from(hydrationInFlight.values()).some(entry => entry && ["rec", "signals"].includes(entry.key));
    const states = [payloadFeatureState(state.rec), payloadFeatureState(state.signals)];
    const blockingPriority = ["rate_limited", "misconfigured", "error", "unsupported", "unavailable"];
    if (records.length) {
      if (states.some(item => blockingPriority.includes(item.key))) return marketDataStateCopy("partial");
      const itemStates = records.map(item => assetDataState(item, sharedRecommendation(item)));
      const blockedItems = itemStates.filter(item => blockingPriority.includes(item.key));
      if (blockedItems.length) {
        const oneState = blockedItems.every(item => item.key === blockedItems[0].key);
        return marketDataStateCopy(oneState && blockedItems.length === itemStates.length ? blockedItems[0].key : "partial");
      }
      const degradedItems = itemStates.filter(item => item.key !== "available");
      if (degradedItems.length) {
        const oneState = degradedItems.every(item => item.key === degradedItems[0].key);
        return marketDataStateCopy(oneState && degradedItems.length === itemStates.length ? degradedItems[0].key : "partial");
      }
      for (const key of ["stale", "delayed", "cached", "partial"]) {
        if (states.some(item => item.key === key)) return marketDataStateCopy(key);
      }
      return marketDataStateCopy("available");
    }
    if (pending || states.some(item => item.key === "loading")) return marketDataStateCopy("loading");
    for (const key of blockingPriority) {
      if (states.some(item => item.key === key)) return marketDataStateCopy(key);
    }
    return marketDataStateCopy("empty");
  }

  function dataStateEmpty(stateCopy, options = {}) {
    const showSettings = ["misconfigured", "unsupported"].includes(stateCopy.key);
    const role = ["error", "rate_limited", "misconfigured"].includes(stateCopy.key) ? "alert" : "status";
    return `<div class="empty-state compact data-state-empty state-${h(stateCopy.key)}" role="${role}" data-data-state="${h(stateCopy.key)}"><span class="empty-glyph" aria-hidden="true">${stateCopy.key === "loading" ? "…" : stateCopy.key === "error" ? "!" : "◎"}</span><h3>${h(stateCopy.title)}</h3><p>${h(stateCopy.body)}</p><div class="row-actions">${showSettings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>${h(terminalText("settings"))}</a>` : ""}${stateCopy.key !== "empty" || options.retryOnEmpty ? `<button class="ghost-btn" data-retry type="button">${h(terminalText("retry"))}</button>` : ""}</div></div>`;
  }

  function hasValidDirectionalSignal(item) {
    const a = normalizeQuote(norm(item));
    const rec = sharedRecommendation(a);
    const status = Recommendation.parseRecommendationStatus(rec && rec.status);
    const dataState = assetDataState(a, rec);
    return dataState.key === "available" && (isBuySignalName(status) || isSellSignalName(status));
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
    const title = disabled ? h(translateUiText((asset && asset.unavailableReason ? unavailablePriceText(asset) : null) || (recommendation && recommendation.reason) || textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed."))) : "";
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

  function strategyRowsFromBackend(...records) {
    for (const record of records) {
      const strategies = arr(record && record.strategies);
      if (strategies.length) return strategies;
    }
    return [];
  }

  function strategyRowComparable(row) {
    if (!row || typeof row !== "object" || row.available === false || row.valid === false || row.comparable === false || row.participating === false) return false;
    const rowStatus = String(row.status || row.dataStatus || row.data_status || "").trim().toLowerCase();
    if (/unavailable|insufficient|unsupported|error|failed|skipped|missing/.test(rowStatus)) return false;
    const rawSignal = row.signal ?? row.action ?? row.recommendation ?? row.vote ?? row.result;
    const parsed = Recommendation.parseRecommendationStatus(rawSignal);
    if (parsed === "buy" || parsed === "sell" || parsed === "watch") return true;
    return ["neutral", "wait", "hold"].includes(String(rawSignal || "").trim().toLowerCase());
  }

  function comparableStrategyRow(row) {
    const rawSignal = row.signal ?? row.action ?? row.recommendation ?? row.vote ?? row.result;
    const parsed = Recommendation.parseRecommendationStatus(rawSignal);
    return {
      ...row,
      signal: parsed === "buy" || parsed === "sell" ? parsed : "watch",
      weight: num(row.weight, row.strategyWeight, row.strategy_weight) ?? 1
    };
  }

  function strategyCoverageMeta(...records) {
    const rows = strategyRowsFromBackend(...records);
    const comparableRows = rows.filter(strategyRowComparable).map(comparableStrategyRow);
    const agreement = agreementObject(...records) || {};
    let explicitAvailable = null;
    let explicitTotal = null;
    let explicitComplete = false;
    for (const record of records) {
      if (!record) continue;
      const coverage = record.dataSufficiency && record.dataSufficiency.strategyCoverage
        || record.strategyCoverage
        || record.strategy_coverage
        || {};
      if (explicitAvailable === null) explicitAvailable = num(coverage.available, coverage.valid, coverage.comparable, coverage.participating);
      if (explicitTotal === null) explicitTotal = num(coverage.total, coverage.required, coverage.expected);
      explicitComplete = explicitComplete || coverage.complete === true || coverage.isComplete === true;
    }
    if (explicitAvailable === null) explicitAvailable = num(agreement.validStrategyCount, agreement.availableStrategyCount, agreement.participatingStrategyCount);
    if (explicitTotal === null) explicitTotal = num(agreement.requiredStrategyCount, agreement.totalStrategyCount, agreement.expectedStrategyCount);
    explicitComplete = explicitComplete || agreement.coverageComplete === true || agreement.completeCoverage === true;
    const count = rows.length ? comparableRows.length : Math.max(0, Math.round(explicitAvailable ?? backendStrategyCount(...records)));
    const requiredCount = Math.max(0, Math.round(explicitTotal ?? (rows.length ? rows.length : 0)));
    const rowCoverageComplete = rows.length > 0 && comparableRows.length === rows.length && requiredCount > 0 && comparableRows.length >= requiredCount;
    const explicitCoverageComplete = explicitComplete || (explicitAvailable !== null && explicitTotal !== null && explicitTotal > 0 && explicitAvailable >= explicitTotal);
    const completeCoverage = count >= 3 && (rowCoverageComplete || (!rows.length && explicitCoverageComplete));
    return { rows, comparableRows, count, requiredCount, completeCoverage };
  }

  function strategyAgreementMetric(...records) {
    const agreement = agreementObject(...records);
    const coverage = strategyCoverageMeta(...records);
    const derived = coverage.comparableRows.length ? consensus(coverage.comparableRows) : null;
    const rawPct = derived ? derived.agreement : num(agreement && (agreement.agreementPct ?? agreement.agreement ?? agreement.percent));
    const limited = coverage.count < 3 || !coverage.completeCoverage;
    const cap = coverage.count < 3 ? 66 : coverage.completeCoverage ? 100 : 99;
    const pct = rawPct === null ? null : Math.max(0, Math.min(cap, Math.round(rawPct)));
    const limitedLabel = coverage.count < 3
      ? textPair("توافق محدود", "Limited consensus", "Consensus limité")
      : textPair("تغطية استراتيجية جزئية", "Partial strategy coverage", "Couverture stratégique partielle");
    const helper = coverage.requiredCount > 0
      ? textPair(`${latinNumber(coverage.count)} من ${latinNumber(coverage.requiredCount)} استراتيجيات قابلة للمقارنة`, `${latinNumber(coverage.count)} of ${latinNumber(coverage.requiredCount)} comparable strategies`, `${latinNumber(coverage.count)} stratégies comparables sur ${latinNumber(coverage.requiredCount)}`)
      : textPair(`${latinNumber(coverage.count)} استراتيجية قابلة للمقارنة`, `${latinNumber(coverage.count)} comparable strategies`, `${latinNumber(coverage.count)} stratégies comparables`);
    return {
      value: limited ? limitedLabel : pct === null ? terminalText("unavailable") : `${pct}%`,
      helper,
      count: coverage.count,
      requiredCount: coverage.requiredCount,
      completeCoverage: coverage.completeCoverage,
      agreementPct: pct,
      limited,
      label: limited ? limitedLabel : (agreement && (isFrenchLanguage() ? agreement.labelFr || frenchUiText(agreement.label) : isEnglishLanguage() ? agreement.labelEn || agreement.label : agreement.labelAr || agreement.label)) || textPair("اتفاق الاستراتيجيات", "Strategy agreement", "Accord des stratégies"),
    };
  }
  function backendConsensusFromRecords(...records) {
    const agreement = agreementObject(...records);
    const metric = strategyAgreementMetric(...records);
    const comparableRows = strategyCoverageMeta(...records).comparableRows;
    const comparableConsensus = comparableRows.length ? consensus(comparableRows) : null;
    const buy = comparableConsensus ? comparableConsensus.buy : Math.round(num(agreement && (agreement.buyPct ?? agreement.buy ?? agreement.buyPercent)) ?? 0);
    const sell = comparableConsensus ? comparableConsensus.sell : Math.round(num(agreement && (agreement.sellPct ?? agreement.sell ?? agreement.sellPercent)) ?? 0);
    const watch = comparableConsensus ? comparableConsensus.neutral : Math.round(num(agreement && (agreement.watchPct ?? agreement.neutralPct ?? agreement.watch ?? agreement.neutral)) ?? Math.max(0, 100 - buy - sell));
    const rec = records.find(Boolean) || {};
    return {
      signal: comparableConsensus ? comparableConsensus.signal : signal(rec),
      agreement: metric.agreementPct ?? 0,
      agreementPct: metric.agreementPct,
      buy,
      sell,
      neutral: watch,
      count: metric.count,
      requiredCount: metric.requiredCount,
      completeCoverage: metric.completeCoverage,
      limited: metric.limited,
      label: metric.label,
    };
  }
  function marketBias(rec) {
    const feedState = recommendationFeedState(rec);
    const valid = rec.filter(hasValidDirectionalSignal);
    const buy = valid.filter(x => isBuySignalName(signal(x))).length;
    const sell = valid.filter(x => isSellSignalName(signal(x))).length;
    const total = valid.length;
    if (!rec.length) {
      if (feedState.key === "loading") return { label: feedState.title, en: "AWAITING", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "", note: feedState.body };
      if (feedState.key === "empty") return { label: feedState.title, en: "EMPTY", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "neutral", note: feedState.body };
      return { label: feedState.title, en: "DATA UNAVAILABLE", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "warn", note: feedState.body };
    }
    if (!total) {
      const itemStates = rec.map(item => assetDataState(item, sharedRecommendation(item)));
      const blocked = itemStates.find(item => ["rate_limited", "misconfigured", "error", "unsupported", "unavailable"].includes(item.key));
      if (blocked) return { label: blocked.title, en: "DATA UNAVAILABLE", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "warn", note: blocked.body };
      const degraded = itemStates.find(item => ["partial", "stale", "delayed", "cached"].includes(item.key));
      if (degraded) return { label: degraded.title, en: "INSUFFICIENT DATA", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "warn", note: degraded.body };
      const insufficient = marketDataStateCopy("insufficient");
      return { label: insufficient.title, en: "INSUFFICIENT DATA", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "neutral", note: insufficient.body };
    }
    const cf = valid.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = cf.length ? Math.round(cf.reduce((a, b) => a + b, 0) / cf.length) : 0;
    const actionable = buy + sell;
    if (!actionable) return { label: textPair("\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0627\u0631\u0627\u062a \u0643\u0627\u0641\u064a\u0629 \u062d\u0627\u0644\u064a\u0627\u064b", "No sufficient signals right now"), en: "NO SUFFICIENT SIGNALS", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "neutral", note: noMarketDataBody() };
    const bull = Math.round((buy / actionable) * 100);
    const bear = 100 - bull;
    const neutral = Math.round(((total - actionable) / total) * 100);
    return { label: bull >= 55 ? textPair("\u0635\u0627\u0639\u062f", "Bullish") : bull <= 40 ? textPair("\u0647\u0627\u0628\u0637", "Bearish") : textPair("\u0645\u062d\u0627\u064a\u062f", "Neutral"), en: bull >= 55 ? "BULLISH" : bull <= 40 ? "BEARISH" : "NEUTRAL", bull, bear, neutral, conf, tone: bull >= 55 ? "ok" : bull <= 40 ? "warn" : "", note: textPair(`${latinNumber(buy)} \u0634\u0631\u0627\u0621 · ${latinNumber(sell)} \u0628\u064a\u0639 \u0645\u0646 \u0623\u0635\u0644 ${latinNumber(total)}`, `${latinNumber(buy)} buy · ${latinNumber(sell)} sell out of ${latinNumber(total)}`, `${latinNumber(buy)} achats · ${latinNumber(sell)} ventes sur ${latinNumber(total)}`) };
  }
  function marketOverview(rec, view = "all") {
    const b = marketBias(rec);
    const verdict = b.en === "AWAITING" ? "--" : isEnglishLanguage() ? b.en.replace("NEUTRAL — PRECISION GATE", "NEUTRAL") : b.label;
    const analysisUnavailable = ["AWAITING", "EMPTY", "DATA UNAVAILABLE", "INSUFFICIENT DATA", "NO SUFFICIENT SIGNALS"].includes(b.en);
    const analysisBody = analysisUnavailable
      ? `<div class="market-analysis-empty" role="status">
          <span class="market-analysis-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5V12l2.5 2.5"/></svg>
          </span>
          <div class="market-analysis-empty-copy">
            <span class="card-kicker">${h(textPair("حالة التحليل", "Analysis status"))}</span>
            <h3>${h(b.en === "AWAITING" ? textPair("بانتظار بيانات السوق", "Waiting for market data") : b.label)}</h3>
            <p>${h(b.note || textPair("لم تتوفر بعد بيانات مكتملة تكفي لبناء توصية موثوقة.", "Complete data is not yet available for a reliable recommendation."))}</p>
            <button class="action-btn" data-retry type="button">${h(terminalText("retry"))}</button>
          </div>
        </div>`
      : `<div class="ai-analysis-body">
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
        </div>`;
    const sessionsPanel = `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("نظرة السوق", "Market overview"))}</span><h2>${h(textPair("نظرة عامة على الأسواق", "Market overview"))}</h2></div><div class="mo-timeframes" role="group" aria-label="${h(textPair("الإطار الزمني", "Timeframe", "Période"))}">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button type="button" data-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}" aria-pressed="${state.timeframe === t}">${t}</button>`).join("")}</div></div>
      ${marketSessionTimeline(rec)}
    </section>`;
    const analysisPanel = `<section class="panel ai-market-analysis">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("تحليل السوق بالذكاء الاصطناعي", "AI market analysis"))}</span><h2>${h(textPair("تحليل السوق الذكي", "AI market analysis"))}</h2></div></div>
      ${analysisBody}
    </section>`;
    if (view === "sessions") return sessionsPanel;
    if (view === "analysis") return analysisPanel;
    return `${sessionsPanel}${analysisPanel}`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), market = currentMarket();
    const feedState = recommendationFeedState(rec);
    const validSignals = rec
      .filter(hasValidDirectionalSignal)
      .slice()
      .sort((left, right) => (num(right.confidence, right.score, right.aiConfidence) || 0) - (num(left.confidence, left.score, left.aiConfidence) || 0));
    const opportunities = validSignals.filter(x => isBuySignalName(signal(x))).slice(0, 4);
    const riskSignals = validSignals.filter(x => isSellSignalName(signal(x))).slice(0, 3);
    const alerts = smartAlerts().slice(0, 3);
    const aiPicks = validSignals.slice(0, 3);
    const news = newsItems().slice(0, 3);
    const watch = state.watch.slice(0, 5).map(symbol => findAssetForSymbol(symbol, rec) || { symbol });
    const sessionStates = SESSIONS.map(([ar, en, tz, kind, openLocal, closeLocal]) => ({ ar, en, state: sessionState(tz, kind, openLocal, closeLocal) }));
    const sessions = sessionStates.slice(0, 6);
    const openSessions = sessionStates.filter(item => item.state.open).length;
    const primarySymbol = sym((aiPicks[0] && aiPicks[0].symbol) || state.watch[0] || "");
    const opportunityEmpty = !rec.length && feedState.key !== "empty" ? feedState.title : textPair("لا توجد فرص منشورة حالياً", "No published opportunities right now", "Aucune opportunité publiée");
    const picksEmpty = !rec.length && feedState.key !== "empty" ? feedState.title : textPair("بانتظار إشارات مكتملة", "Awaiting complete signals", "En attente de signaux complets");
    return `<section class="terminal-command-center trader-command-deck" aria-labelledby="command-deck-title">
      <header class="command-deck-title"><div><span class="eyebrow">${h(textPair("وعي لحظي", "Live awareness", "Vue en direct"))}</span><h2 id="command-deck-title">${h(textPair("مركز قيادة السوق", "Market Command Center", "Centre de commandement du marché"))}</h2></div><span class="state-badge ${p.tone || ""}">${h(marketName(market))} · <b class="ltr">${h(market.currency)}</b></span></header>
      <div class="command-deck-layout">
        <article class="command-deck-card command-deck-status"><div class="command-deck-head"><span>${h(textPair("حالة السوق", "Market status", "État du marché"))}</span><i class="status-light ${openSessions ? "is-live" : "is-idle"}" aria-hidden="true"></i></div><strong>${h(marketName(market))}</strong><p>${h(textPair(`${latinNumber(openSessions)} جلسات مفتوحة الآن`, `${latinNumber(openSessions)} sessions open now`, `${latinNumber(openSessions)} séances ouvertes`))}</p><div class="command-deck-system"><small>${h(textPair("حالة النظام", "System status", "État du système"))}</small><b>${h(p.label || p.title)}</b></div></article>
        <article class="command-deck-card command-deck-opportunities"><div class="command-deck-head"><span>${h(textPair("أفضل الفرص", "Top opportunities", "Meilleures opportunités"))}</span><b>${h(latinNumber(opportunities.length))}</b></div>${commandDeckAssetList(opportunities, opportunityEmpty)}</article>
        <article class="command-deck-card command-deck-risks"><div class="command-deck-head"><span>${h(textPair("أهم المخاطر", "Top risks", "Risques principaux"))}</span><b>${h(latinNumber(riskSignals.length + alerts.length))}</b></div>${commandDeckRiskList(riskSignals, alerts)}</article>
        <article class="command-deck-card command-deck-ai"><div class="command-deck-head"><span>${h(textPair("اختيارات الذكاء الاصطناعي", "AI picks", "Sélections IA"))}</span><span class="state-badge ${b.tone || "neutral"}">${h(b.conf ? `${b.conf}%` : feedState.label)}</span></div><small>${h(textPair("حالة تحليل الذكاء الاصطناعي", "AI analysis status", "État de l’analyse IA"))}</small>${commandDeckAssetList(aiPicks, picksEmpty)}</article>
        <article class="command-deck-card command-deck-watchlist"><div class="command-deck-head"><span>${h(textPair("قائمة المتابعة", "Watchlist", "Liste de suivi"))}</span><b>${h(latinNumber(state.watch.length))}</b></div>${commandDeckAssetList(watch, textPair("قائمة المتابعة فارغة", "Watchlist is empty", "La liste de suivi est vide"))}<a class="command-deck-link" href="${ROOT}/watchlist" data-route-link>${h(textPair("فتح قائمة المتابعة", "Open watchlist", "Ouvrir la liste"))}</a></article>
        <article class="command-deck-card command-deck-sentiment"><div class="command-deck-head"><span>${h(textPair("معنويات السوق", "Market sentiment", "Sentiment du marché"))}</span><strong class="${b.tone || "neutral"}">${h(b.label)}</strong></div><div class="command-deck-sentiment-bars" role="img" aria-label="${h(b.note || b.label)}"><span class="bull" style="--value:${b.bull}%"><i></i><b class="ltr">${b.bull}%</b></span><span class="bear" style="--value:${b.bear}%"><i></i><b class="ltr">${b.bear}%</b></span><span class="neutral" style="--value:${b.neutral}%"><i></i><b class="ltr">${b.neutral}%</b></span></div><p>${h(b.note || terminalText("unavailable"))}</p></article>
        <article class="command-deck-card command-deck-provider"><div class="command-deck-head"><span>${h(textPair("ملخص المزود", "Provider summary", "Résumé fournisseur"))}</span><span class="state-badge ${feedState.tone || p.tone || ""}">${h(feedState.label)}</span></div><strong>${h(p.title)}</strong><p>${h(feedState.key === "available" || feedState.key === "empty" ? (p.copy || p.explanation || terminalText("unavailable")) : feedState.body)}</p><a class="command-deck-link" href="${ROOT}/settings?view=overview" data-route-link>${h(textPair("فتح حالة المزود", "Open provider status", "Ouvrir l’état fournisseur"))}</a></article>
        <article class="command-deck-card command-deck-sessions"><div class="command-deck-head"><span>${h(textPair("جلسات السوق", "Market sessions", "Séances de marché"))}</span><b class="ltr">UTC</b></div><ul class="command-deck-list">${sessions.map(item => `<li><span>${h(textPair(item.ar, item.en))}</span><b class="${item.state.open ? "is-open" : item.state.upcoming ? "is-upcoming" : "is-closed"}">${h(item.state.open ? textPair("مفتوحة", "Open", "Ouverte") : item.state.upcoming ? textPair("قادمة", "Upcoming", "À venir") : textPair("مغلقة", "Closed", "Fermée"))}</b></li>`).join("")}</ul></article>
        <article class="command-deck-card command-deck-actions"><div class="command-deck-head"><span>${h(textPair("إجراءات سريعة", "Quick actions", "Actions rapides"))}</span></div><div class="command-deck-action-grid"><a class="action-btn" href="${ROOT}/ai-scanner" data-route-link>${h(textPair("حلل", "Analyze", "Analyser"))}</a><a class="ghost-btn" href="${ROOT}/watchlist" data-route-link>${h(textPair("قائمة المتابعة", "Watchlist", "Liste de suivi"))}</a>${primarySymbol ? `<button class="ghost-btn" type="button" data-create-alert="${h(primarySymbol)}">${h(textPair("أنشئ تنبيهاً", "Create alert", "Créer une alerte"))}</button><button class="ghost-btn" type="button" data-drawer-compare="${h(primarySymbol)}">${h(textPair("قارن", "Compare", "Comparer"))}</button><button class="ghost-btn" type="button" data-drawer-share="${h(primarySymbol)}">${h(textPair("مشاركة", "Share", "Partager"))}</button><button class="ghost-btn" type="button" data-drawer-export="${h(primarySymbol)}">${h(textPair("تصدير PDF", "Export PDF", "Exporter en PDF"))}</button>` : ""}</div></article>
        <article class="command-deck-card command-deck-news"><div class="command-deck-head"><span>${h(textPair("آخر الأخبار", "Latest news", "Dernières actualités"))}</span><b>${h(latinNumber(news.length))}</b></div>${news.length ? newsList(news) : `<p class="command-deck-empty">${h(textPair("لا توجد أخبار حديثة من المزود", "No recent provider news", "Aucune actualité récente"))}</p>`}<a class="command-deck-link" href="${ROOT}/news" data-route-link>${h(textPair("كل الأخبار", "All news", "Toutes les actualités"))}</a></article>
      </div>
    </section>`;
  }

  function commandDeckAssetList(items, emptyLabel) {
    if (!items.length) return `<p class="command-deck-empty">${h(emptyLabel)}</p>`;
    return `<div class="command-deck-list">${items.map(item => {
      const a = normalizeQuote(norm(item));
      const recommendation = sharedRecommendation(a);
      const confidence = recommendation.confidence;
      return `<button class="command-deck-symbol" type="button" data-symbol-details="${h(a.symbol)}"><span>${logo(a, "sm")}<b class="ltr">${h(displaySymbolFor(a.symbol))}</b></span><em class="${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}${confidence === null ? "" : ` · ${Math.round(confidence)}%`}</em></button>`;
    }).join("")}</div>`;
  }

  function commandDeckRiskList(riskSignals, alerts) {
    const signalRows = riskSignals.map(item => {
      const a = normalizeQuote(norm(item));
      return `<button class="command-deck-symbol risk" type="button" data-symbol-details="${h(a.symbol)}"><span>${logo(a, "sm")}<b class="ltr">${h(displaySymbolFor(a.symbol))}</b></span><em>${h(recommendationLabel(sharedRecommendation(a)))}</em></button>`;
    }).join("");
    const alertRows = alerts.map(alert => `<div class="command-deck-alert"><span aria-hidden="true">!</span><p><b>${h(alert.title || alert.symbol || textPair("تنبيه سوق", "Market alert", "Alerte marché"))}</b><small>${h(safeStateText(alert.message || alert.description, terminalText("unavailable")))}</small></p></div>`).join("");
    return signalRows || alertRows ? `<div class="command-deck-list">${signalRows}${alertRows}</div>` : `<p class="command-deck-empty">${h(textPair("لا توجد مخاطر منشورة حالياً", "No published risks right now", "Aucun risque publié"))}</p>`;
  }

  function smartAnalysisTerminal(rec, titleId = "analysis-terminal-title") {
    const a = normalizeQuote(norm(rec || {}));
    const recommendation = sharedRecommendation(a);
    const dataState = assetDataState(a, recommendation);
    const evidenceReady = dataState.key === "available";
    const agreement = strategyAgreementMetric(a);
    const c = currency(a);
    const technicalData = a.technical || a.technicalAnalysis || a.indicators || {};
    const support = num(a.support, a.support1, a.s1, a.levels && a.levels.support, technicalData.support, technicalData.s1);
    const resistance = num(a.resistance, a.resistance1, a.r1, a.levels && a.levels.resistance, technicalData.resistance, technicalData.r1);
    const momentum = a.momentum ?? a.momentumSignal ?? technicalData.momentum ?? technicalData.momentumSignal ?? null;
    const breadth = a.marketBreadth ?? a.market_breadth ?? a.breadth ?? null;
    const opportunityScore = num(a.opportunityScore, a.opportunity_score);
    const risk = a.risk || a.riskLevel || null;
    const trend = trendText(a.trend || a.technicalTrend || a.direction || technicalData.trend);
    const rawSignals = arr(a.signals || a.signalList || a.strategies);
    const p = providerCopy();
    const metric = (label, value, tone = "") => `<div class="analysis-metric ${tone}"><span>${h(label)}</span><strong class="${isMarketValueText(value) ? "ltr market-value" : ""}">${h(value || terminalText("unavailable"))}</strong></div>`;
    return `<section class="analysis-terminal" aria-labelledby="${h(titleId)}">
      <div class="analysis-terminal-hero"><div>${a.symbol ? logo(a, "lg") : ""}<span><small>${h(textPair("محطة التحليل الذكي", "Smart analysis terminal", "Terminal d’analyse intelligent"))}</small><h2 id="${h(titleId)}">${h(a.symbol ? displaySymbolFor(a.symbol) : textPair("تحليل السوق", "Market analysis", "Analyse du marché"))}</h2><p>${h(a.name || textPair("تعرض المحطة القيم المتاحة فقط من المزود", "The terminal shows only provider-supplied values", "Le terminal affiche uniquement les valeurs du fournisseur"))}</p></span></div><span class="signal-badge ${evidenceReady ? recommendation.status || "unavailable" : dataState.tone || "unavailable"}">${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</span></div>
      <div class="analysis-terminal-grid">
        ${metric(textPair("ثقة الذكاء الاصطناعي", "AI confidence", "Confiance IA"), !evidenceReady || recommendation.confidence === null ? terminalText("unavailable") : `${Math.round(recommendation.confidence)}%`, evidenceReady ? recommendationTone(recommendation) : dataState.tone)}
        ${metric(textPair("اتفاق الاستراتيجيات", "Strategy agreement", "Accord des stratégies"), evidenceReady ? agreement.value : dataState.label)}
        ${metric(textPair("الإشارات", "Signals", "Signaux"), evidenceReady && rawSignals.length ? textPair(`${latinNumber(rawSignals.length)} إشارات`, `${latinNumber(rawSignals.length)} signals`, `${latinNumber(rawSignals.length)} signaux`) : dataState.label)}
        ${metric(textPair("الاتجاه", "Trend", "Tendance"), evidenceReady ? trend || terminalText("unavailable") : terminalText("unavailable"))}
        ${metric(textPair("المخاطر", "Risk", "Risque"), evidenceReady && risk ? riskShort(risk) : terminalText("unavailable"), evidenceReady && risk ? riskTone(risk) : "")}
        ${metric(textPair("الدعم", "Support", "Support"), evidenceReady && support !== null ? price(support, c) : terminalText("unavailable"))}
        ${metric(textPair("المقاومة", "Resistance", "Résistance"), evidenceReady && resistance !== null ? price(resistance, c) : terminalText("unavailable"))}
        ${metric(textPair("الزخم", "Momentum", "Momentum"), evidenceReady ? analysisDisplayValue(momentum) : terminalText("unavailable"))}
        ${metric(textPair("اتساع السوق", "Market breadth", "Amplitude du marché"), evidenceReady ? analysisDisplayValue(breadth) : terminalText("unavailable"))}
        ${evidenceReady && opportunityScore !== null
          ? evaluationScoreMetric(textPair("درجة الفرصة", "Opportunity score", "Score d’opportunité"), opportunityScore)
          : metric(textPair("درجة الفرصة", "Opportunity score", "Score d’opportunité"), terminalText("unavailable"))}
      </div>
      <div class="analysis-signal-strip">${evidenceReady && rawSignals.length ? rawSignals.slice(0, 6).map(item => `<span>${h(analysisDisplayValue(item && typeof item === "object" ? item.label || item.name || item.signal || item.value : item))}</span>`).join("") : `<span>${h(dataState.body)}</span>`}</div>
      <div class="analysis-provider-state ${dataState.tone || p.tone || ""}"><span>${h(textPair("حالة بيانات التحليل", "Analysis data status", "État des données d’analyse"))}</span><strong>${h(dataState.label)}</strong><small>${h(stockProviderValue(a))}</small></div>
    </section>`;
  }

  function analysisDisplayValue(value) {
    if (value === null || value === undefined || value === "") return terminalText("unavailable");
    if (typeof value === "number") return latinNumber(value);
    if (typeof value === "object") return analysisDisplayValue(value.label ?? value.name ?? value.value ?? value.score ?? null);
    return translateUiText(String(value));
  }

  function evaluationScoreState(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    return score < 50 ? "danger" : "success";
  }

  function evaluationScoreStatus(tone) {
    return tone === "success"
      ? textPair("نتيجة إيجابية", "Positive score", "Score positif")
      : textPair("بحاجة للتحسين", "Needs attention", "À améliorer");
  }

  function evaluationScoreMetric(label, value) {
    const tone = evaluationScoreState(value);
    if (!tone) return "";
    const statusLabel = evaluationScoreStatus(tone);
    const icon = tone === "success" ? "✓" : "!";
    return `<div class="analysis-metric evaluation-score-card ${tone}" data-score-state="${tone}" aria-label="${h(`${label}: ${latinNumber(value)} · ${statusLabel}`)}">
      <span>${h(label)}</span>
      <strong class="ltr market-value"><span aria-hidden="true">${icon}</span> ${h(latinNumber(value))}</strong>
      <small>${h(statusLabel)}</small>
    </div>`;
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
    const text = passed ? textPair(`✓ دقة تاريخية ${rate}%`, `✓ Historical accuracy ${rate}%`, `✓ Précision historique ${rate}%`) : textPair(`دقة تاريخية ${rate}% · حد النشر ${req}%`, `Historical accuracy ${rate}% · publish threshold ${req}%`, `Précision historique ${rate}% · seuil de publication ${req}%`);
    return `<span class="precision-badge ${passed ? "pass" : "info"}" title="${h(textPair("نسبة إصابة الهدف الأول في الاختبار الخلفي على نفس الرمز", "First-target hit rate in the backtest for this symbol"))}">${h(text)}</span>`;
  }
  function stockProviderValue(asset) {
    const provider = asset.provider || asset.dataProvider || asset.source || asset.providerName || asset.providerStatus && (asset.providerStatus.provider || asset.providerStatus.active);
    return providerName(provider) || providerCopy().label || terminalText("unavailable");
  }
  function stockFreshnessValue(asset) {
    const updated = asset.updatedAt || asset.lastUpdated || asset.timestamp || asset.providerStatus && asset.providerStatus.lastUpdated;
    return updated ? latinDateTime(updated) : terminalText("unavailable");
  }
  function stockCardMeta(asset) {
    const risk = asset.risk || asset.riskLevel;
    const trend = trendText(asset.trend || asset.technicalTrend || asset.direction || asset.technical && asset.technical.trend);
    const watched = state.watch.some(symbol => sym(symbol) === sym(asset.symbol));
    const item = (label, value, tone = "", valueLtr = false) => `<span class="stock-meta-item ${tone}"><small>${h(label)}</small><b class="${valueLtr || isMarketValueText(value) ? "ltr market-value" : ""}">${h(value || terminalText("unavailable"))}</b></span>`;
    return `<div class="stock-card-meta">
      ${item(terminalText("volume"), asset.volume == null ? terminalText("unavailable") : bigNumber(asset.volume), "", true)}
      ${item(textPair("المخاطر", "Risk", "Risque"), risk ? riskShort(risk) : terminalText("unavailable"), risk ? riskTone(risk) : "")}
      ${item(textPair("الاتجاه", "Trend", "Tendance"), trend || terminalText("unavailable"))}
      ${item(textPair("المزود", "Provider", "Fournisseur"), stockProviderValue(asset))}
      ${item(textPair("حداثة البيانات", "Freshness", "Fraîcheur"), stockFreshnessValue(asset), "", true)}
      ${item(textPair("المتابعة", "Watch state", "Suivi"), watched ? textPair("قيد المتابعة", "Watching", "Suivi") : textPair("غير مضاف", "Not watched", "Non suivi"), `watch-state ${watched ? "is-watched" : ""}`)}
    </div>`;
  }
  function opportunityHeatmap(rec) {
    const symbols = unique([...dashboardSymbols(), ...rec.map(x => x.symbol)]).slice(0, 60);
    const allAssets = symbols.map((symbol, index) => {
      const asset = normalizeQuote(norm(findAssetForSymbol(symbol, rec) || { symbol, name: terminalText("unavailable") }));
      const sector = heatmapSector(asset);
      return { symbol, asset, rank: index + 1, sectorKey: sector.key, sector: sector.label };
    });
    const sectors = Array.from(new Map(allAssets.map(item => [item.sectorKey, item.sector])).entries()).map(([key, label]) => ({ key, label }));
    const query = state.heatmapView.search.trim().toLocaleLowerCase();
    const visible = allAssets.filter(item => {
      const tone = heatmapTone(item.asset.changePercent);
      const matchesQuery = !query || `${item.symbol} ${item.asset.name || ""}`.toLocaleLowerCase().includes(query);
      const matchesTone = state.heatmapView.tone === "all" || state.heatmapView.tone === tone;
      const matchesSector = state.heatmapView.sector === "all" || state.heatmapView.sector === item.sectorKey;
      return matchesQuery && matchesTone && matchesSector;
    });
    const groups = sectors.map(sector => ({ ...sector, items: visible.filter(item => item.sectorKey === sector.key) })).filter(group => group.items.length);
    const toneButtons = [["all", terminalText("all")], ["positive", textPair("الرابحون", "Gainers", "Hausses")], ["negative", textPair("الخاسرون", "Losers", "Baisses")], ["neutral", textPair("محايد", "Neutral", "Neutre")]];
    return `<section class="panel opportunity-heatmap heatmap-workspace" aria-labelledby="heatmap-title" data-density="${h(state.heatmapView.density)}" data-zoom-level="${h(state.heatmapView.zoom.toFixed(1))}" style="--heatmap-zoom:${state.heatmapView.zoom.toFixed(1)}">
      <div class="panel-head"><div><span class="eyebrow">${h(textPair("خريطة الفرص", "Opportunity heatmap", "Carte thermique des opportunités"))}</span><h2 id="heatmap-title">${h(textPair("خريطة حرارة السوق", "Market performance heatmap", "Carte thermique du marché"))}</h2></div><span class="state-badge">${h(textPair(`${latinNumber(visible.length)} أصل`, `${latinNumber(visible.length)} assets`, `${latinNumber(visible.length)} actifs`))}</span></div>
      <div class="heatmap-toolbar">
        <form class="heatmap-search" data-heatmap-search-form role="search"><label><span class="sr-only">${h(textPair("ابحث في الخريطة", "Search heatmap", "Rechercher dans la carte"))}</span><input name="heatmapSearch" value="${h(state.heatmapView.search)}" placeholder="${h(textPair("ابحث بالرمز أو الاسم", "Search symbol or name", "Rechercher un symbole ou un nom"))}" autocomplete="off" /></label><button class="ghost-btn compact-btn" type="submit">${h(terminalText("search"))}</button></form>
        <div class="heatmap-filters" role="group" aria-label="${h(textPair("فلتر الأداء", "Performance filter", "Filtre de performance"))}">${toneButtons.map(([value, label]) => `<button type="button" data-heatmap-tone="${value}" class="${state.heatmapView.tone === value ? "is-active" : ""}" aria-pressed="${state.heatmapView.tone === value}">${h(label)}</button>`).join("")}</div>
        <label class="heatmap-sector-filter"><span>${h(textPair("القطاع", "Sector", "Secteur"))}</span><select data-heatmap-sector><option value="all">${h(textPair("كل القطاعات", "All sectors", "Tous les secteurs"))}</option>${sectors.map(sector => `<option value="${h(sector.key)}" ${state.heatmapView.sector === sector.key ? "selected" : ""}>${h(sector.label)}</option>`).join("")}</select></label>
        <div class="heatmap-view-controls"><span>${h(textPair("التكبير", "Zoom", "Zoom"))}</span><button type="button" data-heatmap-zoom="out" aria-label="${h(textPair("تصغير", "Zoom out", "Réduire"))}">−</button><button type="button" data-heatmap-zoom="reset" aria-label="${h(textPair("إعادة ضبط التكبير", "Reset zoom", "Réinitialiser le zoom"))}">${h(Math.round(state.heatmapView.zoom * 100))}%</button><button type="button" data-heatmap-zoom="in" aria-label="${h(textPair("تكبير", "Zoom in", "Agrandir"))}">+</button><button type="button" data-heatmap-density="comfortable" class="${state.heatmapView.density === "comfortable" ? "is-active" : ""}" aria-pressed="${state.heatmapView.density === "comfortable"}">${h(textPair("مريح", "Roomy", "Aéré"))}</button><button type="button" data-heatmap-density="compact" class="${state.heatmapView.density === "compact" ? "is-active" : ""}" aria-pressed="${state.heatmapView.density === "compact"}">${h(textPair("كثيف", "Dense", "Dense"))}</button></div>
      </div>
      ${groups.length ? `<div class="heatmap-treemap">${groups.map(group => `<section class="heatmap-sector-group" data-heatmap-group="${h(group.key)}"><header class="heatmap-sector-header"><h3>${h(group.label)}</h3><span>${h(latinNumber(group.items.length))}</span></header><div class="heatmap-sector-tiles">${group.items.map(heatmapCard).join("")}</div></section>`).join("")}</div>` : `<div class="empty-state compact"><span class="empty-glyph">⌁</span><h3>${h(textPair("لا توجد نتائج مطابقة", "No matching heatmap results", "Aucun résultat correspondant"))}</h3><p>${h(textPair("غيّر البحث أو فلتر الأداء أو القطاع.", "Change the search, performance filter, or sector.", "Modifiez la recherche, le filtre de performance ou le secteur."))}</p></div>`}
    </section>`;
  }

  function heatmapSector(asset) {
    const direct = asset.sector || asset.sectorName || asset.industry || asset.industryName;
    if (direct) {
      const key = String(direct).trim();
      return { key, label: translateUiText(key) };
    }
    const market = marketForSymbol(asset.symbol);
    return market
      ? { key: `market:${market.id}`, label: marketName(market) }
      : { key: "other", label: textPair("أخرى", "Other", "Autres") };
  }

  function heatmapTone(changeValue) {
    return changeValue === null ? "unavailable" : changeValue > 0 ? "positive" : changeValue < 0 ? "negative" : "neutral";
  }

  function heatmapSizeClass(asset, rank) {
    const cap = num(asset.marketCap, asset.marketCapitalization);
    const volume = num(asset.volume, asset.averageVolume, asset.avgVolume);
    const providerRank = num(asset.rank, asset.marketCapRank, asset.volumeRank, rank);
    if ((providerRank !== null && providerRank <= 3) || (cap !== null && cap >= 100000000000) || (volume !== null && volume >= 50000000)) return "size-lg";
    if ((providerRank !== null && providerRank <= 10) || (cap !== null && cap >= 10000000000) || (volume !== null && volume >= 10000000)) return "size-md";
    return "size-sm";
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
    const dataState = assetDataState(a, recommendation);
    const evidenceReady = dataState.key === "available";
    const quality = a.dataQuality || (a.chartAvailable === false ? "partial" : "live");
    const stateClass = chg === null ? "neutral" : chg >= 0 ? "positive" : "negative";
    return `<article class="leadership-card trader-stock-card ${stateClass} ${evidenceReady ? "" : "unavailable is-empty"}">
      <button class="asset-head stock-card-primary" data-symbol-details="${h(detailSymbol)}" type="button" aria-label="${h(textPair(`فتح العرض السريع لـ ${display}`, `Open quick view for ${display}`, `Ouvrir l’aperçu de ${display}`))}">${logo({ ...a, symbol: display })}<span class="asset-title"><strong class="ltr">${h(display)}</strong><small>${h(a.name || display)}</small></span><span class="watch-state ${state.watch.some(item => sym(item) === sym(detailSymbol)) ? "is-watched" : ""}" aria-hidden="true">★</span></button>
      <div class="leadership-price stock-card-price"><strong class="ltr">${h(price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span></div>
      <div class="stock-card-chart">${sparkline(a, chg)}</div>
      <div class="leadership-foot"><span class="signal-badge ${evidenceReady ? sig || "unavailable" : dataState.tone || "unavailable"}">${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</span><span class="quality-badge ${dataState.tone || ""}">${h(!evidenceReady || conf === null ? dataState.label : `${textPair("ثقة AI", "AI confidence", "Confiance IA")} ${Math.round(conf)}%`)} · ${h(dataQualityLabel(quality))}</span>${evidenceReady ? precisionBadge(a) : ""}</div>
      ${stockCardMeta({ ...a, symbol: detailSymbol })}
    </article>`;
  }
  function heatmapCard(record) {
    const symbol = record.symbol;
    const a = record.asset;
    const chg = a.changePercent;
    const recommendation = sharedRecommendation(a);
    const tone = heatmapTone(chg);
    const size = heatmapSizeClass(a, record.rank);
    const conf = recommendation.confidence;
    const dataState = assetDataState(a, recommendation);
    const evidenceReady = dataState.key === "available";
    const selected = sym(state.heatmapView.selected) === sym(symbol);
    const tooltipId = `heatmap-tip-${String(symbol).replace(/[^a-z0-9_-]/gi, "-")}`;
    const accessibleName = [displaySymbolFor(symbol), a.name, change(chg)].filter(Boolean).join(" · ");
    const tooltipText = [record.sector, evidenceReady ? recommendationLabel(recommendation) : dataState.label, !evidenceReady || conf === null ? "" : `${terminalText("confidence")} ${Math.round(conf)}%`, a.volume == null ? "" : `${terminalText("volume")} ${bigNumber(a.volume)}`].filter(Boolean).join(" · ");
    return `<button class="opportunity-cell heatmap-tile ${size} tone-${tone} ${tone} ${selected ? "is-selected" : ""}" data-symbol-details="${h(symbol)}" type="button" aria-pressed="${selected}" aria-describedby="${h(tooltipId)}" aria-label="${h(accessibleName)}">
      <span class="heatmap-tile-head">${logo({ ...a, symbol }, "sm")}<span><strong class="ltr">${h(displaySymbolFor(symbol))}</strong><small>${h(a.name || record.sector || "")}</small></span></span>
      <span class="heatmap-tile-performance ltr ${chg === null ? "is-unavailable" : chg >= 0 ? "up" : "down"}">${chg === null ? dashCell(changeUnavailableText()) : h(change(chg))}</span>
      <span class="heatmap-tile-meta"><em>${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</em><b>${!evidenceReady || conf === null ? dashCell(dataState.label) : `${Math.round(conf)}%`}</b></span>
      <span class="heatmap-tooltip" id="${h(tooltipId)}" role="tooltip">${h(tooltipText)}</span>
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
    const chartLabel = `${asset.displaySymbol || asset.symbol || textPair("الأصل", "Asset", "Actif")} · ${textPair("اتجاه السعر المصغر", "Mini price trend", "Mini-tendance du cours")}`;
    if (series.length < 2) return `<div class="leadership-sparkline empty chart-empty" role="img" aria-label="${h(chartLabel)}">${h(textPair("الشارت غير متاح", "Chart unavailable", "Graphique indisponible"))}</div>`;
    const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
    const points = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(34 - (v - min) / rng * 30).toFixed(2)}`).join(" ");
    const tone = chg === null ? (series[series.length - 1] >= series[0] ? "up" : "down") : chg >= 0 ? "up" : "down";
    const markerIndexes = Array.from(new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]));
    const markers = markerIndexes.map(index => {
      const x = (index / (series.length - 1) * 100).toFixed(2);
      const y = (34 - (series[index] - min) / rng * 30).toFixed(2);
      return `<circle class="sparkline-hover-point ${tone}" cx="${x}" cy="${y}" r="1.8"><title>${h(`${latinNumber(series[index])} · ${index + 1}/${series.length}`)}</title></circle>`;
    }).join("");
    return `<figure class="stock-sparkline" aria-busy="false"><svg class="leadership-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label="${h(chartLabel)}"><title>${h(chartLabel)}</title><desc>${h(textPair(`من ${latinNumber(series[0])} إلى ${latinNumber(series[series.length - 1])}`, `From ${latinNumber(series[0])} to ${latinNumber(series[series.length - 1])}`, `De ${latinNumber(series[0])} à ${latinNumber(series[series.length - 1])}`))}</desc><g class="sparkline-grid" aria-hidden="true"><line x1="0" y1="9" x2="100" y2="9"></line><line x1="0" y1="18" x2="100" y2="18"></line><line x1="0" y1="27" x2="100" y2="27"></line></g><polyline class="${tone}" points="${points}"></polyline>${markers}</svg><figcaption class="sparkline-legend"><span>${h(textPair("الأدنى", "Low", "Bas"))} <b class="ltr">${h(latinNumber(min))}</b></span><span>${h(textPair("الأعلى", "High", "Haut"))} <b class="ltr">${h(latinNumber(max))}</b></span></figcaption></figure>`;
  }
  function sessionQuote(symbol, rec) {
    if (!symbol) return null;
    const asset = findAssetForSymbol(symbol, rec || []);
    if (!asset) return null;
    const a = normalizeQuote(norm(asset));
    if (!isValidPrice(a.price)) return null;
    return { price: a.price, chg: a.changePercent, currency: currency({ ...a, symbol }) };
  }
  function sessionClassName(value) {
    return `session-${String(value || "market").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  }
  function sessionGridLines() {
    return Array.from({ length: 9 }, (_, index) => `<i class="session-gridline" aria-hidden="true" style="left:${(index / 8 * 100).toFixed(2)}%"></i>`).join("");
  }
  function segBars(nowFrac, segs, sessionKey, statusKey, label) {
    const stateClass = `is-${statusKey}`;
    const bars = segs.map(([start, end]) => {
      const range = `${fmtHM(start)}–${fmtHM(end)} UTC`;
      const tooltip = `${label} · ${range}`;
      const edgeClass = start <= 1 ? "tooltip-edge-start" : end >= 23 ? "tooltip-edge-end" : "";
      return `<span class="st-seg session-bar ${sessionKey} ${stateClass} ${edgeClass}" style="left:${(start / 24 * 100).toFixed(2)}%;width:${((end - start) / 24 * 100).toFixed(2)}%" tabindex="0" role="img" aria-label="${h(tooltip)}"><span class="session-tooltip" role="tooltip">${h(tooltip)}</span></span>`;
    }).join("");
    return `${sessionGridLines()}${bars}<span class="st-now session-now-line" style="left:${(nowFrac / 24 * 100).toFixed(2)}%" aria-hidden="true"></span>`;
  }
  function marketSessionTimeline(rec) {
    const nowFrac = utcNowFraction();
    const exRows = SESSIONS.map(([ar, en, tz, kind, oL, cL, symbol]) => {
      const st = sessionState(tz, kind, oL, cL);
      const segs = st.closeUTC > st.openUTC ? [[st.openUTC, st.closeUTC]] : [[st.openUTC, 24], [0, st.closeUTC]];
      const q = sessionQuote(symbol, rec);
      const chgTone = q === null ? "" : q.chg > 0 ? "up" : q.chg < 0 ? "down" : "flat";
      const statusKey = st.open ? "open" : st.upcoming ? "upcoming" : "closed";
      const statusLabel = statusKey === "open" ? textPair("مفتوحة", "Open", "Ouverte") : statusKey === "upcoming" ? textPair("قادمة", "Upcoming", "À venir") : textPair("مغلقة", "Closed", "Fermée");
      const name = textPair(ar, en);
      const sessionKey = sessionClassName(en);
      const quoteHtml = q === null ? `<div class="st-quote is-empty"><small title="${h(terminalText("unavailable"))}" aria-label="${h(terminalText("unavailable"))}">—</small></div>` : `<div class="st-quote"><b>${h(price(q.price, q.currency))}</b><small class="${chgTone}">${h(change(q.chg))}</small></div>`;
      return `<div class="st-row session-row ${sessionKey} is-${statusKey}" data-session-state="${statusKey}">
        <div class="session-name-cell"><div class="st-name">${h(name)}</div><div class="st-ex st-status ${statusKey}"><span class="session-state-dot" aria-hidden="true"></span>${h(statusLabel)} · ${h(translateUiText(st.label))}</div></div>
        <div class="st-track session-track" aria-label="${h(`${name} · ${statusLabel}`)}">${segBars(nowFrac, segs, sessionKey, statusKey, name)}</div>
        ${quoteHtml}
      </div>`;
    }).join("");
    const fxRows = FX_SESSIONS.map(([ar, en, segs]) => {
      const active = segs.some(([s, e]) => nowFrac >= s && nowFrac < e);
      const upcoming = !active && segs.some(([start]) => start > nowFrac);
      const statusKey = active ? "open" : upcoming ? "upcoming" : "closed";
      const statusLabel = active ? textPair("نشطة الآن", "Active now", "Active") : upcoming ? textPair("قادمة", "Upcoming", "À venir") : textPair("مغلقة", "Closed", "Fermée");
      const name = textPair(ar, en);
      const sessionKey = sessionClassName(`fx-${en}`);
      return `<div class="st-row session-row ${sessionKey} is-${statusKey}" data-session-state="${statusKey}">
        <div class="session-name-cell"><div class="st-name">${h(name)}</div><div class="st-ex st-status ${statusKey}"><span class="session-state-dot" aria-hidden="true"></span>${h(statusLabel)}</div></div>
        <div class="st-track session-track" aria-label="${h(`${name} · ${statusLabel}`)}">${segBars(nowFrac, segs, sessionKey, statusKey, name)}</div>
        <div class="st-quote is-empty"><small>FX</small></div>
      </div>`;
    }).join("");
    const cq = sessionQuote("BTCUSD", rec);
    const cqTone = cq === null ? "" : cq.chg > 0 ? "up" : cq.chg < 0 ? "down" : "flat";
    const cqHtml = cq === null ? `<div class="st-quote is-empty"><small title="${h(terminalText("unavailable"))}" aria-label="${h(terminalText("unavailable"))}">—</small></div>` : `<div class="st-quote"><b>${h(price(cq.price, cq.currency))}</b><small class="${cqTone}">${h(change(cq.chg))}</small></div>`;
    const cryptoLabel = textPair("العملات الرقمية", "Crypto", "Crypto");
    const cryptoRow = `<div class="st-row session-row session-crypto is-open" data-session-state="open">
      <div class="session-name-cell"><div class="st-name">BTC/USD</div><div class="st-ex st-status open"><span class="session-state-dot" aria-hidden="true"></span>${h(textPair("مفتوحة دائماً", "Always open", "Toujours ouverte"))}</div></div>
      <div class="st-track session-track" aria-label="${h(textPair("جلسة العملات الرقمية مفتوحة دائماً", "Crypto session is always open", "La séance crypto est toujours ouverte"))}">${segBars(nowFrac, [[0, 24]], "session-crypto", "open", cryptoLabel)}</div>
      ${cqHtml}
    </div>`;
    const axisTicks = Array.from({ length: 9 }, (_, index) => index * 3).map(hour => `<span class="session-axis-tick" style="left:${(hour / 24 * 100).toFixed(2)}%"><b class="ltr">${String(hour).padStart(2, "0")}:00</b></span>`).join("");
    const nowLabel = `${textPair("الآن", "Now", "Maintenant")} ${fmtHM(nowFrac)} UTC`;
    const nowPercent = nowFrac / 24 * 100;
    const nowLabelLeft = Math.max(5, Math.min(95, nowPercent));
    const nowLabelEdge = nowPercent < 25 ? "is-edge-start" : nowPercent > 75 ? "is-edge-end" : "";
    return `<div class="session-timeline market-session-terminal" aria-label="${h(textPair("الخط الزمني لجلسات السوق", "Market session timeline", "Chronologie des séances de marché"))}">
      <div class="st-legend">
        <span>${h(textPair("جلسات التداول · توقيت غرينتش UTC", "Trading sessions · UTC"))}</span>
        <span class="st-legend-items">
          <span><i class="st-dot open"></i>${h(textPair("مفتوح", "Open"))}</span>
          <span><i class="st-dot closed"></i>${h(textPair("مغلق", "Closed"))}</span>
          <span><i class="st-dot upcoming"></i>${h(textPair("قادم", "Upcoming", "À venir"))}</span>
          <span><i class="st-now-swatch"></i>${h(textPair("الآن", "Now"))}</span>
        </span>
      </div>
      <div class="st-axis session-axis-grid"><div></div><div class="st-axis-track">${axisTicks}<span class="session-now-label ${nowLabelEdge}" style="left:${nowLabelLeft.toFixed(2)}%">${h(nowLabel)}</span></div><div></div></div>
      <div class="session-groups">
        <section class="session-group session-group-exchanges"><h3 class="st-group-label session-group-label">${h(textPair("البورصات العالمية والخليجية", "Global and Gulf exchanges", "Bourses mondiales et du Golfe"))}</h3>${exRows}</section>
        <section class="session-group session-group-forex"><h3 class="st-group-label session-group-label">${h(textPair("جلسات الفوركس", "Forex sessions", "Séances Forex"))}</h3>${fxRows}</section>
        <section class="session-group session-group-crypto"><h3 class="st-group-label session-group-label">${h(textPair("العملات الرقمية", "Crypto", "Crypto"))}</h3>${cryptoRow}</section>
      </div>
      <div class="st-note">${h(textPair("الأسعار قد تكون متأخرة بضع دقائق حسب المزود.", "Prices may be delayed a few minutes depending on the provider."))}</div>
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
      const ds = assetDataState(a, recommendation);
      // عندما تكون الأدلة غير مكتملة لا نعرض نسب ثقة تبدو مؤكدة —
      // تُستبدل بشرطة مع تلميح يوضح السبب (العرض فقط، دون تغيير الحسابات).
      const evidenceGated = ds.key !== "available";
      const gateNote = evidenceGated ? ds.label : "";
      const recommendationHtml = evidenceGated
        ? `<span class="state-badge ${ds.tone}">${h(ds.label)}</span>`
        : `<span class="state-badge ${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}</span>`;
      const confHtml = conf === null || evidenceGated ? dashCell(gateNote) : Math.round(conf) + "%";
      const scoreHtml = score === null || evidenceGated ? dashCell(gateNote) : (score > 10 ? Math.round(score) + "%" : score.toFixed(1));
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.symbol)}" title="${h(textPair("إزالة", "Remove"))}">✕</button>` : "";
      return `<tr>
        <td class="wt-asset" data-label="${h(terminalText("asset"))}"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || displaySymbolFor(a.symbol))}</small></span></button></td>
        <td class="ltr" data-label="${h(terminalText("price"))}">${h(price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="${h(textPair("التغير", "Change"))}">${chg === null ? dashCell(changeUnavailableText()) : h(change(chg))}</td>
        <td data-label="${h(textPair("التوصية", "Recommendation"))}">${recommendationHtml}</td>
        <td class="ltr" data-label="${h(terminalText("confidence"))}">${confHtml}</td>
        <td class="ltr" data-label="${h(terminalText("target"))}">${isValidPrice(tgt) ? price(tgt, c) : dashCell()}</td>
        <td data-label="${h(textPair("المدة", "Horizon"))}">${h(a.timeframe || a.horizon || a.duration) || dashCell()}</td>
        <td data-label="${h(textPair("المخاطرة", "Risk"))}">${risk ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : dashCell()}</td>
        <td class="ltr" data-label="${h(textPair("سكور AI", "AI score"))}">${scoreHtml}</td>
        <td class="row-actions" data-label="${h(terminalText("action"))}"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("analysis"))}</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>${h(terminalText("asset"))}</th><th>${h(terminalText("price"))}</th><th>${h(textPair("التغير", "Change"))}</th><th>${h(textPair("التوصية", "Recommendation"))}</th><th>${h(terminalText("confidence"))}</th><th>${h(terminalText("target"))}</th><th>${h(textPair("المدة", "Horizon"))}</th><th>${h(textPair("المخاطرة", "Risk"))}</th><th>${h(textPair("سكور AI", "AI score"))}</th><th>${h(terminalText("action"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function recCards(items) { return `<div class="rec-grid">${items.map(recCard).join("")}</div>`; }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(normalizeQuote(norm(x)))).join("")}</div>`; }
  function recCard(x) {
    const a = normalizeQuote(norm(x)), c = currency(a), recommendation = sharedRecommendation(a), sig = recommendation.status, conf = recommendation.confidence;
    const p = a.price, tgt = num(a.target, a.targetPrice), sl = num(a.stopLoss, a.stop);
    const chg = a.changePercent;
    const dataState = assetDataState(a, recommendation);
    const evidenceReady = dataState.key === "available";
    const watched = state.watch.some(symbol => sym(symbol) === sym(a.symbol));
    return `<article class="rec-card trader-stock-card ${evidenceReady ? sig : dataState.key} ${evidenceReady ? "" : "is-empty"}">
      <div class="stock-card-top"><button class="asset-head stock-card-primary" data-symbol-details="${h(a.symbol)}" type="button">${logo(a)}<span class="asset-title"><strong class="ltr">${h(displaySymbolFor(a.symbol))}</strong><small>${h(a.name || terminalText("unavailable"))}</small></span></button><span class="state-badge ${dataState.tone || recommendationTone(recommendation)}">${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</span></div>
      <div class="stock-card-price"><strong class="ltr">${h(price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span></div>
      <div class="stock-card-chart">${sparkline(a, chg)}</div>
      <div class="rec-metrics"><span>${h(terminalText("target"))}<b class="ltr">${h(evidenceReady && isValidPrice(tgt) ? price(tgt, c) : terminalText("unavailable"))}</b></span><span>${h(terminalText("stop"))}<b class="ltr">${h(evidenceReady && isValidPrice(sl) ? price(sl, c) : terminalText("unavailable"))}</b></span><span>${h(textPair("ثقة AI", "AI confidence", "Confiance IA"))}<b>${!evidenceReady || conf === null ? h(terminalText("unavailable")) : `${Math.round(conf)}%`}</b></span></div>
      ${stockCardMeta(a)}
      <div class="rec-foot stock-card-actions"><span class="status-tag ${dataState.tone || recommendationTone(recommendation) || recStatusTone(a)}">${h(dataState.label)}</span><div class="row-actions compact-actions">${followTradeButton(recommendation, a.symbol, "action-btn", true, a)}<button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}" type="button">${h(terminalText("openAnalysis"))}</button><button class="ghost-btn sm ${watched ? "is-active" : ""}" ${watched ? `data-remove-watch="${h(a.symbol)}"` : `data-quick-add="${h(a.symbol)}"`} type="button">${h(watched ? textPair("إزالة من المتابعة", "Remove watch", "Retirer du suivi") : textPair("أضف للمتابعة", "Add to watchlist", "Ajouter au suivi"))}</button></div></div>
    </article>`;
  }
  function assetCard(asset, opts = {}) {
    const a = normalizeQuote(norm(asset)), c = currency(a), recommendation = sharedRecommendation(a), conf = recommendation.confidence, p = a.price;
    const chg = a.changePercent;
    const dataState = assetDataState(a, recommendation);
    const evidenceReady = dataState.key === "available";
    const watched = state.watch.some(symbol => sym(symbol) === sym(a.symbol));
    const removable = watched || opts.removable === true;
    return `<article class="asset-card trader-stock-card ${evidenceReady ? "" : "is-empty"}">
      <div class="stock-card-top"><button class="asset-head stock-card-primary" data-symbol-details="${h(a.symbol)}" type="button">${logo(a)}<span class="asset-title"><strong class="symbol-code">${h(displaySymbolFor(a.symbol || "--"))}</strong><small>${h(a.name || a.companyName || textPair("اسم الأصل غير متوفر", "Asset name unavailable", "Nom de l’actif indisponible"))}</small></span></button><span class="watch-state ${watched ? "is-watched" : ""}" aria-label="${h(textPair("حالة المتابعة", "Watch state", "État du suivi"))}">★</span></div>
      <div class="stock-card-price"><strong class="ltr">${h(price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span></div>
      <div class="stock-card-chart">${sparkline(a, chg)}</div>
      <div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${evidenceReady ? recommendationTone(recommendation) : dataState.tone}">${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</span><span class="status-tag ${dataState.tone}">${h(dataState.label)}</span><span class="quality-badge">${h(textPair("ثقة AI", "AI confidence", "Confiance IA"))} ${!evidenceReady || conf === null ? h(terminalText("unavailable")) : `${Math.round(conf)}%`}</span></div>
      ${stockCardMeta(a)}
      <div class="card-actions stock-card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">${h(terminalText("openAnalysis"))}</button>${followTradeButton(recommendation, a.symbol, "ghost-btn", false, a)}<button class="ghost-btn ${removable ? "is-active" : ""}" ${removable ? `data-remove-watch="${h(a.symbol)}"` : `data-quick-add="${h(a.symbol)}"`}>${h(removable ? textPair("إزالة من المتابعة", "Remove watch", "Retirer du suivi") : textPair("أضف للمتابعة", "Add to watchlist", "Ajouter au suivi"))}</button></div>
    </article>`;
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
    return `<div class="heatmap">${items.slice(0, 24).map(x => { const a = normalizeQuote(norm(x)), recommendation = sharedRecommendation(a), dataState = assetDataState(a, recommendation), chg = a.changePercent; const evidenceReady = dataState.key === "available"; return `<button class="heat-cell ${chg === null ? "unavailable" : evidenceReady ? recommendation.status : dataState.key}" data-symbol-details="${h(a.symbol)}">${logo(a, "sm")}<strong class="ltr">${h(a.symbol)}</strong><small class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${chg === null ? dashCell(changeUnavailableText()) : h(change(chg))}</small><em>${h(evidenceReady ? recommendationLabel(recommendation) : dataState.label)}</em></button>`; }).join("")}</div>`;
  }
  function holdingsTable(items) {
    const rows = items.map((p, i) => { const a = norm(p.rec || { symbol: p.symbol }), c = currency({ symbol: p.symbol }), cur = num(a.price, a.currentPrice), qty = num(p.qty) || 0, entry = num(p.entry) || 0, val = cur !== null ? cur * qty : null, pl = cur !== null ? (cur - entry) * qty : null;
      return `<tr><td class="wt-asset" data-label="${h(terminalText("asset"))}"><button data-symbol-details="${h(p.symbol)}">${logo({ symbol: p.symbol })}<span><strong class="ltr">${h(p.symbol)}</strong></span></button></td><td class="ltr" data-label="${h(textPair("الكمية", "Quantity"))}">${qty}</td><td class="ltr" data-label="${h(textPair("الدخول", "Entry"))}">${price(entry, c)}</td><td class="ltr" data-label="${h(textPair("الحالي", "Current"))}">${cur === null ? "--" : price(cur, c)}</td><td class="ltr" data-label="${h(textPair("القيمة", "Value"))}">${val === null ? "--" : price(val, c)}</td><td class="ltr ${pl === null ? "" : pl >= 0 ? "up" : "down"}" data-label="${h(textPair("ر/خ", "P/L"))}">${pl === null ? "--" : price(pl, c)}</td><td><button class="icon-btn danger" data-remove-holding="${i}" title="${h(textPair("إزالة", "Remove"))}">✕</button></td></tr>`; }).join("");
    return `<div class="table-shell"><table><thead><tr><th>${h(terminalText("asset"))}</th><th>${h(textPair("الكمية", "Quantity"))}</th><th>${h(textPair("الدخول", "Entry"))}</th><th>${h(textPair("الحالي", "Current"))}</th><th>${h(textPair("القيمة", "Value"))}</th><th>${h(textPair("ر/خ", "P/L"))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function holdingForm() { return `<form id="holding-form" class="trade-form-grid"><label>${h(textPair("الرمز", "Symbol", "Symbole"))}<input name="symbol" dir="ltr" placeholder="AAPL" maxlength="24" pattern="[A-Za-z0-9._^=/-]{1,24}" autocomplete="off" required /></label><label>${h(textPair("الكمية", "Quantity", "Quantité"))}<input name="qty" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" required /></label><label>${h(textPair("سعر الدخول", "Entry price", "Prix d’entrée"))}<input name="entry" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" required /></label><button class="action-btn" type="submit">${h(textPair("إضافة مركز", "Add position", "Ajouter une position"))}</button><p id="holding-form-error" class="form-field-error wide" role="alert" aria-live="assertive" hidden></p></form>`; }
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
        <label>${h(textPair("سعر الدخول", "Entry price"))}<input name="entryPrice" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" required /></label>
        <label>${h(terminalText("target"))}<input name="targetPrice" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" /></label>
        <label>${h(textPair("وقف الخسارة", "Stop loss"))}<input name="stopLoss" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" /></label>
        <label>${h(terminalText("confidence"))}<input name="confidence" type="number" inputmode="numeric" min="0" max="100" step="1" placeholder="${h(textPair("اختياري", "Optional"))}" /></label>
        <label class="wide">${h(textPair("ملاحظات", "Notes"))}<input name="notes" placeholder="${h(textPair("اختياري", "Optional"))}" /></label>
        <button class="action-btn" type="submit">${h(textPair("إضافة صفقة متابعة", "Add followed trade"))}</button>
        <p id="followed-trade-form-error" class="form-field-error wide" role="alert" aria-live="assertive" hidden></p>
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
    return `<article class="trade-item"><div class="asset-head">${logo({ symbol: s })}<div class="asset-title"><strong class="ltr">${h(s)}</strong><small>${h(translateUiText(a.name || t.status || textPair("متابعة", "Followed", "Suivie")))}</small></div></div>
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
  function newsEvidence(n) {
    const verification = String(n.verificationStatus || "unverified").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const independentCountValue = Number(n.independentSourceCount);
    const independentCount = Number.isFinite(independentCountValue) && independentCountValue > 0 ? Math.round(independentCountValue) : 0;
    const official = n.isOfficial === true || verification === "official";
    const conflicting = verification === "conflicting";
    let label = textPair("غير مؤكد", "Unverified", "Non vérifié"), tone = "";
    if (conflicting) {
      label = textPair("معلومات متضاربة", "Conflicting reports", "Informations contradictoires");
      tone = "warn";
    } else if (official) {
      label = textPair("إفصاح رسمي", "Official disclosure", "Publication officielle");
      tone = "ok";
    } else if (verification === "confirmed" && independentCount >= 2) {
      label = textPair(`مؤكد من ${independentCount} مصادر مستقلة`, `Confirmed by ${independentCount} independent sources`, `Confirmé par ${independentCount} sources indépendantes`);
      tone = "ok";
    } else if (verification === "confirmed") {
      label = textPair("خبر مؤكد", "Confirmed", "Confirmé");
      tone = "ok";
    } else if (verification === "single_source" || independentCount === 1) {
      label = textPair("مصدر واحد · غير مؤكد مستقلاً", "Single source · not independently confirmed", "Source unique · non confirmé indépendamment");
    }
    const countLabel = independentCount >= 2
      ? textPair(`${independentCount} مصادر مستقلة`, `${independentCount} independent sources`, `${independentCount} sources indépendantes`)
      : "";
    return { label, tone, countLabel };
  }
  function newsCard(n) {
    const title = n.title || n.headline || n.name || textPair("خبر بدون عنوان", "Untitled news", "Actualité sans titre"), src = n.sourceName || n.source || n.publisher || textPair("المصدر غير متاح", "Source unavailable", "Source indisponible"), when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = safeExternalUrl(n.originalUrl || n.canonicalUrl || n.url || n.link || ""), text = n.summary || n.description || n.text || "", impact = (n.expectedImpact || n.impact || "").toString().toLowerCase();
    const syms = arr(n.symbols || n.relatedSymbols).slice(0, 3);
    const evidence = newsEvidence(n);
    const hasDetails = Boolean(text || syms.length || url);
    return `<article class="news-card"><div class="news-meta"><span>${h(src)} · ${h(when)}</span><span class="impact ${evidence.tone}">${h(evidence.label)}</span></div>${evidence.countLabel && !evidence.label.includes(evidence.countLabel) ? `<div class="news-meta"><span>${h(evidence.countLabel)}</span>${impact ? `<span>${h(translateUiText(impact))}</span>` : ""}</div>` : impact ? `<div class="news-meta"><span>${h(translateUiText(impact))}</span></div>` : ""}<strong>${h(title)}</strong>${hasDetails ? `<details class="news-card-details"><summary>${h(textPair("الملخص والأدلة", "Summary and evidence", "Résumé et preuves"))}</summary>${text ? `<p>${h(text)}</p>` : ""}${syms.length ? `<div class="news-syms">${syms.map(s => `<button class="badge sm" data-symbol-details="${h(s)}"><span class="ltr">${h(sym(s))}</span></button>`).join("")}</div>` : ""}${url ? `<a class="ghost-btn sm" href="${h(url)}" target="_blank" rel="noopener noreferrer nofollow">${h(terminalText("source"))}</a>` : ""}</details>` : ""}</article>`;
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
  function localAlertRow(a, i) { const T = { price: terminalText("price"), percent: textPair("نسبة %", "Percent %"), signal: textPair("إشارة AI", "AI signal"), news: terminalText("news") }; const hasValue = a.value !== "" && a.value !== null && a.value !== undefined; return `<article class="trade-item alert-row"><div><strong class="ltr">${h(a.symbol)}</strong><p>${h(T[a.type] || translateUiText(a.type))}${hasValue ? " · " + h(a.value) : ""} · ${h(date(a.createdAt))}</p></div><button class="icon-btn danger" data-del-alert="${i}" title="${h(textPair("حذف", "Delete"))}">✕</button></article>`; }

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
    if (isRateLimitText(value)) return textPair("تم الوصول إلى حد استخدام مزود البيانات مؤقتاً", "Data provider rate limit reached temporarily", "La limite du fournisseur de données est temporairement atteinte");
    const lower = value.toLowerCase();
    if (/^provider_status_/i.test(lower)) return getProviderStatusMessage(lower);
    if (lower.includes("fmp_not_configured") || (isLtrLanguage() && lower.includes("fmp") && hasArabicText(value))) return textPair("FMP غير مهيأ", "FMP is not configured", "FMP n’est pas configuré");
    if (lower.includes("provider_not_configured") || lower.includes("missing_provider")) return textPair("مزود البيانات غير مهيأ", "Data provider is not configured", "Le fournisseur de données n’est pas configuré");
    if (/^[a-z0-9_-]+_not_configured$/i.test(value)) return textPair("مزود البيانات غير مهيأ", "Data provider is not configured", "Le fournisseur de données n’est pas configuré");
    if (lower.includes("provider_temporarily_unavailable")) return textPair("مزود البيانات غير متاح مؤقتاً", "Data provider is temporarily unavailable", "Le fournisseur de données est temporairement indisponible");
    if (lower.includes("provider_access_denied") || lower.includes("unauthorized") || lower.includes("forbidden")) return textPair("صلاحية المزود لا تسمح بعرض هذه البيانات", "Provider permissions do not allow this data", "Les autorisations du fournisseur ne permettent pas d’afficher ces données");
    if (/^[a-z0-9_-]+_[a-z0-9_-]+$/i.test(value)) return textPair("تعذر تحديث أحد مسارات المزود", "A provider route could not be refreshed", "Impossible d’actualiser l’un des itinéraires du fournisseur");
    if (isLtrLanguage() && hasArabicText(value)) return textPair("مزود البيانات غير مهيأ", "Data provider is not configured", "Le fournisseur de données n’est pas configuré");
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
  function countText(value) { return textPair(`${latinNumber(numberValue(value))} رمز`, `${latinNumber(numberValue(value))} symbols`, `${latinNumber(numberValue(value))} symboles`); }
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
    const normalized = normalizeLanguage(lang);
    if (normalized === "ar") return featureLabel(value);
    const labels = {
      prices: { en: "Prices", fr: "Cours" }, quotes: { en: "Quotes", fr: "Cotations" }, symbols: { en: "Symbols", fr: "Symboles" },
      earnings: { en: "Earnings", fr: "Résultats" }, dividends: { en: "Dividends", fr: "Dividendes" }, ipos: { en: "IPOs", fr: "Introductions en bourse" },
      economic: { en: "Economic calendar", fr: "Calendrier économique" }, economicCalendar: { en: "Economic calendar", fr: "Calendrier économique" },
      news: { en: "News", fr: "Actualités" }, technicalAnalysis: { en: "Technical analysis", fr: "Analyse technique" }
    };
    return labels[value]?.[normalized] || value;
  }
  function providerRouteLabel(value) {
    const key = String(value || "").trim();
    const labels = {
      "stock-list": textPair("قائمة الأسهم", "stock list", "liste des actions"),
      "etf-list": textPair("قائمة الصناديق المتداولة", "ETF list", "liste des ETF"),
      "indexes-list": textPair("قائمة المؤشرات", "indexes list", "liste des indices"),
      "batch-forex-quotes": textPair("أسعار العملات", "forex quotes", "cotations des devises"),
      "batch-crypto-quotes": textPair("أسعار الأصول الرقمية", "crypto quotes", "cotations des cryptoactifs"),
      "batch-commodity-quotes": textPair("أسعار السلع", "commodity quotes", "cotations des matières premières"),
      "batch-index-quotes": textPair("أسعار المؤشرات", "index quotes", "cotations des indices"),
      "batch-quote": textPair("أسعار الأسهم", "stock quotes", "cotations des actions")
    };
    return labels[key] || key.replace(/^fmp_/, "").replace(/_http_429$/i, "").replace(/_/g, " ") || "provider route";
  }
  function isRateLimitText(value) { return /429|rate_limited|rate limit|too many|provider_rate_limited|http_429/i.test(String(value || "")); }
  function isLatinMetric(value) { return /^[\d\s.,:%A-Za-z/_-]+$/.test(String(value || "")); }
  function featureTitle(key) {
    return key === "earnings" ? textPair("الأرباح", "Earnings", "Résultats")
      : key === "dividends" ? textPair("التوزيعات", "Dividends", "Dividendes")
        : key === "ipos" ? textPair("الاكتتابات", "IPOs", "Introductions en bourse")
          : key === "economic" ? textPair("الاقتصادي", "Economic", "Économie")
            : translateUiText(key);
  }
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
      <p class="provider-market-note">${h(formatProviderError(state.markets.message, { empty: textPair("صفوف أسواق المزود المفصلة متاحة ضمن الإعدادات / تشخيصات الإدارة.", "Detailed provider market rows are available under Settings / Admin diagnostics.") }))}</p>
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
    if (series.length < 2) return `<div class="chart-empty" role="status" aria-live="polite" aria-busy="false"><span aria-hidden="true">⌁</span><p>${h(textPair("لا توجد بيانات رسم بياني كافية من المزود بعد. حدّث الرمز أو اربط مزود بيانات تاريخية لعرض حركة السعر.", "The provider has not supplied enough chart data yet. Refresh the symbol or connect a historical data provider to display price movement.", "Le fournisseur n’a pas encore transmis suffisamment de données graphiques. Actualisez le symbole ou connectez un fournisseur de données historiques pour afficher l’évolution du cours."))}</p></div>`;
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
    const stroke = up ? "var(--success)" : "var(--danger)";
    const chartSymbol = a.displaySymbol || a.symbol || a.ticker || textPair("\u0627\u0644\u0623\u0635\u0644", "asset", "actif");
    const gid = `cg-${String(chartSymbol).replace(/[^a-z0-9_-]/gi, "-")}-${++chartInstanceCounter}`;
    const rawPeriod = a.period || a.timeframe || a.range;
    const chartPeriod = typeof rawPeriod === "string"
      ? rawPeriod
      : rawPeriod && rawPeriod.from && rawPeriod.to
        ? `${rawPeriod.from} - ${rawPeriod.to}`
        : textPair("\u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0645\u062a\u0627\u062d\u0629", "available period", "p\u00e9riode disponible");
    const chartDirection = up
      ? textPair("\u0635\u0627\u0639\u062f", "upward", "haussi\u00e8re")
      : textPair("\u0647\u0627\u0628\u0637", "downward", "baissi\u00e8re");
    const chartLabel = textPair(
      `\u062d\u0631\u0643\u0629 \u0633\u0639\u0631 ${chartSymbol}. \u0627\u0644\u0641\u062a\u0631\u0629: ${chartPeriod}. \u0627\u0644\u0627\u062a\u062c\u0627\u0647 ${chartDirection} \u0645\u0646 ${latinNumber(series[0])} \u0625\u0644\u0649 ${latinNumber(series[n - 1])} \u0639\u0628\u0631 ${latinNumber(n)} \u0646\u0642\u0637\u0629.`,
      `Price movement for ${chartSymbol}. Period: ${chartPeriod}. ${chartDirection} from ${latinNumber(series[0])} to ${latinNumber(series[n - 1])} across ${latinNumber(n)} observations.`,
      `Mouvement du cours de ${chartSymbol}. P\u00e9riode : ${chartPeriod}. Tendance ${chartDirection}, de ${latinNumber(series[0])} \u00e0 ${latinNumber(series[n - 1])}, sur ${latinNumber(n)} observations.`
    );
    // SVG attributes consume the same semantic chart tokens as the surrounding terminal.
    const horizontalGrid = [0.25, 0.5, 0.75].map(f => { const yy = (top + f * (bottom - top)).toFixed(2); return `<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" stroke="var(--chart-grid)" stroke-width="0.4" stroke-dasharray="1.4 2.4"></line>`; }).join("");
    const verticalGrid = [0.2, 0.4, 0.6, 0.8].map(f => `<line x1="${(W * f).toFixed(2)}" y1="${top}" x2="${(W * f).toFixed(2)}" y2="${bottom}" stroke="var(--chart-grid)" stroke-width="0.35" stroke-dasharray="1.4 2.4"></line>`).join("");
    const markerStep = Math.max(1, Math.ceil(n / 7));
    const markerIndexes = Array.from(new Set([0, ...Array.from({ length: n }, (_, index) => index).filter(index => index % markerStep === 0), n - 1]));
    const markers = markerIndexes.map(index => {
      const x = X(index);
      const y = Y(series[index]);
      const markerLabel = `${chartSymbol} · ${latinNumber(series[index])} · ${index + 1}/${n}`;
      const labelX = Math.max(8, Math.min(92, x));
      const labelY = y < 10 ? y + 7 : y - 4;
      return `<circle class="detail-chart-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.25" fill="${stroke}" tabindex="0" role="img" aria-label="${h(markerLabel)}"><title>${h(markerLabel)}</title></circle><text class="detail-chart-value" x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="middle" aria-hidden="true">${h(latinNumber(series[index]))}</text>`;
    }).join("");
    return `<figure class="detail-chart-wrap ${up ? "up" : "down"}" aria-busy="false">
      <figcaption class="detail-chart-legend"><span><i class="chart-legend-line ${up ? "up" : "down"}" aria-hidden="true"></i><b class="ltr">${h(chartSymbol)}</b> · ${h(chartPeriod)}</span><span>${h(textPair("الأدنى", "Low", "Bas"))} <b class="ltr">${h(latinNumber(min))}</b></span><span>${h(textPair("الأعلى", "High", "Haut"))} <b class="ltr">${h(latinNumber(max))}</b></span><span>${h(textPair("الأحدث", "Latest", "Dernier"))} <b class="ltr">${h(latinNumber(series[n - 1]))}</b></span></figcaption>
      <svg class="detail-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${h(chartLabel)}">
        <title>${h(chartLabel)}</title><desc>${h(textPair("مرّر المؤشر أو استخدم لوحة المفاتيح على النقاط لعرض القيم.", "Hover or focus chart points to inspect values.", "Survolez ou ciblez les points pour consulter les valeurs."))}</desc>
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.3"></stop><stop offset="100%" stop-color="${stroke}" stop-opacity="0"></stop></linearGradient></defs>
        <g class="detail-chart-grid" aria-hidden="true">${horizontalGrid}${verticalGrid}</g>
        <path d="${area}" fill="url(#${gid})" stroke="none"></path>
        <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
        <g class="detail-chart-points">${markers}</g>
      </svg>
      <div class="detail-chart-axis" aria-hidden="true"><span>${h(textPair("البداية", "Start", "Début"))}</span><span>${h(textPair("المنتصف", "Midpoint", "Milieu"))}</span><span>${h(textPair("الأحدث", "Latest", "Dernier"))}</span></div>
    </figure>`;
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
    const desc = isFrenchLanguage()
      ? a.descriptionFr || a.description_fr || a.summaryFr || a.summary_fr || a.descriptionEn || a.description_en || a.longBusinessSummary || a.description || a.objective || a.summary || ""
      : isEnglishLanguage()
        ? a.descriptionEn || a.description_en || a.summaryEn || a.summary_en || a.longBusinessSummary || a.description || a.objective || a.summary || ""
        : a.descriptionAr || a.description_ar || a.summaryAr || a.summary_ar || a.description || a.objective || a.summary || a.longBusinessSummary || "";
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
    const reason = isFrenchLanguage()
      ? a.shariahReasonFr || a.shariah_reason_fr || a.shariahReasonEn || a.shariah_reason_en || a.shariahReason || a.shariaReason || a.shariahDescription || ""
      : isEnglishLanguage()
        ? a.shariahReasonEn || a.shariah_reason_en || a.shariahReason || a.shariaReason || a.shariahDescription || a.shariahReasonAr || a.shariah_reason_ar || ""
        : a.shariahReasonAr || a.shariah_reason_ar || a.shariahReason || a.shariaReason || a.shariahDescription || "";
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
    if (s.includes("bull") || s.includes("up") || s.includes("صاعد")) return textPair("صاعد", "Bullish", "Haussier");
    if (s.includes("bear") || s.includes("down") || s.includes("هابط")) return textPair("هابط", "Bearish", "Baissier");
    if (s.includes("side") || s.includes("neutral") || s.includes("flat") || s.includes("جانبي") || s.includes("محايد")) return textPair("جانبي", "Sideways", "Latéral");
    return translateUiText(raw);
  }
  function technicalUnavailableCopy() {
    return TECHNICAL_UNAVAILABLE_COPY[currentLanguage()];
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
    if (name === "بيانات السوق" || name === "Market data") return textPair("بيانات السوق", "Market data", "Données de marché");
    if (name === "إدخال يدوي" || name === "Manual input") return textPair("إدخال يدوي", "Manual input", "Saisie manuelle");
    return translateUiText(name);
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
      actionLabelFr: Recommendation.labelFr("watch"),
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
    const trend = trendText(t.trend || t.direction || ind.trend || (ma50 !== null && ma200 !== null ? (ma50 >= ma200 ? "bullish" : "bearish") : ""));
    const rsiTag = rsi === null ? "" : rsi >= 70 ? ` (${textPair("تشبع شرائي", "Overbought", "Surachat")})` : rsi <= 30 ? ` (${textPair("تشبع بيعي", "Oversold", "Survente")})` : "";
    const macdTag = (macd !== null && macdSig !== null) ? (macd >= macdSig ? ` · ${textPair("إيجابي", "Positive", "Positif")}` : ` · ${textPair("سلبي", "Negative", "Négatif")}`) : "";
    const rows = [
      [textPair("الاتجاه العام", "Overall trend", "Tendance générale"), trend],
      ["RSI (14)", rsi === null ? "" : Math.round(rsi) + rsiTag],
      ["MACD", macd === null ? "" : (Math.round(macd * 1000) / 1000) + macdTag],
      ["EMA 20", ma20 === null ? "" : price(ma20, null)],
      ["EMA 50", ma50 === null ? "" : price(ma50, null)],
      ["EMA 200", ma200 === null ? "" : price(ma200, null)],
      [textPair("دعم 1", "Support 1", "Support 1"), s1 === null ? "" : price(s1, null)],
      [textPair("دعم 2", "Support 2", "Support 2"), s2 === null ? "" : price(s2, null)],
      [textPair("مقاومة 1", "Resistance 1", "Résistance 1"), r1 === null ? "" : price(r1, null)],
      [textPair("مقاومة 2", "Resistance 2", "Résistance 2"), r2 === null ? "" : price(r2, null)],
      [textPair("التذبذب", "Volatility", "Volatilité"), vol === null ? "" : (Math.round(vol * 100) / 100)],
      [textPair("تأكيد الحجم", "Volume confirmation", "Confirmation du volume"), volumeRatio === null ? "" : `${Math.round(volumeRatio * 100) / 100}×`]
    ].filter(([, v]) => hasDisplayValue(v));
    const recommendation = t.recommendation || t.action || t.signal || "";
    if (recommendation && rows.length) rows.push([textPair("التوصية الفنية", "Technical recommendation", "Recommandation technique"), recommendation]);
    return { available: rows.length > 0, rows, raw: t, current };
  }
  function technicalUnavailableState(detail, asset = {}, options = {}) {
    const copy = technicalUnavailableCopy();
    const diagnostics = technicalUnavailableDiagnostics(detail, asset);
    const reason = detail?.technicalReason || technicalUnavailableReason(detail?.tech || {});
    const missingFields = diagnostics.missingFields.map(formatTechnicalMissingField).join(isLtrLanguage() ? ", " : "، ");
    const fallback = diagnostics.fallbackAttempted ? textPair("تمت المحاولة", "Attempted", "Tentée") : textPair("لم تتم", "Not attempted", "Non tentée");
    const direction = isLtrLanguage() ? "ltr" : "rtl";
    const compactClass = options.compact ? " is-compact" : "";
    const details = options.compact ? "" : `<dl class="technical-unavailable-details">
        <div><dt>${h(copy.reasonLabel)}</dt><dd>${h(translateUiText(reason))}</dd></div>
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
    const summaryText = isFrenchLanguage()
      ? summary.summaryFr || summary.summary_fr || summary.summaryEn || summary.summary_en || summary.summaryAr || summary.summary_ar || ""
      : isEnglishLanguage()
        ? summary.summaryEn || summary.summary_en || summary.summaryAr || summary.summary_ar || ""
        : summary.summaryAr || summary.summary_ar || summary.summaryEn || summary.summary_en || "";
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
    return `<div class="detail-grid">${detailCard(textPair("الدخول", "Entry", "Entrée"), price(entry, c), textPair("الدخول", "Entry", "Entrée"))}${detailCard(textPair("الهدف 1 · احتمال مرتفع", "Target 1 · higher probability", "Objectif 1 · probabilité supérieure"), price(tgt1, c), "TP1")}${tgt2 !== null ? detailCard(textPair("الهدف 2 · تمديد", "Target 2 · extension", "Objectif 2 · extension"), price(tgt2, c), "TP2") : ""}${detailCard(textPair("وقف الخسارة", "Stop loss", "Stop de protection"), price(sl, c), textPair("وقف الخسارة", "Stop", "Stop"))}${detailCard(textPair("العائد/المخاطرة", "Risk/reward", "Risque/rendement"), rr2 !== null ? `${rr2}:1 · TP2` : `${rr1}:1 · TP1`, "R/R")}</div>
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
        ${detailCard(textPair("الإشارة", "Signal", "Signal"), sigLabel(sig), textPair("الإجراء", "Action", "Action"))}
        ${detailCard(terminalText("confidence"), conf, terminalText("confidence"))}
        ${precisionRate !== null ? detailCard(textPair("الدقة التاريخية", "Historical accuracy", "Précision historique"), `${precisionRate}%${pm && pm.passed ? " ✓" : ""}`, textPair("اختبار خلفي", "Backtest", "Test rétrospectif")) : ""}
        ${bt && num(bt.samples) !== null ? detailCard(textPair("عينات الاختبار", "Test samples", "Échantillons du test"), latinNumber(bt.samples), textPair("العينات", "Samples", "Échantillons")) : ""}
        ${detailCard(textPair("المخاطرة", "Risk", "Risque"), riskShort(rec.risk || rec.riskLevel), textPair("المخاطرة", "Risk", "Risque"))}
        ${detailCard(textPair("المدة", "Horizon", "Horizon"), rec.timeframe || rec.horizon || rec.duration || "--", textPair("المدة", "Horizon", "Horizon"))}
        ${detailCard(textPair("مزود البيانات", "Data provider", "Fournisseur de données"), provider, textPair("المزود", "Provider", "Fournisseur"))}
        ${detailCard(terminalText("dataQuality"), dataQualityLabel(quality), terminalText("dataQuality"))}
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
  function isMarketValueText(value) {
    const shown = String(value ?? "").trim();
    if (!shown || shown === terminalText("unavailable")) return false;
    return /[0-9]/.test(shown) || /^[A-Z0-9.^=:/-]{1,16}$/.test(shown);
  }
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
    if (raw === "stale" || raw === "expired") return "stale";
    if (raw === "delayed" || raw === "late") return "delayed";
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
    return `<article class="detail-card${longValueClass}"><span class="card-kicker">${h(translateUiText(helper || label))}</span><strong class="${valueTextClass(shown)}${isMarketValueText(shown) ? " market-value" : ""}">${h(shown)}</strong><p>${h(translateUiText(label))}</p></article>`;
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
    if (rsi !== null) push(textPair("RSI — تشبع/ارتداد", "RSI — extremes/reversal"), rsi <= 30 ? "buy" : rsi >= 70 ? "sell" : "neutral", 1.0, rsi <= 30 ? textPair(`تشبع بيعي (${Math.round(rsi)})`, `Oversold (${Math.round(rsi)})`, `Survente (${Math.round(rsi)})`) : rsi >= 70 ? textPair(`تشبع شرائي (${Math.round(rsi)})`, `Overbought (${Math.round(rsi)})`, `Surachat (${Math.round(rsi)})`) : textPair(`محايد (${Math.round(rsi)})`, `Neutral (${Math.round(rsi)})`, `Neutre (${Math.round(rsi)})`));
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
    if (!tw) return { signal: "watch", agreement: 0, agreementPct: null, score: 0, buy: 0, sell: 0, neutral: 0, count: 0, requiredCount: sigs.length, completeCoverage: false, limited: true };
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
      requiredCount: sigs.length,
      completeCoverage: sigs.length >= 3,
      limited
    };
  }
  function limitedConsensusText(count, requiredCount = 0) {
    if (count <= 0) return textPair("لا توجد تغطية استراتيجية", "No strategy coverage", "Aucune couverture stratégique");
    if (requiredCount > count) return textPair(`تغطية جزئية: ${latinNumber(count)} من ${latinNumber(requiredCount)}`, `Partial coverage: ${latinNumber(count)} of ${latinNumber(requiredCount)}`, `Couverture partielle : ${latinNumber(count)} sur ${latinNumber(requiredCount)}`);
    if (count === 1) return textPair("اتفاق محدود: استراتيجية واحدة فقط", "Limited agreement: one strategy only", "Consensus limité : une seule stratégie");
    return textPair(`اتفاق محدود: ${latinNumber(count)} استراتيجيات فقط`, `Limited agreement: ${latinNumber(count)} strategies only`, `Consensus limité : ${latinNumber(count)} stratégies seulement`);
  }
  function consensusMetricText(c) {
    return c.limited || c.completeCoverage !== true ? limitedConsensusText(c.count, c.requiredCount) : textPair(`${latinNumber(c.agreement)}% اتفاق`, `${latinNumber(c.agreement)}% agreement`, `${latinNumber(c.agreement)}% de consensus`);
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
      c.requiredCount = backendMetric.requiredCount;
      c.completeCoverage = backendMetric.completeCoverage;
      if (backendMetric.agreementPct !== null) c.agreement = backendMetric.agreementPct;
    }
    if (!sigs.length) return emptyState(
      textPair("لا توجد بيانات كافية للاستراتيجيات", "Not enough strategy data", "Données insuffisantes pour les stratégies"),
      textPair("يحتاج محرك الاتفاق مؤشرات فنية أو توصية من المزود لتشغيل الاستراتيجيات. لن نعرض اتفاقاً تقديرياً عند غياب البيانات.", "The agreement engine needs technical indicators or a provider recommendation to run the strategies. No estimated agreement is shown when data is missing.", "Le moteur de consensus a besoin d’indicateurs techniques ou d’une recommandation du fournisseur pour exécuter les stratégies. Aucun consensus estimé n’est affiché en l’absence de données."),
      terminalText("settings"),
      `${ROOT}/settings`
    );
    const tone = c.limited ? "muted" : signalCardClass(c.signal);
    const rows = sigs.map(s => {
      const unavailable = backendRows.length ? !strategyRowComparable(s) : s.available === false;
      const rowSignal = unavailable ? "insufficient_data" : (finalRecommendationAction(s.signal) || s.signal || "watch");
      const name = isFrenchLanguage()
        ? s.nameFr || s.name_fr || s.nameEn || s.name_en || s.name || s.nameAr || s.name_ar || s.id || textPair("استراتيجية", "Strategy", "Stratégie")
        : isEnglishLanguage()
          ? s.nameEn || s.name_en || s.name || s.nameAr || s.name_ar || s.id || textPair("استراتيجية", "Strategy", "Stratégie")
          : s.nameAr || s.name_ar || s.name || s.nameEn || s.name_en || s.id || textPair("استراتيجية", "Strategy", "Stratégie");
      const unavailableNote = unavailable ? textPair("لم تتوفر بيانات كافية لهذه الاستراتيجية.", "Not enough data is available for this strategy.", "Les données disponibles sont insuffisantes pour cette stratégie.") : "";
      const note = isFrenchLanguage()
        ? s.noteFr || s.note_fr || s.noteEn || s.note_en || s.note || s.noteAr || s.note_ar || unavailableNote
        : isEnglishLanguage()
          ? s.noteEn || s.note_en || s.note || s.noteAr || s.note_ar || unavailableNote
          : s.noteAr || s.note_ar || s.note || s.noteEn || s.note_en || unavailableNote;
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
    const dataState = assetDataState({ ...a, ...source }, recommendation);
    const evidenceReady = dataState.key === "available";
    const backendRows = technicalUnavailable ? [] : strategyRowsFromBackend(rec, a);
    const sigs = backendRows.length ? backendRows : strategySignals(a, tech, rec);
    const consensusResult = backendRows.length ? backendConsensusFromRecords(rec, a) : consensus(sigs);
    const backendMetric = strategyAgreementMetric(rec, a);
    if (backendMetric.count > 0) {
      consensusResult.count = backendMetric.count;
      consensusResult.limited = backendMetric.limited;
      consensusResult.requiredCount = backendMetric.requiredCount;
      consensusResult.completeCoverage = backendMetric.completeCoverage;
      if (backendMetric.agreementPct !== null) consensusResult.agreement = backendMetric.agreementPct;
    }
    const confidence = evidenceReady ? recommendation.confidence : null;
    const samples = sampleCountFromRec(rec);
    const dataQuality = recommendation.dataQuality.status;
    const technicalState = technicalSnapshot({ ...a, ...(rec || {}) }, tech);
    const riskLevel = recommendation.riskLevel;
    const consensusStrong = consensusResult.agreement >= 70 && consensusResult.count >= 3 && consensusResult.completeCoverage === true;
    const aiStrong = confidence !== null && confidence >= 70;
    const dataStrong = dataQuality === "complete" && samples !== null && samples > 0;
    const technicalStrong = evidenceReady && !technicalUnavailable && technicalState.available && (!rec || rec.technicalAvailable !== false);
    const riskStrong = riskLevel !== "high";
    return {
      action: recommendation.status,
      dataState,
      evidenceReady,
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
  function dataSufficiencyChecklistCard(rec) {
    const ds = rec && rec.dataSufficiency;
    if (!ds) return "";
    const items = Array.isArray(ds.items) ? ds.items : [];
    const rows = items.map(item => {
      const label = textPair(item.labelAr, item.labelEn, item.labelFr);
      const detail = textPair(item.detailAr, item.detailEn, item.detailFr);
      return `<li class="sufficiency-row ${item.satisfied ? "is-ok" : "is-missing"}"><span class="sufficiency-icon" aria-hidden="true">${item.satisfied ? "✓" : "✕"}</span><div><b>${h(label)}</b><p>${h(detail)}</p></div></li>`;
    }).join("");
    const unavailableStrategies = Array.isArray(ds.unavailableStrategies) ? ds.unavailableStrategies : [];
    const strategyRows = unavailableStrategies.map(s => {
      const name = textPair(s.nameAr, s.nameEn, s.nameFr);
      const reason = textPair(s.reasonAr, s.reasonEn, s.reasonFr);
      return `<li class="sufficiency-strategy"><b>${h(name)}</b><span>${h(reason)}</span></li>`;
    }).join("");
    const coverageText = textPair(
      `تغطية الاستراتيجيات: ${latinNumber(ds.strategyCoverage.available)} من ${latinNumber(ds.strategyCoverage.total)}`,
      `Strategy coverage: ${latinNumber(ds.strategyCoverage.available)} of ${latinNumber(ds.strategyCoverage.total)}`,
      `Couverture des stratégies : ${latinNumber(ds.strategyCoverage.available)} sur ${latinNumber(ds.strategyCoverage.total)}`
    );
    return `<div class="data-sufficiency-checklist">
      <h3>${h(textPair("قائمة تحقق كفاية البيانات", "Data sufficiency checklist", "Liste de vérification de la suffisance des données"))}</h3>
      <p class="sufficiency-coverage">${h(coverageText)}</p>
      <ul class="sufficiency-list">${rows}</ul>
      ${strategyRows ? `<div class="sufficiency-strategies"><span class="sufficiency-subtitle">${h(textPair("استراتيجيات غير متاحة", "Unavailable strategies", "Stratégies indisponibles"))}</span><ul class="sufficiency-strategy-list">${strategyRows}</ul></div>` : ""}
    </div>`;
  }
  function finalRecommendationCard(asset, detail, rec, c) {
    const model = finalRecommendationModel(asset, detail, rec, c);
    const insufficient = model.evidenceReady && model.action === "insufficient_data";
    const confidenceText = model.confidence === null ? terminalText("unavailable") : `${latinNumber(Math.round(model.confidence))}%`;
    const samplesText = !model.evidenceReady || model.samples === null ? terminalText("unavailable") : latinNumber(model.samples);
    const finalLabel = model.evidenceReady ? recommendationLabel(model.normalizedRecommendation) : model.dataState.label;
    const metrics = [
      [textPair("التوصية النهائية", "Final recommendation"), finalLabel, textPair("النهائي", "Final")],
      [textPair("اتفاق الاستراتيجيات", "Strategy agreement"), model.evidenceReady ? consensusMetricText(model.consensusResult) : model.dataState.label, textPair("الاتفاق", "Consensus")],
      [textPair("ثقة الذكاء الاصطناعي", "AI confidence"), confidenceText, textPair("ثقة الذكاء الاصطناعي", "AI confidence")],
      [textPair("التحليل الفني", "Technical analysis"), model.technicalAvailable ? textPair("متاح من المزود", "Available from provider") : terminalText("unavailable"), textPair("التحليل الفني", "Technical")],
      [textPair("جودة البيانات / العينات", "Data quality / samples"), model.evidenceReady ? `${dataQualityLabel(model.dataQuality)} · ${samplesText}` : model.dataState.label, textPair("البيانات", "Data")],
      [textPair("المخاطر", "Risk"), model.evidenceReady ? riskShort(model.riskLevel) : terminalText("unavailable"), textPair("المخاطر", "Risk")]
    ];
    return `<article class="panel final-recommendation-card ${!model.evidenceReady || model.technicalUnavailable ? "muted" : signalCardClass(model.action)}">
      <div class="final-recommendation-head">
        <div><span class="eyebrow">${h(textPair("التوصية النهائية", "Final recommendation"))}</span><h2>${h(finalLabel)}</h2></div>
        <span class="state-badge ${!model.evidenceReady || model.technicalUnavailable ? model.dataState.tone || "muted" : signalCardClass(model.action)}">${h(finalLabel)}</span>
      </div>
      <div class="final-signal-grid">${metrics.map(([label, value, helper]) => detailCard(label, value, helper)).join("")}</div>
      <p class="recommendation-explanation">${h(model.evidenceReady ? translateUiText(model.explanation || terminalText("unavailable")) : model.dataState.body)}</p>
      ${insufficient ? dataSufficiencyChecklistCard(rec) : ""}
    </article>`;
  }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(translateUiText(helper))}</span><strong>${h(String(value))}</strong><small>${h(translateUiText(label))}</small></article>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(translateUiText(kicker))}</span><h2>${title}</h2><p>${h(translateUiText(body))}</p></section>`; }
  function unavailableSection(response, fallbackBody, label, href) {
    const unavailableTitle = response && response.routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : UNAVAILABLE_MESSAGE;
    const body = formatProviderError((response && response.message) || fallbackBody || UNAVAILABLE_DESCRIPTION, { empty: fallbackBody || UNAVAILABLE_DESCRIPTION });
    return emptyState(unavailableTitle, body, label, href);
  }
  function selectionEmptyState() {
    return emptyState(
      textPair(SELECTION_EMPTY_STATE_AR, SELECTION_EMPTY_STATE_EN, "Aucun actif ne correspond actuellement à ce marché ou à cette catégorie"),
      textPair("غيّر السوق أو التصنيف لعرض أصول أخرى متاحة من المزود.", "Change the market or category to view other assets available from the provider.", "Modifiez le marché ou la catégorie pour afficher d’autres actifs disponibles auprès du fournisseur."),
      "",
      ""
    );
  }
  function safeStateText(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return formatProviderError(value, { empty: fallback });
    const text = String(value).replace(/\s+/g, " ").trim();
    if (!text || /(?:api[_-]?key|authorization:\s*bearer|access[_-]?token|password|stack\s*trace|<html|<!doctype|\bat\s+[\w$.]+\s*\([^)]*:\d+:\d+\))/i.test(text)) return fallback;
    return translateUiText(text.length > 240 ? `${text.slice(0, 237).trim()}...` : text);
  }
  function emptyState(title, body, label, href) {
    const cleanTitle = safeStateText(title, UNAVAILABLE_MESSAGE);
    const cleanBody = safeStateText(body, UNAVAILABLE_DESCRIPTION);
    return `<div class="empty-state compact"><span class="empty-glyph">◎</span><h3>${h(cleanTitle)}</h3><p>${h(cleanBody)}</p><div class="row-actions">${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(translateUiText(label))}</a>` : ""}<button class="ghost-btn" data-retry>${h(terminalText("retry"))}</button></div></div>`;
  }
  function miniEmpty() { return `<div class="empty-state compact"><p>${h(textPair("لا توجد بيانات حالياً من المزود.", "No provider data is available right now."))}</p></div>`; }
  function marketUnavailable(m, data) { const provider = providerCopy(); const message = translateUiText(formatProviderError(data && data.message, { empty: provider.copy })); return `<section class="panel unavailable-panel"><span class="empty-glyph">⚠</span><h2>${h(textPair(`بيانات ${marketName(m)} غير متاحة`, `${marketName(m)} data is unavailable`, `Les données de ${marketName(m)} sont indisponibles`))}</h2><p>${h(message)}</p>
    <div class="detail-grid">${detailCard(textPair("الرموز المدعومة", "Supported symbols", "Symboles pris en charge"), String(m.symbols.length), terminalText("symbol"))}${detailCard(terminalText("currency"), m.currency, terminalText("currency"))}${detailCard(textPair("الحالة", "Status", "État"), provider.label, textPair("الحالة", "Status", "État"))}${detailCard(terminalText("lastUpdated"), new Date().toLocaleTimeString(terminalLocale(), { hour: "2-digit", minute: "2-digit" }), terminalText("lastUpdated"))}</div>
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
  function iconVisualRoleStyle(role) {
    return ICON_VISUAL_ROLE_STYLE[role] || ICON_VISUAL_ROLE_STYLE.neutral;
  }
  function logo(a, size) {
    const s = sym(a.symbol || a.ticker || a.code || "SFM"), type = assetType(s, a.assetType || a.type), cls = `asset-logo ${type}${size ? " " + size : ""}`;
    const base = s.replace(/[.\-=].*$/, "");
    let style = "", inner = base.slice(0, 3) || "SFM";
    if (type === "crypto") { const k = base.replace(/USDT?$/, "").replace(/USD$/, ""); const cr = CRYPTO[k]; if (cr) { style = iconVisualRoleStyle(cr[1]); inner = cr[0]; } }
    else if (type === "commodity") {
      if (/XAU|GOLD/i.test(s)) return `<span class="${cls}" style="${iconVisualRoleStyle("warning")}" aria-hidden="true">Au</span>`;
      if (/XAG|SILVER/i.test(s)) return `<span class="${cls}" style="${iconVisualRoleStyle("neutral")}" aria-hidden="true">Ag</span>`;
      if (/WTI|BRENT|OIL/i.test(s)) return `<span class="${cls}" style="${iconVisualRoleStyle("inverse")}" aria-hidden="true">⛽</span>`;
      return `<span class="${cls}" aria-hidden="true">${h(base.slice(0, 2))}</span>`;
    }
    else if (type === "forex") { return `<span class="${cls}" aria-hidden="true"><b>${h(base.slice(0, 3))}</b><i>${h(base.slice(3, 6))}</i></span>`; }
    else {
      const suffix = s.includes(".") ? s.split(".").pop() : ""; if (GULF_FLAG[suffix]) return `<span class="${cls}" aria-hidden="true">${GULF_FLAG[suffix]}</span>`;
      const br = BRAND[s] || BRAND[base]; if (br) { style = iconVisualRoleStyle(br[1]); inner = br[0]; }
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
      // بدل تكرار "السعر غير متاح · التغير غير متاح" في كل شريحة، تُعرض حالة
      // واحدة مضغوطة عند غياب السعر، وشرطة مع تلميح عند غياب التغير فقط.
      const amountHtml = isValidPrice(p) ? h(amount) : `<i class="chip-unavailable">${h(terminalText("unavailable"))}</i>`;
      const changeHtml = chg === null
        ? (isValidPrice(p) ? `<i class="chip-dash" title="${h(changeUnavailableText())}" aria-label="${h(changeUnavailableText())}">—</i>` : "")
        : `<i class="${chg >= 0 ? "up" : "down"}">${h(change(chg))}</i>`;
      return `<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({ ...q, symbol: s })}<span><strong>${h(label)}</strong><small class="ltr">${amountHtml} ${changeHtml}</small></span></button>`;
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
    const feedState = recommendationFeedState(rec);
    const cells = [[textPair("بيانات التحليل", "Analysis data", "Données d’analyse"), feedState.label, feedState.title], [terminalText("market"), mk.length || MARKETS.length, terminalText("market")], [textPair("الأصول المحللة", "Analyzed assets", "Actifs analysés"), rec.length || "--", textPair("الأصول المحللة", "Analyzed")], [terminalText("watchlist"), state.watch.length, terminalText("watchlist")], [terminalText("lastUpdated"), new Date().toLocaleTimeString(terminalLocale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" }), textPair("آخر تحديث", "Updated")]];
    const metricCellsHtml = cells.map(([l, v, hp]) => `<div class="sb-cell"><span>${h(l)}</span><strong>${h(String(v))}</strong><em>${h(hp)}</em></div>`).join("");
    const statusCellHtml = `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${h(p.className === "online" ? textPair("النظام يعمل", "System online") : textPair("بانتظار المزود", "Waiting for provider"))}</strong></div>`;
    if (statsHost) statsHost.innerHTML = metricCellsHtml;
    if (bar) bar.innerHTML = statsHost ? "" : metricCellsHtml + statusCellHtml;
    renderMarketSelector();
  }

  /* ───────────────────── Actions ───────────────────── */
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(textPair(`تمت إضافة ${s} لقائمة المتابعة.`, `${s} added to watchlist.`, `${s} a été ajouté à la liste de suivi.`)); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x => x !== s); write(keys.watch, state.watch); toast(textPair(`تمت إزالة ${s}.`, `${s} removed.`, `${s} a été supprimé.`)); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{ symbol: s, type: "signal", title: textPair(`متابعة ${s}`, `Watch ${s}`, `Surveiller ${s}`), message: textPair("تنبيه محلي محفوظ. يحتاج مزود أسعار لتفعيله تلقائياً.", "Local alert saved. A price provider is required to trigger it automatically."), createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(textPair(`تم إنشاء تنبيه لـ ${s}.`, `Alert created for ${s}.`, `Alerte créée pour ${s}.`)); render(); }
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
      toast(textPair("تم حفظ الصفقة على هذا الجهاز لأن الحفظ السحابي غير متاح حالياً.", "The trade was saved on this device because cloud saving is currently unavailable.", "La transaction a été enregistrée sur cet appareil, car l’enregistrement dans le cloud est indisponible."));
    }
    await refreshFollowedTrades(false);
  }
  function followRecommendationTrade(raw) {
    const s = sym(raw), rec = matchRec(s);
    if (!rec) return toast(textPair("لم أجد توصية محفوظة لهذا الرمز حالياً.", "No saved recommendation was found for this symbol."));
    const recommendation = sharedRecommendation(rec);
    if (!hasTradeableQuote(rec, recommendation)) return toast(translateUiText(rec.unavailableReason ? unavailablePriceText(rec) : recommendation.reason || textPair("السعر أو الهدف/الوقف غير متاح حالياً؛ لا يمكن متابعة الصفقة.", "Price, target, or stop is currently unavailable; the trade cannot be followed.")));
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
  async function runSignalRefresh(trigger) {
    if (trigger && trigger.disabled) return;
    if (trigger) { trigger.disabled = true; trigger.setAttribute("aria-busy", "true"); }
    try {
      const result = await post("/market/signals/refresh", { symbols: defaults, force: true });
      if (!result.ok) {
        const fallback = await get(`/market/signals?symbols=${encodeURIComponent(defaults.join(","))}&refresh=1&limit=${defaults.length}`);
        if (!fallback.ok) {
          toast(textPair("تعذر تشغيل فحص الإشارات من جميع المصادر المدعومة.", "The signal scan could not run through any supported source.", "L’analyse des signaux n’a pu être lancée via aucune source prise en charge."));
          return;
        }
        toast(textPair("اكتمل الفحص من المصدر الاحتياطي، لكن الحفظ السحابي غير متاح.", "The fallback scan completed, but cloud saving is unavailable.", "L’analyse de secours a abouti, mais l’enregistrement dans le cloud est indisponible."));
      } else {
        toast(textPair("تم تشغيل فحص الإشارات وحفظ المرشحات المتاحة.", "Signal scan started and available candidates were saved.", "L’analyse des signaux a démarré et les candidats disponibles ont été enregistrés."));
      }
      await refreshFollowedTrades(true);
    } finally {
      if (trigger && trigger.isConnected) { trigger.disabled = false; trigger.removeAttribute("aria-busy"); }
    }
  }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.setAttribute("role", "status"); node.dir = isLtrLanguage() ? "ltr" : "rtl"; node.textContent = message; root.appendChild(node); setTimeout(() => node.remove(), 3200); }

  function clearFormError(form) {
    form.querySelectorAll("[aria-invalid='true']").forEach(field => {
      field.removeAttribute("aria-invalid");
      if (field.getAttribute("aria-describedby")?.endsWith("-form-error")) field.removeAttribute("aria-describedby");
    });
    const error = form.querySelector(".form-field-error");
    if (error) { error.textContent = ""; error.hidden = true; }
  }

  function showFormError(form, message, fieldName) {
    const error = form.querySelector(".form-field-error");
    const field = fieldName ? form.elements.namedItem(fieldName) : null;
    if (error) { error.textContent = message; error.hidden = false; }
    if (field && typeof field.setAttribute === "function") {
      field.setAttribute("aria-invalid", "true");
      if (error && error.id) field.setAttribute("aria-describedby", error.id);
      field.focus();
    }
    toast(message);
    return false;
  }

  function setFormBusy(form, busy) {
    const submit = form.querySelector("button[type='submit']");
    form.dataset.submitting = busy ? "true" : "false";
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (!submit) return;
    if (busy && !submit.dataset.idleLabel) submit.dataset.idleLabel = submit.textContent || "";
    submit.disabled = busy;
    submit.setAttribute("aria-disabled", busy ? "true" : "false");
    submit.textContent = busy ? textPair("جارٍ الحفظ...", "Saving...", "Enregistrement...") : submit.dataset.idleLabel || submit.textContent;
  }

  function validSymbolInput(value) {
    return /^[A-Za-z0-9._^=\/-]{1,24}$/.test(String(value || "").trim());
  }

  function decimalFormValue(formData, name) {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  // form submits via delegation (forms re-render, so use document-level submit)
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "alert-form") {
      e.preventDefault();
      const form = e.target;
      if (form.dataset.submitting === "true") return;
      clearFormError(form);
      const f = new FormData(form);
      const rawSymbol = String(f.get("symbol") || "").trim();
      const s = sym(rawSymbol);
      const type = String(f.get("type") || "price");
      const value = decimalFormValue(f, "value");
      if (!s || !validSymbolInput(rawSymbol)) return showFormError(form, textPair("أدخل رمزاً صالحاً مثل AAPL أو 2222.SR.", "Enter a valid symbol such as AAPL or 2222.SR.", "Saisissez un symbole valide, comme AAPL ou 2222.SR."), "symbol");
      if (["price", "percent"].includes(type) && (value === null || !Number.isFinite(value))) return showFormError(form, textPair("أدخل قيمة رقمية صالحة لهذا النوع من التنبيه.", "Enter a valid numeric value for this alert type.", "Saisissez une valeur numérique valide pour ce type d’alerte."), "value");
      if (type === "price" && Number(value) <= 0) return showFormError(form, textPair("يجب أن يكون سعر التنبيه أكبر من صفر.", "The alert price must be greater than zero.", "Le cours de l’alerte doit être supérieur à zéro."), "value");
      setFormBusy(form, true);
      state.alerts = [{ symbol: s, type, value: value === null ? "" : value, title: textPair(`تنبيه ${s}`, `${s} alert`, `Alerte ${s}`), createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30);
      write(keys.alerts, state.alerts);
      toast(textPair(`تم إنشاء تنبيه لـ ${s}.`, `Alert created for ${s}.`, `Alerte créée pour ${s}.`));
      render();
      return;
    }
    if (e.target.id === "holding-form") {
      e.preventDefault();
      const form = e.target;
      if (form.dataset.submitting === "true") return;
      clearFormError(form);
      const f = new FormData(form);
      const rawSymbol = String(f.get("symbol") || "").trim();
      const s = sym(rawSymbol);
      const qty = decimalFormValue(f, "qty");
      const entry = decimalFormValue(f, "entry");
      if (!s || !validSymbolInput(rawSymbol)) return showFormError(form, textPair("أدخل رمزاً صالحاً مثل AAPL أو 2222.SR.", "Enter a valid symbol such as AAPL or 2222.SR.", "Saisissez un symbole valide, comme AAPL ou 2222.SR."), "symbol");
      if (qty === null || !Number.isFinite(qty) || qty <= 0) return showFormError(form, textPair("يجب أن تكون الكمية رقماً أكبر من صفر.", "Quantity must be a number greater than zero.", "La quantité doit être un nombre supérieur à zéro."), "qty");
      if (entry === null || !Number.isFinite(entry) || entry <= 0) return showFormError(form, textPair("يجب أن يكون سعر الدخول رقماً أكبر من صفر.", "Entry price must be a number greater than zero.", "Le prix d’entrée doit être un nombre supérieur à zéro."), "entry");
      setFormBusy(form, true);
      state.holdings = [{ symbol: s, qty, entry }, ...state.holdings].slice(0, 50);
      write(keys.holdings, state.holdings);
      toast(textPair(`تمت إضافة مركز ${s}.`, `${s} position added.`, `Position ${s} ajoutée.`));
      render();
      return;
    }
    if (e.target.id === "followed-trade-form") {
      e.preventDefault();
      const form = e.target;
      if (form.dataset.submitting === "true") return;
      clearFormError(form);
      const f = new FormData(form);
      const rawSymbol = String(f.get("symbol") || "").trim();
      const s = sym(rawSymbol);
      const entryPrice = decimalFormValue(f, "entryPrice");
      const targetPrice = decimalFormValue(f, "targetPrice");
      const stopLoss = decimalFormValue(f, "stopLoss");
      const confidence = decimalFormValue(f, "confidence");
      if (!s || !validSymbolInput(rawSymbol)) return showFormError(form, textPair("أدخل رمزاً صالحاً مثل AAPL أو 2222.SR.", "Enter a valid symbol such as AAPL or 2222.SR.", "Saisissez un symbole valide, comme AAPL ou 2222.SR."), "symbol");
      if (entryPrice === null || !Number.isFinite(entryPrice) || entryPrice <= 0) return showFormError(form, textPair("يجب أن يكون سعر الدخول رقماً أكبر من صفر.", "Entry price must be a number greater than zero.", "Le prix d’entrée doit être un nombre supérieur à zéro."), "entryPrice");
      if (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice <= 0)) return showFormError(form, textPair("أدخل هدفاً صالحاً أكبر من صفر أو اتركه فارغاً.", "Enter a valid target above zero or leave it empty.", "Saisissez un objectif valide supérieur à zéro ou laissez le champ vide."), "targetPrice");
      if (stopLoss !== null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) return showFormError(form, textPair("أدخل وقف خسارة صالحاً أكبر من صفر أو اتركه فارغاً.", "Enter a valid stop loss above zero or leave it empty.", "Saisissez un stop valide supérieur à zéro ou laissez le champ vide."), "stopLoss");
      if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 100)) return showFormError(form, textPair("يجب أن تكون الثقة بين 0 و100.", "Confidence must be between 0 and 100.", "La confiance doit être comprise entre 0 et 100."), "confidence");
      const action = String(f.get("action") || "watch");
      const now = new Date().toISOString();
      const draft = {
        id: `manual-${Date.now()}`,
        symbol: s,
        assetName: s,
        action,
        entryPrice,
        currentPrice: entryPrice,
        targetPrice,
        stopLoss,
        confidence,
        notes: String(f.get("notes") || "").trim(),
        status: action === "wait" ? "waiting" : action === "watch" ? "watching" : "open",
        openedAt: now,
        updatedAt: now,
        provider: "manual",
        sourceType: "manual"
      };
      setFormBusy(form, true);
      try {
        await persistFollowedTrade(draft);
        if (form.isConnected) form.reset();
      } finally {
        if (form.isConnected) setFormBusy(form, false);
      }
      return;
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
      title: row.title || textPair(`تغيرت الإشارة على ${sym(row.symbol)}`, `Signal changed on ${sym(row.symbol)}`, `Le signal a changé sur ${sym(row.symbol)}`),
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
  function tradeStatusLabel(st) {
    return st === "won" ? textPair("رابحة", "Won", "Gagnée")
      : st === "lost" ? textPair("خاسرة", "Lost", "Perdue")
        : st === "open" ? textPair("مفتوحة", "Open", "Ouverte")
          : st === "waiting" ? textPair("انتظار", "Waiting", "En attente")
            : st === "expired" ? textPair("منتهية", "Expired", "Expirée")
              : textPair("تحت المتابعة", "Under watch", "Sous surveillance");
  }
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
  function sigLabel(s) {
    const status = Recommendation.parseRecommendationStatus(s) || s || "watch";
    if (isFrenchLanguage()) return Recommendation.labelFr(status);
    return isEnglishLanguage() ? Recommendation.labelEn(status) : Recommendation.labelAr(status);
  }
  function sigLabelEn(s) { return Recommendation.labelEn(Recommendation.parseRecommendationStatus(s) || s || "watch"); }
  function recStatusKey(x) {
    const s = String(x.status || x.state || "open").toLowerCase();
    if (s.includes("complet") || s.includes("مكتمل")) return "completed";
    if (s.includes("fail") || s.includes("فاشل")) return "failed";
    if (s.includes("expир") || s.includes("expire") || s.includes("منتهي")) return "expired";
    if (s.includes("watch") || s.includes("متابعة")) return "watching";
    return "open";
  }
  function recStatus(x) {
    const status = recStatusKey(x);
    if (status === "completed") return textPair("مكتملة", "Completed", "Terminée");
    if (status === "failed") return textPair("فاشلة", "Failed", "Échouée");
    if (status === "expired") return textPair("منتهية", "Expired", "Expirée");
    if (status === "watching") return textPair("تحت المتابعة", "Under watch", "Sous surveillance");
    return textPair("مفتوحة", "Open", "Ouverte");
  }
  function recStatusTone(x) { const s = recStatusKey(x); return s === "completed" ? "ok" : s === "failed" ? "bad" : s === "expired" ? "muted" : ""; }
  function confComputed(x) {
    const flag = x.confidenceComputed ?? x.confidence_computed;
    return flag === undefined || flag === null ? true : Boolean(flag);
  }
  function confText(x) {
    // When confidence isn't computed (no data to derive it from), show "not computed"
    // instead of a default number that would falsely imply precision and repeat across symbols.
    if (!confComputed(x)) return textPair("غير محسوبة", "Not computed");
    const c = num(x.aiConfidence, x.ai_confidence, x.confidence, x.score);
    return c === null ? "--" : Math.round(c) + "%";
  }
  function riskKey(v) { const s = String(v || "").toLowerCase(); if (s.includes("high") || s.includes("مرتفع") || s.includes("عالي")) return "high"; if (s.includes("low") || s.includes("منخفض")) return "low"; return "medium"; }
  function riskShort(v) { const k = riskKey(v); return k === "high" ? textPair("عالية", "High") : k === "low" ? textPair("منخفضة", "Low") : textPair("متوسطة", "Medium"); }
  function riskTone(v) { const k = riskKey(v); return k === "high" ? "bad" : k === "low" ? "ok" : "warn"; }
  function riskLabel(r) { return r === "conservative" ? textPair("محافظ", "Conservative") : r === "aggressive" ? textPair("هجومي", "Aggressive") : textPair("متوازن", "Balanced"); }
  function dataQualityLabel(value) { const v = String(value || "").toLowerCase(); if (v === "complete") return textPair("مكتملة", "Complete"); if (v === "live") return textPair("مباشرة", "Live"); if (v === "cached") return textPair("بيانات مخزنة مؤقتاً", "Cached"); if (v === "stale") return textPair("قديمة", "Stale", "Anciennes"); if (v === "late" || v === "delayed") return textPair("متأخرة", "Delayed"); if (v === "partial") return textPair("جزئية", "Partial"); if (v === "unavailable") return textPair("غير متاحة", "Unavailable"); return value ? translateUiText(value) : terminalText("unavailable"); }
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
  // شرطة مضغوطة للقيم غير المتاحة في الجداول والبطاقات بدل تكرار كلمة "غير متاح"،
  // مع الإبقاء على النص الكامل للتلميح وقارئات الشاشة.
  function dashCell(reason) {
    const label = String(reason || terminalText("unavailable"));
    return `<span class="cell-dash" title="${h(label)}" aria-label="${h(label)}">—</span>`;
  }
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
  function date(v) { if (!v) return "--"; const d = new Date(Number(v) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString(terminalLocale(), { dateStyle: "medium", timeStyle: "short" }); }
  function num(...values) { for (const v of values) { if (v === null || v === undefined || v === "") continue; const n = Number(v); if (Number.isFinite(n)) return n; } return null; }
  function arr(v) { if (Array.isArray(v)) return v; if (v && typeof v === "object") return Object.values(v).filter(x => x && typeof x === "object"); return []; }
  function unique(v) { return Array.from(new Set(v.map(sym).filter(Boolean))); }
  function read(k, f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch (_e) { return f; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} }
  function settingsT(key, lang = currentLanguage()) {
    const entry = SETTINGS_COPY[key];
    const normalized = normalizeLanguage(lang);
    if (!entry) return key;
    if (normalized === "fr") return entry.fr || frenchUiText(entry.en || key);
    return entry[normalized] || entry.ar || entry.en || key;
  }
  function countTextLocalized(value, lang = currentLanguage()) {
    const n = latinNumber(numberValue(value));
    return `${n} ${settingsT("symbolCount", lang)}`;
  }
  function yesNoLocalized(value, lang = currentLanguage()) {
    const normalized = normalizeLanguage(lang);
    if (normalized === "fr") return value ? "Oui" : "Non";
    return value ? (normalized === "en" ? "Yes" : "نعم") : (normalized === "en" ? "No" : "لا");
  }
  function riskLabelLocalized(r, lang = currentLanguage()) {
    if (r === "conservative") return settingsT("conservative", lang);
    if (r === "aggressive") return settingsT("aggressive", lang);
    return settingsT("balanced", lang);
  }
  function settingsMarketLabel(option, lang = currentLanguage()) {
    const normalized = normalizeLanguage(lang);
    return h(normalized === "fr" ? (option.fr || frenchUiText(option.en || option.id)) : (option[normalized] || option.en || option.id));
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
    if (value.startsWith("fr")) return "fr";
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
    const entry = PROVIDER_STATUS_LABELS[statusKey] || PROVIDER_STATUS_LABELS.provider_status_unknown;
    return lang === "fr" ? (entry.fr || frenchUiText(entry.en)) : entry[lang];
  }
  function getProviderStatusExplanation(status, locale) {
    const statusKey = canonicalProviderStatusKey(status);
    if (statusKey !== "provider_status_failed" && statusKey !== "provider_status_partial") return "";
    const lang = providerLocale(locale);
    return lang === "fr" ? (PROVIDER_STATUS_EXPLANATION.fr || frenchUiText(PROVIDER_STATUS_EXPLANATION.en)) : PROVIDER_STATUS_EXPLANATION[lang];
  }
  function getProviderRetryLabel(locale) {
    const lang = providerLocale(locale);
    return lang === "fr" ? (PROVIDER_RETRY_LABEL.fr || "Réessayer") : PROVIDER_RETRY_LABEL[lang];
  }
  function providerStatusCopy(status, options = {}) {
    const locale = providerLocale(options.locale);
    const statusKey = canonicalProviderStatusKey(status);
    const title = getProviderStatusMessage(statusKey, locale);
    const explanation = getProviderStatusExplanation(statusKey, locale);
    const provider = providerName(options.provider || "");
    const activeProviderCopy = locale === "fr" ? `Fournisseur actif : ${provider}` : locale === "en" ? `Active provider: ${provider}` : `المزود النشط: ${provider}`;
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
  function h(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;"); }

  document.addEventListener("click", async (e) => {
    const chip = e.target.closest("[data-rec-market]");
    if (!chip) return;
    const requestedMarket = chip.dataset.recMarket;
    state.settings.defaultMarket = requestedMarket;
    try { localStorage.setItem(keys.settings, JSON.stringify(state.settings)); } catch {}
    state.rec = { status: "loading" };
    state.commandCards = {};
    state.news = {};
    state.newsContextKey = "";
    invalidateHydrationCache("rec", "commandCards", "news");
    const cacheKey = `rec:${marketApi(requestedMarket)}`;
    hydrationExpectedCacheKey.set("rec", cacheKey);
    const generation = hydrationGeneration.get("rec") || 0;
    render();
    const promise = get(`/recommendations?market=${marketApi(requestedMarket)}`, { label: "quotes" });
    hydrationInFlight.set(cacheKey, { key: "rec", generation, promise });
    const result = await promise;
    if (hydrationInFlight.get(cacheKey)?.promise === promise) hydrationInFlight.delete(cacheKey);
    if (state.settings.defaultMarket !== requestedMarket
      || hydrationExpectedCacheKey.get("rec") !== cacheKey
      || (hydrationGeneration.get("rec") || 0) !== generation) return;
    state.rec = result;
    hydrationLoaded.add(cacheKey);
    render();
  });


  function selectMarket(mid) {
    const mk = MARKETS.find(function(x) { return x.id === mid; });
    if (!mk) return;
    state.settings.defaultMarket = mid;
    _marketSelectorOpen = false;
    write(keys.settings, state.settings);
    state.rec = { status: "loading" };
    state.commandCards = {};
    state.signals = { status: "loading" };
    state.signalAlerts = {};
    state.news = {};
    state.newsContextKey = "";
    invalidateHydrationCache("rec", "commandCards", "signals", "signalAlerts", "news");
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
      ".ms-pill{min-height:42px;display:inline-flex;align-items:center;gap:10px;padding-block:0;padding-inline:15px 10px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--foreground);font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:border-color .18s ease,background .18s ease,color .18s ease,box-shadow .18s ease,transform .18s ease;white-space:nowrap;box-shadow:var(--shadow-xs);touch-action:manipulation;direction:inherit}" +
      ".ms-pill>*{pointer-events:none}.ms-pill:hover,.ms-pill[aria-expanded=true]{border-color:color-mix(in srgb,var(--primary) 36%,var(--border));background:var(--primary-soft);color:var(--primary);box-shadow:var(--shadow-xs)}" +
      ".ms-pill:focus-visible{outline:2px solid var(--focus-ring);outline-offset:3px;box-shadow:var(--focus-shadow)}.ms-pill:active{transform:translateY(1px)}" +
      ".ms-pill-copy{min-width:0;display:inline-flex;align-items:center;gap:6px;line-height:1}.ms-pill-name{min-width:0;max-width:150px;overflow:hidden;text-overflow:ellipsis;text-align:start}.ms-pill-sep{color:var(--foreground-muted);margin:0 1px}.ms-pill-cur{font-family:var(--font-data);font-size:12px;font-weight:700;color:var(--primary);direction:ltr;unicode-bidi:embed;letter-spacing:.03em}" +
      ".ms-chevron-box{width:28px;height:28px;display:grid;place-items:center;flex:0 0 28px;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground-secondary);transition:background .18s ease,border-color .18s ease,color .18s ease}.ms-pill:hover .ms-chevron-box,.ms-pill[aria-expanded=true] .ms-chevron-box{border-color:color-mix(in srgb,var(--primary) 36%,var(--border));background:var(--surface);color:var(--primary)}.ms-chevron{width:16px;height:16px;flex-shrink:0;transition:transform .22s cubic-bezier(.2,.8,.2,1);animation:ms-chevron-close .22s cubic-bezier(.2,.8,.2,1)}.ms-chevron.ms-open{transform:rotate(180deg);animation:ms-chevron-open .22s cubic-bezier(.2,.8,.2,1)}@keyframes ms-chevron-open{from{transform:rotate(0)}to{transform:rotate(180deg)}}@keyframes ms-chevron-close{from{transform:rotate(180deg)}to{transform:rotate(0)}}@media(prefers-reduced-motion:reduce){.ms-chevron{transition:none;animation:none!important}}" +
      ".ms-dropdown{position:absolute;top:calc(100% + 9px);inset-inline-start:0;min-width:255px;max-height:min(390px,70vh);overflow-y:auto;overflow-x:hidden;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-card);padding:7px;z-index:10050;display:flex;flex-direction:column;gap:3px;box-shadow:var(--shadow-popover)}" +
      ".ms-item{display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 10px;border-radius:var(--radius-control);border:1px solid transparent;background:transparent;color:var(--foreground-secondary);font-size:13px;font-weight:500;cursor:pointer;text-align:start;direction:inherit;width:100%;transition:background .12s,border-color .12s,color .12s}" +
      ".ms-item:hover{background:var(--surface-hover);color:var(--foreground)}.ms-item:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;background:var(--surface-hover);color:var(--foreground)}" +
      ".ms-item.is-active{color:var(--primary);font-weight:600;background:var(--primary-soft);border-color:color-mix(in srgb,var(--primary) 30%,var(--border))}.ms-chk{width:14px;height:14px;flex-shrink:0;color:var(--primary)}.ms-chk-ph{display:inline-block;width:14px;height:14px;flex-shrink:0}.ms-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.ms-cur-tag{font-family:var(--font-data);font-size:12px;color:var(--foreground-muted);direction:ltr;unicode-bidi:embed;margin-inline-start:auto;padding-inline-start:8px}.ms-item.is-active .ms-cur-tag{color:var(--primary)}" +
      "@media(max-width:640px){.topbar-market-selector,.topbar-market-selector .ms-wrap,.topbar-market-selector .ms-pill{width:100%}.topbar-market-selector .ms-pill{justify-content:center;min-height:40px;padding-inline:12px;font-size:13px}.ms-pill-name{max-width:46vw}.ms-dropdown{inset-inline-start:auto;left:50%;right:auto;transform:translateX(-50%);min-width:min(312px,calc(100vw - 28px));max-width:calc(100vw - 28px)}}";
    document.head.appendChild(_s);
  }

  // باني HTML نقي — لا يكتب في DOM. يُستدعى من statusBar() ضمن نفس innerHTML.
  function marketSelectorHtml() {
    ensureMarketSelectorCss();
    const m = currentMarket();
    const isOpen = !!_marketSelectorOpen;
    const dir = isLtrLanguage() ? "ltr" : "rtl";
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
