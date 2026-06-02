import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(process.env.MARKET_SENTIMENT_API_KEY?.trim());

  if (!configured) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'MARKET_SENTIMENT_SOURCE_NOT_CONFIGURED',
      items: [],
      updated_at: null,
    });
  }

  return NextResponse.json({
    ok: false,
    success: false,
    code: 'MARKET_SENTIMENT_PROVIDER_UNAVAILABLE',
    items: [],
    updated_at: null,
  });
}
