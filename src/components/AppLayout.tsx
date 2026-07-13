'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { LazyCommandMenu } from '@/components/LazyCommandMenu';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { getThemeScope } from '@/lib/navigation/themeScopes';
import { isPublicShellRoute } from '@/config/workspaces/workspace-resolver';
import { resolveWorkspacePageContainerVariant } from '@/config/workspaces/workspace-page-layout';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  // Single source of truth for chrome-free public pages (phase 3):
  // src/config/workspaces/workspace-resolver.ts.
  const isPublicPage = isPublicShellRoute(pathname);
  const themeScope = getThemeScope(pathname);
  const pageContainerVariant = resolveWorkspacePageContainerVariant(pathname);

  if (isPublicPage) {
    return (
      <div className="sfm-app-layout sfm-app-layout-public">
        <div id="main-content" tabIndex={-1} data-theme-scope={themeScope ?? undefined}>{children}</div>
      </div>
    );
  }

  return (
    <div className="sfm-app-layout" data-workspace-shell="true">
      <AppHeader />
      <div className="sfm-app-shell-grid">
        <div className="sfm-app-sidebar-slot" aria-hidden="false">
          <Sidebar />
        </div>
        <WorkspacePageContainer
          id="main-content"
          tabIndex={-1}
          className="sfm-app-main"
          variant={pageContainerVariant}
          data-theme-scope={themeScope ?? undefined}
        >
          {children}
        </WorkspacePageContainer>
      </div>
      <LazyCommandMenu />
      <style jsx global>{`
        .sfm-app-layout[data-workspace-shell='true'] {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--background);
          color: var(--foreground);
        }

        .sfm-app-shell-grid {
          display: grid;
          grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
          align-items: start;
          min-height: calc(100dvh - var(--sfm-global-header-height, 64px));
          transition: grid-template-columns var(--duration-fast) ease-out;
        }

        .sfm-app-sidebar-slot {
          grid-column: 1;
          min-width: 0;
          align-self: stretch;
        }

        .sfm-app-main {
          grid-column: 2;
          min-width: 0;
          min-height: 100%;
          overflow-x: clip;
        }

        @media (max-width: 767px) {
          .sfm-app-shell-grid {
            grid-template-columns: minmax(0, 1fr);
            min-height: calc(100dvh - var(--sfm-global-header-height, 108px));
          }

          .sfm-app-sidebar-slot {
            display: none;
          }

          .sfm-app-main {
            grid-column: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfm-app-shell-grid {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;
