import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TraderLegacyAiAnalysisPage() {
  redirect('/thesfm-trader-own/market-analysis/stocks');
}
