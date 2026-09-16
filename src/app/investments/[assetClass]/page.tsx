import { notFound, redirect } from 'next/navigation';
import { InvestmentCenter } from '@/components/investments/InvestmentCenter';
import { INVESTMENT_CENTER_ASSET_CLASSES, isInvestmentCenterAssetClass } from '@/lib/investments/center';
import { REAL_ESTATE_MARKET_CENTER_PATH } from '@/lib/investments/realEstateHandoff';

type PageProps = { params: Promise<{ assetClass: string }> };

export function generateStaticParams() {
  return INVESTMENT_CENTER_ASSET_CLASSES
    .filter(assetClass => assetClass !== 'overview' && assetClass !== 'real-estate')
    .map(assetClass => ({ assetClass }));
}

export default async function InvestmentsAssetClassPage({ params }: PageProps) {
  const { assetClass } = await params;
  if (assetClass === 'real-estate') redirect(REAL_ESTATE_MARKET_CENTER_PATH);
  if (assetClass === 'overview' || !isInvestmentCenterAssetClass(assetClass)) notFound();
  return <InvestmentCenter assetClass={assetClass} />;
}
