/* Compatibility view for the existing watchlist. The engine is renderer-independent. */
(function (root) {
  "use strict";
  function create(deps) {
    const { state, defaults, unique, hero, textPair, h, logo, emptyState, ROOT, normalizeQuote, norm, currency, sharedRecommendation, num, assetDataState, recommendationTone, recommendationLabel, dashCell, displaySymbolFor, terminalText, price, changeUnavailableText, change, isValidPrice, riskTone, riskShort, date, renderAfterData } = deps;
    let pendingRender = false;
    let storage;
    try { storage = root.sessionStorage; } catch { /* optional */ }
    const engine = root.SFMWatchlistEngine.create({ storage, onChange() {
      if (pendingRender || state.route.id !== "watchlist") return;
      pendingRender = true;
      root.requestAnimationFrame(() => {
        pendingRender = false;
        if (state.route.id !== "watchlist") return;
        const focused = document.activeElement;
        const remove = focused?.getAttribute("data-remove-watch");
        const refresh = focused?.hasAttribute("data-watchlist-refresh");
        renderAfterData();
        if (remove) Array.from(document.querySelectorAll("[data-remove-watch]")).find(node => node.getAttribute("data-remove-watch") === remove)?.focus({ preventScroll: true });
        else if (refresh) document.querySelector("[data-watchlist-refresh]")?.focus({ preventScroll: true });
      });
    } });
    function sync(force = false) {
      engine.sync(state.watch, { active: state.route.id === "watchlist" && document.visibilityState !== "hidden", online: navigator.onLine !== false, force });
    }
    document.addEventListener("visibilitychange", () => sync());
    root.addEventListener("online", () => sync(true));
    root.addEventListener("offline", () => sync());
    root.addEventListener("pagehide", () => engine.stop());
    root.addEventListener("pageshow", () => sync());
    root.addEventListener("storage", event => {
      if (event.key !== "sfmTraderWatchlist:v3") return;
      try { const saved = JSON.parse(event.newValue || "[]"); if (Array.isArray(saved)) { state.watch = unique(saved.filter(item => typeof item === "string")); sync(); renderAfterData(); } } catch { /* ignore corrupt storage */ }
    });
    document.addEventListener("click", event => {
      if (event.target.closest?.("[data-watchlist-refresh]")) sync(true);
    });
    function analysisLabel(row) {
      const status = row.engine?.analysisStatus;
      if (status === "pending") return textPair("جارٍ تحميل التحليل", "Loading analysis", "Chargement de l’analyse");
      if (status === "stale") return textPair("التحليل يحتاج تحديثاً", "Analysis needs an update", "Analyse à actualiser");
      return textPair("بيانات التحليل غير كافية", "Insufficient analysis data", "Données d’analyse insuffisantes");
    }
    function quoteMeta(row) {
      const key = row.engine?.quoteStatus || "unavailable";
      const labels = {
        available: ["سعر من المزود", "Provider quote", "Cours du fournisseur"],
        cached: ["سعر محفوظ مؤقتاً", "Cached quote", "Cours en cache"],
        last_known: ["آخر سعر محفوظ · تعذّر التحديث", "Last saved quote · update unavailable", "Dernier cours sauvegardé · mise à jour indisponible"],
        stale: ["آخر سعر متاح · غير لحظي", "Last available quote · not live", "Dernier cours disponible · non instantané"],
        timestamp_unknown: ["توقيت السعر غير متاح", "Quote timestamp unavailable", "Date du cours indisponible"],
        loading: ["جارٍ تحميل السعر", "Loading quote", "Chargement du cours"],
        offline: ["لا يوجد اتصال بالإنترنت", "No internet connection", "Pas de connexion Internet"],
        paused: ["التحديث متوقف مؤقتاً", "Refresh paused", "Actualisation en pause"],
        unavailable: ["تعذّر جلب السعر", "Quote unavailable", "Cours indisponible"],
      };
      const reason = row.engine?.reason;
      const label = reason === "authentication_required" ? textPair("سجّل الدخول مجدداً", "Sign in again", "Reconnectez-vous")
        : reason === "ambiguous_symbol" ? textPair("حدد رمز البورصة الكامل", "Use the full exchange symbol", "Précisez le symbole complet de la place")
          : textPair(...(labels[key] || labels.unavailable));
      const stamp = row.engine?.asOf;
      return `<small class="watchlist-quote-meta" dir="auto"><span>${h(label)}</span>${row.source ? `<span>${h(row.source)}</span>` : ""}${stamp ? `<time datetime="${h(stamp)}">${h(date(stamp))}</time>` : ""}</small>`;
    }
    function statusCells() {
      const rows = state.watch.map(id => engine.get(id));
      const priced = rows.filter(row => row.available === true && isValidPrice(row.price));
      const analyzed = rows.filter(row => row.engine?.analysisStatus === "available");
      const old = rows.some(row => ["last_known", "stale", "timestamp_unknown"].includes(row.engine?.quoteStatus));
      const loading = rows.some(row => row.engine?.quoteStatus === "loading" || row.engine?.analysisStatus === "pending") && !old;
      const label = !rows.length ? textPair("القائمة فارغة", "Empty watchlist", "Liste vide")
        : old ? textPair("آخر بيانات متاحة", "Last available data", "Dernières données disponibles")
          : analyzed.length === rows.length ? textPair("البيانات متاحة", "Data available", "Données disponibles")
            : loading ? textPair("جارٍ التحديث", "Updating", "Actualisation")
              : priced.length ? textPair("بيانات جزئية", "Partial data", "Données partielles")
                : textPair("غير متاح", "Unavailable", "Indisponible");
      const stamps = priced.map(row => row.engine?.asOf).filter(stamp => typeof stamp === "string" && Number.isFinite(Date.parse(stamp)));
      const latest = stamps.length ? new Date(Math.max(...stamps.map(stamp => Date.parse(stamp)))).toLocaleString("en-GB", { hour12: false }) : "--";
      return [
        [textPair("بيانات قائمتي", "Watchlist data", "Données de la liste"), label, textPair("محرك SFM لقائمة المتابعة", "SFM Watchlist Engine", "Moteur SFM de suivi")],
        [textPair("أسعار متاحة", "Available prices", "Cours disponibles"), priced.length, `${priced.length}/${rows.length}`],
        [textPair("تحليلات متاحة", "Available analyses", "Analyses disponibles"), analyzed.length, `${analyzed.length}/${rows.length}`],
        [terminalText("watchlist"), rows.length, terminalText("watchlist")],
        [textPair("أحدث توقيت سعر", "Latest quote time", "Date du dernier cours"), latest, textPair("توقيت المصدر", "Source timestamp", "Date de la source")],
      ];
    }
  function watchPage() {
    const quick = unique(defaults.concat(["EURUSD", "SPY", "2222.SR", "ETHUSD"]));
    return `<div class="page-stack">${hero(textPair("قائمة متابعة ذكية ونظيفة", "Clean smart watchlist"), textPair("أضف الرموز التي تريد مراقبتها. الأسعار والتحليلات تظهر فقط عند توفرها من المزود، والعملة تتبع كل رمز.", "Add the symbols you want to watch. Prices and analysis appear only when available from the provider, and currency follows each symbol."), "WATCHLIST")}
      <section class="panel"><span class="eyebrow">${h(textPair("إضافة سريعة", "Quick add"))}</span><h2>${h(textPair("إضافة سريعة", "Quick add"))}</h2><div class="quick-actions">${quick.map(s => `<button class="ghost-btn" data-quick-add="${h(s)}">${logo({ symbol: s })}<span class="ltr">${h(s)}</span></button>`).join("")}</div></section>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">${h(textPair("قائمتي", "My watchlist"))}</span><h2>${h(textPair(`قائمتي (${state.watch.length})`, `My watchlist (${state.watch.length})`, `Ma liste de suivi (${state.watch.length})`))}</h2></div><button class="ghost-btn" type="button" data-watchlist-refresh>${h(textPair("تحديث القائمة", "Refresh watchlist", "Actualiser la liste"))}</button></div>
        ${state.watch.length ? watchlistTable(state.watch.map(s => engine.get(s)), { removable: true }) : emptyState(textPair("قائمة المتابعة فارغة", "Watchlist is empty"), textPair("أضف رموزاً من الأعلى. لن نملأها ببيانات وهمية.", "Add symbols above. We will not fill it with synthetic data."), textPair("افتح الأسواق", "Open markets"), `${ROOT}/markets`)}
        <p class="watchlist-engine-note">${h(textPair("محرك SFM يعرض وقت السعر ومصدره. آخر سعر محفوظ ليس سعراً لحظياً، والتحليل يحتاج بيانات حديثة وكافية.", "SFM shows each price timestamp and source. A saved price is not a live quote; analysis requires recent, sufficient evidence.", "SFM affiche la date et la source de chaque cours. Un cours sauvegardé n’est pas un cours en direct ; l’analyse exige des données récentes et suffisantes."))}</p>
      </section></div>`;
  }

  function watchlistTable(items, opts = {}) {
    const rows = items.map(x => {
      const a = normalizeQuote(norm(x)), c = currency(a), recommendation = sharedRecommendation(a);
      const conf = recommendation.confidence, p = a.price;
      const chg = a.changePercent, tgt = num(a.target, a.targetPrice, a.priceTarget), score = num(a.aiScore, a.finalScore, a.score, a.rating);
      const risk = a.risk || a.riskLevel;
      const ds = assetDataState(a, recommendation);
      // عندما تكون الأدلة غير مكتملة لا نعرض نسب ثقة تبدو مؤكدة —
      // تُستبدل بشرطة مع تلميح يوضح السبب (العرض فقط، دون تغيير الحسابات).
      const engineGated = Boolean(opts.removable && a.engine?.analysisStatus !== "available");
      const evidenceGated = ds.key !== "available" || engineGated;
      const detailGated = Boolean(opts.removable && evidenceGated);
      const gateNote = engineGated ? analysisLabel(a) : evidenceGated ? ds.label : "";
      const recommendationHtml = evidenceGated
        ? `<span class="state-badge ${ds.tone}">${h(gateNote)}</span>`
        : `<span class="state-badge ${recommendationTone(recommendation)}">${h(recommendationLabel(recommendation))}</span>`;
      const confHtml = conf === null || evidenceGated ? dashCell(gateNote) : Math.round(conf) + "%";
      const scoreHtml = score === null || evidenceGated ? dashCell(gateNote) : (score > 10 ? Math.round(score) + "%" : score.toFixed(1));
      const rm = opts.removable ? `<button class="icon-btn danger" data-remove-watch="${h(a.requestedSymbol || a.symbol)}" title="${h(textPair("إزالة", "Remove", "Supprimer"))}" aria-label="${h(textPair("إزالة", "Remove", "Supprimer") + " " + (a.requestedSymbol || a.symbol))}">✕</button>` : "";
      return `<tr${opts.removable ? ` data-watchlist-symbol="${h(a.requestedSymbol || a.symbol)}" data-watchlist-status="${h(a.engine?.quoteStatus || "unavailable")}"` : ""}>
        <td class="wt-asset" data-label="${h(terminalText("asset"))}"><button data-symbol-details="${h(a.symbol)}">${logo(a)}<span><strong class="ltr">${h(a.symbol)}</strong><small>${h(a.name || displaySymbolFor(a.symbol))}</small></span></button></td>
        <td class="ltr" data-label="${h(terminalText("price"))}">${h(price(p, c))}${opts.removable ? quoteMeta(a) : ""}</td>
        <td class="ltr ${chg === null ? "" : chg >= 0 ? "up" : "down"}" data-label="${h(textPair("التغير", "Change"))}">${chg === null ? dashCell(changeUnavailableText()) : h(change(chg))}</td>
        <td data-label="${h(textPair("التوصية", "Recommendation"))}">${recommendationHtml}</td>
        <td class="ltr" data-label="${h(terminalText("confidence"))}">${confHtml}</td>
        <td class="ltr" data-label="${h(terminalText("target"))}">${isValidPrice(tgt) && !detailGated ? price(tgt, c) : dashCell(gateNote)}</td>
        <td data-label="${h(textPair("المدة", "Horizon"))}">${!detailGated && h(a.timeframe || a.horizon || a.duration) || dashCell(gateNote)}</td>
        <td data-label="${h(textPair("المخاطرة", "Risk"))}">${risk && !detailGated ? `<span class="risk-pill ${riskTone(risk)}">${h(riskShort(risk))}</span>` : dashCell()}</td>
        <td class="ltr" data-label="${h(textPair("سكور AI", "AI score"))}">${scoreHtml}</td>
        <td class="row-actions" data-label="${h(terminalText("action"))}"><button class="ghost-btn sm" data-symbol-details="${h(a.symbol)}">${h(terminalText("analysis"))}</button>${rm}</td>
      </tr>`;
    }).join("");
    return `<div class="table-shell watchlist-table"><table><thead><tr><th>${h(terminalText("asset"))}</th><th>${h(terminalText("price"))}</th><th>${h(textPair("التغير", "Change"))}</th><th>${h(textPair("التوصية", "Recommendation"))}</th><th>${h(terminalText("confidence"))}</th><th>${h(terminalText("target"))}</th><th>${h(textPair("المدة", "Horizon"))}</th><th>${h(textPair("المخاطرة", "Risk"))}</th><th>${h(textPair("سكور AI", "AI score"))}</th><th>${h(terminalText("action"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
    function lookup(symbol) {
      const key = String(symbol || "").trim().toUpperCase();
      const id = state.watch.find(saved => {
        const row = engine.get(saved);
        return String(saved).toUpperCase() === key || String(row.symbol).toUpperCase() === key;
      });
      return id ? engine.get(id) : null;
    }
    return { page: watchPage, table: watchlistTable, sync, statusCells, lookup };
  }
  root.SFMWatchlistView = Object.freeze({ create });
})(window);
