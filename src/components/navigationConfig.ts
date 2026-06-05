'use client';

import type { ComponentType } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarDays,
  ChartPie,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  Compass,
  FileSearch,
  FileText,
  Files,
  FolderKanban,
  HandHeart,
  HeartHandshake,
  Info,
  Landmark,
  LayoutDashboard,
  Library,
  LineChart,
  LogOut,
  Mail,
  Map,
  Newspaper,
  PiggyBank,
  Presentation,
  ReceiptText,
  ShieldCheck,
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
  children?: NavigationItem[];
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
      { id: 'decisions', icon: Landmark, href: '/decisions', labelKey: 'nav_decisions', viewModes: ['simple', 'professional'] },
      { id: 'today', icon: CalendarDays, href: '/today', labelKey: 'nav_today', viewModes: ['simple', 'professional'] },
      { id: 'financial-theories', icon: BookOpen, href: '/financial-theories', labelKey: 'nav_financial_theories', viewModes: ['simple', 'professional'] },
      { id: 'ebooks', icon: Library, href: '/ebooks', labelKey: 'nav_ebooks', viewModes: ['simple', 'professional'] },
      { id: 'tasks', icon: ClipboardList, href: '/tasks', labelKey: 'nav_tasks', viewModes: ['simple', 'professional'] },
      { id: 'notif', icon: Bell, href: '/notifications', labelKey: 'nav_notif', viewModes: ['simple', 'professional'] },
      { id: 'reports-center', icon: FileText, href: '/reports-center', labelKey: 'nav_reports_center', viewModes: ['simple', 'professional'] },
      { id: 'documents-center', icon: Files, href: '/documents', labelKey: 'nav_documents_center', viewModes: ['simple', 'professional'] },
    ],
  },
  {
    id: 'personal-finance',
    labelKey: 'nav_group_personal_finance',
    items: [
      { id: 'income', icon: Wallet, href: '/income', labelKey: 'nav_income', viewModes: ['simple', 'professional'] },
      { id: 'expenses', icon: ReceiptText, href: '/expenses', labelKey: 'nav_expenses', viewModes: ['simple', 'professional'] },
      { id: 'debts', icon: Landmark, href: '/debts', labelKey: 'nav_debts', viewModes: ['simple', 'professional'] },
      { id: 'savings', icon: PiggyBank, href: '/savings', labelKey: 'nav_savings' },
      { id: 'goals', icon: Target, href: '/goals', labelKey: 'nav_goals', viewModes: ['simple', 'professional'] },
    ],
  },
  {
    id: 'financial-intelligence',
    labelKey: 'nav_group_financial_ai',
    defaultOpen: true,
    items: [
      { id: 'smart-assistant', icon: Bot, href: '/ai', labelKey: 'nav_smart_assistant', viewModes: ['simple', 'professional'] },
    ],
  },
  {
    id: 'investment-market',
    labelKey: 'nav_group_invest_market',
    items: [
      { id: 'invest', icon: TrendingUp, href: '/invest', labelKey: 'nav_invest' },
      { id: 'market-analysis', icon: LineChart, href: '/market-analysis', labelKey: 'nav_market_analysis' },
      {
        id: 'stock-news',
        icon: Newspaper,
        labelKey: 'nav_stock_news_menu',
        children: [
          { id: 'gulf-news', icon: Newspaper, href: '/gulf-news', labelKey: 'nav_gulf_news' },
          { id: 'europe-news', icon: Newspaper, href: '/europe-news', labelKey: 'nav_europe_news' },
          { id: 'tech-news', icon: Newspaper, href: '/tech-news', labelKey: 'nav_tech_news' },
          { id: 'crypto-news', icon: CircleDollarSign, href: '/crypto-news', labelKey: 'nav_crypto_news' },
          { id: 'defensive-stocks', icon: ShieldCheck, href: '/defensive-stocks', labelKey: 'nav_defensive_stocks' },
          { id: 'growth-stocks', icon: TrendingUp, href: '/growth-stocks', labelKey: 'nav_growth_stocks' },
          { id: 'dividend-stocks', icon: PiggyBank, href: '/dividend-stocks', labelKey: 'nav_dividend_stocks' },
          { id: 'cyclical-stocks', icon: LineChart, href: '/cyclical-stocks', labelKey: 'nav_cyclical_stocks' },
          { id: 'energy-stocks', icon: Compass, href: '/energy-stocks', labelKey: 'nav_energy_stocks' },
          { id: 'banking-stocks', icon: Landmark, href: '/banking-stocks', labelKey: 'nav_banking_stocks' },
          { id: 'sharia-stocks', icon: ShieldCheck, href: '/sharia-stocks', labelKey: 'nav_sharia_stocks' },
        ],
      },
    ],
  },
  {
    id: 'business-projects',
    labelKey: 'nav_group_business_projects',
    items: [
      { id: 'projects', icon: FolderKanban, href: '/projects', labelKey: 'nav_projects' },
      { id: 'business-hub', icon: BriefcaseBusiness, href: '/business-hub', labelKey: 'nav_business_hub' },
      { id: 'investment-offers', icon: Presentation, href: '/investment-offers', labelKey: 'nav_pitch_decks' },
      { id: 'business-operations', icon: BriefcaseBusiness, href: '/business-operations', labelKey: 'nav_business_operations' },
    ],
  },
  {
    id: 'charity',
    labelKey: 'nav_group_charity',
    items: [
      { id: 'zakat', icon: Calculator, href: '/zakat', labelKey: 'nav_zakat' },
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
      { id: 'trading-companies', icon: LineChart, href: '/trading-companies', labelKey: 'nav_trading_companies' },
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
      { id: 'security', icon: ShieldCheck, href: '/security', labelKey: 'nav_security', viewModes: ['simple', 'professional'] },
      { id: 'logout', icon: LogOut, action: 'logout', labelKey: 'nav_logout', viewModes: ['simple', 'professional'] },
    ],
  },
];

