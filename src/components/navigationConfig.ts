'use client';

import type { ComponentType } from 'react';
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  ChartPie,
  Compass,
  FileSearch,
  FileText,
  Files,
  FolderKanban,
  HandHeart,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  LogOut,
  PiggyBank,
  Presentation,
  ReceiptText,
  Settings,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { TR } from '@/lib/translations';

export type TranslationKey = keyof typeof TR;

export type NavigationAction = 'logout';
export type NavigationViewMode = 'simple' | 'professional';

export type NavigationItem = {
  id: string;
  icon: ComponentType<{ size?: number }>;
  href?: string;
  labelKey: TranslationKey;
  action?: NavigationAction;
  viewModes?: NavigationViewMode[];
};

export type NavigationGroup = {
  id: string;
  labelKey: TranslationKey;
  defaultOpen?: boolean;
  items: NavigationItem[];
};

export const NAV_GROUPS: NavigationGroup[] = [
  {
    id: 'main',
    labelKey: 'nav_group_main',
    defaultOpen: true,
    items: [
      { id: 'home', icon: LayoutDashboard, href: '/dashboard', labelKey: 'nav_home', viewModes: ['simple', 'professional'] },
      { id: 'command-center', icon: Compass, href: '/command-center', labelKey: 'nav_command_center', viewModes: ['simple', 'professional'] },
      { id: 'today', icon: CalendarDays, href: '/today', labelKey: 'nav_today', viewModes: ['simple', 'professional'] },
      { id: 'notif', icon: Bell, href: '/notifications', labelKey: 'nav_notif', viewModes: ['simple', 'professional'] },
      { id: 'reports-center', icon: FileText, href: '/reports-center', labelKey: 'nav_reports_center', viewModes: ['simple', 'professional'] },
    ],
  },
  {
    id: 'personal-finance',
    labelKey: 'nav_group_personal_finance',
    items: [
      { id: 'income', icon: Wallet, href: '/income', labelKey: 'nav_income', viewModes: ['simple', 'professional'] },
      { id: 'expenses', icon: ReceiptText, href: '/expenses', labelKey: 'nav_expenses', viewModes: ['simple', 'professional'] },
      { id: 'savings', icon: PiggyBank, href: '/savings', labelKey: 'nav_savings' },
      { id: 'goals', icon: Target, href: '/goals', labelKey: 'nav_goals', viewModes: ['simple', 'professional'] },
      { id: 'zakat', icon: Calculator, href: '/zakat', labelKey: 'nav_zakat' },
    ],
  },
  {
    id: 'investment-market',
    labelKey: 'nav_group_invest_market',
    items: [
      { id: 'invest', icon: TrendingUp, href: '/invest', labelKey: 'nav_invest' },
      { id: 'market-analysis', icon: LineChart, href: '/market-analysis', labelKey: 'nav_market_analysis' },
      { id: 'watchlist', icon: Star, href: '/market-analysis#watchlist', labelKey: 'nav_watchlist' },
      { id: 'market-alerts', icon: BellRing, href: '/market-analysis#market-alerts', labelKey: 'nav_market_alerts' },
    ],
  },
  {
    id: 'business-projects',
    labelKey: 'nav_group_business_projects',
    items: [
      { id: 'projects', icon: FolderKanban, href: '/projects', labelKey: 'nav_projects' },
      { id: 'business-hub', icon: BriefcaseBusiness, href: '/business-hub', labelKey: 'nav_business_hub' },
      { id: 'pitch-decks', icon: Presentation, href: '/business-hub#strategic-documents', labelKey: 'nav_pitch_decks' },
      { id: 'documents', icon: Files, href: '/business-hub#strategic-documents', labelKey: 'nav_documents' },
    ],
  },
  {
    id: 'charity',
    labelKey: 'nav_group_charity',
    items: [
      { id: 'charity', icon: HandHeart, href: '/charity', labelKey: 'nav_charity' },
      { id: 'charity-projects', icon: HeartHandshake, href: '/charity-projects', labelKey: 'nav_charity_projects' },
      { id: 'beneficiaries', icon: UsersRound, href: '/charity-projects#beneficiary-tracking', labelKey: 'nav_beneficiaries' },
      { id: 'charity-reports', icon: ChartPie, href: '/charity-projects#charity-reports', labelKey: 'nav_charity_reports' },
    ],
  },
  {
    id: 'services',
    labelKey: 'nav_group_services',
    items: [
      { id: 'investment-firms', icon: Building2, href: '/services/investment-firms', labelKey: 'nav_investment_firms' },
      { id: 'accounting-firms', icon: Calculator, href: '/services/accounting-firms', labelKey: 'nav_accounting_firms' },
      { id: 'feasibility-firms', icon: FileSearch, href: '/services/feasibility-firms', labelKey: 'nav_feasibility_firms' },
      { id: 'advisory-firms', icon: BriefcaseBusiness, href: '/services/advisory-firms', labelKey: 'nav_advisory_firms' },
    ],
  },
  {
    id: 'account',
    labelKey: 'nav_group_account',
    defaultOpen: true,
    items: [
      { id: 'profile', icon: UserRound, href: '/profile', labelKey: 'nav_profile', viewModes: ['simple', 'professional'] },
      { id: 'settings', icon: Settings, href: '/settings', labelKey: 'nav_settings', viewModes: ['simple', 'professional'] },
      { id: 'security', icon: ShieldCheck, href: '/security', labelKey: 'nav_security' },
      { id: 'logout', icon: LogOut, action: 'logout', labelKey: 'nav_logout', viewModes: ['simple', 'professional'] },
    ],
  },
];

export function filterNavigationGroups(groups: NavigationGroup[], viewMode: NavigationViewMode) {
  if (viewMode === 'professional') return groups;
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.action || item.viewModes?.includes('simple')),
    }))
    .filter(group => group.items.length > 0);
}

export function flattenNavigationItems(options: { includeActions?: boolean } = {}) {
  return NAV_GROUPS.flatMap(group => group.items).filter(item => options.includeActions || !item.action);
}

export function normalizeNavigationSource(pathname: string, hash = '') {
  return `${pathname || '/'}${hash || ''}`;
}

export function isNavigationItemActive(activeSource: string, href?: string) {
  if (!href) return false;
  const [itemPath = '/', itemHashPart] = href.split('#');
  const itemHash = itemHashPart ? `#${itemHashPart}` : '';
  const [activePath = '/', activeHashPart] = activeSource.split('#');
  const activeHash = activeHashPart ? `#${activeHashPart}` : '';

  if (itemHash) return activePath === itemPath && activeHash === itemHash;
  return itemPath === '/' ? activePath === '/' : activePath === itemPath || activePath.startsWith(`${itemPath}/`);
}

export function findActiveNavigationGroup(activeSource: string) {
  return NAV_GROUPS.find(group => group.items.some(item => isNavigationItemActive(activeSource, item.href)))?.id;
}
