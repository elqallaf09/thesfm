import { redirect } from 'next/navigation';
import { mapLegacySymbolDetailsRoute } from '@/lib/ai-analyst/legacyRoutes';

export default async function LegacySymbolDetailsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  redirect(mapLegacySymbolDetailsRoute(symbol));
}
