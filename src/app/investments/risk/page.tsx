import { notFound } from 'next/navigation';
import { PortfolioRiskWorkspace } from '@/components/investments/PortfolioRiskWorkspace';

export const dynamic = 'force-dynamic';

export default function PortfolioRiskPage() {
  if (process.env.SFM_PORTFOLIO_RISK_ENABLED !== '1' || process.env.NEXT_PUBLIC_SFM_PORTFOLIO_RISK_ENABLED !== '1') notFound();
  return <PortfolioRiskWorkspace />;
}
