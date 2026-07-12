import { Building2, CandlestickChart, ShieldCheck, Wallet } from 'lucide-react';
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
      ar: 'دخلك ومصروفاتك وأهدافك ومشاريعك وتقاريرك المالية.',
      en: 'Your income, expenses, goals, projects, and financial reports.',
      fr: 'Vos revenus, dépenses, objectifs, projets et rapports financiers.',
    },
    icon: Wallet,
    defaultRoute: '/dashboard',
    routePrefixes: [
      '/dashboard', '/command-center', '/decisions', '/today', '/tasks',
      '/income', '/expenses', '/debts', '/savings', '/goals',
      '/reports', '/reports-center', '/documents', '/notifications', '/notif',
      '/projects', '/business', '/business-hub', '/business-operations',
      '/investment-offers', '/zakat', '/khums', '/charity', '/charity-projects',
      '/ai', '/financial-theories', '/ebooks', '/education',
      '/profile', '/security', '/settings', '/invoices', '/employees',
      '/sales', '/customers', '/suppliers', '/operating-expenses',
    ],
    navGroupIds: ['main', 'personal-finance', 'financial-intelligence', 'business-projects', 'charity'],
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
    defaultRoute: '/market-analysis',
    routePrefixes: [
      '/market-analysis', '/market-agent', '/market-alerts', '/market-watchlist',
      '/watchlist', '/alerts', '/invest', '/thesfm-trader-own',
      '/tech-news', '/europe-news', '/gulf-news', '/crypto-news',
      '/energy-stocks', '/banking-stocks', '/sharia-stocks', '/growth-stocks',
      '/defensive-stocks', '/cyclical-stocks', '/dividend-stocks',
    ],
    navGroupIds: ['investment-market', 'stock-news'],
    access: { authenticationRequired: true, guestAllowed: true },
    enabled: true,
  },
  {
    id: 'companies-services',
    labels: { ar: 'الشركات والخدمات', en: 'Companies & Services', fr: 'Entreprises et services' },
    description: {
      ar: 'دليل الشركات، خدمات الأعمال، وإدارة شركاتك المدرجة.',
      en: 'Company directory, business services, and your listed companies.',
      fr: 'Annuaire des entreprises, services aux entreprises et vos sociétés référencées.',
    },
    icon: Building2,
    defaultRoute: '/investment-companies',
    routePrefixes: [
      '/investment-companies', '/trading-companies', '/accounting-companies',
      '/feasibility-companies', '/financial-consulting-companies',
      '/companies', '/company-listing', '/profile/companies',
    ],
    navGroupIds: ['services'],
    access: { authenticationRequired: false, guestAllowed: true },
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
