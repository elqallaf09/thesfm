from pathlib import Path
import re
root=Path('.')
pub=root/'src/trader-app/public'
s=(pub/'app.js').read_text()
def replace(old,new):
 global s
 assert s.count(old)==1,(old[:110],s.count(old))
 s=s.replace(old,new)
replace('  let drawerFocusPending = false;', '''  let drawerFocusPending = false;
  const drawerData = window.SFMTraderDrawerData.createStore({
    onChange(key) {
      if (key.startsWith(`${state.drawer.symbol}|`) && state.drawer.symbol) renderSymbolDrawer();
    }
  });''')
replace('    let timedOut = false;\n    const timeout = window.setTimeout', '''    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    if (options.signal?.aborted) abortFromCaller();
    const timeout = window.setTimeout''')
replace('      const timeoutError = timedOut || errorName(error) === "AbortError" || errorName(error) === "TimeoutError";', '''      if (options.signal?.aborted) return { ok: false, aborted: true };
      const timeoutError = timedOut || errorName(error) === "AbortError" || errorName(error) === "TimeoutError";''')
replace('      window.clearTimeout(timeout);\n    }\n  }\n  async function saveSignalPreferences', '''      window.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
  async function saveSignalPreferences''')
replace('    if (!force && state.cache.has(key)) {', '    if (!force && state.cache.has(key) && !state.cache.get(key).drawerOnly) {')
replace('      const found = (search.resolved || arr(search.results || search.data || search.items)[0] || {});', '''      const found = findAssetForSymbol(key, [search.resolved, ...arr(search.results || search.data || search.items)].filter(Boolean)) || {};''')
replace('      state.cache.set(key, detail);\n      const currentTarget', '''      state.cache.set(key, { ...state.cache.get(key), ...detail, drawerOnly: false });
      if (state.drawer.symbol === key) renderSymbolDrawer();
      const currentTarget''')
replace('    state.drawer.symbol = key;\n    state.drawer.tab = "summary";', '''    if (state.drawer.symbol !== key) drawerData.cancelPending();
    state.drawer.symbol = key;
    state.drawer.tab = "summary";''')
replace('    drawerFocusPending = true;\n    renderSymbolDrawer();\n  }\n\n  function setDrawerBackgroundState', '''    drawerFocusPending = true;
    loadDrawerData("summary");
    renderSymbolDrawer();
  }

  function setDrawerBackgroundState''')
replace('    state.drawer.symbol = "";\n    state.drawer.tab = "summary";', '''    drawerData.cancelPending();
    state.drawer.symbol = "";
    state.drawer.tab = "summary";''')
replace('    drawerFocusPending = options.focus === true;\n    renderSymbolDrawer();', '''    drawerFocusPending = options.focus === true;
    loadDrawerData(tab);
    renderSymbolDrawer();''')
replace('      const drawerAnalyze = event.target.closest("[data-drawer-analyze]");', '''      const drawerRetry = event.target.closest("[data-drawer-retry]");
      if (drawerRetry) { event.preventDefault(); loadDrawerData(state.drawer.tab, true); renderSymbolDrawer(); return; }
      const drawerAnalyze = event.target.closest("[data-drawer-analyze]");''')
