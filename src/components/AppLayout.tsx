'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/AppHeader';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sfm-app-layout">
      <AppHeader />
      {children}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .sfm-app-layout {
            min-height: 100vh;
            padding-top: calc(74px + env(safe-area-inset-top));
          }
        }
      `}</style>
    </div>
  );
}

export default AppLayout;
