import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    markets: [],
    dataProvider: {
      active: null,
      requested: null,
      configured: false,
      status: 'not_configured',
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
