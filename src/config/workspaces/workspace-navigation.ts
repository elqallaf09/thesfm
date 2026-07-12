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
 * account group. Applied AFTER filterNavigationGroups, so view-mode and
 * admin-permission filtering keep working exactly as before.
 */
export function filterGroupsForWorkspace(groups: NavigationGroup[], workspaceId: WorkspaceId): NavigationGroup[] {
  return groups.filter(group =>
    isSharedNavGroup(group.id) || GROUP_OWNER.get(group.id) === workspaceId);
}
