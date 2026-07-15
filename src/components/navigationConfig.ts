'use client';

import type { ComponentType } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  Compass,
  CreditCard,
  FileSearch,
  FileText,
  Files,
  FolderKanban,
  HandHeart,
  HeartHandshake,
  Info,
  Instagram,
  Landmark,
  LayoutDashboard,
  Library,
  LineChart,
  LogOut,
  Mail,
  Newspaper,
  PiggyBank,
  Presentation,
  ReceiptText,
  ShieldCheck,
  Target,
  Terminal,
  TrendingUp,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { AdminPermission } from '@/lib/adminPermissions';
import { TR } from '@/lib/translations';

export type TranslationKey = keyof typeof TR;

export type NavigationAction = 'logout';

export type NavigationItem = {
  id: string;
  icon: ComponentType<{ size?: number }>;
  href?: string;
  labelKey: TranslationKey;
  action?: NavigationAction;
  external?: boolean;
  caption?: string;
  children?: NavigationItem[];
  adminOnly?: boolean;
  adminPermission?: AdminPermission;
  superAdminOnly?: boolean;
};

export type NavigationGroup = {
  id: string;
  labelKey: TranslationKey;
  defaultOpen?: boolean;
  collapsible?: boolean;
  items: NavigationItem[];
  adminOnly?: boolean;
};

