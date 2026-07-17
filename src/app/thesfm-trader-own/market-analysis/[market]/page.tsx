import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const allowedMarkets = new Set([
  'us-stocks',
  'forex',
  'crypto',
  'commodities',
  'indices',
  'etfs',
  'saudi',
  'kuwait',
  'uae',
  'qatar',
  'bahrain',
  'oman',
  'europe',
  'asia',
  'technology',
  'ai',
  'semiconductors',
  'energy',
  'banking',
  'food',
  'healthcare',
]);

// URL anchor for a terminal view (stage rendered by the segment layout);
// unknown markets fall back to the stocks analysis view.
export default async function TraderMarketAnalysisByMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (['gcc', 'gulf', 'gulf-markets', 'mixed-gcc'].includes(market)) {
    redirect('/thesfm-trader-own/markets');
  }
  if (!allowedMarkets.has(market)) {
    redirect('/thesfm-trader-own/market-analysis');
  }
  return null;
}
