import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacyTradeHistoryPage() {
  redirect('/thesfm-trader-own/trade-performance');
}
