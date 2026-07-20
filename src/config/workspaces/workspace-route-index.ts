import type { WorkspaceId } from './workspace-types';

export const WORKSPACE_ROUTE_PREFIXES = {
  'personal-finance': [
    '/dashboard', '/decisions', '/today', '/tasks',
    '/income', '/expenses', '/debts', '/savings', '/goals',
    '/reports', '/reports-center', '/documents', '/notifications', '/notif',
    '/zakat', '/khums', '/charity', '/charity-projects',
    '/ai', '/financial-theories', '/ebooks', '/education',
    '/profile', '/security', '/settings',
  ],
  'markets-trading': [
    '/ai-analyst', '/symbol-details',
    '/market-analysis', '/market-agent', '/market-alerts', '/market-watchlist',
    '/watchlist', '/alerts', '/invest', '/investments', '/thesfm-trader-own',
    '/tech-news', '/europe-news', '/gulf-news', '/crypto-news',
    '/energy-stocks', '/banking-stocks', '/sharia-stocks', '/growth-stocks',
    '/defensive-stocks', '/cyclical-stocks', '/dividend-stocks',
  ],
  'business-projects': [
    '/projects', '/business', '/business-hub', '/business-operations',
    '/investment-offers', '/investor',
    '/invoices', '/employees', '/sales', '/customers', '/suppliers',
    '/operating-expenses',
    '/investment-companies', '/trading-companies', '/accounting-companies',
    '/feasibility-companies', '/financial-consulting-companies',
    '/services', '/companies', '/company-listing', '/profile/companies',
  ],
  administration: ['/sfm-admin-control'],
} as const satisfies Record<WorkspaceId, readonly string[]>;

function normalizePathname(pathname: string | null | undefined) {
  const raw = String(pathname ?? '').split(/[?#]/)[0] || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function routeMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveWorkspaceRouteId(pathname: string | null | undefined): WorkspaceId | null {
  const normalized = normalizePathname(pathname);
  let best: { id: WorkspaceId; length: number } | null = null;

  for (const [id, prefixes] of Object.entries(WORKSPACE_ROUTE_PREFIXES) as Array<[WorkspaceId, readonly string[]]>) {
    for (const prefix of prefixes) {
      if (routeMatches(normalized, prefix) && (!best || prefix.length > best.length)) {
        best = { id, length: prefix.length };
      }
    }
  }

  return best?.id ?? null;
}
