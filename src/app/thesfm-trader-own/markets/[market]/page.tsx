import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const allowedMarkets = new Set([
  'forex',
  'indices',
  'stocks',
  'crypto',
  'commodities',
  'etfs',
  'saudi',
  'kuwait',
  'uae',
  'qatar',
  'bahrain',
  'oman',
  'europe',
  'asia',
  'ai',
  'tech',
  'energy',
  'defensive',
  'dividends',
  'semiconductors',
  'food',
  'healthcare',
  'banking',
]);

// URL anchor for a terminal view (stage rendered by the segment layout);
// unknown markets fall back to the market directory.
export default async function TraderMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  if (['gcc', 'gulf', 'gulf-markets', 'mixed-gcc'].includes(market)) {
    redirect('/thesfm-trader-own/markets');
  }
  if (!allowedMarkets.has(market)) {
    redirect('/thesfm-trader-own/markets');
  }
  return null;
}
