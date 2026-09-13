import type { ReactNode } from 'react';
import { EconomicIntelligenceHome } from '@/components/finance/EconomicIntelligenceHome';
import { CrossWorkspaceEconomicBrief } from '@/components/finance/CrossWorkspaceEconomicBrief';
import { EconomicResolutionHistory } from '@/components/finance/EconomicResolutionHistory';
import { FinanceDashboardIntelligence } from '@/components/finance/FinanceDashboardIntelligence';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EconomicIntelligenceHome />
      <CrossWorkspaceEconomicBrief />
      <EconomicResolutionHistory />
      <FinanceDashboardIntelligence />
      {children}
    </>
  );
}
