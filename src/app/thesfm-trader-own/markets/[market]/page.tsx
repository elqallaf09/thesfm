import TraderOwnFrame from '../../TraderOwnFrame';

export const dynamic = 'force-dynamic';

const allowedMarkets = new Set(['forex', 'indices', 'stocks', 'crypto', 'commodities', 'etfs']);

export default async function TraderMarketPage({ params }: { params: Promise<{ market: string }> }) {
  const { market } = await params;
  const safeMarket = allowedMarkets.has(market) ? market : 'markets';
  return <TraderOwnFrame appRoute={safeMarket === 'markets' ? 'markets' : `markets/${safeMarket}`} />;
}