oldline=next(line for line in s.splitlines() if '<div class="drawer-actions" aria-label=' in line)
newline=oldline.replace('<button class="ghost-btn ${watched', '<details class="drawer-more"><summary id="drawer-more-toggle">${h(textPair("المزيد", "More", "Plus"))}</summary><div class="drawer-more-actions"><button class="ghost-btn ${watched',1)
newline=newline.replace('${h(textPair("مشاركة", "Share", "Partager"))}</button></div>', '${h(textPair("مشاركة", "Share", "Partager"))}</button></div></details></div>')
replace(oldline,newline)
replace('aria-labelledby="drawer-tab-${active}" tabindex="0">${panel}', 'aria-labelledby="drawer-tab-${active}" tabindex="0" aria-busy="${drawerTabLoading(active)}">${drawerLoadStatus(active)}${panel}')
anchor='  function drawerTabs() {'
insert='''  function drawerResourceKey(kind, symbol = state.drawer.symbol) {
    return `${sym(symbol)}|${kind}|${currentLanguage()}`;
  }
  function drawerResources(tab) {
    if (tab === "news") return ["news"];
    if (tab === "earnings") return ["earnings", "dividends"];
    if (tab === "technical") return ["technical", "signal", "history"];
    if (tab === "recommendation" || tab === "ai") return ["signal", "technical"];
    return ["profile", "quote"];
  }
  function drawerTabLoading(tab) {
    return drawerResources(tab).some(kind => drawerData.read(drawerResourceKey(kind)).status === "loading");
  }
  function drawerLoadStatus(tab) {
    const resources = drawerResources(tab).map(kind => drawerData.read(drawerResourceKey(kind)));
    const loading = resources.some(entry => entry.status === "loading");
    const failed = resources.find(entry => entry.status === "error");
    const message = loading
      ? textPair("جاري جلب بيانات الرمز…", "Loading symbol data…", "Chargement des données du symbole…")
      : failed ? textPair("تعذر جلب بعض البيانات. أعد المحاولة.", "Some data could not be loaded. Retry the request.", "Certaines données n’ont pas pu être chargées. Réessayez.")
        : textPair("بيانات الرمز من المصادر المتاحة", "Symbol data from available sources", "Données du symbole issues des sources disponibles");
    const detail = failed?.error?.payload ? payloadFeatureState(failed.error.payload).label : "";
    return `<div class="drawer-load-status" role="status"><span>${h(message)}${detail ? ` · ${h(detail)}` : ""}</span><button class="ghost-btn" type="button" data-drawer-retry ${loading ? "disabled" : ""}>${h(textPair(failed ? "أعد المحاولة" : "تحديث", failed ? "Retry" : "Refresh", failed ? "Réessayer" : "Actualiser"))}</button></div>`;
  }
  function loadDrawerData(tab, force = false) {
    const symbol = state.drawer.symbol;
    if (!symbol) return;
    const encoded = encodeURIComponent(symbol);
    const refresh = force ? "&refresh=1" : "";
    const market = marketForSymbol(symbol) || currentMarket();
    const paths = {
      profile: `/market/asset-profile?symbol=${encoded}&lang=${currentLanguage()}`,
      quote: `/recommendations?market=${encodeURIComponent(marketApi(market.id))}&symbols=${encoded}${refresh}`,
      technical: `/market/technical-analysis?symbol=${encoded}${refresh}`,
      signal: `/market/signals/${encoded}${force ? "?refresh=1" : ""}`,
      history: `/market/history?symbol=${encoded}&range=1Y${refresh}`,
      news: marketNewsPath(6, { symbol, refresh: force }),
      earnings: `/trader/calendar/earnings?symbols=${encoded}&range=90${refresh}`,
      dividends: `/trader/calendar/dividends?symbols=${encoded}&range=90${refresh}`
    };
    drawerResources(tab).forEach(kind => {
      drawerData.load(drawerResourceKey(kind, symbol), async signal => {
        const result = await get(paths[kind], { signal });
        if (signal.aborted) return null;
        const feature = payloadFeatureState(result);
        if (result.ok === false || ["error", "rate_limited", "misconfigured", "unsupported", "unavailable"].includes(feature.key)) {
          const error = new Error("Symbol resource unavailable");
          error.payload = result;
          throw error;
        }
        mergeDrawerResource(symbol, kind, result);
        return result;
      }, { force });
    });
  }
  function mergeDrawerResource(symbol, kind, result) {
    const previous = state.cache.get(symbol);
    const detail = { ...(previous || {}), drawerOnly: previous ? Boolean(previous.drawerOnly) : true };
    const fallback = drawerLoadedContext(symbol).asset;
    if (kind === "quote") {
      const row = findAssetForSymbol(symbol, legacyRecsFrom(result));
      if (row) detail.asset = normalizeQuote(norm({ ...fallback, ...row }));
    } else if (kind === "profile") {
      const profile = result.profile || result.asset || {};
      if (!profile.symbol || symbolAliases(symbol).includes(sym(profile.symbol))) {
        // Profile metadata must not replace a valid quote with null or unrelated prices.
        const metadata = { ...profile };
        delete metadata.price;
        delete metadata.currentPrice;
        detail.asset = normalizeQuote(norm({ ...fallback, ...metadata, symbol }));
      }
    } else if (kind === "signal") {
      const raw = result.signal || result.item;
      if (raw && symbolAliases(symbol).includes(sym(raw.symbol || raw.ticker))) {
        detail.rec = normalizeQuote(norm(signalToRec(raw)));
      }
    } else if (kind === "technical") {
      detail.tech = technicalPayloadFromResponse(result);
      detail.technicalUnavailable = isTechnicalUnavailablePayload(detail.tech);
      detail.providerStatus = result.providerStatus || detail.providerStatus;
      detail.technicalReason = technicalUnavailableReason(detail.tech);
    } else if (kind === "history") {
      detail.asset = { ...fallback, history: arr(result.points || result.history) };
    } else if (kind === "news") {
      detail.news = result;
      detail.newsForSymbol = symbol;
    } else {
      detail[kind] = result;
    }
    state.cache.set(symbol, detail);
    while (state.cache.size > 80) state.cache.delete(state.cache.keys().next().value);
  }

'''
replace(anchor,insert+anchor)
replace('  function drawerTabContent(tab, context) {\n', '''  function drawerTabContent(tab, context) {
    const cached = context.cachedDetail || {};
    const hasContent = tab === "news" ? drawerNewsForSymbol(context.symbol, cached).length > 0
      : tab === "earnings" ? drawerCalendarRows(context.symbol, "earnings").length + drawerCalendarRows(context.symbol, "dividends").length > 0
        : tab === "technical" ? Boolean(cached.tech) : true;
    if (!hasContent && drawerTabLoading(tab)) return `<div class="drawer-empty" aria-hidden="true"><span class="drawer-loading-mark"></span></div>`;
''')
replace('textPair("افتح التحليل الكامل لجلب بيانات الرمز عند الحاجة.", "Open full analysis to load symbol data when needed.", "Ouvrez l’analyse complète pour charger les données si nécessaire.")', 'textPair("يتم طلب التحليل عند فتح هذا التبويب. استخدم التحديث لإعادة المحاولة.", "Analysis is requested when this tab opens. Use Refresh to retry.", "L’analyse est demandée à l’ouverture de cet onglet. Utilisez Actualiser pour réessayer.")')
replace('    const aliases = symbolAliases(symbol);\n    return items.filter(item => {', '''    const aliases = symbolAliases(symbol);
    const scoped = cachedDetail && sym(cachedDetail.newsForSymbol) === sym(symbol);
    return items.filter(item => {''')
