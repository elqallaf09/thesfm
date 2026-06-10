import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import {
  getShariahScreeningCounts,
  getShariahScreeningItems,
  SHARIAH_SCREENING_METHOD,
  SHARIAH_SCREENING_SOURCE_CONNECTED,
} from '@/lib/market/shariahUniverse';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = getShariahScreeningItems();

  return NextResponse.json(
    {
      ok: true,
      updated_at: new Date().toISOString(),
      sourceConnected: SHARIAH_SCREENING_SOURCE_CONNECTED,
      screeningSource: null,
      sourceName: null,
      methodology: SHARIAH_SCREENING_METHOD,
      emptyMessage: { ar: 'لم يتم ربط مصدر تصنيف شرعي موثوق بعد', en: 'No trusted Sharia screening source has been connected yet', fr: `Aucune source de filtrage charia fiable n'a encore été connectée` },
      counts: getShariahScreeningCounts(items),
      items,
    },
    {
      headers: {
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    },
  );
}
