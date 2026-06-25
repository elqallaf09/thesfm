import { NextResponse } from 'next/server';
import { getEconomicCalendarProviderStatus } from '@/lib/providers/economic-calendar';
import { getMarketNewsProviderStatus } from '@/lib/providers/news';

export const dynamic = 'force-dynamic';

export async function GET() {
  const news = getMarketNewsProviderStatus();
  const economicCalendar = getEconomicCalendarProviderStatus();

  return NextResponse.json({
    news,
    economicCalendar,
  }, {
    headers: {
      'Cache-Control': 'private, max-age=60',
    },
  });
}
