import type { ReactNode } from 'react';
import { DashboardDataProvider } from '@/components/finance/DashboardDataProvider';
import { EconomicIntelligenceHome } from '@/components/finance/EconomicIntelligenceHome';
import { CrossWorkspaceEconomicBrief } from '@/components/finance/CrossWorkspaceEconomicBrief';
import { EconomicResolutionHistory } from '@/components/finance/EconomicResolutionHistory';
import { FinanceDashboardIntelligence } from '@/components/finance/FinanceDashboardIntelligence';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardDataProvider>
      <EconomicIntelligenceHome />
      <CrossWorkspaceEconomicBrief />
      <EconomicResolutionHistory />
      <FinanceDashboardIntelligence />
      {children}
    </DashboardDataProvider>
  );
}
