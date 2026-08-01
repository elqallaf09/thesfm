'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import TraderShellPage from './TraderShellPage';

const NATIVE_EDUCATION_PATH = '/thesfm-trader-own/education';

type TraderRouteStageProps = {
  children: ReactNode;
  nativeEducationEnabled: boolean;
};

/**
 * Selects a native route only when its server-controlled canary is enabled.
 * Every other route keeps the same persistent legacy iframe, and disabling
 * the flag rolls education back without changing its public URL or database.
 */
export default function TraderRouteStage({ children, nativeEducationEnabled }: TraderRouteStageProps) {
  const pathname = usePathname();
  const renderNativeEducation = nativeEducationEnabled && pathname === NATIVE_EDUCATION_PATH;

  return renderNativeEducation ? <>{children}</> : <TraderShellPage />;
}
