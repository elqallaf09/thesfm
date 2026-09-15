import { WorldStocksDetailPage } from '@/components/world-stocks/WorldStocksDetailPage';

type PageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ region?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function Page({ params, searchParams }: PageProps) {
  const { symbol } = await params;
  const { region } = await searchParams;
  return <WorldStocksDetailPage symbol={decodeURIComponent(symbol)} region={firstValue(region)} />;
}
