import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacySignalHistoryPage() {
  redirect('/thesfm-trader-own/trade-performance');
}
