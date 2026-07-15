/**
 * Product-area theme scopes.
 *
 * Each product area of THE SFM carries its own approved visual identity.
 * AppLayout resolves the active scope from the pathname and stamps it as
 * `data-theme-scope` on the page-content container; src/styles/scopes.css
 * keys per-scope token overrides off that attribute so one area's redesign
 * can no longer leak into another's.
 *
 * Routes not listed here get no scope attribute and keep the global
 * (unified) defaults.
 */

export type ThemeScope = 'core-finance' | 'trader' | 'business' | 'admin' | 'shariah';

export const THEME_SCOPE_ROUTES: Record<ThemeScope, readonly string[]> = {
  /* Core Finance — the approved financial-management identity. */
  'core-finance': [
    '/dashboard',
    '/income',
    '/expenses',
    '/debts',
    '/savings',
    '/goals',
    '/reports',
    '/documents',
    '/projects',
    '/zakat',
    '/khums',
    '/charity',
    '/charity-projects', // includes beneficiaries management
  ],
  /* Business Center — shares the Core Finance identity. */
  business: ['/business', '/business-hub', '/business-operations'],
  /* Trader / market experience — keeps the trading redesign untouched. */
  trader: [
    '/market-analysis',
    '/market-agent',
    '/market-alerts',
    '/market-watchlist',
    '/watchlist',
    '/thesfm-trader-own',
    '/invest',
    '/banking-stocks',
    '/cyclical-stocks',
    '/defensive-stocks',
    '/dividend-stocks',
    '/energy-stocks',
    '/growth-stocks',
  ],
  /* Admin / operations diagnostics. */
  admin: ['/sfm-admin-control'],
  /* Shariah screener and research. */
  shariah: ['/sharia-stocks'],
};

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getThemeScope(pathname: string | null | undefined): ThemeScope | null {
  if (!pathname) return null;
  const normalized = pathname.split(/[?#]/)[0] || '/';
  for (const scope of Object.keys(THEME_SCOPE_ROUTES) as ThemeScope[]) {
    if (THEME_SCOPE_ROUTES[scope].some((route) => matchesRoute(normalized, route))) {
      return scope;
    }
  }
  return null;
}
