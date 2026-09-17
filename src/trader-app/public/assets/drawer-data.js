/* Bounded, cancellable per-symbol requests. A failed request is not an empty result. */
(function installTraderDrawerData() {
  "use strict";
  function createStore({ ttlMs = 120000, maxEntries = 48, now = Date.now, onChange = () => {} } = {}) {
    const entries = new Map();
    const idle = () => ({ status: "idle", value: null, error: null });
    function read(key) { return entries.get(key) || idle(); }
    function trim() {
      while (entries.size > maxEntries) {
        const key = entries.keys().next().value;
        const entry = entries.get(key);
        entries.delete(key);
        entry.controller?.abort();
      }
    }
    function load(key, loader, { force = false } = {}) {
      const previous = entries.get(key);
      if (previous?.status === "loading") return previous.promise;
      if (!force && previous && (previous.status === "error" || now() - previous.loadedAt < ttlMs)) return Promise.resolve(previous);
      const controller = new AbortController();
      const entry = { status: "loading", value: previous?.value || null, error: null, controller, loadedAt: 0, promise: null };
      entries.delete(key);
      entries.set(key, entry);
      trim();
      entry.promise = Promise.resolve().then(() => loader(controller.signal)).then(value => {
        if (controller.signal.aborted || entries.get(key) !== entry) return idle();
        Object.assign(entry, { status: "success", value, loadedAt: now() });
        onChange(key, entry);
        return entry;
      }).catch(error => {
        if (controller.signal.aborted || entries.get(key) !== entry) return idle();
        Object.assign(entry, { status: "error", error, loadedAt: now() });
        onChange(key, entry);
        return entry;
      }).finally(() => { entry.controller = null; });
      return entry.promise;
    }
    function cancelPending() {
      entries.forEach((entry, key) => {
        if (entry.status !== "loading") return;
        entries.delete(key);
        entry.controller?.abort();
      });
    }
    return Object.freeze({ read, load, cancelPending });
  }
  // Dependency-injected symbol resources keep UI rendering separate from provider/cache logic.
  function createController({ state, drawerData, sym, currentLanguage, textPair, h, payloadFeatureState,
    marketForSymbol, currentMarket, marketApi, marketNewsPath, get, findAssetForSymbol,
    legacyRecsFrom, normalizeQuote, norm, symbolAliases, signalToRec, technicalPayloadFromResponse,
    isTechnicalUnavailablePayload, technicalUnavailableReason, arr, mergeRecLists, recs,
    marketUniverseRows, matchRec, lookupWatchlist = () => null }) {
  function drawerResourceKey(kind, symbol = state.drawer.symbol) {
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
        : textPair("بيانات الرمز من THE SFM والمصادر الموثقة", "Symbol data from THE SFM and documented sources", "Données du symbole issues de THE SFM et de sources documentées");
    const detail = failed?.error?.payload ? payloadFeatureState(failed.error.payload).label : "";
    return `<div class="drawer-load-status" role="status"><span>${h(message)}${detail ? ` · ${h(detail)}` : ""}</span><button class="ghost-btn" type="button" data-drawer-retry ${loading ? "disabled" : ""}>${h(textPair(failed ? "أعد المحاولة" : "تحديث", failed ? "Retry" : "Refresh", failed ? "Réessayer" : "Actualiser"))}</button></div>`;
  }
  function loadDrawerData(tab, force = false) {
    const symbol = state.drawer.symbol;
    if (!symbol) return;
    const encoded = encodeURIComponent(symbol);
    const refresh = force ? "&refresh=1" : "";
    const sfmRefresh = force ? "?refresh=1" : "";
    const market = marketForSymbol(symbol) || currentMarket();
    const paths = {
      profile: `/market/asset-profile?symbol=${encoded}&lang=${currentLanguage()}`,
      quote: `/recommendations?market=${encodeURIComponent(marketApi(market.id))}&symbols=${encoded}${refresh}`,
      technical: `/sfm-market/v1/trader/technical/${encoded}${sfmRefresh}`,
      signal: `/sfm-market/v1/trader/signal/${encoded}${sfmRefresh}`,
      history: `/sfm-market/v1/trader/history/${encoded}${sfmRefresh}`,
      news: marketNewsPath(6, { symbol, refresh: force }),
      earnings: `/trader/calendar/earnings?symbols=${encoded}&range=90${refresh}`,
      dividends: `/trader/calendar/dividends?symbols=${encoded}&range=90${refresh}`
    };
    drawerResources(tab).forEach(kind => {
      drawerData.load(drawerResourceKey(kind, symbol), async signal => {
        const result = await get(paths[kind], { signal });
        if (signal.aborted) return null;
        const feature = payloadFeatureState(result);
        // Calendar/news diagnostics use ok:false for a valid no-events response.
        // Only accept explicit empty collections; provider failures remain retryable.
        const emptyCollection = ["news", "earnings", "dividends"].includes(kind)
          && result.status === "empty" && !result.failureReason && !result.stale
          && Array.isArray(result.data) && result.data.length === 0;
        if (!emptyCollection && (result.ok === false || ["error", "rate_limited", "misconfigured", "unsupported", "unavailable"].includes(feature.key))) {
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
      if (!row) throw new Error("Quote response does not contain the requested symbol");
      detail.asset = normalizeQuote(norm({ ...fallback, ...row }));
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
      if (raw && !symbolAliases(symbol).includes(sym(raw.symbol || raw.ticker))) {
        throw new Error("Signal response does not match the requested symbol");
      }
      if (raw) detail.rec = normalizeQuote(norm(signalToRec(raw)));
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

  function drawerLoadedContext(symbol) {
    const key = sym(symbol);
    const aliases = symbolAliases(key);
    const cachedEntry = Array.from(state.cache.entries()).find(([cacheKey]) => aliases.includes(sym(cacheKey)));
    const watchRow = lookupWatchlist(key);
    const cachedDetail = cachedEntry ? cachedEntry[1] : null;
    let loaded = mergeRecLists(legacyRecsFrom(state.commandCards), recs());
    const marketRows = [];
    state.marketCache.forEach(payload => marketRows.push(...marketUniverseRows(payload)));
    loaded = mergeRecLists(marketRows, loaded);
    const loadedAsset = watchRow || findAssetForSymbol(key, loaded) || matchRec(key) || null;
    const rec = watchRow || cachedDetail && cachedDetail.rec || loadedAsset;
    // Select a complete observation: an empty watchlist row must not erase a fetched quote.
    const candidates = [watchRow, cachedDetail && cachedDetail.asset, rec, loadedAsset].filter(Boolean)
      .map(row => normalizeQuote(norm({ ...row, symbol: key })));
    const asset = candidates.length ? mergeRecLists(candidates.slice(1), [candidates[0]])[0] : normalizeQuote(norm({ symbol: key }));
    return { symbol: key, asset, rec: rec ? normalizeQuote(norm(rec)) : null, cachedDetail };
  }

  function drawerNewsForSymbol(symbol, cachedDetail) {
    const payload = cachedDetail && cachedDetail.news || state.news;
    const items = arr(payload && (payload.items || payload.articles || payload.news || payload.data || payload.results));
    const aliases = symbolAliases(symbol);
    const scoped = cachedDetail && sym(cachedDetail.newsForSymbol) === sym(symbol);
    return items.filter(item => {
      const symbols = arr(item.symbols || item.tickers || item.relatedSymbols || item.related_symbols).map(sym);
      const direct = sym(item.symbol || item.ticker);
      if (direct && aliases.includes(direct)) return true;
      if (symbols.some(value => aliases.includes(value))) return true;
      if (scoped) return !direct && !symbols.length;
      return aliases.some(alias => alias.length > 2 && `${item.title || ""} ${item.summary || item.description || ""}`.toUpperCase().includes(alias));
    });
  }

  function drawerCalendarRows(symbol, kind) {
    const aliases = symbolAliases(symbol);
    const cached = state.cache.get(sym(symbol));
    const payload = cached && cached[kind] || state.calendar && state.calendar[kind];
    return arr(payload && (payload.data || payload.items || payload.results || payload.events)).filter(item => aliases.includes(sym(item.symbol || item.ticker || item.code)));
  }

    return Object.freeze({ drawerResourceKey, drawerResources, drawerTabLoading, drawerLoadStatus,
    loadDrawerData, drawerLoadedContext, drawerNewsForSymbol, drawerCalendarRows });
  }
  window.SFMTraderDrawerData = Object.freeze({ createStore, createController });
})();
