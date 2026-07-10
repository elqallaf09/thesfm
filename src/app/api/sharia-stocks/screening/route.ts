import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import {
  getShariahScreeningCounts,
  getShariahScreeningItems,
  getShariahScreeningSourceStatus,
  SHARIAH_SCREENING_METHOD,
} from '@/lib/market/shariahUniverse';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = getShariahScreeningItems();
  const sourceStatus = getShariahScreeningSourceStatus();

  return NextResponse.json(
    {
      ok: true,
      updated_at: new Date().toISOString(),
      sourceConnected: sourceStatus.connected,
      screeningSource: sourceStatus.source,
      sourceName: sourceStatus.sourceName,
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
