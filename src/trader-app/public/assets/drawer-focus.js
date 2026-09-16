(function installTraderDrawerFocus() {
  "use strict";

  const controlAttributes = ["data-drawer-tab", "data-drawer-close", "data-drawer-analyze", "data-drawer-full", "data-drawer-watch", "data-drawer-alert", "data-drawer-compare", "data-drawer-export", "data-drawer-share", "data-symbol-details"];
  const scrollSelectors = ["[data-symbol-drawer]", ".drawer-tabs", ".drawer-panel", ".drawer-actions"];

  function available(element) {
    return element instanceof HTMLElement && element.isConnected
      && !element.closest('[hidden], [inert], [aria-hidden="true"]')
      && !element.matches(":disabled") && element.getClientRects().length > 0
      && getComputedStyle(element).visibility === "visible";
  }

  function tabStops(drawer) {
    return Array.from(drawer.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex]"))
      .filter(element => element.tabIndex >= 0 && available(element));
  }

  function identity(element) {
    if (!(element instanceof HTMLElement)) return null;
    if (element.id) return { attribute: "id", value: element.id };
    const attribute = controlAttributes.find(name => element.hasAttribute(name));
    return attribute ? { attribute, value: element.getAttribute(attribute) } : null;
  }

  function viewKey(host) {
    return [host.querySelector("#symbol-drawer-title")?.textContent, host.querySelector('[data-drawer-tab][aria-selected="true"]')?.getAttribute("data-drawer-tab")].join("|");
  }

  function capture(host) {
    return {
      ownsFocus: host.contains(document.activeElement),
      identity: identity(document.activeElement),
      view: viewKey(host),
      scroll: scrollSelectors.map(selector => {
        const element = host.querySelector(selector);
        return { selector, top: element?.scrollTop || 0, left: element?.scrollLeft || 0 };
      })
    };
  }

  function restore(host, snapshot, focusTab) {
    let target = null;
    if (!focusTab && snapshot.ownsFocus && snapshot.identity) {
      const { attribute, value } = snapshot.identity;
      target = Array.from(host.querySelectorAll(`[${attribute}]`)).find(element => element.getAttribute(attribute) === value && available(element));
    }
    if (focusTab || (snapshot.ownsFocus && !target)) {
      target = host.querySelector('[data-drawer-tab][aria-selected="true"]') || host.querySelector(".drawer-close");
    }
    if (available(target)) target.focus({ preventScroll: true });
    if (snapshot.view === viewKey(host)) {
      for (const saved of snapshot.scroll) {
        const element = host.querySelector(saved.selector);
        if (element) { element.scrollTop = saved.top; element.scrollLeft = saved.left; }
      }
    }
    if (focusTab && available(target)) target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }

  function restoreTrigger(previous, symbol) {
    const replacement = Array.from(document.querySelectorAll("[data-symbol-details]"))
      .find(element => element.getAttribute("data-symbol-details")?.toUpperCase() === symbol && available(element));
    const target = available(previous) ? previous : replacement || document.getElementById("symbol-input");
    if (available(target)) target.focus({ preventScroll: true });
  }

  function ownsKey(event, drawer) {
    if (event.defaultPrevented || document.querySelector("dialog[open]")) return false;
    const dialog = event.target?.closest?.('[role="dialog"], dialog');
    return !dialog || dialog === drawer;
  }

  window.SFMTraderDrawerFocus = Object.freeze({ capture, restore, restoreTrigger, tabStops, ownsKey });
})();
