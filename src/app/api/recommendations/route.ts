import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = url.searchParams.get('market') || 'us';

  return NextResponse.json({
    market,
    recommendations: [],
    unavailable: [],
    smartAlerts: [],
    dataProvider: {
      active: null,
      requested: null,
      configured: false,
      status: 'not_configured',
    },
    message: 'Market data provider is not configured.',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
