'use client';

import type { CSSProperties, ReactNode } from 'react';

type DashboardPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
};

export function DashboardPageShell({
  children,
  className = '',
  contentClassName = '',
  style,
  contentStyle,
}: DashboardPageShellProps) {
  return (
    <main className={`sfm-dashboard-page-shell ${className}`.trim()} style={style}>
      <div className={`sfm-dashboard-page-content ${contentClassName}`.trim()} style={contentStyle}>
        {children}
      </div>
    </main>
  );
}

export default DashboardPageShell;
