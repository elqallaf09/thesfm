import type { ComponentType } from 'react';

/**
 * Workspace architecture (phase 3).
 *
 * A workspace is a presentation-level grouping of existing routes and
 * navigation groups — it does not own authorization. Real access control
 * stays where phase 2.10 put it: src/middleware.ts (page auth),
 * src/lib/auth/accessPolicy.ts (API), and the server-side admin/trader
 * gates. The registry only decides what the shell shows and where the
 * switcher navigates.
 */

export type WorkspaceId =
  | 'personal-finance'
  | 'markets-trading'
  | 'companies-services'
  | 'administration';

export type WorkspaceLabels = {
  ar: string;
  en: string;
  fr: string;
};

export type WorkspaceAccess = {
  authenticationRequired: boolean;
  /** Presentation filter only — server-side admin validation is unchanged. */
  adminRequired?: boolean;
  guestAllowed?: boolean;
};

export type WorkspaceDefinition = {
  id: WorkspaceId;
  labels: WorkspaceLabels;
  description: WorkspaceLabels;
  icon: ComponentType<{ size?: number }>;
  /** Where the switcher lands; must resolve back to this workspace. */
  defaultRoute: string;
  /** URL prefixes owned by this workspace (longest-prefix match wins). */
  routePrefixes: readonly string[];
  /** NAV_GROUPS ids (navigationConfig.ts) rendered inside this workspace. */
  navGroupIds: readonly string[];
  access: WorkspaceAccess;
  enabled: boolean;
};
