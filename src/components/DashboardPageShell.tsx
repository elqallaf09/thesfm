'use client';

import type { CSSProperties, ReactNode } from 'react';

type DashboardPageShellProps = {
  children: ReactNode;
  ariaLabel?: string;
  dir?: 'ltr' | 'rtl';
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
};

export function DashboardPageShell({
  children,
  ariaLabel,
  dir,
  className = '',
  contentClassName = '',
  style,
  contentStyle,
}: DashboardPageShellProps) {
  return (
    <main
      aria-label={ariaLabel}
      dir={dir}
      className={`sfm-dashboard-page-shell ${className}`.trim()}
      data-sfm-shell="dashboard"
      style={style}
    >
      <div className={`sfm-dashboard-page-content ${contentClassName}`.trim()} style={contentStyle}>
        {children}
      </div>
    </main>
  );
}

export default DashboardPageShell;
