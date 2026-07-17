import type { NavigationGroup } from '@/components/navigationConfig';
import { SHARED_NAV_GROUP_IDS, WORKSPACES } from './workspace-registry';
import type { WorkspaceId } from './workspace-types';

/**
 * Workspace-scoped navigation (phase 3).
 *
 * NAV_GROUPS in navigationConfig.ts stays the single definition of every
 * navigation item (labels, icons, permissions). This module only decides
 * which of those groups render inside the active workspace, so no
 * navigation array is ever duplicated.
 */

const GROUP_OWNER = new Map<string, WorkspaceId>();
for (const workspace of WORKSPACES) {
  for (const groupId of workspace.navGroupIds) {
    GROUP_OWNER.set(groupId, workspace.id);
  }
}

export function workspaceOwningNavGroup(groupId: string): WorkspaceId | null {
  return GROUP_OWNER.get(groupId) ?? null;
}

export function isSharedNavGroup(groupId: string): boolean {
  return SHARED_NAV_GROUP_IDS.includes(groupId);
}

/**
 * Keeps only the groups owned by the active workspace plus the shared
 * account group. Applied after permission filtering so workspace ownership
 * and authorization concerns stay independent.
 */
export function filterGroupsForWorkspace(groups: NavigationGroup[], workspaceId: WorkspaceId): NavigationGroup[] {
  return groups.filter(group =>
    isSharedNavGroup(group.id) || GROUP_OWNER.get(group.id) === workspaceId);
}

function pathnameWithinScope(pathname: string, scope: string): boolean {
  return pathname === scope || pathname.startsWith(`${scope}/`);
}

/**
 * Contextual sub-navigation (Smart Analyzer shell unification): a group with
 * a routeScope renders only while the pathname is inside that prefix, and
 * while a scope is active the workspace's non-scoped groups step aside so a
 * single navigation column remains. Shared groups (account) always render.
 */
export function filterGroupsForRoute(groups: NavigationGroup[], pathname: string): NavigationGroup[] {
  const normalized = (String(pathname || '/').split(/[?#]/, 1)[0] || '/').replace(/(.)\/+$/, '$1');
  const scopeActive = groups.some(group =>
    group.routeScope && pathnameWithinScope(normalized, group.routeScope));

  return groups.filter(group => {
    if (group.routeScope) return pathnameWithinScope(normalized, group.routeScope);
    if (isSharedNavGroup(group.id)) return true;
    return !scopeActive;
  });
}
