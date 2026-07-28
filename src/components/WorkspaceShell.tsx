'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { LazyCommandMenu } from '@/components/LazyCommandMenu';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { getThemeScope } from '@/lib/navigation/themeScopes';
import { resolveWorkspacePageContainerVariant } from '@/config/workspaces/workspace-page-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/hooks/useLanguage';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname() || '/';
  const themeScope = getThemeScope(pathname);
  const pageContainerVariant = resolveWorkspacePageContainerVariant(pathname);
  const { dir } = useLanguage();

  return (
    <div className="sfm-app-layout" data-workspace-shell="true">
      {/* The header (and the portal-free mobile drawer it renders) must stay
          a sibling of .sfm-app-shell-grid, not a row inside it: nesting the
          sticky header inside the grid breaks position: sticky (the header's
          block container becomes tightly fit to its own content, with no
          room to move within the grid item) and makes the grid's own
          bounding box start at the header's top instead of its bottom. It
          also lets protectBackground (MobileMenu) apply `inert` to the whole
          .sfm-app-shell-grid as one clean sibling while the drawer is open. */}
      <AppHeader />
      <div className="sfm-app-shell-grid">
        <div className="sfm-app-sidebar-slot" dir={dir} aria-hidden="false">
          {!isMobile && (
            <Sidebar />
          )}
        </div>
        <WorkspacePageContainer
          id="main-content"
          tabIndex={-1}
          className="sfm-app-main"
          variant={pageContainerVariant}
          dir={dir}
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
          overflow-x: clip;
        }

        .sfm-app-shell-grid {
          display: grid;
          /* Keep the occupied sidebar in the grid instead of offsetting pages. */
          grid-template-columns: minmax(0, 1fr) var(--app-sidebar-width);
          grid-template-areas: 'main sidebar';
          align-items: start;
          min-height: calc(100dvh - var(--app-header-height));
          transition: grid-template-columns var(--duration-fast) var(--ease);
          direction: ltr;
        }

        .sfm-app-sidebar-slot {
          grid-area: sidebar;
          min-width: 0;
          align-self: stretch;
        }

        .sfm-app-main {
          grid-area: main;
          min-width: 0;
          min-height: 100%;
          overflow-x: clip;
        }

        @media (max-width: 767px) {
          .sfm-app-shell-grid {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas: 'main';
            min-height: calc(100dvh - var(--app-header-height));
          }

          .sfm-app-sidebar-slot {
            display: none;
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
