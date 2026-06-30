import TraderOwnFrame from '../../TraderOwnFrame';

type PageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function TraderSymbolDetailsSymbolPage({ params }: PageProps) {
  const { symbol } = await params;
  return <TraderOwnFrame appRoute={`symbol-details/${encodeURIComponent(symbol)}`} />;
}
