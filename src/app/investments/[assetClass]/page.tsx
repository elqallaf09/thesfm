import { notFound } from 'next/navigation';
import { InvestmentCenter } from '@/components/investments/InvestmentCenter';
import { INVESTMENT_CENTER_ASSET_CLASSES, isInvestmentCenterAssetClass } from '@/lib/investments/center';

type PageProps = { params: Promise<{ assetClass: string }> };

export function generateStaticParams() {
  return INVESTMENT_CENTER_ASSET_CLASSES
    .filter(assetClass => assetClass !== 'overview')
    .map(assetClass => ({ assetClass }));
}

export default async function InvestmentsAssetClassPage({ params }: PageProps) {
  const { assetClass } = await params;
  if (assetClass === 'overview' || !isInvestmentCenterAssetClass(assetClass)) notFound();
  return <InvestmentCenter assetClass={assetClass} />;
}
