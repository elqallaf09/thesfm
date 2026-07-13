'use client';

import type { CSSProperties, ReactNode } from 'react';
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