replace('      if (symbols.some(value => aliases.includes(value))) return true;\n      return aliases.some', '''      if (symbols.some(value => aliases.includes(value))) return true;
      if (scoped) return !direct && !symbols.length;
      return aliases.some''')
replace('textPair("لا توجد أخبار محملة لهذا الرمز", "No loaded news for this symbol", "Aucune actualité chargée pour ce symbole")', 'textPair("لا توجد أخبار متاحة لهذا الرمز", "No news available for this symbol", "Aucune actualité disponible pour ce symbole")')
replace('textPair("تعرض هذه اللوحة الأخبار المحملة مسبقاً فقط.", "This drawer only shows news already loaded in the workspace.", "Ce panneau affiche uniquement les actualités déjà chargées.")', 'textPair("تُجلب أخبار الرمز عند فتح التبويب. تحقق من حالة الطلب أعلاه.", "Symbol news is fetched when the tab opens. Check the request status above.", "Les actualités sont chargées à l’ouverture de l’onglet. Vérifiez l’état ci-dessus.")')
replace('  function drawerCalendarRows(symbol, kind) {\n    const aliases = symbolAliases(symbol);\n    const payload = state.calendar && state.calendar[kind];', '''  function drawerCalendarRows(symbol, kind) {
    const aliases = symbolAliases(symbol);
    const cached = state.cache.get(sym(symbol));
    const payload = cached && cached[kind] || state.calendar && state.calendar[kind];''')
