import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');
const traderApp = read('src/trader-app/public/app.js');
const traderStyles = read('src/trader-app/public/cinema.css');
const providerDiagnostics = read('src/trader-app/public/provider-markets-diagnostics.js');
const documentsPage = read('src/app/documents/page.tsx');
const zakatPage = read('src/app/zakat/page.tsx');

describe('long-page workspace regression guards', () => {
  it('defines the requested Trader peer views without mounting one continuous dashboard', () => {
    expect(traderApp).toContain('dashboard: ["overview", "analysis", "recommendations", "sessions", "heatmap", "news", "diagnostics"]');
    expect(traderApp).toContain('markets: ["overview", "data", "filters", "sources", "issues"]');
    expect(traderApp).toContain('recommendations: ["overview", "data", "filters", "sources", "issues"]');
    expect(traderApp).toContain('news: ["overview", "data", "filters", "sources", "issues"]');
    expect(traderApp).toContain('calendar: ["overview", "earnings", "dividends", "ipos", "economic", "sources", "issues"]');
    expect(traderApp).toContain('settings: ["overview", "capabilities", "issues", "preferences"]');
    expect(traderApp).toContain('workspacePanel("markets", active, panel)');
  });

  it('uses semantic, keyboard-operable, URL-persistent tabs in the legacy Trader workspace', () => {
    expect(traderApp).toContain('role="tablist"');
    expect(traderApp).toContain('role="tab"');
    expect(traderApp).toContain('aria-selected=');
    expect(traderApp).toContain('role="tabpanel"');
    expect(traderApp).toContain('aria-labelledby=');
    expect(traderApp).toContain('event.key === "Home"');
    expect(traderApp).toContain('event.key === "End"');
    expect(traderApp).toContain('event.key === "ArrowRight"');
    expect(traderApp).toContain('event.key === "ArrowLeft"');
    expect(traderApp).toContain('history[method]({ ...priorState');
    expect(traderApp).toContain('window.addEventListener("popstate"');
  });

  it('bridges workspace view history to a same-origin production wrapper', () => {
    expect(traderApp).toContain('function sameOriginWorkspaceHost()');
    expect(traderApp).toContain('window.parent.location.origin === window.location.origin');
    expect(traderApp).toContain('new URLSearchParams(workspaceHistoryWindow().location.search).get("view")');
    expect(traderApp).toContain('workspaceHistoryHost?.addEventListener("popstate", handleWorkspaceHostPopState)');
    expect(traderApp).toContain('historyWindow.history[method]({ ...priorState');
    expect(traderApp).toContain('function handleWorkspaceHostPopState(event)');
  });

  it('route-gates bootstrap requests and lazy-loads each calendar dataset once', () => {
    expect(traderApp).toContain('else if (routeId === "news") ["news", "providerStatus"]');
    expect(traderApp).toContain('else if (routeId === "markets") ["markets", "providerStatus"]');
    expect(traderApp).toContain('else if (routeId === "settings") needs.add("providerStatus")');
    expect(traderApp).toContain('else if (routeId !== "calendar") needs.add("providerStatus")');
    expect(traderApp).toContain('load: () => get(');
    expect(traderApp).toContain('state.calendarLoaded[value]');
    expect(traderApp).toContain('state.calendarPendingView = value');
    expect(traderApp).toContain('const pendingView = state.calendarPendingView');
    expect(traderApp).toContain('loadCalendars(false, [value])');
    expect(traderApp).toContain('requiredKinds.some(kind => !state.calendarLoaded[kind])');
    expect(traderApp).toContain('state.calendarLoaded[request.key] = true');
    expect(traderApp).toContain('Array.from(new Set(arr(kinds).filter');
    expect(traderApp).toContain('Re-evaluate the active view so its first dataset request is not lost.');
  });

  it('hydrates SPA destinations through a shared loaded and in-flight cache', () => {
    expect(traderApp).toContain('const hydrationLoaded = new Set()');
    expect(traderApp).toContain('const hydrationInFlight = new Map()');
    expect(traderApp).toContain('const hydrationGeneration = new Map()');
    expect(traderApp).toContain('const hydrationExpectedCacheKey = new Map()');
    expect(traderApp).toContain('if (!force && !contextChanged && hydrationLoaded.has(cacheKey)) return');
    expect(traderApp).toContain('inFlight = { key, generation, promise }');
    expect(traderApp).toContain('const isCurrent = hydrationExpectedCacheKey.get(request.key) === request.cacheKey');
    expect(traderApp).toContain('if (isCurrent) {');
    expect(traderApp).toContain('invalidateHydrationCache("rec", "commandCards", "signals", "signalAlerts", "news")');
    expect(traderApp).toContain('if (id !== "calendar") hydrate().catch');
    expect(traderApp).toContain('await hydrate(true)');
  });

  it('hydrates cross-route history while keeping same-route workspace history local', () => {
    expect(traderApp).toContain('const isWorkspaceHistory = Boolean(');
    expect(traderApp).toContain('const previousRoute = state.route');
    expect(traderApp).toContain('const routeChanged = previousRoute.id !== nextRoute.id');
    expect(traderApp).toContain('if (routeChanged) afterRoute()');
    expect(traderApp).toContain('else if (isWorkspaceHistory) afterWorkspaceViewChange(scope, activeView)');
    expect(traderApp).toContain('else afterRoute()');
  });

  it('lazy-loads provider market diagnostics only on Settings Capabilities', () => {
    expect(providerDiagnostics).toContain('function diagnosticsRouteActive()');
    expect(providerDiagnostics).toContain('return route === "settings" && workspaceView === "capabilities"');
    expect(providerDiagnostics).toContain('window.addEventListener("sfm:workspace-change", activate)');
    expect(providerDiagnostics).toContain('if (diagnosticsRouteActive()) load()');
  });

  it('keeps mobile tabs readable and the page free of horizontal overflow', () => {
    expect(traderStyles).toContain('.workspace-tabs');
    expect(traderStyles).toContain('overflow-x: auto');
    expect(traderStyles).toContain('white-space: nowrap');
    expect(traderStyles).toContain('.workspace-tab-panel[hidden]');
    expect(traderStyles).toContain('display: none');
  });

  it('uses URL-backed category workspaces for Documents and Zakat', () => {
    expect(documentsPage).toContain("param: 'tab'");
    expect(documentsPage).toContain('DOCUMENT_WORKSPACE_TABS');
    expect(documentsPage).toContain('mobileMode="auto"');
    expect(documentsPage).toContain('<PageTabPanel');
    expect(zakatPage).toContain('ZAKAT_TAB_IDS');
    expect(zakatPage).toContain('useUrlTabState<ZakatTab>');
    expect(zakatPage).toContain('idBase={ZAKAT_TABS_ID}');
    expect(zakatPage).toContain('<PageTabPanel');
  });

  it('reveals and focuses the Documents upload controls from the empty state', () => {
    expect(documentsPage).toContain('const revealUploadControls = () => {');
    expect(documentsPage).toContain('setUploadPanelOpen(true);');
    expect(documentsPage).toContain('uploadActionRef.current?.focus({ preventScroll: true });');
    expect(documentsPage).toContain('onClick={revealUploadControls}');
    expect(documentsPage).toContain('aria-controls="documents-upload-panel"');
  });

  it('labels the Zakat Reports destination independently from Charity Projects', () => {
    expect(zakatPage).toContain("openReportsCenter: 'Open Reports Center'");
    expect(zakatPage).toContain("openReportsCenter: 'Ouvrir le centre des rapports'");
    expect(zakatPage).toContain('href="/reports-center">{tr.openReportsCenter}</Link>');
  });
});
