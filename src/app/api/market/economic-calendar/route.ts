import { NextResponse } from 'next/server';

export const revalidate = 300;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET() {
  const configured = Boolean(process.env.ECONOMIC_CALENDAR_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED',
      message: 'Economic calendar source is not connected yet.',
      events: [],
      updated_at: null,
    }, { status: 200, headers: cacheHeaders });
  }

  return NextResponse.json({
    ok: false,
    success: false,
    code: 'ECONOMIC_CALENDAR_PROVIDER_UNAVAILABLE',
    message: 'Economic calendar events are currently unavailable from the data provider.',
    events: [],
    updated_at: null,
  }, { status: 200, headers: cacheHeaders });
}
