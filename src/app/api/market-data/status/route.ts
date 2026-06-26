import { NextResponse } from 'next/server';
import { getEconomicDataProviderStatus } from '@/lib/providers/economic-data';
import { getEconomicCalendarProviderStatus } from '@/lib/providers/economic-calendar';
import { getMarketNewsProviderStatus } from '@/lib/providers/news';

export const dynamic = 'force-dynamic';

export async function GET() {
  const news = getMarketNewsProviderStatus();
  const economicCalendar = getEconomicCalendarProviderStatus();
  const economicData = getEconomicDataProviderStatus();

  return NextResponse.json({
    news,
    economicCalendar,
    economicData,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60',
    },
  });
}
