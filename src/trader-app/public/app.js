/* the-sfm trader — AI Trading Terminal (vanilla SPA controller)
   Architecture: single IIFE, client-side routing (instant page switches),
   pure render-component functions, defensive data layer, no synthetic market data. */
(() => {
  "use strict";

  /* ─────────────────────────── Config ─────────────────────────── */
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const VER = "20260701-trade-performance-1";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3", holdings: "sfmTraderHoldings:v1", settings: "sfmTraderSettings:v1", followed: "sfmTraderFollowedTrades:v1" };
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const leadershipCore = ["NAS100", "US30", "XAUUSD", "BTCUSD"];
  const INITIAL_LOADING_MAX_MS = 4500;
  const REQUEST_TIMEOUTS = { providerStatus: 8000, quotes: 8000, signals: 8000, news: 12000, calendar: 15000, default: 10000 };
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
    rec: {}, signals: {}, signalAlerts: {}, markets: {}, news: {}, followed: {}, provider: {}, providerStatus: {}, commandCards: {},
    calendarRange: "30", calendarLoading: false,
    calendar: { earnings: {}, dividends: {}, ipos: {}, economic: {} },
    watch: read(keys.watch, []), alerts: read(keys.alerts, []), holdings: read(keys.holdings, []), localTrades: read(keys.followed, []),
    settings: read(keys.settings, { lang: "ar", defaultMarket: "us-stocks", risk: "balanced" }),
    errors: {},
    cache: new Map(), marketCache: new Map()
  };

  /* ─────────────────────────── Boot ─────────────────────────── */
  document.addEventListener("DOMContentLoaded", boot);
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
      get("/markets"), get("/market-news?limit=12"), get("/followed-trades")
    ]);
    const [rec, commandCards, signals, signalAlerts, mk, news, followed] = settled.map((result, index) => settledValue(result, ["quotes", "quotes", "signals", "signals", "quotes", "news", "quotes"][index]));
    state.rec = rec; state.commandCards = commandCards; state.signals = signals; state.signalAlerts = signalAlerts; state.markets = mk; state.news = news; state.followed = followed;
    state.provider = commandCards.dataProvider || rec.dataProvider || mk.dataProvider || news.dataProvider || commandCards.provider || rec.provider || mk.provider || news.provider || { configured: false, status: "not_configured" };
    await loadCalendars(false);
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
      const cr = event.target.closest("[data-calendar-range]");
      if (cr) {
        event.preventDefault();
        state.calendarRange = cr.dataset.calendarRange || "30";
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
      const delAlert = event.target.closest("[data-del-alert]");
      if (delAlert) { event.preventDefault(); deleteAlert(delAlert.dataset.delAlert); return; }
      const retry = event.target.closest("[data-retry]");
      if (retry) { event.preventDefault(); retryRoute(); return; }
      const collapse = event.target.closest("#sidebar-collapse");
      if (collapse) { event.preventDefault(); document.getElementById("app-shell").classList.toggle("is-collapsed"); return; }
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
    if (state.route.id === "calendar") state.calendarLoading = true;
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
    const title = document.getElementById("page-title");
    if (title) title.textContent = routes[state.route.id] || routes.dashboard;
    document.querySelectorAll("[data-route]").forEach((node) => node.classList.toggle("is-active", node.dataset.route === state.route.id || (state.route.id === "symbol-details" && node.dataset.route === "symbol-details")));
    status(); ticker(); statusBar();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
  }

  function afterRoute() {
    const id = state.route.id;
    if (id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
    if (id === "markets" && state.route.market) loadMarket(state.route.market);
    if (id === "ai-scanner" || id === "recommendations") ensureScanData();
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
    const cached = state.marketCache.get(id);
    const list = cached ? recsFrom(cached) : [];
    const movers = cached ? sortMovers(list) : { gainers: [], losers: [], active: [] };
    const body = cached ? (list.length
      ? `<section class="metric-grid">${stat("توصيات", list.length, "Signals")}${stat("شراء", list.filter(x => signal(x) === "buy").length, "Buy")}${stat("بيع", list.filter(x => signal(x) === "sell").length, "Sell")}${stat("العملة", m.currency, "Currency")}</section>
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
      ${hero(`${m.ar} <span class="ltr">· ${h(m.en)}</span>`, `${m.family} · العملة الأساسية: ${m.currency}. الرموز المعروضة مرجعية وتُعرض أسعارها فقط عند توفرها من المزود.`, "MARKET")}
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

  function performancePage() {
    const all = trades(), g = groupTrades(all), summary = tradeSummary(all);
    return `<div class="page-stack trade-performance-page">${hero("أداء الصفقات", "نتائج إشارات الشراء والبيع المحفوظة، صفقات المتابعة اليدوية، وسجلات التوصيات. لا تُعرض نتائج وهمية عند غياب السجلات.", "TRADE PERFORMANCE")}
      ${tradeProviderStatus(all)}
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
    return ranges.map(([value, label]) => `<button class="${state.calendarRange === value ? "is-active" : ""}" data-calendar-range="${h(value)}">${h(label)}</button>`).join("");
  }

  function calendarProviderOverview() {
    const ps = state.providerStatus || {}, features = ps.features || {};
    const rows = [
      ["أرباح الشركات", features.earnings],
      ["التوزيعات", features.dividends],
      ["الاكتتابات", features.ipos],
      ["التقويم الاقتصادي", features.economic]
    ];
    return `<section class="provider-state-panel trader-provider-panel">
      <div class="panel-head"><div><span class="eyebrow">PROVIDER STATUS</span><h2>مزود البيانات</h2></div><button class="ghost-btn" data-retry>إعادة المحاولة</button></div>
      <div class="provider-state-grid">${rows.map(([label, feature]) => providerFeatureCard(label, feature)).join("")}</div>
    </section>`;
  }

  function providerFeatureCard(label, feature) {
    feature = feature || {};
    const tone = featureStatusTone(feature.status);
    return `<article class="provider-state-card">
      <span>${h(label)}</span>
      <strong>${h(providerName(feature.provider))}</strong>
      <p>${h(featureStatusLabel(feature.status))}</p>
      <em class="state-badge ${tone}">${h(resultCountText(feature.resultCount))}</em>
    </article>`;
  }

  function calendarPanel(kind, eyebrow, title, response, rowRenderer) {
    response = response || {};
    const rows = arr(response.data);
    return `<article class="panel trader-calendar-panel calendar-${h(kind)}">
      <div class="panel-head calendar-panel-head">
        <div><span class="eyebrow">${h(eyebrow)}</span><h2>${h(title)}</h2></div>
        <div class="calendar-head-actions">${providerBadge(response)}<button class="ghost-btn compact-btn" data-retry>إعادة المحاولة</button></div>
      </div>
      <div class="calendar-meta">
        <span>آخر تحديث: <b>${h(latinDateTime(response.lastUpdated || response.lastSuccessfulUpdate))}</b></span>
        <span>الفترة: <b class="ltr">${h(rangeText(response.range))}</b></span>
        <span>النتائج: <b class="ltr">${h(latinNumber(response.resultCount ?? rows.length))}</b></span>
      </div>
      ${state.calendarLoading ? calendarLoadingState() : rows.length ? rowRenderer(rows) : calendarEmptyState(response)}
    </article>`;
  }

  function providerBadge(response) {
    const status = response && response.status;
    const tone = featureStatusTone(status);
    return `<span class="state-badge ${tone}">${h(providerName(response && response.provider))} · ${h(featureStatusLabel(status))}</span>`;
  }

  function calendarLoadingState() {
    return `<div class="empty-state compact"><span class="empty-glyph">◌</span><h3>جاري تحديث التقويم</h3><p>نراجع المزود المتصل ونحدّث النتائج للفترة المختارة.</p></div>`;
  }

  function calendarEmptyState(response) {
    const status = String((response && response.status) || "not_configured");
    let title = UNAVAILABLE_MESSAGE;
    let body = (response && response.message) || "اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.";
    let settings = true;
    if (response && response.routeUnavailable) {
      title = ROUTE_UNAVAILABLE_MESSAGE;
      body = "تعذر الوصول إلى مسار البيانات المطلوب.";
      settings = false;
    } else if (response && response.timeout) {
      title = UNAVAILABLE_MESSAGE;
      body = "انتهت مهلة الطلب. يمكنك إعادة المحاولة بدون إعادة تحميل الصفحة.";
      settings = false;
    } else if (status === "success") {
      title = "لا توجد أحداث ضمن الفترة الحالية";
      body = "جرّب تغيير الفترة أو السوق أو نوع الحدث.";
      settings = false;
    } else if (status === "not_configured" || status === "missing_provider") {
      title = "لا يوجد مزود متصل";
      body = "اربط مزود بيانات لعرض الأحداث والتوزيعات والاكتتابات.";
    } else if (["not_entitled", "forbidden", "unauthorized"].includes(status)) {
      title = "الميزة غير متاحة ضمن صلاحية المزود الحالي";
      body = "تحتاج هذه البيانات إلى خطة تدعم هذا النوع من التقويم.";
    } else if (status === "rate_limited") {
      title = "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً";
      body = response && (response.cached || response.stale) ? "بيانات مخزنة مؤقتاً معروضة إلى أن يسمح المزود بتحديث جديد." : "جرّب لاحقاً أو استخدم زر إعادة المحاولة بعد دقيقة.";
      settings = false;
    } else if (status === "provider_error" || status === "invalid_request") {
      title = UNAVAILABLE_MESSAGE;
      body = "تعذر جلب البيانات من المزود الحالي. لم يتم عرض أي بيانات بديلة.";
      settings = false;
    }
    return `<div class="empty-state compact calendar-empty"><span class="empty-glyph">◌</span><h3>${h(title)}</h3><p>${h(body)}</p><div class="row-actions">${settings ? `<a class="ghost-btn" href="${ROOT}/settings" data-route-link>الإعدادات</a>` : ""}<button class="ghost-btn" data-retry>إعادة المحاولة</button></div></div>`;
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

  function featureStatusTone(status) {
    status = String(status || "");
    if (status === "success" || status === "available" || status === "configured") return "ok";
    if (["not_entitled", "forbidden", "unauthorized", "rate_limited"].includes(status)) return "warn";
    return "";
  }

  function featureStatusLabel(status) {
    status = String(status || "not_configured");
    const labels = {
      success: "متصل",
      available: "متاح",
      configured: "متاح",
      not_configured: "غير مهيأ",
      not_entitled: "غير متاح ضمن الصلاحية",
      forbidden: "غير متاح ضمن الصلاحية",
      unauthorized: "فشل التصريح",
      rate_limited: "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً",
      provider_error: "فشل الاتصال",
      invalid_request: "طلب غير صالح"
    };
    return labels[status] || status;
  }

  function providerName(provider) {
    const names = { fmp: "FMP", finnhub: "Finnhub", tradingeconomics: "Trading Economics", yahoo: "Yahoo Finance", "yahoo finance": "Yahoo Finance", openbb: "OpenBB", manual: "إدخال يدوي" };
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
    const date = new Date(value);
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
        get(`/market/history?symbol=${encodeURIComponent(key)}&range=1Y`, { label: "quotes" })
      ]);
      const [profile, search, tech, sig, hist] = settled.map((result, index) => settledValue(result, index === 2 || index === 3 ? "signals" : "quotes"));
      const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
      const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
      const rawTech = tech.ok ? (tech.analysis || tech.data || tech) : (tech.available || null);
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
      const asset = norm({ symbol: key, ...found, ...rawProfile, ...techAsset });
      const detail = {
        asset, tech: rawTech, providerStatus,
        available: Boolean((profile.ok && (rawProfile.symbol || found.symbol || found.name)) || rawTech || historyPoints.length),
        source: profile.source || search.source || asset.source || (rawTech && rawTech.source) || "--",
        message: profile.message || search.message || UNAVAILABLE_MESSAGE,
        rec: sig && (sig.signal || sig.item) ? signalToRec(sig.signal || sig.item) : matchRec(key)
      };
      state.cache.set(key, detail);
      if (state.route.id === "symbol-details" && state.route.symbol === key) target.innerHTML = symbolContent(detail);
    } catch (error) {
      devLog("quotes", "failed", { route: "symbol-details", symbol: key, message: errorMessage(error) });
      target.innerHTML = `<div class="panel">${emptyState(UNAVAILABLE_MESSAGE, errorMessage(error), "الإعدادات", `${ROOT}/settings`)}</div>`;
    }
  }

  function symbolContent(detail) {
    const a = detail.asset, c = currency(a), sig = detail.rec ? signal(detail.rec) : null;
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, detail.rec && detail.rec.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const ps = detail.providerStatus || {};
    const providerSymbolUsed = ps.providerSymbolUsed || a.providerSymbol || (detail.rec && detail.rec.providerSymbol) || "غير متاح";
    const fallbackUsed = ps.fallbackUsed === true ? "نعم" : ps.fallbackUsed === false ? "لا" : "غير متاح";
    const lastUpdated = latinDateTime(ps.lastUpdated || a.updatedAt || (detail.rec && detail.rec.lastUpdated));
    const quality = ps.dataQuality ? dataQualityLabel(ps.dataQuality) : "غير متاح";
    return `<div class="detail-layout">
      <article class="panel detail-main">
        <div class="asset-head big">${logo(a, "lg")}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || "اسم الأصل غير متوفر من المزود")}</small></div>
          ${sig ? `<span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""} big">${h(sigLabel(sig))}</span>` : ""}</div>
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
  function marketBias(rec) {
    const buy = rec.filter(x => signal(x) === "buy").length, sell = rec.filter(x => signal(x) === "sell").length, total = rec.length;
    if (!total) return { label: "بانتظار البيانات", en: "AWAITING", bull: 0, bear: 0, neutral: 0, conf: 0, tone: "" };
    const bull = Math.round((buy / total) * 100), bear = Math.round((sell / total) * 100), neutral = Math.max(0, 100 - bull - bear);
    const cf = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = cf.length ? Math.round(cf.reduce((a, b) => a + b, 0) / cf.length) : 0;
    return { label: bull >= 55 ? "صاعد" : bull <= 40 ? "هابط" : "محايد", en: bull >= 55 ? "BULLISH" : bull <= 40 ? "BEARISH" : "NEUTRAL", bull, bear, neutral, conf, tone: bull >= 55 ? "ok" : bull <= 40 ? "warn" : "" };
  }
  function marketOverview(rec) {
    const b = marketBias(rec);
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">MARKET OVERVIEW</span><h2>نظرة عامة على الأسواق</h2></div><div class="mo-timeframes">${["1D", "1W", "1M", "1Y", "ALL"].map(t => `<button data-timeframe="${t}" class="${state.timeframe === t ? "is-active" : ""}">${t}</button>`).join("")}</div></div>
      <div class="mo-body">
        ${marketMap()}
        <div class="mo-gauges">
          <div class="mo-gauge"><span class="card-kicker">MARKET SENTIMENT</span><strong class="state-${b.tone}">${h(b.en)}</strong><div class="mo-bar"><i style="width:${b.bull}%"></i></div><small>${h(b.label)} · ${b.bull}% شراء · إطار ${h(state.timeframe)}</small></div>
          <div class="mo-gauge"><span class="card-kicker">AI CONFIDENCE</span><strong>${b.conf ? b.conf + "%" : "--"}</strong><div class="mo-bar"><i class="conf" style="width:${b.conf}%"></i></div><small>${b.conf >= 70 ? "ثقة عالية" : b.conf ? "ثقة متوسطة" : "بانتظار البيانات"}</small></div>
        </div>
      </div></section>`;
  }
  function commandCenter(rec) {
    const p = providerCopy(), b = marketBias(rec), market = currentMarket();
    const buy = rec.filter(x => signal(x) === "buy").length, sell = rec.filter(x => signal(x) === "sell").length;
    const configured = p.className === "online";
    return `<section class="terminal-command-center" aria-label="Market summary">
      ${commandMetric("PROVIDER", configured ? "متصل" : "غير مهيأ", p.active || p.raw || p.title, configured ? "ok" : "warn")}
      ${commandMetric("AI CONFIDENCE", b.conf ? `${b.conf}%` : "غير متاح", b.conf ? b.label : "بانتظار البيانات", b.tone || "neutral")}
      ${commandMetric("BUY SIGNALS", buy, "فرص شراء", "ok")}
      ${commandMetric("SELL SIGNALS", sell, "فرص بيع", "bad")}
      ${commandMetric("ANALYZED ASSETS", rec.length || "غير متاح", "أصول محللة", rec.length ? "ok" : "neutral")}
      ${commandMetric("ACTIVE MARKET", market.ar, `${market.en} · ${market.currency}`, "blue")}
    </section>`;
  }
  function commandMetric(kicker, value, label, tone) {
    return `<article class="command-metric ${tone || ""}"><span class="card-kicker">${h(kicker)}</span><strong>${h(String(value))}</strong><small>${h(label || "غير متاح")}</small></article>`;
  }
  function marketLeadership(rec) {
    const commandRec = mergeRecLists(legacyRecsFrom(state.commandCards), rec);
    return `<section class="panel market-leadership">
      <div class="panel-head"><div><span class="eyebrow">MARKET COMMAND</span><h2>غرفة قيادة السوق</h2></div><span class="state-badge">${h(currentMarket().ar)}</span></div>
      <div class="leadership-grid">${dashboardSymbols().map(s => leadershipCard(s, findAssetForSymbol(s, commandRec))).join("")}</div>
    </section>`;
  }
  function leadershipCard(symbol, asset) {
    const a = asset ? norm(asset) : { symbol, name: "غير متاح" };
    const display = a.displaySymbol || displaySymbolFor(symbol);
    const detailSymbol = a.canonicalSymbol || symbol;
    const c = currency({ ...a, symbol: detailSymbol });
    const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const conf = num(a.confidence, a.score, a.aiConfidence);
    const source = providerName(a.provider || a.source || (state.provider && (state.provider.active || state.provider.provider)) || "Yahoo Finance");
    const sig = (a.signalAvailable === false || (!a.signal && !a.recommendation && !a.action)) ? null : signal(a);
    const quality = a.dataQuality || (p === null ? "unavailable" : a.chartAvailable === false ? "partial" : "delayed");
    const stateClass = chg === null ? "neutral" : chg >= 0 ? "positive" : "negative";
    return `<button class="leadership-card ${stateClass}" data-symbol-details="${h(detailSymbol)}" type="button">
      <div class="asset-head">${logo({ ...a, symbol: display })}<div class="asset-title"><strong class="ltr">${h(display)}</strong><small>${h(a.name || display)}</small></div></div>
      <div class="leadership-price"><strong class="ltr">${h(p === null ? "السعر غير متاح" : price(p, c))}</strong><span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "التغير غير متاح" : change(chg))}</span></div>
      ${sparkline(a, chg)}
      <div class="leadership-foot">
        <span class="signal-badge ${sig || "unavailable"}">${h(sig ? sigLabel(sig) : "إشارة غير متاحة")}</span>
        <span class="quality-badge">${h(conf === null ? "الثقة غير متاحة" : `الثقة ${Math.round(conf)}%`)} · ${h(dataQualityLabel(quality))}</span>
      </div>
      <div class="leadership-provider-row">
        <b>${h(source)}</b>
        <span class="ltr">${h(a.providerSymbolUsed || a.providerSymbol || "--")}</span>
        <span>${a.fallbackUsed === true ? "fallback: yes" : "fallback: no"}</span>
        <span>${h(providerFlag("fmp"))}</span>
        <span>${h(providerFlag("finnhub"))}</span>
        <time class="ltr">${h(latinDateTime(a.lastUpdated || a.updatedAt))}</time>
      </div>
    </button>`;
  }
  function providerFlag(key) {
    const providers = state.providerStatus && state.providerStatus.providers;
    const provider = providers && providers[key];
    const label = key === "fmp" ? "FMP" : key === "finnhub" ? "Finnhub" : key;
    return `${label}: ${provider && provider.configured ? "on" : "off"}`;
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
    const chg = num(a.changePercent, a.percentChange);
    const hasSignal = Boolean(asset && (a.signal || a.recommendation || a.action || a.side || a.type));
    const stateClass = chg === null ? "unavailable" : chg > 0 ? "positive" : chg < 0 ? "negative" : "neutral";
    const conf = num(a.confidence, a.score, a.aiConfidence);
    return `<button class="opportunity-cell ${stateClass}" data-symbol-details="${h(symbol)}" type="button">
      ${logo({ ...a, symbol }, "sm")}
      <strong class="ltr">${h(symbol === "BTCUSD" ? "BTC/USD" : symbol)}</strong>
      <span class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</span>
      <em>${hasSignal ? h(sigLabel(signal(a))) : "غير متاح"}${conf === null ? "" : ` · ${Math.round(conf)}%`}</em>
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
      const a = norm(x), c = currency(a), hasSignal = Boolean(a.signal || a.recommendation || a.action || a.side || a.type), sig = hasSignal ? signal(a) : "";
      const conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
      const chg = num(a.changePercent, a.percentChange), tgt = num(a.target, a.targetPrice, a.priceTarget), score = num(a.aiScore, a.score, a.rating);
      const risk = a.risk || a.riskLevel;
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.symbol)}" title="إزالة">✕</button>` : "";
      return `<tr>
        <td class="wt-asset" data-label="الأصل"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "غير متاح")}</small></span></button></td>
        <td class="ltr" data-label="السعر">${h(p === null ? "غير متاح" : price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="التغير">${h(chg === null ? "غير متاح" : change(chg))}</td>
        <td data-label="التوصية"><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(hasSignal ? sigLabel(sig) : "غير متاح")}</span></td>
        <td class="ltr" data-label="الثقة">${conf === null ? "غير متاح" : Math.round(conf) + "%"}</td>
        <td class="ltr" data-label="الهدف">${tgt === null ? "غير متاح" : price(tgt, c)}</td>
        <td data-label="المدة">${h(a.timeframe || a.horizon || a.duration || "غير متاح")}</td>
        <td data-label="المخاطرة">${risk ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : "غير متاح"}</td>
        <td class="ltr" data-label="سكور AI">${score === null ? "غير متاح" : (score > 10 ? Math.round(score) + "%" : score.toFixed(1))}</td>
        <td class="row-actions" data-label="إجراء"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">تحليل</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>الأصل</th><th>السعر</th><th>التغير</th><th>التوصية</th><th>الثقة</th><th>الهدف</th><th>المدة</th><th>المخاطرة</th><th>سكور AI</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function recCards(items) { return `<div class="rec-grid">${items.map(recCard).join("")}</div>`; }
  function recCard(x) {
    const a = norm(x), c = currency(a), sig = signal(a), conf = num(a.confidence, a.score, a.aiConfidence);
    const p = num(a.price, a.lastPrice, a.currentPrice), tgt = num(a.target, a.targetPrice), sl = num(a.stopLoss, a.stop);
    return `<article class="rec-card ${sig}"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "--")}</small></div><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span></div>
      <div class="rec-metrics"><span>السعر<b class="ltr">${h(price(p, c))}</b></span><span>الهدف<b class="ltr">${h(tgt === null ? "--" : price(tgt, c))}</b></span><span>وقف<b class="ltr">${h(sl === null ? "--" : price(sl, c))}</b></span><span>ثقة<b>${conf === null ? "--" : Math.round(conf) + "%"}</b></span></div>
      <div class="rec-foot"><span class="status-tag ${recStatusTone(a)}">${h(recStatus(a))}</span><div class="row-actions compact-actions"><button class="action-btn sm" data-follow-trade="${h(a.symbol)}" type="button">متابعة الصفقة</button><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}" type="button">فتح التحليل</button></div></div></article>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(norm(x))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = norm(asset), c = currency(a), hasSignal = Boolean(a.signal || a.recommendation || a.action || a.side || a.type), sig = hasSignal ? signal(a) : "", conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close, a.currentPrice);
    const chg = num(a.changePercent, a.percentChange);
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">إزالة</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || "اسم الأصل غير متوفر")}</small></div></div>
      <div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(hasSignal ? sigLabel(sig) : "غير متاح")}</span><span class="status-tag">${h(recStatus(a))}</span></div>
      <div class="asset-metrics"><span>السعر<b class="ltr">${h(p === null ? "غير متاح" : price(p, c))}</b></span><span>التغيير<b class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</b></span><span>ثقة AI<b>${conf === null ? "غير متاح" : `${Math.round(conf)}%`}</b></span></div>
      <div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">فتح التحليل</button><button class="ghost-btn" data-follow-trade="${h(a.symbol)}">متابعة الصفقة</button><button class="ghost-btn" data-quick-add="${h(a.symbol)}">قائمة المتابعة</button>${remove}</div></article>`;
  }
  function marketCard(m) {
    return `<a class="market-tile ${m.tone === "featured" ? "featured" : ""}" href="${ROOT}/markets/${m.id}" data-route-link><div class="mt-top"><span class="ex-icon">${marketGlyph(m)}</span><span class="eyebrow">${h(m.en)}</span></div><strong>${h(m.ar)}</strong><p>${h(m.family)} · العملة <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${m.symbols.slice(0, 4).map(s => `<span class="badge sm"><span class="ltr">${h(s)}</span></span>`).join("")}</div></a>`;
  }
  function heatmap(items) {
    return `<div class="heatmap">${items.slice(0, 24).map(x => { const a = norm(x), sig = signal(a), chg = num(a.changePercent, a.percentChange); return `<button class="heat-cell ${chg === null ? "unavailable" : sig}" data-symbol-details="${h(a.symbol)}">${logo(a, "sm")}<strong class="ltr">${h(a.symbol)}</strong><small class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(chg === null ? "غير متاح" : change(chg))}</small><em>${h(sigLabel(sig))}</em></button>`; }).join("")}</div>`;
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
    const provider = status.provider || providerName(p.active || p.provider) || "Yahoo Finance";
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
    const s = sym(t.symbol || t.ticker || t.asset || "--"), a = norm({ ...t, symbol: s }), c = currency(a), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), sig = tradeAction(t);
    const status = tradeStatus(t), current = num(t.currentPrice, t.current), entry = num(t.entryPrice, t.entry), target = num(t.targetPrice, t.target), stop = num(t.stopLoss, t.stop);
    return `<article class="trade-item"><div class="asset-head">${logo({ symbol: s })}<div class="asset-title"><strong class="ltr">${h(s)}</strong><small>${h(a.name || t.status || "متابعة")}</small></div></div>
      <div class="badge-row"><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></div>
      <div class="trade-row"><span>الدخول<b class="ltr">${h(price(entry, c))}</b></span><span>الحالي<b class="ltr">${h(current === null ? "--" : price(current, c))}</b></span><span>P/L<b class="${pnl === null ? "" : pnl >= 0 ? "up" : "down"}">${pnl === null ? "--" : pnl + "%"}</b></span></div>
      <div class="trade-row"><span>الهدف<b class="ltr">${h(price(target, c))}</b></span><span>وقف الخسارة<b class="ltr">${h(price(stop, c))}</b></span><span>الثقة<b class="ltr">${h(t.confidence == null ? "--" : Math.round(Number(t.confidence)) + "%")}</b></span></div>
      ${t.priceMessage ? `<p class="trade-warning">${h(t.priceMessage)}</p>` : ""}
      <div class="rec-foot"><small>${h(providerName(t.provider) || t.sourceType || "--")}</small><button class="ghost-btn sm" data-symbol-details="${h(s)}">فتح التحليل</button></div></article>`;
  }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeCard).join("")}</div>`; }
  function tradeJournalTable(items) {
    const rows = items.map(t => { const s = sym(t.symbol || t.asset || "--"), c = currency({ symbol: s, currency: t.currency }), pnl = num(t.profitLossPercent, t.pnl, t.profitLoss, t.returnPercent), status = tradeStatus(t);
      return `<tr><td class="wt-asset" data-label="الرمز"><button data-symbol-details="${h(s)}">${logo({ symbol: s })}<span><strong class="ltr">${h(s)}</strong><small>${h(t.assetName || t.name || "--")}</small></span></button></td><td data-label="الإجراء">${h(sigLabel(tradeAction(t)))}</td><td class="ltr" data-label="الدخول">${h(price(num(t.entryPrice, t.entry), c))}</td><td class="ltr" data-label="الحالي">${h(price(num(t.currentPrice, t.current), c))}</td><td class="ltr" data-label="الهدف">${h(price(num(t.targetPrice, t.target), c))}</td><td class="ltr" data-label="وقف الخسارة">${h(price(num(t.stopLoss, t.stop), c))}</td><td class="ltr ${pnl === null ? "" : pnl >= 0 ? "up" : "down"}" data-label="P/L">${pnl === null ? "--" : pnl + "%"}</td><td data-label="الحالة"><span class="status-tag ${tradeStatusTone(status)}">${h(tradeStatusLabel(status))}</span></td><td data-label="المصدر">${h(providerName(t.provider) || t.sourceType || "--")}</td></tr>`; }).join("");
    return `<div class="table-shell trade-journal-table"><table><thead><tr><th>الرمز</th><th>الإجراء</th><th>الدخول</th><th>الحالي</th><th>الهدف</th><th>وقف الخسارة</th><th>P/L</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
    const ps = state.providerStatus || {}, p = ps.dataProvider || state.provider || {}, features = ps.features || {};
    const diag = ps.diagnostics || state.markets.diagnostics || (state.rec && state.rec.symbolDiscovery) || {};
    const summary = ps.summary || diag.summary || state.rec.summary || {};
    const failedRows = arr(ps.failed).concat(arr(state.rec.failed), arr(state.markets.failed));
    const skippedRows = arr(ps.skipped).concat(arr(state.rec.skipped), arr(state.markets.skipped));
    const failedSummary = summary.failedSymbols !== undefined ? `${latinNumber(summary.failedSymbols)} رمز` : (failedRows.length ? `${latinNumber(failedRows.length)} رمز` : "--");
    const cachedSummary = summary.cachedSymbols !== undefined ? `${latinNumber(summary.cachedSymbols)} رمز` : "--";
    const rateLimitSkipped = summary.skippedDueToRateLimit !== undefined ? `${latinNumber(summary.skippedDueToRateLimit)} طلب` : "--";
    const skippedSummary = skippedRows.length ? `${latinNumber(skippedRows.length)} رمز` : "--";
    const latency = diag.providerLatencyMs && typeof diag.providerLatencyMs === "object"
      ? Object.entries(diag.providerLatencyMs).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => `${k}: ${Math.round(Number(v))}ms`).join(", ")
      : "--";
    const calendarCounts = ["earnings", "dividends", "ipos", "economic"].map(key => {
      const f = features[key] || {};
      return `${featureTitle(key)}: ${resultCountText(f.resultCount)}`;
    }).join(" · ");
    const rows = [
      ["الحالة", featureStatusLabel(p.status || providerCopy().raw)],
      ["المزود النشط", providerName(p.active || p.requested || p.provider)],
      ["مهيأ؟", p.configured === true ? "نعم" : "لا"],
      ["آخر تحديث", latinDateTime(p.lastUpdated)],
      ["عدد النتائج", p.resultCount === null || p.resultCount === undefined ? calendarCounts : resultCountText(p.resultCount)],
      ["إجمالي الرموز المكتشفة", resultCountText(diag.totalSymbolsDiscovered)],
      ["إجمالي الرموز المحملة", resultCountText(diag.totalSymbolsLoaded ?? ps.resultCount ?? state.markets.resultCount)],
      ["رموز فشلت", failedSummary],
      ["بيانات مخزنة مؤقتاً", cachedSummary],
      ["متخطى بسبب حد الاستخدام", rateLimitSkipped],
      ["رموز غير مدعومة / متخطاة", skippedSummary],
      ["زمن استجابة المزود", latency],
      ["حالة الكاش", diag.cacheStatus || state.rec.cacheStatus || state.markets.cacheStatus || "--"],
      ["سبب التعذر", p.failureReason || state.rec.message || state.markets.message || state.news.message || "--"],
      ["الميزات المدعومة", arr(p.supportedFeatures).join(", ") || "--"]
    ];
    return `<div class="table-shell"><table><tbody>${rows.map(([k, v]) => `<tr><th>${h(k)}</th><td>${h(v)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function featureTitle(key) { return key === "earnings" ? "الأرباح" : key === "dividends" ? "التوزيعات" : key === "ipos" ? "الاكتتابات" : key === "economic" ? "الاقتصادي" : key; }
  function providerMarkets() { const rows = arr(state.markets.markets || state.markets.data || state.markets.results); if (!rows.length) return emptyState("لا توجد قائمة أسواق من المزود", state.markets.message || providerCopy().copy, "الإعدادات", `${ROOT}/settings`); return `<div class="table-shell"><table><thead><tr><th>السوق</th><th>الرمز</th><th>العملة</th><th>المصدر</th></tr></thead><tbody>${rows.map(m => `<tr><td>${h(m.name || m.label || "--")}</td><td class="ltr">${h(m.symbol || m.code || "--")}</td><td class="ltr">${h(m.currency || "--")}</td><td>${h(m.source || m.provider || "--")}</td></tr>`).join("")}</tbody></table></div>`; }
  function confBuckets(r) { const b = { high: 0, mid: 0, low: 0 }; r.forEach(x => { const c = num(x.confidence, x.score, x.aiConfidence); if (c === null) return; if (c >= 70) b.high++; else if (c >= 45) b.mid++; else b.low++; }); return b; }
  function confBars(b) { const max = Math.max(1, b.high, b.mid, b.low); return `<div class="conf-bars"><div class="bias-row"><span>عالية</span><div class="mo-bar"><i style="width:${b.high / max * 100}%"></i></div><b>${b.high}</b></div><div class="bias-row"><span>متوسطة</span><div class="mo-bar"><i class="conf" style="width:${b.mid / max * 100}%"></i></div><b>${b.mid}</b></div><div class="bias-row"><span>منخفضة</span><div class="mo-bar"><i class="bear" style="width:${b.low / max * 100}%"></i></div><b>${b.low}</b></div></div>`; }
  function riskRadar(r) { if (!r.length) return miniEmpty(); const levels = { low: 0, medium: 0, high: 0 }; r.forEach(x => { const k = riskKey(x.risk || x.riskLevel); levels[k]++; }); const max = Math.max(1, ...Object.values(levels)); const L = { low: ["منخفضة", "ok"], medium: ["متوسطة", "warn"], high: ["مرتفعة", "bear"] }; return `<div class="conf-bars">${Object.entries(levels).map(([k, v]) => `<div class="bias-row"><span>${L[k][0]}</span><div class="mo-bar"><i class="${L[k][1] === "ok" ? "" : L[k][1]}" style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>`; }
  function miniChart(a) { const series = arr(a.history || a.sparkline || a.candles).map(p => num(p.close, p.c, p.price, p)).filter(v => v !== null); if (series.length < 2) return `<div class="chart-empty">لا توجد بيانات رسم بياني من المزود.</div>`; const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1; const pts = series.map((v, i) => `${(i / (series.length - 1) * 100).toFixed(2)},${(40 - (v - min) / rng * 38).toFixed(2)}`).join(" "); const up = series[series.length - 1] >= series[0]; return `<svg class="detail-chart" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" class="${up ? "up" : "down"}"></polyline></svg>`; }
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
    const s1 = validTechnicalLevel(firstNum(t.s1, t.support1, supports[0], levels.s1, piv.s1, t.support), current, "support", canShowLevels);
    const s2 = validTechnicalLevel(firstNum(t.s2, t.support2, supports[1], levels.s2, piv.s2), current, "support", canShowLevels);
    const r1 = validTechnicalLevel(firstNum(t.r1, t.resistance1, resistances[0], levels.r1, piv.r1, t.resistance), current, "resistance", canShowLevels);
    const r2 = validTechnicalLevel(firstNum(t.r2, t.resistance2, resistances[1], levels.r2, piv.r2), current, "resistance", canShowLevels);
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
    const entry = num(rec.entry, rec.entryPrice, rec.price, rec.currentPrice), tgt = num(rec.target, rec.targetPrice), sl = num(rec.stopLoss, rec.stop);
    if (entry === null || tgt === null || sl === null) return "";
    const reward = Math.abs(tgt - entry), risk = Math.abs(entry - sl); if (!risk) return "";
    const rr = Math.round(reward / risk * 100) / 100;
    return `<div class="detail-grid">${detailCard("الدخول", price(entry, c), "Entry")}${detailCard("الهدف", price(tgt, c), "Target")}${detailCard("وقف الخسارة", price(sl, c), "Stop")}${detailCard("العائد/المخاطرة", rr + ":1", "R/R")}</div>`;
  }
  function signalAnalysis(rec, c) {
    const sig = signal(rec), conf = confText(rec);
    const reasons = arr(rec.reasons).map(String).filter(Boolean).slice(0, 5);
    const warnings = arr(rec.warnings).map(String).filter(Boolean).slice(0, 5);
    const score = rec.scoreBreakdown || rec.score_breakdown || {};
    const quality = rec.dataQuality || rec.data_quality || "--";
    const provider = rec.provider || rec.source || "--";
    const summary = rec.reason || rec.summary || reasons[0] || "قراءة تحليلية مبنية على البيانات المتاحة.";
    const scoreRows = [
      ["فني", score.technicalScore, 40],
      ["زخم", score.momentumScore, 20],
      ["أخبار", score.newsScore, 15],
      ["أساسيات", score.fundamentalsScore, 15]
    ].filter(([, value]) => value !== undefined && value !== null);
    return `<div class="signal-analysis">
      <p>${h(summary)}</p>
      <div class="detail-grid">
        ${detailCard("الإشارة", sigLabel(sig), "Action")}
        ${detailCard("الثقة", conf, "Confidence")}
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
  function detailCard(label, value, helper) { return `<article class="detail-card"><span class="card-kicker">${h(helper)}</span><strong class="ltr">${h(value || "غير متاح")}</strong><p>${h(label)}</p></article>`; }

  /* ── multi-strategy consensus engine: combine several classic strategies,
     take the most-agreed (most accurate) verdict. ── */
  function strategySignals(asset, tech, rec) {
    const t = tech || {}, sigs = [];
    const price = num(asset.price, asset.lastPrice, asset.regularMarketPrice, asset.close, rec && rec.currentPrice, t.price);
    const ma50 = num(t.ma50, t.sma50, t.ema50), ma200 = num(t.ma200, t.sma200, t.ema200);
    const rsi = num(t.rsi, t.rsi14, t.RSI), macd = num(t.macd, t.macdValue), macdSig = num(t.macdSignal, t.signalLine);
    const s1 = num(t.support, t.s1, t.support1), r1 = num(t.resistance, t.r1, t.resistance1);
    const chg = num(asset.changePercent, asset.percentChange, rec && rec.expectedMovePct);
    const push = (name, signal, weight, note) => sigs.push({ name, signal, weight, note });
    if (ma50 !== null && ma200 !== null) push("اتجاه — تقاطع المتوسطات", ma50 >= ma200 ? "buy" : "sell", 1.3, ma50 >= ma200 ? "المتوسط 50 فوق 200 (تقاطع ذهبي)" : "المتوسط 50 تحت 200 (تقاطع موت)");
    if (rsi !== null) push("RSI — تشبع/ارتداد", rsi <= 30 ? "buy" : rsi >= 70 ? "sell" : "neutral", 1.0, rsi <= 30 ? `تشبع بيعي (${Math.round(rsi)})` : rsi >= 70 ? `تشبع شرائي (${Math.round(rsi)})` : `محايد (${Math.round(rsi)})`);
    if (macd !== null && macdSig !== null) push("MACD — زخم", macd >= macdSig ? "buy" : "sell", 1.1, macd >= macdSig ? "تقاطع إيجابي" : "تقاطع سلبي");
    if (price !== null && ma50 !== null) push("السعر مقابل المتوسط 50", price >= ma50 ? "buy" : "sell", 0.9, price >= ma50 ? "السعر فوق المتوسط" : "السعر تحت المتوسط");
    if (price !== null && s1 !== null && r1 !== null) { const mid = (s1 + r1) / 2; push("الدعم/المقاومة", price <= s1 * 1.02 ? "buy" : price >= r1 * 0.98 ? "sell" : price >= mid ? "buy" : "neutral", 0.8, price <= s1 * 1.02 ? "قرب الدعم" : price >= r1 * 0.98 ? "قرب المقاومة" : "داخل النطاق"); }
    if (chg !== null) push("الزخم اللحظي", chg > 0.3 ? "buy" : chg < -0.3 ? "sell" : "neutral", 0.7, `${chg > 0 ? "+" : ""}${Number(chg).toFixed(2)}%`);
    if (rec) push("توصية المزود (AI)", signal(rec), 1.2, sigLabel(signal(rec)) + (num(rec.confidence, rec.score) !== null ? ` · ${Math.round(num(rec.confidence, rec.score))}%` : ""));
    return sigs;
  }
  function consensus(sigs) {
    let buy = 0, sell = 0, neutral = 0, tw = 0;
    sigs.forEach(s => { if (s.signal === "buy") buy += s.weight; else if (s.signal === "sell") sell += s.weight; else neutral += s.weight; tw += s.weight; });
    if (!tw) return { signal: "watch", agreement: 0, score: 0, buy: 0, sell: 0, neutral: 0, count: 0 };
    const top = Math.max(buy, sell, neutral);
    const sigName = (top === buy && buy > 0) ? "buy" : (top === sell && sell > 0) ? "sell" : "watch";
    const agreement = Math.round(top / tw * 100);
    const coverage = Math.min(1, sigs.length / 6);
    return { signal: sigName, agreement, score: Math.round(agreement * coverage), buy: Math.round(buy / tw * 100), sell: Math.round(sell / tw * 100), neutral: Math.round(neutral / tw * 100), count: sigs.length };
  }
  function strategyConsensus(asset, tech, rec) {
    const sigs = strategySignals(asset, tech, rec), c = consensus(sigs);
    if (!sigs.length) return emptyState("لا توجد بيانات كافية للاستراتيجيات", "يحتاج محرك الإجماع مؤشرات فنية أو توصية من المزود لتشغيل الاستراتيجيات.", "الإعدادات", `${ROOT}/settings`);
    const tone = c.signal === "buy" ? "ok" : c.signal === "sell" ? "warn" : "";
    const rows = sigs.map(s => `<div class="strat-row"><span class="strat-name">${h(s.name)}</span><span class="strat-note">${h(s.note)}</span><span class="vote ${s.signal === "buy" ? "ok" : s.signal === "sell" ? "warn" : ""}">${h(sigLabel(s.signal))}</span></div>`).join("");
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
  function marketUnavailable(m, data) { return `<section class="panel unavailable-panel"><span class="empty-glyph">⚠</span><h2>بيانات ${h(m.ar)} غير متاحة</h2><p>${h((data && data.message) || providerCopy().copy)}</p>
    <div class="detail-grid">${detailCard("الرموز المدعومة", String(m.symbols.length), "Symbols")}${detailCard("العملة", m.currency, "Currency")}${detailCard("الحالة", providerCopy().raw, "Status")}${detailCard("آخر تحديث", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit" }), "Updated")}</div>
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

  function status() {
    const s = providerCopy(), pill = document.getElementById("provider-status");
    if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span>${h(s.copy)}</span>`;
    const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy");
    if (dot) dot.className = `status-dot ${s.className}`;
    if (title) title.textContent = s.title;
    if (copy) copy.textContent = s.copy;
    const session = document.getElementById("session-status"), market = currentMarket();
    if (session) session.textContent = `${market.ar} · ${market.currency}`;
  }
  function ticker() {
    const row = document.getElementById("ticker-row"); if (!row) return;
    const idx = [["NAS100", "NAS100"], ["US30", "US30"], ["XAUUSD", "Gold"], ["WTI", "Oil"], ["BTCUSD", "BTC/USD"], ["KFH.KW", "KFH"]];
    row.innerHTML = idx.map(([s, label]) => { const r = findAssetForSymbol(s, recs()) || {}; const p = num(r.price, r.currentPrice, r.lastPrice); const chg = num(r.changePercent, r.percentChange); return `<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({ ...r, symbol: s })}<span><strong>${h(label)}</strong><small class="ltr">${p === null ? "غير متاح" : price(p, currency({ ...r, symbol: s }))} ${chg === null ? "" : `<i class="${chg >= 0 ? "up" : "down"}">${change(chg)}</i>`}</small></span></button>`; }).join("");
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
    const a = norm(asset), action = signal(a), now = new Date().toISOString(), entry = num(a.entryPrice, a.entry, a.currentPrice, a.price, a.lastPrice);
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
      timeframe: a.timeframe || a.duration || (action === "watch" ? "تحت المتابعة" : "1-3 أسابيع"),
      status: action === "wait" ? "waiting" : action === "watch" ? "watching" : "open",
      openedAt: now,
      updatedAt: now,
      provider: a.provider || a.source || "Yahoo Finance",
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
    const reasons = arr(x.reasons).map(String).filter(Boolean);
    const warnings = arr(x.warnings).map(String).filter(Boolean);
    return {
      ...base,
      assetType: x.assetType || x.asset_type || base.assetType,
      market: x.market || base.market,
      currency: x.currency || base.currency,
      signal: x.action || base.signal,
      recommendation: x.action || base.recommendation,
      action: x.action || base.action,
      id: x.id || base.id,
      sourceSignalId: x.id || x.sourceSignalId || x.source_signal_id || base.sourceSignalId,
      actionLabelAr: x.actionLabelAr || x.action_label_ar,
      confidence: num(x.confidence, base.confidence),
      score: num(x.confidence, base.score),
      price: currentPrice,
      currentPrice,
      target: targetPrice,
      targetPrice,
      stopLoss,
      stop: stopLoss,
      riskLevel: x.riskLevel || x.risk_level || base.riskLevel,
      dataQuality: x.dataQuality || x.data_quality,
      provider: x.provider || base.provider || "Yahoo Finance",
      source: x.provider || base.source,
      timeframe: x.timeframe || base.timeframe,
      reasons,
      warnings,
      reason: reasons[0] || x.reason || base.reason,
      summary: x.summary || reasons.join(" · "),
      status: x.status || (x.action === "wait" ? "انتظار" : x.action === "watch" ? "تحت المتابعة" : "open"),
      scoreBreakdown: x.scoreBreakdown || x.score_breakdown,
      technicalSummary: x.technicalSummary || x.technical_summary,
      disclaimerAr: x.disclaimerAr,
      disclaimerEn: x.disclaimerEn,
      lastUpdated: x.lastUpdated || x.last_updated || x.created_at
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
  function sortMovers(r) { const withChg = r.filter(x => num(x.changePercent, x.percentChange) !== null); const byChg = [...withChg].sort((a, b) => num(b.changePercent, b.percentChange) - num(a.changePercent, a.percentChange)); return { gainers: byChg, losers: [...byChg].reverse(), active: topPicks(r, r.length) }; }
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
  function norm(x) { x = x || {}; const s = sym(x.symbol || x.ticker || x.code || x.asset || x.name || ""); return { ...x, symbol: s, name: x.name || x.companyName || x.assetName || x.longName || s }; }
  function signal(x) { const raw = String(x.signal || x.recommendation || x.action || x.side || x.type || "watch").toLowerCase(); if (raw.includes("buy") || raw.includes("شراء") || raw.includes("long")) return "buy"; if (raw.includes("sell") || raw.includes("بيع") || raw.includes("short")) return "sell"; if (raw.includes("wait") || raw.includes("hold") || raw.includes("انتظار")) return "wait"; return "watch"; }
  function sigLabel(s) { return s === "buy" ? "شراء" : s === "sell" ? "بيع" : s === "wait" ? "انتظار" : "مراقبة"; }
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
  function currency(a) { const s = sym(a.symbol || a.ticker || ""), explicit = a.currency || a.currencyCode || a.quoteCurrency; if (explicit && String(explicit).toUpperCase() !== "KWF") return String(explicit).toUpperCase(); if (/\.KW$/i.test(s)) return "KWD"; if (/\.SR$|\.SA$/i.test(s)) return "SAR"; if (/\.AE$/i.test(s)) return "AED"; if (/\.QA$/i.test(s)) return "QAR"; if (/\.OM$/i.test(s)) return "OMR"; if (/\.BH$/i.test(s)) return "BHD"; if (/\.T$/i.test(s)) return "JPY"; if (/\.HK$/i.test(s)) return "HKD"; if (/\.DE$|\.AS$|\.PA$/i.test(s)) return "EUR"; if (/\.SW$/i.test(s)) return "CHF"; if (/\.KS$/i.test(s)) return "KRW"; if (/^(NAS100|US30|SPX|NDX|DJI|DXY|IXIC)$/.test(s)) return "USD"; if (/^[A-Z]{6}$/.test(s)) return s.slice(3); if (/USD$/.test(s) || ["XAUUSD", "XAGUSD", "WTI", "BRENT"].includes(s)) return "USD"; if (/^[A-Z]{1,5}$/.test(s)) return "USD"; return "--"; }
  function assetType(s, explicit) { s = sym(s); if (explicit) { const e = String(explicit).toLowerCase(); if (/crypto/.test(e)) return "crypto"; if (/forex|fx|currency/.test(e)) return "forex"; if (/commodit|metal/.test(e)) return "commodity"; if (/etf|fund/.test(e)) return "fund"; if (/index/.test(e)) return "index"; if (/stock|equity/.test(e)) return "stock"; } if (/BTC|ETH|SOL|USDT|XRP|ADA|BNB|DOGE/i.test(s) && /USD|USDT/i.test(s)) return "crypto"; if (/XAU|XAG|WTI|BRENT|OIL|GOLD|SILVER/i.test(s)) return "commodity"; if (/^(NAS100|US30|SPX|NDX|DJI|DXY|IXIC)$/.test(s)) return "index"; if (/^[A-Z]{6}$/.test(s.replace(/[.\-=].*/, ""))) return "forex"; if (/^(SPY|QQQ|GLD|IWM|VOO)$/.test(s)) return "fund"; return "stock"; }
  function sym(v) { return String(v || "").trim().toUpperCase().replace(/\s+/g, ""); }
  function price(v, c) { return v === null || v === undefined || Number.isNaN(Number(v)) ? "غير متاح" : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${c && c !== "--" ? c : ""}`.trim(); }
  function change(v) { return v === null || v === undefined ? "غير متاح" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
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
  function errorMessage(error) { return error && typeof error === "object" && "message" in error ? String(error.message || UNAVAILABLE_MESSAGE) : String(error || UNAVAILABLE_MESSAGE); }
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
  function providerCopy() {
    if (state.providerStatus && state.providerStatus.ok === false) {
      return { title: "حالة المزود غير متاحة", copy: state.providerStatus.message || UNAVAILABLE_MESSAGE, className: "warning", raw: "provider_status_failed" };
    }
    const p = (state.providerStatus && state.providerStatus.dataProvider) || state.provider || {};
    const configured = p.configured === true || Boolean(p.active);
    const raw = p.status || (configured ? "configured" : "not_configured");
    const ok = configured && ["success", "available", "configured", "connected"].includes(String(raw));
    if (String(raw) === "rate_limited") return { title: "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً", copy: "تم الوصول إلى حد استخدام مزود البيانات مؤقتاً. سنعرض بيانات مخزنة مؤقتاً عند توفرها.", className: "warning", raw };
    if (ok) return { title: "المزود متصل", copy: `المزود النشط: ${providerName(p.active || p.provider)}`, className: "online", raw };
    return { title: "المزود غير مهيأ", copy: "لا توجد بيانات سوق حية مفعّلة حالياً، لذلك لن نعرض أرقاماً أو توصيات وهمية.", className: "warning", raw };
  }
  function h(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
})();
