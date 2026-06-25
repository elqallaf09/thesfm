'use client';

import type { CSSProperties, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';

type AdminDashboardShellProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
};

export function AdminDashboardShell({
  children,
  ariaLabel,
  className,
  contentClassName,
  style,
  contentStyle,
}: AdminDashboardShellProps) {
  return (
    <>
      <Sidebar />
      <DashboardPageShell
        ariaLabel={ariaLabel}
        className={className}
        contentClassName={contentClassName}
        style={style}
        contentStyle={contentStyle}
      >
        {children}
      </DashboardPageShell>
    </>
  );
}

export default AdminDashboardShell;
