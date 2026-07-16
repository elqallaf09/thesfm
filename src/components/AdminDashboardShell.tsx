'use client';

import type { CSSProperties, ReactNode } from 'react';
import { DashboardPageShell } from '@/components/DashboardPageShell';

type AdminDashboardShellProps = {
  children: ReactNode;
  ariaLabel?: string;
  dir?: 'ltr' | 'rtl';
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
};

export function AdminDashboardShell({
  children,
  ariaLabel,
  dir,
  className,
  contentClassName,
  style,
  contentStyle,
}: AdminDashboardShellProps) {
  return (
    <>
      <DashboardPageShell
        ariaLabel={ariaLabel}
        dir={dir}
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
