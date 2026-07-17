export const TRADER_ROUTE_MESSAGE_VERSION = 1 as const;
/** Parent shell → terminal iframe: apply this app route. */
export const TRADER_ROUTE_SET_MESSAGE_TYPE = 'SFM_TRADER_ROUTE_SET' as const;
/** Terminal iframe → parent shell: the user navigated to this public path. */
export const TRADER_ROUTE_CHANGE_MESSAGE_TYPE = 'SFM_TRADER_ROUTE_CHANGE' as const;

export const TRADER_PUBLIC_BASE_PATH = '/thesfm-trader-own' as const;

export type TraderRouteSetMessage = {
  type: typeof TRADER_ROUTE_SET_MESSAGE_TYPE;
  version: typeof TRADER_ROUTE_MESSAGE_VERSION;
  route: string;
};

export type TraderRouteChangeMessage = {
  type: typeof TRADER_ROUTE_CHANGE_MESSAGE_TYPE;
  version: typeof TRADER_ROUTE_MESSAGE_VERSION;
  path: string;
};

/**
 * App routes travel as plain relative segments ("home", "markets/gulf",
 * "symbol-details/AAPL"). Symbol segments may carry ticker punctuation
 * ("EURUSD=X", "^DJI", "KFH.KW", percent-encoded forms); absolute URLs,
 * traversal, and anything else are rejected by both sides of the bridge.
 */
export function isSafeTraderAppRoute(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) return false;
  return /^[a-z0-9][a-z0-9/_.=^%-]*$/i.test(value) && !value.includes('//') && !value.includes('..');
}

export function isTraderPublicPath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const path = value.split(/[?#]/, 1)[0] || '';
  if (path === TRADER_PUBLIC_BASE_PATH) return true;
  if (!path.startsWith(`${TRADER_PUBLIC_BASE_PATH}/`)) return false;
  const route = path.slice(TRADER_PUBLIC_BASE_PATH.length + 1).replace(/\/+$/, '');
  return route === '' || isSafeTraderAppRoute(route);
}

/** '/thesfm-trader-own' → 'home'; '/thesfm-trader-own/markets/gulf' → 'markets/gulf'. */
export function traderAppRouteFromPublicPath(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/, 1)[0] || '/';
  if (!isTraderPublicPath(path)) return 'home';
  const route = path === TRADER_PUBLIC_BASE_PATH
    ? ''
    : path.slice(TRADER_PUBLIC_BASE_PATH.length + 1).replace(/\/+$/, '');
  return route || 'home';
}

/** Inverse of traderAppRouteFromPublicPath; 'home' maps to the dashboard page. */
export function publicPathFromTraderAppRoute(route: string): string {
  if (!isSafeTraderAppRoute(route) || route === 'home' || route === 'app') {
    return `${TRADER_PUBLIC_BASE_PATH}/dashboard`;
  }
  return `${TRADER_PUBLIC_BASE_PATH}/${route}`;
}

export function isTraderRouteChangeMessage(value: unknown): value is TraderRouteChangeMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return Object.keys(message).length === 3
    && message.type === TRADER_ROUTE_CHANGE_MESSAGE_TYPE
    && message.version === TRADER_ROUTE_MESSAGE_VERSION
    && isTraderPublicPath(message.path);
}

export function createTraderRouteSetMessage(route: string): TraderRouteSetMessage {
  return {
    type: TRADER_ROUTE_SET_MESSAGE_TYPE,
    version: TRADER_ROUTE_MESSAGE_VERSION,
    route,
  };
}
