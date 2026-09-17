import { redirect } from 'next/navigation';
import { REAL_ESTATE_MARKET_CENTER_PATH } from '@/lib/investments/realEstateHandoff';

export default async function LegacyRealEstateLandAnalystPage({
  searchParams,
}: {
  searchParams: Promise<{ investmentId?: string | string[] }>;
}) {
  const query = await searchParams;
  const investmentId = typeof query.investmentId === 'string' ? query.investmentId : null;
  const target = investmentId
    ? `${REAL_ESTATE_MARKET_CENTER_PATH}?investmentId=${encodeURIComponent(investmentId)}`
    : REAL_ESTATE_MARKET_CENTER_PATH;
  redirect(target);
}