export const NAV_GROUPS: NavigationGroup[] = [
  {
    id: 'main',
    labelKey: 'nav_group_main',
    defaultOpen: true,
    items: [
      { id: 'home', icon: LayoutDashboard, href: '/dashboard', labelKey: 'nav_home' },
      { id: 'command-center', icon: Compass, href: '/command-center', labelKey: 'nav_command_center' },
      { id: 'decisions', icon: Landmark, href: '/decisions', labelKey: 'nav_decisions' },
      { id: 'today', icon: CalendarDays, href: '/today', labelKey: 'nav_today' },
      { id: 'financial-theories', icon: BookOpen, href: '/financial-theories', labelKey: 'nav_financial_theories' },
      { id: 'ebooks', icon: Library, href: '/ebooks', labelKey: 'nav_ebooks' },
      { id: 'tasks', icon: ClipboardList, href: '/tasks', labelKey: 'nav_tasks' },
      { id: 'notif', icon: Bell, href: '/notifications', labelKey: 'nav_notif' },
      { id: 'reports-center', icon: FileText, href: '/reports-center', labelKey: 'nav_reports_center' },
      { id: 'documents-center', icon: Files, href: '/documents', labelKey: 'nav_documents_center' },
    ],
  },
  {
    id: 'personal-finance',
    labelKey: 'nav_group_personal_finance',
    items: [
      { id: 'income', icon: Wallet, href: '/income', labelKey: 'nav_income' },
      {
        id: 'expenses',
        icon: ReceiptText,
        labelKey: 'nav_expenses',
        children: [
          { id: 'expenses-overview', icon: ReceiptText, href: '/expenses', labelKey: 'nav_expenses' },
          { id: 'monthly-subscriptions', icon: CreditCard, href: '/expenses/monthly-subscriptions', labelKey: 'nav_monthly_subscriptions' },
        ],
      },
      {
        id: 'debts',
        icon: Landmark,
        href: '/debts',
        labelKey: 'nav_debts',
      },
      { id: 'savings', icon: PiggyBank, href: '/savings', labelKey: 'nav_savings' },
      { id: 'goals', icon: Target, href: '/goals', labelKey: 'nav_goals' },
    ],
  },
  {
    id: 'financial-intelligence',
    labelKey: 'nav_group_financial_ai',
    defaultOpen: true,
    items: [
      { id: 'smart-assistant', icon: Bot, href: '/ai', labelKey: 'nav_smart_assistant' },
    ],
  },
  {
    id: 'investment-market',
    labelKey: 'nav_group_invest_market',
    items: [
      { id: 'invest', icon: TrendingUp, href: '/invest', labelKey: 'nav_invest' },
      { id: 'market-analysis', icon: LineChart, href: '/market-analysis', labelKey: 'nav_market_analysis' },
      { id: 'market-agent', icon: Bot, href: '/market-agent', labelKey: 'nav_market_agent' },
      { id: 'smart-trading-terminal', icon: Terminal, href: '/thesfm-trader-own', labelKey: 'nav_smart_trading_terminal', adminOnly: true, superAdminOnly: true },
    ],
  },
  {
    id: 'market-news',
    labelKey: 'nav_group_market_news',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'tech-news', icon: Newspaper, href: '/tech-news', labelKey: 'nav_tech_news' },
      { id: 'europe-news', icon: Newspaper, href: '/europe-news', labelKey: 'nav_europe_news' },
      { id: 'gulf-news', icon: Newspaper, href: '/gulf-news', labelKey: 'nav_gulf_news' },
      { id: 'crypto-news', icon: CircleDollarSign, href: '/crypto-news', labelKey: 'nav_crypto_news' },
    ],
  },
  {
    id: 'stock-categories',
    labelKey: 'nav_group_stock_categories',
    collapsible: true,
    defaultOpen: false,
    items: [
      { id: 'energy-stocks', icon: Compass, href: '/energy-stocks', labelKey: 'nav_energy_stocks' },
      { id: 'banking-stocks', icon: Landmark, href: '/banking-stocks', labelKey: 'nav_banking_stocks' },
      { id: 'sharia-stocks', icon: ShieldCheck, href: '/sharia-stocks', labelKey: 'nav_sharia_stocks' },
      { id: 'growth-stocks', icon: TrendingUp, href: '/growth-stocks', labelKey: 'nav_growth_stocks' },
      { id: 'defensive-stocks', icon: ShieldCheck, href: '/defensive-stocks', labelKey: 'nav_defensive_stocks' },
      { id: 'cyclical-stocks', icon: LineChart, href: '/cyclical-stocks', labelKey: 'nav_cyclical_stocks' },
      { id: 'dividend-stocks', icon: PiggyBank, href: '/dividend-stocks', labelKey: 'nav_dividend_stocks' },
    ],
  },
  {
    id: 'business-projects',
    labelKey: 'nav_group_business_projects',
    items: [
      { id: 'projects', icon: FolderKanban, href: '/projects', labelKey: 'nav_projects' },
      { id: 'business-hub', icon: BriefcaseBusiness, href: '/business-hub', labelKey: 'nav_business_hub' },
      { id: 'investment-offers', icon: Presentation, href: '/investment-offers', labelKey: 'nav_pitch_decks' },
      { id: 'business-subscriptions', icon: CreditCard, href: '/business/subscriptions', labelKey: 'nav_clients_subscriptions' },
      { id: 'business-operations', icon: BriefcaseBusiness, href: '/business-operations', labelKey: 'nav_business_operations' },
      { id: 'my-companies', icon: Building2, href: '/profile/companies', labelKey: 'nav_my_companies' },
      { id: 'company-submission', icon: FileText, href: '/company-listing/submit', labelKey: 'nav_company_submission' },
    ],
  },
  {
    id: 'charity',
    labelKey: 'nav_group_charity',
    items: [
      { id: 'zakat', icon: Calculator, href: '/zakat', labelKey: 'nav_zakat' },
      { id: 'khums', icon: Landmark, href: '/khums', labelKey: 'nav_khums' },
      { id: 'charity', icon: HandHeart, href: '/charity', labelKey: 'nav_charity' },
      { id: 'charity-projects', icon: HeartHandshake, href: '/charity-projects', labelKey: 'nav_charity_projects' },
    ],
  },
  {
    id: 'services',
    labelKey: 'nav_group_services',
    items: [
      { id: 'investment-firms', icon: Building2, href: '/investment-companies', labelKey: 'nav_investment_firms' },
      { id: 'trading-companies', icon: LineChart, href: '/trading-companies', labelKey: 'nav_trading_companies' },
      { id: 'accounting-firms', icon: Calculator, href: '/accounting-companies', labelKey: 'nav_accounting_firms' },
      { id: 'feasibility-firms', icon: FileSearch, href: '/feasibility-companies', labelKey: 'nav_feasibility_firms' },
      { id: 'advisory-firms', icon: BriefcaseBusiness, href: '/financial-consulting-companies', labelKey: 'nav_advisory_firms' },
    ],
  },
  {
    id: 'admin',
    labelKey: 'nav_group_admin',
    adminOnly: true,
    items: [
      { id: 'admin-companies', icon: Building2, href: '/sfm-admin-control/companies', labelKey: 'nav_admin_companies', adminOnly: true, adminPermission: 'company_reviews' },
      { id: 'admin-investment-platforms', icon: Landmark, href: '/sfm-admin-control/investment-platforms', labelKey: 'nav_admin_investment_platforms', adminOnly: true, adminPermission: 'company_reviews' },
      { id: 'admin-analytics', icon: BarChart3, href: '/sfm-admin-control', labelKey: 'admin_dashboard_title', adminOnly: true, adminPermission: 'admin_dashboard' },
      { id: 'admin-operations-center', icon: BarChart3, href: '/sfm-admin-control/market-diagnostics', labelKey: 'ops_center_title', adminOnly: true, adminPermission: 'admin_dashboard' },
      { id: 'admin-news-providers', icon: Newspaper, href: '/sfm-admin-control/news-providers', labelKey: 'nav_admin_news_providers', adminOnly: true, adminPermission: 'admin_dashboard' },
      { id: 'admin-shariah', icon: ShieldCheck, href: '/sfm-admin-control/shariah', labelKey: 'admin_shariah_title', adminOnly: true, adminPermission: 'admin_dashboard' },
      { id: 'instagram-automation', icon: Instagram, href: '/sfm-admin-control/instagram-automation', labelKey: 'nav_instagram_automation', adminOnly: true, adminPermission: 'instagram_automation' },
      { id: 'admin-permissions', icon: UsersRound, href: '/sfm-admin-control/admin-permissions', labelKey: 'nav_admin_permissions', adminOnly: true, superAdminOnly: true },
    ],
  },
  {
    id: 'account',
    labelKey: 'nav_group_account',
    defaultOpen: true,
    items: [
      { id: 'profile', icon: UserRound, href: '/profile', labelKey: 'nav_profile' },
      { id: 'security', icon: ShieldCheck, href: '/security', labelKey: 'nav_security' },
      { id: 'logout', icon: LogOut, action: 'logout', labelKey: 'nav_logout' },
    ],
  },
];