replace('textPair("لا توجد أرباح محملة لهذا الرمز", "No loaded earnings for this symbol", "Aucun résultat chargé pour ce symbole")', 'textPair("لا توجد أرباح أو توزيعات متاحة للفترة المحددة", "No earnings or dividends available in this period", "Aucun résultat ni dividende disponible sur cette période")')
replace('textPair("تعرض اللوحة بيانات التقويم الموجودة في الذاكرة فقط دون طلب إضافي.", "The drawer shows only calendar data already in memory, without another request.", "Le panneau affiche uniquement les données du calendrier déjà en mémoire.")', 'textPair("نطلب تقويم الرمز لمدة 90 يوماً. عدم توفر موعد لا يعني أن أرباح الشركة صفر.", "The symbol calendar covers 90 days. A missing event does not mean zero company earnings.", "Le calendrier couvre 90 jours. L’absence d’événement ne signifie pas un bénéfice nul.")')
replace('item.status || item.time || item.amount || item.epsEstimate || terminalText("unavailable")', 'item.status ?? item.time ?? item.amount ?? item.epsEstimate ?? terminalText("unavailable")')
(pub/'app.js').write_text(s)
p=pub/'index.html'; s=p.read_text().replace('    <script src="/assets/drawer-focus.js', '    <script src="/assets/drawer-data.js?v=20260916-symbol-data" defer></script>\n    <script src="/assets/drawer-focus.js')
s=re.sub(r'/app.js\?v=[^" ]+', '/app.js?v=20260916-symbol-data',s)
s=re.sub(r'drawer-focus.js\?v=[^" ]+', 'drawer-focus.js?v=20260916-symbol-data',s)
s=s.replace('  </head>', '    <link rel="stylesheet" href="/assets/drawer-mobile.css?v=20260916-symbol-data" />\n  </head>',1);p.write_text(s)
p=pub/'assets/drawer-focus.js';s=p.read_text().replace('"data-drawer-tab",','"data-drawer-retry", "data-drawer-tab",',1)
s=s.replace('      view: viewKey(host),','      view: viewKey(host),\n      moreOpen: Boolean(host.querySelector(".drawer-more[open]")),')
s=s.replace('    let target = null;\n    if (!focusTab','    const disclosure = host.querySelector(".drawer-more");\n    if (disclosure && snapshot.moreOpen && snapshot.view === viewKey(host)) disclosure.open = true;\n    let target = null;\n    if (!focusTab',1)
s=s.replace('".drawer-actions"]','".drawer-actions", ".drawer-more-actions"]');p.write_text(s)
p=pub/'service-worker.js';s=p.read_text();s=re.sub(r'const CACHE_NAME = .*?;', 'const CACHE_NAME = "the-sfm-trader-v20260717-shell-unify-symbol-data-20260916";',s,count=1)
s=re.sub(r'/assets/drawer-focus.js\?v=[^" ]+', '/assets/drawer-focus.js?v=20260916-symbol-data',s)
s=re.sub(r'/app.js\?v=[^" ]+', '/app.js?v=20260916-symbol-data',s)
s=s.replace('  "/assets/drawer-focus.js','  "/assets/drawer-data.js?v=20260916-symbol-data",\n  "/assets/drawer-mobile.css?v=20260916-symbol-data",\n  "/assets/drawer-focus.js',1);p.write_text(s)
p=root/'src/app/api/market/technical-analysis/route.ts';s=p.read_text().replace('function finiteTechnicalNumber(value: unknown) {\n  const parsed = Number(value);', "function finiteTechnicalNumber(value: unknown) {\n  if (typeof value !== 'number' && typeof value !== 'string') return null;\n  if (typeof value === 'string' && !value.trim()) return null;\n  const parsed = Number(value);");p.write_text(s)
for name in ['traderWorkspaceExperience.test.ts','traderDensity.test.ts']:
 p=root/'src/__tests__/unit'/name;s=p.read_text().replace('loaded-data-only quick drawer','on-demand quick drawer').replace('app.js?v=20260717-shell-unify','app.js?v=20260916-symbol-data');p.write_text(s)
for name in ['trader-drawer-focus.spec.ts','trader-drawer-host-focus.spec.ts']:
 p=root/'tests/smoke'/name;s=p.read_text()
 s=s.replace('await frame.locator(\'[data-symbol-details="AAPL"]\').first().click();','await frame.locator(\'[data-symbol-details="AAPL"]\').first().click();\n        await frame.locator("#drawer-more-toggle").click();')
 s=s.replace('          trigger.click();\n          const share','          trigger.click();\n          document.querySelector<HTMLDetailsElement>(".drawer-more")!.open = true;\n          const share')
 s=s.replace("'.drawer-actions'", "'.drawer-more-actions'")
 s=s.replace('        await page.mouse.click(point.x, point.y);', '''        if (geometry.drawer.width >= geometry.width - 1 && geometry.drawer.height >= geometry.height - 1) {
          await frame.locator('.drawer-close').click();
        } else await page.mouse.click(point.x, point.y);''')
 p.write_text(s)
