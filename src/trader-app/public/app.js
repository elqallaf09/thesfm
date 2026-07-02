/* the-sfm trader — AI Trading Terminal (vanilla SPA controller)
   Architecture: single IIFE, client-side routing (instant page switches),
   pure render-component functions, defensive data layer, no synthetic market data. */
(() => {
  "use strict";

  /* ─────────────────────────── Config ─────────────────────────── */
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const VER = "20260703-market-status-ui";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3", holdings: "sfmTraderHoldings:v1", settings: "sfmTraderSettings:v1", followed: "sfmTraderFollowedTrades:v1", calendarUi: "sfmTraderCalendarUi:v1" };
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const leadershipCore = ["NAS100", "US30", "XAUUSD", "BTCUSD"];
  const INITIAL_LOADING_MAX_MS = 4500;
  const REQUEST_TIMEOUTS = { providerStatus: 8000, quotes: 8000, signals: 8000, news: 12000, calendar: 15000, default: 10000 };
  const CALENDAR_SECTION_KEYS = ["earnings", "dividends", "ipos", "economic"];
  const CALENDAR_PREVIEW_LIMIT = 10;
  const CALENDAR_EXPANDED_LIMIT = 50;
  const MAJOR_EARNINGS_SYMBOLS = new Set(["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "GOOG", "META", "TSLA", "AVGO", "LLY", "JPM", "V", "UNH", "XOM", "MA", "WMT", "PG", "COST", "HD", "NFLX", "AMD", "CRM", "ORCL", "ADBE", "BAC", "KO", "PEP", "MCD", "DIS", "CSCO", "INTC", "PFE", "MRK", "JNJ"]);
  const DEFAULT_CALENDAR_UI = {
    open: { earnings: true, dividends: false, ipos: false, economic: false },
    expanded: {},
    earningsFilter: "all",
    earningsSearch: "",
    earningsSort: { key: "reportDate", dir: "asc" }
  };
  const UNAVAILABLE_MESSAGE = "تعذر تحميل هذه البيانات حالياً";
  const ROUTE_UNAVAILABLE_MESSAGE = "المسار غير متاح حالياً";
  const DEV_DIAGNOSTICS = ["localhost", "127.0.0.1", "::1"].includes(location.hostname) || location.hostname.endsWith(".local");

  const routes = {
    dashboard: "غرفة قيادة السوق", markets: "خريطة الأسواق", "ai-scanner": "ماسح الذكاء الاصطناعي",
    watchlist: "قائمة المتابعة الذكية", portfolio: "المحفظة", alerts: "مركز التنبيهات",
    recommendations: "التوصيات والتحليل", "trade-performance": "أداء الصفقات", news: "أخبار السوق",
    calendar: "تقويم السوق", education: "مركز التعليم", settings: "إعدادات النظام", "symbol-details": "تفاصيل الرمز"
  };

  // [id, ar, en, family, currency, sampleSymbols, tone, apiMarket]
  const MARKETS = [
    ["us-stocks", "الأسهم الأمريكية", "US Stocks", "Equities", "USD", ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA"], "featured", "us-stocks"],
    ["forex", "العملات", "Forex", "FX", "Pair", ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD"], "", "forex"],
    ["crypto", "الأصول الرقمية", "Crypto", "Digital", "USD", ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD"], "featured", "crypto"],
    ["commodities", "السلع", "Commodities", "Macro", "USD", ["XAUUSD", "XAGUSD", "WTI", "BRENT"], "", "commodities"],
    ["indices", "المؤشرات", "Indices", "Benchmarks", "Local", ["SPX", "NDX", "DJI", "DXY"], "", "indices"],
    ["etfs", "الصناديق المتداولة", "ETFs", "Funds", "USD", ["SPY", "QQQ", "GLD", "IWM"], "", "etfs"],
    ["gcc", "أسواق الخليج", "Gulf Markets", "Regional", "Mixed", ["2222.SR", "EMAAR.AE", "QNBK.QA", "KFH.KW"], "", "gcc"],
    ["saudi", "السوق السعودي", "Saudi Market", "Tadawul", "SAR", ["2222.SR", "1120.SR", "7010.SR"], "", "saudi"],
    ["kuwait", "بورصة الكويت", "Kuwait Market", "Boursa", "KWD", ["KFH.KW", "NBK.KW", "ZAIN.KW"], "", "kuwait"],
    ["uae", "سوق الإمارات", "UAE Market", "ADX/DFM", "AED", ["EMAAR.AE", "FAB.AE", "ETISALAT.AE"], "", "uae"],
    ["qatar", "سوق قطر", "Qatar Market", "QSE", "QAR", ["QNBK.QA", "IQCD.QA", "QIBK.QA"], "", "qatar"],
    ["bahrain", "سوق البحرين", "Bahrain Market", "BHB", "BHD", ["AUB.BH", "GFH.BH", "BATELCO.BH"], "", "bahrain"],
    ["oman", "سوق عمان", "Oman Market", "MSX", "OMR", ["BKMB.OM", "OMINV.OM"], "", "oman"],
    ["europe", "الأسهم الأوروبية", "European Stocks", "Global", "EUR", ["ASML.AS", "SAP.DE", "NESN.SW", "MC.PA"], "", "europe"],
    ["asia", "الأسهم الآسيوية", "Asian Stocks", "Global", "Mixed", ["7203.T", "9988.HK", "TSM", "005930.KS"], "", "asia"],
    ["technology", "أسهم التقنية", "Technology", "Sector", "USD", ["AAPL", "MSFT", "GOOGL", "ORCL", "CRM"], "", "technology"],
    ["ai", "أسهم الذكاء الاصطناعي", "AI Stocks", "Sector", "USD", ["NVDA", "MSFT", "GOOGL", "AMD", "PLTR"], "featured", "ai"],
    ["semiconductors", "أشباه الموصلات", "Semiconductors", "Sector", "USD", ["NVDA", "AMD", "TSM", "AVGO", "INTC"], "", "semiconductors"],
    ["energy", "الطاقة", "Energy Stocks", "Sector", "Mixed", ["XOM", "CVX", "2222.SR", "OXY"], "", "energy"],
    ["banking", "البنوك", "Banking Stocks", "Sector", "Mixed", ["JPM", "BAC", "NBK.KW", "QNBK.QA"], "", "banking"],
    ["food", "الأغذية والاستهلاك", "Food / Consumer", "Sector", "USD", ["KO", "PEP", "MCD", "COST"], "", "food"],
    ["healthcare", "الصحة والدواء", "Pharma / Healthcare", "Sector", "USD", ["LLY", "PFE", "JNJ", "MRK"], "", "healthcare"]
  ].map(([id, ar, en, family, currency, symbols, tone, apiMarket]) => ({ id, ar, en, family, currency, symbols, tone, apiMarket }));

  const MARKET_METADATA = {
    "us-stocks": { id: "us-stocks", ar: "الأسهم الأمريكية", en: "US Stocks", assetAr: "أسهم", assetEn: "Stocks", currency: "USD", country: "US", exchange: "US" },
    etfs: { id: "etfs", ar: "الصناديق المتداولة", en: "ETFs", assetAr: "الصناديق المتداولة", assetEn: "ETFs", currency: "USD", country: "US", exchange: "US" },
    crypto: { id: "crypto", ar: "العملات الرقمية", en: "Crypto", assetAr: "العملات الرقمية", assetEn: "Crypto", currency: "USD", exchange: "Crypto" },
    forex: { id: "forex", ar: "العملات", en: "Forex", assetAr: "عملات", assetEn: "Forex", currency: "USD", exchange: "Forex" },
    commodities: { id: "commodities", ar: "السلع", en: "Commodities", assetAr: "سلع", assetEn: "Commodities", currency: "USD" },
    metals: { id: "metals", ar: "المعادن", en: "Metals", assetAr: "المعادن", assetEn: "Metals", currency: "USD", exchange: "Metals" },
    indices: { id: "indices", ar: "المؤشرات", en: "Indices", assetAr: "مؤشرات", assetEn: "Indices", currency: "USD" },
    gcc: { id: "gcc", ar: "أسواق الخليج", en: "Gulf Markets", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    kuwait: { id: "kuwait", ar: "بورصة الكويت", en: "Boursa Kuwait", assetAr: "أسهم", assetEn: "Stocks", currency: "KWD", country: "KW", exchange: "Boursa Kuwait" },
    saudi: { id: "saudi", ar: "السوق السعودي", en: "Saudi Exchange", assetAr: "أسهم", assetEn: "Stocks", currency: "SAR", country: "SA", exchange: "Tadawul" },
    uae: { id: "uae", ar: "سوق الإمارات", en: "UAE Markets", assetAr: "أسهم", assetEn: "Stocks", currency: "AED", country: "AE", exchange: "ADX/DFM" },
    qatar: { id: "qatar", ar: "بورصة قطر", en: "Qatar Exchange", assetAr: "أسهم", assetEn: "Stocks", currency: "QAR", country: "QA", exchange: "Qatar Exchange" },
    bahrain: { id: "bahrain", ar: "بورصة البحرين", en: "Bahrain Bourse", assetAr: "أسهم", assetEn: "Stocks", currency: "BHD", country: "BH", exchange: "Bahrain Bourse" },
    oman: { id: "oman", ar: "بورصة عمان", en: "Oman Exchange", assetAr: "أسهم", assetEn: "Stocks", currency: "OMR", country: "OM", exchange: "Muscat Stock Exchange" },
    europe: { id: "europe", ar: "الأسواق الأوروبية", en: "European Markets", assetAr: "أسهم", assetEn: "Stocks", currency: "EUR" },
    asia: { id: "asia", ar: "الأسواق الآسيوية", en: "Asian Markets", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    technology: { id: "technology", ar: "أسهم التقنية", en: "Technology", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    ai: { id: "ai", ar: "أسهم الذكاء الاصطناعي", en: "AI Stocks", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    semiconductors: { id: "semiconductors", ar: "أشباه الموصلات", en: "Semiconductors", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    energy: { id: "energy", ar: "الطاقة", en: "Energy Stocks", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    banking: { id: "banking", ar: "البنوك", en: "Banking Stocks", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    food: { id: "food", ar: "الأغذية والاستهلاك", en: "Food / Consumer", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" },
    healthcare: { id: "healthcare", ar: "الصحة والدواء", en: "Pharma / Healthcare", assetAr: "أسهم", assetEn: "Stocks", currency: "USD" }
  };
  const ETF_SYMBOLS = new Set(["SPY", "QQQ", "VOO", "DIA", "IWM", "GLD", "SLV", "TLT", "VTI"]);
  const METAL_SYMBOLS = new Set(["XAUUSD", "XAGUSD", "GOLD", "SILVER", "GC=F", "SI=F"]);

  const EXPLORE = ["forex", "us-stocks", "kuwait", "saudi", "uae", "qatar", "bahrain", "europe", "asia", "crypto", "commodities", "indices", "etfs", "technology", "ai", "semiconductors", "energy", "banking", "healthcare", "food"];

  const SESSIONS = [
    ["New York", 11, 88, "Americas"], ["London", 27, 31, "Europe"], ["Frankfurt", 34, 35, "Europe"],
    ["Kuwait", 47, 60, "GCC"], ["Riyadh", 41, 63, "GCC"], ["Dubai", 51, 62, "GCC"],
    ["Tokyo", 44, 84, "Asia"], ["Hong Kong", 56, 80, "Asia"], ["Sydney", 64, 86, "Pacific"]
  ];

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
    rec: {}, signals: {}, signalAlerts: {}, markets: {}, news: {}, followed: {}, provider: {}, providerStatus: {}, traderStatus: {}, commandCards: {},
    calendarRange: "30", calendarLoading: false, calendarLoaded: false,
    calendarLoadingSections: { earnings: false, dividends: false, ipos: false, economic: false },
    calendar: { earnings: {}, dividends: {}, ipos: {}, economic: {} },
    calendarUi: normalizeCalendarUi(read(keys.calendarUi, {})),
    watch: read(keys.watch, []), alerts: read(keys.alerts, []), holdings: read(keys.holdings, []), localTrades: read(keys.followed, []),
    settings: read(keys.settings, { lang: "ar", defaultMarket: "us-stocks", risk: "balanced" }),
    errors: {}, analysisLoading: false,
    cache: new Map(), marketCache: new Map()
  };

  /* ─────────────────────────── Boot ─────────────────────────── */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  async function boot() {
    state.route = readRoute();
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
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(state.settings.defaultMarket)}`),
      get(`/recommendations?symbols=${encodeURIComponent(commandSymbols.join(","))}`),
      get("/market/signals?limit=60"),
      get("/market/signal-alerts?limit=50"),
      get("/markets"), get("/market-news?limit=12"), get("/followed-trades"),
      get("/trader/provider-status", { label: "providerStatus" }),
      get("/trader/status", { label: "providerStatus" })
    ]);
    const [rec, commandCards, signals, signalAlerts, mk, news, followed, providerStatus, traderStatus] = settled.map((result, index) => settledValue(result, ["quotes", "quotes", "signals", "signals", "quotes", "news", "quotes", "providerStatus", "providerStatus"][index]));
    state.rec = rec; state.commandCards = commandCards; state.signals = signals; state.signalAlerts = signalAlerts; state.markets = mk; state.news = news; state.followed = followed;
    state.providerStatus = providerStatus || {};
    state.traderStatus = traderStatus || {};
    state.provider = providerStatus.dataProvider || commandCards.dataProvider || rec.dataProvider || mk.dataProvider || news.dataProvider || commandCards.provider || rec.provider || mk.provider || news.provider || { configured: false, status: "not_configured" };
    renderAfterData();
  }

  async function get(path, options = {}) {
    return requestJson(path, { method: "GET", ...options });
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

  /* ─────────────────────────── Router ─────────────────────────── */
  function bind() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-route-link]");
      if (link) { event.preventDefault(); navigate(link.getAttribute("href")); return; }
      const tab = event.target.closest("[data-tab]");
      if (tab) { event.preventDefault(); onTab(tab); return; }
      const tf = event.target.closest("[data-timeframe]");
      if (tf) { event.preventDefault(); state.timeframe = tf.dataset.timeframe; render(); return; }
      const symbolTf = event.target.closest("[data-symbol-timeframe]");
      if (symbolTf) {
        event.preventDefault();
        state.timeframe = symbolTf.dataset.symbolTimeframe || "1Y";
        if (state.route.id === "symbol-details" && state.route.symbol) {
          state.cache.delete(sym(state.route.symbol));
          loadSymbol(state.route.symbol, true);
        }
        return;
      }
      const cr = event.target.closest("[data-calendar-range]");
      if (cr) {
        event.preventDefault();
        state.calendarRange = cr.dataset.calendarRange || "30";
        state.calendarLoading = true;
        setCalendarSectionLoading(true);
        render();
        loadCalendars(true).catch((error) => {
          devLog("calendar", "failed", { message: errorMessage(error) });
        }).finally(() => {
          state.calendarLoading = false;
          setCalendarSectionLoading(false);
          render();
          afterRoute();
        });
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
      const followTrade = event.target.closest("[data-follow-trade]");
      if (followTrade) { event.preventDefault(); followRecommendationTrade(followTrade.dataset.followTrade); return; }
      const refreshTrades = event.target.closest("[data-refresh-trades]");
      if (refreshTrades) { event.preventDefault(); refreshFollowedTrades(true); return; }
      const runSignals = event.target.closest("[data-run-signals]");
      if (runSignals) { event.preventDefault(); runSignalRefresh(); return; }
      const runAnalysis = event.target.closest("[data-run-analysis]");
      if (runAnalysis) { event.preventDefault(); runAnalysisRefresh(); return; }
      const refreshProvider = event.target.closest("[data-refresh-provider]");
      if (refreshProvider) { event.preventDefault(); refreshProviderStatus(true); return; }
      const delAlert = event.target.closest("[data-del-alert]");
      if (delAlert) { event.preventDefault(); deleteAlert(delAlert.dataset.delAlert); return; }
      const calendarRetry = event.target.closest("[data-calendar-retry]");
      if (calendarRetry) { event.preventDefault(); refreshCalendarSection(calendarRetry.dataset.calendarRetry); return; }
      const calendarToggle = event.target.closest("[data-calendar-toggle]");
      if (calendarToggle) { event.preventDefault(); toggleCalendarSection(calendarToggle.dataset.calendarToggle); return; }
      const calendarShow = event.target.closest("[data-calendar-show]");
      if (calendarShow) { event.preventDefault(); setCalendarExpanded(calendarShow.dataset.calendarShow, calendarShow.dataset.calendarMode === "more"); return; }
      const earningsFilter = event.target.closest("[data-earnings-filter]");
      if (earningsFilter) { event.preventDefault(); updateCalendarUi({ earningsFilter: earningsFilter.dataset.earningsFilter || "all", expanded: { ...(state.calendarUi.expanded || {}), earnings: false } }); return; }
      const earningsSort = event.target.closest("[data-earnings-sort]");
      if (earningsSort) { event.preventDefault(); setEarningsSort(earningsSort.dataset.earningsSort); return; }
      const retry = event.target.closest("[data-retry]");
      if (retry) { event.preventDefault(); retryRoute(); return; }
      const collapse = event.target.closest("#sidebar-collapse");
      if (collapse) { event.preventDefault(); document.getElementById("app-shell").classList.toggle("is-collapsed"); return; }
    });
    document.addEventListener("input", (event) => {
      const search = event.target.closest("[data-earnings-search]");
      if (!search) return;
      state.calendarUi.earningsSearch = search.value || "";
      state.calendarUi.expanded = { ...(state.calendarUi.expanded || {}), earnings: false };
      saveCalendarUi();
      render();
      requestAnimationFrame(() => {
        const input = document.querySelector("[data-earnings-search]");
        if (!input) return;
        input.focus();
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (_e) {}
      });
    });
    document.getElementById("symbol-search")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const symbol = sym(document.getElementById("symbol-input")?.value || "");
      if (!symbol) return toast("اكتب رمزاً أولاً، مثل AAPL أو BTCUSD.");
      navigate(`${ROOT}/symbol/${encodeURIComponent(symbol)}`);
    });
    window.addEventListener("popstate", () => { state.route = readRoute(); render(); afterRoute(); });
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
    if (state.route.id === "calendar") {
      state.calendarLoading = true;
      setCalendarSectionLoading(true);
    }
    render();
    try {
      if (state.route.id === "markets" && state.route.market) {
        state.marketCache.delete(state.route.market);
        await loadMarket(state.route.market, true);
      } else if (state.route.id === "symbol-details" && state.route.symbol) {
        state.cache.delete(sym(state.route.symbol));
        await loadSymbol(state.route.symbol, true);
      } else if (state.route.id === "calendar") {
        await loadCalendars(true);
      } else if (state.route.id === "news") {
        state.news = await get("/market-news?limit=12", { label: "news" });
      } else if (state.route.id === "ai-scanner" || state.route.id === "recommendations") {
        state.rec = {};
        state.signals = {};
        await ensureScanData(true);
      } else {
        state.marketCache.clear();
        await hydrate();
      }
      toast("تمت إعادة المحاولة.");
    } catch (error) {
      devLog("retry", "failed", { route: state.route.id, message: errorMessage(error) });
      toast(UNAVAILABLE_MESSAGE);
    } finally {
      state.calendarLoading = false;
      if (state.route.id === "calendar") setCalendarSectionLoading(false);
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
    }
  }

  /* ─────────────────────────── Render ─────────────────────────── */
  function render() {
    applyLanguageDirection();
    const title = document.getElementById("page-title");
    if (title) title.textContent = routes[state.route.id] || routes.dashboard;
    document.querySelectorAll("[data-route]").forEach((node) => node.classList.toggle("is-active", node.dataset.route === state.route.id || (state.route.id === "symbol-details" && node.dataset.route === "symbol-details")));
    status(); ticker(); statusBar();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
  }

  function isArabic() {
    return state.settings.lang !== "en";
  }

  function applyLanguageDirection() {
    const lang = isArabic() ? "ar" : "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (document.body) document.body.setAttribute("dir", document.documentElement.dir);
  }

  function afterRoute() {
    const id = state.route.id;
    if (id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
    if (id === "markets" && state.route.market) loadMarket(state.route.market);
    if (id === "ai-scanner" || id === "recommendations") ensureScanData();
    if (id === "calendar" && !state.calendarLoaded && !state.calendarLoading) {
      state.calendarLoading = true;
      setCalendarSectionLoading(true);
      render();
      loadCalendars(false).catch((error) => {
        devLog("calendar", "failed", { message: errorMessage(error) });
      }).finally(() => {
        state.calendarLoading = false;
        setCalendarSectionLoading(false);
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
    if (id === "calendar") return calendarPageCompact();
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
      <section class="panel recommendations-panel"><div class="panel-head"><div><span class="eyebrow">SYMBOLS & RECOMMENDATIONS</span><h2>الرموز والتوصيات</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>عرض الكل</a></div>${rec.length ? watchlistTable(rec.slice(0, 14)) : unavailableSection(state.rec, "لم يرجع مزود الأسعار أو التوصيات بيانات قابلة للعرض.", "الإعدادات", `${ROOT}/settings`)}</section>
      <section class="dashboard-lower-grid">
        <article class="panel"><span class="eyebrow">MARKET NEWS</span><h2>آخر الأخبار</h2>${news.length ? newsList(news.slice(0, 3)) : unavailableSection(state.news, "مزود الأخبار لم يرجع عناصر حالية.", "صفحة الأخبار", `${ROOT}/news`)}</article>
        <article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>حالة التحليل الذكي</h2>${alerts.length ? alertList(alerts) : unavailableSection(state.signals, "سيظهر التحليل عند توفر بيانات السوق والتوصيات.", "افتح الماسح", `${ROOT}/ai-scanner`)}</article>
        <article class="panel"><span class="eyebrow">SYSTEM STATUS</span><h2>حالة النظام</h2>${diagnostics()}</article>
      </section>
      ${disclaimer()}
    </div>`;
  }

  function marketsPage() {
    return `<div class="page-stack">${hero("خريطة أسواق كاملة", "الأسهم، الخليج، العملات، الكريبتو، السلع، المؤشرات، الصناديق والقطاعات. كل بطاقة تعرض العملة الخاصة بالأصل ولا ترث عملة السوق المختار.", "MARKETS")}
      <section class="market-grid">${MARKETS.map(marketCard).join("")}</section>
      <section class="panel"><span class="eyebrow">PROVIDER MARKETS</span><h2>بيانات الأسواق من المزود</h2>${providerMarkets()}</section>
    </div>`;
  }

  function marketDetailPage(id) {
    const m = MARKETS.find(x => x.id === id);
    if (!m) return marketsPage();
    const meta = marketMetadata(id);
    const marketCurrency = contextCurrency({ marketId: meta.id });
    const cached = state.marketCache.get(id);
    const list = cached ? recsFrom(cached) : [];
    const movers = cached ? sortMovers(list) : { gainers: [], losers: [], active: [] };
    const body = cached ? (list.length
      ? `<section class="metric-grid">${stat("توصيات", list.length, "Signals")}${stat("شراء", list.filter(x => signal(x) === "buy").length, "Buy")}${stat("بيع", list.filter(x => signal(x) === "sell").length, "Sell")}${stat("العملة", marketCurrency, "Currency")}</section>
         <section class="panel"><span class="eyebrow">HEATMAP</span><h2>خريطة حرارة ${h(m.ar)}</h2>${heatmap(list)}</section>
         <section class="dash-split">
           <article class="panel"><span class="eyebrow">PRICE CARDS</span><h2>الرموز والتوصيات</h2>${watchlistTable(list.slice(0, 12))}</article>
           <aside class="dash-rail">
             <article class="panel"><span class="eyebrow">TOP GAINERS</span><h2>الأكثر ارتفاعاً</h2>${movers.gainers.length ? assetList(movers.gainers.slice(0, 3)) : miniEmpty()}</article>
             <article class="panel"><span class="eyebrow">TOP LOSERS</span><h2>الأكثر انخفاضاً</h2>${movers.losers.length ? assetList(movers.losers.slice(0, 3)) : miniEmpty()}</article>
             <article class="panel"><span class="eyebrow">MOST ACTIVE</span><h2>الأكثر نشاطاً</h2>${movers.active.length ? assetList(movers.active.slice(0, 3)) : miniEmpty()}</article>
           </aside>
         </section>`
      : marketUnavailable(m, cached)) : `<div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>جاري تحميل ${h(m.ar)}</h2></div></div>`;
    return `<div class="page-stack">
      <a class="back-link" href="${ROOT}/markets" data-route-link>‹ كل الأسواق</a>
      ${hero(`${meta.ar} <span class="ltr">· ${h(meta.en)}</span>`, `${meta.assetAr} · العملة الأساسية: ${marketCurrency}. الرموز المعروضة مرجعية وتُعرض أسعارها فقط عند توفرها من المزود.`, "MARKET")}
      <section class="chip-row">${m.symbols.map(s => `<button class="badge" data-symbol-details="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</section>
      ${body}
      ${disclaimer()}
    </div>`;
  }

  function scannerPage() {
    const r = recs(), u = arr(state.rec.unavailable), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    const conf = confBuckets(r);
    return `<div class="page-stack">${hero("ماسح AI بدون نتائج مصطنعة", "يفرز الماسح التوصيات والإشارات القادمة من الـ API فقط. عند غياب المزود تظهر أسباب الغياب بوضوح.", "AI SCANNER")}
      <section class="metric-grid">${stat("فرص شراء", buy.length, "Buy signals")}${stat("فرص بيع", sell.length, "Sell signals")}${stat("انتظار", wait.length, "Wait")}${stat("غير متاح", u.length, "Unavailable")}</section>
      <section class="dash-split">
        <article class="panel"><span class="eyebrow">SCANNER RESULTS</span><h2>نتائج الفحص</h2>
          <div class="seg-tabs" role="tablist"><button class="is-active" data-tab="scan" data-value="all">الكل</button><button data-tab="scan" data-value="buy">شراء</button><button data-tab="scan" data-value="sell">بيع</button><button data-tab="scan" data-value="wait">انتظار</button></div>
          <div data-tabpanel="scan" data-render="scan">${r.length ? assetList(r) : emptyState("لا توجد نتائج فحص حية", "فعّل مزود البيانات أو اختر رمزاً لفتح صفحة التفاصيل.", "تفاصيل رمز", `${ROOT}/symbol-details`)}</div>
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">CONFIDENCE</span><h2>توزيع الثقة</h2>${confBars(conf)}</article>
          <article class="panel"><span class="eyebrow">RISK RADAR</span><h2>رادار المخاطر</h2>${riskRadar(r)}</article>
          <article class="panel"><span class="eyebrow">STRONGEST</span><h2>أقوى الإشارات</h2>${r.length ? assetList(topPicks(r, 3)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }
  window.__tabRenderers = window.__tabRenderers || {};
  window.__tabRenderers.scan = (v) => { const r = recs(); const f = v === "all" ? r : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : miniEmpty(); };
  window.__tabRenderers.rec = (v) => { const r = recs(); const f = v === "all" ? r : v === "high" ? r.filter(x => (num(x.confidence, x.score, x.aiConfidence) || 0) >= 70) : r.filter(x => v === "wait" ? !["buy", "sell"].includes(signal(x)) : signal(x) === v); return f.length ? assetList(f) : miniEmpty(); };

  function watchPage() {
    const quick = unique(defaults.concat(["EURUSD", "SPY", "2222.SR", "ETHUSD"]));
    return `<div class="page-stack">${hero("قائمة متابعة ذكية ونظيفة", "أضف الرموز التي تريد مراقبتها. الأسعار والتحليلات تظهر فقط عند توفرها من المزود، والعملة تتبع كل رمز.", "WATCHLIST")}
      <section class="panel"><span class="eyebrow">QUICK ADD</span><h2>إضافة سريعة</h2><div class="quick-actions">${quick.map(s => `<button class="ghost-btn" data-quick-add="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">MY WATCHLIST</span><h2>قائمتي (${state.watch.length})</h2></div></div>
        ${state.watch.length ? watchlistTable(state.watch.map(s => matchRec(s) || { symbol: s, name: s }), { removable: true }) : emptyState("قائمة المتابعة فارغة", "أضف رموزاً من الأعلى. لن نملأها ببيانات وهمية.", "افتح الأسواق", `${ROOT}/markets`)}
      </section></div>`;
  }

  function portfolioPage() {
    const t = trades(), h2 = state.holdings;
    const enriched = h2.map(p => ({ ...p, rec: matchRec(p.symbol) }));
    const totalCost = h2.reduce((s, p) => s + (num(p.qty) || 0) * (num(p.entry) || 0), 0);
    return `<div class="page-stack">${hero("المحفظة والمتابعة", "تابع مراكزك المحلية وصفقات المتابعة. قيمة السوق الحية تظهر عند توفر أسعار من المزود.", "PORTFOLIO")}
      <section class="metric-grid">${stat("مراكز", h2.length, "Holdings")}${stat("التكلفة", totalCost ? totalCost.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "--", "Cost basis")}${stat("صفقات متابعة", t.length, "Followed")}${stat("ملف المخاطر", riskLabel(state.settings.risk), "Risk profile")}</section>
      <section class="dash-split">
        <article class="panel"><div class="panel-head"><div><span class="eyebrow">HOLDINGS</span><h2>المراكز الحالية</h2></div></div>
          ${h2.length ? holdingsTable(enriched) : emptyState("لا توجد مراكز", "أضف مركزاً من صفحة تفاصيل الرمز أو تابع توصية حقيقية.", "تفاصيل رمز", `${ROOT}/symbol-details`)}
          ${holdingForm()}
        </article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">ALLOCATION</span><h2>توزيع الأصول</h2>${allocation(enriched)}</article>
          <article class="panel"><span class="eyebrow">FOLLOWED</span><h2>صفقات المتابعة</h2>${t.length ? tradeList(t.slice(0, 4)) : miniEmpty()}</article>
        </aside>
      </section>${disclaimer()}</div>`;
  }

  function alertsPage() {
    const smart = smartAlerts(), local = state.alerts;
    return `<div class="page-stack">${hero("مركز التنبيهات", "أنشئ تنبيهات سعرية ونسبية وتنبيهات إشارة. التنبيهات الذكية من المزود، والمحلية تُحفظ على جهازك.", "ALERTS")}
      <section class="panel"><span class="eyebrow">CREATE ALERT</span><h2>إنشاء تنبيه</h2>
        <form id="alert-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="الرمز مثل AAPL" /><select name="type"><option value="price">سعر يصل إلى</option><option value="percent">تغير نسبة %</option><option value="signal">إشارة AI</option><option value="news">خبر مؤثر</option></select><input name="value" inputmode="decimal" placeholder="القيمة" /><button class="action-btn" type="submit">إضافة</button></form>
      </section>
      <section class="alert-grid">
        <article class="panel"><span class="eyebrow">SMART ALERTS</span><h2>تنبيهات المزود</h2>${smart.length ? alertList(smart) : emptyState("لا توجد تنبيهات ذكية", "لم يرجع المزود تنبيهات حالية.", "التوصيات", `${ROOT}/recommendations`)}</article>
        <article class="panel"><span class="eyebrow">LOCAL ALERTS (${local.length})</span><h2>تنبيهاتي المحفوظة</h2>${local.length ? local.map(localAlertRow).join("") : emptyState("لا توجد تنبيهات محلية", "استخدم النموذج بالأعلى لإنشاء تنبيه متابعة.", "", "")}</article>
      </section></div>`;
  }

  function recPage() {
    const r = recs(), buy = r.filter(x => signal(x) === "buy"), sell = r.filter(x => signal(x) === "sell"), wait = r.filter(x => !["buy", "sell"].includes(signal(x)));
    return `<div class="page-stack">${hero("التوصيات والتحليل", "توصيات الذكاء مع حالة كل صفقة: مفتوحة، تحت المتابعة، مكتملة، فاشلة أو منتهية. كل بطاقة لها زر تحليل.", "RECOMMENDATIONS")}
      <section class="metric-grid">${stat("الكل", r.length, "All")}${stat("شراء", buy.length, "Buy")}${stat("بيع", sell.length, "Sell")}${stat("انتظار", wait.length, "Wait")}</section>
      <section class="panel"><span class="eyebrow">SIGNALS</span><h2>قائمة التوصيات</h2>
        <div class="seg-tabs"><button class="is-active" data-tab="rec" data-value="all">الكل</button><button data-tab="rec" data-value="buy">شراء</button><button data-tab="rec" data-value="sell">بيع</button><button data-tab="rec" data-value="wait">انتظار</button><button data-tab="rec" data-value="high">ثقة عالية</button></div>
        <div data-tabpanel="rec" data-render="rec">${r.length ? recCards(r) : unavailableSection(state.rec, "محرك التوصيات لم يرجع نتائج من المزود.", "افتح الماسح", `${ROOT}/ai-scanner`)}</div>
      </section>${disclaimer()}</div>`;
  }

  function precisionLivePanel() {
    const pl = state.followed && state.followed.precisionLive;
    if (!pl || !num(pl.total)) return "";
    const resolved = (pl.won || 0) + (pl.lost || 0);
    const liveRate = pl.successRate === null || pl.successRate === undefined ? "--" : `${pl.successRate}%`;
    return `<section class="panel precision-live-panel">
      <div class="panel-head"><div><span class="eyebrow">PRECISION · FORWARD TEST</span><h2>الدقة الحية — إشارات بوابة الـ90%</h2></div><span class="precision-badge ${resolved && pl.successRate >= 90 ? "pass" : "info"}">${h(resolved ? `نجاح حي ${liveRate}` : "بانتظار أول نتيجة")}</span></div>
      <div class="metric-grid">${stat("إشارات متتبعة", pl.total, "Tracked")}${stat("أصابت الهدف", pl.won || 0, "Won")}${stat("لمست الوقف", pl.lost || 0, "Lost")}${stat("مفتوحة", pl.open || 0, "Open")}${stat("النجاح الحي", liveRate, "Live rate")}</div>
      <p class="muted-note">كل إشارة اجتازت بوابة الدقة تُسجَّل تلقائياً بهدفها ووقفها المنشورَين، وتُحسم فوز/خسارة حسب أول ملامسة فعلية — هذا هو الإثبات الحي لنسبة النجاح، وليس الاختبار التاريخي وحده.</p>
    </section>`;
  }
  function performancePage() {
    const all = trades(), g = groupTrades(all), summary = tradeSummary(all);
    return `<div class="page-stack trade-performance-page">${hero("أداء الصفقات", "نتائج إشارات الشراء والبيع المحفوظة، صفقات المتابعة اليدوية، وسجلات التوصيات. لا تُعرض نتائج وهمية عند غياب السجلات.", "TRADE PERFORMANCE")}
      ${tradeProviderStatus(all)}
      ${precisionLivePanel()}
      <section class="metric-grid trade-summary-grid">${stat("الصفقات الرابحة", g.win.length, "Winning")}${stat("الصفقات الخاسرة", g.loss.length, "Losing")}${stat("الصفقات المفتوحة", g.open.length, "Open")}${stat("تحت المتابعة", g.follow.length, "Watching")}${stat("نسبة النجاح", summary.successRate === null ? "--" : summary.successRate + "%", "Win rate")}</section>
      ${all.length ? `<section class="trade-board">${tradeCol("الصفقات الرابحة", g.win, "win")}${tradeCol("الصفقات الخاسرة", g.loss, "loss")}${tradeCol("الصفقات المفتوحة", g.open, "open")}${tradeCol("صفقات الانتظار", g.wait, "wait")}${tradeCol("الصفقات تحت المتابعة", g.follow, "follow")}</section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">JOURNAL</span><h2>سجل تفصيلي</h2></div><button class="ghost-btn" data-refresh-trades>تحديث الأسعار</button></div>${tradeJournalTable(all)}</section>` : performanceEmptyState()}
      ${followedTradeForm()}
      ${disclaimer()}</div>`;
  }

  function newsPage() {
    const n = newsItems();
    return `<div class="page-stack">${hero("أخبار السوق", "تُقرأ الأخبار من مزود حقيقي. عند غيابه نعرض رسالة واضحة بدل عناوين مصطنعة.", "NEWS")}
      <section class="news-grid">${n.length ? n.map(newsCard).join("") : unavailableSection(state.news, "مزود الأخبار لم يرجع عناصر قابلة للعرض.", "الإعدادات", `${ROOT}/settings`)}</section></div>`;
  }

  function calendarPage() {
    const c = state.calendar || {};
    return `<div class="page-stack trader-calendar-page">${hero("تقويم السوق", "تقويم حي لأرباح الشركات والتوزيعات والاكتتابات والأحداث الاقتصادية من مزودين حقيقيين. عند تعذر البيانات نعرض السبب بوضوح بدون بيانات وهمية.", "CALENDAR")}
      <section class="panel trader-calendar-toolbar">
        <div><span class="eyebrow">DATE RANGE</span><h2>فترة العرض</h2></div>
        <div class="calendar-ranges">${calendarRangeButtons()}</div>
      </section>
      ${calendarProviderOverview()}
      <section class="calendar-grid">
        ${calendarPanel("earnings", "EARNINGS", "أرباح الشركات", c.earnings, earningsRows)}
        ${calendarPanel("dividends", "DIVIDENDS", "التوزيعات", c.dividends, dividendRows)}
        ${calendarPanel("ipos", "IPO", "الاكتتابات", c.ipos, ipoRows)}
        ${calendarPanel("economic", "ECONOMIC", "التقويم الاقتصادي", c.economic, economicRows)}
      </section></div>`;
  }

  function calendarRangeButtons() {
    const ranges = [["today", "اليوم"], ["7", "7 أيام"], ["30", "30 يوم"], ["90", "90 يوم"], ["all", "الكل"]];
    return ranges.map(([value, label]) => `<button class="${state.calendarRange === value ? "is-active" : ""}" data-calendar-range="${h(value)}" ${state.calendarLoading ? "disabled" : ""}>${h(label)}</button>`).join("");
  }

  function calendarProviderOverview() {
    const cards = calendarStatusCards();
    return `<section class="provider-state-panel trader-provider-panel calendar-provider-overview">
      <div class="panel-head">
        <div><span class="eyebrow">PROVIDER STATUS</span><h2>حالة البيانات حسب الميزة</h2></div>
        <button class="ghost-btn" data-refresh-provider>تحديث حالة المزود</button>
      </div>
      <div class="feature-status-grid">${cards.map(providerFeatureCard).join("")}</div>
      ${calendarTechnicalDetails(cards)}
    </section>`;
  }

  function calendarStatusCards() {
    const ps = state.providerStatus || {};
    const overall = normalizedProviderStatus();
    return [
      {
        key: "overall",
        label: "صحة المزود العامة",
        provider: overall.provider,
        status: providerHealthStatus(overall),
        count: overall.loadedCount,
        lastUpdated: overall.lastUpdated,
        message: providerHealthMessage(overall),
        loading: false
      },
      featureStatusFromResponse("symbols_prices", "الرموز والأسعار", state.markets && (state.markets.data || state.markets.markets || state.markets.items) ? state.markets : state.rec, {
        provider: (ps.dataProvider && (ps.dataProvider.active || ps.dataProvider.provider)) || overall.provider,
        fallbackStatus: overall.status === "rate_limited" ? "rate_limited" : "available"
      }),
      featureStatusFromResponse("earnings", "أرباح الشركات", state.calendar.earnings),
      featureStatusFromResponse("dividends", "التوزيعات", state.calendar.dividends),
      featureStatusFromResponse("ipos", "الاكتتابات", state.calendar.ipos),
      featureStatusFromResponse("economic", "التقويم الاقتصادي", state.calendar.economic),
      featureStatusFromResponse("market_news", "الأخبار", state.news)
    ];
  }

  function providerFeatureCard(card) {
    const tone = featureStatusTone(card.status);
    return `<article class="feature-status-card ${tone || "neutral"}" data-feature-card="${h(card.key)}">
      <div class="feature-status-top"><span>${h(card.label)}</span><em class="state-badge ${tone || "neutral"}">${h(featureStatusLabel(card.status))}</em></div>
      <strong>${h(providerName(card.provider))}</strong>
      <dl>
        <div><dt>آخر تحديث</dt><dd class="ltr">${h(latinDateTime(card.lastUpdated))}</dd></div>
        <div><dt>الصفوف</dt><dd class="ltr">${h(latinNumber(card.count))}</dd></div>
      </dl>
      <p>${h(card.loading ? "جاري تحديث هذه الميزة..." : card.message)}</p>
    </article>`;
  }

  function calendarPanel(kind, eyebrow, title, response, rowRenderer) {
    response = response || {};
    const rows = arr(response.data);
    const status = featureStatusFromResponse(kind, title, response);
    const loading = calendarSectionLoading(kind);
    return `<article class="panel trader-calendar-panel calendar-${h(kind)}">
      <div class="panel-head calendar-panel-head">
        <div><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-head-actions">${providerBadge(status)}${calendarRetryButton(kind, status, loading)}</div>
      </div>
      <div class="calendar-meta">
        <span>المزود: <b>${h(providerName(status.provider))}</b></span>
        <span>آخر تحديث: <b>${h(latinDateTime(status.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
        <span>الفترة: <b class="ltr">${h(rangeText(response.range))}</b></span>
        <span>النتائج: <b class="ltr">${h(latinNumber(status.count))}</b></span>
      </div>
      ${loading ? calendarLoadingState(title) : rows.length ? rowRenderer(rows) : calendarEmptyState(kind, status, response)}
    </article>`;
  }

  function providerBadge(status) {
    const tone = featureStatusTone(status.status);
    return `<span class="state-badge ${tone || "neutral"}">${h(featureStatusLabel(status.status))}</span>`;
  }

  function calendarRetryButton(kind, status, loading) {
    if (status.status === "not_configured" || status.status === "unauthorized") return "";
    return `<button class="ghost-btn compact-btn" data-calendar-retry="${h(kind)}" ${loading ? "disabled" : ""}>${loading ? "جاري التحديث" : "إعادة المحاولة"}</button>`;
  }

  function calendarLoadingState(title) {
    return `<div class="empty-state compact"><span class="empty-glyph">◌</span><h3>جاري تحديث ${h(title || "التقويم")}</h3><p>نراجع endpoint هذه الميزة ونحدّث النتائج للفترة المختارة.</p></div>`;
  }

  function calendarEmptyState(kind, statusInfo, response) {
    const status = statusInfo.status;
    let title = statusInfo.message || UNAVAILABLE_MESSAGE;
    let body = statusInfo.message || "اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.";
    let settings = status === "not_configured";
    let retry = !["not_configured", "unauthorized"].includes(status);
    if (response && response.routeUnavailable) {
      title = ROUTE_UNAVAILABLE_MESSAGE;
      body = "تعذر الوصول إلى مسار البيانات المطلوب.";
      settings = false;
      retry = true;
    } else if (response && response.timeout) {
      title = UNAVAILABLE_MESSAGE;
      body = "انتهت مهلة الطلب. يمكنك إعادة المحاولة بدون إعادة تحميل الصفحة.";
      settings = false;
      retry = true;
    } else if (status === "empty") {
      title = emptyTitleForCalendar(kind);
      body = "غيّر الفترة الزمنية أو اتركها كما هي؛ عدم وجود نتائج هنا ليس خطأ في المزود.";
      settings = false;
      retry = true;
    } else if (status === "not_configured") {
      title = "لا يوجد مزود متصل";
      body = "اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.";
    } else if (status === "unauthorized") {
      title = "الميزة غير متاحة في الخطة الحالية";
      body = "هذه البيانات غير متاحة في الخطة الحالية لمزود البيانات.";
      settings = false;
      retry = false;
    } else if (status === "rate_limited") {
      title = "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً";
      body = response && (response.cached || response.stale) ? "بيانات مخزنة مؤقتاً معروضة إلى أن يسمح المزود بتحديث جديد." : "جرّب لاحقاً أو استخدم زر إعادة المحاولة بعد دقيقة.";
      settings = false;
      retry = true;
    } else if (status === "provider_error") {
      title = UNAVAILABLE_MESSAGE;
      body = "تعذر جلب البيانات من المزود الحالي. لم يتم عرض أي بيانات بديلة.";
      settings = false;
      retry = true;
    }
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(title)}</h3><p>${h(body)}</p>${calendarSetupHelp(kind, status)}<div class="row-actions">${settings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>الإعدادات</a>` : ""}${retry ? `<button class="ghost-btn" data-calendar-retry="${h(kind)}" ${calendarSectionLoading(kind) ? "disabled" : ""}>إعادة المحاولة</button>` : ""}</div></div>`;
  }

  function featureStatusFromResponse(key, label, response, options = {}) {
    response = response || {};
    const count = featureCount(response);
    let status = normalizeFeatureStatus(response.status || response.providerStatus || response.legacyStatus || options.fallbackStatus, count);
    if (response.ok === false && response.routeUnavailable) status = "provider_error";
    if (response.ok === false && response.timeout) status = "provider_error";
    const provider = featureProvider(response, options.provider);
    return {
      key,
      label,
      status,
      provider,
      count,
      lastUpdated: response.lastUpdated || response.lastSuccessfulUpdate || response.updated_at || response.generatedAt || null,
      message: featureMessage(key, status, response),
      loading: calendarSectionLoading(key)
    };
  }

  function normalizeFeatureStatus(status, count) {
    const value = String(status || "").trim().toLowerCase();
    if (["success", "available", "healthy", "configured", "connected"].includes(value)) return count > 0 ? "available" : "empty";
    if (["empty", "no_data", "no_results"].includes(value)) return "empty";
    if (["rate_limited", "provider_rate_limited", "429", "http_429", "limited"].includes(value)) return "rate_limited";
    if (["not_entitled", "forbidden", "unauthorized", "access_denied", "401", "403"].includes(value)) return "unauthorized";
    if (["not_configured", "missing_provider", "missing_api_key", "missing"].includes(value)) return "not_configured";
    return count > 0 ? "available" : "provider_error";
  }

  function featureCount(response) {
    const values = [response && response.count, response && response.resultCount, response && response.total];
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return arr(response && (response.data || response.items || response.events || response.markets || response.results)).length;
  }

  function featureProvider(response, fallback) {
    return response && (response.provider || response.providerId || response.source || response.dataProvider?.active || response.dataProvider?.provider || fallback) || fallback || null;
  }

  function featureMessage(key, status, response) {
    if (response && /[\u0600-\u06FF]/.test(String(response.message || ""))) return response.message;
    if (status === "available") return "توجد بيانات صالحة لهذه الميزة.";
    if (status === "empty") return emptyTitleForCalendar(key);
    if (status === "rate_limited") return "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً.";
    if (status === "unauthorized") return "هذه البيانات غير متاحة في الخطة الحالية لمزود البيانات.";
    if (status === "not_configured") return "لم يتم تفعيل مزود البيانات لهذه الميزة.";
    return "تعذر تحميل البيانات من مزود هذه الميزة.";
  }

  function emptyTitleForCalendar(kind) {
    const titles = {
      dividends: "لا توجد توزيعات ضمن الفترة المحددة",
      ipos: "لا توجد اكتتابات ضمن الفترة المحددة",
      earnings: "لا توجد أرباح ضمن الفترة المحددة",
      economic: "لا توجد بيانات ضمن الفترة المحددة",
      economic_calendar: "لا توجد بيانات ضمن الفترة المحددة",
      market_news: "لا توجد أخبار ضمن الفترة المحددة",
      symbols_prices: "لا توجد بيانات أسعار أو رموز متاحة حالياً"
    };
    return titles[kind] || "لا توجد بيانات ضمن الفترة المحددة";
  }

  function calendarSetupHelp(kind, status) {
    if (status !== "not_configured" && status !== "unauthorized") return "";
    const requirements = {
      earnings: ["<code>FMP_API_KEY</code> للأرباح.", "<code>FINNHUB_API_KEY</code> كبديل للأرباح عند دعمه."],
      dividends: ["<code>FMP_API_KEY</code> للتوزيعات.", "<code>FINNHUB_API_KEY</code> كبديل للتوزيعات عند دعمه."],
      ipos: ["<code>FMP_API_KEY</code> للاكتتابات.", "تأكد أن خطة FMP تدعم IPO calendar."],
      economic: ["<code>TRADING_ECONOMICS_API_KEY</code> للتقويم الاقتصادي الأساسي.", "<code>FMP_API_KEY</code> أو <code>FINNHUB_API_KEY</code> كبديل عند دعم الخطة."]
    };
    const rows = requirements[kind] || ["فعّل مفتاح المزود المطلوب لهذه الميزة."];
    const planNote = status === "unauthorized" ? `<li>تأكد أن خطة المزود تدعم هذه البيانات.</li>` : "";
    return `<details class="calendar-setup-help">
      <summary>إعدادات هذه الميزة</summary>
      <ul>
        ${rows.map(row => `<li>${row}</li>`).join("")}
        ${planNote}
      </ul>
    </details>`;
  }

  function calendarTechnicalDetails(cards) {
    return `<details class="provider-diagnostics-panel calendar-technical-details">
      <summary>تفاصيل تقنية</summary>
      <div class="provider-diagnostic-groups">
        ${cards.map(card => `<section class="provider-diagnostic-group"><strong>${h(card.label)}</strong><ul><li><code class="ltr">${h(card.key)}</code><span>${h(card.status)} · ${h(providerName(card.provider))} · ${h(latinNumber(card.count))}</span></li></ul></section>`).join("")}
      </div>
    </details>`;
  }

  function providerHealthStatus(overall) {
    const status = normalizeFeatureStatus(overall.status, overall.loadedCount);
    if (status === "empty" && overall.configured) return "available";
    return status;
  }

  function providerHealthMessage(overall) {
    if (!overall.configured) return "مفتاح المزود غير مفعّل.";
    if (overall.status === "rate_limited") return "المزود يعمل لكن بعض المسارات محدودة مؤقتاً.";
    if (overall.status === "error") return "المزود مهيأ لكن فحص الصحة أعاد خطأ.";
    return "المزود مهيأ وفحص الاتصال الأساسي يعمل.";
  }

  function calendarSectionLoading(kind) {
    return Boolean(state.calendarLoadingSections && state.calendarLoadingSections[kind]);
  }

  function earningsRows(rows) {
    return `<div class="table-shell calendar-table"><table><thead><tr><th>الرمز</th><th>الشركة</th><th>تاريخ الإعلان</th><th>الفترة المالية</th><th>EPS المتوقع</th><th>EPS الفعلي</th><th>الإيراد المتوقع</th><th>الوقت</th><th>المصدر</th></tr></thead><tbody>${rows.map(r => `<tr><td class="ltr">${h(r.symbol || "--")}</td><td>${h(r.companyName || "--")}</td><td class="ltr">${h(latinDateOnly(r.reportDate))}</td><td class="ltr">${h(r.fiscalDateEnding || "--")}</td><td class="ltr">${h(latinNumber(r.epsEstimate))}</td><td class="ltr">${h(latinNumber(r.epsActual))}</td><td class="ltr">${h(latinNumber(r.revenueEstimate))}</td><td class="ltr">${h(r.time || "--")}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function dividendRows(rows) {
    return `<div class="table-shell calendar-table"><table><thead><tr><th>الرمز</th><th>الشركة</th><th>تاريخ الإعلان</th><th>تاريخ الاستحقاق</th><th>تاريخ التسجيل</th><th>تاريخ الدفع</th><th>التوزيع</th><th>العائد</th><th>العملة</th><th>المصدر</th></tr></thead><tbody>${rows.map(r => `<tr><td class="ltr">${h(r.symbol || "--")}</td><td>${h(r.companyName || "--")}</td><td class="ltr">${h(latinDateOnly(r.declarationDate))}</td><td class="ltr">${h(latinDateOnly(r.exDividendDate))}</td><td class="ltr">${h(latinDateOnly(r.recordDate))}</td><td class="ltr">${h(latinDateOnly(r.paymentDate))}</td><td class="ltr">${h(latinNumber(r.dividendAmount))}</td><td class="ltr">${h(percentText(r.dividendYield))}</td><td class="ltr">${h(r.currency || "--")}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function ipoRows(rows) {
    return `<div class="table-shell calendar-table"><table><thead><tr><th>الشركة</th><th>الرمز</th><th>السوق</th><th>تاريخ الاكتتاب</th><th>نطاق السعر</th><th>الأسهم</th><th>القيمة السوقية</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${rows.map(r => `<tr><td>${h(r.companyName || "--")}</td><td class="ltr">${h(r.symbol || "--")}</td><td class="ltr">${h(r.exchange || "--")}</td><td class="ltr">${h(latinDateOnly(r.ipoDate))}</td><td class="ltr">${h(r.priceRange || "--")}</td><td class="ltr">${h(latinNumber(r.shares))}</td><td class="ltr">${h(latinNumber(r.marketCap))}</td><td>${h(r.status || "--")}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function economicRows(rows) {
    return `<div class="table-shell calendar-table"><table><thead><tr><th>الوقت</th><th>الدولة</th><th>العملة</th><th>الحدث</th><th>الأهمية</th><th>السابق</th><th>المتوقع</th><th>الفعلي</th><th>المصدر</th></tr></thead><tbody>${rows.map(r => `<tr><td class="ltr">${h(latinDateTime(r.dateTimeUtc))}</td><td>${h(r.country || "--")}</td><td class="ltr">${h(r.currency || "--")}</td><td>${h(r.event || "--")}</td><td>${h(impactLabel(r.impact))}</td><td class="ltr">${h(valueText(r.previous))}</td><td class="ltr">${h(valueText(r.forecast))}</td><td class="ltr">${h(valueText(r.actual))}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function calendarPageCompact() {
    const c = state.calendar || {};
    const sections = [
      ["earnings", "EARNINGS", calendarText("أرباح الشركات", "Earnings"), c.earnings, earningsRowsCompact],
      ["dividends", "DIVIDENDS", calendarText("التوزيعات", "Dividends"), c.dividends, dividendRowsCompact],
      ["ipos", "IPO", calendarText("الاكتتابات", "IPOs"), c.ipos, ipoRowsCompact],
      ["economic", "ECONOMIC", calendarText("التقويم الاقتصادي", "Economic Calendar"), c.economic, economicRowsCompact]
    ];
    return `<div class="page-stack trader-calendar-page">${hero(calendarText("تقويم السوق", "Market Calendar"), calendarText("تقويم حي لأرباح الشركات والتوزيعات والاكتتابات والأحداث الاقتصادية من مزودين حقيقيين. عند تعذر البيانات نعرض السبب بوضوح بدون بيانات وهمية.", "Live earnings, dividends, IPOs, and economic events from real providers with clear states when data is unavailable."), "CALENDAR")}
      <section class="panel trader-calendar-toolbar">
        <div><span class="eyebrow">DATE RANGE</span><h2>${h(calendarText("فترة العرض", "Range"))}</h2></div>
        <div class="calendar-ranges">${calendarRangeButtons()}</div>
      </section>
      ${calendarProviderOverview()}
      <section class="calendar-grid">${sections.map(section => calendarPanelCompact(...section)).join("")}</section>
    </div>`;
  }

  function calendarPanelCompact(kind, eyebrow, title, response, rowRenderer) {
    response = response || {};
    const rawRows = calendarRowsFromResponse(response);
    const rows = kind === "earnings" ? rawRows.filter(earningsMeaningfulRow) : rawRows;
    const status = featureStatusFromResponse(kind, title, response);
    const loading = calendarSectionLoading(kind);
    const open = calendarSectionOpen(kind);
    const partial = kind === "earnings" && rawRows.length > 0 && (rows.length < rawRows.length || earningsPartialData(rows));
    const body = open
      ? (loading ? calendarLoadingState(title) : rows.length ? rowRenderer(rows, rawRows, response) : calendarMeaningfulEmpty(kind, status, rawRows))
      : calendarCollapsedSummary(kind, rows, status, response);
    return `<article class="panel trader-calendar-panel calendar-${h(kind)} ${open ? "is-open" : "is-collapsed"}">
      <div class="calendar-card-head">
        <button class="calendar-toggle" type="button" data-calendar-toggle="${h(kind)}" aria-expanded="${open ? "true" : "false"}" aria-label="${h(open ? calendarText("غلق", "Collapse") : calendarText("فتح", "Expand"))}">
          <span class="calendar-chevron">${open ? "⌃" : "⌄"}</span>
        </button>
        <div class="calendar-title-block"><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-header-badges">
          <span class="state-badge provider">${h(providerName(status.provider))}</span>
          ${providerBadge(status)}
          ${partial ? `<span class="state-badge warn">${h(calendarText("بيانات جزئية", "Partial data"))}</span>` : ""}
        </div>
        <div class="calendar-header-meta">
          <span>${h(calendarText("النتائج", "Items"))}: <b class="ltr">${h(latinNumber(rows.length))}</b></span>
          <span>${h(calendarText("آخر تحديث", "Updated"))}: <b class="ltr">${h(latinDateTime(status.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
          <span>${h(calendarText("الفترة", "Range"))}: <b class="ltr">${h(rangeText(response.range))}</b></span>
        </div>
        <div class="calendar-head-actions">${calendarRetryButtonCompact(kind, status, loading)}</div>
      </div>
      <div class="calendar-card-body">${body}</div>
    </article>`;
  }

  function normalizeCalendarUi(value) {
    value = value && typeof value === "object" ? value : {};
    const open = { ...DEFAULT_CALENDAR_UI.open, ...(value.open || {}) };
    const expanded = { ...(value.expanded || {}) };
    const filters = new Set(["all", "actual", "revenue", "major"]);
    const sort = value.earningsSort && typeof value.earningsSort === "object" ? value.earningsSort : DEFAULT_CALENDAR_UI.earningsSort;
    const sortKey = ["symbol", "company", "reportDate", "time", "epsActual", "epsEstimate", "surprise", "revenue", "source"].includes(sort.key) ? sort.key : "reportDate";
    return {
      open,
      expanded,
      earningsFilter: filters.has(value.earningsFilter) ? value.earningsFilter : "all",
      earningsSearch: String(value.earningsSearch || ""),
      earningsSort: { key: sortKey, dir: sort.dir === "desc" ? "desc" : "asc" }
    };
  }

  function saveCalendarUi() {
    state.calendarUi = normalizeCalendarUi(state.calendarUi);
    write(keys.calendarUi, state.calendarUi);
  }

  function updateCalendarUi(patch) {
    state.calendarUi = normalizeCalendarUi({ ...(state.calendarUi || {}), ...patch });
    saveCalendarUi();
    render();
    afterRoute();
  }

  function toggleCalendarSection(kind) {
    if (!CALENDAR_SECTION_KEYS.includes(kind)) return;
    updateCalendarUi({ open: { ...(state.calendarUi.open || {}), [kind]: !calendarSectionOpen(kind) } });
  }

  function setCalendarExpanded(kind, expanded) {
    if (!CALENDAR_SECTION_KEYS.includes(kind)) return;
    updateCalendarUi({ expanded: { ...(state.calendarUi.expanded || {}), [kind]: expanded === true } });
  }

  function setEarningsSort(key) {
    const current = state.calendarUi.earningsSort || DEFAULT_CALENDAR_UI.earningsSort;
    const dir = current.key === key && current.dir === "asc" ? "desc" : "asc";
    updateCalendarUi({ earningsSort: { key, dir }, expanded: { ...(state.calendarUi.expanded || {}), earnings: false } });
  }

  function calendarSectionOpen(kind) {
    const open = (state.calendarUi && state.calendarUi.open) || DEFAULT_CALENDAR_UI.open;
    return open[kind] !== undefined ? open[kind] !== false : kind === "earnings";
  }

  function calendarRowsFromResponse(response) {
    return arr(response && (response.data || response.items || response.events || response.results));
  }

  function calendarText(ar, en) {
    return isArabic() ? ar : en;
  }

  function calendarDash() {
    return "—";
  }

  function calendarRetryButtonCompact(kind, status, loading) {
    if (status.status === "not_configured" || status.status === "unauthorized") return "";
    return `<button class="ghost-btn compact-btn" data-calendar-retry="${h(kind)}" ${loading ? "disabled" : ""}>${h(loading ? calendarText("جاري التحديث", "Refreshing") : calendarText("إعادة المحاولة", "Retry"))}</button>`;
  }

  function calendarMeaningfulEmpty(kind, status, rawRows) {
    if (kind === "earnings" && rawRows.length) {
      return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(calendarText("لا توجد بيانات أرباح مفيدة ضمن الفترة المحددة", "No meaningful earnings data found for the selected range"))}</h3><p>${h(calendarText("استبعدنا الصفوف التي لا تحتوي على رمز وتاريخ وقيمة أرباح أو إيراد مفيدة.", "Rows without a symbol, date, and meaningful EPS or revenue were hidden."))}</p>${calendarRetryButtonCompact(kind, status, false)}</div>`;
    }
    return calendarEmptyState(kind, status, {});
  }

  function calendarCollapsedSummary(kind, rows, status, response) {
    const sample = rows.slice(0, 4).map(row => collapsedCalendarLabel(kind, row)).filter(Boolean);
    return `<div class="calendar-collapsed-summary">
      <span><b class="ltr">${h(latinNumber(rows.length))}</b><small>${h(calendarText("صفوف", "rows"))}</small></span>
      <span><small>${h(calendarText("الحالة", "status"))}</small><b>${h(featureStatusLabel(status.status))}</b></span>
      <span><small>${h(calendarText("آخر تحديث", "updated"))}</small><b class="ltr">${h(latinDateTime(status.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
      ${sample.length ? `<span><small>${h(calendarText("لمحة", "preview"))}</small><b>${h(sample.join(" · "))}</b></span>` : ""}
    </div>`;
  }

  function collapsedCalendarLabel(kind, row) {
    if (kind === "earnings") return [sym(row.symbol), row.companyName || row.company].filter(Boolean).join(" ");
    if (kind === "dividends") return [sym(row.symbol), latinDateOnly(row.exDividendDate || row.paymentDate)].filter(Boolean).join(" ");
    if (kind === "ipos") return [row.companyName || row.company, sym(row.symbol)].filter(Boolean).join(" ");
    if (kind === "economic") return [row.currency || row.country, row.event].filter(Boolean).join(" ");
    return "";
  }

  function calendarRowWindow(kind, rows) {
    const expanded = Boolean(state.calendarUi && state.calendarUi.expanded && state.calendarUi.expanded[kind]);
    const limit = expanded ? CALENDAR_EXPANDED_LIMIT : CALENDAR_PREVIEW_LIMIT;
    return { expanded, visible: rows.slice(0, limit), limit };
  }

  function calendarTableFooter(kind, total, visibleCount, expanded) {
    const hasMore = total > CALENDAR_PREVIEW_LIMIT;
    const text = total > CALENDAR_EXPANDED_LIMIT && expanded
      ? calendarText(`يتم عرض أول ${CALENDAR_EXPANDED_LIMIT} من ${total}`, `Showing first ${CALENDAR_EXPANDED_LIMIT} of ${total}`)
      : calendarText(`يتم عرض ${visibleCount} من ${total}`, `Showing ${visibleCount} of ${total}`);
    return `<div class="calendar-table-footer">
      <span>${h(text)}</span>
      ${hasMore ? `<button class="ghost-btn compact-btn" type="button" data-calendar-show="${h(kind)}" data-calendar-mode="${expanded ? "less" : "more"}">${h(expanded ? calendarText("إظهار القليل", "Show less") : calendarText("إظهار المزيد", "Show more"))}</button>` : ""}
    </div>`;
  }

  function calendarSortButton(key, label) {
    const sort = state.calendarUi.earningsSort || DEFAULT_CALENDAR_UI.earningsSort;
    const active = sort.key === key;
    const icon = active ? (sort.dir === "asc" ? "↑" : "↓") : "↕";
    return `<button type="button" data-earnings-sort="${h(key)}">${h(label)} <span>${h(icon)}</span></button>`;
  }

  function earningsRowsCompact(rows) {
    const filtered = sortedEarningsRows(filterEarningsRows(rows));
    if (!filtered.length) {
      return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(calendarText("لا توجد بيانات أرباح مفيدة ضمن الفترة المحددة", "No meaningful earnings data found for the selected range"))}</h3><p>${h(calendarText("جرّب إزالة البحث أو تغيير الفلتر السريع.", "Try clearing the search or changing the quick filter."))}</p></div>`;
    }
    const view = calendarRowWindow("earnings", filtered);
    return `${earningsControls(filtered.length, rows.length)}<div class="table-shell calendar-table"><table><thead><tr>
      <th>${calendarSortButton("symbol", calendarText("الرمز", "Symbol"))}</th>
      <th>${calendarSortButton("company", calendarText("الشركة", "Company"))}</th>
      <th>${calendarSortButton("reportDate", calendarText("تاريخ الإعلان", "Report date"))}</th>
      <th>${calendarSortButton("time", calendarText("الوقت", "Time"))}</th>
      <th>${calendarSortButton("epsActual", calendarText("EPS الفعلي", "Actual EPS"))}</th>
      <th>${calendarSortButton("epsEstimate", calendarText("EPS المتوقع", "Estimate EPS"))}</th>
      <th>${calendarSortButton("surprise", calendarText("المفاجأة", "Surprise"))}</th>
      <th>${calendarSortButton("revenue", calendarText("الإيراد", "Revenue"))}</th>
      <th>${calendarSortButton("source", calendarText("المصدر", "Source"))}</th>
    </tr></thead><tbody>${view.visible.map(r => `<tr>
      <td class="ltr strong-symbol">${h(sym(r.symbol) || calendarDash())}</td>
      <td>${h(r.companyName || r.company || calendarDash())}</td>
      <td class="ltr">${h(latinDateOnly(r.reportDate || r.date))}</td>
      <td class="ltr">${h(r.time || r.reportTime || calendarDash())}</td>
      <td class="ltr">${h(formatEarningsNumber(earningsActualEps(r)))}</td>
      <td class="ltr">${h(formatEarningsNumber(earningsEstimateEps(r)))}</td>
      <td class="ltr">${h(formatEarningsNumber(earningsSurprise(r)))}</td>
      <td class="ltr">${h(formatRevenueValue(r))}</td>
      <td>${h(providerName(r.provider || r.source))}</td>
    </tr>`).join("")}</tbody></table></div>${calendarTableFooter("earnings", filtered.length, view.visible.length, view.expanded)}`;
  }

  function earningsControls(filteredCount, totalCount) {
    const ui = state.calendarUi || DEFAULT_CALENDAR_UI;
    const filters = [
      ["all", calendarText("الكل", "All")],
      ["actual", calendarText("EPS فعلي", "Actual EPS")],
      ["revenue", calendarText("إيراد", "Revenue")],
      ["major", calendarText("الشركات الكبرى", "Major")]
    ];
    return `<div class="calendar-controls">
      <input type="search" data-earnings-search value="${h(ui.earningsSearch || "")}" placeholder="${h(calendarText("بحث بالرمز أو الشركة", "Search symbol or company"))}" aria-label="${h(calendarText("بحث أرباح الشركات", "Search earnings"))}">
      <div class="calendar-filter-pills">${filters.map(([key, label]) => `<button type="button" data-earnings-filter="${h(key)}" aria-pressed="${ui.earningsFilter === key ? "true" : "false"}">${h(label)}</button>`).join("")}</div>
      <span class="calendar-filter-count"><b class="ltr">${h(latinNumber(filteredCount))}</b> / <span class="ltr">${h(latinNumber(totalCount))}</span></span>
    </div>`;
  }

  function filterEarningsRows(rows) {
    const ui = state.calendarUi || DEFAULT_CALENDAR_UI;
    const query = String(ui.earningsSearch || "").trim().toLowerCase();
    return rows.filter(row => {
      if (!earningsMeaningfulRow(row)) return false;
      if (query) {
        const haystack = `${sym(row.symbol)} ${row.companyName || ""} ${row.company || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (ui.earningsFilter === "actual") return earningsActualEps(row) !== null;
      if (ui.earningsFilter === "revenue") return earningsRevenueValue(row) !== null;
      if (ui.earningsFilter === "major") return isMajorEarningsRow(row);
      return true;
    });
  }

  function sortedEarningsRows(rows) {
    const sort = (state.calendarUi && state.calendarUi.earningsSort) || DEFAULT_CALENDAR_UI.earningsSort;
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => compareCalendarValues(earningsSortValue(a, sort.key), earningsSortValue(b, sort.key)) * dir);
  }

  function compareCalendarValues(a, b) {
    const emptyA = a === null || a === undefined || a === "";
    const emptyB = b === null || b === undefined || b === "";
    if (emptyA && emptyB) return 0;
    if (emptyA) return 1;
    if (emptyB) return -1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  }

  function earningsSortValue(row, key) {
    if (key === "symbol") return sym(row.symbol);
    if (key === "company") return row.companyName || row.company || "";
    if (key === "time") return row.time || row.reportTime || "";
    if (key === "epsActual") return earningsActualEps(row);
    if (key === "epsEstimate") return earningsEstimateEps(row);
    if (key === "surprise") return earningsSurprise(row);
    if (key === "revenue") return earningsRevenueValue(row);
    if (key === "source") return providerName(row.provider || row.source);
    return Date.parse(row.reportDate || row.date || "") || 0;
  }

  function earningsMeaningfulRow(row) {
    if (!sym(row && row.symbol)) return false;
    if (!(row.reportDate || row.date)) return false;
    return earningsActualEps(row) !== null || earningsEstimateEps(row) !== null || earningsRevenueValue(row) !== null;
  }

  function earningsPartialData(rows) {
    if (!rows.length) return false;
    const weak = rows.filter(row => {
      const meaningful = [earningsActualEps(row), earningsEstimateEps(row), earningsRevenueValue(row)].filter(value => value !== null).length;
      return meaningful <= 1 || earningsSurprise(row) === null;
    }).length;
    return weak / rows.length >= 0.45;
  }

  function earningsActualEps(row) {
    const value = num(row && row.epsActual, row && row.actualEps, row && row.actualEPS);
    if (value === null) return null;
    if (value !== 0) return value;
    if (row.epsActualIsRealZero === true || row.actualEpsReported === true || row.epsActualReported === true) return 0;
    const surprise = num(row.epsSurprise, row.surprise, row.surpriseAmount);
    const revenueActual = num(row.revenueActual, row.actualRevenue, row.revenue);
    const estimate = earningsEstimateEps(row);
    if (surprise !== null || revenueActual !== null || (estimate !== null && estimate === 0)) return 0;
    return null;
  }

  function earningsEstimateEps(row) {
    return num(row && row.epsEstimate, row && row.estimateEps, row && row.estimatedEPS);
  }

  function earningsSurprise(row) {
    const explicit = num(row && row.epsSurprise, row && row.surprise, row && row.surpriseAmount);
    if (explicit !== null) return explicit;
    const actual = earningsActualEps(row);
    const estimate = earningsEstimateEps(row);
    if (actual !== null && estimate !== null) return actual - estimate;
    return null;
  }

  function earningsRevenueValue(row) {
    return num(row && row.revenueActual, row && row.actualRevenue, row && row.revenue, row && row.revenueEstimate, row && row.revenueEstimated, row && row.estimatedRevenue);
  }

  function isMajorEarningsRow(row) {
    const symbol = sym(row && row.symbol);
    const marketCap = num(row && row.marketCap, row && row.market_cap);
    return MAJOR_EARNINGS_SYMBOLS.has(symbol) || row.isLargeCap === true || row.largeCap === true || (marketCap !== null && marketCap >= 100_000_000_000);
  }

  function formatEarningsNumber(value) {
    const parsed = num(value);
    if (parsed === null) return calendarDash();
    if (Math.abs(parsed) >= 1000) return latinNumber(Math.round(parsed));
    return latinNumber(Number.isInteger(parsed) ? parsed : Number(parsed.toFixed(3)));
  }

  function formatRevenueValue(row) {
    const actual = num(row && row.revenueActual, row && row.actualRevenue, row && row.revenue);
    const estimate = num(row && row.revenueEstimate, row && row.revenueEstimated, row && row.estimatedRevenue);
    if (actual !== null) return formatRevenueNumber(actual);
    if (estimate !== null) return `${formatRevenueNumber(estimate)} ${calendarText("متوقع", "est")}`;
    return calendarDash();
  }

  function formatRevenueNumber(value) {
    const parsed = num(value);
    if (parsed === null) return calendarDash();
    const abs = Math.abs(parsed);
    if (abs >= 1_000_000_000) return `${latinNumber((parsed / 1_000_000_000).toFixed(2))}B`;
    if (abs >= 1_000_000) return `${latinNumber((parsed / 1_000_000).toFixed(1))}M`;
    if (abs >= 1_000) return `${latinNumber((parsed / 1_000).toFixed(1))}K`;
    return latinNumber(parsed);
  }

  function dividendRowsCompact(rows) {
    const view = calendarRowWindow("dividends", rows);
    return `<div class="table-shell calendar-table"><table><thead><tr><th>${h(calendarText("الرمز", "Symbol"))}</th><th>${h(calendarText("الشركة", "Company"))}</th><th>${h(calendarText("تاريخ الإعلان", "Declaration"))}</th><th>${h(calendarText("تاريخ الاستحقاق", "Ex-date"))}</th><th>${h(calendarText("تاريخ التسجيل", "Record"))}</th><th>${h(calendarText("تاريخ الدفع", "Payment"))}</th><th>${h(calendarText("التوزيع", "Dividend"))}</th><th>${h(calendarText("العائد", "Yield"))}</th><th>${h(calendarText("العملة", "Currency"))}</th><th>${h(calendarText("المصدر", "Source"))}</th></tr></thead><tbody>${view.visible.map(r => `<tr><td class="ltr">${h(r.symbol || calendarDash())}</td><td>${h(r.companyName || calendarDash())}</td><td class="ltr">${h(latinDateOnly(r.declarationDate))}</td><td class="ltr">${h(latinDateOnly(r.exDividendDate))}</td><td class="ltr">${h(latinDateOnly(r.recordDate))}</td><td class="ltr">${h(latinDateOnly(r.paymentDate))}</td><td class="ltr">${h(formatEarningsNumber(r.dividendAmount))}</td><td class="ltr">${h(percentText(r.dividendYield))}</td><td class="ltr">${h(r.currency || calendarDash())}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>${calendarTableFooter("dividends", rows.length, view.visible.length, view.expanded)}`;
  }

  function ipoRowsCompact(rows) {
    const view = calendarRowWindow("ipos", rows);
    return `<div class="table-shell calendar-table"><table><thead><tr><th>${h(calendarText("الشركة", "Company"))}</th><th>${h(calendarText("الرمز", "Symbol"))}</th><th>${h(calendarText("السوق", "Exchange"))}</th><th>${h(calendarText("تاريخ الاكتتاب", "IPO date"))}</th><th>${h(calendarText("نطاق السعر", "Price range"))}</th><th>${h(calendarText("الأسهم", "Shares"))}</th><th>${h(calendarText("القيمة السوقية", "Market cap"))}</th><th>${h(calendarText("الحالة", "Status"))}</th><th>${h(calendarText("المصدر", "Source"))}</th></tr></thead><tbody>${view.visible.map(r => `<tr><td>${h(r.companyName || calendarDash())}</td><td class="ltr">${h(r.symbol || calendarDash())}</td><td class="ltr">${h(r.exchange || calendarDash())}</td><td class="ltr">${h(latinDateOnly(r.ipoDate))}</td><td class="ltr">${h(r.priceRange || calendarDash())}</td><td class="ltr">${h(formatEarningsNumber(r.shares))}</td><td class="ltr">${h(formatRevenueNumber(num(r.marketCap)))}</td><td>${h(r.status || calendarDash())}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>${calendarTableFooter("ipos", rows.length, view.visible.length, view.expanded)}`;
  }

  function economicRowsCompact(rows) {
    const view = calendarRowWindow("economic", rows);
    return `<div class="table-shell calendar-table"><table><thead><tr><th>${h(calendarText("الوقت", "Time"))}</th><th>${h(calendarText("الدولة", "Country"))}</th><th>${h(calendarText("العملة", "Currency"))}</th><th>${h(calendarText("الحدث", "Event"))}</th><th>${h(calendarText("الأهمية", "Impact"))}</th><th>${h(calendarText("السابق", "Previous"))}</th><th>${h(calendarText("المتوقع", "Forecast"))}</th><th>${h(calendarText("الفعلي", "Actual"))}</th><th>${h(calendarText("المصدر", "Source"))}</th></tr></thead><tbody>${view.visible.map(r => `<tr><td class="ltr">${h(latinDateTime(r.dateTimeUtc))}</td><td>${h(r.country || calendarDash())}</td><td class="ltr">${h(r.currency || calendarDash())}</td><td>${h(r.event || calendarDash())}</td><td>${h(impactLabel(r.impact))}</td><td class="ltr">${h(valueText(r.previous))}</td><td class="ltr">${h(valueText(r.forecast))}</td><td class="ltr">${h(valueText(r.actual))}</td><td>${h(providerName(r.provider))}</td></tr>`).join("")}</tbody></table></div>${calendarTableFooter("economic", rows.length, view.visible.length, view.expanded)}`;
  }

  function featureStatusTone(status) {
    status = String(status || "");
    if (status === "success" || status === "available" || status === "configured") return "ok";
    if (status === "empty" || status === "not_configured") return "neutral";
    if (["not_entitled", "forbidden", "unauthorized", "rate_limited"].includes(status)) return "warn";
    if (status === "provider_error" || status === "invalid_request" || status === "error") return "bad";
    return "neutral";
  }

  function featureStatusLabel(status) {
    status = String(status || "not_configured");
    if (!isArabic()) {
      const englishLabels = {
        success: "Available",
        available: "Available",
        empty: "No data",
        configured: "Connected",
        connected: "Connected",
        healthy: "Connected",
        partial: "Partial data",
        degraded: "Partial data",
        missing: "Not configured",
        error: "Provider error",
        not_configured: "Not configured",
        not_entitled: "Plan limited",
        forbidden: "Plan limited",
        unauthorized: "Plan limited",
        rate_limited: "Rate limited",
        provider_error: "Unavailable",
        invalid_request: "Invalid request"
      };
      return englishLabels[status] || status;
    }
    const labels = {
      success: "متاح",
      available: "متاح",
      empty: "لا توجد بيانات",
      configured: "متصل",
      connected: "متصل",
      healthy: "متصل",
      partial: "جزئي",
      degraded: "جزئي",
      missing: "غير مفعّل",
      error: "خطأ مزود",
      not_configured: "غير مفعّل",
      not_entitled: "غير مدعوم في الخطة",
      forbidden: "غير مدعوم في الخطة",
      unauthorized: "غير مدعوم في الخطة",
      rate_limited: "محدود مؤقتاً",
      provider_error: "تعذر التحميل",
      invalid_request: "طلب غير صالح"
    };
    return labels[status] || status;
  }

  function providerName(provider) {
    const names = {
      fmp: "FMP",
      finnhub: "Finnhub",
      twelve_data: "Twelve Data",
      twelvedata: "Twelve Data",
      "twelve data": "Twelve Data",
      tradingeconomics: "Trading Economics",
      yahoo: "Yahoo Finance",
      "yahoo finance": "Yahoo Finance",
      manual: "إدخال يدوي"
    };
    const raw = String(provider || "").trim();
    return names[raw.toLowerCase()] || raw || "غير متصل";
  }

  function resultCountText(value) { return value === null || value === undefined ? "--" : `${latinNumber(value)} نتيجة`; }
  function valueText(value) { return value === null || value === undefined || value === "" ? "--" : String(value); }
  function percentText(value) { return value === null || value === undefined || value === "" ? "--" : `${latinNumber(value)}%`; }
  function impactLabel(value) { const v = String(value || "unknown"); return v === "high" ? "مرتفع" : v === "medium" ? "متوسط" : v === "low" ? "منخفض" : "غير محدد"; }
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
    const raw = String(value).trim();
    const numeric = /^\d{10,13}$/.test(raw) ? Number(raw) : null;
    const date = numeric === null ? new Date(value) : new Date(raw.length === 10 ? numeric * 1000 : numeric);
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function educationPage() {
    const cats = Object.keys(LESSONS);
    return `<div class="page-stack">${hero("مركز التعليم", "تعليم مختصر يوضح قيود المنصة: لا توصيات بدون بيانات، لا أسعار وهمية، وكل رمز له عملته.", "EDUCATION")}
      ${cats.map((c, i) => `<section class="panel accordion ${i === 0 ? "is-open" : ""}"><button class="acc-head" data-acc>${h(c)}<span class="acc-icon">+</span></button><div class="acc-body"><div class="education-grid">${LESSONS[c].map(([t, b]) => `<article class="lesson-card"><span class="eyebrow">LESSON</span><strong>${h(t)}</strong><p>${h(b)}</p></article>`).join("")}</div></div></section>`).join("")}
    </div>`;
  }

  function settingsPage() {
    const s = state.settings;
    const prefs = signalPrefs();
    const marketOptions = ["US", "Kuwait", "Saudi", "UAE", "Qatar", "Bahrain", "Oman", "Forex", "Crypto", "Commodities"];
    return `<div class="page-stack">${hero("إعدادات النظام", "حالة المزود وتفضيلات العرض وسلوك البيانات. توضح لماذا قد تكون التوصيات أو الأخبار فارغة.", "SETTINGS")}
      <section class="settings-grid">
        <article class="panel"><span class="eyebrow">PROVIDER</span><h2>مزود البيانات</h2>${diagnostics()}<div class="row-actions"><button class="ghost-btn" data-retry>إعادة الفحص</button></div></article>
        <article class="panel"><span class="eyebrow">SIGNAL PREFERENCES</span><h2>تفضيلات الإشارات</h2>
          <form id="settings-form" class="stack-form">
            <label>السوق الافتراضي<select name="defaultMarket">${MARKETS.map(m => `<option value="${m.id}" ${s.defaultMarket === m.id ? "selected" : ""}>${h(m.ar)}</option>`).join("")}</select></label>
            <label>ملف المخاطر<select name="risk">${["conservative", "balanced", "aggressive"].map(r => `<option value="${r}" ${s.risk === r ? "selected" : ""}>${riskLabel(r)}</option>`).join("")}</select></label>
            <label>حد الثقة الأدنى<input name="signalMinConfidence" inputmode="numeric" value="${h(prefs.minConfidence)}" /></label>
            <label>الأسواق المفعلة<select name="enabledMarkets" multiple>${marketOptions.map(m => `<option value="${h(m)}" ${prefs.enabledMarkets.includes(m) ? "selected" : ""}>${h(m)}</option>`).join("")}</select></label>
            <label><input type="checkbox" name="buyAlertsEnabled" ${prefs.buyAlertsEnabled ? "checked" : ""} /> تنبيهات الشراء</label>
            <label><input type="checkbox" name="sellAlertsEnabled" ${prefs.sellAlertsEnabled ? "checked" : ""} /> تنبيهات البيع</label>
            <label><input type="checkbox" name="waitAlertsEnabled" ${prefs.waitAlertsEnabled ? "checked" : ""} /> تنبيهات الانتظار والمراقبة</label>
            <label><input type="checkbox" name="inAppAlertsEnabled" ${prefs.inAppAlertsEnabled ? "checked" : ""} /> تنبيهات داخل المنصة</label>
            <label><input type="checkbox" name="emailAlertsEnabled" ${prefs.emailAlertsEnabled ? "checked" : ""} /> البريد الإلكتروني عند توفر الخدمة</label>
            <button class="action-btn" type="submit">حفظ</button>
          </form>
        </article>
        <article class="panel"><span class="eyebrow">DATA POLICY</span><h2>سياسة البيانات</h2>
          <div class="status-card"><strong>اللغة والاتجاه</strong><p>الواجهة عربية RTL، والرموز والمؤشرات LTR بعزل كامل لمنع تداخل النص.</p><span class="state-badge ok">RTL/LTR clean</span></div>
          <div class="status-card"><strong>لا بيانات وهمية</strong><p>لا نولّد أسعاراً أو توصيات بديلة عند غياب المزود.</p><span class="state-badge warn">No fake market data</span></div>
        </article>
        <article class="panel"><span class="eyebrow">ABOUT</span><h2>حول المنصة</h2><div class="status-card"><strong>the-sfm trader</strong><p>منصة تداول وتحليل ذكية. إصدار ${VER}.</p><span class="state-badge">Powered by M.ALQ</span></div></article>
      </section>${disclaimer()}</div>`;
  }

  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero("تفاصيل الرمز", "اكتب رمزاً في البحث العلوي لفتح صفحة تحليل مخصصة. أمثلة: AAPL, BTCUSD, XAUUSD, KFH.KW", "SYMBOL DETAILS")}<section class="panel">${emptyState("لم يتم اختيار رمز", "استخدم البحث العلوي أو أزرار التفاصيل من الأسواق والتوصيات.", "الأسواق", `${ROOT}/markets`)}</section></div>`;
    return `<div class="page-stack"><a class="back-link" href="${ROOT}/markets" data-route-link>‹ الأسواق</a>
      ${hero(`تحليل <span class="ltr">${h(symbol)}</span>`, "صفحة تفاصيل حقيقية لكل رمز تعرض الملف والعملة والمصدر والتحليل عند توفرها من المزود.", "SYMBOL DETAILS")}
      <section id="symbol-details-body"><div class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>جاري فحص <span class="ltr">${h(symbol)}</span></h2></div></div></section>${disclaimer()}</div>`;
  }

  /* ───────────────────── Async loaders ───────────────────── */
  function setCalendarSectionLoading(value, kind) {
    const sections = { ...(state.calendarLoadingSections || {}) };
    const keys = kind ? [kind] : ["earnings", "dividends", "ipos", "economic"];
    keys.forEach(key => { sections[key] = Boolean(value); });
    state.calendarLoadingSections = sections;
  }

  function calendarEndpoint(kind) {
    const endpoints = { earnings: "earnings", dividends: "dividends", ipos: "ipos", economic: "economic" };
    return endpoints[kind] || null;
  }

  function calendarQuery(force) {
    const params = new URLSearchParams({ range: state.calendarRange || "30" });
    if (force) params.set("refresh", "1");
    const symbols = unique([...(state.watch || []), ...defaults]);
    if (symbols.length) params.set("symbols", symbols.join(","));
    return params.toString();
  }
  async function loadCalendarFeature(kind, force) {
    const endpoint = calendarEndpoint(kind);
    if (!endpoint) return null;
    const response = await get(`/trader/calendar/${endpoint}?${calendarQuery(force)}`, { label: "calendar" });
    state.calendar = { ...(state.calendar || {}), [kind]: response || {} };
    state.calendarLoaded = true;
    return response;
  }
  async function refreshCalendarSection(kind) {
    kind = calendarEndpoint(kind) ? kind : "";
    if (!kind || calendarSectionLoading(kind)) return;
    setCalendarSectionLoading(true, kind);
    render();
    try {
      await loadCalendarFeature(kind, true);
      toast("تم تحديث هذه الميزة.");
    } catch (error) {
      devLog("calendar", "failed", { feature: kind, message: errorMessage(error) });
      toast(UNAVAILABLE_MESSAGE);
    } finally {
      setCalendarSectionLoading(false, kind);
      render();
    }
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
  async function loadMarket(id, force = false) {
    if (!force && state.marketCache.has(id)) { render(); return; }
    const m = MARKETS.find(x => x.id === id); if (!m) return;
    const settled = await Promise.allSettled([
      get(`/recommendations?market=${marketApi(m.apiMarket)}`, { label: "quotes" }),
      get(`/market/signals?symbols=${encodeURIComponent(m.symbols.join(","))}&limit=${m.symbols.length}`, { label: "signals" })
    ]);
    const [data, signals] = settled.map((result, index) => settledValue(result, index === 0 ? "quotes" : "signals"));
    state.marketCache.set(id, { ...data, signals: signals.signals || signals.items || [] });
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
    if (!force && state.cache.has(key)) { target.innerHTML = symbolContent(state.cache.get(key)); return; }
    try {
      const settled = await Promise.allSettled([
        get(`/market/asset-profile?symbol=${encodeURIComponent(key)}`, { label: "quotes" }),
        get(`/market/search?q=${encodeURIComponent(key)}&limit=5`, { label: "quotes" }),
        get(`/market/technical-analysis?symbol=${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/signals/${encodeURIComponent(key)}`, { label: "signals" }),
        get(`/market/history?symbol=${encodeURIComponent(key)}&range=${encodeURIComponent(state.timeframe || "1Y")}`, { label: "quotes" })
      ]);
      const [profile, search, tech, sig, hist] = settled.map((result, index) => settledValue(result, index === 2 || index === 3 ? "signals" : "quotes"));
      const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
      const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
      const rawTech = tech.ok ? (tech.analysis || tech.data || tech) : (tech.available || null);
      const historyPoints = normalizeChartData(hist.chartData || hist.chart_data || hist.points || hist.history || hist.data || hist.candles);
      const techAsset = rawTech && typeof rawTech === "object" ? {
        price: rawTech.currentPrice || rawTech.price,
        currentPrice: rawTech.currentPrice || rawTech.price,
        currency: rawTech.currency,
        source: rawTech.source,
        exchange: rawTech.exchange || rawTech.market,
        exchangeCode: rawTech.exchangeCode || rawTech.exchange_code,
        market: rawTech.market,
        country: rawTech.country,
        assetType: rawTech.assetType || rawTech.asset_type,
        metadataDiagnostics: rawTech.metadataDiagnostics || rawTech.metadata_diagnostics,
        chartData: historyPoints,
        history: historyPoints
      } : historyPoints.length ? { history: historyPoints } : {};
      const rec = sig && (sig.signal || sig.item) ? signalToRec(sig.signal || sig.item) : matchRec(key);
      const providerStatus = rawTech?.providerStatus || hist.providerStatus || profile.providerStatus || rawProfile.providerStatus || (rec && rec.providerStatus) || {};
      const asset = norm({ symbol: key, ...found, ...rawProfile, ...(rec || {}), ...techAsset, providerStatus, chartData: historyPoints, history: historyPoints });
      const detail = {
        asset, tech: rawTech, providerStatus,
        available: Boolean((profile.ok && (rawProfile.symbol || found.symbol || found.name)) || rawTech || historyPoints.length),
        source: asset.source || profile.source || search.source || (rawTech && rawTech.source) || "--",
        message: profile.message || search.message || UNAVAILABLE_MESSAGE,
        rec
      };
      state.cache.set(key, detail);
      if (state.route.id === "symbol-details" && state.route.symbol === key) target.innerHTML = symbolContent(detail);
    } catch (error) {
      devLog("quotes", "failed", { route: "symbol-details", symbol: key, message: errorMessage(error) });
      target.innerHTML = `<div class="panel">${emptyState(UNAVAILABLE_MESSAGE, errorMessage(error), "الإعدادات", `${ROOT}/settings`)}</div>`;
    }
  }

  function isBuySignalName(value) { return value === "buy" || value === "cautious_buy"; }
  function isSellSignalName(value) { return value === "sell" || value === "sell_or_avoid"; }
  function signalToneClass(value) {
    if (value === "buy") return "ok";
    if (value === "cautious_buy") return "cautious";
    if (isSellSignalName(value)) return "warn";
    if (value === "insufficient_data") return "muted";
    return "";
  }
  function signalCardClass(value) {
    if (isBuySignalName(value)) return "buy";
    if (isSellSignalName(value)) return "sell";
    if (value === "insufficient_data") return "unavailable";
    return "watch";
  }
  function riskMetricsFromPrices(current, target, stop) {
    const upsidePercent = current !== null && current > 0 && target !== null ? ((target - current) / current) * 100 : null;
    const downsidePercent = current !== null && current > 0 && stop !== null ? ((current - stop) / current) * 100 : null;
    const riskRewardRatio = upsidePercent !== null && downsidePercent !== null && downsidePercent !== 0 ? upsidePercent / downsidePercent : null;
    return {
      upsidePercent: upsidePercent === null ? null : Math.round(upsidePercent * 100) / 100,
      downsidePercent: downsidePercent === null ? null : Math.round(downsidePercent * 100) / 100,
      riskRewardRatio: riskRewardRatio === null ? null : Math.round(riskRewardRatio * 100) / 100
    };
  }
  function classifySignalMetrics({ current, target, stop, confidence, dataQuality }) {
    const metrics = riskMetricsFromPrices(current, target, stop);
    const conf = confidence === null ? 0 : Math.max(0, Math.min(100, Math.round(confidence)));
    let signal = "watch";
    let explanation = "لا توجد إشارة تداول كافية حالياً.";
    if (current === null || current <= 0 || target === null || target <= 0 || dataQuality === "unavailable") {
      signal = "insufficient_data";
      explanation = "البيانات الفنية غير مكتملة.";
    } else if (target < current && conf >= 55) {
      signal = "sell_or_avoid";
      explanation = "الهدف أدنى من السعر الحالي والثقة تدعم تجنب الصفقة أو البيع.";
    } else if (target > current && conf >= 60 && (metrics.riskRewardRatio ?? Number.NEGATIVE_INFINITY) >= 1.5) {
      signal = "buy";
      explanation = "الهدف أعلى من السعر الحالي ونسبة العائد إلى المخاطرة كافية للشراء.";
    } else if (target > current && conf >= 50) {
      signal = "cautious_buy";
      explanation = metrics.riskRewardRatio !== null && metrics.riskRewardRatio < 1.5
        ? "الهدف أعلى من السعر الحالي، لكن الثقة متوسطة ونسبة العائد إلى المخاطرة غير كافية للشراء القوي."
        : "الهدف أعلى من السعر الحالي، لكن الثقة متوسطة.";
    } else if (target <= current && stop !== null && stop < current) {
      explanation = "الهدف لا يتجاوز السعر الحالي، لذلك تبقى الإشارة للمراقبة.";
    } else if (target > current) {
      explanation = "الهدف أعلى من السعر الحالي، لكن الثقة دون الحد الأدنى.";
    }
    return { signal, explanation, ...metrics };
  }
  function formatSignalPercent(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : `${Number(value).toFixed(2)}%`;
  }
  function formatRiskRewardRatio(value) {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : `${Number(value).toFixed(2)}:1`;
  }
  function isInWatchlist(symbol) {
    const s = sym(symbol);
    return state.watch.some(item => sym(item) === s);
  }
  function watchlistStatusLabel(symbol) {
    return isInWatchlist(symbol) ? "في قائمة المتابعة" : "غير مضافة للمتابعة";
  }
  function tradeMetricsForAsset(asset) {
    const a = norm(asset);
    const current = num(a.currentPrice, a.current_price, a.price, a.lastPrice, a.regularMarketPrice, a.close);
    const entry = num(a.entryPrice, a.entry, current);
    const target = num(a.targetPrice, a.target_price, a.target, a.priceTarget, a.target1);
    const stop = num(a.stopLoss, a.stop_loss, a.stop, a.stopPrice);
    const confidence = num(a.confidence, a.score, a.aiConfidence);
    const dataQuality = String(a.dataQuality || a.data_quality || (current === null ? "unavailable" : "partial")).toLowerCase();
    const classification = classifySignalMetrics({ current, target, stop, confidence, dataQuality });
    const pnlPercent = current !== null && entry !== null && entry !== 0 ? ((current - entry) / entry) * 100 : null;
    return { current, entry, target, stop, confidence, pnlPercent, signal: classification.signal, explanation: classification.explanation, upsidePercent: classification.upsidePercent, downsidePercent: classification.downsidePercent, riskRewardRatio: classification.riskRewardRatio };
  }

  function legacySymbolContent(detail) {
    const a = detail.asset, c = currency(a), recMetrics = detail.rec ? tradeMetricsForAsset(detail.rec) : null, sig = recMetrics ? recMetrics.signal : null;
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, detail.rec && detail.rec.currentPrice);
    const chg = changePercentValue(a);
    const ps = detail.providerStatus || {};
    const providerSymbolUsed = ps.providerSymbolUsed || a.providerSymbol || (detail.rec && detail.rec.providerSymbol) || "غير متاح";
    const fallbackUsed = ps.fallbackUsed === true ? "نعم" : ps.fallbackUsed === false ? "لا" : "غير متاح";
    const lastUpdated = latinDateTime(ps.lastUpdated || a.updatedAt || (detail.rec && detail.rec.lastUpdated));
    const quality = ps.dataQuality ? dataQualityLabel(ps.dataQuality) : "غير متاح";
    return `<div class="detail-layout">
      <article class="panel detail-main">
        <div class="asset-head big">${logo(a, "lg")}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || "اسم الأصل غير متوفر من المزود")}</small></div>
          ${sig ? `<span class="state-badge ${signalToneClass(sig)} big">${h(sigLabel(sig))}</span>` : ""}</div>
        <div class="detail-grid">${detailCard("السعر", price(p, c), "Price")}${detailCard("التغير", change(chg), "Change")}${detailCard("العملة", c, "Currency")}${detailCard("النوع", a.assetType || assetType(a.symbol), "Type")}${detailCard("السوق", a.exchange || a.market || "--", "Exchange")}${detailCard("المصدر", detail.source || "--", "Source")}</div>
        <div class="detail-grid">${detailCard("رمز المزود المستخدم", providerSymbolUsed, "Provider symbol")}${detailCard("استخدم fallback؟", fallbackUsed, "Fallback")}${detailCard("آخر تحديث", lastUpdated === "--" ? "غير متاح" : lastUpdated, "Last updated")}${detailCard("جودة البيانات", quality, "Data quality")}</div>
        <div class="card-actions"><button class="action-btn" data-quick-add="${h(a.symbol)}">أضف للمتابعة</button><button class="ghost-btn" data-create-alert="${h(a.symbol)}">أنشئ تنبيه</button></div>
        ${miniChart(a)}
      </article>
      <aside class="detail-side">
        <article class="panel consensus-panel"><span class="eyebrow">STRATEGY CONSENSUS</span><h2>إجماع الاستراتيجيات</h2>${strategyConsensus(a, detail.tech, detail.rec)}</article>
        <article class="panel"><span class="eyebrow">TECHNICAL</span><h2>التحليل الفني</h2>${detail.available ? technical(a, detail.tech, c) : emptyState("لا توجد بيانات تحليل كافية", detail.message, "الإعدادات", `${ROOT}/settings`)}</article>
        <article class="panel"><span class="eyebrow">AI SIGNAL</span><h2>الإشارة والتحليل</h2>${detail.rec ? signalAnalysis(detail.rec, c) : emptyState("لا توجد إشارة كافية", "لم يرجع المزود بيانات كافية لهذا الرمز.", "", "")}</article>
        <article class="panel"><span class="eyebrow">RELATED NEWS</span><h2>أخبار مرتبطة</h2>${relatedNews(a.symbol)}</article>
      </aside></div>`;
  }

  /* ───────────────────── Components ───────────────────── */
  function symbolContent(detail) {
    const a = norm({ ...(detail.asset || {}), providerStatus: detail.providerStatus || (detail.asset && detail.asset.providerStatus) });
    const rec = detail.rec ? norm(detail.rec) : null;
    const c = currency(a);
    const recMetrics = rec ? tradeMetricsForAsset(rec) : null;
    const sig = recMetrics ? recMetrics.signal : null;
    const p = num(a.price, a.currentPrice, a.lastPrice, a.regularMarketPrice, a.close, rec && rec.currentPrice);
    const chg = num(a.changePercent, rec && rec.changePercent);
    const chgClass = chg === null ? "" : chg >= 0 ? "up" : "down";
    const provider = providerName(a.provider || a.source || detail.source);
    const quality = dataQualityLabel(a.dataQuality);
    const lastUpdated = latinDateTime(a.lastUpdated || a.updatedAt || (rec && rec.lastUpdated));
    return `<div class="symbol-terminal-page">
      <article class="panel symbol-trade-header">
        <div class="symbol-title-block">
          ${logo(a, "lg")}
          <div class="asset-title">
            <span class="eyebrow">تفاصيل الرمز</span>
            <strong class="symbol-code ltr">${h(a.symbol)}</strong>
            <small>${h(a.name || "اسم الأصل غير متوفر من المزود")}</small>
          </div>
        </div>
        <div class="symbol-price-block">
          <strong class="ltr">${h(price(p, c))}</strong>
          <span class="ltr ${chgClass}">${h(change(chg))}</span>
        </div>
        <div class="symbol-header-badges">
          <span class="state-badge ${sig ? signalToneClass(sig) : ""}">${h(sig ? sigLabel(sig) : "بيانات غير كافية")}</span>
          <span class="quality-badge">${h(quality)}</span>
          <span class="currency-badge ltr">${h(c)}</span>
        </div>
        <div class="symbol-header-actions">
          <button class="action-btn" data-quick-add="${h(a.symbol)}">أضف للمتابعة</button>
          <button class="ghost-btn" data-create-alert="${h(a.symbol)}">أنشئ تنبيه</button>
        </div>
      </article>

      <section class="symbol-primary-grid">
        <article class="panel symbol-chart-card">
          <div class="panel-head">
            <div><span class="eyebrow">الرسم السعري</span><h2>حركة السعر</h2></div>
            <div class="chart-timeframes">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button type="button" data-symbol-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}">${h(t)}</button>`).join("")}</div>
          </div>
          ${miniChart(a, { large: true })}
        </article>

        <article class="panel symbol-summary-card">
          <div class="panel-head"><div><span class="eyebrow">ملخص البيانات</span><h2>البيانات الأساسية</h2></div></div>
          <div class="symbol-summary-grid">
            ${symbolSummaryTile("السعر", price(p, c), "القيمة الحالية")}
            ${symbolSummaryTile("التغير", change(chg), "مقارنة بالإغلاق السابق")}
            ${symbolSummaryTile("الإغلاق السابق", price(a.previousClose, c), "Previous close")}
            ${symbolSummaryTile("السوق", exchangeText(a), "السوق / البورصة")}
            ${symbolSummaryTile("المزود", provider, "مصدر السعر")}
            ${symbolSummaryTile("آخر تحديث", lastUpdated, "وقت المزود")}
          </div>
          ${technicalDetails(a, detail)}
        </article>
      </section>

      <section class="symbol-analysis-grid">
        ${symbolAnalysisPanel("إجماع الاستراتيجيات", "قراءة مجمعة من المؤشرات المتاحة", strategyConsensus(a, detail.tech, rec), true)}
        ${symbolAnalysisPanel("التحليل الفني", "مؤشرات الدعم والزخم والاتجاه", detail.available ? technical(a, detail.tech, c) : emptyState("بيانات غير كافية", detail.message, "الإعدادات", `${ROOT}/settings`), true)}
        ${symbolAnalysisPanel("الإشارة والتحليل", "خطة التداول عند توفر إشارة حقيقية", rec ? signalAnalysis(rec, c) : emptyState("بيانات غير كافية", "لم يرجع المزود ببيانات كافية لهذا الرمز.", "", ""), false)}
        ${symbolAnalysisPanel("أخبار مرتبطة", "أحدث الأخبار المتصلة بالرمز", relatedNews(a.symbol), false)}
      </section>
    </div>`;
  }

  function symbolSummaryTile(label, value, helper) {
    return `<article class="symbol-summary-tile"><span>${h(label)}</span><strong class="ltr">${h(displayValue(value))}</strong><small>${h(helper || "")}</small></article>`;
  }
  function symbolAnalysisPanel(title, helper, body, open) {
    return `<details class="panel symbol-analysis-card" ${open ? "open" : ""}><summary><span><small>تحليل</small><strong>${h(title)}</strong></span><em>${h(helper)}</em><b aria-hidden="true">+</b></summary><div class="symbol-analysis-body">${body}</div></details>`;
  }
  function technicalDetails(asset, detail) {
    const a = norm(asset || {});
    const rows = [
      ["البورصة", exchangeText(a)],
      ["السوق", marketText(a)],
      ["المزود", providerName(a.provider || a.source || detail.source)],
      ["رمز المزود", a.providerSymbolUsed || a.providerSymbol || "—"],
      ["استخدام مصدر بديل", fallbackLabel(a.fallbackUsed)],
      ["جودة البيانات", dataQualityLabel(a.dataQuality)],
      ["آخر تحديث", latinDateTime(a.lastUpdated || a.updatedAt)],
      ["عدد نقاط الرسم", String((a.chartData || []).length || "—")]
    ];
    return `<details class="technical-details"><summary>تفاصيل تقنية</summary><div class="technical-details-grid">${rows.map(([label, value]) => technicalDetailRow(label, value)).join("")}</div></details>`;
  }
  function technicalDetailRow(label, value) {
    return `<span class="technical-detail-row"><small>${h(label)}</small><b class="ltr">${h(displayValue(value))}</b></span>`;
  }
  function fallbackLabel(value) {
    if (value === true) return "نعم";
    if (value === false) return "لا";
    return "—";
  }
  function displayValue(value) {
    return value === null || value === undefined || value === "" || value === "--" || value === "غير متاح" ? "—" : String(value);
  }

  function marketBias(rec) {
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length, total = rec.length;
    if (!total) return { label: "بانتظار البيانات", en: "AWAITING", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "", note: "" };
    const cf = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = cf.length ? Math.round(cf.reduce((a, b) => a + b, 0) / cf.length) : 0;
    const actionable = buy + sell;
    // بدون إشارات منشورة، السوق ليس "هابطاً" — بوابة الدقة حاجبة فقط
    if (!actionable) return { label: "محايد · وضع الدقة نشط", en: "NEUTRAL — PRECISION GATE", bull: 0, bear: 0, neutral: 100, conf, tone: "", note: `لا توجد إشارات تتجاوز حد النشر حالياً (${total} أصل قيد المراقبة)` };
    const bull = Math.round((buy / actionable) * 100), bear = 100 - bull, neutral = Math.round(((total - actionable) / total) * 100);
    return { label: bull >= 55 ? "صاعد" : bull <= 40 ? "هابط" : "محايد", en: bull >= 55 ? "BULLISH" : bull <= 40 ? "BEARISH" : "NEUTRAL", bull, bear, neutral, conf, tone: bull >= 55 ? "ok" : bull <= 40 ? "warn" : "", note: `${buy} شراء · ${sell} بيع من أصل ${total}` };
  }
  function marketOverview(rec) {
    const b = marketBias(rec);
    const verdict = b.en === "AWAITING" ? "--" : b.en.replace("NEUTRAL — PRECISION GATE", "NEUTRAL");
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">MARKET OVERVIEW</span><h2>نظرة عامة على الأسواق</h2></div><div class="mo-timeframes">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button data-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}">${t}</button>`).join("")}</div></div>
      ${marketMap()}
    </section>
    <section class="panel ai-market-analysis">
      <div class="panel-head"><div><span class="eyebrow">AI MARKET ANALYSIS</span><h2>تحليل السوق الذكي</h2></div></div>
      <div class="ai-analysis-body">
        <div>
          <span class="card-kicker">OVERALL MARKET BIAS</span>
          <div class="ai-analysis-verdict ${b.tone}">${h(verdict)}</div>
          <small class="muted-note">${h(b.label)}${b.note ? " · " + h(b.note) : ""} · إطار ${h(state.timeframe)} · الثقة ${b.conf ? b.conf + "%" : "--"}</small>
          <div class="ai-bias-rows" style="margin-top:14px">
            <div class="ai-bias-row bull"><span>صاعد</span><span class="bar"><i style="width:${b.bull}%"></i></span><b class="ltr">${b.bull}%</b></div>
            <div class="ai-bias-row bear"><span>هابط</span><span class="bar"><i style="width:${b.bear}%"></i></span><b class="ltr">${b.bear}%</b></div>
            <div class="ai-bias-row neut"><span>محايد</span><span class="bar"><i style="width:${b.neutral}%"></i></span><b class="ltr">${b.neutral}%</b></div>
          </div>
        </div>
        <div class="ai-analysis-bull ${b.tone === "warn" ? "bearish" : ""}" aria-hidden="true"></div>
      </div>
    </section>`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), context = activeMarketContext();
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length;
    const configured = p.className === "online";
    return `<section class="terminal-command-center" aria-label="Market summary">
      ${commandMetric("PROVIDER", configured ? "متصل" : "غير مهيأ", p.active || p.raw || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : "غير متاح", b.conf ? b.label : "بانتظار البيانات", b.tone || "neutral")}
      ${commandMetric("BUY SIGNALS", buy, "فرص شراء", "ok")}
      ${commandMetric("SELL SIGNALS", sell, "فرص بيع", "bad")}
      ${commandMetric("ANALYZED ASSETS", rec.length || "غير متاح", "أصول محللة", rec.length ? "ok" : "neutral")}
      ${commandMetric("ACTIVE MARKET", context.marketName, `${context.marketNameEn} · ${context.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone) {
    return `<article class="command-metric ${tone || ""}"><span class="card-kicker">${h(kicker)}</span><strong>${h(String(value))}</strong><small>${h(label || "غير متاح")}</small></article>`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), context = activeMarketContext();
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length;
    const configured = p.className === "online";
    const analysis = analysisSummary(rec);
    return `<section class="terminal-command-center" aria-label="Market summary">
      ${commandMetric("PROVIDER", configured ? tx("\u0645\u062a\u0635\u0644", "Connected") : tx("\u063a\u064a\u0631 \u0645\u0647\u064a\u0623", "Unavailable"), p.active || p.raw || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : unavailableMark(), b.conf ? b.label : tx("\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "Waiting for data"), b.tone || "neutral")}
      ${commandMetric("BUY SIGNALS", buy, tx("\u0641\u0631\u0635 \u0634\u0631\u0627\u0621", "Buy signals"), "ok")}
      ${commandMetric("SELL SIGNALS", sell, tx("\u0641\u0631\u0635 \u0628\u064a\u0639", "Sell signals"), "bad")}
      ${commandMetric("ANALYZED ASSETS", analysis.hasRun ? analysis.count : unavailableMark(), analysis.label, analysis.hasRun ? "ok" : "neutral", `<button class="ghost-btn sm" data-run-analysis type="button">${h(analysis.action)}</button>`)}
      ${commandMetric("ACTIVE MARKET", context.marketName, `${context.marketNameEn} · ${context.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone, action = "") {
    return `<article class="command-metric ${tone || ""} analysis-command-metric"><span class="card-kicker">${h(kicker)}</span><strong>${h(String(value))}</strong><small>${h(label || unavailableMark())}</small>${action}</article>`;
  }
  function marketLeadership(rec) {
    const commandRec = mergeRecLists(legacyRecsFrom(state.commandCards), rec);
    return `<section class="panel market-leadership">
      <div class="panel-head"><div><span class="eyebrow">MARKET COMMAND</span><h2>غرفة قيادة السوق</h2></div><span class="state-badge">${h(activeMarketContext().marketName)}</span></div>
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
    const text = passed ? `✓ دقة تاريخية ${rate}%` : `دقة تاريخية ${rate}% · حد النشر ${req}%`;
    return `<span class="precision-badge ${passed ? "pass" : "info"}" title="نسبة إصابة الهدف الأول في الاختبار الخلفي على نفس الرمز">${h(text)}</span>`;
  }
  function leadershipCard(symbol, asset) {
    const a = asset ? norm(asset) : { symbol, name: "غير متاح" };
    const display = a.displaySymbol || displaySymbolFor(symbol);
    const detailSymbol = a.canonicalSymbol || symbol;
    const c = currency({ ...a, symbol: detailSymbol });
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
    const chg = changePercentValue(a);
    const conf = num(a.confidence, a.score, a.aiConfidence);
    const source = providerName(a.provider || a.source || (state.provider && (state.provider.active || state.provider.provider)));
    const hasSignal = a.signalAvailable !== false && Boolean(a.signal || a.recommendation || a.action || a.side || a.type);
    const sig = hasSignal ? tradeMetricsForAsset(a).signal : null;
    const quality = a.dataQuality || (p === null ? "unavailable" : a.chartAvailable === false ? "partial" : "delayed");
    const stateClass = chg === null ? "neutral" : chg >= 0 ? "positive" : "negative";
    return `<article class="leadership-card ${stateClass}">
      <button class="leadership-card-action" data-symbol-details="${h(detailSymbol)}" type="button">
      <div class="asset-head">${logo({ ...a, symbol: display })}<div class="asset-title"><strong class="ltr">${h(display)}</strong><small>${h(a.name || display)}</small></div></div>
      <div class="leadership-price"><strong class="ltr">${h(price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</span></div>
      ${sparkline(a, chg)}
      <div class="leadership-foot">
      <span class="signal-badge ${sig ? signalCardClass(sig) : "unavailable"}">${h(sig ? sigLabel(sig) : "إشارة غير متاحة")}</span>
        <span class="quality-badge">${h(conf === null ? "الثقة غير متاحة" : `الثقة ${Math.round(conf)}%`)} · ${h(dataQualityLabel(quality))}</span>
        ${precisionBadge(a)}
      </div>
      </button>
      ${technicalDetails({ ...a, source }, { source })}
    </article>`;
  }
  function opportunityHeatmap(rec) {
    const symbols = unique([...dashboardSymbols(), ...rec.map(x => x.symbol)]).slice(0, 24);
    return `<section class="panel opportunity-heatmap">
      <div class="panel-head"><div><span class="eyebrow">OPPORTUNITY HEATMAP</span><h2>خريطة حرارة الفرص</h2></div><span class="state-badge">${rec.length ? `${rec.length} أصل` : "البيانات غير متاحة حالياً"}</span></div>
      <div class="opportunity-heat-grid">${symbols.map(s => heatmapCard(s, findAssetForSymbol(s, rec))).join("")}</div>
    </section>`;
  }
  function heatmapCard(symbol, asset) {
    const a = asset ? norm(asset) : { symbol, name: "غير متاح" };
    const chg = changePercentValue(a);
    const hasSignal = Boolean(asset && (a.signal || a.recommendation || a.action || a.side || a.type));
    const sig = hasSignal ? tradeMetricsForAsset(a).signal : null;
    const stateClass = chg === null ? "unavailable" : chg > 0 ? "positive" : chg < 0 ? "negative" : "neutral";
    const conf = num(a.confidence, a.score, a.aiConfidence);
    return `<button class="opportunity-cell ${stateClass}" data-symbol-details="${h(symbol)}" type="button">
      ${logo({ ...a, symbol }, "sm")}
      <strong class="ltr">${h(symbol === "BTCUSD" ? "BTC/USD" : symbol)}</strong>
      <span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</span>
      <em>${sig ? h(sigLabel(sig)) : "غير متاح"}${conf === null ? "" : ` · ${Math.round(conf)}%`}</em>
    </button>`;
  }
  function moverPanel(kicker, title, items, tone) {
    return `<article class="panel market-movers-panel ${tone}"><div class="panel-head"><div><span class="eyebrow">${h(kicker)}</span><h2>${h(title)}</h2></div></div>${items.length ? assetList(items) : emptyState("البيانات غير متاحة حالياً", "لم يرجع المزود تغيّر الأسعار الكافي لعرض هذه القائمة.", "افتح الإعدادات", `${ROOT}/settings`)}</article>`;
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
      "CL=F": ["OIL", "WTI", "USOIL", "CL=F"]
    };
    return map[s] || [s];
  }
  function displaySymbolFor(symbol) {
    const s = sym(symbol);
    if (["BTCUSD", "BTC-USD", "BTC/USD"].includes(s)) return "BTC/USD";
    if (["ETHUSD", "ETH-USD", "ETH/USD"].includes(s)) return "ETH/USD";
    if (["NAS100", "^NDX", "NQ=F"].includes(s)) return "NAS100";
    if (["US30", "^DJI", "YM=F"].includes(s)) return "US30";
    if (["GC=F", "XAUUSD=X"].includes(s)) return "XAUUSD";
    if (["SI=F", "XAGUSD=X"].includes(s)) return "XAGUSD";
    if (["OIL", "USOIL", "CL=F"].includes(s)) return "Oil";
    return symbol;
  }
  function sparkline(asset, chg) {
    const series = arr(asset.history || asset.sparkline || asset.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null);
    if (series.length < 2) return `<div class="leadership-sparkline empty">الشارت غير متاح</div>`;
    const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
    const points = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(34 - (v - min) / rng * 30).toFixed(2)}`).join(" ");
    const tone = chg === null ? (series[series.length - 1] >= series[0] ? "up" : "down") : chg >= 0 ? "up" : "down";
    return `<svg class="leadership-sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true"><polyline class="${tone}" points="${points}"></polyline></svg>`;
  }
  function marketMap() {
    return `<div class="world-map" aria-hidden="true">${SESSIONS.map(([c, top, left], i) => `<span class="map-node node-${i}" style="top:${top}%;left:${left}%"><i></i><b>${h(c)}</b></span>`).join("")}
      <svg viewBox="0 0 900 360" preserveAspectRatio="none"><path d="M95 170 C220 80 325 210 458 132 S690 45 810 155"></path><path d="M120 235 C250 250 345 188 468 220 S650 300 800 230"></path><path d="M432 160 C470 195 520 215 590 202 S690 185 762 244"></path><path d="M150 120 C300 150 500 120 720 150"></path></svg></div>`;
  }
  function biasPanel(rec) {
    const b = marketBias(rec);
    return `<span class="eyebrow">AI MARKET ANALYSIS</span><h2>التحيّز العام</h2><strong class="bias-head state-${b.tone}">${h(b.en)}</strong>
      <div class="bias-rows">
        <div class="bias-row"><span>صاعد</span><div class="mo-bar"><i style="width:${b.bull}%"></i></div><b>${b.bull}%</b></div>
        <div class="bias-row"><span>هابط</span><div class="mo-bar"><i class="bear" style="width:${b.bear}%"></i></div><b>${b.bear}%</b></div>
        <div class="bias-row"><span>محايد</span><div class="mo-bar"><i class="neut" style="width:${b.neutral}%"></i></div><b>${b.neutral}%</b></div>
      </div>`;
  }
  function exploreCarousel() {
    return `<section class="explore"><div class="explore-head"><span class="eyebrow">EXPLORE MARKETS</span></div><div class="explore-row">${EXPLORE.map(id => { const m = MARKETS.find(x => x.id === id); if (!m) return ""; return `<a class="explore-card" href="${ROOT}/markets/${m.id}" data-route-link><span class="ex-icon">${marketGlyph(m)}</span><strong>${h(m.en)}</strong><small>${h(m.ar)}</small></a>`; }).join("")}</div></section>`;
  }
  function watchlistTable(items, opts = {}) {
    const rows = items.map(x => {
      const a = norm(x), c = currency(a), metrics = tradeMetricsForAsset(a), sig = metrics.signal;
      const conf = metrics.confidence, p = metrics.current;
      const chg = changePercentValue(a), score = num(a.aiScore, a.score, a.rating);
      const risk = a.risk || a.riskLevel;
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.symbol)}" title="إزالة">✕</button>` : "";
      return `<tr>
        <td class="wt-asset" data-label="الأصل"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "غير متاح")}</small></span></button></td>
        <td data-label="السوق">${exchangeBadge(a)}</td>
        <td class="ltr" data-label="السعر">${h(p === null ? "غير متاح" : price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="التغير">${h(chg === null ? "غير متاح" : change(chg))}</td>
        <td data-label="إشارة التداول"><span class="state-badge ${signalToneClass(sig)}">${h(sigLabel(sig))}</span></td>
        <td class="ltr" data-label="الثقة">${conf === null ? "غير متاح" : Math.round(conf) + "%"}</td>
        <td class="ltr" data-label="الهدف">${metrics.target === null ? "غير متاح" : price(metrics.target, c)}</td>
        <td data-label="المدة">${h(a.timeframe || a.horizon || a.duration || "غير متاح")}</td>
        <td data-label="المخاطرة">${risk ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : "غير متاح"}</td>
        <td class="ltr" data-label="سكور AI">${score === null ? "غير متاح" : (score > 10 ? Math.round(score) + "%" : score.toFixed(1))}</td>
        <td class="row-actions" data-label="إجراء"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">تحليل</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>الأصل</th><th>السوق</th><th>السعر</th><th>التغير</th><th>إشارة التداول</th><th>الثقة</th><th>الهدف</th><th>المدة</th><th>المخاطرة</th><th>سكور AI</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function recCards(items) { return `<div class="rec-grid">${items.map(recCard).join("")}</div>`; }
  function recCard(x) {
    const a = norm(x), c = currency(a), metrics = tradeMetricsForAsset(a), sig = metrics.signal;
    return `<article class="rec-card ${signalCardClass(sig)}"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "--")}</small><small>${exchangeBadge(a)}</small></div><span class="state-badge trading-signal-badge ${signalToneClass(sig)}" title="إشارة التداول">${h(sigLabel(sig))}</span></div>
      <div class="rec-metrics"><span>السعر<b class="ltr">${h(price(metrics.current, c))}</b></span><span>الهدف<b class="ltr">${h(metrics.target === null ? "--" : price(metrics.target, c))}</b></span><span>وقف<b class="ltr">${h(metrics.stop === null ? "--" : price(metrics.stop, c))}</b></span><span>الصعود المتوقع<b class="ltr">${h(formatSignalPercent(metrics.upsidePercent))}</b></span><span>الهبوط إلى وقف الخسارة<b class="ltr">${h(formatSignalPercent(metrics.downsidePercent))}</b></span><span>العائد/المخاطرة<b class="ltr">${h(formatRiskRewardRatio(metrics.riskRewardRatio))}</b></span><span>ثقة<b>${metrics.confidence === null ? "--" : Math.round(metrics.confidence) + "%"}</b></span></div>
      <p class="signal-explanation">${h(metrics.explanation)}</p>
      <div class="rec-foot"><span class="status-tag watchlist-status ${isInWatchlist(a.symbol) ? "ok" : "muted"}">${h(watchlistStatusLabel(a.symbol))}</span><div class="row-actions compact-actions"><button class="action-btn sm" data-follow-trade="${h(a.symbol)}" type="button">متابعة الصفقة</button><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}" type="button">فتح التحليل</button></div></div></article>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(norm(x))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = norm(asset), c = currency(a), metrics = tradeMetricsForAsset(a), sig = metrics.signal;
    const chg = changePercentValue(a);
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">إزالة</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || "اسم الأصل غير متوفر")}</small></div></div>
      <div class="badge-row"><span class="currency-badge">${h(c)}</span>${exchangeBadge(a)}<span class="state-badge trading-signal-badge ${signalToneClass(sig)}" title="إشارة التداول">${h(sigLabel(sig))}</span><span class="status-tag watchlist-status ${isInWatchlist(a.symbol) ? "ok" : "muted"}">${h(watchlistStatusLabel(a.symbol))}</span></div>
      <div class="asset-metrics"><span>السعر<b class="ltr">${h(metrics.current === null ? "غير متاح" : price(metrics.current, c))}</b></span><span>الهدف<b class="ltr">${h(metrics.target === null ? "غير متاح" : price(metrics.target, c))}</b></span><span>وقف الخسارة<b class="ltr">${h(metrics.stop === null ? "غير متاح" : price(metrics.stop, c))}</b></span><span>الصعود المتوقع<b class="ltr">${h(formatSignalPercent(metrics.upsidePercent))}</b></span><span>الهبوط إلى وقف الخسارة<b class="ltr">${h(formatSignalPercent(metrics.downsidePercent))}</b></span><span>العائد/المخاطرة<b class="ltr">${h(formatRiskRewardRatio(metrics.riskRewardRatio))}</b></span><span>ثقة AI<b>${metrics.confidence === null ? "غير متاح" : `${Math.round(metrics.confidence)}%`}</b></span><span>التغيير<b class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</b></span></div>
      <p class="signal-explanation">${h(metrics.explanation)}</p>
      <div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">فتح التحليل</button><button class="ghost-btn" data-follow-trade="${h(a.symbol)}">متابعة الصفقة</button><button class="ghost-btn" data-quick-add="${h(a.symbol)}">قائمة المتابعة</button>${remove}</div></article>`;
  }
  function marketCard(m) {
    const meta = marketMetadata(m.id);
    const marketExchange = metadataDisplayValue(meta.exchange, inferExchangeFromSymbol((m.symbols || [])[0]), m.family);
    return `<a class="market-tile ${m.tone === "featured" ? "featured" : ""}" href="${ROOT}/markets/${m.id}" data-route-link><div class="mt-top"><span class="ex-icon">${marketGlyph(m)}</span><span class="eyebrow">${h(meta.en)}</span></div><strong>${h(meta.ar)}</strong><p>${h(marketExchange)} · العملة <span class="ltr">${h(contextCurrency({ marketId: meta.id }))}</span></p><div class="tile-tags">${m.symbols.slice(0, 4).map(s => `<span class="badge sm"><span class="ltr">${h(s)}</span></span>`).join("")}</div></a>`;
  }
  function heatmap(items) {
    return `<div class="heatmap">${items.slice(0, 24).map(x => { const a = norm(x), sig = tradeMetricsForAsset(a).signal, chg = num(a.changePercent, a.percentChange); return `<button class="heat-cell ${chg === null ? "unavailable" : signalCardClass(sig)}" data-symbol-details="${h(a.symbol)}">${logo(a, "sm")}<strong class="ltr">${h(a.symbol)}</strong><small class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</small><em>${h(sigLabel(sig))}</em></button>`; }).join("")}</div>`;
  }
  function holdingsTable(items) {
    const rows = items.map((p, i) => { const a = norm(p.rec || { symbol: p.symbol }), c = currency({ symbol: p.symbol }), cur = num(a.price, a.currentPrice), qty = num(p.qty) || 0, entry = num(p.entry) || 0, val = cur !== null ? cur * qty : null, pl = cur !== null ? (cur - entry) * qty : null;
      return `<tr><td class="wt-asset"><button data-symbol-details="${h(p.symbol)}">${logo({ symbol: p.symbol })}<span><strong class="ltr">${h(p.symbol)}</strong></span></button></td><td class="ltr">${qty}</td><td class="ltr">${price(entry, c)}</td><td class="ltr">${cur === null ? "--" : price(cur, c)}</td><td class="ltr">${val === null ? "--" : price(val, c)}</td><td class="ltr ${pl === null ? "" : pl >= 0 ? "up" : "down"}">${pl === null ? "--" : price(pl, c)}</td><td><button class="icon-btn danger" data-remove-holding="${i}">✕</button></td></tr>`; }).join("");
    return `<div class="table-shell"><table><thead><tr><th>الأصل</th><th>الكمية</th><th>الدخول</th><th>الحالي</th><th>القيمة</th><th>ر/خ</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function holdingForm() { return `<form id="holding-form" class="inline-form"><input name="symbol" dir="ltr" placeholder="الرمز" /><input name="qty" inputmode="decimal" placeholder="الكمية" /><input name="entry" inputmode="decimal" placeholder="سعر الدخول" /><button class="action-btn" type="submit">إضافة مركز</button></form>`; }
  function tradeProviderStatus(items) {
    const status = state.followed.dataStatus || {};
    const p = state.followed.dataProvider || state.provider || {};
    const provider = status.provider || providerName(p.active || p.provider) || "—";
    const rows = [
      ["مزود الأسعار", provider],
      ["آخر تحديث", latinDateTime(status.lastUpdated || new Date().toISOString())],
      ["عدد الصفقات المحفوظة", latinNumber(status.savedTrades ?? items.length)],
      ["تم تحديث سعرها", latinNumber(status.updatedPrices ?? items.filter(x => x.priceUpdated || num(x.currentPrice, x.current) !== null).length)],
      ["بدون بيانات سعر", latinNumber(status.missingPrices ?? items.filter(x => x.priceMessage || num(x.currentPrice, x.current) === null).length)]
    ];
    return `<section class="panel trade-data-status"><div class="panel-head"><div><span class="eyebrow">DATA SOURCE</span><h2>حالة بيانات الأداء</h2></div><button class="ghost-btn" data-refresh-trades>تحديث الأسعار</button></div><div class="trade-status-grid">${rows.map(([label, value]) => `<span><small>${h(label)}</small><b class="ltr">${h(String(value || "--"))}</b></span>`).join("")}</div>${status.message ? `<p class="muted-note">${h(status.message)}</p>` : ""}</section>`;
  }
  function performanceEmptyState() {
    return `<section class="empty-state trade-empty-state">
      <span class="empty-glyph">◎</span>
      <h3>لا توجد صفقات متابعة حتى الآن</h3>
      <p>ستظهر هنا نتائج إشارات الشراء والبيع بعد حفظها أو متابعتها من صفحة التوصيات أو التحليل.</p>
      <div class="row-actions">
        <a class="action-btn" href="${ROOT}/recommendations" data-route-link>فتح التوصيات</a>
        <button class="ghost-btn" data-run-signals type="button">تشغيل فحص الإشارات</button>
        <a class="ghost-btn" href="#followed-trade-form">إضافة صفقة متابعة</a>
      </div>
    </section>`;
  }
  function followedTradeForm() {
    return `<section class="panel trade-manual-panel"><div class="panel-head"><div><span class="eyebrow">MANUAL TRACK</span><h2>إضافة صفقة متابعة</h2></div></div>
      <form id="followed-trade-form" class="trade-form-grid">
        <label>الرمز<input name="symbol" dir="ltr" placeholder="AAPL" required /></label>
        <label>الإجراء<select name="action"><option value="buy">buy</option><option value="sell">sell</option><option value="wait">wait</option><option value="watch">watch</option></select></label>
        <label>سعر الدخول<input name="entryPrice" inputmode="decimal" placeholder="0.00" required /></label>
        <label>الهدف<input name="targetPrice" inputmode="decimal" placeholder="0.00" /></label>
        <label>وقف الخسارة<input name="stopLoss" inputmode="decimal" placeholder="0.00" /></label>
        <label>الثقة<input name="confidence" inputmode="numeric" placeholder="اختياري" /></label>
        <label class="wide">ملاحظات<input name="notes" placeholder="اختياري" /></label>
        <button class="action-btn" type="submit">إضافة صفقة متابعة</button>
      </form>
    </section>`;
  }
  function allocation(items) {
    if (!items.length) return miniEmpty();
    const groups = {};
    items.forEach(p => { const t = assetType(p.symbol); const cost = (num(p.qty) || 0) * (num(p.entry) || 0); groups[t] = (groups[t] || 0) + cost; });
    const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1;
    const TYPE_AR = { stock: "أسهم", crypto: "كريبتو", commodity: "سلع", forex: "عملات", fund: "صناديق", index: "مؤشرات" };
    return `<div class="alloc">${Object.entries(groups).map(([t, v]) => `<div class="alloc-row"><span>${h(TYPE_AR[t] || t)}</span><div class="mo-bar"><i style="width:${Math.round(v / total * 100)}%"></i></div><b>${Math.round(v / total * 100)}%</b></div>`).join("")}</div>`;
  }
  function tradeCol(title, items, tone) { return `<article class="trade-column ${tone}"><h3>${h(title)} <span class="col-count">${items.length}</span></h3>${items.length ? items.map(tradeCard).join("") : `<div class="trade-mini-empty">لا توجد صفقات في هذا التصنيف.</div>`}</article>`; }
  function tradeCard(t) {
    const s = sym(t.symbol || t.ticker || t.asset || "--"), a = norm({ ...t, symbol: s }), c = currency(a), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), metrics = tradeMetricsForAsset({ ...a, action: tradeAction(t) }), sig = metrics.signal;
    const status = tradeStatus(t), current = metrics.current, entry = metrics.entry, target = metrics.target, stop = metrics.stop;
    return `<article class="trade-item"><div class="asset-head">${logo({ symbol: s })}<div class="asset-title"><strong class="ltr">${h(s)}</strong><small>${h(a.name || t.status || "متابعة")}</small></div></div>
      <div class="badge-row"><span class="state-badge trading-signal-badge ${signalToneClass(sig)}" title="إشارة التداول">${h(sigLabel(sig))}</span><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></div>
      <div class="trade-row"><span>الدخول<b class="ltr">${h(price(entry, c))}</b></span><span>الحالي<b class="ltr">${h(current === null ? "--" : price(current, c))}</b></span><span>P/L<b class="${pnl === null ? "" : pnl >= 0 ? "up" : "down"}">${pnl === null ? "--" : pnl + "%"}</b></span></div>
      <div class="trade-row"><span>الهدف<b class="ltr">${h(price(target, c))}</b></span><span>وقف الخسارة<b class="ltr">${h(price(stop, c))}</b></span><span>الثقة<b class="ltr">${h(t.confidence == null ? "--" : Math.round(Number(t.confidence)) + "%")}</b></span></div>
      <div class="trade-row"><span>الصعود المتوقع<b class="ltr">${h(formatSignalPercent(metrics.upsidePercent))}</b></span><span>الهبوط إلى وقف الخسارة<b class="ltr">${h(formatSignalPercent(metrics.downsidePercent))}</b></span><span>العائد/المخاطرة<b class="ltr">${h(formatRiskRewardRatio(metrics.riskRewardRatio))}</b></span></div>
      <p class="signal-explanation">${h(metrics.explanation)}</p>
      ${t.priceMessage ? `<p class="trade-warning">${h(t.priceMessage)}</p>` : ""}
      <div class="rec-foot"><small>${h(providerName(t.provider) || t.sourceType || "--")}</small><button class="ghost-btn sm" data-symbol-details="${h(s)}">فتح التحليل</button></div></article>`;
  }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeCard).join("")}</div>`; }
  function tradeJournalTable(items) {
    const rows = items.map(t => { const s = sym(t.symbol || t.asset || "--"), c = currency({ symbol: s, currency: t.currency }), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), status = tradeStatus(t);
      const metrics = tradeMetricsForAsset({ ...t, symbol: s, action: tradeAction(t) });
      return `<tr><td class="wt-asset" data-label="الرمز"><button data-symbol-details="${h(s)}">${logo({ symbol: s })}<span><strong class="ltr">${h(s)}</strong><small>${h(t.assetName || t.name || "--")}</small></span></button></td><td data-label="إشارة التداول"><span class="state-badge ${signalToneClass(metrics.signal)}">${h(sigLabel(metrics.signal))}</span></td><td class="ltr" data-label="الدخول">${h(price(num(t.entryPrice, t.entry), c))}</td><td class="ltr" data-label="الحالي">${h(price(num(t.currentPrice, t.current), c))}</td><td class="ltr" data-label="الهدف">${h(price(num(t.targetPrice, t.target), c))}</td><td class="ltr" data-label="وقف الخسارة">${h(price(num(t.stopLoss, t.stop), c))}</td><td class="ltr ${pnl === null ? "" : pnl >= 0 ? "up" : "down"}" data-label="P/L">${pnl === null ? "--" : pnl + "%"}</td><td data-label="الحالة"><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></td><td data-label="المصدر">${h(providerName(t.provider) || t.sourceType || "--")}</td></tr>`; }).join("");
    return `<div class="table-shell trade-journal-table"><table><thead><tr><th>الرمز</th><th>إشارة التداول</th><th>الدخول</th><th>الحالي</th><th>الهدف</th><th>وقف الخسارة</th><th>P/L</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function newsList(items) { return `<div class="news-list">${items.map(newsCard).join("")}</div>`; }
  function newsCard(n) {
    const title = n.title || n.headline || n.name || "خبر بدون عنوان", src = n.source || n.publisher || n.provider || "Market news", when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = n.url || n.link || "", text = n.summary || n.description || n.text || "", impact = (n.impact || n.sentiment || "").toString().toLowerCase();
    const syms = arr(n.symbols || n.relatedSymbols).slice(0, 3);
    return `<article class="news-card"><div class="news-meta"><span>${h(src)} · ${h(when)}</span>${impact ? `<span class="impact ${impact.includes("high") || impact.includes("bull") ? "ok" : impact.includes("low") ? "" : "warn"}">${h(impact)}</span>` : ""}</div><strong>${h(title)}</strong>${text ? `<p>${h(text)}</p>` : ""}${syms.length ? `<div class="news-syms">${syms.map(s => `<button class="badge sm" data-symbol-details="${h(s)}"><span class="ltr">${h(sym(s))}</span></button>`).join("")}</div>` : ""}${url ? `<a class="ghost-btn sm" href="${h(url)}" target="_blank" rel="noopener">المصدر</a>` : ""}</article>`;
  }
  function relatedNews(symbol) {
    const items = newsItems().filter(n => arr(n.symbols || n.relatedSymbols).map(sym).includes(sym(symbol))).slice(0, 3);
    return items.length ? newsList(items) : `<p class="muted-note">لا توجد أخبار مرتبطة من المزود لهذا الرمز.</p>`;
  }
  function alertList(items) { return `<div class="trade-list">${items.map(i => `<article class="trade-item"><strong>${h(i.title || i.symbol || i.name || "تنبيه")}</strong><p>${h(i.message || i.reason || i.description || "تنبيه بدون تفاصيل إضافية.")}</p>${i.symbol ? `<button class="ghost-btn sm" data-symbol-details="${h(i.symbol)}">فتح الرمز</button>` : ""}</article>`).join("")}</div>`; }
  function localAlertRow(a, i) { const T = { price: "سعر", percent: "نسبة %", signal: "إشارة AI", news: "خبر" }; return `<article class="trade-item alert-row"><div><strong class="ltr">${h(a.symbol)}</strong><p>${h(T[a.type] || a.type)}${a.value ? " · " + h(a.value) : ""} · ${h(date(a.createdAt))}</p></div><button class="icon-btn danger" data-del-alert="${i}">✕</button></article>`; }

  function systemCard() { const s = providerCopy(); return `<article class="status-card"><span class="eyebrow">SYSTEM</span><strong>${h(s.title)}</strong><p>${h(s.copy)}</p><span class="state-badge ${s.className === "online" ? "ok" : "warn"}">${h(s.raw)}</span></article>`; }
  function diagnostics() {
    const normalized = normalizedProviderStatus();
    const tone = normalizedStatusTone(normalized.status);
    const cards = [
      ["حالة المزود", featureStatusLabel(normalized.status), "Status", tone],
      ["المزود المستخدم", normalized.provider, "Provider", ""],
      ["حالة الاتصال", normalized.configured ? "مهيأ" : "غير مهيأ", "Connection", normalized.configured ? "ok" : "warn"],
      ["عدد الرموز المكتشفة", countText(normalized.discoveredCount), "Discovered", ""],
      ["عدد الرموز المحملة", countText(normalized.loadedCount), "Loaded", "ok"],
      ["عدد الرموز من الكاش", countText(normalized.cachedCount), "Cached", normalized.cachedCount > 0 ? "ok" : ""],
      ["عدد الرموز المتعثرة", countText(normalized.failedCount), "Failed", normalized.failedCount > 0 ? "warn" : ""],
      ["عدد الرموز المتخطاة", countText(normalized.skippedCount), "Skipped", normalized.skippedCount > 0 ? "warn" : ""],
      ["حالة الكاش", cacheStatusLabel(normalized.cacheStatus), "Cache", ""],
      ["آخر تحديث", latinDateTime(normalized.lastUpdated), "Updated", ""]
    ];
    const featureList = normalized.supportedFeatures.length ? normalized.supportedFeatures.map(featureLabel).join(" · ") : "--";
    const errorSummary = normalized.errorSummary ? `<p class="provider-warning">${h(normalized.errorSummary)}</p>` : "";
    return `<div class="provider-diagnostics-ui">
      <div class="provider-status-banner ${tone}">
        <div><span class="eyebrow">PROVIDER</span><strong>${h(normalized.provider)}</strong><p>${h(featureStatusLabel(normalized.status))}</p></div>
        <span class="state-badge ${tone}">${h(normalized.configured ? "مهيأ" : "غير مهيأ")}</span>
      </div>
      ${errorSummary}
      <div class="provider-status-cards">${cards.map(([label, value, helper, cardTone]) => providerMetricCard(label, value, helper, cardTone)).join("")}</div>
      <div class="provider-feature-strip"><span>الميزات المدعومة</span><b>${h(featureList)}</b></div>
      ${diagnosticDetails(normalized)}
    </div>`;
  }
  function normalizedProviderStatus() {
    const ps = state.providerStatus || {}, raw = ps.normalizedStatus || {};
    const p = ps.dataProvider || state.provider || {};
    const diag = ps.diagnostics || state.markets.diagnostics || (state.rec && state.rec.symbolDiscovery) || {};
    const summary = ps.summary || diag.summary || state.rec.summary || {};
    const failedRows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed));
    const skippedRows = arr(ps.skipped).concat(arr(state.rec.skipped), arr(state.markets.skipped));
    const status = normalizeStatusKey(raw.status || p.status || providerCopy().raw);
    const loadedCount = numberValue(raw.loadedCount, summary.loadedSymbols, diag.totalSymbolsLoaded, ps.resultCount, state.markets.resultCount);
    const failedCount = numberValue(raw.failedCount, summary.failedSymbols, failedRows.length);
    const cachedCount = numberValue(raw.cachedCount, summary.cachedSymbols);
    const skippedCount = numberValue(raw.skippedCount, summary.skippedDueToRateLimit, skippedRows.length);
    const discoveredCount = numberValue(diag.totalSymbolsDiscovered, loadedCount);
    const errorSummary = raw.errorSummary || formatProviderError(p.failureReason || ps.providers?.fmp?.error || state.rec.message || state.markets.message || null, { empty: "" });
    return {
      provider: providerName(raw.provider || p.active || p.requested || p.provider || providerEvidence().provider || ""),
      configured: raw.configured !== undefined ? Boolean(raw.configured) : p.configured === true || Boolean(p.active || p.provider),
      status,
      supportedFeatures: arr(raw.supportedFeatures || p.supportedFeatures),
      loadedCount,
      failedCount,
      cachedCount,
      skippedCount,
      discoveredCount,
      lastUpdated: raw.lastUpdated || p.lastUpdated || ps.generatedAt || diag.generatedAt || null,
      cacheStatus: diag.cacheStatus || state.rec.cacheStatus || state.markets.cacheStatus || (cachedCount > 0 ? "hit" : "disabled"),
      errorSummary,
      diagnosticGroups: arr(ps.diagnosticGroups)
    };
  }
  function providerMetricCard(label, value, helper, tone) {
    return `<article class="provider-metric-card ${tone || ""}">
      <span>${h(helper)}</span>
      <strong class="${isLatinMetric(value) ? "ltr" : ""}">${h(formatProviderValue(value))}</strong>
      <small>${h(label)}</small>
    </article>`;
  }
  function diagnosticDetails(normalized) {
    const groups = normalized.diagnosticGroups.length ? normalized.diagnosticGroups : groupedProviderDiagnostics();
    if (!groups.length) {
      return `<details class="provider-diagnostics-panel"><summary>تفاصيل التشخيص</summary><p class="provider-clean-note">لا توجد أخطاء مزود نشطة للعرض.</p></details>`;
    }
    return `<details class="provider-diagnostics-panel">
      <summary>تفاصيل التشخيص</summary>
      <div class="provider-diagnostic-groups">${groups.map(group => {
        const details = arr(group.details).slice(0, 12);
        return `<section class="provider-diagnostic-group">
          <strong>${h(formatProviderError(group.summary || group.reason || group.status))}</strong>
          ${details.length ? `<ul>${details.map(detail => `<li><code class="ltr">${h(detail.route || detail.symbol || "route")}</code><span>${h(formatProviderError(detail.reason || group.status))}</span></li>`).join("")}</ul>` : ""}
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
        summary: `FMP: تم الوصول إلى حد الاستخدام في ${details.length || rateLimited.length} مسارات`,
        details
      });
    }
    return groups;
  }
  function formatProviderError(error, options = {}) {
    const empty = options.empty === undefined ? "--" : options.empty;
    if (error === null || error === undefined || error === "") return empty;
    let value = "";
    if (typeof error === "object") {
      if (Array.isArray(error)) value = error.map(item => formatProviderError(item, { empty: "" })).filter(Boolean).join(" · ");
      else value = error.message || error.errorSummary || error.reason || error.code || error.status || error.name || "";
    } else {
      value = String(error);
    }
    value = String(value).replace(/\s+/g, " ").trim();
    if (!value || value === "[object Object]") return empty;
    if (isRateLimitText(value)) return "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً";
    const lower = value.toLowerCase();
    if (lower.includes("fmp_not_configured")) return "FMP غير مهيأ";
    if (lower.includes("provider_not_configured") || lower.includes("missing_provider")) return "مزود البيانات غير مهيأ";
    if (/^[a-z0-9_-]+_not_configured$/i.test(value)) return "مزود البيانات غير مهيأ";
    if (lower.includes("provider_temporarily_unavailable")) return "مزود البيانات غير متاح مؤقتاً";
    if (lower.includes("provider_access_denied") || lower.includes("unauthorized") || lower.includes("forbidden")) return "صلاحية المزود لا تسمح بعرض هذه البيانات";
    if (/^[a-z0-9_-]+_[a-z0-9_-]+$/i.test(value)) return "تعذر تحديث أحد مسارات المزود";
    return value.length > 140 ? `${value.slice(0, 137).trim()}...` : value;
  }
  function formatProviderValue(value) {
    if (typeof value === "object" && value !== null) return formatProviderError(value);
    return value === null || value === undefined || value === "" ? "--" : String(value);
  }
  function normalizeStatusKey(status) {
    const value = String(status || "").toLowerCase();
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
  function countText(value) { return `${latinNumber(numberValue(value))} رمز`; }
  function cacheStatusLabel(value) {
    const status = String(value || "").toLowerCase();
    if (status === "hit") return "الكاش متاح";
    if (status === "stale") return "كاش قديم مستخدم";
    if (status === "miss") return "تحديث مباشر";
    if (status === "provider-cache") return "كاش المزود";
    if (status === "live") return "بيانات مباشرة";
    if (status === "disabled") return "غير مستخدم";
    return formatProviderValue(value);
  }
  function featureLabel(value) {
    const labels = { prices: "أسعار", quotes: "أسعار", symbols: "رموز", earnings: "أرباح", dividends: "توزيعات", ipos: "اكتتابات", economic: "تقويم اقتصادي", economicCalendar: "تقويم اقتصادي", news: "أخبار", technicalAnalysis: "تحليل فني" };
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
    if (!rows.length) return emptyState("لا توجد قائمة أسواق من المزود", state.markets.message || providerCopy().copy, "الإعدادات", `${ROOT}/settings`);
    return `<div class="table-shell"><table><thead><tr><th>السوق</th><th>البورصة</th><th>الرمز</th><th>العملة</th><th>المصدر</th></tr></thead><tbody>${rows.map(m => {
      const normalized = norm(m);
      return `<tr><td>${h(metadataDisplayValue(m.name, m.label, normalized.market))}</td><td>${h(exchangeText(normalized))}</td><td class="ltr">${h(m.symbol || m.code || "--")}</td><td class="ltr">${h(metadataDisplayValue(m.currency, normalized.currency))}</td><td>${h(m.source || m.provider || "--")}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  function confBuckets(r) { const b = { high: 0, mid: 0, low: 0 }; r.forEach(x => { const c = num(x.confidence, x.score, x.aiConfidence); if (c === null) return; if (c >= 70) b.high++; else if (c >= 45) b.mid++; else b.low++; }); return b; }
  function confBars(b) { const max = Math.max(1, b.high, b.mid, b.low); return `<div class="conf-bars"><div class="bias-row"><span>عالية</span><div class="mo-bar"><i style="width:${b.high / max * 100}%"></i></div><b>${b.high}</b></div><div class="bias-row"><span>متوسطة</span><div class="mo-bar"><i class="conf" style="width:${b.mid / max * 100}%"></i></div><b>${b.mid}</b></div><div class="bias-row"><span>منخفضة</span><div class="mo-bar"><i class="bear" style="width:${b.low / max * 100}%"></i></div><b>${b.low}</b></div></div>`; }
  function riskRadar(r) { if (!r.length) return miniEmpty(); const levels = { low: 0, medium: 0, high: 0 }; r.forEach(x => { const k = riskKey(x.risk || x.riskLevel); levels[k]++; }); const max = Math.max(1, ...Object.values(levels)); const L = { low: ["منخفضة", "ok"], medium: ["متوسطة", "warn"], high: ["مرتفعة", "bear"] }; return `<div class="conf-bars">${Object.entries(levels).map(([k, v]) => `<div class="bias-row"><span>${L[k][0]}</span><div class="mo-bar"><i class="${L[k][1] === "ok" ? "" : L[k][1]}" style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>`; }
  function miniChart(a, options = {}) {
    const large = options.large === true;
    const points = normalizeChartData(a.chartData || a.history || a.sparkline || a.candles);
    const series = points.map(p => num(p.close, p.value, p.price, p)).filter(v => v !== null);
    if (series.length < 2) {
      return `<div class="chart-empty ${large ? "large" : ""}"><div><strong>لا توجد بيانات رسم بياني</strong><p>لم يرجع المزود نقاطاً كافية لهذا الإطار الزمني.</p></div></div>`;
    }
    const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
    const height = large ? 100 : 40;
    const padding = large ? 6 : 2;
    const pts = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(height - padding - (v - min) / rng * (height - padding * 2)).toFixed(2)}`).join(" ");
    const up = series[series.length - 1] >= series[0];
    return `<div class="detail-chart-wrap ${large ? "large" : ""}">
      <svg class="detail-chart ${large ? "large" : ""}" viewBox="0 0 100 ${height}" preserveAspectRatio="none"><polyline points="${pts}" class="${up ? "up" : "down"}"></polyline></svg>
      ${large ? `<div class="chart-caption"><span>${h(state.timeframe || "1Y")}</span><b class="ltr ${up ? "up" : "down"}">${h(change(((series[series.length - 1] - series[0]) / (series[0] || 1)) * 100))}</b></div>` : ""}
    </div>`;
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
  function technical(a, tech, c) {
    const t = tech || {};
    const ind = t.indicators || {};
    const ma = t.movingAverages || t.averages || {};
    const levels = t.levels || {};
    const piv = t.pivotPoints || t.pivots || {};
    const supports = Array.isArray(t.support) ? t.support : Array.isArray(levels.support) ? levels.support : [];
    const resistances = Array.isArray(t.resistance) ? t.resistance : Array.isArray(levels.resistance) ? levels.resistance : [];
    const current = firstNum(a.price, a.lastPrice, a.regularMarketPrice, a.close, t.currentPrice, t.price);
    const canShowLevels = hasChartHistory(a, t);
    const rsi = firstNum(t.rsi, t.rsi14, t.RSI, ind.rsi, ind.rsi14);
    const macd = firstNum(t.macd, t.macdValue, ind.macd, ind.macdValue), macdSig = firstNum(t.macdSignal, t.signalLine, ind.macdSignal, ind.signalLine);
    const ma50 = firstNum(t.ma50, t.sma50, t.ema50, ma.ma50, ma.sma50, ma.ema50, ind.sma50, ind.ema50);
    const ma200 = firstNum(t.ma200, t.sma200, t.ema200, ma.ma200, ma.sma200, ma.ema200, ind.sma200, ind.ema200);
    const vol = firstNum(t.volatility, t.atr, t.atr14, ind.atr, ind.atr14);
    const s1raw = validTechnicalLevel(firstNum(t.s1, t.support1, supports[0], levels.s1, piv.s1, t.support), current, "support", canShowLevels);
    const s2raw = validTechnicalLevel(firstNum(t.s2, t.support2, supports[1], levels.s2, piv.s2), current, "support", canShowLevels);
    const r1raw = validTechnicalLevel(firstNum(t.r1, t.resistance1, resistances[0], levels.r1, piv.r1, t.resistance), current, "resistance", canShowLevels);
    const r2raw = validTechnicalLevel(firstNum(t.r2, t.resistance2, resistances[1], levels.r2, piv.r2), current, "resistance", canShowLevels);
    // توحيد الترتيب: دعم 1 هو الأقرب تحت السعر، مقاومة 1 هي الأقرب فوقه — مهما اختلف مصدر كل مستوى
    const sLevels = [s1raw, s2raw].filter(v => v !== null && (current === null || v <= current * 1.002)).sort((a, b) => b - a);
    const rLevels = [r1raw, r2raw].filter(v => v !== null && (current === null || v >= current * 0.998)).sort((a, b) => a - b);
    const s1 = sLevels[0] ?? null, s2 = sLevels[1] ?? null;
    const r1 = rLevels[0] ?? null, r2 = rLevels[1] ?? null;
    const trend = trendText(t.trend || t.direction || ind.trend || (ma50 !== null && ma200 !== null ? (ma50 >= ma200 ? "صاعد" : "هابط") : ""));
    const rsiTag = rsi === null ? "" : rsi >= 70 ? " (تشبع شرائي)" : rsi <= 30 ? " (تشبع بيعي)" : "";
    const macdTag = (macd !== null && macdSig !== null) ? (macd >= macdSig ? " · إيجابي" : " · سلبي") : "";
    const rows = [
      ["الاتجاه العام", trend || "غير متاح"],
      ["RSI (14)", rsi === null ? "غير متاح" : Math.round(rsi) + rsiTag],
      ["MACD", macd === null ? "غير متاح" : (Math.round(macd * 1000) / 1000) + macdTag],
      ["متوسط 50", price(ma50, c)], ["متوسط 200", price(ma200, c)],
      ["دعم 1", price(s1, c)], ["دعم 2", price(s2, c)],
      ["مقاومة 1", price(r1, c)], ["مقاومة 2", price(r2, c)],
      ["التذبذب", vol === null ? "غير متاح" : (Math.round(vol * 100) / 100)],
      ["التوصية الفنية", t.recommendation || t.action || t.signal || "غير متاح"]
    ];
    return `<div class="table-shell"><table><tbody>${rows.map(([k, v]) => `<tr><th>${h(k)}</th><td class="ltr">${h(v == null || v === "" || v === "--" ? "غير متاح" : v)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function riskReward(rec, c) {
    if (!rec) return "";
    const metrics = tradeMetricsForAsset(rec);
    const entry = metrics.entry;
    const tps = arr(rec.takeProfit).map(Number).filter(Number.isFinite);
    const tgt1 = num(metrics.target, tps[0]);
    const tgt2 = num(rec.target2, tps[1]);
    const sl = metrics.stop;
    if (entry === null || tgt1 === null || sl === null) return "";
    const risk = Math.abs(entry - sl); if (!risk) return "";
    const rr1 = Math.round(Math.abs(tgt1 - entry) / risk * 100) / 100;
    const rr2 = tgt2 === null ? null : Math.round(Math.abs(tgt2 - entry) / risk * 100) / 100;
    return `<div class="detail-grid">${detailCard("الدخول", price(entry, c), "Entry")}${detailCard("الهدف 1 · احتمال مرتفع", price(tgt1, c), "TP1")}${tgt2 !== null ? detailCard("الهدف 2 · تمديد", price(tgt2, c), "TP2") : ""}${detailCard("وقف الخسارة", price(sl, c), "Stop")}${detailCard("الصعود المتوقع", formatSignalPercent(metrics.upsidePercent), "Upside")}${detailCard("الهبوط إلى وقف الخسارة", formatSignalPercent(metrics.downsidePercent), "Downside")}${detailCard("نسبة العائد إلى المخاطرة", formatRiskRewardRatio(metrics.riskRewardRatio), "R/R")}${detailCard("العائد/المخاطرة", rr2 !== null ? `${rr2}:1 · TP2` : `${rr1}:1 · TP1`, "Legacy R/R")}</div>
    <p class="muted-note">الهدف الأول قريب عمداً (≈0.9×ATR) لرفع احتمال الإصابة — وهو الهدف الذي تُقاس عليه نسبة النجاح التاريخية. الوقف أوسع خلف الهيكل السعري، لذلك العائد/المخاطرة يُقرأ مع الهدف الثاني.</p>`;
  }
  function signalAnalysis(rec, c) {
    const metrics = tradeMetricsForAsset(rec);
    const sig = metrics.signal, conf = metrics.confidence === null ? "--" : Math.round(metrics.confidence) + "%";
    const reasons = arr(rec.reasons).map(String).filter(Boolean).slice(0, 5);
    const warnings = arr(rec.warnings).map(String).filter(Boolean).slice(0, 5);
    const score = rec.scoreBreakdown || rec.score_breakdown || {};
    const quality = rec.dataQuality || rec.data_quality || "--";
    const provider = rec.provider || rec.source || "--";
    const summary = rec.signalExplanationAr || rec.signal_explanation_ar || metrics.explanation || rec.reason || rec.summary || reasons[0] || "قراءة تحليلية مبنية على البيانات المتاحة.";
    const scoreRows = [
      ["فني", score.technicalScore, 40],
      ["زخم", score.momentumScore, 20],
      ["أخبار", score.newsScore, 15],
      ["أساسيات", score.fundamentalsScore, 15]
    ].filter(([, value]) => value !== undefined && value !== null);
    const pm = rec.precisionMode || rec.precision || null;
    const bt = rec.backtest || null;
    const precisionRate = num(pm && pm.measuredWinRate, bt && bt.winRate);
    return `<div class="signal-analysis">
      <p>${h(summary)}</p>
      <div class="detail-grid">
        ${detailCard("الإشارة", sigLabel(sig), "Action")}
        ${detailCard("الثقة", conf, "Confidence")}
        ${detailCard("الصعود المتوقع", formatSignalPercent(metrics.upsidePercent), "Upside")}
        ${detailCard("الهبوط إلى وقف الخسارة", formatSignalPercent(metrics.downsidePercent), "Downside")}
        ${detailCard("نسبة العائد إلى المخاطرة", formatRiskRewardRatio(metrics.riskRewardRatio), "R/R")}
        ${precisionRate !== null ? detailCard("الدقة التاريخية", `${precisionRate}%${pm && pm.passed ? " ✓" : ""}`, "Backtest") : ""}
        ${bt && num(bt.samples) !== null ? detailCard("عينات الاختبار", latinNumber(bt.samples), "Samples") : ""}
        ${detailCard("المخاطرة", riskShort(rec.risk || rec.riskLevel), "Risk")}
        ${detailCard("المدة", rec.timeframe || rec.horizon || rec.duration || "--", "Horizon")}
        ${detailCard("مزود البيانات", provider, "Provider")}
        ${detailCard("جودة البيانات", dataQualityLabel(quality), "Quality")}
      </div>
      ${riskReward(rec, c)}
      ${scoreRows.length ? `<div class="table-shell"><table><tbody>${scoreRows.map(([label, value, max]) => `<tr><th>${h(label)}</th><td class="ltr">${h(latinNumber(value))} / ${h(max)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${reasons.length ? `<div class="trade-list">${reasons.map(r => `<article class="trade-item"><strong>سبب</strong><p>${h(r)}</p></article>`).join("")}</div>` : ""}
      ${warnings.length ? `<div class="trade-list">${warnings.map(w => `<article class="trade-item"><strong>تنبيه مخاطرة</strong><p>${h(w)}</p></article>`).join("")}</div>` : ""}
      <p class="muted-note">هذه إشارات تحليلية تعليمية مبنية على البيانات المتاحة، ولا تُعد نصيحة مالية أو توصية ملزمة بالشراء أو البيع. القرار النهائي مسؤولية المستخدم.</p>
      <p class="muted-note ltr">These are educational analytical signals based on available data and are not financial advice.</p>
    </div>`;
  }
  function detailCard(label, value, helper) { return `<article class="detail-card"><span class="card-kicker">${h(helper)}</span><strong class="ltr">${h(displayValue(value))}</strong><p>${h(label)}</p></article>`; }

  /* ── multi-strategy consensus engine: combine several classic strategies,
     take the most-agreed (most accurate) verdict. ── */
  function strategySignals(asset, tech, rec) {
    const t = tech || {}, sigs = [];
    const indicators = t.indicators || t.technicalIndicators || t.technical || {};
    const moving = t.movingAverages || t.moving_averages || indicators.movingAverages || indicators.moving_averages || {};
    const levels = t.levels || t.keyLevels || t.supportResistance || {};
    const price = num(asset.price, asset.lastPrice, asset.regularMarketPrice, asset.close, rec && rec.currentPrice, t.price, t.currentPrice);
    const ma50 = num(t.ma50, t.sma50, t.ema50, moving.ma50, moving.sma50, moving.ema50), ma200 = num(t.ma200, t.sma200, t.ema200, moving.ma200, moving.sma200, moving.ema200);
    const rsi = num(t.rsi, t.rsi14, t.RSI, indicators.rsi, indicators.rsi14), macd = num(t.macd, t.macdValue, indicators.macd, indicators.macdValue), macdSig = num(t.macdSignal, t.signalLine, indicators.macdSignal, indicators.signalLine);
    const s1 = num(t.support, t.s1, t.support1, levels.support, levels.s1, levels.support1), r1 = num(t.resistance, t.r1, t.resistance1, levels.resistance, levels.r1, levels.resistance1);
    const chg = num(asset.changePercent, asset.percentChange, rec && rec.expectedMovePct);
    const push = (name, signal, weight, note, kind = "technical") => sigs.push({ name, signal, weight, note, kind });
    if (ma50 !== null && ma200 !== null) push("اتجاه — تقاطع المتوسطات", ma50 >= ma200 ? "buy" : "sell", 1.3, ma50 >= ma200 ? "المتوسط 50 فوق 200 (تقاطع ذهبي)" : "المتوسط 50 تحت 200 (تقاطع موت)");
    if (rsi !== null) push("RSI — تشبع/ارتداد", rsi <= 30 ? "buy" : rsi >= 70 ? "sell" : "neutral", 1.0, rsi <= 30 ? `تشبع بيعي (${Math.round(rsi)})` : rsi >= 70 ? `تشبع شرائي (${Math.round(rsi)})` : `محايد (${Math.round(rsi)})`);
    if (macd !== null && macdSig !== null) push("MACD — زخم", macd >= macdSig ? "buy" : "sell", 1.1, macd >= macdSig ? "تقاطع إيجابي" : "تقاطع سلبي");
    if (price !== null && ma50 !== null) push("السعر مقابل المتوسط 50", price >= ma50 ? "buy" : "sell", 0.9, price >= ma50 ? "السعر فوق المتوسط" : "السعر تحت المتوسط");
    if (price !== null && s1 !== null && r1 !== null) { const mid = (s1 + r1) / 2; push("الدعم/المقاومة", price <= s1 * 1.02 ? "buy" : price >= r1 * 0.98 ? "sell" : price >= mid ? "buy" : "neutral", 0.8, price <= s1 * 1.02 ? "قرب الدعم" : price >= r1 * 0.98 ? "قرب المقاومة" : "داخل النطاق"); }
    if (chg !== null) push("الزخم اللحظي", chg > 0.3 ? "buy" : chg < -0.3 ? "sell" : "neutral", 0.7, `${chg > 0 ? "+" : ""}${Number(chg).toFixed(2)}%`, "price");
    if (rec) {
      const recMetrics = tradeMetricsForAsset(rec);
      push("توصية المزود (AI)", recMetrics.signal, 1.2, sigLabel(recMetrics.signal) + (recMetrics.confidence !== null ? ` · ${Math.round(recMetrics.confidence)}%` : ""), "provider");
    }
    return sigs;
  }
  function consensus(sigs) {
    let buy = 0, sell = 0, neutral = 0, tw = 0;
    sigs.forEach(s => { if (isBuySignalName(s.signal)) buy += s.weight; else if (isSellSignalName(s.signal)) sell += s.weight; else neutral += s.weight; tw += s.weight; });
    if (!tw) return { signal: "watch", agreement: 0, score: 0, buy: 0, sell: 0, neutral: 0, count: 0 };
    const top = Math.max(buy, sell, neutral);
    const sigName = (top === buy && buy > 0) ? "buy" : (top === sell && sell > 0) ? "sell_or_avoid" : "watch";
    const agreement = Math.round(top / tw * 100);
    const coverage = Math.min(1, sigs.length / 6);
    return { signal: sigName, agreement, score: Math.round(agreement * coverage), buy: Math.round(buy / tw * 100), sell: Math.round(sell / tw * 100), neutral: Math.round(neutral / tw * 100), count: sigs.length };
  }
  function strategyConsensus(asset, tech, rec) {
    const sigs = strategySignals(asset, tech, rec), c = consensus(sigs);
    const technicalCount = sigs.filter(item => item.kind === "technical").length;
    if (technicalCount < 2) return emptyState("بيانات غير كافية", "يحتاج إجماع الاستراتيجيات إلى مؤشرين فنيين على الأقل قبل حساب الثقة. لن نعرض 100% مراقبة عند غياب المؤشرات.", "الإعدادات", `${ROOT}/settings`);
    const tone = signalToneClass(c.signal);
    const rows = sigs.map(s => `<div class="strat-row"><span class="strat-name">${h(s.name)}</span><span class="strat-note">${h(s.note)}</span><span class="vote ${signalToneClass(s.signal)}">${h(sigLabel(s.signal))}</span></div>`).join("");
    return `<div class="strategy-consensus">
      <div class="consensus-head"><div><span class="card-kicker">CONSENSUS · أُخذت الإشارة الأكثر اتفاقاً (الأدق)</span><strong class="state-${tone}">${h(sigLabel(c.signal))}</strong></div><div class="consensus-score"><b>${c.agreement}%</b><small>اتفاق · ${c.count} استراتيجية</small></div></div>
      <div class="bias-rows">
        <div class="bias-row"><span>شراء</span><div class="mo-bar"><i style="width:${c.buy}%"></i></div><b>${c.buy}%</b></div>
        <div class="bias-row"><span>بيع</span><div class="mo-bar"><i class="bear" style="width:${c.sell}%"></i></div><b>${c.sell}%</b></div>
        <div class="bias-row"><span>محايد</span><div class="mo-bar"><i class="neut" style="width:${c.neutral}%"></i></div><b>${c.neutral}%</b></div>
      </div>
      <div class="strat-list">${rows}</div>
      <p class="muted-note">الدقة تقديرية مبنية على اتفاق الاستراتيجيات وتغطية البيانات، وليست ضماناً. ليست نصيحة استثمارية.</p>
    </div>`;
  }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(helper)}</span><strong>${h(String(value))}</strong><small>${h(label)}</small></article>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(kicker)}</span><h2>${title}</h2><p>${h(body)}</p></section>`; }
  function unavailableSection(response, fallbackBody, label, href) {
    const unavailableTitle = response && response.routeUnavailable ? ROUTE_UNAVAILABLE_MESSAGE : UNAVAILABLE_MESSAGE;
    const body = (response && response.message) || fallbackBody || UNAVAILABLE_MESSAGE;
    return emptyState(unavailableTitle, body, label, href);
  }
  function emptyState(title, body, label, href) { return `<div class="empty-state compact"><span class="empty-glyph">◎</span><h3>${h(title)}</h3><p>${h(body)}</p><div class="row-actions">${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(label)}</a>` : ""}<button class="ghost-btn" data-retry>إعادة المحاولة</button></div></div>`; }
  function miniEmpty() { return `<div class="empty-state compact"><p>لا توجد بيانات حالياً من المزود.</p></div>`; }
  function marketUnavailable(m, data) { const meta = marketMetadata(m.id); return `<section class="panel unavailable-panel"><span class="empty-glyph">⚠</span><h2>بيانات ${h(meta.ar)} غير متاحة</h2><p>${h((data && data.message) || providerCopy().copy)}</p>
    <div class="detail-grid">${detailCard("الرموز المدعومة", String(m.symbols.length), "Symbols")}${detailCard("العملة", contextCurrency({ marketId: meta.id }), "Currency")}${detailCard("الحالة", providerCopy().raw, "Status")}${detailCard("آخر تحديث", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit" }), "Updated")}</div>
    <div class="chip-row">${m.symbols.map(s => `<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div>
    <div class="row-actions"><button class="ghost-btn" data-retry>إعادة المحاولة</button></div></section>`; }
  function disclaimer() { return `<section class="disclaimer-note"><strong>تنبيه:</strong> جميع المحتويات لأغراض تعليمية ومعلوماتية فقط ولا تُعد نصيحة استثمارية. التداول ينطوي على مخاطرة قد تصل لكامل رأس المال.</section>`; }
  function loading() { return `<section class="loading-panel"><span class="pulse-orb"></span><h2>يتم تجهيز منصة التداول</h2><p>نحمّل حالة المزود، الأخبار، التوصيات، وقوائم المتابعة بدون إنشاء بيانات وهمية.</p></section>`; }

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
  function marketGlyph(m) { const G = { forex: "💱", "us-stocks": "🇺🇸", kuwait: "🇰🇼", saudi: "🇸🇦", uae: "🇦🇪", qatar: "🇶🇦", bahrain: "🇧🇭", oman: "🇴🇲", gcc: "🕌", europe: "🇪🇺", asia: "🌏", crypto: "₿", commodities: "🛢", indices: "📊", etfs: "📦", technology: "💻", ai: "🤖", semiconductors: "🔌", energy: "⚡", banking: "🏦", healthcare: "💊", food: "🍔" }; return G[m.id] || "📈"; }

  function providerToolbarDetails(s) {
    const context = activeMarketContext();
    const available = s.availableProviders && s.availableProviders.length ? s.availableProviders : availableProviderNames();
    const providerList = available.length ? available.join(isArabic() ? "، " : ", ") : unavailableMark();
    const rows = [
      [tx("السوق", "Market"), context.marketName],
      [tx("الفئة", "Category"), context.assetClass],
      [tx("العملة", "Currency"), context.currency],
      [tx("المزود المستخدم", "Used provider"), s.provider || unavailableMark()],
      [tx("المزودون المتاحون", "Available providers"), providerList]
    ];
    return `<details class="provider-toolbar-details"><summary>${h(tx("المزودون", "Providers"))}</summary><div class="provider-toolbar-list">${rows.map(([label, value]) => `<span>${h(label)}</span><b class="ltr">${h(value)}</b>`).join("")}</div></details>`;
  }
  function status() {
    const s = providerCopy(), pill = document.getElementById("provider-status");
    if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span class="provider-pill-main"><small>${h(s.title)}</small><strong>${h(s.provider || s.copy)}</strong></span>${s.fallbackUsed ? `<span class="provider-pill-tag">${h(tx("مزود بديل", "Fallback"))}</span>` : ""}${providerToolbarDetails(s)}`;
    const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy");
    if (dot) dot.className = `status-dot ${s.className}`;
    if (title) title.textContent = s.title;
    if (copy) copy.textContent = s.copy;
    const session = document.getElementById("session-status");
    if (session) {
      const context = activeMarketContext();
      session.textContent = marketHeaderText(context);
      session.title = `${tx("السوق", "Market")}: ${context.marketName} · ${tx("الفئة", "Category")}: ${context.assetClass} · ${tx("العملة", "Currency")}: ${context.currency}`;
    }
  }
  function ticker() {
    const row = document.getElementById("ticker-row"); if (!row) return;
    const idx = [["NAS100", "NAS100"], ["US30", "US30"], ["XAUUSD", "Gold"], ["WTI", "Oil"], ["BTCUSD", "BTC/USD"], ["KFH.KW", "KFH"]];
    row.innerHTML = idx.map(([s, label]) => { const r = norm({ ...(findAssetForSymbol(s, recs()) || {}), symbol: s }); const p = num(r.price, r.currentPrice, r.lastPrice); const chg = num(r.changePercent, r.percentChange); return `<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo(r)}<span><strong>${h(label)}</strong><small class="ltr">${p === null ? "—" : price(p, currency(r))} ${chg === null ? "" : `<i class="${chg >= 0 ? "up" : "down"}">${change(chg)}</i>`}</small></span></button>`; }).join("");
  }
  function statusBar() {
    const bar = document.getElementById("terminal-statusbar"); if (!bar) return;
    const rec = recs(), mk = arr(state.markets.markets || state.markets.data || state.markets.results), p = providerCopy();
    const cells = [["البيانات اللحظية", p.className === "online" ? "متصلة" : "غير متصلة", "Real-time"], ["الأسواق", mk.length || MARKETS.length, "Markets"], ["الأصول المحللة", rec.length || "--", "Analyzed"], ["قائمة المتابعة", state.watch.length, "Watchlist"], ["آخر تحديث", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), "Updated"]];
    bar.innerHTML = cells.map(([l, v, hp]) => `<div class="sb-cell"><span>${h(l)}</span><strong>${h(String(v))}</strong><em>${h(hp)}</em></div>`).join("") + `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${p.className === "online" ? "النظام يعمل" : "بانتظار المزود"}</strong></div>`;
  }

  /* ───────────────────── Actions ───────────────────── */
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(`تمت إضافة ${s} لقائمة المتابعة.`); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x => x !== s); write(keys.watch, state.watch); toast(`تمت إزالة ${s}.`); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{ symbol: s, type: "signal", title: `متابعة ${s}`, message: "تنبيه محلي محفوظ. يحتاج مزود أسعار لتفعيله تلقائياً.", createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(`تم إنشاء تنبيه لـ ${s}.`); render(); }
  function deleteAlert(i) { state.alerts.splice(Number(i), 1); write(keys.alerts, state.alerts); render(); }
  function tradeDraftFromAsset(asset, sourceType = "manual") {
    const a = norm(asset), metrics = tradeMetricsForAsset(a), action = metrics.signal, now = new Date().toISOString(), entry = metrics.entry;
    return {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      symbol: a.symbol,
      assetName: a.name || a.assetName || a.symbol,
      assetLogo: a.assetLogo || a.logoUrl || null,
      market: a.market || "",
      action,
      entryPrice: entry,
      currentPrice: num(a.currentPrice, a.price, a.lastPrice, entry),
      targetPrice: num(a.targetPrice, a.target, a.target1),
      stopLoss: num(a.stopLoss, a.stop),
      confidence: num(a.confidence, a.score),
      riskLevel: riskKey(a.riskLevel || a.risk),
      timeframe: a.timeframe || a.duration || "1-3 أسابيع",
      status: action === "wait" ? "waiting" : "open",
      openedAt: now,
      updatedAt: now,
      provider: a.provider || a.source || "",
      sourceSignalId: a.sourceSignalId || a.source_signal_id || null,
      sourceType,
      notes: a.notes || a.reason || "",
      currency: a.currency || currency(a),
      payload: a
    };
  }
  async function persistFollowedTrade(draft) {
    const result = await post("/followed-trades", draft);
    if (result.ok) {
      toast("تمت إضافة الصفقة إلى أداء الصفقات.");
    } else {
      state.localTrades = [draft, ...state.localTrades].slice(0, 80);
      write(keys.followed, state.localTrades);
      toast("تم حفظ الصفقة محلياً؛ سجّل الدخول أو طبّق migrations للحفظ في قاعدة البيانات.");
    }
    await refreshFollowedTrades(false);
  }
  function followRecommendationTrade(raw) {
    const s = sym(raw), rec = matchRec(s);
    if (!rec) return toast("لم أجد توصية محفوظة لهذا الرمز حالياً.");
    persistFollowedTrade(tradeDraftFromAsset(rec, "recommendation_card"));
  }
  async function refreshFollowedTrades(force) {
    const data = await get(`/followed-trades${force ? "?refresh=1" : ""}`);
    if (data.ok) {
      state.followed = data;
      if (force) toast("تم تحديث أسعار صفقات المتابعة.");
      render();
      afterRoute();
    } else {
      toast("تعذر تحديث صفقات المتابعة حالياً.");
    }
  }
  async function runSignalRefresh() {
    const result = await post("/market/signals/refresh", { symbols: defaults, force: true });
    if (!result.ok) {
      await get(`/market/signals?symbols=${encodeURIComponent(defaults.join(","))}&refresh=1&limit=${defaults.length}`);
      toast("تم تشغيل فحص إشارات محلي؛ الحفظ التلقائي يحتاج صلاحية قاعدة البيانات.");
    } else {
      toast("تم تشغيل فحص الإشارات وحفظ المرشحات المتاحة.");
    }
    await refreshFollowedTrades(true);
  }
  async function runAnalysisRefresh() {
    if (state.analysisLoading) return;
    state.analysisLoading = true;
    render();
    const symbols = unique([...dashboardSymbols(), ...recs().map(item => item.symbol), ...defaults]).slice(0, 80);
    let result = {};
    try {
      result = await post("/market/signals/refresh", { symbols, force: true }, { label: "signals", timeoutMs: REQUEST_TIMEOUTS.signals });
      if (!result || result.ok === false) {
        result = await get(`/market/signals?symbols=${encodeURIComponent(symbols.join(","))}&refresh=1&limit=${symbols.length}`, { label: "signals" });
      }
      const processed = numberValue(result.requested, result.scannedAssets, result.processedAssets, result.analyzedAssets, arr(result.signals || result.items || result.data || result.results).length, symbols.length);
      state.signals = { ...(result || {}), requested: processed, ranAt: result.generatedAt || result.updatedAt || new Date().toISOString() };
      state.traderStatus = await get("/trader/status", { label: "providerStatus" });
      toast(isArabic() ? "\u062a\u0645 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644." : "Analysis completed.");
    } catch (error) {
      devLog("signals", "failed", { route: "run-analysis", message: errorMessage(error) });
      toast(isArabic() ? "\u062a\u0639\u0630\u0631 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644." : "Analysis could not run.");
    } finally {
      state.analysisLoading = false;
      render();
      afterRoute();
    }
  }
  async function refreshProviderStatus(force) {
    try {
      const suffix = force ? "?refresh=1&discover=1" : "";
      const [providerStatus, traderStatus] = await Promise.all([
        get(`/trader/provider-status${suffix}`, { label: "providerStatus" }),
        get("/trader/status", { label: "providerStatus" })
      ]);
      state.providerStatus = providerStatus || {};
      state.traderStatus = traderStatus || {};
      if (providerStatus && providerStatus.dataProvider) state.provider = providerStatus.dataProvider;
      render();
    } catch (error) {
      devLog("providerStatus", "failed", { route: "refresh-provider", message: errorMessage(error) });
      toast(isArabic() ? "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0632\u0648\u062f." : "Provider status could not refresh.");
    }
  }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.textContent = message; root.appendChild(node); setTimeout(() => node.remove(), 3200); }

  // form submits via delegation (forms re-render, so use document-level submit)
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "alert-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast("اكتب رمزاً."); state.alerts = [{ symbol: s, type: f.get("type"), value: f.get("value"), title: `تنبيه ${s}`, createdAt: new Date().toISOString() }, ...state.alerts].slice(0, 30); write(keys.alerts, state.alerts); toast(`تم إنشاء تنبيه لـ ${s}.`); render(); }
    if (e.target.id === "holding-form") { e.preventDefault(); const f = new FormData(e.target); const s = sym(f.get("symbol")); if (!s) return toast("اكتب رمزاً."); state.holdings = [{ symbol: s, qty: f.get("qty"), entry: f.get("entry") }, ...state.holdings].slice(0, 50); write(keys.holdings, state.holdings); toast(`تمت إضافة مركز ${s}.`); render(); }
    if (e.target.id === "followed-trade-form") {
      e.preventDefault();
      const f = new FormData(e.target);
      const s = sym(f.get("symbol"));
      if (!s) return toast("اكتب رمزاً.");
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
      state.settings.enabledMarkets = f.getAll("enabledMarkets").map(String).filter(Boolean);
      state.settings.buyAlertsEnabled = f.get("buyAlertsEnabled") === "on";
      state.settings.sellAlertsEnabled = f.get("sellAlertsEnabled") === "on";
      state.settings.waitAlertsEnabled = f.get("waitAlertsEnabled") === "on";
      state.settings.inAppAlertsEnabled = f.get("inAppAlertsEnabled") === "on";
      state.settings.emailAlertsEnabled = f.get("emailAlertsEnabled") === "on";
      write(keys.settings, state.settings);
      saveSignalPreferences(signalPrefs()).then(ok => toast(ok ? "تم حفظ تفضيلات الإشارات." : "تم حفظها محلياً؛ يلزم تسجيل الدخول لحفظها في الحساب."));
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
  function recs() { return mergeRecLists(signalsFrom(state.signals), legacyRecsFrom(state.rec)); }
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
    const confidence = num(x.confidence, base.confidence);
    const dataQuality = x.dataQuality || x.data_quality || base.dataQuality;
    const classification = classifySignalMetrics({ current: currentPrice, target: targetPrice, stop: stopLoss, confidence, dataQuality });
    const reasons = arr(x.reasons).map(String).filter(Boolean);
    const warnings = arr(x.warnings).map(String).filter(Boolean);
    return {
      ...base,
      assetType: x.assetType || x.asset_type || base.assetType,
      market: x.market || base.market,
      currency: x.currency || base.currency,
      signal: classification.signal,
      recommendation: classification.signal,
      action: classification.signal,
      id: x.id || base.id,
      sourceSignalId: x.id || x.sourceSignalId || x.source_signal_id || base.sourceSignalId,
      actionLabelAr: x.actionLabelAr || x.action_label_ar,
      actionLabelEn: x.actionLabelEn || x.action_label_en,
      confidence,
      score: num(x.confidence, base.score),
      price: currentPrice,
      currentPrice,
      previousClose: base.previousClose,
      change: base.change,
      changePercent: base.changePercent,
      target: targetPrice,
      targetPrice,
      stopLoss,
      stop: stopLoss,
      riskLevel: x.riskLevel || x.risk_level || base.riskLevel,
      dataQuality,
      provider: x.provider || base.provider,
      source: x.source || x.provider || base.source,
      providerSymbol: base.providerSymbol,
      providerSymbolUsed: base.providerSymbolUsed,
      fallbackUsed: base.fallbackUsed,
      providerStatus: base.providerStatus,
      timeframe: x.timeframe || base.timeframe,
      reasons,
      warnings,
      reason: classification.explanation || reasons[0] || x.reason || base.reason,
      signalExplanationAr: x.signalExplanationAr || x.signal_explanation_ar || classification.explanation,
      summary: x.summary || reasons.join(" · "),
      status: x.status || base.status || "open",
      scoreBreakdown: x.scoreBreakdown || x.score_breakdown,
      technicalSummary: x.technicalSummary || x.technical_summary,
      disclaimerAr: x.disclaimerAr,
      disclaimerEn: x.disclaimerEn,
      lastUpdated: x.lastUpdated || x.last_updated || x.created_at || base.lastUpdated
    };
  }
  function signalNotifications() { return arr(state.signalAlerts.notifications || state.signalAlerts.items || state.signalAlerts.data || state.signalAlerts.results); }
  function signalHistoryItems() {
    const rows = arr(state.signals.history || state.signals.signalHistory || state.signals.signal_history);
    if (rows.length) return rows.map(row => ({
      title: row.title || `تغيرت الإشارة على ${sym(row.symbol)}`,
      symbol: row.symbol,
      message: row.message || `${sigLabel(row.old_action || row.oldAction || "watch")} → ${sigLabel(row.new_action || row.newAction || "watch")} · ${latinNumber(row.new_confidence || row.newConfidence)}%`
    }));
    return signalNotifications().filter(item => String(item.event || "").includes("change") || String(item.title || "").includes("تغير")).slice(0, 4);
  }
  function smartAlerts() { return [...signalNotifications(), ...arr(state.rec.smartAlerts || state.rec.alerts || state.rec.signals)]; }
  function newsItems() { return arr(state.news.items || state.news.articles || state.news.news || state.news.data || state.news.results); }
  function trades() { return mergeTradeLists(arr(state.followed.followedTrades || state.followed.trades || state.followed.items || state.followed.data || state.followed.followed), state.localTrades || []); }
  function matchRec(s) { const k = sym(s); return recs().find(x => sym(x.symbol) === k) || null; }
  function topPicks(r, n) { return [...r].sort((a, b) => (num(b.confidence, b.score, b.aiConfidence) || 0) - (num(a.confidence, a.score, a.aiConfidence) || 0)).slice(0, n); }
  function sortMovers(r) { const normalized = r.map(norm); const withChg = normalized.filter(x => num(x.changePercent, x.percentChange) !== null); const byChg = [...withChg].sort((a, b) => num(b.changePercent, b.percentChange) - num(a.changePercent, a.percentChange)); return { gainers: byChg, losers: [...byChg].reverse(), active: topPicks(normalized, normalized.length) }; }
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
  function tradeAction(t) { return signal({ action: t.action, signal: t.signal, recommendation: t.recommendation, actionLabelAr: t.actionLabelAr || t.action_label_ar, type: t.type }); }
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
  function norm(x) { return normalizeMarketData(x || {}); }
  function firstDefined(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return null;
  }
  function firstText(...values) {
    const value = firstDefined(...values);
    return value === null ? "" : String(value).trim();
  }
  function unspecifiedMetadataText() { return "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f"; }
  function isMissingMetadata(value) {
    const text = String(value ?? "").trim();
    return !text || text === "--" || text === "\u2014" || text === "غير متاح" || text === "ØºÙŠØ± Ù…ØªØ§Ø­";
  }
  function metadataFirst(...values) {
    for (const value of values) {
      if (!isMissingMetadata(value)) return String(value).trim();
    }
    return "";
  }
  function metadataDisplayValue(...values) {
    return metadataFirst(...values) || unspecifiedMetadataText();
  }
  function inferExchangeFromSymbol(symbol) {
    const s = sym(symbol);
    if (["AAPL", "MSFT", "NVDA", "GOOGL", "QQQ"].includes(s)) return "NASDAQ";
    if (["SPY", "IWM", "GLD", "VOO", "DIA", "SLV", "TLT", "VTI"].includes(s)) return "NYSE Arca";
    if (s === "EMAAR.AE" || /\.AE$|\.DU$/i.test(s)) return "Dubai Financial Market";
    if (/\.AD$/i.test(s)) return "Abu Dhabi Securities Exchange";
    if (/\.KW$/i.test(s)) return "Boursa Kuwait";
    if (/\.SR$|\.SA$/i.test(s)) return "Tadawul";
    if (/\.OM$/i.test(s)) return "Muscat Stock Exchange";
    if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|LTC|BCH|LINK)[-_/]?(USD|USDT)$/i.test(s)) return "Crypto";
    if (/^(XAUUSD|XAGUSD)$/i.test(s)) return "Metals";
    if (/^[A-Z]{6}$/.test(s)) return "Forex";
    return "";
  }
  function inferMarketFromSymbol(symbol) {
    const s = sym(symbol);
    if (["SPY", "QQQ", "IWM", "GLD", "VOO", "DIA", "SLV", "TLT", "VTI"].includes(s)) return "US ETFs";
    if (/\.AE$|\.DU$|\.AD$/i.test(s)) return "UAE Market";
    if (/\.KW$/i.test(s)) return "Kuwait Market";
    if (/\.SR$|\.SA$/i.test(s)) return "Saudi Market";
    if (/\.OM$/i.test(s)) return "Oman Market";
    if (/^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|LTC|BCH|LINK)[-_/]?(USD|USDT)$/i.test(s)) return "Crypto";
    if (/^(XAUUSD|XAGUSD)$/i.test(s)) return "Metals";
    if (/^[A-Z]{6}$/.test(s)) return "Forex";
    if (/^[A-Z]{1,5}$/.test(s)) return "US Stocks";
    return "";
  }
  function inferCountryFromSymbol(symbol) {
    const s = sym(symbol);
    if (/\.AE$|\.DU$|\.AD$/i.test(s)) return "AE";
    if (/\.KW$/i.test(s)) return "KW";
    if (/\.SR$|\.SA$/i.test(s)) return "SA";
    if (/\.OM$/i.test(s)) return "OM";
    if (/\.QA$/i.test(s)) return "QA";
    if (/\.BH$/i.test(s)) return "BH";
    if (/^[A-Z]{1,5}$/.test(s) || ["SPY", "QQQ", "IWM", "GLD"].includes(s)) return "US";
    return "";
  }
  function exchangeText(asset) {
    const a = asset || {}, ps = a.providerStatus || {}, diag = a.metadataDiagnostics || a.metadata_diagnostics || {};
    return metadataDisplayValue(a.exchange, a.exchangeName, a.exchange_name, a.fullExchangeName, ps.exchange, ps.exchangeName, diag.finalExchange, inferExchangeFromSymbol(a.symbol));
  }
  function marketText(asset) {
    const a = asset || {}, diag = a.metadataDiagnostics || a.metadata_diagnostics || {};
    return metadataDisplayValue(a.market, a.marketName, a.market_name, diag.finalMarket, inferMarketFromSymbol(a.symbol));
  }
  function exchangeBadge(asset) {
    return `<span class="status-tag exchange-badge">${h(exchangeText(asset))}</span>`;
  }
  function boolValue(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined || value === "") return null;
    const text = String(value).trim().toLowerCase();
    if (["true", "yes", "1", "fallback", "fallback_used"].includes(text)) return true;
    if (["false", "no", "0", "primary", "none"].includes(text)) return false;
    return null;
  }
  function providerKey(value, providerSymbol) {
    const symbolHint = String(providerSymbol || "").toUpperCase();
    const raw = String(value || "").trim().toLowerCase();
    if (/^(BINANCE|COINBASE|KRAKEN|FOREXCOM|OANDA|FXCM|TVC|NASDAQ|NYSE|AMEX):/.test(symbolHint)) return "finnhub";
    if (raw.includes("twelve")) return "twelve_data";
    if (raw.includes("financialmodelingprep") || raw === "fmp") return "fmp";
    if (raw.includes("finnhub")) return "finnhub";
    if (raw.includes("yahoo")) return "yahoo";
    if (raw.includes("manual")) return "manual";
    return raw || "";
  }
  function normalizeProvider(value, providerSymbol) {
    return providerKey(value, providerSymbol) || providerKey(inferProviderFromSymbol(providerSymbol), providerSymbol) || "";
  }
  function inferProviderFromSymbol(providerSymbol) {
    const value = String(providerSymbol || "").toUpperCase();
    if (/^(BINANCE|COINBASE|KRAKEN|FOREXCOM|OANDA|FXCM|TVC|NASDAQ|NYSE|AMEX):/.test(value)) return "finnhub";
    return "";
  }
  function normalizeDataQuality(value, priceValue, chartData) {
    const raw = String(value || "").trim().toLowerCase();
    if (["live", "realtime", "real_time"].includes(raw)) return "live";
    if (["cached", "cache"].includes(raw)) return "cached";
    if (["delayed", "delay"].includes(raw)) return "delayed";
    if (["partial", "limited", "stale"].includes(raw)) return "partial";
    if (["unavailable", "missing", "none", "error"].includes(raw)) return "unavailable";
    if (priceValue === null && !chartData.length) return "unavailable";
    return priceValue !== null ? "partial" : "unavailable";
  }
  function normalizeChartPoint(point, index) {
    if (point === null || point === undefined) return null;
    if (typeof point === "number") return Number.isFinite(point) ? { value: point, close: point, index } : null;
    if (typeof point !== "object") {
      const value = num(point);
      return value === null ? null : { value, close: value, index };
    }
    const close = num(point.close, point.c, point.price, point.value, point.adjClose, point.adj_close, point.y);
    if (close === null) return null;
    const time = firstDefined(point.date, point.datetime, point.timestamp, point.time, point.t, point.x, index);
    return {
      ...point,
      time,
      value: close,
      close,
      open: num(point.open, point.o),
      high: num(point.high, point.h),
      low: num(point.low, point.l),
      volume: num(point.volume, point.v)
    };
  }
  function normalizeYahooChartData(value) {
    const result = value && value.chart && arr(value.chart.result)[0];
    if (!result) return [];
    const timestamps = arr(result.timestamp);
    const quote = result.indicators && arr(result.indicators.quote)[0];
    const closes = arr(quote && quote.close);
    return closes.map((close, index) => normalizeChartPoint({
      close,
      open: quote && arr(quote.open)[index],
      high: quote && arr(quote.high)[index],
      low: quote && arr(quote.low)[index],
      volume: quote && arr(quote.volume)[index],
      time: timestamps[index] ? timestamps[index] * 1000 : index
    }, index)).filter(Boolean);
  }
  function normalizeChartData(value) {
    if (!value) return [];
    if (value.chart && value.chart.result) return normalizeYahooChartData(value);
    if (Array.isArray(value)) return value.map(normalizeChartPoint).filter(Boolean);
    if (Array.isArray(value.values)) return value.values.map(normalizeChartPoint).filter(Boolean);
    if (Array.isArray(value.data)) return value.data.map(normalizeChartPoint).filter(Boolean);
    if (Array.isArray(value.candles)) return value.candles.map(normalizeChartPoint).filter(Boolean);
    const closes = arr(value.close || value.c);
    if (closes.length) {
      const times = arr(value.datetime || value.timestamp || value.time || value.t);
      const opens = arr(value.open || value.o), highs = arr(value.high || value.h), lows = arr(value.low || value.l), volumes = arr(value.volume || value.v);
      return closes.map((close, index) => normalizeChartPoint({ close, open: opens[index], high: highs[index], low: lows[index], volume: volumes[index], time: times[index] || index }, index)).filter(Boolean);
    }
    return arr(value).map(normalizeChartPoint).filter(Boolean);
  }
  function normalizeMarketData(input) {
    const x = input || {};
    const ps = x.providerStatus || x.provider_status || {};
    const symbol = sym(x.symbol || x.ticker || x.code || x.asset || x.displaySymbol || x.name || "");
    const providerSymbol = firstText(ps.providerSymbolUsed, ps.providerSymbol, x.providerSymbolUsed, x.provider_symbol_used, x.providerSymbol, x.provider_symbol, x.symbolUsed, x.symbol_used, x.finnhubSymbol, x.fmpSymbol);
    const chartData = normalizeChartData(x.chartData || x.chart_data || x.history || x.sparkline || x.candles || x.values);
    const priceValue = num(x.price, x.currentPrice, x.current_price, x.lastPrice, x.last_price, x.regularMarketPrice, x.regular_market_price, x.close, x.c, x.latestPrice, x.latest_price);
    const previousClose = num(x.previousClose, x.previous_close, x.regularMarketPreviousClose, x.regular_market_previous_close, x.prevClose, x.pc, x.chartPreviousClose);
    let changeValue = num(x.change, x.priceChange, x.price_change, x.regularMarketChange, x.regular_market_change, x.changes, x.d);
    let changePercent = num(x.changePercent, x.change_percent, x.percentChange, x.percent_change, x.regularMarketChangePercent, x.regular_market_change_percent, x.changesPercentage, x.dp);
    if (changeValue === null && priceValue !== null && previousClose !== null) changeValue = priceValue - previousClose;
    if (changePercent === null && priceValue !== null && previousClose !== null && previousClose !== 0) changePercent = ((priceValue - previousClose) / previousClose) * 100;
    if (changePercent === null && changeValue !== null && previousClose !== null && previousClose !== 0) changePercent = (changeValue / previousClose) * 100;
    const providerRaw = firstText(ps.provider, ps.source, x.provider, x.source, x.providerName, x.provider_name, x.dataProvider && (x.dataProvider.active || x.dataProvider.provider || x.dataProvider.name));
    const provider = normalizeProvider(providerRaw, providerSymbol);
    const fallbackUsed = boolValue(firstDefined(ps.fallbackUsed, ps.fallback_used, x.fallbackUsed, x.fallback_used));
    const lastUpdated = firstText(ps.lastUpdated, ps.updatedAt, x.lastUpdated, x.last_updated, x.updatedAt, x.updated_at, x.generatedAt, x.t ? Number(x.t) * 1000 : "");
    const dataQuality = normalizeDataQuality(firstText(ps.dataQuality, ps.data_quality, x.dataQuality, x.data_quality, x.quality), priceValue, chartData);
    const metadataDiagnostics = x.metadataDiagnostics || x.metadata_diagnostics || x.diagnostics || {};
    const exchange = metadataFirst(x.exchange, x.exchangeName, x.exchange_name, x.fullExchangeName, ps.exchange, ps.exchangeName, metadataDiagnostics.finalExchange, inferExchangeFromSymbol(symbol));
    const exchangeCode = metadataFirst(x.exchangeCode, x.exchange_code, ps.exchangeCode, ps.exchange_code, metadataDiagnostics.finalExchangeCode);
    const market = metadataFirst(x.market, x.marketName, x.market_name, metadataDiagnostics.finalMarket, inferMarketFromSymbol(symbol));
    const country = metadataFirst(x.country, x.countryCode, x.country_code, metadataDiagnostics.finalCountry, inferCountryFromSymbol(symbol));
    const currencyValue = metadataFirst(x.currency, x.currencyCode, x.currency_code, x.quoteCurrency, ps.currency, metadataDiagnostics.finalCurrency) || currency({ ...x, symbol });
    const assetTypeValue = metadataFirst(x.assetType, x.asset_type, x.quoteType, x.instrumentType, metadataDiagnostics.finalAssetType) || assetType(symbol, x.assetType || x.asset_type || x.quoteType || x.instrumentType);
    return {
      ...x,
      symbol,
      name: x.name || x.companyName || x.assetName || x.longName || x.shortName || symbol,
      exchange,
      exchangeCode,
      market,
      country,
      currency: currencyValue,
      assetType: assetTypeValue,
      metadataDiagnostics,
      price: priceValue,
      currentPrice: priceValue,
      lastPrice: priceValue,
      previousClose,
      change: changeValue,
      changePercent,
      provider,
      source: providerName(provider || providerRaw),
      providerSymbol: providerSymbol || symbol,
      providerSymbolUsed: providerSymbol || symbol,
      fallbackUsed,
      dataQuality,
      lastUpdated: lastUpdated || x.lastUpdated || x.updatedAt,
      updatedAt: lastUpdated || x.updatedAt || x.lastUpdated,
      chartData,
      history: chartData.length ? chartData : x.history,
      providerStatus: {
        ...ps,
        provider,
        source: providerName(provider || providerRaw),
        providerSymbolUsed: providerSymbol || symbol,
        exchange,
        exchangeCode,
        market,
        country,
        currency: currencyValue,
        assetType: assetTypeValue,
        fallbackUsed,
        dataQuality,
        lastUpdated: lastUpdated || ps.lastUpdated || x.lastUpdated || x.updatedAt
      }
    };
  }
  function signal(x) {
    x = x || {};
    const raw = String(x.signal || x.recommendation || x.action || x.actionLabelAr || x.action_label_ar || x.side || x.type || "watch").toLowerCase();
    if (raw.includes("insufficient") || raw.includes("بيانات غير كافية")) return "insufficient_data";
    if (raw.includes("cautious") || raw.includes("بحذر")) return "cautious_buy";
    if (raw.includes("avoid") || raw.includes("sell_or_avoid") || raw.includes("تجنب")) return "sell_or_avoid";
    if (raw.includes("buy") || raw.includes("شراء") || raw.includes("long")) return "buy";
    if (raw.includes("sell") || raw.includes("بيع") || raw.includes("short")) return "sell_or_avoid";
    if (raw.includes("wait") || raw.includes("hold") || raw.includes("انتظار")) return "wait";
    return "watch";
  }
  function sigLabel(s) { return s === "buy" ? "شراء" : s === "cautious_buy" ? "شراء بحذر" : isSellSignalName(s) ? "تجنب / بيع" : s === "insufficient_data" ? "بيانات غير كافية" : s === "wait" ? "انتظار" : "مراقبة"; }
  function sigLabelEn(s) { return s === "buy" ? "Buy" : s === "cautious_buy" ? "Cautious Buy" : isSellSignalName(s) ? "Avoid / Sell" : s === "insufficient_data" ? "Insufficient data" : s === "wait" ? "Wait" : "Watch"; }
  function recStatus(x) { const s = String(x.status || x.state || "open").toLowerCase(); if (s.includes("complet") || s.includes("مكتمل")) return "مكتملة"; if (s.includes("fail") || s.includes("فاشل")) return "فاشلة"; if (s.includes("expир") || s.includes("expire") || s.includes("منتهي")) return "منتهية"; if (s.includes("watch") || s.includes("متابعة")) return "تحت المتابعة"; return "مفتوحة"; }
  function recStatusTone(x) { const s = recStatus(x); return s === "مكتملة" ? "ok" : s === "فاشلة" ? "bad" : s === "منتهية" ? "muted" : ""; }
  function confText(x) { const c = num(x.confidence, x.score, x.aiConfidence); return c === null ? "--" : Math.round(c) + "%"; }
  function riskKey(v) { const s = String(v || "").toLowerCase(); if (s.includes("high") || s.includes("مرتفع") || s.includes("عالي")) return "high"; if (s.includes("low") || s.includes("منخفض")) return "low"; return "medium"; }
  function riskShort(v) { const k = riskKey(v); return k === "high" ? "عالية" : k === "low" ? "منخفضة" : "متوسطة"; }
  function riskTone(v) { const k = riskKey(v); return k === "high" ? "bad" : k === "low" ? "ok" : "warn"; }
  function riskLabel(r) { return r === "conservative" ? "محافظ" : r === "aggressive" ? "هجومي" : "متوازن"; }
  function dataQualityLabel(value) { const v = String(value || "").toLowerCase(); if (v === "live") return "مباشرة"; if (v === "cached") return "بيانات مخزنة مؤقتاً"; if (v === "delayed") return "متأخرة"; if (v === "partial") return "جزئية"; if (v === "unavailable") return "غير متاحة"; return value || "غير متاح"; }
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
  function marketMetadata(id) {
    const key = String(id || "").trim();
    if (MARKET_METADATA[key]) return MARKET_METADATA[key];
    const m = MARKETS.find(x => x.id === key) || currentMarket();
    return MARKET_METADATA[m.id] || { id: m.id, ar: m.ar, en: m.en, assetAr: m.family, assetEn: m.family, currency: m.currency || "USD" };
  }
  function compactMarketSymbol(symbol) {
    return sym(symbol).replace(/[-_/]/g, "").replace(/=X$/i, "");
  }
  function inferMarketIdFromSymbol(symbol, explicitAssetType) {
    const s = sym(symbol), compact = compactMarketSymbol(s), type = String(explicitAssetType || "").toLowerCase();
    if (type.includes("crypto") || /^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|LTC|BCH|LINK)(USD|USDT)?$/.test(compact)) return "crypto";
    if (type.includes("commodity") || type.includes("metal") || METAL_SYMBOLS.has(compact) || /^(XAUUSD|XAGUSD|GOLD|SILVER|GC=F|SI=F)$/.test(s)) return "metals";
    if (type.includes("forex") || type.includes("currency") || /^[A-Z]{6}$/.test(compact)) return "forex";
    if (type.includes("etf") || type.includes("fund") || ETF_SYMBOLS.has(s)) return "etfs";
    if (/\.KW$/i.test(s)) return "kuwait";
    if (/\.SR$|\.SA$/i.test(s)) return "saudi";
    if (/\.AE$|\.DU$|\.AD$/i.test(s)) return "uae";
    if (/\.QA$/i.test(s)) return "qatar";
    if (/\.BH$/i.test(s)) return "bahrain";
    if (/\.OM$/i.test(s)) return "oman";
    if (/\.L$|\.DE$|\.PA$|\.AS$|\.MI$|\.MC$|\.SW$/i.test(s)) return "europe";
    if (/\.T$|\.HK$|\.KS$/i.test(s)) return "asia";
    return "us-stocks";
  }
  function contextCurrency(input = {}) {
    const explicit = String(input.currency || input.currencyCode || input.quoteCurrency || "").trim().toUpperCase();
    if (explicit && explicit !== "KWF") return explicit;
    const s = sym(input.symbol || input.ticker || "");
    const compact = compactMarketSymbol(s);
    if (/USDT$/.test(compact)) return "USDT";
    const inferredMarket = inferMarketIdFromSymbol(s, input.assetType || input.asset_type || input.type);
    if (inferredMarket === "forex" && compact.length >= 6) return compact.slice(3, 6);
    if (/\.T$/i.test(s)) return "JPY";
    if (/\.HK$/i.test(s)) return "HKD";
    if (/\.SW$/i.test(s)) return "CHF";
    if (/\.KS$/i.test(s)) return "KRW";
    return marketMetadata(input.marketId || inferredMarket).currency || "USD";
  }
  function selectedRouteSymbol() {
    return state.route.id === "symbol-details" ? sym(state.route.symbol) : "";
  }
  function selectedRouteAsset() {
    const selected = selectedRouteSymbol();
    if (selected && state.cache.has(selected)) return norm(state.cache.get(selected).asset || {});
    if (selected) return norm(findAssetForSymbol(selected, recs()) || { symbol: selected });
    if (state.route.id === "markets" && state.route.market && state.marketCache.has(state.route.market)) {
      const list = recsFrom(state.marketCache.get(state.route.market)).map(norm);
      return list.find(a => a.provider || a.source) || list[0] || null;
    }
    return null;
  }
  function activeMarketContext() {
    const asset = selectedRouteAsset();
    const symbol = asset ? sym(asset.symbol) : selectedRouteSymbol();
    const routeMarket = state.route.id === "markets" && state.route.market ? state.route.market : "";
    const marketId = symbol ? inferMarketIdFromSymbol(symbol, asset && asset.assetType) : (routeMarket || state.settings.defaultMarket || "us-stocks");
    const meta = marketMetadata(marketId);
    const rawProvider = asset && (asset.provider || asset.source || asset.providerStatus?.provider);
    const provider = rawProvider ? providerName(rawProvider) : null;
    return {
      marketId: meta.id,
      marketName: isArabic() ? meta.ar : meta.en,
      marketNameAr: meta.ar,
      marketNameEn: meta.en,
      assetClass: isArabic() ? meta.assetAr : meta.assetEn,
      currency: contextCurrency({ ...(asset || {}), symbol, marketId: meta.id }),
      country: (asset && asset.country) || meta.country || null,
      exchange: (asset && (asset.exchange || asset.market)) || meta.exchange || null,
      selectedSymbol: symbol || null,
      selectedProvider: provider || null,
      fallbackUsed: Boolean(asset && asset.fallbackUsed),
      availableProviders: availableProviderNames()
    };
  }
  function marketHeaderText(context = activeMarketContext()) {
    return `${context.marketName} · ${context.currency}`;
  }
  function currency(a) { return contextCurrency(a || {}); }
  function assetType(s, explicit) { s = sym(s); if (explicit) { const e = String(explicit).toLowerCase(); if (/crypto/.test(e)) return "crypto"; if (/forex|fx|currency/.test(e)) return "forex"; if (/commodit|metal/.test(e)) return "commodity"; if (/etf|fund/.test(e)) return "fund"; if (/index/.test(e)) return "index"; if (/stock|equity/.test(e)) return "stock"; } if (/BTC|ETH|SOL|USDT|XRP|ADA|BNB|DOGE/i.test(s) && /USD|USDT/i.test(s)) return "crypto"; if (/XAU|XAG|WTI|BRENT|OIL|GOLD|SILVER/i.test(s)) return "commodity"; if (/^(NAS100|US30|SPX|NDX|DJI|DXY|IXIC)$/.test(s)) return "index"; if (/^[A-Z]{6}$/.test(s.replace(/[.\-=].*/, ""))) return "forex"; if (/^(SPY|QQQ|GLD|IWM|VOO)$/.test(s)) return "fund"; return "stock"; }
  function sym(v) { return String(v || "").trim().toUpperCase().replace(/\s+/g, ""); }
  function price(v, c) { return v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { return v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
  function isArabic() { return (state.settings.lang || "ar") !== "en"; }
  function tx(ar, en) { return isArabic() ? ar : en; }
  function unavailableMark() { return "\u2014"; }
  function changePercentValue(asset) {
    const a = norm(asset || {});
    const direct = num(a.changesPercentage, a.changePercentage, a.percentChange, a.changePercent, a.changes_percentage, a.change_percentage, a.percent_change, a.change_percent);
    if (direct !== null) return direct;
    const priceValue = num(a.price, a.currentPrice, a.current_price, a.lastPrice, a.regularMarketPrice, a.close);
    const previousClose = num(a.previousClose, a.previous_close, a.prevClose, a.previous, a.priorClose, a.open);
    if (priceValue !== null && previousClose !== null && previousClose !== 0) return ((priceValue - previousClose) / previousClose) * 100;
    const absoluteChange = num(a.change, a.changes, a.priceChange, a.price_change);
    if (priceValue !== null && absoluteChange !== null) {
      const derivedPrevious = priceValue - absoluteChange;
      if (derivedPrevious !== 0) return (absoluteChange / derivedPrevious) * 100;
    }
    return null;
  }
  function analysisSummary(rec) {
    const signals = state.signals || {};
    const signalRows = arr(signals.signals || signals.items || signals.data || signals.results);
    const processed = numberValue(signals.requested, signals.scannedAssets, signals.processedAssets, signals.analyzedAssets, signals.analysisCount, signals.count, signalRows.length);
    const hasRun = Boolean(signals.ranAt || signals.generatedAt || signals.updatedAt || signals.refreshedAt || processed > 0);
    const count = hasRun ? processed : 0;
    const label = hasRun
      ? tx("\u0623\u0635\u0648\u0644 \u0645\u062d\u0644\u0644\u0629", "Analyzed assets")
      : tx("\u0644\u0645 \u064a\u062a\u0645 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0639\u062f", "Analysis has not run yet");
    return { hasRun, count, label, action: state.analysisLoading ? tx("\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0634\u063a\u064a\u0644", "Running") : tx("\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644", "Run Analysis") };
  }
  function price(v, c) { return v === null || v === undefined || Number.isNaN(Number(v)) ? unavailableMark() : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { return v === null || v === undefined || Number.isNaN(Number(v)) ? unavailableMark() : `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
  function date(v) { if (!v) return "--"; const d = new Date(Number(v) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("ar-KW", { dateStyle: "medium", timeStyle: "short" }); }
  function num(...values) { for (const v of values) { if (v === null || v === undefined || v === "") continue; const n = Number(v); if (Number.isFinite(n)) return n; } return null; }
  function arr(v) { if (Array.isArray(v)) return v; if (v && typeof v === "object") return Object.values(v).filter(x => x && typeof x === "object"); return []; }
  function unique(v) { return Array.from(new Set(v.map(sym).filter(Boolean))); }
  function read(k, f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch (_e) { return f; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} }
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
  function addProviderName(list, provider) {
    const raw = typeof provider === "object" && provider ? (provider.provider || provider.id || provider.name || provider.active) : provider;
    if (!raw) return;
    const name = providerName(raw);
    if (!name || name === providerName("")) return;
    if (!list.includes(name)) list.push(name);
  }
  function availableProviderNames() {
    const list = [];
    const sources = [state.providerStatus || {}, state.traderStatus || {}];
    sources.forEach(source => {
      if (Array.isArray(source.availableProviders)) source.availableProviders.forEach(provider => addProviderName(list, provider));
      [source.providers, source.providerMatrix].forEach(matrix => {
        if (!matrix || typeof matrix !== "object") return;
        Object.entries(matrix).forEach(([key, value]) => {
          if (key.endsWith("Configured")) {
            if (value === true) addProviderName(list, key.replace(/Configured$/, ""));
            return;
          }
          if (value === true) addProviderName(list, key);
          if (value && typeof value === "object") {
            const status = String(value.status || "").toLowerCase();
            if (value.configured === true || value.healthy === true || ["healthy", "available", "configured", "connected", "success"].includes(status)) {
              addProviderName(list, value.provider || key);
            }
          }
        });
      });
      addProviderName(list, source.normalizedStatus && source.normalizedStatus.provider);
      addProviderName(list, source.dataProvider && (source.dataProvider.active || source.dataProvider.provider));
    });
    addProviderName(list, state.provider && (state.provider.active || state.provider.provider));
    return list;
  }
  function providerEvidence() {
    const asset = selectedRouteAsset();
    if (asset && (asset.provider || asset.source || asset.providerStatus?.provider)) {
      return {
        provider: asset.provider || asset.source || asset.providerStatus?.provider,
        fallbackUsed: Boolean(asset.fallbackUsed || asset.providerStatus?.fallbackUsed),
        raw: asset.dataQuality || "symbol_quote",
        scope: "symbol"
      };
    }
    if (state.route.id === "markets" && state.route.market && state.marketCache.has(state.route.market)) {
      const cached = state.marketCache.get(state.route.market) || {};
      const firstAsset = recsFrom(cached).map(norm).find(item => item.provider || item.source);
      const cachedProvider = cached.dataProvider && (cached.dataProvider.active || cached.dataProvider.provider);
      if (firstAsset || cachedProvider) {
        return {
          provider: (firstAsset && (firstAsset.provider || firstAsset.source)) || cachedProvider,
          fallbackUsed: Boolean(firstAsset && firstAsset.fallbackUsed),
          raw: cached.status || "market_quotes",
          scope: "market"
        };
      }
    }
    const ps = state.providerStatus || {};
    const p = ps.dataProvider || state.provider || {};
    return {
      provider: ps.normalizedStatus?.provider || p.active || p.provider || null,
      fallbackUsed: false,
      raw: p.status || ps.status || "primary_provider",
      scope: "primary"
    };
  }
  function providerCopy() {
    if (state.providerStatus && state.providerStatus.ok === false) {
      const evidence = providerEvidence();
      if (evidence.provider) {
        const provider = providerName(evidence.provider);
        return { title: tx("المزود المستخدم", "Used provider"), copy: `${tx("المزود المستخدم", "Used provider")}: ${provider}`, className: "warning", raw: "provider_status_failed", provider, active: provider, fallbackUsed: evidence.fallbackUsed, availableProviders: availableProviderNames() };
      }
      return { title: tx("حالة المزود غير متاحة", "Provider status unavailable"), copy: formatProviderError(state.providerStatus.message, { empty: UNAVAILABLE_MESSAGE }), className: "warning", raw: "provider_status_failed", provider: null, active: null, fallbackUsed: false, availableProviders: availableProviderNames() };
    }
    const normalized = state.providerStatus && state.providerStatus.normalizedStatus;
    if (normalized && normalized.status === "rate_limited") {
      const provider = providerName(normalized.provider || "fmp");
      return { title: tx("المزود المستخدم", "Used provider"), copy: `${tx("المزود المستخدم", "Used provider")}: ${provider}`, className: "warning", raw: "rate_limited", provider, active: provider, fallbackUsed: true, availableProviders: availableProviderNames() };
    }
    const evidence = providerEvidence();
    const p = (state.providerStatus && state.providerStatus.dataProvider) || state.provider || {};
    const configured = p.configured === true || Boolean(p.active);
    const raw = p.status || (configured ? "configured" : "not_configured");
    const ok = configured && ["success", "available", "configured", "connected", "healthy"].includes(String(raw));
    if (evidence.provider) {
      const provider = providerName(evidence.provider);
      const title = evidence.fallbackUsed ? tx("مزود بديل", "Fallback provider") : evidence.scope === "primary" ? tx("المزود الأساسي", "Primary provider") : tx("المزود المستخدم", "Used provider");
      return { title, copy: `${title}: ${provider}`, className: evidence.fallbackUsed ? "warning" : "online", raw: evidence.raw || raw, provider, active: provider, fallbackUsed: evidence.fallbackUsed, availableProviders: availableProviderNames() };
    }
    if (String(raw) === "rate_limited") return { title: tx("تم الوصول إلى حد استخدام مزود البيانات مؤقتاً", "Provider rate limit reached"), copy: tx("تم الوصول إلى حد استخدام مزود البيانات مؤقتاً. سنعرض بيانات مخزنة مؤقتاً عند توفرها.", "The provider is temporarily rate limited. Cached data will be shown when available."), className: "warning", raw, provider: null, active: null, fallbackUsed: true, availableProviders: availableProviderNames() };
    if (ok) {
      const provider = providerName(p.active || p.provider);
      return { title: tx("المزود الأساسي", "Primary provider"), copy: `${tx("المزود الأساسي", "Primary provider")}: ${provider}`, className: "online", raw, provider, active: provider, fallbackUsed: false, availableProviders: availableProviderNames() };
    }
    return { title: tx("المزود غير مهيأ", "Provider not configured"), copy: tx("لا توجد بيانات سوق حية مفعّلة حالياً، لذلك لن نعرض أرقاماً أو توصيات وهمية.", "No live market provider is configured, so fake prices or recommendations are not shown."), className: "warning", raw, provider: null, active: null, fallbackUsed: false, availableProviders: availableProviderNames() };
  }
  function isArabic() { return (state.settings.lang || "ar") !== "en"; }
  function tx(ar, en) { return isArabic() ? ar : en; }
  function unavailableMark() { return "\u2014"; }
  function changePercentValue(asset) {
    const a = asset || {};
    const direct = num(a.changesPercentage, a.changePercentage, a.percentChange, a.changePercent, a.changes_percentage, a.change_percentage, a.percent_change, a.change_percent);
    if (direct !== null) return direct;
    const priceValue = num(a.price, a.currentPrice, a.current_price, a.lastPrice, a.regularMarketPrice, a.close);
    const previousClose = num(a.previousClose, a.previous_close, a.prevClose, a.previous, a.priorClose, a.open);
    if (priceValue !== null && previousClose !== null && previousClose !== 0) return ((priceValue - previousClose) / previousClose) * 100;
    const absoluteChange = num(a.change, a.changes, a.priceChange, a.price_change);
    if (priceValue !== null && absoluteChange !== null) {
      const derivedPrevious = priceValue - absoluteChange;
      if (derivedPrevious !== 0) return (absoluteChange / derivedPrevious) * 100;
    }
    return null;
  }
  function norm(x) {
    return normalizeMarketData(x || {});
  }
  function price(v, c) { return v === null || v === undefined || Number.isNaN(Number(v)) ? unavailableMark() : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { return v === null || v === undefined || Number.isNaN(Number(v)) ? unavailableMark() : `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
  function analysisSummary(rec = recs()) {
    const signals = state.signals || {};
    const signalRows = arr(signals.signals || signals.items || signals.data || signals.results);
    const processed = numberValue(signals.requested, signals.scannedAssets, signals.processedAssets, signals.analyzedAssets, signals.analysisCount, signals.count, signalRows.length);
    const hasRun = Boolean(signals.ranAt || signals.generatedAt || signals.updatedAt || signals.refreshedAt || processed > 0);
    return {
      hasRun,
      count: hasRun ? processed : 0,
      label: hasRun ? tx("\u0623\u0635\u0648\u0644 \u0645\u062d\u0644\u0644\u0629", "Analyzed assets") : tx("\u0644\u0645 \u064a\u062a\u0645 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0639\u062f", "Analysis has not run yet"),
      action: state.analysisLoading ? tx("\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0634\u063a\u064a\u0644", "Running") : tx("\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644", "Run Analysis")
    };
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), context = activeMarketContext();
    const buy = rec.filter(x => isBuySignalName(signal(x))).length, sell = rec.filter(x => isSellSignalName(signal(x))).length;
    const configured = p.className === "online";
    const analysis = analysisSummary(rec);
    return `<section class="terminal-command-center" aria-label="Market summary">
      ${commandMetric("PROVIDER", configured ? tx("\u0645\u062a\u0635\u0644", "Connected") : tx("\u063a\u064a\u0631 \u0645\u0647\u064a\u0623", "Unavailable"), p.active || p.raw || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : unavailableMark(), b.conf ? b.label : tx("\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "Waiting for data"), b.tone || "neutral")}
      ${commandMetric("BUY SIGNALS", buy, tx("\u0641\u0631\u0635 \u0634\u0631\u0627\u0621", "Buy signals"), "ok")}
      ${commandMetric("SELL SIGNALS", sell, tx("\u0641\u0631\u0635 \u0628\u064a\u0639", "Sell signals"), "bad")}
      ${commandMetric("ANALYZED ASSETS", analysis.hasRun ? analysis.count : unavailableMark(), analysis.label, analysis.hasRun ? "ok" : "neutral", `<button class="ghost-btn sm" data-run-analysis type="button">${h(analysis.action)}</button>`)}
      ${commandMetric("ACTIVE MARKET", context.marketName, `${context.marketNameEn} · ${context.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone, action = "") {
    return `<article class="command-metric ${tone || ""} analysis-command-metric"><span class="card-kicker">${h(kicker)}</span><strong>${h(String(value))}</strong><small>${h(label || unavailableMark())}</small>${action}</article>`;
  }
  function diagnostics() {
    const normalized = normalizedProviderStatus();
    const available = ["available", "success", "connected", "configured", "healthy"].includes(String(normalized.status || "").toLowerCase());
    const connectionOk = normalized.configured && !["failed", "unavailable", "not_configured"].includes(String(normalized.status || "").toLowerCase());
    const tone = available ? "ok" : connectionOk ? "warn" : "bad";
    const labels = {
      title: tx("\u062d\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645", "System status"),
      copy: tx("\u0645\u0644\u062e\u0635 \u0645\u0632\u0648\u062f \u0627\u0644\u0633\u0648\u0642 \u0648\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0631\u0645\u0648\u0632.", "Market provider and symbol loading summary."),
      providerStatus: tx("\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0632\u0648\u062f", "Provider status"),
      activeProvider: tx("\u0627\u0644\u0645\u0632\u0648\u062f \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645", "Used provider"),
      connection: tx("\u0627\u0644\u0627\u062a\u0635\u0627\u0644", "Connection"),
      discovered: tx("\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u0643\u062a\u0634\u0641\u0629", "Discovered symbols"),
      loaded: tx("\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u062d\u0645\u0644\u0629", "Loaded symbols"),
      cached: tx("\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u062e\u0632\u0646\u0629", "Cached symbols"),
      failed: tx("\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u062a\u0639\u062b\u0631\u0629", "Failed symbols"),
      skipped: tx("\u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0645\u062a\u062c\u0627\u0648\u0632\u0629", "Skipped symbols"),
      updated: tx("\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b", "Last updated"),
      features: tx("\u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0645\u062f\u0639\u0648\u0645\u0629", "Supported features"),
      refresh: tx("\u062a\u062d\u062f\u064a\u062b", "Refresh"),
      details: tx("\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u0642\u0646\u064a\u0629", "Technical details"),
      available: tx("\u0645\u062a\u0627\u062d", "Available"),
      unavailable: tx("\u063a\u064a\u0631 \u0645\u062a\u0627\u062d", "Unavailable"),
      connected: tx("\u0645\u062a\u0635\u0644", "Connected"),
      disconnected: tx("\u063a\u064a\u0631 \u0645\u062a\u0635\u0644", "Disconnected")
    };
    const items = [
      [labels.providerStatus, available ? labels.available : labels.unavailable, tone],
      [labels.activeProvider, normalized.provider || providerCopy().provider || unavailableMark(), ""],
      [labels.connection, connectionOk ? labels.connected : labels.disconnected, connectionOk ? "ok" : "bad"],
      [labels.discovered, countText(normalized.discoveredCount), ""],
      [labels.loaded, countText(normalized.loadedCount), normalized.loadedCount > 0 ? "ok" : "warn"],
      [labels.cached, countText(normalized.cachedCount), normalized.cachedCount > 0 ? "ok" : ""],
      [labels.failed, countText(normalized.failedCount), normalized.failedCount > 0 ? "bad" : "ok"],
      [labels.skipped, countText(normalized.skippedCount), normalized.skippedCount > 0 ? "warn" : "ok"],
      [labels.updated, latinDateTime(normalized.lastUpdated), ""]
    ];
    const features = normalized.supportedFeatures.length ? normalized.supportedFeatures.map(featureLabel) : [unavailableMark()];
    const details = diagnosticDetails(normalized)
      .replace(/<\/?details[^>]*>/g, "")
      .replace(/<summary>[^<]*<\/summary>/, "");
    return `<section class="system-status-panel" dir="${isArabic() ? "rtl" : "ltr"}">
      <div class="system-status-head">
        <div><span class="eyebrow">SYSTEM STATUS</span><h3>${h(labels.title)}</h3><p>${h(labels.copy)}</p></div>
        <div class="system-status-actions"><span class="system-status-badge ${tone}">${h(available ? labels.available : labels.unavailable)}</span><button class="ghost-btn sm" data-refresh-provider type="button">${h(labels.refresh)}</button></div>
      </div>
      <div class="system-status-grid">${items.map(([label, value, itemTone]) => `<article class="system-status-item"><span>${h(label)}</span><strong class="ltr">${h(String(value || unavailableMark()))}</strong>${itemTone ? `<i class="system-mini-dot ${itemTone}"></i>` : ""}</article>`).join("")}</div>
      <div class="system-feature-list"><span>${h(labels.features)}</span><div>${features.map(feature => `<b class="system-feature-chip ${feature === unavailableMark() ? "muted" : ""}">${h(feature)}</b>`).join("")}</div></div>
      <details class="provider-diagnostics-panel technical-details"><summary>${h(labels.details)}</summary>${details.replace(/^<details[^>]*><summary>.*?<\/summary>|<\/details>$/g, "")}</details>
    </section>`;
  }
  function sortMovers(r) { const withChg = r.map(norm).filter(x => changePercentValue(x) !== null); const byChg = [...withChg].sort((a, b) => changePercentValue(b) - changePercentValue(a)); return { gainers: byChg, losers: [...byChg].reverse(), active: topPicks(r, r.length) }; }
  function h(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
})();
