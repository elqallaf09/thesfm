import { LegacyRouteRedirect } from '@/components/ai-analyst/LegacyRouteRedirect';

type LegacySymbolDetailsPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function LegacySymbolDetailsPage({ params }: LegacySymbolDetailsPageProps) {
  const { symbol } = await params;
  return <LegacyRouteRedirect kind="symbol-details" symbol={symbol} />;
}
