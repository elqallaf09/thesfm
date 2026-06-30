
(() => {
  "use strict";
  const API = "/" + "api";
  const ROOT = "/thesfm-trader-own";
  const keys = { watch: "sfmTraderWatchlist:v3", alerts: "sfmTraderAlerts:v3" };
  const defaults = ["AAPL", "MSFT", "NVDA", "BTCUSD", "XAUUSD", "KFH.KW"];
  const routes = {
    dashboard: "غرفة قيادة السوق", markets: "خريطة الأسواق", "ai-scanner": "ماسح الذكاء الاصطناعي", watchlist: "قائمة المتابعة الذكية",
    portfolio: "المحفظة", alerts: "مركز التنبيهات", recommendations: "التوصيات والتحليل", "trade-performance": "أداء الصفقات",
    news: "أخبار السوق", calendar: "تقويم السوق", education: "مركز التعليم", settings: "إعدادات النظام", "symbol-details": "تفاصيل الرمز"
  };
  const markets = [
    ["us-stocks", "الأسهم الأمريكية", "US Stocks", "Equities", "USD", ["AAPL", "MSFT", "NVDA"], "featured"],
    ["kuwait", "بورصة الكويت", "Boursa Kuwait", "GCC", "KWD", ["KFH.KW", "NBK.KW", "ZAIN.KW"]],
    ["gcc", "أسواق الخليج", "GCC Markets", "Regional", "SAR/AED/QAR/KWD", ["2222.SR", "EMAAR.AE", "QNBK.QA"]],
    ["forex", "العملات", "Forex", "FX", "Quote", ["EURUSD", "GBPUSD", "USDJPY"]],
    ["crypto", "الأصول الرقمية", "Crypto", "Digital", "USD/USDT", ["BTCUSD", "ETHUSD", "SOLUSD"]],
    ["commodities", "السلع", "Commodities", "Macro", "USD", ["XAUUSD", "XAGUSD", "WTI"]],
    ["indices", "المؤشرات", "Indices", "Benchmarks", "Local", ["SPX", "NDX", "DXY"]],
    ["etfs", "الصناديق المتداولة", "ETFs", "Funds", "USD", ["SPY", "QQQ", "GLD"]],
    ["sharia", "متوافقة شرعياً", "Sharia Screen", "Filter", "By asset", ["AAPL", "MSFT", "KFH.KW"]],
    ["growth", "أسهم النمو", "Growth", "Factor", "By asset", ["NVDA", "TSLA", "AMD"]],
    ["dividend", "توزيعات الأرباح", "Dividend", "Factor", "By asset", ["KO", "PEP", "JNJ"]],
    ["banks", "البنوك", "Banks", "Sector", "By market", ["JPM", "NBK.KW", "KFH.KW"]],
    ["energy", "الطاقة", "Energy", "Sector", "By market", ["XOM", "2222.SR", "OXY"]],
    ["defensive", "الدفاعية", "Defensive", "Sector", "By asset", ["PG", "WMT", "MRK"]],
    ["europe", "أوروبا", "Europe", "Global", "EUR/GBP/CHF", ["ASML.AS", "SAP.DE", "NESN.SW"]],
    ["asia", "آسيا", "Asia", "Global", "JPY/HKD/CNY", ["7203.T", "9988.HK", "TSM"]]
  ].map(([id, ar, en, family, currency, symbols, tone]) => ({ id, ar, en, family, currency, symbols, tone }));
  const lessons = [
    ["كيف تقرأ توصية AI؟", "التوصية لا تظهر إلا عند وجود مزود بيانات وتحليل مكتمل. عند غياب المزود سترى حالة فارغة بدل أرقام مصطنعة."],
    ["إدارة المخاطر", "ابدأ بتحديد حجم الصفقة، نقطة الإلغاء، ونسبة العائد إلى المخاطرة قبل متابعة أي رمز."],
    ["العملة حسب الأصل", "كل أصل يستخدم عملته الخاصة من بيانات الرمز أو السوق، وليس من السوق المختار في الواجهة."]
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
      if (!symbol) return toast("اكتب رمزاً أولاً، مثل AAPL أو BTCUSD.");
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
      <section class="command-hero"><div class="hero-copy"><span class="eyebrow">LIVE READINESS / NO SYNTHETIC DATA</span><h2>ترمينال تداول سينمائي يقرأ السوق عندما تكون البيانات متصلة.</h2><p>هذه الواجهة لا تصنع أسعاراً أو توصيات. إذا كان المزود غير مفعّل، تظهر الحالة بوضوح مع صفحات كاملة للتنقل، التحليل، الأخبار، المتابعة، والتنبيهات.</p><div class="hero-actions"><a class="action-btn" href="${ROOT}/ai-scanner" data-route-link>افتح ماسح الذكاء</a><a class="ghost-btn" href="${ROOT}/markets" data-route-link>استعرض الأسواق</a><button class="ghost-btn" data-symbol-details="AAPL">جرّب صفحة رمز</button></div></div><div class="hero-panel">${systemCard()}</div></section>
      ${marketOverview(rec)}
      <section class="metric-grid">${stat("التوصيات الحية", rec.length, "API recommendations")}${stat("الأخبار", news.length, "Market news")}${stat("قائمة المتابعة", state.watch.length, "Local watchlist")}${stat("صفقات متابعة", followed.length, "Followed trades")}</section>
      <section class="dash-split">
        <article class="panel watchlist-panel"><div class="panel-head"><div><span class="eyebrow">SMART WATCHLIST</span><h2>قائمة المتابعة الذكية</h2></div><a class="rdp-view-all" href="${ROOT}/recommendations" data-route-link>عرض الكل</a></div>${rec.length ? watchlistTable(rec.slice(0, 8)) : empty("لا توجد توصيات حية", "محرك التوصيات لم يرجع نتائج قابلة للعرض. لا نملأ الجدول ببيانات وهمية.", "افتح الماسح", `${ROOT}/ai-scanner`)}</article>
        <aside class="dash-rail">
          <article class="panel"><span class="eyebrow">AI TOP PICKS</span><h2>أفضل الفرص</h2>${rec.length ? assetList(rec.slice(0,3)) : empty("لا توجد فرص حية", "بانتظار توصيات من المزود.", "الإعدادات", `${ROOT}/settings`)}</article>
          <article class="panel"><span class="eyebrow">MARKET NEWS</span><h2>آخر الأخبار</h2>${news.length ? newsList(news.slice(0,3)) : empty("لا توجد أخبار", "مزود الأخبار لم يرجع عناصر حالية.", "صفحة الأخبار", `${ROOT}/news`)}</article>
        </aside>
      </section>
      <section class="alert-grid"><article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>حالة التحليل الذكي</h2>${alerts.length ? alertList(alerts) : empty("لا توجد إشارات تحليل جاهزة", "سيظهر التحليل عند توفر بيانات السوق والتوصيات من المزود.", "افتح الماسح", `${ROOT}/ai-scanner`)}</article><article class="panel"><span class="eyebrow">SYSTEM STATUS</span><h2>حالة النظام</h2>${diagnostics()}</article></section>
    </div>`;
  }
  function marketBias(rec) {
    const buy = rec.filter(x => signal(x) === "buy").length;
    const sell = rec.filter(x => signal(x) === "sell").length;
    const total = rec.length;
    if (!total) return { label: "بانتظار البيانات", en: "AWAITING", pct: 0, conf: 0, tone: "" };
    const bullPct = Math.round((buy / total) * 100);
    const confVals = rec.map(x => num(x.confidence, x.score, x.aiConfidence)).filter(v => v !== null);
    const conf = confVals.length ? Math.round(confVals.reduce((a, b) => a + b, 0) / confVals.length) : 0;
    const label = bullPct >= 55 ? "صاعد" : bullPct <= 40 ? "هابط" : "محايد";
    const en = bullPct >= 55 ? "BULLISH" : bullPct <= 40 ? "BEARISH" : "NEUTRAL";
    const tone = bullPct >= 55 ? "ok" : bullPct <= 40 ? "warn" : "";
    return { label, en, pct: bullPct, conf, tone };
  }
  function marketOverview(rec) {
    const bias = marketBias(rec);
    const cities = ["New York", "London", "Frankfurt", "Dubai", "Riyadh", "Kuwait", "Tokyo", "Hong Kong"];
    return `<section class="panel market-overview">
      <div class="panel-head"><div><span class="eyebrow">MARKET OVERVIEW</span><h2>نظرة عامة على الأسواق</h2></div><div class="mo-timeframes"><button class="is-active">1D</button><button>1W</button><button>1M</button><button>1Y</button></div></div>
      <div class="mo-body">
        <div class="world-map" aria-hidden="true">
          ${cities.map((c, i) => `<span class="map-node node-${i}"><i></i><b>${h(c)}</b></span>`).join("")}
          <svg viewBox="0 0 900 360" preserveAspectRatio="none"><path d="M95 170 C220 80 325 210 458 132 S690 45 810 155"></path><path d="M120 235 C250 250 345 188 468 220 S650 300 800 230"></path><path d="M432 160 C470 195 520 215 590 202 S690 185 762 244"></path></svg>
        </div>
        <div class="mo-gauges">
          <div class="mo-gauge"><span class="card-kicker">MARKET SENTIMENT</span><strong class="state-${bias.tone}">${h(bias.en)}</strong><div class="mo-bar"><i style="width:${bias.pct}%"></i></div><small>${h(bias.label)} · ${bias.pct}% شراء</small></div>
          <div class="mo-gauge"><span class="card-kicker">AI CONFIDENCE</span><strong>${bias.conf ? bias.conf + "%" : "--"}</strong><div class="mo-bar"><i class="conf" style="width:${bias.conf}%"></i></div><small>${bias.conf >= 70 ? "ثقة عالية" : bias.conf ? "ثقة متوسطة" : "بانتظار البيانات"}</small></div>
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
        <td><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">تفاصيل</button></td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>الأصل</th><th>السعر</th><th>التغير</th><th>التوصية</th><th>الثقة</th><th>الهدف</th><th>المدة</th><th>المخاطرة</th><th>سكور AI</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function statusBar() {
    const bar = document.getElementById("terminal-statusbar"); if (!bar) return;
    const rec = recs(), mk = arr(state.markets.markets || state.markets.data || state.markets.results);
    const p = providerCopy();
    const cells = [
      ["الأسواق", mk.length || markets.length, "Total markets"],
      ["الأصول المحللة", rec.length || "--", "Analyzed assets"],
      ["قائمة المتابعة", state.watch.length, "Watchlist"],
      ["حالة المزود", p.title, p.raw],
      ["آخر تحديث", new Date().toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), "Last update"]
    ];
    bar.innerHTML = cells.map(([label, value, helper]) => `<div class="sb-cell"><span>${h(label)}</span><strong>${h(String(value))}</strong><em>${h(helper)}</em></div>`).join("") +
      `<div class="sb-cell sb-status"><span class="status-dot ${p.className}"></span><strong>${p.className === "online" ? "النظام يعمل" : "بانتظار المزود"}</strong></div>`;
  }
  function marketsPage() { return `<div class="page-stack">${hero("خريطة أسواق كاملة", "الأسهم، الخليج، العملات، الكريبتو، السلع، المؤشرات، الصناديق، القطاعات والفلاتر. كل بطاقة تعرض العملة الخاصة بالأصل ولا ترث عملة السوق المختار.", "MARKETS")}<section class="market-grid">${markets.map(marketCard).join("")}</section><section class="panel"><span class="eyebrow">AVAILABLE PROVIDER DATA</span><h2>بيانات الأسواق من المزود</h2>${providerMarkets()}</section></div>`; }
  function scannerPage() { const r = recs(), u = arr(state.rec.unavailable); return `<div class="page-stack">${hero("ماسح AI بدون نتائج مصطنعة", "يفرز الماسح التوصيات والإشارات القادمة من الـ API فقط. عند غياب المزود تظهر أسباب الغياب حتى لا تتداخل الداتا التجريبية مع القرار.", "AI SCANNER")}<section class="metric-grid">${stat("فرص شراء", r.filter(x=>signal(x)==="buy").length, "Buy signals")}${stat("فرص بيع", r.filter(x=>signal(x)==="sell").length, "Sell signals")}${stat("غير متاح", u.length, "Unavailable")}${stat("تنبيهات ذكية", smartAlerts().length, "Smart alerts")}</section><section class="panel"><span class="eyebrow">SCANNER RESULTS</span><h2>نتائج الفحص</h2>${r.length ? assetList(r) : empty("لا توجد نتائج فحص حية", "قم بتفعيل مزود البيانات أو اختر رمزاً من البحث لفتح صفحة التفاصيل والتحليل.", "تفاصيل رمز", `${ROOT}/symbol-details`)}</section></div>`; }
  function watchPage() { const quick = defaults.concat(["EURUSD","SPY","2222.SR"]); return `<div class="page-stack">${hero("قائمة متابعة ذكية ونظيفة", "أضف الرموز التي تريد مراقبتها. الأسعار والتحليلات تظهر فقط عند توفرها من المزود، بينما تبقى العملات والرموز LTR بشكل صحيح.", "WATCHLIST")}<section class="panel"><span class="eyebrow">QUICK ADD</span><h2>إضافة سريعة من دليل الأسواق</h2><div class="quick-actions">${quick.map(s=>`<button class="ghost-btn" data-quick-add="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></section><section class="watchlist-grid">${state.watch.length ? state.watch.map(s=>assetCard({symbol:s,name:s},{removable:true})).join("") : empty("قائمة المتابعة فارغة", "أضف رموزاً من الأعلى. لن نقوم بتعبئتها بداتا وهمية أو أسعار غير مؤكدة.", "افتح الأسواق", `${ROOT}/markets`)}</section></div>`; }
  function portfolioPage() { const t = trades(); return `<div class="page-stack">${hero("المحفظة والمتابعة", "لا توجد محفظة وسيط متصلة حالياً. يتم عرض الصفقات المتابعة فقط من نظام المتابعة أو من بيانات المستخدم المحلية عند توفرها.", "PORTFOLIO")}<section class="metric-grid">${stat("مراكز مفتوحة", t.length, "Followed trades")}${stat("قيمة المحفظة", "--", "تحتاج ربط وسيط")}${stat("العائد", "--", "لا توجد بيانات أداء")}${stat("المخاطر", "--", "تحتاج مراكز حقيقية")}</section><section class="panel"><span class="eyebrow">POSITIONS</span><h2>المراكز الحالية</h2>${t.length ? tradeList(t) : empty("لا توجد مراكز متصلة", "اربط مصدر الصفقات أو تابع توصية حقيقية لتظهر هنا.", "أداء الصفقات", `${ROOT}/trade-performance`)}</section></div>`; }
  function alertsPage() { const smart = smartAlerts(), local = state.alerts; return `<div class="page-stack">${hero("مركز التنبيهات", "التنبيهات الذكية تأتي من API التوصيات، والتنبيهات المحلية تحفظ إعداداتك فقط بدون ادعاء تحقق سعري.", "ALERTS")}<section class="alert-grid"><article class="panel"><span class="eyebrow">SMART ALERTS</span><h2>تنبيهات المزود</h2>${smart.length ? alertList(smart) : empty("لا توجد تنبيهات ذكية", "لم يرجع مزود التحليل تنبيهات حالية.", "افتح التوصيات", `${ROOT}/recommendations`)}</article><article class="panel"><span class="eyebrow">LOCAL ALERTS</span><h2>تنبيهات محفوظة محلياً</h2>${local.length ? alertList(local) : empty("لا توجد تنبيهات محلية", "استخدم صفحة تفاصيل الرمز لإنشاء تنبيه متابعة محلي.", "تفاصيل رمز", `${ROOT}/symbol-details`)}</article></section></div>`; }
  function recPage() { const r = recs(), buy = r.filter(x=>signal(x)==="buy"), sell = r.filter(x=>signal(x)==="sell"), watch = r.filter(x=>!["buy","sell"].includes(signal(x))); return `<div class="page-stack">${hero("التوصيات والتحليل", "صفحة مخصصة للتوصيات بدلاً من تحويلها إلى صفحة أخرى. كل بطاقة تحتوي زر تفاصيل وتحليل يعمل على مسار حقيقي.", "RECOMMENDATIONS")}<section class="settings-grid"><article class="panel"><span class="eyebrow">BUY</span><h2>توصيات الشراء</h2>${buy.length ? assetList(buy) : empty("لا توجد توصيات شراء", "لا توجد توصيات شراء حية من المزود.", "ماسح AI", `${ROOT}/ai-scanner`)}</article><article class="panel"><span class="eyebrow">SELL / RISK</span><h2>توصيات البيع أو المخاطر</h2>${sell.length ? assetList(sell) : empty("لا توجد توصيات بيع", "لا توجد توصيات بيع حية من المزود.", "الأسواق", `${ROOT}/markets`)}</article></section><section class="panel"><span class="eyebrow">WATCH / NEUTRAL</span><h2>رموز للمتابعة</h2>${watch.length ? assetList(watch) : empty("لا توجد توصيات انتظار", "لا توجد توصيات محايدة أو انتظار من المزود حالياً.", "قائمة المتابعة", `${ROOT}/watchlist`)}</section></div>`; }
  function performancePage() { const g = groupTrades(trades()); return `<div class="page-stack">${hero("أداء الصفقات", "الصفقات الرابحة، الخاسرة، الانتظار، وتحت المتابعة في صفحة واحدة واضحة بدون جداول فارغة ضخمة.", "TRADE PERFORMANCE")}<section class="trade-board">${tradeCol("الصفقات الرابحة", g.win)}${tradeCol("الصفقات الخاسرة", g.loss)}${tradeCol("صفقات الانتظار", g.wait)}${tradeCol("الصفقات تحت المتابعة", g.follow)}</section></div>`; }
  function newsPage() { const n = newsItems(); return `<div class="page-stack">${hero("أخبار السوق", "تقرأ الأخبار من مزود الأخبار الحقيقي. عند عدم توفره، تظهر رسالة واضحة بدلاً من عناوين مصطنعة.", "NEWS")}<section class="news-grid">${n.length ? n.map(newsCard).join("") : empty("لا توجد أخبار حية", "مزود الأخبار لم يرجع عناصر قابلة للعرض حالياً.", "الإعدادات", `${ROOT}/settings`)}</section></div>`; }
  function calendarPage() { return `<div class="page-stack">${hero("تقويم السوق", "هذه الصفحة جاهزة لربط التقويم الاقتصادي وأحداث الأرباح. لا يتم عرض أحداث غير مؤكدة أو تواريخ مصطنعة.", "CALENDAR")}<section class="settings-grid"><article class="panel"><span class="eyebrow">ECONOMIC EVENTS</span><h2>الأحداث الاقتصادية</h2>${empty("لا يوجد مزود تقويم متصل", "عند ربط مزود تقويم اقتصادي ستظهر الأحداث مع الوقت والتأثير والسوق المتأثر.", "الإعدادات", `${ROOT}/settings`)}</article><article class="panel"><span class="eyebrow">EARNINGS</span><h2>نتائج الشركات</h2>${empty("لا توجد نتائج أرباح حية", "لا نعرض مواعيد أرباح بدون مصدر بيانات موثوق.", "الأخبار", `${ROOT}/news`)}</article></section></div>`; }
  function educationPage() { return `<div class="page-stack">${hero("مركز التعليم", "تعليم مختصر داخل المنصة يساعد المستخدم على فهم القيود: لا توصيات بدون بيانات، لا أسعار وهمية، وكل رمز له عملته الخاصة.", "EDUCATION")}<section class="education-grid">${lessons.map(([t,b])=>`<article class="lesson-card"><span class="eyebrow">LESSON</span><strong>${h(t)}</strong><p>${h(b)}</p></article>`).join("")}</section></div>`; }
  function settingsPage() { return `<div class="page-stack">${hero("إعدادات النظام", "حالة المزود، تفضيلات العرض، وسلوك البيانات. هذه الصفحة توضّح لماذا قد تكون التوصيات أو الأخبار فارغة.", "SETTINGS")}<section class="settings-grid"><article class="panel"><span class="eyebrow">PROVIDER</span><h2>مزود البيانات</h2>${diagnostics()}</article><article class="panel"><span class="eyebrow">PREFERENCES</span><h2>تفضيلات العرض</h2><div class="status-card"><strong>اللغة والاتجاه</strong><p>الواجهة عربية RTL، والرموز والمؤشرات تعرض LTR بعزل كامل لمنع تداخل النص.</p><span class="state-badge ok">RTL/LTR clean</span></div><div class="status-card"><strong>سياسة البيانات</strong><p>الواجهة لا تولّد أسعاراً أو توصيات بديلة عند غياب المزود. يتم عرض حالات فارغة قابلة للفهم.</p><span class="state-badge warn">No fake market data</span></div></article></section></div>`; }
  function symbolPage(symbol) {
    if (!symbol) return `<div class="page-stack">${hero("تفاصيل الرمز", "اكتب رمزاً في البحث العلوي لفتح صفحة تحليل مخصصة. أمثلة: AAPL, BTCUSD, XAUUSD, KFH.KW", "SYMBOL DETAILS")}<section class="panel">${empty("لم يتم اختيار رمز", "استخدم البحث العلوي أو أحد أزرار التفاصيل من الأسواق والتوصيات.", "الأسواق", `${ROOT}/markets`)}</section></div>`;
    return `<div class="page-stack">${hero(`تحليل الرمز <span class="ltr">${h(symbol)}</span>`, "صفحة تفاصيل حقيقية لكل رمز، تعرض ملف الأصل والعملة والمصدر عند توفرها من API.", "SYMBOL DETAILS")}<section class="detail-layout" id="symbol-details-body"><article class="panel"><div class="loading-panel compact"><span class="pulse-orb"></span><h2>جاري فحص الرمز</h2><p class="ltr">${h(symbol)}</p></div></article></section></div>`;
  }
  async function loadSymbol(symbol) {
    const target = document.getElementById("symbol-details-body"); if (!target) return;
    const key = sym(symbol);
    if (state.cache.has(key)) { target.innerHTML = symbolContent(state.cache.get(key)); return; }
    const [profile, search] = await Promise.all([get(`/market/asset-profile?symbol=${encodeURIComponent(key)}`), get(`/market/search?q=${encodeURIComponent(key)}&limit=5`)]);
    const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});
    const rawProfile = profile.profile || profile.asset || profile.data || profile.result || {};
    const asset = norm({ symbol: key, ...found, ...rawProfile });
    const detail = { asset, available: Boolean(profile.ok && (rawProfile.symbol || found.symbol || found.name)), source: profile.source || search.source || asset.source || "--", message: profile.message || search.message || "لا توجد بيانات كافية من المزود لهذا الرمز." };
    state.cache.set(key, detail);
    target.innerHTML = symbolContent(detail);
  }
  function symbolContent(detail) {
    const a = detail.asset, c = currency(a), statusText = providerCopy().copy;
    return `<article class="panel"><span class="eyebrow">ASSET PROFILE</span><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol)}</strong><small>${h(a.name || "اسم الأصل غير متوفر من المزود")}</small></div></div><div class="detail-grid">${detailCard("العملة", c, "Currency")}${detailCard("نوع الأصل", a.assetType || a.type || assetType(a.symbol), "Asset type")}${detailCard("السوق", a.exchange || a.market || "--", "Exchange")}${detailCard("مصدر البيانات", detail.source || "--", "Source")}</div><div class="card-actions"><button class="action-btn" data-quick-add="${h(a.symbol)}">أضف للمتابعة</button><button class="ghost-btn" data-create-alert="${h(a.symbol)}">أنشئ تنبيه متابعة</button></div></article><article class="panel"><span class="eyebrow">AI ANALYSIS</span><h2>تحليل الذكاء</h2>${detail.available ? analysis(a) : empty("لا توجد بيانات تحليل كافية", detail.message || statusText, "افتح الإعدادات", `${ROOT}/settings`)}</article>`;
  }
  function analysis(a) {
    const rows = [["السعر", price(num(a.price, a.lastPrice, a.regularMarketPrice), currency(a))], ["التغير", change(num(a.changePercent, a.percentChange))], ["القيمة السوقية", price(num(a.marketCap), currency(a))], ["آخر تحديث", date(a.updatedAt || a.lastUpdated)]];
    return `<div class="table-shell"><table><tbody>${rows.map(([k,v])=>`<tr><th>${h(k)}</th><td>${h(v || "--")}</td></tr>`).join("")}</tbody></table></div><p>إذا ظهرت القيم كشرطات فهذا يعني أن مزود البيانات لم يرجع حقلاً رقمياً موثوقاً لهذا الرمز.</p>`;
  }
  function assetList(items) { return `<div class="watchlist-grid">${items.map(x => assetCard(norm(x))).join("")}</div>`; }
  function assetCard(asset, opts = {}) {
    const a = norm(asset), c = currency(a), sig = signal(a), conf = num(a.confidence, a.score, a.aiConfidence), p = num(a.price, a.lastPrice, a.regularMarketPrice, a.close);
    const remove = opts.removable ? `<button class="danger-btn" data-remove-watch="${h(a.symbol)}">إزالة</button>` : "";
    return `<article class="asset-card"><div class="asset-head">${logo(a)}<div class="asset-title"><strong class="symbol-code">${h(a.symbol || "--")}</strong><small>${h(a.name || a.companyName || "اسم الأصل غير متوفر")}</small></div></div><div class="badge-row"><span class="currency-badge">${h(c)}</span><span class="state-badge ${sig === "buy" ? "ok" : sig === "sell" ? "warn" : ""}">${h(sigLabel(sig))}</span></div><div class="asset-metrics"><span>السعر<b>${h(price(p,c))}</b></span><span>ثقة AI<b>${conf === null ? "--" : `${Math.round(conf)}%`}</b></span></div><p>${h(a.reason || a.summary || "لا توجد قراءة تحليلية من المزود لهذا الأصل حالياً.")}</p><div class="card-actions"><button class="action-btn" data-symbol-details="${h(a.symbol)}">تحليل / تفاصيل</button><button class="ghost-btn" data-quick-add="${h(a.symbol)}">متابعة</button>${remove}</div></article>`;
  }
  function marketTile(m) { return `<article class="market-tile ${m.tone === "featured" ? "featured" : ""}"><span class="card-kicker">${h(m.en)}</span><strong>${h(m.ar)}</strong><p>${h(m.family)} · <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${m.symbols.map(s=>`<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></article>`; }
  function marketCard(m) { return `<article class="market-tile ${m.tone === "featured" ? "featured" : ""}"><span class="eyebrow">${h(m.en)}</span><strong>${h(m.ar)}</strong><p>${h(m.family)} · العملة: <span class="ltr">${h(m.currency)}</span></p><div class="tile-tags">${m.symbols.map(s=>`<button class="badge" data-symbol-details="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div></article>`; }
  function providerMarkets() { const rows = arr(state.markets.markets || state.markets.data || state.markets.results); if (!rows.length) return empty("لا توجد قائمة أسواق من المزود", state.markets.message || providerCopy().copy, "الإعدادات", `${ROOT}/settings`); return `<div class="table-shell"><table><thead><tr><th>السوق</th><th>الرمز</th><th>العملة</th><th>المصدر</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${h(m.name||m.label||"--")}</td><td class="ltr">${h(m.symbol||m.code||"--")}</td><td class="ltr">${h(m.currency||"--")}</td><td>${h(m.source||m.provider||"--")}</td></tr>`).join("")}</tbody></table></div>`; }
  function newsList(items) { return `<div class="news-grid">${items.map(newsCard).join("")}</div>`; }
  function newsCard(n) { const title = n.title || n.headline || n.name || "خبر بدون عنوان", src = n.source || n.publisher || n.provider || "Market news", when = date(n.publishedAt || n.datetime || n.date || n.createdAt), url = n.url || n.link || "", text = n.summary || n.description || n.text || "لا يوجد ملخص متاح من المزود."; return `<article class="news-card"><span class="news-meta">${h(src)} · ${h(when)}</span><strong>${h(title)}</strong><p>${h(text)}</p>${url ? `<a class="ghost-btn" href="${h(url)}" target="_blank" rel="noopener">فتح المصدر</a>` : ""}</article>`; }
  function alertList(items) { return `<div class="trade-list">${items.map(i=>`<article class="trade-item"><strong>${h(i.title || i.symbol || i.name || "تنبيه")}</strong><p>${h(i.message || i.reason || i.description || "تنبيه محفوظ بدون تفاصيل إضافية.")}</p>${i.symbol ? `<button class="ghost-btn" data-symbol-details="${h(i.symbol)}">فتح الرمز</button>` : ""}</article>`).join("")}</div>`; }
  function tradeList(items) { return `<div class="trade-list">${items.map(tradeItem).join("")}</div>`; }
  function tradeCol(title, items) { return `<article class="trade-column"><h3>${h(title)}</h3>${items.length ? tradeList(items) : `<div class="empty-state compact"><p>لا توجد بيانات في هذا التصنيف.</p></div>`}</article>`; }
  function tradeItem(t) { const s = sym(t.symbol || t.ticker || t.asset || "--"), pnl = num(t.pnl, t.profitLoss, t.returnPercent); return `<article class="trade-item"><strong class="ltr">${h(s)}</strong><p class="trade-meta">${h(t.status || t.state || "متابعة")} · ${pnl === null ? "P/L --" : `${pnl}%`}</p><button class="ghost-btn" data-symbol-details="${h(s)}">تفاصيل</button></article>`; }
  function watchPreview() { if (!state.watch.length) return `${empty("قائمة المتابعة فارغة", "ابدأ بإضافة رموز. سنعرض العملة والرمز فوراً، والأسعار فقط إذا رجعت من المزود.", "افتح قائمة المتابعة", `${ROOT}/watchlist`)}<div class="quick-actions">${defaults.map(s=>`<button class="ghost-btn" data-quick-add="${h(s)}"><span class="ltr">${h(s)}</span></button>`).join("")}</div>`; return `<div class="watchlist-grid">${state.watch.slice(0,6).map(s=>assetCard({symbol:s,name:s})).join("")}</div>`; }
  function systemCard() { const s = providerCopy(); return `<article class="status-card"><span class="eyebrow">SYSTEM</span><strong>${h(s.title)}</strong><p>${h(s.copy)}</p><span class="state-badge ${s.className === "online" ? "ok" : "warn"}">${h(s.raw)}</span></article>`; }
  function diagnostics() { const p = state.provider || {}; const rows = [["الحالة", providerCopy().raw], ["المزود النشط", p.active || p.requested || p.provider || "--"], ["مهيأ؟", p.configured === true ? "نعم" : "لا"], ["رسالة النظام", state.rec.message || state.markets.message || state.news.message || "--"]]; return `<div class="table-shell"><table><tbody>${rows.map(([k,v])=>`<tr><th>${h(k)}</th><td>${h(v)}</td></tr>`).join("")}</tbody></table></div>`; }
  function hero(title, body, kicker) { return `<section class="page-hero"><span class="eyebrow">${h(kicker)}</span><h2>${title}</h2><p>${h(body)}</p></section>`; }
  function stat(label, value, helper) { return `<article class="stat-card"><span class="card-kicker">${h(helper)}</span><strong>${h(String(value))}</strong><small>${h(label)}</small></article>`; }
  function detailCard(label, value, helper) { return `<article class="detail-card"><span class="card-kicker">${h(helper)}</span><strong>${h(value || "--")}</strong><p>${h(label)}</p></article>`; }
  function empty(title, body, label, href) { return `<div class="empty-state compact"><h3>${h(title)}</h3><p>${h(body)}</p>${label && href ? `<a class="ghost-btn" href="${h(href)}" data-route-link>${h(label)}</a>` : ""}</div>`; }
  function loading() { return `<section class="loading-panel"><span class="pulse-orb"></span><h2>يتم تجهيز منصة التداول</h2><p>نحمّل حالة المزود، الأخبار، التوصيات، وقوائم المتابعة بدون إنشاء بيانات وهمية.</p></section>`; }
  function logo(a) { const s = sym(a.symbol || a.ticker || a.code || "SFM"), type = assetType(s, a.assetType || a.type), text = s.replace(/[^A-Z0-9]/gi, "").slice(0,3) || "SFM"; return `<span class="asset-logo ${h(type)}" aria-hidden="true">${h(text)}</span>`; }
  function status() { const s = providerCopy(), pill = document.getElementById("provider-status"); if (pill) pill.innerHTML = `<span class="status-dot ${s.className}"></span><span>${h(s.copy)}</span>`; const dot = document.getElementById("sidebar-status-dot"), title = document.getElementById("sidebar-status-title"), copy = document.getElementById("sidebar-status-copy"); if (dot) dot.className = `status-dot ${s.className}`; if (title) title.textContent = s.title; if (copy) copy.textContent = s.copy; }
  function ticker() { const row = document.getElementById("ticker-row"); if (!row) return; const symbols = unique(state.watch.length ? state.watch : defaults); row.innerHTML = symbols.map(s=>`<button class="ticker-chip" data-symbol-details="${h(s)}" type="button">${logo({symbol:s})}<span><strong class="ltr">${h(s)}</strong><small>${h(currency({symbol:s}))} · السعر من المزود</small></span></button>`).join(""); }
  function readRoute() { const q = new URLSearchParams(location.search).get("route"); const raw = q || location.pathname.replace(ROOT, "").replace(/^\/+|\/+$/g, "") || "dashboard"; const clean = decodeURIComponent(raw).replace(/^\/+|\/+$/g, ""); if (!clean || clean === "home") return {id:"dashboard"}; const [id, ...rest] = clean.split("/"); if (id === "market-analysis") return {id:"recommendations"}; if (id === "symbol-details") return {id, symbol:sym(rest.join("/"))}; return routes[id] ? {id} : {id:"dashboard"}; }
  function go(href) { try { window.top.location.href = href; } catch (_e) { location.href = href; } }
  function addWatch(raw) { const s = sym(raw); if (!s) return; state.watch = unique([s, ...state.watch]); write(keys.watch, state.watch); toast(`تمت إضافة ${s} لقائمة المتابعة.`); render(); }
  function removeWatch(raw) { const s = sym(raw); state.watch = state.watch.filter(x=>x!==s); write(keys.watch, state.watch); toast(`تمت إزالة ${s} من قائمة المتابعة.`); render(); }
  function createAlert(raw) { const s = sym(raw); if (!s) return; state.alerts = [{symbol:s,title:`متابعة ${s}`,message:"تنبيه محلي محفوظ. يحتاج مزود أسعار لتفعيله تلقائياً.",createdAt:new Date().toISOString()}, ...state.alerts].slice(0,20); write(keys.alerts,state.alerts); toast(`تم إنشاء تنبيه متابعة لـ ${s}.`); render(); }
  function toast(message) { const root = document.getElementById("toast-root"); if (!root) return; const node = document.createElement("div"); node.className = "toast"; node.textContent = message; root.appendChild(node); setTimeout(()=>node.remove(), 3200); }
  function providerCopy() { const p = state.provider || {}, configured = p.configured === true || Boolean(p.active), raw = p.status || (configured ? "configured" : "not_configured"); if (configured && !String(raw).includes("not")) return {title:"المزود متصل", copy:`المزود النشط: ${p.active || p.provider || "متصل"}`, className:"online", raw}; return {title:"المزود غير مهيأ", copy:"لا توجد بيانات سوق حية مفعّلة حالياً، لذلك لن نعرض أرقاماً أو توصيات وهمية.", className:"warning", raw}; }
  function recs() { return arr(state.rec.recommendations || state.rec.items || state.rec.data).map(norm).filter(x=>x.symbol); }
  function smartAlerts() { return arr(state.rec.smartAlerts || state.rec.alerts || state.rec.signals); }
  function newsItems() { return arr(state.news.items || state.news.articles || state.news.news || state.news.data || state.news.results); }
  function trades() { return arr(state.followed.followedTrades || state.followed.trades || state.followed.items || state.followed.data || state.followed.followed); }
  function groupTrades(items) { const g = {win:[], loss:[], wait:[], follow:[]}; items.forEach(t=>{ const st = String(t.status||t.state||"").toLowerCase(), pnl = num(t.pnl,t.profitLoss,t.returnPercent); if (pnl !== null && pnl > 0) g.win.push(t); else if (pnl !== null && pnl < 0) g.loss.push(t); else if (st.includes("wait") || st.includes("pending") || st.includes("انتظار")) g.wait.push(t); else g.follow.push(t); }); return g; }
  function norm(x) { const s = sym(x.symbol || x.ticker || x.code || x.asset || x.name || ""); return {...x, symbol:s, name:x.name || x.companyName || x.assetName || x.longName || s}; }
  function signal(x) { const raw = String(x.signal || x.recommendation || x.action || x.side || x.type || "watch").toLowerCase(); if (raw.includes("buy") || raw.includes("شراء")) return "buy"; if (raw.includes("sell") || raw.includes("بيع")) return "sell"; return "watch"; }
  function sigLabel(s) { return s === "buy" ? "شراء" : s === "sell" ? "بيع / مخاطرة" : "متابعة"; }
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
