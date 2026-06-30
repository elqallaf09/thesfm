
(() => {
  "use strict";
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3" };
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const routes = {
    dashboard: "ØºØ±ÙØ© Ù‚ÙŠØ§Ø¯Ø© Ø§Ù„Ø³ÙˆÙ‚", markets: "Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", "ai-scanner": "Ù…Ø§Ø³Ø­ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ", watchlist: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø°ÙƒÙŠØ©",
    portfolio: "Ø§Ù„Ù…Ø­ÙØ¸Ø©", alerts: "Ù…Ø±ÙƒØ² Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª", recommendations: "Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„", "trade-performance": "Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª",
    news: "Ø£Ø®Ø¨Ø§Ø± Ø§Ù„Ø³ÙˆÙ‚", calendar: "ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø³ÙˆÙ‚", education: "Ù…Ø±ÙƒØ² Ø§Ù„ØªØ¹Ù„ÙŠÙ…", settings: "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…", "symbol-details": "ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø²"
  };
  const markets = [
    ["us-stocks", "Ø§Ù„Ø£Ø³Ù‡Ù… Ø§Ù„Ø£Ù…Ø±ÙŠÙƒÙŠØ©", "US Stocks", "Equities", "USD", ["AAPL", "MSFT", "NVDA"], "featured"],
    ["kuwait", "Ø¨ÙˆØ±ØµØ© Ø§Ù„ÙƒÙˆÙŠØª", "Boursa Kuwait", "GCC", "KWD", ["KFH.KW", "NBK.KW", "ZAIN.KW"]],
    ["gcc", "Ø£Ø³ÙˆØ§Ù‚ Ø§Ù„Ø®Ù„ÙŠØ¬", "GCC Markets", "Regional", "SAR/AED/QAR/KWD", ["2222.SR", "EMAAR.AE", "QNBK.QA"]],
    ["forex", "Ø§Ù„Ø¹Ù…Ù„Ø§Øª", "Forex", "FX", "Quote", ["EURUSD", "GBPUSD", "USDJPY"]],
    ["crypto", "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ø±Ù‚Ù…ÙŠØ©", "Crypto", "Digital", "USD/USDT", ["BTCUSD", "ETHUSD", "SOLUSD"]],
    ["commodities", "Ø§Ù„Ø³Ù„Ø¹", "Commodities", "Macro", "USD", ["XAUUSD", "XAGUSD", "WTI"]],
    ["indices", "Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª", "Indices", "Benchmarks", "Local", ["SPX", "NDX", "DXY"]],
    ["etfs", "Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©", "ETFs", "Funds", "USD", ["SPY", "QQQ", "GLD"]],
    ["sharia", "Ù…ØªÙˆØ§ÙÙ‚Ø© Ø´Ø±Ø¹ÙŠØ§Ù‹", "Sharia Screen", "Filter", "By asset", ["AAPL", "MSFT", "KFH.KW"]],
    ["growth", "Ø£Ø³Ù‡Ù… Ø§Ù„Ù†Ù…Ùˆ", "Growth", "Factor", "By asset", ["NVDA", "TSLA", "AMD"]],
    ["dividend", "ØªÙˆØ²ÙŠØ¹Ø§Øª Ø§Ù„Ø£Ø±Ø¨Ø§Ø­", "Dividend", "Factor", "By asset", ["KO", "PEP", "JNJ"]],
    ["banks", "Ø§Ù„Ø¨Ù†ÙˆÙƒ", "Banks", "Sector", "By market", ["JPM", "NBK.KW", "KFH.KW"]],
    ["energy", "Ø§Ù„Ø·Ø§Ù‚Ø©", "Energy", "Sector", "By market", ["XOM", "2222.SR", "OXY"]],
    ["defensive", "Ø§Ù„Ø¯ÙØ§Ø¹ÙŠØ©", "Defensive", "Sector", "By asset", ["PG", "WMT", "MRK"]],
    ["europe", "Ø£ÙˆØ±ÙˆØ¨Ø§", "Europe", "Global", "EUR/GBP/CHF", ["ASML.AS", "SAP.DE", "NESN.SW"]],
    ["asia", "Ø¢Ø³ÙŠØ§", "Asia", "Global", "JPY/HKD/CNY", ["7203.T", "9988.HK", "TSM"]]
  ].map(([id, ar, en, family, currency, symbols, tone]) => ({ id, ar, en, family, currency, symbols, tone }));
  const lessons = [
    ["ÙƒÙŠÙ ØªÙ‚Ø±Ø£ ØªÙˆØµÙŠØ© AIØŸ", "Ø§Ù„ØªÙˆØµÙŠØ© Ù„Ø§ ØªØ¸Ù‡Ø± Ø¥Ù„Ø§ Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ù…Ø²ÙˆØ¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØªØ­Ù„ÙŠÙ„ Ù…ÙƒØªÙ…Ù„. Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯ Ø³ØªØ±Ù‰ Ø­Ø§Ù„Ø© ÙØ§Ø±ØºØ© Ø¨Ø¯Ù„ Ø£Ø±Ù‚Ø§Ù… Ù…ØµØ·Ù†Ø¹Ø©."],
    ["Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø§Ø·Ø±", "Ø§Ø¨Ø¯Ø£ Ø¨ØªØ­Ø¯ÙŠØ¯ Ø­Ø¬Ù… Ø§Ù„ØµÙÙ‚Ø©ØŒ Ù†Ù‚Ø·Ø© Ø§Ù„Ø¥Ù„ØºØ§Ø¡ØŒ ÙˆÙ†Ø³Ø¨Ø© Ø§Ù„Ø¹Ø§Ø¦Ø¯ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø© Ù‚Ø¨Ù„ Ù…ØªØ§Ø¨Ø¹Ø© Ø£ÙŠ Ø±Ù…Ø²."],
    ["Ø§Ù„Ø¹Ù…Ù„Ø© Ø­Ø³Ø¨ Ø§Ù„Ø£ØµÙ„", "ÙƒÙ„ Ø£ØµÙ„ ÙŠØ³ØªØ®Ø¯Ù… Ø¹Ù…Ù„ØªÙ‡ Ø§Ù„Ø®Ø§ØµØ© Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ Ø§Ù„Ø³ÙˆÙ‚ØŒ ÙˆÙ„ÙŠØ³ Ù…Ù† Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…Ø®ØªØ§Ø± ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø©."]
  ];
  const state = { route: { id: "dashboard" }, loading: true, rec: {}, markets: {}, news: {}, followed: {}, provider: {}, watch: read(keys.watch, []), alerts: read(keys.alerts, []), cache: new Map() };

  document.addEventListener("DOMContentLoaded", boot);
  async function boot() {
    state.route = readRoute();
    bind();
    render();
    await hydrate();
    state.loading = false;
    render();
  }
  async function hydrate() {
    const [rec, mk, news, followed] = await Promise.all([
      get("/recommendations?market=us-stocks"), get("/markets"), get("/market-news?limit=12"), get("/followed-trades")
    ]);
    state.rec = rec; state.markets = mk; state.news = news; state.followed = followed;
    state.provider = rec.dataProvider || mk.dataProvider || news.dataProvider || rec.provider || mk.provider || news.provider || { configured: false, status: "not_configured" };
  }
  async function get(path) {
    try {
      const res = await fetch(`${API}${path}`, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      const body = await res.json().catch(() => ({}));
      return res.ok ? { ok: true, ...body } : { ok: false, status: res.status, message: body.message || body.error || res.statusText, dataProvider: body.dataProvider || null };
    } catch (error) { return { ok: false, message: error.message, dataProvider: null }; }
  }
  function bind() {
    document.addEventListener("click", (event) => {
      const route = event.target.closest("[data-route-link]");
      if (route) { event.preventDefault(); go(route.getAttribute("href")); return; }
      const detail = event.target.closest("[data-symbol-details]");
      if (detail) { event.preventDefault(); const s = sym(detail.dataset.symbolDetails); if (s) go(`${ROOT}/symbol-details/${encodeURIComponent(s)}`); return; }
      const add = event.target.closest("[data-quick-add]");
      if (add) { event.preventDefault(); addWatch(add.dataset.quickAdd); return; }
      const remove = event.target.closest("[data-remove-watch]");
      if (remove) { event.preventDefault(); removeWatch(remove.dataset.removeWatch); return; }
      const alert = event.target.closest("[data-create-alert]");
      if (alert) { event.preventDefault(); createAlert(alert.dataset.createAlert); }
    });
    document.getElementById("symbol-search")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const symbol = sym(document.getElementById("symbol-input")?.value || "");
      if (!symbol) return toast("Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹ Ø£ÙˆÙ„Ø§Ù‹ØŒ Ù…Ø«Ù„ AAPL Ø£Ùˆ BTCUSD.");
      go(`${ROOT}/symbol-details/${encodeURIComponent(symbol)}`);
    });
  }
  function render() {
    const title = document.getElementById("page-title");
    if (title) title.textContent = routes[state.route.id] || routes.dashboard;
    document.querySelectorAll("[data-route]").forEach((node) => node.classList.toggle("is-active", node.dataset.route === state.route.id));
    status(); ticker(); statusBar();
    const content = document.getElementById("terminal-content");
    if (!content) return;
    content.innerHTML = state.loading ? loading() : page();
    if (!state.loading && state.route.id === "symbol-details" && state.route.symbol) loadSymbol(state.route.symbol);
  }
  function page() {
    const id = state.route.id;
    if (id === "markets") return marketsPage();
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
  function dashboardPage() {
    const rec = recs(), news = newsItems(), followed = trades(), alerts = smartAlerts();
    return `<div class="page-stack">
      <section class="command-hero"><div class="hero-copy"><span class="eyebrow">LIVE READINESS / NO SYNTHETIC DATA</span><h2>ØªØ±Ù…ÙŠÙ†Ø§Ù„ ØªØ¯Ø§ÙˆÙ„ Ø³ÙŠÙ†Ù…Ø§Ø¦ÙŠ ÙŠÙ‚Ø±Ø£ Ø§Ù„Ø³ÙˆÙ‚ Ø¹Ù†Ø¯Ù…Ø§ ØªÙƒÙˆÙ† Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…ØªØµÙ„Ø©.</h2><p>Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù„Ø§ ØªØµÙ†Ø¹ Ø£Ø³Ø¹Ø§Ø±Ø§Ù‹ Ø£Ùˆ ØªÙˆØµÙŠØ§Øª. Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„ØŒ ØªØ¸Ù‡Ø± Ø§Ù„Ø­Ø§Ù„Ø© Ø¨ÙˆØ¶ÙˆØ­ Ù…Ø¹ ØµÙØ­Ø§Øª ÙƒØ§Ù…Ù„Ø© Ù„Ù„ØªÙ†Ù‚Ù„ØŒ Ø§Ù„ØªØ­Ù„ÙŠÙ„ØŒ Ø§Ù„Ø£Ø®Ø¨Ø§Ø±ØŒ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŒ ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª.</p><div class="hero-actions"><a class="action-btn" href="${ROOT}/ai-scanner" data-route-link>Ø§ÙØªØ­ Ù…Ø§Ø³Ø­ Ø§Ù„Ø°ÙƒØ§Ø¡</a><a class="ghost-btn" href="${ROOT}/markets" data-route-link>Ø§Ø³ØªØ¹Ø±Ø¶ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</a><button class="ghost-btn" data-symbol-details="AAPL">Ø¬Ø±Ù‘Ø¨ ØµÙØ­Ø© Ø±Ù…Ø²</button></div></div><div class="hero-panel">${systemCard()}</div></section>
      ${marketOverview(rec)}
      <section class="metric-grid">${stat("Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø­ÙŠØ©", rec.length, "API recommendations")}${stat("Ø§Ù„Ø£Ø®Ø¨Ø§Ø±", news.length, "Market news")}${stat("Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", state.watch.length, "Local watchlist")}${stat("ØµÙÙ‚Ø§Øª Ù…ØªØ§Ø¨Ø¹Ø©", followed.length, "Followed trades")}</section>
      <section class="dash-split">
        <article class="panel watchlist-panel"><div class="panel-head"><div><span class="eyebrow">SMART WATCHLIST</span><h2>Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø°ÙƒÙŠØ©</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>Ø¹Ø±Ø¶ Ø§Ù„ÙƒÙ„</a></div>${rec.length ? watchlistTable(rec.slice(0, 8)) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø­ÙŠØ©", "Ù…Ø­Ø±Ùƒ Ø§Ù„ØªÙˆØµÙŠØ§Øª Ù„Ù… ÙŠØ±Ø¬Ø¹ Ù†ØªØ§Ø¦Ø¬ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¹Ø±Ø¶. Ù„Ø§ Ù†Ù…Ù„Ø£ Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø¨Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©.", "Ø§ÙØªØ­ Ø§Ù„Ù…Ø§Ø³Ø­", `${ROOT}/ai-scanner`)}</article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">AI TOP PICKS</span><h2>Ø£ÙØ¶Ù„ Ø§Ù„ÙØ±Øµ</h2>${rec.length ? assetList(rec.slice(0,3)) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ÙØ±Øµ Ø­ÙŠØ©", "Ø¨Ø§Ù†ØªØ¸Ø§Ø± ØªÙˆØµÙŠØ§Øª Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</article>
          <article class="panel"><span class="eyebrow">MARKET NEWS</span><h2>Ø¢Ø®Ø± Ø§Ù„Ø£Ø®Ø¨Ø§Ø±</h2>${news.length ? newsList(news.slice(0,3)) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø®Ø¨Ø§Ø±", "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø¹Ù†Ø§ØµØ± Ø­Ø§Ù„ÙŠØ©.", "ØµÙØ­Ø© Ø§Ù„Ø£Ø®Ø¨Ø§Ø±", `${ROOT}/news`)}</article>
        </aside>
      </section>
      <section class="alert-grid"><article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>Ø­Ø§Ù„Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠ</h2>${alerts.length ? alertList(alerts) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø§Ø±Ø§Øª ØªØ­Ù„ÙŠÙ„ Ø¬Ø§Ù‡Ø²Ø©", "Ø³ÙŠØ¸Ù‡Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø¹Ù†Ø¯ ØªÙˆÙØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³ÙˆÙ‚ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "Ø§ÙØªØ­ Ø§Ù„Ù…Ø§Ø³Ø­", `${ROOT}/ai-scanner`)}</article><article class="panel"><span class="eyebrow">SYSTEM STATUS</span><h2>Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…</h2>${diagnostics()}</article></section>
    </div>`;
  }
  function marketBias(rec) {
    const buy = rec.filter(x => signal(x) === "buy").length;
    const sell = rec.filter(x => signal(x) === "sell").length;
    const total = rec.length;
    if (!total) return { label: "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", en: "AWAITING", pct: 0, conf: 0, tone: "" };
    const bullPct = Math.round((buy / total) * 100);
    const confVals = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = confVals.length ? Math.round(confVals.reduce((a, b) => a + b, 0) / confVals.length) : 0;
    const label = bullPct >= 55 ? "ØµØ§Ø¹Ø¯" : bullPct <= 40 ? "Ù‡Ø§Ø¨Ø·" : "Ù…Ø­Ø§ÙŠØ¯";
    const en = bullPct >= 55 ? "BULLISH" : bullPct <= 40 ? "BEARISH" : "NEUTRAL";
    const tone = bullPct >= 55 ? "ok" : bullPct <= 40 ? "warn" : "";
    return { label, en, pct: bullPct, conf, tone };
  }
  function marketOverview(rec) {
    const bias = marketBias(rec);
    const cities = ["New York", "London", "Frankfurt", "Dubai", "Riyadh", "Kuwait", "Tokyo", "Hong Kong"];
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">MARKET OVERVIEW</span><h2>Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</h2></div><div class="mo-timeframes"><button class="is-active">1D</button><button>1W</button><button>1M</button><button>1Y</button></div></div>
      <div class="mo-body">
        <div class="world-map" aria-hidden="true">
          ${cities.map((c, i) => `<span class="map-node node-${i}"><i></i><b>${h(c)}</b></span>`).join("")}
          <svg viewBox="0 0 900 360" preserveAspectRatio="none"><path d="M95 170 C220 80 325 210 458 132 S690 45 810 155"></path><path d="M120 235 C250 250 345 188 468 220 S650 300 800 230"></path><path d="M432 160 C470 195 520 215 590 202 S690 185 762 244"></path></svg>
        </div>
        <div class="mo-gauges">
          <div class="mo-gauge"><span class="card-kicker">MARKET SENTIMENT</span><strong class="state-${bias.tone}">${h(bias.en)}</strong><div class="mo-bar"><i style="width:${bias.pct}%"></i></div><small>${h(bias.label)} Â· ${bias.pct}% Ø´Ø±Ø§Ø¡</small></div>
          <div class="mo-gauge"><span class="card-kicker">AI CONFIDENCE</span><strong>${bias.conf ? bias.conf + "%" : "--"}</strong><div class="mo-bar"><i class="conf" style="width:${bias.conf}%"></i></div><small>${bias.conf >= 70 ? "Ø«Ù‚Ø© Ø¹Ø§Ù„ÙŠØ©" : bias.conf ? "Ø«Ù‚Ø© Ù…ØªÙˆØ³Ø·Ø©" : "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª"}</small></div>
        </div>
      </div>
    </section>`;
  }
  function watchlistTable(items) {
    const rows = items.map(x => {
      const a = norm(x), c = currency(a), sig = signal(a);
      const conf = num(a.confidence, a.score, a.aiConfidence);
      const p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close);
      const chg = num(a.changePercent, a.percentChange);
      const tgt = num(a.target, a.targetPrice, a.priceTarget);
      const score = num(a.aiScore, a.score, a.rating);
      return `<tr>
        <td class="wt-asset"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || "--")}</small></span></button></td>
        <td class="ltr">${h(price(p, c))}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}">${h(change(chg))}</td>
        <td><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span></td>
        <td class="ltr">${conf === null ? "--" : Math.round(conf) + "%"}</td>
        <td class="ltr">${tgt === null ? "--" : price(tgt, c)}</td>
        <td>${h(a.timeframe || a.horizon || a.duration || "--")}</td>
        <td>${h(a.risk || a.riskLevel || "--")}</td>
        <td class="ltr">${score === null ? "--" : (score > 10 ? Math.round(score) + "%" : score.toFixed(1))}</td>
        <td><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">ØªÙØ§ØµÙŠÙ„</button></td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>Ø§Ù„Ø£ØµÙ„</th><th>Ø§Ù„Ø³Ø¹Ø±</th><th>Ø§Ù„ØªØºÙŠØ±</th><th>Ø§Ù„ØªÙˆØµÙŠØ©</th><th>Ø§Ù„Ø«Ù‚Ø©</th><th>Ø§Ù„Ù‡Ø¯Ù</th><th>Ø§Ù„Ù…Ø¯Ø©</th><th>Ø§Ù„Ù…Ø®Ø§Ø·Ø±Ø©</th><th>Ø³ÙƒÙˆØ± AI</th><th>Ø¥Ø¬Ø±Ø§Ø¡</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function statusBar() {
    const bar = document.getElementById("terminal-statusbar"); if (!bar) return;
    const rec = recs(), mk = arr(state.markets.markets || state.markets.data || state.markets.results);
    const p = providerCopy();
    const cells = [
      ["Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", mk.length || markets.length, "Total markets"],
      ["Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…Ø­Ù„Ù„Ø©", rec.length || "--", "Analyzed assets"],
      ["Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", state.watch.length, "Watchlist"],
      ["Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯", p.title, p.raw],
      ["Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), "Last update"]
    ];
    bar.innerHTML = cells.map(([label, value, helper]) => `<div class="sb-cell"><span>${h(label)}</span><strong>${h(String(value))}</strong><em>${h(helper)}</em></div>`).join("") +
      `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${p.className === "online" ? "Ø§Ù„Ù†Ø¸Ø§Ù… ÙŠØ¹Ù…Ù„" : "Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ù…Ø²ÙˆØ¯"}</strong></div>`;
  }
  function marketsPage() { return `<div class="page-stack">${hero("Ø®Ø±ÙŠØ·Ø© Ø£Ø³ÙˆØ§Ù‚ ÙƒØ§Ù…Ù„Ø©", "Ø§Ù„Ø£Ø³Ù‡Ù…ØŒ Ø§Ù„Ø®Ù„ÙŠØ¬ØŒ Ø§Ù„Ø¹Ù…Ù„Ø§ØªØŒ Ø§Ù„ÙƒØ±ÙŠØ¨ØªÙˆØŒ Ø§Ù„Ø³Ù„Ø¹ØŒ Ø§Ù„Ù…Ø¤Ø´Ø±Ø§ØªØŒ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ØŒ Ø§Ù„Ù‚Ø·Ø§Ø¹Ø§Øª ÙˆØ§Ù„ÙÙ„Ø§ØªØ±. ÙƒÙ„ Ø¨Ø·Ø§Ù‚Ø© ØªØ¹Ø±Ø¶ Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ø§Ù„Ø£ØµÙ„ ÙˆÙ„Ø§ ØªØ±Ø« Ø¹Ù…Ù„Ø© Ø§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…Ø®ØªØ§Ø±.", "MARKETS")}<section class="market-grid">${markets.map(marketCard).join("")}</section><section class="panel"><span class="eyebrow">AVAILABLE PROVIDER DATA</span><h2>Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³ÙˆØ§Ù‚ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯</h2>${providerMarkets()}</section></div>`; }
  function scannerPage() { const r = recs(), u = arr(state.rec.unavailable); return `<div class="page-stack">${hero("Ù…Ø§Ø³Ø­ AI Ø¨Ø¯ÙˆÙ† Ù†ØªØ§Ø¦Ø¬ Ù…ØµØ·Ù†Ø¹Ø©", "ÙŠÙØ±Ø² Ø§Ù„Ù…Ø§Ø³Ø­ Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„Ø¥Ø´Ø§Ø±Ø§Øª Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© Ù…Ù† Ø§Ù„Ù€ API ÙÙ‚Ø·. Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯ ØªØ¸Ù‡Ø± Ø£Ø³Ø¨Ø§Ø¨ Ø§Ù„ØºÙŠØ§Ø¨ Ø­ØªÙ‰ Ù„Ø§ ØªØªØ¯Ø§Ø®Ù„ Ø§Ù„Ø¯Ø§ØªØ§ Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ù…Ø¹ Ø§Ù„Ù‚Ø±Ø§Ø±.", "AI SCANNER")}<section class="metric-grid">${stat("ÙØ±Øµ Ø´Ø±Ø§Ø¡", r.filter(x=>signal(x)==="buy").length, "Buy signals")}${stat("ÙØ±Øµ Ø¨ÙŠØ¹", r.filter(x=>signal(x)==="sell").length, "Sell signals")}${stat("ØºÙŠØ± Ù…ØªØ§Ø­", u.length, "Unavailable")}${stat("ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø°ÙƒÙŠØ©", smartAlerts().length, "Smart alerts")}</section><section class="panel"><span class="eyebrow">SCANNER RESULTS</span><h2>Ù†ØªØ§Ø¦Ø¬ Ø§Ù„ÙØ­Øµ</h2>${r.length ? assetList(r) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ ÙØ­Øµ Ø­ÙŠØ©", "Ù‚Ù… Ø¨ØªÙØ¹ÙŠÙ„ Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø£Ùˆ Ø§Ø®ØªØ± Ø±Ù…Ø²Ø§Ù‹ Ù…Ù† Ø§Ù„Ø¨Ø­Ø« Ù„ÙØªØ­ ØµÙØ­Ø© Ø§Ù„ØªÙØ§ØµÙŠÙ„ ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„.", "ØªÙØ§ØµÙŠÙ„ Ø±Ù…Ø²", `${ROOT}/symbol-details`)}</section></div>`; }
  function watchPage() { const quick = defaults.concat(["EURUSD","SPY","2222.SR"]); return `<div class="page-stack">${hero("Ù‚Ø§Ø¦Ù…Ø© Ù…ØªØ§Ø¨Ø¹Ø© Ø°ÙƒÙŠØ© ÙˆÙ†Ø¸ÙŠÙØ©", "Ø£Ø¶Ù Ø§Ù„Ø±Ù…ÙˆØ² Ø§Ù„ØªÙŠ ØªØ±ÙŠØ¯ Ù…Ø±Ø§Ù‚Ø¨ØªÙ‡Ø§. Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª ØªØ¸Ù‡Ø± ÙÙ‚Ø· Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡Ø§ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ Ø¨ÙŠÙ†Ù…Ø§ ØªØ¨Ù‚Ù‰ Ø§Ù„Ø¹Ù…Ù„Ø§Øª ÙˆØ§Ù„Ø±Ù…ÙˆØ² LTR Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­.", "WATCHLIST")}<section class="panel"><span class="eyebrow">QUICK ADD</span><h2>Ø¥Ø¶Ø§ÙØ© Ø³Ø±ÙŠØ¹Ø© Ù…Ù† Ø¯Ù„ÙŠÙ„ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚</h2><div class="quick-actions">${quick.map(s=>`<button class="ghost-btn" data-quick-add="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></section><section class="watchlist-grid">${state.watch.length ? state.watch.map(s=>assetCard({symbol:s,name:s},{removable:true})).join("") : empty("Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙØ§Ø±ØºØ©", "Ø£Ø¶Ù Ø±Ù…ÙˆØ²Ø§Ù‹ Ù…Ù† Ø§Ù„Ø£Ø¹Ù„Ù‰. Ù„Ù† Ù†Ù‚ÙˆÙ… Ø¨ØªØ¹Ø¨Ø¦ØªÙ‡Ø§ Ø¨Ø¯Ø§ØªØ§ ÙˆÙ‡Ù…ÙŠØ© Ø£Ùˆ Ø£Ø³Ø¹Ø§Ø± ØºÙŠØ± Ù…Ø¤ÙƒØ¯Ø©.", "Ø§ÙØªØ­ Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", `${ROOT}/markets`)}</section></div>`; }
  function portfolioPage() { const t = trades(); return `<div class="page-stack">${hero("Ø§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­ÙØ¸Ø© ÙˆØ³ÙŠØ· Ù…ØªØµÙ„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹. ÙŠØªÙ… Ø¹Ø±Ø¶ Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙÙ‚Ø· Ù…Ù† Ù†Ø¸Ø§Ù… Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø£Ùˆ Ù…Ù† Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ø­Ù„ÙŠØ© Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡Ø§.", "PORTFOLIO")}<section class="metric-grid">${stat("Ù…Ø±Ø§ÙƒØ² Ù…ÙØªÙˆØ­Ø©", t.length, "Followed trades")}${stat("Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø­ÙØ¸Ø©", "--", "ØªØ­ØªØ§Ø¬ Ø±Ø¨Ø· ÙˆØ³ÙŠØ·")}${stat("Ø§Ù„Ø¹Ø§Ø¦Ø¯", "--", "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø£Ø¯Ø§Ø¡")}${stat("Ø§Ù„Ù…Ø®Ø§Ø·Ø±", "--", "ØªØ­ØªØ§Ø¬ Ù…Ø±Ø§ÙƒØ² Ø­Ù‚ÙŠÙ‚ÙŠØ©")}</section><section class="panel"><span class="eyebrow">POSITIONS</span><h2>Ø§Ù„Ù…Ø±Ø§ÙƒØ² Ø§Ù„Ø­Ø§Ù„ÙŠØ©</h2>${t.length ? tradeList(t) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø±Ø§ÙƒØ² Ù…ØªØµÙ„Ø©", "Ø§Ø±Ø¨Ø· Ù…ØµØ¯Ø± Ø§Ù„ØµÙÙ‚Ø§Øª Ø£Ùˆ ØªØ§Ø¨Ø¹ ØªÙˆØµÙŠØ© Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„ØªØ¸Ù‡Ø± Ù‡Ù†Ø§.", "Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª", `${ROOT}/trade-performance`)}</section></div>`; }
  function alertsPage() { const smart = smartAlerts(), local = state.alerts; return `<div class="page-stack">${hero("Ù…Ø±ÙƒØ² Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª", "Ø§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© ØªØ£ØªÙŠ Ù…Ù† API Ø§Ù„ØªÙˆØµÙŠØ§ØªØŒ ÙˆØ§Ù„ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ø­Ù„ÙŠØ© ØªØ­ÙØ¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§ØªÙƒ ÙÙ‚Ø· Ø¨Ø¯ÙˆÙ† Ø§Ø¯Ø¹Ø§Ø¡ ØªØ­Ù‚Ù‚ Ø³Ø¹Ø±ÙŠ.", "ALERTS")}<section class="alert-grid"><article class="panel"><span class="eyebrow">SMART ALERTS</span><h2>ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ù…Ø²ÙˆØ¯</h2>${smart.length ? alertList(smart) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø°ÙƒÙŠØ©", "Ù„Ù… ÙŠØ±Ø¬Ø¹ Ù…Ø²ÙˆØ¯ Ø§Ù„ØªØ­Ù„ÙŠÙ„ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø­Ø§Ù„ÙŠØ©.", "Ø§ÙØªØ­ Ø§Ù„ØªÙˆØµÙŠØ§Øª", `${ROOT}/recommendations`)}</article><article class="panel"><span class="eyebrow">LOCAL ALERTS</span><h2>ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ù…Ø­ÙÙˆØ¸Ø© Ù…Ø­Ù„ÙŠØ§Ù‹</h2>${local.length ? alertList(local) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ù…Ø­Ù„ÙŠØ©", "Ø§Ø³ØªØ®Ø¯Ù… ØµÙØ­Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø² Ù„Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡ Ù…ØªØ§Ø¨Ø¹Ø© Ù…Ø­Ù„ÙŠ.", "ØªÙØ§ØµÙŠÙ„ Ø±Ù…Ø²", `${ROOT}/symbol-details`)}</article></section></div>`; }
  function recPage() { const r = recs(), buy = r.filter(x=>signal(x)==="buy"), sell = r.filter(x=>signal(x)==="sell"), watch = r.filter(x=>!["buy","sell"].includes(signal(x))); return `<div class="page-stack">${hero("Ø§Ù„ØªÙˆØµÙŠØ§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„", "ØµÙØ­Ø© Ù…Ø®ØµØµØ© Ù„Ù„ØªÙˆØµÙŠØ§Øª Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† ØªØ­ÙˆÙŠÙ„Ù‡Ø§ Ø¥Ù„Ù‰ ØµÙØ­Ø© Ø£Ø®Ø±Ù‰. ÙƒÙ„ Ø¨Ø·Ø§Ù‚Ø© ØªØ­ØªÙˆÙŠ Ø²Ø± ØªÙØ§ØµÙŠÙ„ ÙˆØªØ­Ù„ÙŠÙ„ ÙŠØ¹Ù…Ù„ Ø¹Ù„Ù‰ Ù…Ø³Ø§Ø± Ø­Ù‚ÙŠÙ‚ÙŠ.", "RECOMMENDATIONS")}<section class="settings-grid"><article class="panel"><span class="eyebrow">BUY</span><h2>ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø´Ø±Ø§Ø¡</h2>${buy.length ? assetList(buy) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø´Ø±Ø§Ø¡", "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø´Ø±Ø§Ø¡ Ø­ÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "Ù…Ø§Ø³Ø­ AI", `${ROOT}/ai-scanner`)}</article><article class="panel"><span class="eyebrow">SELL / RISK</span><h2>ØªÙˆØµÙŠØ§Øª Ø§Ù„Ø¨ÙŠØ¹ Ø£Ùˆ Ø§Ù„Ù…Ø®Ø§Ø·Ø±</h2>${sell.length ? assetList(sell) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø¨ÙŠØ¹", "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø¨ÙŠØ¹ Ø­ÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", `${ROOT}/markets`)}</article></section><section class="panel"><span class="eyebrow">WATCH / NEUTRAL</span><h2>Ø±Ù…ÙˆØ² Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©</h2>${watch.length ? assetList(watch) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ø§Ù†ØªØ¸Ø§Ø±", "Ù„Ø§ ØªÙˆØ¬Ø¯ ØªÙˆØµÙŠØ§Øª Ù…Ø­Ø§ÙŠØ¯Ø© Ø£Ùˆ Ø§Ù†ØªØ¸Ø§Ø± Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ø­Ø§Ù„ÙŠØ§Ù‹.", "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", `${ROOT}/watchlist`)}</section></div>`; }
  function performancePage() { const g = groupTrades(trades()); return `<div class="page-stack">${hero("Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµÙÙ‚Ø§Øª", "Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø±Ø§Ø¨Ø­Ø©ØŒ Ø§Ù„Ø®Ø§Ø³Ø±Ø©ØŒ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±ØŒ ÙˆØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙÙŠ ØµÙØ­Ø© ÙˆØ§Ø­Ø¯Ø© ÙˆØ§Ø¶Ø­Ø© Ø¨Ø¯ÙˆÙ† Ø¬Ø¯Ø§ÙˆÙ„ ÙØ§Ø±ØºØ© Ø¶Ø®Ù…Ø©.", "TRADE PERFORMANCE")}<section class="trade-board">${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø±Ø§Ø¨Ø­Ø©", g.win)}${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª Ø§Ù„Ø®Ø§Ø³Ø±Ø©", g.loss)}${tradeCol("ØµÙÙ‚Ø§Øª Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±", g.wait)}${tradeCol("Ø§Ù„ØµÙÙ‚Ø§Øª ØªØ­Øª Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", g.follow)}</section></div>`; }
  function newsPage() { const n = newsItems(); return `<div class="page-stack">${hero("Ø£Ø®Ø¨Ø§Ø± Ø§Ù„Ø³ÙˆÙ‚", "ØªÙ‚Ø±Ø£ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù…Ù† Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ. Ø¹Ù†Ø¯ Ø¹Ø¯Ù… ØªÙˆÙØ±Ù‡ØŒ ØªØ¸Ù‡Ø± Ø±Ø³Ø§Ù„Ø© ÙˆØ§Ø¶Ø­Ø© Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø¹Ù†Ø§ÙˆÙŠÙ† Ù…ØµØ·Ù†Ø¹Ø©.", "NEWS")}<section class="news-grid">${n.length ? n.map(newsCard).join("") : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ø®Ø¨Ø§Ø± Ø­ÙŠØ©", "Ù…Ø²ÙˆØ¯ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø¹Ù†Ø§ØµØ± Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„Ø¹Ø±Ø¶ Ø­Ø§Ù„ÙŠØ§Ù‹.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</section></div>`; }
  function calendarPage() { return `<div class="page-stack">${hero("ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø³ÙˆÙ‚", "Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø© Ø¬Ø§Ù‡Ø²Ø© Ù„Ø±Ø¨Ø· Ø§Ù„ØªÙ‚ÙˆÙŠÙ… Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠ ÙˆØ£Ø­Ø¯Ø§Ø« Ø§Ù„Ø£Ø±Ø¨Ø§Ø­. Ù„Ø§ ÙŠØªÙ… Ø¹Ø±Ø¶ Ø£Ø­Ø¯Ø§Ø« ØºÙŠØ± Ù…Ø¤ÙƒØ¯Ø© Ø£Ùˆ ØªÙˆØ§Ø±ÙŠØ® Ù…ØµØ·Ù†Ø¹Ø©.", "CALENDAR")}<section class="settings-grid"><article class="panel"><span class="eyebrow">ECONOMIC EVENTS</span><h2>Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ø§Ù‚ØªØµØ§Ø¯ÙŠØ©</h2>${empty("Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø²ÙˆØ¯ ØªÙ‚ÙˆÙŠÙ… Ù…ØªØµÙ„", "Ø¹Ù†Ø¯ Ø±Ø¨Ø· Ù…Ø²ÙˆØ¯ ØªÙ‚ÙˆÙŠÙ… Ø§Ù‚ØªØµØ§Ø¯ÙŠ Ø³ØªØ¸Ù‡Ø± Ø§Ù„Ø£Ø­Ø¯Ø§Ø« Ù…Ø¹ Ø§Ù„ÙˆÙ‚Øª ÙˆØ§Ù„ØªØ£Ø«ÙŠØ± ÙˆØ§Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…ØªØ£Ø«Ø±.", "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</article><article class="panel"><span class="eyebrow">EARNINGS</span><h2>Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø´Ø±ÙƒØ§Øª</h2>${empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ø£Ø±Ø¨Ø§Ø­ Ø­ÙŠØ©", "Ù„Ø§ Ù†Ø¹Ø±Ø¶ Ù…ÙˆØ§Ø¹ÙŠØ¯ Ø£Ø±Ø¨Ø§Ø­ Ø¨Ø¯ÙˆÙ† Ù…ØµØ¯Ø± Ø¨ÙŠØ§Ù†Ø§Øª Ù…ÙˆØ«ÙˆÙ‚.", "Ø§Ù„Ø£Ø®Ø¨Ø§Ø±", `${ROOT}/news`)}</article></section></div>`; }
  function educationPage() { return `<div class="page-stack">${hero("Ù…Ø±ÙƒØ² Ø§Ù„ØªØ¹Ù„ÙŠÙ…", "ØªØ¹Ù„ÙŠÙ… Ù…Ø®ØªØµØ± Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…Ù†ØµØ© ÙŠØ³Ø§Ø¹Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø¹Ù„Ù‰ ÙÙ‡Ù… Ø§Ù„Ù‚ÙŠÙˆØ¯: Ù„Ø§ ØªÙˆØµÙŠØ§Øª Ø¨Ø¯ÙˆÙ† Ø¨ÙŠØ§Ù†Ø§ØªØŒ Ù„Ø§ Ø£Ø³Ø¹Ø§Ø± ÙˆÙ‡Ù…ÙŠØ©ØŒ ÙˆÙƒÙ„ Ø±Ù…Ø² Ù„Ù‡ Ø¹Ù…Ù„ØªÙ‡ Ø§Ù„Ø®Ø§ØµØ©.", "EDUCATION")}<section class="education-grid">${lessons.map(([t,b])=>`<article class="lesson-card"><span class="eyebrow">LESSON</span><strong>${h(t)}</strong><p>${h(b)}</p></article>`).join("")}</section></div>`; }
  function settingsPage() { return `<div class="page-stack">${hero("Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…", "Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¹Ø±Ø¶ØŒ ÙˆØ³Ù„ÙˆÙƒ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª. Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø© ØªÙˆØ¶Ù‘Ø­ Ù„Ù…Ø§Ø°Ø§ Ù‚Ø¯ ØªÙƒÙˆÙ† Ø§Ù„ØªÙˆØµÙŠØ§Øª Ø£Ùˆ Ø§Ù„Ø£Ø®Ø¨Ø§Ø± ÙØ§Ø±ØºØ©.", "SETTINGS")}<section class="settings-grid"><article class="panel"><span class="eyebrow">PROVIDER</span><h2>Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</h2>${diagnostics()}</article><article class="panel"><span class="eyebrow">PREFERENCES</span><h2>ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ø¹Ø±Ø¶</h2><div class="status-card"><strong>Ø§Ù„Ù„ØºØ© ÙˆØ§Ù„Ø§ØªØ¬Ø§Ù‡</strong><p>Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø¹Ø±Ø¨ÙŠØ© RTLØŒ ÙˆØ§Ù„Ø±Ù…ÙˆØ² ÙˆØ§Ù„Ù…Ø¤Ø´Ø±Ø§Øª ØªØ¹Ø±Ø¶ LTR Ø¨Ø¹Ø²Ù„ ÙƒØ§Ù…Ù„ Ù„Ù…Ù†Ø¹ ØªØ¯Ø§Ø®Ù„ Ø§Ù„Ù†Øµ.</p><span class="state-badge ok">RTL/LTR clean</span></div><div class="status-card"><strong>Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</strong><p>Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ù„Ø§ ØªÙˆÙ„Ù‘Ø¯ Ø£Ø³Ø¹Ø§Ø±Ø§Ù‹ Ø£Ùˆ ØªÙˆØµÙŠØ§Øª Ø¨Ø¯ÙŠÙ„Ø© Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ø§Ù„Ù…Ø²ÙˆØ¯. ÙŠØªÙ… Ø¹Ø±Ø¶ Ø­Ø§Ù„Ø§Øª ÙØ§Ø±ØºØ© Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ÙÙ‡Ù….</p><span class="state-badge warn">No fake market data</span></div></article></section></div>`; }
  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero("ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø±Ù…Ø²", "Ø§ÙƒØªØ¨ Ø±Ù…Ø²Ø§Ù‹ ÙÙŠ Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ø¹Ù„ÙˆÙŠ Ù„ÙØªØ­ ØµÙØ­Ø© ØªØ­Ù„ÙŠÙ„ Ù…Ø®ØµØµØ©. Ø£Ù…Ø«Ù„Ø©: AAPL, BTCUSD, XAUUSD, KFH.KW", "SYMBOL DETAILS")}<section class="panel">${empty("Ù„Ù… ÙŠØªÙ… Ø§Ø®ØªÙŠØ§Ø± Ø±Ù…Ø²", "Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¨Ø­Ø« Ø§Ù„Ø¹Ù„ÙˆÙŠ Ø£Ùˆ Ø£Ø­Ø¯ Ø£Ø²Ø±Ø§Ø± Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ù…Ù† Ø§Ù„Ø£Ø³ÙˆØ§Ù‚ ÙˆØ§Ù„ØªÙˆØµÙŠØ§Øª.", "Ø§Ù„Ø£Ø³ÙˆØ§Ù‚", `${ROOT}/markets`)}</section></div>`;
    return `<div class="page-stack">${hero(`ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø±Ù…Ø² <span class="ltr">${h(symbol)}</span>`, "ØµÙØ­Ø© ØªÙØ§ØµÙŠÙ„ Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„ÙƒÙ„ Ø±Ù…Ø²ØŒ ØªØ¹Ø±Ø¶ Ù…Ù„Ù Ø§Ù„Ø£ØµÙ„ ÙˆØ§Ù„Ø¹Ù…Ù„Ø© ÙˆØ§Ù„Ù…ØµØ¯Ø± Ø¹Ù†Ø¯ ØªÙˆÙØ±Ù‡Ø§ Ù…Ù† API.", "SYMBOL DETAILS")}<section class="detail-layout" id="symbol-details-body"><article class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>Ø¬Ø§Ø±ÙŠ ÙØ­Øµ Ø§Ù„Ø±Ù…Ø²</h2><p class="ltr">${h(symbol)}</p></div></article></section></div>`;
  }
  async function loadSymbol(symbol) {
    const target = document.getElementById("symbol-details-body"); if (!target) return;
    const key = sym(symbol);
    if (state.cache.has(key)) { target.innerHTML = symbolContent(state.cache.get(key)); return; }
    const [profile, search] = await Promise.all([get(`/market/asset-profile?symbol=${encodeURIComponent(key)}`), get(`/market/search?q=${encodeURIComponent(key)}&limit=5`)]);
    const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
    const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
    const asset = norm({ symbol: key, ...found, ...rawProfile });
    const detail = { asset, available: Boolean(profile.ok && (rawProfile.symbol || found.symbol || found.name)), source: profile.source || search.source || asset.source || "--", message: profile.message || search.message || "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø²." };
    state.cache.set(key, detail);
    target.innerHTML = symbolContent(detail);
  }
  function symbolContent(detail) {
    const a = detail.asset, c = currency(a), statusText = providerCopy().copy;
    return `<article class="panel"><span class="eyebrow">ASSET PROFILE</span><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || "Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ ØºÙŠØ± Ù…ØªÙˆÙØ± Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯")}</small></div></div><div class="detail-grid">${detailCard("Ø§Ù„Ø¹Ù…Ù„Ø©", c, "Currency")}${detailCard("Ù†ÙˆØ¹ Ø§Ù„Ø£ØµÙ„", a.assetType || a.type || assetType(a.symbol), "Asset type")}${detailCard("Ø§Ù„Ø³ÙˆÙ‚", a.exchange || a.market || "--", "Exchange")}${detailCard("Ù…ØµØ¯Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª", detail.source || "--", "Source")}</div><div class="card-actions"><button class="action-btn" data-quick-add="${h(a.symbol)}">Ø£Ø¶Ù Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©</button><button class="ghost-btn" data-create-alert="${h(a.symbol)}">Ø£Ù†Ø´Ø¦ ØªÙ†Ø¨ÙŠÙ‡ Ù…ØªØ§Ø¨Ø¹Ø©</button></div></article><article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø°ÙƒØ§Ø¡</h2>${detail.available ? analysis(a) : empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ØªØ­Ù„ÙŠÙ„ ÙƒØ§ÙÙŠØ©", detail.message || statusText, "Ø§ÙØªØ­ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`)}</article>`;
  }
  function analysis(a) {
    const rows = [["Ø§Ù„Ø³Ø¹Ø±", price(num(a.price, a.lastPrice, a.regularMarketPrice), currency(a))], ["Ø§Ù„ØªØºÙŠØ±", change(num(a.changePercent, a.percentChange))], ["Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø³ÙˆÙ‚ÙŠØ©", price(num(a.marketCap), currency(a))], ["Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«", date(a.updatedAt || a.lastUpdated)]];
    return `<div class="table-shell"><table><tbody>${rows.map(([k,v])=>`<tr><th>${h(k)}</th><td>${h(v || "--")}</td></tr>`).join("")}</tbody></table></div><p>Ø¥Ø°Ø§ Ø¸Ù‡Ø±Øª Ø§Ù„Ù‚ÙŠÙ… ÙƒØ´Ø±Ø·Ø§Øª ÙÙ‡Ø°Ø§ ÙŠØ¹Ù†ÙŠ Ø£Ù† Ù…Ø²ÙˆØ¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù… ÙŠØ±Ø¬Ø¹ Ø­Ù‚Ù„Ø§Ù‹ Ø±Ù‚Ù…ÙŠØ§Ù‹ Ù…ÙˆØ«ÙˆÙ‚Ø§Ù‹ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø±Ù…Ø².</p>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(norm(x))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = norm(asset), c = currency(a), sig = signal(a), conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close);
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">Ø¥Ø²Ø§Ù„Ø©</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || "Ø§Ø³Ù… Ø§Ù„Ø£ØµÙ„ ØºÙŠØ± Ù…ØªÙˆÙØ±")}</small></div></div><div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span></div><div class="asset-metrics"><span>Ø§Ù„Ø³Ø¹Ø±<b>${h(price(p,c))}</b></span><span>Ø«Ù‚Ø© AI<b>${conf === null ? "--" : `${Math.round(conf)}%`}</b></span></div><p>${h(a.reason || a.summary || "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø±Ø§Ø¡Ø© ØªØ­Ù„ÙŠÙ„ÙŠØ© Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø£ØµÙ„ Ø­Ø§Ù„ÙŠØ§Ù‹.")}</p><div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">ØªØ­Ù„ÙŠÙ„ / ØªÙØ§ØµÙŠÙ„</button><button class="ghost-btn" data-quick-add="${h(a.symbol)}">Ù…ØªØ§Ø¨Ø¹Ø©</button>${remove}</div></article>`;
  }
  function marketTile(m) { return `<article class="market-tile ${m.tone === "featured" ? "featured" : ""}"><span class="card-kicker">${h(m.en)}</span><strong>${h(m.ar)}</strong><p>${h(m.family)} Â· <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${m.symbols.map(s=>`<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></article>`; }
  function marketCard(m) { return `<article class="market-tile ${m.tone === "featured" ? "featured" : ""}"><span class="eyebrow">${h(m.en)}</span><strong>${h(m.ar)}</strong><p>${h(m.family)} Â· Ø§Ù„Ø¹Ù…Ù„Ø©: <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${m.symbols.map(s=>`<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></article>`; }
  function providerMarkets() { const rows = arr(state.markets.markets || state.markets.data || state.markets.results); if (!rows.length) return empty("Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø§Ø¦Ù…Ø© Ø£Ø³ÙˆØ§Ù‚ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯", state.markets.message || providerCopy().copy, "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª", `${ROOT}/settings`); return `<div class="table-shell"><table><thead><tr><th>Ø§Ù„Ø³ÙˆÙ‚</th><th>Ø§Ù„Ø±Ù…Ø²</th><th>Ø§Ù„Ø¹Ù…Ù„Ø©</th><th>Ø§Ù„Ù…ØµØ¯Ø±</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${h(m.name||m.label||"--")}</td><td class="ltr">${h(m.symbol||m.code||"--")}</td><td class="ltr">${h(m.currency||"--")}</td><td>${h(m.source||m.provider||"--")}</td></tr>`).join("")}</tbody></table></div>`; }
  function newsList(items) { return `<div class="news-grid">${items.map(newsCard).join("")}</div>`; }
  function newsCard(n) { const title = n.title || n.headline || n.name || "Ø®Ø¨Ø± Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†", src = n.source || n.publisher || n.provider || "Market news", when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = n.url || n.link || "", text = n.summary || n.description || n.text || "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ù„Ø®Øµ Ù…ØªØ§Ø­ Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯."; return `<article class="news-card"><span class="news-meta">${h(src)} Â· ${h(when)}</span><strong>${h(title)}</strong><p>${h(text)}</p>${url ? `<a class="ghost-btn" href="${h(url)}" target="_blank" rel="noopener">ÙØªØ­ Ø§Ù„Ù…ØµØ¯Ø±</a>` : ""}</article>`; }
  function alertList(items) { return `<div class="trade-list">${items.map(i=>`<article class="trade-item"><strong>${h(i.title || i.symbol || i.name || "ØªÙ†Ø¨ÙŠÙ‡")}</strong><p>${h(i.message || i.reason || i.description || "ØªÙ†Ø¨ÙŠÙ‡ Ù…Ø­ÙÙˆØ¸ Ø¨Ø¯ÙˆÙ† ØªÙØ§ØµÙŠÙ„ Ø¥Ø¶Ø§ÙÙŠØ©.")}</p>${i.symbol ? `<button class="ghost-btn" data-symbol-details="${h(i.symbol)}">ÙØªØ­ Ø§Ù„Ø±Ù…Ø²</button>` : ""}</article>`).join("")}</div>`; }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeItem).join("")}</div>`; }
  function tradeCol(title, items) { return `<article class="trade-column"><h3>${h(title)}</h3>${items.length ? tradeList(items) : `<div class="empty-state compact"><p>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„ØªØµÙ†ÙŠÙ.</p></div>`}</article>`; }
  function tradeItem(t) { const s = sym(t.symbol || t.ticker || t.asset || "--"), pnl = num(t.pnl, t.profitLoss, t.returnPercent); return `<article class="trade-item"><strong class="ltr">${h(s)}</strong><p class="trade-meta">${h(t.status || t.state || "Ù…ØªØ§Ø¨Ø¹Ø©")} Â· ${pnl === null ? "P/L --" : `${pnl}%`}</p><button class="ghost-btn" data-symbol-details="${h(s)}">ØªÙØ§ØµÙŠÙ„</button></article>`; }
  function watchPreview() { if (!state.watch.length) return `${empty("Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙØ§Ø±ØºØ©", "Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© Ø±Ù…ÙˆØ². Ø³Ù†Ø¹Ø±Ø¶ Ø§Ù„Ø¹Ù…Ù„Ø© ÙˆØ§Ù„Ø±Ù…Ø² ÙÙˆØ±Ø§Ù‹ØŒ ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø± ÙÙ‚Ø· Ø¥Ø°Ø§ Ø±Ø¬Ø¹Øª Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯.", "Ø§ÙØªØ­ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©", `${ROOT}/watchlist`)}<div class="quick-actions">${defaults.map(s=>`<button class="ghost-btn" data-quick-add="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div>`; return `<div class="watchlist-grid">${state.watch.slice(0,6).map(s=>assetCard({symbol:s,name:s})).join("")}</div>`; }
  function systemCard() { const s = providerCopy(); return `<article class="status-card"><span class="eyebrow">SYSTEM</span><strong>${h(s.title)}</strong><p>${h(s.copy)}</p><span class="state-badge ${s.className === "online" ? "ok" : "warn"}">${h(s.raw)}</span></article>`; }
  function diagnostics() { const p = state.provider || {}; const rows = [["Ø§Ù„Ø­Ø§Ù„Ø©", providerCopy().raw], ["Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù†Ø´Ø·", p.active || p.requested || p.provider || "--"], ["Ù…Ù‡ÙŠØ£ØŸ", p.configured === true ? "Ù†Ø¹Ù…" : "Ù„Ø§"], ["Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…", state.rec.message || state.markets.message || state.news.message || "--"]]; return `<div class="table-shell"><table><tbody>${rows.map(([k,v])=>`<tr><th>${h(k)}</th><td>${h(v)}</td></tr>`).join("")}</tbody></table></div>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(kicker)}</span><h2>${title}</h2><p>${h(body)}</p></section>`; }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(helper)}</span><strong>${h(String(value))}</strong><small>${h(label)}</small></article>`; }
  function detailCard(label, value, helper) { return `<article class="detail-card"><span class="card-kicker">${h(helper)}</span><strong>${h(value || "--")}</strong><p>${h(label)}</p></article>`; }
  function empty(title, body, label, href) { return `<div class="empty-state compact"><h3>${h(title)}</h3><p>${h(body)}</p>${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(label)}</a>` : ""}</div>`; }
  function loading() { return `<section class="loading-panel"><span class="pulse-orb"></span><h2>ÙŠØªÙ… ØªØ¬Ù‡ÙŠØ² Ù…Ù†ØµØ© Ø§Ù„ØªØ¯Ø§ÙˆÙ„</h2><p>Ù†Ø­Ù…Ù‘Ù„ Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø²ÙˆØ¯ØŒ Ø§Ù„Ø£Ø®Ø¨Ø§Ø±ØŒ Ø§Ù„ØªÙˆØµÙŠØ§ØªØŒ ÙˆÙ‚ÙˆØ§Ø¦Ù… Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø¨Ø¯ÙˆÙ† Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ‡Ù…ÙŠØ©.</p></section>`; }
  function logo(a) { const s = sym(a.symbol || a.ticker || a.code || "SFM"), type = assetType(s, a.assetType || a.type), text = s.replace(/[^A-Z0-9]/gi, "").slice(0,3) || "SFM"; return `<span class="asset-logo ${h(type)}" aria-hidden="true">${h(text)}</span>`; }
  function status() { const s = providerCopy(), pill = document.getElementById("provider-status"); if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span>${h(s.copy)}</span>`; const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy"); if (dot) dot.className = `status-dot ${s.className}`; if (title) title.textContent = s.title; if (copy) copy.textContent = s.copy; }
  function ticker() { const row = document.getElementById("ticker-row"); if (!row) return; const symbols = unique(state.watch.length ? state.watch : defaults); row.innerHTML = symbols.map(s=>`<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({symbol:s})}<span><strong class="ltr">${h(s)}</strong><small>${h(currency({symbol:s}))} Â· Ø§Ù„Ø³Ø¹Ø± Ù…Ù† Ø§Ù„Ù…Ø²ÙˆØ¯</small></span></button>`).join(""); }
  function readRoute() { const q = new URLSearchParams(location.search).get("route"); const raw = q || location.pathname.replace(ROOT, "").replace(/^\/+|\/+$/g, "") || "dashboard"; const clean = decodeURIComponent(raw).replace(/^\/+|\/+$/g, ""); if (!clean || clean === "home") return {id:"dashboard"}; const [id, ...rest] = clean.split("/"); if (id === "market-analysis") return {id:"recommendations"}; if (id === "symbol-details") return {id, symbol:sym(rest.join("/"))}; return routes[id] ? {id} : {id:"dashboard"}; }
  function go(href) { try { window.top.location.href = href; } catch (_e) { location.href = href; } }
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(`ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${s} Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©.`); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x=>x!==s); write(keys.watch, state.watch); toast(`ØªÙ…Øª Ø¥Ø²Ø§Ù„Ø© ${s} Ù…Ù† Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©.`); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{symbol:s,title:`Ù…ØªØ§Ø¨Ø¹Ø© ${s}`,message:"ØªÙ†Ø¨ÙŠÙ‡ Ù…Ø­Ù„ÙŠ Ù…Ø­ÙÙˆØ¸. ÙŠØ­ØªØ§Ø¬ Ù…Ø²ÙˆØ¯ Ø£Ø³Ø¹Ø§Ø± Ù„ØªÙØ¹ÙŠÙ„Ù‡ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹.",createdAt:new Date().toISOString()}, ...state.alerts].slice(0,20); write(keys.alerts,state.alerts); toast(`ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªÙ†Ø¨ÙŠÙ‡ Ù…ØªØ§Ø¨Ø¹Ø© Ù„Ù€ ${s}.`); render(); }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.textContent = message; root.appendChild(node); setTimeout(()=>node.remove(), 3200); }
  function providerCopy() { const p = state.provider || {}, configured = p.configured === true || Boolean(p.active), raw = p.status || (configured ? "configured" : "not_configured"); if (configured && !String(raw).includes("not")) return {title:"Ø§Ù„Ù…Ø²ÙˆØ¯ Ù…ØªØµÙ„", copy:`Ø§Ù„Ù…Ø²ÙˆØ¯ Ø§Ù„Ù†Ø´Ø·: ${p.active || p.provider || "Ù…ØªØµÙ„"}`, className:"online", raw}; return {title:"Ø§Ù„Ù…Ø²ÙˆØ¯ ØºÙŠØ± Ù…Ù‡ÙŠØ£", copy:"Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ø³ÙˆÙ‚ Ø­ÙŠØ© Ù…ÙØ¹Ù‘Ù„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ØŒ Ù„Ø°Ù„Ùƒ Ù„Ù† Ù†Ø¹Ø±Ø¶ Ø£Ø±Ù‚Ø§Ù…Ø§Ù‹ Ø£Ùˆ ØªÙˆØµÙŠØ§Øª ÙˆÙ‡Ù…ÙŠØ©.", className:"warning", raw}; }
  function recs() { return arr(state.rec.recommendations || state.rec.items || state.rec.data).map(norm).filter(x=>x.symbol); }
  function smartAlerts() { return arr(state.rec.smartAlerts || state.rec.alerts || state.rec.signals); }
  function newsItems() { return arr(state.news.items || state.news.articles || state.news.news || state.news.data || state.news.results); }
  function trades() { return arr(state.followed.followedTrades || state.followed.trades || state.followed.items || state.followed.data || state.followed.followed); }
  function groupTrades(items) { const g = {win:[], loss:[], wait:[], follow:[]}; items.forEach(t=>{ const st = String(t.status||t.state||"").toLowerCase(), pnl = num(t.pnl,t.profitLoss,t.returnPercent); if (pnl !== null && pnl > 0) g.win.push(t); else if (pnl !== null && pnl < 0) g.loss.push(t); else if (st.includes("wait") || st.includes("pending") || st.includes("Ø§Ù†ØªØ¸Ø§Ø±")) g.wait.push(t); else g.follow.push(t); }); return g; }
  function norm(x) { const s = sym(x.symbol || x.ticker || x.code || x.asset || x.name || ""); return {...x, symbol:s, name:x.name || x.companyName || x.assetName || x.longName || s}; }
  function signal(x) { const raw = String(x.signal || x.recommendation || x.action || x.side || x.type || "watch").toLowerCase(); if (raw.includes("buy") || raw.includes("Ø´Ø±Ø§Ø¡")) return "buy"; if (raw.includes("sell") || raw.includes("Ø¨ÙŠØ¹")) return "sell"; return "watch"; }
  function sigLabel(s) { return s === "buy" ? "Ø´Ø±Ø§Ø¡" : s === "sell" ? "Ø¨ÙŠØ¹ / Ù…Ø®Ø§Ø·Ø±Ø©" : "Ù…ØªØ§Ø¨Ø¹Ø©"; }
  function currency(a) { const s = sym(a.symbol || a.ticker || ""), explicit = a.currency || a.currencyCode || a.quoteCurrency; if (explicit) return String(explicit).toUpperCase(); if (/\.KW$/i.test(s)) return "KWD"; if (/\.SA$/i.test(s)) return "SAR"; if (/\.AE$/i.test(s)) return "AED"; if (/\.QA$/i.test(s)) return "QAR"; if (/\.OM$/i.test(s)) return "OMR"; if (/\.BH$/i.test(s)) return "BHD"; if (/USD$/.test(s) || ["XAUUSD","XAGUSD","WTI","BRENT"].includes(s)) return "USD"; if (/^[A-Z]{6}$/.test(s)) return s.slice(3); if (/^[A-Z]{1,5}$/.test(s)) return "USD"; return "--"; }
  function assetType(s, explicit) { if (explicit) return String(explicit).toLowerCase().replace(/\s+/g,"-"); if (/BTC|ETH|SOL|USDT|XRP|ADA/i.test(s)) return "crypto"; if (/XAU|XAG|WTI|BRENT|OIL/i.test(s)) return "commodity"; if (/^[A-Z]{6}$/.test(s)) return "forex"; if (/SPY|QQQ|GLD|ETF/i.test(s)) return "fund"; if (/SPX|NDX|DXY|DJI|IXIC/i.test(s)) return "index"; return "stock"; }
  function sym(v) { return String(v || "").trim().toUpperCase().replace(/\s+/g,""); }
  function price(v,c) { return v === null ? "--" : `${Number(v).toLocaleString("en-US", {maximumFractionDigits:4})} ${c || ""}`.trim(); }
  function change(v) { return v === null ? "--" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`; }
  function date(v) { if (!v) return "--"; const d = new Date(Number(v) ? Number(v) * (String(v).length <= 10 ? 1000 : 1) : v); return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("ar-KW", {dateStyle:"medium", timeStyle:"short"}); }
  function num(...values) { for (const v of values) { const n = Number(v); if (Number.isFinite(n)) return n; } return null; }
  function arr(v) { if (Array.isArray(v)) return v; if (v && typeof v === "object") return Object.values(v).filter(x=>x && typeof x === "object"); return []; }
  function unique(v) { return Array.from(new Set(v.map(sym).filter(Boolean))); }
  function read(k,f) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : f; } catch (_e) { return f; } }
  function write(k,v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} }
  function h(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
})();

