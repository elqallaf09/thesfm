/* Provider market diagnostics overlay for the vanilla trader app. */
(() => {
  "use strict";

  const API = "/api";
  const ROOT = "/thesfm-trader-own";
  const PAGE_SIZE = 25;
  const MARKET_FILTERS = [
    ["all", "All markets"],
    ["us-stocks", "US stocks"],
    ["kuwait", "Kuwait"],
    ["saudi", "Saudi"],
    ["uae", "UAE"],
    ["qatar", "Qatar"],
    ["bahrain", "Bahrain"],
    ["oman", "Oman"],
    ["forex", "Forex"],
    ["crypto", "Crypto"],
    ["commodities", "Commodities"],
    ["indices", "Indices"],
    ["etfs", "ETFs"],
  ];
  const CATEGORY_FILTERS = [
    ["all", "All assets"],
    ["stock", "Stocks"],
    ["fund", "Funds"],
    ["forex", "Forex"],
    ["crypto", "Crypto"],
    ["commodity", "Commodities"],
    ["index", "Indices"],
  ];
  const SORTS = [
    ["displaySymbol", "Display symbol"],
    ["name", "Name"],
    ["market", "Market"],
    ["currency", "Currency"],
    ["source", "Source"],
    ["assetType", "Asset type"],
    ["providerSymbol", "Provider symbol"],
  ];

  const view = {
    q: "",
    market: "all",
    category: "all",
    source: "all",
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
    const labels = new Map([["all", "All sources"]]);
    sources.forEach((source) => {
      let key = String(source || "").trim().toLowerCase();
      if (!key) return;
      if (key === "seed" || key === "bundled") key = "catalog";
      labels.set(key, key === "catalog" ? "Catalog" : key.toUpperCase());
    });
    arr(view.payload && view.payload.markets).forEach((row) => {
      let key = String(row.sourceType || row.source || "").trim().toLowerCase();
      if (!key) return;
      if (key === "seed" || key === "bundled") key = "catalog";
      labels.set(key, text(row.source, key.toUpperCase()));
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
      ["Visible", number(pagination.total ?? diagnostics.visibleRows), "After filters"],
      ["Loaded", number(diagnostics.totalRows ?? (view.payload && view.payload.diagnostics && view.payload.diagnostics.totalSymbolsLoaded)), "Deduped catalog"],
      ["Hidden", number(diagnostics.hiddenIncompleteRows), "Incomplete rows"],
      ["Duplicates", number(diagnostics.duplicateRows), "Merged rows"],
    ];
  }

  function options(items, selected) {
    return items.map(([value, label]) => `<option value="${h(value)}" ${String(value) === String(selected) ? "selected" : ""}>${h(label)}</option>`).join("");
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
        <div><span class="eyebrow">ADMIN DIAGNOSTICS</span><h2>Provider markets summary</h2></div>
        <a class="ghost-btn compact-btn" href="${ROOT}/settings" data-route-link>Settings</a>
      </div>
      <p class="provider-market-note">Detailed provider market rows are available under Settings / Admin diagnostics. The table is hidden here to keep markets focused on tradable assets.</p>
      ${view.loading && !view.payload ? loadingState() : summaryCards()}
    </div>`;
  }

  function diagnosticsPanel() {
    const open = view.open ? " open" : "";
    return `<details class="provider-market-diagnostics"${open} data-provider-market-details>
      <summary>
        <span><b>Admin diagnostics</b><small>Provider markets catalog, symbols, and source quality</small></span>
        <i>${number((view.payload && view.payload.pagination && view.payload.pagination.total) || 0)} rows</i>
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
        <input name="q" value="${h(view.q)}" placeholder="Search symbol, name, provider symbol" />
        <button class="ghost-btn compact-btn" type="submit">Search</button>
      </form>
      <label>Market<select data-provider-market-filter="market">${options(MARKET_FILTERS, view.market)}</select></label>
      <label>Asset<select data-provider-market-filter="category">${options(CATEGORY_FILTERS, view.category)}</select></label>
      <label>Source<select data-provider-market-filter="source">${options(sourceOptions(), view.source)}</select></label>
      <label>Rows<select data-provider-market-filter="quality">${options([["complete", "Complete only"], ["all", "All rows"], ["incomplete", "Incomplete only"]], view.quality)}</select></label>
      <label>Sort<select data-provider-market-filter="sort">${options(SORTS, view.sort)}</select></label>
      <label>Direction<select data-provider-market-filter="dir">${options([["asc", "Ascending"], ["desc", "Descending"]], view.dir)}</select></label>
    </div>`;
  }

  function loadingState() {
    return `<div class="provider-market-state">Loading provider market diagnostics...</div>`;
  }

  function errorState() {
    return `<div class="provider-market-state warn">
      <strong>Diagnostics unavailable</strong>
      <p>${h(view.error)}</p>
      <button class="ghost-btn compact-btn" data-provider-market-retry type="button">Retry</button>
    </div>`;
  }

  function tableView() {
    const rows = arr(view.payload && view.payload.markets);
    const pagination = (view.payload && view.payload.pagination) || {};
    if (!rows.length) return `<div class="provider-market-state">No provider market rows match these filters.</div>`;
    return `<div class="provider-market-results">
      <div class="provider-market-result-meta">
        <span>Showing <b class="ltr">${number(rows.length)}</b> of <b class="ltr">${number(pagination.total)}</b></span>
        <span>Page <b class="ltr">${number(view.page)}</b> / <b class="ltr">${number(pageCount())}</b></span>
      </div>
      <div class="table-shell provider-market-table"><table>
        <thead><tr>
          ${[
            ["displaySymbol", "Display symbol"],
            ["name", "Name"],
            ["market", "Market"],
            ["currency", "Currency"],
            ["assetType", "Asset"],
            ["source", "Source"],
            ["providerSymbol", "Provider symbol"],
          ].map(([key, label]) => `<th><button type="button" data-provider-market-sort="${h(key)}">${h(label)}${sortMark(key)}</button></th>`).join("")}
        </tr></thead>
        <tbody>${rows.map(tableRow).join("")}</tbody>
      </table></div>
      <div class="provider-market-card-list">${rows.map(cardRow).join("")}</div>
      <div class="provider-market-pagination">
        <button class="ghost-btn compact-btn" data-provider-market-page="${view.page - 1}" ${view.page <= 1 ? "disabled" : ""}>Previous</button>
        <button class="ghost-btn compact-btn" data-provider-market-page="${view.page + 1}" ${view.page >= pageCount() ? "disabled" : ""}>Next</button>
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
      <td class="ltr" data-label="Display symbol">${h(displaySymbol || "--")}</td>
      <td data-label="Name">${h(row.displayName || row.name || "Incomplete")}</td>
      <td data-label="Market">${h(row.marketName || row.selectedMarket || row.market || "--")}</td>
      <td class="ltr" data-label="Currency">${h(text(row.currency))}</td>
      <td data-label="Asset">${h(text(row.assetType))}</td>
      <td data-label="Source">${h(text(row.source))}</td>
      <td class="ltr muted" data-label="Provider symbol">${h(text(row.providerSymbol))}</td>
    </tr>`;
  }

  function cardRow(row) {
    const displaySymbol = normalizedSymbol(row.displaySymbol || row.symbol);
    return `<article class="provider-market-card${rowClass(row)}">
      <div class="provider-market-card-head">
        <strong class="ltr">${h(displaySymbol || "--")}</strong>
        <span>${h(text(row.currency))}</span>
      </div>
      <p>${h(row.displayName || row.name || "Incomplete row")}</p>
      <dl>
        <div><dt>Market</dt><dd>${h(row.marketName || row.selectedMarket || row.market || "--")}</dd></div>
        <div><dt>Asset</dt><dd>${h(text(row.assetType))}</dd></div>
        <div><dt>Source</dt><dd>${h(text(row.source))}</dd></div>
        <div><dt>Provider</dt><dd class="ltr">${h(text(row.providerSymbol))}</dd></div>
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
