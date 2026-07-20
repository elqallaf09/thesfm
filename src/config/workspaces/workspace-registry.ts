import { Briefcase, CandlestickChart, ShieldCheck, Wallet } from 'lucide-react';
import type { WorkspaceDefinition, WorkspaceId } from './workspace-types';

/**
 * The single source of truth for workspace definitions (phase 3).
 *
 * Route prefixes were mapped from docs/route-inventory.md — only routes that
 * actually exist are listed. Every authenticated route NOT claimed below
 * belongs to Personal Finance by fallback (see resolveActiveWorkspace), so
 * new finance-area pages need no registry change.
 *
 * Nav-group ownership: each NAV_GROUPS id is owned by exactly one workspace;
 * the `account` group (profile/security/logout) is shared across all of
 * them (SHARED_NAV_GROUP_IDS) — a deliberate shared-access design so the
 * user menu never disappears.
 */

export const SHARED_NAV_GROUP_IDS: readonly string[] = ['account'];

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: 'personal-finance',
    labels: { ar: 'الإدارة المالية', en: 'Personal Finance', fr: 'Finances personnelles' },
    description: {
      ar: 'دخلك ومصروفاتك وأهدافك وتقاريرك المالية الشخصية.',
      en: 'Your income, expenses, goals, and personal financial reports.',
      fr: 'Vos revenus, dépenses, objectifs et rapports financiers personnels.',
    },
    icon: Wallet,
    defaultRoute: '/dashboard',
    routePrefixes: [
      '/dashboard', '/decisions', '/today', '/tasks',
      '/income', '/expenses', '/debts', '/savings', '/goals',
      '/reports', '/reports-center', '/documents', '/notifications', '/notif',
      '/zakat', '/khums', '/charity', '/charity-projects',
      '/ai', '/financial-theories', '/ebooks', '/education',
      '/profile', '/security', '/settings',
    ],
    navGroupIds: ['main', 'personal-finance', 'financial-intelligence', 'charity'],
    access: { authenticationRequired: true, guestAllowed: true },
    enabled: true,
  },
  {
    id: 'markets-trading',
    labels: { ar: 'الأسواق والتداول', en: 'Markets & Trading', fr: 'Marchés et trading' },
    description: {
      ar: 'تحليل الأسواق، الأخبار، المتابعة، التنبيهات، ومنصة التداول.',
      en: 'Market analysis, news, watchlists, alerts, and the trading terminal.',
      fr: 'Analyse des marchés, actualités, listes de suivi, alertes et terminal de trading.',
    },
    icon: CandlestickChart,
    defaultRoute: '/ai-analyst/overview',
    routePrefixes: [
      '/ai-analyst', '/symbol-details',
      '/market-analysis', '/market-agent', '/market-alerts', '/market-watchlist',
      '/watchlist', '/alerts', '/invest', '/investments', '/thesfm-trader-own',
      '/tech-news', '/europe-news', '/gulf-news', '/crypto-news',
      '/energy-stocks', '/banking-stocks', '/sharia-stocks', '/growth-stocks',
      '/defensive-stocks', '/cyclical-stocks', '/dividend-stocks',
    ],
    navGroupIds: [
      'investment-market', 'market-news',
      // SFM Smart Analyzer contextual groups (render only inside /thesfm-trader-own).
      'trader-trading', 'trader-follow', 'trader-more',
    ],
    access: { authenticationRequired: true, guestAllowed: true },
    enabled: true,
  },
  {
    id: 'business-projects',
    labels: { ar: 'الأعمال والمشاريع', en: 'Business & Projects', fr: 'Affaires et projets' },
    description: {
      ar: 'إدارة المشاريع والأعمال والعروض الاستثمارية والشركات والخدمات.',
      en: 'Projects, business operations, investment offers, companies, and services.',
      fr: 'Projets, opérations, offres d’investissement, entreprises et services.',
    },
    icon: Briefcase,
    defaultRoute: '/business-hub',
    guestDefaultRoute: '/investment-companies',
    routePrefixes: [
      '/projects', '/business', '/business-hub', '/business-operations',
      '/investment-offers', '/investor',
      '/invoices', '/employees', '/sales', '/customers', '/suppliers',
      '/operating-expenses',
      '/investment-companies', '/trading-companies', '/accounting-companies',
      '/feasibility-companies', '/financial-consulting-companies',
      '/services', '/companies', '/company-listing', '/profile/companies',
    ],
    navGroupIds: ['business-projects', 'services'],
    access: { authenticationRequired: true, guestAllowed: true },
    enabled: true,
  },
  {
    id: 'administration',
    labels: { ar: 'الإدارة', en: 'Administration', fr: 'Administration' },
    description: {
      ar: 'مراجعة الشركات، تشخيصات المزودين، وإدارة صلاحيات المنصة.',
      en: 'Company reviews, provider diagnostics, and platform permissions.',
      fr: 'Revue des entreprises, diagnostics des fournisseurs et permissions de la plateforme.',
    },
    icon: ShieldCheck,
    defaultRoute: '/sfm-admin-control',
    routePrefixes: ['/sfm-admin-control'],
    navGroupIds: ['admin'],
    access: { authenticationRequired: true, adminRequired: true },
    enabled: true,
  },
] as const;

const WORKSPACE_BY_ID = new Map<WorkspaceId, WorkspaceDefinition>(
  WORKSPACES.map(workspace => [workspace.id, workspace]),
);

export function getWorkspaceById(id: WorkspaceId): WorkspaceDefinition {
  const workspace = WORKSPACE_BY_ID.get(id);
  if (!workspace) throw new Error(`Unknown workspace id: ${id}`);
  return workspace;
}