export const SUPPORT_LINKS: NavigationItem[] = [
  { id: 'support-about', icon: Info, href: '/about', labelKey: 'nav_support_about', viewModes: ['simple', 'professional'] },
  { id: 'support-faq', icon: CircleHelp, href: '/#faq', labelKey: 'nav_support_faq', viewModes: ['simple', 'professional'] },
  { id: 'support-site-map', icon: Map, href: '/site-map', labelKey: 'nav_support_site_map', viewModes: ['simple', 'professional'] },
  { id: 'support-contact', icon: Mail, href: '/contact', labelKey: 'nav_support_contact', viewModes: ['simple', 'professional'] },
];

export function filterNavigationGroups(groups: NavigationGroup[], viewMode: NavigationViewMode) {
  if (viewMode === 'professional') return groups;
  return groups
    .map(group => ({
      ...group,
      items: group.items
        .map(item => {
          const children = item.children?.filter(child => child.action || child.viewModes?.includes('simple'));
          if (children?.length) return { ...item, children };
          return item.action || item.viewModes?.includes('simple') ? item : null;
        })
        .filter((item): item is NavigationItem => Boolean(item)),
    }))
    .filter(group => group.items.length > 0);
}

export function flattenNavigationItems(options: { includeActions?: boolean } = {}) {
  const flatten = (items: NavigationItem[]): NavigationItem[] =>
    items.flatMap(item => [item, ...(item.children ? flatten(item.children) : [])]);
  return NAV_GROUPS.flatMap(group => flatten(group.items)).filter(item => options.includeActions || !item.action);
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

export function isNavigationItemOrChildActive(activeSource: string, item: NavigationItem): boolean {
  return isNavigationItemActive(activeSource, item.href) || Boolean(item.children?.some(child => isNavigationItemOrChildActive(activeSource, child)));
}

export function findActiveNavigationGroup(activeSource: string) {
  return NAV_GROUPS.find(group => group.items.some(item => isNavigationItemOrChildActive(activeSource, item)))?.id;
}
