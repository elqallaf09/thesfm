import { redirect } from 'next/navigation';
import { REAL_ESTATE_MARKET_CENTER_PATH } from '@/lib/investments/realEstateHandoff';

export default async function LegacySavedRealEstateAnalystPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  redirect(`${REAL_ESTATE_MARKET_CENTER_PATH}/${encodeURIComponent(positionId)}`);
}
