import type { ReactNode } from 'react';
import { FinanceDashboardIntelligence } from '@/components/finance/FinanceDashboardIntelligence';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FinanceDashboardIntelligence />
      {children}
    </>
  );
}
