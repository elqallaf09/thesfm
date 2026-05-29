'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { LazyCommandMenu } from '@/components/LazyCommandMenu';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const isPublicPage = ['/', '/login', '/reset-password', '/about', '/contact', '/terms', '/privacy', '/financial-theories'].includes(pathname);

  return (
    <div className={isPublicPage ? 'sfm-app-layout sfm-app-layout-public' : 'sfm-app-layout'}>
      {!isPublicPage && <AppHeader />}
      {!isPublicPage && <LazyCommandMenu />}
      <div id="main-content">{children}</div>
      <style jsx global>{`
        @media (max-width: 1024px) {
          .sfm-app-layout:not(.sfm-app-layout-public) {
            min-height: 100vh;
            padding-top: calc(74px + env(safe-area-inset-top));
          }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;
