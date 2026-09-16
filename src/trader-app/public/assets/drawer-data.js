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
  window.SFMTraderDrawerData = Object.freeze({ createStore });
})();
