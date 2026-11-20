import { InvestmentCenter } from '@/components/investments/InvestmentCenter';
import { PortfolioRiskEntry } from '@/components/investments/PortfolioRiskWorkspace';

export default function InvestmentsOverviewPage() {
  const enabled = process.env.SFM_PORTFOLIO_RISK_ENABLED === '1' && process.env.NEXT_PUBLIC_SFM_PORTFOLIO_RISK_ENABLED === '1';
  return <>{enabled ? <PortfolioRiskEntry /> : null}<InvestmentCenter /></>;
}
