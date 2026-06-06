'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/hooks/useLanguage';

export function CompanyDashboardFrame({ children }: { children: ReactNode }) {
  const { dir } = useLanguage();

  return (
    <div className="company-dashboard-frame" dir={dir}>
      <Sidebar />
      {children}
      <style jsx>{`
        .company-dashboard-frame {
          min-height: 100vh;
          min-height: 100dvh;
          overflow-x: clip;
          background: var(--sfm-background);
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
        }
      `}</style>
    </div>
  );
}

export default CompanyDashboardFrame;
