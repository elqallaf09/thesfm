import { NextResponse } from 'next/server';

function parseSymbols(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get('symbols') || '')
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);
}

export async function GET(request: Request) {
  const symbols = parseSymbols(request);

  return NextResponse.json({
    recommendations: [],
    unavailable: symbols.map((symbol) => ({
      symbol,
      name: symbol,
      reason: 'Market data provider is not configured.',
    })),
    smartAlerts: [],
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
