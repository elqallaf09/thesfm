import { RealEstateAnalystWorkspace } from '@/components/invest/RealEstateAnalystWorkspace';

export default async function SavedRealEstateMarketCenterPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  return <RealEstateAnalystWorkspace positionId={positionId} />;
}
