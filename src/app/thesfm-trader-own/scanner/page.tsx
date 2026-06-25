import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacyScannerPage() {
  redirect('/thesfm-trader-own/market-analysis/stocks');
}
