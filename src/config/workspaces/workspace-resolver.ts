import { getWorkspaceById, WORKSPACES } from './workspace-registry';
import type { WorkspaceDefinition, WorkspaceId } from './workspace-types';

/**
 * Centralized route → workspace resolution (phase 3).
 *
 * Matching is longest-prefix over the registry, segment-aware
 * (`/business` never claims `/business-hub`), and locale/query/hash
 * independent. Unknown routes resolve strictly to null; the shell uses
 * resolveActiveWorkspace, which falls back to Personal Finance so an
 * authenticated page always renders inside a workspace frame.
 */

function normalizePathname(pathname: string | null | undefined): string {
  const raw = String(pathname ?? '').split(/[?#]/)[0] || '/';
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1);
  return raw;
}

function prefixMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getWorkspaceForPathname(pathname: string | null | undefined): WorkspaceDefinition | null {
  const normalized = normalizePathname(pathname);
  let best: { workspace: WorkspaceDefinition; length: number } | null = null;
  for (const workspace of WORKSPACES) {
    if (!workspace.enabled) continue;
    for (const prefix of workspace.routePrefixes) {
      if (prefixMatches(normalized, prefix) && (!best || prefix.length > best.length)) {
        best = { workspace, length: prefix.length };
      }
    }
  }
  return best?.workspace ?? null;
}

export function resolveActiveWorkspace(pathname: string | null | undefined): WorkspaceDefinition {
  return getWorkspaceForPathname(pathname) ?? getWorkspaceById('personal-finance');
}

export function getWorkspaceDefaultRoute(id: WorkspaceId): string {
  return getWorkspaceById(id).defaultRoute;
}

export function isWorkspaceRoute(pathname: string | null | undefined): boolean {
  return getWorkspaceForPathname(pathname) !== null;
}

export function isAdminWorkspaceRoute(pathname: string | null | undefined): boolean {
  return getWorkspaceForPathname(pathname)?.access.adminRequired === true;
}

/**
 * Pages rendered without the authenticated application chrome. This is the
 * single source AppLayout consumes — it mirrors (and must stay narrower
 * than) the middleware's unauthenticated allowances; it never grants
 * access, it only removes the app shell.
 */
const PUBLIC_SHELL_EXACT = new Set([
  '/',
  '/login',
  '/reset-password',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
]);

const PUBLIC_SHELL_PREFIXES = ['/investor'] as const;

export function isPublicShellRoute(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_SHELL_EXACT.has(normalized)) return true;
  return PUBLIC_SHELL_PREFIXES.some(prefix => normalized.startsWith(`${prefix}/`));
}

/**
 * Workspaces the switcher may show. Admin visibility is a courtesy filter
 * only — /sfm-admin-control stays server-validated regardless of what the
 * UI displays.
 */
export function availableWorkspaces(options: { isAdmin: boolean }): WorkspaceDefinition[] {
  return WORKSPACES.filter(workspace =>
    workspace.enabled && (!workspace.access.adminRequired || options.isAdmin));
}