export const SUPPORT_LINKS: NavigationItem[] = [
  {
    id: 'support-instagram',
    icon: Instagram,
    href: 'https://www.instagram.com/the_sfm',
    labelKey: 'nav_support_instagram',
    external: true,
    caption: '@the_sfm',
  },
  { id: 'support-help-center', icon: Info, href: '/about', labelKey: 'nav_support_help_center' },
  { id: 'support-contact', icon: Mail, href: '/contact', labelKey: 'nav_support_contact' },
  { id: 'support-faq', icon: CircleHelp, href: '/#faq', labelKey: 'nav_support_faq' },
  { id: 'support-privacy', icon: ShieldCheck, href: '/privacy', labelKey: 'nav_support_privacy' },
  { id: 'support-terms', icon: FileText, href: '/terms', labelKey: 'nav_support_terms' },
];

export type NavigationAdminAccess = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: Partial<Record<AdminPermission, boolean>>;
};

function canShowAdminItem(item: NavigationItem, adminAccess: boolean | NavigationAdminAccess) {
  if (!item.adminOnly && !item.superAdminOnly && !item.adminPermission) return true;
  if (adminAccess === true) return true;
  if (!adminAccess || adminAccess.isAdmin !== true) return false;
  if (adminAccess.isSuperAdmin) return true;
  if (item.superAdminOnly) return false;
  if (item.adminPermission) return adminAccess.permissions[item.adminPermission] === true;
  return false;
}

function hasAdminAccess(adminAccess: boolean | NavigationAdminAccess) {
  return adminAccess === true || (typeof adminAccess === 'object' && adminAccess.isAdmin === true);
}

