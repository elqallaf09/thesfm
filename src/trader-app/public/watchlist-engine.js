/* THE SFM symbol-scoped data engine. Only same-origin API reads; no provider keys. */
(function (root) {
  "use strict";
  const VERSION = 1;
  const STORAGE_KEY = "sfmTraderQuoteSnapshots:v1";
  const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
  const REFRESH_MS = 60 * 1000;
  const MAX_ROWS = 200;
  const BATCH_SIZE = 12;
  const CONCURRENCY = 2;
  function symbol(value) { return String(value || "").trim().toUpperCase(); }
  function validSymbol(value) { return /^[A-Z0-9^][A-Z0-9.^=/_-]{0,39}$/.test(value); }
  function asOf(row) {
    const value = row && row.engine && row.engine.asOf;
    const time = typeof value === "string" && value ? Date.parse(value) : NaN;
    return Number.isFinite(time) ? time : null;
  }
  function usable(row) {
    return Boolean(row && row.available === true && typeof row.price === "number" && Number.isFinite(row.price)
      && row.price > 0 && typeof row.currency === "string" && /^[A-Z]{3}$/.test(row.currency)
      && row.provider && row.source && row.engine && row.engine.version === VERSION);
  }
  function withoutAnalysis(row, status) {
    return { ...row, signalAvailable: false, confidence: null, aiConfidence: null, finalScore: null,
      targetPrice: null, target1: null, stopLoss: null, expectedMovePct: null,
      finalRecommendation: "Insufficient data", finalRecommendationAr: "بيانات غير كافية",
      finalRecommendationFr: "Données insuffisantes", engine: { ...row.engine, analysisStatus: status } };
  }
  function create(options) {
    const fetcher = options.fetch || root.fetch.bind(root);
    const now = options.now || Date.now;
    const random = options.random || Math.random;
    const setTimer = options.setTimer || root.setTimeout.bind(root);
    const clearTimer = options.clearTimer || root.clearTimeout.bind(root);
    const notify = options.onChange || function () {};
    const storage = options.storage;
    const records = new Map();
    const controllers = new Set();
    let wanted = [];
    let active = false;
    let online = true;
    let blocked = false;
    let timer = null;
    let jobs = 0;
    let epoch = 0;
    let retryAllAt = 0;

    function placeholder(id, status) {
      return { symbol: id, requestedSymbol: id, name: id, price: null, available: false,
        engine: { version: VERSION, quoteStatus: status || "loading", analysisStatus: "pending", asOf: null, fetchedAt: null, reason: null } };
    }
    function fallback(row, reason) {
      return withoutAnalysis({ ...row, engine: { ...row.engine,
        quoteStatus: usable(row) ? "last_known" : reason === "offline" ? "offline" : "unavailable", reason } }, "stale");
    }
    function emit() { notify(); }
    function persist() {
      if (!storage) return;
      try {
        // No watchlist membership, account identity or position data in this cache.
        const rows = Array.from(records.values()).map(item => item.row).filter(row => {
          const time = asOf(row);
          return usable(row) && time !== null && time <= now() + 60000 && now() - time <= RETAIN_MS;
        }).slice(-MAX_ROWS).map(row => withoutAnalysis({ ...row, history: [], sparkline: [] }, "stale"));
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, rows }));
      } catch { /* Private mode/full storage: the in-memory engine remains usable. */ }
    }
    function restore() {
      if (!storage) return;
      try {
        const data = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
        if (!data || data.version !== VERSION || !Array.isArray(data.rows)) return;
        for (const row of data.rows.slice(-MAX_ROWS)) {
          const id = symbol(row.requestedSymbol || row.symbol), time = asOf(row);
          if (!validSymbol(id) || !usable(row) || time === null || time > now() + 60000 || now() - time > RETAIN_MS) continue;
          records.set(id, { row: fallback(row, "restored_snapshot"), nextAt: 0, retryAt: 0, failures: 0, loading: false });
        }
      } catch { /* A corrupt snapshot is never treated as provider evidence. */ }
    }
    function get(id) {
      const key = symbol(id);
      const record = records.get(key);
      if (!record) return placeholder(key, !online ? "offline" : active ? "loading" : "paused");
      const time = asOf(record.row);
      if (usable(record.row) && time !== null && now() - time > RETAIN_MS) return placeholder(key, "unavailable");
      if (usable(record.row) && time !== null && now() - time > 15 * 60000 && record.row.engine.quoteStatus !== "last_known") {
        return withoutAnalysis({ ...record.row, engine: { ...record.row.engine, quoteStatus: "stale" } }, "stale");
      }
      return record.row;
    }
    function recordFor(id) {
      if (!records.has(id)) records.set(id, { row: placeholder(id), nextAt: 0, retryAt: 0, failures: 0, loading: false });
      return records.get(id);
    }
    function trim() {
      for (const [id, record] of records) {
        if (records.size <= MAX_ROWS) break;
        if (!wanted.includes(id) && !record.loading) records.delete(id);
      }
    }
    function cancel() {
      epoch += 1;
      if (timer !== null) clearTimer(timer);
      timer = null;
      controllers.forEach(controller => controller.abort());
      controllers.clear();
      records.forEach(record => {
        if (record.loading) { record.loading = false; record.nextAt = 0; }
      });
    }
    function retryDelay(response) {
      const raw = response.headers.get("retry-after");
      if (!raw) return 0;
      const seconds = Number(raw);
      const target = Number.isFinite(seconds) ? now() + seconds * 1000 : Date.parse(raw);
      return Number.isFinite(target) ? Math.min(24 * 60 * 60 * 1000, Math.max(0, target - now())) : 0;
    }
    async function request(ids, phase) {
      const controller = new AbortController();
      controllers.add(controller);
      let timedOut = false;
      const timeout = setTimer(() => { timedOut = true; controller.abort(); }, 30000);
      try {
        const response = await fetcher(`/api/watchlist?${new URLSearchParams({ symbols: ids.join(","), phase })}`, {
          headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) {
          const error = new Error("watchlist_request_failed");
          error.status = response.status; error.retryMs = retryDelay(response);
          throw error;
        }
        if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("invalid_contract");
        const body = await response.json();
        if (!body || body.ok !== true || body.engineVersion !== VERSION || body.phase !== phase || !Array.isArray(body.rows)) throw new Error("invalid_contract");
        return body.rows;
      } catch (error) {
        if (timedOut) throw new Error("request_timeout");
        throw error;
      } finally {
        clearTimer(timeout); controllers.delete(controller);
      }
    }
    function accept(ids, rows, phase) {
      const returned = new Map();
      for (const row of rows) {
        const id = symbol(row && row.requestedSymbol);
        if (ids.includes(id) && row.engine && row.engine.version === VERSION) returned.set(id, row);
      }
      for (const id of ids) {
        if (!wanted.includes(id)) continue; // Removed rows must never be resurrected by a late response.
        const record = recordFor(id), incoming = returned.get(id), previous = record.row;
        const oldTime = asOf(previous), newTime = asOf(incoming);
        if (usable(incoming) && (!usable(previous) || incoming.currency === previous.currency)
          && (newTime === null || newTime <= now() + 60000)
          && (!usable(previous) || newTime !== null && (oldTime === null || newTime >= oldTime))) {
          record.row = incoming;
          if (phase === "quotes") { record.failures = 0; record.retryAt = 0; }
        } else if (phase === "analysis" && usable(previous)) {
          // A failed/older analysis cannot erase a just-loaded price or restore old targets.
          record.row = withoutAnalysis(previous, "insufficient_data");
        } else {
          record.row = usable(previous) ? fallback(previous, incoming?.engine?.reason || "partial_response")
            : incoming && incoming.available !== true ? incoming : fallback(placeholder(id), "partial_response");
          record.failures += 1;
          record.retryAt = now() + (record.failures >= 3 ? 300000 : 5000 * record.failures) + Math.floor(random() * 1000);
          record.nextAt = record.retryAt;
        }
      }
      trim(); persist(); emit();
    }
    function fail(ids, error, phase) {
      if (error.name === "AbortError") return;
      if (error.status === 401 || error.status === 403) {
        blocked = true; cancel(); records.clear();
        try { storage?.removeItem(STORAGE_KEY); } catch { /* no-op */ }
        for (const id of wanted) recordFor(id).row = fallback(placeholder(id), "authentication_required");
        emit(); return;
      }
      // Retry-After is a route-wide constraint, not merely a failed-row hint.
      if (error.status === 429 || error.retryMs) retryAllAt = Math.max(retryAllAt, now() + (error.retryMs || 60000));
      for (const id of ids) {
        if (!wanted.includes(id)) continue;
        const record = recordFor(id);
        record.failures += 1;
        const backoff = record.failures >= 3 ? 300000 : 2000 * Math.pow(2, record.failures - 1);
        record.retryAt = Math.max(retryAllAt, now() + backoff + Math.floor(random() * 1000));
        record.nextAt = record.retryAt;
        record.row = phase === "analysis" && usable(record.row)
          ? withoutAnalysis({ ...record.row, engine: { ...record.row.engine, reason: "analysis_unavailable" } }, "insufficient_data")
          : fallback(record.row, error.status === 429 ? "rate_limited" : "provider_unavailable");
      }
      persist(); emit();
    }
    async function load(ids, generation) {
      let phase = "quotes";
      try {
        const rows = await request(ids, phase);
        if (generation !== epoch) return;
        accept(ids, rows, phase);
        const eligible = ids.filter(id => wanted.includes(id) && usable(get(id))
          && ["available", "cached"].includes(get(id).engine.quoteStatus));
        if (eligible.length && active && online && !blocked && now() >= retryAllAt) {
          phase = "analysis";
          const analyses = await request(eligible, phase);
          if (generation === epoch) accept(eligible, analyses, phase);
        }
      } catch (error) {
        if (generation === epoch) fail(ids, error, phase);
      } finally {
        if (generation === epoch) ids.forEach(id => { const record = records.get(id); if (record) record.loading = false; });
        jobs -= 1;
        schedule();
      }
    }
    function schedule() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      if (!active || !online || blocked || !wanted.length) return;
      if (jobs < CONCURRENCY && now() >= retryAllAt) {
        const due = wanted.filter(id => {
          const record = recordFor(id);
          return !record.loading && now() >= record.nextAt && now() >= record.retryAt;
        });
        while (due.length && jobs < CONCURRENCY) {
          const ids = due.splice(0, BATCH_SIZE);
          ids.forEach(id => { const record = recordFor(id); record.loading = true; record.nextAt = now() + REFRESH_MS + Math.floor(random() * 5000); });
          jobs += 1;
          void load(ids, epoch);
        }
      }
      const pendingTimes = wanted.flatMap(id => {
        const record = recordFor(id);
        return record.loading ? [] : [Math.max(record.nextAt, record.retryAt, retryAllAt)];
      });
      if (pendingTimes.length && jobs < CONCURRENCY) timer = setTimer(schedule, Math.max(100, Math.min(...pendingTimes) - now()));
    }
    restore();
    return {
      sync(symbols, context = {}) {
        wanted = Array.from(new Set((Array.isArray(symbols) ? symbols : []).map(symbol).filter(validSymbol)));
        const wasActive = active && online;
        active = context.active !== false;
        online = context.online !== false;
        if (!active || !online) {
          if (wasActive) cancel();
          if (!online) wanted.forEach(id => { const record = recordFor(id); record.row = fallback(record.row, "offline"); });
        } else if (!wasActive || context.force) {
          wanted.forEach(id => { const record = recordFor(id); if (!record.loading) record.nextAt = 0; });
        }
        trim(); schedule(); emit();
      },
      get,
      rows() { return wanted.map(get); },
      stop() { active = false; cancel(); },
      diagnostics() { return { version: VERSION, requested: wanted.length, inFlight: jobs, blocked, active, online }; },
    };
  }
  root.SFMWatchlistEngine = Object.freeze({ create, version: VERSION });
})(typeof window !== "undefined" ? window : globalThis);
