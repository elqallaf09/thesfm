import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacyRecommendationsPage() {
  redirect('/thesfm-trader-own/market-analysis/stocks');
}