function filterNavigationItems(
  items: NavigationItem[],
  adminAccess: boolean | NavigationAdminAccess,
): NavigationItem[] {
  return items.flatMap(item => {
    if (!canShowAdminItem(item, adminAccess)) return [];

    if (!item.children) return [item];
    const children = filterNavigationItems(item.children, adminAccess);
    if (children.length === 0 && !item.href && !item.action) return [];
    return [{ ...item, children }];
  });
}

export function filterNavigationGroups(
  groups: NavigationGroup[],
  adminAccess: boolean | NavigationAdminAccess = false,
) {
  return groups.flatMap(group => {
    if (group.adminOnly && !hasAdminAccess(adminAccess)) return [];
    const items = filterNavigationItems(group.items, adminAccess);
    return items.length > 0 ? [{ ...group, items }] : [];
  });
}

/**
 * Resolves the Administration workspace entry from the same permission-filtered
 * navigation used by the sidebar. A limited administrator therefore lands on
 * the first page they can actually open, while an administrator with no
 * permitted admin pages receives no workspace entry at all.
 */
export function getFirstAccessibleAdminRoute(
  adminAccess: boolean | NavigationAdminAccess = false,
): string | null {
  const adminGroup = filterNavigationGroups(NAV_GROUPS, adminAccess)
    .find(group => group.id === 'admin');
  if (!adminGroup) return null;

  const routableItems = adminGroup.items
    .flatMap(item => [item, ...(item.children ?? [])])
    .filter(item => item.href && !item.external);
  const workspaceDashboard = routableItems.find(item => item.href === '/sfm-admin-control');
  const firstRoutableItem = workspaceDashboard ?? routableItems[0];
  return firstRoutableItem?.href ?? null;
}

export function flattenNavigationItems(options: { includeActions?: boolean } = {}) {
  const flatten = (items: NavigationItem[]): NavigationItem[] =>
    items.flatMap(item => [item, ...(item.children ? flatten(item.children) : [])]);
  return NAV_GROUPS.flatMap(group => flatten(group.items)).filter(item => options.includeActions || !item.action);
}

export function normalizeNavigationSource(pathname: string, hash = '', search = '') {
  const normalizedSearch = search && search !== '?'
    ? (search.startsWith('?') ? search : `?${search}`)
    : '';
  const normalizedHash = hash && hash !== '#'
    ? (hash.startsWith('#') ? hash : `#${hash}`)
    : '';
  return `${pathname || '/'}${normalizedSearch}${normalizedHash}`;
}

export function isNavigationItemActive(activeSource: string, href?: string) {
  if (!href) return false;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return false;

  const parseSource = (source: string) => {
    const [beforeHash = '/', hashPart = ''] = source.split('#', 2);
    const [path = '/', queryPart = ''] = beforeHash.split('?', 2);
    return {
      path: path || '/',
      query: new URLSearchParams(queryPart),
      hash: hashPart ? `#${hashPart}` : '',
    };
  };

  const item = parseSource(href);
  const active = parseSource(activeSource);
  const pathMatches = item.path === '/'
    ? active.path === '/'
    : active.path === item.path || active.path.startsWith(`${item.path}/`);
  if (!pathMatches) return false;
  if (item.hash && item.hash !== active.hash) return false;

  const requiredQueryEntries = Array.from(item.query.entries());
  if (requiredQueryEntries.length > 0) {
    if (active.path !== item.path) return false;
    return requiredQueryEntries.every(([key, value]) => active.query.get(key) === value);
  }

  return true;
}

export function isNavigationItemOrChildActive(activeSource: string, item: NavigationItem): boolean {
  return isNavigationItemActive(activeSource, item.href) || Boolean(item.children?.some(child => isNavigationItemOrChildActive(activeSource, child)));
}

export function findActiveNavigationGroup(activeSource: string) {
  return NAV_GROUPS.find(group => group.items.some(item => isNavigationItemOrChildActive(activeSource, item)))?.id;
}
