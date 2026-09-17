import { RealEstateAnalystWorkspace } from '@/components/invest/RealEstateAnalystWorkspace';

export default async function RealEstateMarketCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ investmentId?: string | string[] }>;
}) {
  const query = await searchParams;
  // A malformed supplied ID must fail visibly, not silently open a blank asset.
  const investmentId = query.investmentId === undefined
    ? undefined
    : typeof query.investmentId === 'string' ? query.investmentId : '';
  return <RealEstateAnalystWorkspace investmentId={investmentId} />;
}
