import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacyTradesPage() {
  redirect('/thesfm-trader-own/trade-performance');
}
