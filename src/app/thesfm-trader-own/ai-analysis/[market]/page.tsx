import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TraderLegacyAiAnalysisMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  redirect(`/thesfm-trader-own/market-analysis/${encodeURIComponent(market || 'stocks')}`);
}
