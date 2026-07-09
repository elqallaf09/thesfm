/* Provider market diagnostics overlay for the vanilla trader app. */
(() => {
  "use strict";

  const API = "/api";
  const ROOT = "/thesfm-trader-own";
  const PAGE_SIZE = 25;
  const LANG_STORAGE_KEY = "sfm_lang";
  const MARKET_FILTERS = [
    ["all", "كل الأسواق", "All markets"],
    ["us-stocks", "الأسهم الأمريكية", "US stocks"],
    ["kuwait", "الكويت", "Kuwait"],
    ["saudi", "السعودية", "Saudi"],
    ["uae", "الإمارات", "UAE"],
    ["qatar", "قطر", "Qatar"],
    ["bahrain", "البحرين", "Bahrain"],
    ["oman", "عمان", "Oman"],
    ["forex", "العملات", "Forex"],
    ["crypto", "الأصول الرقمية", "Crypto"],
    ["commodities", "السلع", "Commodities"],
    ["indices", "المؤشرات", "Indices"],
    ["etfs", "الصناديق المتداولة", "ETFs"],
  ];
  const CATEGORY_FILTERS = [
    ["all", "كل الأصول", "All assets"],
    ["stock", "أسهم", "Stocks"],
    ["fund", "صناديق", "Funds"],
    ["forex", "عملات", "Forex"],
    ["crypto", "أصول رقمية", "Crypto"],
    ["commodity", "سلع", "Commodities"],
    ["index", "مؤشرات", "Indices"],
  ];
  const SORTS = [
    ["displaySymbol", "رمز العرض", "Display symbol"],
    ["name", "الاسم", "Name"],
    ["market", "السوق", "Market"],
    ["currency", "العملة", "Currency"],
    ["source", "المصدر", "Source"],
    ["assetType", "نوع الأصل", "Asset type"],
    ["providerSymbol", "رمز المزود", "Provider symbol"],
  ];

  const view = {
    q: "",
    market: "all",
    category: "all",
    source: "all",
    currency: "all",
    quality: "complete",
    sort: "displaySymbol",
    dir: "asc",
    page: 1,
    pageSize: PAGE_SIZE,
    open: false,
    loading: false,
    error: "",
    payload: null,
  };

  let rendering = false;
  let renderQueued = false;
  let loadingPromise = null;

  function h(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentLanguage() {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (String(stored || "").toLowerCase().startsWith("en")) return "en";
      const settings = JSON.parse(localStorage.getItem("sfmTraderSettings:v1") || "{}");
      if (String(settings.lang || settings.language || "").toLowerCase().startsWith("en")) return "en";
    } catch (_error) {}
    return "ar";
  }

  function pair(ar, en) {
    return currentLanguage() === "en" ? en : ar;
  }

  function labelText(label) {
    return Array.isArray(label) ? pair(label[0], label[1]) : String(label || "");
  }

  function rowCountLabel(count) {
    return currentLanguage() === "en" ? `${number(count)} rows` : `${number(count)} صف`;
  }

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString("en-US") : "--";
  }

  function text(value, fallback = "--") {
    const clean = String(value ?? "").trim();
    return clean || fallback;
  }

  function normalizedSymbol(value) {
    const symbol = String(value ?? "").trim().toUpperCase();
    const prefixed = symbol.match(/^(KW|SR|SA|AE|DU|AD|QA|BH|OM)[.: -]([A-Z0-9]{1,16})$/);
    if (prefixed) return `${prefixed[2]}.${prefixed[1] === "SA" ? "SR" : prefixed[1]}`;
    const suffixed = symbol.match(/^([A-Z0-9]{1,16})[.: -](KW|SR|SA|AE|DU|AD|QA|BH|OM)$/);
    if (suffixed) return `${suffixed[1]}.${suffixed[2] === "SA" ? "SR" : suffixed[2]}`;
    return symbol;
  }

  function sourceOptions() {
    const diagnostics = view.payload && view.payload.providerMarketsDiagnostics;
    const sources = diagnostics && diagnostics.sources && typeof diagnostics.sources === "object"
      ? Object.keys(diagnostics.sources)
      : [];
    const labels = new Map([["all", ["كل المصادر", "All sources"]]]);
    sources.forEach((source) => {
      let key = String(source || "").trim().toLowerCase();
      if (!key) return;
      if (key === "seed" || key === "bundled") key = "catalog";
      labels.set(key, key === "catalog" ? ["الفهرس", "Catalog"] : [key.toUpperCase(), key.toUpperCase()]);
    });
    arr(view.payload && view.payload.markets).forEach((row) => {
      let key = String(row.sourceType || row.source || "").trim().toLowerCase();
      if (!key) return;
      if (key === "seed" || key === "bundled") key = "catalog";
      const sourceLabel = text(row.source, key.toUpperCase());
      labels.set(key, [sourceLabel, sourceLabel]);
    });
    return Array.from(labels.entries());
  }

  function currencyOptions() {
    const filterOptions = view.payload && view.payload.filterOptions;
    const currencies = arr(filterOptions && filterOptions.currencies);
    const labels = new Map([["all", ["كل العملات", "All currencies"]]]);
    currencies.forEach((currency) => {
      const key = String(currency || "").trim().toUpperCase();
      if (key) labels.set(key, [key, key]);
    });
    arr(view.payload && view.payload.markets).forEach((row) => {
      const key = String(row.currency || "").trim().toUpperCase();
      if (key) labels.set(key, [key, key]);
    });
    return Array.from(labels.entries());
  }

  function requestPath() {
    const params = new URLSearchParams({
      limit: String(view.pageSize),
      page: String(view.page),
      sort: view.sort,
      dir: view.dir,
      quality: view.quality,
    });
    if (view.q) params.set("q", view.q);
    if (view.market !== "all") params.set("market", view.market);
    if (view.category !== "all") params.set("category", view.category);
    if (view.source !== "all") params.set("source", view.source);
    if (view.currency !== "all") params.set("currency", view.currency);
    return `${API}/markets?${params.toString()}`;
  }

  async function load() {
    if (loadingPromise) return loadingPromise;
    view.loading = true;
    view.error = "";
    scheduleRender();
    loadingPromise = fetch(requestPath(), { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) throw new Error((payload && payload.message) || `markets_${response.status}`);
        view.payload = payload;
      })
      .catch((error) => {
        view.error = error instanceof Error ? error.message : String(error || "Unable to load provider markets");
      })
      .finally(() => {
        view.loading = false;
        loadingPromise = null;
        scheduleRender();
      });
    return loadingPromise;
  }

  function pageCount() {
    const total = Number(view.payload && view.payload.pagination && view.payload.pagination.total) || 0;
    return Math.max(1, Math.ceil(total / view.pageSize));
  }

  function summaryStats() {
    const diagnostics = (view.payload && view.payload.providerMarketsDiagnostics) || {};
    const pagination = (view.payload && view.payload.pagination) || {};
    return [
      [pair("ظاهرة", "Visible"), number(pagination.total ?? diagnostics.visibleRows), pair("بعد الفلاتر", "After filters")],
      [pair("تم تحميلها", "Loaded"), number(diagnostics.totalRows ?? (view.payload && view.payload.diagnostics && view.payload.diagnostics.totalSymbolsLoaded)), pair("الفهرس بعد الدمج", "Deduped catalog")],
      [pair("مخفية", "Hidden"), number(diagnostics.hiddenIncompleteRows), pair("صفوف غير مكتملة", "Incomplete rows")],
      [pair("مكررة", "Duplicates"), number(diagnostics.duplicateRows), pair("صفوف مدمجة", "Merged rows")],
    ];
  }

  function options(items, selected) {
    return items.map(([value, ar, en]) => `<option value="${h(value)}" ${String(value) === String(selected) ? "selected" : ""}>${h(labelText(en === undefined ? ar : [ar, en]))}</option>`).join("");
  }

  function summaryCards() {
    return `<div class="provider-market-summary-grid">${summaryStats().map(([label, value, helper]) => `
      <article class="provider-market-summary-card">
        <span>${h(helper)}</span>
        <strong class="ltr">${h(value)}</strong>
        <small>${h(label)}</small>
      </article>`).join("")}</div>`;
  }

  function marketsSummaryPanel() {
    return `<div class="provider-market-diagnostics-compact">
      <div class="panel-head">
        <div><span class="eyebrow">${h(pair("تشخيصات الإدارة", "Admin diagnostics"))}</span><h2>${h(pair("ملخص أسواق المزود", "Provider markets summary"))}</h2></div>
        <a class="ghost-btn compact-btn" href="${ROOT}/settings" data-route-link>${h(pair("الإعدادات", "Settings"))}</a>
      </div>
      <p class="provider-market-note">${h(pair("صفوف أسواق المزود المفصلة متاحة ضمن الإعدادات / تشخيصات الإدارة. تم إخفاء الجدول هنا لإبقاء صفحة الأسواق مركزة على الأصول القابلة للتداول.", "Detailed provider market rows are available under Settings / Admin diagnostics. The table is hidden here to keep markets focused on tradable assets."))}</p>
      ${view.loading && !view.payload ? loadingState() : summaryCards()}
    </div>`;
  }

  function diagnosticsPanel() {
    const open = view.open ? " open" : "";
    return `<details class="provider-market-diagnostics"${open} data-provider-market-details>
      <summary>
        <span><b>${h(pair("تشخيصات الإدارة", "Admin diagnostics"))}</b><small>${h(pair("فهرس أسواق المزود والرموز وجودة المصدر", "Provider markets catalog, symbols, and source quality"))}</small></span>
        <i>${h(rowCountLabel((view.payload && view.payload.pagination && view.payload.pagination.total) || 0))}</i>
      </summary>
      <div class="provider-market-body">
        ${summaryCards()}
        ${controls()}
        ${view.loading ? loadingState() : view.error ? errorState() : tableView()}
      </div>
    </details>`;
  }

  function controls() {
    return `<div class="provider-market-controls">
      <form data-provider-market-search>
        <input name="q" value="${h(view.q)}" placeholder="${h(pair("ابحث بالرمز أو الاسم أو رمز المزود", "Search symbol, name, provider symbol"))}" />
        <button class="ghost-btn compact-btn" type="submit">${h(pair("بحث", "Search"))}</button>
      </form>
      <label>${h(pair("السوق", "Market"))}<select data-provider-market-filter="market">${options(MARKET_FILTERS, view.market)}</select></label>
      <label>${h(pair("الأصل", "Asset"))}<select data-provider-market-filter="category">${options(CATEGORY_FILTERS, view.category)}</select></label>
      <label>${h(pair("المصدر", "Source"))}<select data-provider-market-filter="source">${options(sourceOptions(), view.source)}</select></label>
      <label>${h(pair("العملة", "Currency"))}<select data-provider-market-filter="currency">${options(currencyOptions(), view.currency)}</select></label>
      <label>${h(pair("الصفوف", "Rows"))}<select data-provider-market-filter="quality">${options([["complete", "المكتملة فقط", "Complete only"], ["all", "كل الصفوف", "All rows"], ["incomplete", "غير المكتملة فقط", "Incomplete only"]], view.quality)}</select></label>
      <label>${h(pair("الترتيب", "Sort"))}<select data-provider-market-filter="sort">${options(SORTS, view.sort)}</select></label>
      <label>${h(pair("الاتجاه", "Direction"))}<select data-provider-market-filter="dir">${options([["asc", "تصاعدي", "Ascending"], ["desc", "تنازلي", "Descending"]], view.dir)}</select></label>
    </div>`;
  }

  function loadingState() {
    return `<div class="provider-market-state">${h(pair("جاري تحميل تشخيصات أسواق المزود...", "Loading provider market diagnostics..."))}</div>`;
  }

  function errorState() {
    return `<div class="provider-market-state warn">
      <strong>${h(pair("التشخيصات غير متاحة", "Diagnostics unavailable"))}</strong>
      <p>${h(view.error)}</p>
      <button class="ghost-btn compact-btn" data-provider-market-retry type="button">${h(pair("إعادة المحاولة", "Retry"))}</button>
    </div>`;
  }

  function tableView() {
    const rows = arr(view.payload && view.payload.markets);
    const pagination = (view.payload && view.payload.pagination) || {};
    if (!rows.length) return `<div class="provider-market-state">${h(pair("لا توجد صفوف أسواق مزود مطابقة لهذه الفلاتر.", "No provider market rows match these filters."))}</div>`;
    return `<div class="provider-market-results">
      <div class="provider-market-result-meta">
        <span>${h(pair("يعرض", "Showing"))} <b class="ltr">${number(rows.length)}</b> ${h(pair("من", "of"))} <b class="ltr">${number(pagination.total)}</b></span>
        <span>${h(pair("صفحة", "Page"))} <b class="ltr">${number(view.page)}</b> / <b class="ltr">${number(pageCount())}</b></span>
      </div>
      <div class="table-shell provider-market-table"><table>
        <thead><tr>
          ${[
            ["displaySymbol", pair("رمز العرض", "Display symbol")],
            ["name", pair("الاسم", "Name")],
            ["market", pair("السوق", "Market")],
            ["currency", pair("العملة", "Currency")],
            ["assetType", pair("الأصل", "Asset")],
            ["source", pair("المصدر", "Source")],
            ["providerSymbol", pair("رمز المزود", "Provider symbol")],
          ].map(([key, label]) => `<th><button type="button" data-provider-market-sort="${h(key)}">${h(label)}${sortMark(key)}</button></th>`).join("")}
        </tr></thead>
        <tbody>${rows.map(tableRow).join("")}</tbody>
      </table></div>
      <div class="provider-market-card-list">${rows.map(cardRow).join("")}</div>
      <div class="provider-market-pagination">
        <button class="ghost-btn compact-btn" data-provider-market-page="${view.page - 1}" ${view.page <= 1 ? "disabled" : ""}>${h(pair("السابق", "Previous"))}</button>
        <button class="ghost-btn compact-btn" data-provider-market-page="${view.page + 1}" ${view.page >= pageCount() ? "disabled" : ""}>${h(pair("التالي", "Next"))}</button>
      </div>
    </div>`;
  }

  function sortMark(key) {
    return view.sort === key ? `<span aria-hidden="true">${view.dir === "asc" ? " ^" : " v"}</span>` : "";
  }

  function rowClass(row) {
    return row && row.isComplete === false ? " is-muted" : "";
  }

  function tableRow(row) {
    const displaySymbol = normalizedSymbol(row.displaySymbol || row.symbol);
    return `<tr class="${rowClass(row)}">
      <td class="ltr" data-label="${h(pair("رمز العرض", "Display symbol"))}">${h(displaySymbol || "--")}</td>
      <td data-label="${h(pair("الاسم", "Name"))}">${h(row.displayName || row.name || pair("غير مكتمل", "Incomplete"))}</td>
      <td data-label="${h(pair("السوق", "Market"))}">${h(row.marketName || row.selectedMarket || row.market || "--")}</td>
      <td class="ltr" data-label="${h(pair("العملة", "Currency"))}">${h(text(row.currency))}</td>
      <td data-label="${h(pair("الأصل", "Asset"))}">${h(text(row.assetType))}</td>
      <td data-label="${h(pair("المصدر", "Source"))}">${h(text(row.source))}</td>
      <td class="ltr muted" data-label="${h(pair("رمز المزود", "Provider symbol"))}">${h(text(row.providerSymbol))}</td>
    </tr>`;
  }

  function cardRow(row) {
    const displaySymbol = normalizedSymbol(row.displaySymbol || row.symbol);
    return `<article class="provider-market-card${rowClass(row)}">
      <div class="provider-market-card-head">
        <strong class="ltr">${h(displaySymbol || "--")}</strong>
        <span>${h(text(row.currency))}</span>
      </div>
      <p>${h(row.displayName || row.name || pair("صف غير مكتمل", "Incomplete row"))}</p>
      <dl>
        <div><dt>${h(pair("السوق", "Market"))}</dt><dd>${h(row.marketName || row.selectedMarket || row.market || "--")}</dd></div>
        <div><dt>${h(pair("الأصل", "Asset"))}</dt><dd>${h(text(row.assetType))}</dd></div>
        <div><dt>${h(pair("المصدر", "Source"))}</dt><dd>${h(text(row.source))}</dd></div>
        <div><dt>${h(pair("المزود", "Provider"))}</dt><dd class="ltr">${h(text(row.providerSymbol))}</dd></div>
      </dl>
    </article>`;
  }

  function findProviderMarketsPanel() {
    return Array.from(document.querySelectorAll("#terminal-content section.panel")).find((section) => {
      if (section.dataset.providerMarketsSummary === "true") return true;
      const eyebrow = section.querySelector(".eyebrow");
      return eyebrow && eyebrow.textContent.trim().toUpperCase() === "PROVIDER MARKETS";
    });
  }

  function ensureSettingsHost() {
    const grid = document.querySelector("#terminal-content .settings-grid");
    if (!grid) return null;
    let host = grid.querySelector("[data-provider-market-admin-host]");
    if (!host) {
      host = document.createElement("article");
      host.className = "panel provider-market-admin-panel";
      host.dataset.providerMarketAdminHost = "true";
      grid.appendChild(host);
    }
    return host;
  }

  function renderAll() {
    rendering = true;
    const marketsHost = findProviderMarketsPanel();
    if (marketsHost) {
      marketsHost.dataset.providerMarketsSummary = "true";
      marketsHost.innerHTML = marketsSummaryPanel();
    }
    const settingsHost = ensureSettingsHost();
    if (settingsHost) settingsHost.innerHTML = diagnosticsPanel();
    queueMicrotask(() => { rendering = false; });
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderAll();
    });
  }

  function updateAndLoad(patch) {
    Object.assign(view, patch, { page: patch.page || 1 });
    load();
  }

  function bind() {
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-provider-market-search]");
      if (!form) return;
      event.preventDefault();
      updateAndLoad({ q: String(new FormData(form).get("q") || "").trim(), page: 1 });
    });
    document.addEventListener("change", (event) => {
      const control = event.target.closest("[data-provider-market-filter]");
      if (!control) return;
      const key = control.dataset.providerMarketFilter;
      if (!key || !(key in view)) return;
      updateAndLoad({ [key]: control.value, page: 1 });
    });
    document.addEventListener("click", (event) => {
      const pageButton = event.target.closest("[data-provider-market-page]");
      if (pageButton) {
        event.preventDefault();
        const nextPage = Math.max(1, Math.min(pageCount(), Number(pageButton.dataset.providerMarketPage) || 1));
        updateAndLoad({ page: nextPage });
        return;
      }
      const sortButton = event.target.closest("[data-provider-market-sort]");
      if (sortButton) {
        event.preventDefault();
        const sort = sortButton.dataset.providerMarketSort || "displaySymbol";
        const dir = view.sort === sort && view.dir === "asc" ? "desc" : "asc";
        updateAndLoad({ sort, dir, page: 1 });
        return;
      }
      const retry = event.target.closest("[data-provider-market-retry]");
      if (retry) {
        event.preventDefault();
        load();
      }
    });
    document.addEventListener("toggle", (event) => {
      const details = event.target.closest && event.target.closest("[data-provider-market-details]");
      if (!details) return;
      view.open = details.open;
    }, true);
  }

  function boot() {
    bind();
    const observer = new MutationObserver(() => {
      if (!rendering) scheduleRender();
    });
    observer.observe(document.getElementById("terminal-content") || document.body, { childList: true, subtree: true });
    load();
    scheduleRender();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
