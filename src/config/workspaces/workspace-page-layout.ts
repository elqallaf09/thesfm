import type { WorkspacePageContainerVariant } from '@/components/layout/WorkspacePageContainer';

export type WorkspacePageLayoutRule = {
  prefix: string;
  variant: WorkspacePageContainerVariant;
  description: string;
};

/**
 * Central route-to-width policy for authenticated application pages.
 *
 * The application shell owns the available inline size. Routes select only a
 * content-measure variant; they never calculate around the header or sidebar.
 * Rules are evaluated longest-prefix first and are segment-aware.
 */
export const WORKSPACE_PAGE_LAYOUT_RULES: readonly WorkspacePageLayoutRule[] = [
  // Dense dashboards, analytics, financial tables, and the trading terminal.
  { prefix: '/thesfm-trader-own', variant: 'full', description: 'Trading terminal and dense market tools' },
  { prefix: '/sfm-admin-control', variant: 'full', description: 'Administration dashboards and operational tables' },
  { prefix: '/market-analysis', variant: 'full', description: 'Market analysis workspace' },
  { prefix: '/market-agent', variant: 'full', description: 'Market research assistant' },
  { prefix: '/business-operations', variant: 'full', description: 'Business operations dashboard' },
  { prefix: '/business/subscriptions', variant: 'full', description: 'Client and subscription management' },
  { prefix: '/reports-center', variant: 'full', description: 'Cross-product report workspace' },
  { prefix: '/charity-projects', variant: 'full', description: 'Charity operations and reporting workspace' },
  { prefix: '/projects/', variant: 'full', description: 'Individual project workspace' },
  { prefix: '/command-center', variant: 'full', description: 'Executive command center' },
  { prefix: '/dashboard', variant: 'full', description: 'Primary financial dashboard' },
  { prefix: '/customers', variant: 'full', description: 'Business records table' },
  { prefix: '/invoices', variant: 'full', description: 'Business records table' },
  { prefix: '/employees', variant: 'full', description: 'Business records table' },
  { prefix: '/sales', variant: 'full', description: 'Business records table' },
  { prefix: '/suppliers', variant: 'full', description: 'Business records table' },
  { prefix: '/operating-expenses', variant: 'full', description: 'Business records table' },
  { prefix: '/income', variant: 'full', description: 'Personal finance data workspace' },
  { prefix: '/expenses', variant: 'full', description: 'Personal finance data workspace' },
  { prefix: '/debts', variant: 'full', description: 'Personal finance data workspace' },
  { prefix: '/savings', variant: 'full', description: 'Personal finance data workspace' },
  { prefix: '/goals', variant: 'full', description: 'Personal finance data workspace' },
  { prefix: '/invest', variant: 'full', description: 'Investment analytics workspace' },
  { prefix: '/reports', variant: 'full', description: 'Financial reports' },
  { prefix: '/zakat', variant: 'full', description: 'Financial calculation workspace' },
  { prefix: '/khums', variant: 'full', description: 'Financial calculation workspace' },

  // Discovery, directories, listings, news dashboards, and card-heavy tools.
  { prefix: '/investment-companies', variant: 'wide', description: 'Company directory' },
  { prefix: '/trading-companies', variant: 'wide', description: 'Company directory' },
  { prefix: '/accounting-companies', variant: 'wide', description: 'Company directory' },
  { prefix: '/feasibility-companies', variant: 'wide', description: 'Company directory' },
  { prefix: '/financial-consulting-companies', variant: 'wide', description: 'Company directory' },
  { prefix: '/companies', variant: 'wide', description: 'Company profile and discovery' },
  { prefix: '/business-hub', variant: 'wide', description: 'Business dashboard' },
  { prefix: '/investment-offers', variant: 'wide', description: 'Investment offer listing' },
  { prefix: '/projects', variant: 'wide', description: 'Project listing' },
  { prefix: '/financial-theories', variant: 'wide', description: 'Investment research tools' },
  { prefix: '/sharia-stocks', variant: 'wide', description: 'Shariah screening and research' },
  { prefix: '/banking-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/energy-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/growth-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/defensive-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/cyclical-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/dividend-stocks', variant: 'wide', description: 'Market news and screening' },
  { prefix: '/tech-news', variant: 'wide', description: 'News listing dashboard' },
  { prefix: '/europe-news', variant: 'wide', description: 'News listing dashboard' },
  { prefix: '/gulf-news', variant: 'wide', description: 'News listing dashboard' },
  { prefix: '/crypto-news', variant: 'wide', description: 'News listing dashboard' },
  { prefix: '/documents', variant: 'wide', description: 'Document library' },
  { prefix: '/tasks', variant: 'wide', description: 'Task workspace' },
  { prefix: '/today', variant: 'wide', description: 'Daily workspace' },
  { prefix: '/ai', variant: 'wide', description: 'AI research workspace' },

  // Text-heavy application routes retain a readable measure.
  { prefix: '/ebooks/', variant: 'reading', description: 'Long-form educational reader' },
  { prefix: '/education/', variant: 'reading', description: 'Long-form educational article' },

  // Forms, profile/settings, and normal management pages.
  { prefix: '/profile/companies', variant: 'wide', description: 'Owned company listing and management' },
  { prefix: '/profile', variant: 'standard', description: 'Profile and company settings' },
  { prefix: '/security', variant: 'standard', description: 'Security settings' },
  { prefix: '/settings', variant: 'standard', description: 'Application settings' },
  { prefix: '/setup', variant: 'standard', description: 'Guided setup flow' },
  { prefix: '/company-listing', variant: 'standard', description: 'Company submission flow' },
  { prefix: '/onboarding', variant: 'standard', description: 'Onboarding flow' },
  { prefix: '/decisions', variant: 'standard', description: 'Decision management' },
  { prefix: '/notifications', variant: 'standard', description: 'Account notifications' },
  { prefix: '/notif', variant: 'standard', description: 'Account notifications' },
  { prefix: '/ebooks', variant: 'wide', description: 'Educational library listing' },
  { prefix: '/education', variant: 'wide', description: 'Educational library listing' },
] as const;

function normalizePathname(pathname: string | null | undefined): string {
  const normalized = String(pathname ?? '/').split(/[?#]/, 1)[0] || '/';
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function routeMatches(pathname: string, prefix: string): boolean {
  if (prefix.endsWith('/')) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveWorkspacePageContainerVariant(
  pathname: string | null | undefined,
): WorkspacePageContainerVariant {
  const normalized = normalizePathname(pathname);
  const match = [...WORKSPACE_PAGE_LAYOUT_RULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(rule => routeMatches(normalized, rule.prefix));
  return match?.variant ?? 'standard';
}
