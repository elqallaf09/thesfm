(function installTraderThemeBridge() {
  "use strict";

  const MESSAGE_VERSION = 1;
  const READY_MESSAGE_TYPE = "SFM_TRADER_READY";
  const SET_MESSAGE_TYPE = "SFM_TRADER_THEME_SET";
  const APPLIED_MESSAGE_TYPE = "SFM_TRADER_THEME_APPLIED";
  const GLOBAL_THEME_STORAGE_KEY = "the-sfm-theme";
  const THEME_PREFERENCES = ["light", "dark", "system"];
  const RESOLVED_THEMES = ["light", "dark"];
  const systemThemeQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  let currentPreference = "system";
  let currentResolvedTheme = "light";
  let hasAppliedTheme = false;

  function normalizePreference(value) {
    const preference = String(value || "").toLowerCase();
    return THEME_PREFERENCES.includes(preference) ? preference : null;
  }

  function normalizeResolvedTheme(value) {
    const theme = String(value || "").toLowerCase();
    return RESOLVED_THEMES.includes(theme) ? theme : null;
  }

  function resolveTheme(preference) {
    if (preference === "light" || preference === "dark") return preference;
    return systemThemeQuery && systemThemeQuery.matches ? "dark" : "light";
  }

  function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const background = getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim();
    if (background) meta.setAttribute("content", background);
  }

  function applyTheme(preference, resolvedTheme) {
    const nextPreference = normalizePreference(preference) || "system";
    const nextResolvedTheme = normalizeResolvedTheme(resolvedTheme) || resolveTheme(nextPreference);
    const root = document.documentElement;
    const preferenceChanged = !hasAppliedTheme || currentPreference !== nextPreference;
    const resolvedThemeChanged = !hasAppliedTheme || currentResolvedTheme !== nextResolvedTheme;
    const bodyNeedsSync = Boolean(document.body && (
      document.body.dataset.themePreference !== nextPreference
      || document.body.dataset.theme !== nextResolvedTheme
    ));

    if (!preferenceChanged && !resolvedThemeChanged && !bodyNeedsSync) {
      syncThemeColor();
      return false;
    }

    currentPreference = nextPreference;
    currentResolvedTheme = nextResolvedTheme;
    root.dataset.themePreference = nextPreference;
    root.dataset.theme = nextResolvedTheme;
    root.classList.toggle("dark", nextResolvedTheme === "dark");
    root.classList.toggle("light", nextResolvedTheme === "light");
    root.style.colorScheme = nextResolvedTheme;

    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (schemeMeta) {
      schemeMeta.setAttribute("content", nextResolvedTheme === "dark" ? "dark light" : "light dark");
    }
    if (document.body) {
      document.body.dataset.themePreference = nextPreference;
      document.body.dataset.theme = nextResolvedTheme;
    }
    syncThemeColor();
    hasAppliedTheme = true;
    if (resolvedThemeChanged) {
      window.dispatchEvent(new CustomEvent("sfm-trader-theme-applied", {
        detail: { preference: nextPreference, resolvedTheme: nextResolvedTheme }
      }));
    }
    return resolvedThemeChanged;
  }

  function isThemeSetMessage(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    if (keys.join(",") !== "preference,resolvedTheme,type,version") return false;
    return value.type === SET_MESSAGE_TYPE
      && value.version === MESSAGE_VERSION
      && normalizePreference(value.preference) === value.preference
      && normalizeResolvedTheme(value.resolvedTheme) === value.resolvedTheme;
  }

  function postToParent(message) {
    if (window.parent === window || !/^https?:$/.test(window.location.protocol)) return;
    window.parent.postMessage(message, window.location.origin);
  }

  function announceReady() {
    postToParent({ type: READY_MESSAGE_TYPE, version: MESSAGE_VERSION });
  }

  function handleParentMessage(event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (!isThemeSetMessage(event.data)) return;

    applyTheme(event.data.preference, event.data.resolvedTheme);
    postToParent({
      type: APPLIED_MESSAGE_TYPE,
      version: MESSAGE_VERSION,
      resolvedTheme: currentResolvedTheme
    });
  }

  function readGlobalPreference() {
    try {
      return normalizePreference(localStorage.getItem(GLOBAL_THEME_STORAGE_KEY)) || "system";
    } catch (_error) {
      return "system";
    }
  }

  const initialPreference = readGlobalPreference();
  applyTheme(initialPreference, resolveTheme(initialPreference));

  window.addEventListener("message", handleParentMessage);
  window.addEventListener("storage", function handleThemeStorage(event) {
    if (event.key !== GLOBAL_THEME_STORAGE_KEY) return;
    const preference = readGlobalPreference();
    applyTheme(preference, resolveTheme(preference));
  });
  if (systemThemeQuery) {
    const handleSystemThemeChange = function handleSystemThemeChange() {
      if (currentPreference === "system") applyTheme("system", resolveTheme("system"));
    };
    if (systemThemeQuery.addEventListener) systemThemeQuery.addEventListener("change", handleSystemThemeChange);
    else if (systemThemeQuery.addListener) systemThemeQuery.addListener(handleSystemThemeChange);
  }

  window.SFMTraderTheme = Object.freeze({
    apply: applyTheme,
    getPreference: function getPreference() { return currentPreference; },
    getResolvedTheme: function getResolvedTheme() { return currentResolvedTheme; }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function onReady() {
      syncThemeColor();
      announceReady();
    }, { once: true });
  } else {
    syncThemeColor();
    announceReady();
  }
})();
