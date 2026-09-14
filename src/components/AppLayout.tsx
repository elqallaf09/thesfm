'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { getThemeScope } from '@/lib/navigation/themeScopes';
import {
  isAnonymousPublicWorkspaceRoute,
  isPublicShellRoute,
} from '@/config/workspaces/public-shell-routes';
import { useAuth } from '@/hooks/useAuth';

const WorkspaceShell = dynamic(
  () => import('@/components/WorkspaceShell').then(module => module.WorkspaceShell),
);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const { user, loading: authLoading } = useAuth();
  // Single source of truth for chrome-free public pages (phase 3):
  // src/config/workspaces/public-shell-routes.ts.
  const isPublicPage = isPublicShellRoute(pathname);
  const isAnonymousWorkspacePage = isAnonymousPublicWorkspaceRoute(pathname);
  const themeScope = getThemeScope(pathname);
  const usePublicShell = isPublicPage || (isAnonymousWorkspacePage && (authLoading || !user));

  if (usePublicShell) {
    return (
      <div className="sfm-app-layout sfm-app-layout-public">
        <div id="main-content" tabIndex={-1} data-theme-scope={themeScope ?? undefined}>{children}</div>
      </div>
    );
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}

export default AppLayout;
